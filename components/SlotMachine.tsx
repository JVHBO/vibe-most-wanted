"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import Image from "next/image";
import { getVbmsBaccaratImageUrl } from "@/lib/tcg/images";
import { playTrackedAudio } from "@/lib/tcg/audio";

const COLS = 5;
const ROWS = 2;
const TOTAL_CELLS = COLS * ROWS;
const BET_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const BONUS_COST_MULT = 5; // BUY BONUS = 5× bet atual
const BONUS_FREE_SPINS = 5;
const BONUS_FOIL_COUNT = 4;

// GIF de cassino para VBMS Special (slot animation)
// Coloque os arquivos em public/slot-gifs/
const CASINO_SLOT_GIF = "/slot-gifs/casino-slot-animation.gif"; // GIF de cassino para a carta especial
const WILDCARD_GIFS = {
  "gen4_turbo": "/slot-gifs/gen4-turbo-idle-breathing.gif",
  "idle_breathing": "/slot-gifs/gen4-turbo-idle-breathing.gif", // alias
};

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

interface SlotCard { baccarat: string; rarity: string; hasFoil?: boolean; }
interface SpinResult {
  grid: SlotCard[];
  winAmount: number;
  patterns: string[];
  maxWin: boolean;
  foilCount: number;
  triggeredBonus: boolean;
  bonusSpinsRemaining: number;
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

// Combo names + audio for each character (reuses TCG combo voice files)
const SLOT_COMBOS: Record<string, { name: string; audio: string; color: string }> = {
  // Special
  "_vbms":            { name: "GOLDEN MACHINE!",      audio: "/sounds/combos/money_makers.mp3",      color: "#FFD700" },
  "_mythics":         { name: "MYTHIC ASSEMBLY!",     audio: "/sounds/combos/mythic.mp3",            color: "#a855f7" },
  "_legendaries":     { name: "LEGENDS UNITE!",       audio: "/sounds/combos/legends_unite.mp3",     color: "#f59e0b" },
  // Mythics
  "jesse":            { name: "JESSE'S BACK!",        audio: "/sounds/combos/chaos_agents.mp3",      color: "#a855f7" },
  "anon":             { name: "ANON STRIKES!",        audio: "/sounds/combos/shadow_network.mp3",    color: "#a855f7" },
  "linda xied":       { name: "LINDA XIED WINS!",     audio: "/sounds/combos/mythic.mp3",            color: "#a855f7" },
  "vitalik jumpterin":{ name: "VITALIK WINS!",        audio: "/sounds/combos/scaling_masters.mp3",   color: "#a855f7" },
  // Legendaries
  "antonio":          { name: "ANTONIO PARTY!",       audio: "/sounds/combos/chaos_agents.mp3",      color: "#f59e0b" },
  "goofy romero":     { name: "ROMERO FAMILY!",       audio: "/sounds/combos/romero.mp3",            color: "#f59e0b" },
  "dan romero":       { name: "ROMERO FAMILY!",       audio: "/sounds/combos/romero.mp3",            color: "#f59e0b" },
  "tukka":            { name: "TUKKA POWER!",         audio: "/sounds/combos/degen_trio.mp3",        color: "#f59e0b" },
  "chilipepper":      { name: "CHILLI HEAT!",         audio: "/sounds/combos/chaos_agents.mp3",      color: "#f59e0b" },
  "miguel":           { name: "MIGUEL MODO!",         audio: "/sounds/combos/degen_trio.mp3",        color: "#f59e0b" },
  "ye":               { name: "YE SUPREMACY!",        audio: "/sounds/combos/royal_brothers.mp3",    color: "#f59e0b" },
  "nico":             { name: "NICO ATTACK!",         audio: "/sounds/combos/scam_squad.mp3",        color: "#f59e0b" },
  // Epics
  "sartocrates":      { name: "PHILOSOPHER'S WIN!",   audio: "/sounds/combos/philosopher_chad.mp3",  color: "#ec4899" },
  "0xdeployer":       { name: "0xDEPLOYER RISES!",    audio: "/sounds/combos/code_masters.mp3",      color: "#ec4899" },
  "lombra jr":        { name: "LOMBRA JR LANDS!",     audio: "/sounds/combos/underdog_uprising.mp3", color: "#ec4899" },
  "vibe intern":      { name: "VIBE INTERN WINS!",    audio: "/sounds/combos/vibe_team.mp3",         color: "#ec4899" },
  "jack the sniper":  { name: "SNIPER ELITE!",        audio: "/sounds/combos/sniper_elite.mp3",      color: "#ec4899" },
  "beeper":           { name: "BEEPER BLOWS UP!",     audio: "/sounds/combos/chaos_agents.mp3",      color: "#ec4899" },
  "horsefarts":       { name: "HORSEFARTS HOT!",      audio: "/sounds/combos/dirty_duo.mp3",         color: "#ec4899" },
  "jc denton":        { name: "JC DENTON HACKS!",     audio: "/sounds/combos/ai_takeover.mp3",       color: "#ec4899" },
  "zurkchad":         { name: "ZURKCHAD WINS!",       audio: "/sounds/combos/cryptokings.mp3",       color: "#ec4899" },
  "slaterg":          { name: "SLATERG SCORES!",      audio: "/sounds/combos/pixel_artists.mp3",     color: "#ec4899" },
  "brian armstrong":  { name: "COINBASE WIN!",        audio: "/sounds/combos/cryptokings.mp3",       color: "#ec4899" },
  "nftkid":           { name: "NFT KID GANG!",        audio: "/sounds/combos/content_creators.mp3",  color: "#ec4899" },
  // Rares
  "smolemaru":        { name: "SMOLEMARU COMBO!",     audio: "/sounds/combos/degen_trio.mp3",        color: "#3b82f6" },
  "ventra":           { name: "VENTRA VIBES!",        audio: "/sounds/combos/vibe_team.mp3",         color: "#3b82f6" },
  "bradymck":         { name: "BRADYMCK BLAST!",      audio: "/sounds/combos/content_creators.mp3",  color: "#3b82f6" },
  "shills":           { name: "SHILLS ARMY!",         audio: "/sounds/combos/scam_squad.mp3",        color: "#3b82f6" },
  "betobutter":       { name: "BETO BUTTER!",         audio: "/sounds/combos/money_makers.mp3",      color: "#3b82f6" },
  "qrcodo":           { name: "QRCODO CODES!",        audio: "/sounds/combos/code_masters.mp3",      color: "#3b82f6" },
  "loground":         { name: "LOGROUND WINS!",       audio: "/sounds/combos/underdog_uprising.mp3", color: "#3b82f6" },
  "melted":           { name: "MELTED MELTS!",        audio: "/sounds/combos/chaos_agents.mp3",      color: "#3b82f6" },
  // Commons
  "rachel":           { name: "RACHEL RULES!",        audio: "/sounds/combos/content_creators.mp3",  color: "#9ca3af" },
  "claude":           { name: "AI TAKEOVER!",         audio: "/sounds/combos/ai_takeover.mp3",       color: "#9ca3af" },
  "gozaru":           { name: "GOZARU GRINDS!",       audio: "/sounds/combos/degen_trio.mp3",        color: "#9ca3af" },
  "ink":              { name: "INK DROPS!",           audio: "/sounds/combos/pixel_artists.mp3",     color: "#9ca3af" },
  "casa":             { name: "CASA WINS!",           audio: "/sounds/combos/vibe_team.mp3",         color: "#9ca3af" },
  "groko":            { name: "GROKO GANG!",          audio: "/sounds/combos/chaos_agents.mp3",      color: "#9ca3af" },
  "rizkybegitu":      { name: "RIZKY RISES!",         audio: "/sounds/combos/underdog_uprising.mp3", color: "#9ca3af" },
  "thosmur":          { name: "THOSMUR HITS!",        audio: "/sounds/combos/degen_trio.mp3",        color: "#9ca3af" },
  "brainpasta":       { name: "BRAIN PASTA!",         audio: "/sounds/combos/philosopher_chad.mp3",  color: "#9ca3af" },
  "gaypt":            { name: "GAYPT GANG!",          audio: "/sounds/combos/scam_squad.mp3",        color: "#9ca3af" },
  "morlacos":         { name: "MORLACOS SMASH!",      audio: "/sounds/combos/chaos_agents.mp3",      color: "#9ca3af" },
  "landmine":         { name: "LANDMINE DEGENS!",     audio: "/sounds/combos/dirty_money.mp3",       color: "#9ca3af" },
  "linux":            { name: "LINUX LORDS!",         audio: "/sounds/combos/code_masters.mp3",      color: "#9ca3af" },
  "joonx":            { name: "JOONX JACKPOT!",      audio: "/sounds/combos/money_makers.mp3",      color: "#9ca3af" },
  "don filthy":       { name: "DON FILTHY WINS!",     audio: "/sounds/combos/dirty_money.mp3",       color: "#9ca3af" },
  "pooster":          { name: "POOSTER POPS!",        audio: "/sounds/combos/content_creators.mp3",  color: "#9ca3af" },
  "john porn":        { name: "JOHN P. HITS!",        audio: "/sounds/combos/dirty_duo.mp3",         color: "#9ca3af" },
  "scum":             { name: "SCUM WINS!",           audio: "/sounds/combos/shadow_network.mp3",    color: "#9ca3af" },
  "vlady":            { name: "VLADY VIBES!",         audio: "/sounds/combos/royal_brothers.mp3",    color: "#9ca3af" },
};

function getComboFromPatterns(patterns: string[]): { name: string; audio: string; color: string } | null {
  // Priority 1: VBMS Special scatter
  if (patterns.some(p => /VBMS Special/i.test(p))) return SLOT_COMBOS["_vbms"];
  // Priority 2: Mythics scattered
  if (patterns.some(p => /mythic/i.test(p))) return SLOT_COMBOS["_mythics"];
  // Priority 3: Legendaries scattered
  if (patterns.some(p => /legendary|legend/i.test(p) && /scatter/i.test(p))) return SLOT_COMBOS["_legendaries"];
  // Priority 4: Named character match (e.g. "Row 1: 4x rachel")
  for (const p of patterns) {
    const m = p.match(/\d+x\s+(.+)/i);
    if (m) {
      const char = m[1].trim().toLowerCase();
      if (SLOT_COMBOS[char]) return SLOT_COMBOS[char];
    }
  }
  return null;
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
  const [showBonusConfirm, setShowBonusConfirm] = useState(false);
  const [bonusSpinsRemaining, setBonusSpinsRemaining] = useState(statsQ?.bonusSpinsAvailable || 0);
  const [foilCountDisplay, setFoilCountDisplay] = useState(0);
  const [showBonusAnimation, setShowBonusAnimation] = useState(false);
  const [comboDisplay, setComboDisplay] = useState<{ name: string; audio: string; color: string; winAmt: number } | null>(null);

  const ivs = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  const freeLeft = statsQ?.remainingFreeSpins ?? 0;
  const coins    = userProfile?.coins ?? 0;
  const betMult  = BET_OPTIONS[betIdx];
  const betCost  = betMult;
  const bonusCost = betCost * BONUS_COST_MULT;

  // Sincronizar bonus spins da query
  useEffect(() => {
    if (statsQ?.bonusSpinsAvailable !== undefined) {
      setBonusSpinsRemaining(statsQ.bonusSpinsAvailable);
    }
  }, [statsQ?.bonusSpinsAvailable]);

  // Sincronizar bonus spins da query
  useEffect(() => {
    if (statsQ?.bonusSpinsAvailable !== undefined) {
      setBonusSpinsRemaining(statsQ.bonusSpinsAvailable);
    }
  }, [statsQ?.bonusSpinsAvailable]);

  // Access control — apenas wallets autorizados
  const isAllowed = !address || ALLOWED_ADDRESSES.includes(address.toLowerCase());

  const startCol = useCallback((col: number) => {
    ivs.current[col] = setInterval(() => {
      setCells(prev => {
        const n = [...prev];
        for (let r = 0; r < ROWS; r++) n[r * COLS + col] = pick();
        return n;
      });
    }, 55); // velocidade do shuffle: quanto menor mais cartas passam
  }, []);

  // Para coluna com desaceleração gradual antes de travar na carta final
  const slowAndStopCol = useCallback((col: number, c0: SlotCard, c1: SlotCard) => {
    clearInterval(ivs.current[col]);
    delete ivs.current[col];

    // Sequência de delays crescentes: cada passo mostra uma carta aleatória,
    // o último trava na carta do resultado
    const slowSteps = [90, 130, 180, 240, 320, 420];
    let step = 0;

    const tick = () => {
      if (step >= slowSteps.length) {
        // Trava na carta final
        setCells(prev => {
          const n = [...prev];
          n[col] = c0;
          if (COLS + col < n.length) n[COLS + col] = c1;
          return n;
        });
        setStopped(prev => new Set([...prev, col]));
        return;
      }
      // Ainda mostra cartas aleatórias (desacelerando)
      setCells(prev => {
        const n = [...prev];
        for (let r = 0; r < ROWS; r++) n[r * COLS + col] = pick();
        return n;
      });
      setTimeout(tick, slowSteps[step++]);
    };

    setTimeout(tick, slowSteps[step++]);
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

  const spin = async (isFree: boolean, forceBonusMode = false) => {
    if (!isConnected || !address) { toast.error("Conecte a carteira!"); return; }
    if (!isAllowed) { toast.error("Acesso restrito!"); return; }
    if (isSpinning) return;

    // Check if using bonus spins
    const totalBonusSpins = bonusSpinsRemaining + (freeLeft > 0 ? 0 : 0);
    const isUsingBonus = forceBonusMode || (isFree && bonusSpinsRemaining > 0 && freeLeft <= 0);

    if (isFree && freeLeft <= 0 && !isUsingBonus) {
      toast.error("Sem free spins hoje!");
      return;
    }

    const cost = forceBonusMode || isUsingBonus ? 0 : betCost;
    if (!isFree && !forceBonusMode && coins < cost) {
      toast.error(`Precisa de ${cost} coins!`);
      return;
    }

    setIsSpinning(true);
    setWinCells(new Set());
    setWinAmt(null);
    setIsJackpot(false);
    setStopped(new Set());
    setShowBonusAnimation(false);
    setComboDisplay(null);

    const spinStartTime = Date.now();
    for (let c = 0; c < COLS; c++) startCol(c);

    try {
      const res = await spinMut({
        address,
        isFreeSpin: isFree || isUsingBonus,
        bonusMultiplier: forceBonusMode || isUsingBonus ? 2 : 1,
        betMultiplier: isFree ? 1 : betMult,
        isBonusMode: forceBonusMode || isUsingBonus,
      }) as SpinResult;

      // Atualizar bonus spins restantes
      setBonusSpinsRemaining(res.bonusSpinsRemaining);

      // Mostrar contagem de foil
      setFoilCountDisplay(res.foilCount);

      // Se o bônus foi ativado (4+ foil), mostrar animação
      if (res.triggeredBonus) {
        setShowBonusAnimation(true);
        toast.success(`+${BONUS_FREE_SPINS} FREE SPINS BÔNUS! (${res.foilCount} foil)`);
        setTimeout(() => setShowBonusAnimation(false), 3000);
      }

      // Aplicar grid resultante
      const grid = res.grid;

      // Tempo mínimo de giro para criar suspense (1.8s desde o início)
      const MIN_SPIN_MS = 1800;
      const COL_GAP_MS = 500; // gap entre cada coluna parar
      const elapsed = Date.now() - spinStartTime;
      const baseDelay = Math.max(0, MIN_SPIN_MS - elapsed);

      // Parar colunas sequencialmente com desaceleração
      for (let col = 0; col < COLS; col++) {
        const delay = baseDelay + col * COL_GAP_MS;
        setTimeout(() => {
          const rowCount = ROWS;
          const bc = Math.min(col, grid.length / rowCount - 1);
          const idx0 = bc;
          const idx1 = Math.floor(grid.length / rowCount) + bc;
          slowAndStopCol(col, grid[idx0] ?? pick(), grid[idx1] ?? pick());
          if (col === COLS - 1) {
            // Aguardar fim da desaceleração da última coluna (soma dos slowSteps)
            const lastColSlowTime = 90+130+180+240+320+420 + 150;
            setTimeout(() => {
              setIsSpinning(false);
              setWinAmt(res.winAmount);
              setIsJackpot(res.maxWin);
              if (res.winAmount > 0) {
                setWinCells(parseWin(res.patterns));
                toast.success(`+${res.winAmount.toLocaleString()} coins!`);
                // Combo name overlay + audio
                const combo = getComboFromPatterns(res.patterns);
                if (combo) {
                  setComboDisplay({ ...combo, winAmt: res.winAmount });
                  playTrackedAudio(combo.audio, 0.55);
                  setTimeout(() => setComboDisplay(null), 2800);
                }
              }
            }, lastColSlowTime);
          }
        }, delay);
      }
    } catch (err: any) {
      Object.values(ivs.current).forEach(clearInterval);
      ivs.current = {};
      setIsSpinning(false);
      setStopped(new Set([0,1,2,3,4]));
      toast.error(err.data?.message || err.message || "Erro no spin");
    }
  };

  const renderCard = (card: SlotCard, idx: number) => {
    const col   = idx % COLS;
    const spinning  = !stopped.has(col);
    const isWin = !spinning && winCells.has(idx);
    const s     = RS[card.rarity] ?? RS.Common;

    // Determinar imagem:VBMS Special → GIF de cassino | Wildcards → GIFs animados | Outras → imagens normais
    const isVBMSspecial = card.baccarat === "vbms_special";
    const isWildcard = ["gen4_turbo", "idle_breathing"].includes(card.baccarat);

    const img = isVBMSspecial
      ? CASINO_SLOT_GIF
      : isWildcard
        ? WILDCARD_GIFS[card.baccarat as keyof typeof WILDCARD_GIFS] || getVbmsBaccaratImageUrl(card.baccarat)
        : getVbmsBaccaratImageUrl(card.baccarat);

    const label = LABELS[card.baccarat] ?? card.baccarat;

    const borderColor = isWin ? "#FFD700" : s.border;
    const borderW     = isWin ? 3 : s.borderW;

    // Efeito de foil: shimmer animado + borda brilhante
    const foilEffect = card.hasFoil ? {
      animation: "foil-shimmer 2s ease-in-out infinite",
      border: `${borderW + 1}px solid ${isWin ? '#FFD700' : '#FFA500'}`,
      boxShadow: `0 0 15px ${isWin ? '#FFD700' : '#FFA500'}88, inset 0 0 20px ${isWin ? '#FFD70033' : '#FFA50022'}`
    } : {};

    let rarityAnim: string | undefined = undefined;
    if (!spinning && !isWin && !card.hasFoil) {
      if (card.rarity === "Mythic") {
        rarityAnim = "mythic-border 1.6s ease-in-out infinite";
      } else if (card.rarity === "Legendary") {
        rarityAnim = "legendary-border 1.8s ease-in-out infinite";
      }
    }

    return (
      <div
        className={`absolute inset-0 flex flex-col overflow-hidden ${spinning ? "slot-spin" : "transition-all duration-150"} ${card.hasFoil ? "foil-card" : ""}`}
        style={{
          border: foilEffect.border || `${borderW}px solid ${borderColor}`,
          boxShadow: foilEffect.boxShadow || (isWin
            ? `0 0 20px #FFD700, 0 0 8px #FFD700, inset 0 0 16px #FFD70033`
            : undefined),
          animation: `${rarityAnim || foilEffect.animation || ''}`.trim(),
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
            <Image
              src={img}
              alt={label}
              fill
              sizes="80px"
              className={`object-contain ${isVBMSspecial || isWildcard ? 'animate-pulse' : ''}`}
              unoptimized
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[9px] font-black text-gray-300 px-0.5 text-center leading-tight">
              {label.toUpperCase()}
            </div>
          )}
          {!spinning && (card.rarity === "Mythic" || card.rarity === "Legendary" || isWildcard) && (
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
        @keyframes foil-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .foil-card {
          position: relative;
        }
        .foil-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.4) 25%,
            rgba(255,255,255,0.1) 50%,
            rgba(255,255,255,0.4) 75%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: foil-shimmer 2s ease-in-out infinite;
          pointer-events: none;
          z-index: 5;
        }
        @keyframes combo-reveal {
          0%   { opacity:0; transform:scale(0.4) translateY(30px); }
          18%  { opacity:1; transform:scale(1.12) translateY(-4px); }
          28%  { transform:scale(1); }
          68%  { opacity:1; transform:scale(1); }
          100% { opacity:0; transform:scale(0.85) translateY(-24px); }
        }
        .combo-overlay { animation: combo-reveal 2.8s cubic-bezier(.34,1.56,.64,1) forwards; }
        @keyframes combo-shimmer {
          0%,100% { text-shadow: 0 0 12px var(--cc), 0 0 30px var(--cc); }
          50%     { text-shadow: 0 0 24px var(--cc), 0 0 60px var(--cc), 0 0 90px var(--cc); }
        }
        .combo-text { animation: combo-shimmer 0.6s ease-in-out infinite; }
      `}</style>


      {/* Modal de confirmação BUY BONUS */}
      {showBonusConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/85" onClick={() => setShowBonusConfirm(false)}>
          <div
            className="w-full max-w-[280px] overflow-hidden rounded-xl border-4"
            style={{ borderColor:"#7c3aed", background:"#0d0015", boxShadow:"4px 4px 0 #000" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-2 border-b-2 border-[#7c3aed] flex items-center justify-between" style={{ background:"linear-gradient(180deg,#4c1d95,#2e1065)" }}>
              <span className="font-black text-sm uppercase tracking-widest" style={{ color:"#FFD700", textShadow:"1px 1px 0 #000" }}>BUY BONUS</span>
              <button onClick={() => setShowBonusConfirm(false)} className="w-6 h-6 rounded-full bg-red-600 border-2 border-black font-black text-white text-sm flex items-center justify-center">×</button>
            </div>
            <div className="p-4 text-center space-y-3">
              <div className="text-white text-sm">Custo: <span className="font-black text-purple-300">{bonusCost} coins</span></div>
              <div className="text-gray-400 text-xs">Multiplicador de prêmio: <span className="font-black text-green-400">2×</span></div>
              <div className="text-gray-500 text-[10px]">Saldo atual: <span className="text-white font-bold">{coins.toLocaleString()} coins</span></div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowBonusConfirm(false)}
                  className="flex-1 py-2 border-2 border-gray-600 font-black text-xs uppercase text-gray-400 hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { setShowBonusConfirm(false); spin(false, true); }}
                  className="flex-1 py-2 border-2 border-black font-black text-xs uppercase active:scale-95 transition-transform"
                  style={{ background:"linear-gradient(180deg,#7c3aed,#4c1d95)", color:"#FFD700", textShadow:"1px 1px 0 #000", boxShadow:"0 3px 0 #000" }}
                >
                  Confirmar
                </button>
              </div>
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
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
            </div>
            <div className="absolute right-0.5 top-0 bottom-0 z-20 flex flex-col justify-around pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
            </div>

            {/* Cards grid — preenche todo o espaco disponivel */}
            <div
              className="absolute inset-0 mx-3 my-1"
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
                    // Se for VBMS Special e está nas posições 2-3 (colunas centrais), ocupar 2 colunas
                    gridColumn: card.baccarat === "vbms_special" && (i % COLS === 2 || i % COLS === 3) ? "span 2" : "auto",
                    borderRight: i % COLS < COLS - 1 ? "1px solid rgba(200,121,65,0.18)" : "none",
                  }}
                >
                  {renderCard(card, i)}
                </div>
              ))}
            </div>
          </div>

          {/* COMBO NAME OVERLAY */}
          {comboDisplay && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
              <div
                className="combo-overlay flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-4 border-black"
                style={{
                  background: `linear-gradient(160deg,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.95) 100%)`,
                  boxShadow: `0 0 40px ${comboDisplay.color}88, 0 0 80px ${comboDisplay.color}44, 4px 4px 0 #000`,
                }}
              >
                <div
                  className="combo-text font-black uppercase tracking-widest text-center leading-none"
                  style={{
                    fontSize: "clamp(16px,5vw,26px)",
                    color: comboDisplay.color,
                    ["--cc" as string]: comboDisplay.color,
                  }}
                >
                  {comboDisplay.name}
                </div>
                <div
                  className="font-black text-white text-center"
                  style={{ fontSize: "clamp(12px,3.5vw,18px)", textShadow: `1px 1px 0 #000, 0 0 10px ${comboDisplay.color}` }}
                >
                  +{comboDisplay.winAmt.toLocaleString()} COINS
                </div>
              </div>
            </div>
          )}

