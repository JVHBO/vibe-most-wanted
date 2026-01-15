"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCachedAvailableCollections } from "@/lib/convex-cache";
import { AudioManager } from "@/lib/audio-manager";
import { SpectatorEntryModal } from "./SpectatorEntryModal";
import { PokerBattleTable } from "./PokerBattleTable";
import { COLLECTIONS, type CollectionId } from "@/lib/collections";
import { sdk } from '@farcaster/miniapp-sdk';
import { openMarketplace } from '@/lib/marketplace-utils';
import {
  getDailyBuffedCollection,
  getTimeUntilNextBuff,
  BUFF_CONFIG,
} from "@/lib/dailyBuff";

interface CpuArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  soundEnabled: boolean;
  t: (key: any) => string;
  isInFarcaster?: boolean;
}

// Collection display names and emojis (only active collections)
const COLLECTION_INFO: Record<string, { name: string; emoji: string; color: string }> = {
  gmvbrs: { name: "GM VBRS", emoji: "🌅", color: "from-orange-600 to-yellow-600" },
  vibe: { name: "$VBMS", emoji: "🎭", color: "from-purple-600 to-pink-600" },
  viberuto: { name: "Viberuto", emoji: "🍥", color: "from-orange-500 to-red-500" },
  meowverse: { name: "Meowverse", emoji: "🐱", color: "from-blue-500 to-purple-500" },
  vibefid: { name: "VibeFID", emoji: "🆔", color: "from-cyan-500 to-blue-600" },
  viberotbangers: { name: "Vibe Rot Bangers", emoji: "🧟", color: "from-red-600 to-purple-700" },
};

type ViewMode = "password" | "rooms" | "room-choice" | "spectator-entry" | "battle";

