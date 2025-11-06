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

    // Playing card component
    const Card = ({ username, power, isPlayer }: { username: string; power: string; isPlayer: boolean }) => (
      <div
        style={{
          width: '320px',
          height: '450px',
          background: '#F5F5F5',
          borderRadius: '20px',
          border: '5px solid #FFD700',
          boxShadow: '0 10px 40px rgba(255, 215, 0, 0.4), 0 0 0 2px #121212',
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
              border: '5px solid #FFD700',
              background: 'linear-gradient(135deg, #C9A227 0%, #FFD700 50%, #C9A227 100%)',
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
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0d3d2d',
            position: 'relative',
          }}
        >
          {/* Felt texture pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.05) 0%, transparent 60%)',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.03) 2px, rgba(0,0,0,.03) 4px)',
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
            }}
          >
            {/* Player card */}
            <Card username="YOU" power={playerPower} isPlayer={true} />

            {/* VS badge */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#FFD700',
                border: '4px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                fontWeight: 900,
                color: '#000',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.5)',
              }}
            >
              VS
            </div>

            {/* Opponent card */}
            <Card username={opponentName} power={opponentPower} isPlayer={false} />
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
