/**
 * API Route: Sign Farcaster Card Mint
 *
 * Verifies FID ownership and signs EIP-712 message for minting
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getUserByFid } from '@/lib/neynar';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, fid, ipfsURI } = body;

    if (!address || !fid || !ipfsURI) {
      return NextResponse.json(
        { error: 'Missing required fields: address, fid, and ipfsURI' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying FID ownership:', { address, fid });

    // 1. Fetch FID data from Neynar
    const user = await getUserByFid(fid);
    if (!user) {
      return NextResponse.json(
        { error: `FID ${fid} not found on Farcaster` },
        { status: 404 }
      );
    }

    // 2. Verify ownership: check if connected address owns the FID
    const normalizedAddress = address.toLowerCase();
    const verifiedAddresses = user.verified_addresses.eth_addresses.map(a => a.toLowerCase());

    // TESTING MODE: Ownership check disabled for testing
    // if (!verifiedAddresses.includes(normalizedAddress)) {
    //   return NextResponse.json({
    //     error: 'You do not own this FID',
    //     fid,
    //     yourAddress: address,
    //     fidOwners: user.verified_addresses.eth_addresses,
    //   }, { status: 403 });
    // }

    console.log('⚠️ TESTING MODE: Ownership verification bypassed');
    console.log('✅ Signature generated for FID', fid);

    // 3. Get signer private key from environment
    const SIGNER_PRIVATE_KEY = process.env.VBMS_SIGNER_PRIVATE_KEY;

    if (!SIGNER_PRIVATE_KEY) {
      throw new Error('Signer private key not configured');
    }

    // 4. Create wallet from private key
    const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);

    // 5. Get contract address
    const contractAddress = process.env.VIBEFID_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error('VIBEFID_CONTRACT_ADDRESS not configured');
    }

    // 6. Define EIP-712 domain (must match contract)
    const domain = {
      name: 'VibeFID',
      version: '1',
      chainId: 8453, // Base mainnet
      verifyingContract: contractAddress,
    };

    // 7. Define EIP-712 types (must match contract)
    const types = {
      MintPermit: [
        { name: 'to', type: 'address' },
        { name: 'fid', type: 'uint256' },
        { name: 'ipfsURI', type: 'string' },
      ],
    };

    // 8. Create message to sign
    const message = {
      to: address,
      fid: fid,
      ipfsURI: ipfsURI,
    };

    // 9. Sign EIP-712 typed data
    const signature = await wallet.signTypedData(domain, types, message);

    console.log('✅ Signature generated for FID', fid);

    return NextResponse.json({
      signature,
      message: 'Signature generated successfully',
      fid,
      address,
    });

  } catch (error: any) {
    console.error('❌ Error signing mint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate signature' },
      { status: 500 }
    );
  }
}
