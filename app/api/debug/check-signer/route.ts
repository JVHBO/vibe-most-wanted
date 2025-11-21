/**
 * Debug endpoint: Check if signer address matches
 * REMOVE THIS IN PRODUCTION
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function GET(request: NextRequest) {
  try {
    const SIGNER_PRIVATE_KEY = process.env.VBMS_SIGNER_PRIVATE_KEY;

    if (!SIGNER_PRIVATE_KEY) {
      return NextResponse.json({
        error: 'VBMS_SIGNER_PRIVATE_KEY not configured',
      });
    }

    const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);
    const derivedAddress = wallet.address;
    const expectedAddress = '0xd99624896203B1dd1AaED4945bF4C76e489B7009';

    return NextResponse.json({
      derivedAddress,
      expectedAddress,
      matches: derivedAddress.toLowerCase() === expectedAddress.toLowerCase(),
      message: derivedAddress.toLowerCase() === expectedAddress.toLowerCase()
        ? '✅ Signer is CORRECT'
        : '❌ Signer MISMATCH - Update private key in Vercel env vars',
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
    });
  }
}
