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

  let pfpUrl = '';
  let power = '0';
  let wins = '0';
  let losses = '0';
  let winRate = '0%';

  // Fetch profile data from Convex
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
        power = data.value.stats?.totalPower?.toString() || '0';

        // Calculate total wins and losses from both PvE and PvP
        const pveWins = data.value.stats?.pveWins || 0;
        const pveLosses = data.value.stats?.pveLosses || 0;
        const pvpWins = data.value.stats?.pvpWins || 0;
        const pvpLosses = data.value.stats?.pvpLosses || 0;

        const totalWins = pveWins + pvpWins;
        const totalLosses = pveLosses + pvpLosses;

        wins = totalWins.toString();
        losses = totalLosses.toString();

        const totalBattles = totalWins + totalLosses;
        if (totalBattles > 0) {
          const rate = (totalWins / totalBattles * 100).toFixed(0);
          winRate = `${rate}%`;
        }
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
  const backgroundUrl = 'https://www.vibemostwanted.xyz/profile-bg.jpg';

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

        {/* Dark Overlay */}
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
            padding: '60px',
          }}
        >
          {/* PFP Circle */}
          {finalPfpUrl && (
            <img
              src={finalPfpUrl}
              style={{
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                border: '6px solid #FFD700',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)',
                objectFit: 'cover',
                marginBottom: '30px',
              }}
            />
          )}

          {/* Username */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 900,
              color: '#FFD700',
              textShadow: '0 4px 20px rgba(255, 215, 0, 0.6)',
              display: 'flex',
              marginBottom: '40px',
            }}
          >
            {username}
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: 'flex',
              gap: '40px',
              marginBottom: '30px',
            }}
          >
            {/* Power */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(18, 18, 18, 0.8)',
                padding: '20px 30px',
                borderRadius: '12px',
                border: '3px solid rgba(255, 215, 0, 0.5)',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                POWER
              </div>
              <div
                style={{
                  fontSize: '40px',
                  fontWeight: 900,
                  color: '#FFD700',
                  display: 'flex',
                }}
              >
                {power}
              </div>
            </div>

            {/* Wins */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(18, 18, 18, 0.8)',
                padding: '20px 30px',
                borderRadius: '12px',
                border: '3px solid rgba(255, 215, 0, 0.5)',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                WINS
              </div>
              <div
                style={{
                  fontSize: '40px',
                  fontWeight: 900,
                  color: '#FFD700',
                  display: 'flex',
                }}
              >
                {wins}
              </div>
            </div>

            {/* Losses */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(18, 18, 18, 0.8)',
                padding: '20px 30px',
                borderRadius: '12px',
                border: '3px solid rgba(255, 215, 0, 0.5)',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                LOSSES
              </div>
              <div
                style={{
                  fontSize: '40px',
                  fontWeight: 900,
                  color: '#FFD700',
                  display: 'flex',
                }}
              >
                {losses}
              </div>
            </div>

            {/* Win Rate */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'rgba(18, 18, 18, 0.8)',
                padding: '20px 30px',
                borderRadius: '12px',
                border: '3px solid rgba(255, 215, 0, 0.5)',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                WIN RATE
              </div>
              <div
                style={{
                  fontSize: '40px',
                  fontWeight: 900,
                  color: '#FFD700',
                  display: 'flex',
                }}
              >
                {winRate}
              </div>
            </div>
          </div>

          {/* Branding */}
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.5)',
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
