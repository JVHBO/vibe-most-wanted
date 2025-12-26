/**
 * API Route: Finish VBMS Poker Battle
 *
 * Signs the battle result and returns signature for blockchain verification
 *
 * SECURITY FEATURES:
 * - Rate limiting (1 request per battleId per 30 seconds)
 * - Input validation (battleId bounds, address format)
 * - Prevents duplicate signatures for same battle
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Rate limiting: track last request time per battleId
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 30000; // 30 seconds between requests for same battle

// Track signed battles to prevent duplicates
const signedBattles = new Set<string>();

function checkRateLimit(battleId: string): boolean {
  const now = Date.now();
  const key = battleId.toString();
  const lastRequest = rateLimitMap.get(key);

  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    return false; // Rate limited
  }

  rateLimitMap.set(key, now);

  // Cleanup old entries (keep map small)
  if (rateLimitMap.size > 1000) {
    const cutoff = now - RATE_LIMIT_MS * 2;
    for (const [k, time] of rateLimitMap.entries()) {
      if (time < cutoff) rateLimitMap.delete(k);
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { battleId, winnerAddress } = body;

    if (!battleId || !winnerAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: battleId and winnerAddress' },
        { status: 400 }
      );
    }

    // SECURITY: Input validation - check battleId is valid number
    const battleIdNum = Number(battleId);
    if (isNaN(battleIdNum) || battleIdNum <= 0 || battleIdNum > 1000000000) {
      console.warn('⚠️ Invalid battleId:', battleId);
      return NextResponse.json(
        { error: 'Invalid battleId' },
        { status: 400 }
      );
    }

    // SECURITY: Input validation - check address format
    if (!ethers.isAddress(winnerAddress)) {
      console.warn('⚠️ Invalid winner address:', winnerAddress);
      return NextResponse.json(
        { error: 'Invalid winner address format' },
        { status: 400 }
      );
    }

    // SECURITY: Check if battle was already signed (prevent duplicate signatures)
    const battleKey = `${battleId}-${winnerAddress.toLowerCase()}`;
    if (signedBattles.has(battleKey)) {
      console.warn('⚠️ Battle already signed:', battleKey);
      return NextResponse.json(
        { error: 'Signature already generated for this battle result' },
        { status: 409 }
      );
    }

    // SECURITY: Rate limiting
    if (!checkRateLimit(battleId.toString())) {
      console.warn('⚠️ Rate limited battleId:', battleId);
      return NextResponse.json(
        { error: 'Too many requests. Please wait 30 seconds.' },
        { status: 429 }
      );
    }

    console.log('🏁 Finishing VBMS battle:', { battleId, winnerAddress });

    // Get signer private key from environment
    const SIGNER_PRIVATE_KEY = process.env.VBMS_SIGNER_PRIVATE_KEY;

    if (!SIGNER_PRIVATE_KEY) {
      throw new Error('VBMS_SIGNER_PRIVATE_KEY not configured in environment variables');
    }

    // Create wallet from private key
    const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);

    // Create message hash for signature (same format as contract expects)
    // Contract expects: keccak256(abi.encodePacked(battleId, winner))
    const messageHash = ethers.solidityPackedKeccak256(
      ['uint256', 'address'],
      [BigInt(battleId), winnerAddress]
    );

    // Sign the message hash
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    // SECURITY: Mark battle as signed to prevent duplicate signatures
    signedBattles.add(battleKey);

    // Cleanup old signed battles to prevent memory leak (keep last 10000)
    if (signedBattles.size > 10000) {
      const entries = Array.from(signedBattles);
      entries.slice(0, 5000).forEach(e => signedBattles.delete(e));
    }

    console.log('✅ Battle result signed:', {
      battleId,
      winnerAddress,
      signature: signature.slice(0, 10) + '...',
    });

    return NextResponse.json({
      signature,
      battleId,
      winnerAddress,
    });

  } catch (error: any) {
    console.error('❌ Error signing battle result:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sign battle result' },
      { status: 500 }
    );
  }
}
