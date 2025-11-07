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

  // Fetch profile data from Convex
  let pfpUrl = '';
  let totalPower = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let winRate = '0';

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
        pfpUrl = data.value.twitterProfileImageUrl || '';
        totalPower = data.value.stats?.totalPower || 0;
        totalWins = (data.value.stats?.pveWins || 0) + (data.value.stats?.pvpWins || 0);
        totalLosses = (data.value.stats?.pveLosses || 0) + (data.value.stats?.pvpLosses || 0);
        const totalMatches = totalWins + totalLosses;
        winRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0';
      }
    }
  } catch (e) {
    // Use defaults on error
  }

  // Convert external URLs to use proxy
  const proxyUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('https://www.vibemostwanted.xyz/')) return url;
    if (url.startsWith('https://vibe-most-wanted.vercel.app/')) return url;
    return `https://www.vibemostwanted.xyz/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  pfpUrl = proxyUrl(pfpUrl);

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
          background: '#000',
          position: 'relative',
        }}
      >
        {/* Background image */}
        <img
          src="https://www.vibemostwanted.xyz/profile-bg.jpg"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />

        {/* Dark overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.7)',
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
          {/* Avatar - Only show if URL exists */}
          {pfpUrl && (
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
          )}

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

          {/* Stats */}
          <div
            style={{
              display: 'flex',
              gap: '30px',
              marginTop: '15px',
            }}
          >
            {/* Total Power */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(18, 18, 18, 0.8)',
                padding: '15px 30px',
                borderRadius: '12px',
                border: '3px solid #FFD700',
              }}
            >
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFD700' }}>
                {totalPower.toLocaleString()}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255, 215, 0, 0.7)' }}>
                POWER
              </div>
            </div>

            {/* Wins */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(18, 18, 18, 0.8)',
                padding: '15px 30px',
                borderRadius: '12px',
                border: '3px solid #FFD700',
              }}
            >
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFD700' }}>
                {totalWins}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255, 215, 0, 0.7)' }}>
                WINS
              </div>
            </div>

            {/* Losses */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(18, 18, 18, 0.8)',
                padding: '15px 30px',
                borderRadius: '12px',
                border: '3px solid #C0C0C0',
              }}
            >
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#C0C0C0' }}>
                {totalLosses}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(192, 192, 192, 0.7)' }}>
                LOSSES
              </div>
            </div>

            {/* Win Rate */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(18, 18, 18, 0.8)',
                padding: '15px 30px',
                borderRadius: '12px',
                border: '3px solid #FFD700',
              }}
            >
              <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFD700' }}>
                {winRate}%
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255, 215, 0, 0.7)' }}>
                WIN RATE
              </div>
            </div>
          </div>

          {/* Branding */}
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '1px',
              marginTop: '25px',
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
