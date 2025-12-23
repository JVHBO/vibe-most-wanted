import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL not defined");
  return new ConvexHttpClient(url);
}

/**
 * Fallback API for VibeFID cards when Alchemy is blocked
 * Returns cards from Convex database by wallet address
 */
export async function GET(request: NextRequest) {
  try {
    const convex = getConvexClient();
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Fetch VibeFID cards from Convex
    const cards = await convex.query(api.farcasterCards.getFarcasterCardsByAddress, {
      address: address.toLowerCase(),
    });

    // Transform to Alchemy-like format for compatibility
    const vibefidContract = '0x60274a138d026e3cb337b40567100fdec3127565';

    const nfts = cards.map((card: any) => ({
      tokenId: String(card.tokenId || card.fid),
      contract: {
        address: vibefidContract,
      },
      collection: 'vibefid',
      raw: {
        metadata: {
          name: card.displayName || card.username || `VibeFID #${card.fid}`,
          image: card.imageUrl || card.cardImageUrl,
          animation_url: card.imageUrl, // Video URL
          attributes: [
            { trait_type: 'rarity', value: card.rarity },
            { trait_type: 'wear', value: card.wear },
            { trait_type: 'foil', value: card.foil },
            { trait_type: 'power', value: String(card.power) },
            { trait_type: 'suit', value: card.suit },
            { trait_type: 'rank', value: card.rank },
          ],
        },
      },
      metadata: {
        name: card.displayName || card.username || `VibeFID #${card.fid}`,
        image: card.imageUrl || card.cardImageUrl,
        animation_url: card.imageUrl,
      },
      image: {
        originalUrl: card.imageUrl || card.cardImageUrl,
        cachedUrl: card.cardImageUrl,
      },
      // Additional fields for display
      fid: card.fid,
      username: card.username,
      displayName: card.displayName,
      pfpUrl: card.pfpUrl,
      rarity: card.rarity,
      wear: card.wear,
      foil: card.foil,
      power: card.power,
      suit: card.suit,
      rank: card.rank,
      suitSymbol: card.suitSymbol,
      color: card.color,
    }));

    return NextResponse.json({
      ownedNfts: nfts,
      totalCount: nfts.length,
      source: 'convex-fallback',
    });

  } catch (error: any) {
    console.error('VibeFID fallback error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cards', message: error.message },
      { status: 500 }
    );
  }
}
