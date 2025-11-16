/**
 * API Route: Buy Card Packs with VBMS Tokens
 *
 * Flow:
 * 1. Player transfers VBMS to pool (done in frontend)
 * 2. Player sends txHash to API
 * 3. API verifies transaction and mints packs
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { createPublicClient, http, parseEther } from 'viem';
import { base } from 'viem/chains';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const VBMS_TOKEN = '0xb03439567cd22f278b21e1ffcdfb8e1696763827';
const VBMS_POOL = '0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, packType, quantity, txHash } = body;

    if (!address || !packType || !quantity || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Pack prices (same as coins)
    const PACK_PRICES: Record<string, number> = {
      basic: 100,
      premium: 500,
      elite: 1500,
    };

    const vbmsAmount = PACK_PRICES[packType] * quantity;
    if (!vbmsAmount) {
      return NextResponse.json(
        { error: 'Invalid pack type' },
        { status: 400 }
      );
    }

    console.log(`💎 Verifying VBMS purchase: ${quantity}x ${packType} for ${vbmsAmount} VBMS from ${address}`);
    console.log(`📝 Transaction hash: ${txHash}`);

    // Setup viem client
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Verify transaction
    console.log(`🔍 Fetching transaction receipt...`);
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

    if (!receipt || receipt.status !== 'success') {
      throw new Error('Transaction not found or failed');
    }

    // Get transaction details
    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });

    // Verify transaction details
    if (tx.from.toLowerCase() !== address.toLowerCase()) {
      throw new Error('Transaction sender does not match');
    }

    if (tx.to?.toLowerCase() !== VBMS_TOKEN.toLowerCase()) {
      throw new Error('Transaction is not to VBMS token contract');
    }

    // Decode transaction input to verify it's a transfer to the pool
    // Transfer function signature: transfer(address,uint256)
    // We check if the "to" address in the call is the pool
    const poolAddressInCalldata = tx.input.slice(10, 74); // Extract address from calldata
    const expectedPool = VBMS_POOL.slice(2).toLowerCase().padStart(64, '0');

    if (poolAddressInCalldata.toLowerCase() !== expectedPool) {
      throw new Error('Transaction is not a transfer to the pool');
    }

    // Decode amount from calldata
    const amountInCalldata = BigInt('0x' + tx.input.slice(74));
    const expectedAmount = parseEther(vbmsAmount.toString());

    if (amountInCalldata < expectedAmount) {
      throw new Error(`Insufficient transfer amount. Expected ${vbmsAmount} VBMS`);
    }

    console.log(`✅ Transaction verified: ${vbmsAmount} VBMS from ${address} to pool`);

    // Mint packs in Convex
    const convex = new ConvexHttpClient(CONVEX_URL);
    const result = await convex.mutation(api.cardPacks.buyPackWithVBMS, {
      address,
      packType,
      quantity,
      txHash,
    });

    console.log(`🎁 Packs minted: ${result.packsReceived}x ${packType}`);

    return NextResponse.json({
      success: true,
      packsReceived: result.packsReceived,
      vbmsSpent: vbmsAmount,
      txHash,
    });

  } catch (error: any) {
    console.error('❌ VBMS purchase error:', error);
    return NextResponse.json(
      { error: error.message || 'Purchase failed' },
      { status: 500 }
    );
  }
}
