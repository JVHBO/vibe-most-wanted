import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const baseUrl = 'https://www.vibemostwanted.xyz';

  // Use Next.js opengraph-image route
  const imageUrl = `${baseUrl}/invite/${encodeURIComponent(username)}/opengraph-image?v=2`;
  const launchUrl = baseUrl; // No ref parameter - referral rewards disabled

  return {
    title: `${username} invited you to VIBE Most Wanted!`,
    description: `Join ${username} in VIBE Most Wanted - the ultimate card battle game on Farcaster!`,
    openGraph: {
      title: `${username} invited you!`,
      description: `Join ${username} in VIBE Most Wanted - the ultimate card battle game on Farcaster!`,
      type: 'website',
      siteName: 'VIBE Most Wanted',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Join ${username} in VIBE Most Wanted`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${username} invited you!`,
      description: `Join ${username} in VIBE Most Wanted!`,
      images: [imageUrl],
    },
    other: {
      // Farcaster miniapp format with embedded image
      'fc:miniapp': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'JOIN US',
          action: {
            type: 'launch_miniapp',
            name: 'VIBE MOST WANTED',
            url: launchUrl,
          },
        },
      }),
      'fc:frame': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'JOIN US',
          action: {
            type: 'launch_miniapp',
            name: 'VIBE MOST WANTED',
            url: launchUrl,
          },
        },
      }),
    },
  };
}

export default async function InvitePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  // Sanitize username
  const sanitizedUsername = username.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  const redirectUrl = '/'; // No ref parameter - referral rewards disabled

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
          VIBE MOST WANTED
        </h1>
        <p className="text-vintage-burnt-gold mb-2 text-xl">
          {sanitizedUsername} invited you!
        </p>
        <p className="text-vintage-ice/70 mb-4">
          Join the ultimate card battle game on Farcaster
        </p>
        <div className="animate-pulse text-6xl mb-4">🎴</div>
        <p className="text-vintage-burnt-gold/60 text-sm">Redirecting...</p>
        {/* Use meta refresh for redirect */}
        <meta httpEquiv="refresh" content={`2;url=${redirectUrl}`} />
        <noscript>
          <a href={redirectUrl} className="text-vintage-gold underline">Click here if not redirected</a>
        </noscript>
      </div>
    </div>
  );
}
