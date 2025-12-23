import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pack Opening - VIBE Most Wanted';
export const size = {
  width: 1200,
  height: 800,
};
export const contentType = 'image/png';

// Pack prices for PnL calculation
const PACK_PRICES: Record<string, number> = {
  starter: 0,
  basic: 1000,
  premium: 10000,
  elite: 100000,
  boosted: 5000,
  mission: 0,
  achievement: 0,
  dailyFree: 0,
};

// Burn values per rarity (based on pack price)
const BURN_RARITY_MULT: Record<string, number> = {
  Common: 0.2,
  Rare: 1.1,
  Epic: 4.0,
  Legendary: 40.0,
};

// Foil multipliers
const FOIL_MULT: Record<string, number> = {
  Prize: 5.0,
  Standard: 1.5,
  None: 1.0,
};

type Props = {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
};

export default async function Image({ searchParams }: Props) {
  const params = (await searchParams) || {};

  const packType = params.packType || 'basic';
  const legendary = parseInt(params.legendary || '0');
  const epic = parseInt(params.epic || '0');
  const rare = parseInt(params.rare || '0');
  const common = parseInt(params.common || '0');
  const totalPower = parseInt(params.totalPower || '0');
  const foilPrize = parseInt(params.foilPrize || '0');
  const foilStandard = parseInt(params.foilStandard || '0');
  const totalCards = parseInt(params.cards || '1');

  // Calculate burn value for this opening
  const packPrice = PACK_PRICES[packType] || 1000;
  const effectivePrice = packPrice > 0 ? packPrice : 1000; // Free packs use basic price for burn

  // Calculate total burn value
  let totalBurnValue = 0;

  // Base burn values (without foil - we'll add foil bonus separately)
  totalBurnValue += common * (effectivePrice * BURN_RARITY_MULT.Common);
  totalBurnValue += rare * (effectivePrice * BURN_RARITY_MULT.Rare);
  totalBurnValue += epic * (effectivePrice * BURN_RARITY_MULT.Epic);
  totalBurnValue += legendary * (effectivePrice * BURN_RARITY_MULT.Legendary);

  // Add foil bonuses (approximate - assumes foils are evenly distributed)
  // Prize foil cards get 5x, Standard get 1.5x
  // We need to estimate base value of foil cards
  const avgBurnPerCard = totalBurnValue / Math.max(totalCards, 1);
  const foilBonus = (foilPrize * avgBurnPerCard * (FOIL_MULT.Prize - 1)) +
                    (foilStandard * avgBurnPerCard * (FOIL_MULT.Standard - 1));
  totalBurnValue += foilBonus;

  // Calculate PnL
  const cost = packPrice * totalCards;
  const pnl = cost > 0 ? ((totalBurnValue - cost) / cost * 100) : 0;
  const pnlText = cost > 0
    ? (pnl >= 0 ? `+${pnl.toFixed(0)}%` : `${pnl.toFixed(0)}%`)
    : 'FREE';
  const pnlColor = pnl >= 0 ? '#22c55e' : '#ef4444';

  // Pack display name
  const packNames: Record<string, string> = {
    starter: 'Starter Pack',
    basic: 'Basic Pack',
    premium: 'Premium Pack',
    elite: 'Elite Pack',
    boosted: 'Luck Boost',
    mission: 'Mission Pack',
    achievement: 'Achievement Pack',
    dailyFree: 'Daily Free',
  };
  const packName = packNames[packType] || packType;

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
          position: 'relative',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            padding: '40px',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '48px' }}>🎴</span>
            <div
              style={{
                fontSize: '56px',
                fontWeight: 900,
                color: '#FFD700',
                textShadow: '0 4px 30px rgba(255, 215, 0, 0.5)',
                display: 'flex',
              }}
            >
              {packName}
            </div>
          </div>

          {/* Cards count */}
          <div
            style={{
              fontSize: '28px',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '32px',
              display: 'flex',
            }}
          >
            {totalCards} card{totalCards > 1 ? 's' : ''} opened
          </div>

          {/* Rarity breakdown */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '32px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {legendary > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 215, 0, 0.2)', padding: '12px 24px', borderRadius: '12px', border: '2px solid #FFD700' }}>
                <span style={{ fontSize: '32px' }}>🌟</span>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#FFD700' }}>{legendary}x Legendary</span>
              </div>
            )}
            {epic > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(168, 85, 247, 0.2)', padding: '12px 24px', borderRadius: '12px', border: '2px solid #a855f7' }}>
                <span style={{ fontSize: '32px' }}>💜</span>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#a855f7' }}>{epic}x Epic</span>
              </div>
            )}
            {rare > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.2)', padding: '12px 24px', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                <span style={{ fontSize: '32px' }}>💙</span>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>{rare}x Rare</span>
              </div>
            )}
            {common > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(156, 163, 175, 0.2)', padding: '12px 24px', borderRadius: '12px', border: '2px solid #9ca3af' }}>
                <span style={{ fontSize: '32px' }}>⚪</span>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#9ca3af' }}>{common}x Common</span>
              </div>
            )}
          </div>

          {/* Foils */}
          {(foilPrize > 0 || foilStandard > 0) && (
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '32px',
              }}
            >
              {foilPrize > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(234, 179, 8, 0.3)', padding: '8px 16px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '24px' }}>✨</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: '#fbbf24' }}>{foilPrize}x Prize Foil</span>
                </div>
              )}
              {foilStandard > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 211, 238, 0.3)', padding: '8px 16px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '24px' }}>💎</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: '#22d3ee' }}>{foilStandard}x Standard Foil</span>
                </div>
              )}
            </div>
          )}

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: '48px',
              alignItems: 'center',
              marginBottom: '32px',
            }}
          >
            {/* Total Power */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '20px', color: 'rgba(255, 255, 255, 0.5)', display: 'flex' }}>Total Power</span>
              <span style={{ fontSize: '42px', fontWeight: 900, color: '#22d3ee', display: 'flex' }}>⚡ {totalPower.toLocaleString()}</span>
            </div>

            {/* Burn Value */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '20px', color: 'rgba(255, 255, 255, 0.5)', display: 'flex' }}>Burn Value</span>
              <span style={{ fontSize: '42px', fontWeight: 900, color: '#f97316', display: 'flex' }}>🔥 {Math.round(totalBurnValue).toLocaleString()}</span>
            </div>

            {/* PnL */}
            {cost > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '20px', color: 'rgba(255, 255, 255, 0.5)', display: 'flex' }}>PnL</span>
                <span style={{ fontSize: '48px', fontWeight: 900, color: pnlColor, display: 'flex' }}>{pnlText}</span>
              </div>
            )}
          </div>

          {/* Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            <span style={{ fontSize: '28px', fontWeight: 700, color: 'rgba(255, 215, 0, 0.8)', display: 'flex' }}>
              VIBE MOST WANTED
            </span>
            <span style={{ fontSize: '24px', color: 'rgba(255, 255, 255, 0.5)', display: 'flex' }}>
              vibemostwanted.xyz
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
