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
  const cardImage1 = fetch(`${baseUrl}/images/raid-bosses/vibe/rare.png`).then(res => res.arrayBuffer());
  const cardImage2 = fetch(`${baseUrl}/images/raid-bosses/vibe/legendary.png`).then(res => res.arrayBuffer());
  const cardImage3 = fetch(`${baseUrl}/images/raid-bosses/vibe/epic.png`).then(res => res.arrayBuffer());

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
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
          position: 'relative',
        }}
      >
        {/* Background Cards */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.35,
          }}
        >
          <img
            src={`data:image/png;base64,${Buffer.from(card1).toString('base64')}`}
            style={{
              position: 'absolute',
              left: -50,
              top: '50%',
              transform: 'translateY(-50%) rotate(-12deg)',
              width: 320,
              height: 450,
              objectFit: 'cover',
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(card2).toString('base64')}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 300,
              height: 420,
              objectFit: 'cover',
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(card3).toString('base64')}`}
            style={{
              position: 'absolute',
              right: -50,
              top: '50%',
              transform: 'translateY(-50%) rotate(12deg)',
              width: 320,
              height: 450,
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
            background: 'rgba(0, 0, 0, 0.6)',
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
            zIndex: 1,
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
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
