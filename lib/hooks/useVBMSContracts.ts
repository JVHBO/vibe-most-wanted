/**
 * React hooks for VBMS Contract interactions
 * Uses wagmi v2 for Web3 interactions
 *
 * Updated to use useWriteContractWithAttribution for Base builder code attribution
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS, POOL_ABI, POKER_BATTLE_ABI, BETTING_ABI, ERC20_ABI } from '../contracts';
import { useWriteContractWithAttribution } from './useWriteContractWithAttribution';

// ============================================================================
// VBMS TOKEN HOOKS
// ============================================================================

/**
 * Get VBMS token balance for an address
 */
export function useVBMSBalance(address?: `0x${string}`) {
  const { data: balance, isLoading, refetch, error } = useReadContract({
    address: CONTRACTS.VBMSToken as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CONTRACTS.CHAIN_ID,
    query: {
      enabled: !!address,
    },
  });

  return {
    balance: balance ? formatEther(balance as bigint) : '0',
    balanceRaw: balance as bigint | undefined,
    isLoading,
    refetch,
    error,
  };
}

/**
 * Check VBMS allowance for a spender
 */
export function useVBMSAllowance(owner?: `0x${string}`, spender?: `0x${string}`) {
  const { data: allowance, isLoading, refetch } = useReadContract({
    address: CONTRACTS.VBMSToken as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    chainId: CONTRACTS.CHAIN_ID,
    query: {
      enabled: !!(owner && spender),
    },
  });

  return {
    allowance: allowance ? formatEther(allowance as bigint) : '0',
    allowanceRaw: allowance as bigint | undefined,
    isLoading,
    refetch,
  };
}

/**
 * Approve VBMS spending for a contract
 * Uses builder code attribution on Base
 */
export function useApproveVBMS() {
  const { writeContractAsync, isPending, error, builderCode } = useWriteContractWithAttribution();

  const approve = async (spender: `0x${string}`, amount: string): Promise<`0x${string}`> => {
    console.log("📝 Calling approve with builder code:", {
      tokenAddress: CONTRACTS.VBMSToken,
      spender,
      amount,
      amountParsed: parseEther(amount).toString(),
      builderCode,
    });

    const hash = await writeContractAsync({
      address: CONTRACTS.VBMSToken as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, parseEther(amount)],
      chainId: CONTRACTS.CHAIN_ID,
    });

    console.log("✅ Approve transaction hash:", hash);
    return hash;
  };

  return {
    approve,
    isPending,
    error,
  };
}

// ============================================================================
// POOL CONTRACT HOOKS
// ============================================================================

/**
 * Get pool balance
 * Uses balanceOf from VBMS token since getPoolBalance() might not exist in deployed contract
 */
export function usePoolBalance() {
  const { data: balance, isLoading, refetch } = useReadContract({
    address: CONTRACTS.VBMSToken as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [CONTRACTS.VBMSPoolTroll as `0x${string}`],
    chainId: CONTRACTS.CHAIN_ID,
  });

  return {
    balance: balance ? formatEther(balance as bigint) : '0',
    balanceRaw: balance as bigint | undefined,
    isLoading,
    refetch,
  };
}

/**
 * Get daily claim info for a user from the VBMSPoolTroll contract
 * Returns remaining daily limit and reset time
 */
