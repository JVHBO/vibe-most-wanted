import { Metadata } from 'next';

type SearchParams = {
  packType?: string;
  legendary?: string;
  epic?: string;
  rare?: string;
  common?: string;
  totalPower?: string;
  foilPrize?: string;
  foilStandard?: string;
  cards?: string;
}

type Props = {
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const baseUrl = 'https://www.vibemostwanted.xyz';
  const packType = resolvedParams.packType || 'Pack';

  const params = new URLSearchParams();
  if (resolvedParams.packType) params.set('packType', resolvedParams.packType);
  if (resolvedParams.legendary) params.set('legendary', resolvedParams.legendary);
  if (resolvedParams.epic) params.set('epic', resolvedParams.epic);
  if (resolvedParams.rare) params.set('rare', resolvedParams.rare);
  if (resolvedParams.common) params.set('common', resolvedParams.common);
  if (resolvedParams.totalPower) params.set('totalPower', resolvedParams.totalPower);
  if (resolvedParams.foilPrize) params.set('foilPrize', resolvedParams.foilPrize);
  if (resolvedParams.foilStandard) params.set('foilStandard', resolvedParams.foilStandard);
  if (resolvedParams.cards) params.set('cards', resolvedParams.cards);
  params.set('v', Date.now().toString());

  const imageUrl = `${baseUrl}/share/pack/opengraph-image?${params.toString()}`;

  const title = `Pack Opening - ${packType}`;
  const description = `Opened a ${packType}! Check out these pulls!`;

  return {
    title,
    description,
    openGraph: {
      title: `\u{1F3B4} ${title}`,
      description,
      url: `${baseUrl}/share/pack`,
      type: "website",
      siteName: "$VBMS",
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
      title: `\u{1F3B4} ${title}`,
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
            name: '$VBMS',
            url: baseUrl + '/shop',
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
          $VBMS
        </h1>
        <p className="text-vintage-burnt-gold mb-4">{"\u{1F3B4}"} Pack Opening!</p>
        <div className="animate-pulse text-6xl">{"\u{1F3B4}"}</div>
        <script dangerouslySetInnerHTML={{
          __html: `setTimeout(() => { window.location.href = '/shop'; }, 2000);`
        }} />
      </div>
    </div>
  );
}
