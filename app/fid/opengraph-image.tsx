import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VibeFID - Mint Playable Cards from Farcaster Profiles';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
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
          background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
          position: 'relative',
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 50px,
              rgba(255, 215, 0, 0.03) 50px,
              rgba(255, 215, 0, 0.03) 100px
            )`,
          }}
        />

        {/* Card Symbols Background */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            fontSize: 120,
            opacity: 0.1,
            color: '#FFD700',
            display: 'flex',
          }}
        >
          ♠
        </div>
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 40,
            fontSize: 120,
            opacity: 0.1,
            color: '#FF4444',
            display: 'flex',
          }}
        >
          ♥
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 40,
            fontSize: 120,
            opacity: 0.1,
            color: '#FF4444',
            display: 'flex',
          }}
        >
          ♦
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 40,
            fontSize: 120,
            opacity: 0.1,
            color: '#FFD700',
            display: 'flex',
          }}
        >
          ♣
        </div>

        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            zIndex: 1,
          }}
        >
          {/* VibeFID Title */}
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-0.05em',
              textAlign: 'center',
              marginBottom: 20,
              display: 'flex',
              textShadow: '0 0 60px rgba(255, 215, 0, 0.5)',
            }}
          >
            VibeFID
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 36,
              color: '#E8E8E8',
              textAlign: 'center',
              marginBottom: 40,
              maxWidth: 900,
              lineHeight: 1.4,
              display: 'flex',
            }}
          >
            Mint Playable Cards from Farcaster Profiles
          </div>

          {/* Features */}
          <div
            style={{
              display: 'flex',
              gap: 40,
              marginTop: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 30px',
                background: 'rgba(255, 215, 0, 0.1)',
                borderRadius: 12,
                border: '2px solid rgba(255, 215, 0, 0.3)',
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  color: '#FFD700',
                  marginBottom: 8,
                  display: 'flex',
                }}
              >
                🎴
              </div>
              <div
                style={{
                  fontSize: 24,
                  color: '#E8E8E8',
                  fontWeight: 600,
                  display: 'flex',
                }}
              >
                Unique Traits
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 30px',
                background: 'rgba(255, 215, 0, 0.1)',
                borderRadius: 12,
                border: '2px solid rgba(255, 215, 0, 0.3)',
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  color: '#FFD700',
                  marginBottom: 8,
                  display: 'flex',
                }}
              >
                ⚡
              </div>
              <div
                style={{
                  fontSize: 24,
                  color: '#E8E8E8',
                  fontWeight: 600,
                  display: 'flex',
                }}
              >
                Power Based
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 30px',
                background: 'rgba(255, 215, 0, 0.1)',
                borderRadius: 12,
                border: '2px solid rgba(255, 215, 0, 0.3)',
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  color: '#FFD700',
                  marginBottom: 8,
                  display: 'flex',
                }}
              >
                🔗
              </div>
              <div
                style={{
                  fontSize: 24,
                  color: '#E8E8E8',
                  fontWeight: 600,
                  display: 'flex',
                }}
              >
                On-Chain NFT
              </div>
            </div>
          </div>

          {/* Mint Price */}
          <div
            style={{
              marginTop: 40,
              fontSize: 28,
              color: '#A0A0A0',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ display: 'flex' }}>Mint Price:</span>
            <span
              style={{
                color: '#FFD700',
                fontWeight: 700,
                display: 'flex',
              }}
            >
              0.0003 ETH
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            fontSize: 22,
            color: '#808080',
          }}
        >
          vibemostwanted.xyz/fid
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
