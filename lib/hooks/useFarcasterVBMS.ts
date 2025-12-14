/**
 * Farcaster-compatible VBMS hooks
 * Works in both miniapp (Farcaster SDK) and web (wagmi)
 * Uses wagmi hooks with @farcaster/miniapp-wagmi-connector for universal support
 *
 * Updated to use useWriteContractWithAttribution for Base builder code attribution
 */

import { formatEther } from 'viem';
import { CONTRACTS, ERC20_ABI } from '../contracts';
import { useReadContract } from 'wagmi';
import { useWriteContractWithAttribution } from './useWriteContractWithAttribution';

/**
 * Get VBMS balance - works in both miniapp and web via wagmi
 */
export function useFarcasterVBMSBalance(address?: string) {
  const { data: balanceData, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.VBMSToken as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
      staleTime: 30_000, // Cache for 30 seconds to prevent excessive refetches
      refetchInterval: 30_000, // Only refetch every 30 seconds
    },
  });

  const balance = balanceData ? formatEther(balanceData as bigint) : '0';

  return {
    balance,
    balanceRaw: (balanceData as bigint) || BigInt(0),
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Get VBMS allowance - works in both miniapp and web via wagmi
 */
export function useFarcasterVBMSAllowance(owner?: string, spender?: string) {
  const { data: allowanceData, isLoading, refetch } = useReadContract({
    address: CONTRACTS.VBMSToken as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: owner && spender ? [owner as `0x${string}`, spender as `0x${string}`] : undefined,
    query: {
      enabled: !!owner && !!spender,
      staleTime: 30_000,
    },
  });

  const allowance = allowanceData ? formatEther(allowanceData as bigint) : '0';

  return {
    allowance,
    allowanceRaw: (allowanceData as bigint) || BigInt(0),
    isLoading,
    refetch,
  };
}

/**
 * Approve VBMS spending - works in both miniapp and web via wagmi
 * Uses builder code attribution on Base
 */
export function useFarcasterApproveVBMS() {
  const { writeContractAsync, isPending, error, builderCode } = useWriteContractWithAttribution();

  const approve = async (spender: `0x${string}`, amount: bigint): Promise<`0x${string}`> => {
    console.log('[useFarcasterApproveVBMS] Approving VBMS with builder code:', {
      spender,
      amount: amount.toString(),
      contractAddress: CONTRACTS.VBMSToken,
      builderCode,
    });

    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.VBMSToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amount],
        chainId: CONTRACTS.CHAIN_ID,
      });

      console.log('[useFarcasterApproveVBMS] Approve hash:', hash);
      return hash;
    } catch (err) {
      console.error('[useFarcasterApproveVBMS] Approve error:', err);
      throw err;
    }
  };

  return {
    approve,
    isPending,
    error: error as Error | null,
  };
}

/**
 * Transfer VBMS - works in both miniapp and web via wagmi
 * Uses builder code attribution on Base
 */
export function useFarcasterTransferVBMS() {
  const { writeContractAsync, isPending, error, builderCode } = useWriteContractWithAttribution();

  const transfer = async (to: `0x${string}`, amount: bigint): Promise<`0x${string}`> => {
    console.log('[useFarcasterTransferVBMS] Transferring VBMS with builder code:', {
      to,
      amount: amount.toString(),
      contractAddress: CONTRACTS.VBMSToken,
      builderCode,
    });

    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.VBMSToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [to, amount],
        chainId: CONTRACTS.CHAIN_ID,
      });

      console.log('[useFarcasterTransferVBMS] Transfer hash:', hash);
      return hash;
    } catch (err) {
      console.error('[useFarcasterTransferVBMS] Transfer error:', err);
      throw err;
    }
  };

  return {
    transfer,
    isPending,
    error: error as Error | null,
  };
}
