/**
 * API Route: Sign VBMS Withdraw from Betting System (Cashout)
 *
 * Flow:
 * 1. Player requests cashout with their address
 * 2. API checks betting credits balance in Convex
 * 3. API generates nonce and signs claim message
 * 4. Frontend calls claimVBMS on VBMSPoolTroll contract
 * 5. Player pays gas, receives VBMS from pool
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { ethers } from 'ethers';
import { mintRateLimit, checkRateLimit as checkDistributedRateLimit } from '@/lib/security';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

// Minimum cashout (contract requirement)
const MIN_WITHDRAW = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { error: 'Missing address' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Rate limiting
    if (!(await checkDistributedRateLimit(address, mintRateLimit)).success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait 10 seconds.' },
        { status: 429 }
      );
    }

    // Get betting credits balance from Convex
    const convex = new ConvexHttpClient(CONVEX_URL);
    const credits = await convex.query(api.bettingCredits.getBettingCredits, {
      address: normalizedAddress,
    });

    if (!credits || credits.balance <= 0) {
      return NextResponse.json(
        { error: 'No credits to withdraw' },
        { status: 400 }
      );
    }

    if (credits.balance < MIN_WITHDRAW) {
      return NextResponse.json(
        { error: `Minimum withdraw is ${MIN_WITHDRAW} VBMS. You have ${credits.balance} credits.` },
        { status: 400 }
      );
    }

    const amount = credits.balance;

    console.log(`💸 Signing VBMS withdraw: ${amount} VBMS for ${address}`);

    // Get signer private key
    const SIGNER_PRIVATE_KEY = process.env.VBMS_SIGNER_PRIVATE_KEY;
    if (!SIGNER_PRIVATE_KEY) {
      throw new Error('VBMS_SIGNER_PRIVATE_KEY not configured');
    }

    // Generate unique nonce
    const nonce = ethers.hexlify(ethers.randomBytes(32));

    // Create wallet and sign
    const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);
    const amountInWei = ethers.parseEther(amount.toString());

    // Create message hash (same format as VBMSPoolTroll contract expects)
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'bytes32'],
      [address, amountInWei, nonce]
    );

    // Sign the message
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    console.log(`✅ Withdraw signed: ${amount} VBMS for ${address}`);

    // Clear betting credits BEFORE returning (so they can't claim twice)
    await convex.mutation(api.baccarat.processWithdraw, {
      address: normalizedAddress,
      amount,
      txHash: nonce, // Use nonce as identifier (txHash will be updated later if needed)
    });

    return NextResponse.json({
      success: true,
      amount,
      nonce,
      signature,
      totalDeposited: credits.totalDeposited || amount,
      profit: amount - (credits.totalDeposited || amount),
    });

  } catch (error: any) {
    console.error('❌ Withdraw sign error:', error);
    return NextResponse.json(
      { error: error.message || 'Withdraw failed' },
      { status: 500 }
    );
  }
}