export function useDailyClaimInfo(address?: `0x${string}`) {
  const { data, isLoading, refetch, error } = useReadContract({
    address: CONTRACTS.VBMSPoolTroll as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'getDailyClaimInfo',
    args: address ? [address] : undefined,
    chainId: CONTRACTS.CHAIN_ID,
    query: {
      enabled: !!address,
    },
  });

  // getDailyClaimInfo returns (uint256 remaining, uint256 resetTime)
  const result = data as [bigint, bigint] | undefined;

  // 🔒 IMPORTANT: If contract call fails, don't assume a high fallback value!
  // This prevents users from trying to claim more than their actual remaining limit.
  // Fallback to 0 to force UI to show "loading" or prevent claims until data loads.
  const hasValidData = result && result[0] !== undefined;

  // Site limit is 500k (lower than contract's 750k for safety margin)
  const SITE_DAILY_LIMIT = BigInt('500000000000000000000000'); // 500k in wei
  const SITE_DAILY_LIMIT_FORMATTED = '500000';

  // Cap the remaining value to site limit (user shouldn't see more than they can claim via site)
  const contractRemaining = hasValidData ? result[0] : BigInt(0);
  const cappedRemaining = contractRemaining > SITE_DAILY_LIMIT ? SITE_DAILY_LIMIT : contractRemaining;

  return {
    remaining: hasValidData ? formatEther(cappedRemaining) : '0',
    remainingRaw: hasValidData ? cappedRemaining : BigInt(0),
    resetTime: hasValidData ? Number(result[1]) : Math.floor(Date.now() / 1000) + 86400,
    dailyLimit: SITE_DAILY_LIMIT_FORMATTED, // Site limit (lower than contract's 750k for safety)
    isLoading,
    refetch,
    error,
    hasError: !!error || !hasValidData,
  };
}

/**
 * Claim VBMS from pool
 * Uses builder code attribution on Base for transaction attribution
 * The builder code suffix is appended to calldata - Solidity ignores extra bytes
 */
export function useClaimVBMS() {
  const { writeContractAsync, data: hash, isPending, error, builderCode } = useWriteContractWithAttribution();

  const claimVBMS = async (amount: string, nonce: string, signature: `0x${string}`) => {
    console.log("📝 Claiming VBMS with builder code:", {
      poolAddress: CONTRACTS.VBMSPoolTroll,
      amount,
      nonce,
      signature: signature.slice(0, 10) + '...',
      builderCode,
    });

    const txHash = await writeContractAsync({
      address: CONTRACTS.VBMSPoolTroll as `0x${string}`,
      abi: POOL_ABI,
      functionName: 'claimVBMS',
      args: [parseEther(amount), nonce as `0x${string}`, signature],
      chainId: CONTRACTS.CHAIN_ID,
    });

    console.log("✅ TX Hash:", txHash);
    return txHash;
  };

  return {
    claimVBMS,
    hash,
    isPending,
    isConfirming: false, // Not waiting for confirmation in this function
    isSuccess: false,
    error,
  };
}

// ============================================================================
// POKER BATTLE CONTRACT HOOKS
// ============================================================================

/**
 * Get battle details
 */
export function useBattle(battleId?: number) {
  const { data, isLoading, refetch, error } = useReadContract({
    address: CONTRACTS.VBMSPokerBattle as `0x${string}`,
    abi: POKER_BATTLE_ABI,
    functionName: 'battles',
    args: battleId !== undefined && battleId > 0 ? [BigInt(battleId)] : undefined,
    chainId: CONTRACTS.CHAIN_ID,
    query: {
      enabled: battleId !== undefined && battleId > 0,
    },
  });

  const battle = data as [bigint, `0x${string}`, `0x${string}`, bigint, bigint, number, `0x${string}`] | undefined;

  return {
    battle: battle ? {
      id: Number(battle[0]),
      player1: battle[1],
      player2: battle[2],
      stake: formatEther(battle[3]),
      createdAt: Number(battle[4]),
      status: battle[5], // 0=WAITING, 1=ACTIVE, 2=FINISHED, 3=CANCELLED
      winner: battle[6],
    } : null,
    isLoading,
    refetch,
  };
}

/**
 * Get player's active battle
 * NOTE: This checks the blockchain contract for active battles using the public mapping
 */
export function useActiveBattle(address?: `0x${string}`) {
  const { data: battleId, isLoading, refetch, error } = useReadContract({
    address: CONTRACTS.VBMSPokerBattle as `0x${string}`,
    abi: POKER_BATTLE_ABI,
    functionName: 'activeBattles',
    args: address ? [address] : undefined,
    chainId: CONTRACTS.CHAIN_ID,
    query: {
      enabled: !!address,
      retry: false,
    },
  });

  return {
    battleId: battleId ? Number(battleId) : 0,
    isLoading,
    refetch,
  };
}

