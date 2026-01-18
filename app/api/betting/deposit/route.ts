/**
 * API Route: Deposit VBMS to Betting System
 *
 * Flow:
 * 1. Player transfers VBMS to betting contract (done in frontend)
 * 2. Player sends txHash to API
 * 3. API verifies transaction and adds betting credits
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { parseEther } from 'viem';
import { verifyERC20TransferByLogs } from '@/lib/blockchain/tx-utils';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const VBMS_TOKEN = '0xb03439567cd22f278b21e1ffcdfb8e1696763827';
const VBMS_POOL = '0x062b914668f3fd35c3ae02e699cb82e1cf4be18b'; // VBMSPoolTroll - deposit goes to pool

// Deposit limits to protect the house pool
const MIN_DEPOSIT = 100;
const MAX_DEPOSIT = 5000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, amount, txHash } = body;

    if (!address || !amount || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate deposit limits
    const amountNum = parseFloat(amount);
    if (amountNum < MIN_DEPOSIT) {
      return NextResponse.json(
        { error: `Minimum deposit is ${MIN_DEPOSIT} VBMS` },
        { status: 400 }
      );
    }
    if (amountNum > MAX_DEPOSIT) {
      return NextResponse.json(
        { error: `Maximum deposit is ${MAX_DEPOSIT} VBMS` },
        { status: 400 }
      );
    }

    console.log(`💰 Verifying betting deposit: ${amount} VBMS from ${address}`);
    console.log(`📝 Transaction hash: ${txHash}`);

    // Verify ERC20 transfer using Transfer event logs
    // This method works with Smart Contract Wallets (Coinbase Smart Wallet, etc.)
    // because it checks the Transfer event `from` field, not tx.from
    const expectedAmount = parseEther(amount.toString());
    const verification = await verifyERC20TransferByLogs(
      txHash as `0x${string}`,
      address,          // expected from (token holder)
      VBMS_POOL,        // expected to (pool contract)
      expectedAmount,   // minimum amount
      VBMS_TOKEN        // token contract
    );

    if (!verification.verified) {
      throw new Error(verification.error || 'Transfer verification failed');
    }

    console.log(`✅ Transaction verified: ${amount} VBMS from ${verification.actualFrom} to pool contract`);

    // Add betting credits in Convex
    const convex = new ConvexHttpClient(CONVEX_URL);
    const result = await convex.mutation(api.bettingCredits.addBettingCredits, {
      address,
      amount: parseFloat(amount),
      txHash,
    });

    console.log(`🎰 Betting credits added: ${result.newBalance} total credits`);

    return NextResponse.json({
      success: true,
      creditsAdded: parseFloat(amount),
      newBalance: result.newBalance,
      txHash,
    });

  } catch (error: any) {
    console.error('❌ Betting deposit error:', error);
    return NextResponse.json(
      { error: error.message || 'Deposit failed' },
      { status: 500 }
    );
  }
}
