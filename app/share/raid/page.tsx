import { Metadata } from 'next';
import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ ogImage?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const baseUrl = 'https://vibemostwanted.xyz';

  // Use Next.js opengraph-image route (same as profile shares)
  // Add timestamp to bust Farcaster cache
  const imageUrl = `${baseUrl}/share/raid/opengraph-image?v=1`;

  return {
    title: "RAID BOSS BATTLE - $VBMS",
    description: "Join the raid! Battle the boss together and earn epic rewards!",
    openGraph: {
      title: "⚔️ RAID BOSS BATTLE",
      description: "Join the raid! Battle the boss together and earn epic rewards!",
      url: "https://vibemostwanted.xyz/share/raid",
      type: "website",
      siteName: "$VBMS",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 800,
          alt: "$VBMS - Raid Boss Battle"
        }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "⚔️ RAID BOSS BATTLE - $VBMS",
      description: "Join the raid! Battle the boss together and earn epic rewards!",
      images: [imageUrl],
    },
    other: {
      // Farcaster miniapp format with embedded image
      'fc:miniapp': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'Join Raid',
          action: {
            type: 'launch_miniapp',
            name: '$VBMS',
            url: baseUrl + '/raid',
          },
        },
      }),
      'fc:frame': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'Join Raid',
          action: {
            type: 'launch_miniapp',
            name: '$VBMS',
            url: baseUrl + '/raid',
          },
        },
      }),
    },
  };
}

export default function ShareRaidPage() {
  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
          $VBMS
        </h1>
        <p className="text-vintage-burnt-gold mb-4">⚔️ Join the Raid Boss Battle!</p>
        <div className="animate-pulse text-6xl">🎮</div>
        <script dangerouslySetInnerHTML={{
          __html: `setTimeout(() => { window.location.href = '/raid'; }, 2000);`
        }} />
      </div>
    </div>
  );
}
