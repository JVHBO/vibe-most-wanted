/**
 * API Route: Sign Arbitrum Validation Message
 *
 * Signs a validation message for the VBMSValidator contract on Arbitrum.
 * Used for free claims (roulette spins, free cards, login bonus, missions, etc.)
 * No token transfers - just on-chain validation for Arbitrum Miniapp Rewards.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 5000; // 5 seconds

function checkRateLimit(address: string): boolean {
  const now = Date.now();
  const last = rateLimitMap.get(address.toLowerCase());

  if (last && now - last < RATE_LIMIT_MS) {
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
    const { address, amount, nonce } = await request.json();

    if (!address || amount === undefined || !nonce) {
      return NextResponse.json(
        { error: 'Missing required fields: address, amount, nonce' },
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
    if (isNaN(amountNum) || amountNum < 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (!checkRateLimit(address)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait.' },
        { status: 429 }
      );
    }

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

    console.log('✅ Arb validation signed:', { address, amount, nonce: nonce.slice(0, 10) + '...' });

    return NextResponse.json({ signature, address, amount, nonce });
  } catch (error: any) {
    console.error('❌ Error signing arb validation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sign' },
      { status: 500 }
    );
  }
}
