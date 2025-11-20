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

  console.log(`[OG Image] Generating for FID: ${fid}`);

  try {
    // Fetch card data from Convex
    let cardData: any = null;

    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
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
          console.log(`[OG Image] Card found! cardImageUrl: ${cardData.cardImageUrl ? 'YES' : 'NO'}`);
        } else {
          console.log(`[OG Image] Card not found in database`);
        }
      } else {
        console.error(`[OG Image] Convex fetch failed: ${response.status}`);
      }
    } catch (e) {
      console.error('[OG Image] Failed to fetch card data:', e);
    }

    // If card has saved PNG, return it
    if (cardData?.cardImageUrl) {
      try {
        // Convert IPFS URL if needed - try multiple gateways for reliability
        let imageUrl = cardData.cardImageUrl;

        console.log(`[OG Image] Original cardImageUrl: ${imageUrl}`);

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
      console.log('[OG Image] No cardImageUrl, generating from card data');
    }

    // Fallback: Generate card image from data (for old cards without cardImageUrl)
    if (cardData) {
      console.log('[OG Image] Generating card with data:', {
        suit: cardData.suit,
        rank: cardData.rank,
        rarity: cardData.rarity,
        power: cardData.power,
      });

      const rarityColors: Record<string, string> = {
        Common: '#808080',
        Uncommon: '#3CB371',
        Rare: '#4169E1',
        Epic: '#9333EA',
        Legendary: '#FFD700',
      };

      const suitSymbols: Record<string, string> = {
        hearts: '♥',
        diamonds: '♦',
        clubs: '♣',
        spades: '♠',
      };

      const bgColor = rarityColors[cardData.rarity] || '#808080';
      const symbol = cardData.suitSymbol || suitSymbols[cardData.suit?.toLowerCase()] || '♣';

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
              background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}DD 100%)`,
              color: '#fff',
              padding: '40px',
            }}
          >
            <div style={{ fontSize: '100px', marginBottom: '20px' }}>{symbol}</div>
            <div style={{ fontSize: '60px', fontWeight: 900, fontFamily: 'monospace' }}>
              {cardData.rank}
            </div>
            <div style={{ fontSize: '24px', marginTop: '20px', opacity: 0.9 }}>
              {cardData.rarity}
            </div>
            <div style={{ fontSize: '32px', marginTop: '10px', fontWeight: 900 }}>
              ⚡ {cardData.power}
            </div>
            <div style={{ fontSize: '18px', marginTop: '30px', opacity: 0.8 }}>
              {cardData.displayName || cardData.username}
            </div>
          </div>
        ),
        { ...size }
      );
    }

    // Final fallback: Simple placeholder
    const fallbackImageResponse = new ImageResponse(
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
      { ...size }
    );

    return fallbackImageResponse;
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
          VIBE MOST WANTED
        </div>
      ),
      { ...size }
    );
  }
}
