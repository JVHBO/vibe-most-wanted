"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";

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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RafflePage() {
  const router = useRouter();
  const convex = useConvex();
  const [showInfo, setShowInfo] = useState(false);

  const [config, setConfig] = useState<RaffleConfig | null>(null);
  const [entries, setEntries] = useState<RaffleEntry[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    Promise.all([
      convex.query(api.raffle.getRaffleConfig, { epoch: 1 }).catch(() => null),
      convex.query(api.raffle.getRaffleBuyers, { epoch: 1 }).catch(() => []),
    ]).then(([cfg, buyers]) => {
      if (cfg) setConfig(cfg as RaffleConfig);
      if (buyers) setEntries(buyers as RaffleEntry[]);
    });
  }, [convex]);

  const endsAt = config ? config.updatedAt + config.durationDays * 86400000 : null;
  const { d, h, m, ended } = useCountdown(endsAt);

  const totalTickets = entries.reduce((sum, e) => sum + e.tickets, 0);
  const ticketPriceVBMS = config?.ticketPriceVBMS ?? 100000;
  const ticketPriceUSD = config?.ticketPriceUSD ?? 0.62;
  const totalVBMS = totalTickets * ticketPriceVBMS;

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

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto px-4 py-5 space-y-4">

          {/* ── Prize card ── */}
          <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#FFD700] overflow-hidden">

            {/* Image + info */}
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

          {/* ── Coming soon ── */}
          <div className="border-2 border-black bg-[#FFD700] shadow-[4px_4px_0px_#000] px-4 py-3 text-center">
            <p className="text-black font-black text-sm uppercase tracking-widest">Raffle coming soon</p>
            <p className="text-black/60 font-bold text-[10px] mt-0.5 uppercase tracking-wide">Tickets not available yet · Stay tuned</p>
          </div>

          {/* ── Ticket prices ── */}
          <div className="border-2 border-black bg-[#1a1a1a] shadow-[4px_4px_0px_#000] overflow-hidden">
            <div className="bg-[#FFD700] border-b-2 border-black px-3 py-2">
              <span className="text-black font-black text-[10px] uppercase tracking-widest">Ticket Price</span>
            </div>

            {/* BASE */}
            <div className="flex items-center gap-3 px-3 py-3 border-b-2 border-black">
              <div className="w-9 h-9 shrink-0 border-2 border-black bg-[#0052FF] flex items-center justify-center shadow-[2px_2px_0px_#000]">
                <span className="text-white font-black text-xs">B</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-sm">{(ticketPriceVBMS / 1000).toFixed(0)}k VBMS</span>
                  <span className="bg-[#0052FF] text-white text-[8px] font-black px-1.5 py-0.5 uppercase border border-black">BASE</span>
                </div>
                <p className="text-white/40 text-[10px] mt-0.5">≈ ${ticketPriceUSD.toFixed(2)} per ticket</p>
              </div>
              <button disabled className="border-2 border-black bg-[#0052FF] text-white font-black text-[11px] px-4 py-2 uppercase tracking-wider opacity-30 cursor-not-allowed">
                Buy
              </button>
            </div>

            {/* ARB */}
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="w-9 h-9 shrink-0 border-2 border-black bg-[#12AAFF] flex items-center justify-center shadow-[2px_2px_0px_#000]">
                <span className="text-white font-black text-xs">A</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-black text-sm">${ticketPriceUSD.toFixed(2)} USND</span>
                  <span className="bg-[#12AAFF] text-white text-[8px] font-black px-1.5 py-0.5 uppercase border border-black">ARB</span>
                </div>
                <p className="text-white/40 text-[10px] mt-0.5">or equivalent ETH</p>
              </div>
              <button disabled className="border-2 border-black bg-[#12AAFF] text-white font-black text-[11px] px-4 py-2 uppercase tracking-wider opacity-30 cursor-not-allowed">
                Buy
              </button>
            </div>
          </div>

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
