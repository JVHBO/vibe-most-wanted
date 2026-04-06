"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Roulette } from "@/components/Roulette";

// Prize images for floating background
const PRIZE_IMAGES = [
  "https://ipfs.filebase.io/ipfs/QmeLCtF8Ytq7FKKzY5r9AiYCwQPzxtvfYz1GPGvfRHAL2U",
  "https://ipfs.filebase.io/ipfs/QmaWpsAeMKMC796hRUtmKWfs2gnqpDNo2YpnKFxi8bK9oq",
  "https://ipfs.filebase.io/ipfs/QmZxc6QK1mPkVLha4Kr1Bh3bwQX351998TsJ3MxoWL8Av5",
  "https://ipfs.filebase.io/ipfs/QmTCd36KKyTSbY3NRrewz8NzdcRAAg3zBQnhfudgAVkyWd",
  "https://ipfs.filebase.io/ipfs/QmdjNEN5URcfQtyG4VWMBjGcsFm8FXYMm56uL3qyB6jZNF",
];

const PRIZES = [
  { label: '100 VBMS',  prob: 88,   color: '#9CA3AF' },
  { label: '500 VBMS',  prob: 8,    color: '#60A5FA' },
  { label: '1K VBMS',   prob: 2.5,  color: '#34D399' },
  { label: '10K VBMS',  prob: 1,    color: '#FBBF24' },
  { label: '50K VBMS',  prob: 0.5,  color: '#F87171' },
];

interface FloatingItem {
  id: number;
  x: number;
  duration: number;
  delay: number;
  size: number;
  img: string;
}

