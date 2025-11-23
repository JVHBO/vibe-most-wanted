import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: "RAID BOSS BATTLE - VIBE Most Wanted",
  description: "Join the raid! Battle the boss together and earn epic rewards!",
  openGraph: {
    title: "⚔️ RAID BOSS BATTLE",
    description: "Join the raid! Battle the boss together and earn epic rewards!",
    url: "https://www.vibemostwanted.xyz/share/raid",
    images: [
      {
        url: "https://www.vibemostwanted.xyz/splash.png",
        width: 800,
        height: 800,
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
    images: ["https://www.vibemostwanted.xyz/splash.png"],
  },
};

export default function ShareRaidPage() {
  // Redirect to main page after social media crawlers grab meta tags
  redirect('/');
}
