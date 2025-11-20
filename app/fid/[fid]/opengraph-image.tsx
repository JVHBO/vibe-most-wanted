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

    // Fallback if card not found - fetch from Neynar API
    if (!cardData) {
      try {
        // Fetch user data from Neynar
        const neynarApiKey = process.env.NEYNAR_API_KEY!;
        const neynarResponse = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
          {
            headers: {
              'accept': 'application/json',
              'api_key': neynarApiKey,
            },
          }
        );

        if (neynarResponse.ok) {
          const neynarData = await neynarResponse.json();
          const userData = neynarData.users?.[0];

          if (userData) {
            // Generate preview card from Neynar data
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
                  {/* Card Container */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'rgba(20, 20, 20, 0.9)',
                      border: '4px solid #FFD700',
                      borderRadius: '16px',
                      padding: '40px',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    {/* Preview Badge */}
                    <div
                      style={{
                        fontSize: '32px',
                        fontWeight: 700,
                        color: '#FFD700',
                        marginBottom: '20px',
                      }}
                    >
                      🎴 VibeFID Card
                    </div>

                    {/* Profile Picture */}
                    {userData.pfp_url && (
                      <img
                        src={userData.pfp_url}
                        style={{
                          width: '300px',
                          height: '300px',
                          borderRadius: '50%',
                          border: '6px solid #FFD700',
                          objectFit: 'cover',
                          marginBottom: '20px',
                        }}
                      />
                    )}

                    {/* Username */}
                    <div
                      style={{
                        fontSize: '48px',
                        fontWeight: 900,
                        color: '#FFD700',
                        marginBottom: '10px',
                      }}
                    >
                      @{userData.username}
                    </div>

                    {/* Display Name */}
                    <div
                      style={{
                        fontSize: '28px',
                        color: '#D4AF37',
                        marginBottom: '20px',
                      }}
                    >
                      {userData.display_name}
                    </div>

                    {/* Call to Action */}
                    <div
                      style={{
                        fontSize: '24px',
                        color: '#FFD700',
                        fontWeight: 700,
                      }}
                    >
                      Not minted yet - Mint now!
                    </div>
                  </div>

                  {/* Branding */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '40px',
                      fontSize: '28px',
                      fontWeight: 700,
                      color: 'rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    VIBE MOST WANTED
                  </div>
                </div>
              ),
              { ...size }
            );
          }
        }
      } catch (neynarError) {
        console.error('Neynar fetch error:', neynarError);
      }

      // Ultimate fallback
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
              background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
              color: '#FFD700',
            }}
          >
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎴</div>
            <div style={{ fontSize: '48px', fontWeight: 900 }}>VibeFID Card #{fid}</div>
            <div style={{ fontSize: '28px', color: '#D4AF37', marginTop: '10px' }}>
              Mint your VibeFID card now!
            </div>
          </div>
        ),
        { ...size }
      );
    }

    // Card found - render minted card image
    const pfpUrl = cardData.pfpUrl || '';

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
          {/* Card Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(20, 20, 20, 0.9)',
              border: '4px solid #FFD700',
              borderRadius: '16px',
              padding: '40px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
            }}
          >
            {/* Suit Symbol */}
            <div
              style={{
                fontSize: '80px',
                fontWeight: 900,
                color: cardData.color === 'red' ? '#ef4444' : '#000',
                marginBottom: '20px',
              }}
            >
              {cardData.rank}{cardData.suitSymbol}
            </div>

            {/* Profile Picture */}
            {pfpUrl && (
              <img
                src={pfpUrl}
                style={{
                  width: '300px',
                  height: '300px',
                  borderRadius: '50%',
                  border: '6px solid #FFD700',
                  objectFit: 'cover',
                  marginBottom: '20px',
                }}
              />
            )}

            {/* Username */}
            <div
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#FFD700',
                marginBottom: '10px',
              }}
            >
              @{cardData.username}
            </div>

            {/* Stats */}
            <div
              style={{
                display: 'flex',
                gap: '40px',
                fontSize: '32px',
                color: '#D4AF37',
              }}
            >
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 700 }}>{cardData.rarity}</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ fontWeight: 700 }}>⚡ {cardData.power}</span>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              fontSize: '28px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            VIBE MOST WANTED
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
