import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const baseUrl = 'https://www.vibemostwanted.xyz';

  // Use Next.js opengraph-image route
  const imageUrl = `${baseUrl}/invite/${encodeURIComponent(username)}/opengraph-image`;
  const launchUrl = `${baseUrl}?ref=${encodeURIComponent(username)}`;

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
      // Farcaster Frame v2 format (required meta tags)
      'fc:frame': 'vNext',
      'fc:frame:image': imageUrl,
      'fc:frame:image:aspect_ratio': '1.91:1',
      'fc:frame:button:1': 'JOIN US',
      'fc:frame:button:1:action': 'link',
      'fc:frame:button:1:target': launchUrl,
    },
  };
}

export default async function InvitePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  // Sanitize username
  const sanitizedUsername = username.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  const redirectUrl = `/?ref=${encodeURIComponent(sanitizedUsername)}`;

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
