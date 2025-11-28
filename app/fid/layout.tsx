import type { Metadata } from 'next';

const baseUrl = 'https://www.vibemostwanted.xyz';
const imageUrl = `${baseUrl}/fid/opengraph-image?v=3`; // v=3 for cache busting

export const metadata: Metadata = {
  title: 'VibeFID - Mint Your Farcaster Card',
  description: 'Transform your Farcaster profile into a playable NFT card with unique traits based on your FID and Neynar Score. Mint price: 0.0003 ETH',
  openGraph: {
    title: 'VibeFID - Mint Your Farcaster Card',
    description: 'Transform your Farcaster profile into a playable NFT card with unique traits based on your FID and Neynar Score.',
    url: `${baseUrl}/fid`,
    siteName: 'Vibe Most Wanted',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: imageUrl,
        width: 1200,
        height: 800,
        alt: 'VibeFID - Mint Playable Cards from Farcaster Profiles',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VibeFID - Mint Your Farcaster Card',
    description: 'Transform your Farcaster profile into a playable NFT card with unique traits.',
    images: [imageUrl],
  },
  other: {
    // Farcaster miniapp format
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: imageUrl,
      button: {
        title: 'Mint Your Card',
        action: {
          type: 'launch_miniapp',
          name: 'VIBE MOST WANTED',
          url: `${baseUrl}/fid`,
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
          url: `${baseUrl}/fid`,
        },
      },
    }),
  },
};

export default function FidLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
