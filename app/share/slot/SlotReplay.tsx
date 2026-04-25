'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVbmsBaccaratImageUrl } from '@/lib/tcg/images';

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
  pfp?: string;
  sid?: string;
  winType: string;
  amount: number;
  multX: number;
};

const WIN_COLORS: Record<string, string> = {
  max: '#a855f7',
  big: '#FFD700',
  great: '#4ade80',
  nice: '#38bdf8',
};

const WIN_LABELS: Record<string, string> = {
  max: 'MAX WIN!',
  big: 'BIG WIN!',
  great: 'GREAT WIN!',
  nice: 'NICE WIN!',
};

function cardImg(cell: string): string | null {
  const baccarat = cell.replace(':f', '').trim();
  if (!baccarat) return null;
  if (baccarat.toLowerCase() === 'dragukka') return '/slot-gifs/casino-slot-animation.gif';
  return getVbmsBaccaratImageUrl(baccarat);
}

function fallbackGrid(spins: SpinData[]): string[] {
  const best = [...spins]
    .filter((spin) => Array.isArray(spin.finalGrid) && spin.finalGrid.length === 15)
    .sort((a, b) => (b.winAmount ?? 0) - (a.winAmount ?? 0))[0];
  return best?.finalGrid ?? Array(15).fill('');
}

