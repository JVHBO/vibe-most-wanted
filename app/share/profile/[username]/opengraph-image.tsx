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

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

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
        {/* Background effects */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at 20% 20%, rgba(255, 215, 0, 0.15) 0%, transparent 45%)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '30px',
            zIndex: 1,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              border: '5px solid #FFD700',
              boxShadow: '0 0 40px rgba(255, 215, 0, 0.8)',
              background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '56px',
              fontWeight: 900,
              color: '#1a0a00',
            }}
          >
            {getInitials(username)}
          </div>

          {/* Username */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 900,
              color: '#FFD700',
              letterSpacing: '2px',
              textShadow: '0 0 30px rgba(255, 215, 0, 0.8)',
              display: 'flex',
            }}
          >
            {username}
          </div>

          {/* Branding */}
          <div
            style={{
              fontSize: '36px',
              fontWeight: 900,
              color: '#FFD700',
              letterSpacing: '4px',
              textShadow: '0 0 25px rgba(255, 215, 0, 0.8)',
              display: 'flex',
              marginTop: '20px',
            }}
          >
            VIBE MOST WANTED
          </div>
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
}
