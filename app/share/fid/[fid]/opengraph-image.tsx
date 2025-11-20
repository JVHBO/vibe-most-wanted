import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VibeFID Card - VIBE Most Wanted';
export const size = {
  width: 500,
  height: 700,
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

    // If card has saved PNG, return it
    if (cardData?.cardImageUrl) {
      try {
        // Convert IPFS URL if needed - use Cloudflare gateway for speed
        let imageUrl = cardData.cardImageUrl;
        if (imageUrl.startsWith('ipfs://')) {
          imageUrl = imageUrl.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/');
        } else if (imageUrl.includes('ipfs.io')) {
          // Convert existing ipfs.io URLs to cloudflare
          imageUrl = imageUrl.replace('https://ipfs.io/ipfs/', 'https://cloudflare-ipfs.com/ipfs/');
        }

        // Fetch with timeout (8 seconds) to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const imageResponse = await fetch(imageUrl, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer();

          return new Response(imageBuffer, {
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
            },
          });
        }
      } catch (imageError) {
        console.error('Failed to fetch card PNG from IPFS:', imageError);
        // Continue to fallback below
      }
    }

    // Fallback: Simple placeholder (card not minted or no PNG saved)
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5dc',
            color: '#000',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ fontSize: '80px' }}>🎴</div>
          <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'serif' }}>
            VibeFID Card #{fid}
          </div>
          <div style={{ fontSize: '20px', fontFamily: 'serif' }}>
            {cardData ? 'Card minted - image not available' : 'Not minted yet'}
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (e: any) {
    console.error('OG Image error:', e);
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5dc',
            color: '#000',
            fontSize: '32px',
            fontWeight: 900,
            fontFamily: 'serif',
          }}
        >
          VibeFID Card
        </div>
      ),
      { ...size }
    );
  }
}
