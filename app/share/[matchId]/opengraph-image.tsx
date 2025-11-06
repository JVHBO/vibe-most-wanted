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
          background: 'white',
          borderRadius: '20px',
          border: '4px solid #000',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          position: 'relative',
        }}
      >
        {/* Top left suit symbol */}
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
          <div style={{ fontSize: '32px', fontWeight: 900 }}>
            {isPlayer ? 'YOU' : 'OPP'}
          </div>
          <div style={{ fontSize: '36px' }}>♠️</div>
        </div>

        {/* Center - Avatar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: '15px',
          }}
        >
          {/* Avatar circle with initials */}
          <div
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '15px',
              border: '4px solid #000',
              background: isPlayer
                ? 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)'
                : 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '72px',
              fontWeight: 900,
              color: 'white',
            }}
          >
            {getInitials(username)}
          </div>

          {/* Username */}
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#000',
              textAlign: 'center',
              maxWidth: '280px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {username}
          </div>

          {/* Power */}
          <div
            style={{
              fontSize: '36px',
              fontWeight: 900,
              color: isPlayer ? '#3B82F6' : '#EF4444',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            💪 {power}
          </div>
        </div>

        {/* Bottom right suit symbol (upside down) */}
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
          <div style={{ fontSize: '32px', fontWeight: 900 }}>
            {isPlayer ? 'YOU' : 'OPP'}
          </div>
          <div style={{ fontSize: '36px' }}>♠️</div>
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
            background: isWin
              ? 'linear-gradient(135deg, #065f46 0%, #047857 50%, #065f46 100%)'
              : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)',
            position: 'relative',
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.05) 35px, rgba(255,255,255,.05) 70px)',
              display: 'flex',
            }}
          />

          {/* Result badge at top */}
          <div
            style={{
              position: 'absolute',
              top: '30px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                fontSize: '56px',
                fontWeight: 900,
                color: '#FFD700',
                textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
                letterSpacing: '4px',
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
