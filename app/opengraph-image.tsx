import { ImageResponse } from 'next/og';

export const alt = '$VBMS - Meme Card Game';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';
export const revalidate = 604800;

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#070606',
          color: '#fff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #120908 0%, #23100a 45%, #080608 100%)', display: 'flex' }} />
        <div style={{ position: 'absolute', top: -140, right: -100, width: 460, height: 460, borderRadius: 460, background: 'rgba(255, 215, 0, 0.16)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -160, left: -110, width: 520, height: 520, borderRadius: 520, background: 'rgba(168, 85, 247, 0.18)', display: 'flex' }} />

        <div style={{ position: 'absolute', inset: 0, display: 'flex', opacity: 0.16 }}>
          {['A', 'K', 'Q', 'J', '10', 'VBMS'].map((rank, index) => (
            <div
              key={rank}
              style={{
                position: 'absolute',
                left: 80 + index * 170,
                top: index % 2 === 0 ? 46 : 335,
                width: 130,
                height: 182,
                border: '4px solid #FFD700',
                borderRadius: 18,
                transform: `rotate(${index % 2 === 0 ? -12 : 11}deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: rank === 'VBMS' ? 30 : 72,
                fontWeight: 900,
                color: '#FFD700',
                background: '#120f0d',
              }}
            >
              {rank}
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', zIndex: 1, padding: '76px 82px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 28, color: '#c87941', fontWeight: 800, letterSpacing: 6, display: 'flex' }}>
              VIBE MOST WANTED
            </div>
            <div style={{ fontSize: 96, color: '#FFD700', fontWeight: 900, lineHeight: 1, marginTop: 18, display: 'flex' }}>
              $VBMS
            </div>
            <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.1, maxWidth: 820, marginTop: 12, display: 'flex' }}>
              Meme Card Game
            </div>
          </div>

          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            {['Collect cards', 'Battle', 'Earn $VBMS'].map((item) => (
              <div key={item} style={{ display: 'flex', padding: '14px 20px', border: '2px solid rgba(255,215,0,.35)', borderRadius: 12, color: '#f8e7a0', fontSize: 24, fontWeight: 800 }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
