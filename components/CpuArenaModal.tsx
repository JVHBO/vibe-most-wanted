"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import { SpectatorEntryModal } from "./SpectatorEntryModal";
import { SimpleBettingOverlay } from "./SimpleBettingOverlay";

interface CpuArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  soundEnabled: boolean;
  t: (key: any) => string;
}

/**
 * CPU ARENA MODAL
 *
 * Uses the same spectator betting system as regular poker battles.
 * Two CPUs fight automatically, spectators watch and bet on rounds.
 */
export function CpuArenaModal({
  isOpen,
  onClose,
  address,
  soundEnabled,
  t,
}: CpuArenaModalProps) {
  const [showSpectatorEntry, setShowSpectatorEntry] = useState(true);
  const [spectatorType, setSpectatorType] = useState<'free' | 'betting' | null>(null);
  const [hasBettingCredits, setHasBettingCredits] = useState(false);

  // Get active CPU arena room
  const arenaRoom = useQuery(api.cpuArena.getActiveArena);

  // Get betting credits
  const credits = useQuery(
    api.bettingCredits.getBettingCredits,
    address ? { address } : "skip"
  );

  // Join arena mutation
  const joinArena = useMutation(api.cpuArena.joinArena);

  // Handle entry modal success (deposited credits)
  const handleDepositSuccess = (creditsAdded: number) => {
    setHasBettingCredits(true);
    setSpectatorType('betting');
    setShowSpectatorEntry(false);
    joinArenaAsSpectator();
  };

  // Handle free spectator join
  const handleJoinFree = () => {
    setSpectatorType('free');
    setShowSpectatorEntry(false);
    joinArenaAsSpectator();
  };

  // Join arena
  const joinArenaAsSpectator = async () => {
    if (!address) return;
    try {
      await joinArena({ address });
      if (soundEnabled) AudioManager.buttonSuccess();
    } catch (err) {
      console.error("Failed to join arena:", err);
    }
  };

  // SSR check
  if (typeof window === "undefined") return null;
  if (!isOpen) return null;

  // Show entry modal first
  if (showSpectatorEntry) {
    return (
      <SpectatorEntryModal
        isOpen={true}
        onClose={onClose}
        onSuccess={handleDepositSuccess}
        onJoinFree={handleJoinFree}
        battleId="cpu-arena"
        playerAddress={address}
      />
    );
  }

  // No arena active yet
  if (!arenaRoom) {
    return createPortal(
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4">
        <div className="bg-vintage-charcoal rounded-2xl border-2 border-purple-500 p-6 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-vintage-gold font-bold">Starting CPU Arena...</p>
            <p className="text-vintage-ice/70 text-sm mt-2">Setting up the battle</p>
          </div>
          <button
            onClick={onClose}
            className="mt-6 w-full py-2 bg-vintage-black hover:bg-red-900/30 text-vintage-gold border border-vintage-gold/30 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>,
      document.body
    );
  }

  const currentOdds = arenaRoom.currentRound <= 3 ? 1.5 : arenaRoom.currentRound <= 5 ? 1.8 : 2.0;
  const timeLeft = Math.max(0, Math.ceil((arenaRoom.bettingEndsAt - Date.now()) / 1000));

  return createPortal(
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-2 sm:p-4">
      <div className="bg-vintage-charcoal rounded-2xl border-2 border-purple-500 p-4 sm:p-6 max-w-4xl w-full shadow-2xl max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-display font-bold text-purple-400 flex items-center gap-2">
            🤖 CPU ARENA
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-purple-400">Credits</p>
              <p className="text-lg font-bold text-vintage-gold">{credits?.balance || 0}</p>
            </div>
            <button onClick={onClose} className="text-vintage-gold hover:text-vintage-ice text-2xl">×</button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-purple-900/30 border border-purple-500/50 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-purple-400 text-xs">Round</span>
              <p className="text-2xl font-bold text-vintage-gold">{arenaRoom.currentRound}/7</p>
            </div>
            <div>
              <span className="text-purple-400 text-xs">Odds</span>
              <p className="text-2xl font-bold text-green-400">{currentOdds}x</p>
            </div>
          </div>

          {arenaRoom.status === "betting" && (
            <div className="text-center">
              <span className="text-purple-400 text-xs">Betting Ends</span>
              <p className={`text-3xl font-bold ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-vintage-gold"}`}>
                {timeLeft}s
              </p>
            </div>
          )}

          {arenaRoom.status === "revealing" && (
            <p className="text-xl font-bold text-yellow-400 animate-pulse">Revealing...</p>
          )}
        </div>

        {/* Battle Arena - Two CPUs */}
        <div className="grid grid-cols-3 gap-4 mb-4">

          {/* CPU 1 */}
          <div className={`bg-gradient-to-br ${arenaRoom.roundWinner === "cpu1" ? "from-green-600/40 to-green-800/40 border-green-400" : "from-purple-600/30 to-purple-800/30 border-purple-500/50"} border-2 rounded-xl p-4 text-center relative`}>
            {arenaRoom.roundWinner === "cpu1" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                WINNER!
              </div>
            )}
            <p className="text-3xl mb-2">{arenaRoom.cpu1Name.split(" ")[0]}</p>
            <p className="text-lg font-bold text-purple-300">{arenaRoom.cpu1Name}</p>
            <p className="text-4xl font-bold text-vintage-gold mt-2">{arenaRoom.cpu1Score}</p>

            {/* CPU 1 Card */}
            {arenaRoom.cpu1Card && (
              <div className="mt-4 bg-vintage-black/50 rounded-lg p-3">
                <p className="text-sm text-vintage-ice font-bold">{arenaRoom.cpu1Card.name}</p>
                <p className="text-2xl font-bold text-vintage-gold">{arenaRoom.cpu1Card.power}</p>
                <p className="text-xs text-purple-400">{arenaRoom.cpu1Card.rarity}</p>
              </div>
            )}

            {/* Bet Button */}
            {arenaRoom.status === "betting" && spectatorType === 'betting' && (
              <button
                className="mt-4 w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all transform hover:scale-105"
              >
                Bet 10 on CPU 1
              </button>
            )}
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-vintage-gold mb-2">VS</div>
            <p className="text-sm text-purple-400">First to 4 wins</p>
          </div>

          {/* CPU 2 */}
          <div className={`bg-gradient-to-br ${arenaRoom.roundWinner === "cpu2" ? "from-green-600/40 to-green-800/40 border-green-400" : "from-pink-600/30 to-pink-800/30 border-pink-500/50"} border-2 rounded-xl p-4 text-center relative`}>
            {arenaRoom.roundWinner === "cpu2" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                WINNER!
              </div>
            )}
            <p className="text-3xl mb-2">{arenaRoom.cpu2Name.split(" ")[0]}</p>
            <p className="text-lg font-bold text-pink-300">{arenaRoom.cpu2Name}</p>
            <p className="text-4xl font-bold text-vintage-gold mt-2">{arenaRoom.cpu2Score}</p>

            {/* CPU 2 Card */}
            {arenaRoom.cpu2Card && (
              <div className="mt-4 bg-vintage-black/50 rounded-lg p-3">
                <p className="text-sm text-vintage-ice font-bold">{arenaRoom.cpu2Card.name}</p>
                <p className="text-2xl font-bold text-vintage-gold">{arenaRoom.cpu2Card.power}</p>
                <p className="text-xs text-pink-400">{arenaRoom.cpu2Card.rarity}</p>
              </div>
            )}

            {/* Bet Button */}
            {arenaRoom.status === "betting" && spectatorType === 'betting' && (
              <button
                className="mt-4 w-full px-4 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg transition-all transform hover:scale-105"
              >
                Bet 10 on CPU 2
              </button>
            )}
          </div>
        </div>

        {/* Round History */}
        {arenaRoom.roundHistory && arenaRoom.roundHistory.length > 0 && (
          <div className="bg-vintage-black/50 rounded-xl p-4 mb-4">
            <h3 className="text-lg font-bold text-purple-400 mb-3">Round History</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {arenaRoom.roundHistory.map((round: any, idx: number) => (
                <div key={idx} className="flex-shrink-0 bg-vintage-charcoal rounded-lg p-2 border border-purple-500/30 min-w-[100px]">
                  <p className="text-xs text-purple-400 text-center">Round {round.round}</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className={`text-sm font-bold ${round.winner === "cpu1" ? "text-green-400" : "text-vintage-ice/50"}`}>
                      {round.cpu1Card.power}
                    </span>
                    <span className="text-xs text-vintage-burnt-gold">vs</span>
                    <span className={`text-sm font-bold ${round.winner === "cpu2" ? "text-green-400" : "text-vintage-ice/50"}`}>
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
            Spectators ({arenaRoom.spectators?.length || 0})
          </h3>
          <div className="flex flex-wrap gap-2">
            {arenaRoom.spectators?.map((spec: any, idx: number) => (
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
            onClick={onClose}
            className="px-6 py-2 bg-vintage-black hover:bg-red-900/30 text-vintage-gold border border-vintage-gold/30 hover:border-red-500/50 rounded-lg font-bold transition"
          >
            Leave Arena
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
