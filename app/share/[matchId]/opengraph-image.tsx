import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Battle Result - VIBE Most Wanted';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

export default async function Image({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  try {
    const parts = decodeURIComponent(matchId).split('_');
    const result = parts[0] || 'win';
    const playerPower = parts[1] || '0';
    const opponentPower = parts[2] || '0';
    const opponentName = parts[3] || 'Opponent';

    const isWin = result === 'win';

    // Determine which card should be red (losing side)
    const playerPowerNum = parseInt(playerPower);
    const opponentPowerNum = parseInt(opponentPower);
    const playerIsLosing = playerPowerNum < opponentPowerNum;

    // Playing card component
    const Card = ({ username, power, isPlayer, isLosing }: { username: string; power: string; isPlayer: boolean; isLosing: boolean }) => (
      <div
        style={{
          width: '320px',
          height: '450px',
          background: '#F5F5F5',
          borderRadius: '20px',
          border: isLosing ? '5px solid #DC2626' : '5px solid #FFD700',
          boxShadow: isLosing
            ? '0 10px 40px rgba(220, 38, 38, 0.4), 0 0 0 2px #121212'
            : '0 10px 40px rgba(255, 215, 0, 0.4), 0 0 0 2px #121212',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          position: 'relative',
        }}
      >
        {/* Top left corner */}
        <div
          style={{
            position: 'absolute',
            top: '15px',
            left: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#121212' }}>
            {isPlayer ? 'YOU' : 'OPP'}
          </div>
          <div style={{ fontSize: '32px' }}>♠</div>
        </div>

        {/* Center - Avatar on top of spade */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: '12px',
          }}
        >
          {/* Large spade background */}
          <div style={{ fontSize: '120px', opacity: 0.15, position: 'absolute' }}>♠</div>

          {/* Avatar circle with initials */}
          <div
            style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              border: isLosing ? '5px solid #DC2626' : '5px solid #FFD700',
              background: isLosing
                ? 'linear-gradient(135deg, #991b1b 0%, #DC2626 50%, #991b1b 100%)'
                : 'linear-gradient(135deg, #C9A227 0%, #FFD700 50%, #C9A227 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '64px',
              fontWeight: 900,
              color: '#121212',
              boxShadow: '0 4px 20px rgba(255, 215, 0, 0.5)',
              zIndex: 1,
            }}
          >
            {getInitials(username)}
          </div>

          {/* Username */}
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#121212',
              textAlign: 'center',
              maxWidth: '280px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              zIndex: 1,
            }}
          >
            {username}
          </div>

          {/* Power */}
          <div
            style={{
              fontSize: '42px',
              fontWeight: 900,
              color: '#FFD700',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 1,
            }}
          >
            {power}
          </div>
        </div>

        {/* Bottom right corner (upside down) */}
        <div
          style={{
            position: 'absolute',
            bottom: '15px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
            transform: 'rotate(180deg)',
          }}
        >
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#121212' }}>
            {isPlayer ? 'YOU' : 'OPP'}
          </div>
          <div style={{ fontSize: '32px' }}>♠</div>
        </div>
      </div>
    );

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #121212 100%)',
            position: 'relative',
          }}
        >
          {/* Subtle glow */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at 50% 40%, rgba(255, 215, 0, 0.08) 0%, transparent 50%)',
              display: 'flex',
            }}
          />

          {/* Result badge at top */}
          <div
            style={{
              position: 'absolute',
              top: '25px',
              display: 'flex',
              background: 'rgba(18, 18, 18, 0.8)',
              padding: '12px 40px',
              borderRadius: '15px',
              border: '3px solid #FFD700',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#FFD700',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
                letterSpacing: '3px',
              }}
            >
              {isWin ? '🏆 VICTORY' : '💀 DEFEAT'}
            </div>
          </div>

          {/* Cards container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '60px',
              zIndex: 1,
              marginTop: '40px',
            }}
          >
            {/* Player card */}
            <Card username="YOU" power={playerPower} isPlayer={true} isLosing={playerIsLosing} />

            {/* VS badge */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#FFD700',
                border: '4px solid #121212',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                fontWeight: 900,
                color: '#121212',
                boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)',
              }}
            >
              VS
            </div>

            {/* Opponent card */}
            <Card username={opponentName} power={opponentPower} isPlayer={false} isLosing={!playerIsLosing} />
          </div>

          {/* Branding at bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: '25px',
              fontSize: '24px',
              fontWeight: 900,
              color: 'rgba(255, 255, 255, 0.9)',
              letterSpacing: '2px',
            }}
          >
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
  } catch (e: any) {
    // Fallback error image
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            color: '#fff',
            fontSize: '40px',
          }}
        >
          Battle Result
        </div>
      ),
      { ...size }
    );
  }
}
