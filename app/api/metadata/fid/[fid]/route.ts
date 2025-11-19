import { NextRequest, NextResponse } from 'next/server';
import { getFidTraits } from '@/lib/fidTraits';

export const runtime = 'edge';

/**
 * NFT Metadata endpoint for OpenSea
 * Returns ERC721 metadata JSON with traits
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;

    // Fetch card data from Convex
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL_PROD || process.env.NEXT_PUBLIC_CONVEX_URL!;
    const response = await fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'farcasterCards:getFarcasterCardByFid',
        args: { fid: parseInt(fid) },
        format: 'json',
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    const data = await response.json();
    const cardData = data.value;

    if (!cardData) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Generate FID-based foil and wear traits
    const fidNumber = parseInt(fid);
    const traits = getFidTraits(fidNumber);

    // Build OpenSea-compatible metadata
    const metadata = {
      name: `VibeFID #${cardData.fid}`,
      description: `${cardData.displayName} (@${cardData.username}) - ${cardData.bio || 'A unique VibeFID card from the Farcaster ecosystem'}`,
      image: cardData.imageUrl, // IPFS URL of the card image
      external_url: `https://www.vibemostwanted.xyz/share/fid/${cardData.fid}`,
      attributes: [
        {
          trait_type: 'Rarity',
          value: cardData.rarity,
        },
        {
          trait_type: 'Foil',
          value: traits.foil,
        },
        {
          trait_type: 'Wear',
          value: traits.wear,
        },
        {
          trait_type: 'Power',
          value: cardData.power,
          display_type: 'number',
        },
        {
          trait_type: 'Suit',
          value: cardData.suit.charAt(0).toUpperCase() + cardData.suit.slice(1),
        },
        {
          trait_type: 'Rank',
          value: cardData.rank,
        },
        {
          trait_type: 'Neynar Score',
          value: cardData.neynarScore?.toFixed(2) || '0.00',
          display_type: 'number',
        },
        {
          trait_type: 'Follower Count',
          value: cardData.followerCount,
          display_type: 'number',
        },
        {
          trait_type: 'Power Badge',
          value: cardData.powerBadge ? 'Yes' : 'No',
        },
      ],
    };

    return NextResponse.json(metadata, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    });

  } catch (error: any) {
    console.error('Metadata error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
