/**
 * GET /api/verify/roulette-tx/[address]
 *
 * Quest verification endpoint: checks if a wallet has used the roulette
 * and completed an on-chain TX (claim on Base or Arbitrum).
 *
 * Response format (always 200):
 *   { "verified": true }
 *   { "verified": false, "reason": "No roulette TX found" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const raw = params.address;
    if (!raw || !/^0x[0-9a-fA-F]{40}$/.test(raw)) {
      return NextResponse.json(
        { verified: false, reason: 'Invalid address' },
        { status: 200 }
      );
    }

    const address = raw.toLowerCase();

    // Query rouletteSpins for this address — look for any spin with a txHash (on-chain claim)
    const result = await convex.query(api.roulette.getSpinHistory, { address });

    if (!result || result.length === 0) {
      return NextResponse.json(
        { verified: false, reason: 'No roulette spins found' },
        { status: 200 }
      );
    }

    // Check if any spin has an on-chain txHash (Base or ARB claim)
    const hasTx = result.some(
      (spin: any) =>
        (spin.txHash && spin.txHash !== 'inbox') ||
        spin.paidTxHash
    );

    if (!hasTx) {
      return NextResponse.json(
        { verified: false, reason: 'No on-chain roulette TX found' },
        { status: 200 }
      );
    }

    return NextResponse.json({ verified: true }, { status: 200 });
  } catch (err: any) {
    console.error('[verify/roulette-tx]', err);
    // Always return 200 to avoid quest platform errors
    return NextResponse.json(
      { verified: false, reason: 'Internal error' },
      { status: 200 }
    );
  }
}
