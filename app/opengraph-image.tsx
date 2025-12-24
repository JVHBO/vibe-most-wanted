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

  // Nothing pack in center
  const packImage = fetch(`${baseUrl}/pack-cover.png`).then(res => res.arrayBuffer());

  // VMW cards - all rarities
  const cardMythic = fetch(`${baseUrl}/images/raid-bosses/vibe/mythic.png`).then(res => res.arrayBuffer());
  const cardLegendary = fetch(`${baseUrl}/images/raid-bosses/vibe/legendary.png`).then(res => res.arrayBuffer());
  const cardEpic = fetch(`${baseUrl}/images/raid-bosses/vibe/epic.png`).then(res => res.arrayBuffer());
  const cardRare = fetch(`${baseUrl}/images/raid-bosses/vibe/rare.png`).then(res => res.arrayBuffer());
  const cardCommon = fetch(`${baseUrl}/images/raid-bosses/vibe/common.png`).then(res => res.arrayBuffer());

  // Custom cards
  const card1 = fetch(`${baseUrl}/images/og-cards/card1.png`).then(res => res.arrayBuffer());
  const card2 = fetch(`${baseUrl}/images/og-cards/card2.png`).then(res => res.arrayBuffer());

  const [pack, mythic, legendary, epic, rare, common, custom1, custom2] = await Promise.all([
    packImage, cardMythic, cardLegendary, cardEpic, cardRare, cardCommon, card1, card2
  ]);

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
        {/* Background Cards - 7 cards + pack in center */}
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
          {/* Far left - Common */}
          <img
            src={`data:image/png;base64,${Buffer.from(common).toString('base64')}`}
            style={{
              position: 'absolute',
              left: -40,
              top: '50%',
              transform: 'translateY(-50%) rotate(-22deg)',
              width: 180,
              height: 260,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          {/* Left 2 - Rare */}
          <img
            src={`data:image/png;base64,${Buffer.from(rare).toString('base64')}`}
            style={{
              position: 'absolute',
              left: 100,
              top: '50%',
              transform: 'translateY(-50%) rotate(-14deg)',
              width: 200,
              height: 285,
              objectFit: 'cover',
              zIndex: 2,
            }}
          />
          {/* Left 3 - Epic */}
          <img
            src={`data:image/png;base64,${Buffer.from(epic).toString('base64')}`}
            style={{
              position: 'absolute',
              left: 220,
              top: '50%',
              transform: 'translateY(-50%) rotate(-7deg)',
              width: 210,
              height: 300,
              objectFit: 'cover',
              zIndex: 3,
            }}
          />
          {/* Center - Nothing Pack */}
          <img
            src={`data:image/png;base64,${Buffer.from(pack).toString('base64')}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 220,
              height: 220,
              objectFit: 'contain',
              zIndex: 5,
            }}
          />
          {/* Right 3 - Legendary */}
          <img
            src={`data:image/png;base64,${Buffer.from(legendary).toString('base64')}`}
            style={{
              position: 'absolute',
              right: 220,
              top: '50%',
              transform: 'translateY(-50%) rotate(7deg)',
              width: 210,
              height: 300,
              objectFit: 'cover',
              zIndex: 3,
            }}
          />
          {/* Right 2 - Mythic */}
          <img
            src={`data:image/png;base64,${Buffer.from(mythic).toString('base64')}`}
            style={{
              position: 'absolute',
              right: 100,
              top: '50%',
              transform: 'translateY(-50%) rotate(14deg)',
              width: 200,
              height: 285,
              objectFit: 'cover',
              zIndex: 2,
            }}
          />
          {/* Far right - Custom 1 */}
          <img
            src={`data:image/png;base64,${Buffer.from(custom1).toString('base64')}`}
            style={{
              position: 'absolute',
              right: -40,
              top: '50%',
              transform: 'translateY(-50%) rotate(22deg)',
              width: 180,
              height: 260,
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
