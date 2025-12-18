import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pack Opening - VIBE Most Wanted';
export const size = {
  width: 1200,
  height: 800,
};
export const contentType = 'image/png';

export default async function Image(props: { searchParams: Promise<{
  packType?: string;
  legendary?: string;
  epic?: string;
  rare?: string;
  common?: string;
  totalPower?: string;
  foilPrize?: string;
  foilStandard?: string;
  cards?: string;
}> }) {
  const searchParams = await props.searchParams;
  const packType = searchParams.packType || 'Pack';
  const legendary = parseInt(searchParams.legendary || '0');
  const epic = parseInt(searchParams.epic || '0');
  const rare = parseInt(searchParams.rare || '0');
  const common = parseInt(searchParams.common || '0');
  const totalPower = parseInt(searchParams.totalPower || '0');
  const foilPrize = parseInt(searchParams.foilPrize || '0');
  const foilStandard = parseInt(searchParams.foilStandard || '0');

  // Parse card images (up to 5)
  let cardImages: string[] = [];
  try {
    if (searchParams.cards) {
      cardImages = JSON.parse(decodeURIComponent(searchParams.cards)).slice(0, 5);
    }
  } catch (e) {
    console.error('Failed to parse cards:', e);
  }

  const isLucky = packType.toLowerCase().includes('lucky');

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          background: isLucky
            ? 'linear-gradient(135deg, #1a1a0a 0%, #2d2d00 50%, #1a1a0a 100%)'
            : 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
        }}
      >
        {/* Glow overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: isLucky
              ? 'radial-gradient(circle at 50% 30%, rgba(255, 215, 0, 0.3) 0%, transparent 60%)'
              : 'radial-gradient(circle at 50% 30%, rgba(147, 51, 234, 0.3) 0%, transparent 60%)',
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
            width: '100%',
            height: '100%',
            padding: '40px',
            gap: '24px',
          }}
        >
          {/* Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '56px',
                fontWeight: 900,
                color: '#FFD700',
                textShadow: '0 4px 20px rgba(255, 215, 0, 0.6)',
                display: 'flex',
              }}
            >
              🎴 {packType} Opened!
            </div>
          </div>

          {/* Card Images Row */}
          {cardImages.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
              }}
            >
              {cardImages.map((url, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '4px solid #FFD700',
                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Card ${i + 1}`}
                    width={140}
                    height={200}
                    style={{
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Stats Grid */}
          <div
            style={{
              display: 'flex',
              gap: '32px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {legendary > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '36px' }}>🌟</span>
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#FFD700' }}>
                  {legendary} Legendary
                </span>
              </div>
            )}
            {epic > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '36px' }}>💜</span>
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#a855f7' }}>
                  {epic} Epic
                </span>
              </div>
            )}
            {rare > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '36px' }}>💙</span>
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#3b82f6' }}>
                  {rare} Rare
                </span>
              </div>
            )}
            {common > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '36px' }}>⚪</span>
                <span style={{ fontSize: '32px', fontWeight: 700, color: '#9ca3af' }}>
                  {common} Common
                </span>
              </div>
            )}
          </div>

          {/* Foils */}
          {(foilPrize > 0 || foilStandard > 0) && (
            <div
              style={{
                display: 'flex',
                gap: '24px',
                justifyContent: 'center',
              }}
            >
              {foilPrize > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '28px' }}>✨</span>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#fcd34d' }}>
                    {foilPrize} Prize Foil
                  </span>
                </div>
              )}
              {foilStandard > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '28px' }}>⭐</span>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#67e8f9' }}>
                    {foilStandard} Standard Foil
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Total Power */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '16px 32px',
              borderRadius: '16px',
              border: '2px solid rgba(255, 215, 0, 0.5)',
            }}
          >
            <span style={{ fontSize: '40px' }}>⚡</span>
            <span style={{ fontSize: '40px', fontWeight: 900, color: '#FFD700' }}>
              Total Power: {totalPower.toLocaleString()}
            </span>
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
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)' }}>
              VIBE MOST WANTED
            </span>
            <span style={{ fontSize: '24px', color: 'rgba(255, 255, 255, 0.3)' }}>
              @jvhbo
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
