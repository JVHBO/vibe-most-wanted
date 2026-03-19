/**
 * Proxy: Get booster packs owned by an address
 * GET /api/vibemarket/owned?address=0x...&contractAddress=0x...
 */
import { NextRequest, NextResponse } from 'next/server';

const WIELD_BASE = 'https://build.wield.xyz/vibe/boosterbox';
const API_KEY = 'YUEPI-G3KJ7-5FCXV-ANSPV-BZ3DA';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const contractAddress = searchParams.get('contractAddress');

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({ limit: '100' });
    if (contractAddress) params.set('contractAddress', contractAddress);

    const res = await fetch(`${WIELD_BASE}/owner/${address}?${params}`, {
      headers: { 'API-KEY': API_KEY },
      next: { revalidate: 30 },
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
