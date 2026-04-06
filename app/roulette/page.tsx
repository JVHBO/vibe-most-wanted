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
 * Prize Odds Modal — circular donut chart showing odds
 */
function PrizeOddsModal({ onClose }: { onClose: () => void }) {
  const [showBonus, setShowBonus] = useState(false);

  // Build SVG donut chart segments
  const cx = 150, cy = 150, outerR = 120, innerR = 70;

  const segments = (() => {
    let cumulativeAngle = 0;
    return PRIZES.map((p) => {
      const wedgeAngle = (p.prob / 100) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + wedgeAngle;
      cumulativeAngle = endAngle;

      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;
      const x1 = cx + outerR * Math.cos(startRad);
      const y1 = cy + outerR * Math.sin(startRad);
      const x2 = cx + outerR * Math.cos(endRad);
      const y2 = cy + outerR * Math.sin(endRad);
      const ix1 = cx + innerR * Math.cos(endRad);
      const iy1 = cy + innerR * Math.sin(endRad);
      const ix2 = cx + innerR * Math.cos(startRad);
      const iy2 = cy + innerR * Math.sin(startRad);
      const largeArc = wedgeAngle > 180 ? 1 : 0;

      return {
        ...p,
        pathD: `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`,
        startAngle,
        endAngle,
      };
    });
  })();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85" onClick={onClose}>
      <div
        className="w-full max-w-sm border-4 border-black rounded-2xl overflow-hidden"
        style={{ background: '#0C0C0C', boxShadow: '6px 6px 0px #FFD700', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="bg-[#FFD700] border-b-4 border-black px-4 py-2 flex items-center justify-between">
          <span className="font-black text-sm uppercase tracking-widest text-black">🎰 Prize Odds</span>
          <button onClick={onClose} className="text-black font-black text-lg leading-none">×</button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 44px)' }}>
          {/* Donut chart */}
          <div className="flex justify-center py-4">
            <div className="relative" style={{ width: 280, height: 280 }}>
              <svg viewBox="0 0 300 300" style={{ width: '100%', height: '100%' }}>
                <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#1a1a1a" strokeWidth="0.5" />
                {segments.map(s => (
                  <path key={s.label} d={s.pathD} fill="none" stroke={s.color} strokeWidth="2" />
                ))}
                {/* Center text */}
                <text x={cx} y={cy - 4} textAnchor="middle" fill="#FFD700" fontSize="13" fontWeight="bold" style={{ fontFamily: 'var(--font-cinzel, serif)' }}>
                  Prize Odds
                </text>
                <text x={cx} y={cy + 14} textAnchor="middle" fill="white" fontSize="9" opacity="0.35">
                  Tap legend for details
                </text>
              </svg>
            </div>
          </div>

          {/* Legend with toggle */}
          <div className="px-4 pb-3">
            {PRIZES.map(p => (
              <div key={p.label} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-black shrink-0" style={{ background: p.color }} />
                <span className="text-white text-xs font-bold flex-1">{p.label}</span>
                <span className="text-xs font-black" style={{ color: p.color }}>{p.prob}%</span>
              </div>
            ))}
          </div>

          {/* Expandable bonus info */}
          <button
            onClick={() => setShowBonus(!showBonus)}
            className="w-full text-center py-2 text-[#FFD700] text-xs font-bold hover:bg-[#2a2a1a] border-t-2 border-black"
          >
            ℹ️ Bonus Information {showBonus ? '▲' : '▼'}
          </button>
          {showBonus && (
            <div className="px-4 py-3 bg-[#1a1a1a] border-t border-white/10 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-blue-400 text-sm"></span>
                <p className="text-white/80 text-[10px] leading-relaxed">
                  <strong className="text-blue-400">Ultra Mode (Arbitrum):</strong> Switch to Arbitrum chain for 2x balls — doubles your chance of landing on higher prizes. Toggle between Normal/Base and Ultra using the chain selector inside the roulette.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 text-sm">💜</span>
                <p className="text-white/80 text-[10px] leading-relaxed">
                  <strong className="text-purple-400">VibeFID Holder:</strong> Owning any VibeFID NFT gives you +2 extra balls per spin, significantly increasing your odds.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 text-sm">⚡</span>
                <p className="text-white/80 text-[10px] leading-relaxed">
                  <strong className="text-yellow-400">Aura Level:</strong> Higher Aura levels from battles give you more daily roulette spins. SSJ1+ grants bonus spins, and your earn cap scales with level (100k at Human → 750k at SSJ Blue).
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 text-sm">📊</span>
                <p className="text-white/80 text-[10px] leading-relaxed">
                  <strong className="text-green-400">Results determined server-side:</strong> All spin outcomes are generated on Convex backend and verified on-chain. Cannot be manipulated client-side.
                </p>
              </div>
            </div>
          )}
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
