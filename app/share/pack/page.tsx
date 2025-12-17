import { Metadata } from 'next';

type Props = {
  searchParams: {
    packType?: string;
    legendary?: string;
    epic?: string;
    rare?: string;
    common?: string;
    totalPower?: string;
    foilPrize?: string;
    foilStandard?: string;
    cards?: string; // JSON array of card image URLs
  }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const baseUrl = 'https://www.vibemostwanted.xyz';
  const packType = searchParams.packType || 'Pack';

  // Build query string for OG image
  const params = new URLSearchParams();
  if (searchParams.packType) params.set('packType', searchParams.packType);
  if (searchParams.legendary) params.set('legendary', searchParams.legendary);
  if (searchParams.epic) params.set('epic', searchParams.epic);
  if (searchParams.rare) params.set('rare', searchParams.rare);
  if (searchParams.common) params.set('common', searchParams.common);
  if (searchParams.totalPower) params.set('totalPower', searchParams.totalPower);
  if (searchParams.foilPrize) params.set('foilPrize', searchParams.foilPrize);
  if (searchParams.foilStandard) params.set('foilStandard', searchParams.foilStandard);
  if (searchParams.cards) params.set('cards', searchParams.cards);
  params.set('v', Date.now().toString()); // Cache bust

  const imageUrl = `${baseUrl}/share/pack/opengraph-image?${params.toString()}`;

  const title = `Pack Opening - ${packType}`;
  const description = `Opened a ${packType}! Check out these pulls!`;

  return {
    title,
    description,
    openGraph: {
      title: `🎴 ${title}`,
      description,
      url: `${baseUrl}/share/pack`,
      type: "website",
      siteName: "VIBE MOST WANTED",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 800,
          alt: title
        }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `🎴 ${title}`,
      description,
      images: [imageUrl],
    },
    other: {
      'fc:frame': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'Open Packs',
          action: {
            type: 'launch_miniapp',
            name: 'VIBE MOST WANTED',
            url: baseUrl,
          },
        },
      }),
    },
  };
}

export default function SharePackPage() {
  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
          VIBE MOST WANTED
        </h1>
        <p className="text-vintage-burnt-gold mb-4">🎴 Pack Opening!</p>
        <div className="animate-pulse text-6xl">🎴</div>
        <script dangerouslySetInnerHTML={{
          __html: `setTimeout(() => { window.location.href = '/'; }, 2000);`
        }} />
      </div>
    </div>
  );
}
