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
    const pfp = searchParams.get('pfp') || '';

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

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a0f00 0%, #2d1810 25%, #1a0a00 50%, #2d1810 75%, #1a0f00 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Animated gradient overlays */}
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle at 30% 30%, rgba(255, 215, 0, 0.15) 0%, transparent 50%)',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle at 70% 70%, rgba(212, 175, 55, 0.12) 0%, transparent 50%)',
              display: 'flex',
            }}
          />

          {/* Vintage card texture overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(255, 215, 0, 0.03) 0px, transparent 2px, transparent 4px, rgba(255, 215, 0, 0.03) 6px)',
              display: 'flex',
            }}
          />

          {/* Main content container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '100%',
              width: '100%',
              zIndex: 1,
              padding: '50px',
            }}
          >
            {/* Top Section - PFP + Username */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
              }}
            >
              {/* Profile Picture */}
              {pfp ? (
                <img
                  src={pfp}
                  alt={username}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    border: '4px solid #FFD700',
                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.3)',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    border: '4px solid #FFD700',
                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.3)',
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
                    textShadow: '0 0 40px rgba(255, 215, 0, 0.8), 0 4px 8px rgba(0, 0, 0, 0.5)',
                    letterSpacing: '1px',
                    display: 'flex',
                  }}
                >
                  {username}
                </div>
                {twitter && (
                  <div
                    style={{
                      fontSize: '20px',
                      color: '#D4AF37',
                      fontWeight: 600,
                      display: 'flex',
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
                gap: '25px',
              }}
            >
              {/* Total Power - Hero stat */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 215, 0, 0.08)',
                  border: '2px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '20px',
                  padding: '20px 60px',
                }}
              >
                <div
                  style={{
                    fontSize: '18px',
                    color: '#D4AF37',
                    fontWeight: 700,
                    letterSpacing: '3px',
                    display: 'flex',
                  }}
                >
                  TOTAL POWER
                </div>
                <div
                  style={{
                    fontSize: '80px',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%)',
                    backgroundClip: 'text',
                    color: 'transparent',
                    textShadow: '0 0 40px rgba(59, 130, 246, 0.6)',
                    display: 'flex',
                  }}
                >
                  {totalPower}
                </div>
              </div>

              {/* Stats Grid */}
              <div
                style={{
                  display: 'flex',
                  gap: '45px',
                }}
              >
                {/* Ranking */}
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
                      fontSize: '13px',
                      color: '#9CA3AF',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      display: 'flex',
                    }}
                  >
                    RANK
                  </div>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 900,
                      color: '#FFD700',
                      display: 'flex',
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
                    gap: '5px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#9CA3AF',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      display: 'flex',
                    }}
                  >
                    WIN RATE
                  </div>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 900,
                      color: '#10B981',
                      display: 'flex',
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
                    gap: '5px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#9CA3AF',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      display: 'flex',
                    }}
                  >
                    RECORD
                  </div>
                  <div
                    style={{
                      fontSize: '26px',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      display: 'flex',
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
                    gap: '5px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#9CA3AF',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      display: 'flex',
                    }}
                  >
                    NFTs
                  </div>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 900,
                      color: '#A855F7',
                      display: 'flex',
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
                  gap: '35px',
                }}
              >
                {parseInt(winStreak) > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '12px',
                      padding: '8px 16px',
                    }}
                  >
                    <div style={{ fontSize: '20px', display: 'flex' }}>🔥</div>
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#F59E0B',
                        display: 'flex',
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
                    gap: '6px',
                    background: 'rgba(251, 191, 36, 0.15)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '12px',
                    padding: '8px 16px',
                  }}
                >
                  <div style={{ fontSize: '20px', display: 'flex' }}>💰</div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#FBBF24',
                      display: 'flex',
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
                fontSize: '32px',
                fontWeight: 900,
                color: '#FFD700',
                letterSpacing: '3px',
                textShadow: '0 0 30px rgba(255, 215, 0, 0.6), 0 4px 8px rgba(0, 0, 0, 0.5)',
              }}
            >
              VIBE MOST WANTED
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`Error generating profile OG image: ${e.message}`);
    return new Response(`Failed to generate profile image`, {
      status: 500,
    });
  }
}
