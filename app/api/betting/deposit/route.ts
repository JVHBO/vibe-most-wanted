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
import { createPublicClient, http, parseEther } from 'viem';
import { base } from 'viem/chains';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const VBMS_TOKEN = '0xb03439567cd22f278b21e1ffcdfb8e1696763827';
const VBMS_BETTING = '0x668c8d288b8670fdb9005fa91be046e4c2585af4';

// SECURITY: Max deposit limit to prevent abuse
const MAX_DEPOSIT_AMOUNT = 1000000; // 1M VBMS max per deposit

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

    // SECURITY: Validate amount parameter
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || !isFinite(parsedAmount)) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a valid number' },
        { status: 400 }
      );
    }
    if (parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be greater than 0' },
        { status: 400 }
      );
    }
    if (parsedAmount > MAX_DEPOSIT_AMOUNT) {
      return NextResponse.json(
        { error: `Invalid amount: exceeds maximum deposit of ${MAX_DEPOSIT_AMOUNT} VBMS` },
        { status: 400 }
      );
    }

    // SECURITY: Validate address format (basic Ethereum address check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // SECURITY: Validate txHash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    console.log(`💰 Verifying betting deposit: ${amount} VBMS from ${address}`);
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

    // Decode transaction input to verify it's a transfer to the betting contract
    // Transfer function signature: transfer(address,uint256)
    const bettingAddressInCalldata = tx.input.slice(10, 74); // Extract address from calldata
    const expectedBetting = VBMS_BETTING.slice(2).toLowerCase().padStart(64, '0');

    if (bettingAddressInCalldata.toLowerCase() !== expectedBetting) {
      throw new Error('Transaction is not a transfer to the betting contract');
    }

    // Decode amount from calldata
    const amountInCalldata = BigInt('0x' + tx.input.slice(74));
    const expectedAmount = parseEther(amount.toString());

    if (amountInCalldata < expectedAmount) {
      throw new Error(`Insufficient transfer amount. Expected ${amount} VBMS`);
    }

    console.log(`✅ Transaction verified: ${amount} VBMS from ${address} to betting contract`);

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
