import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Profile - VIBE Most Wanted';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

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
          background: 'linear-gradient(135deg, #1a1a1a 0%, #121212 100%)',
          position: 'relative',
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
            background: 'radial-gradient(circle at 50% 40%, rgba(255, 215, 0, 0.08) 0%, transparent 50%)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '25px',
            zIndex: 1,
          }}
        >
          {/* Avatar with initials */}
          <div
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              border: '6px solid #FFD700',
              boxShadow: '0 0 40px rgba(255, 215, 0, 0.6)',
              background: 'linear-gradient(135deg, #C9A227 0%, #FFD700 50%, #C9A227 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '72px',
              fontWeight: 900,
              color: '#121212',
            }}
          >
            {username.substring(0, 2).toUpperCase()}
          </div>

          {/* Username */}
          <div
            style={{
              fontSize: '52px',
              fontWeight: 900,
              color: '#FFD700',
              letterSpacing: '1px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
              display: 'flex',
            }}
          >
            {username}
          </div>

          {/* Branding */}
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '1px',
              marginTop: '15px',
              display: 'flex',
            }}
          >
            VIBE MOST WANTED
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
