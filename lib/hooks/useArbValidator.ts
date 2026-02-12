/**
 * React hook for Arbitrum VBMSValidator contract
 * Validates free claims on-chain for Arbitrum Miniapp Rewards program.
 * No token transfers - just on-chain validation events.
 *
 * Uses Farcaster SDK provider directly (same pattern as other tx handlers)
 * with fallback to wagmi for non-Farcaster users.
 */

'use client';

import { useAccount } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';
import { CONTRACTS, VALIDATOR_ABI } from '../contracts';
import { sdk } from '@farcaster/miniapp-sdk';
import { isMiniappMode, checkArbitrumSupport } from '@/lib/utils/miniapp';

// ClaimType enum matching contract
export const ARB_CLAIM_TYPE = {
  DAILY_LOGIN: 0,
  ROULETTE_SPIN: 1,
  ROULETTE_CLAIM: 2,
  FREE_CARD: 3,
  MISSION: 4,
  QUEST: 5,
  SHARE: 6,
  LEADERBOARD: 7,
} as const;

export type ArbClaimType = typeof ARB_CLAIM_TYPE[keyof typeof ARB_CLAIM_TYPE];

/**
 * Hook to validate claims on Arbitrum
 * Returns validateOnArb function that handles the full flow:
 * 1. Get signature from backend
 * 2. Call validateClaim on Arbitrum contract via Farcaster SDK or wagmi
 */
export function useArbValidator() {
  const { address } = useAccount();

  const validateOnArb = async (amount: number, claimType: ArbClaimType): Promise<string | null> => {
    if (!address) return null;

    // Safety net: in miniapp context, check if ARB is actually supported
    if (isMiniappMode()) {
      const supported = await checkArbitrumSupport();
      if (!supported) {
        console.warn('[ArbValidator] ARB not supported by this client, skipping validation');
        return null;
      }
    }

    try {
      // Generate nonce
      const nonce = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('') as `0x${string}`;

      // Get signature from backend
      const res = await fetch('/api/arb/sign-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount, nonce }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('[ArbValidator] Sign failed:', err.error);
        return null;
      }

      const { signature } = await res.json();

      // Encode the contract call
      const callData = encodeFunctionData({
        abi: VALIDATOR_ABI,
        functionName: 'validateClaim',
        args: [
          parseEther(amount.toString()),
          claimType,
          nonce as `0x${string}`,
          signature as `0x${string}`,
        ],
      });

      let txHash: string;

      // Try Farcaster SDK provider first (miniapp context)
      try {
        const provider = await sdk.wallet.getEthereumProvider();
        if (provider) {
          txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: address as `0x${string}`,
              to: CONTRACTS.VBMSValidator as `0x${string}`,
              data: callData,
              chainId: `0x${CONTRACTS.ARBITRUM_CHAIN_ID.toString(16)}`, // 0xa4b1
            }],
          }) as string;

          console.log('[ArbValidator] TX via Farcaster SDK:', txHash);
          return txHash;
        }
      } catch (farcasterErr: any) {
        console.warn('[ArbValidator] Farcaster SDK failed:', farcasterErr.message);
      }

      // Fallback: wagmi sendTransaction
      try {
        const { sendTransaction } = await import('wagmi/actions');
        const { config } = await import('@/lib/wagmi');
        txHash = await sendTransaction(config, {
          to: CONTRACTS.VBMSValidator as `0x${string}`,
          data: callData,
          chainId: CONTRACTS.ARBITRUM_CHAIN_ID,
        });
        console.log('[ArbValidator] TX via wagmi:', txHash);
        return txHash;
      } catch (wagmiErr: any) {
        console.warn('[ArbValidator] wagmi fallback failed:', wagmiErr.message);
        return null;
      }
    } catch (err: any) {
      // Never block the main claim flow - validation is secondary
      console.warn('[ArbValidator] Failed (non-blocking):', err.message);
      return null;
    }
  };

  return {
    validateOnArb,
  };
}