function FloatingBackground({ win }: { win: boolean }) {
  const [items, setItems] = useState<FloatingItem[]>([]);

  useEffect(() => {
    const generated: FloatingItem[] = Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: Math.random() * 88 + 4,
      duration: 5 + Math.random() * 6,
      delay: Math.random() * 5,
      size: 36 + Math.random() * 36,
      img: PRIZE_IMAGES[i % PRIZE_IMAGES.length],
    }));
    setItems(generated);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((item) => (
        <img
          key={item.id}
          src={item.img}
          alt=""
          className="absolute rounded-full"
          style={{
            left: `${item.x}%`,
            bottom: '-70px',
            width: item.size,
            height: item.size,
            objectFit: 'cover',
            opacity: win ? 0.28 : 0.07,
            transition: 'opacity 0.6s ease',
            animation: `floatUp ${item.duration}s ${item.delay}s infinite ease-in`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Prize Odds Modal — pie chart showing odds
 */
function PrizeOddsModal({ onClose }: { onClose: () => void }) {
  // Build SVG pie chart segments (solid filled wedges)
  const cx = 80, cy = 80, r = 70;

  const segments = (() => {
    let cumulativeAngle = 0;
    return PRIZES.map((p) => {
      const wedgeAngle = (p.prob / 100) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + wedgeAngle;
      cumulativeAngle = endAngle;

      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const largeArc = wedgeAngle > 180 ? 1 : 0;

      return {
        ...p,
        pathD: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        startAngle,
        endAngle,
      };
    });
  })();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85" onClick={onClose}>
      <div
        className="w-full max-w-[280px] border-4 border-black rounded-2xl overflow-hidden"
        style={{ background: '#0C0C0C', boxShadow: '4px 4px 0px #FFD700' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="bg-[#FFD700] border-b-4 border-black px-3 py-1.5 flex items-center justify-between">
          <span className="font-black text-[11px] uppercase tracking-widest text-black">Prize Odds</span>
          <button onClick={onClose} className="font-black text-lg leading-none" style={{ color: '#DC2626' }}>×</button>
        </div>

        <div className="px-3 pt-2 pb-2">
          {/* Pie chart + legend in compact row */}
          <div className="flex items-start gap-3">
            {/* Pie chart */}
            <div className="shrink-0 relative" style={{ width: 120, height: 120 }}>
              <svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%' }}>
                {segments.map(s => (
                  <path key={s.label} d={s.pathD} fill={s.color} stroke="#0C0C0C" strokeWidth="1.5" />
                ))}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              {PRIZES.map(p => (
                <div key={p.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="text-white text-[9px] font-bold truncate">{p.label}</span>
                  <span className="text-[9px] font-black ml-auto" style={{ color: p.color }}>{p.prob}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bonus info — inline, no dropdown */}
          <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
            <p className="text-white/70 text-[8px] leading-tight">
              <span className="text-blue-400 font-bold">Ultra (ARB):</span> 2× spins on Arbitrum chain
            </p>
            <p className="text-white/70 text-[8px] leading-tight">
              <span className="text-purple-400 font-bold">VibeFID:</span> +2 spins per day
            </p>
            <p className="text-white/70 text-[8px] leading-tight">
              <span className="text-yellow-400 font-bold">Aura Level:</span> more spins + higher earn cap
            </p>
            <p className="text-white/70 text-[8px] leading-tight">
              <span className="text-green-400 font-bold">Server-side:</span> results generated on Convex backend, cannot be manipulated
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoulettePage() {
  const [showFloating, setShowFloating] = useState(false);
  const [showOdds, setShowOdds] = useState(false);
  const [chainMode, setChainMode] = useState<'base' | 'arbitrum'>('arbitrum');

  // Trigger floating on win (expose via custom event from Roulette)
  useEffect(() => {
    const onWin = () => {
      setShowFloating(true);
      setTimeout(() => setShowFloating(false), 6000);
    };
    window.addEventListener("roulette:win", onWin);
    return () => window.removeEventListener("roulette:win", onWin);
  }, []);

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 0.15; }
          10%  { opacity: 0.25; }
          90%  { opacity: 0.2; }
          100% { transform: translateY(-110vh) scale(0.7); opacity: 0; }
        }
        @keyframes pulseRing {
          0%   { transform: scale(0.95); opacity: 0.7; }
          50%  { transform: scale(1.05); opacity: 0.4; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
        @keyframes swipeHint {
          0%   { transform: translateX(0); opacity: 0.8; }
          40%  { transform: translateX(28px); opacity: 1; }
          60%  { transform: translateX(28px); opacity: 1; }
          100% { transform: translateX(0); opacity: 0.8; }
        }
        .rlt-claim-btn {
          background: linear-gradient(135deg,#16a34a,#15803d) !important;
          color: #fff !important;
          border: none !important;
          box-shadow: none !important;
        }
        .rlt-claim-btn:disabled {
          background: #374151 !important;
          color: rgba(255,255,255,0.5) !important;
        }
        @keyframes ballBounce {
          0%   { transform: translate(-50%,-50%) scale(1.5); }
          12%  { transform: translate(calc(-50% + 9px), calc(-50% + 7px)) scale(0.7); }
          24%  { transform: translate(calc(-50% - 6px), calc(-50% - 5px)) scale(1.2); }
          38%  { transform: translate(calc(-50% + 4px), calc(-50% + 3px)) scale(0.85); }
          52%  { transform: translate(calc(-50% - 2px), calc(-50% - 2px)) scale(1.08); }
          65%  { transform: translate(calc(-50% + 1px), calc(-50% + 1px)) scale(0.95); }
          78%  { transform: translate(-50%,-50%) scale(1.03); }
          90%  { transform: translate(-50%,-50%) scale(0.98); }
          100% { transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes sphereShine {
          0%   { transform: translateX(-140%) skewX(-18deg); opacity: 0; }
          20%  { opacity: 0.5; }
          80%  { opacity: 0.3; }
          100% { transform: translateX(240%) skewX(-18deg); opacity: 0; }
        }
        @keyframes innerSpin {
          0%   { transform: rotateZ(0deg); }
          100% { transform: rotateZ(360deg); }
        }
        @keyframes innerSpinLg {
          0%   { transform: rotateZ(0deg); }
          100% { transform: rotateZ(360deg); }
        }
      `}</style>

      <div
        className="relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden overscroll-none"
        style={{ background: chainMode === 'base'
          ? 'radial-gradient(ellipse at 50% 20%, #00112b 0%, #060609 70%)'
          : 'radial-gradient(ellipse at 50% 20%, #1a0a2e 0%, #060609 70%)',
          transition: 'background 0.8s ease' }}
      >
        {/* Floating background on win */}
        <FloatingBackground win={showFloating} />

        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,215,0,0.04) 0%, transparent 70%)' }} />

        {/* Header */}
        <div className="relative shrink-0 z-10 flex items-center px-4"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid rgba(255,215,0,0.1)',
          }}>
          <Link href="/" className="text-sm font-medium"
            style={{ color: 'rgba(255,215,0,0.6)' }}>
            ← Back
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-widest uppercase"
              style={{ color: '#FFD700', fontFamily: 'var(--font-cinzel)', letterSpacing: '0.2em' }}>
              Daily Roulette
            </h1>
          </div>
          {/* Help button */}
          <button
            onClick={() => setShowOdds(true)}
            className="w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-black rounded-full"
            style={{ background: '#1a1a1a', color: '#FFD400' }}
          >?</button>
        </div>

        {/* Odds modal */}
        {showOdds && <PrizeOddsModal onClose={() => setShowOdds(false)} />}

        {/* Roulette content */}
        <div className="relative z-10 flex-1 min-h-0 flex flex-col">
          <Roulette onChainChange={setChainMode} showHeader={false} />
        </div>
      </div>
    </>
  );
}
