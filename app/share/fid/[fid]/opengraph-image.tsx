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

    // Card dimensions scaled to fit OG image (maintain 2.5:3.5 ratio)
    const cardWidth = 450;
    const cardHeight = 630;

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
          {/* Playing Card */}
          <div
            style={{
              width: `${cardWidth}px`,
              height: `${cardHeight}px`,
              background: '#f5f5dc',
              border: '4px solid #000',
              borderRadius: '8px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              padding: '10px',
            }}
          >
            {/* Top left: Rank + Suit */}
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '15px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: cardData.rank === '10' ? '46px' : '52px',
                  fontWeight: 900,
                  color: cardData.color === 'red' ? '#dc143c' : '#000',
                  fontFamily: 'serif',
                  lineHeight: 1,
                  letterSpacing: cardData.rank === '10' ? '-6px' : '0',
                }}
              >
                {cardData.rank}
              </span>
              <span
                style={{
                  fontSize: '44px',
                  color: cardData.color === 'red' ? '#dc143c' : '#000',
                  fontFamily: 'serif',
                  lineHeight: 1,
                  marginTop: '-4px',
                }}
              >
                {cardData.suitSymbol}
              </span>
            </div>

            {/* Top center: FID + Score */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginTop: '10px',
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  color: '#000',
                  fontFamily: 'monospace',
                }}
              >
                fid:{cardData.fid}
              </span>
              <span
                style={{
                  fontSize: '16px',
                  color: '#000',
                  fontFamily: 'monospace',
                  marginTop: '2px',
                }}
              >
                neynar score: {cardData.neynarScore?.toFixed(2) || '0.00'}
              </span>
            </div>

            {/* Center: PFP */}
            {pfpUrl && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '100px',
                }}
              >
                <div
                  style={{
                    width: '260px',
                    height: '260px',
                    border: '3px solid #000',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  <img
                    src={pfpUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  {/* Vintage overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(to bottom, rgba(101, 67, 33, 0.15), rgba(0, 0, 0, 0.2))',
                      display: 'flex',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Below PFP: Username */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '20px',
              }}
            >
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#000',
                  fontFamily: 'serif',
                  textAlign: 'center',
                }}
              >
                {cardData.displayName || cardData.username}
              </span>
            </div>

            {/* Bottom: Meme text */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '8px',
                paddingLeft: '20px',
                paddingRight: '20px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  color: '#000',
                  fontFamily: 'serif',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                Wanted for crimes against good vibes
              </span>
            </div>

            {/* Bottom right: Rotated Rank + Suit (upside down) */}
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '15px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: 'rotate(180deg)',
              }}
            >
              <span
                style={{
                  fontSize: cardData.rank === '10' ? '46px' : '52px',
                  fontWeight: 900,
                  color: cardData.color === 'red' ? '#dc143c' : '#000',
                  fontFamily: 'serif',
                  lineHeight: 1,
                  letterSpacing: cardData.rank === '10' ? '-6px' : '0',
                }}
              >
                {cardData.rank}
              </span>
              <span
                style={{
                  fontSize: '44px',
                  color: cardData.color === 'red' ? '#dc143c' : '#000',
                  fontFamily: 'serif',
                  lineHeight: 1,
                  marginTop: '-4px',
                }}
              >
                {cardData.suitSymbol}
              </span>
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
