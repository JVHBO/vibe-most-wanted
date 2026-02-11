import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/lib/fid/convex-generated/api';

const VIBEFID_CONVEX_URL =
  process.env.NEXT_PUBLIC_VIBEFID_CONVEX_URL ||
  'https://scintillating-mandrill-101.convex.cloud';

const convex = new ConvexHttpClient(VIBEFID_CONVEX_URL);

export async function POST(request: Request) {
  try {
    const { fid, adminKey } = await request.json();

    // Admin key from environment variable
    const ADMIN_KEY = process.env.ADMIN_REGENERATE_KEY;
    if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
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
