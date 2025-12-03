"use client";

import { useState } from "react";
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
 * - ALL IN option on final round (round 7)!
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
  const [isAllIn, setIsAllIn] = useState(false);

  // Get betting credits balance
  const credits = useQuery(
    api.bettingCredits.getBettingCredits,
    spectatorAddress ? { address: spectatorAddress } : "skip"
  );

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

  // Check if this is the final round (round 7)
  const isFinalRound = currentRound === 7;

  // Get odds for current round - HIGHER for final round!
  const getOdds = (round: number, allIn: boolean = false) => {
    if (round === 7 && allIn) return 3.0; // 3x for ALL IN on final round!
    if (round <= 3) return 1.5;
    if (round <= 5) return 1.8;
    return 2.0;
  };

  const odds = getOdds(currentRound, isAllIn);

  // Calculate bet amount - ALL IN uses entire balance!
  const normalBetAmount = Math.floor((credits?.totalDeposited || credits?.balance || 100) * 0.15);
  const allInAmount = credits?.balance || 0;
  const betAmount = isAllIn ? allInAmount : normalBetAmount;

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
        isAllIn: isAllIn && isFinalRound, // Only send isAllIn if it's the final round
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
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] backdrop-blur-md rounded-lg p-2 shadow-xl w-64 sm:w-80 transition-all ${
      isFinalRound && isAllIn
        ? 'bg-gradient-to-br from-yellow-900/95 to-orange-900/95 border-2 border-yellow-500 animate-pulse'
        : isFinalRound
        ? 'bg-gradient-to-br from-red-900/95 to-purple-900/95 border-2 border-red-500'
        : 'bg-vintage-charcoal/95 border border-purple-500'
    }`}>
      {/* Header with ALL IN toggle for final round */}
      <div className="text-center mb-2">
        {isFinalRound ? (
          <div className="space-y-1">
            <p className="text-red-400 font-bold text-xs animate-pulse">🔥 FINAL ROUND 🔥</p>
            <button
              onClick={() => setIsAllIn(!isAllIn)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isAllIn
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black animate-pulse shadow-lg shadow-yellow-500/50'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {isAllIn ? '🎰 ALL IN ACTIVE (3x)' : 'Click for ALL IN (3x)'}
            </button>
            <p className={`font-bold text-sm ${isAllIn ? 'text-yellow-400' : 'text-purple-400'}`}>
              {odds}x • 💰{credits?.balance || 0}
            </p>
          </div>
        ) : (
          <p className="text-purple-400 font-bold text-sm">
            {odds}x • 💰{credits?.balance || 0}
          </p>
        )}
      </div>

      {/* ALL IN warning */}
      {isFinalRound && isAllIn && (
        <div className="mb-2 bg-yellow-500/20 border border-yellow-500/50 rounded px-2 py-1">
          <p className="text-yellow-300 text-[10px] text-center font-bold">
            ⚠️ ALL IN: Betting {allInAmount} credits!
          </p>
        </div>
      )}

      {/* Compact Player Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleBet(player1Address, player1Username)}
          disabled={isBetting || !credits || credits.balance < betAmount}
          className={`rounded-lg py-2 px-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isFinalRound && isAllIn
              ? 'bg-yellow-600/50 hover:bg-yellow-500/70 border-2 border-yellow-500'
              : 'bg-purple-600/40 hover:bg-purple-500/60 border border-purple-500/50'
          }`}
        >
          <p className="text-vintage-gold font-bold text-xs truncate">{player1Username}</p>
          <p className={`text-[10px] ${isAllIn ? 'text-yellow-300 font-bold' : 'text-purple-300'}`}>
            +{Math.floor(betAmount * odds)}c
          </p>
        </button>

        <button
          onClick={() => handleBet(player2Address, player2Username)}
          disabled={isBetting || !credits || credits.balance < betAmount}
          className={`rounded-lg py-2 px-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isFinalRound && isAllIn
              ? 'bg-orange-600/50 hover:bg-orange-500/70 border-2 border-orange-500'
              : 'bg-pink-600/40 hover:bg-pink-500/60 border border-pink-500/50'
          }`}
        >
          <p className="text-vintage-gold font-bold text-xs truncate">{player2Username}</p>
          <p className={`text-[10px] ${isAllIn ? 'text-orange-300 font-bold' : 'text-pink-300'}`}>
            +{Math.floor(betAmount * odds)}c
          </p>
        </button>
      </div>

      {/* Loading state */}
      {isBetting && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="text-white text-sm">{isAllIn ? '🎰 ALL IN...' : 'Betting...'}</div>
        </div>
      )}
    </div>
  );
}