          {/* FOIL COUNTER & BONUS INDICATOR */}
          {(foilCountDisplay > 0 || showBonusAnimation) && (
            <div className="absolute top-2 right-2 z-30 px-2 py-1 rounded text-xs font-black border-2"
              style={{
                background: showBonusAnimation ? "#7c3aed" : foilCountDisplay >= 4 ? "#10b981" : "#f59e0b",
                color: "#fff",
                borderColor: "#000",
                boxShadow: "0 2px 0 #000",
              }}
            >
              {showBonusAnimation ? (
                <span className="animate-pulse">🎰 BONUS +{BONUS_FREE_SPINS}!</span>
              ) : (
                <span>FOIL {foilCountDisplay}/{BONUS_FOIL_COUNT}</span>
              )}
            </div>
          )}

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
              <div className="text-center">
                {freeLeft > 0 ? (
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:"#34d399" }}>
                    {freeLeft} FREE SPIN{freeLeft > 1 ? "S" : ""} disponíveis
                  </span>
                ) : (
                  <span className="subtitle-blink text-[10px] font-bold uppercase tracking-widest" style={{ color:"#f59e0b" }}>
                    WIN UP TO 50.000 COINS
                  </span>
                )}
              </div>
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

          {/* BALANCE BAR — abaixo do grid */}
          <div className="shrink-0 flex items-center justify-between px-4 py-1 border-b-2 border-[#c87941]" style={{ background: dark }}>
            <span className="text-[8px] font-bold uppercase text-gray-500">BALANCE</span>
            <span className="text-base font-black text-green-400">{coins.toLocaleString()} coins</span>
          </div>

          {/* CONTROLS */}
          <div
            className="shrink-0 px-3 pt-2 pb-2"
            style={{ background: wood, paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Row 1: WALLET | SPIN | BONUS */}
            <div className="flex items-center gap-2 mb-2">

              {/* BUY BONUS */}
              <button
                onClick={() => setShowBonusConfirm(true)}
                disabled={isSpinning || coins < bonusCost || freeLeft > 0}
                className="flex-1 h-10 border-2 border-black font-black uppercase tracking-wide active:scale-95 transition-transform disabled:opacity-40 flex flex-col items-center justify-center leading-none"
                style={{
                  background: isSpinning || coins < bonusCost || freeLeft > 0
                    ? "linear-gradient(180deg,#374151,#1f2937)"
                    : "linear-gradient(180deg,#7c3aed,#4c1d95)",
                  color: "#FFD700",
                  boxShadow: "0 3px 0 #000",
                  textShadow: "1px 1px 0 #000",
                  borderColor: "#7c3aed",
                }}
              >
                <span className="text-[9px]">BUY BONUS</span>
                <span className="text-[8px] font-bold" style={{ color: "#c4b5fd" }}>{bonusCost}c · 2×</span>
              </button>

              {/* SPIN — centro */}
              <button
                onClick={() => {
                  // Priorizar bonus spins sobre free spins
                  if (bonusSpinsRemaining > 0 && freeLeft <= 0) {
                    spin(true, true); // Usar bonus spin (força modo bônus)
                  } else if (freeLeft > 0) {
                    spin(true); // Usar free spin diário
                  } else {
                    spin(false); // Spin pago
                  }
                }}
                disabled={isSpinning || (bonusSpinsRemaining <= 0 && freeLeft <= 0 && coins < betCost)}
                className="w-14 h-14 rounded-full border-4 border-black font-black flex-none flex flex-col items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
                style={{
                  background: isSpinning
                    ? "linear-gradient(180deg,#6b7280,#4b5563)"
                    : bonusSpinsRemaining > 0
                      ? "linear-gradient(180deg,#a855f7 0%,#7c3aed 50%,#6d28d9 100%)" //roxo para bonus
                      : freeLeft > 0
                        ? "linear-gradient(180deg,#34d399 0%,#059669 50%,#047857 100%)"
                        : "linear-gradient(180deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)",
                  boxShadow: isSpinning ? "0 2px 0 #000" : "0 5px 0 #000, 0 0 18px rgba(251,191,36,0.55)",
                  color: "#000",
                  transform: isSpinning ? "translateY(3px)" : undefined,
                }}
              >
                <span className={`text-[10px] font-black leading-none tracking-widest ${isSpinning ? "animate-spin" : ""}`}>
                  {bonusSpinsRemaining > 0 ? "BONUS" : freeLeft > 0 ? "FREE" : "SPIN"}
                </span>
                {(bonusSpinsRemaining > 0 || freeLeft > 0) && !isSpinning && (
                  <span className="text-[8px] font-black mt-0.5 text-green-900">
                    {bonusSpinsRemaining > 0 ? bonusSpinsRemaining : freeLeft}x
                  </span>
                )}
              </button>

              {/* WALLET (DEP/WIT) */}
              <button
                onClick={onWalletOpen}
                disabled={!onWalletOpen}
                className="flex-1 h-10 border-2 border-black font-black uppercase tracking-wide active:scale-95 transition-transform disabled:opacity-40 flex flex-col items-center justify-center leading-none"
                style={{
                  background: "linear-gradient(180deg,#7a4520,#3d1c02)",
                  color: "#FFD700",
                  boxShadow: "0 3px 0 #000",
                  textShadow: "1px 1px 0 #000",
                  borderColor: "#c87941",
                }}
              >
                <span className="text-[9px]">DEPOSIT</span>
                <span className="text-[8px] font-bold" style={{ color: "#c87941" }}>WITHDRAW</span>
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
