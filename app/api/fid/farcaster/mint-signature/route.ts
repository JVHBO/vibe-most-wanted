/**
 * API Route: Sign Farcaster Card Mint
 *
 * Verifies FID ownership and signs EIP-712 message for minting
 * Supports multi-chain: Base + Arbitrum
 *
 * SECURITY FEATURES:
 * - FID ownership verification via Neynar API
 * - Rate limiting (1 request per address per 10 seconds)
 * - Cross-chain check: FID can only be minted on ONE chain
 * - EIP-712 typed data signing
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getUserByFid } from "@/lib/fid/neynar";

// Chain configs for cross-chain check
const CHAIN_CONFIGS = {
  base: {
    contractAddress: process.env.VIBEFID_CONTRACT_ADDRESS || '0x60274A138d026E3cB337B40567100FdEC3127565',
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  },
  arbitrum: {
    contractAddress: process.env.VIBEFID_ARB_CONTRACT_ADDRESS || '',
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  },
} as const;

type MintChain = keyof typeof CHAIN_CONFIGS;

// Minimal ABI for fidMinted check
const FID_MINTED_ABI = ['function fidMinted(uint256) view returns (bool)'];

// Rate limiting: track last request time per address
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10000; // 10 seconds between requests

function checkRateLimit(address: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(address.toLowerCase());

  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    return false; // Rate limited
  }

  rateLimitMap.set(address.toLowerCase(), now);

  // Cleanup old entries (keep map small)
  if (rateLimitMap.size > 1000) {
    const cutoff = now - RATE_LIMIT_MS * 2;
    for (const [key, time] of rateLimitMap.entries()) {
      if (time < cutoff) rateLimitMap.delete(key);
    }
  }

  return true;
}

/** Check if FID is already minted on a specific chain */
async function checkFidMintedOnChain(fid: number, chain: MintChain): Promise<boolean> {
  const config = CHAIN_CONFIGS[chain];
  if (!config.contractAddress) return false; // Contract not deployed yet

  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const contract = new ethers.Contract(config.contractAddress, FID_MINTED_ABI, provider);
    const minted = await contract.fidMinted(fid);
    return minted;
  } catch (err) {
    console.error(`Failed to check fidMinted on ${chain}:`, err);
    // If check fails, don't block mint (but log for monitoring)
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, fid, ipfsURI, chain: requestedChain } = body;

    if (!address || !fid || !ipfsURI) {
      return NextResponse.json(
        { error: 'Missing required fields: address, fid, and ipfsURI' },
        { status: 400 }
      );
    }

    // Validate chain param (default to "base" for backwards compat)
    const chain: MintChain = requestedChain === 'arbitrum' ? 'arbitrum' : 'base';

    // Validate that the target chain contract is configured
    const targetConfig = CHAIN_CONFIGS[chain];
    if (!targetConfig.contractAddress) {
      return NextResponse.json(
        { error: `Contract not yet deployed on ${chain}. Please use Base.` },
        { status: 400 }
      );
    }

    // Security: Validate FID is a positive integer
    const fidNum = typeof fid === 'number' ? fid : parseInt(fid);
    if (isNaN(fidNum) || fidNum <= 0 || !Number.isInteger(fidNum)) {
      return NextResponse.json(
        { error: 'Invalid FID: must be a positive integer' },
        { status: 400 }
      );
    }

    // SECURITY: Rate limiting
    if (!checkRateLimit(address)) {
      console.warn('Rate limited:', address);
      return NextResponse.json(
        { error: 'Too many requests. Please wait 10 seconds.' },
        { status: 429 }
      );
    }

    console.log('Verifying FID ownership:', { address, fid, chain });

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
    const verifiedAddresses = user.verified_addresses?.eth_addresses?.map((a: string) => a.toLowerCase()) || [];
    const custodyAddress = user.custody_address?.toLowerCase();

    const isOwner = verifiedAddresses.includes(normalizedAddress) || custodyAddress === normalizedAddress;

    if (!isOwner) {
      console.error('FID ownership verification failed:', {
        fid,
        claimedAddress: address,
        verifiedAddresses: user.verified_addresses?.eth_addresses || [],
        custodyAddress: user.custody_address,
      });
      return NextResponse.json({
        error: 'You do not own this FID. Connect with a wallet that is verified on your Farcaster account.',
        fid,
        yourAddress: address,
        verifiedAddresses: user.verified_addresses?.eth_addresses || [],
        custodyAddress: user.custody_address,
      }, { status: 403 });
    }

    console.log('FID ownership verified:', { fid, address });

    // 3. CROSS-CHAIN CHECK: Verify FID not minted on ANY chain
    const otherChain: MintChain = chain === 'base' ? 'arbitrum' : 'base';

    const [mintedOnTarget, mintedOnOther] = await Promise.all([
      checkFidMintedOnChain(fidNum, chain),
      checkFidMintedOnChain(fidNum, otherChain),
    ]);

    if (mintedOnTarget) {
      return NextResponse.json(
        { error: `FID ${fid} already minted on ${chain}` },
        { status: 409 }
      );
    }

    if (mintedOnOther) {
      return NextResponse.json(
        { error: `FID ${fid} already minted on ${otherChain}. Each FID can only be minted on one chain.` },
        { status: 409 }
      );
    }

    // 4. Get signer private key from environment
    const SIGNER_PRIVATE_KEY = process.env.VBMS_SIGNER_PRIVATE_KEY;

    if (!SIGNER_PRIVATE_KEY) {
      throw new Error('Signer private key not configured');
    }

    // 5. Create wallet from private key
    const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);

    // 6. Define EIP-712 domain (must match contract on target chain)
    const domain = {
      name: 'VibeFID',
      version: '1',
      chainId: targetConfig.chainId,
      verifyingContract: targetConfig.contractAddress,
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

    console.log('Signature generated for FID', fid, 'on', chain);

    return NextResponse.json({
      signature,
      message: 'Signature generated successfully',
      fid,
      address,
      chain,
    });

  } catch (error: any) {
    console.error('Error signing mint:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate signature' },
      { status: 500 }
    );
  }
}
