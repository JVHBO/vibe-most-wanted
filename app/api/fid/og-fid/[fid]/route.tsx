import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;
    const fidNumber = parseInt(fid);

    // Fetch card data from Convex
    const convexUrl = "https://agile-orca-761.convex.cloud";
    let card: any = null;

    try {
      const response = await fetch(`${convexUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'farcasterCards:getFarcasterCardByFid',
          args: { fid: fidNumber },
          format: 'json',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        card = data.value;
      }
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
    }

    if (!card) {
      // Return simple fallback if no card found
      return new ImageResponse(
        (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: 'white',
            fontSize: 48,
            fontWeight: 900,
          }}>
            VibeFID #{fid} - Not Found
          </div>
        ),
        { width: 500, height: 700 }
      );
    }

    // Calculate deterministic traits
    const traits = getFidTraits(fidNumber);

    // Calculate power
    const rarityBasePower: Record<string, number> = {
      Common: 10, Rare: 20, Epic: 50, Legendary: 100, Mythic: 600,
    };
    const wearMultiplier: Record<string, number> = {
      Pristine: 1.8, Mint: 1.4, 'Lightly Played': 1.0, 'Moderately Played': 1.0, 'Heavily Played': 1.0,
    };
    const foilMultiplier: Record<string, number> = {
      Prize: 6.0, Standard: 2.0, None: 1.0,
    };
    const power = Math.round(
      (rarityBasePower[card.rarity] || 10) *
      (wearMultiplier[traits.wear] || 1.0) *
      (foilMultiplier[traits.foil] || 1.0)
    );

    // Rarity colors
    const rarityColors: Record<string, string> = {
      Common: '#6B7280',
      Rare: '#3B82F6',
      Epic: '#8B5CF6',
      Legendary: '#F59E0B',
      Mythic: '#EF4444',
    };
    const borderColor = rarityColors[card.rarity] || '#6B7280';

    // Card suit color
    const suitColor = card.color === 'red' ? '#EF4444' : '#FFFFFF';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
            border: `8px solid ${borderColor}`,
            padding: 32,
          }}
        >
          {/* FID Number */}
          <div style={{ color: borderColor, fontSize: 28, fontWeight: 900, marginBottom: 16 }}>
            VibeFID #{fid}
          </div>

          {/* Card Suit */}
          <div style={{ color: suitColor, fontSize: 64, fontWeight: 900, marginBottom: 16 }}>
            {card.rank}{card.suitSymbol}
          </div>

          {/* Username */}
          <div style={{ color: '#FFFFFF', fontSize: 36, fontWeight: 900, marginBottom: 8 }}>
            @{card.username}
          </div>

          {/* Display Name */}
          <div style={{ color: '#9CA3AF', fontSize: 20, marginBottom: 24 }}>
            {card.displayName}
          </div>

          {/* Rarity */}
          <div style={{ color: borderColor, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            {card.rarity}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, marginTop: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ color: '#FFD700', fontSize: 32, fontWeight: 900 }}>{power}</div>
              <div style={{ color: '#6B7280', fontSize: 14 }}>POWER</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ color: traits.foil === 'Prize' ? '#FFD700' : traits.foil === 'Standard' ? '#C0C0C0' : '#6B7280', fontSize: 20, fontWeight: 700 }}>
                {traits.foil}
              </div>
              <div style={{ color: '#6B7280', fontSize: 14 }}>FOIL</div>
            </div>
          </div>

          {/* Branding */}
          <div style={{ color: '#FFD700', fontSize: 18, fontWeight: 700, marginTop: 32 }}>
            VibeFID
          </div>
        </div>
      ),
      {
        width: 500,
        height: 700,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      }
    );
  } catch (e: any) {
    console.error('OG FID error:', e);
    return new ImageResponse(
      (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a2e',
          color: '#EF4444',
          fontSize: 24,
        }}>
          Error: {e.message || 'Unknown error'}
        </div>
      ),
      { width: 500, height: 700 }
    );
  }
}

// Deterministic trait calculation
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function weightedRoll(seed: number, choices: { value: string; weight: number }[]): string {
  const total = choices.reduce((sum, c) => sum + c.weight, 0);
  let roll = seededRandom(seed) * total;
  for (const choice of choices) {
    roll -= choice.weight;
    if (roll <= 0) return choice.value;
  }
  return choices[choices.length - 1].value;
}

function getFoilProbabilities(fid: number) {
  if (fid <= 5000) return [{ value: 'Prize', weight: 100 }];
  if (fid <= 20000) return [{ value: 'Prize', weight: 80 }, { value: 'Standard', weight: 20 }];
  if (fid <= 100000) return [{ value: 'Prize', weight: 30 }, { value: 'Standard', weight: 60 }, { value: 'None', weight: 10 }];
  if (fid <= 250000) return [{ value: 'Prize', weight: 5 }, { value: 'Standard', weight: 35 }, { value: 'None', weight: 60 }];
  if (fid <= 500000) return [{ value: 'Prize', weight: 3 }, { value: 'Standard', weight: 25 }, { value: 'None', weight: 72 }];
  if (fid <= 1200000) return [{ value: 'Prize', weight: 1 }, { value: 'Standard', weight: 10 }, { value: 'None', weight: 89 }];
  return [{ value: 'Standard', weight: 5 }, { value: 'None', weight: 95 }];
}

function getWearProbabilities(fid: number) {
  if (fid <= 5000) return [{ value: 'Pristine', weight: 100 }];
  if (fid <= 20000) return [{ value: 'Pristine', weight: 90 }, { value: 'Mint', weight: 10 }];
  if (fid <= 100000) return [{ value: 'Pristine', weight: 50 }, { value: 'Mint', weight: 40 }, { value: 'Lightly Played', weight: 10 }];
  if (fid <= 250000) return [{ value: 'Pristine', weight: 2 }, { value: 'Mint', weight: 18 }, { value: 'Lightly Played', weight: 45 }, { value: 'Moderately Played', weight: 30 }, { value: 'Heavily Played', weight: 5 }];
  if (fid <= 500000) return [{ value: 'Mint', weight: 5 }, { value: 'Lightly Played', weight: 30 }, { value: 'Moderately Played', weight: 55 }, { value: 'Heavily Played', weight: 10 }];
  if (fid <= 1200000) return [{ value: 'Lightly Played', weight: 5 }, { value: 'Moderately Played', weight: 45 }, { value: 'Heavily Played', weight: 50 }];
  return [{ value: 'Moderately Played', weight: 10 }, { value: 'Heavily Played', weight: 90 }];
}

function getFidTraits(fid: number) {
  return {
    foil: weightedRoll(fid, getFoilProbabilities(fid)),
    wear: weightedRoll(fid * 2, getWearProbabilities(fid)),
  };
}
