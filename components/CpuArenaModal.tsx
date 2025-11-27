"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import { SpectatorEntryModal } from "./SpectatorEntryModal";
import { PokerBattleTable } from "./PokerBattleTable";

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

type ViewMode = "rooms" | "spectator-entry" | "battle";

/**
 * CPU ARENA MODAL
 *
 * Shows available arena rooms (one per collection).
 * Users deposit VBMS to enter as spectators and watch CPU vs CPU battles on the same poker table.
 * Uses the exact same PokerBattleTable component for a consistent experience.
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
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Get available collections
  const availableCollections = useQuery(api.pokerBattle.getAvailableCollections);

  // Get active CPU rooms with spectator counts
  const cpuRooms = useQuery(api.pokerBattle.getCpuVsCpuRooms);

  // Mutations
  const createCpuRoom = useMutation(api.pokerBattle.createCpuVsCpuRoom);
  const spectateRoom = useMutation(api.pokerBattle.spectateRoom);

  // Get profile for username
  const profile = useQuery(
    api.profiles.getProfile,
    address ? { address } : "skip"
  );

  // Handle room selection
  const handleSelectRoom = (collection: string) => {
    setSelectedCollection(collection);
    setViewMode("spectator-entry");
    if (soundEnabled) AudioManager.buttonClick();
  };

  // Handle spectator entry success (deposited VBMS)
  const handleDepositSuccess = async (creditsAdded: number) => {
    if (!address || !selectedCollection) return;

    setIsJoining(true);
    try {
      // 1. Create or get CPU vs CPU room for this collection
      const result = await createCpuRoom({ collection: selectedCollection });
      console.log("🤖 CPU Arena room:", result.roomId, result.isNew ? "(new)" : "(existing)");

      // 2. Join as spectator
      const username = profile?.username || address.slice(0, 8);
      await spectateRoom({
        roomId: result.roomId,
        address: address,
        username: username,
      });
      console.log("👁️ Joined as spectator");

      // 3. Open PokerBattleTable in spectator mode
      setRoomId(result.roomId);
      setViewMode("battle");
      if (soundEnabled) AudioManager.buttonSuccess();
    } catch (err: any) {
      console.error("Failed to join CPU Arena:", err);
      if (soundEnabled) AudioManager.buttonError();
      alert(err.message || "Failed to join CPU Arena");
    } finally {
      setIsJoining(false);
    }
  };

  // Handle closing battle table
  const handleCloseBattle = () => {
    setViewMode("rooms");
    setRoomId(null);
    setSelectedCollection(null);
  };

  // SSR check
  if (typeof window === "undefined") return null;
  if (!isOpen) return null;

  // If in battle mode, render PokerBattleTable directly in portal
  if (viewMode === "battle" && roomId) {
    return createPortal(
      <PokerBattleTable
        onClose={() => {
          handleCloseBattle();
          onClose();
        }}
        playerCards={[]} // Empty - spectator mode doesn't need cards
        playerAddress={address}
        playerUsername={profile?.username || address.slice(0, 8)}
        isSpectator={true}
        soundEnabled={soundEnabled}
        initialRoomId={roomId} // Skip matchmaking - go directly to spectating this room
        skipSpectatorModal={true} // Already deposited via CPU Arena entry
      />,
      document.body
    );
  }

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

                  // Get spectator count for this collection
                  const roomData = cpuRooms?.find((r: any) => r.collection === collection);
                  const spectatorCount = roomData?.spectatorCount || 0;

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

                        {/* Spectator count and status */}
                        <div className="mt-3 flex items-center justify-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-lg">👁️</span>
                            <span className="text-white font-bold">{spectatorCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-white/80 text-xs">Live</span>
                          </div>
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
                  <li>• Two CPUs battle automatically on the poker table</li>
                  <li>• Same chat, sounds and experience as regular battles</li>
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
            battleId={`cpu-arena-${selectedCollection}`}
            playerAddress={address}
            hideFreePick={true}
          />
        )}

        {/* Loading state */}
        {isJoining && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-vintage-gold font-bold">Joining CPU Arena...</p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
