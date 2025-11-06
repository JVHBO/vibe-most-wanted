import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.vibemostwanted.xyz';

  // Fetch profile data via HTTP (not Convex direct import)
  let imageUrl = `${baseUrl}/api/og-profile?username=${encodeURIComponent(username)}`;

  try {
    // Fetch profile data from your existing API
    const profileResponse = await fetch(`${baseUrl}/api/user-profile?username=${encodeURIComponent(username)}`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      const wins = (profile.stats?.pveWins || 0) + (profile.stats?.pvpWins || 0);
      const losses = (profile.stats?.pveLosses || 0) + (profile.stats?.pvpLosses || 0);

      imageUrl = `${baseUrl}/api/og-profile?username=${encodeURIComponent(username)}&twitter=${encodeURIComponent(profile.twitter || '')}&totalPower=${profile.stats?.totalPower || 0}&wins=${wins}&losses=${losses}&ties=0&nftCount=${profile.stats?.totalCards || 0}&winStreak=${profile.winStreak || 0}&coins=${profile.coins || 0}`;
    }
  } catch (e) {
    console.error('Failed to fetch profile data:', e);
    // Use default image URL with just username
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
