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

  // Try to fetch PFP from Convex
  let pfpUrl = '';
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'profiles:getProfileByUsername',
        args: { username: username.toLowerCase() },
        format: 'json',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      pfpUrl = data.value?.twitterProfileImageUrl || '';
    }
  } catch (e) {
    // Ignore errors
  }

  // If no PFP, use DiceBear as fallback
  if (!pfpUrl) {
    pfpUrl = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(username)}`;
  }

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
          {/* Avatar */}
          <img
            src={pfpUrl}
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              border: '6px solid #FFD700',
              boxShadow: '0 0 40px rgba(255, 215, 0, 0.6)',
              objectFit: 'cover',
            }}
          />

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
