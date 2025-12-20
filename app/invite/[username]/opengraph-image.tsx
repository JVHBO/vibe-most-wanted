import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Join VIBE Most Wanted';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  let pfpUrl = '';

  // Fetch referrer profile data from Convex
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
    const response = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'profiles:getProfileByUsername',
        args: { username: username.toLowerCase() },
        format: 'json',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.value) {
        pfpUrl = data.value.farcasterPfpUrl || data.value.twitterProfileImageUrl || '';
      }
    }
  } catch (e) {
    // Use defaults
  }

  // Proxy external images for Edge Runtime
  const proxyUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('https://www.vibemostwanted.xyz/')) return url;
    if (url.startsWith('https://vibe-most-wanted.vercel.app/')) return url;
    return `https://www.vibemostwanted.xyz/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  const finalPfpUrl = proxyUrl(pfpUrl);
  const backgroundUrl = 'https://www.vibemostwanted.xyz/referral-bg.jpg';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          position: 'relative',
        }}
      >
        {/* Background Image */}
        <img
          src={backgroundUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Dark Overlay with gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(20, 20, 40, 0.9) 100%)',
            display: 'flex',
          }}
        />

        {/* Content Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
          }}
        >
          {/* Top Badge */}
          <div
            style={{
              position: 'absolute',
              top: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 215, 0, 0.15)',
              padding: '12px 24px',
              borderRadius: '50px',
              border: '2px solid rgba(255, 215, 0, 0.3)',
            }}
          >
            <span style={{ fontSize: '28px' }}>🎴</span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#FFD700',
                letterSpacing: '2px',
              }}
            >
              VIBE MOST WANTED
            </span>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: '40px',
            }}
          >
            {/* PFP Circle */}
            {finalPfpUrl ? (
              <img
                src={finalPfpUrl}
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  border: '5px solid #FFD700',
                  boxShadow: '0 10px 40px rgba(255, 215, 0, 0.4)',
                  objectFit: 'cover',
                  marginBottom: '24px',
                }}
              />
            ) : (
              <div
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  border: '5px solid #FFD700',
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '60px',
                  marginBottom: '24px',
                }}
              >
                🎮
              </div>
            )}

            {/* Username */}
            <div
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#FFD700',
                textShadow: '0 4px 20px rgba(255, 215, 0, 0.5)',
                display: 'flex',
                marginBottom: '16px',
              }}
            >
              @{username}
            </div>

            {/* Invited Text */}
            <div
              style={{
                fontSize: '32px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                marginBottom: '32px',
              }}
            >
              invited you to play!
            </div>

            {/* Features Row */}
            <div
              style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '12px 20px',
                  borderRadius: '12px',
                }}
              >
                <span style={{ fontSize: '24px' }}>⚔️</span>
                <span style={{ fontSize: '18px', color: '#fff', fontWeight: 600 }}>Card Battles</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '12px 20px',
                  borderRadius: '12px',
                }}
              >
                <span style={{ fontSize: '24px' }}>🃏</span>
                <span style={{ fontSize: '18px', color: '#fff', fontWeight: 600 }}>Poker Mode</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '12px 20px',
                  borderRadius: '12px',
                }}
              >
                <span style={{ fontSize: '24px' }}>💀</span>
                <span style={{ fontSize: '18px', color: '#fff', fontWeight: 600 }}>Raid Boss</span>
              </div>
            </div>

            {/* CTA Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                padding: '20px 60px',
                borderRadius: '16px',
                boxShadow: '0 8px 30px rgba(255, 215, 0, 0.4)',
              }}
            >
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 900,
                  color: '#000',
                  letterSpacing: '3px',
                }}
              >
                JOIN US
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
