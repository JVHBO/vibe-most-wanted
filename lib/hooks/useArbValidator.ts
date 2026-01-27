/**
 * React hook for Arbitrum VBMSValidator contract
 * Validates free claims on-chain for Arbitrum Miniapp Rewards program.
 * No token transfers - just on-chain validation events.
 */

'use client';

import { useWriteContract, useAccount } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';
import { CONTRACTS, VALIDATOR_ABI } from '../contracts';
import { arbitrum } from 'wagmi/chains';

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
 * 2. Call validateClaim on Arbitrum contract
 */
export function useArbValidator() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { address } = useAccount();

  const validateOnArb = async (amount: number, claimType: ArbClaimType): Promise<string | null> => {
    if (!address) return null;

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
        return null; // Don't block the claim if validation fails
      }

      const { signature } = await res.json();

      // Call contract on Arbitrum
      const txHash = await writeContractAsync({
        address: CONTRACTS.VBMSValidator as `0x${string}`,
        abi: VALIDATOR_ABI,
        functionName: 'validateClaim',
        args: [
          parseEther(amount.toString()),
          claimType,
          nonce as `0x${string}`,
          signature as `0x${string}`,
        ],
        chainId: CONTRACTS.ARBITRUM_CHAIN_ID,
      });

      console.log('[ArbValidator] TX:', txHash);
      return txHash;
    } catch (err: any) {
      // Never block the main claim flow - validation is secondary
      console.warn('[ArbValidator] Failed (non-blocking):', err.message);
      return null;
    }
  };

  return {
    validateOnArb,
    hash,
    isPending,
    error,
  };
}
