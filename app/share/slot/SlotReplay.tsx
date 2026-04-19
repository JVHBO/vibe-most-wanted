'use client';

import { useEffect, useState } from 'react';

type SpinData = {
  spinId: string;
  spinType: string;
  finalGrid: string[];
  winAmount: number;
  foilCount: number;
  triggeredBonus: boolean;
  timestamp: number;
};

type Props = {
  spins: SpinData[];
  totalWin: number;
  username: string;
  winType: string;
  amount: number;
  multX: number;
};

const CARD_IMAGES: Record<string, string> = {
  dragukka: 'https://vibemostwanted.xyz/images/baccarat/dragukka.png',
};

function cardImg(baccarat: string): string {
  const clean = baccarat.replace(':f', '');
  const slug = clean.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `https://vibemostwanted.xyz/images/baccarat/${slug}.png`;
}

const WIN_COLORS: Record<string, string> = {
  max: '#a855f7',
  big: '#FFD700',
  great: '#4ade80',
  nice: '#38bdf8',
};

export default function SlotReplay({ spins, totalWin, username, winType, amount, multX }: Props) {
  const [phase, setPhase] = useState<'loading' | 'spinning' | 'reveal' | 'done'>('loading');
  const [currentSpin, setCurrentSpin] = useState(0);
  const [revealedCols, setRevealedCols] = useState<Set<number>>(new Set());
  const [showTotal, setShowTotal] = useState(false);

  const winColor = WIN_COLORS[winType] ?? '#FFD700';
  const spin = spins[currentSpin];

  useEffect(() => {
    if (!spins.length) return;
    const t = setTimeout(() => setPhase('spinning'), 400);
    return () => clearTimeout(t);
  }, [spins.length]);

  useEffect(() => {
    if (phase !== 'spinning') return;
    const t = setTimeout(() => {
      setRevealedCols(new Set());
      setPhase('reveal');
    }, 700);
    return () => clearTimeout(t);
  }, [phase, currentSpin]);

  useEffect(() => {
    if (phase !== 'reveal') return;
    let col = 0;
    const interval = setInterval(() => {
      setRevealedCols(prev => {
        const next = new Set(prev);
        next.add(col);
        return next;
      });
      col++;
      if (col >= 5) {
        clearInterval(interval);
        setTimeout(() => {
          if (currentSpin + 1 < spins.length) {
            setCurrentSpin(s => s + 1);
            setRevealedCols(new Set());
            setPhase('spinning');
          } else {
            setShowTotal(true);
            setPhase('done');
          }
        }, 900);
      }
    }, 120);
    return () => clearInterval(interval);
  }, [phase, currentSpin, spins.length]);

  if (!spin) return null;

  const grid = spin.finalGrid.length === 15 ? spin.finalGrid : Array(15).fill('');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0020 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: '"Arial Black", Arial, sans-serif',
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: '#ffffff55', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 6 }}>
          🎰 Tukka Slots
        </div>
        {username && (
          <div style={{ fontSize: 18, color: '#ffffff99', fontWeight: 700 }}>
            @{username}
          </div>
        )}
        {spins.length > 1 && (
          <div style={{ fontSize: 12, color: '#ffffff44', marginTop: 4 }}>
            Spin {currentSpin + 1} / {spins.length}
          </div>
        )}
      </div>

      {/* Win label */}
      <div style={{
        fontSize: 36,
        fontWeight: 900,
        color: winColor,
        textShadow: `0 0 20px ${winColor}`,
        textTransform: 'uppercase',
        letterSpacing: 3,
        marginBottom: 12,
      }}>
        {winType === 'max' ? 'MAX WIN!' : winType === 'big' ? 'BIG WIN!' : winType === 'great' ? 'GREAT WIN!' : 'NICE WIN!'}
      </div>

      {/* 5×3 Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 64px)',
        gridTemplateRows: 'repeat(3, 64px)',
        gap: 4,
        background: 'rgba(0,0,0,0.6)',
        border: `2px solid ${winColor}44`,
        borderRadius: 16,
        padding: 10,
        boxShadow: `0 0 40px ${winColor}22`,
        marginBottom: 20,
      }}>
        {grid.map((cell, idx) => {
          const col = idx % 5;
          const isFoil = cell.endsWith(':f');
          const baccarat = cell.replace(':f', '');
          const revealed = revealedCols.has(col);
          const spinning = phase === 'spinning' || (phase === 'reveal' && !revealed);

          return (
            <div
              key={idx}
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                overflow: 'hidden',
                position: 'relative',
                background: spinning ? '#1a0030' : isFoil ? `${winColor}22` : '#0d001a',
                border: isFoil && !spinning ? `2px solid ${winColor}` : '2px solid #ffffff11',
                boxShadow: isFoil && !spinning ? `0 0 12px ${winColor}88` : undefined,
                transition: 'all 0.15s ease',
              }}
            >
              {spinning ? (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(180deg, #2a0050, #0d001a, #2a0050)',
                  backgroundSize: '100% 300%',
                  animation: 'spinBg 0.15s linear infinite',
                  opacity: 0.8,
                }} />
              ) : baccarat ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cardImg(baccarat)}
                  alt={baccarat}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : null}
              {isFoil && !spinning && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(135deg, ${winColor}33, transparent, ${winColor}22)`,
                  pointerEvents: 'none',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Spin win amount */}
      {phase !== 'loading' && spin.winAmount > 0 && (
        <div style={{
          fontSize: 28,
          fontWeight: 900,
          color: '#4ade80',
          textShadow: '0 0 16px #4ade80',
          marginBottom: 8,
        }}>
          +{spin.winAmount.toLocaleString()} coins
        </div>
      )}

      {/* Total win (shown at end) */}
      {showTotal && spins.length > 1 && (
        <div style={{
          marginTop: 16,
          textAlign: 'center',
          animation: 'fadeIn 0.5s ease',
        }}>
          <div style={{ fontSize: 13, color: '#ffffff55', letterSpacing: 3, textTransform: 'uppercase' }}>
            Total Session Win
          </div>
          <div style={{
            fontSize: 52,
            fontWeight: 900,
            color: winColor,
            textShadow: `0 0 30px ${winColor}, 0 0 60px ${winColor}66`,
            lineHeight: 1.1,
          }}>
            +{totalWin.toLocaleString()}
          </div>
          {multX >= 2 && (
            <div style={{ fontSize: 28, fontWeight: 900, color: '#FFD700', textShadow: '0 0 12px #FFD70088' }}>
              {multX}×
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <a
        href="https://vibemostwanted.xyz/slot"
        style={{
          marginTop: 28,
          padding: '12px 32px',
          background: `linear-gradient(180deg, ${winColor}, ${winColor}88)`,
          color: '#000',
          fontWeight: 900,
          fontSize: 15,
          textTransform: 'uppercase',
          letterSpacing: 2,
          borderRadius: 12,
          textDecoration: 'none',
          border: '2px solid #000',
          boxShadow: '0 4px 0 #000',
        }}
      >
        Play Tukka Slots
      </a>

      <style>{`
        @keyframes spinBg {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 100%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
