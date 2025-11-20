import { ImageResponse } from 'next/og';
import { getUserByFid, calculateRarityFromScore, generateRandomSuit, getSuitSymbol, getSuitColor, generateRankFromRarity } from '@/lib/neynar';

export const runtime = 'edge';
export const size = {
  width: 500,
  height: 700,
};

/**
 * Generate example VibeFID card using real data from FID #1
 * Recreates EXACT card generation from lib/generateFarcasterCard.ts
 */
export async function GET() {
  try {
    // Fetch real data for FID #1
    const fid = 1;
    const user = await getUserByFid(fid);

    if (!user) {
      throw new Error('User not found');
    }

    const score = user.experimental?.neynar_user_score || 0;
    const rarity = calculateRarityFromScore(score);
    const suit = 'hearts'; // Fixed for example
    const suitSymbol = getSuitSymbol(suit);
    const color = getSuitColor(suit);
    const rank = generateRankFromRarity(rarity);

    // Calculate bounty
    const basePower = rarity === 'Mythic' ? 800 : rarity === 'Legendary' ? 240 : rarity === 'Epic' ? 80 : rarity === 'Rare' ? 20 : 5;
    const bounty = basePower * 10;

    // Generate vintage date from FID (same logic as original)
    let year: number;
    if (fid <= 1000) {
      year = 1920 + Math.floor(((fid - 1) / 999) * 10);
    } else if (fid <= 10000) {
      year = 1930 + Math.floor(((fid - 1000) / 9000) * 20);
    } else if (fid <= 100000) {
      year = 1950 + Math.floor(((fid - 10000) / 90000) * 30);
    } else if (fid <= 500000) {
      year = 1980 + Math.floor(((fid - 100000) / 400000) * 20);
    } else {
      year = 2000 + Math.floor(((fid - 500000) / 500000) * 25);
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[fid % 12];

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
                neynar score: {score.toFixed(2)}
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
                src={user.pfp_url}
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
                {user.display_name || user.username}
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
  } catch (e: any) {
    console.error('Example card error:', e);
    // Fallback
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
          VibeFID Card Example
        </div>
      ),
      { ...size }
    );
  }
}
