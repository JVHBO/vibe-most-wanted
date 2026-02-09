import { NextRequest, NextResponse } from 'next/server';
import { getFidTraits } from "@/lib/fid/fidTraits";

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

    // Use traits from database (set at mint time)
    // Fallback to deterministic traits only if not in database
    const fidNumber = parseInt(fid);
    const deterministicTraits = getFidTraits(fidNumber);
    const traits = {
      foil: cardData.foil || deterministicTraits.foil,
      wear: cardData.wear || deterministicTraits.wear,
    };

    // Recalculate power based on current rarity + stored traits
    const rarityBasePower: Record<string, number> = {
      Common: 10,
      Rare: 20,
      Epic: 50,
      Legendary: 100,
      Mythic: 600,
    };

    const wearMultiplier: Record<string, number> = {
      Pristine: 1.8,
      Mint: 1.4,
      'Lightly Played': 1.0,
      'Moderately Played': 1.0,
      'Heavily Played': 1.0,
    };

    const foilMultiplier: Record<string, number> = {
      Prize: 6.0,
      Standard: 2.0,
      None: 1.0,
    };

    const basePower = rarityBasePower[cardData.rarity] || 5;
    const wearMult = wearMultiplier[traits.wear] || 1.0;
    const foilMult = foilMultiplier[traits.foil] || 1.0;
    const correctPower = Math.round(basePower * wearMult * foilMult);

    // Check if we have video (imageUrl) and thumbnail (cardImageUrl)
    const hasVideo = cardData.cardImageUrl && cardData.imageUrl;

    // Build OpenSea-compatible metadata
    const metadata: Record<string, any> = {
      name: `VibeFID #${cardData.fid}`,
      description: `${cardData.displayName} (@${cardData.username}) - ${cardData.bio || 'A unique VibeFID card from the Farcaster ecosystem'}`,
      // Use cardImageUrl as thumbnail if video exists, otherwise use imageUrl
      image: hasVideo ? cardData.cardImageUrl : cardData.imageUrl,
      external_url: `https://vibemostwanted.lol/share/fid/${cardData.fid}`,
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
          value: correctPower,
          display_type: 'number',
        },
        {
          trait_type: 'Bounty',
          value: correctPower * 10, // Bounty = Power × 10
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
          trait_type: 'Power Badge',
          value: cardData.powerBadge ? 'Yes' : 'No',
        },
      ],
    };

    // Add animation_url for video NFTs (OpenSea will display the video)
    if (hasVideo) {
      metadata.animation_url = cardData.imageUrl;
    }

    return NextResponse.json(metadata, {
      headers: {
        'Content-Type': 'application/json',
        // Cache for 1 hour client-side, revalidate every 5 min on edge
        'Cache-Control': 'public, max-age=3600, s-maxage=300, stale-while-revalidate=60',
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
