import { NextResponse } from 'next/server';

const WIELD_API_KEY = process.env.WIELD_API_KEY || '';
const CONTRACT = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';
const STATS_API = `https://build.wield.xyz/vibe/boosterbox/collection/${CONTRACT}/stats`;
const PRICE_API = `https://build.wield.xyz/vibe/boosterbox/price-chart/${CONTRACT}?timeframe=24h&chainId=8453&includeStats=true`;
const ETH_USD_API = 'https://build.wield.xyz/utils/eth-to-usd?eth=1';

export async function GET() {
  try {
    const headers: Record<string, string> = {
      'Origin': 'https://vibechain.com',
      'Referer': 'https://vibechain.com/',
    };
    if (WIELD_API_KEY) headers['API-KEY'] = WIELD_API_KEY;

    const [statsRes, priceRes, ethRes] = await Promise.all([
      fetch(STATS_API, { headers, next: { revalidate: 60 } }),
      fetch(PRICE_API, { headers, next: { revalidate: 60 } }),
      fetch(ETH_USD_API, { next: { revalidate: 60 } }),
    ]);

    if (!statsRes.ok || !priceRes.ok || !ethRes.ok) {
      return NextResponse.json({ error: 'upstream error' }, { status: 502 });
    }

    const [statsData, priceData, ethData] = await Promise.all([
      statsRes.json(), priceRes.json(), ethRes.json(),
    ]);

    return NextResponse.json({ statsData, priceData, ethData });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
