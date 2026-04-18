/**
 * API Route: Prepare Roulette Claim
 * Mirrors the Convex prepareRouletteClaim action but as REST API
 * so mobile Farcaster app can get the signature synchronously before wallet popup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { isAddress } from 'ethers';
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const convex = new ConvexHttpClient(CONVEX_URL);

    // Blacklist check
    const banCheck = await convex.query(api.blacklist.checkBlacklist, { address: normalizedAddress });
    if (banCheck.isBlacklisted) {
      return NextResponse.json({ error: 'Account banned' }, { status: 403 });
    }

    const prepared = await convex.action(api.roulette.prepareRouletteClaim, {
      address: normalizedAddress,
    });

    return NextResponse.json({
      amount: prepared.amount,
      nonce: prepared.nonce,
      signature: prepared.signature,
      spinId: prepared.spinId,
    });
  } catch (error: any) {
    console.error('❌ Roulette prepare-claim error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
