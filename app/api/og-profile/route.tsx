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
            backgroundColor: '#0a0a0a',
            backgroundImage: 'radial-gradient(circle at 25px 25px, #1a1a1a 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1a1a1a 2%, transparent 0%)',
            backgroundSize: '100px 100px',
            position: 'relative',
          }}
        >
          {/* Background glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '700px',
              height: '700px',
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.25) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '100%',
              width: '100%',
              zIndex: 1,
              padding: '40px',
            }}
          >
            {/* Top Section - Username & Power */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '15px',
              }}
            >
              {/* Username */}
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
                    fontSize: '48px',
                    fontWeight: 900,
                    color: '#FFD700',
                    textShadow: '0 0 40px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.4)',
                    letterSpacing: '2px',
                    display: 'flex',
                  }}
                >
                  {username}
                </div>
                {twitter && (
                  <div
                    style={{
                      fontSize: '20px',
                      color: '#9CA3AF',
                      fontWeight: 500,
                      display: 'flex',
                    }}
                  >
                    {twitter}
                  </div>
                )}
              </div>

              {/* Total Power - Main stat */}
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
                    fontSize: '20px',
                    color: '#D4AF37',
                    fontWeight: 600,
                    letterSpacing: '2px',
                    display: 'flex',
                  }}
                >
                  TOTAL POWER
                </div>
                <div
                  style={{
                    fontSize: '72px',
                    fontWeight: 900,
                    color: '#3B82F6',
                    textShadow: '0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                  }}
                >
                  {totalPower}
                </div>
              </div>
            </div>

            {/* Middle Section - Stats Grid */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '15px',
              }}
            >
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
                    gap: '5px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#9CA3AF',
                      fontWeight: 600,
                      display: 'flex',
                    }}
                  >
                    RANKING
                  </div>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 800,
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
                      fontSize: '14px',
                      color: '#9CA3AF',
                      fontWeight: 600,
                      display: 'flex',
                    }}
                  >
                    WIN RATE
                  </div>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 800,
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
                      fontSize: '14px',
                      color: '#9CA3AF',
                      fontWeight: 600,
                      display: 'flex',
                    }}
                  >
                    RECORD
                  </div>
                  <div
                    style={{
                      fontSize: '26px',
                      fontWeight: 700,
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
                      fontSize: '14px',
                      color: '#9CA3AF',
                      fontWeight: 600,
                      display: 'flex',
                    }}
                  >
                    NFTs
                  </div>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: 800,
                      color: '#A855F7',
                      display: 'flex',
                    }}
                  >
                    {nftCount}
                  </div>
                </div>
              </div>

              {/* Secondary Stats Row */}
              <div
                style={{
                  display: 'flex',
                  gap: '40px',
                }}
              >
                {/* Streak */}
                {parseInt(winStreak) > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '20px',
                        display: 'flex',
                      }}
                    >
                      🔥
                    </div>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#F59E0B',
                        display: 'flex',
                      }}
                    >
                      {winStreak} Win Streak
                    </div>
                  </div>
                )}

                {/* Coins */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '20px',
                      display: 'flex',
                    }}
                  >
                    💰
                  </div>
                  <div
                    style={{
                      fontSize: '22px',
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

            {/* Bottom Section - Footer */}
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
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#FFD700',
                  letterSpacing: '2px',
                  display: 'flex',
                }}
              >
                VIBE MOST WANTED
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: '#9CA3AF',
                  display: 'flex',
                }}
              >
                vibemostwanted.xyz
              </div>
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
