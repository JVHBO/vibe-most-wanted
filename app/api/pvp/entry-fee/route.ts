/**
 * API Route: Pay VBMS Entry Fee for PvP Battle
 *
 * Flow:
 * 1. Player transfers VBMS to VBMSPoolTroll contract (done in frontend)
 * 2. Player sends txHash to API
 * 3. API verifies transaction and records entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { parseEther } from 'viem';
import { verifyERC20TransferByLogs } from '@/lib/blockchain/tx-utils';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const VBMS_TOKEN = '0xb03439567cd22f278b21e1ffcdfb8e1696763827';
const VBMS_POOL_TROLL = '0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b';

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

    console.log(`💰 Verifying PvP entry fee: ${amount} VBMS from ${address}`);
    console.log(`📝 Transaction hash: ${txHash}`);

    // Verify ERC20 transfer using Transfer event logs
    // This method works with Smart Contract Wallets (Coinbase Smart Wallet, etc.)
    // because it checks the Transfer event `from` field, not tx.from
    const expectedAmount = parseEther(amount.toString());
    const verification = await verifyERC20TransferByLogs(
      txHash as `0x${string}`,
      address,           // expected from (token holder)
      VBMS_POOL_TROLL,   // expected to (pool)
      expectedAmount,    // minimum amount
      VBMS_TOKEN         // token contract
    );

    if (!verification.verified) {
      throw new Error(verification.error || 'Transfer verification failed');
    }

    console.log(`✅ Transaction verified: ${amount} VBMS from ${verification.actualFrom} to VBMSPoolTroll`);

    // Record entry fee in Convex
    const convex = new ConvexHttpClient(CONVEX_URL);
    const result = await convex.mutation(api.pvp.recordEntryFee, {
      address,
      amount: parseFloat(amount),
      txHash,
    });

    console.log(`⚔️ PvP entry fee recorded for ${address}`);

    return NextResponse.json({
      success: true,
      entryPaid: parseFloat(amount),
      txHash,
    });

  } catch (error: any) {
    console.error('❌ PvP entry fee error:', error);
    return NextResponse.json(
      { error: error.message || 'Entry fee payment failed' },
      { status: 500 }
    );
  }
}
