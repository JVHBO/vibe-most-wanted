import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const baseUrl = 'https://www.vibemostwanted.xyz';

  // Use Next.js opengraph-image route
  // Add timestamp to bust Farcaster cache
  const imageUrl = `${baseUrl}/share/fid/${fid}/opengraph-image?v=3`;

  return {
    title: `VibeFID Card #${fid} - VIBE Most Wanted`,
    description: `Check out this VibeFID card on VIBE Most Wanted!`,
    openGraph: {
      title: `VibeFID Card #${fid}`,
      description: `Check out this VibeFID card on VIBE Most Wanted!`,
      type: 'website',
      siteName: 'VIBE Most Wanted',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `VibeFID Card #${fid}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `VibeFID Card #${fid}`,
      description: `Check out this VibeFID card on VIBE Most Wanted!`,
      images: [imageUrl],
    },
    other: {
      // Farcaster miniapp format with embedded image
      'fc:miniapp': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'Mint Your VibeFID',
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
          title: 'Mint Your VibeFID',
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

export default async function FidSharePage({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold text-vintage-gold mb-4">
          VibeFID Card #{fid}
        </h1>
        <p className="text-vintage-burnt-gold mb-4">Redirecting to VibeFID...</p>
        <div className="animate-pulse text-6xl">🎴</div>
        <script dangerouslySetInnerHTML={{
          __html: `setTimeout(() => { window.location.href = '/fid'; }, 2000);`
        }} />
      </div>
    </div>
  );
}
