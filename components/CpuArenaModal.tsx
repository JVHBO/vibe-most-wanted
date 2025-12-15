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
  baseballcabal: { name: "Baseball Cabal", emoji: "⚾", color: "from-red-600 to-blue-700" },
  vibefx: { name: "Vibe FX", emoji: "✨", color: "from-fuchsia-500 to-violet-600" },
  historyofcomputer: { name: "History of Computer", emoji: "💻", color: "from-gray-600 to-slate-700" },
  cumioh: { name: "$CU-MI-OH!", emoji: "🎴", color: "from-yellow-500 to-amber-600" },
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
      className="fixed inset-0 bg-vintage-deep-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black rounded-2xl border-2 border-purple-500/50 max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============ PASSWORD VIEW ============ */}
        {viewMode === "password" && (
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🔐</div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-purple-400 mb-2">
                {t('mechaPasswordTitle')}
              </h1>
              <p className="text-vintage-ice/70">
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
                  passwordError ? "border-red-500" : "border-purple-500/50"
                } rounded-xl text-vintage-ice placeholder-vintage-ice/50 focus:outline-none focus:border-purple-400 text-center text-lg`}
                autoFocus
              />
              {passwordError && (
                <p className="text-red-400 text-sm mt-2 text-center">
                  {t('mechaPasswordError')}
                </p>
              )}

              <button
                onClick={handlePasswordSubmit}
                className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all transform hover:scale-105"
              >
                {t('mechaEnterArena')}
              </button>

              <button
                onClick={onClose}
                className="w-full mt-3 py-2 text-vintage-ice/70 hover:text-vintage-ice transition-colors"
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
            <div className="bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-purple-600/20 border-b-2 border-purple-500/30 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-4xl font-display font-bold text-purple-400 flex items-center gap-3">
                    <span className="text-3xl sm:text-5xl">🤖</span>
                    {t('mechaTitle')}
                  </h1>
                  <p className="text-sm sm:text-base text-purple-300/70 mt-1">
                    {t('mechaSubtitle')}
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

            {/* Daily Buff Banner */}
            <div className="mx-4 sm:mx-6 mt-4 bg-gradient-to-r from-orange-500/20 via-yellow-500/20 to-orange-500/20 border-2 border-orange-400/50 rounded-xl p-4 relative overflow-hidden">
              {/* Animated fire glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-yellow-500/20 to-orange-500/10 animate-pulse"></div>

              <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-4xl animate-bounce">🔥</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 font-bold text-lg">{t('mechaDailyBoost')}</span>
                      <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                        {t('mechaOddsBonus').replace('{bonus}', String(BUFF_CONFIG.oddsBonus))}
                      </span>
                    </div>
                    <p className="text-vintage-ice/80 text-sm">
                      {t('mechaTodayBoosted')} <span className="text-orange-300 font-bold">{buffedCollectionInfo?.name || buffedCollection}</span> {buffedCollectionInfo?.emoji}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center sm:items-end gap-2">
                  <div className="text-center sm:text-right">
                    <p className="text-vintage-ice/60 text-xs">{t('mechaResetsIn')}</p>
                    <p className="text-orange-400 font-mono font-bold">
                      {String(buffCountdown.hours).padStart(2, '0')}:
                      {String(buffCountdown.minutes).padStart(2, '0')}:
                      {String(buffCountdown.seconds).padStart(2, '0')}
                    </p>
                  </div>
                  {/* Buy button for boosted collection */}
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-full text-white text-xs font-bold transition-all shadow-lg hover:shadow-orange-500/30 cursor-pointer"
                      >
                        🛒 {collectionConfig?.buttonText || 'BUY PACKS'}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Available Rooms */}
            <div className="p-4 sm:p-6">
              <h2 className="text-xl font-display font-bold text-vintage-gold mb-4 flex items-center gap-2">
                <span>🎮</span> {t('mechaAvailableArenas')}
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

                  // Check if this collection is buffed today
                  const isBuffed = collection === buffedCollection;

                  return (
                    <button
                      key={collection}
                      onClick={() => handleSelectRoom(collection)}
                      className={`relative group bg-gradient-to-br ${info.color} hover:scale-105 border-2 ${
                        isBuffed
                          ? "border-orange-400 ring-2 ring-orange-400/50 shadow-orange-500/30"
                          : "border-white/20 hover:border-white/40"
                      } rounded-xl p-5 transition-all shadow-lg hover:shadow-xl`}
                    >
                      {/* Buff badge */}
                      {isBuffed && (
                        <>
                          {/* Fire glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-t from-orange-500/30 to-transparent rounded-xl animate-pulse"></div>

                          {/* HOT badge */}
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce z-10 flex items-center gap-1">
                            <span>🔥</span>
                            <span>{t('mechaHot')}</span>
                          </div>

                          {/* Odds bonus badge */}
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-10">
                            +{BUFF_CONFIG.oddsBonus}x ODDS
                          </div>
                        </>
                      )}

                      {/* Glow effect */}
                      <div className={`absolute inset-0 ${isBuffed ? "bg-orange-400/20" : "bg-white/10"} blur-xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10`}></div>

                      <div className="text-center">
                        <div className="text-5xl mb-3">{info.emoji}</div>
                        <p className="text-white font-display font-bold text-lg mb-1">
                          {info.name}
                        </p>
                        <p className="text-white/70 text-sm">
                          {t('mechaArena')}
                        </p>

                        {/* Spectator count and status */}
                        <div className="mt-3 flex items-center justify-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-lg">👁️</span>
                            <span className="text-white font-bold">{spectatorCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 ${isBuffed ? "bg-orange-400" : "bg-green-400"} rounded-full animate-pulse`}></div>
                            <span className="text-white/80 text-xs">{isBuffed ? t('mechaBoosted') : t('mechaLive')}</span>
                          </div>
                        </div>

                        {/* Buy Collection Button */}
                        {(() => {
                          const collectionConfig = COLLECTIONS[collection as CollectionId];
                          const marketUrl = collectionConfig?.marketplaceUrl;
                          if (!marketUrl) return null;
                          const isInternal = marketUrl.startsWith('/');
                          return (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await openMarketplace(marketUrl, sdk, isInFarcaster);
                              }}
                              className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-black/40 hover:bg-black/60 border border-white/30 hover:border-white/50 rounded-full text-white/90 text-xs font-medium transition-all cursor-pointer"
                            >
                              🛒 {collectionConfig?.buttonText || 'BUY PACKS'}
                            </button>
                          );
                        })()}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Info box */}
              <div className="mt-6 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <h3 className="text-purple-400 font-bold mb-2">💡 {t('mechaHowItWorks')}</h3>
                <ul className="text-vintage-ice/70 text-sm space-y-1">
                  <li>• {t('mechaHowItWorks1')}</li>
                  <li>• {t('mechaHowItWorks2')}</li>
                  <li>• {t('mechaHowItWorks3')}</li>
                  <li>• {t('mechaHowItWorks4')}</li>
                  <li>• <span className="text-orange-400 font-bold">🔥 {t('mechaDailyBoost')}:</span> {t('mechaHowItWorks5').replace('{bonus}', String(BUFF_CONFIG.oddsBonus))}</li>
                  <li>• {t('mechaHowItWorks6')}</li>
                </ul>
              </div>
            </div>
          </>
        )}


        {/* ============ ROOM CHOICE VIEW ============ */}
        {viewMode === "room-choice" && selectedCollection && (
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">
                {COLLECTION_INFO[selectedCollection]?.emoji || "🎮"}
              </div>
              <h2 className="text-2xl font-display font-bold text-purple-400 mb-2">
                {COLLECTION_INFO[selectedCollection]?.name || selectedCollection} Arena
              </h2>
              <p className="text-vintage-ice/70">
                {t('mechaActiveBattle')}
              </p>
            </div>

            {/* Active room info */}
            {(() => {
              const activeRoom = cpuRooms?.find((r: any) => r.collection === selectedCollection);
              if (!activeRoom) return null;
              return (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-purple-300 font-bold">{t('mechaCurrentBattle')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-sm">{t('mechaLive')}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-vintage-ice/60 text-xs">{t('mechaRound')}</p>
                      <p className="text-vintage-gold font-bold text-xl">{activeRoom.currentRound || 1}/7</p>
                    </div>
                    <div>
                      <p className="text-vintage-ice/60 text-xs">{t('mechaScore')}</p>
                      <p className="text-vintage-gold font-bold text-xl">{activeRoom.hostScore || 0} - {activeRoom.guestScore || 0}</p>
                    </div>
                    <div>
                      <p className="text-vintage-ice/60 text-xs">{t('mechaSpectators')}</p>
                      <p className="text-vintage-gold font-bold text-xl">{activeRoom.spectatorCount || 0}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Choice buttons */}
            <div className="space-y-3">
              <button
                onClick={handleJoinExisting}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">👁️</span>
                <div className="text-left">
                  <p className="text-lg">{t('mechaJoinCurrent')}</p>
                  <p className="text-xs text-white/70">{t('mechaWatchOngoing')}</p>
                </div>
              </button>

              <button
                onClick={handleCreateNew}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🆕</span>
                <div className="text-left">
                  <p className="text-lg">{t('mechaStartNew')}</p>
                  <p className="text-xs text-white/70">{t('mechaCreateFresh')}</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setViewMode("rooms");
                  setSelectedCollection(null);
                }}
                className="w-full py-3 text-vintage-ice/70 hover:text-vintage-ice transition-colors"
              >
                ← {t('mechaBackToArenas')}
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
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-vintage-gold font-bold">{t('mechaJoining')}</p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
