import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Farcaster embed spec: 3:2 ratio
const W = 1200;
const H = 800;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const amount   = parseInt(searchParams.get('amount') || '0');
  const multX    = parseInt(searchParams.get('x') || '0');
  const username = searchParams.get('user') || '';

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${Math.round(n / 1_000)}k`
    : String(n);

  const bgRes = await fetch(`${origin}/angry-angry-kid.png`);
  const bgBuf = await bgRes.arrayBuffer();
  const bgSrc = `data:image/png;base64,${Buffer.from(bgBuf).toString('base64')}`;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', position: 'relative', overflow: 'hidden' }}>

        {/* Background full bleed */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bgSrc} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />

        {/* TOP RIGHT — WIN amount */}
        <div style={{
          position: 'absolute', top: 40, right: 48,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0,
        }}>
          <div style={{
            fontFamily: '"Arial Black", Arial, sans-serif',
            fontSize: 52,
            fontWeight: 900,
            color: '#ffffff',
            textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
            lineHeight: 1.1,
            display: 'flex',
          }}>
            WIN {fmt(amount)} $VBMS
          </div>
          {multX >= 2 && (
            <div style={{
              fontFamily: '"Arial Black", Arial, sans-serif',
              fontSize: 38,
              fontWeight: 900,
              color: '#FFD700',
              textShadow: '2px 2px 0 #000',
              display: 'flex',
            }}>
              {multX}×
            </div>
          )}
        </div>

      </div>
    ),
    { width: W, height: H }
  );
}