function fmt(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${Math.round(n / 1_000)}K`
    : n.toLocaleString();
}

export default function SlotReplay({ spins, totalWin, username, pfp, sid, winType, amount, multX }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<'intro' | 'spinning' | 'reveal' | 'done'>('intro');
  const [currentSpin, setCurrentSpin] = useState(0);
  const [revealedCols, setRevealedCols] = useState<Set<number>>(new Set());

  const winColor = WIN_COLORS[winType] ?? '#4ade80';
  const spin = spins[currentSpin];
  const replayGrid = useMemo(() => fallbackGrid(spins), [spins]);
  const grid = spin?.finalGrid?.length === 15 ? spin.finalGrid : replayGrid;
  const shownWin = spins.length ? totalWin : amount;

  useEffect(() => {
    if (!spins.length || phase !== 'spinning') return;
    const timeout = window.setTimeout(() => {
      setRevealedCols(new Set());
      setPhase('reveal');
    }, 850);
    return () => window.clearTimeout(timeout);
  }, [phase, spins.length, currentSpin]);

  useEffect(() => {
    if (phase !== 'reveal') return;
    let col = 0;
    const interval = window.setInterval(() => {
      setRevealedCols((prev) => {
        const next = new Set(prev);
        next.add(col);
        return next;
      });
      col += 1;
      if (col >= 5) {
        window.clearInterval(interval);
        window.setTimeout(() => {
          if (currentSpin + 1 < spins.length) {
            setCurrentSpin((value) => value + 1);
            setRevealedCols(new Set());
            setPhase('spinning');
          } else {
            setRevealedCols(new Set([0, 1, 2, 3, 4]));
            setPhase('done');
          }
        }, 950);
      }
    }, 150);
    return () => window.clearInterval(interval);
  }, [phase, currentSpin, spins.length]);

  const startReplay = () => {
    setCurrentSpin(0);
    setRevealedCols(new Set());
    setPhase(spins.length ? 'spinning' : 'done');
  };

  const skipReplay = () => {
    setCurrentSpin(Math.max(0, spins.length - 1));
    setRevealedCols(new Set([0, 1, 2, 3, 4]));
    setPhase('done');
  };

  // Intro landing screen
  if (phase === 'intro') {
    return (
      <div className="slotReplay">
        <div className="slotShell">
          {/* User header */}
          <div className="introHeader">
            {pfp && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pfp} alt={username} className="introPfp" />
            )}
            {!pfp && username && (
              <div className="introPfpFallback">
                {username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="introText">
              {username && <span className="introUsername">@{username}</span>}
              <span className="introSubtitle">compartilhou o replay de uma win</span>
            </div>
          </div>

          {/* Win badge */}
          <div className="winLabel" style={{ color: winColor, textShadow: `0 0 22px ${winColor}` }}>
            {WIN_LABELS[winType] ?? 'SLOT WIN!'}
          </div>
          <div className="introAmount" style={{ color: winColor, textShadow: `0 0 28px ${winColor}` }}>
            +{fmt(shownWin)}
            {multX >= 2 && <span className="introMult"> {multX}×</span>}
          </div>

          {/* Grid preview (static, last best spin) */}
          <div className="gridFrame" style={{ borderColor: `${winColor}55`, boxShadow: `0 0 34px ${winColor}22` }}>
            <div className="slotGrid">
              {Array.from({ length: 15 }).map((_, idx) => {
                const cell = replayGrid[idx] ?? '';
                const isFoil = cell.endsWith(':f');
                const img = cardImg(cell);
                return (
                  <div
                    className={`slotCell ${isFoil ? 'isFoil' : ''}`}
                    style={isFoil ? { borderColor: winColor, boxShadow: `0 0 14px ${winColor}` } : undefined}
                    key={idx}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={cell.replace(':f', '')} />
                    ) : null}
                    {isFoil && <div className="foilWash" style={{ background: `linear-gradient(135deg, ${winColor}44, transparent 52%, ${winColor}33)` }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="introBtns">
            <button
              className="btnReplay"
              onClick={() => {
                if (sid) {
                  router.push(`/slot?replay=${sid}${username ? `&user=${encodeURIComponent(username)}` : ''}`);
                } else {
                  startReplay();
                }
              }}
              type="button"
            >
              🎬 View Replay
            </button>
            <button className="btnPlay" onClick={() => router.push('/slot')} type="button">
              🎰 Quero Jogar
            </button>
          </div>
        </div>

        <style jsx>{`
          ${BASE_STYLES}
          .introHeader {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 22px;
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.1);
            border-radius: 14px;
            padding: 12px 16px;
            width: 100%;
          }
          .introPfp {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,.3);
            object-fit: cover;
            flex-shrink: 0;
          }
          .introPfpFallback {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,.3);
            background: linear-gradient(135deg, #4a0078, #1a0040);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 900;
            flex-shrink: 0;
          }
          .introText {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .introUsername {
            font-size: 17px;
            font-weight: 900;
            color: #fff;
          }
          .introSubtitle {
            font-size: 12px;
            color: rgba(255,255,255,.55);
            font-weight: 700;
          }
          .introAmount {
            font-size: clamp(42px, 13vw, 64px);
            font-weight: 900;
            line-height: 1;
            margin-bottom: 20px;
            text-align: center;
          }
          .introMult {
            font-size: 0.55em;
            color: #FFD700;
          }
          .introBtns {
            display: flex;
            gap: 12px;
            margin-top: 24px;
            width: 100%;
          }
          .btnReplay {
            flex: 1;
            min-height: 52px;
            border-radius: 10px;
            border: 2px solid #000;
            background: linear-gradient(180deg, #818cf8, #4338ca);
            color: #fff;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: .1em;
            text-transform: uppercase;
            box-shadow: 0 4px 0 #000;
            cursor: pointer;
          }
          .btnPlay {
            flex: 1;
            min-height: 52px;
            border-radius: 10px;
            border: 2px solid #000;
            background: linear-gradient(180deg, #4ade80, #15803d);
            color: #020617;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: .1em;
            text-transform: uppercase;
            box-shadow: 0 4px 0 #000;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="slotReplay">
      {phase !== 'done' && (
        <button className="skipButton" onClick={skipReplay} type="button">
          Skip
        </button>
      )}

      <div className="slotShell">
        <div className="slotHeader">
          <div className="slotTitle">Tukka Slots</div>
          {username && <div className="slotUser">@{username}</div>}
          <div className="slotReplayLabel">
            Replay {spins.length > 1 ? `${currentSpin + 1} / ${spins.length}` : ''}
          </div>
        </div>

        <div className="winLabel" style={{ color: winColor, textShadow: `0 0 22px ${winColor}` }}>
          {WIN_LABELS[winType] ?? 'SLOT WIN!'}
        </div>

        <div className="gridFrame" style={{ borderColor: `${winColor}55`, boxShadow: `0 0 34px ${winColor}22` }}>
          <div className="slotGrid">
            {Array.from({ length: 15 }).map((_, idx) => {
              const cell = grid[idx] ?? '';
              const col = idx % 5;
              const isFoil = cell.endsWith(':f');
              const img = cardImg(cell);
              const isSpinning = phase === 'spinning' || (phase === 'reveal' && !revealedCols.has(col));

              return (
                <div
                  className={`slotCell ${isSpinning ? 'isSpinning' : ''} ${isFoil && !isSpinning ? 'isFoil' : ''}`}
                  style={isFoil && !isSpinning ? { borderColor: winColor, boxShadow: `0 0 14px ${winColor}` } : undefined}
                  key={`${currentSpin}-${idx}`}
                >
                  {isSpinning ? (
                    <div className="spinStripe" />
                  ) : img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={cell.replace(':f', '')} />
                  ) : null}
                  {isFoil && !isSpinning && <div className="foilWash" style={{ background: `linear-gradient(135deg, ${winColor}44, transparent 52%, ${winColor}33)` }} />}
                </div>
              );
            })}
          </div>
        </div>

        {phase !== 'done' && spin?.winAmount > 0 && (
          <div className="spinWin">+{spin.winAmount.toLocaleString()} coins</div>
        )}

        {phase === 'done' && (
          <div className="resultPanel">
            <div className="resultCaption">Total Session Win</div>
            <div className="resultAmount">+{fmt(shownWin)}</div>
            {multX >= 2 && <div className="resultMult">{multX}x</div>}
            <div className="introBtns" style={{ marginTop: 26 }}>
              <button className="btnReplay" onClick={() => setPhase('intro')} type="button">
                🎬 Replay
              </button>
              <button className="btnPlay" onClick={() => router.push('/slot')} type="button">
                🎰 Jogar
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        ${BASE_STYLES}
        .introBtns {
          display: flex;
          gap: 12px;
          width: 100%;
        }
        .btnReplay {
          flex: 1;
          min-height: 48px;
          border-radius: 10px;
          border: 2px solid #000;
          background: linear-gradient(180deg, #818cf8, #4338ca);
          color: #fff;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .1em;
          text-transform: uppercase;
          box-shadow: 0 4px 0 #000;
          cursor: pointer;
        }
        .btnPlay {
          flex: 1;
          min-height: 48px;
          border-radius: 10px;
          border: 2px solid #000;
          background: linear-gradient(180deg, #4ade80, #15803d);
          color: #020617;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .1em;
          text-transform: uppercase;
          box-shadow: 0 4px 0 #000;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

const BASE_STYLES = `
  .slotReplay {
    min-height: 100dvh;
    background: radial-gradient(ellipse at 50% 18%, #21103d 0%, #10001f 54%, #050009 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: max(18px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom));
    font-family: var(--font-cinzel), "Arial Black", Arial, sans-serif;
  }
  .skipButton {
    position: fixed;
    top: max(12px, env(safe-area-inset-top));
    right: 12px;
    z-index: 10;
    border: 1px solid rgba(255,255,255,.22);
    background: rgba(0,0,0,.7);
    color: #fff;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .12em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .slotShell {
    width: min(100%, 420px);
    min-height: min(760px, calc(100dvh - 28px));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .slotHeader {
    text-align: center;
    margin-bottom: 18px;
  }
  .slotTitle {
    color: rgba(255,255,255,.42);
    font-size: 14px;
    font-weight: 900;
    letter-spacing: .42em;
    text-transform: uppercase;
  }
  .slotUser {
    color: rgba(255,255,255,.82);
    font-size: 20px;
    font-weight: 900;
    margin-top: 10px;
  }
  .slotReplayLabel {
    color: rgba(255,255,255,.46);
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .12em;
    text-transform: uppercase;
    margin-top: 8px;
  }
  .winLabel {
    font-size: clamp(30px, 9vw, 42px);
    font-weight: 900;
    letter-spacing: .18em;
    text-transform: uppercase;
    margin-bottom: 18px;
    text-align: center;
  }
  .gridFrame {
    width: 100%;
    border: 2px solid;
    border-radius: 16px;
    background: rgba(7,0,18,.9);
    padding: 10px;
  }
  .slotGrid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 5px;
  }
  .slotCell {
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    background: #130022;
    border: 2px solid rgba(255,255,255,.08);
  }
  .slotCell img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .slotCell.isSpinning {
    border-color: rgba(255,255,255,.1);
  }
  .spinStripe {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #2d0055, #090011 34%, #2d0055 70%, #090011);
    background-size: 100% 260%;
    animation: spinBg .14s linear infinite;
    opacity: .9;
  }
  .foilWash {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .spinWin {
    color: #4ade80;
    font-size: 26px;
    font-weight: 900;
    margin-top: 18px;
    text-shadow: 0 0 16px #4ade80;
  }
  .resultPanel {
    text-align: center;
    margin-top: 28px;
    width: 100%;
  }
  .resultCaption {
    color: rgba(255,255,255,.48);
    font-size: 13px;
    font-weight: 900;
    letter-spacing: .26em;
    text-transform: uppercase;
  }
  .resultAmount {
    color: #4ade80;
    font-size: clamp(50px, 15vw, 72px);
    font-weight: 900;
    line-height: 1.05;
    text-shadow: 0 0 24px #4ade80, 0 0 48px rgba(74,222,128,.38);
  }
  .resultMult {
    color: #FFD700;
    font-size: 30px;
    font-weight: 900;
    text-shadow: 0 0 14px rgba(255,215,0,.6);
  }
  @keyframes spinBg {
    0% { background-position: 0 0; }
    100% { background-position: 0 100%; }
  }
`;
