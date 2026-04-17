/**
 * API Route: Prepare Roulette Claim
 * Mirrors the Convex prepareRouletteClaim action but as REST API
 * so mobile Farcaster app can get the signature synchronously before wallet popup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { ethers } from 'ethers';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const convex = new ConvexHttpClient(CONVEX_URL);

    // Blacklist check
    const banCheck = await convex.query(api.blacklist.checkBlacklist, { address: normalizedAddress });
    if (banCheck.isBlacklisted) {
      return NextResponse.json({ error: 'Account banned' }, { status: 403 });
    }

    // Get unclaimed spin
    const unclaimed = await convex.query(api.roulette.getUnclaimedSpin, { address: normalizedAddress });
    if (!unclaimed) {
      return NextResponse.json({ error: 'No unclaimed spin found' }, { status: 400 });
    }

    // Mark as pending (idempotency lock)
    await convex.mutation(api.roulette.markSpinAsPending, { spinId: unclaimed._id });

    // Sign
    const privateKey = process.env.VBMS_SIGNER_PRIVATE_KEY;
    if (!privateKey) throw new Error('VBMS_SIGNER_PRIVATE_KEY not configured');

    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const wallet = new ethers.Wallet(privateKey);
    const amountInWei = ethers.parseEther(unclaimed.prizeAmount.toString());
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'bytes32'],
      [normalizedAddress, amountInWei, nonce]
    );
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    return NextResponse.json({
      amount: unclaimed.prizeAmount,
      nonce,
      signature,
      spinId: unclaimed._id,
    });
  } catch (error: any) {
    console.error('❌ Roulette prepare-claim error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
