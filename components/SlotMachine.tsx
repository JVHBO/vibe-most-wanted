"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import Image from "next/image";
import { getVbmsBaccaratImageUrl } from "@/lib/tcg/images";

const COLS = 5;
const ROWS = 2;
const TOTAL_CELLS = COLS * ROWS;
const BET_OPTIONS = [10, 20, 30, 40, 50, 60];
const BONUS_COST_MULT = 5; // BUY BONUS = 5× bet atual

// Todos os wallets linkados do dono do projeto (fid 214746)
const ALLOWED_ADDRESSES = [
  "0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52", // principal
  "0x9604fb9a88daef5f38681d7518092bd2a8508a65",
  "0xe167bfc5c8f6167fdb7a6667122418e026a4ce26",
  "0x1d7d4da72a32b0ab37b92c773c15412381c7203a",
  "0xd453151b8f811186bbe7b9a62e6537cd68abca3d",
  "0x02d50610393e528c381420c868200eff50f167d7",
  "0xddc754417cae5cd97b00b8fc7fcbae5f573216dd",
  "0xcf60075a449dec39843309c74ff7693baa35b824",
  "0x247116c752420ec7fe870d1549a1c2e8d44675c6",
];

interface SlotCard { baccarat: string; rarity: string; }
interface SpinResult {
  grid: SlotCard[];
  winAmount: number;
  patterns: string[];
  maxWin: boolean;
}

const VBMS_SPECIAL_IMG = "https://nft-cdn.alchemy.com/base-mainnet/511915cc9b6f20839e2bf2999760530f";

const RS: Record<string, {
  border: string; glow: string; bg: string; labelBg: string; label: string;
  borderW: number; icon: string; cornerGrad: string;
}> = {
  Special:   { border:"#FFD700", glow:"#FFD700", bg:"#1a1400", labelBg:"#92400e", label:"SPECIAL",   borderW:3, icon:"S", cornerGrad:"linear-gradient(135deg,#FFD700 0%,transparent 60%)" },
  Mythic:    { border:"#a855f7", glow:"#a855f7", bg:"#160028", labelBg:"#6d28d9", label:"MYTHIC",    borderW:3, icon:"M", cornerGrad:"linear-gradient(135deg,#a855f7 0%,transparent 60%)" },
  Legendary: { border:"#f59e0b", glow:"#f59e0b", bg:"#1a0e00", labelBg:"#b45309", label:"LEGEND",    borderW:3, icon:"L", cornerGrad:"linear-gradient(135deg,#f59e0b 0%,transparent 60%)" },
  Epic:      { border:"#ec4899", glow:"#ec4899", bg:"#1a0015", labelBg:"#9d174d", label:"EPIC",      borderW:2, icon:"E", cornerGrad:"linear-gradient(135deg,#ec4899 0%,transparent 60%)" },
  Rare:      { border:"#3b82f6", glow:"#3b82f6", bg:"#051530", labelBg:"#1d4ed8", label:"RARE",      borderW:2, icon:"R", cornerGrad:"linear-gradient(135deg,#3b82f6 0%,transparent 60%)" },
  Common:    { border:"#6b7280", glow:"#6b7280", bg:"#0f1117", labelBg:"#374151", label:"COMMON",    borderW:1, icon:"C", cornerGrad:"linear-gradient(135deg,#6b7280 0%,transparent 60%)" },
};

