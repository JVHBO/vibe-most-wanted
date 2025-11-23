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
        "aspectRatio": "1.91:1",
        "button": {
          "title": "Join Raid",
          "action": {
            "type": "launch_frame",
            "name": "VIBE MOST WANTED - Raid Boss",
            "url": "https://www.vibemostwanted.xyz",
            "splashImageUrl": "https://www.vibemostwanted.xyz/splash.png",
            "splashBackgroundColor": "#FFD700"
          }
        }
      }),
      // Backward compatibility with old frame spec
      "fc:frame": JSON.stringify({
        "version": "1",
        "imageUrl": imageUrl,
        "aspectRatio": "1.91:1",
        "button": {
          "title": "Join Raid",
          "action": {
            "type": "launch_frame",
            "name": "VIBE MOST WANTED - Raid Boss",
            "url": "https://www.vibemostwanted.xyz",
            "splashImageUrl": "https://www.vibemostwanted.xyz/splash.png",
            "splashBackgroundColor": "#FFD700"
          }
        }
      }),
    }
  };
}

export default function ShareRaidPage() {
  // Redirect to main page after social media crawlers grab meta tags
  redirect('/');
}
