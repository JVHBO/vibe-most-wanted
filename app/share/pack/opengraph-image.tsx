import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pack Opening - VIBE Most Wanted';
export const size = {
  width: 1200,
  height: 800,
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
          position: 'relative',
          background: '#0a0a0a',
        }}
      >
        {/* Background pack cover image - full cover */}
        <img
          src="https://www.vibemostwanted.xyz/pack-cover.png"
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Dark overlay for text readability */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            height: '100%',
            paddingBottom: '80px',
            zIndex: 1,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 900,
              color: '#FFD700',
              textShadow: '0 4px 30px rgba(0, 0, 0, 0.8)',
              display: 'flex',
            }}
          >
            🎴 Pack Opening!
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.9)',
              marginTop: '16px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
              display: 'flex',
            }}
          >
            Check out my pulls!
          </div>

          {/* Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '32px',
            }}
          >
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)', textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)' }}>
              VIBE MOST WANTED
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
