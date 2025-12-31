import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  try {
    const { fid, adminKey } = await request.json();

    // Simple admin key check (you should use a proper secret in production)
    if (adminKey !== 'regenerate-558987-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!fid) {
      return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
    }

    // Get card data from Convex
    const card = await convex.query(api.farcasterCards.getFarcasterCardByFid, { fid });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Return card data for client-side generation
    return NextResponse.json({
      success: true,
      card: {
        fid: card.fid,
        username: card.username,
        displayName: card.displayName,
        pfpUrl: card.pfpUrl,
        bio: card.bio,
        neynarScore: card.neynarScore,
        rarity: card.rarity,
        suit: card.suit,
        rank: card.rank,
        suitSymbol: card.suitSymbol,
        color: card.color,
        power: card.power,
        foil: card.foil,
        wear: card.wear,
      },
      message: 'Use the returned card data to generate video on client side',
    });
  } catch (error: any) {
    console.error('Regenerate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
