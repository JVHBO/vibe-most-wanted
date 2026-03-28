"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConvex } from "convex/react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { api } from "@/convex/_generated/api";
import { formatUnits } from "viem";

// ─── Constants ────────────────────────────────────────────────────────────────
const VBMS_ADDRESS  = "0xf14c1dc8ce5fe65413379f76c43fa1460c31e728" as const;
const USDC_ADDRESS  = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as const;
const USND_ADDRESS  = "0x4ecf61a6c2fab8a047ceb3b3b263b401763e9d49" as const;
const ERC20_BALANCE_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
] as const;

// OpenSea link — Goofy Romero (Queen of Diamonds VBMS baccarat card)
const OPENSEA_GOOFY_ROMERO = "https://opensea.io/assets/base/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RaffleConfig {
  prizeDescription: string;
  prizeImageUrl: string;
  cardValueUSD: number;
  cardValueVBMS: number;
  ticketPriceVBMS: number;
  ticketPriceUSD: number;
  maxTickets: number;
  durationDays: number;
  epoch: number;
  visible: boolean;
  updatedAt: number;
}

interface RaffleEntry {
  address: string;
  tickets: number;
  chain: string;
  token: string;
  txHash: string;
  epoch: number;
  timestamp: number;
}

// ─── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(endsAt: number | null) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setDiff(Math.max(0, endsAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { d, h, m, ended: diff === 0 && endsAt !== null };
}

