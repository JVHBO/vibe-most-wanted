import { NextResponse } from 'next/server';

const VIBEFID_CONTRACT = '0x60274A138d026E3cB337B40567100FdEC3127565';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
    const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY;
  try {
    if (!ALCHEMY_KEY) {
      return NextResponse.json({ verified: false });
    }

    const { wallet } = await params;

    if (!wallet || !wallet.match(/^0x[a-fA-F0-9]{40}$/i)) {
      return NextResponse.json({ verified: false });
    }

    const url = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}/isHolderOfContract?wallet=${wallet.toLowerCase()}&contractAddress=${VIBEFID_CONTRACT}`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.isHolderOfContract) {
        return NextResponse.json({ verified: true }, {
          headers: {
            'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
          },
        });
      }
    }

    return NextResponse.json({ verified: false }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch {
    return NextResponse.json({ verified: false });
  }
}
