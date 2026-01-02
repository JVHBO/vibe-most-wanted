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
import { parseEther } from 'viem';
import { verifyERC20TransferByLogs } from '@/lib/blockchain/tx-utils';

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

    // Pack prices - must match frontend ShopView.tsx prices!
    // NORMAL_PRICE = 1000, BOOSTED_PRICE = 5000
    const PACK_PRICES: Record<string, number> = {
      basic: 1000,      // Normal pack
      boosted: 5000,    // Luck boost pack (5x price for better odds)
      premium: 500,     // Legacy - kept for backwards compatibility
      elite: 1500,      // Legacy - kept for backwards compatibility
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

    // Verify ERC20 transfer using Transfer event logs
    // This method works with Smart Contract Wallets (Coinbase Smart Wallet, etc.)
    // because it checks the Transfer event `from` field, not tx.from
    const expectedAmount = parseEther(vbmsAmount.toString());
    const verification = await verifyERC20TransferByLogs(
      txHash as `0x${string}`,
      address,          // expected from (token holder)
      VBMS_POOL,        // expected to (pool)
      expectedAmount,   // minimum amount
      VBMS_TOKEN        // token contract
    );

    if (!verification.verified) {
      throw new Error(verification.error || 'Transfer verification failed');
    }

    console.log(`✅ Transaction verified: ${vbmsAmount} VBMS from ${verification.actualFrom} to pool`);

    // Mint packs in Convex
    const convex = new ConvexHttpClient(CONVEX_URL);
    const result = await convex.mutation(api.cardPacks.buyPackWithVBMS, {
      address,
      packType,
      quantity,
      txHash,
      vbmsAmount, // Pass actual VBMS spent for transaction history
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
