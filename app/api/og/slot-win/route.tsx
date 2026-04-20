import { ImageResponse } from 'next/og';
import { getVbmsBaccaratImageUrl } from '@/lib/tcg/images';

export const runtime = 'edge';

const W = 1200;
const H = 800;
const BASE_URL = 'https://vibemostwanted.xyz';

type SpinData = {
  finalGrid?: string[];
  winAmount?: number;
};

async function fetchSessionSpins(sessionId: string): Promise<SpinData[]> {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) return [];
    const res = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'slot:getSpinsBySession', args: { sessionId }, format: 'json' }),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.value ?? [];
  } catch {
    return [];
  }
}

function cardImage(cell: string): string | null {
  const baccarat = cell.replace(':f', '').trim();
  if (!baccarat) return null;
  if (baccarat.toLowerCase() === 'dragukka') return `${BASE_URL}/slot-gifs/casino-slot-animation.gif`;
  const src = getVbmsBaccaratImageUrl(baccarat);
  if (!src) return null;
  return src.startsWith('http') ? src : `${BASE_URL}${src}`;
}

function pickGrid(spins: SpinData[]): string[] {
  const best = [...spins]
    .filter((spin) => Array.isArray(spin.finalGrid) && spin.finalGrid.length === 15)
    .sort((a, b) => (b.winAmount ?? 0) - (a.winAmount ?? 0))[0];
  return best?.finalGrid ?? [];
}

function fmt(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${Math.round(n / 1_000)}K`
    : String(n);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const amount = parseInt(searchParams.get('amount') || '0');
  const multX = parseInt(searchParams.get('x') || '0');
  const username = searchParams.get('user') || '';
  const type = searchParams.get('type') || 'nice';
  const sid = searchParams.get('sid') || '';

  const spins = sid ? await fetchSessionSpins(sid) : [];
  const grid = pickGrid(spins);
  const totalWin = spins.length > 0
    ? spins.reduce((sum, spin) => sum + (spin.winAmount ?? 0), 0)
    : amount;

  const winLabels: Record<string, string> = {
    max: 'MAX WIN',
    big: 'BIG WIN',
    great: 'GREAT WIN',
    nice: 'NICE WIN',
  };
  const winColors: Record<string, string> = {
    max: '#a855f7',
    big: '#FFD700',
    great: '#4ade80',
    nice: '#38bdf8',
  };
  const label = winLabels[type] ?? 'SLOT WIN';
  const winColor = winColors[type] ?? '#4ade80';

  return new ImageResponse(
    (
      <div style={{
        width: W,
        height: H,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'radial-gradient(circle at 50% 18%, #241044 0%, #10001f 46%, #050009 100%)',
        color: '#fff',
        fontFamily: 'Arial Black, Arial, sans-serif',
        padding: 54,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', color: '#8f86a8', fontSize: 28, letterSpacing: 14, textTransform: 'uppercase' }}>
          Tukka Slots
        </div>
        {username && (
          <div style={{ display: 'flex', marginTop: 14, color: '#d8d2e8', fontSize: 36 }}>
            @{username}
          </div>
        )}

        <div style={{
          display: 'flex',
          marginTop: 28,
          color: winColor,
          fontSize: 72,
          letterSpacing: 10,
          textShadow: `0 0 28px ${winColor}`,
          textTransform: 'uppercase',
        }}>
          {label}
        </div>

        <div style={{
          display: 'flex',
          marginTop: 22,
          padding: 18,
          border: `4px solid ${winColor}66`,
          borderRadius: 26,
          background: 'rgba(8,0,20,.92)',
          boxShadow: `0 0 48px ${winColor}22`,
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            width: 620,
            gap: 8,
          }}>
            {Array.from({ length: 15 }).map((_, idx) => {
              const cell = grid[idx] ?? '';
              const isFoil = cell.endsWith(':f');
              const img = cardImage(cell);
              return (
                <div key={idx} style={{
                  width: 116,
                  height: 116,
                  display: 'flex',
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: '#130022',
                  border: isFoil ? `5px solid ${winColor}` : '3px solid #ffffff18',
                  boxShadow: isFoil ? `0 0 20px ${winColor}` : 'none',
                  position: 'relative',
                }}>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', width: '100%', height: '100%', background: 'linear-gradient(180deg,#22003f,#080011)' }} />
                  )}
                  {isFoil && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', background: `linear-gradient(135deg, ${winColor}44, transparent 50%, ${winColor}33)` }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: 34, flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', color: '#9790aa', fontSize: 26, letterSpacing: 8, textTransform: 'uppercase' }}>
            Total Session Win
          </div>
          <div style={{ display: 'flex', color: '#4ade80', fontSize: 78, textShadow: '0 0 28px #4ade80', marginTop: 4 }}>
            +{fmt(totalWin)}
          </div>
          {multX >= 2 && (
            <div style={{ display: 'flex', color: '#FFD700', fontSize: 44, textShadow: '0 0 18px #FFD700' }}>
              {multX}x
            </div>
          )}
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}