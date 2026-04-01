"use client";

import { useState } from "react";
import Link from "next/link";

type CasinoTab = "roulette" | "baccarat" | "soon";

const TABS: { id: CasinoTab; label: string; available: boolean }[] = [
  { id: "roulette", label: "Roulette", available: true  },
  { id: "baccarat", label: "Baccarat", available: true  },
  { id: "soon",     label: "???",      available: false },
];

export default function CasinoPage() {
  const [activeTab, setActiveTab] = useState<CasinoTab>("roulette");

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden overscroll-none"
      style={{ background: '#0e0e0e', color: '#fff' }}>

      {/* Header */}
      <div className="shrink-0" style={{ background: '#1a1a1a', borderBottom: '1px solid rgba(255,215,0,0.15)' }}>
        <div className="px-4 pb-3" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-sm font-medium"
              style={{ color: 'rgba(255,215,0,0.6)' }}>
              &larr; Home
            </Link>
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-widest uppercase"
                style={{ color: '#FFD700', fontFamily: 'var(--font-cinzel)' }}>
                VMW Casino
              </h1>
              <p className="text-[10px] tracking-widest uppercase mt-0.5"
                style={{ color: 'rgba(255,215,0,0.4)' }}>
                Play · Earn · Win
              </p>
            </div>
            <div className="w-16" />
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex gap-1.5 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.12)' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                disabled={!tab.available}
                onClick={() => tab.available && setActiveTab(tab.id)}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all relative"
                style={{
                  background: activeTab === tab.id ? '#FFD700' : 'transparent',
                  color: activeTab === tab.id ? '#0e0e0e' : tab.available ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.2)',
                  cursor: tab.available ? 'pointer' : 'not-allowed',
                }}
              >
                {tab.label}
                {!tab.available && (
                  <span className="absolute -top-1 -right-1 text-[8px] rounded px-1"
                    style={{ background: '#1a1a1a', color: 'rgba(255,215,0,0.4)', border: '1px solid rgba(255,215,0,0.2)' }}>
                    soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto px-4 py-4"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>

          {activeTab === "roulette" && <RouletteCard />}
          {activeTab === "baccarat" && <BaccaratCard />}
          {activeTab === "soon" && <ComingSoonCard />}

        </div>
      </div>
    </div>
  );
}

/* ── Roulette card ────────────────────────────────────── */
const WHEEL_SEGMENTS = [
  { label: "100",  color: "#00008B" },
  { label: "500",  color: "#006400" },
  { label: "1K",   color: "#8B8B00" },
  { label: "10K",  color: "#4B0082" },
  { label: "50K",  color: "#B8860B" },
];
const SEG = 360 / WHEEL_SEGMENTS.length;

function MiniWheel() {
  return (
    <svg viewBox="0 0 120 120" width={96} height={96} style={{ filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.4))' }}>
      {WHEEL_SEGMENTS.map((seg, i) => {
        const startDeg = i * SEG - 90;
        const endDeg   = startDeg + SEG;
        const toRad    = (d: number) => (d * Math.PI) / 180;
        const r = 54;
        const cx = 60, cy = 60;
        const x1 = cx + r * Math.cos(toRad(startDeg));
        const y1 = cy + r * Math.sin(toRad(startDeg));
        const x2 = cx + r * Math.cos(toRad(endDeg));
        const y2 = cy + r * Math.sin(toRad(endDeg));
        const mid = toRad(startDeg + SEG / 2);
        const tx = cx + (r * 0.65) * Math.cos(mid);
        const ty = cy + (r * 0.65) * Math.sin(mid);
        return (
          <g key={i}>
            <path
              d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
              fill={seg.color}
              stroke="rgba(255,215,0,0.3)"
              strokeWidth={1}
            />
            <text
              x={tx} y={ty}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={seg.label.length > 2 ? 8 : 10}
              fontWeight="bold"
              fill="#FFD700"
            >
              {seg.label}
            </text>
          </g>
        );
      })}
      {/* Center hub */}
      <circle cx={60} cy={60} r={10} fill="#1a1a1a" stroke="rgba(255,215,0,0.6)" strokeWidth={2} />
      <circle cx={60} cy={60} r={4}  fill="#FFD700" />
      {/* Outer ring */}
      <circle cx={60} cy={60} r={54} fill="none" stroke="rgba(255,215,0,0.5)" strokeWidth={2} />
    </svg>
  );
}

