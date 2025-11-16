/**
 * API Route: Finish VBMS Poker Battle
 *
 * Signs the battle result and returns signature for blockchain verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

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
