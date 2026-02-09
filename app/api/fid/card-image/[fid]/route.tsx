import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  const { fid } = await params;

  console.log(`[Card Image API] Generating for FID: ${fid}`);

  try {
    // Fetch card data from Convex
    let cardData: any = null;

    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
      console.log(`[Card Image API] Fetching from Convex: ${convexUrl}`);

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
          console.log(`[Card Image API] Card found! cardImageUrl: ${cardData.cardImageUrl ? 'YES' : 'NO'}`);
        } else {
          console.log(`[Card Image API] Card not found in database`);
        }
      } else {
        console.error(`[Card Image API] Convex fetch failed: ${response.status}`);
      }
    } catch (e) {
      console.error('[Card Image API] Failed to fetch card data:', e);
    }

    // If card has saved PNG, return it
    if (cardData?.cardImageUrl) {
      try {
        // Convert IPFS URL if needed - try multiple gateways for reliability
        let imageUrl = cardData.cardImageUrl;

        console.log(`[Card Image API] Original cardImageUrl: ${imageUrl}`);

        // Extract CID from any IPFS URL format
        let cid = '';
        if (imageUrl.startsWith('ipfs://')) {
          cid = imageUrl.replace('ipfs://', '');
        } else if (imageUrl.includes('/ipfs/')) {
          cid = imageUrl.split('/ipfs/')[1];
        }

        console.log(`[Card Image API] Extracted CID: ${cid}`);

        if (cid) {
          // Try multiple IPFS gateways with timeout (Filebase first for faster access)
          const gateways = [
            `https://ipfs.filebase.io/ipfs/${cid}`,
            `https://cloudflare-ipfs.com/ipfs/${cid}`,
            `https://ipfs.io/ipfs/${cid}`,
            `https://gateway.pinata.cloud/ipfs/${cid}`,
          ];

          for (const gatewayUrl of gateways) {
            try {
              console.log(`[Card Image API] Trying gateway: ${gatewayUrl}`);

              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

              const imgResponse = await fetch(gatewayUrl, {
                signal: controller.signal,
                headers: {
                  'Accept': 'image/png,image/*',
                }
              });

              clearTimeout(timeoutId);

              if (imgResponse.ok) {
                console.log(`[Card Image API] Successfully fetched from: ${gatewayUrl}`);
                const imageData = await imgResponse.arrayBuffer();

                return new Response(imageData, {
                  headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=31536000, immutable',
                  },
                });
              } else {
                console.log(`[Card Image API] Gateway ${gatewayUrl} returned ${imgResponse.status}`);
              }
            } catch (fetchError: any) {
              console.log(`[Card Image API] Gateway ${gatewayUrl} failed:`, fetchError.message);
              continue; // Try next gateway
            }
          }

          console.error('[Card Image API] All IPFS gateways failed');
        }
      } catch (imageError) {
        console.error('[Card Image API] Failed to fetch card PNG from IPFS:', imageError);
        // Continue to fallback below
      }
    } else {
      console.log('[Card Image API] No cardImageUrl, using placeholder');
    }

    // Fallback: Simple placeholder
    const fallbackImageResponse = new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            color: '#fff',
            fontFamily: 'monospace',
          }}
        >
          <div style={{ fontSize: '48px', fontWeight: 900, marginBottom: '20px', display: 'flex' }}>
            VibeFID
          </div>
          <div style={{ fontSize: '24px', opacity: 0.7, display: 'flex' }}>
            FID: {fid}
          </div>
        </div>
      ),
      {
        width: 500,
        height: 700,
      }
    );

    return fallbackImageResponse;
  } catch (error) {
    console.error('[Card Image API] Error generating image:', error);

    // Error fallback
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
            color: '#fff',
            fontSize: '32px',
          }}
        >
          Error loading card
        </div>
      ),
      {
        width: 500,
        height: 700,
      }
    );
  }
}
