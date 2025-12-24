import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VIBE MOST WANTED - Meme Card Game';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export const revalidate = 604800;

export default async function Image() {
  const baseUrl = 'https://www.vibemostwanted.xyz';
  // Custom cards from og-cards folder
  const cardImage1 = fetch(`${baseUrl}/images/og-cards/card1.png`).then(res => res.arrayBuffer());
  const cardImage2 = fetch(`${baseUrl}/images/og-cards/card2.png`).then(res => res.arrayBuffer());
  // Additional cards from vibe collection
  const cardImage3 = fetch(`${baseUrl}/images/raid-bosses/vibe/legendary.png`).then(res => res.arrayBuffer());
  const cardImage4 = fetch(`${baseUrl}/images/raid-bosses/vibe/epic.png`).then(res => res.arrayBuffer());
  const cardImage5 = fetch(`${baseUrl}/images/raid-bosses/vibe/rare.png`).then(res => res.arrayBuffer());

  const [card1, card2, card3, card4, card5] = await Promise.all([cardImage1, cardImage2, cardImage3, cardImage4, cardImage5]);

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
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
          position: 'relative',
        }}
      >
        {/* Background Cards - 5 cards spread across, solid with proper z-index */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
          }}
        >
          {/* Far left card - back layer */}
          <img
            src={`data:image/png;base64,${Buffer.from(card4).toString('base64')}`}
            style={{
              position: 'absolute',
              left: -60,
              top: '50%',
              transform: 'translateY(-50%) rotate(-18deg)',
              width: 240,
              height: 340,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          {/* Left card */}
          <img
            src={`data:image/png;base64,${Buffer.from(card1).toString('base64')}`}
            style={{
              position: 'absolute',
              left: 120,
              top: '50%',
              transform: 'translateY(-50%) rotate(-8deg)',
              width: 260,
              height: 370,
              objectFit: 'cover',
              zIndex: 2,
            }}
          />
          {/* Center card - front layer */}
          <img
            src={`data:image/png;base64,${Buffer.from(card2).toString('base64')}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 280,
              height: 400,
              objectFit: 'cover',
              zIndex: 3,
            }}
          />
          {/* Right card */}
          <img
            src={`data:image/png;base64,${Buffer.from(card3).toString('base64')}`}
            style={{
              position: 'absolute',
              right: 120,
              top: '50%',
              transform: 'translateY(-50%) rotate(8deg)',
              width: 260,
              height: 370,
              objectFit: 'cover',
              zIndex: 2,
            }}
          />
          {/* Far right card - back layer */}
          <img
            src={`data:image/png;base64,${Buffer.from(card5).toString('base64')}`}
            style={{
              position: 'absolute',
              right: -60,
              top: '50%',
              transform: 'translateY(-50%) rotate(18deg)',
              width: 240,
              height: 340,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
        </div>

        {/* Dark Overlay - lighter to show cards better */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.35)',
            zIndex: 4,
          }}
        />

        {/* Gold corners */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            fontSize: 80,
            color: '#FFD700',
            opacity: 0.15,
          }}
        >
          ♠
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            fontSize: 80,
            color: '#FFD700',
            opacity: 0.15,
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
            zIndex: 10,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 90,
              fontWeight: 900,
              color: '#FFD700',
              letterSpacing: '-2px',
              marginBottom: 20,
              textShadow: '0 4px 30px rgba(212,175,55,0.5)',
            }}
          >
            VIBE MOST WANTED
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 36,
              color: '#FFFFFF',
              opacity: 0.9,
              letterSpacing: '4px',
            }}
          >
            MEME CARD GAME
          </div>

          {/* Play Now Button */}
          <div
            style={{
              marginTop: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
              paddingLeft: 50,
              paddingRight: 50,
              paddingTop: 18,
              paddingBottom: 18,
              borderRadius: 50,
              boxShadow: '0 8px 32px rgba(255, 165, 0, 0.4)',
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#000000',
                letterSpacing: '2px',
              }}
            >
              PLAY NOW
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