const LABELS: Record<string, string> = {
  "vbms_special":"VBMS Special",
  "jesse":"Jesse","anon":"Anon","linda xied":"Linda Xied","vitalik jumpterin":"Vitalik",
  "antonio":"Antonio","goofy romero":"Goofy Romero","tukka":"Tukka","chilipepper":"Chilli Pepper",
  "miguel":"Miguel","ye":"Ye","nico":"Nico","sartocrates":"Sartocrates",
  "0xdeployer":"0xDeployer","lombra jr":"Lombra Jr","vibe intern":"Vibe Intern",
  "jack the sniper":"Jack Sniper","beeper":"Beeper","horsefarts":"Horsefarts","jc denton":"JC Denton",
  "zurkchad":"Zurkchad","slaterg":"Slaterg","brian armstrong":"B. Armstrong","nftkid":"NFTKid",
  "smolemaru":"Smolemaru","ventra":"Ventra","bradymck":"Bradymck","shills":"Shills",
  "betobutter":"Betobutter","qrcodo":"Qrcodo","loground":"Loground","melted":"Melted",
  "rachel":"Rachel","claude":"Claude","gozaru":"Gozaru","ink":"Ink",
  "casa":"Casa","groko":"Groko","rizkybegitu":"Rizkybegitu","thosmur":"Thosmur",
  "brainpasta":"Brainpasta","gaypt":"Gaypt","dan romero":"Dan Romero","morlacos":"Morlacos",
  "landmine":"Landmine","linux":"Linux","joonx":"Joonx","don filthy":"Don Filthy",
  "pooster":"Pooster","john porn":"John Porn","scum":"Scum","vlady":"Vlady",
};

const POOL: Array<{ baccarat: string; rarity: string; weight: number }> = [
  { baccarat:"vbms_special",rarity:"Special",weight:5 },
  { baccarat:"jesse",rarity:"Mythic",weight:1 },{ baccarat:"anon",rarity:"Mythic",weight:1 },
  { baccarat:"linda xied",rarity:"Mythic",weight:1 },{ baccarat:"vitalik jumpterin",rarity:"Mythic",weight:1 },
  { baccarat:"antonio",rarity:"Legendary",weight:3 },{ baccarat:"goofy romero",rarity:"Legendary",weight:3 },
  { baccarat:"tukka",rarity:"Legendary",weight:3 },{ baccarat:"chilipepper",rarity:"Legendary",weight:3 },
  { baccarat:"miguel",rarity:"Legendary",weight:3 },{ baccarat:"ye",rarity:"Legendary",weight:3 },
  { baccarat:"nico",rarity:"Legendary",weight:3 },
  { baccarat:"sartocrates",rarity:"Epic",weight:6 },{ baccarat:"0xdeployer",rarity:"Epic",weight:6 },
  { baccarat:"lombra jr",rarity:"Epic",weight:6 },{ baccarat:"vibe intern",rarity:"Epic",weight:6 },
  { baccarat:"jack the sniper",rarity:"Epic",weight:6 },{ baccarat:"beeper",rarity:"Epic",weight:6 },
  { baccarat:"horsefarts",rarity:"Epic",weight:6 },{ baccarat:"jc denton",rarity:"Epic",weight:6 },
  { baccarat:"zurkchad",rarity:"Epic",weight:6 },{ baccarat:"slaterg",rarity:"Epic",weight:6 },
  { baccarat:"brian armstrong",rarity:"Epic",weight:6 },{ baccarat:"nftkid",rarity:"Epic",weight:6 },
  { baccarat:"smolemaru",rarity:"Rare",weight:10 },{ baccarat:"ventra",rarity:"Rare",weight:10 },
  { baccarat:"bradymck",rarity:"Rare",weight:10 },{ baccarat:"shills",rarity:"Rare",weight:10 },
  { baccarat:"betobutter",rarity:"Rare",weight:10 },{ baccarat:"qrcodo",rarity:"Rare",weight:10 },
  { baccarat:"loground",rarity:"Rare",weight:10 },{ baccarat:"melted",rarity:"Rare",weight:10 },
  { baccarat:"rachel",rarity:"Common",weight:20 },{ baccarat:"claude",rarity:"Common",weight:20 },
  { baccarat:"gozaru",rarity:"Common",weight:20 },{ baccarat:"ink",rarity:"Common",weight:20 },
  { baccarat:"casa",rarity:"Common",weight:20 },{ baccarat:"groko",rarity:"Common",weight:20 },
  { baccarat:"rizkybegitu",rarity:"Common",weight:20 },{ baccarat:"thosmur",rarity:"Common",weight:20 },
  { baccarat:"brainpasta",rarity:"Common",weight:20 },{ baccarat:"gaypt",rarity:"Common",weight:20 },
  { baccarat:"dan romero",rarity:"Common",weight:20 },{ baccarat:"morlacos",rarity:"Common",weight:20 },
  { baccarat:"landmine",rarity:"Common",weight:20 },{ baccarat:"linux",rarity:"Common",weight:20 },
  { baccarat:"joonx",rarity:"Common",weight:20 },{ baccarat:"don filthy",rarity:"Common",weight:20 },
  { baccarat:"pooster",rarity:"Common",weight:20 },{ baccarat:"john porn",rarity:"Common",weight:20 },
  { baccarat:"scum",rarity:"Common",weight:20 },{ baccarat:"vlady",rarity:"Common",weight:20 },
];
const TOTAL_W = POOL.reduce((s, c) => s + c.weight, 0);