/**
 * Create a new battle
 */
export function useCreateBattle() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContractWithAttribution();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const createBattle = async (stake: string) => {
    console.log("📝 Creating battle with:", {
      contractAddress: CONTRACTS.VBMSPokerBattle,
      stake,
      stakeParsed: parseEther(stake).toString(),
      chainId: CONTRACTS.CHAIN_ID,
    });

    await writeContractAsync({
      address: CONTRACTS.VBMSPokerBattle as `0x${string}`,
      abi: POKER_BATTLE_ABI,
      functionName: 'createBattle',
      args: [parseEther(stake)],
      chainId: CONTRACTS.CHAIN_ID,
    });
  };

  return {
    createBattle,
    hash,
    receipt,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Join an existing battle
 */
export function useJoinBattle() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContractWithAttribution();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const joinBattle = async (battleId: number) => {
    await writeContractAsync({
      address: CONTRACTS.VBMSPokerBattle as `0x${string}`,
      abi: POKER_BATTLE_ABI,
      functionName: 'joinBattle',
      args: [BigInt(battleId)],
      chainId: CONTRACTS.CHAIN_ID,
    });
  };

  return {
    joinBattle,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Cancel a battle and get your stake back
 */
export function useCancelBattle() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContractWithAttribution();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const cancelBattle = async (battleId: number) => {
    console.log("📝 Cancelling battle:", {
      contractAddress: CONTRACTS.VBMSPokerBattle,
      battleId,
      chainId: CONTRACTS.CHAIN_ID,
    });

    await writeContractAsync({
      address: CONTRACTS.VBMSPokerBattle as `0x${string}`,
      abi: POKER_BATTLE_ABI,
      functionName: 'cancelBattle',
      args: [BigInt(battleId)],
      chainId: CONTRACTS.CHAIN_ID,
    });
  };

  return {
    cancelBattle,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// ============================================================================
// BETTING CONTRACT HOOKS
// ============================================================================

/**
 * Get betting stats for a battle
 */
export function useBattleBets(battleId?: number) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.VBMSBetting as `0x${string}`,
    abi: BETTING_ABI,
    functionName: 'battleBets',
    args: battleId !== undefined ? [BigInt(battleId)] : undefined,
  });

  const bets = data as [bigint, bigint, bigint, boolean, `0x${string}`] | undefined;

  return {
    bets: bets ? {
      totalBetsOnPlayer1: formatEther(bets[0]),
      totalBetsOnPlayer2: formatEther(bets[1]),
      totalBettors: Number(bets[2]),
      resolved: bets[3],
      actualWinner: bets[4],
    } : null,
    isLoading,
    refetch,
  };
}

/**
 * Get user's bet on a battle
 */
export function useUserBet(battleId?: number, address?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.VBMSBetting as `0x${string}`,
    abi: BETTING_ABI,
    functionName: 'bets',
    args: battleId !== undefined && address ? [BigInt(battleId), address] : undefined,
  });

  const bet = data as [`0x${string}`, bigint, `0x${string}`, boolean] | undefined;

  return {
    bet: bet ? {
      bettor: bet[0],
      amount: formatEther(bet[1]),
      predictedWinner: bet[2],
      claimed: bet[3],
    } : null,
    isLoading,
    refetch,
  };
}

/**
 * Place a bet on a battle
 */
