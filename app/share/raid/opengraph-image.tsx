import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Raid Boss Battle - $VBMS';
export const size = {
  width: 1200,
  height: 800,
};
export const contentType = 'image/png';

export default async function Image() {
  let bossName = 'Raid Boss';
  let bossImageUrl = 'https://www.vibemostwanted.xyz/images/raid-bosses/vibe/legendary.png';
  let bossHp = 100;
  let maxHp = 1000000;
  let currentHp = 1000000;
  let bossRarity = 'LEGENDARY';

  // Fetch current boss data from Convex
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
    const response = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'raidBoss:getCurrentRaidBoss',
        args: {},
        format: 'json',
      }),
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.value) {
        bossName = data.value.name || 'Raid Boss';
        let imgUrl = data.value.imageUrl || bossImageUrl;
        if (imgUrl && imgUrl.startsWith("/")) {
          imgUrl = `https://www.vibemostwanted.xyz${imgUrl}`;
        }
        bossImageUrl = imgUrl;
        maxHp = data.value.maxHp || 1000000;
        currentHp = data.value.currentHp || maxHp;
        bossHp = Math.round((currentHp / maxHp) * 100);
        bossRarity = data.value.rarity?.toUpperCase() || 'LEGENDARY';
      }
    }
  } catch (e) {
    console.error('Failed to fetch raid boss data:', e);
  }

  // HP bar color based on percentage
  const getHpColor = (hp: number) => {
    if (hp > 50) return '#22c55e'; // green
    if (hp > 25) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const hpColor = getHpColor(bossHp);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          position: 'relative',
          background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0000 100%)',
        }}
      >
        {/* Red gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.2) 0%, transparent 70%)',
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
            padding: '60px',
            gap: '40px',
          }}
        >
          {/* Left Side - Boss Image */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bossImageUrl}
              alt={bossName}
              width={400}
              height={400}
              style={{
                borderRadius: '24px',
                border: '6px solid #dc2626',
                boxShadow: '0 0 60px rgba(220, 38, 38, 0.6)',
                objectFit: 'cover',
              }}
            />
          </div>

          {/* Right Side - Boss Info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              gap: '30px',
            }}
          >
            {/* Title */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#dc2626',
                  textShadow: '0 4px 20px rgba(220, 38, 38, 0.8)',
                  display: 'flex',
                }}
              >
                ⚔️ RAID BOSS BATTLE
              </div>
              <div
                style={{
                  fontSize: '64px',
                  fontWeight: 900,
                  color: '#FFD700',
                  textShadow: '0 4px 20px rgba(255, 215, 0, 0.6)',
                  display: 'flex',
                  lineHeight: 1.1,
                }}
              >
                {bossName}
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#FFD700',
                  display: 'flex',
                  opacity: 0.8,
                }}
              >
                {bossRarity}
              </div>
            </div>

            {/* HP Bar */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.9)',
                  display: 'flex',
                }}
              >
                Boss HP: {bossHp}%
              </div>
              <div
                style={{
                  width: '100%',
                  height: '60px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  borderRadius: '12px',
                  border: '4px solid rgba(220, 38, 38, 0.5)',
                  overflow: 'hidden',
                  display: 'flex',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${bossHp}%`,
                    height: '100%',
                    background: hpColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '28px',
                      fontWeight: 900,
                      color: '#000',
                      display: 'flex',
                    }}
                  >
                    {currentHp.toLocaleString()} / {maxHp.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginTop: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  color: '#FFD700',
                  display: 'flex',
                }}
              >
                🎮 Join the raid and earn rewards!
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                }}
              >
                • Set your attack deck
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                }}
              >
                • Auto-attack every 5 minutes
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                }}
              >
                • Earn $TESTVBMS from the reward pool
              </div>
            </div>

            {/* Branding */}
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.5)',
                display: 'flex',
                marginTop: '20px',
              }}
            >
              $VBMS
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
