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
  const [betAmount] = useState(10); // Fixed amount for simplicity
  const [isBetting, setIsBetting] = useState(false);

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

  // Get odds for current round
  const getOdds = (round: number) => {
    if (round <= 3) return 1.5;
    if (round <= 5) return 1.8;
    return 2.0;
  };

  const odds = getOdds(currentRound);

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
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-green-600/90 backdrop-blur-md border-2 border-green-400 rounded-lg px-4 py-2">
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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-vintage-charcoal/95 backdrop-blur-md border-2 border-purple-500 rounded-xl p-3 shadow-2xl max-w-sm">
      {/* Header */}
      <div className="text-center mb-3">
        <p className="text-purple-400 font-display font-bold text-lg">
          Round {currentRound}/7 • {odds}x Odds
        </p>
        <p className="text-vintage-ice/70 text-xs">
          Tap card to bet {betAmount} credits • Balance: {credits?.balance || 0}
        </p>
      </div>

      {/* Player Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Player 1 */}
        <button
          onClick={() => handleBet(player1Address, player1Username)}
          disabled={isBetting || !credits || credits.balance < betAmount}
          className="relative group bg-gradient-to-br from-purple-600/30 to-purple-800/30 hover:from-purple-500/50 hover:to-purple-700/50 border-2 border-purple-500/50 hover:border-purple-400 rounded-lg p-4 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>

          <div className="text-center">
            <div className="text-3xl mb-2">🎮</div>
            <p className="text-vintage-gold font-bold text-sm">
              {player1Username}
            </p>
            <p className="text-purple-300 text-xs mt-1">
              Win: +{betAmount * odds}
            </p>
          </div>
        </button>

        {/* Player 2 */}
        <button
          onClick={() => handleBet(player2Address, player2Username)}
          disabled={isBetting || !credits || credits.balance < betAmount}
          className="relative group bg-gradient-to-br from-pink-600/30 to-pink-800/30 hover:from-pink-500/50 hover:to-pink-700/50 border-2 border-pink-500/50 hover:border-pink-400 rounded-lg p-4 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-pink-500/20 blur-xl rounded-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>

          <div className="text-center">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-vintage-gold font-bold text-sm">
              {player2Username}
            </p>
            <p className="text-pink-300 text-xs mt-1">
              Win: +{betAmount * odds}
            </p>
          </div>
        </button>
      </div>

      {/* Loading state */}
      {isBetting && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="text-white font-bold">Placing bet...</div>
        </div>
      )}
    </div>
  );
}
