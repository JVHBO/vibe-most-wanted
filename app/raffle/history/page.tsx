"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { AudioManager } from "@/lib/audio-manager";

function fmtAddr(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function arbTxUrl(hash: string) { return `https://arbiscan.io/tx/${hash}`; }

export default function RaffleHistoryPage() {
  const results = useQuery(api.raffle.getAllRaffleResults);

  return (
    <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-950/20 via-vintage-deep-black to-black" />

      {/* TOP HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-vintage-charcoal/80 border-b border-vintage-gold/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Link
            href="/raffle"
            onClick={() => AudioManager.buttonClick()}
            className="px-3 py-1.5 bg-[#CC2222] hover:bg-[#AA1111] text-white text-[11px] font-bold uppercase tracking-wider transition-colors rounded-md"
          >
            ← BACK
          </Link>
          <h1 className="text-xl font-display font-bold text-vintage-gold tracking-wider">PAST RAFFLES</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* CONTENT */}
      <div className="absolute inset-0 pt-14 pb-4 overflow-y-auto">
        <div className="relative z-10 px-4 py-4 max-w-lg mx-auto space-y-4">
          {!results ? (
            <div className="text-center py-20 text-vintage-ice/40">Loading…</div>
          ) : results.length === 0 ? (
            <div className="text-center py-20 text-vintage-ice/40">No results yet</div>
          ) : (
            results.map((r: any) => (
              <div key={r._id} className="bg-vintage-charcoal/40 border border-vintage-gold/20 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-vintage-gold font-black text-sm">Epoch #{r.epoch}</span>
                  <span className="text-vintage-ice/40 text-[10px]">
                    {new Date(r.timestamp).toLocaleDateString()}
                  </span>
                </div>

                {/* Prize */}
                <p className="text-white/70 text-xs mb-3">{r.prizeDescription}</p>

                {/* Winners */}
                {r.winners && r.winners.length > 1 ? (
                  <div className="space-y-2">
                    {r.winners.map((addr: string, i: number) => (
                      <div key={addr} className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-vintage-gold font-black text-xs w-5">#{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-white font-bold text-xs">
                            {r.winnerUsernames?.[i] ? `@${r.winnerUsernames[i]}` : fmtAddr(addr)}
                          </p>
                          <p className="text-white/30 font-mono text-[9px]">{addr}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-vintage-ice/50 text-[9px]">ticket #{r.winnerTickets?.[i] ?? "?"}</p>
                          {r.winnerChains?.[i] && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.winnerChains[i] === "base" ? "bg-[#0052FF] text-white" : "bg-[#12AAFF] text-black"}`}>
                              {(r.winnerChains[i] as string).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Single winner */
                  <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <span className="text-2xl">🏆</span>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">
                        {r.username ? `@${r.username}` : fmtAddr(r.winner)}
                      </p>
                      <p className="text-white/30 font-mono text-[9px]">{r.winner}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-vintage-gold font-black text-sm">#{r.winnerTicket}</p>
                      <p className="text-white/40 text-[9px]">{r.totalEntries} tickets</p>
                    </div>
                  </div>
                )}

                {/* VRF Proof */}
                {r.vrfRandomWord && (
                  <div className="mt-3 bg-black/30 rounded-lg p-2">
                    <p className="text-white/30 text-[9px] font-mono mb-1">VRF Proof (on-chain verifiable)</p>
                    <p className="text-white/50 text-[9px] font-mono break-all">{r.vrfRandomWord}</p>
                    {r.drawTxHash && (
                      <a
                        href={arbTxUrl(r.drawTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-[9px] hover:underline mt-1 block"
                      >
                        View on Arbiscan ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
