import { Metadata } from 'next';
import SharePageClient from './SharePageClient';

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const baseUrl = 'https://www.vibemostwanted.xyz';

  // Use API route instead of opengraph-image to avoid Vercel firewall blocking
  // Add timestamp to bust Farcaster cache
  const imageUrl = `${baseUrl}/api/card-image/${fid}?v=7`;

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
          width: 500,
          height: 700,
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
  return <SharePageClient fid={fid} />;
}
