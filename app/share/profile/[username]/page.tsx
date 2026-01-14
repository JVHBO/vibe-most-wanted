import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const baseUrl = 'https://vibemostwanted.xyz';

  // Use Next.js opengraph-image route (same as victory shares)
  // Add timestamp to bust Farcaster cache
  const imageUrl = `${baseUrl}/share/profile/${encodeURIComponent(username)}/opengraph-image?v=3`;

  return {
    title: `${username}'s Profile - $VBMS`,
    description: `Check out ${username}'s profile on $VBMS!`,
    openGraph: {
      title: `${username}'s Profile`,
      description: `Check out ${username}'s profile on $VBMS!`,
      type: 'website',
      siteName: '$VBMS',
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
      description: `Check out ${username}'s profile on $VBMS!`,
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
            name: '$VBMS',
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
            name: '$VBMS',
            url: baseUrl,
          },
        },
      }),
    },
  };
}

export default async function ProfileSharePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  // Sanitize username - only allow alphanumeric, underscore, hyphen, dot
  const sanitizedUsername = username.replace(/[^a-zA-Z0-9_\-\.]/g, '');
  const encodedUsername = encodeURIComponent(sanitizedUsername);
  const redirectUrl = `/profile/${encodedUsername}`;

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
          $VBMS
        </h1>
        <p className="text-vintage-burnt-gold mb-4">Redirecting to {sanitizedUsername}&apos;s profile...</p>
        <div className="animate-pulse text-6xl">🎮</div>
        {/* Use meta refresh instead of inline script to prevent XSS */}
        <meta httpEquiv="refresh" content={`2;url=${redirectUrl}`} />
        <noscript>
          <a href={redirectUrl} className="text-vintage-gold underline">Click here if not redirected</a>
        </noscript>
      </div>
    </div>
  );
}
