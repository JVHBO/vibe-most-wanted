import { NextResponse } from 'next/server';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;
const VIBEFID_CONTRACT = '0x60274A138d026E3cB337B40567100FdEC3127565';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;

    if (!wallet || !wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { verified: false, reason: 'Invalid wallet address' },
        { status: 200 }
      );
    }

    const walletLower = wallet.toLowerCase();
    const url = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/isHolderOfContract?wallet=${walletLower}&contractAddress=${VIBEFID_CONTRACT}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.isHolderOfContract) {
        return NextResponse.json(
          { verified: true },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      { verified: false, reason: 'Not eligible' },
      { status: 200 }
    );

  } catch (error) {
    console.error('[verify] Error:', error);
    return NextResponse.json(
      { verified: false, reason: 'Verification failed' },
      { status: 200 }
    );
  }
}
