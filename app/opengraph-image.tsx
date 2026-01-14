import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '$VBMS - Meme Card Game';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export const revalidate = 604800;

export default async function Image() {
  const baseUrl = 'https://vibemostwanted.xyz';

  // Background image
  const backgroundImg = fetch(`${baseUrl}/images/og-cards/background.jpg`).then(res => res.arrayBuffer());

  // VMW cards - all rarities
  const cardMythic = fetch(`${baseUrl}/images/raid-bosses/vibe/mythic.png`).then(res => res.arrayBuffer());
  const cardLegendary = fetch(`${baseUrl}/images/raid-bosses/vibe/legendary.png`).then(res => res.arrayBuffer());
  const cardEpic = fetch(`${baseUrl}/images/raid-bosses/vibe/epic.png`).then(res => res.arrayBuffer());
  const cardRare = fetch(`${baseUrl}/images/raid-bosses/vibe/rare.png`).then(res => res.arrayBuffer());
  const cardCommon = fetch(`${baseUrl}/images/raid-bosses/vibe/common.png`).then(res => res.arrayBuffer());

  // Custom cards
  const card1 = fetch(`${baseUrl}/images/og-cards/card1.png`).then(res => res.arrayBuffer());
  const card2 = fetch(`${baseUrl}/images/og-cards/card2.png`).then(res => res.arrayBuffer());
  const card3 = fetch(`${baseUrl}/images/og-cards/card3.png`).then(res => res.arrayBuffer());
  const card4 = fetch(`${baseUrl}/images/og-cards/card4.png`).then(res => res.arrayBuffer());
  const card5 = fetch(`${baseUrl}/images/og-cards/card5.png`).then(res => res.arrayBuffer());

  // Extra VMW boss cards from different collections - MYTHICS
  const gmvbrsMythic = fetch(`${baseUrl}/images/raid-bosses/gmvbrs/mythic.png`).then(res => res.arrayBuffer());
  const tarotMythic = fetch(`${baseUrl}/images/raid-bosses/tarot/mythic.png`).then(res => res.arrayBuffer());
  const vibefidMythic = fetch(`${baseUrl}/images/raid-bosses/vibefid/mythic.png`).then(res => res.arrayBuffer());
  const meowverseMythic = fetch(`${baseUrl}/images/raid-bosses/meowverse/mythic.png`).then(res => res.arrayBuffer());
  const poorlyMythic = fetch(`${baseUrl}/images/raid-bosses/poorlydrawnpepes/mythic.png`).then(res => res.arrayBuffer());
  const teampotMythic = fetch(`${baseUrl}/images/raid-bosses/teampothead/mythic.png`).then(res => res.arrayBuffer());
  const vibefxMythic = fetch(`${baseUrl}/images/raid-bosses/vibefx/mythic.png`).then(res => res.arrayBuffer());
  const cumiohMythic = fetch(`${baseUrl}/images/raid-bosses/cumioh/mythic.png`).then(res => res.arrayBuffer());
  const viberotMythic = fetch(`${baseUrl}/images/raid-bosses/viberotbangers/mythic.png`).then(res => res.arrayBuffer());
  const historyMythic = fetch(`${baseUrl}/images/raid-bosses/historyofcomputer/mythic.png`).then(res => res.arrayBuffer());
  // LEGENDARIES
  const gmvbrsLegendary = fetch(`${baseUrl}/images/raid-bosses/gmvbrs/legendary.png`).then(res => res.arrayBuffer());
  const tarotLegendary = fetch(`${baseUrl}/images/raid-bosses/tarot/legendary.png`).then(res => res.arrayBuffer());
  const vibefidLegendary = fetch(`${baseUrl}/images/raid-bosses/vibefid/legendary.png`).then(res => res.arrayBuffer());
  const cumiohLegendary = fetch(`${baseUrl}/images/raid-bosses/cumioh/legendary.png`).then(res => res.arrayBuffer());
  // EPICS
  const gmvbrsEpic = fetch(`${baseUrl}/images/raid-bosses/gmvbrs/epic.png`).then(res => res.arrayBuffer());
  const meowverseEpic = fetch(`${baseUrl}/images/raid-bosses/meowverse/epic.png`).then(res => res.arrayBuffer());
  const tarotEpic = fetch(`${baseUrl}/images/raid-bosses/tarot/epic.png`).then(res => res.arrayBuffer());

  const [
    background,
    mythic, legendary, epic, rare, common,
    custom1, custom2, custom3, custom4, custom5,
    gmvbrsM, tarotM, vibefidM, meowverseM, poorlyM,
    teampotM, vibefxM, cumiohM, viberotM, historyM,
    gmvbrsL, tarotL, vibefidL, cumiohL,
    gmvbrsE, meowverseE, tarotE
  ] = await Promise.all([
    backgroundImg,
    cardMythic, cardLegendary, cardEpic, cardRare, cardCommon,
    card1, card2, card3, card4, card5,
    gmvbrsMythic, tarotMythic, vibefidMythic, meowverseMythic, poorlyMythic,
    teampotMythic, vibefxMythic, cumiohMythic, viberotMythic, historyMythic,
    gmvbrsLegendary, tarotLegendary, vibefidLegendary, cumiohLegendary,
    gmvbrsEpic, meowverseEpic, tarotEpic
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
        {/* Background Image */}
        <img
          src={`data:image/jpeg;base64,${Buffer.from(background).toString('base64')}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        />

        {/* Background Cards - spread across entire background */}
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
          {/* TOP ROW - 6 cards */}
          <img
            src={`data:image/png;base64,${Buffer.from(common).toString('base64')}`}
            style={{
              position: 'absolute',
              left: -30,
              top: -100,
              transform: 'rotate(-18deg)',
              width: 180,
              height: 252,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(custom3).toString('base64')}`}
            style={{
              position: 'absolute',
              left: 150,
              top: -80,
              transform: 'rotate(10deg)',
              width: 170,
              height: 238,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(rare).toString('base64')}`}
            style={{
              position: 'absolute',
              left: 340,
              top: -90,
              transform: 'rotate(-8deg)',
              width: 175,
              height: 245,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(custom4).toString('base64')}`}
            style={{
              position: 'absolute',
              right: 340,
              top: -85,
              transform: 'rotate(12deg)',
              width: 175,
              height: 245,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(epic).toString('base64')}`}
            style={{
              position: 'absolute',
              right: 150,
              top: -75,
              transform: 'rotate(-6deg)',
              width: 170,
              height: 238,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(gmvbrsM).toString('base64')}`}
            style={{
              position: 'absolute',
              right: -30,
              top: -100,
              transform: 'rotate(15deg)',
              width: 180,
              height: 252,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />

          {/* MIDDLE LEFT - 4 cards */}
          <img
            src={`data:image/png;base64,${Buffer.from(legendary).toString('base64')}`}
            style={{
              position: 'absolute',
              left: -80,
              top: '20%',
              transform: 'rotate(-22deg)',
              width: 200,
              height: 280,
              objectFit: 'cover',
              zIndex: 2,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(cumiohM).toString('base64')}`}
            style={{
              position: 'absolute',
              left: -50,
              top: '55%',
              transform: 'rotate(-15deg)',
              width: 185,
              height: 259,
              objectFit: 'cover',
              zIndex: 2,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(tarotM).toString('base64')}`}
            style={{
              position: 'absolute',
              left: 100,
              top: '28%',
              transform: 'rotate(-12deg)',
              width: 190,
              height: 266,
              objectFit: 'cover',
              zIndex: 2,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(mythic).toString('base64')}`}
            style={{
              position: 'absolute',
              left: 260,
              top: '35%',
              transform: 'rotate(-5deg)',
              width: 210,
              height: 294,
              objectFit: 'cover',
              zIndex: 3,
            }}
          />

          {/* MIDDLE RIGHT - 4 cards */}
          <img
            src={`data:image/png;base64,${Buffer.from(custom1).toString('base64')}`}
            style={{
              position: 'absolute',
              right: 260,
              top: '35%',
              transform: 'rotate(5deg)',
              width: 210,
              height: 294,
              objectFit: 'cover',
              zIndex: 3,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(vibefidM).toString('base64')}`}
            style={{
              position: 'absolute',
              right: 100,
              top: '28%',
              transform: 'rotate(12deg)',
              width: 190,
              height: 266,
              objectFit: 'cover',
              zIndex: 2,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(tarotL).toString('base64')}`}
            style={{
              position: 'absolute',
              right: -50,
              top: '55%',
              transform: 'rotate(15deg)',
              width: 185,
              height: 259,
              objectFit: 'cover',
              zIndex: 2,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(historyM).toString('base64')}`}
            style={{
              position: 'absolute',
              right: -80,
              top: '20%',
              transform: 'rotate(22deg)',
              width: 200,
              height: 280,
              objectFit: 'cover',
              zIndex: 2,
            }}
          />

          {/* BOTTOM ROW - 7 cards */}
          <img
            src={`data:image/png;base64,${Buffer.from(teampotM).toString('base64')}`}
            style={{
              position: 'absolute',
              left: -40,
              bottom: -110,
              transform: 'rotate(20deg)',
              width: 180,
              height: 252,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(custom2).toString('base64')}`}
            style={{
              position: 'absolute',
              left: 130,
              bottom: -95,
              transform: 'rotate(-8deg)',
              width: 175,
              height: 245,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(meowverseM).toString('base64')}`}
            style={{
              position: 'absolute',
              left: 300,
              bottom: -100,
              transform: 'rotate(12deg)',
              width: 170,
              height: 238,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(custom5).toString('base64')}`}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: -90,
              transform: 'translateX(-50%) rotate(-3deg)',
              width: 175,
              height: 245,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(poorlyM).toString('base64')}`}
            style={{
              position: 'absolute',
              right: 300,
              bottom: -100,
              transform: 'rotate(-10deg)',
              width: 170,
              height: 238,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(gmvbrsL).toString('base64')}`}
            style={{
              position: 'absolute',
              right: 130,
              bottom: -95,
              transform: 'rotate(8deg)',
              width: 175,
              height: 245,
              objectFit: 'cover',
              zIndex: 1,
            }}
          />
          <img
            src={`data:image/png;base64,${Buffer.from(legendary).toString('base64')}`}
            style={{
              position: 'absolute',
              right: -40,
              bottom: -110,
              transform: 'rotate(-18deg)',
              width: 180,
              height: 252,
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
            background: 'rgba(0, 0, 0, 0.40)',
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
            $VBMS
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
