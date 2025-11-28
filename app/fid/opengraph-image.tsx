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
          background: '#000000',
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
            opacity: 0.3,
            display: 'flex',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: 40,
              fontSize: 150,
              color: '#FFD700',
              opacity: 0.15,
            }}
          >
            ♠
          </div>
          <div
            style={{
              position: 'absolute',
              top: 40,
              right: 40,
              fontSize: 150,
              color: '#FF4444',
              opacity: 0.15,
            }}
          >
            ♥
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: 40,
              fontSize: 150,
              color: '#FF4444',
              opacity: 0.15,
            }}
          >
            ♦
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              right: 40,
              fontSize: 150,
              color: '#FFD700',
              opacity: 0.15,
            }}
          >
            ♣
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          {/* VibeFID Title */}
          <div
            style={{
              fontSize: 120,
              fontWeight: 900,
              color: '#FFD700',
              letterSpacing: '-0.02em',
              marginBottom: 30,
            }}
          >
            VibeFID
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 32,
              color: '#CCCCCC',
              textAlign: 'center',
              marginBottom: 50,
              maxWidth: 800,
            }}
          >
            Mint Playable Cards from Farcaster Profiles
          </div>

          {/* Features */}
          <div
            style={{
              display: 'flex',
              gap: 30,
              marginBottom: 40,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 30px',
                background: 'rgba(255, 215, 0, 0.1)',
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 10,
                }}
              >
                🎴
              </div>
              <div
                style={{
                  fontSize: 22,
                  color: '#FFFFFF',
                  fontWeight: 600,
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
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 10,
                }}
              >
                ⚡
              </div>
              <div
                style={{
                  fontSize: 22,
                  color: '#FFFFFF',
                  fontWeight: 600,
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
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  marginBottom: 10,
                }}
              >
                🔗
              </div>
              <div
                style={{
                  fontSize: 22,
                  color: '#FFFFFF',
                  fontWeight: 600,
                }}
              >
                On-Chain NFT
              </div>
            </div>
          </div>

          {/* Mint Price */}
          <div
            style={{
              fontSize: 28,
              color: '#999999',
              display: 'flex',
            }}
          >
            Mint Price: <span style={{ color: '#FFD700', marginLeft: 10, fontWeight: 700 }}>0.0003 ETH</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            color: '#666666',
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
