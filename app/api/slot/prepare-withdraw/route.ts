import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(request: NextRequest) {
  try {
    const { address, amount } = await request.json();
    if (!address || !amount) {
      return NextResponse.json({ error: 'Missing address or amount' }, { status: 400 });
    }

    const convex = new ConvexHttpClient(CONVEX_URL);
    const result = await convex.action(api.slot.prepareWithdraw, { address, amount });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Slot withdraw prepare error:', error);
    const msg = error?.data || error?.message || 'Withdraw failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