function pick(): SlotCard {
  let r = Math.random() * TOTAL_W;
  for (const c of POOL) { r -= c.weight; if (r <= 0) return { baccarat: c.baccarat, rarity: c.rarity }; }
  return { baccarat: "claude", rarity: "Common" };
}

const PAYOUTS: [string, string, string][] = [
  ["4× Mythic",   "50.000","#a855f7"],["4× Legendary","5.000", "#f59e0b"],
  ["4× Epic",     "800",   "#ec4899"],["4× Rare",     "120",   "#3b82f6"],["4× Common","12","#6b7280"],
  ["3× Mythic",   "2.000", "#a855f7"],["3× Legendary","300",   "#f59e0b"],
  ["3× Epic",     "80",    "#ec4899"],["3× Rare",     "20",    "#3b82f6"],["3× Common","4", "#6b7280"],
  ["2× Mythic",   "100",   "#a855f7"],["2× Legendary","20",    "#f59e0b"],
  ["VBMS ×4 (scatter)","30.000","#FFD700"],["VBMS ×3","1.500","#FFD700"],["VBMS ×2","100","#FFD700"],
];

export default function SlotMachine({ onWalletOpen }: { onWalletOpen?: () => void }) {
  const { isConnected, address } = useAccount();
  const { userProfile } = useProfile();
  const spinMut = useMutation(api.slot.spinSlot);
  const statsQ  = useQuery(api.slot.getSlotDailyStats, { address: address || "" });

  const [cells, setCells]         = useState<SlotCard[]>(() => Array.from({ length: TOTAL_CELLS }, pick));
  const [isSpinning, setIsSpinning] = useState(false);
  const [stopped, setStopped]     = useState<Set<number>>(new Set([0,1,2,3,4]));
  const [winCells, setWinCells]   = useState<Set<number>>(new Set());
  const [winAmt, setWinAmt]       = useState<number | null>(null);
  const [isJackpot, setIsJackpot] = useState(false);
  const [betIdx, setBetIdx]       = useState(0);
  const [showPayouts, setShowPayouts] = useState(false);

  const ivs = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  const freeLeft = statsQ?.remainingFreeSpins ?? 0;
  const coins    = userProfile?.coins ?? 0;
  const betMult  = BET_OPTIONS[betIdx];
  const betCost  = betMult;
  const bonusCost = betCost * BONUS_COST_MULT;

  // Access control — apenas wallets autorizados
  const isAllowed = !address || ALLOWED_ADDRESSES.includes(address.toLowerCase());

  const startCol = useCallback((col: number) => {
    ivs.current[col] = setInterval(() => {
      setCells(prev => {
        const n = [...prev];
        for (let r = 0; r < ROWS; r++) n[r * COLS + col] = pick();
        return n;
      });
    }, 75);
  }, []);

  const stopCol = useCallback((col: number, c0: SlotCard, c1: SlotCard) => {
    clearInterval(ivs.current[col]);
    delete ivs.current[col];
    setCells(prev => { const n = [...prev]; n[col] = c0; n[COLS + col] = c1; return n; });
    setStopped(prev => new Set([...prev, col]));
  }, []);

  const parseWin = (patterns: string[]): Set<number> => {
    const s = new Set<number>();
    for (const p of patterns) {
      if (/^Row 1/i.test(p)) { for (let c = 0; c < COLS; c++) s.add(c); }
      else if (/^Row 2/i.test(p)) { for (let c = 0; c < COLS; c++) s.add(COLS + c); }
      else if (/^Col (\d)/i.test(p)) {
        const col = parseInt(p.match(/\d/)![0]) - 1;
        if (col < COLS) { s.add(col); s.add(COLS + col); }
      } else if (/Diagonal/i.test(p)) {
        // for 5×2 grid, diagonal = all cells
        for (let i = 0; i < TOTAL_CELLS; i++) s.add(i);
      } else if (/VBMS Special/i.test(p)) {
        // highlight all VBMS special cells
        cells.forEach((c, i) => { if (c.baccarat === "vbms_special") s.add(i); });
      }
    }
    return s;
  };

  const spin = async (isFree: boolean, bonusMode = false) => {
    if (!isConnected || !address) { toast.error("Conecte a carteira!"); return; }
    if (!isAllowed) { toast.error("Acesso restrito!"); return; }
    if (isSpinning) return;
    if (isFree && freeLeft <= 0) { toast.error("Sem free spins hoje!"); return; }
    const cost = bonusMode ? bonusCost : betCost;
    if (!isFree && coins < cost) { toast.error(`Precisa de ${cost} coins!`); return; }

    setIsSpinning(true); setWinCells(new Set()); setWinAmt(null); setIsJackpot(false);
    setStopped(new Set());
    for (let c = 0; c < COLS; c++) startCol(c);

    try {
      const res = await spinMut({
        address,
        isFreeSpin: isFree,
        bonusMultiplier: bonusMode ? 2 : 1,
        betMultiplier: isFree ? 1 : betMult,
      }) as SpinResult;
      const grid = res.grid;

      for (let col = 0; col < COLS; col++) {
        const delay = col * 260;
        setTimeout(() => {
          const bc = Math.min(col, grid.length / 2 - 1);
          stopCol(col, grid[bc] ?? pick(), grid[Math.floor(grid.length / 2) + bc] ?? pick());
          if (col === COLS - 1) {
            setTimeout(() => {
              setIsSpinning(false); setWinAmt(res.winAmount); setIsJackpot(res.maxWin);
              if (res.winAmount > 0) {
                setWinCells(parseWin(res.patterns));
                toast.success(`+${res.winAmount.toLocaleString()} coins!`);
              }
            }, 120);
          }
        }, delay);
      }
    } catch (err: any) {
      Object.values(ivs.current).forEach(clearInterval); ivs.current = {};
      setIsSpinning(false); setStopped(new Set([0,1,2,3,4]));
      toast.error(err.data?.message || err.message || "Erro no spin");
    }
  };

  const renderCard = (card: SlotCard, idx: number) => {
    const col   = idx % COLS;
    const spinning  = !stopped.has(col);
    const isWin = !spinning && winCells.has(idx);
    const s     = RS[card.rarity] ?? RS.Common;
    const img   = card.baccarat === "vbms_special"
      ? VBMS_SPECIAL_IMG
      : getVbmsBaccaratImageUrl(card.baccarat);
    const label = LABELS[card.baccarat] ?? card.baccarat;

    const borderColor = isWin ? "#FFD700" : s.border;
    const borderW     = isWin ? 3 : s.borderW;

    const rarityAnim = !spinning && !isWin
      ? card.rarity === "Mythic"    ? "mythic-border 1.6s ease-in-out infinite"
      : card.rarity === "Legendary" ? "legendary-border 1.8s ease-in-out infinite"
      : undefined
      : undefined;

    return (
      <div
        className={`absolute inset-0 flex flex-col overflow-hidden ${spinning ? "slot-spin" : "transition-all duration-150"}`}
        style={{
          border: `${borderW}px solid ${borderColor}`,
          boxShadow: isWin
            ? `0 0 20px #FFD700, 0 0 8px #FFD700, inset 0 0 16px #FFD70033`
            : undefined,
          animation: rarityAnim,
          background: s.bg,
        }}
      >
        {/* Rarity corner triangle */}
        <div
          className="absolute top-0 left-0 w-5 h-5 z-10 pointer-events-none"
          style={{ background: s.cornerGrad }}
        >
          <span className="absolute top-0 left-0.5 text-[7px] font-black leading-none" style={{ color: s.border }}>
            {s.icon}
          </span>
        </div>

        {/* Card image */}
        <div className="relative flex-1 overflow-hidden min-h-0">
          {img ? (
            <Image src={img} alt={label} fill sizes="80px" className="object-cover object-top" unoptimized />
          ) : (
            <div className="flex items-center justify-center h-full text-[9px] font-black text-gray-300 px-0.5 text-center leading-tight">
              {label.toUpperCase()}
            </div>
          )}
          {!spinning && (card.rarity === "Mythic" || card.rarity === "Legendary") && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${s.glow}22 0%, transparent 50%, ${s.glow}11 100%)` }}
            />
          )}
          {isWin   && <div className="absolute inset-0 bg-yellow-300/20 animate-pulse pointer-events-none" />}
          {spinning && <div className="absolute inset-0 bg-black/55 pointer-events-none" />}
        </div>

        {/* Name label — full name, auto-shrink font */}
        <div
          className="shrink-0 flex items-center gap-0.5 px-0.5 py-[2px]"
          style={{ background: isWin ? "#92400e" : s.labelBg }}
        >
          <span className="text-[5px] font-black leading-none shrink-0" style={{ color: s.border }}>{s.icon}</span>
          <span
            className="text-[5px] font-black text-white truncate leading-none flex-1 text-center"
            style={{ fontSize: label.length > 12 ? "4px" : "5px" }}
          >
            {label.toUpperCase()}
          </span>
        </div>
      </div>
    );
  };

  const wood = "linear-gradient(180deg,#7a4520 0%,#3d1c02 35%,#6b3a1a 65%,#3d1c02 100%)";
  const dark = "linear-gradient(180deg,#1a0900 0%,#0d0500 100%)";

  // Tela de acesso restrito
  if (address && !isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <div className="text-4xl font-black" style={{ color:"#FFD700" }}>ACESSO RESTRITO</div>
        <div className="text-sm text-gray-400">Este slot machine e privado e esta em desenvolvimento.</div>
        <div className="text-xs text-gray-600 font-mono break-all">{address}</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes slot-blur {
          0%   { transform:translateY(-5px); filter:blur(2px) brightness(1.15); }
          50%  { transform:translateY(5px);  filter:blur(3px) brightness(0.85); }
          100% { transform:translateY(-5px); filter:blur(2px) brightness(1.15); }
        }
        .slot-spin { animation: slot-blur 0.1s ease-in-out infinite; }
        @keyframes win-pulse {
          0%,100%{ opacity:1; transform:scale(1); }
          50%    { opacity:0.75; transform:scale(1.015); }
        }
        .win-pulse { animation: win-pulse 0.45s ease-in-out infinite; }
        @keyframes jackpot-glow {
          0%,100%{ text-shadow:0 0 6px #a855f7,0 0 14px #a855f7; }
          50%    { text-shadow:0 0 20px #a855f7,0 0 40px #a855f7,0 0 60px #c084fc; }
        }
        .jackpot-text { animation: jackpot-glow 0.7s ease-in-out infinite; }
        @keyframes mythic-border {
          0%,100%{ box-shadow:0 0 8px #a855f7, 0 0 2px #a855f7, inset 0 0 8px rgba(168,85,247,0.15); }
          50%    { box-shadow:0 0 18px #a855f7, 0 0 6px #c084fc, inset 0 0 14px rgba(168,85,247,0.25); }
        }
        @keyframes legendary-border {
          0%,100%{ box-shadow:0 0 8px #f59e0b, 0 0 2px #f59e0b, inset 0 0 6px rgba(245,158,11,0.1); }
          50%    { box-shadow:0 0 16px #fbbf24, 0 0 5px #fde68a, inset 0 0 12px rgba(245,158,11,0.2); }
        }
        @keyframes subtitle-blink {
          0%,45%  { opacity:1; }
          50%,95% { opacity:0.25; }
          100%    { opacity:1; }
        }
        .subtitle-blink { animation: subtitle-blink 1.4s ease-in-out infinite; }
      `}</style>

      {/* Payout Table Modal */}
      {showPayouts && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80" onClick={() => setShowPayouts(false)}>
          <div
            className="w-full max-w-xs overflow-hidden rounded-xl border-4"
            style={{ borderColor:"#c87941", background:"#0d0500", boxShadow:"4px 4px 0 #000" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-[#c87941]" style={{ background: wood }}>
              <span className="font-black text-sm uppercase tracking-widest" style={{ color:"#FFD700", textShadow:"1px 1px 0 #000" }}>
                Tabela de Premios
              </span>
              <button onClick={() => setShowPayouts(false)} className="w-6 h-6 rounded-full bg-red-600 border-2 border-black font-black text-white text-sm flex items-center justify-center">x</button>
            </div>
            <div className="p-3 space-y-1">
              {PAYOUTS.map(([k, v, col]) => (
                <div key={k} className="flex justify-between items-center px-2 py-1 rounded border border-[#c8794130]" style={{ background:"#100500" }}>
                  <span className="text-[11px] font-bold" style={{ color: col }}>{k}</span>
                  <span className="text-[11px] font-black text-yellow-400">{v} coins</span>
                </div>
              ))}
              <p className="text-[9px] text-center text-gray-500 pt-1">Premios escalam com o valor da aposta (x{betMult})</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full w-full max-w-[420px] mx-auto select-none">
        {/* MACHINE FRAME */}
        <div
          className="flex flex-col flex-1 min-h-0 w-full overflow-hidden border-4"
          style={{
            borderColor: "#c87941",
            boxShadow: "0 0 0 2px #0d0500, inset 0 1px 0 rgba(255,200,100,0.2)",
            background: wood,
          }}
        >
          {/* HEADER */}
          <div className="shrink-0 px-4 pt-2 pb-1.5 border-b-4 border-[#c87941]" style={{ background: dark }}>
            <div className="flex items-center justify-between">
              {/* Titulo centralizado */}
              <div className="flex-1 text-center">
                <div
                  className="text-xl font-black uppercase leading-none"
                  style={{
                    color:"#FFD700",
                    textShadow:"0 0 12px rgba(255,215,0,0.6),1px 2px 0 #000",
                    fontFamily:"var(--font-cinzel,Georgia,serif)",
                    letterSpacing:"0.08em",
                  }}
                >
                  VIBE SLOTS
                </div>
                <div
                  className="subtitle-blink text-[10px] font-bold uppercase tracking-[0.12em] mt-0.5"
                  style={{ color:"#f59e0b" }}
                >
                  WIN UP TO 50.000 COINS
                </div>
              </div>
              {/* Balance + Premios */}
              <div className="text-right shrink-0">
                <div className="text-[8px] font-bold uppercase text-gray-500">BALANCE</div>
                <div className="text-base font-black text-green-400">{coins.toLocaleString()}</div>
                <button onClick={() => setShowPayouts(true)} className="text-[8px] font-bold underline" style={{ color:"#c87941" }}>Premios</button>
              </div>
            </div>
          </div>

          {/* REEL AREA — flex-1 preenche o espaço disponível */}
          <div
            className="flex-1 min-h-0 relative overflow-hidden"
            style={{
              background: "linear-gradient(180deg,#000 0%,#100500 40%,#080200 70%,#000 100%)",
              boxShadow: "inset 0 12px 28px rgba(0,0,0,0.98), inset 0 -12px 28px rgba(0,0,0,0.98)",
            }}
          >
            {/* Payline dots */}
            <div className="absolute left-0.5 top-0 bottom-0 z-20 flex flex-col justify-around pointer-events-none">
              <div className="w-4 h-4 rounded-full bg-[#FFD700] border-2 border-black shadow-lg" />
              <div className="w-4 h-4 rounded-full bg-[#FFD700] border-2 border-black shadow-lg" />
            </div>
            <div className="absolute right-0.5 top-0 bottom-0 z-20 flex flex-col justify-around pointer-events-none">
              <div className="w-4 h-4 rounded-full bg-[#FFD700] border-2 border-black shadow-lg" />
              <div className="w-4 h-4 rounded-full bg-[#FFD700] border-2 border-black shadow-lg" />
            </div>

            {/* Cards grid — preenche todo o espaco disponivel */}
            <div
              className="absolute inset-0 mx-6 my-2"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gridTemplateRows:    `repeat(${ROWS}, 1fr)`,
                gap: "3px",
              }}
            >
              {cells.map((card, i) => (
                <div
                  key={i}
                  className="relative"
                  style={{
                    borderRight: i % COLS < COLS - 1 ? "1px solid rgba(200,121,65,0.18)" : "none",
                  }}
                >
                  {renderCard(card, i)}
                </div>
              ))}
            </div>
          </div>

          {/* WIN BAR */}
          <div
            className={`shrink-0 text-center py-1.5 border-y-2 border-[#c87941] min-h-[32px] flex items-center justify-center ${winAmt !== null && winAmt > 0 ? "win-pulse" : ""}`}
            style={{
              background: winAmt !== null && winAmt > 0
                ? "linear-gradient(90deg,#78350f 0%,#d97706 40%,#fbbf24 50%,#d97706 60%,#78350f 100%)"
                : dark,
            }}
          >
            {winAmt === null ? (
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:"#c87941" }}>
                {freeLeft > 0 ? `${freeLeft} FREE SPIN${freeLeft > 1 ? "S" : ""} disponiveis` : "Match 4 em linha para ganhar"}
              </span>
            ) : winAmt > 0 ? (
              <div>
                <div className="text-lg font-black text-white" style={{ textShadow:"1px 1px 0 #000,0 0 10px #FFD700" }}>
                  +{winAmt.toLocaleString()} COINS!
                </div>
                {isJackpot && <div className="text-xs font-black text-purple-300 jackpot-text">JACKPOT MAXIMO!</div>}
              </div>
            ) : (
              <span className="text-xs font-bold" style={{ color:"#c87941" }}>Sem linhas ganhadoras</span>
            )}
          </div>

          {/* PLACE YOUR BETS */}
          <div className="shrink-0 py-1 text-center border-b-2 border-[#c87941]" style={{ background: dark }}>
            <span className="text-sm font-black uppercase tracking-[0.22em]" style={{ color:"#FFD700", textShadow:"1px 1px 0 #000,0 0 8px rgba(255,215,0,0.35)" }}>
              PLACE YOUR BETS!
            </span>
          </div>

          {/* CONTROLS */}
          <div
            className="shrink-0 px-3 pt-2 pb-2"
            style={{ background: wood, paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Row 1: WALLET | SPIN | BONUS */}
            <div className="flex items-center gap-2 mb-2">

              {/* WALLET */}
              <button
                onClick={onWalletOpen}
                disabled={!onWalletOpen}
                className="flex-1 h-10 border-2 border-black font-black text-[10px] uppercase tracking-wide active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center"
                style={{
                  background: "linear-gradient(180deg,#7a4520,#3d1c02)",
                  color: "#FFD700",
                  boxShadow: "0 3px 0 #000",
                  textShadow: "1px 1px 0 #000",
                  borderColor: "#c87941",
                }}
              >
                💰 WALLET
              </button>

              {/* SPIN — centro */}
              <button
                onClick={() => spin(freeLeft > 0)}
                disabled={isSpinning || (!freeLeft && coins < betCost)}
                className="w-14 h-14 rounded-full border-4 border-black font-black flex-none flex flex-col items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
                style={{
                  background: isSpinning
                    ? "linear-gradient(180deg,#6b7280,#4b5563)"
                    : freeLeft > 0
                      ? "linear-gradient(180deg,#34d399 0%,#059669 50%,#047857 100%)"
                      : "linear-gradient(180deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)",
                  boxShadow: isSpinning ? "0 2px 0 #000" : "0 5px 0 #000, 0 0 18px rgba(251,191,36,0.55)",
                  color: "#000",
                  transform: isSpinning ? "translateY(3px)" : undefined,
                }}
              >
                <span className={`text-[10px] font-black leading-none tracking-widest ${isSpinning ? "animate-spin" : ""}`}>
                  {freeLeft > 0 ? "FREE" : "SPIN"}
                </span>
                {freeLeft > 0 && !isSpinning && (
                  <span className="text-[8px] font-black mt-0.5 text-green-900">{freeLeft}x</span>
                )}
              </button>

              {/* BONUS */}
              <button
                onClick={() => spin(false, true)}
                disabled={isSpinning || coins < bonusCost}
                className="flex-1 h-10 border-2 border-black font-black text-[10px] uppercase tracking-wide active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center"
                style={{
                  background: isSpinning || coins < bonusCost
                    ? "linear-gradient(180deg,#374151,#1f2937)"
                    : "linear-gradient(180deg,#7c3aed,#4c1d95)",
                  color: "#FFD700",
                  boxShadow: "0 3px 0 #000",
                  textShadow: "1px 1px 0 #000",
                  borderColor: "#7c3aed",
                }}
              >
                ⚡ BONUS
              </button>
            </div>

            {/* Row 2: BET SELECTOR */}
            <div
              className="flex items-center gap-3 px-3 py-1.5 border-2 border-black rounded"
              style={{
                background: freeLeft > 0
                  ? "linear-gradient(180deg,#1a2e1a,#0d1a0d)"
                  : "linear-gradient(180deg,#1e3a5f,#172554)",
                opacity: freeLeft > 0 ? 0.65 : 1,
              }}
            >
              <button
                onClick={() => setBetIdx(i => Math.max(0, i - 1))}
                disabled={betIdx === 0 || isSpinning || freeLeft > 0}
                className="w-7 h-7 rounded border-2 border-blue-400 bg-blue-900 font-black text-blue-300 text-base flex items-center justify-center disabled:opacity-30 flex-none"
              >−</button>
              <div className="flex-1 text-center">
                <div className="text-[8px] font-bold uppercase text-blue-300 leading-none">BET PER SPIN</div>
                <div className="text-lg font-black text-white leading-tight">{betCost}</div>
                <div className="text-[8px] font-bold leading-none" style={{ color: freeLeft > 0 ? "#34d399" : "#6b7280" }}>
                  {freeLeft > 0 ? "FREE MODE" : "coins"}
                </div>
              </div>
              <button
                onClick={() => setBetIdx(i => Math.min(BET_OPTIONS.length - 1, i + 1))}
                disabled={betIdx === BET_OPTIONS.length - 1 || isSpinning || freeLeft > 0}
                className="w-7 h-7 rounded border-2 border-blue-400 bg-blue-900 font-black text-blue-300 text-base flex items-center justify-center disabled:opacity-30 flex-none"
              >+</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
