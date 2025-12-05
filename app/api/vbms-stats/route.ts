import { NextResponse } from 'next/server';

const VBMS_CONTRACT = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';
const WIELD_API = `https://build.wield.xyz/vibe/boosterbox/collection/${VBMS_CONTRACT}/stats`;

export async function GET() {
  try {
    const response = await fetch(WIELD_API, {
      headers: {
        'Origin': 'https://vibechain.com',
        'Referer': 'https://vibechain.com/',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      throw new Error(`Wield API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching VBMS stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
