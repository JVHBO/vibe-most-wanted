import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Battle Result - VIBE Most Wanted';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

export default async function Image({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  try {
    const decoded = decodeURIComponent(matchId);
    // Support both old format (_) and new format (|)
    const parts = decoded.includes('|') ? decoded.split('|') : decoded.split('_');
    const result = parts[0] || 'win';
    const playerPower = parts[1] || '0';
    const opponentPower = parts[2] || '0';
    const opponentName = parts[3] ? decodeURIComponent(parts[3]) : 'Opponent';
    const playerName = parts[4] ? decodeURIComponent(parts[4]) : 'YOU';
    const battleType = parts[5] || 'pve';

    // Check for special opponents and use their images
    const mechaUrl = 'https://www.vibemostwanted.xyz/images/mecha-george-floyd.jpg';
    const nicoUrl = 'https://www.vibemostwanted.xyz/images/nico.png';

    let finalPlayerPfpUrl = '';
    let finalOpponentPfpUrl = '';

    // Fetch player PFP from Convex (same logic as profile OG)
    if (playerName) {
      try {
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
        const response = await fetch(`${convexUrl}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: 'profiles:getProfileByUsername',
            args: { username: playerName.toLowerCase() },
            format: 'json',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.value?.twitterProfileImageUrl) {
            finalPlayerPfpUrl = data.value.twitterProfileImageUrl;
          }
        }
      } catch (e) {
        // Ignore errors, will use fallback
      }
    }

    // Fetch opponent PFP from Convex (same logic as player)
    if (opponentName) {
      try {
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
        const response = await fetch(`${convexUrl}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: 'profiles:getProfileByUsername',
            args: { username: opponentName.toLowerCase() },
            format: 'json',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.value?.twitterProfileImageUrl) {
            finalOpponentPfpUrl = data.value.twitterProfileImageUrl;
          }
        }
      } catch (e) {
        // Ignore errors, will use fallback
      }
    }

    // Special handling for known users (hardcoded fallbacks)
    if (playerName.toLowerCase() === 'nico' && !finalPlayerPfpUrl) {
      finalPlayerPfpUrl = nicoUrl;
    }

    if (opponentName.toLowerCase().includes('mecha')) {
      finalOpponentPfpUrl = mechaUrl;
    } else if (opponentName.toLowerCase().includes('nico') && !finalOpponentPfpUrl) {
      finalOpponentPfpUrl = nicoUrl;
    }

    // Convert external URLs to use proxy for Edge Runtime compatibility
    const proxyUrl = (url: string) => {
      if (!url) return '';
      if (url.startsWith('https://www.vibemostwanted.xyz/')) return url;
      if (url.startsWith('https://vibe-most-wanted.vercel.app/')) return url;
      return `https://www.vibemostwanted.xyz/api/proxy-image?url=${encodeURIComponent(url)}`;
    };

    finalPlayerPfpUrl = proxyUrl(finalPlayerPfpUrl);
    finalOpponentPfpUrl = proxyUrl(finalOpponentPfpUrl);

    const isWin = result === 'win';

    // Determine which card should be red (losing side)
    const playerPowerNum = parseInt(playerPower);
    const opponentPowerNum = parseInt(opponentPower);
    const playerIsLosing = playerPowerNum < opponentPowerNum;

    // Playing card component (tilted rectangle style like foto.jpg)
    const Card = ({ username, power, isPlayer, isLosing, pfpUrl, backgroundImage }: {
      username: string;
      power: string;
      isPlayer: boolean;
      isLosing: boolean;
      pfpUrl?: string;
      backgroundImage?: string;
    }) => (
      <div
        style={{
          width: '380px',
          height: '480px',
          borderRadius: '12px',
          border: isLosing ? '6px solid #DC2626' : '6px solid #FFD700',
          boxShadow: isLosing
            ? '0 15px 50px rgba(220, 38, 38, 0.6)'
            : '0 15px 50px rgba(255, 215, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          position: 'relative',
          transform: isPlayer ? 'rotate(-3deg)' : 'rotate(3deg)',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {/* Background image */}
        {backgroundImage && (
          <img
            src={backgroundImage}
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
        )}

        {/* Dark overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
          }}
        />

        {/* Content container */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '25px',
          }}
        >
          {/* Top label */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '15px',
            }}
          >
            <div
              style={{
                background: 'rgba(18, 18, 18, 0.9)',
                padding: '8px 24px',
                borderRadius: '8px',
                border: '2px solid rgba(255, 215, 0, 0.8)',
                fontSize: '24px',
                fontWeight: 900,
                color: '#FFD700',
                letterSpacing: '2px',
              }}
            >
              {isPlayer ? 'YOU' : 'OPP'}
            </div>
          </div>

          {/* Spacer to push content to bottom */}
          <div style={{ flex: 1 }} />

          {/* Bottom section with PFP, Username & Power */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* PFP Circle - Only show if URL exists */}
            {pfpUrl && (
              <img
                src={pfpUrl}
                style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  border: isLosing ? '4px solid #DC2626' : '4px solid #FFD700',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
                  objectFit: 'cover',
                }}
              />
            )}

            {/* Username */}
            <div
              style={{
                fontSize: '26px',
                fontWeight: 900,
                color: '#FFD700',
                textAlign: 'center',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {username}
            </div>

            {/* Power */}
            <div
              style={{
                fontSize: '52px',
                fontWeight: 900,
                color: '#FFD700',
                textShadow: '0 3px 15px rgba(0, 0, 0, 0.8)',
              }}
            >
              {power}
            </div>
          </div>
        </div>
      </div>
    );

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #121212 100%)',
            position: 'relative',
            padding: '25px 0',
          }}
        >
          {/* Subtle glow */}
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

          {/* Result badge at top */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(18, 18, 18, 0.8)',
              padding: '12px 40px',
              borderRadius: '15px',
              border: '3px solid #FFD700',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)',
              zIndex: 2,
            }}
          >
            <div
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#FFD700',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
                letterSpacing: '3px',
              }}
            >
              {isWin ? '🏆 VICTORY' : '💀 DEFEAT'}
            </div>
          </div>

          {/* Cards container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '60px',
              zIndex: 1,
            }}
          >
            {/* Player card */}
            <Card
              username={playerName}
              power={playerPower}
              isPlayer={true}
              isLosing={playerIsLosing}
              pfpUrl={finalPlayerPfpUrl}
              backgroundImage="https://vibe-most-wanted.vercel.app/fundo1.jpg"
            />

            {/* VS badge */}
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: '#FFD700',
                border: '5px solid #121212',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '42px',
                fontWeight: 900,
                color: '#121212',
                boxShadow: '0 0 40px rgba(255, 215, 0, 0.8)',
                zIndex: 10,
              }}
            >
              VS
            </div>

            {/* Opponent card */}
            <Card
              username={opponentName}
              power={opponentPower}
              isPlayer={false}
              isLosing={!playerIsLosing}
              pfpUrl={finalOpponentPfpUrl}
              backgroundImage="https://vibe-most-wanted.vercel.app/fundo2.jpg"
            />
          </div>

          {/* Branding at bottom */}
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '1px',
              zIndex: 2,
            }}
          >
            VIBE MOST WANTED
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
  } catch (e: any) {
    // Fallback error image
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
            color: '#fff',
            fontSize: '40px',
          }}
        >
          Battle Result
        </div>
      ),
      { ...size }
    );
  }
}
