import { NextResponse } from 'next/server';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;
const VIBEFID_CONTRACT = '0x60274A138d026E3cB337B40567100FdEC3127565';
const VIBEFID_ARB_CONTRACT = '0xC39DDd9E2798D5612C700B899d0c80707c542dB0';

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

    // Check both Base and Arbitrum in parallel
    const [baseRes, arbRes] = await Promise.all([
      fetch(`https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/isHolderOfContract?wallet=${walletLower}&contractAddress=${VIBEFID_CONTRACT}`, {
        headers: { 'Accept': 'application/json' },
      }).catch(() => null),
      fetch(`https://arb-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/isHolderOfContract?wallet=${walletLower}&contractAddress=${VIBEFID_ARB_CONTRACT}`, {
        headers: { 'Accept': 'application/json' },
      }).catch(() => null),
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
      return NextResponse.json({ verified: true }, { status: 200 });
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
