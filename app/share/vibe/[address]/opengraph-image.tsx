import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Vibe Most Wanted Player';
export const size = { width: 1200, height: 630 };
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
  let coins = 0;
  let neynarScore: number | null = null;
  let fid: number | null = null;

  // Fetch VMW profile
  try {
    const profile = await convexQuery(CONVEX_VMW, 'profiles:getProfile', {
      address: address.toLowerCase(),
    });
    if (profile) {
      username = profile.username || username;
      pfpUrl = profile.farcasterPfpUrl || '';
      power = profile.stats?.totalPower || 0;
      aura = profile.stats?.aura || 0;
      coins = profile.coins || 0;
      fid = profile.farcasterFid || (profile.fid ? parseInt(profile.fid) : null);
    }
  } catch (_) {}

  // Fetch neynar score from VibeFID Convex
  if (fid) {
    try {
      const card = await convexQuery(CONVEX_FID, 'farcasterCards:getFarcasterCardByFid', { fid });
      if (card) neynarScore = card.latestNeynarScore ?? card.neynarScore ?? null;
    } catch (_) {}
  }

  const proxyImg = (url: string) => {
    if (!url) return '';
    if (url.startsWith('https://vibemostwanted.xyz/')) return url;
    return `https://vibemostwanted.xyz/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  const bgUrl = proxyImg('https://ipfs.filebase.io/ipfs/QmemgMVC1LN78M2z7QzWGQRFYKvJm7x2N5JJuLoq8JEQxP');
  const pfp = proxyImg(pfpUrl);
  const auraColor = getAuraColor(aura);
  const auraLabel = getAuraLabel(aura);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
        {/* BG */}
        <img src={bgUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(10,8,2,0.92) 100%)', display: 'flex' }} />

        {/* Gold top border */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, #FFD700, #B8860B, #FFD700)', display: 'flex' }} />

        {/* Content */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '50px 60px 40px',
          gap: '0px',
        }}>

          {/* Header row — PFP + name + brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '36px', marginBottom: '40px' }}>
            {pfp ? (
              <img src={pfp} style={{
                width: '140px', height: '140px', borderRadius: '50%',
                border: '5px solid #FFD700',
                boxShadow: '0 0 30px rgba(255,215,0,0.4)',
                objectFit: 'cover', flexShrink: 0,
              }} />
            ) : (
              <div style={{
                width: '140px', height: '140px', borderRadius: '50%',
                border: '5px solid #FFD700',
                background: '#1a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{ fontSize: '60px', display: 'flex' }}>👤</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
              <div style={{ fontSize: '58px', fontWeight: 900, color: '#FFD700', lineHeight: 1, display: 'flex' }}>
                @{username}
              </div>
              <div style={{ fontSize: '24px', color: 'rgba(255,255,255,0.5)', display: 'flex', letterSpacing: '4px', fontWeight: 700 }}>
                VIBE MOST WANTED ⚔️
              </div>
            </div>

            {/* Neynar score badge */}
            {neynarScore !== null && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: 'rgba(255,215,0,0.1)',
                border: '2px solid rgba(255,215,0,0.5)',
                borderRadius: '16px',
                padding: '16px 24px',
                flexShrink: 0,
              }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '2px', display: 'flex', marginBottom: '6px' }}>
                  NEYNAR
                </div>
                <div style={{ fontSize: '42px', fontWeight: 900, color: '#FFD700', display: 'flex' }}>
                  {neynarScore.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Power */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'rgba(18,14,2,0.8)',
              border: '2px solid rgba(255,215,0,0.3)',
              borderRadius: '16px', padding: '24px 16px',
            }}>
              <div style={{ fontSize: '36px', display: 'flex', marginBottom: '8px' }}>⚡</div>
              <div style={{ fontSize: '44px', fontWeight: 900, color: '#FFD700', display: 'flex' }}>{fmtNum(power)}</div>
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '2px', display: 'flex', marginTop: '6px' }}>POWER</div>
            </div>

            {/* Aura */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'rgba(18,14,2,0.8)',
              border: `2px solid ${auraColor}55`,
              borderRadius: '16px', padding: '24px 16px',
            }}>
              <div style={{ fontSize: '36px', display: 'flex', marginBottom: '8px' }}>🔥</div>
              <div style={{ fontSize: '44px', fontWeight: 900, color: auraColor, display: 'flex' }}>{fmtNum(aura)}</div>
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '2px', display: 'flex', marginTop: '6px' }}>
                AURA · {auraLabel}
              </div>
            </div>

            {/* VBMS */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'rgba(18,14,2,0.8)',
              border: '2px solid rgba(255,215,0,0.3)',
              borderRadius: '16px', padding: '24px 16px',
            }}>
              <div style={{ fontSize: '36px', display: 'flex', marginBottom: '8px' }}>💰</div>
              <div style={{ fontSize: '44px', fontWeight: 900, color: '#FFD700', display: 'flex' }}>{fmtNum(coins)}</div>
              <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: '2px', display: 'flex', marginTop: '6px' }}>$VBMS</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.35)', display: 'flex' }}>
              Collect cards • Battle • Earn $VBMS
            </div>
            <div style={{ fontSize: '18px', color: 'rgba(255,215,0,0.5)', fontWeight: 700, display: 'flex' }}>
              vibemostwanted.xyz
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
