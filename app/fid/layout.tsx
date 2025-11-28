import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VibeFID - Mint Your Farcaster Card',
  description: 'Transform your Farcaster profile into a playable NFT card with unique traits based on your FID and Neynar Score. Mint price: 0.0003 ETH',
  openGraph: {
    title: 'VibeFID - Mint Your Farcaster Card',
    description: 'Transform your Farcaster profile into a playable NFT card with unique traits based on your FID and Neynar Score.',
    url: 'https://www.vibemostwanted.xyz/fid',
    siteName: 'Vibe Most Wanted',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VibeFID - Mint Your Farcaster Card',
    description: 'Transform your Farcaster profile into a playable NFT card with unique traits.',
  },
};

export default function FidLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
