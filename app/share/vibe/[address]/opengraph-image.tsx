import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Vibe Most Wanted Player';
export const size = { width: 1200, height: 800 };
export const contentType = 'image/png';

const CONVEX_VMW = 'https://agile-orca-761.convex.cloud';
const CONVEX_FID = 'https://scintillating-mandrill-101.convex.cloud';

function getAuraLabel(aura: number): string {
  if (aura >= 52000) return 'SSJ Blue';
  if (aura >= 28000) return 'SSJ God';
  if (aura >= 14000) return 'SSJ4';
  if (aura >= 6000) return 'SSJ3';
  if (aura >= 2500) return 'SSJ2';
  if (aura >= 800) return 'SSJ1';
  if (aura >= 200) return 'Great Ape';
  return 'Human';
}

function getAuraColor(aura: number): string {
  if (aura >= 52000) return '#60a5fa';
  if (aura >= 28000) return '#f87171';
  if (aura >= 14000) return '#fb923c';
  if (aura >= 2500) return '#facc15';
  if (aura >= 800) return '#4ade80';
  return '#e2e8f0';
}

function fmtNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

async function convexQuery(url: string, path: string, args: object) {
  const r = await fetch(`${url}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' }),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.value ?? null;
}

export default async function Image({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  let username = address.slice(0, 6) + '...' + address.slice(-4);
  let pfpUrl = '';
  let power = 0;
  let aura = 0;
  let neynarScore: number | null = null;
  let fid: number | null = null;

  try {
    const profile = await convexQuery(CONVEX_VMW, 'profiles:getProfile', {
      address: address.toLowerCase(),
    });
    if (profile) {
      username = profile.username || username;
      pfpUrl = profile.farcasterPfpUrl || '';
      power = profile.stats?.totalPower || 0;
      aura = profile.stats?.aura || 0;
      fid = profile.farcasterFid || (profile.fid ? parseInt(profile.fid) : null);
    }
  } catch (_) {}

  if (fid) {
    try {
      const card = await convexQuery(CONVEX_FID, 'farcasterCards:getFarcasterCardByFid', { fid });
      if (card) neynarScore = card.latestNeynarScore ?? card.neynarScore ?? null;
    } catch (_) {}

    if (neynarScore === null) {
      try {
        // Haatz primary (free), Neynar fallback
        let r = await fetch(`https://haatz.quilibrium.com/v2/farcaster/user/bulk?fids=${fid}`, {
          headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000),
        }).catch(() => null);
        const neynarKey = process.env.NEYNAR_API_KEY;
        if (!r?.ok && neynarKey) {
          r = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
            headers: { 'x-api-key': neynarKey },
          }).catch(() => null);
        }
        if (r?.ok) {
          const d = await r.json();
          const score = d.users?.[0]?.experimental?.neynar_user_score;
          if (typeof score === 'number') neynarScore = score;
        }
      } catch (_) {}
    }
  }

  const pfp = pfpUrl ? `https://vibemostwanted.xyz/api/proxy-image?url=${encodeURIComponent(pfpUrl)}` : '';
  const auraColor = getAuraColor(aura);
  const auraLabel = getAuraLabel(aura);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'sans-serif' }}>

        {/* Background layers */}
        <div style={{ position: 'absolute', inset: 0, background: '#080608', display: 'flex' }} />
        {/* Corner glows */}
        <div style={{ position: 'absolute', top: -80, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,60,200,0.15) 0%, transparent 70%)', display: 'flex' }} />
        {/* Subtle grid lines */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,215,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px', display: 'flex' }} />

        {/* Gold top + bottom border */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg, transparent, #FFD700, #B8860B, #FFD700, transparent)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)', display: 'flex' }} />

        {/* Main content — full width, well padded */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '52px 80px 44px',
          boxSizing: 'border-box',
        }}>

          {/* Top: PFP + name block (left) + Neynar badge (right) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '36px', marginBottom: '40px', width: '100%' }}>

            {/* PFP */}
            {pfp ? (
              <img src={pfp} style={{
                width: '130px', height: '130px', borderRadius: '50%',
                border: '4px solid #FFD700',
                boxShadow: '0 0 40px rgba(255,215,0,0.35)',
                objectFit: 'cover', flexShrink: 0,
              }} />
            ) : (
              <div style={{
                width: '130px', height: '130px', borderRadius: '50%',
                border: '4px solid #FFD700',
                background: '#1a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <div style={{ fontSize: '54px', display: 'flex' }}>👤</div>
              </div>
            )}

            {/* Name + subtitle */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px', minWidth: 0 }}>
              <div style={{
                fontSize: '58px', fontWeight: 900, color: '#FFD700',
                lineHeight: 1, display: 'flex',
                overflow: 'hidden',
                maxWidth: '680px',
              }}>
                @{username}
              </div>
              <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.45)', display: 'flex', letterSpacing: '5px', fontWeight: 700 }}>
                VIBE MOST WANTED ⚔️
              </div>
            </div>

            {/* Neynar score badge — only if exists */}
            {neynarScore !== null && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: 'rgba(255,215,0,0.08)',
                border: '2px solid rgba(255,215,0,0.4)',
                borderRadius: '14px',
                padding: '12px 20px',
                flexShrink: 0,
                minWidth: '90px',
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '2px', display: 'flex', marginBottom: '4px' }}>
                  NEYNAR
                </div>
                <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFD700', display: 'flex' }}>
                  {neynarScore.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Stats — Power and Aura side by side */}
          <div style={{ display: 'flex', gap: '28px', flex: 1 }}>

            {/* Power */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,215,0,0.05)',
              border: '2px solid rgba(255,215,0,0.25)',
              borderRadius: '20px', padding: '30px 20px',
              boxShadow: 'inset 0 0 40px rgba(255,215,0,0.04)',
            }}>
              <div style={{ fontSize: '44px', display: 'flex', marginBottom: '12px' }}>⚡</div>
              <div style={{ fontSize: '64px', fontWeight: 900, color: '#FFD700', display: 'flex', lineHeight: 1 }}>
                {fmtNum(power)}
              </div>
              <div style={{ fontSize: '17px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '4px', display: 'flex', marginTop: '12px' }}>
                POWER
              </div>
            </div>

            {/* Aura */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: `rgba(${auraColor === '#e2e8f0' ? '200,200,200' : auraColor === '#4ade80' ? '74,222,128' : auraColor === '#facc15' ? '250,204,21' : auraColor === '#fb923c' ? '251,146,60' : auraColor === '#f87171' ? '248,113,113' : '96,165,250'},0.07)`,
              border: `2px solid ${auraColor}40`,
              borderRadius: '20px', padding: '30px 20px',
              boxShadow: `inset 0 0 40px ${auraColor}08`,
            }}>
              <div style={{ fontSize: '44px', display: 'flex', marginBottom: '12px' }}>🔥</div>
              <div style={{ fontSize: '64px', fontWeight: 900, color: auraColor, display: 'flex', lineHeight: 1 }}>
                {fmtNum(aura)}
              </div>
              <div style={{ fontSize: '17px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '3px', display: 'flex', marginTop: '12px' }}>
                AURA · {auraLabel}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.25)', display: 'flex', letterSpacing: '2px' }}>
              Collect cards · Battle · Earn $VBMS
            </div>
            <div style={{ fontSize: '18px', color: 'rgba(255,215,0,0.4)', display: 'flex', fontWeight: 700, letterSpacing: '1px' }}>
              vibemostwanted.xyz
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
