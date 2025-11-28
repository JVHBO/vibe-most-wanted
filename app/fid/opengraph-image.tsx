import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VibeFID - Mint Playable Cards from Farcaster Profiles';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  // Fetch card images for background
  const cardImage1 = fetch(new URL('../../public/images/cards/1866.png', import.meta.url)).then(res => res.arrayBuffer());
  const cardImage2 = fetch(new URL('../../public/images/cards/2486.png', import.meta.url)).then(res => res.arrayBuffer());
  const cardImage3 = fetch(new URL('../../public/images/cards/2761.png', import.meta.url)).then(res => res.arrayBuffer());

  const [card1, card2, card3] = await Promise.all([cardImage1, cardImage2, cardImage3]);

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
        {/* Background Cards with Dark Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.15,
          }}
        >
          {/* Card 1 - Left */}
          <img
            src={`data:image/png;base64,${Buffer.from(card1).toString('base64')}`}
            style={{
              position: 'absolute',
              left: -50,
              top: '50%',
              transform: 'translateY(-50%) rotate(-15deg)',
              width: 300,
              height: 420,
              objectFit: 'cover',
            }}
          />

          {/* Card 2 - Center */}
          <img
            src={`data:image/png;base64,${Buffer.from(card2).toString('base64')}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%) rotate(5deg)',
              width: 280,
              height: 400,
              objectFit: 'cover',
            }}
          />

          {/* Card 3 - Right */}
          <img
            src={`data:image/png;base64,${Buffer.from(card3).toString('base64')}`}
            style={{
              position: 'absolute',
              right: -50,
              top: '50%',
              transform: 'translateY(-50%) rotate(12deg)',
              width: 300,
              height: 420,
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Dark Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
          }}
        />

        {/* Card Symbols Decoration */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            fontSize: 120,
            color: '#FFD700',
            opacity: 0.2,
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
            color: '#FF4444',
            opacity: 0.2,
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
            color: '#FF4444',
            opacity: 0.2,
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
            color: '#FFD700',
            opacity: 0.2,
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
                background: 'rgba(255, 215, 0, 0.15)',
                borderRadius: 16,
                border: '2px solid rgba(255, 215, 0, 0.3)',
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
                background: 'rgba(255, 215, 0, 0.15)',
                borderRadius: 16,
                border: '2px solid rgba(255, 215, 0, 0.3)',
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
                background: 'rgba(255, 215, 0, 0.15)',
                borderRadius: 16,
                border: '2px solid rgba(255, 215, 0, 0.3)',
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
            color: '#888888',
            zIndex: 1,
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
