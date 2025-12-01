"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface SimpleBettingOverlayProps {
  roomId: string;
  currentRound: number;
  player1Address: string;
  player1Username: string;
  player2Address: string;
  player2Username: string;
  spectatorAddress: string;
  onBetPlaced?: () => void;
}

/**
 * SIMPLE BETTING OVERLAY
 *
 * Ultra-simple UI for spectators to bet on each round
 * - Just tap the card to bet
 * - Shows current round and odds
 * - Instant visual feedback
 */
export function SimpleBettingOverlay({
  roomId,
  currentRound,
  player1Address,
  player1Username,
  player2Address,
  player2Username,
  spectatorAddress,
  onBetPlaced,
}: SimpleBettingOverlayProps) {
  const [isBetting, setIsBetting] = useState(false);
  const [claimedFreeCredits, setClaimedFreeCredits] = useState(false);

  // Get betting credits balance
  const credits = useQuery(
    api.bettingCredits.getBettingCredits,
    spectatorAddress ? { address: spectatorAddress } : "skip"
  );

  // Claim starter credits mutation
  const claimStarterCredits = useMutation(api.bettingCredits.claimStarterCredits);

  // Auto-claim free credits for new users
  useEffect(() => {
    if (spectatorAddress && credits && credits.balance === 0 && !claimedFreeCredits) {
      setClaimedFreeCredits(true);
      claimStarterCredits({ address: spectatorAddress })
        .then((result) => {
          if (result.success) {
            console.log("✅ Free starter credits claimed!");
          }
        })
        .catch((err) => {
          console.error("Failed to claim starter credits:", err);
          setClaimedFreeCredits(false); // Allow retry
        });
    }
  }, [spectatorAddress, credits, claimedFreeCredits, claimStarterCredits]);

  // Check if already bet on this round
  const existingBet = useQuery(
    api.roundBetting.getRoundBet,
    roomId && spectatorAddress ? {
      roomId,
      roundNumber: currentRound,
      bettor: spectatorAddress,
    } : "skip"
  );

  // Place bet mutation
  const placeBet = useMutation(api.roundBetting.placeBetOnRound);

  // Get odds for current round
  const getOdds = (round: number) => {
    if (round <= 3) return 1.5;
    if (round <= 5) return 1.8;
    return 2.0;
  };

  const odds = getOdds(currentRound);

  // Calculate bet amount as 15% of total deposited (or 15% of current balance if no deposits yet)
  const betAmount = Math.floor((credits?.totalDeposited || credits?.balance || 100) * 0.15);

  // Handle bet
  const handleBet = async (playerAddress: string, playerName: string) => {
    if (!spectatorAddress || isBetting || existingBet) return;

    if (!credits || credits.balance < betAmount) {
      alert(`Insufficient credits! You need ${betAmount} credits.`);
      return;
    }

    setIsBetting(true);
    try {
      await placeBet({
        address: spectatorAddress,
        roomId,
        roundNumber: currentRound,
        betOn: playerAddress,
        amount: betAmount,
      });

      if (onBetPlaced) onBetPlaced();
    } catch (err: any) {
      console.error("Failed to place bet:", err);
      alert(err.message || "Failed to place bet");
    } finally {
      setIsBetting(false);
    }
  };

  // Don't show if already bet on this round
  if (existingBet) {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] bg-green-600/90 backdrop-blur-md border-2 border-green-400 rounded-lg px-4 py-2">
        <p className="text-white text-sm font-bold text-center">
          ✅ Bet placed: {existingBet.amount} on {existingBet.betOn === player1Address ? player1Username : player2Username}
        </p>
        <p className="text-green-200 text-xs text-center">
          Win: +{Math.floor(existingBet.amount * odds)} credits
        </p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] bg-vintage-charcoal/95 backdrop-blur-md border border-purple-500 rounded-lg p-2 shadow-xl w-64 sm:w-80">
      {/* Compact Header */}
      <div className="text-center mb-2">
        <p className="text-purple-400 font-bold text-sm">
          {odds}x • 💰{credits?.balance || 0}
        </p>
      </div>

      {/* Compact Player Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleBet(player1Address, player1Username)}
          disabled={isBetting || !credits || credits.balance < betAmount}
          className="bg-purple-600/40 hover:bg-purple-500/60 border border-purple-500/50 rounded-lg py-2 px-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <p className="text-vintage-gold font-bold text-xs truncate">{player1Username}</p>
          <p className="text-purple-300 text-[10px]">+{betAmount * odds}c</p>
        </button>

        <button
          onClick={() => handleBet(player2Address, player2Username)}
          disabled={isBetting || !credits || credits.balance < betAmount}
          className="bg-pink-600/40 hover:bg-pink-500/60 border border-pink-500/50 rounded-lg py-2 px-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <p className="text-vintage-gold font-bold text-xs truncate">{player2Username}</p>
          <p className="text-pink-300 text-[10px]">+{betAmount * odds}c</p>
        </button>
      </div>

      {/* Loading state */}
      {isBetting && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="text-white text-sm">Betting...</div>
        </div>
      )}
    </div>
  );
}
