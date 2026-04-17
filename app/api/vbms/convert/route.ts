/**
 * API Route: Convert TESTVBMS to VBMS
 * Wraps the Convex convertTESTVBMStoVBMS action via HTTP client
 * so mobile Farcaster can call it without WebSocket delays that break wallet popups.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(request: NextRequest) {
  try {
    const { address, fid, amount } = await request.json();
    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    const convex = new ConvexHttpClient(CONVEX_URL);
    const result = await convex.action(api.vbmsClaim.convertTESTVBMStoVBMS, {
      address,
      fid,
      amount,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Convert TESTVBMS error:', error);
    const msg = error?.data || error?.message || 'Conversion failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
