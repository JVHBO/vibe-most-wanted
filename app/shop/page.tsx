import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Nothing Shop - VIBE MOST WANTED',
  description: 'Buy Nothing Packs with $VBMS tokens. Non-NFT cards you can use in all game modes. Burn cards to get your tokens back!',
  openGraph: {
    title: 'Nothing Shop - VIBE MOST WANTED',
    description: 'Buy Nothing Packs with $VBMS tokens. Non-NFT cards you can use in all game modes. Burn cards to get your tokens back!',
    url: 'https://www.vibemostwanted.xyz/shop',
    type: 'website',
    siteName: 'VIBE MOST WANTED',
    images: [
      {
        url: 'https://www.vibemostwanted.xyz/og-shop.png',
        width: 1200,
        height: 630,
        alt: 'Nothing Shop - VIBE MOST WANTED'
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nothing Shop - VIBE MOST WANTED',
    description: 'Buy Nothing Packs with $VBMS tokens. Non-NFT cards you can use in all game modes.',
    images: ['https://www.vibemostwanted.xyz/og-shop.png'],
  },
  other: {
    'fc:frame': JSON.stringify({
      version: '1',
      imageUrl: 'https://www.vibemostwanted.xyz/og-shop.png',
      button: {
        title: 'Open Shop',
        action: {
          type: 'launch_miniapp',
          name: 'VIBE MOST WANTED',
          url: 'https://www.vibemostwanted.xyz',
        },
      },
    }),
  },
};

export default function ShopPage() {
  redirect('/?view=shop');
}
