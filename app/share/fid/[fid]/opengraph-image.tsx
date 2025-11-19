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

    const pfpUrl = cardData.pfpUrl ? proxyUrl(cardData.pfpUrl) : '';

    // Get foil border color
    const getFoilBorderColor = (foil: string) => {
      if (foil === 'Prize') return '#A855F7'; // Purple
      if (foil === 'Standard') return '#3B82F6'; // Blue
      return '#FFD700'; // Gold
    };

    // Get rarity color
    const getRarityColor = (rarity: string) => {
      if (rarity === 'Mythic') return '#A855F7'; // Purple
      if (rarity === 'Legendary') return '#FFD700'; // Gold
      if (rarity === 'Epic') return '#9333EA'; // Purple
      if (rarity === 'Rare') return '#3B82F6'; // Blue
      return '#10B981'; // Green for Common
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
            padding: '40px',
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
              background: `radial-gradient(circle at center, ${getRarityColor(cardData.rarity)}20 0%, transparent 70%)`,
              display: 'flex',
            }}
          />

          {/* Main Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '30px',
              zIndex: 1,
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '60px',
              borderRadius: '24px',
              border: `6px solid ${getFoilBorderColor(cardData.foil)}`,
              boxShadow: `0 30px 80px ${getFoilBorderColor(cardData.foil)}60`,
            }}
          >
            {/* VibeFID Title */}
            <div
              style={{
                fontSize: '72px',
                fontWeight: 900,
                color: '#FFD700',
                textShadow: '0 4px 20px rgba(255, 215, 0, 0.6)',
                letterSpacing: '4px',
                textAlign: 'center',
              }}
            >
              VibeFID
            </div>

            {/* PFP */}
            {pfpUrl && (
              <img
                src={pfpUrl}
                style={{
                  width: '240px',
                  height: '240px',
                  borderRadius: '50%',
                  border: `6px solid ${getFoilBorderColor(cardData.foil)}`,
                  boxShadow: `0 10px 40px ${getFoilBorderColor(cardData.foil)}80`,
                  objectFit: 'cover',
                }}
              />
            )}

            {/* Username */}
            <div
              style={{
                fontSize: '48px',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.95)',
                textAlign: 'center',
              }}
            >
              @{cardData.username}
            </div>

            {/* Stats Grid - 2 columns */}
            <div
              style={{
                display: 'flex',
                gap: '40px',
                marginTop: '20px',
              }}
            >
              {/* Left Column */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '24px' }}>Rarity</span>
                  <span style={{ color: getRarityColor(cardData.rarity), fontWeight: 900, fontSize: '36px' }}>
                    {cardData.rarity}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '24px' }}>Card</span>
                  <span
                    style={{
                      color: cardData.color === 'red' ? '#EF4444' : '#fff',
                      fontWeight: 900,
                      fontSize: '48px',
                    }}
                  >
                    {cardData.rank}{cardData.suitSymbol}
                  </span>
                </div>
              </div>

              {/* Right Column */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '24px' }}>Foil</span>
                  <span
                    style={{
                      color: getFoilBorderColor(cardData.foil),
                      fontWeight: 900,
                      fontSize: '36px',
                    }}
                  >
                    {cardData.foil}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '24px' }}>Power</span>
                  <span style={{ color: '#FFD700', fontWeight: 900, fontSize: '48px' }}>
                    ⚡ {cardData.power}
                  </span>
                </div>
              </div>
            </div>

            {/* Branding */}
            <div
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.3)',
                letterSpacing: '2px',
                marginTop: '20px',
              }}
            >
              VIBE MOST WANTED
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
