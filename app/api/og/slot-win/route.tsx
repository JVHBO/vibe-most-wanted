import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const amount   = parseInt(searchParams.get('amount') || '0');
  const multX    = parseInt(searchParams.get('x') || '0');
  const type     = searchParams.get('type') || 'nice'; // nice | great | big | max
  const username = searchParams.get('user') || '';

  const cfg: Record<string, { label: string; color: string; bg: string; glow: string }> = {
    max:   { label: 'MAX WIN!',   color: '#e9d5ff', bg: '#1e0a3c', glow: '#a855f7' },
    big:   { label: 'BIG WIN!',   color: '#fef08a', bg: '#1c1400', glow: '#facc15' },
    great: { label: 'GREAT WIN!', color: '#bbf7d0', bg: '#071c10', glow: '#22c55e' },
    nice:  { label: 'NICE WIN!',  color: '#bae6fd', bg: '#061525', glow: '#38bdf8' },
  };
  const c = cfg[type] || cfg.nice;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: c.bg,
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          width: 400, height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${c.glow}44 0%, transparent 70%)`,
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          display: 'flex',
        }} />

        {/* 🎰 icon */}
        <div style={{ fontSize: 64, marginBottom: 8, display: 'flex' }}>🎰</div>

        {/* WIN TYPE label */}
        <div style={{
          fontSize: 72,
          fontWeight: 900,
          color: c.color,
          letterSpacing: 4,
          textTransform: 'uppercase',
          textShadow: `0 0 30px ${c.glow}`,
          display: 'flex',
          marginBottom: 16,
        }}>
          {c.label}
        </div>

        {/* Amount */}
        <div style={{
          fontSize: 56,
          fontWeight: 900,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
        }}>
          +{amount.toLocaleString('en-US')} coins
        </div>

        {/* Multiplier */}
        {multX >= 2 && (
          <div style={{
            fontSize: 36,
            fontWeight: 700,
            color: c.glow,
            display: 'flex',
            marginBottom: 16,
          }}>
            {multX}× multiplier
          </div>
        )}

        {/* Username */}
        {username && (
          <div style={{
            fontSize: 22,
            color: '#9ca3af',
            display: 'flex',
            marginTop: 8,
          }}>
            @{username}
          </div>
        )}

        {/* Footer */}
        <div style={{
          position: 'absolute',
          bottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 20,
          color: '#4b5563',
        }}>
          🎴 Tukka Slots — vibemostwanted.xyz
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
