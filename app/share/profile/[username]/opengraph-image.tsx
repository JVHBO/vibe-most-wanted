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
        }}
      >
        {/* Username */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: '#FFD700',
            textShadow: '0 4px 20px rgba(255, 215, 0, 0.6)',
            display: 'flex',
          }}
        >
          {username}
        </div>

        {/* Branding */}
        <div
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.5)',
            marginTop: '30px',
            display: 'flex',
          }}
        >
          VIBE MOST WANTED
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
