"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import { SpectatorEntryModal } from "./SpectatorEntryModal";

interface CpuArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  soundEnabled: boolean;
  t: (key: any) => string;
}

// Collection display names and emojis
const COLLECTION_INFO: Record<string, { name: string; emoji: string; color: string }> = {
  gmvbrs: { name: "GM VBRS", emoji: "🌅", color: "from-orange-600 to-yellow-600" },
  vibe: { name: "Vibe Most Wanted", emoji: "🎭", color: "from-purple-600 to-pink-600" },
  coquettish: { name: "Coquettish", emoji: "💋", color: "from-pink-500 to-red-500" },
  viberuto: { name: "Viberuto", emoji: "🍥", color: "from-orange-500 to-red-500" },
  meowverse: { name: "Meowverse", emoji: "🐱", color: "from-blue-500 to-purple-500" },
  poorlydrawnpepes: { name: "Poorly Drawn Pepes", emoji: "🐸", color: "from-green-500 to-emerald-600" },
  teampothead: { name: "Team Pothead", emoji: "🌿", color: "from-green-600 to-lime-500" },
  tarot: { name: "Tarot", emoji: "🔮", color: "from-indigo-600 to-purple-600" },
  americanfootball: { name: "American Football", emoji: "🏈", color: "from-amber-600 to-orange-600" },
  vibefid: { name: "VibeFID", emoji: "🆔", color: "from-cyan-500 to-blue-600" },
};

type ViewMode = "rooms" | "spectator-entry" | "arena";

/**
 * CPU ARENA MODAL
 *
 * Shows available arena rooms (one per collection).
 * Users can enter as spectators and bet on CPU vs CPU battles.
 */
