import type { Metadata } from 'next';
import { VibeFIDConvexProvider } from '@/contexts/VibeFIDConvexProvider';

const baseUrl = 'https://vibemostwanted.lol';

export const metadata: Metadata = {
  title: 'VibeFID - Mint Your Farcaster Card',
  description: 'Transform your Farcaster profile into a playable NFT card with unique traits based on your FID and Neynar Score.',
  openGraph: {
    title: 'VibeFID - Mint Your Farcaster Card',
    description: 'Transform your Farcaster profile into a playable NFT card.',
    url: `${baseUrl}/fid`,
    siteName: 'VibeFID',
    locale: 'en_US',
    type: 'website',
  },
};

export default function FidLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VibeFIDConvexProvider>{children}</VibeFIDConvexProvider>;
}
