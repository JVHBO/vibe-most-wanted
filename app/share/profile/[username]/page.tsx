import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const baseUrl = 'https://www.vibemostwanted.xyz';

  // Use Next.js opengraph-image route (same as victory shares)
  // Add timestamp to bust Farcaster cache
  const imageUrl = `${baseUrl}/share/profile/${encodeURIComponent(username)}/opengraph-image?v=3`;

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

  // SECURITY: Sanitize username to prevent XSS - only allow alphanumeric, underscore, dash
  const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, '');
  const redirectUrl = `/profile/${encodeURIComponent(sanitizedUsername)}`;

  return (
    <html>
      <head>
        {/* SECURITY: Use meta refresh instead of script to prevent XSS */}
        <meta httpEquiv="refresh" content={`2;url=${redirectUrl}`} />
      </head>
      <body>
        <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
              VIBE MOST WANTED
            </h1>
            <p className="text-vintage-burnt-gold mb-4">Redirecting to {sanitizedUsername}&apos;s profile...</p>
            <div className="animate-pulse text-6xl">🎮</div>
          </div>
        </div>
      </body>
    </html>
  );
}
