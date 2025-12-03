/**
 * VBMS DEX Hook
 *
 * Provides buy/sell functionality for VBMS tokens
 *
 * BUY Flow (ETH → VBMS) - Uses VBMSRouter:
 *   1. Call buyVBMS() on router → get VBMS tokens in ONE tx!
 *
 * SELL Flow (VBMS → ETH) - DIRECT via token contract:
 *   1. Call sell() directly on VBMS token → get ETH
 *   (No pack minting needed! Works for any amount)
 */

import { useCallback, useState, useEffect } from 'react';
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  usePublicClient,
} from 'wagmi';
import { parseEther, formatEther, toHex, hexToBigInt } from 'viem';
import { BOOSTER_DROP_V2_ABI, VBMS_CONTRACTS, VBMS_DEX_CONSTANTS, VBMS_ROUTER_ABI } from '../contracts/BoosterDropV2ABI';
import { VBMS_DIRECT_SELL_ABI } from '../contracts/BoosterTokenV2ABI';
import { ERC20_ABI } from '../contracts';

// ============================================================================
// PRICE HOOKS
// ============================================================================

/**
 * Get current mint price in ETH for X packs
 */
export function useMintPrice(quantity: number = 1) {
  const { data: price, isLoading, refetch } = useReadContract({
    address: VBMS_CONTRACTS.boosterDrop,
    abi: BOOSTER_DROP_V2_ABI,
    functionName: 'getMintPrice',
    args: [BigInt(quantity)],
    chainId: VBMS_CONTRACTS.chainId,
  });

  return {
    priceWei: price as bigint | undefined,
    priceEth: price ? formatEther(price as bigint) : '0',
    pricePerPack: price ? formatEther((price as bigint) / BigInt(quantity)) : '0',
    isLoading,
    refetch,
  };
}

/**
 * Get VBMS token balance
 */
export function useVBMSBalance(address?: `0x${string}`) {
  const { data: balance, isLoading, refetch } = useReadContract({
    address: VBMS_CONTRACTS.boosterToken,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: VBMS_CONTRACTS.chainId,
    query: { enabled: !!address },
  });

  return {
    balanceWei: balance as bigint | undefined,
    balance: balance ? formatEther(balance as bigint) : '0',
    isLoading,
    refetch,
  };
}

/**
 * Get VBMS allowance for BoosterDrop
 */
export function useVBMSAllowance(owner?: `0x${string}`) {
  const { data: allowance, isLoading, refetch } = useReadContract({
    address: VBMS_CONTRACTS.boosterToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: owner ? [owner, VBMS_CONTRACTS.boosterDrop] : undefined,
    chainId: VBMS_CONTRACTS.chainId,
    query: { enabled: !!owner },
  });

  return {
    allowanceWei: allowance as bigint | undefined,
    allowance: allowance ? formatEther(allowance as bigint) : '0',
    isLoading,
    refetch,
  };
}

// ============================================================================
// BUY HOOK (ETH → VBMS) - Uses VBMSRouter for single transaction!
// ============================================================================

export type BuyStep = 'idle' | 'fetching_token_id' | 'buying' | 'waiting' | 'complete' | 'error';

/**
 * Buy VBMS tokens with ETH via VBMSRouter
 * Single transaction: mint pack + sell for VBMS automatically!
 */
export function useBuyVBMS() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [step, setStep] = useState<BuyStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const buyVBMS = useCallback(
    async (packCount: number, priceWei: bigint) => {
      if (!address || !publicClient) {
        setError('Wallet not connected');
        return;
      }

      if (packCount < 1) {
        setError('Must buy at least 1 pack');
        return;
      }

      setStep('fetching_token_id');
      setError(null);

      try {
        // Get totalSupply as estimate for startingTokenId
        const totalSupply = await publicClient.readContract({
          address: VBMS_CONTRACTS.boosterDrop,
          abi: BOOSTER_DROP_V2_ABI,
          functionName: 'totalSupply',
        });

        const startingTokenId = (totalSupply as bigint) + BigInt(1);
        console.log('Starting token ID:', startingTokenId.toString());

        setStep('buying');
        const priceWithBuffer = priceWei + (priceWei * BigInt(3) / BigInt(100));

        const buyHash = await writeContractAsync({
          address: VBMS_CONTRACTS.vbmsRouter,
          abi: VBMS_ROUTER_ABI,
          functionName: 'buyVBMS',
          args: [BigInt(packCount), startingTokenId],
          value: priceWithBuffer,
          chainId: VBMS_CONTRACTS.chainId,
        });

        setStep('waiting');
        await publicClient.waitForTransactionReceipt({ hash: buyHash });

        setStep('complete');
        return { buyHash };
      } catch (err: any) {
        console.error('Buy failed:', err);
        setError(err.shortMessage || err.message);
        setStep('error');
        throw err;
      }
    },
    [address, publicClient, writeContractAsync]
  );

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
  }, []);

  return {
    buyVBMS,
    step,
    error,
    reset,
    isLoading: step !== 'idle' && step !== 'complete' && step !== 'error',
  };
}

