import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pack Opening - $VBMS';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
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
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.15) 0%, transparent 60%)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          {/* Pack emoji */}
          <span style={{ fontSize: '120px', marginBottom: '20px' }}>🎴</span>

          {/* Title */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 900,
              color: '#FFD700',
              textShadow: '0 4px 30px rgba(255, 215, 0, 0.5)',
              display: 'flex',
              marginBottom: '16px',
            }}
          >
            PACK OPENING
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '32px',
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              marginBottom: '40px',
            }}
          >
            Check out my pulls!
          </div>

          {/* Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '28px', fontWeight: 700, color: 'rgba(255, 215, 0, 0.8)', display: 'flex' }}>
              $VBMS
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
