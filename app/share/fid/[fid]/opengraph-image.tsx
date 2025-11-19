import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VibeFID Card - VIBE Most Wanted';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;

  try {
    // Fetch card data from Convex
    let cardData: any = null;

    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
      const response = await fetch(`${convexUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'farcasterCards:getFarcasterCardByFid',
          args: { fid: parseInt(fid) },
          format: 'json',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          cardData = data.value;
        }
      }
    } catch (e) {
      console.error('Failed to fetch card data:', e);
    }

    // Fallback if card not found
    if (!cardData) {
      cardData = {
        username: `FID ${fid}`,
        rarity: 'Common',
        foil: 'None',
        power: 100,
        rank: '2',
        suitSymbol: '♠',
        color: 'black',
      };
    }

    // Proxy image URL for Edge Runtime compatibility
    const proxyUrl = (url: string) => {
      if (!url) return '';
      if (url.startsWith('https://www.vibemostwanted.xyz/')) return url;
      if (url.startsWith('https://ipfs.io/ipfs/')) {
        return `https://www.vibemostwanted.xyz/api/proxy-image?url=${encodeURIComponent(url)}`;
      }
      return url;
    };

    const cardImageUrl = cardData.imageUrl ? proxyUrl(cardData.imageUrl) : '';
    const pfpUrl = cardData.pfpUrl ? proxyUrl(cardData.pfpUrl) : '';

    // Get foil color
    const getFoilGradient = (foil: string) => {
      if (foil === 'Prize') {
        return 'linear-gradient(135deg, rgba(168, 85, 247, 0.4) 0%, rgba(236, 72, 153, 0.4) 100%)';
      }
      if (foil === 'Standard') {
        return 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(147, 51, 234, 0.3) 100%)';
      }
      return 'transparent';
    };

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            position: 'relative',
          }}
        >
          {/* Glow effect */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at center, rgba(255, 215, 0, 0.15) 0%, transparent 60%)',
              display: 'flex',
            }}
          />

          {/* Content container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '60px',
              zIndex: 1,
            }}
          >
            {/* Card Image */}
            {cardImageUrl && (
              <div
                style={{
                  width: '400px',
                  height: '560px',
                  borderRadius: '16px',
                  border: '6px solid #FFD700',
                  boxShadow: '0 20px 60px rgba(255, 215, 0, 0.4)',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                }}
              >
                <img
                  src={cardImageUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Foil overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: getFoilGradient(cardData.foil),
                    display: 'flex',
                  }}
                />
              </div>
            )}

            {/* Card Info */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '30px',
                maxWidth: '600px',
              }}
            >
              {/* Title */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    fontSize: '64px',
                    fontWeight: 900,
                    color: '#FFD700',
                    textShadow: '0 4px 20px rgba(255, 215, 0, 0.5)',
                    letterSpacing: '2px',
                  }}
                >
                  VibeFID
                </div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.9)',
                  }}
                >
                  @{cardData.username}
                </div>
              </div>

              {/* Stats Grid */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '30px',
                  borderRadius: '12px',
                  border: '2px solid rgba(255, 215, 0, 0.3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '28px',
                  }}
                >
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Rarity:</span>
                  <span style={{ color: '#FFD700', fontWeight: 700 }}>{cardData.rarity}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '28px',
                  }}
                >
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Foil:</span>
                  <span
                    style={{
                      color: cardData.foil === 'Prize' ? '#A855F7' : cardData.foil === 'Standard' ? '#3B82F6' : '#fff',
                      fontWeight: 700,
                    }}
                  >
                    {cardData.foil}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '28px',
                  }}
                >
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Card:</span>
                  <span
                    style={{
                      color: cardData.color === 'red' ? '#EF4444' : '#fff',
                      fontWeight: 700,
                      fontSize: '32px',
                    }}
                  >
                    {cardData.rank}{cardData.suitSymbol}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '36px',
                    marginTop: '10px',
                    paddingTop: '15px',
                    borderTop: '2px solid rgba(255, 215, 0, 0.3)',
                  }}
                >
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Power:</span>
                  <span style={{ color: '#FFD700', fontWeight: 900 }}>⚡ {cardData.power}</span>
                </div>
              </div>

              {/* Branding */}
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.4)',
                  letterSpacing: '1px',
                }}
              >
                VIBE MOST WANTED
              </div>
            </div>
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
    console.error('OG Image error:', e);
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
            color: '#FFD700',
            fontSize: '48px',
            fontWeight: 900,
          }}
        >
          VibeFID Card
        </div>
      ),
      { ...size }
    );
  }
}
