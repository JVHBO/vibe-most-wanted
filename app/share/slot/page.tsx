import { Metadata } from 'next';

const BASE_URL = 'https://vibemostwanted.xyz';

type Props = {
  searchParams: Promise<{
    amount?: string;
    x?: string;
    type?: string;
    user?: string;
  }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = await searchParams;
  const amount = p.amount ?? '0';
  const x      = p.x ?? '0';
  const type   = p.type ?? 'nice';
  const user   = p.user ?? '';

  const labels: Record<string, string> = {
    max:   'MAX WIN',
    big:   'BIG WIN',
    great: 'GREAT WIN',
    nice:  'NICE WIN',
  };
  const label = labels[type] ?? 'WIN';
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(0)}K`
    : String(n);
  const amountFmt = fmt(parseInt(amount));

  const title       = `🎰 ${label}! +${amountFmt} VBMS${x !== '0' && x !== '1' ? ` (${x}×)` : ''}${user ? ` by @${user}` : ''}`;
  const description = `${user ? `@${user} hit a ` : ''}${label} on Tukka Slots — +${amountFmt} VBMS coins${x !== '0' && x !== '1' ? ` at ${x}×` : ''}! Play now on Vibe Most Wanted.`;

  const ogParams = new URLSearchParams({ amount, x, type, ...(user ? { user } : {}) });
  const imageUrl = `${BASE_URL}/api/og/slot-win?${ogParams}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/share/slot?${ogParams}`,
      type: 'website',
      siteName: '$VBMS',
      images: [{ url: imageUrl, width: 1200, height: 800, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    other: {
      'fc:miniapp': JSON.stringify({
        version: '1',
        imageUrl,
        button: {
          title: 'Play Tukka Slots',
          action: {
            type: 'launch_miniapp',
            name: '$VBMS',
            url: BASE_URL + '/slot',
          },
        },
      }),
      'fc:frame': JSON.stringify({
        version: '1',
        imageUrl,
        button: {
          title: 'Play Tukka Slots',
          action: {
            type: 'launch_miniapp',
            name: '$VBMS',
            url: BASE_URL + '/slot',
          },
        },
      }),
    },
  };
}

export default function ShareSlotPage() {
  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
          Tukka Slots
        </h1>
        <p className="text-vintage-burnt-gold mb-4">🎰 Opening slot machine...</p>
        <div className="animate-pulse text-6xl">🎴</div>
        <script dangerouslySetInnerHTML={{
          __html: `setTimeout(() => { window.location.href = '/slot'; }, 1500);`
        }} />
      </div>
    </div>
  );
}