// ─── Format balance helper ─────────────────────────────────────────────────────
function fmtBal(raw: bigint | undefined, decimals: number, symbol: string): string {
  if (raw === undefined) return "…";
  const n = parseFloat(formatUnits(raw, decimals));
  if (n === 0) return `0 ${symbol}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ${symbol}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k ${symbol}`;
  if (n < 0.0001) return `<0.0001 ${symbol}`;
  return `${n.toFixed(n < 1 ? 6 : 2)} ${symbol}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RafflePage() {
  const router = useRouter();
  const convex = useConvex();
  const { address: walletAddress } = useAccount();

  const [showInfo,    setShowInfo]    = useState(false);
  const [showBuy,     setShowBuy]     = useState(false);
  const [buyQty,      setBuyQty]      = useState(1);
  const [config,      setConfig]      = useState<RaffleConfig | null>(null);
  const [entries,     setEntries]     = useState<RaffleEntry[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    Promise.all([
      convex.query(api.raffle.getRaffleConfig, {}).catch(() => null),
      convex.query(api.raffle.getRaffleBuyers, { epoch: 1 }).catch(() => []),
    ]).then(([cfg, buyers]) => {
      if (cfg) setConfig(cfg as RaffleConfig);
      if (buyers) setEntries(buyers as RaffleEntry[]);
    });
  }, [convex]);

  const endsAt = config ? config.updatedAt + config.durationDays * 86400000 : null;
  const { d, h, m, ended } = useCountdown(endsAt);
  const totalTickets = entries.reduce((sum, e) => sum + e.tickets, 0);

  const ticketPriceVBMS = config?.ticketPriceVBMS ?? 10000;
  const ticketPriceUSD  = config?.ticketPriceUSD  ?? 0.06;
  const ticketPriceETH  = 0.000023;
  const totalVBMS = totalTickets * ticketPriceVBMS;

  // ── On-chain balances ──
  // Base ETH
  const { data: baseEthBal } = useBalance({
    address: walletAddress,
    chainId: 8453,
    query: { enabled: !!walletAddress && showBuy },
  });
  // VBMS (Base)
  const { data: vbmsBal } = useReadContract({
    address: VBMS_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined,
    chainId: 8453,
    query: { enabled: !!walletAddress && showBuy },
  });
  // USDC (Base)
  const { data: usdcBal } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined,
    chainId: 8453,
    query: { enabled: !!walletAddress && showBuy },
  });
  // ARB ETH
  const { data: arbEthBal } = useBalance({
    address: walletAddress,
    chainId: 42161,
    query: { enabled: !!walletAddress && showBuy },
  });
  // USND (Arb)
  const { data: usndBal } = useReadContract({
    address: USND_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: walletAddress ? [walletAddress] : undefined,
    chainId: 42161,
    query: { enabled: !!walletAddress && showBuy },
  });

  const CONTRACTS_LIVE = false; // set true after deploying raffle contracts

  const paymentOptions = [
    {
      id: "vbms",
      chain: "BASE",
      chainColor: "#0052FF",
      symbol: "VBMS",
      label: fmtBal(vbmsBal as bigint | undefined, 18, "VBMS"),
      price: `${(ticketPriceVBMS * buyQty / 1000).toFixed(0)}k VBMS`,
      note: "→ pool",
    },
    {
      id: "usdc",
      chain: "BASE",
      chainColor: "#0052FF",
      symbol: "USDC",
      label: fmtBal(usdcBal as bigint | undefined, 6, "USDC"),
      price: `$${(ticketPriceUSD * buyQty).toFixed(2)} USDC`,
      note: "Base",
    },
    {
      id: "eth-base",
      chain: "BASE",
      chainColor: "#627EEA",
      symbol: "ETH",
      label: fmtBal(baseEthBal?.value, 18, "ETH"),
      price: `≈${(ticketPriceETH * buyQty).toFixed(6)} ETH`,
      note: "Base · Chainlink",
    },
    {
      id: "usnd",
      chain: "ARB",
      chainColor: "#12AAFF",
      symbol: "USND",
      label: fmtBal(usndBal as bigint | undefined, 6, "USND"),
      price: `$${(ticketPriceUSD * buyQty).toFixed(2)} USND`,
      note: "Arbitrum One",
    },
    {
      id: "eth-arb",
      chain: "ARB",
      chainColor: "#627EEA",
      symbol: "ETH",
      label: fmtBal(arbEthBal?.value, 18, "ETH"),
      price: `≈${(ticketPriceETH * buyQty).toFixed(6)} ETH`,
      note: "ARB · Chainlink",
    },
  ];

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-[#FFD700] border-b-4 border-black px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.back()}
          className="border-2 border-black bg-black text-[#FFD700] font-black text-xs px-3 py-1.5 uppercase tracking-wider shadow-[2px_2px_0px_#333] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          ← Back
        </button>
        <h1 className="font-display font-black text-black text-base uppercase tracking-widest flex-1 text-center">
          🎟️ Raffle
        </h1>
        <button
          onClick={() => setShowInfo(true)}
          className="w-8 h-8 border-2 border-black bg-black text-[#FFD700] font-black text-sm flex items-center justify-center shadow-[2px_2px_0px_#333] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          ?
        </button>
      </div>

      {/* ── Info modal ── */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowInfo(false)}>
          <div className="absolute inset-0 bg-black/80" />
          <div
            className="relative w-full max-w-sm border-2 border-black bg-[#1a1a1a] shadow-[6px_6px_0px_#FFD700] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#FFD700] border-b-2 border-black px-4 py-2.5 flex items-center justify-between">
              <span className="text-black font-black text-sm uppercase tracking-widest">Como funciona</span>
              <button onClick={() => setShowInfo(false)} className="text-black font-black text-lg leading-none">✕</button>
            </div>
            <div className="px-4 py-4 space-y-4 text-sm">
              <div className="space-y-1.5">
                <p className="text-[#FFD700] font-black text-xs uppercase tracking-wider">🎟️ O que é necessário?</p>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  Compre tickets com <span className="text-white font-bold">VBMS na BASE</span> ou com <span className="text-white font-bold">USND / ETH na ARB</span>.
                  Cada ticket = 1 entrada no sorteio. Compre quantos quiser.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[#FFD700] font-black text-xs uppercase tracking-wider">🏆 Como é sorteado o ganhador?</p>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  O ganhador é escolhido via <span className="text-white font-bold">Chainlink VRF v2.5</span> na Arbitrum — totalmente verificável on-chain.
                  O prêmio (NFT) é enviado manualmente para a carteira ganhadora.
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[#FFD700] font-black text-xs uppercase tracking-wider">♻️ Para onde vai o dinheiro?</p>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  Todo o VBMS arrecadado vai direto para o <span className="text-white font-bold">pool do jogo</span>.
                  Os fundos em USND / ETH são usados para <span className="text-white font-bold">comprar VBMS e reinjetar no pool</span> — mantendo a economia do jogo saudável para todos.
                </p>
              </div>
              <div className="border-t border-white/10 pt-3">
                <p className="text-white/30 text-[10px]">
                  A raffle é 100% transparente. Todos os tickets são registrados on-chain.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Buy modal ── */}
      {showBuy && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowBuy(false)}>
          <div className="absolute inset-0 bg-black/80" />
          <div
            className="relative w-full max-w-sm border-2 border-t-0 border-black bg-[#1a1a1a] shadow-[0px_-4px_0px_#FFD700] overflow-hidden mb-0 rounded-none"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#FFD700] border-b-2 border-black px-4 py-2.5 flex items-center justify-between">
              <span className="text-black font-black text-sm uppercase tracking-widest">🎟️ Comprar Tickets</span>
              <button onClick={() => setShowBuy(false)} className="text-black font-black text-lg leading-none">✕</button>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Qty selector */}
              <div className="flex items-center gap-3">
                <span className="text-white/50 text-[10px] font-black uppercase tracking-wider flex-1">Quantidade</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBuyQty(q => Math.max(1, q - 1))}
                    className="w-8 h-8 border-2 border-black bg-[#111] text-white font-black text-base flex items-center justify-center shadow-[2px_2px_0px_#FFD700] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >−</button>
                  <span className="text-[#FFD700] font-black text-xl w-8 text-center tabular-nums">{buyQty}</span>
                  <button
                    onClick={() => setBuyQty(q => Math.min(20, q + 1))}
                    className="w-8 h-8 border-2 border-black bg-[#111] text-white font-black text-base flex items-center justify-center shadow-[2px_2px_0px_#FFD700] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >+</button>
                </div>
              </div>

              {/* Payment options */}
              <div className="border-2 border-black overflow-hidden">
                <div className="bg-black/40 border-b border-black/40 px-3 py-1.5 flex items-center justify-between">
                  <span className="text-white/40 font-black text-[9px] uppercase tracking-widest">Rede · Token</span>
                  <span className="text-white/40 font-black text-[9px] uppercase tracking-widest">Preço total · Saldo</span>
                </div>
                {paymentOptions.map((opt, i) => (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-3 px-3 py-2.5 ${i < paymentOptions.length - 1 ? "border-b border-black/30" : ""}`}
                  >
                    <div
                      className="w-9 h-9 shrink-0 border-2 border-black flex flex-col items-center justify-center shadow-[2px_2px_0px_#000]"
                      style={{ background: opt.chainColor }}
                    >
                      <span className="text-white font-black text-[8px] leading-none">{opt.chain}</span>
                      <span className="text-white/70 font-bold text-[7px] leading-none mt-0.5">{opt.symbol}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-sm leading-none">{opt.price}</p>
                      <p className="text-white/30 text-[9px] mt-0.5">
                        {walletAddress
                          ? <span className="text-white/50">saldo: {opt.label}</span>
                          : <span className="text-white/20">conecte a wallet</span>
                        }
                      </p>
                    </div>
                    <button
                      disabled={!CONTRACTS_LIVE}
                      className={`border-2 border-black font-black text-[10px] px-3 py-1.5 uppercase transition-all shrink-0 ${
                        CONTRACTS_LIVE
                          ? "text-black bg-[#FFD700] shadow-[2px_2px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer"
                          : "text-white/30 bg-white/5 cursor-not-allowed"
                      }`}
                    >
                      {CONTRACTS_LIVE ? "Buy" : "Soon"}
                    </button>
                  </div>
                ))}
              </div>

              {!CONTRACTS_LIVE && (
                <p className="text-white/20 text-[9px] text-center uppercase tracking-wider">
                  Contratos em deploy · Em breve
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto px-4 py-5 space-y-4">

          {/* ── Prize card ── */}
          <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#FFD700] overflow-hidden">
            <div className="flex">
              <div
                className="shrink-0 bg-black border-r-2 border-black flex items-center justify-center overflow-hidden"
                style={{ width: 110, minHeight: 140 }}
              >
                <img
                  src="/images/baccarat/queen%20diamonds%2C%20goofy%20romero.png"
                  alt="Goofy Romero"
                  className="h-full w-auto object-contain"
                  style={{ maxHeight: 140 }}
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    el.style.display = "none";
                    el.parentElement!.innerHTML = '<div style="font-size:3rem;display:flex;align-items:center;justify-content:center;height:140px">🃏</div>';
                  }}
                />
              </div>

              <div className="flex-1 p-4 flex flex-col justify-center gap-2">
                <span className="inline-block text-[8px] font-black uppercase tracking-widest text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/40 px-2 py-0.5 self-start">
                  Legendary
                </span>
                <p className="text-[#FFD700] font-display font-black text-xl leading-tight">Goofy Romero</p>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Queen of Diamonds</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-white font-black text-lg">~$23</span>
                  <span className="text-white/30 text-[10px] font-mono">≈ 3.7M VBMS</span>
                </div>
                <a
                  href={OPENSEA_GOOFY_ROMERO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[#2081E2] font-black text-[9px] uppercase tracking-wider hover:underline"
                >
                  <svg width="10" height="10" viewBox="0 0 90 90" fill="currentColor"><path d="M45 0C20.15 0 0 20.15 0 45s20.15 45 45 45 45-20.15 45-45S69.85 0 45 0zM22.05 46.25l.17-.26 10.45-16.37a.41.41 0 0 1 .72.04c1.74 3.9 3.24 8.75 2.54 11.77-.3 1.26-1.12 2.96-2.04 4.53a11.6 11.6 0 0 1-.38.63.4.4 0 0 1-.34.18H22.43a.41.41 0 0 1-.38-.52zm57.67 7.09a.42.42 0 0 1-.25.38c-1.06.45-4.68 2.1-6.19 4.18-3.84 5.34-6.77 12.97-13.33 12.97H33.42A20.53 20.53 0 0 1 12.9 50.34v-.35c0-.23.18-.41.41-.41h11.57c.26 0 .46.23.43.49-.11 1.03.07 2.08.52 3.04a6.5 6.5 0 0 0 5.86 3.67h9.19V50.1h-9.09a.42.42 0 0 1-.34-.66l.22-.31c.58-.82 1.41-2.08 2.25-3.52 1.58-2.66 3.12-5.98 3.12-9.3 0-.5-.03-1.06-.09-1.6a27.47 27.47 0 0 0-.37-2.92 21.67 21.67 0 0 0-.59-2.3c-.12-.4-.29-.82-.44-1.22l-.07-.22a.41.41 0 0 1 .58-.5l1.29.46.02.01 1.86.68 1.88.7 2 .75v-5.1a2.05 2.05 0 1 1 4.1 0v3.8l1.6.6c.13.05.25.11.37.19.39.26 1 .71 1.54 1.26 1.23 1.25 2.55 3.12 3.44 5.62.2.55.37 1.13.5 1.73.14.6.22 1.22.25 1.82.03.34.04.67.04 1 0 .93-.1 1.84-.3 2.71-.08.39-.19.78-.31 1.16a16.38 16.38 0 0 1-1.65 3.5l-.44.7-.02.04c-.29.45-.6.9-.92 1.34l-.21.3a.42.42 0 0 0 .34.66h5.98a7.29 7.29 0 0 0 5.13-2.08c.47-.46.89-.96 1.25-1.5 1.16-1.71 1.8-3.76 1.8-5.9v-.5a.42.42 0 0 1 .56-.39l12.08 4.52a.42.42 0 0 1 .27.39z"/></svg>
                  OpenSea
                </a>
              </div>
            </div>

            {/* Stats row */}
            <div className="border-t-2 border-black grid grid-cols-3 bg-[#1a1a1a]">
              <div className="flex flex-col items-center py-3 border-r-2 border-black">
                <span className="font-black text-xl text-white leading-none">{totalTickets}</span>
                <span className="text-white/40 text-[9px] uppercase mt-0.5 font-bold">tickets</span>
              </div>
              <div className="flex flex-col items-center py-3 border-r-2 border-black">
                <span className="font-black text-sm text-[#FFD700] leading-none">
                  {totalVBMS >= 1000000
                    ? `${(totalVBMS / 1000000).toFixed(1)}M`
                    : totalVBMS >= 1000
                      ? `${(totalVBMS / 1000).toFixed(0)}k`
                      : totalVBMS.toString()}
                </span>
                <span className="text-white/40 text-[9px] uppercase mt-0.5 font-bold">VBMS pool</span>
              </div>
              <div className="flex flex-col items-center py-3">
                {ended ? (
                  <span className="font-black text-base text-red-400 leading-none">ENDED</span>
                ) : endsAt ? (
                  <span className="font-mono font-black text-base text-[#FFD700] leading-none tabular-nums">
                    {d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`}
                  </span>
                ) : (
                  <span className="font-mono font-black text-base text-white/30 leading-none">— —</span>
                )}
                <span className="text-white/40 text-[9px] uppercase mt-0.5 font-bold">left</span>
              </div>
            </div>
          </div>

          {/* ── Buy Tickets button ── */}
          <button
            onClick={() => setShowBuy(true)}
            className="w-full border-2 border-black bg-[#FFD700] text-black font-black text-sm uppercase tracking-widest py-3.5 shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            🎟️ Buy Tickets
          </button>

          {/* ── Participants ── */}
          {entries.length > 0 && (
            <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#000] overflow-hidden">
              <div className="bg-[#FFD700] border-b-2 border-black px-3 py-2 flex items-center justify-between">
                <span className="text-black font-black text-[10px] uppercase tracking-widest">Participants</span>
                <span className="text-black/60 font-bold text-[9px]">{entries.length} wallets</span>
              </div>
              <div className="divide-y divide-black/40 max-h-48 overflow-y-auto">
                {entries.map((e, i) => (
                  <div key={e.txHash} className="flex items-center gap-2 px-3 py-2">
                    <span className="text-white/30 font-mono text-[9px] w-4 text-right">{i + 1}</span>
                    <span className="flex-1 font-mono text-[10px] text-white/60 truncate">
                      {e.address.slice(0, 6)}…{e.address.slice(-4)}
                    </span>
                    <span className="text-[#FFD700] font-black text-[10px]">{e.tickets}×</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 border-2 border-black ${e.chain === "base" ? "bg-[#0052FF] text-white" : "bg-[#12AAFF] text-white"}`}>
                      {e.chain.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── VRF ── */}
          <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#000] overflow-hidden">
            <div className="bg-black border-b-2 border-black px-3 py-2">
              <span className="text-[#FFD700] font-black text-[10px] uppercase tracking-widest">🔗 Verifiable Fairness</span>
            </div>
            <div className="px-3 py-3 space-y-2">
              <p className="text-white/40 text-[10px] font-mono">formula: winnerIndex = vrfRandomWord % totalEntries</p>
              <p className="text-white/40 text-[10px]">Chainlink VRF v2.5 · Arbitrum One · Fully verifiable</p>
              <p className="text-white/30 text-[10px]">All entries recorded on-chain · Prize sent manually to winner</p>
            </div>
            <div className="border-t-2 border-black px-3 py-2 flex gap-2">
              <span className="bg-[#0052FF] text-white text-[9px] font-black px-2 py-0.5 border-2 border-black">BASE · VBMS</span>
              <span className="bg-[#12AAFF] text-white text-[9px] font-black px-2 py-0.5 border-2 border-black">ARB · USND + ETH</span>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
