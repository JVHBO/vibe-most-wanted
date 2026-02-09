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
  const { lang = 'en', v } = await searchParams;
  const baseUrl = 'https://vibefid.xyz';

  // Use opengraph-image route which fetches shareImageUrl from IPFS
  // Cache bust with v parameter from URL
  const cacheBust = v ? `?v=${v}` : '';
  const imageUrl = `${baseUrl}/share/fid/${fid}/opengraph-image${cacheBust}`;

  return {
    title: `VibeFID Card #${fid} - VibeFID`,
    description: `Check out this VibeFID card on VibeFID!`,
    openGraph: {
      title: `VibeFID Card #${fid}`,
      description: `Check out this VibeFID card on VibeFID!`,
      type: 'website',
      siteName: 'VibeFID',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 800,
          alt: `VibeFID Card #${fid}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `VibeFID Card #${fid}`,
      description: `Check out this VibeFID card on VibeFID!`,
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
            name: 'VibeFID',
            url: `${baseUrl}/fid/${fid}`,
            splashImageUrl: `${baseUrl}/images/splash-200.png`,
            splashBackgroundColor: '#1a1a1a',
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
            name: 'VibeFID',
            url: `${baseUrl}/fid/${fid}`,
            splashImageUrl: `${baseUrl}/images/splash-200.png`,
            splashBackgroundColor: '#1a1a1a',
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
