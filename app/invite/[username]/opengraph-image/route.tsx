import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_\-\.]/g, '');

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f0a00 0%, #1a1410 30%, #2d2010 50%, #1a1410 70%, #0f0a00 100%)',
            position: 'relative',
          }}
        >
          {/* Background glow effects */}
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at 50% 30%, rgba(255, 215, 0, 0.2) 0%, transparent 50%)',
              display: 'flex',
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '30px',
              zIndex: 1,
            }}
          >
            {/* Card emoji */}
            <div style={{ fontSize: '120px' }}>🎴</div>

            {/* Title */}
            <div
              style={{
                fontSize: '72px',
                fontWeight: 900,
                color: '#FFD700',
                letterSpacing: '4px',
                textShadow: '0 0 40px rgba(255, 215, 0, 0.8), 0 4px 20px rgba(0, 0, 0, 0.8)',
                textAlign: 'center',
              }}
            >
              VIBE MOST WANTED
            </div>

            {/* Invitation message */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '15px',
                background: 'rgba(255, 215, 0, 0.1)',
                border: '3px solid rgba(255, 215, 0, 0.4)',
                borderRadius: '20px',
                padding: '30px 60px',
              }}
            >
              <div
                style={{
                  fontSize: '36px',
                  color: '#D4AF37',
                  fontWeight: 700,
                }}
              >
                {sanitizedUsername}
              </div>
              <div
                style={{
                  fontSize: '48px',
                  color: '#FFD700',
                  fontWeight: 800,
                }}
              >
                invited you to play!
              </div>
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: '28px',
                color: '#D4AF37',
                fontWeight: 600,
                letterSpacing: '2px',
              }}
            >
              The Ultimate Card Battle Game on Farcaster
            </div>
          </div>

          {/* Bottom branding */}
          <div
            style={{
              position: 'absolute',
              bottom: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                fontSize: '22px',
                color: '#D4AF37',
                fontWeight: 600,
              }}
            >
              vibemostwanted.xyz
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate',
          'Content-Type': 'image/png',
        },
      }
    );
  } catch (e: any) {
    console.log(`Error generating invite OG image: ${e.message}`);
    return new Response(`Failed to generate invite image`, {
      status: 500,
    });
  }
}