function RouletteCard() {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: '2px solid rgba(255,215,0,0.35)', background: '#1a1a1a' }}>

      {/* Dark header with wheel */}
      <div className="px-6 py-8 text-center relative"
        style={{
          background: 'radial-gradient(ellipse at 50% 60%, #1a0e2e 0%, #0d0d0d 70%)',
          borderBottom: '1px solid rgba(255,215,0,0.2)',
        }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, #FFD700 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
        <div className="relative flex flex-col items-center gap-4">
          <MiniWheel />
          <div>
            <h2 className="text-3xl font-bold tracking-widest uppercase"
              style={{ color: '#FFD700', fontFamily: 'var(--font-cinzel)' }}>
              Roulette
            </h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,215,0,0.55)' }}>
              Daily free spin · Win VBMS
            </p>
          </div>
        </div>
      </div>

      {/* Prizes */}
      <div className="grid grid-cols-5 gap-0"
        style={{ borderBottom: '1px solid rgba(255,215,0,0.12)' }}>
        {WHEEL_SEGMENTS.map(({ label, color }, i) => (
          <div key={label} className="py-3 text-center"
            style={{ borderRight: i < 4 ? '1px solid rgba(255,215,0,0.08)' : 'none' }}>
            <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ background: color }} />
            <p className="text-xs font-bold" style={{ color: '#FFD700' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Info row */}
      <div className="grid grid-cols-3 gap-0"
        style={{ borderBottom: '1px solid rgba(255,215,0,0.12)' }}>
        {[
          { label: "Free Spin",  value: "1 / day"  },
          { label: "Max Prize",  value: "50K VBMS" },
          { label: "Extra Spin", value: "via coins" },
        ].map(({ label, value }, i) => (
          <div key={label} className="py-4 text-center"
            style={{ borderRight: i < 2 ? '1px solid rgba(255,215,0,0.1)' : 'none' }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,215,0,0.4)' }}>{label}</p>
            <p className="text-sm font-bold" style={{ color: '#FFD700' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 py-5 text-center">
        <Link href="/roulette"
          className="inline-block font-bold text-base px-8 py-3 rounded-xl transition-all tracking-wider uppercase active:scale-95"
          style={{ background: '#FFD700', color: '#0e0e0e' }}>
          Spin Now &rarr;
        </Link>
        <p className="text-[10px] mt-2" style={{ color: 'rgba(255,215,0,0.3)' }}>1 free spin per day</p>
      </div>
    </div>
  );
}

/* ── Baccarat card ────────────────────────────────────── */
function BaccaratCard() {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: '2px solid rgba(255,215,0,0.35)', background: '#1a1a1a' }}>

      {/* Green felt header */}
      <div className="px-6 py-8 text-center relative"
        style={{ background: 'linear-gradient(160deg, #0d3d2d 0%, #0a2e20 100%)', borderBottom: '1px solid rgba(255,215,0,0.2)' }}>
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '10px 10px' }} />
        <div className="relative">
          <div className="flex justify-center gap-3 mb-4">
            <img src="/images/baccarat/ace%20spades%2C%20jesse.png"            alt="A♠" className="w-10 h-14 rounded object-cover" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }} />
            <img src="/images/baccarat/king%20hearts%2C%20miguel.png"          alt="K♥" className="w-10 h-14 rounded object-cover" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.6)', transform: 'rotate(-6deg)' }} />
            <img src="/images/baccarat/queen%20diamonds%2C%20goofy%20romero.png" alt="Q♦" className="w-10 h-14 rounded object-cover" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }} />
          </div>
          <h2 className="text-3xl font-bold tracking-widest uppercase"
            style={{ color: '#FFD700', fontFamily: 'var(--font-cinzel)' }}>
            Baccarat
          </h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,215,0,0.55)' }}>
            Bet VBMS · Player vs Banker
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0"
        style={{ borderBottom: '1px solid rgba(255,215,0,0.12)' }}>
        {[
          { label: "Min Bet",   value: "1 VBMS"   },
          { label: "Max Bet",   value: "500 VBMS"  },
          { label: "Max Total", value: "1K VBMS"   },
        ].map(({ label, value }, i) => (
          <div key={label} className="py-4 text-center"
            style={{ borderRight: i < 2 ? '1px solid rgba(255,215,0,0.1)' : 'none' }}>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,215,0,0.4)' }}>{label}</p>
            <p className="text-sm font-bold" style={{ color: '#FFD700' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 py-5 text-center">
        <Link href="/baccarat"
          className="inline-block font-bold text-base px-8 py-3 rounded-xl transition-all tracking-wider uppercase active:scale-95"
          style={{ background: '#FFD700', color: '#0e0e0e' }}>
          Play Baccarat &rarr;
        </Link>
        <p className="text-[10px] mt-2" style={{ color: 'rgba(255,215,0,0.3)' }}>Deposit VBMS to play</p>
      </div>
    </div>
  );
}

/* ── Coming soon card ─────────────────────────────────── */
function ComingSoonCard() {
  return (
    <div className="rounded-2xl px-6 py-16 text-center"
      style={{ border: '2px dashed rgba(255,215,0,0.2)', background: '#1a1a1a' }}>
      <div className="text-4xl font-bold mb-4" style={{ color: 'rgba(255,215,0,0.15)', fontFamily: 'monospace' }}>?</div>
      <h2 className="text-2xl font-bold tracking-widest uppercase"
        style={{ color: 'rgba(255,215,0,0.3)', fontFamily: 'var(--font-cinzel)' }}>
        Coming Soon
      </h2>
      <p className="text-sm mt-2" style={{ color: 'rgba(255,215,0,0.2)' }}>
        New game in development
      </p>
    </div>
  );
}
