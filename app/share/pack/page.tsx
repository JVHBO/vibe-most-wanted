import { Metadata } from 'next';

type SearchParams = {
  packType?: string;
  rarity?: string;
  name?: string;
  foil?: string;
  tokenId?: string;
  cardImg?: string;
  // legacy
  legendary?: string;
  epic?: string;
  rare?: string;
  common?: string;
}

type Props = {
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = await searchParams;
  const baseUrl = 'https://vibemostwanted.xyz';

  // Determine rarity label
  let rarity = p.rarity || '';
  if (!rarity) {
    if (p.legendary && p.legendary !== '0') rarity = 'legendary';
    else if (p.epic && p.epic !== '0') rarity = 'epic';
    else if (p.rare && p.rare !== '0') rarity = 'rare';
    else rarity = 'common';
  }
  const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
  const name = p.name || '';
  const foil = p.foil && p.foil !== 'None' ? p.foil : '';

  const ogParams = new URLSearchParams();
  ogParams.set('rarity', rarity);
  if (name) ogParams.set('name', name);
  if (foil) ogParams.set('foil', foil);
  if (p.tokenId) ogParams.set('tokenId', p.tokenId);
  if (p.cardImg) ogParams.set('cardImg', p.cardImg);
  ogParams.set('v', Date.now().toString());

  const imageUrl = `${baseUrl}/api/og/pack?${ogParams.toString()}`;

  const foilLabel = foil ? `${foil} Foil ` : '';
  const title = name
    ? `${foilLabel}${rarityLabel} ${name} — Vibe Most Wanted`
    : `${foilLabel}${rarityLabel} Pull — Vibe Most Wanted`;
  const description = name
    ? `Just pulled a ${foilLabel}${rarityLabel} ${name} from a $VBMS pack!`
    : `Just opened a $VBMS pack and pulled a ${foilLabel}${rarityLabel} card!`;

  return {
    title,
    description,
    openGraph: {
      title: `🎴 ${title}`,
      description,
      url: `${baseUrl}/share/pack`,
      type: 'website',
      siteName: '$VBMS',
      images: [{ url: imageUrl, width: 1200, height: 800, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `🎴 ${title}`,
      description,
      images: [imageUrl],
    },
    other: {
      'fc:frame': JSON.stringify({
        version: '1',
        imageUrl,
        button: {
          title: 'Open Packs',
          action: {
            type: 'launch_miniapp',
            name: '$VBMS · Vibe Most Wanted',
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
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">$VBMS</h1>
        <p className="text-vintage-burnt-gold mb-4">🎴 Pack Opening!</p>
        <div className="animate-pulse text-6xl">🎴</div>
        <script dangerouslySetInnerHTML={{ __html: `setTimeout(() => { window.location.href = '/shop'; }, 2000);` }} />
      </div>
    </div>
  );
}
