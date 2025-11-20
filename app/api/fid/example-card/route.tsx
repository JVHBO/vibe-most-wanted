import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 1200,
  height: 630,
};

/**
 * Generate example VibeFID card image using real data from FID #1
 * This is shown on the FID landing page as an example
 */
export async function GET() {
  try {
    // Fetch real data for FID #1 from Neynar
    const neynarApiKey = process.env.NEYNAR_API_KEY!;
    const fid = 1;

    let userData: any = null;

    try {
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
        userData = neynarData.users?.[0];
      }
    } catch (e) {
      console.error('Failed to fetch Neynar data:', e);
    }

    // Generate example card with real data
    if (userData) {
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
              {/* Suit Symbol - King of Hearts for example */}
              <div
                style={{
                  fontSize: '80px',
                  fontWeight: 900,
                  color: '#ef4444',
                  marginBottom: '20px',
                }}
              >
                K♥
              </div>

              {/* Real Profile Picture */}
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

              {/* Real Username */}
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

              {/* Example Stats */}
              <div
                style={{
                  display: 'flex',
                  gap: '40px',
                  fontSize: '32px',
                  color: '#D4AF37',
                }}
              >
                <div style={{ display: 'flex' }}>
                  <span style={{ fontWeight: 700 }}>Legendary</span>
                </div>
                <div style={{ display: 'flex' }}>
                  <span style={{ fontWeight: 700 }}>⚡ 3240</span>
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
        { ...size }
      );
    }

    // Fallback if no data
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
          <div style={{ fontSize: '48px', fontWeight: 900 }}>VibeFID Card Example</div>
          <div style={{ fontSize: '28px', color: '#D4AF37', marginTop: '10px' }}>
            Mint your card now!
          </div>
        </div>
      ),
      { ...size }
    );
  } catch (e: any) {
    console.error('Example card image error:', e);
    // Ultimate fallback
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
