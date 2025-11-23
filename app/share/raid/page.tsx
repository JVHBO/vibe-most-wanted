import { Metadata } from 'next';
import { redirect } from 'next/navigation';

type Props = {
  searchParams: { ogImage?: string }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  // Use dynamic OG image if provided, otherwise use default
  const imageUrl = searchParams.ogImage || 'https://www.vibemostwanted.xyz/images/raid-bosses/vibe/legendary.png';

  return {
    title: "RAID BOSS BATTLE - VIBE Most Wanted",
    description: "Join the raid! Battle the boss together and earn epic rewards!",
    openGraph: {
      title: "⚔️ RAID BOSS BATTLE",
      description: "Join the raid! Battle the boss together and earn epic rewards!",
      url: "https://www.vibemostwanted.xyz/share/raid",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "VIBE MOST WANTED - Raid Boss Battle"
        }
      ],
      type: "website",
      siteName: "VIBE MOST WANTED",
    },
    twitter: {
      card: "summary_large_image",
      title: "⚔️ RAID BOSS BATTLE - VIBE Most Wanted",
      description: "Join the raid! Battle the boss together and earn epic rewards!",
      images: [imageUrl],
    },
    other: {
      // Farcaster Mini App Meta Tag
      "fc:miniapp": JSON.stringify({
        "version": "1",
        "imageUrl": imageUrl,
        "button": {
          "title": "Join Raid",
          "action": {
            "type": "launch_miniapp",
            "name": "VIBE MOST WANTED",
            "url": "https://www.vibemostwanted.xyz",
          }
        }
      }),
      // Backward compatibility with old frame spec
      "fc:frame": JSON.stringify({
        "version": "1",
        "imageUrl": imageUrl,
        "button": {
          "title": "Join Raid",
          "action": {
            "type": "launch_miniapp",
            "name": "VIBE MOST WANTED",
            "url": "https://www.vibemostwanted.xyz",
          }
        }
      }),
    }
  };
}

export default function ShareRaidPage() {
  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
          VIBE MOST WANTED
        </h1>
        <p className="text-vintage-burnt-gold mb-4">⚔️ Join the Raid Boss Battle!</p>
        <div className="animate-pulse text-6xl">🎮</div>
        <script dangerouslySetInnerHTML={{
          __html: `setTimeout(() => { window.location.href = '/'; }, 2000);`
        }} />
      </div>
    </div>
  );
}
