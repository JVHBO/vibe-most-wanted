/**
 * API Route: Sign Roulette Claim Message
 *
 * Separate endpoint for roulette prizes (allows any amount)
 * Only called from Convex backend with valid spin data
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { mintRateLimit, checkRateLimit as checkDistributedRateLimit } from '@/lib/security';

// Roulette has no minimum, but cap at reasonable max
const MAX_CLAIM_AMOUNT = 100000; // 100k max (biggest roulette prize)

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Only Convex backend can call this endpoint
    const internalSecret = request.headers.get('x-internal-secret');
    const expectedSecret = process.env.VMW_INTERNAL_SECRET;
    if (!expectedSecret || internalSecret !== expectedSecret) {
      console.warn('⚠️ Unauthorized sign-roulette attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { address, amount, nonce } = body;

    if (!address || !amount || !nonce) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > MAX_CLAIM_AMOUNT) {
      return NextResponse.json(
        { error: `Amount must be between 1 and ${MAX_CLAIM_AMOUNT} VBMS` },
        { status: 400 }
      );
    }

    if (!(await checkDistributedRateLimit(address, mintRateLimit)).success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait.' },
        { status: 429 }
      );
    }

    console.log('🎰 Signing roulette claim:', { address, amount, nonce });

    const SIGNER_PRIVATE_KEY = process.env.VBMS_SIGNER_PRIVATE_KEY;

    if (!SIGNER_PRIVATE_KEY) {
      throw new Error('VBMS_SIGNER_PRIVATE_KEY not configured');
    }

    const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);
    const amountInWei = ethers.parseEther(amount.toString());

    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'bytes32'],
      [address, amountInWei, nonce]
    );

    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    console.log('✅ Roulette claim signed:', {
      address,
      amount,
      signature: signature.slice(0, 10) + '...',
    });

    return NextResponse.json({
      signature,
      address,
      amount,
      nonce,
    });

  } catch (error: any) {
    console.error('❌ Error signing roulette claim:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sign' },
      { status: 500 }
    );
  }
}
