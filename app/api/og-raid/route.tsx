import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get raid data from query params
    const bossName = searchParams.get('bossName') || 'Raid Boss';
    const bossHp = searchParams.get('bossHp') || '100';
    const deckPower = searchParams.get('deckPower') || '0';
    const username = searchParams.get('username') || 'Player';
    const bossImage = searchParams.get('bossImage') || '/images/raid-bosses/vibe/legendary.png';

    // Card images (up to 5 cards)
    const card1 = searchParams.get('card1') || '';
    const card2 = searchParams.get('card2') || '';
    const card3 = searchParams.get('card3') || '';
    const card4 = searchParams.get('card4') || '';
    const card5 = searchParams.get('card5') || '';

    const cards = [card1, card2, card3, card4, card5].filter(Boolean);

    // Fetch boss image and convert to base64 (required for ImageResponse)
    let bossImageData = '';
    if (bossImage) {
      try {
        // Use absolute URL for the image
        const imageUrl = bossImage.startsWith('http')
          ? bossImage
          : `https://vibemostwanted.xyz${bossImage}`;

        // Fetch with longer timeout and proper headers
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(imageUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Vercel-OG-Image-Generator',
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          bossImageData = `data:image/png;base64,${base64}`;
        } else {
          console.error('Image fetch failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch boss image:', error);
      }
    }

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
            background: 'linear-gradient(135deg, #0f0a00 0%, #1a1410 30%, #8B0000 50%, #1a1410 70%, #0f0a00 100%)',
            padding: '60px',
            position: 'relative',
          }}
        >
          {/* Border glow */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              bottom: '20px',
              border: '4px solid rgba(218, 165, 32, 0.6)',
              borderRadius: '24px',
              boxShadow: '0 0 60px rgba(218, 165, 32, 0.4), inset 0 0 60px rgba(218, 165, 32, 0.1)',
            }}
          />

          {/* Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '40px',
              zIndex: 1,
            }}
          >
            <div
              style={{
                fontSize: '64px',
                fontWeight: 900,
                background: 'linear-gradient(to bottom, #FFD700, #FFA500)',
                backgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 0 40px rgba(255, 215, 0, 0.8)',
                marginBottom: '10px',
              }}
            >
              ⚔️ RAID BOSS BATTLE
            </div>
          </div>

          {/* Main content area */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '60px',
              zIndex: 1,
            }}
          >
            {/* Player Deck */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  color: '#06b6d4',
                  marginBottom: '20px',
                }}
              >
                {username}
              </div>

              {/* Deck Power */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(6, 182, 212, 0.2)',
                  border: '2px solid rgba(6, 182, 212, 0.6)',
                  borderRadius: '16px',
                  padding: '20px 40px',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    color: '#94a3b8',
                    marginBottom: '8px',
                  }}
                >
                  Deck Power
                </div>
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: 900,
                    color: '#06b6d4',
                  }}
                >
                  {parseInt(deckPower).toLocaleString()}
                </div>
              </div>

              {/* Cards (show count) */}
              <div
                style={{
                  fontSize: '24px',
                  color: '#cbd5e1',
                }}
              >
                {cards.length} Cards Ready
              </div>
            </div>

            {/* VS Divider */}
            <div
              style={{
                display: 'flex',
                fontSize: '72px',
                fontWeight: 900,
                color: '#FFD700',
                textShadow: '0 0 30px rgba(255, 215, 0, 0.8)',
              }}
            >
              VS
            </div>

            {/* Boss */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
              }}
            >
              {/* Boss Image */}
              {bossImageData && (
                <div
                  style={{
                    display: 'flex',
                    marginBottom: '20px',
                  }}
                >
                  <img
                    src={bossImageData}
                    alt={bossName}
                    width="200"
                    height="280"
                    style={{
                      borderRadius: '12px',
                      border: '3px solid rgba(220, 38, 38, 0.8)',
                      boxShadow: '0 0 40px rgba(220, 38, 38, 0.6)',
                    }}
                  />
                </div>
              )}

              {/* Boss Name */}
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  color: '#dc2626',
                  marginBottom: '20px',
                }}
              >
                {bossName}
              </div>

              {/* Boss HP */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(220, 38, 38, 0.2)',
                  border: '2px solid rgba(220, 38, 38, 0.6)',
                  borderRadius: '16px',
                  padding: '20px 40px',
                }}
              >
                <div
                  style={{
                    fontSize: '24px',
                    color: '#94a3b8',
                    marginBottom: '8px',
                  }}
                >
                  Boss HP
                </div>
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: 900,
                    color: '#dc2626',
                  }}
                >
                  {bossHp}%
                </div>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div
            style={{
              display: 'flex',
              marginTop: '40px',
              fontSize: '32px',
              fontWeight: 700,
              color: '#FFD700',
              zIndex: 1,
            }}
          >
            Join the raid and earn epic rewards! 🎮
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('Failed to generate raid OG image:', e);
    return new Response(`Failed to generate image: ${e?.message}`, {
      status: 500,
    });
  }
}