// ============================================================================
// SELL HOOK (VBMS → ETH) - Direct sell on token contract
// ============================================================================

export type SellStep = 'idle' | 'selling' | 'waiting_sell' | 'complete' | 'error';

/**
 * Sell VBMS tokens for ETH - DIRECT method
 * Uses sell() function directly on VBMS token contract
 * Works for ANY amount of tokens (not just multiples of 100k)
 * Single transaction - much simpler!
 */
export function useSellVBMS() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [step, setStep] = useState<SellStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const sellVBMS = useCallback(
    async (tokenAmount: string, referrer?: `0x${string}`) => {
      if (!address || !publicClient) {
        setError('Wallet not connected');
        return;
      }

      setStep('idle');
      setError(null);

      try {
        const ref = referrer || VBMS_DEX_CONSTANTS.DEFAULT_REFERRER;
        const amount = parseEther(tokenAmount);

        // Direct sell on token contract - single transaction!
        setStep('selling');
        console.log('💰 Selling', tokenAmount, 'VBMS for ETH...');

        const sellHash = await writeContractAsync({
          address: VBMS_CONTRACTS.boosterToken,
          abi: VBMS_DIRECT_SELL_ABI,
          functionName: 'sell',
          args: [
            amount,                                    // tokenAmount
            address,                                   // recipient
            BigInt(0),                                 // minEthOut (0 = no slippage protection)
            ref,                                       // referrer
            '0x0000000000000000000000000000000000000000' as `0x${string}`, // orderReferrer (zero address)
          ],
          chainId: VBMS_CONTRACTS.chainId,
        });

        setStep('waiting_sell');
        console.log('⏳ Waiting for sell tx:', sellHash);

        await publicClient.waitForTransactionReceipt({ hash: sellHash });

        setStep('complete');
        console.log('✅ Sell complete!');

        return { sellHash };
      } catch (err: any) {
        console.error('❌ Sell failed:', err);
        setError(err.shortMessage || err.message);
        setStep('error');
        throw err;
      }
    },
    [address, publicClient, writeContractAsync]
  );

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
  }, []);

  return {
    sellVBMS,
    step,
    error,
    reset,
    isLoading: step !== 'idle' && step !== 'complete' && step !== 'error',
  };
}

// ============================================================================
// QUOTES
// ============================================================================

/**
 * Calculate expected VBMS output for ETH input
 * Note: This is approximate due to bonding curve and fees
 */
export function useQuoteBuyVBMS(ethAmount: string) {
  const { priceEth } = useMintPrice(1);

  // Each pack gives ~80-100k VBMS after fees
  // Conservative estimate: 80k VBMS per pack
  const VBMS_PER_PACK = 80000;

  const packs = priceEth && parseFloat(priceEth) > 0
    ? Math.floor(parseFloat(ethAmount) / parseFloat(priceEth))
    : 0;

  const estimatedVBMS = packs * VBMS_PER_PACK;

  return {
    packs,
    estimatedVBMS,
    pricePerPack: priceEth,
  };
}

/**
 * Calculate expected ETH output for VBMS input
 * Uses real contract quote for accurate pricing
 */
export function useQuoteSellVBMS(vbmsAmount: string) {
  const amount = vbmsAmount && parseFloat(vbmsAmount) > 0
    ? parseEther(vbmsAmount)
    : BigInt(0);

  const { data: ethOut, isLoading } = useReadContract({
    address: VBMS_CONTRACTS.boosterToken,
    abi: VBMS_DIRECT_SELL_ABI,
    functionName: 'getTokenSellQuote',
    args: amount > BigInt(0) ? [amount] : undefined,
    chainId: VBMS_CONTRACTS.chainId,
    query: { enabled: amount > BigInt(0) },
  });

  return {
    estimatedEth: ethOut ? formatEther(ethOut as bigint) : '0',
    estimatedEthWei: ethOut as bigint | undefined,
    isLoading,
    // For display: how many "packs worth" this represents
    packs: parseFloat(vbmsAmount || '0') / 100000,
  };
}
