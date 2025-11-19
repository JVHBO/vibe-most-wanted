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

    // Get card image URL from IPFS
    const cardImageUrl = cardData.imageUrl ? proxyUrl(cardData.imageUrl) : '';

    // If no card image, show fallback
    if (!cardImageUrl) {
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
          {/* Card Image from IPFS */}
          <img
            src={cardImageUrl}
            style={{
              maxWidth: '500px',
              maxHeight: '630px',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            }}
          />
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
