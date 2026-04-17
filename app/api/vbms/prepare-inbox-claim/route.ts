/**
 * API Route: Prepare Inbox Claim (VBMS from inbox)
 * Wraps the Convex prepareInboxClaim action via HTTP client
 * so mobile Farcaster wallet popup fires immediately after.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });

    const convex = new ConvexHttpClient(CONVEX_URL);
    const result = await convex.action(api.vbmsClaim.prepareInboxClaim, { address });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ prepare-inbox-claim error:', error);
    const msg = error?.data || error?.message || 'Failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
