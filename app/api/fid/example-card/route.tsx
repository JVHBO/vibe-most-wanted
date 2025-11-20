import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * Generate example VibeFID card image for FID #2 (vitalik.eth)
 * This is a static example shown on the FID landing page
 */
export async function GET() {
  try {
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
            {/* Suit Symbol - Example: King of Hearts */}
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

            {/* Profile Picture Placeholder */}
            <div
              style={{
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                border: '6px solid #FFD700',
                background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                fontSize: '120px',
              }}
            >
              👑
            </div>

            {/* Username - FID #2 */}
            <div
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#FFD700',
                marginBottom: '10px',
              }}
            >
              @fid-2
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
              color: 'rgba(255, 215, 255, 0.5)',
            }}
          >
            VIBE MOST WANTED
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('Example card image error:', e);
    // Fallback
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
          VibeFID Example Card
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
