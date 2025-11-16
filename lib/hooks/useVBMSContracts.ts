/**
 * VBMS Contract Hooks
 *
 * Custom React hooks for interacting with VBMS smart contracts
 * Uses wagmi for blockchain interactions
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, type Address } from 'viem';
import { CONTRACTS, ERC20_ABI, VBMS_POKER_BATTLE_ABI } from '@/lib/contracts';
import { useState, useEffect } from 'react';

/**
 * Read VBMS token balance for an address
 */
export function useVBMSBalance(address: Address | string | undefined) {
  const { data: balance, refetch, isLoading, error } = useReadContract({
    address: CONTRACTS.VBMSToken as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address as Address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  return {
    balance: balance ? formatEther(balance as bigint) : '0',
    balanceRaw: balance as bigint | undefined,
    refetch,
    isLoading,
    error,
  };
}

/**
 * Read VBMS allowance for a spender
 */
export function useVBMSAllowance(owner: Address | string | undefined, spender: Address | string) {
  const { data: allowance, refetch, isLoading } = useReadContract({
    address: CONTRACTS.VBMSToken as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: owner && spender ? [owner as Address, spender as Address] : undefined,
    query: {
      enabled: !!owner && !!spender,
    }
  });

  return {
    allowance: allowance ? formatEther(allowance as bigint) : '0',
    allowanceRaw: allowance as bigint | undefined,
    refetch,
    isLoading,
  };
}

/**
 * Approve VBMS spending
 */
export function useApproveVBMS() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = async (spender: Address, amount: bigint) => {
    writeContract({
      address: CONTRACTS.VBMSToken as Address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    });
  };

  return {
    approve,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Transfer VBMS tokens
 */
export function useTransferVBMS() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const transfer = async (to: Address, amount: bigint) => {
    writeContract({
      address: CONTRACTS.VBMSToken as Address,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, amount],
    });
    return hash;
  };

  return {
    transfer,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Create a new poker battle with stake
 */
export function useCreateBattle() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createBattle = async (stakeAmount: bigint) => {
    writeContract({
      address: CONTRACTS.VBMSPokerBattle as Address,
      abi: VBMS_POKER_BATTLE_ABI,
      functionName: 'createBattle',
      args: [stakeAmount],
    });
  };

  return {
    createBattle,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Join an existing poker battle
 */
export function useJoinBattle() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const joinBattle = async (battleId: bigint) => {
    writeContract({
      address: CONTRACTS.VBMSPokerBattle as Address,
      abi: VBMS_POKER_BATTLE_ABI,
      functionName: 'joinBattle',
      args: [battleId],
    });
  };

  return {
    joinBattle,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Cancel a poker battle (must be creator)
 */
export function useCancelBattle() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const cancelBattle = async (battleId: bigint) => {
    writeContract({
      address: CONTRACTS.VBMSPokerBattle as Address,
      abi: VBMS_POKER_BATTLE_ABI,
      functionName: 'cancelBattle',
      args: [battleId],
    });
  };

  return {
    cancelBattle,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Finish a poker battle with winner and signature
 */
export function useFinishVBMSBattle() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const finishBattle = async (battleId: bigint, winner: Address, signature: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.VBMSPokerBattle as Address,
      abi: VBMS_POKER_BATTLE_ABI,
      functionName: 'finishBattle',
      args: [battleId, winner, signature],
    });
  };

  return {
    finishBattle,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Get active battle ID for a player
 */
export function useActiveBattle(address: Address | string | undefined) {
  const { data: battleId, refetch, isLoading } = useReadContract({
    address: CONTRACTS.VBMSPokerBattle as Address,
    abi: VBMS_POKER_BATTLE_ABI,
    functionName: 'getActiveBattle',
    args: address ? [address as Address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  return {
    battleId: battleId as bigint | undefined,
    refetch,
    isLoading,
  };
}

/**
 * Get battle details by ID
 */
export function useBattle(battleId: bigint | undefined) {
  const { data: battle, refetch, isLoading } = useReadContract({
    address: CONTRACTS.VBMSPokerBattle as Address,
    abi: VBMS_POKER_BATTLE_ABI,
    functionName: 'getBattle',
    args: battleId !== undefined ? [battleId] : undefined,
    query: {
      enabled: battleId !== undefined,
    }
  });

  return {
    battle,
    refetch,
    isLoading,
  };
}

/**
 * Claim VBMS from pool/troll contract
 * Note: This is a placeholder - actual claim function depends on the contract ABI
 */
export function useClaimVBMS() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [claimError, setClaimError] = useState<string | null>(null);

  const claim = async (amount: bigint, signature?: `0x${string}`) => {
    try {
      setClaimError(null);
      // This is a placeholder implementation
      // The actual claim function will depend on the VBMSPoolTroll contract ABI
      writeContract({
        address: CONTRACTS.VBMSPoolTroll as Address,
        abi: ERC20_ABI, // Replace with actual VBMSPoolTroll ABI when available
        functionName: 'transfer', // Replace with actual claim function
        args: [CONTRACTS.VBMSToken as Address, amount],
      });
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed');
    }
  };

  return {
    claim,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error: error || claimError,
  };
}
