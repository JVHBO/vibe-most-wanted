import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VibeFID Card - VIBE Most Wanted';
export const size = {
  width: 500,
  height: 700,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;

  try {
    // Fetch card data from Convex
    let cardData: any = null;

    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
      const response = await fetch(`${convexUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'farcasterCards:getFarcasterCardByFid',
          args: { fid: parseInt(fid) },
          format: 'json',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          cardData = data.value;
        }
      }
    } catch (e) {
      console.error('Failed to fetch card data:', e);
    }

    // If card is minted, use minted card data
    if (cardData) {
      const color = cardData.color;
      const rank = cardData.rank;
      const suitSymbol = cardData.suitSymbol;
      const pfpUrl = cardData.pfpUrl;
      const displayName = cardData.displayName || cardData.username;
      const rarity = cardData.rarity;
      const neynarScore = cardData.neynarScore || 0;
      const bounty = cardData.power * 10;

      // Generate vintage date from FID (same logic as card generation)
      let year: number;
      const fidNum = parseInt(fid);
      if (fidNum <= 1000) {
        year = 1920 + Math.floor(((fidNum - 1) / 999) * 10);
      } else if (fidNum <= 10000) {
        year = 1930 + Math.floor(((fidNum - 1000) / 9000) * 20);
      } else if (fidNum <= 100000) {
        year = 1950 + Math.floor(((fidNum - 10000) / 90000) * 30);
      } else if (fidNum <= 500000) {
        year = 1980 + Math.floor(((fidNum - 100000) / 400000) * 20);
      } else {
        year = 2000 + Math.floor(((fidNum - 500000) / 500000) * 25);
      }

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[fidNum % 12];

      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              position: 'relative',
              background: '#f5f5dc', // Vintage beige
            }}
          >
            {/* Border */}
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                right: '10px',
                bottom: '10px',
                border: '4px solid #000',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Top Left - Rank and Suit */}
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '30px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: color === 'red' ? '#dc143c' : '#000',
                }}
              >
                <div style={{ fontSize: '60px', fontWeight: 900, lineHeight: 1, fontFamily: 'serif' }}>
                  {rank}
                </div>
                <div style={{ fontSize: '50px', lineHeight: 1, fontFamily: 'serif' }}>
                  {suitSymbol}
                </div>
              </div>

              {/* Top Center - FID and Score */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '0',
                  right: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: '#000',
                }}
              >
                <div style={{ fontSize: '20px', fontFamily: 'monospace' }}>
                  fid:{fid}
                </div>
                <div style={{ fontSize: '18px', fontFamily: 'monospace', marginTop: '5px' }}>
                  neynar score: {neynarScore.toFixed(2)}
                </div>
              </div>

              {/* Center - Bounty */}
              <div
                style={{
                  position: 'absolute',
                  top: '180px',
                  left: '0',
                  right: '0',
                  display: 'flex',
                  justifyContent: 'center',
                  color: '#000',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'serif' }}>
                  BOUNTY REWARD: ${bounty.toLocaleString()}
                </div>
              </div>

              {/* Center - Profile Picture */}
              <div
                style={{
                  position: 'absolute',
                  top: '200px',
                  left: '100px',
                  width: '300px',
                  height: '300px',
                  border: '3px solid #000',
                  display: 'flex',
                }}
              >
                <img
                  src={pfpUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>

              {/* Below PFP - Display Name */}
              <div
                style={{
                  position: 'absolute',
                  top: '540px',
                  left: '0',
                  right: '0',
                  display: 'flex',
                  justifyContent: 'center',
                  color: '#000',
                }}
              >
                <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'serif' }}>
                  {displayName}
                </div>
              </div>

              {/* Below Name - Crime Text */}
              <div
                style={{
                  position: 'absolute',
                  top: '575px',
                  left: '25px',
                  right: '25px',
                  display: 'flex',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: '#000',
                }}
              >
                <div style={{ fontSize: '14px', fontFamily: 'serif' }}>
                  Caught redhanded stealing vibes from the timeline
                </div>
              </div>

              {/* Bottom Right - Upside Down Rank/Suit */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '30px',
                  right: '30px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: 'rotate(180deg)',
                  color: color === 'red' ? '#dc143c' : '#000',
                }}
              >
                <div style={{ fontSize: '60px', fontWeight: 900, lineHeight: 1, fontFamily: 'serif' }}>
                  {rank}
                </div>
                <div style={{ fontSize: '50px', lineHeight: 1, fontFamily: 'serif' }}>
                  {suitSymbol}
                </div>
              </div>

              {/* Bottom Left - Wanted Since */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '15px',
                  left: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  color: '#000',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif' }}>
                  WANTED SINCE:
                </div>
                <div style={{ fontSize: '14px', fontFamily: 'serif', marginTop: '2px' }}>
                  {month} {year}
                </div>
              </div>

              {/* Bottom Center - Rarity */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '0',
                  right: '0',
                  display: 'flex',
                  justifyContent: 'center',
                  color: '#000',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif', textTransform: 'uppercase' }}>
                  {rarity}
                </div>
              </div>
            </div>
          </div>
        ),
        { ...size }
      );
    }

    // Fallback if card not minted - fetch from Neynar and generate preview
    try {
      const neynarApiKey = process.env.NEYNAR_API_KEY!;
      const neynarResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          headers: {
            'accept': 'application/json',
            'api_key': neynarApiKey,
          },
        }
      );

      if (neynarResponse.ok) {
        const neynarData = await neynarResponse.json();
        const userData = neynarData.users?.[0];

        if (userData) {
          // Calculate rarity and traits
          const score = userData.experimental?.neynar_user_score || 0;
          const calculateRarity = (score: number) => {
            if (score >= 0.95) return 'Legendary';
            if (score >= 0.85) return 'Epic';
            if (score >= 0.70) return 'Rare';
            return 'Common';
          };
          const rarity = calculateRarity(score);

          // Generate rank based on rarity
          const generateRank = (rarity: string) => {
            if (rarity === 'Legendary') return 'K';
            if (rarity === 'Epic') return 'Q';
            if (rarity === 'Rare') return 'J';
            return '10';
          };
          const rank = generateRank(rarity);
          const suitSymbol = '♥';
          const color = 'red';

          const basePower = rarity === 'Legendary' ? 240 : rarity === 'Epic' ? 80 : rarity === 'Rare' ? 20 : 5;
          const bounty = basePower * 10;

          // Generate vintage date
          let year: number;
          const fidNum = parseInt(fid);
          if (fidNum <= 1000) {
            year = 1920 + Math.floor(((fidNum - 1) / 999) * 10);
          } else if (fidNum <= 10000) {
            year = 1930 + Math.floor(((fidNum - 1000) / 9000) * 20);
          } else if (fidNum <= 100000) {
            year = 1950 + Math.floor(((fidNum - 10000) / 90000) * 30);
          } else if (fidNum <= 500000) {
            year = 1980 + Math.floor(((fidNum - 100000) / 400000) * 20);
          } else {
            year = 2000 + Math.floor(((fidNum - 500000) / 500000) * 25);
          }

          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const month = monthNames[fidNum % 12];

          return new ImageResponse(
            (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  position: 'relative',
                  background: '#f5f5dc',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    right: '10px',
                    bottom: '10px',
                    border: '4px solid #000',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '20px',
                      left: '30px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      color: color === 'red' ? '#dc143c' : '#000',
                    }}
                  >
                    <div style={{ fontSize: '60px', fontWeight: 900, lineHeight: 1, fontFamily: 'serif' }}>
                      {rank}
                    </div>
                    <div style={{ fontSize: '50px', lineHeight: 1, fontFamily: 'serif' }}>
                      {suitSymbol}
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '0',
                      right: '0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      color: '#000',
                    }}
                  >
                    <div style={{ fontSize: '20px', fontFamily: 'monospace' }}>
                      fid:{fid}
                    </div>
                    <div style={{ fontSize: '18px', fontFamily: 'monospace', marginTop: '5px' }}>
                      neynar score: {score.toFixed(2)}
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '180px',
                      left: '0',
                      right: '0',
                      display: 'flex',
                      justifyContent: 'center',
                      color: '#000',
                    }}
                  >
                    <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'serif' }}>
                      BOUNTY REWARD: ${bounty.toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '200px',
                      left: '100px',
                      width: '300px',
                      height: '300px',
                      border: '3px solid #000',
                      display: 'flex',
                    }}
                  >
                    <img
                      src={userData.pfp_url}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '540px',
                      left: '0',
                      right: '0',
                      display: 'flex',
                      justifyContent: 'center',
                      color: '#000',
                    }}
                  >
                    <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'serif' }}>
                      {userData.display_name || userData.username}
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: '575px',
                      left: '25px',
                      right: '25px',
                      display: 'flex',
                      justifyContent: 'center',
                      textAlign: 'center',
                      color: '#000',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontFamily: 'serif' }}>
                      Not minted yet - Mint your VibeFID!
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '30px',
                      right: '30px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      transform: 'rotate(180deg)',
                      color: color === 'red' ? '#dc143c' : '#000',
                    }}
                  >
                    <div style={{ fontSize: '60px', fontWeight: 900, lineHeight: 1, fontFamily: 'serif' }}>
                      {rank}
                    </div>
                    <div style={{ fontSize: '50px', lineHeight: 1, fontFamily: 'serif' }}>
                      {suitSymbol}
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '15px',
                      left: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      color: '#000',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif' }}>
                      WANTED SINCE:
                    </div>
                    <div style={{ fontSize: '14px', fontFamily: 'serif', marginTop: '2px' }}>
                      {month} {year}
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '0',
                      right: '0',
                      display: 'flex',
                      justifyContent: 'center',
                      color: '#000',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'serif', textTransform: 'uppercase' }}>
                      {rarity}
                    </div>
                  </div>
                </div>
              </div>
            ),
            { ...size }
          );
        }
      }
    } catch (neynarError) {
      console.error('Neynar fetch error:', neynarError);
    }

    // Ultimate fallback
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5dc',
            color: '#000',
            fontSize: '32px',
            fontWeight: 900,
            fontFamily: 'serif',
          }}
        >
          VibeFID Card #{fid}
        </div>
      ),
      { ...size }
    );
  } catch (e: any) {
    console.error('OG Image error:', e);
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5dc',
            color: '#000',
            fontSize: '32px',
            fontWeight: 900,
            fontFamily: 'serif',
          }}
        >
          VibeFID Card
        </div>
      ),
      { ...size }
    );
  }
}
