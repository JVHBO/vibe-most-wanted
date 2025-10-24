import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get battle data from query params
    const result = searchParams.get('result') || 'win'; // win, loss, tie
    const playerPower = searchParams.get('playerPower') || '0';
    const opponentPower = searchParams.get('opponentPower') || '0';
    const opponentName = searchParams.get('opponentName') || 'Opponent';
    const type = searchParams.get('type') || 'pve'; // pve, pvp, attack, defense

    const isWin = result === 'win';
    const isTie = result === 'tie';

    // Determine title based on type and result
    let title = '';
    let subtitle = '';

    if (type === 'attack') {
      title = isWin ? '⚔️ ATTACK VICTORY!' : isTie ? '⚔️ ATTACK TIE!' : '⚔️ ATTACK DEFEAT!';
      subtitle = `vs ${opponentName}'s Defense`;
    } else if (type === 'defense') {
      title = isWin ? '🛡️ DEFENSE VICTORY!' : isTie ? '🛡️ DEFENSE TIE!' : '🛡️ DEFENSE DEFEAT!';
      subtitle = `Defended against ${opponentName}`;
    } else if (type === 'pvp') {
      title = isWin ? '👑 PVP VICTORY!' : isTie ? '👑 PVP TIE!' : '👑 PVP DEFEAT!';
      subtitle = `vs ${opponentName}`;
    } else {
      title = isWin ? '🎮 VICTORY!' : isTie ? '🎮 TIE!' : '🎮 DEFEAT!';
      subtitle = 'vs JC';
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
              width: '600px',
              height: '600px',
              background: isWin
                ? 'radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)'
                : isTie
                ? 'radial-gradient(circle, rgba(192, 192, 192, 0.3) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(220, 38, 38, 0.3) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '25px',
              zIndex: 1,
              paddingBottom: '100px',
            }}
          >
            {/* Title */}
            <div
              style={{
                fontSize: '68px',
                fontWeight: 900,
                color: isWin ? '#FFD700' : isTie ? '#C0C0C0' : '#DC2626',
                textShadow: isWin
                  ? '0 0 40px rgba(255, 215, 0, 0.8), 0 0 80px rgba(255, 215, 0, 0.4)'
                  : isTie
                  ? '0 0 40px rgba(192, 192, 192, 0.8), 0 0 80px rgba(192, 192, 192, 0.4)'
                  : '0 0 40px rgba(220, 38, 38, 0.8), 0 0 80px rgba(220, 38, 38, 0.4)',
                letterSpacing: '3px',
                display: 'flex',
              }}
            >
              {title}
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: '30px',
                fontWeight: 600,
                color: '#D4AF37',
                display: 'flex',
              }}
            >
              {subtitle}
            </div>

            {/* Power comparison */}
            <div
              style={{
                display: 'flex',
                gap: '50px',
                alignItems: 'center',
                marginTop: '10px',
              }}
            >
              {/* Your Power */}
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
                    fontSize: '20px',
                    color: '#9CA3AF',
                    fontWeight: 600,
                    display: 'flex',
                  }}
                >
                  YOUR POWER
                </div>
                <div
                  style={{
                    fontSize: '52px',
                    fontWeight: 900,
                    color: '#3B82F6',
                    textShadow: '0 0 20px rgba(59, 130, 246, 0.6)',
                    display: 'flex',
                  }}
                >
                  {playerPower}
                </div>
              </div>

              {/* VS */}
              <div
                style={{
                  fontSize: '40px',
                  fontWeight: 700,
                  color: '#6B7280',
                  display: 'flex',
                }}
              >
                VS
              </div>

              {/* Opponent Power */}
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
                    fontSize: '20px',
                    color: '#9CA3AF',
                    fontWeight: 600,
                    display: 'flex',
                  }}
                >
                  OPPONENT
                </div>
                <div
                  style={{
                    fontSize: '52px',
                    fontWeight: 900,
                    color: '#EF4444',
                    textShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
                    display: 'flex',
                  }}
                >
                  {opponentPower}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                position: 'absolute',
                bottom: '40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
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
                  fontSize: '18px',
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
    console.log(`Error generating OG image: ${e.message}`);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
