import { Metadata } from 'next';
import SharePageClient from './SharePageClient';

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ fid: string }>;
  searchParams: Promise<{ lang?: string; v?: string }>;
}): Promise<Metadata> {
  const { fid } = await params;
  const { lang = 'en' } = await searchParams;
  const baseUrl = 'https://www.vibemostwanted.xyz';

  // Use dynamic API for share image with language support
  // The API generates the image on-the-fly with Edge caching
  const imageUrl = `${baseUrl}/api/share-image/${fid}?lang=${lang}`;

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
          title: 'Mint Your Card',
          action: {
            type: 'launch_miniapp',
            name: 'VIBE MOST WANTED',
            url: `${baseUrl}/fid/${fid}`,
          },
        },
      }),
      'fc:frame': JSON.stringify({
        version: '1',
        imageUrl: imageUrl,
        button: {
          title: 'Mint Your Card',
          action: {
            type: 'launch_miniapp',
            name: 'VIBE MOST WANTED',
            url: `${baseUrl}/fid/${fid}`,
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
