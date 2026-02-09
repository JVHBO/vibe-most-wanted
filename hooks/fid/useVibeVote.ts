"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/fid/convex-generated/api";
import { useState, useCallback } from "react";
import { useTransferVBMS } from "./useVBMSContracts";
import { CONTRACTS } from "@/lib/fid/contracts";
import { parseEther } from "viem";

// Cost per paid vote in VBMS tokens
const VOTE_COST_VBMS = "100";

interface UseVibeVoteProps {
  cardFid: number;
  voterFid?: number;
  voterAddress?: `0x${string}`;
}

interface VoteResult {
  success: boolean;
  error?: string;
  voteCount?: number;
}

export function useVibeVote({ cardFid, voterFid, voterAddress }: UseVibeVoteProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // VBMS Transfer hook for paid votes
  const { transfer: transferVBMS, isPending: isTransferPending } = useTransferVBMS();

  // Queries
  const cardVotes = useQuery(api.cardVotes.getCardVotes, { fid: cardFid });

  const hasVoted = useQuery(
    api.cardVotes.hasUserVoted,
    voterFid ? { cardFid, voterFid } : "skip"
  );

  const freeVotesRemaining = useQuery(
    api.cardVotes.getUserFreeVotesRemaining,
    voterFid ? { voterFid } : "skip"
  );

  const dailyLeaderboard = useQuery(api.cardVotes.getDailyLeaderboard, { limit: 10 });
  const prizeInfo = useQuery(api.cardVotes.getDailyPrizeInfo, {});
  const pastWinners = useQuery(api.cardVotes.getPastWinners, { limit: 7 });

  // Mutation
  const voteForCardMutation = useMutation(api.cardVotes.voteForCard);

  // Vote handler with optional VibeMail message/audio/image
  const vote = useCallback(async (
    isPaid: boolean = false,
    voteCount: number = 1,
    message?: string,
    audioId?: string,
    imageId?: string
  ): Promise<VoteResult> => {
    if (!voterFid || !voterAddress) {
      return { success: false, error: "Not connected" };
    }

    if (isVoting || isTransferPending) {
      return { success: false, error: "Vote in progress" };
    }

    setIsVoting(true);
    setError(null);
    setTxHash(null);

    try {
      // Transfer VBMS to pool contract (0 for free, 10 per vote for paid)
      const totalCost = isPaid ? parseEther(VOTE_COST_VBMS) * BigInt(voteCount) : BigInt(0);
      console.log(isPaid ? "💰 Paid vote" : "🆓 Free vote", "- transferring", totalCost.toString(), "VBMS to pool...");

      try {
        const hash = await transferVBMS(
          CONTRACTS.VBMSPoolTroll as `0x${string}`,
          totalCost
        );
        console.log("✅ VBMS transfer TX:", hash);
        setTxHash(hash);
      } catch (txErr: any) {
        console.error("❌ VBMS transfer failed:", txErr);
        const txErrMsg = txErr.message || "VBMS transfer failed";
        setError(txErrMsg);
        setIsVoting(false);
        return { success: false, error: txErrMsg };
      }

      // Save vote to Convex with optional VibeMail
      const hasContent = message?.trim() || imageId;
      const result = await voteForCardMutation({
        cardFid,
        voterFid,
        voterAddress,
        isPaid,
        voteCount: isPaid ? voteCount : 1,
        message: message?.trim() || undefined,
        audioId: hasContent ? audioId : undefined, // Only save audio if message/image exists
        imageId: imageId || undefined,
      });

      if (!result.success) {
        setError(result.error || "Vote failed");
        return { success: false, error: result.error };
      }

      return { success: true, voteCount: result.voteCount };
    } catch (err: any) {
      const errorMsg = err.message || "Failed to vote";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVoting(false);
    }
  }, [cardFid, voterFid, voterAddress, isVoting, isTransferPending, voteForCardMutation, transferVBMS]);

  // Free vote with optional message
  const voteFree = useCallback((message?: string, audioId?: string, imageId?: string) =>
    vote(false, 1, message, audioId, imageId), [vote]);

  // Paid vote with optional message
  const votePaid = useCallback((count: number = 1, message?: string, audioId?: string, imageId?: string) =>
    vote(true, count, message, audioId, imageId), [vote]);

  return {
    // Vote state
    isVoting: isVoting || isTransferPending,
    error,
    hasVoted: hasVoted ?? false,
    txHash,

    // Card votes
    totalVotes: cardVotes?.totalVotes ?? 0,
    voterCount: cardVotes?.voterCount ?? 0,

    // Free votes
    freeVotesRemaining: freeVotesRemaining?.remaining ?? 3,
    freeVotesUsed: freeVotesRemaining?.used ?? 0,
    maxFreeVotes: freeVotesRemaining?.max ?? 3,

    // Leaderboard & Prize
    dailyLeaderboard: dailyLeaderboard ?? [],
    prizeInfo: prizeInfo ?? null,
    pastWinners: pastWinners ?? [],

    // Vote cost
    voteCostVBMS: VOTE_COST_VBMS,

    // Actions
    voteFree,
    votePaid,
    vote,
  };
}

export default useVibeVote;
