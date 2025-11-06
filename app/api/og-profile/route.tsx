import { ImageResponse } from 'next/og';

export const runtime = 'edge';

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

    // Fetch and convert PFP to base64 if provided
    let pfpBase64 = '';
    if (pfpUrl) {
      try {
        const pfpResponse = await fetch(pfpUrl);
        if (pfpResponse.ok) {
          const pfpBuffer = await pfpResponse.arrayBuffer();
          pfpBase64 = `data:image/jpeg;base64,${Buffer.from(pfpBuffer).toString('base64')}`;
        }
      } catch (e) {
        console.log('Failed to fetch PFP:', e);
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
            background: 'linear-gradient(135deg, #1a0f00 0%, #2d1810 50%, #1a0f00 100%)',
            padding: '50px',
            position: 'relative',
          }}
        >
          {/* Background glow overlays */}
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at 30% 30%, rgba(255, 215, 0, 0.12) 0%, transparent 60%)',
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
              background: 'radial-gradient(circle at 70% 70%, rgba(212, 175, 55, 0.08) 0%, transparent 60%)',
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
                width={120}
                height={120}
                style={{
                  borderRadius: '50%',
                  border: '4px solid #FFD700',
                  boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: '4px solid #FFD700',
                  boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)',
                  background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
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
                gap: '5px',
              }}
            >
              <div
                style={{
                  fontSize: '52px',
                  fontWeight: 900,
                  color: '#FFD700',
                  letterSpacing: '1px',
                }}
              >
                {username}
              </div>
              {twitter && (
                <div
                  style={{
                    fontSize: '24px',
                    color: '#D4AF37',
                    fontWeight: 600,
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
                gap: '10px',
                background: 'rgba(255, 215, 0, 0.1)',
                border: '3px solid rgba(255, 215, 0, 0.4)',
                borderRadius: '20px',
                padding: '25px 70px',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  color: '#D4AF37',
                  fontWeight: 700,
                  letterSpacing: '3px',
                }}
              >
                TOTAL POWER
              </div>
              <div
                style={{
                  fontSize: '90px',
                  fontWeight: 900,
                  color: '#3B82F6',
                }}
              >
                {totalPower}
              </div>
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: 'flex',
                gap: '50px',
              }}
            >
              {/* Ranking */}
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
                    fontSize: '16px',
                    color: '#9CA3AF',
                    fontWeight: 700,
                    letterSpacing: '1px',
                  }}
                >
                  RANK
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    color: '#FFD700',
                  }}
                >
                  {getRankingDisplay(ranking)}
                </div>
              </div>

              {/* Win Rate */}
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
                    fontSize: '16px',
                    color: '#9CA3AF',
                    fontWeight: 700,
                    letterSpacing: '1px',
                  }}
                >
                  WIN RATE
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    color: '#10B981',
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
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '16px',
                    color: '#9CA3AF',
                    fontWeight: 700,
                    letterSpacing: '1px',
                  }}
                >
                  RECORD
                </div>
                <div
                  style={{
                    fontSize: '30px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                  }}
                >
                  {wins}W-{losses}L-{ties}T
                </div>
              </div>

              {/* NFTs */}
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
                    fontSize: '16px',
                    color: '#9CA3AF',
                    fontWeight: 700,
                    letterSpacing: '1px',
                  }}
                >
                  NFTs
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    color: '#A855F7',
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
              fontSize: '36px',
              fontWeight: 900,
              color: '#FFD700',
              letterSpacing: '3px',
              zIndex: 1,
            }}
          >
            VIBE MOST WANTED
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 800,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
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
