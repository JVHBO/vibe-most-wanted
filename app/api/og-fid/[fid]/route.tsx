import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Dynamic VibeFID card image generator
 * Generates a card image for any FID by fetching data from Convex
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;
    const fidNumber = parseInt(fid);

    // Fetch card data from Convex
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
    const response = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'farcasterCards:getFarcasterCardByFid',
        args: { fid: fidNumber },
        format: 'json',
      }),
    });

    if (!response.ok) {
      return new Response('Card not found', { status: 404 });
    }

    const data = await response.json();
    const card = data.value;

    if (!card) {
      return new Response('Card not found', { status: 404 });
    }

    // Calculate deterministic traits from FID
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
    const rarityColors: Record<string, { bg: string; border: string; text: string }> = {
      Common: { bg: '#374151', border: '#6B7280', text: '#D1D5DB' },
      Rare: { bg: '#1E3A5F', border: '#3B82F6', text: '#93C5FD' },
      Epic: { bg: '#4C1D95', border: '#8B5CF6', text: '#C4B5FD' },
      Legendary: { bg: '#78350F', border: '#F59E0B', text: '#FCD34D' },
      Mythic: { bg: '#7F1D1D', border: '#EF4444', text: '#FCA5A5' },
    };

    const colors = rarityColors[card.rarity] || rarityColors.Common;

    // Try to fetch PFP
    let pfpBase64 = '';
    if (card.pfpUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const pfpResponse = await fetch(card.pfpUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (pfpResponse.ok) {
          const pfpBuffer = await pfpResponse.arrayBuffer();
          pfpBase64 = `data:image/jpeg;base64,${Buffer.from(pfpBuffer).toString('base64')}`;
        }
      } catch (e) {
        console.log('Failed to fetch PFP');
      }
    }

    // Card suit symbol and color
    const suitColor = card.color === 'red' ? '#EF4444' : '#FFFFFF';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: `linear-gradient(135deg, ${colors.bg} 0%, #0a0a0a 100%)`,
            border: `8px solid ${colors.border}`,
            borderRadius: '24px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Foil effect overlay */}
          {traits.foil !== 'None' && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: traits.foil === 'Prize'
                  ? 'linear-gradient(135deg, rgba(255,215,0,0.3) 0%, transparent 50%, rgba(255,215,0,0.3) 100%)'
                  : 'linear-gradient(135deg, rgba(192,192,192,0.2) 0%, transparent 50%, rgba(192,192,192,0.2) 100%)',
                display: 'flex',
              }}
            />
          )}

          {/* Header - FID and Rarity */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 900, color: colors.text }}>
              #{fid}
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: colors.border,
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              {card.rarity}
            </div>
          </div>

          {/* Card Suit - Top Left */}
          <div
            style={{
              position: 'absolute',
              top: '80px',
              left: '32px',
              fontSize: '48px',
              color: suitColor,
              fontWeight: 900,
              display: 'flex',
            }}
          >
            {card.rank}{card.suitSymbol}
          </div>

          {/* Profile Picture */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
            }}
          >
            {pfpBase64 ? (
              <img
                src={pfpBase64}
                width={280}
                height={280}
                style={{
                  borderRadius: '50%',
                  border: `6px solid ${colors.border}`,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '280px',
                  height: '280px',
                  borderRadius: '50%',
                  border: `6px solid ${colors.border}`,
                  background: colors.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '80px',
                  color: colors.text,
                  fontWeight: 900,
                }}
              >
                {card.username?.substring(0, 2).toUpperCase() || '??'}
              </div>
            )}
          </div>

          {/* Username */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '16px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: '#FFFFFF',
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}
            >
              @{card.username}
            </div>
          </div>

          {/* Stats Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              marginTop: 'auto',
              padding: '16px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 600 }}>POWER</div>
              <div style={{ fontSize: '28px', color: '#FFD700', fontWeight: 900 }}>{power}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 600 }}>FOIL</div>
              <div style={{ fontSize: '20px', color: traits.foil === 'Prize' ? '#FFD700' : traits.foil === 'Standard' ? '#C0C0C0' : '#6B7280', fontWeight: 700 }}>
                {traits.foil}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 600 }}>WEAR</div>
              <div style={{ fontSize: '16px', color: '#D1D5DB', fontWeight: 600 }}>{traits.wear}</div>
            </div>
          </div>

          {/* Bottom Branding */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '16px',
            }}
          >
            <div style={{ fontSize: '16px', color: '#FFD700', fontWeight: 700, letterSpacing: '2px' }}>
              VIBE MOST WANTED
            </div>
          </div>
        </div>
      ),
      {
        width: 500,
        height: 700,
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate',
        },
      }
    );
  } catch (e: any) {
    console.error('OG FID error:', e);
    return new Response('Error generating image', { status: 500 });
  }
}

// Deterministic trait calculation (must match frontend)
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
