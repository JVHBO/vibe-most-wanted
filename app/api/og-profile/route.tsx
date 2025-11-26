import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// SECURITY: Whitelist of allowed domains for PFP URLs to prevent SSRF
const ALLOWED_PFP_DOMAINS = [
  'pbs.twimg.com',
  'abs.twimg.com',
  'imagedelivery.net',
  'i.imgur.com',
  'res.cloudinary.com',
  'lh3.googleusercontent.com',
  'i.seadn.io',
  'openseauserdata.com',
  'warpcast.com',
  'far.quest',
];

function isAllowedPfpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    // Block private/internal IPs
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.endsWith('.local') ||
      hostname === '0.0.0.0'
    ) {
      return false;
    }
    return ALLOWED_PFP_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get profile data from query params
    const username = searchParams.get('username') || 'Anonymous';
    const twitter = searchParams.get('twitter') || '';
    const totalPower = searchParams.get('totalPower') || '0';
    const wins = parseInt(searchParams.get('wins') || '0');
    const losses = parseInt(searchParams.get('losses') || '0');
    const ties = parseInt(searchParams.get('ties') || '0');
    const nftCount = searchParams.get('nftCount') || '0';
    const ranking = searchParams.get('ranking') || '?';
    const winStreak = searchParams.get('winStreak') || '0';
    const coins = searchParams.get('coins') || '0';
    const pfpUrl = searchParams.get('pfp') || '';

    // Calculate win rate
    const totalMatches = wins + losses + ties;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    // Format ranking with medal emoji
    const getRankingDisplay = (rank: string) => {
      if (rank === '1') return '🥇 #1';
      if (rank === '2') return '🥈 #2';
      if (rank === '3') return '🥉 #3';
      return `#${rank}`;
    };

    // Get initials for fallback avatar
    const getInitials = (name: string) => {
      return name.substring(0, 2).toUpperCase();
    };

    // Try to fetch PFP if provided (with timeout and SSRF protection)
    let pfpBase64 = '';
    if (pfpUrl && isAllowedPfpUrl(pfpUrl)) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000); // 2 second timeout

        const pfpResponse = await fetch(pfpUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (pfpResponse.ok) {
          const pfpBuffer = await pfpResponse.arrayBuffer();
          pfpBase64 = `data:image/jpeg;base64,${Buffer.from(pfpBuffer).toString('base64')}`;
        }
      } catch (e) {
        console.log('Failed to fetch PFP (timeout or error):', e);
      }
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0f0a00 0%, #1a1410 30%, #2d2010 50%, #1a1410 70%, #0f0a00 100%)',
            padding: '40px 60px',
            position: 'relative',
          }}
        >
          {/* Layered background effects */}
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at 20% 20%, rgba(255, 215, 0, 0.15) 0%, transparent 45%)',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at 80% 80%, rgba(212, 175, 55, 0.12) 0%, transparent 45%)',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(ellipse at center, rgba(255, 215, 0, 0.06) 0%, transparent 60%)',
              display: 'flex',
            }}
          />

          {/* Top Section - PFP + Username */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              zIndex: 1,
            }}
          >
            {/* Profile Picture */}
            {pfpBase64 ? (
              <img
                src={pfpBase64}
                alt={username}
                width={140}
                height={140}
                style={{
                  borderRadius: '50%',
                  border: '5px solid #FFD700',
                  boxShadow: '0 0 40px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.4)',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  border: '5px solid #FFD700',
                  boxShadow: '0 0 40px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.4), inset 0 0 20px rgba(255, 215, 0, 0.2)',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '56px',
                  fontWeight: 900,
                  color: '#1a0a00',
                }}
              >
                {getInitials(username)}
              </div>
            )}

            {/* Username & Twitter */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 900,
                  color: '#FFD700',
                  letterSpacing: '2px',
                  textShadow: '0 0 30px rgba(255, 215, 0, 0.8), 0 4px 15px rgba(0, 0, 0, 0.8)',
                }}
              >
                {username}
              </div>
              {twitter && (
                <div
                  style={{
                    fontSize: '26px',
                    color: '#D4AF37',
                    fontWeight: 700,
                    letterSpacing: '1px',
                  }}
                >
                  {twitter}
                </div>
              )}
            </div>
          </div>

          {/* Middle Section - Total Power + Stats */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '30px',
              zIndex: 1,
            }}
          >
            {/* Total Power - Hero stat */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '4px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '25px',
                padding: '30px 80px',
                boxShadow: '0 0 40px rgba(59, 130, 246, 0.3), inset 0 0 30px rgba(59, 130, 246, 0.1)',
              }}
            >
              <div
                style={{
                  fontSize: '22px',
                  color: '#93C5FD',
                  fontWeight: 800,
                  letterSpacing: '4px',
                }}
              >
                TOTAL POWER
              </div>
              <div
                style={{
                  fontSize: '100px',
                  fontWeight: 900,
                  color: '#3B82F6',
                  textShadow: '0 0 35px rgba(59, 130, 246, 1), 0 4px 20px rgba(0, 0, 0, 0.9)',
                  letterSpacing: '-2px',
                }}
              >
                {totalPower}
              </div>
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: 'flex',
                gap: '35px',
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {/* Win Rate */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '3px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '15px',
                  padding: '20px 30px',
                  minWidth: '140px',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    color: '#6EE7B7',
                    fontWeight: 800,
                    letterSpacing: '2px',
                  }}
                >
                  WIN RATE
                </div>
                <div
                  style={{
                    fontSize: '44px',
                    fontWeight: 900,
                    color: '#10B981',
                    textShadow: '0 0 20px rgba(16, 185, 129, 0.8)',
                  }}
                >
                  {winRate}%
                </div>
              </div>

              {/* Record */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '3px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '15px',
                  padding: '20px 30px',
                  minWidth: '160px',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    color: '#D1D5DB',
                    fontWeight: 800,
                    letterSpacing: '2px',
                  }}
                >
                  RECORD
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    textShadow: '0 0 20px rgba(255, 255, 255, 0.6)',
                  }}
                >
                  {wins}W-{losses}L
                </div>
              </div>

              {/* NFTs */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '3px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '15px',
                  padding: '20px 30px',
                  minWidth: '120px',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    color: '#C4B5FD',
                    fontWeight: 800,
                    letterSpacing: '2px',
                  }}
                >
                  NFTs
                </div>
                <div
                  style={{
                    fontSize: '44px',
                    fontWeight: 900,
                    color: '#A855F7',
                    textShadow: '0 0 20px rgba(168, 85, 247, 0.8)',
                  }}
                >
                  {nftCount}
                </div>
              </div>
            </div>

            {/* Secondary Stats */}
            <div
              style={{
                display: 'flex',
                gap: '40px',
              }}
            >
              {parseInt(winStreak) > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '2px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '15px',
                    padding: '10px 20px',
                  }}
                >
                  <div style={{ fontSize: '24px' }}>🔥</div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#F59E0B',
                    }}
                  >
                    {winStreak} Win Streak
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(251, 191, 36, 0.2)',
                  border: '2px solid rgba(251, 191, 36, 0.4)',
                  borderRadius: '15px',
                  padding: '10px 20px',
                }}
              >
                <div style={{ fontSize: '24px' }}>💰</div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#FBBF24',
                  }}
                >
                  {coins} $TESTVBMS
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section - Branding */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              zIndex: 1,
            }}
          >
            <div
              style={{
                fontSize: '42px',
                fontWeight: 900,
                color: '#FFD700',
                letterSpacing: '4px',
                textShadow: '0 0 25px rgba(255, 215, 0, 0.8), 0 4px 15px rgba(0, 0, 0, 0.8)',
                display: 'flex',
              }}
            >
              VIBE MOST WANTED
            </div>
            <div
              style={{
                fontSize: '18px',
                color: '#D4AF37',
                fontWeight: 600,
                letterSpacing: '1px',
                display: 'flex',
              }}
            >
              vibemostwanted.xyz
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate',
          'Content-Type': 'image/png',
        },
      }
    );
  } catch (e: any) {
    console.log(`Error generating profile OG image: ${e.message}`);
    return new Response(`Failed to generate profile image`, {
      status: 500,
    });
  }
}
