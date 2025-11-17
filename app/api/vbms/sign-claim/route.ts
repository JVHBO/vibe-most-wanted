/**
 * API Route: Sign VBMS Claim Message
 *
 * Signs a claim message for VBMS token distribution
 * Used by convertVBMStoVBMS mutation in Convex
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

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
