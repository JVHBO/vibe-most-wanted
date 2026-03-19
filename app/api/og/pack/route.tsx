import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#facc15',
  mythic: '#f472b6',
};

const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(156,163,175,0.3)',
  rare: 'rgba(96,165,250,0.4)',
  epic: 'rgba(192,132,252,0.4)',
  legendary: 'rgba(250,204,21,0.5)',
  mythic: 'rgba(244,114,182,0.5)',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || '';
  const rarity = (searchParams.get('rarity') || 'common').toLowerCase();
  const foil = searchParams.get('foil') || '';
  const tokenId = searchParams.get('tokenId') || '';
  const cardImgParam = searchParams.get('cardImg') || '';

  const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  const rarityGlow = RARITY_GLOW[rarity] || RARITY_GLOW.common;
  const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);

  // Proxy card image — baccarat portraits are on the same domain
  const cardImg = cardImgParam
    ? `https://vibemostwanted.xyz${cardImgParam.startsWith('/') ? '' : '/'}${cardImgParam}`
    : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1200 50%, #0d0d0d 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow from rarity color */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 35% 50%, ${rarityGlow} 0%, transparent 60%)`,
            display: 'flex',
          }}
        />

        {/* Left — Card Image */}
        <div
          style={{
            width: '380px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '50px 30px 50px 60px',
            flexShrink: 0,
          }}
        >
          {cardImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardImg}
              alt={name}
              width={260}
              height={360}
              style={{
                objectFit: 'cover',
                borderRadius: '20px',
                border: `5px solid ${rarityColor}`,
                boxShadow: `0 0 50px ${rarityGlow}, 0 0 100px ${rarityGlow}`,
              }}
            />
          ) : (
            <div
              style={{
                width: '260px',
                height: '360px',
                borderRadius: '20px',
                border: `5px solid ${rarityColor}`,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '80px',
              }}
            >
              🎴
            </div>
          )}
        </div>

        {/* Right — Info */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 60px 60px 20px',
            gap: '20px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', fontSize: '28px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            🎴 Vibe Most Wanted
          </div>

          {/* Rarity Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                padding: '8px 24px',
                borderRadius: '999px',
                border: `3px solid ${rarityColor}`,
                background: `${rarityColor}22`,
                fontSize: '32px',
                fontWeight: 900,
                color: rarityColor,
                textTransform: 'uppercase',
                letterSpacing: '3px',
              }}
            >
              {rarityLabel}
            </div>
            {foil && foil !== 'None' && (
              <div
                style={{
                  display: 'flex',
                  padding: '8px 20px',
                  borderRadius: '999px',
                  border: '3px solid #fde68a',
                  background: 'rgba(253,230,138,0.15)',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#fde68a',
                }}
              >
                ✨ {foil} Foil
              </div>
            )}
          </div>

          {/* Card Name */}
          {name && (
            <div
              style={{
                fontSize: '72px',
                fontWeight: 900,
                color: '#FFD700',
                textShadow: '0 4px 20px rgba(255,215,0,0.5)',
                display: 'flex',
                lineHeight: 1.1,
                textTransform: 'capitalize',
              }}
            >
              {name}
            </div>
          )}

          {/* Token ID */}
          {tokenId && (
            <div style={{ display: 'flex', fontSize: '28px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              Token #{tokenId}
            </div>
          )}

          {/* CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginTop: '8px',
              padding: '20px 28px',
              borderRadius: '16px',
              background: 'rgba(255,215,0,0.1)',
              border: '2px solid rgba(255,215,0,0.3)',
            }}
          >
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#FFD700', display: 'flex' }}>
              $VBMS
            </div>
            <div style={{ fontSize: '28px', color: 'rgba(255,255,255,0.6)', display: 'flex' }}>
              · Vibe Most Wanted
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
