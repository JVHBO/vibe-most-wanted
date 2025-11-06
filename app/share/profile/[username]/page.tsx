import { Metadata } from 'next';
import { ConvexProfileService } from '@/lib/convex-profile';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.vibemostwanted.xyz';

  // Fetch profile data
  let imageUrl = `${baseUrl}/api/og-profile?username=${encodeURIComponent(username)}&v=3`;

  try {
    const address = await ConvexProfileService.getAddressByUsername(username.toLowerCase());
    if (address) {
      const profile = await ConvexProfileService.getProfile(address);
      if (profile) {
        const wins = (profile.stats.pveWins || 0) + (profile.stats.pvpWins || 0);
        const losses = (profile.stats.pveLosses || 0) + (profile.stats.pvpLosses || 0);
        const ties = 0;
        const pfpUrl = profile.twitterProfileImageUrl || '';

        imageUrl = `${baseUrl}/api/og-profile?username=${encodeURIComponent(username)}&twitter=${encodeURIComponent(profile.twitter || '')}&totalPower=${profile.stats.totalPower || 0}&wins=${wins}&losses=${losses}&ties=${ties}&nftCount=${profile.stats.totalCards || 0}&ranking=?&winStreak=${profile.winStreak || 0}&coins=${profile.coins || 0}&pfp=${encodeURIComponent(pfpUrl)}&v=3`;
      }
    }
  } catch (e) {
    console.error('Failed to fetch profile data for OG image:', e);
  }

  return {
    title: `${username}'s Profile - VIBE Most Wanted`,
    description: `Check out ${username}'s profile on VIBE Most Wanted!`,
    openGraph: {
      title: `${username}'s Profile`,
      description: `Check out ${username}'s profile on VIBE Most Wanted!`,
      type: 'website',
      siteName: 'VIBE Most Wanted',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${username}'s Profile`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${username}'s Profile`,
      description: `Check out ${username}'s profile on VIBE Most Wanted!`,
      images: [imageUrl],
    },
    other: {
      // Farcaster miniapp format with embedded image
      'fc:miniapp': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'View Profile',
          action: {
            type: 'launch_miniapp',
            name: 'VIBE MOST WANTED',
            url: baseUrl,
          },
        },
      }),
      'fc:frame': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'View Profile',
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

export default async function ProfileSharePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
          VIBE MOST WANTED
        </h1>
        <p className="text-vintage-burnt-gold mb-4">Redirecting to {username}'s profile...</p>
        <div className="animate-pulse text-6xl">🎮</div>
        <script dangerouslySetInnerHTML={{
          __html: `setTimeout(() => { window.location.href = '/profile/${encodeURIComponent('${username}')}'; }, 2000);`
        }} />
      </div>
    </div>
  );
}