export function usePlaceBet() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContractWithAttribution();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const placeBet = async (battleId: number, predictedWinner: `0x${string}`, amount: string) => {
    await writeContractAsync({
      address: CONTRACTS.VBMSBetting as `0x${string}`,
      abi: BETTING_ABI,
      functionName: 'placeBet',
      args: [BigInt(battleId), predictedWinner, parseEther(amount)],
    });
  };

  return {
    placeBet,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Claim winnings from a bet
 */
export function useClaimBetWinnings() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContractWithAttribution();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claimWinnings = async (battleId: number) => {
    await writeContractAsync({
      address: CONTRACTS.VBMSBetting as `0x${string}`,
      abi: BETTING_ABI,
      functionName: 'claimWinnings',
      args: [BigInt(battleId)],
    });
  };

  return {
    claimWinnings,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Get betting stats for a user
 */
export function useUserBettingStats(address?: `0x${string}`) {
  const { data: totalWinnings } = useReadContract({
    address: CONTRACTS.VBMSBetting as `0x${string}`,
    abi: BETTING_ABI,
    functionName: 'totalWinnings',
    args: address ? [address] : undefined,
  });

  const { data: totalBetsPlaced } = useReadContract({
    address: CONTRACTS.VBMSBetting as `0x${string}`,
    abi: BETTING_ABI,
    functionName: 'totalBetsPlaced',
    args: address ? [address] : undefined,
  });

  const { data: correctPredictions } = useReadContract({
    address: CONTRACTS.VBMSBetting as `0x${string}`,
    abi: BETTING_ABI,
    functionName: 'correctPredictions',
    args: address ? [address] : undefined,
  });

  return {
    totalWinnings: totalWinnings ? formatEther(totalWinnings as bigint) : '0',
    totalBetsPlaced: totalBetsPlaced ? Number(totalBetsPlaced) : 0,
    correctPredictions: correctPredictions ? Number(correctPredictions) : 0,
    winRate: totalBetsPlaced && Number(totalBetsPlaced) > 0
      ? (Number(correctPredictions) / Number(totalBetsPlaced) * 100).toFixed(1)
      : '0',
  };
}

// ============================================================================
// POKER BATTLE - FINISH BATTLE
// ============================================================================

/**
 * Finish a VBMS Poker Battle
 * Calls the backend to sign the result, then submits to blockchain
 */
export function useFinishVBMSBattle() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const finishBattle = async (battleId: number, winnerAddress: `0x${string}`) => {
    try {
      console.log('🏁 Finishing VBMS battle:', { battleId, winnerAddress });

      // Call backend to generate signature
      const response = await fetch('/api/poker/finish-battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId, winnerAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Backend error:', data);
        throw new Error(data.error || 'Failed to get signature from backend');
      }

      const { signature } = data;

      if (!signature) {
        console.error('❌ No signature in response:', data);
        throw new Error('Backend returned invalid response: missing signature');
      }

      console.log('✅ Got signature from backend:', signature);

      // Call contract with signature
      const txHash = await writeContractAsync({
        address: CONTRACTS.VBMSPokerBattle as `0x${string}`,
        abi: POKER_BATTLE_ABI,
        functionName: 'finishBattle' as any,
        args: [BigInt(battleId), winnerAddress, signature as `0x${string}`] as any,
        chainId: CONTRACTS.CHAIN_ID,
      });

      console.log('✅ TX Hash:', txHash);
      return txHash;
    } catch (err: any) {
      console.error('❌ Error finishing battle:', err);
      throw err;
    }
  };

  return {
    finishBattle,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Transfer VBMS tokens
 * Uses builder code attribution on Base
 */
export function useTransferVBMS() {
  const { writeContractAsync, isPending, error, builderCode } = useWriteContractWithAttribution();

  const transfer = async (to: `0x${string}`, amount: bigint): Promise<`0x${string}`> => {
    console.log("💸 Transferring VBMS with builder code:", {
      to,
      amount: amount.toString(),
      contractAddress: CONTRACTS.VBMSToken,
      builderCode,
    });

    const hash = await writeContractAsync({
      address: CONTRACTS.VBMSToken as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, amount],
      chainId: CONTRACTS.CHAIN_ID,
    });

    console.log("✅ Transfer transaction hash:", hash);
    return hash;
  };

  return {
    transfer,
    isPending,
    error,
  };
}
