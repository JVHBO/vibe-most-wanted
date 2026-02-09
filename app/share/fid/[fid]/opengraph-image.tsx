import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VibeFID Card - VibeFID';
export const size = {
  width: 1200,
  height: 800,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;

  console.log(`[OG Image] Generating for FID: ${fid}`);

  try {
    // Fetch card data from Convex
    let cardData: any = null;

    try {
      // Hardcode Convex URL for edge runtime reliability
      const convexUrl = "https://agile-orca-761.convex.cloud";
      console.log(`[OG Image] Fetching from Convex: ${convexUrl}`);

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
          console.log(`[OG Image] Card found! shareImageUrl: ${cardData.shareImageUrl ? 'YES' : 'NO'}, cardImageUrl: ${cardData.cardImageUrl ? 'YES' : 'NO'}`);
        } else {
          console.log(`[OG Image] Card not found in database`);
        }
      } else {
        console.error(`[OG Image] Convex fetch failed: ${response.status}`);
      }
    } catch (e) {
      console.error('[OG Image] Failed to fetch card data:', e);
    }

    // If card has saved share image, return it (priority: shareImageUrl > cardImageUrl)
    const savedImageUrl = cardData?.shareImageUrl || cardData?.cardImageUrl;
    if (savedImageUrl) {
      try {
        // Convert IPFS URL if needed - try multiple gateways for reliability
        let imageUrl = savedImageUrl;

        console.log(`[OG Image] Original imageUrl: ${imageUrl}`);

        // Extract CID from any IPFS URL format
        let cid = '';
        if (imageUrl.startsWith('ipfs://')) {
          cid = imageUrl.replace('ipfs://', '');
        } else if (imageUrl.includes('/ipfs/')) {
          cid = imageUrl.split('/ipfs/')[1];
        }

        console.log(`[OG Image] Extracted CID: ${cid}`);

        // Try multiple gateways in order of speed/reliability
        const gateways = [
          `https://ipfs.filebase.io/ipfs/${cid}`,
          `https://cloudflare-ipfs.com/ipfs/${cid}`,
          `https://ipfs.io/ipfs/${cid}`,
          `https://gateway.pinata.cloud/ipfs/${cid}`,
        ];

        for (const gatewayUrl of gateways) {
          try {
            console.log(`[OG Image] Trying gateway: ${gatewayUrl}`);

            // Fetch with timeout (10 seconds per gateway)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const imageResponse = await fetch(gatewayUrl, {
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            console.log(`[OG Image] Gateway response: ${imageResponse.status}`);

            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer();
              console.log(`[OG Image] ✅ Success! Image size: ${imageBuffer.byteLength} bytes`);

              return new Response(imageBuffer, {
                headers: {
                  'Content-Type': 'image/png',
                  'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
                },
              });
            }
          } catch (gatewayError: any) {
            console.error(`[OG Image] Gateway ${gatewayUrl} failed:`, gatewayError.message);
            // Continue to next gateway
          }
        }

        console.error('[OG Image] All gateways failed, using fallback');
      } catch (imageError) {
        console.error('[OG Image] Failed to fetch card PNG from IPFS:', imageError);
        // Continue to fallback below
      }
    } else {
      console.log('[OG Image] No shareImageUrl or cardImageUrl, using placeholder');
    }

    // Fallback: Generate card from Convex data (no IPFS needed)
    if (cardData) {
      // Try to fetch PFP with timeout
      let pfpBase64 = '';
      if (cardData.pfpUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3000);
          const pfpResponse = await fetch(cardData.pfpUrl, { signal: controller.signal });
          clearTimeout(timeout);
          if (pfpResponse.ok) {
            const pfpBuffer = await pfpResponse.arrayBuffer();
            pfpBase64 = `data:image/jpeg;base64,${Buffer.from(pfpBuffer).toString('base64')}`;
          }
        } catch (e) {
          console.log('[OG Image] Failed to fetch PFP');
        }
      }

      // Rarity colors
      const rarityColors: Record<string, string> = {
        Common: '#6B7280',
        Rare: '#3B82F6',
        Epic: '#8B5CF6',
        Legendary: '#F59E0B',
        Mythic: '#EF4444',
      };
      const borderColor = rarityColors[cardData.rarity] || '#6B7280';
      const suitColor = cardData.color === 'red' ? '#EF4444' : '#FFFFFF';

      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
              border: `8px solid ${borderColor}`,
              padding: 32,
            }}
          >
            <div style={{ color: borderColor, fontSize: 24, fontWeight: 900, marginBottom: 12 }}>
              VibeFID #{fid}
            </div>
            <div style={{ color: suitColor, fontSize: 56, fontWeight: 900, marginBottom: 12 }}>
              {cardData.rank}{cardData.suitSymbol}
            </div>
            {pfpBase64 ? (
              <img
                src={pfpBase64}
                width={180}
                height={180}
                style={{ borderRadius: '50%', border: `4px solid ${borderColor}`, marginBottom: 12 }}
              />
            ) : (
              <div
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: '50%',
                  border: `4px solid ${borderColor}`,
                  background: '#2a2a4e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 64,
                  color: '#fff',
                  fontWeight: 900,
                  marginBottom: 12,
                }}
              >
                {cardData.username?.substring(0, 2).toUpperCase() || '??'}
              </div>
            )}
            <div style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
              @{cardData.username}
            </div>
            <div style={{ color: borderColor, fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              {cardData.rarity}
            </div>
            <div style={{ color: '#FFD700', fontSize: 16, fontWeight: 700 }}>
              VibeFID
            </div>
          </div>
        ),
        { ...size }
      );
    }

    // Ultimate fallback: Simple placeholder without emojis
    return new ImageResponse(
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
          <div style={{ fontSize: '32px', fontWeight: 900 }}>
            VibeFID
          </div>
          <div style={{ fontSize: '24px' }}>
            FID #{fid}
          </div>
          <div style={{ fontSize: '16px', opacity: 0.9 }}>
            Not Minted Yet
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (e: any) {
    console.error('OG Image error:', e);

    // Emergency fallback with better styling
    return new ImageResponse(
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
          VibeFID
        </div>
      ),
      { ...size }
    );
  }
}
