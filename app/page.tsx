"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ConvexProfileService, type UserProfile } from "../lib/convex-profile"; // ✨ Convex para Profiles
import { ConvexPvPService, type GameRoom } from "../lib/convex-pvp"; // ✨ Convex para PvP Rooms
import { sdk } from "@farcaster/miniapp-sdk";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMusic } from "@/contexts/MusicContext";
import { getAssetUrl } from "@/lib/ipfs-assets";
import { usePlayerCards } from "@/contexts/PlayerCardsContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery, useMutation, useConvex } from "convex/react";
import { toast } from "sonner";
import { usePrimaryAddress } from "@/lib/hooks/usePrimaryAddress";
import { useMiniappFrameContext } from "@/components/MiniappFrame";

import { api } from "@/convex/_generated/api";
import { api as fidApi } from "@/lib/fid/convex-generated/api";
import { vibefidConvex } from "@/contexts/VibeFIDConvexProvider";
import { CreateProfileModal } from "@/components/CreateProfileModal";
import { DEFAULT_TOUR_STEPS } from "@/components/GuidedTour";
import { GamePopups } from "@/components/GamePopups";
import { PvPPreviewModal } from "@/components/PvPPreviewModal";
import { GameNavBar } from "@/components/GameNavBar";
import { ConnectScreen } from "@/components/ConnectScreen";
import { GameHeader } from "@/components/GameHeader";
import { PriceTicker } from "@/components/PriceTicker";
import { AllCollectionsButton } from "@/components/AllCollectionsButton";
import BannedScreen from "@/components/BannedScreen";
// New Home Components
import { GameGrid, CardsPreview } from "@/components/home";
import { VibeFidMailModal } from "@/components/fid/VibeFidMailModal";
import { Roulette } from "@/components/Roulette";
import { HAND_SIZE, getMaxAttacks } from "@/lib/config";
// 🚀 Performance-optimized hooks
import { useTotalPower, useSortedByPower, useStrongestCards, usePowerByCollection } from "@/hooks/useCardCalculations";
import { usePopupStates } from "@/hooks/usePopupStates";
import { useBattleState, type BattleResult, VICTORY_IMAGES } from "@/hooks/useBattleState";
import { useMissionState } from "@/hooks/useMissionState";
import { useDefenseDeckState } from "@/hooks/useDefenseDeckState";
import { useAttackState } from "@/hooks/useAttackState";
import { useCardFilterState } from "@/hooks/useCardFilterState";
import { useFarcasterInit } from "@/hooks/useFarcasterInit";
import { useJCDeckLoader } from "@/hooks/useJCDeckLoader";
import { useMissionsManager } from "@/hooks/useMissionsManager";
import { useProfileStatsSync } from "@/hooks/useProfileStatsSync";
import { useSaveDefenseDeck } from "@/hooks/useSaveDefenseDeck";
import { useAccessAnalytics } from "@/hooks/useAccessAnalytics";
import { useAutoCreateProfile } from "@/hooks/useAutoCreateProfile";
import { useDailyClaim } from "@/hooks/useDailyClaim";
import { useWeeklyLeaderboardClaim } from "@/hooks/useWeeklyLeaderboardClaim";
import { getMissionInfo } from "@/lib/missions/missionConfig";
import { generateAIHand } from "@/lib/utils/aiHandGeneration";
import { usePowerCalculation } from "@/app/(game)/hooks/battle/usePowerCalculation";
import { BattleArena } from "@/app/(game)/components/battle/BattleArena";
import { MissionsView } from "@/app/(game)/components/views/MissionsView";
// 🚀 BANDWIDTH FIX: Cached hooks for infrequent data
import { useCachedDailyQuest } from "@/lib/convex-cache";
// 📝 Development logger (silent in production)
import { devLog, devError, devWarn } from "@/lib/utils/logger";
import { openMarketplace } from "@/lib/marketplace-utils";
// ⚡ Power calculations with collection multipliers (VibeFID 5x, VBMS 2x, Nothing 0.5x)
import { getCardDisplayPower, calculateTotalPower } from "@/lib/power-utils";
// 🔒 Session Lock (prevents multi-device exploit)
import { useSessionLock } from "@/lib/hooks/useSessionLock";
// 🔊 Audio Manager
import { AudioManager } from "@/lib/audio-manager";
// 🎨 Loading Spinner
import LoadingSpinner from "@/components/LoadingSpinner";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS"; // Miniapp-compatible balance hook

import { filterCardsByCollections, COLLECTIONS, getCollectionContract, getCardUniqueId, type CollectionId } from "@/lib/collections/index"; // getEnabledCollections removed - now only used by Context
import { findAttr, isUnrevealed, calcPower, normalizeUrl } from "@/lib/nft/attributes";
import { isSameCard, findCard, getCardKey } from "@/lib/nft";
import { getImage, fetchNFTs, clearAllNftCache } from "@/lib/nft/fetcher"; // checkCollectionBalances removed - now only used by Context
import { convertIpfsUrl } from "@/lib/ipfs-url-converter";
import type { Card } from "@/lib/types/card";

// 🚀 Dynamic imports — modals loaded on demand, not in initial bundle
const DifficultyModal = dynamic(() => import("@/components/DifficultyModal"), { ssr: false });
const TutorialModal = dynamic(() => import("@/components/TutorialModal").then(m => m.TutorialModal), { ssr: false });
const GuidedTour = dynamic(() => import("@/components/GuidedTour").then(m => m.GuidedTour), { ssr: false });
const SettingsModal = dynamic(() => import("@/components/SettingsModal").then(m => m.SettingsModal), { ssr: false });
const CpuArenaModal = dynamic(() => import("@/components/CpuArenaModal").then(m => m.CpuArenaModal), { ssr: false });
const BaccaratModal = dynamic(() => import("@/components/BaccaratModal").then(m => m.BaccaratModal), { ssr: false });
const CoinsInboxModal = dynamic(() => import("@/components/CoinsInboxModal").then(m => m.CoinsInboxModal), { ssr: false });
const PveCardSelectionModal = dynamic(() => import("@/components/PveCardSelectionModal").then(m => m.PveCardSelectionModal), { ssr: false });
const EliminationOrderingModal = dynamic(() => import("@/components/EliminationOrderingModal").then(m => m.EliminationOrderingModal), { ssr: false });
const PvPMenuModals = dynamic(() => import("@/components/PvPMenuModals").then(m => m.PvPMenuModals), { ssr: false });
const PvPEntryFeeModal = dynamic(() => import("@/components/PvPEntryFeeModal").then(m => m.PvPEntryFeeModal), { ssr: false });
const PvPInRoomModal = dynamic(() => import("@/components/PvPInRoomModal").then(m => m.PvPInRoomModal), { ssr: false });
const AttackCardSelectionModal = dynamic(() => import("@/components/AttackCardSelectionModal").then(m => m.AttackCardSelectionModal), { ssr: false });
const SessionLockedModal = dynamic(() => import("@/components/SessionLockedModal").then(m => m.SessionLockedModal), { ssr: false });
const LeaderboardRewardsModal = dynamic(() => import("@/app/(game)/components/modals/LeaderboardRewardsModal").then(m => m.LeaderboardRewardsModal), { ssr: false });
const MyCardsModal = dynamic(() => import("@/app/(game)/components/modals/MyCardsModal").then(m => m.MyCardsModal), { ssr: false });

const DefenseDeckModal = dynamic(() => import("@/app/(game)/components/modals/DefenseDeckModal").then(m => m.DefenseDeckModal), { ssr: false });
const ChangelogModal = dynamic(() => import("@/components/ChangelogModal").then(m => m.ChangelogModal), { ssr: false });
const ReportModal = dynamic(() => import("@/components/ReportModal").then(m => m.ReportModal), { ssr: false });

const STYLE_ATTACK_RED = { background: 'linear-gradient(145deg, #DC2626, #991B1B)' } as const;

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT;
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;

// 🎨 Avatar URL helper - Uses real Twitter profile pic when available
const getAvatarUrl = (twitterData?: string | null | { twitter?: string; twitterProfileImageUrl?: string }): string | null => {
  // Handle different input types
  if (!twitterData) return null;

  // If it's an object with profile image URL, use that (real Twitter photo)
  if (typeof twitterData === 'object' && twitterData.twitterProfileImageUrl) {
    const profileImageUrl = twitterData.twitterProfileImageUrl;
    if (profileImageUrl.includes('pbs.twimg.com')) {
      // Twitter returns "_normal" size (48x48), replace with "_400x400" for better quality
      return profileImageUrl.replace('_normal', '_400x400');
    }
    // Return profile image URL if available
    return profileImageUrl;
  }

  // No image available
  return null;
};

// Fallback: gold circle SVG
const getAvatarFallback = (): string => {
  return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23d4a017"><circle cx="12" cy="12" r="10"/></svg>';
};

// Tornar AudioManager global para persistir entre páginas

