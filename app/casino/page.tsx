"use client";

import { useState } from "react";
import Link from "next/link";
import { Roulette } from "@/components/Roulette";

type CasinoTab = "roulette" | "baccarat" | "soon";

const TABS: { id: CasinoTab; label: string; icon: string; available: boolean }[] = [
  { id: "roulette", label: "Spin",     icon: "🎰", available: true  },
  { id: "baccarat", label: "Baccarat", icon: "🃏", available: true  },
  { id: "soon",     label: "???",      icon: "🎲", available: false },
];

export default function CasinoPage() {
  const [activeTab, setActiveTab] = useState<CasinoTab>("roulette");

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-gold">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="relative border-b-2 border-vintage-gold/30 bg-vintage-charcoal/60 backdrop-blur-sm px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-vintage-gold/60 hover:text-vintage-gold transition-colors text-sm font-modern"
          >
            ← Home
          </Link>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold tracking-widest text-vintage-gold uppercase">
              VMW Casino
            </h1>
            <p className="text-vintage-gold/50 text-[10px] tracking-widest uppercase mt-0.5">
              Play · Earn · Win
            </p>
          </div>
          <div className="w-12" /> {/* spacer */}
        </div>
      </div>

      {/* ── Tab selector ───────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2 bg-vintage-charcoal/40 border border-vintage-gold/20 rounded-xl p-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              disabled={!tab.available}
              onClick={() => tab.available && setActiveTab(tab.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg font-modern font-bold text-xs
                transition-all duration-200 relative
                ${activeTab === tab.id
                  ? "bg-vintage-gold text-vintage-black shadow-lg"
                  : tab.available
                  ? "text-vintage-gold/70 hover:text-vintage-gold hover:bg-vintage-gold/10"
                  : "text-vintage-gold/30 cursor-not-allowed"
                }
              `}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="tracking-wider">{tab.label}</span>
              {!tab.available && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold/50 rounded px-1">
                  soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Game area ──────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 py-4">

        {activeTab === "roulette" && (
          <Roulette />
        )}

        {activeTab === "baccarat" && (
          <BaccaratCard />
        )}

        {activeTab === "soon" && (
          <ComingSoonCard />
        )}

      </div>
    </div>
  );
}

/* ── Baccarat card ────────────────────────────────────── */
function BaccaratCard() {
  return (
    <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl overflow-hidden">
      {/* Green felt header */}
      <div className="bg-emerald-900/80 border-b-2 border-vintage-gold/40 px-6 py-8 text-center relative">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,#ffffff 0,#ffffff 1px,transparent 0,transparent 50%)", backgroundSize: "10px 10px" }}
        />
        <div className="relative">
          <div className="flex justify-center gap-3 mb-4 text-4xl">
            <span>🂡</span><span>🂱</span><span>🃁</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-vintage-gold tracking-widest uppercase">
            Baccarat
          </h2>
          <p className="text-vintage-gold/60 text-sm mt-1 font-modern">
            Bet VBMS · Player vs Banker
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="px-6 py-4 grid grid-cols-3 gap-3 border-b border-vintage-gold/20">
        {[
          { label: "Min Bet",  value: "1 VBMS"  },
          { label: "Max Bet",  value: "500 VBMS" },
          { label: "Max Total", value: "1K VBMS" },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-vintage-gold/50 text-[10px] uppercase tracking-wider">{label}</p>
            <p className="text-vintage-gold font-bold text-sm font-modern mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 py-5 text-center">
        <Link
          href="/baccarat"
          className="inline-block bg-vintage-gold text-vintage-black font-bold font-modern text-base px-8 py-3 rounded-xl hover:bg-vintage-gold/90 active:scale-95 transition-all tracking-wider uppercase"
        >
          Play Baccarat →
        </Link>
        <p className="text-vintage-gold/40 text-[10px] mt-2 font-modern">Deposit VBMS to play</p>
      </div>
    </div>
  );
}

/* ── Coming soon card ─────────────────────────────────── */
function ComingSoonCard() {
  return (
    <div className="bg-vintage-charcoal border-2 border-vintage-gold/30 border-dashed rounded-2xl px-6 py-16 text-center">
      <div className="text-6xl mb-4 opacity-30">🎲</div>
      <h2 className="font-display text-2xl font-bold text-vintage-gold/40 tracking-widest uppercase">
        Coming Soon
      </h2>
      <p className="text-vintage-gold/30 text-sm mt-2 font-modern">
        New game in development
      </p>
    </div>
  );
}
