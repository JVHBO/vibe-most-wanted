import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Battle Result - VIBE Most Wanted';
export const size = {
  width: 1200,
  height: 800,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  // Decode match data from matchId (format: result_playerPower_opponentPower_opponentName_type)
  try {
    const parts = decodeURIComponent(matchId).split('_');
    const result = parts[0] || 'win';
    const playerPower = parts[1] || '0';
    const opponentPower = parts[2] || '0';
    const opponentName = parts[3] || 'Opponent';
    const type = parts[4] || 'pve';

    const isWin = result === 'win';
    const isTie = result === 'tie';

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
      subtitle = 'vs Mecha George Floyd';
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
            background: isWin
              ? 'linear-gradient(135deg, #1a1a0a 0%, #2d2410 30%, #1a1a0a 100%)'
              : isTie
              ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 30%, #1a1a1a 100%)'
              : 'linear-gradient(135deg, #1a0a0a 0%, #2d1010 30%, #1a0a0a 100%)',
            position: 'relative',
          }}
        >
          {/* Animated background effects */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: isWin
                ? 'radial-gradient(circle at 20% 30%, rgba(255, 215, 0, 0.15) 0%, transparent 50%)'
                : isTie
                ? 'radial-gradient(circle at 20% 30%, rgba(192, 192, 192, 0.15) 0%, transparent 50%)'
                : 'radial-gradient(circle at 20% 30%, rgba(220, 38, 38, 0.15) 0%, transparent 50%)',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '100%',
              height: '100%',
              background: isWin
                ? 'radial-gradient(circle at 80% 70%, rgba(212, 175, 55, 0.12) 0%, transparent 50%)'
                : isTie
                ? 'radial-gradient(circle at 80% 70%, rgba(150, 150, 150, 0.12) 0%, transparent 50%)'
                : 'radial-gradient(circle at 80% 70%, rgba(180, 30, 30, 0.12) 0%, transparent 50%)',
              display: 'flex',
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '35px',
              zIndex: 1,
              width: '100%',
              padding: '0 60px 80px 60px',
            }}
          >
            {/* Title with border */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '15px',
                background: isWin
                  ? 'rgba(255, 215, 0, 0.08)'
                  : isTie
                  ? 'rgba(192, 192, 192, 0.08)'
                  : 'rgba(220, 38, 38, 0.08)',
                border: isWin
                  ? '4px solid rgba(255, 215, 0, 0.3)'
                  : isTie
                  ? '4px solid rgba(192, 192, 192, 0.3)'
                  : '4px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '20px',
                padding: '30px 60px',
              }}
            >
              <div
                style={{
                  fontSize: '80px',
                  fontWeight: 900,
                  color: isWin ? '#FFD700' : isTie ? '#C0C0C0' : '#DC2626',
                  textShadow: isWin
                    ? '0 0 30px rgba(255, 215, 0, 1), 0 4px 20px rgba(0, 0, 0, 0.8)'
                    : isTie
                    ? '0 0 30px rgba(192, 192, 192, 1), 0 4px 20px rgba(0, 0, 0, 0.8)'
                    : '0 0 30px rgba(220, 38, 38, 1), 0 4px 20px rgba(0, 0, 0, 0.8)',
                  letterSpacing: '4px',
                  display: 'flex',
                }}
              >
                {title}
              </div>

              {/* Subtitle */}
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#D4AF37',
                  display: 'flex',
                  letterSpacing: '1px',
                }}
              >
                {subtitle}
              </div>
            </div>

            {/* Power comparison */}
            <div
              style={{
                display: 'flex',
                gap: '40px',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {/* Your Power */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '3px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '15px',
                  padding: '25px 40px',
                  minWidth: '220px',
                }}
              >
                <div
                  style={{
                    fontSize: '18px',
                    color: '#93C5FD',
                    fontWeight: 700,
                    display: 'flex',
                    letterSpacing: '2px',
                  }}
                >
                  YOUR POWER
                </div>
                <div
                  style={{
                    fontSize: '64px',
                    fontWeight: 900,
                    color: '#3B82F6',
                    textShadow: '0 0 25px rgba(59, 130, 246, 1), 0 4px 15px rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                  }}
                >
                  {playerPower}
                </div>
              </div>

              {/* VS */}
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#D4AF37',
                  display: 'flex',
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.8)',
                  letterSpacing: '3px',
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
                  gap: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '3px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '15px',
                  padding: '25px 40px',
                  minWidth: '220px',
                }}
              >
                <div
                  style={{
                    fontSize: '18px',
                    color: '#FCA5A5',
                    fontWeight: 700,
                    display: 'flex',
                    letterSpacing: '2px',
                    textAlign: 'center',
                  }}
                >
                  {opponentName.toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: '64px',
                    fontWeight: 900,
                    color: '#EF4444',
                    textShadow: '0 0 25px rgba(239, 68, 68, 1), 0 4px 15px rgba(0, 0, 0, 0.8)',
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
        ...size,
        headers: {
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        },
      }
    );
  } catch (e) {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
          }}
        >
          <div style={{ fontSize: '60px', color: '#FFD700' }}>
            VIBE MOST WANTED
          </div>
        </div>
      ),
      {
        ...size,
        headers: {
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        },
      }
    );
  }
}