export function CpuArenaModal({
  isOpen,
  onClose,
  address,
  soundEnabled,
  t,
}: CpuArenaModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("rooms");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [spectatorType, setSpectatorType] = useState<'free' | 'betting' | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Get available collections
  const availableCollections = useQuery(api.cpuArena.getAvailableCollections);

  // Get active arena for selected collection
  const activeArena = useQuery(
    api.cpuArena.getActiveArena,
    viewMode === "arena" ? {} : "skip"
  );

  // Get betting credits
  const credits = useQuery(
    api.bettingCredits.getBettingCredits,
    address ? { address } : "skip"
  );

  // Mutations
  const joinArena = useMutation(api.cpuArena.joinArena);
  const leaveArena = useMutation(api.cpuArena.leaveArena);
  const placeBet = useMutation(api.cpuArena.placeBet);

  // Countdown timer for betting phase
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

  // Handle room selection
  const handleSelectRoom = (collection: string) => {
    setSelectedCollection(collection);
    setViewMode("spectator-entry");
    if (soundEnabled) AudioManager.buttonClick();
  };

  // Handle spectator entry success (deposited VBMS)
  const handleDepositSuccess = async (creditsAdded: number) => {
    setSpectatorType("betting");
    await joinArenaAsSpectator();
  };

  // Handle free spectator join
  const handleJoinFree = async () => {
    setSpectatorType("free");
    await joinArenaAsSpectator();
  };

  // Join arena as spectator
  const joinArenaAsSpectator = async () => {
    if (!address) return;
    try {
      await joinArena({ address });
      setViewMode("arena");
      if (soundEnabled) AudioManager.buttonSuccess();
    } catch (err) {
      console.error("Failed to join arena:", err);
      if (soundEnabled) AudioManager.buttonError();
    }
  };

  // Leave arena (called when exiting arena view)
  const handleLeaveArena = async () => {
    if (!address || !activeArena) {
      setViewMode("rooms");
      setSelectedCollection(null);
      return;
    }

    try {
      await leaveArena({ address, arenaId: activeArena._id });
    } catch (err) {
      console.error("Failed to leave arena:", err);
    }

    setViewMode("rooms");
    setSelectedCollection(null);
  };

  // Handle betting
  const handleBet = async (betOn: "cpu1" | "cpu2") => {
    if (!address || !activeArena || spectatorType !== "betting") return;

    const betAmount = 10; // Fixed amount
    if (!credits || credits.balance < betAmount) {
      alert("Insufficient betting credits!");
      return;
    }

    try {
      await placeBet({
        address,
        arenaId: activeArena._id,
        betOn,
        amount: betAmount,
      });
      if (soundEnabled) AudioManager.buttonSuccess();
    } catch (err: any) {
      console.error("Failed to place bet:", err);
      if (soundEnabled) AudioManager.buttonError();
      alert(err.message || "Failed to place bet");
    }
  };

  // SSR check
  if (typeof window === "undefined") return null;
  if (!isOpen) return null;

  // Get current odds
  const currentOdds = activeArena
    ? activeArena.currentRound <= 3 ? 1.5 : activeArena.currentRound <= 5 ? 1.8 : 2.0
    : 1.5;

  return createPortal(
    <div
      className="fixed inset-0 bg-vintage-deep-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-2xl border-2 border-purple-500/50 max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============ ROOM SELECTION VIEW ============ */}
        {viewMode === "rooms" && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20 border-b-2 border-purple-500/30 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-display font-bold text-purple-400 flex items-center gap-3">
                    <span className="text-3xl sm:text-5xl">🤖</span>
                    CPU ARENA
                  </h1>
                  <p className="text-sm sm:text-base text-purple-300/70 mt-1">
                    Watch CPU vs CPU battles and bet on rounds!
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-vintage-gold hover:text-vintage-burnt-gold text-3xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Available Rooms */}
            <div className="p-4 sm:p-6">
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
                <span>🎮</span> Available Arenas
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCollections?.map((collection: string) => {
                  const info = COLLECTION_INFO[collection] || {
                    name: collection,
                    emoji: "🎴",
                    color: "from-gray-600 to-gray-700"
                  };

                  return (
                    <button
                      key={collection}
                      onClick={() => handleSelectRoom(collection)}
                      className={`relative group bg-gradient-to-br ${info.color} hover:scale-105 border-2 border-white/20 hover:border-white/40 rounded-xl p-5 transition-all shadow-lg hover:shadow-xl`}
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-white/10 blur-xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>

                      <div className="text-center">
                        <div className="text-5xl mb-3">{info.emoji}</div>
                        <p className="text-white font-display font-bold text-lg mb-1">
                          {info.name}
                        </p>
                        <p className="text-white/70 text-sm">
                          Arena
                        </p>

                        {/* Status indicator */}
                        <div className="mt-3 flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-white/80 text-xs">Live</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Info box */}
              <div className="mt-6 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <h3 className="text-purple-400 font-bold mb-2">💡 How it works</h3>
                <ul className="text-vintage-ice/70 text-sm space-y-1">
                  <li>• Each arena features cards from that collection</li>
                  <li>• Two CPUs battle automatically</li>
                  <li>• Bet on each round (1-7) with growing odds: 1.5x → 2.0x</li>
                  <li>• Deposit VBMS to get betting credits</li>
                </ul>
              </div>
            </div>
          </>
        )}

        {/* ============ SPECTATOR ENTRY VIEW ============ */}
        {viewMode === "spectator-entry" && selectedCollection && (
          <SpectatorEntryModal
            isOpen={true}
            onClose={() => {
              setViewMode("rooms");
              setSelectedCollection(null);
            }}
            onSuccess={handleDepositSuccess}
            onJoinFree={handleJoinFree}
            battleId={`cpu-arena-${selectedCollection}`}
            playerAddress={address}
          />
        )}

        {/* ============ ARENA VIEW ============ */}
        {viewMode === "arena" && activeArena && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20 border-b-2 border-purple-500/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-purple-400">
                    🤖 CPU ARENA
                  </h2>
                  <div className="bg-purple-500/30 px-3 py-1 rounded-full">
                    <span className="text-purple-300 text-sm font-bold">
                      Credits: {credits?.balance || 0}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLeaveArena}
                  className="text-vintage-gold hover:text-red-400 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Status Bar */}
            <div className="bg-purple-900/30 border-b border-purple-500/30 p-3 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-purple-400 text-xs">Round</span>
                  <p className="text-2xl font-bold text-vintage-gold">{activeArena.currentRound}/7</p>
                </div>
                <div>
                  <span className="text-purple-400 text-xs">Odds</span>
                  <p className="text-2xl font-bold text-green-400">{currentOdds}x</p>
                </div>
              </div>

              {activeArena.status === "betting" && (
                <div className="text-center">
                  <span className="text-purple-400 text-xs">Betting Ends</span>
                  <p className={`text-3xl font-bold ${timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-vintage-gold"}`}>
                    {timeLeft}s
                  </p>
                </div>
              )}

              {activeArena.status === "revealing" && (
                <p className="text-xl font-bold text-yellow-400 animate-pulse">⚔️ Revealing...</p>
              )}

              {activeArena.status === "finished" && (
                <p className="text-xl font-bold text-green-400">🏆 Battle Complete!</p>
              )}
            </div>

            {/* Battle Arena */}
            <div className="p-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                {/* CPU 1 */}
                <div
                  className={`bg-gradient-to-br ${
                    activeArena.roundWinner === "cpu1"
                      ? "from-green-600/40 to-green-800/40 border-green-400"
                      : "from-purple-600/30 to-purple-800/30 border-purple-500/50"
                  } border-2 rounded-xl p-4 text-center relative cursor-pointer transition-all hover:scale-102`}
                  onClick={() => activeArena.status === "betting" && handleBet("cpu1")}
                >
                  {activeArena.roundWinner === "cpu1" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      WINNER!
                    </div>
                  )}
                  <p className="text-4xl mb-2">{activeArena.cpu1Name.split(" ")[0]}</p>
                  <p className="text-lg font-bold text-purple-300">{activeArena.cpu1Name}</p>
                  <p className="text-4xl font-bold text-vintage-gold mt-2">{activeArena.cpu1Score}</p>

                  {activeArena.cpu1Card && (
                    <div className="mt-4 bg-vintage-black/50 rounded-lg p-3">
                      <p className="text-sm text-vintage-ice font-bold">{activeArena.cpu1Card.name}</p>
                      <p className="text-3xl font-bold text-vintage-gold">{activeArena.cpu1Card.power}</p>
                      <p className="text-xs text-purple-400">{activeArena.cpu1Card.rarity}</p>
                    </div>
                  )}

                  {activeArena.status === "betting" && spectatorType === "betting" && (
                    <div className="mt-4 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg">
                      Tap to bet 10
                    </div>
                  )}
                </div>

                {/* VS */}
                <div className="flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-vintage-gold mb-2">VS</div>
                  <p className="text-sm text-purple-400">First to 4</p>
                </div>

                {/* CPU 2 */}
                <div
                  className={`bg-gradient-to-br ${
                    activeArena.roundWinner === "cpu2"
                      ? "from-green-600/40 to-green-800/40 border-green-400"
                      : "from-pink-600/30 to-pink-800/30 border-pink-500/50"
                  } border-2 rounded-xl p-4 text-center relative cursor-pointer transition-all hover:scale-102`}
                  onClick={() => activeArena.status === "betting" && handleBet("cpu2")}
                >
                  {activeArena.roundWinner === "cpu2" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      WINNER!
                    </div>
                  )}
                  <p className="text-4xl mb-2">{activeArena.cpu2Name.split(" ")[0]}</p>
                  <p className="text-lg font-bold text-pink-300">{activeArena.cpu2Name}</p>
                  <p className="text-4xl font-bold text-vintage-gold mt-2">{activeArena.cpu2Score}</p>

                  {activeArena.cpu2Card && (
                    <div className="mt-4 bg-vintage-black/50 rounded-lg p-3">
                      <p className="text-sm text-vintage-ice font-bold">{activeArena.cpu2Card.name}</p>
                      <p className="text-3xl font-bold text-vintage-gold">{activeArena.cpu2Card.power}</p>
                      <p className="text-xs text-pink-400">{activeArena.cpu2Card.rarity}</p>
                    </div>
                  )}

                  {activeArena.status === "betting" && spectatorType === "betting" && (
                    <div className="mt-4 bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 rounded-lg">
                      Tap to bet 10
                    </div>
                  )}
                </div>
              </div>

              {/* Round History */}
              {activeArena.roundHistory && activeArena.roundHistory.length > 0 && (
                <div className="bg-vintage-black/50 rounded-xl p-4 mb-4">
                  <h3 className="text-lg font-bold text-purple-400 mb-3">Round History</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {activeArena.roundHistory.map((round: any, idx: number) => (
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
              <div className="bg-vintage-black/50 rounded-xl p-4">
                <h3 className="text-lg font-bold text-purple-400 mb-2">
                  👥 Spectators ({activeArena.spectators?.length || 0})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activeArena.spectators?.map((spec: any, idx: number) => (
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
            </div>
          </>
        )}

        {/* Loading state for arena */}
        {viewMode === "arena" && !activeArena && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-vintage-gold font-bold">Starting arena battle...</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
