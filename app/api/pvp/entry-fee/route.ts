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
import { waitForTxReceipt, getBasePublicClient } from '@/lib/blockchain/tx-utils';

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

    // Wait for tx with robust retry (handles RPC propagation delays)
    const receipt = await waitForTxReceipt(txHash as `0x${string}`);

    if (receipt.status !== 'success') {
      throw new Error('Transaction failed');
    }

    // Get transaction details
    const publicClient = getBasePublicClient();
    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });

    // Verify transaction details
    if (tx.from.toLowerCase() !== address.toLowerCase()) {
      throw new Error('Transaction sender does not match');
    }

    if (tx.to?.toLowerCase() !== VBMS_TOKEN.toLowerCase()) {
      throw new Error('Transaction is not to VBMS token contract');
    }

    // Decode transaction input to verify it's a transfer to VBMSPoolTroll
    // Transfer function signature: transfer(address,uint256)
    const poolAddressInCalldata = tx.input.slice(10, 74); // Extract address from calldata
    const expectedPool = VBMS_POOL_TROLL.slice(2).toLowerCase().padStart(64, '0');

    if (poolAddressInCalldata.toLowerCase() !== expectedPool) {
      throw new Error('Transaction is not a transfer to VBMSPoolTroll contract');
    }

    // Decode amount from calldata
    const amountInCalldata = BigInt('0x' + tx.input.slice(74));
    const expectedAmount = parseEther(amount.toString());

    if (amountInCalldata < expectedAmount) {
      throw new Error(`Insufficient transfer amount. Expected ${amount} VBMS`);
    }

    console.log(`✅ Transaction verified: ${amount} VBMS from ${address} to VBMSPoolTroll`);

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
