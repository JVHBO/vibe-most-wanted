"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import type { Id } from "@/convex/_generated/dataModel";

// Types for arena data
interface ArenaSpectator {
  address: string;
  username: string;
  joinedAt: number;
}

interface RoundHistoryItem {
  round: number;
  cpu1Card: { power: number; name: string; imageUrl: string };
  cpu2Card: { power: number; name: string; imageUrl: string };
  winner: string;
}

interface CpuArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  soundEnabled: boolean;
  t: (key: any) => string;
}

// Bet amounts for quick selection
const BET_AMOUNTS = [10, 25, 50, 100];

/**
 * CPU ARENA MODAL
 *
 * A permanent arena where CPUs battle each other automatically.
 * Spectators can bet on each round using betting credits.
 */
export function CpuArenaModal({
  isOpen,
  onClose,
  address,
  soundEnabled,
  t,
}: CpuArenaModalProps) {
  const [selectedBetAmount, setSelectedBetAmount] = useState(25);
  const [isBetting, setIsBetting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showBetConfirmation, setShowBetConfirmation] = useState<string | null>(null);

  // Mutations
  const joinArena = useMutation(api.cpuArena.joinArena);
  const leaveArena = useMutation(api.cpuArena.leaveArena);
  const placeBet = useMutation(api.cpuArena.placeBet);

  // Get active arena
  const activeArena = useQuery(api.cpuArena.getActiveArena);

  // Get betting credits
  const credits = useQuery(
    api.bettingCredits.getBettingCredits,
    address ? { address } : "skip"
  );

  // Get betting stats for current round
  const bettingStats = useQuery(
    api.cpuArena.getRoundBettingStats,
    activeArena ? { arenaId: activeArena._id, roundNumber: activeArena.currentRound } : "skip"
  );

  // Check if user already bet
  const userBet = useQuery(
    api.cpuArena.getUserRoundBet,
    activeArena && address
      ? { arenaId: activeArena._id, roundNumber: activeArena.currentRound, address }
      : "skip"
  );

  // Countdown timer
  useEffect(() => {
    if (!activeArena || activeArena.status !== "betting") {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((activeArena.bettingEndsAt - now) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [activeArena]);

  // Handle joining arena
  const handleJoin = async () => {
    if (!address || isJoining) return;

    setIsJoining(true);
    try {
      await joinArena({ address });
      if (soundEnabled) AudioManager.buttonSuccess();
    } catch (err: any) {
      console.error("Failed to join arena:", err);
      if (soundEnabled) AudioManager.buttonError();
      alert(err.message || "Failed to join arena");
    } finally {
      setIsJoining(false);
    }
  };

  // Handle leaving arena
  const handleLeave = async () => {
    if (!address || !activeArena) return;

    try {
      await leaveArena({ address, arenaId: activeArena._id });
      if (soundEnabled) AudioManager.buttonNav();
      onClose();
    } catch (err: any) {
      console.error("Failed to leave arena:", err);
    }
  };

  // Handle betting
  const handleBet = async (betOn: "cpu1" | "cpu2") => {
    if (!address || !activeArena || isBetting || userBet) return;

    if (!credits || credits.balance < selectedBetAmount) {
      alert("Insufficient betting credits! Deposit VBMS to get credits.");
      return;
    }

    if (activeArena.status !== "betting") {
      alert("Betting is closed for this round!");
      return;
    }

    setIsBetting(true);
    try {
      const result = await placeBet({
        address,
        arenaId: activeArena._id,
        betOn,
        amount: selectedBetAmount,
      });

      if (soundEnabled) AudioManager.buttonSuccess();
      setShowBetConfirmation(betOn);
      setTimeout(() => setShowBetConfirmation(null), 2000);
    } catch (err: any) {
      console.error("Failed to place bet:", err);
      if (soundEnabled) AudioManager.buttonError();
      alert(err.message || "Failed to place bet");
    } finally {
      setIsBetting(false);
    }
  };

  // Get odds for current round
  const getOdds = (round: number) => {
    if (round <= 3) return 1.5;
    if (round <= 5) return 1.8;
    return 2.0;
  };

  // SSR check
  if (typeof window === "undefined") return null;
  if (!isOpen) return null;

  const currentOdds = activeArena ? getOdds(activeArena.currentRound) : 1.5;
  const isSpectating = activeArena?.spectators.some(
    (s: ArenaSpectator) => s.address.toLowerCase() === address?.toLowerCase()
  );

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-2 border-purple-500 p-4 sm:p-6 max-w-4xl w-full shadow-2xl max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-purple-400 flex items-center gap-2">
            <span className="text-3xl">🤖</span> CPU ARENA
          </h2>
          <button
            onClick={onClose}
            className="text-vintage-gold hover:text-vintage-ice text-2xl transition"
          >
            ×
          </button>
        </div>

        {/* Not joined yet */}
        {!activeArena && !isSpectating && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-2xl font-bold text-vintage-gold mb-2">
              Welcome to CPU Arena
            </h3>
            <p className="text-vintage-ice/70 mb-6 max-w-md mx-auto">
              Watch automated CPU vs CPU battles and bet on each round!
              Use your betting credits to predict which CPU will win.
            </p>

            <div className="bg-purple-900/30 border border-purple-500/50 rounded-xl p-4 mb-6 max-w-sm mx-auto">
              <p className="text-purple-300 font-bold mb-2">Your Betting Credits</p>
              <p className="text-3xl font-bold text-vintage-gold">
                {credits?.balance || 0} <span className="text-lg">credits</span>
              </p>
              {(!credits || credits.balance === 0) && (
                <p className="text-xs text-purple-400 mt-2">
                  Deposit VBMS to get betting credits
                </p>
              )}
            </div>

            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-purple-900 disabled:to-pink-900 text-white font-bold text-xl rounded-xl transition-all transform hover:scale-105 disabled:scale-100"
            >
              {isJoining ? "Joining..." : "Enter Arena"}
            </button>
          </div>
        )}

        {/* Arena Active */}
        {activeArena && (
          <>
            {/* Status Bar */}
            <div className="bg-purple-900/30 border border-purple-500/50 rounded-xl p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-purple-400 text-sm font-bold">Round</span>
                  <p className="text-2xl font-bold text-vintage-gold">
                    {activeArena.currentRound}/7
                  </p>
                </div>
                <div>
                  <span className="text-purple-400 text-sm font-bold">Odds</span>
                  <p className="text-2xl font-bold text-green-400">{currentOdds}x</p>
                </div>
                <div>
                  <span className="text-purple-400 text-sm font-bold">Credits</span>
                  <p className="text-2xl font-bold text-vintage-gold">
                    {credits?.balance || 0}
                  </p>
                </div>
              </div>

              {/* Timer */}
              {activeArena.status === "betting" && (
                <div className="text-center">
                  <span className="text-purple-400 text-sm font-bold">Betting Ends</span>
                  <p
                    className={`text-3xl font-bold ${
                      timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-vintage-gold"
                    }`}
                  >
                    {timeLeft}s
                  </p>
                </div>
              )}

              {activeArena.status === "revealing" && (
                <div className="text-center">
                  <p className="text-xl font-bold text-yellow-400 animate-pulse">
                    Revealing Cards...
                  </p>
                </div>
              )}

              {activeArena.status === "finished" && (
                <div className="text-center">
                  <p className="text-xl font-bold text-green-400">
                    Battle Complete!
                  </p>
                </div>
              )}
            </div>

            {/* Battle Arena */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* CPU 1 */}
              <div
                className={`bg-gradient-to-br ${
                  activeArena.roundWinner === "cpu1"
                    ? "from-green-600/40 to-green-800/40 border-green-400"
                    : "from-purple-600/30 to-purple-800/30 border-purple-500/50"
                } border-2 rounded-xl p-4 text-center relative transition-all`}
              >
                {activeArena.roundWinner === "cpu1" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    WINNER!
                  </div>
                )}
                <p className="text-3xl mb-2">{activeArena.cpu1Name.split(" ")[0]}</p>
                <p className="text-lg font-bold text-purple-300">{activeArena.cpu1Name}</p>
                <p className="text-3xl font-bold text-vintage-gold mt-2">
                  {activeArena.cpu1Score}
                </p>

                {/* CPU 1 Card */}
                {activeArena.cpu1Card && (
                  <div className="mt-4 bg-vintage-black/50 rounded-lg p-3">
                    <p className="text-sm text-vintage-ice font-bold">
                      {activeArena.cpu1Card.name}
                    </p>
                    <p className="text-2xl font-bold text-vintage-gold">
                      {activeArena.cpu1Card.power}
                    </p>
                    <p className="text-xs text-purple-400">{activeArena.cpu1Card.rarity}</p>
                  </div>
                )}

                {/* Bet on CPU 1 */}
                {activeArena.status === "betting" && !userBet && (
                  <button
                    onClick={() => handleBet("cpu1")}
                    disabled={isBetting || (credits?.balance || 0) < selectedBetAmount}
                    className="mt-4 w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:scale-100"
                  >
                    {isBetting ? "..." : `Bet ${selectedBetAmount}`}
                  </button>
                )}

                {/* Bet confirmation */}
                {showBetConfirmation === "cpu1" && (
                  <div className="mt-4 p-2 bg-green-500/30 border border-green-400 rounded-lg">
                    <p className="text-green-300 font-bold">Bet Placed!</p>
                  </div>
                )}

                {/* User bet indicator */}
                {userBet?.betOn === "cpu1" && (
                  <div className="mt-4 p-2 bg-purple-500/30 border border-purple-400 rounded-lg">
                    <p className="text-purple-300 font-bold text-sm">
                      Your bet: {userBet.amount} credits
                    </p>
                    <p className="text-green-300 text-xs">
                      Win: +{Math.floor(userBet.amount * userBet.odds)}
                    </p>
                  </div>
                )}

                {/* Betting stats */}
                {bettingStats && bettingStats.cpu1.count > 0 && (
                  <div className="mt-2 text-xs text-purple-400">
                    {bettingStats.cpu1.count} bets • {bettingStats.cpu1.total} credits
                  </div>
                )}
              </div>

              {/* VS Divider */}
              <div className="flex flex-col items-center justify-center">
                <div className="text-6xl font-bold text-vintage-gold mb-4">VS</div>

                {/* Bet amount selector */}
                {activeArena.status === "betting" && !userBet && (
                  <div className="bg-vintage-black/50 rounded-lg p-3 w-full">
                    <p className="text-xs text-purple-400 text-center mb-2">Bet Amount</p>
                    <div className="grid grid-cols-2 gap-2">
                      {BET_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => {
                            setSelectedBetAmount(amount);
                            if (soundEnabled) AudioManager.buttonClick();
                          }}
                          className={`px-2 py-1 text-sm font-bold rounded transition-all ${
                            selectedBetAmount === amount
                              ? "bg-purple-500 text-white"
                              : "bg-vintage-charcoal text-vintage-gold hover:bg-purple-600/50"
                          }`}
                        >
                          {amount}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-green-400 text-center mt-2">
                      Win: +{Math.floor(selectedBetAmount * currentOdds)}
                    </p>
                  </div>
                )}
              </div>

              {/* CPU 2 */}
              <div
                className={`bg-gradient-to-br ${
                  activeArena.roundWinner === "cpu2"
                    ? "from-green-600/40 to-green-800/40 border-green-400"
                    : "from-pink-600/30 to-pink-800/30 border-pink-500/50"
                } border-2 rounded-xl p-4 text-center relative transition-all`}
              >
                {activeArena.roundWinner === "cpu2" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    WINNER!
                  </div>
                )}
                <p className="text-3xl mb-2">{activeArena.cpu2Name.split(" ")[0]}</p>
                <p className="text-lg font-bold text-pink-300">{activeArena.cpu2Name}</p>
                <p className="text-3xl font-bold text-vintage-gold mt-2">
                  {activeArena.cpu2Score}
                </p>

                {/* CPU 2 Card */}
                {activeArena.cpu2Card && (
                  <div className="mt-4 bg-vintage-black/50 rounded-lg p-3">
                    <p className="text-sm text-vintage-ice font-bold">
                      {activeArena.cpu2Card.name}
                    </p>
                    <p className="text-2xl font-bold text-vintage-gold">
                      {activeArena.cpu2Card.power}
                    </p>
                    <p className="text-xs text-pink-400">{activeArena.cpu2Card.rarity}</p>
                  </div>
                )}

                {/* Bet on CPU 2 */}
                {activeArena.status === "betting" && !userBet && (
                  <button
                    onClick={() => handleBet("cpu2")}
                    disabled={isBetting || (credits?.balance || 0) < selectedBetAmount}
                    className="mt-4 w-full px-4 py-3 bg-pink-600 hover:bg-pink-500 disabled:bg-pink-900 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:scale-100"
                  >
                    {isBetting ? "..." : `Bet ${selectedBetAmount}`}
                  </button>
                )}

                {/* Bet confirmation */}
                {showBetConfirmation === "cpu2" && (
                  <div className="mt-4 p-2 bg-green-500/30 border border-green-400 rounded-lg">
                    <p className="text-green-300 font-bold">Bet Placed!</p>
                  </div>
                )}

                {/* User bet indicator */}
                {userBet?.betOn === "cpu2" && (
                  <div className="mt-4 p-2 bg-pink-500/30 border border-pink-400 rounded-lg">
                    <p className="text-pink-300 font-bold text-sm">
                      Your bet: {userBet.amount} credits
                    </p>
                    <p className="text-green-300 text-xs">
                      Win: +{Math.floor(userBet.amount * userBet.odds)}
                    </p>
                  </div>
                )}

                {/* Betting stats */}
                {bettingStats && bettingStats.cpu2.count > 0 && (
                  <div className="mt-2 text-xs text-pink-400">
                    {bettingStats.cpu2.count} bets • {bettingStats.cpu2.total} credits
                  </div>
                )}
              </div>
            </div>

            {/* Round History */}
            {activeArena.roundHistory.length > 0 && (
              <div className="bg-vintage-black/50 rounded-xl p-4 mb-4">
                <h3 className="text-lg font-bold text-purple-400 mb-3">Round History</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {activeArena.roundHistory.map((round: RoundHistoryItem, idx: number) => (
                    <div
                      key={idx}
                      className="flex-shrink-0 bg-vintage-charcoal rounded-lg p-2 border border-purple-500/30 min-w-[120px]"
                    >
                      <p className="text-xs text-purple-400 text-center">Round {round.round}</p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span
                          className={`text-sm font-bold ${
                            round.winner === "cpu1" ? "text-green-400" : "text-vintage-ice/50"
                          }`}
                        >
                          {round.cpu1Card.power}
                        </span>
                        <span className="text-xs text-vintage-burnt-gold">vs</span>
                        <span
                          className={`text-sm font-bold ${
                            round.winner === "cpu2" ? "text-green-400" : "text-vintage-ice/50"
                          }`}
                        >
                          {round.cpu2Card.power}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spectators */}
            <div className="bg-vintage-black/50 rounded-xl p-4 mb-4">
              <h3 className="text-lg font-bold text-purple-400 mb-2">
                Spectators ({activeArena.spectators.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeArena.spectators.map((spec: ArenaSpectator, idx: number) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-sm ${
                      spec.address.toLowerCase() === address?.toLowerCase()
                        ? "bg-purple-500 text-white"
                        : "bg-vintage-charcoal text-vintage-ice"
                    }`}
                  >
                    {spec.username}
                  </span>
                ))}
              </div>
            </div>

            {/* Leave Button */}
            <div className="flex justify-center">
              <button
                onClick={handleLeave}
                className="px-6 py-2 bg-vintage-black hover:bg-red-900/30 text-vintage-gold border border-vintage-gold/30 hover:border-red-500/50 rounded-lg font-modern transition"
              >
                Leave Arena
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
