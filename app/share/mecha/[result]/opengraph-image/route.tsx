import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ result: string }> }
) {
  const { result } = await params;

  // Decode result data (format: win|amount or loss|amount)
  const decoded = decodeURIComponent(result);
  const parts = decoded.split('|');
  const outcome = parts[0] || 'win';
  const amount = parts[1] || '0';

  const isWin = outcome === 'win';

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
          backgroundColor: '#0a0f0a',
          backgroundImage: 'radial-gradient(circle at center, #1a2f1a 0%, #0a0f0a 70%)',
        }}
      >
        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 80,
            fontWeight: 900,
            color: '#FFD700',
            marginBottom: 20,
            textShadow: '4px 4px 8px rgba(0,0,0,0.8)',
          }}
        >
          🤖 MECHA ARENA 🤖
        </div>

        {/* Result */}
        <div
          style={{
            display: 'flex',
            fontSize: 120,
            fontWeight: 900,
            color: isWin ? '#22c55e' : '#ef4444',
            marginBottom: 20,
            textShadow: '4px 4px 8px rgba(0,0,0,0.8)',
          }}
        >
          {isWin ? '🎰 WIN!' : '💔 LOSS'}
        </div>

        {/* Amount */}
        <div
          style={{
            display: 'flex',
            fontSize: 90,
            fontWeight: 800,
            color: isWin ? '#86efac' : '#fca5a5',
            marginBottom: 40,
          }}
        >
          {isWin ? `+${amount}` : `-${amount}`} coins
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: 36,
            color: '#a78bfa',
            marginBottom: 20,
          }}
        >
          CPU vs CPU Betting
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: '#666',
            position: 'absolute',
            bottom: 40,
          }}
        >
          $VBMS
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
