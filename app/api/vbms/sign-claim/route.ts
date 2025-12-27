/**
 * API Route: Sign VBMS Claim Message
 *
 * Signs a claim message for VBMS token distribution
 * Used by convertTESTVBMStoVBMS mutation in Convex
 *
 * SECURITY FEATURES:
 * - Rate limiting (1 request per address per 10 seconds)
 * - Input validation (address format, amount bounds)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Rate limiting: track last request time per address
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10000; // 10 seconds between requests

// Amount bounds (in VBMS, not wei)
// MUST match Convex backend limits in vbmsClaim.ts
const MIN_CLAIM_AMOUNT = 100; // 100 VBMS minimum
const MAX_CLAIM_AMOUNT = 500000; // 500k VBMS maximum (contract has 750k, site uses 500k for buffer)

function checkRateLimit(address: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(address.toLowerCase());

  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    return false; // Rate limited
  }

  rateLimitMap.set(address.toLowerCase(), now);

  // Cleanup old entries (keep map small)
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
        { error: 'Missing required fields: address, amount, and nonce' },
        { status: 400 }
      );
    }

    // SECURITY: Input validation - check address format
    if (!ethers.isAddress(address)) {
      console.warn('⚠️ Invalid address format:', address);
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // SECURITY: Input validation - check amount bounds
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum < MIN_CLAIM_AMOUNT || amountNum > MAX_CLAIM_AMOUNT) {
      console.warn('⚠️ Invalid amount:', amount);
      return NextResponse.json(
        { error: `Amount must be between ${MIN_CLAIM_AMOUNT} and ${MAX_CLAIM_AMOUNT} VBMS` },
        { status: 400 }
      );
    }

    // SECURITY: Rate limiting
    if (!checkRateLimit(address)) {
      console.warn('⚠️ Rate limited:', address);
      return NextResponse.json(
        { error: 'Too many requests. Please wait 10 seconds.' },
        { status: 429 }
      );
    }

    console.log('📝 Signing VBMS claim:', { address, amount, nonce });

    // Get signer private key from environment
    const SIGNER_PRIVATE_KEY = process.env.VBMS_SIGNER_PRIVATE_KEY;

    if (!SIGNER_PRIVATE_KEY) {
      throw new Error('VBMS_SIGNER_PRIVATE_KEY not configured in environment variables');
    }

    // Create wallet from private key
    const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);

    // Convert amount to wei
    const amountInWei = ethers.parseEther(amount.toString());

    // Create message hash (same format as contract expects)
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'bytes32'],
      [address, amountInWei, nonce]
    );

    // Sign the message hash
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    console.log('✅ Claim signed:', {
      address,
      amount,
      nonce,
      signature: signature.slice(0, 10) + '...',
    });

    return NextResponse.json({
      signature,
      address,
      amount,
      nonce,
    });

  } catch (error: any) {
    console.error('❌ Error signing claim:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sign claim' },
      { status: 500 }
    );
  }
}
