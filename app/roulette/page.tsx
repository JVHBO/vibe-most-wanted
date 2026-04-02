"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Roulette } from "@/components/Roulette";

// Prize images for floating background
const PRIZE_IMAGES = [
  "https://ipfs.filebase.io/ipfs/QmeLCtF8Ytq7FKKzY5r9AiYCwQPzxtvfYz1GPGvfRHAL2U",
  "https://ipfs.filebase.io/ipfs/QmaWpsAeMKMC796hRUtmKWfs2gnqpDNo2YpnKFxi8bK9oq",
  "https://ipfs.filebase.io/ipfs/QmZxc6QK1mPkVLha4Kr1Bh3bwQX351998TsJ3MxoWL8Av5",
  "https://ipfs.filebase.io/ipfs/QmTCd36KKyTSbY3NRrewz8NzdcRAAg3zBQnhfudgAVkyWd",
  "https://ipfs.filebase.io/ipfs/QmdjNEN5URcfQtyG4VWMBjGcsFm8FXYMm56uL3qyB6jZNF",
];

const FALLBACK_BALL = "https://ipfs.filebase.io/ipfs/QmdjNEN5URcfQtyG4VWMBjGcsFm8FXYMm56uL3qyB6jZNF";

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

export default function RoulettePage() {
  const { address } = useAccount();
  const profile = useQuery(
    api.profiles.getProfileDashboard,
    address ? { address } : "skip"
  );
  const pfpUrl = (profile as any)?.farcasterPfpUrl || FALLBACK_BALL;

  const [showFloating, setShowFloating] = useState(false);
  const [swiped, setSwiped] = useState(false);
  const [chainMode, setChainMode] = useState<'base' | 'arbitrum'>('arbitrum');
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const rouletteRef = useRef<HTMLDivElement>(null);

  // Trigger floating on win (expose via custom event from Roulette)
  useEffect(() => {
    const onWin = () => {
      setShowFloating(true);
      setTimeout(() => setShowFloating(false), 6000);
    };
    window.addEventListener("roulette:win", onWin);
    return () => window.removeEventListener("roulette:win", onWin);
  }, []);

  // Swipe hint disappears after first swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      setSwiped(true);
      // Forward a synthetic click to the spin button inside Roulette
      const spinBtn = rouletteRef.current?.querySelector<HTMLButtonElement>('[data-spin-button]');
      if (spinBtn && !spinBtn.disabled) spinBtn.click();
    }
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
        /* Shine band sweeping across sphere to simulate rotation */
        @keyframes sphereShine {
          0%   { transform: translateX(-140%) skewX(-18deg); opacity: 0; }
          20%  { opacity: 0.5; }
          80%  { opacity: 0.3; }
          100% { transform: translateX(240%) skewX(-18deg); opacity: 0; }
        }
        /* Logo spinning on ball's Y-axis — combined with perspective gives 3D coin-flip effect */
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
            &larr; Back
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold tracking-widest uppercase"
              style={{ color: '#FFD700', fontFamily: 'var(--font-cinzel)', letterSpacing: '0.2em' }}>
              Daily Roulette
            </h1>
          </div>
          {/* User ball preview */}
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0"
            style={{ border: '2px solid rgba(255,215,0,0.4)', boxShadow: '0 0 8px rgba(255,215,0,0.3)' }}>
            <img src={pfpUrl} alt="" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Roulette content */}
        <div ref={rouletteRef} className="relative z-10 flex-1 min-h-0" style={{ display:'flex', flexDirection:'column' }}>
          <Roulette pfpUrl={pfpUrl} onChainChange={setChainMode} />
        </div>

        {/* Swipe hint overlay — disappears after first swipe */}
        {!swiped && (
          <div className="pointer-events-none absolute bottom-24 left-0 right-0 z-20 flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full"
              style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,215,0,0.25)' }}>
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0"
                style={{ border: '2px solid rgba(255,215,0,0.5)', animation: 'swipeHint 1.6s ease-in-out infinite' }}>
                <img src={pfpUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-medium" style={{ color: 'rgba(255,215,0,0.7)' }}>
                Swipe to spin
              </span>
              <span style={{ color: 'rgba(255,215,0,0.5)', fontSize: 16 }}>&rarr;</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