export default function TCGPage() {
  const { lang, setLang, t } = useLanguage();
  const { musicMode, setMusicMode, isMusicEnabled, setIsMusicEnabled, setVolume: syncMusicVolume, customMusicUrl, setCustomMusicUrl, isCustomMusicLoading, customMusicError, playlist, setPlaylist, addToPlaylist, removeFromPlaylist, currentPlaylistIndex, skipToNext, skipToPrevious, currentTrackName, currentTrackThumbnail, isPaused, pause, play } = useMusic();
  const router = useRouter();
  const searchParams = useSearchParams();
  const playButtonsRef = useRef<HTMLDivElement>(null);

  // Wagmi hooks for wallet connection
  const { address: wagmiAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  // Desktop frame mode: MiniappFrame wraps app on desktop browser
  // When true, force miniapp layout (nav at bottom, compact labels) even outside Farcaster
  const isFrameMode = useMiniappFrameContext();

  // Farcaster context detection (auto-connect wallet, FID, miniapp check)
  const {
    isInFarcaster, setIsInFarcaster,
    isActualMiniapp,
    farcasterFidState, setFarcasterFidState,
    farcasterClientFid,
    isCheckingFarcaster, setIsCheckingFarcaster,
    safeAreaInsets,
  } = useFarcasterInit(isFrameMode);

  // Resolve primary address (handles linked/secondary wallets on website)
  const { primaryAddress } = usePrimaryAddress();

  const address = primaryAddress || wagmiAddress;

  // 🚀 BANDWIDTH FIX: Move useProfile to top for early access to profileDashboard
  const { userProfile, isLoadingProfile: isLoadingProfileFromContext, setUserProfile, refreshProfile } = useProfile();
  const profileDashboard = userProfile as any; // Alias for backward compatibility
  const isLoadingProfile = isLoadingProfileFromContext;

  // 🚀 BANDWIDTH FIX: Derived wallet addresses from profile
  const allWalletAddresses = useMemo(() => {
    if (!address) return [];
    if (!profileDashboard?.primaryAddress) return [address];
    const primary = profileDashboard.primaryAddress;
    const linked = profileDashboard.linkedAddresses || [];
    const all = [primary, ...linked];
    const seen = new Set<string>();
    return all.filter((addr: string) => {
      const lower = addr.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    }).concat(
      all.some((a: string) => a.toLowerCase() === address.toLowerCase()) ? [] : [address]
    );
  }, [address, profileDashboard]);

  // Derived economy values
  const playerEconomy = profileDashboard ? {
    coins: profileDashboard.coins,
    lifetimeEarned: profileDashboard.lifetimeEarned,
    lifetimeSpent: profileDashboard.lifetimeSpent,
    dailyLimits: profileDashboard.dailyLimits,
    winStreak: profileDashboard.winStreak,
    canEarnMore: profileDashboard.canEarnMore,
  } : null;

  // 🚀 BANDWIDTH FIX: Daily quest changes once per day - use cached hook
  const { quest: dailyQuest } = useCachedDailyQuest();

  // 🚀 BANDWIDTH FIX: Use manual queries instead of useQuery subscriptions
  // This eliminates WebSocket subscription overhead (saves ~15MB/day)
  const convex = useConvex();
  const questsLoadedRef = useRef(false);

  // Reset when wallet changes so the next wallet loads fresh data
  useEffect(() => {
    questsLoadedRef.current = false;
    setQuestProgress(null);
    setWeeklyProgress(null);
    setPlayerMissions([]);
    setBanCheck(null);
  }, [address]);

  useEffect(() => {
    if (!address || questsLoadedRef.current) return;
    questsLoadedRef.current = true;

    const loadQuestData = async () => {
      try {
        const [qp, wp, pm, bc] = await Promise.all([
          convex.query(api.quests.getQuestProgress, { address }),
          convex.query(api.quests.getWeeklyProgress, { address }),
          convex.query(api.missions.getPlayerMissions, { playerAddress: address }),
          convex.query(api.blacklist.checkBan, { address }),
        ]);
        setQuestProgress(qp);
        setWeeklyProgress(wp);
        setPlayerMissions(pm || []);
        setBanCheck(bc);
      } catch (e) {
        devError('Error loading quest data:', e);
      }
    };
    loadQuestData();
  }, [address, convex]);


  // 🔒 Session Lock (prevents multi-device exploit)
  const { isSessionLocked, lockReason, forceReconnect } = useSessionLock();

  // Debug logging for address changes
  useEffect(() => {
    devLog('🔍 Address state:', {
      wagmiAddress,
      finalAddress: address,
      isConnected,
      isInFarcaster,
    });
  }, [wagmiAddress, address, isConnected, isInFarcaster]);

  // Save wagmiAddress to localStorage and FID to profile when connected in Farcaster
  useEffect(() => {
    const saveFarcasterProfile = async () => {
      if (!isInFarcaster || !wagmiAddress) return;

      devLog('[Farcaster] Saving address to localStorage:', wagmiAddress);
      localStorage.setItem('connectedAddress', wagmiAddress.toLowerCase());

      // Save FID to profile
      try {
        const context = await sdk?.context;
        const fid = context?.user?.fid;
        if (fid) {
          devLog('📱 Saving FID to profile:', fid);
          // 🚀 BANDWIDTH FIX: Use userProfile from context instead of getProfileLite
          if (userProfile && (!userProfile.fid || userProfile.fid !== fid.toString())) {
            await ConvexProfileService.updateProfile(wagmiAddress, {
              fid: fid.toString(),
              farcasterFid: fid  // numeric FID for Social Quests
            });
            devLog('✓ FID saved to profile');
          }
        }
      } catch (error) {
        devLog('! Could not save FID:', error);
      }
    };

    saveFarcasterProfile();
  }, [isInFarcaster, wagmiAddress, userProfile]);

  // Notify Farcaster SDK that app is ready
  // Init global error log buffer for bug reports
  useEffect(() => {
    import('@/lib/log-buffer').then(({ initLogBuffer }) => initLogBuffer());
  }, []);

  // Auto-show changelog when new version detected
  useEffect(() => {
    import('@/components/ChangelogModal').then(({ CHANGELOG_VERSION, CHANGELOG_STORAGE_KEY }) => {
      const seen = localStorage.getItem(CHANGELOG_STORAGE_KEY);
      if (seen !== CHANGELOG_VERSION) {
        setShowChangelog(true);
        localStorage.setItem(CHANGELOG_STORAGE_KEY, CHANGELOG_VERSION);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    showTutorial, setShowTutorial,
    showGuidedTour, setShowGuidedTour,
    showBattleScreen, setShowBattleScreen,
    showWinPopup, setShowWinPopup,
    showLossPopup, setShowLossPopup,
    showTiePopup, setShowTiePopup,
    showRoulette, setShowRoulette,
    showCpuArena, setShowCpuArena,
    showBaccarat, setShowBaccarat,
    isDifficultyModalOpen, setIsDifficultyModalOpen,
    showDefenseDeckModal, setShowDefenseDeckModal,
    showDefenseDeckWarning, setShowDefenseDeckWarning,
    showDefenseDeckSaved, setShowDefenseDeckSaved,
    showPveCardSelection, setShowPveCardSelection,
    showAttackCardSelection, setShowAttackCardSelection,
    showPvPEntryFeeModal, setShowPvPEntryFeeModal,
    showPvPPreview, setShowPvPPreview,
    showLeaderboardRewardsModal, setShowLeaderboardRewardsModal,
    showMyCardsModal, setShowMyCardsModal,
    modeMenuOpen, setModeMenuOpen,
    showSettings, setShowSettings,
    showCreateProfile, setShowCreateProfile,
    showChangeUsername, setShowChangeUsername,
    showFidMailModal, setShowFidMailModal,
    fidModalTarget, setFidModalTarget,
    showDailyClaimPopup, setShowDailyClaimPopup,
    showWeeklyLeaderboardPopup, setShowWeeklyLeaderboardPopup,
    showChangelog, setShowChangelog,
    showReport, setShowReport,
  } = usePopupStates();

  const {
    result, setResult,
    isBattling, setIsBattling,
    dealerCards, setDealerCards,
    battlePhase, setBattlePhase,
    battleOpponentName, setBattleOpponentName,
    battlePlayerName, setBattlePlayerName,
    battlePlayerPfp, setBattlePlayerPfp,
    battleOpponentPfp, setBattleOpponentPfp,
    currentVictoryImage, setCurrentVictoryImage,
    lastBattleResult, setLastBattleResult,
    tieGifLoaded, setTieGifLoaded,
    sharesRemaining, setSharesRemaining,
    gameMode, setGameMode,
    pvpMode, setPvpMode,
    roomCode, setRoomCode,
    currentRoom, setCurrentRoom,
    eliminationDifficulty, setEliminationDifficulty,
    battleMode, setBattleMode,
    eliminationPhase, setEliminationPhase,
    orderedPlayerCards, setOrderedPlayerCards,
    orderedOpponentCards, setOrderedOpponentCards,
    currentRound, setCurrentRound,
    roundResults, setRoundResults,
    eliminationPlayerScore, setEliminationPlayerScore,
    eliminationOpponentScore, setEliminationOpponentScore,
    pvpPreviewData, setPvpPreviewData,
    isLoadingPreview, setIsLoadingPreview,
  } = useBattleState();

  const {
    questProgress, setQuestProgress,
    weeklyProgress, setWeeklyProgress,
    playerMissions, setPlayerMissions,
    banCheck, setBanCheck,
    loginBonusClaimed, setLoginBonusClaimed,
    isClaimingBonus, setIsClaimingBonus,
    isClaimingWeeklyReward, setIsClaimingWeeklyReward,
    missions, setMissions,
    isLoadingMissions, setIsLoadingMissions,
    isClaimingMission, setIsClaimingMission,
    isClaimingAll, setIsClaimingAll,
    missionsSubView, setMissionsSubView,
  } = useMissionState();

  const {
    defenseDeckSaveStatus, setDefenseDeckSaveStatus,
    defenseDeckSortByPower, setDefenseDeckSortByPower,
    defenseDeckCollection, setDefenseDeckCollection,
    pveSelectedCards, setPveSelectedCards,
    pveSortByPower, setPveSortByPower,
    aiDifficulty, setAiDifficulty,
    unlockedDifficulties, setUnlockedDifficulties,
    tempSelectedDifficulty, setTempSelectedDifficulty,
  } = useDefenseDeckState();

  const {
    attackSelectedCards, setAttackSelectedCards,
    targetPlayer, setTargetPlayer,
    attacksRemaining, setAttacksRemaining,
    isAttacking, setIsAttacking,
    isConfirmingCards, setIsConfirmingCards,
    defensesReceived, setDefensesReceived,
    unreadDefenses, setUnreadDefenses,
    profileUsername, setProfileUsername,
    isCreatingProfile, setIsCreatingProfile,
    newUsername, setNewUsername,
    isChangingUsername, setIsChangingUsername,
  } = useAttackState();

  const {
    sortByPower, setSortByPower,
    sortAttackByPower, setSortAttackByPower,
    cardTypeFilter, setCardTypeFilter,
    selectedCollections, setSelectedCollections,
    currentPage, setCurrentPage,
    filteredCount, setFilteredCount,
    isSearching, setIsSearching,
    selectedRoomMode, setSelectedRoomMode,
  } = useCardFilterState();

  const soundEnabled = true;
  const [musicVolume, setMusicVolume] = useState<number>(0.1); // Volume padrão 10%
  const [nfts, setNfts] = useState<any[]>([]);
  const { jcNfts, jcNftsLoading, jcLoadingProgress } = useJCDeckLoader();
  const [status, setStatus] = useState<string>("idle");
  // 🔗 Get cards from shared context (persists across routes!)
  // 🚀 BANDWIDTH FIX: Use context's loadNFTs instead of local duplicate
  const { nfts: contextNfts, status: contextStatus, forceReloadNFTs: contextForceReloadNFTs, refreshUserProfile } = usePlayerCards();

  // 🔗 Sync with context: If context has cards, use them (prevents reload on navigation)
  // 🚀 BANDWIDTH FIX (Jan 2026): Context is now the single source of truth for NFT loading
  useEffect(() => {
    if (contextStatus === 'loaded' && contextNfts.length > 0 && nfts.length === 0) {
      devLog('Syncing from context:', contextNfts.length, 'cards');
      setNfts([...contextNfts]);
      setStatus('loaded');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vbms_cards_loaded', 'true');
      }
    }
  }, [contextNfts, contextStatus, nfts.length]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<any[]>([]);
  const [playerPower, setPlayerPower] = useState<number>(0);
  const [dealerPower, setDealerPower] = useState<number>(0);
  // Miniapp: 12 cards (1.5 rows), Website: 24 cards (3 full rows of 8)
  const CARDS_PER_PAGE = isInFarcaster ? 12 : 24;

  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastVictoryIndexRef = useRef<number>(-1); // Track last victory screen to prevent consecutive duplicates


  // 🎯 Check VibeFID achievement when cards load (moved from removed local loadNFTs)
  useEffect(() => {
    if (nfts.length > 0 && address) {
      const hasVibeFID = nfts.some((card: any) => card.collection === 'vibefid');
      if (hasVibeFID) {
        convex.mutation(api.missions.markVibeFIDMinted, {
          playerAddress: address.toLowerCase(),
        }).catch((error: any) => {
          devWarn('⚠️ Failed to mark VibeFID achievement:', error);
        });
      }
    }
  }, [nfts, address, convex]);

  // 🚀 Performance: Memoized NFT calculations (only recomputes when nfts change)
  const totalNftPower = useTotalPower(nfts);
  const collectionPowers = usePowerByCollection(nfts); // Powers separated by collection for leaderboards
  const openedCardsCount = useMemo(() => nfts.filter(nft => !isUnrevealed(nft)).length, [nfts]);
  const unopenedCardsCount = useMemo(() => nfts.filter(nft => isUnrevealed(nft)).length, [nfts]);
  const nftTokenIds = useMemo(() => nfts.map(nft => nft.tokenId), [nfts]);

  // 🚀 Performance: Memoized sorted NFTs (for auto-select and AI)
  const sortedNfts = useSortedByPower(nfts);
  const strongestNfts = useStrongestCards(nfts, HAND_SIZE);

  // 🚀 Performance: Memoized JC NFTs (AI deck)
  const sortedJcNfts = useSortedByPower(jcNfts);

  // Economy mutations
  const awardPvECoins = useMutation(api.economy.awardPvECoins);
  const recordAttackResult = useMutation(api.economy.recordAttackResult); // ⚛️ ATOMIC: Combines coins + match + profile update
  const payEntryFee = useMutation(api.economy.payEntryFee);
  const setPreferredChainMutation = useMutation(api.missions.setPreferredChain);

  // 🚀 BANDWIDTH FIX: Use profileDashboard instead of separate query
  const getVBMSBalance = profileDashboard ? {
    inbox: profileDashboard.inbox,
    claimedTokens: profileDashboard.claimedTokens,
    canPlayPvP: profileDashboard.inbox >= 5, // VBMS_ENTRY_FEES.pvp = 5
    minimumRequired: 5,
  } : null;

  // PvP Entry Fee & Reward System (VBMS entry → TESTVBMS inbox rewards)
  const useEntryFee = useMutation(api.pvp.useEntryFee);
  const claimPvPWinReward = useMutation(api.pvp.claimPvPWinReward);

  // 💎 VBMS Blockchain Contract Hooks (using Farcaster-compatible hook)
  const { balance: vbmsBlockchainBalance } = useFarcasterVBMSBalance(address);


  // 🏅 Weekly Leaderboard Rewards (skip in miniapp for performance)
  const weeklyRewardEligibility = useQuery(
    api.quests.checkWeeklyRewardEligibility,
    address ? { address } : "skip"
  );
  // Show weekly leaderboard popup when eligible
  useEffect(() => {
    if (weeklyRewardEligibility?.eligible && address) {
      setShowWeeklyLeaderboardPopup(true);
    }
  }, [weeklyRewardEligibility?.eligible, address]);

  // 💰 Coins Inbox Status
  // 🚀 BANDWIDTH FIX: Use profileDashboard instead of separate query
  const inboxStatus = profileDashboard ? {
    coinsInbox: profileDashboard.coinsInbox,
    coins: profileDashboard.coins,
    inbox: profileDashboard.inbox,
    lifetimeEarned: profileDashboard.lifetimeEarned,
    cooldownRemaining: profileDashboard.cooldownRemaining,
    pendingConversion: profileDashboard.pendingConversion || 0,
    pendingConversionTimestamp: profileDashboard.pendingConversionTimestamp || null,
  } : null;

  // 🎮 Daily Attempts System (PvE limits)
  // 🚀 BANDWIDTH FIX: Use profileDashboard instead of separate query
  const pveAttemptsData = profileDashboard ? {
    remaining: profileDashboard.pveRemaining,
    total: profileDashboard.pveTotal,
  } : null;
  const consumePveAttempt = useMutation(api.pokerCpu.consumePveAttempt);

  // 🚀 BANDWIDTH FIX: Get locked cards from profileDashboard instead of separate queries
  // Saves ~64MB/day by eliminating 2 redundant getAvailableCards queries
  // Attack and PvP modes have the same locked cards (defense deck)
  const lockedTokenIds = useMemo(() =>
    profileDashboard?.lockedTokenIds || [],
    [profileDashboard?.lockedTokenIds]
  );

  // 🔋 Raid Deck - Used for energy check AND locked cards derivation
  const raidDeckData = useQuery(
    api.raidBoss.getPlayerRaidDeck,
    address ? { address } : "skip"
  );
  const hasExpiredRaidCards = useMemo(() => {
    if (!raidDeckData?.cardEnergy) return false;
    const now = Date.now();
    return raidDeckData.cardEnergy.some(
      (ce: { energyExpiresAt: number }) => ce.energyExpiresAt !== 0 && now > ce.energyExpiresAt
    );
  }, [raidDeckData?.cardEnergy]);

  // 🚀 BANDWIDTH FIX: Derive raid locked cards from raidDeckData
  // Eliminates getLockedCardsForDeckBuilding query (~16MB/day savings)
  // Cards in raid deck are locked when building defense deck
  const defenseLockedTokenIds = useMemo(() => {
    const locked: string[] = [];
    if (raidDeckData?.deck) {
      for (const card of raidDeckData.deck) {
        // VibeFID cards are exempt from lock
        if (card.collection === 'vibefid') continue;
        locked.push(`${card.collection || 'default'}:${card.tokenId}`);
      }
    }
    // Also check VibeFID slot if it has a non-VibeFID card
    if (raidDeckData?.vibefidCard && raidDeckData.vibefidCard.collection !== 'vibefid') {
      locked.push(`${raidDeckData.vibefidCard.collection || 'default'}:${raidDeckData.vibefidCard.tokenId}`);
    }
    return new Set(locked);
  }, [raidDeckData?.deck, raidDeckData?.vibefidCard]);

  // Clean conflicting cards from defense deck on load
  const cleanConflictingDefense = useMutation(api.profiles.cleanConflictingDefenseCards);

  const pvpBattleStarted = useRef<boolean>(false); // PvP battle flag to prevent double-start (useRef for immediate sync access)
  const pvpProcessedBattles = useRef<Set<string>>(new Set()); // Track which battles have been processed to prevent duplicates

  // Profile States
  const [currentView, setCurrentView] = useState<'game' | 'profile' | 'missions' | 'inbox'>('game');

  // Check URL for view parameter (e.g., ?view=shop) or attack parameter (e.g., ?attack=address)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      const attackParam = params.get('attack');

      if (viewParam === 'shop') {
        // Redirect to standalone shop page
        router.push('/shop');
      }

      // Handle attack parameter - redirect to leaderboard page
      if (attackParam) {
        router.push(`/leaderboard?attack=${attackParam}`);
      }
    }
  }, [router]);

// Scroll to top when view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView]);

  // 📬 VibeMail unread count for notification dot on VibeFID button
  // NOTE: messages are in VibeFID Convex (scintillating-mandrill-101), NOT VMW Convex — must use vibefidConvex client directly
  const userFidForVibemail = farcasterFidState || userProfile?.farcasterFid || (userProfile?.fid ? parseInt(userProfile.fid) : undefined);
  const [unreadVibeMailCount, setUnreadVibeMailCount] = useState<number>(0);
  useEffect(() => {
    if (!userFidForVibemail) return;
    vibefidConvex.query(fidApi.cardVotes.getUnreadMessageCount, { cardFid: userFidForVibemail })
      .then(setUnreadVibeMailCount)
      .catch(() => {});
  }, [userFidForVibemail]);

  // Listen for floating background vibecard clicks → open FID modal
  useEffect(() => {
    const handler = (e: Event) => {
      const fid = (e as CustomEvent).detail?.fid;
      if (!fid) return;
      setFidModalTarget(fid);
      setShowFidMailModal(true);
    };
    window.addEventListener('open-fid-modal', handler);
    return () => window.removeEventListener('open-fid-modal', handler);
  }, []);


  // 🆕 AUTO-CREATE/UPDATE PROFILE: When user enters via Farcaster with FID + wallet
  useAutoCreateProfile({
    address, isInFarcaster, farcasterFidState, isCheckingFarcaster,
    userProfile, isLoadingProfile, refreshProfile,
  });
  // ARB disabled — all transactions on Base only
  const arbSupported = false;
  const effectiveChain = "base";
  // Check if any missions are claimable (for pulsing button)
  const hasClaimableMissions = useMemo(() => {
    // Daily LOGIN bonus claimable?
    const dailyLoginClaimable = !loginBonusClaimed && address && userProfile;

    // Daily quest claimable?
    const dailyQuestClaimable = questProgress?.completed && !questProgress?.claimed;

    // Weekly quests claimable?
    const weeklyQuests = weeklyProgress?.quests;
    const weeklyClaimable = weeklyQuests && (
      (weeklyQuests.weekly_attack_wins?.completed && !weeklyQuests.weekly_attack_wins?.claimed) ||
      (weeklyQuests.weekly_total_matches?.completed && !weeklyQuests.weekly_total_matches?.claimed) ||
      (weeklyQuests.weekly_defense_wins?.completed && !weeklyQuests.weekly_defense_wins?.claimed) ||
      (weeklyQuests.weekly_pve_streak?.completed && !weeklyQuests.weekly_pve_streak?.claimed)
    );

    // Personal missions claimable? (VibeFID, welcome_gift, streaks, etc.)
    const personalMissionsClaimable = playerMissions && playerMissions.some(
      (m: { completed: boolean; claimed: boolean }) => m.completed && !m.claimed
    );

    return dailyLoginClaimable || dailyQuestClaimable || personalMissionsClaimable;
  }, [questProgress, loginBonusClaimed, address, userProfile, playerMissions]);

  // 🚀 Performance: Memoized battle card power totals (for UI display)
  const pveSelectedCardsPower = useTotalPower(pveSelectedCards);
  const { totalPower: attackSelectedCardsPower } = usePowerCalculation(attackSelectedCards, true);
  const { totalPower: dealerCardsPower } = usePowerCalculation(dealerCards, true);


  // Calculate max attacks for current user
  const maxAttacks = useMemo(() => getMaxAttacks(address), [address]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reward Choice Modal State

  // Update shares remaining when profile changes
  useEffect(() => {
    if (userProfile) {
      const today = new Date().toISOString().split('T')[0];
      const dailyShares = userProfile.lastShareDate === today ? (userProfile.dailyShares || 0) : 0;
      setSharesRemaining(3 - dailyShares);
    }
  }, [userProfile]);

  // Handle share button click - award bonus
  const handleShareClick = async (platform: 'twitter' | 'farcaster') => {
    if (!address || !userProfile) return;

    try {
      const result = await convex.mutation(api.economy.awardShareBonus, {
        address,
        type: 'victory',
      });

      if (result.success) {
        setSuccessMessage(result.message);
        setSharesRemaining(result.remaining);

        // Refresh profile to update coins
        await refreshProfile();
      } else {
        // Already claimed or limit reached - just show message
        if (result.message) {
          setErrorMessage(result.message);
        }
      }
    } catch (error: any) {
      devError('Error awarding share bonus:', error);
    }
  };

  // Preload tie.mp4 to prevent loading delay
  useEffect(() => {
    const video = document.createElement('video');
    video.src = getAssetUrl('/tie.mp4');
    video.oncanplaythrough = () => setTieGifLoaded(true);
    video.load();
  }, []);


  // Generate particle configurations once to prevent hydration errors
  const particleConfigs = useMemo(() => {
    return Array.from({ length: 20 }).map(() => ({
      left: Math.random() * 100,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 10,
    }));
  }, []);

  // Carregar estado da música do localStorage na montagem
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMusicEnabled = localStorage.getItem('musicEnabled');
      const savedMusicVolume = localStorage.getItem('musicVolume');

      if (savedMusicEnabled !== null) {
        const isEnabled = savedMusicEnabled === 'true';
        setIsMusicEnabled(isEnabled);
      }
      if (savedMusicVolume !== null) {
        const volume = parseFloat(savedMusicVolume);
        setMusicVolume(volume);
        // Sincroniza o AudioManager.currentVolume imediatamente
        AudioManager.currentVolume = volume;
        devLog(`📦 Volume carregado do localStorage: ${volume} (${Math.round(volume * 100)}%)`);
      }
    }
  }, [setIsMusicEnabled]);

  // Show tutorial for ALL players once (existing and new)
  // Also supports ?tutorial=true URL param to force show tutorial
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!address || !userProfile) return; // Wait until user is logged in

    // Check for ?tutorial=true URL param to force show
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tutorial') === 'true') {
      localStorage.removeItem('tutorialSeenV2');
      setShowTutorial(true);
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // TOUR DISABLED — re-enable by setting TOUR_ENABLED = true
    const TOUR_ENABLED = false;
    const tutorialSeen = localStorage.getItem('tutorialSeenV2');
    if (!tutorialSeen && TOUR_ENABLED) {
      setShowTutorial(true);
    }
  }, [address, userProfile]);

  // Sync music volume with MusicContext
  useEffect(() => {
    syncMusicVolume(musicVolume);
  }, [musicVolume, syncMusicVolume]);


  // 📊 Log access analytics (miniapp vs farcaster_web vs web)
  useAccessAnalytics({ address, isInFarcaster, isCheckingFarcaster });

  // 🎉 Show victory popup with RANDOM image selection
  const showVictory = () => {
    // RANDOMLY select one of the 5 victory screens, avoiding consecutive duplicates
    let randomIndex = Math.floor(Math.random() * VICTORY_IMAGES.length);

    // If we got the same index as last time AND we have more than 1 option, pick a different one
    if (randomIndex === lastVictoryIndexRef.current && VICTORY_IMAGES.length > 1) {
      // Pick a different random index
      const availableIndices = Array.from({ length: VICTORY_IMAGES.length }, (_, i) => i)
        .filter(i => i !== lastVictoryIndexRef.current);
      randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      devLog(`🔄 Avoided duplicate victory screen, changed from ${lastVictoryIndexRef.current} to ${randomIndex}`);
    }

    // Remember this index for next time
    lastVictoryIndexRef.current = randomIndex;
    const victoryImage = VICTORY_IMAGES[randomIndex];

    devLog(`🎲 Random victory screen selected: ${victoryImage} (index: ${randomIndex})`);

    // Audio is now handled entirely by GamePopups component to avoid duplication
    // victory-1.jpg → /win-sound.mp3 (via GamePopups)
    // victory-2.jpg → /marvin-victory.mp3 (via GamePopups)
    // victory-3.jpg → /victory-3.mp3 loop (via GamePopups)
    // bom.jpg → /victory-sound.mp3 (via GamePopups)

    setCurrentVictoryImage(victoryImage);

    // TESTVBMS already added - just show victory
    setShowWinPopup(true);
  };

  // Show battle result popup (win/loss/tie) after battle closes
  const showBattleResultPopup = (result: 'win' | 'loss' | 'tie') => {
    setTimeout(() => {
      if (result === 'win') {
        showVictory();
      } else if (result === 'loss') {
        setShowLossPopup(true);
      } else {
        setShowTiePopup(true);
        if (soundEnabled) AudioManager.tie();
      }
    }, 100);
  };

  // ⚔️ Handler for confirming PvP attack from preview modal
  const handleConfirmAttack = async () => {
    setShowPvPPreview(false);
    if (soundEnabled) AudioManager.buttonClick();
    setIsAttacking(true);

    try {
      await payEntryFee({ address: address || '', mode: 'attack' });
      devLog('Attack entry fee paid: 50 $TESTVBMS');

      devLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      devLog(`✦ ATTACKING: ${targetPlayer!.username}`);
      devLog(`🛡️ Validating opponent's defense deck...`);

      const validatedDeck = await ConvexProfileService.getValidatedDefenseDeck(targetPlayer!.address);

      if (validatedDeck.removedCards.length > 0) {
        devWarn(`⚠️ Removed ${validatedDeck.removedCards.length} invalid cards from ${targetPlayer!.username}'s defense deck (no longer owned)`);
      }

      if (!validatedDeck.isValid) {
        devWarn(`⚠️ Could not validate ${targetPlayer!.username}'s defense deck - using as-is`);
      }

      const defenderCards = validatedDeck.defenseDeck.map((card) => ({
        tokenId: card.tokenId,
        power: card.power,
        imageUrl: card.imageUrl,
        name: card.name,
        rarity: card.rarity,
      }));

      devLog(`✅ Defense deck validated: ${defenderCards.length} valid cards`);
      devLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setSelectedCards(attackSelectedCards);
      setDealerCards(defenderCards);
      setBattleOpponentName(targetPlayer!.username);
      setBattlePlayerName(userProfile?.username || 'You');
      setBattleOpponentPfp(getAvatarUrl(targetPlayer!.twitter));
      setBattlePlayerPfp(getAvatarUrl(userProfile ? { twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl } : null));
      setShowAttackCardSelection(false);
      setIsBattling(true);
      setShowBattleScreen(true);
      setBattlePhase('cards');
      setGameMode('pvp');

      if (soundEnabled) AudioManager.playHand();

      const playerTotal = calculateTotalPower(attackSelectedCards, true);
      const dealerTotal = calculateTotalPower(defenderCards);

      setTimeout(() => {
        setBattlePhase('clash');
        if (soundEnabled) AudioManager.cardBattle();
      }, 2500);

      setTimeout(() => {
        setPlayerPower(playerTotal);
        setDealerPower(dealerTotal);
        setBattlePhase('result');
      }, 3500);

      setTimeout(async () => {
        let matchResult: 'win' | 'loss' | 'tie';
        if (playerTotal > dealerTotal) {
          matchResult = 'win';
        } else if (playerTotal < dealerTotal) {
          matchResult = 'loss';
        } else {
          matchResult = 'tie';
        }

        let coinsEarned = 0;

        if (userProfile && address) {
          try {
            const result = await recordAttackResult({
              playerAddress: address,
              playerPower: playerTotal,
              playerCards: attackSelectedCards,
              playerUsername: userProfile.username,
              result: matchResult,
              opponentAddress: targetPlayer!.address,
              opponentUsername: targetPlayer!.username,
              opponentPower: dealerTotal,
              opponentCards: defenderCards,
              entryFeePaid: 0,
              language: lang,
            });

            coinsEarned = result.coinsAwarded || 0;

            devLog(`⚛️ ATOMIC: Attack recorded successfully`);
            devLog(`💰 Coins awarded: ${coinsEarned}`);
            if (result.bonuses && result.bonuses.length > 0) {
              devLog(`🎁 Bonuses: ${result.bonuses.join(', ')}`);
            }

            if (result.profile) {
              setUserProfile(result.profile as any);
              setAttacksRemaining(maxAttacks - ((result.profile as any).attacksToday || 0));
            }
          } catch (error: any) {
            devError('⚛️ ATOMIC: Error recording attack:', error);
          }
        }

        setLastBattleResult({
          result: matchResult,
          playerPower: playerTotal,
          opponentPower: dealerTotal,
          opponentName: targetPlayer!.username,
          opponentTwitter: targetPlayer!.twitter,
          type: 'attack',
          coinsEarned,
          playerPfpUrl: userProfile?.twitterProfileImageUrl,
          opponentPfpUrl: targetPlayer!.twitterProfileImageUrl,
        });

        if (address && userProfile) {
          fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'defense_attacked',
              data: {
                defenderAddress: targetPlayer!.address,
                defenderUsername: targetPlayer!.username || 'Unknown',
                attackerUsername: userProfile.username || 'Unknown',
                result: matchResult === 'win' ? 'lose' : 'win',
                coinsChange: coinsEarned,
              },
            }),
          }).catch(err => devError('Error sending notification:', err));
        }

        setIsBattling(false);
        setShowBattleScreen(false);
        setBattlePhase('cards');
        setIsAttacking(false);
        setShowAttackCardSelection(false);
        setTargetPlayer(null);
        setAttackSelectedCards([]);

        showBattleResultPopup(matchResult);
      }, 4500);

    } catch (error: any) {
      setErrorMessage('Error: ' + error.message);
      setIsAttacking(false);
      if (soundEnabled) AudioManager.buttonError();
    }
  };

  // 🎵 Handler to close victory screen and stop audio
  const handleCloseVictoryScreen = () => {
    // Stop victory audio if playing
    if (victoryAudioRef.current) {
      victoryAudioRef.current.pause();
      victoryAudioRef.current.currentTime = 0;
      victoryAudioRef.current = null;
    }
    setShowWinPopup(false);
    // TESTVBMS already added - no modal
  };

  // 🎵 Handler to close defeat screen
  const handleCloseDefeatScreen = () => {
    setShowLossPopup(false);
    // TESTVBMS already added - no modal
  };

  const { handleClaimLoginBonus, handleDailyClaimNow } = useDailyClaim({
    address, lang, effectiveChain, soundEnabled,
    loginBonusClaimed, isClaimingBonus,
    setIsClaimingBonus, setLoginBonusClaimed,
    setShowDailyClaimPopup, refreshProfile,
  });

  const { handleClaimWeeklyLeaderboardReward } = useWeeklyLeaderboardClaim({
    address, soundEnabled, isClaimingWeeklyReward,
    setIsClaimingWeeklyReward, setShowWeeklyLeaderboardPopup,
  });

  // Handler for game mode selection from GameGrid
  type GameMode = 'battle-ai' | 'mecha' | 'raid' | 'baccarat' | 'tcg';
  const handleGameModeSelect = (mode: GameMode) => {
    if (!userProfile) {
      setShowCreateProfile(true);
      return;
    }
    if (soundEnabled) AudioManager.buttonClick();

    switch (mode) {
      case 'battle-ai':
        setShowPveCardSelection(true);
        setPveSelectedCards([]);
        break;
      case 'mecha':
        setShowCpuArena(true);
        break;
      case 'raid':
        router.push('/raid');
        break;
      case 'baccarat':
        setShowBaccarat(true);
        break;
      case 'tcg':
        router.push('/tcg');
        break;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('musicEnabled', isMusicEnabled.toString());

      // Stop old AudioManager to prevent dual playback
      AudioManager.stopBackgroundMusic();
    }
  }, [isMusicEnabled]);

  // Atualiza e salva volume da música quando musicVolume muda
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('musicVolume', musicVolume.toString());
      AudioManager.setVolume(musicVolume);
    }
  }, [musicVolume]);




  // 🛡️ Handle setupDefense query parameter from leaderboard page
  useEffect(() => {
    const setupDefense = searchParams.get('setupDefense');
    if (setupDefense === 'true' && address && userProfile && nfts.length >= 5) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setShowDefenseDeckModal(true);
        // Clear the query param from URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete('setupDefense');
        window.history.replaceState({}, '', url.pathname);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams, address, userProfile, nfts.length]);

  // Sync login bonus claimed status
  useEffect(() => {
    if (playerEconomy?.dailyLimits?.loginBonus) {
      setLoginBonusClaimed(true);
    } else {
      setLoginBonusClaimed(false);
    }
  }, [playerEconomy, address, userProfile]);


  // Check for attack parameter (from rematch button)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const attackAddress = urlParams.get('attack');

    if (attackAddress && address && nfts.length > 0) {
      // Fetch target player profile
      ConvexProfileService.getProfile(attackAddress).then((profile) => {
        if (profile) {
          devLog('🎯 Opening attack modal for:', profile.username);
          setTargetPlayer(profile);
          setShowAttackCardSelection(true);
          setAttackSelectedCards([]);
          setCurrentView('game');
          // Clean up URL
          window.history.replaceState({}, '', '/');
        } else {
          devWarn('! Could not find profile for attack target:', attackAddress);
          // Clean up URL even if profile not found
          window.history.replaceState({}, '', '/');
        }
      }).catch((err) => {
        devError('✗ Error loading attack target profile:', err);
        // Clean up URL on error
        window.history.replaceState({}, '', '/');
      });
    }
  }, [address, nfts.length]);

  const toggleMusic = useCallback(async () => {
    if (soundEnabled) {
      await AudioManager.init();
      if (!isMusicEnabled) AudioManager.toggleOn();
      else AudioManager.toggleOff();
    }
    // Update MusicContext state
    setIsMusicEnabled(!isMusicEnabled);
  }, [isMusicEnabled, soundEnabled, setIsMusicEnabled]);

  // Wallet connection is now handled by RainbowKit ConnectButton
  // No need for manual connectWallet function

  const disconnectWallet = useCallback(() => {
    if (soundEnabled) AudioManager.buttonNav();
    disconnect();
    localStorage.removeItem('connectedAddress');
    setNfts([]);
    setSelectedCards([]);
    setFilteredCount(0);
    setStatus("idle");
    setErrorMsg(null);
    setPlayerPower(0);
    setDealerPower(0);
    setResult('');
    setDealerCards([]);
    devLog('🔌 Desconectado');
  }, [soundEnabled, disconnect]);


  // Load unlocked difficulties from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('unlockedDifficulties');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUnlockedDifficulties(new Set(parsed));
      } catch (e) {
        devError('Error loading unlocked difficulties:', e);
      }
    }
  }, []);

  // Save unlocked difficulties to localStorage
  const unlockNextDifficulty = useCallback((currentDifficulty: string) => {
    const difficultyOrder = ['gey', 'goofy', 'gooner', 'gangster', 'gigachad'];
    const currentIndex = difficultyOrder.indexOf(currentDifficulty);

    if (currentIndex < difficultyOrder.length - 1) {
      const nextDifficulty = difficultyOrder[currentIndex + 1];
      setUnlockedDifficulties(prev => {
        const newSet = new Set(prev);
        newSet.add(nextDifficulty);
        localStorage.setItem('unlockedDifficulties', JSON.stringify(Array.from(newSet)));
        return newSet;
      });
      devLog(`Unlocked difficulty: ${nextDifficulty}`);
      return nextDifficulty;
    }
    return null;
  }, []);

  const handleSelectCard = useCallback((card: any) => {
    // Check if card is locked (in raid deck) - VibeFID cards are exempt
    // Use getCardKey for proper collection+tokenId comparison
    const isLockedInRaid = card.collection !== 'vibefid' && defenseLockedTokenIds.has(getCardKey(card));
    if (isLockedInRaid) {
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    setSelectedCards(prev => {
      // Use findCard for proper collection+tokenId comparison
      const isSelected = findCard(prev, card);
      if (isSelected) {
        if (soundEnabled) AudioManager.deselectCard();
        // Use isSameCard for proper collection+tokenId comparison
        return prev.filter(c => !isSameCard(c, card));
      } else if (prev.length < HAND_SIZE) {
        if (soundEnabled) AudioManager.selectCard();
        const newSelection = [...prev, card];

        // Auto-scroll to battle button on mobile when 5 cards selected
        if (newSelection.length === HAND_SIZE) {
          setTimeout(() => {
            const battleButton = document.getElementById('battle-button');
            if (battleButton && window.innerWidth < 768) {
              battleButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        }

        return newSelection;
      }
      return prev;
    });
  }, [soundEnabled, defenseLockedTokenIds]);

  const clearSelection = useCallback(() => {
    setSelectedCards([]);
    if (soundEnabled) AudioManager.deselectCard();
  }, [soundEnabled]);

  const selectStrongest = useCallback(() => {
    // 🚀 Performance: Using pre-sorted memoized NFTs
    setSelectedCards(strongestNfts);
    if (soundEnabled) AudioManager.selectCard();

    // Auto-scroll to battle button on mobile
    setTimeout(() => {
      const battleButton = document.getElementById('battle-button');
      if (battleButton && window.innerWidth < 768) {
        battleButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }, [strongestNfts, soundEnabled]);


  const playHand = useCallback((cardsToPlay?: any[], battleDifficulty?: typeof aiDifficulty) => {
        const cards = cardsToPlay || selectedCards;
    const difficulty = battleDifficulty || aiDifficulty; // Use parameter if provided, otherwise state
    if (cards.length !== HAND_SIZE || isBattling) return;
    setIsBattling(true);
    setShowBattleScreen(true);
    setBattlePhase('cards');
    setBattleOpponentName('Mecha George Floyd'); // Show Mecha George Floyd name
    setBattlePlayerName(userProfile?.username || 'You'); // Show player username
    setBattleOpponentPfp(`/images/mecha-george-floyd.jpg?v=${Date.now()}`); // Mecha George pfp with cache bust
    // Player pfp from Twitter if available (same logic as profile/home)
    setBattlePlayerPfp(getAvatarUrl(userProfile ? { twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl } : null));
    setShowLossPopup(false);
    setShowWinPopup(false);
    setResult('');
    setPlayerPower(0);
    setDealerPower(0);

    if (soundEnabled) AudioManager.playHand();

    // Calculate player power with collection multipliers (VibeFID 5x, VBMS 2x, Nothing 0.5x)
    const playerTotal = calculateTotalPower(cards);
    // Use JC's deck for dealer cards
    const available = jcNfts;

    devLog('🎮 BATTLE DEBUG:');
    devLog('  JC available cards:', available.length);
    devLog('  JC deck loading status:', jcNftsLoading);
    devLog('  AI difficulty:', difficulty);
    if (available.length > 0) {
      // 🚀 Performance: Use pre-sorted memoized array
      devLog('  Top 5 strongest:', sortedJcNfts.slice(0, 5).map(c => ({ tokenId: c.tokenId, power: c.power, rarity: c.rarity })));
      devLog('  Bottom 5 weakest:', sortedJcNfts.slice(-5).map(c => ({ tokenId: c.tokenId, power: c.power, rarity: c.rarity })));
    }

    if (available.length < HAND_SIZE) {
      devLog('! Mecha George Floyd deck not loaded yet - retrying in 2 seconds...');

      // Auto-retry after 2 seconds if deck not loaded
      if (!jcNftsLoading) {
        setTimeout(() => {
          devLog('🔄 Retrying battle after waiting for deck to load...');
          playHand(cards, difficulty); // Fix: pass parameters to preserve selected difficulty
        }, 2000);
      }

      setIsBattling(false);
      setShowBattleScreen(false);
      toast.error('Loading AI deck... Please try again in a moment.');
      return;
    }

    // 🚀 Performance: Use pre-sorted memoized array instead of sorting again
    const sorted = sortedJcNfts;

    devLog('🎲 AI DECK SELECTION DEBUG:');
    devLog('  Available cards:', available.length);
    devLog('  Sorted top 5:', sorted.slice(0, 5).map(c => `#${c.tokenId} (${c.power} PWR)`));
    devLog('  Difficulty:', difficulty);

    const pickedDealer = generateAIHand(sorted, difficulty as any);

    setTimeout(() => {
      // Use orderedOpponentCards if elimination mode, otherwise use pickedDealer
      setDealerCards(battleMode === 'elimination' ? orderedOpponentCards : pickedDealer);
      if (soundEnabled) AudioManager.shuffle();
    }, 1000);

    // Calculate dealer power with collection multipliers
    const dealerTotal = calculateTotalPower(pickedDealer);

    // Check if this is elimination mode
    if (battleMode === 'elimination') {
      // Elimination mode: play round-by-round
      setTimeout(() => {
        // Compare current round's cards
        const playerCard = orderedPlayerCards[currentRound - 1];
        const opponentCard = orderedOpponentCards[currentRound - 1];

        if (!playerCard || !opponentCard) {
          devError('✗ Missing cards for elimination round!');
          return;
        }

        // Apply collection multipliers for display
        setPlayerPower(getCardDisplayPower(playerCard));
        setDealerPower(getCardDisplayPower(opponentCard));

        setBattlePhase('clash');
        if (soundEnabled) AudioManager.cardBattle();
      }, 2500);

      setTimeout(() => {
        const playerCard = orderedPlayerCards[currentRound - 1];
        const opponentCard = orderedOpponentCards[currentRound - 1];
        // Apply collection multipliers for battle comparison
        const playerCardPower = getCardDisplayPower(playerCard);
        const opponentCardPower = getCardDisplayPower(opponentCard);

        setBattlePhase('result');

        let roundResult: 'win' | 'loss' | 'tie';
        let newPlayerScore = eliminationPlayerScore;
        let newOpponentScore = eliminationOpponentScore;

        if (playerCardPower > opponentCardPower) {
          roundResult = 'win';
          newPlayerScore++;
          setResult(t('playerWins'));
        } else if (playerCardPower < opponentCardPower) {
          roundResult = 'loss';
          newOpponentScore++;
          setResult(t('dealerWins'));
        } else {
          roundResult = 'tie';
          setResult(t('tie'));
        }

        setEliminationPlayerScore(newPlayerScore);
        setEliminationOpponentScore(newOpponentScore);
        setRoundResults([...roundResults, roundResult]);

        devLog(`✦ Round ${currentRound} result:`, roundResult, `Score: ${newPlayerScore}-${newOpponentScore}`);

        // Check if match is over
        setTimeout(() => {
          const isMatchOver = currentRound === 5 || newPlayerScore === 3 || newOpponentScore === 3;

          if (isMatchOver) {
            // Determine final winner
            const finalResult: 'win' | 'loss' | 'tie' = newPlayerScore > newOpponentScore ? 'win' : newPlayerScore < newOpponentScore ? 'loss' : 'tie';

            if (finalResult === 'win') {
              setResult(t('playerWins'));
              // Unlock next difficulty
              const unlockedDiff = unlockNextDifficulty(difficulty);
              if (unlockedDiff) {
                devLog(`🔓 Unlocked new difficulty: ${unlockedDiff.toUpperCase()}`);
              }
            } else if (finalResult === 'loss') {
              setResult(t('dealerWins'));
            } else {
              setResult(t('tie'));
            }

            // Award economy coins and record match, then show popup
            (async () => {
              let coinsEarned = 0;

              if (userProfile && address) {
                try {
                  // Calculate and send PvE Elimination reward to inbox
                  const reward = await awardPvECoins({
                    address,
                    difficulty: eliminationDifficulty,
                    language: lang,
                    won: finalResult === 'win',
                    skipCoins: false // Send to inbox
                  });
                  coinsEarned = reward?.awarded || 0;
                  if (coinsEarned > 0) {
                    devLog(`💰 Elimination Mode: Awarded ${coinsEarned} $TESTVBMS`, reward);
                  }

                  // Record match with coins earned
                  await ConvexProfileService.recordMatch(
                    address,
                    'pve',
                    finalResult,
                    newPlayerScore,
                    newOpponentScore,
                    orderedPlayerCards,
                    orderedOpponentCards,
                    undefined,
                    undefined,
                    coinsEarned, // coinsEarned
                    0, // entryFeePaid (PvE is free)
                    eliminationDifficulty // difficulty
                  );

                } catch (err) {
                  devError('✗ Error awarding PvE coins (Elimination):', err);
                }
              }

              // ✅ FIX: Set battle result BEFORE closing battle screen
              // This ensures the popup shows the correct coins earned
              setLastBattleResult({
                result: finalResult,
                playerPower: newPlayerScore,
                opponentPower: newOpponentScore,
                opponentName: 'Mecha George Floyd',
                type: 'pve',
                coinsEarned,
                playerPfpUrl: userProfile?.twitterProfileImageUrl,
                opponentPfpUrl: undefined, // PvE opponent has no PFP
              });

              // TESTVBMS sent to inbox - player can claim later needed
              devLog('[PvE Elimination] coinsEarned:', coinsEarned, 'finalResult:', finalResult);

              // Close battle first
              setTimeout(() => {
                setIsBattling(false);
                setShowBattleScreen(false);
                setBattlePhase('cards');
                setBattleMode('normal');
                setEliminationPhase(null);

                // Show result popup after closing battle
                showBattleResultPopup(finalResult);
              }, 2000);
            })();
          } else {
            // Next round
            setTimeout(() => {
              setCurrentRound(currentRound + 1);
              setBattlePhase('cards');

              // Trigger next round battle sequence
              setTimeout(() => {
                const nextPlayerCard = orderedPlayerCards[currentRound]; // currentRound is still old value here
                const nextOpponentCard = orderedOpponentCards[currentRound];

                // Apply collection multipliers
                setPlayerPower(getCardDisplayPower(nextPlayerCard));
                setDealerPower(getCardDisplayPower(nextOpponentCard));

                setBattlePhase('clash');
                if (soundEnabled) AudioManager.cardBattle();

                setTimeout(() => {
                  setBattlePhase('result');
                }, 1000);
              }, 1000);
            }, 2000);
          }
        }, 2000);
      }, 3500);

      return; // Skip normal battle logic
    }

    // Normal mode battle logic
    setTimeout(() => {
      setBattlePhase('clash');
      if (soundEnabled) AudioManager.cardBattle();
    }, 2500);

    setTimeout(() => {
      setPlayerPower(playerTotal);
      setDealerPower(dealerTotal);
      setBattlePhase('result');
    }, 3500);

    setTimeout(() => {
      devLog('🎮 RESULTADO:', { playerTotal, dealerTotal });

      let matchResult: 'win' | 'loss' | 'tie';

      if (playerTotal > dealerTotal) {
        devLog('✓ JOGADOR VENCEU!');
        matchResult = 'win';
        setResult(t('playerWins'));

        // Unlock next difficulty on win
        const unlockedDiff = unlockNextDifficulty(difficulty);
        if (unlockedDiff) {
          devLog(`🔓 Unlocked new difficulty: ${unlockedDiff.toUpperCase()}`);
        }
      } else if (playerTotal < dealerTotal) {
        devLog('✗ DEALER VENCEU!');
        matchResult = 'loss';
        setResult(t('dealerWins'));
      } else {
        devLog('TIE!');
        matchResult = 'tie';
        setResult(t('tie'));
      }

      // Award economy coins and record PvE match, then show popup
      (async () => {
        let coinsEarned = 0;

        if (userProfile && address) {
          try {
            // Calculate and send PvE reward to inbox
            devLog(`🎯 PvE Difficulty: ${aiDifficulty}`); // Debug log
            const reward = await awardPvECoins({
              address,
              difficulty: aiDifficulty,
              language: lang,
              won: matchResult === 'win',
              skipCoins: false // Send to inbox
            });
            coinsEarned = reward?.awarded || 0;
            if (coinsEarned > 0) {
              devLog(`💰 PvE ${aiDifficulty}: Awarded ${coinsEarned} $TESTVBMS`, reward);
            }

            // Record match with coins earned
            await ConvexProfileService.recordMatch(
              address,
              'pve',
              matchResult,
              playerTotal,
              dealerTotal,
              cards,
              pickedDealer,
              undefined,
              undefined,
              coinsEarned, // coinsEarned
              0, // entryFeePaid (PvE is free)
              aiDifficulty // difficulty
            );

            // Reload match history
          } catch (err) {
            devError('✗ Error awarding PvE coins:', err);
          }
        }

        // ✅ FIX: Set battle result BEFORE closing battle screen
        // This ensures the popup shows the correct coins earned
        setLastBattleResult({
          result: matchResult,
          playerPower: playerTotal,
          opponentPower: dealerTotal,
          opponentName: 'Mecha George Floyd',
          type: 'pve',
          coinsEarned,
          playerPfpUrl: userProfile?.twitterProfileImageUrl,
          opponentPfpUrl: undefined, // PvE opponent has no PFP
        });

        // TESTVBMS sent to inbox - player can claim later

        // Fecha a tela de batalha PRIMEIRO
        setTimeout(() => {
          setIsBattling(false);
          setShowBattleScreen(false);
          setBattlePhase('cards');

          // Mostra popup DEPOIS de fechar batalha
          showBattleResultPopup(matchResult);
        }, 2000);
      })();
    }, 4500);
  }, [selectedCards, nfts, t, soundEnabled, isBattling, aiDifficulty, address, userProfile]);

  const { saveDefenseDeck } = useSaveDefenseDeck({
    address,
    userProfile,
    selectedCards,
    soundEnabled,
    setDefenseDeckSaveStatus,
    setShowDefenseDeckSaved,
    refreshProfile,
  });

  const totalPower = useMemo(() =>
    selectedCards.reduce((sum, c) => sum + (c.power || 0), 0),
    [selectedCards]
  );

  // 🚀 Performance: Filter by card type (FREE/NFT), collection, and sort
  const filteredAndSortedNfts = useMemo(() => {
    let filtered = nfts;

    // Apply type filter
    if (cardTypeFilter === 'free') {
      filtered = nfts.filter(card => card.badgeType === 'FREE_CARD');
    } else if (cardTypeFilter === 'nft') {
      filtered = nfts.filter(card => card.badgeType !== 'FREE_CARD');
    }

    // Apply collection filter (if any collections are selected)
    if (selectedCollections.length > 0) {
      filtered = filterCardsByCollections(filtered, selectedCollections);
    }

    // 🔒 Filter out cards that are in raid deck (except VibeFID which can be in both)
    // Use getCardKey for proper collection:tokenId comparison
    filtered = filtered.filter(card =>
      card.collection === 'vibefid' || !defenseLockedTokenIds.has(getCardKey(card))
    );

    // Apply sort with collection multipliers (VibeFID 5x, VBMS 2x, Nothing 0.5x)
    // ALWAYS sort Nothing cards last to avoid confusion
    if (!sortByPower) {
      // Default sort: Nothing last, then by power descending
      return [...filtered].sort((a, b) => {
        // Nothing cards always go last
        if (a.collection === 'nothing' && b.collection !== 'nothing') return 1;
        if (b.collection === 'nothing' && a.collection !== 'nothing') return -1;
        // Otherwise sort by power descending
        return (b.power || 0) - (a.power || 0);
      });
    }
    return [...filtered].sort((a, b) => getCardDisplayPower(b) - getCardDisplayPower(a));
  }, [nfts, sortByPower, cardTypeFilter, selectedCollections, defenseLockedTokenIds]);

  const totalPages = Math.ceil(filteredAndSortedNfts.length / CARDS_PER_PAGE);

  const displayNfts = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    const end = start + CARDS_PER_PAGE;
    return filteredAndSortedNfts.slice(start, end);
  }, [filteredAndSortedNfts, currentPage, CARDS_PER_PAGE]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortByPower, cardTypeFilter, nfts.length, CARDS_PER_PAGE]);

  // 🔒 Sorted NFTs for attack modal (show locked cards but mark them)
  // Uses collection multipliers for accurate power sorting
  const sortedAttackNfts = useMemo(() => {
    if (!sortAttackByPower) return nfts;
    return [...nfts].sort((a, b) => getCardDisplayPower(b) - getCardDisplayPower(a));
  }, [nfts, sortAttackByPower]);

  // 🚀 BANDWIDTH FIX: Helper to check if card is locked
  // Uses lockedTokenIds from profileDashboard (attack and pvp have same locked cards)
  // VibeFID cards are exempt (can be used anywhere)
  const isCardLocked = (card: { tokenId: string; collection?: string }, _mode: 'attack' | 'pvp') => {
    // VibeFID cards are never locked - they can be used in attack even if in defense deck
    if (card?.collection === 'vibefid') return false;

    // Use getCardKey for proper collection+tokenId comparison
    const cardKey = getCardKey(card);
    return lockedTokenIds.includes(cardKey);
  };

  // Sorted NFTs for PvE modal (PvE allows defense cards - NO lock)
  // Uses collection multipliers for accurate power sorting
  const sortedPveNfts = useMemo(() => {
    const cardsCopy = [...nfts];
    if (pveSortByPower) {
      cardsCopy.sort((a, b) => getCardDisplayPower(b) - getCardDisplayPower(a));
    }
    return cardsCopy;
  }, [nfts, pveSortByPower]);

  // Convex Room Listener - Escuta mudanças na sala em tempo real
  useEffect(() => {
    if (pvpMode === 'inRoom' && roomCode) {
      // Reset battle flag when entering a new room to prevent stale state from previous battles
      pvpBattleStarted.current = false;
      pvpProcessedBattles.current.clear(); // Clear processed battles set for new room
      devLog('🔄 Reset pvpBattleStarted to false for new room');
      devLog('🎧 Convex listener started for room:', roomCode);

      let hasSeenRoom = false; // Flag para rastrear se já vimos a sala pelo menos uma vez
      let battleProcessing = false; // Local flag to prevent concurrent battle starts within same listener

      const unsubscribe = ConvexPvPService.watchRoom(roomCode, async (room) => {
        if (room) {
          hasSeenRoom = true; // Marca que vimos a sala
          // Check if players are ready (Convex: ready = has cards)
          const hostReady = !!room.hostCards && room.hostCards.length > 0;
          const guestReady = !!room.guestCards && room.guestCards.length > 0;

          devLog('🔄 Room update received:', {
            hostReady,
            guestReady,
            roomStatus: room.status,
            pvpBattleStarted: pvpBattleStarted.current,
            battleProcessing
          });
          setCurrentRoom(room);

          // Se ambos os jogadores estiverem prontos, inicia a batalha
          // Só inicia quando status é 'playing' (após ambos submeterem cartas)
          if (hostReady && guestReady && room.status === 'playing') {
            // Create unique battle ID to prevent duplicate processing
            const battleId = `${room.roomId}_${room.hostPower}_${room.guestPower}_${room.startedAt || Date.now()}`;

            // Check if this battle has already been processed
            if (pvpProcessedBattles.current.has(battleId)) {
              devLog('! Battle already processed, skipping:', battleId);
              return; // Skip if already processed
            }

            // Mark this battle as processed IMMEDIATELY (before any async operations)
            pvpProcessedBattles.current.add(battleId);
            pvpBattleStarted.current = true;
            battleProcessing = true;
            devLog('✓ Ambos jogadores prontos! Iniciando batalha única:', battleId);

            // Use pre-paid entry fee only for ranked matches (casual is free)
            const isRanked = room.mode === 'ranked' || room.mode === undefined; // Default to ranked for legacy rooms
            if (isRanked) {
              try {
                const feeResult = await useEntryFee({ address: address || '' });
                if (feeResult.success) {
                  devLog(`✅ PvP entry fee used: ${feeResult.amount} VBMS`);
                } else {
                  throw new Error('No valid entry fee found');
                }
              } catch (error: any) {
                devError('❌ Failed to use entry fee:', error);
                toast.error(`No valid entry fee! Please pay 20 VBMS entry fee first.`);
                return; // Stop battle if can't use entry fee
              }
            } else {
              devLog('🎮 Casual match - free entry');
            }

            // Determina quem é o jogador local e quem é o oponente
            const isHost = room.hostAddress === address?.toLowerCase();
            const playerCards = isHost ? (room.hostCards || []) : (room.guestCards || []);
            const opponentCards = isHost ? (room.guestCards || []) : (room.hostCards || []);
            const playerPower = isHost ? (room.hostPower || 0) : (room.guestPower || 0);
            const opponentPower = isHost ? (room.guestPower || 0) : (room.hostPower || 0);
            const opponentAddress = isHost ? room.guestAddress : room.hostAddress;
            const opponentName = isHost ? (room.guestUsername || 'Guest') : (room.hostUsername || 'Host');
            const playerName = isHost ? (room.hostUsername || 'You') : (room.guestUsername || 'You');

            // Busca perfil do oponente para pegar Twitter
            // 🚀 BANDWIDTH FIX: Use lite profile (only need twitter fields)
            let opponentTwitter = undefined;
            let opponentPfpUrl = undefined;
            if (opponentAddress) {
              try {
                const opponentProfile = await ConvexProfileService.getProfileLite(opponentAddress);
                opponentTwitter = opponentProfile?.twitter;
                opponentPfpUrl = opponentProfile?.twitterProfileImageUrl;
                devLog('Opponent profile loaded:', opponentProfile?.username, 'twitter:', opponentTwitter);
              } catch (e) {
                devLog('Failed to load opponent profile:', e);
              }
            }

            // Executa a batalha PvP com animações (igual PVE)
            setIsBattling(true);
            setShowBattleScreen(true);
            setBattlePhase('cards');
            setBattleOpponentName(opponentName); // Show PvP opponent username
            setBattlePlayerName(playerName); // Show player username
            // Opponent pfp from Twitter if available
            setBattleOpponentPfp(getAvatarUrl(opponentTwitter));
            // Player pfp from Twitter if available
            setBattlePlayerPfp(getAvatarUrl(userProfile ? { twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl } : null));
            setShowLossPopup(false);
            setShowWinPopup(false);
            setResult('');
            setPlayerPower(0);
            setDealerPower(0);

            if (soundEnabled) AudioManager.playHand();

            // Mostra cartas do oponente (como "dealer")
            setTimeout(() => {
              setDealerCards(opponentCards);
              if (soundEnabled) AudioManager.shuffle();
            }, 1000);

            // Fase de clash - cartas batem
            setTimeout(() => {
              setBattlePhase('clash');
              if (soundEnabled) AudioManager.cardBattle();
            }, 2500);

            // Mostra poderes
            setTimeout(() => {
              setPlayerPower(playerPower);
              setDealerPower(opponentPower);
              setBattlePhase('result');
            }, 3500);

            // Mostra resultado final
            setTimeout(() => {
              const playerWins = playerPower > opponentPower;
              const isDraw = playerPower === opponentPower;

              let matchResult: 'win' | 'loss' | 'tie';

              if (playerWins) {
                matchResult = 'win';
                setResult(t('playerWins'));
              } else if (isDraw) {
                matchResult = 'tie';
                setResult(t('tie'));
              } else {
                matchResult = 'loss';
                setResult(t('dealerWins'));
              }

              // Award economy coins and record PvP match, then show popup
              (async () => {
                let coinsEarned = 0;

                if (userProfile && address) {
                  try {
                    // ✅ Award TESTVBMS to inbox for ranked PvP winners
                    if (isRanked && matchResult === 'win') {
                      // Ranked PvP Winner: Send TESTVBMS to inbox
                      const TESTVBMS_REWARD = 40; // 40 TESTVBMS reward for winning
                      const reward = await claimPvPWinReward({ address, roomCode: roomCode || undefined });

                      if (reward?.success) {
                        coinsEarned = TESTVBMS_REWARD;
                        devLog(`🏆 PvP Win: ${TESTVBMS_REWARD} TESTVBMS sent to inbox`);
                        toast.success(`Victory! ${TESTVBMS_REWARD} TESTVBMS sent to your inbox!`);
                      }
                    } else if (isRanked && matchResult !== 'win') {
                      // Ranked PvP Loser/Tie: No reward (VBMS stays in pool)
                      devLog(`💸 PvP ${matchResult}: VBMS entry fee stays in pool`);
                    } else {
                      devLog('🎮 Casual match - no coins awarded');
                    }

                    // Record match with coins earned and entry fee paid
                    await ConvexProfileService.recordMatch(
                      address,
                      'pvp',
                      matchResult,
                      playerPower,
                      opponentPower,
                      playerCards,
                      opponentCards,
                      opponentAddress,
                      opponentName,
                      coinsEarned, // coinsEarned (0 for casual)
                      isRanked ? 20 : 0 // entryFeePaid (20 for ranked, 0 for casual)
                    );

  
                    // 🔔 Send notification to defender (opponent)
                    fetch('/api/notifications/send', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'defense_attacked',
                        data: {
                          defenderAddress: opponentAddress,
                          defenderUsername: opponentName || 'Unknown',
                          attackerUsername: userProfile.username || 'Unknown',
                          result: matchResult === 'win' ? 'lose' : 'win', // Inverted: attacker wins = defender loses
                          coinsChange: coinsEarned, // Attacker's coin change (positive = won coins, negative = lost coins)
                        },
                      }),
                    }).catch(err => devError('Error sending notification:', err));
                  } catch (err) {
                    devError('✗ Error awarding PvP coins:', err);
                  }
                }

                // Fecha a tela de batalha PRIMEIRO
                setTimeout(() => {
                  setIsBattling(false);
                  setShowBattleScreen(false);
                  setBattlePhase('cards');

                  // Set last battle result for sharing
                  setLastBattleResult({
                    result: matchResult,
                    playerPower: playerPower,
                    opponentPower: opponentPower,
                    opponentName: opponentName,
                    opponentTwitter: opponentTwitter,
                    type: 'pvp',
                    coinsEarned,
                    playerPfpUrl: userProfile?.twitterProfileImageUrl,
                    opponentPfpUrl: opponentPfpUrl,
                  });

                  // TESTVBMS sent to inbox - player can claim later

                  // Mostra popup DEPOIS de fechar batalha
                  showBattleResultPopup(matchResult);

                  // Reset battle flag immediately so player can start new match without waiting
                  pvpBattleStarted.current = false;
                  battleProcessing = false; // Also reset local flag
                  devLog('🔄 Battle ended, reset pvpBattleStarted immediately');
                  // Fecha a sala PVP e volta ao menu após ver o resultado
                  setTimeout(async () => {
                    // Deleta a sala do Convex se for o host
                    if (currentRoom && roomCode && address && address.toLowerCase() === currentRoom.hostAddress) {
                      try {
                        await ConvexPvPService.leaveRoom(roomCode, address);
                        devLog('✓ Room deleted after battle ended');
                      } catch (err) {
                        devError('✗ Error deleting room:', err);
                      }
                    }

                    setPvpMode(null);
                    setGameMode(null);
                    setRoomCode('');
                    setCurrentRoom(null);
                    setSelectedCards([]);
                    setDealerCards([]); // Clear dealer cards
                    pvpBattleStarted.current = false; // Reset battle flag
                  }, 5000);
                }, 2000);
              })();
            }, 3500);
          }
        } else {
          // Sala não existe - só volta ao menu se já vimos a sala antes (foi deletada)
          // Se nunca vimos, pode estar sendo criada ainda (race condition)
          if (hasSeenRoom) {
            devLog('! Sala foi deletada, voltando ao menu');
            setPvpMode('pvpMenu');
            setRoomCode('');
            setCurrentRoom(null);
          } else {
            devLog('Aguardando sala ser criada...');
          }
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [pvpMode, roomCode, address, soundEnabled]);

  // Auto Match Listener - Detecta quando uma sala é criada para o jogador
  useEffect(() => {
    if (pvpMode === 'autoMatch' && isSearching && address) {
      devLog('🔍 Starting matchmaking listener for:', address);

      const unsubscribe = ConvexPvPService.watchMatchmaking(address, (roomCode) => {
        if (roomCode) {
          devLog('✓ Match found! Room:', roomCode);
          setRoomCode(roomCode);
          setPvpMode('inRoom');
          setIsSearching(false);
        } else {
          devLog('! Matchmaking cancelled or failed');
          setIsSearching(false);
          setPvpMode('pvpMenu');
        }
      });

      // ConvexPvPService já cuida do polling internamente, não precisa de heartbeat manual
      return () => {
        devLog('🛑 Stopping matchmaking listener');
        unsubscribe();
      };
    }
  }, [pvpMode, isSearching, address]);

  // Mission management (load, claim, claimAll) handled by useMissionsManager hook
  const { loadMissions, claimMission, claimAllMissions } = useMissionsManager({
    address,
    soundEnabled,
    lang,
    effectiveChain,
    userProfile,
    setMissions,
    setIsLoadingMissions,
    setIsClaimingMission,
    setIsClaimingAll,
    setShowDailyClaimPopup,
    refreshProfile,
  });

  // Load missions when address/profile becomes available
  useEffect(() => {
    if (address && profileDashboard) {
      loadMissions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, profileDashboard?._id]);

  // Auto scroll to play buttons when 5 cards are selected
  useEffect(() => {
    if (selectedCards.length === 5 && playButtonsRef.current) {
      setTimeout(() => {
        playButtonsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [selectedCards.length]);

  useProfileStatsSync({
    address,
    userProfile,
    nfts,
    openedCardsCount,
    unopenedCardsCount,
    totalNftPower,
    nftTokenIds,
    setUserProfile,
  });

  // Cleanup old rooms and matchmaking entries periodically
  useEffect(() => {
    // Run cleanup immediately on mount
    ConvexPvPService.cleanupOldRooms().catch(err => devError('Cleanup error:', err));

    // Run cleanup every 2 minutes
    const cleanupInterval = setInterval(() => {
      ConvexPvPService.cleanupOldRooms().catch(err => devError('Cleanup error:', err));
    }, 2 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Calculate attacks remaining based on UTC date
  useEffect(() => {
    if (!userProfile || !address) {
      setAttacksRemaining(0);
      return;
    }

    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    const lastAttackDate = userProfile.lastAttackDate || '';
    const attacksToday = userProfile.attacksToday || 0;

    if (lastAttackDate === todayUTC) {
      // Same day, use existing count
      setAttacksRemaining(Math.max(0, maxAttacks - attacksToday));
    } else {
      // New day detected - just set attacks to max locally
      // Let the backend handle the reset when user makes next attack
      devLog('🆕 New day detected! Attacks reset to max.');
      setAttacksRemaining(maxAttacks);
    }
  }, [userProfile?.lastAttackDate, userProfile?.attacksToday, maxAttacks, address]);


  // Clean conflicting cards from defense deck on initial load
  // (cards that are now in raid deck should be removed from defense)
  // 🚀 BANDWIDTH FIX: Only run once per session using sessionStorage
  useEffect(() => {
    if (!address || defenseLockedTokenIds.size === 0) return;

    // Throttle to once per session using sessionStorage
    const sessionKey = `vbms_clean_defense_${address.toLowerCase()}`;
    if (sessionStorage.getItem(sessionKey)) return;

    sessionStorage.setItem(sessionKey, '1');
    cleanConflictingDefense({ address }).catch(err => {
      devError('Error cleaning conflicting defense cards:', err);
    });
  }, [address, defenseLockedTokenIds.size, cleanConflictingDefense]);

  // Load defenses received (attacks from other players)
  useEffect(() => {
    if (!address || !userProfile) {
      setDefensesReceived([]);
      setUnreadDefenses(0);
      return;
    }

    // Fetch match history filtering only defenses
    ConvexProfileService.getMatchHistory(address, 20).then((history) => {
      const defenses = history.filter(match => match.type === 'defense');
      setDefensesReceived(defenses);

      // Check localStorage for last seen timestamp
      const lastSeenKey = `defenses_last_seen_${address.toLowerCase()}`;
      const lastSeen = parseInt(localStorage.getItem(lastSeenKey) || '0');

      // Count unread defenses (newer than last seen)
      const unread = defenses.filter(d => d.timestamp > lastSeen).length;
      setUnreadDefenses(unread);
    });
  }, [address, userProfile]);

  // Close all modals when view changes (fix for modals persisting across views)
  useEffect(() => {
    setShowPvPEntryFeeModal(false);
    setShowBattleScreen(false);
    setShowPveCardSelection(false);
    setShowAttackCardSelection(false);
    setShowPvPPreview(false);
    setShowSettings(false);
  }, [currentView]);

  // 🚫 Block banned exploiters from accessing the game
  if (banCheck?.isBanned) {
    return (
      <BannedScreen
        username={banCheck.username || "Unknown"}
        amountStolen={banCheck.amountStolen || 0}
        reason={banCheck.reason || "You have been permanently banned."}
      />
    );
  }

  return (
    <div id="app-root" className="min-h-screen game-background text-vintage-ice p-4 lg:p-6 overflow-x-hidden relative">
      {/* 🔒 Session Lock Modal - blocks everything when another device takes over */}
      {isSessionLocked && (
        <SessionLockedModal
          reason={lockReason}
          onReconnect={forceReconnect}
        />
      )}

      {/* Card Loading Screen removed - wasn't working properly */}


      {/* Content wrapper with z-index */}
      <div className={`relative z-10 w-full ${!isInFarcaster ? 'max-w-7xl mx-auto' : ''}`}>
      {/* Game Popups (Victory, Loss, Tie, Error, Success, Daily Claim, Welcome Pack) */}
      <GamePopups
        showWinPopup={showWinPopup}
        currentVictoryImage={currentVictoryImage}
        isInFarcaster={isInFarcaster}
        lastBattleResult={lastBattleResult}
        userProfile={userProfile}
        soundEnabled={soundEnabled}
        handleCloseVictoryScreen={handleCloseVictoryScreen}
        sharesRemaining={sharesRemaining}
        onShareClick={handleShareClick}
        showLossPopup={showLossPopup}
        handleCloseDefeatScreen={handleCloseDefeatScreen}
        showTiePopup={showTiePopup}
        setShowTiePopup={setShowTiePopup}
        tieGifLoaded={tieGifLoaded}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        successMessage={successMessage}
        setSuccessMessage={setSuccessMessage}
        showDailyClaimPopup={showDailyClaimPopup}
        setShowDailyClaimPopup={setShowDailyClaimPopup}
        loginBonusClaimed={loginBonusClaimed}
        isClaimingBonus={isClaimingBonus}
        handleClaimLoginBonus={handleClaimLoginBonus}
        onDailyClaimNow={handleDailyClaimNow}
        effectiveChain={effectiveChain}
        showWeeklyLeaderboardPopup={showWeeklyLeaderboardPopup}
        setShowWeeklyLeaderboardPopup={setShowWeeklyLeaderboardPopup}
        weeklyLeaderboardRank={weeklyRewardEligibility?.rank ?? undefined}
        weeklyLeaderboardReward={weeklyRewardEligibility?.reward ?? undefined}
        isClaimingWeeklyReward={isClaimingWeeklyReward}
        onWeeklyLeaderboardClaimNow={handleClaimWeeklyLeaderboardReward}
        t={t}
      />


      {/* Defense Deck Modal */}
      <DefenseDeckModal
        isOpen={showDefenseDeckModal}
        onClose={() => setShowDefenseDeckModal(false)}
        nfts={nfts}
        status={status}
        selectedCards={selectedCards}
        setSelectedCards={setSelectedCards}
        handSize={HAND_SIZE}
        defenseDeckCollection={defenseDeckCollection}
        setDefenseDeckCollection={setDefenseDeckCollection}
        defenseDeckSortByPower={defenseDeckSortByPower}
        setDefenseDeckSortByPower={setDefenseDeckSortByPower}
        soundEnabled={soundEnabled}
        selectStrongest={selectStrongest}
        clearSelection={clearSelection}
        saveDefenseDeck={saveDefenseDeck}
        t={t}
      />

      {/* My Cards Modal (for miniapp) */}
      <MyCardsModal
        isOpen={showMyCardsModal}
        onClose={() => setShowMyCardsModal(false)}
        nfts={nfts}
        soundEnabled={soundEnabled}
      />

      {/* Leaderboard Rewards Modal */}
      <LeaderboardRewardsModal
        isOpen={showLeaderboardRewardsModal}
        onClose={() => setShowLeaderboardRewardsModal(false)}
      />

      {/* PvP Entry Fee Modal */}
      <PvPEntryFeeModal
        isOpen={showPvPEntryFeeModal}
        onClose={() => setShowPvPEntryFeeModal(false)}
        onSuccess={() => {
          setShowPvPEntryFeeModal(false);
          setPvpMode('pvpMenu'); // Reopen PvP menu after payment
        }}
        entryFeeAmount={20}
        playerAddress={address}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        t={t}
        musicEnabled={isMusicEnabled}
        toggleMusic={toggleMusic}
        musicVolume={musicVolume}
        setMusicVolume={setMusicVolume}
        lang={lang}
        setLang={setLang}
        soundEnabled={soundEnabled}
        musicMode={musicMode}
        setMusicMode={setMusicMode}
        userProfile={userProfile}
        showChangeUsername={showChangeUsername}
        setShowChangeUsername={setShowChangeUsername}
        newUsername={newUsername}
        setNewUsername={setNewUsername}
        isChangingUsername={isChangingUsername}
        setIsChangingUsername={setIsChangingUsername}
        address={address}
        setUserProfile={setUserProfile}
        setErrorMessage={setErrorMessage}
        customMusicUrl={customMusicUrl || ''}
        setCustomMusicUrl={setCustomMusicUrl}
        isCustomMusicLoading={isCustomMusicLoading}
        customMusicError={customMusicError}
        playlist={playlist}
        setPlaylist={setPlaylist}
        addToPlaylist={addToPlaylist}
        removeFromPlaylist={removeFromPlaylist}
        currentPlaylistIndex={currentPlaylistIndex}
        skipToNext={skipToNext}
        skipToPrevious={skipToPrevious}
        currentTrackName={currentTrackName}
        currentTrackThumbnail={currentTrackThumbnail}
        isPaused={isPaused}
        pause={pause}
        play={play}
        disconnectWallet={disconnectWallet}
        preferredChain={effectiveChain}
        canChangeChain={arbSupported}
        onChainChange={async (chain: string) => {
          if (!address) return;
          if (chain === effectiveChain) return;
          try {
            await setPreferredChainMutation({ address, chain });
            // Refresh profile
            const updated = await ConvexProfileService.getProfile(address);
            setUserProfile(updated);
          } catch (e) {
            devError("Failed to set chain:", e);
          }
        }}
        onChangelogClick={() => setShowChangelog(true)}
        onReportClick={() => setShowReport(true)}
        isInFarcaster={isInFarcaster}
      />

      {/* Changelog Modal — hide when daily claim popup is open to avoid two modals stacking */}
      <ChangelogModal
        isOpen={showChangelog && !showDailyClaimPopup}
        onClose={() => setShowChangelog(false)}
        t={t}
        onReportBug={() => setShowReport(true)}
      />

      {/* Bug Report Modal */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        t={t}
        address={address}
        fid={farcasterFidState ?? null}
        currentView={currentView}
        username={userProfile?.username ?? null}
        farcasterDisplayName={userProfile?.farcasterDisplayName ?? null}
      />

      {/* Mecha Arena Modal */}
      <CpuArenaModal
        isInFarcaster={isInFarcaster}
        isOpen={showCpuArena}
        onClose={() => setShowCpuArena(false)}
        address={address || ''}
        soundEnabled={soundEnabled}
        t={t}
      />

      {/* Baccarat Casino Modal */}
      <BaccaratModal
        isOpen={showBaccarat}
        onClose={() => setShowBaccarat(false)}
        address={address || ''}
        username={userProfile?.username || 'Player'}
        soundEnabled={soundEnabled}
        t={t}
      />

      {/* Daily Roulette Modal */}
      {showRoulette && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <Roulette onClose={() => setShowRoulette(false)} />
        </div>
      )}

      {/* VibeFID + Mail Split Modal */}
      {showFidMailModal && (fidModalTarget || userFidForVibemail) && (
        <VibeFidMailModal
          fid={(fidModalTarget || userFidForVibemail)!}
          username={fidModalTarget && fidModalTarget !== userFidForVibemail ? undefined : userProfile?.username}
          ownerFid={userFidForVibemail}
          onClose={() => { setShowFidMailModal(false); setFidModalTarget(null); }}
        />
      )}

      {/* Game Mode Selection - Now handled directly by GameGrid */}

      {/* Elimination Mode - Card Ordering Screen */}
      <EliminationOrderingModal
        isOpen={eliminationPhase === 'ordering'}
        orderedPlayerCards={orderedPlayerCards}
        setOrderedPlayerCards={setOrderedPlayerCards}
        soundEnabled={soundEnabled}
        onStartBattle={() => {
          // Generate AI card order based on difficulty
          const aiCards = generateAIHand(jcNfts, eliminationDifficulty);
          setOrderedOpponentCards(aiCards);

          // Start elimination battle
          setEliminationPhase('battle');
          setCurrentRound(1);
          setRoundResults([]);
          setEliminationPlayerScore(0);
          setEliminationOpponentScore(0);
          setShowBattleScreen(true);
        }}
        onCancel={() => {
          setEliminationPhase(null);
          setBattleMode('normal');
          setShowPveCardSelection(true);
        }}
      />

      <BattleArena
        isOpen={showBattleScreen}
        battleMode={battleMode}
        battlePhase={battlePhase}
        playerCards={selectedCards}
        opponentCards={dealerCards}
        playerPower={playerPower}
        opponentPower={dealerPower}
        player={{
          name: battlePlayerName,
          pfp: battlePlayerPfp,
          fallbackInitials: battlePlayerName?.substring(0, 2).toUpperCase() || '??',
        }}
        opponent={{
          name: battleOpponentName,
          pfp: battleOpponentPfp,
          fallbackInitials: battleOpponentName?.substring(0, 2).toUpperCase() || '??',
        }}
        result={result}
        winLabel={t('playerWins')}
        loseLabel={t('dealerWins')}
        currentRound={currentRound}
        roundResults={roundResults}
        eliminationPlayerScore={eliminationPlayerScore}
        eliminationOpponentScore={eliminationOpponentScore}
        orderedPlayerCards={orderedPlayerCards}
        orderedOpponentCards={orderedOpponentCards}
        battleTitle={t('battle')}
        onOpponentPfpError={() => setBattleOpponentPfp(null)}
      />

      {/* PvE Card Selection Modal */}
      <PveCardSelectionModal
        isOpen={showPveCardSelection}
        onClose={() => setShowPveCardSelection(false)}
        isDifficultyModalOpen={isDifficultyModalOpen}
        t={t}
        handSize={HAND_SIZE}
        pveSelectedCards={pveSelectedCards}
        setPveSelectedCards={setPveSelectedCards}
        sortedPveNfts={sortedPveNfts}
        pveSortByPower={pveSortByPower}
        setPveSortByPower={setPveSortByPower}
        soundEnabled={soundEnabled}
        jcNfts={jcNfts}
        setIsDifficultyModalOpen={setIsDifficultyModalOpen}
        pveSelectedCardsPower={pveSelectedCardsPower}
        loadingStatus={status}
      />

      {/* ✅ PvP Preview Modal - Shows potential gains/losses before battle */}
      <PvPPreviewModal
        showPvPPreview={showPvPPreview}
        pvpPreviewData={pvpPreviewData}
        targetPlayer={targetPlayer}
        isAttacking={isAttacking}
        vbmsBlockchainBalance={vbmsBlockchainBalance}
        soundEnabled={soundEnabled}
        onConfirmAttack={handleConfirmAttack}
        onCancel={() => { setShowPvPPreview(false); if (soundEnabled) AudioManager.buttonClick(); }}
      />

      {/* Attack Card Selection Modal */}
      <AttackCardSelectionModal
        showAttackCardSelection={showAttackCardSelection}
        targetPlayer={targetPlayer}
        attackSelectedCards={attackSelectedCards}
        attackSelectedCardsPower={attackSelectedCardsPower}
        sortAttackByPower={sortAttackByPower}
        sortedAttackNfts={sortedAttackNfts}
        isAttacking={isAttacking}
        isLoadingPreview={isLoadingPreview}
        HAND_SIZE={HAND_SIZE}
        soundEnabled={soundEnabled}
        address={address}
        userProfile={userProfile}
        lang={lang}
        setShowAttackCardSelection={setShowAttackCardSelection}
        setSortAttackByPower={setSortAttackByPower}
        setAttackSelectedCards={setAttackSelectedCards}
        setIsAttacking={setIsAttacking}
        setTargetPlayer={setTargetPlayer}
        setIsLoadingPreview={setIsLoadingPreview}
        setPvpPreviewData={setPvpPreviewData}
        setShowPvPPreview={setShowPvPPreview}
        setErrorMessage={setErrorMessage}
        setSelectedCards={setSelectedCards}
        setDealerCards={setDealerCards}
        setBattleOpponentName={setBattleOpponentName}
        setBattlePlayerName={setBattlePlayerName}
        setBattleOpponentPfp={setBattleOpponentPfp}
        setBattlePlayerPfp={setBattlePlayerPfp}
        setIsBattling={setIsBattling}
        setShowBattleScreen={setShowBattleScreen}
        setBattlePhase={setBattlePhase}
        setGameMode={setGameMode}
        setPlayerPower={setPlayerPower}
        setDealerPower={setDealerPower}
        setUserProfile={setUserProfile}
        setAttacksRemaining={setAttacksRemaining}
        setLastBattleResult={setLastBattleResult}
        showVictory={showVictory}
        setShowLossPopup={setShowLossPopup}
        setShowTiePopup={setShowTiePopup}
        isCardLocked={isCardLocked}
        payEntryFee={payEntryFee}
        recordAttackResult={recordAttackResult}
        getAvatarUrl={getAvatarUrl}
        maxAttacks={maxAttacks}
        convex={convex}
        api={api}
      />

      {/* PvP Menu Modals (Game mode selection, PvP menu, Create/Join room, Auto-match) */}
      <PvPMenuModals
        pvpMode={pvpMode}
        roomCode={roomCode}
        isSearching={isSearching}
        selectedRoomMode={selectedRoomMode}
        aiDifficulty={aiDifficulty}
        unlockedDifficulties={unlockedDifficulties}
        playerEconomy={playerEconomy}
        userProfile={userProfile}
        address={address}
        soundEnabled={soundEnabled}
        setPvpMode={setPvpMode}
        setRoomCode={setRoomCode}
        setIsSearching={setIsSearching}
        setSelectedRoomMode={setSelectedRoomMode}
        setGameMode={setGameMode}
        setShowPveCardSelection={setShowPveCardSelection}
        setPveSelectedCards={setPveSelectedCards}
        setErrorMessage={setErrorMessage}
        setIsDifficultyModalOpen={setIsDifficultyModalOpen}
        setShowEntryFeeModal={setShowPvPEntryFeeModal}
        t={t}
      />

      {/* PvP In Room Modal (waiting for opponent & card selection) */}
      <PvPInRoomModal
        pvpMode={pvpMode}
        roomCode={roomCode}
        currentRoom={currentRoom}
        address={address}
        soundEnabled={soundEnabled}
        nfts={nfts}
        selectedCards={selectedCards}
        isConfirmingCards={isConfirmingCards}
        setPvpMode={setPvpMode}
        setRoomCode={setRoomCode}
        setCurrentRoom={setCurrentRoom}
        setSelectedCards={setSelectedCards}
        setIsConfirmingCards={setIsConfirmingCards}
        isCardLocked={isCardLocked}
        t={t}
      />

      <header className={`tour-header flex flex-col items-center ${isInFarcaster ? '' : 'gap-3 md:gap-6 mb-4 md:mb-8 p-3 md:p-6 bg-vintage-charcoal/80 border border-vintage-gold/30 rounded-lg'}`}>
        {!isInFarcaster && (
          <div className="text-center relative">
            <div className="absolute inset-0 blur-3xl opacity-30 bg-vintage-gold rounded-full" style={{boxShadow: '0 0 80px rgba(255, 215, 0, 0.4)'}}></div>
            <h1 className="relative text-3xl md:text-5xl lg:text-6xl font-display font-black text-vintage-gold tracking-wider mb-1 md:mb-2" style={{textShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)'}}>
            </h1>
            <p className="relative text-xs md:text-sm text-vintage-burnt-gold font-modern tracking-[0.2em] md:tracking-[0.3em] uppercase">{t('cardBattle')}</p>
          </div>
        )}

        {!isInFarcaster && (
          <div className="flex items-center justify-center gap-2">
            {/* VibeFID Button - Opens VibeFID + Mail modal */}
            {!!userFidForVibemail && (
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setShowFidMailModal(true);
                }}
                onMouseEnter={() => { if (soundEnabled) AudioManager.buttonHover(); }}
                className="tour-vibefid-btn relative px-8 md:px-12 py-2 md:py-2 border border-vintage-gold/30 bg-purple-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 hover:bg-purple-500 tracking-wider flex flex-col items-center justify-center gap-0.5 text-xs md:text-base cursor-pointer"
              >
                {typeof unreadVibeMailCount === 'number' && unreadVibeMailCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-vintage-gold z-10" />
                )}
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm font-bold">{t("vibefidMint")}</span>
                </div>
                <span className="text-[10px] md:text-xs opacity-75 font-normal leading-tight">{t('vibefidCheckScore')}</span>
              </button>
            )}

            <a
              href="https://farcaster.xyz/miniapps/0sNKxskaSKsH/vbms---game-and-wanted-cast"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex px-4 md:px-6 py-2.5 md:py-3 border border-vintage-gold/30 text-purple-300 hover:text-purple-100 bg-purple-900/50 hover:bg-purple-800/60 font-modern font-semibold rounded-lg transition-all duration-300 tracking-wider items-center gap-2 text-sm md:text-base"
            >
              <span className="text-base md:text-lg">♦</span> {t('tryMiniapp')}
            </a>
          </div>
        )}

        {/* Settings & Docs moved to profile dropdown */}
      </header>

      {!address ? (
        <ConnectScreen
          isCheckingFarcaster={isCheckingFarcaster}
          setIsCheckingFarcaster={setIsCheckingFarcaster}
          isInFarcaster={isInFarcaster}
          isFrameMode={isFrameMode}
          soundEnabled={soundEnabled}
        />
      ) : (
        <>
          <GameHeader
            isInFarcaster={isInFarcaster}
            soundEnabled={soundEnabled}
            userProfile={userProfile}
            isLoadingProfile={isLoadingProfile}
            address={address}
            vbmsBlockchainBalance={vbmsBlockchainBalance}
            getAvatarUrl={getAvatarUrl}
            onSettingsClick={() => setShowSettings(true)}
            onCreateProfileClick={() => setShowCreateProfile(true)}
            onVibeFidClick={() => { setShowFidMailModal(true); }}
          />

          {/* Navigation Tabs */}
          <GameNavBar
            isInFarcaster={isInFarcaster}
            soundEnabled={soundEnabled}
            currentView={currentView}
            setCurrentView={setCurrentView}
            inboxStatus={inboxStatus}
            hasClaimableMissions={hasClaimableMissions}
            safeAreaInsets={safeAreaInsets}
          />

          {/* Content wrapper — pb clears fixed bottom nav + safe area */}
          <div
            className={isInFarcaster && !(safeAreaInsets.bottom > 0) ? 'pb-[80px]' : ''}
            style={isInFarcaster && safeAreaInsets.bottom > 0 ? { paddingBottom: 64 + safeAreaInsets.bottom } : undefined}
          >

          {/* Price Ticker - TOP */}
          {isInFarcaster && (
            <div className="flex flex-col items-center pt-0 pb-1 w-full max-w-[304px] mx-auto mt-[58px]">
              {!!userFidForVibemail && (
                <button
                  onClick={() => { if (soundEnabled) AudioManager.buttonClick(); setShowFidMailModal(true); }}
                  onMouseEnter={() => { if (soundEnabled) AudioManager.buttonHover(); }}
                  className="tour-vibefid-btn relative w-full px-8 py-2.5 border border-vintage-gold/30 bg-purple-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 hover:bg-purple-500 tracking-wider flex flex-col items-center justify-center gap-0.5 text-xs cursor-pointer mb-1"
                >
                  {typeof unreadVibeMailCount === 'number' && unreadVibeMailCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-vintage-gold z-10" />
                  )}
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-sm font-bold">{t("vibefidMint")}</span>
                  </div>
                  <span className="text-[10px] opacity-75 font-normal leading-tight">{t('vibefidCheckScore')}</span>
                </button>
              )}
              <PriceTicker className="w-full" />
              <AllCollectionsButton className="mt-0.5" />
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6">
              <p className="text-red-400 font-bold">✗ {t('error')}</p>
              <p className="text-red-300 text-sm mt-1">{errorMsg}</p>
              <button onClick={() => { clearAllNftCache(); contextForceReloadNFTs(); }} className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm">{t('retryButton')}</button>
            </div>
          )}

          {/* Game View */}
          {currentView === 'game' && (
          <>
          {/* GAME BUTTONS - EXACT CENTER */}
          <div className={`flex flex-col items-center ${isInFarcaster ? 'px-2 w-full max-w-[304px] mx-auto' : 'px-2'}`}>
            <div className="tour-game-grid w-full">
              <GameGrid
                soundEnabled={soundEnabled}
                disabled={!userProfile || (status !== 'loaded' && status !== 'failed' && (isInFarcaster ? contextStatus !== 'loaded' : true))}
                onSelect={handleGameModeSelect}
                userAddress={address}
                onSpin={() => setShowRoulette(true)}
                isInFarcaster={isInFarcaster}
              />
            </div>
            <div className="tour-cards-section w-full mt-1">
              <CardsPreview
                cards={nfts}
                soundEnabled={soundEnabled}
                loading={status === 'fetching' || contextStatus === 'fetching' || (status === 'idle' && nfts.length === 0 && contextStatus !== 'loaded')}
                onViewAll={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setShowMyCardsModal(true);
                }}
              />
            </div>

            {/* Redeem button — in content, below YourCards */}
            {isInFarcaster && (
              <button
                onClick={() => { if (soundEnabled) AudioManager.buttonClick(); setCurrentView('inbox'); }}
                onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
                className="relative w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-green-700 border border-green-500 hover:bg-green-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
              >
                {inboxStatus && inboxStatus.coins >= 100 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-vintage-gold z-10" />
                )}
                <svg className="w-5 h-5 shrink-0 text-vintage-gold relative -top-[2px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="10" width="18" height="12" rx="2" />
                  <path d="M12 10V4" /><path d="M12 4c-2 0-4 2-4 4h4" /><path d="M12 4c2 0 4 2 4 4h-4" />
                  <line x1="12" y1="10" x2="12" y2="22" /><line x1="3" y1="15" x2="21" y2="15" />
                </svg>
                <span className="text-vintage-gold font-modern font-semibold text-base leading-none tracking-wider uppercase">
                  {(t as (k: string) => string)('navClaim')}
                </span>
                {inboxStatus && inboxStatus.coins > 0 && (
                  <span className="text-vintage-gold/60 font-modern font-semibold text-base leading-none">{inboxStatus.coins.toLocaleString()}</span>
                )}
              </button>
            )}
          </div>

          </>
          )}


          {/* 🎯 Missions View */}
          {currentView === 'missions' && (
            <MissionsView
              missionsSubView={missionsSubView}
              setMissionsSubView={setMissionsSubView}
              missions={missions}
              isLoadingMissions={isLoadingMissions}
              soundEnabled={soundEnabled}
              address={address}
              userProfile={userProfile}
              nfts={nfts}
              isClaimingMission={isClaimingMission}
              isClaimingAll={isClaimingAll}
              getMissionInfo={getMissionInfo}
              claimMission={claimMission}
              claimAllMissions={claimAllMissions}
              setSuccessMessage={setSuccessMessage}
              t={t}
              refreshUserProfile={refreshUserProfile}
              onOpenFidModal={() => { setShowFidMailModal(true); }}
            />
          )}

          {/* 💰 Inbox/Claim View */}
          {currentView === 'inbox' && inboxStatus && (
            <div className="max-w-2xl mx-auto">
              <CoinsInboxModal
                inboxStatus={inboxStatus}
                onClose={() => setCurrentView('game')}
                userAddress={address}
              />
            </div>
          )}

          {/* End content wrapper */}
          </div>

          {/* Create Profile Modal */}
          <CreateProfileModal
            isOpen={showCreateProfile && !isCheckingFarcaster}
            onClose={() => setShowCreateProfile(false)}
            address={address}
            profileUsername={profileUsername}
            setProfileUsername={setProfileUsername}
            isCreatingProfile={isCreatingProfile}
            setIsCreatingProfile={setIsCreatingProfile}
            setUserProfile={setUserProfile}
            setCurrentView={setCurrentView}
            soundEnabled={soundEnabled}
            t={t}
            onProfileCreated={async () => {
              // setShowTutorial(true); // TOUR DISABLED
            }}
          />

          {/* Guided Tour - Interactive tour highlighting UI elements */}
          <GuidedTour
            isOpen={showTutorial || showGuidedTour}
            onComplete={() => {
              setShowTutorial(false);
              setShowGuidedTour(false);
              // Mark tutorial as seen after completing the tour
              if (typeof window !== 'undefined') {
                localStorage.setItem('tutorialSeenV2', 'true');
              }
            }}
            soundEnabled={soundEnabled}
            steps={DEFAULT_TOUR_STEPS}
          />

        </>
      )}

      {/* Difficulty Selection Modal */}
      <DifficultyModal
        isOpen={isDifficultyModalOpen}
        onClose={() => {
          setIsDifficultyModalOpen(false);
          setTempSelectedDifficulty(null);
        }}
        onSelect={(difficulty) => {
          if (soundEnabled) AudioManager.buttonClick();
          setTempSelectedDifficulty(difficulty);
        }}
        onBattle={async (difficulty) => {
            // PvE Mode: Consume daily attempt before starting battle
            try {
              if (address) {
                await consumePveAttempt({ address });
                devLog('PvE attempt consumed successfully');
              }
            } catch (error) {
              devError('Failed to consume PvE attempt:', error);
              toast.error(error instanceof Error ? error.message : 'Failed to start battle. Please try again.');
              return; // Don't start battle if attempt consumption failed
            }

            // Don't play sound here - playHand() will play AudioManager.playHand()
            setAiDifficulty(difficulty);
            setIsDifficultyModalOpen(false);
            setTempSelectedDifficulty(null);

            // Start the battle with selected cards and difficulty
            setShowPveCardSelection(false);
            setGameMode('ai');
            setPvpMode(null);
            setSelectedCards(pveSelectedCards);
            setBattleMode('normal');

            // Pass difficulty directly to playHand to avoid state timing issues
            playHand(pveSelectedCards, difficulty);
        }}
        onEliminationBattle={(difficulty) => {
          if (soundEnabled) AudioManager.buttonClick();
          setAiDifficulty(difficulty);
          setEliminationDifficulty(difficulty); // Store for elimination mode
          setIsDifficultyModalOpen(false);
          setTempSelectedDifficulty(null);

          // Start elimination mode
          setShowPveCardSelection(false);
          setGameMode('ai');
          setPvpMode(null);
          setSelectedCards(pveSelectedCards);
          setBattleMode('elimination');
          setEliminationPhase('ordering');
          setOrderedPlayerCards(pveSelectedCards);
        }}
        unlockedDifficulties={unlockedDifficulties as Set<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>}
        currentDifficulty={aiDifficulty}
        tempSelected={tempSelectedDifficulty}
        remainingAttempts={pveAttemptsData?.remaining ?? 10}
        totalAttempts={pveAttemptsData?.total ?? 10}
      />

      </div>
    </div>
  );
}
 


