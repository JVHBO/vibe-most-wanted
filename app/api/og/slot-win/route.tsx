import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Farcaster embed spec: image displayed at 3:2 ratio inside casts
// https://miniapps.farcaster.xyz/docs/specification
const W = 1200;
const H = 800;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const amount   = parseInt(searchParams.get('amount') || '0');
  const multX    = parseInt(searchParams.get('x') || '0');
  const type     = searchParams.get('type') || 'nice'; // nice | great | big | max
  const username = searchParams.get('user') || '';

  type WinConfig = { label: string; sub: string; accent: string; bg1: string; bg2: string; badge: string };
  const cfg: Record<string, WinConfig> = {
    max:   { label: 'MAX WIN',   sub: '🔥 Legendary hit!',     accent: '#c084fc', bg1: '#0d0019', bg2: '#1e0040', badge: '#7c3aed' },
    big:   { label: 'BIG WIN',   sub: '💎 Incredible!',         accent: '#fbbf24', bg1: '#0d0900', bg2: '#1c1400', badge: '#d97706' },
    great: { label: 'GREAT WIN', sub: '🚀 Awesome spin!',       accent: '#34d399', bg1: '#000d07', bg2: '#071c10', badge: '#059669' },
    nice:  { label: 'NICE WIN',  sub: '⚡ Lucky spin!',         accent: '#38bdf8', bg1: '#000a12', bg2: '#061525', badge: '#0284c7' },
  };
  const c = cfg[type] ?? cfg.nice;

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
    : String(n);

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(160deg, ${c.bg1} 0%, ${c.bg2} 50%, #080808 100%)`,
          fontFamily: '"Arial Black", Arial, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Radial glow center ── */}
        <div style={{
          position: 'absolute',
          width: 700, height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${c.accent}28 0%, transparent 65%)`,
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          display: 'flex',
        }} />

        {/* ── Corner accent lines ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 220, height: 4,
          background: `linear-gradient(90deg, ${c.accent}, transparent)`,
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 4, height: 220,
          background: `linear-gradient(180deg, ${c.accent}, transparent)`,
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 220, height: 4,
          background: `linear-gradient(270deg, ${c.accent}, transparent)`,
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 4, height: 220,
          background: `linear-gradient(0deg, ${c.accent}, transparent)`,
          display: 'flex',
        }} />

        {/* ── Top logo bar ── */}
        <div style={{
          position: 'absolute',
          top: 32, left: 0, right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 20px',
            border: `1px solid ${c.accent}55`,
            borderRadius: 30,
            background: `${c.accent}11`,
          }}>
            <span style={{ fontSize: 22 }}>🎴</span>
            <span style={{ color: c.accent, fontSize: 18, fontWeight: 700, letterSpacing: 3 }}>TUKKA SLOTS</span>
            <span style={{ color: '#ffffff44', fontSize: 16 }}>·</span>
            <span style={{ color: '#ffffff55', fontSize: 16, fontWeight: 400 }}>vibemostwanted.xyz</span>
          </div>
        </div>

        {/* ── WIN LABEL ── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          marginBottom: 28,
        }}>
          {/* Badge */}
          <div style={{
            display: 'flex',
            background: c.badge,
            borderRadius: 8,
            padding: '4px 20px',
            marginBottom: 4,
          }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 900, letterSpacing: 4 }}>
              {c.sub}
            </span>
          </div>

          {/* Main win type */}
          <div style={{
            fontSize: 96,
            fontWeight: 900,
            color: c.accent,
            letterSpacing: 6,
            lineHeight: 1,
            display: 'flex',
            textShadow: `0 0 60px ${c.accent}99, 0 0 120px ${c.accent}44`,
          }}>
            {c.label}
          </div>
        </div>

        {/* ── Amount ── */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: multX >= 2 ? 14 : 28,
        }}>
          <span style={{
            fontSize: 80,
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1,
            textShadow: '0 2px 20px rgba(0,0,0,0.8)',
          }}>
            +{fmt(amount)}
          </span>
          <span style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#ffffffaa',
            lineHeight: 1,
            marginBottom: 4,
          }}>
            VBMS
          </span>
        </div>

        {/* ── Multiplier pill ── */}
        {multX >= 2 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: `${c.accent}22`,
            border: `2px solid ${c.accent}88`,
            borderRadius: 40,
            padding: '8px 28px',
            marginBottom: 28,
          }}>
            <span style={{ color: c.accent, fontSize: 32, fontWeight: 900 }}>{multX}×</span>
            <span style={{ color: '#ffffff88', fontSize: 22, fontWeight: 600 }}>multiplier</span>
          </div>
        )}

        {/* ── Username ── */}
        {username && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 20,
            background: '#ffffff0d',
          }}>
            <span style={{ color: '#ffffff88', fontSize: 22 }}>🎰</span>
            <span style={{ color: '#ffffffcc', fontSize: 24, fontWeight: 600 }}>@{username}</span>
          </div>
        )}

        {/* ── Bottom CTA ── */}
        <div style={{
          position: 'absolute',
          bottom: 32, left: 0, right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '10px 32px',
            background: c.badge,
            borderRadius: 12,
            color: '#fff',
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 2,
          }}>
            🎮 TAP TO PLAY
          </div>
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
