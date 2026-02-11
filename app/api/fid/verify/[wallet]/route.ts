import { NextResponse } from 'next/server';

const VIBEFID_CONTRACT = '0x60274A138d026E3cB337B40567100FdEC3127565';
const VIBEFID_ARB_CONTRACT = '0xC39DDd9E2798D5612C700B899d0c80707c542dB0';

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

    const walletLower = wallet.toLowerCase();

    // Check both Base and Arbitrum in parallel
    const [baseRes, arbRes] = await Promise.all([
      fetch(`https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}/isHolderOfContract?wallet=${walletLower}&contractAddress=${VIBEFID_CONTRACT}`).catch(() => null),
      fetch(`https://arb-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}/isHolderOfContract?wallet=${walletLower}&contractAddress=${VIBEFID_ARB_CONTRACT}`).catch(() => null),
    ]);

    let isHolder = false;

    if (baseRes?.ok) {
      const data = await baseRes.json();
      if (data.isHolderOfContract) isHolder = true;
    }

    if (!isHolder && arbRes?.ok) {
      const data = await arbRes.json();
      if (data.isHolderOfContract) isHolder = true;
    }

    if (isHolder) {
      return NextResponse.json({ verified: true }, {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
        },
      });
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
