"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Bet type from roundBetting
interface RoundBet {
  roomId: string;
  roundNumber: number;
  bettor: string;
  betOn: string;
  amount: number;
  odds: number;
  status: string;
  payout?: number;
  timestamp: number;
}

interface SpectatorBetFeedbackProps {
  roomId: string;
  spectatorAddress: string;
  currentRound: number;
  lastRoundWinner?: string | null; // Address of the winner of the last resolved round
  showResultAnimation?: boolean; // When true, show the win/loss animation
}

/**
 * SPECTATOR BET FEEDBACK
 *
 * Shows bet history and results for spectators
 * - Displays all bets placed in this game
 * - Shows win/loss status for each round
 * - Animated feedback when bet resolves
 */
export function SpectatorBetFeedback({
  roomId,
  spectatorAddress,
  currentRound,
  lastRoundWinner,
  showResultAnimation = false,
}: SpectatorBetFeedbackProps) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationResult, setAnimationResult] = useState<'won' | 'lost' | null>(null);
  const [animationAmount, setAnimationAmount] = useState(0);

  // Get all my bets for this room
  const myBets = useQuery(
    api.roundBetting.getMyRoomBets,
    roomId && spectatorAddress ? { address: spectatorAddress, roomId } : "skip"
  );

  // Get betting credits balance
  const credits = useQuery(
    api.bettingCredits.getBettingCredits,
    spectatorAddress ? { address: spectatorAddress } : "skip"
  );

  // Check for bet result when round ends
  useEffect(() => {
    if (!showResultAnimation || !lastRoundWinner || !myBets) return;

    // Find bet for the previous round (the one that just resolved)
    const resolvedRound = currentRound - 1;
    const betForRound = myBets.find((b: RoundBet) => b.roundNumber === resolvedRound);

    if (betForRound && betForRound.status !== 'active') {
      // Bet was resolved - show animation
      const won = betForRound.status === 'won';
      setAnimationResult(won ? 'won' : 'lost');
      setAnimationAmount(won ? (betForRound.payout || 0) : betForRound.amount);
      setShowAnimation(true);

      // Hide animation after 3 seconds
      setTimeout(() => {
        setShowAnimation(false);
        setAnimationResult(null);
      }, 3000);
    }
  }, [showResultAnimation, lastRoundWinner, currentRound, myBets]);

  // Calculate stats
  const totalBets = myBets?.length || 0;
  const wins = myBets?.filter((b: RoundBet) => b.status === 'won').length || 0;
  const losses = myBets?.filter((b: RoundBet) => b.status === 'lost').length || 0;
  const totalWon = myBets?.filter((b: RoundBet) => b.status === 'won').reduce((sum: number, b: RoundBet) => sum + (b.payout || 0), 0) || 0;
  const totalLost = myBets?.filter((b: RoundBet) => b.status === 'lost').reduce((sum: number, b: RoundBet) => sum + b.amount, 0) || 0;
  const netProfit = totalWon - totalLost;

  return (
    <>
      {/* Win/Loss Animation Overlay */}
      {showAnimation && animationResult && (
        <div className="fixed inset-0 flex items-center justify-center z-[300] pointer-events-none">
          <div
            className={`animate-in zoom-in-50 fade-in duration-300 p-8 rounded-2xl border-4 ${
              animationResult === 'won'
                ? 'bg-green-900/95 border-green-400'
                : 'bg-red-900/95 border-red-400'
            }`}
          >
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">
                {animationResult === 'won' ? '🎉' : '💔'}
              </div>
              <h2
                className={`text-4xl font-display font-bold mb-2 ${
                  animationResult === 'won' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {animationResult === 'won' ? 'BET WON!' : 'BET LOST!'}
              </h2>
              <p className="text-white text-2xl font-bold">
                {animationResult === 'won' ? '+' : '-'}{animationAmount} credits
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bet History Panel - Fixed at bottom left */}
      <div className="fixed bottom-4 left-4 z-[200] bg-vintage-charcoal/95 backdrop-blur-md border-2 border-purple-500/50 rounded-xl p-3 shadow-xl max-w-xs">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-purple-500/30">
          <h3 className="text-purple-400 font-display font-bold text-sm flex items-center gap-1">
            <span>🎰</span> Your Bets
          </h3>
          <div className="text-vintage-gold font-bold text-sm">
            💰 {credits?.balance || 0}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-2 text-center text-xs">
          <div className="bg-green-500/20 rounded px-2 py-1">
            <div className="text-green-400 font-bold">{wins}</div>
            <div className="text-green-300/70">Wins</div>
          </div>
          <div className="bg-red-500/20 rounded px-2 py-1">
            <div className="text-red-400 font-bold">{losses}</div>
            <div className="text-red-300/70">Losses</div>
          </div>
          <div className={`rounded px-2 py-1 ${netProfit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <div className={`font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netProfit >= 0 ? '+' : ''}{netProfit}
            </div>
            <div className={`${netProfit >= 0 ? 'text-green-300/70' : 'text-red-300/70'}`}>Net</div>
          </div>
        </div>

        {/* Bet History List */}
        {totalBets > 0 ? (
          <div className="max-h-32 overflow-y-auto space-y-1">
            {myBets?.sort((a: RoundBet, b: RoundBet) => b.roundNumber - a.roundNumber).map((bet: RoundBet, idx: number) => (
              <div
                key={idx}
                className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                  bet.status === 'won'
                    ? 'bg-green-500/20 text-green-300'
                    : bet.status === 'lost'
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-purple-500/20 text-purple-300'
                }`}
              >
                <span>R{bet.roundNumber}</span>
                <span className="font-mono">{bet.amount}c @ {bet.odds}x</span>
                <span className="font-bold">
                  {bet.status === 'won' ? `+${bet.payout}` : bet.status === 'lost' ? `-${bet.amount}` : '⏳'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-vintage-ice/50 text-xs text-center py-2">
            No bets placed yet
          </p>
        )}
      </div>
    </>
  );
}
