/**
 * API Route: Sign Roulette Claim Message
 *
 * Separate endpoint for roulette prizes (allows any amount)
 * Only called from Convex backend with valid spin data
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Rate limiting: track last request time per address
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 5000; // 5 seconds between requests

// Roulette has no minimum, but cap at reasonable max
const MAX_CLAIM_AMOUNT = 100000; // 100k max (biggest roulette prize)

function checkRateLimit(address: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(address.toLowerCase());

  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    return false;
  }

  rateLimitMap.set(address.toLowerCase(), now);

  if (rateLimitMap.size > 1000) {
    const cutoff = now - RATE_LIMIT_MS * 2;
    for (const [key, time] of rateLimitMap.entries()) {
      if (time < cutoff) rateLimitMap.delete(key);
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
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

    if (!checkRateLimit(address)) {
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
