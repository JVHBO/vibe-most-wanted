import { ImageResponse } from 'next/og';

export const alt = 'VibeFID - Mint Playable Cards from Farcaster Profiles';
export const size = {
  width: 1200,
  height: 800,
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
          background: '#050505',
          color: '#fff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 10%, rgba(255,215,0,.18), transparent 35%), linear-gradient(135deg, #070707 0%, #1c1206 55%, #050505 100%)', display: 'flex' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,215,0,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,.06) 1px, transparent 1px)', backgroundSize: '58px 58px', display: 'flex' }} />

        {[
          { rank: 'A', suit: '♠', x: 78, y: 82, r: -12, c: '#FFD700' },
          { rank: 'K', suit: '♥', x: 900, y: 92, r: 11, c: '#ef4444' },
          { rank: 'Q', suit: '♦', x: 130, y: 500, r: 9, c: '#ef4444' },
          { rank: 'J', suit: '♣', x: 930, y: 500, r: -10, c: '#FFD700' },
        ].map((card) => (
          <div
            key={`${card.rank}${card.suit}`}
            style={{
              position: 'absolute',
              left: card.x,
              top: card.y,
              width: 170,
              height: 238,
              borderRadius: 20,
              border: `5px solid ${card.c}`,
              background: '#111',
              transform: `rotate(${card.r}deg)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 18,
              opacity: 0.42,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', fontSize: 42, fontWeight: 900, color: card.c }}>{card.rank}</div>
            <div style={{ display: 'flex', alignSelf: 'center', fontSize: 82, color: card.c }}>{card.suit}</div>
            <div style={{ display: 'flex', alignSelf: 'flex-end', fontSize: 42, fontWeight: 900, color: card.c }}>{card.rank}</div>
          </div>
        ))}

        <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 72, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', fontSize: 124, fontWeight: 900, color: '#FFD700', lineHeight: 1, textShadow: '0 8px 0 #000' }}>
            VibeFID
          </div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: 42, fontWeight: 800, color: '#f3e9c8', textAlign: 'center' }}>
            Playable NFT Cards from Farcaster Profiles
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 54 }}>
            {['Neynar Score', 'Rarity', 'Power', 'Battles'].map((item) => (
              <div key={item} style={{ display: 'flex', border: '2px solid rgba(255,215,0,.45)', borderRadius: 12, padding: '14px 22px', color: '#FFD700', fontSize: 24, fontWeight: 800, background: 'rgba(0,0,0,.36)' }}>
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
