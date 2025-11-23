import { Metadata } from 'next';
import SharePageClient from './SharePageClient';

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const baseUrl = 'https://www.vibemostwanted.xyz';

  // Fetch card data from Convex to get IPFS URL directly
  let imageUrl = `${baseUrl}/api/card-image/${fid}?v=7`; // Fallback

  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL;
    if (convexUrl) {
      const response = await fetch(`${convexUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'farcasterCards:getFarcasterCardByFid',
          args: { fid: parseInt(fid) },
          format: 'json',
        }),
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        const card = data.value;

        // Prefer shareImageUrl (card + criminal text), fallback to cardImageUrl (just card)
        const sourceUrl = card?.shareImageUrl || card?.cardImageUrl;

        // If card has share/card image, use IPFS directly (bypasses Vercel firewall)
        if (sourceUrl) {
          let ipfsUrl = sourceUrl;

          // Convert to Filebase gateway if needed
          if (ipfsUrl.startsWith('ipfs://')) {
            const cid = ipfsUrl.replace('ipfs://', '');
            imageUrl = `https://ipfs.filebase.io/ipfs/${cid}`;
          } else if (ipfsUrl.includes('/ipfs/')) {
            const cid = ipfsUrl.split('/ipfs/')[1];
            imageUrl = `https://ipfs.filebase.io/ipfs/${cid}`;
          } else {
            imageUrl = ipfsUrl;
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch card data for OG image:', error);
  }

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