// Password for Mecha Arena access
const CPU_ARENA_PASSWORD = "vibe2025";

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
  isInFarcaster = false,
}: CpuArenaModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("rooms"); // Skip password
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [forceNewRoom, setForceNewRoom] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [buffCountdown, setBuffCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Get today's buffed collection
  const buffedCollection = useMemo(() => getDailyBuffedCollection(), []);
  const buffedCollectionInfo = COLLECTION_INFO[buffedCollection];

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      setBuffCountdown(getTimeUntilNextBuff());
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // 🚀 BANDWIDTH FIX: Collections are static - use cached hook (1h refresh)
  const { collections: availableCollections } = useCachedAvailableCollections();

  // Get active CPU rooms with spectator counts
  const cpuRooms = useQuery(api.pokerBattle.getCpuVsCpuRooms);

  // Mutations
  const createCpuRoom = useMutation(api.pokerBattle.createCpuVsCpuRoom);
  const spectateRoom = useMutation(api.pokerBattle.spectateRoom);

  // Get profile for username
  const profile = useQuery(
    api.profiles.getProfile,
    address && address.length > 0 ? { address } : "skip"
  );

  // Handle room selection
  const handleSelectRoom = (collection: string) => {
    setSelectedCollection(collection);
    setForceNewRoom(false);
    
    // Check if there's an active room for this collection
    const activeRoom = cpuRooms?.find((r: any) => r.collection === collection);
    if (activeRoom && activeRoom.status === "in-progress") {
      // Show choice: join existing or create new
      setViewMode("room-choice");
    } else {
      // No active room, go directly to deposit
      setViewMode("spectator-entry");
    }
    if (soundEnabled) AudioManager.buttonClick();
  };
  
  // Handle room choice - join existing
  const handleJoinExisting = () => {
    setForceNewRoom(false);
    setViewMode("spectator-entry");
    if (soundEnabled) AudioManager.buttonClick();
  };
  
  // Handle room choice - create new
  const handleCreateNew = () => {
    setForceNewRoom(true);
    setViewMode("spectator-entry");
    if (soundEnabled) AudioManager.buttonClick();
  };

  // Handle spectator entry success (deposited VBMS)
  const handleDepositSuccess = async (creditsAdded: number) => {
    if (!address || !selectedCollection) return;

    setIsJoining(true);
    try {
      // 1. Create or get CPU vs CPU room for this collection
      const result = await createCpuRoom({ collection: selectedCollection, forceNew: forceNewRoom });
      console.log("🤖 Mecha Arena room:", result.roomId, result.isNew ? "(new)" : "(existing)");

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
      console.error("Failed to join Mecha Arena:", err);
      if (soundEnabled) AudioManager.buttonError();
      alert(err.message || "Failed to join Mecha Arena");
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

  // Handle password verification
  const handlePasswordSubmit = () => {
    if (passwordInput === CPU_ARENA_PASSWORD) {
      setViewMode("rooms");
      setPasswordError(false);
      if (soundEnabled) AudioManager.buttonSuccess();
    } else {
      setPasswordError(true);
      if (soundEnabled) AudioManager.buttonError();
    }
  };

  // SSR check
  if (typeof window === "undefined") return null;
  if (!isOpen) return null;

  // Must have address to use Mecha Arena
  if (!address || address.length === 0) return null;

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
        isInFarcaster={isInFarcaster}
        soundEnabled={soundEnabled}
        initialRoomId={roomId} // Skip matchmaking - go directly to spectating this room
        skipSpectatorModal={true} // Already deposited via Mecha Arena entry
      />,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-vintage-charcoal to-vintage-black rounded-2xl border-2 border-vintage-gold/50 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============ PASSWORD VIEW ============ */}
        {viewMode === "password" && (
          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-display font-bold text-vintage-gold mb-1">
                {t('mechaPasswordTitle')}
              </h1>
              <p className="text-vintage-ice/60 text-sm">
                {t('mechaPasswordSubtitle')}
              </p>
            </div>

            {/* Password Input */}
            <div className="max-w-sm mx-auto">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                placeholder={t('mechaPasswordPlaceholder')}
                className={`w-full px-4 py-3 bg-vintage-black/50 border-2 ${
                  passwordError ? "border-red-500" : "border-vintage-gold/40"
                } rounded-lg text-vintage-ice placeholder-vintage-ice/50 focus:outline-none focus:border-vintage-gold text-center`}
                autoFocus
              />
              {passwordError && (
                <p className="text-red-400 text-sm mt-2 text-center">
                  {t('mechaPasswordError')}
                </p>
              )}

              <button
                onClick={handlePasswordSubmit}
                className="w-full mt-4 py-3 bg-vintage-gold/20 hover:bg-vintage-gold/30 border border-vintage-gold/50 text-vintage-gold font-bold rounded-lg transition-all"
              >
                {t('mechaEnterArena')}
              </button>

              <button
                onClick={onClose}
                className="w-full mt-3 py-2 text-vintage-ice/50 hover:text-vintage-ice text-sm transition-colors"
              >
                {t('mechaCancel')}
              </button>
            </div>
          </div>
        )}

        {/* ============ ROOM SELECTION VIEW ============ */}
        {viewMode === "rooms" && (
          <>
            {/* Header */}
            <div className="border-b border-vintage-gold/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-display font-bold text-vintage-gold">
                    {t('mechaTitle')}
                  </h1>
                  <p className="text-xs text-vintage-burnt-gold">
                    {t('mechaSubtitle')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-vintage-gold hover:text-vintage-burnt-gold text-xl rounded-full hover:bg-vintage-gold/10"
                >
                  X
                </button>
              </div>
            </div>

            {/* Daily Buff Banner */}
            <div className="mx-4 mt-3 bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-vintage-gold text-sm font-bold">
                    +{BUFF_CONFIG.oddsBonus}x {buffedCollectionInfo?.name || buffedCollection}
                  </p>
                  <p className="text-vintage-ice/50 text-xs">
                    {t('mechaResetsIn')} {String(buffCountdown.hours).padStart(2, '0')}:{String(buffCountdown.minutes).padStart(2, '0')}:{String(buffCountdown.seconds).padStart(2, '0')}
                  </p>
                </div>
                {(() => {
                  const collectionConfig = COLLECTIONS[buffedCollection as CollectionId];
                  const marketUrl = collectionConfig?.marketplaceUrl;
                  if (!marketUrl) return null;
                  return (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await openMarketplace(marketUrl, sdk, isInFarcaster);
                      }}
                      className="px-3 py-1 bg-vintage-gold/20 hover:bg-vintage-gold/30 border border-vintage-gold/50 rounded-lg text-vintage-gold text-xs font-bold transition-all"
                    >
                      BUY
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Available Rooms */}
            <div className="p-4">
              <div className="space-y-2">
                {availableCollections?.map((collection: string) => {
                  const info = COLLECTION_INFO[collection] || { name: collection, emoji: "", color: "" };
                  const roomData = cpuRooms?.find((r: any) => r.collection === collection);
                  const spectatorCount = roomData?.spectatorCount || 0;
                  const isBuffed = collection === buffedCollection;

                  return (
                    <button
                      key={collection}
                      onClick={() => handleSelectRoom(collection)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                        isBuffed
                          ? "bg-vintage-gold/10 border-vintage-gold/50 hover:bg-vintage-gold/20"
                          : "bg-vintage-black/30 border-vintage-gold/20 hover:border-vintage-gold/40 hover:bg-vintage-black/50"
                      }`}
                    >
                      <div className="text-left">
                        <p className={`font-bold text-sm ${isBuffed ? 'text-vintage-gold' : 'text-vintage-ice'}`}>
                          {info.name}
                        </p>
                        {isBuffed && <span className="text-xs text-vintage-burnt-gold">+{BUFF_CONFIG.oddsBonus}x bonus</span>}
                      </div>
                      <div className="flex items-center gap-3 text-vintage-ice/50 text-xs">
                        <span>{spectatorCount} watching</span>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Info */}
              <div className="mt-4 pt-3 border-t border-vintage-gold/20">
                <p className="text-vintage-ice/40 text-xs text-center">
                  {t('mechaHowItWorks1')}
                </p>
              </div>
            </div>
          </>
        )}


        {/* ============ ROOM CHOICE VIEW ============ */}
        {viewMode === "room-choice" && selectedCollection && (
          <div className="p-4">
            {/* Header */}
            <div className="mb-4 pb-3 border-b border-vintage-gold/30">
              <h2 className="text-lg font-display font-bold text-vintage-gold">
                {COLLECTION_INFO[selectedCollection]?.name || selectedCollection}
              </h2>
              <p className="text-xs text-vintage-burnt-gold">
                {t('mechaActiveBattle')}
              </p>
            </div>

            {/* Active room info */}
            {(() => {
              const activeRoom = cpuRooms?.find((r: any) => r.collection === selectedCollection);
              if (!activeRoom) return null;
              return (
                <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-vintage-gold text-sm font-bold">{t('mechaCurrentBattle')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-xs">{t('mechaLive')}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-vintage-ice/50 text-xs">{t('mechaRound')}</p>
                      <p className="text-vintage-gold font-bold">{activeRoom.currentRound || 1}/7</p>
                    </div>
                    <div>
                      <p className="text-vintage-ice/50 text-xs">{t('mechaScore')}</p>
                      <p className="text-vintage-gold font-bold">{activeRoom.hostScore || 0} - {activeRoom.guestScore || 0}</p>
                    </div>
                    <div>
                      <p className="text-vintage-ice/50 text-xs">{t('mechaSpectators')}</p>
                      <p className="text-vintage-gold font-bold">{activeRoom.spectatorCount || 0}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Choice buttons */}
            <div className="space-y-2">
              <button
                onClick={handleJoinExisting}
                className="w-full flex items-center justify-between p-3 bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/40 hover:border-vintage-gold/60 rounded-lg transition-all"
              >
                <div className="text-left">
                  <p className="text-vintage-gold font-bold text-sm">{t('mechaJoinCurrent')}</p>
                  <p className="text-xs text-vintage-ice/50">{t('mechaWatchOngoing')}</p>
                </div>
              </button>

              <button
                onClick={handleCreateNew}
                className="w-full flex items-center justify-between p-3 bg-vintage-black/30 hover:bg-vintage-black/50 border border-vintage-gold/20 hover:border-vintage-gold/40 rounded-lg transition-all"
              >
                <div className="text-left">
                  <p className="text-vintage-ice font-bold text-sm">{t('mechaStartNew')}</p>
                  <p className="text-xs text-vintage-ice/50">{t('mechaCreateFresh')}</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setViewMode("rooms");
                  setSelectedCollection(null);
                }}
                className="w-full py-2 text-vintage-ice/50 hover:text-vintage-ice text-sm transition-colors"
              >
                {t('mechaBackToArenas')}
              </button>
            </div>
          </div>
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
          <div className="absolute inset-0 bg-vintage-black/90 flex items-center justify-center z-50 rounded-2xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-vintage-gold border-t-transparent mx-auto mb-3"></div>
              <p className="text-vintage-gold font-bold text-sm">{t('mechaJoining')}</p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
