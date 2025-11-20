import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  const { fid } = await params;

  console.log(`[API OG] Generating for FID: ${fid}`);

  try {
    // Fetch card data from Convex
    let cardData: any = null;

    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
      console.log(`[API OG] Fetching from Convex: ${convexUrl}`);

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
          console.log(`[API OG] Card found! cardImageUrl: ${cardData.cardImageUrl ? 'YES' : 'NO'}`);
        } else {
          console.log(`[API OG] Card not found in database`);
        }
      } else {
        console.error(`[API OG] Convex fetch failed: ${response.status}`);
      }
    } catch (e) {
      console.error('[API OG] Failed to fetch card data:', e);
    }

    // If card has saved PNG, return it
    if (cardData?.cardImageUrl) {
      try {
        // Extract CID from any IPFS URL format
        let imageUrl = cardData.cardImageUrl;
        let cid = '';

        console.log(`[API OG] Original cardImageUrl: ${imageUrl}`);

        if (imageUrl.startsWith('ipfs://')) {
          cid = imageUrl.replace('ipfs://', '');
        } else if (imageUrl.includes('/ipfs/')) {
          cid = imageUrl.split('/ipfs/')[1];
        }

        console.log(`[API OG] Extracted CID: ${cid}`);

        // Try multiple gateways in order of speed/reliability
        const gateways = [
          `https://cloudflare-ipfs.com/ipfs/${cid}`,
          `https://ipfs.io/ipfs/${cid}`,
          `https://gateway.pinata.cloud/ipfs/${cid}`,
        ];

        for (const gatewayUrl of gateways) {
          try {
            console.log(`[API OG] Trying gateway: ${gatewayUrl}`);

            // Fetch with timeout (10 seconds per gateway)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const imageResponse = await fetch(gatewayUrl, {
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            console.log(`[API OG] Gateway response: ${imageResponse.status}`);

            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer();
              console.log(`[API OG] ✅ Success! Image size: ${imageBuffer.byteLength} bytes`);

              return new Response(imageBuffer, {
                headers: {
                  'Content-Type': 'image/png',
                  'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
                  'Access-Control-Allow-Origin': '*',
                },
              });
            }
          } catch (gatewayError: any) {
            console.error(`[API OG] Gateway ${gatewayUrl} failed:`, gatewayError.message);
            // Continue to next gateway
          }
        }

        console.error('[API OG] All gateways failed, using fallback');
      } catch (imageError) {
        console.error('[API OG] Failed to fetch card PNG from IPFS:', imageError);
        // Continue to fallback below
      }
    } else {
      console.log('[API OG] No cardImageUrl, using fallback');
    }

    // Fallback: Generate placeholder image
    const fallbackImage = new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ fontSize: '80px' }}>🎴</div>
          <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'monospace' }}>
            VIBE MOST WANTED
          </div>
          <div style={{ fontSize: '24px', fontFamily: 'monospace' }}>
            FID #{fid}
          </div>
          <div style={{ fontSize: '16px', fontFamily: 'monospace', opacity: 0.9 }}>
            {cardData ? 'Card Minted' : 'Not Minted Yet'}
          </div>
        </div>
      ),
      {
        width: 500,
        height: 700,
      }
    );

    // Get the response and add CORS headers
    const response = await fallbackImage;
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (e: any) {
    console.error('[API OG] error:', e);

    // Emergency fallback
    const emergencyFallback = new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            fontSize: '28px',
            fontWeight: 900,
            fontFamily: 'monospace',
          }}
        >
          VIBE MOST WANTED
        </div>
      ),
      {
        width: 500,
        height: 700,
      }
    );

    const response = await emergencyFallback;
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  }
}
