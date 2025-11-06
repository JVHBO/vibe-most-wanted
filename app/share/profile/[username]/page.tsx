import { Metadata } from 'next';

async function getFarcasterPfp(username: string): Promise<string> {
  try {
    // Try Farcaster Hub API
    const response = await fetch(`https://hub.farcaster.xyz/v1/userByUsername?username=${username}`, {
      next: { revalidate: 3600 }
    });

    if (response.ok) {
      const data = await response.json();
      return data.pfp || '';
    }
  } catch (e) {
    console.error('Failed to fetch Farcaster PFP:', e);
  }
  return '';
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.vibemostwanted.xyz';

  // Try to get Farcaster profile picture
  const pfpUrl = await getFarcasterPfp(username);

  // Simple direct URL with PFP if available
  const imageUrl = `${baseUrl}/api/og-profile?username=${encodeURIComponent(username)}&twitter=&totalPower=0&wins=0&losses=0&ties=0&nftCount=0&winStreak=0&coins=0&pfp=${encodeURIComponent(pfpUrl)}&v=1`;

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
