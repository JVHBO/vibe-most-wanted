import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Farcaster embed spec: 3:2 ratio
const W = 1200;
const H = 800;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const amount   = parseInt(searchParams.get('amount') || '0');
  const multX    = parseInt(searchParams.get('x') || '0');
  const type     = searchParams.get('type') || 'nice';
  const username = searchParams.get('user') || '';

  type WinConfig = { label: string; accent: string; badge: string };
  const cfg: Record<string, WinConfig> = {
    max:   { label: 'MAX WIN',   accent: '#c084fc', badge: '#7c3aed' },
    big:   { label: 'BIG WIN',   accent: '#fbbf24', badge: '#d97706' },
    great: { label: 'GREAT WIN', accent: '#34d399', badge: '#059669' },
    nice:  { label: 'NICE WIN',  accent: '#38bdf8', badge: '#0284c7' },
  };
  const c = cfg[type] ?? cfg.nice;

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
    : String(n);

  // Fetch background image
  const bgUrl = `${origin}/angry-angry-kid.png`;
  const bgRes = await fetch(bgUrl);
  const bgBuf = await bgRes.arrayBuffer();
  const bgBase64 = `data:image/png;base64,${Buffer.from(bgBuf).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '"Arial Black", Arial, sans-serif',
        }}
      >
        {/* ── Background image (angry kid) stretched full */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bgBase64}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
          }}
        />

        {/* ── Dark gradient overlay so text is readable */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.88) 100%)',
          display: 'flex',
        }} />

        {/* ── Accent glow behind text area */}
        <div style={{
          position: 'absolute',
          bottom: 80, left: '50%',
          transform: 'translateX(-50%)',
          width: 700, height: 300,
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${c.accent}33 0%, transparent 70%)`,
          display: 'flex',
        }} />

        {/* ── Corner lines */}
        <div style={{ position:'absolute', top:0, left:0, width:200, height:4, background:`linear-gradient(90deg,${c.accent},transparent)`, display:'flex' }} />
        <div style={{ position:'absolute', top:0, left:0, width:4, height:200, background:`linear-gradient(180deg,${c.accent},transparent)`, display:'flex' }} />
        <div style={{ position:'absolute', bottom:0, right:0, width:200, height:4, background:`linear-gradient(270deg,${c.accent},transparent)`, display:'flex' }} />
        <div style={{ position:'absolute', bottom:0, right:0, width:4, height:180, background:`linear-gradient(0deg,${c.accent},transparent)`, display:'flex' }} />

        {/* ── Top logo */}
        <div style={{
          position: 'absolute', top: 28, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '5px 18px',
            border: `1px solid ${c.accent}66`,
            borderRadius: 30,
            background: 'rgba(0,0,0,0.55)',
          }}>
            <span style={{ color: c.accent, fontSize: 17, fontWeight: 700, letterSpacing: 3 }}>TUKKA SLOTS</span>
          </div>
        </div>

        {/* ── Main content — bottom half */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: 40,
          gap: 10,
        }}>
          {/* Badge */}
          <div style={{
            display: 'flex',
            background: c.badge,
            borderRadius: 8,
            padding: '4px 18px',
          }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 900, letterSpacing: 4 }}>Tukka Slots</span>
          </div>

          {/* WIN LABEL */}
          <div style={{
            fontSize: 92,
            fontWeight: 900,
            color: c.accent,
            letterSpacing: 5,
            lineHeight: 1,
            display: 'flex',
            textShadow: `0 0 50px ${c.accent}cc, 2px 2px 0 rgba(0,0,0,0.9)`,
          }}>
            {c.label}
          </div>

          {/* Amount + multiplier row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{
              fontSize: 68,
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1,
              textShadow: '0 2px 12px rgba(0,0,0,0.9)',
            }}>
              +{fmt(amount)}
            </span>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#ffffffaa', lineHeight: 1 }}>VBMS</span>
            {multX >= 2 && (
              <span style={{
                fontSize: 30, fontWeight: 900, color: c.accent,
                marginLeft: 8,
                background: `${c.badge}cc`,
                padding: '4px 14px', borderRadius: 20,
                border: `1.5px solid ${c.accent}88`,
              }}>
                {multX}×
              </span>
            )}
          </div>

          {/* Username */}
          {username && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 16px', borderRadius: 16,
              background: 'rgba(255,255,255,0.08)',
            }}>
              <span style={{ color: '#ffffffaa', fontSize: 20, fontWeight: 600 }}>@{username}</span>
            </div>
          )}
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
