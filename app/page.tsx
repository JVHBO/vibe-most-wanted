"use client";
// Updated: Removed warning banners
import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import NextImage from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ConvexProfileService, type UserProfile, type MatchHistory } from "../lib/convex-profile"; // ✨ Convex para Profiles
import { ConvexPvPService, type GameRoom } from "../lib/convex-pvp"; // ✨ Convex para PvP Rooms
import { sdk } from "@farcaster/miniapp-sdk";
import { BadgeList } from "@/components/Badge";
import { getUserBadges } from "@/lib/badges";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMusic } from "@/contexts/MusicContext";
import { getAssetUrl } from "@/lib/ipfs-assets";
import { usePlayerCards } from "@/contexts/PlayerCardsContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useAccount, useDisconnect, useConnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { toast } from "sonner";
import { isMiniappMode } from "@/lib/utils/miniapp";
import { isWarpcastClient } from "@/lib/utils/miniapp";
import { useArbValidator, ARB_CLAIM_TYPE } from "@/lib/hooks/useArbValidator";
import { usePrimaryAddress } from "@/lib/hooks/usePrimaryAddress";
import { CONTRACTS, ERC20_ABI } from "@/lib/contracts";
import { encodeFunctionData } from "viem";
import { useMiniappFrameContext } from "@/components/MiniappFrame";

import { api } from "@/convex/_generated/api";
import { api as fidApi } from "@/lib/fid/convex-generated/api";
import { vibefidConvex } from "@/contexts/VibeFIDConvexProvider";
import FoilCardEffect from "@/components/FoilCardEffect";
import { ProgressBar } from "@/components/ProgressBar";
// Shop moved to /shop page
import { CreateProfileModal } from "@/components/CreateProfileModal";
import { DEFAULT_TOUR_STEPS, type TourStep } from "@/components/GuidedTour";
import { InboxDisplay } from "@/components/InboxDisplay";
import { CoinsInboxDisplay } from "@/components/CoinsInboxDisplay";
import { CardMedia } from "@/components/CardMedia";
import { NotEnoughCardsGuide } from "@/components/NotEnoughCardsGuide";
import { GamePopups } from "@/components/GamePopups";
import { PvPPreviewModal } from "@/components/PvPPreviewModal";
import { GameNavBar } from "@/components/GameNavBar";
import { ConnectScreen } from "@/components/ConnectScreen";
import { GameHeader } from "@/components/GameHeader";
import { NFTCard } from "@/components/NFTCard";
// RaidBossModal moved to /raid page
import { PriceTicker } from "@/components/PriceTicker";
import { AllCollectionsButton } from "@/components/AllCollectionsButton";
import ShameList from "@/components/ShameList";
import BannedScreen from "@/components/BannedScreen";
import { SocialQuestsPanel } from "@/components/SocialQuestsPanel";
// New Home Components
import { GameGrid, CardsPreview } from "@/components/home";
import { VibeFidMailModal } from "@/components/fid/VibeFidMailModal";
import { Roulette } from "@/components/Roulette";
// TEMPORARILY DISABLED - Causing performance issues
// import { MobileDebugConsole } from "@/components/MobileDebugConsole";
import { HAND_SIZE, getMaxAttacks, JC_CONTRACT_ADDRESS as JC_WALLET_ADDRESS, IS_DEV } from "@/lib/config";
// 🚀 Performance-optimized hooks
import { useTotalPower, useSortedByPower, useStrongestCards, usePowerByCollection } from "@/hooks/useCardCalculations";
import { usePopupStates } from "@/hooks/usePopupStates";
import { useBattleState, type BattleResult, VICTORY_IMAGES } from "@/hooks/useBattleState";
import { useMissionState } from "@/hooks/useMissionState";
import { useDefenseDeckState } from "@/hooks/useDefenseDeckState";
import { useAttackState } from "@/hooks/useAttackState";
import { useCardFilterState } from "@/hooks/useCardFilterState";
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
// CardLoadingScreen removed - wasn't working properly
// 💎 VBMS Blockchain Contracts
import { useApproveVBMS, useCreateBattle, useJoinBattle, useFinishVBMSBattle, useActiveBattle } from "@/lib/hooks/useVBMSContracts";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS"; // Miniapp-compatible balance hook

import { filterCardsByCollections, COLLECTIONS, getCollectionContract, getCardUniqueId, type CollectionId } from "@/lib/collections/index"; // getEnabledCollections removed - now only used by Context
import { findAttr, isUnrevealed, calcPower, normalizeUrl } from "@/lib/nft/attributes";
import { isSameCard, findCard, getCardKey } from "@/lib/nft";
import { getImage, fetchNFTs, clearAllNftCache } from "@/lib/nft/fetcher"; // checkCollectionBalances removed - now only used by Context
import { convertIpfsUrl } from "@/lib/ipfs-url-converter";
import type { Card } from "@/lib/types/card";
// RunawayEasterEgg removed

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
const ChainSelectionModal = dynamic(() => import("@/app/(game)/components/modals/ChainSelectionModal").then(m => m.ChainSelectionModal), { ssr: false });
const DefenseDeckModal = dynamic(() => import("@/app/(game)/components/modals/DefenseDeckModal").then(m => m.DefenseDeckModal), { ssr: false });
const ChangelogModal = dynamic(() => import("@/components/ChangelogModal").then(m => m.ChangelogModal), { ssr: false });
const ReportModal = dynamic(() => import("@/components/ReportModal").then(m => m.ReportModal), { ssr: false });

// Shared style para botoes de marketplace/ataque vermelhos
const STYLE_ATTACK_RED = { background: 'linear-gradient(145deg, #DC2626, #991B1B)' } as const;

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VIBE_CONTRACT;
const JC_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_JC_CONTRACT || CONTRACT_ADDRESS; // JC can have different contract
const CHAIN = process.env.NEXT_PUBLIC_ALCHEMY_CHAIN;

// ✅ Image caching moved to lib/nft/fetcher.ts

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

// ✅ NFT attribute functions moved to lib/nft/attributes.ts
// ✅ NFT fetching functions moved to lib/nft/fetcher.ts

// 🚀 BANDWIDTH FIX (Jan 2026): REMOVED fetchNFTsFromAllCollections function (~110 lines)
// NFT fetching is now ONLY done by PlayerCardsContext.tsx
// This eliminates duplicate Alchemy API calls!


// Match History Section Component - REMOVED from leaderboard (only in profile page now)

export default function TCGPage() {
  const { lang, setLang, t } = useLanguage();
  const { musicMode, setMusicMode, isMusicEnabled, setIsMusicEnabled, setVolume: syncMusicVolume, customMusicUrl, setCustomMusicUrl, isCustomMusicLoading, customMusicError, playlist, setPlaylist, addToPlaylist, removeFromPlaylist, currentPlaylistIndex, skipToNext, skipToPrevious, currentTrackName, currentTrackThumbnail, isPaused, pause, play } = useMusic();
  const router = useRouter();
  const searchParams = useSearchParams();
  const playButtonsRef = useRef<HTMLDivElement>(null);

  // Wagmi hooks for wallet connection
  const { address: wagmiAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  // Desktop frame mode: MiniappFrame wraps app on desktop browser
  // When true, force miniapp layout (nav at bottom, compact labels) even outside Farcaster
  const isFrameMode = useMiniappFrameContext();

  // State for Farcaster context detection
  const [isInFarcaster, setIsInFarcaster] = useState<boolean>(false);
  const [farcasterFidState, setFarcasterFidState] = useState<number | undefined>(undefined);
  const [farcasterClientFid, setFarcasterClientFid] = useState<number | undefined>(undefined);
  const [isCheckingFarcaster, setIsCheckingFarcaster] = useState<boolean>(true); // Start true to wait for Farcaster check

  // Resolve primary address (handles linked/secondary wallets on website)
  const { primaryAddress } = usePrimaryAddress();

  // 🔧 DEV MODE: Force admin wallet for testing
  const DEV_WALLET_BYPASS = false; // DISABLED: Only for localhost testing
  const address = DEV_WALLET_BYPASS
    ? '0xbb4c7d8b2e32c7c99d358be999377c208cce53c2'
    : (primaryAddress || wagmiAddress);

  // Debug bypass (removed console.log for production)

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
        console.error('Error loading quest data:', e);
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

      console.log('[Farcaster] 💾 Saving address to localStorage:', wagmiAddress);
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

  // CRITICAL: Call ready() IMMEDIATELY - affects ranking and $10k reward pool!
  // Do NOT wait for wallet connection - Farcaster counts daily users via ready()
  const [sdkReadyCalled, setSdkReadyCalled] = useState(false);

  useEffect(() => {
    // Only call once
    if (sdkReadyCalled) return;

    const initFarcasterSDK = async () => {
      try {
        if (typeof window === 'undefined') return;

        // Check if SDK is available
        if (!sdk || typeof sdk.actions?.ready !== 'function') {
          console.log('[Farcaster SDK] Not available (not in miniapp context)');
          return;
        }

        // Call ready() IMMEDIATELY - DO NOT wait for wallet connection!
        await sdk.actions.ready();
        setSdkReadyCalled(true);
        console.log('[Farcaster SDK] ✅ ready() called IMMEDIATELY on app load');
      } catch (error) {
        console.error('[Farcaster SDK] Error calling ready():', error);
      }
    };

    // Execute immediately on mount
    initFarcasterSDK();
  }, [sdkReadyCalled]);

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
    showChainModal, setShowChainModal,
    showArbAnnounce, setShowArbAnnounce,
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
    isClaimingQuest, setIsClaimingQuest,
    isClaimingWeeklyReward, setIsClaimingWeeklyReward,
    pendingClaimAction, setPendingClaimAction,
    missions, setMissions,
    isLoadingMissions, setIsLoadingMissions,
    isClaimingMission, setIsClaimingMission,
    isClaimingAll, setIsClaimingAll,
    missionsSubView, setMissionsSubView,
  } = useMissionState();

  const {
    defenseDeckWarningDismissed, setDefenseDeckWarningDismissed,
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

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [musicVolume, setMusicVolume] = useState<number>(0.1); // Volume padrão 10%
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [nfts, setNfts] = useState<any[]>([]);
  const [jcNfts, setJcNfts] = useState<any[]>([]);
  const [jcNftsLoading, setJcNftsLoading] = useState<boolean>(true);
  const [jcLoadingProgress, setJcLoadingProgress] = useState<{page: number, cards: number} | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [skippedCardLoading, setSkippedCardLoading] = useState(false);

  // 🔗 Get cards from shared context (persists across routes!)
  // 🚀 BANDWIDTH FIX: Use context's loadNFTs instead of local duplicate
  const { nfts: contextNfts, status: contextStatus, syncNftsFromHome, loadNFTs: contextLoadNFTs, forceReloadNFTs: contextForceReloadNFTs, refreshUserProfile } = usePlayerCards();

  // Check sessionStorage on mount to skip loading if already loaded this session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const alreadyLoaded = sessionStorage.getItem('vbms_cards_loaded') === 'true';
      if (alreadyLoaded) {
        setSkippedCardLoading(true);
      }
    }
  }, []);

  // 🔗 Sync with context: If context has cards, use them (prevents reload on navigation)
  // 🚀 BANDWIDTH FIX (Jan 2026): Context is now the single source of truth for NFT loading
  useEffect(() => {
    if (contextStatus === 'loaded' && contextNfts.length > 0 && nfts.length === 0) {
      console.log('📦 Syncing from context:', contextNfts.length, 'cards');
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

  // Convex client for imperative queries (already declared above)

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
  const strongestJcNfts = useStrongestCards(jcNfts, HAND_SIZE);

  // Economy mutations
  const awardPvECoins = useMutation(api.economy.awardPvECoins);
  const awardPvPCoins = useMutation(api.economy.awardPvPCoins);
  const recordAttackResult = useMutation(api.economy.recordAttackResult); // ⚛️ ATOMIC: Combines coins + match + profile update
  const claimLoginBonus = useMutation(api.economy.claimLoginBonus);
  const payEntryFee = useMutation(api.economy.payEntryFee);
  const claimQuestReward = useMutation(api.quests.claimQuestReward);
  const setPreferredChainMutation = useMutation(api.missions.setPreferredChain);
  const markChainModalSeenMutation = useMutation(api.missions.markChainModalSeen);

  // VBMS Economy mutations (PvP with real VBMS)
  const chargeVBMSEntryFee = useMutation(api.economyVBMS.chargeVBMSEntryFee);
  const awardPvPVBMS = useMutation(api.economyVBMS.awardPvPVBMS);
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
  const { balance: vbmsBlockchainBalance, refetch: refetchVBMSBalance } = useFarcasterVBMSBalance(address);
const { approve: approveVBMS, isPending: isApprovingVBMS } = useApproveVBMS();
  const { createBattle, isPending: isCreatingBattle } = useCreateBattle();
  const { joinBattle, isPending: isJoiningBattle } = useJoinBattle();
  const { finishBattle: finishVBMSBattle } = useFinishVBMSBattle();
  const { battleId: activeBattleId, refetch: refetchActiveBattle } = useActiveBattle(address as `0x${string}`);

  // 🎯 Weekly Quests mutations
  const claimWeeklyReward = useMutation(api.quests.claimWeeklyReward);

  // 🏅 Weekly Leaderboard Rewards (skip in miniapp for performance)
  const weeklyRewardEligibility = useQuery(
    api.quests.checkWeeklyRewardEligibility,
    address ? { address } : "skip"
  );
  const prepareWeeklyLeaderboardVBMSClaim = useAction(api.quests.prepareWeeklyLeaderboardVBMSClaim);
  const recordWeeklyLeaderboardClaim = useMutation(api.quests.recordWeeklyLeaderboardClaim);
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

  // REMOVED: Referral system disabled
  // Leaderboard moved to /leaderboard page
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);

  // 🆕 AUTO-CREATE: Mutation to auto-create profile from Farcaster
  const upsertProfileFromFarcaster = useMutation(api.profiles.upsertProfileFromFarcaster);
  const hasAutoCreatedProfile = useRef(false);

  // 🆕 AUTO-CREATE/UPDATE PROFILE: When user enters via Farcaster with FID + wallet
  // Also updates existing profiles that are missing farcasterFid (fixes Base App claim)
  useEffect(() => {
    const autoCreateOrUpdateProfile = async () => {
      // Only run once, when we have all required data
      if (hasAutoCreatedProfile.current) return;
      if (!address) return;
      if (!isInFarcaster) return;
      if (!farcasterFidState) return;
      if (isCheckingFarcaster) return;
      if (isLoadingProfile) return; // Still loading

      // If profile exists AND already has farcasterFid, skip
      if (userProfile && (userProfile as any).farcasterFid) return;

      // Get Farcaster context for username/displayName/pfpUrl
      try {
        const context = await sdk.context;
        if (!context?.user) return;

        const { fid, username, displayName, pfpUrl } = context.user;
        if (!fid) return;

        const action = userProfile ? 'Updating' : 'Creating';
        console.log(`[AutoCreate] 🆕 ${action} profile for Farcaster user:`, { fid, username, address });
        hasAutoCreatedProfile.current = true;

        await upsertProfileFromFarcaster({
          address,
          fid,
          username: username || `fid${fid}`,
          displayName: displayName || undefined,
          pfpUrl: pfpUrl || undefined,
        });

        console.log(`[AutoCreate] ✅ Profile ${action.toLowerCase()}d successfully!`);

        // Refresh profile to get the new data
        await refreshProfile();
      } catch (error) {
        console.error('[AutoCreate] ❌ Failed to auto-create/update profile:', error);
        hasAutoCreatedProfile.current = false; // Allow retry
      }
    };

    autoCreateOrUpdateProfile();
  }, [address, isInFarcaster, farcasterFidState, isCheckingFarcaster, userProfile, isLoadingProfile, upsertProfileFromFarcaster, refreshProfile]);
  // ARB supported only on Warpcast (clientFid 9152), not Base App or other clients
  // For non-miniapp (browser), isInFarcaster=false so arbSupported=true
  // Frame mode = desktop browser, always ARB supported
  const arbSupported = isFrameMode || !isInFarcaster || isWarpcastClient(farcasterClientFid);
  // Effective chain: force "base" when ARB not supported (e.g. Base App)
  const effectiveChain = !arbSupported ? "base" : ((userProfile as any)?.preferredChain || "arbitrum");
  // On-chain TX hooks for mission claims
  const { validateOnArb } = useArbValidator();
  // Arb Mode announcement disabled - no longer needed
  // REMOVED: showReferrals - Referral system disabled

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

  // Raid Boss States
  // Raid Boss moved to /raid page

  // 🚀 Performance: Memoized battle card power totals (for UI display)
  const pveSelectedCardsPower = useTotalPower(pveSelectedCards);
  const { totalPower: attackSelectedCardsPower } = usePowerCalculation(attackSelectedCards, true);
  const { totalPower: dealerCardsPower } = usePowerCalculation(dealerCards, true);

  // Refs for preventing race conditions
  const updateStatsInProgress = useRef(false);

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
      console.error('Error awarding share bonus:', error);
    }
  };

  // Preload tie.mp4 to prevent loading delay
  useEffect(() => {
    const video = document.createElement('video');
    video.src = getAssetUrl('/tie.mp4');
    video.oncanplaythrough = () => setTieGifLoaded(true);
    video.load();
  }, []);

  // Set mounted state to prevent hydration errors
  useEffect(() => {
    setIsMounted(true);
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
        setMusicEnabled(isEnabled);
        // 🔧 FIX: Also update the MusicContext state to prevent audio playing when muted
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

    const tutorialSeen = localStorage.getItem('tutorialSeenV2');
    if (!tutorialSeen) {
      // Show tutorial for this user (first time) - V2 resets for all users
      setShowTutorial(true);
    }
  }, [address, userProfile]);

  // Sync music volume with MusicContext
  useEffect(() => {
    syncMusicVolume(musicVolume);
  }, [musicVolume, syncMusicVolume]);

  // Auto-connect Farcaster wallet in miniapp context (Nov 14 simple version)
  useEffect(() => {
    const initFarcasterWallet = async () => {
      // Frame mode: desktop browser with MiniappFrame wrapper → force miniapp layout
      // No real Farcaster SDK, no FID, no wallet auto-connect — just use miniapp UI layout
      if (isFrameMode) {
        setIsInFarcaster(true);
        setIsCheckingFarcaster(false);
        return;
      }

      console.log('[Farcaster] 🔍 Initializing wallet connection...');
      try {
        console.log('[Farcaster] SDK check:', {
          hasSdk: !!sdk,
          hasWallet: !!sdk?.wallet,
          hasEthProvider: !!sdk?.wallet?.ethProvider,
        });

        // STEP 1: Check if SDK exists at all
        if (!sdk) {
          console.log('[Farcaster] ⚠️ No SDK available - not in Farcaster');
          setIsInFarcaster(false);
          setIsCheckingFarcaster(false);
          return;
        }

        // STEP 2: Check if SDK context has valid FID (proves we're in Farcaster)
        // This check is SEPARATE from wallet availability - fixes analytics misclassification
        try {
          const contextPromise = sdk.context;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SDK context timeout')), 5000)
          );

          const context = await Promise.race([contextPromise, timeoutPromise]) as any;

          if (!context || !context.user || !context.user.fid) {
            console.log('[Farcaster] ⚠️ SDK present but invalid context - not in miniapp');
            setIsInFarcaster(false);
            setIsCheckingFarcaster(false);
            return;
          }

          // ✅ We ARE in Farcaster miniapp - set this EARLY for correct analytics
          console.log('[Farcaster] ✅ Farcaster miniapp confirmed - FID:', context.user.fid);
          setFarcasterFidState(context.user.fid);
          setFarcasterClientFid(context.client?.clientFid);
          setIsInFarcaster(true); // Set BEFORE wallet check!
        } catch (contextError) {
          console.log('[Farcaster] ⚠️ Failed to get valid SDK context:', contextError);
          setIsInFarcaster(false);
          setIsCheckingFarcaster(false);
          return;
        }

        // STEP 3: Now try to connect wallet (user is still in Farcaster even if this fails)
        // iOS: Retry wallet check up to 3 times with delay (wallet may take longer to initialize)
        let walletAvailable = typeof sdk.wallet !== 'undefined' && !!sdk.wallet.ethProvider;
        let retries = 0;
        const maxRetries = 3;

        while (!walletAvailable && retries < maxRetries) {
          console.log(`[Farcaster] ⏳ Wallet not ready, retry ${retries + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          walletAvailable = typeof sdk.wallet !== 'undefined' && !!sdk.wallet.ethProvider;
          retries++;
        }

        if (!walletAvailable) {
          console.log('[Farcaster] ⚠️ Wallet not available after retries - user is in Farcaster but wallet not ready');
          setIsCheckingFarcaster(false);
          return;
        }

        console.log('[Farcaster] ✅ Wallet available, connecting...');

        try {
          // Find the Farcaster miniapp connector
          console.log('[Farcaster] 🔍 Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));

          // Try multiple possible connector IDs (case variations)
          const farcasterConnector = connectors.find((c) =>
            c.id === 'farcasterMiniApp' ||
            c.id === 'farcaster' ||
            c.name?.toLowerCase().includes('farcaster')
          );

          if (!farcasterConnector) {
            console.error('[Farcaster] ❌ Farcaster connector not found in wagmi config');
            console.error('[Farcaster] Available connector IDs:', connectors.map(c => c.id));

            // Show user-friendly error
            toast.error('Connector Farcaster não encontrado. Por favor, recarregue a página.');
            setIsCheckingFarcaster(false);
            return;
          }

          console.log('[Farcaster] 📡 Connecting with Farcaster wagmi connector:', farcasterConnector.id);

          // Connect using wagmi - this will populate wagmiAddress automatically
          await connect({ connector: farcasterConnector });

          console.log('[Farcaster] ✅ Connected successfully');
          devLog('✓ Auto-connected Farcaster wallet via wagmi');

          // ✓ Save FID to profile for notifications
          try {
            const context = await sdk.context;
            const fid = context?.user?.fid;
            if (fid) {
              devLog('📱 Farcaster FID detected:', fid);
            }
          } catch (fidError) {
            devLog('! Could not get FID:', fidError);
          }
        } catch (connectError: any) {
          console.error('[Farcaster] ❌ Connection error:', connectError);
          // Handle authorization errors
          if (connectError?.message?.includes('not been authorized')) {
            console.warn('[Farcaster] ⚠️ Wallet not authorized - user needs to enable in Farcaster settings');
            devLog('! Farcaster wallet not authorized yet - staying in miniapp but without wallet');
          }
        } finally {
          setIsCheckingFarcaster(false);
        }
      } catch (err) {
        devLog('! Not in Farcaster context or wallet unavailable:', err);
        setIsInFarcaster(false);
        setIsCheckingFarcaster(false);
      }
    };
    initFarcasterWallet();
  }, [connect, connectors, isFrameMode]);

  // 📊 Log access analytics (miniapp vs farcaster_web vs web)
  const logAccessMutation = useMutation(api.accessAnalytics.logAccess);
  const logAccessDebugMutation = useMutation(api.accessAnalytics.logAccessDebug);
  const hasLoggedAccess = useRef(false);

  useEffect(() => {
    // Only log once per session, when we have address and finished checking
    if (hasLoggedAccess.current || !address || isCheckingFarcaster) return;

    // Gather debug info
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const isIframe = typeof window !== 'undefined' && window.parent !== window;
    const sdkAvailable = !!sdk;

    // Determine source with more granularity
    let source: "miniapp" | "farcaster_web" | "web" | "frame";

    if (isInFarcaster) {
      // Farcaster SDK is working = Warpcast app
      source = "miniapp";
    } else {
      // Check if came from farcaster.xyz (browser access)
      const isFromFarcaster =
        referrer.includes('farcaster.xyz') ||
        referrer.includes('warpcast.com') ||
        currentUrl.includes('farcaster.xyz') ||
        // Check if in iframe from farcaster
        (isIframe && (referrer.includes('farcaster') || referrer.includes('warpcast')));

      source = isFromFarcaster ? "farcaster_web" : "web";
    }

    hasLoggedAccess.current = true;

    // Log main analytics
    logAccessMutation({ address, source })
      .then(() => devLog(`📊 Access logged: ${source}`))
      .catch((err) => devError("Failed to log access:", err));

    // Log debug info for analysis
    logAccessDebugMutation({
      address,
      source,
      userAgent: userAgent.substring(0, 500), // Limit length
      referrer: referrer.substring(0, 500),
      currentUrl: currentUrl.substring(0, 500),
      isIframe,
      sdkAvailable,
    }).catch((err) => devError("Failed to log debug:", err));

  }, [address, isInFarcaster, isCheckingFarcaster, logAccessMutation, logAccessDebugMutation, sdk]);

  // 🔔 Handler to enable Farcaster notifications
  const handleEnableNotifications = async () => {
    try {
      if (!sdk || !sdk.actions || !isInFarcaster) {
        devLog('! Farcaster SDK not available');
        toast.error('Farcaster SDK not available');
        return;
      }

      devLog('🔔 Requesting Farcaster notification permissions...');
      toast.loading('Requesting notification permissions...');

      const result = await sdk.actions.addMiniApp();
      devLog('✓ Notification permission result:', result);

      toast.dismiss();
      toast.success('Notifications enabled! 🔔');

      if (soundEnabled) AudioManager.buttonClick();
    } catch (error) {
      devError('✗ Error enabling notifications:', error);
      toast.dismiss();
      toast.error('Failed to enable notifications');
      if (soundEnabled) AudioManager.buttonError();
    }
  };

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

  // 💰 Handler to claim daily login bonus
  const handleClaimLoginBonus = async () => {
    if (!address || loginBonusClaimed || isClaimingBonus) return;

    try {
      setIsClaimingBonus(true);
      devLog('💰 Claiming login bonus...');

      const result = await claimLoginBonus({ address });

      if (result.awarded > 0) {
        devLog(`✓ Login bonus claimed: +${result.awarded} $TESTVBMS`);
        setLoginBonusClaimed(true);
        if (soundEnabled) AudioManager.buttonClick();

      } else {
        devLog(`! ${result.reason}`);
        if (soundEnabled) AudioManager.buttonError();
      }
    } catch (error) {
      devError('✗ Error claiming login bonus:', error);
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingBonus(false);
    }
  };

  // 💎 Handler to claim daily bonus with blockchain TX
  // Send on-chain TX after Convex mission claim (non-blocking)
  // ARB: validateClaim on VBMSValidator (no tokens, just proof)
  // Base: transfer 0 VBMS to pool (no tokens moved, just on-chain marker)
  const sendMissionTx = async (reward: number, claimType: typeof ARB_CLAIM_TYPE[keyof typeof ARB_CLAIM_TYPE]) => {
    if (!address || reward <= 0) return;
    try {
      if (effectiveChain === 'arbitrum') {
        await validateOnArb(reward, claimType);
      } else {
        // Base: send 0 VBMS to pool — on-chain proof, no actual transfer
        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [CONTRACTS.VBMSPoolTroll as `0x${string}`, BigInt(0)],
        });

        try {
          // Farcaster SDK first
          const provider = await sdk.wallet.getEthereumProvider();
          if (provider) {
            await provider.request({
              method: 'eth_sendTransaction',
              params: [{ from: address as `0x${string}`, to: CONTRACTS.VBMSToken as `0x${string}`, data }],
            });
            return;
          }
        } catch {}

        // Fallback: wagmi
        const { sendTransaction } = await import('wagmi/actions');
        const { config } = await import('@/lib/wagmi');
        await sendTransaction(config, {
          to: CONTRACTS.VBMSToken as `0x${string}`,
          data,
          chainId: CONTRACTS.CHAIN_ID,
        });
      }
    } catch (err: any) {
      devError('Mission TX (non-blocking):', err);
      // Show visible error only for user rejections (not silent chain/wallet issues)
      if (err?.message?.includes('rejected') || err?.message?.includes('denied') || err?.code === 4001) {
        toast.error('Transaction rejected by wallet.');
      } else if (err?.message && !err.message.includes('connector not found')) {
        toast.error('Transaction failed. Please check your wallet and try again.');
      }
    }
  };

  const handleDailyClaimNow = async () => {
    if (!address || isClaimingBonus) return;

    try {
      setIsClaimingBonus(true);
      devLog('Daily claim - claiming all unclaimed missions...');

      const claimResult = await convex.mutation(api.missions.claimAllMissions, {
        playerAddress: address,
        language: lang,
        chain: effectiveChain,
      });

      if (claimResult && claimResult.claimed > 0) {
        devLog(`Claimed ${claimResult.claimed} missions (+${claimResult.totalReward} coins)`);
        if (soundEnabled) AudioManager.buttonSuccess();
        // Update UI immediately, fire TX in background
        setLoginBonusClaimed(true);
        setShowDailyClaimPopup(false);
        await refreshProfile();
        sendMissionTx(claimResult.totalReward, ARB_CLAIM_TYPE.DAILY_LOGIN); // fire-and-forget
      } else {
        devLog('No unclaimed missions found');
        if (soundEnabled) AudioManager.buttonError();
        setLoginBonusClaimed(true);
        setShowDailyClaimPopup(false);
      }
    } catch (error) {
      devError('Error claiming daily bonus:', error);
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingBonus(false);
    }
  };

  // 🎯 Handler to claim daily quest reward
  const handleClaimQuestReward = async () => {
    if (!address || isClaimingQuest) return;

    // Show chain modal on first claim
    if (!(userProfile as any)?.chainModalSeen) {
      setPendingClaimAction(() => () => handleClaimQuestReward());
      setShowChainModal(true);
      return;
    }

    try {
      setIsClaimingQuest(true);
      devLog('🎯 Claiming quest reward...');

      const chain = effectiveChain;
      const result = await claimQuestReward({ address, chain });

      devLog(`✓ Quest reward claimed: +${result.reward} $TESTVBMS`);
      if (soundEnabled) AudioManager.buttonClick();
    } catch (error: any) {
      devError('✗ Error claiming quest reward:', error);
      toast.error(error.message || 'Failed to claim quest reward');
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingQuest(false);
    }
  };

  // 🏅 Handler to claim weekly leaderboard reward
  const handleClaimWeeklyLeaderboardReward = async () => {
    if (!address || isClaimingWeeklyReward) return;
    setIsClaimingWeeklyReward(true);

    try {
      devLog('🏅 Preparing weekly leaderboard VBMS claim...');
      const result = await prepareWeeklyLeaderboardVBMSClaim({ address });

      toast.info('🔐 Sign transaction to receive VBMS...');

      // Force Base chain and send TX
      const provider = await sdk.wallet.getEthereumProvider();
      if (!provider) throw new Error('Wallet not available');

      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] });
      } catch {}

      const { encodeFunctionData, parseEther } = await import('viem');
      const { POOL_ABI } = await import('@/lib/contracts');
      const data = encodeFunctionData({
        abi: POOL_ABI,
        functionName: 'claimVBMS',
        args: [parseEther(result.amount.toString()), result.nonce as `0x${string}`, result.signature as `0x${string}`],
      });

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address as `0x${string}`, to: '0x062b914668f3fd35c3ae02e699cb82e1cf4be18b', data }],
      }) as string;

      await recordWeeklyLeaderboardClaim({ address, txHash });
      setShowWeeklyLeaderboardPopup(false);
      toast.success(`✅ ${result.amount.toLocaleString()} VBMS claimed! Rank #${result.rank}`);
      if (soundEnabled) AudioManager.buttonClick();

    } catch (error: any) {
      devError('✗ Error claiming weekly reward:', error);
      toast.error(error.message || 'Failed to claim weekly reward');
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingWeeklyReward(false);
    }
  };

  // 🎯 Handler to claim weekly quest reward
  const handleClaimWeeklyQuestReward = async (questId: string) => {
    if (!address) return;

    try {
      devLog(`🎯 Claiming weekly quest reward: ${questId}...`);

      const result = await claimWeeklyReward({ address, questId });

      if (soundEnabled) AudioManager.buttonSuccess();
      devLog(`✓ Weekly quest reward claimed: ${questId} → +${result.reward} $TESTVBMS`);

    } catch (error: any) {
      devError('Error claiming reward:', error);
      if (soundEnabled) AudioManager.buttonError();
    }
  };

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

  // Salvar estado da música no localStorage e controlar reprodução
  // ⚠️ DISABLED: Now using MusicContext instead of AudioManager
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
    // Keep local state in sync
    setMusicEnabled(!isMusicEnabled);
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

  const loadJCNFTs = useCallback(async () => {
    try {
      devLog('※ Loading JC deck from optimized static file...');

      // Load from optimized static endpoint (instant!)
      const res = await fetch('/api/jc-deck');
      if (!res.ok) {
        throw new Error(`Failed to load JC deck: ${res.status}`);
      }

      const data = await res.json();
      const cards = data.cards || [];

      devLog(`✓ JC deck loaded instantly: ${cards.length} cards from ${data.source}`);

      // Map to expected format with normalized URLs
      const processed = cards.map((card: any) => ({
        tokenId: card.tokenId,
        imageUrl: normalizeUrl(card.imageUrl || ''),
        rarity: card.rarity,
        status: card.status,
        power: card.power,
        name: card.name,
        attributes: card.attributes || [],
        // Reconstruct full NFT object if needed
        raw: {
          metadata: {
            name: card.name,
            image: card.imageUrl,
            attributes: card.attributes
          }
        }
      }));

      setJcNfts(processed);
      setJcNftsLoading(false);

      devLog('✓ JC NFTs ready:', processed.length, 'cards');
      devLog(`   Legendary: ${processed.filter((c: any) => c.rarity === 'Legendary').length}`);
      devLog(`   Epic: ${processed.filter((c: any) => c.rarity === 'Epic').length}`);
      devLog(`   Rare: ${processed.filter((c: any) => c.rarity === 'Rare').length}`);

    } catch (e: any) {
      devError('✗ Error loading JC NFTs from static file:', e);
      devLog('!  Falling back to live API...');

      // Fallback to original live API method
      try {
        const revealed = await fetchNFTs(JC_WALLET_ADDRESS, JC_CONTRACT_ADDRESS, (page, cards) => {
          setJcLoadingProgress({ page, cards });
        });

        const processed = revealed.map(nft => {
          const imageUrl = nft?.image?.cachedUrl ||
                           nft?.image?.thumbnailUrl ||
                           nft?.image?.originalUrl ||
                           nft?.raw?.metadata?.image ||
                           '';

          return {
            ...nft,
            imageUrl: normalizeUrl(imageUrl),
            name: nft.title || nft.name || `Card #${nft.tokenId}`, // Add name for Card type compatibility
            rarity: findAttr(nft, 'rarity'),
            status: findAttr(nft, 'status'),
            wear: findAttr(nft, 'wear'),
            foil: findAttr(nft, 'foil'),
            power: calcPower(nft),
          };
        });

        setJcNfts(processed);
        setJcNftsLoading(false);
        setJcLoadingProgress(null);
        devLog('✓ JC NFTs loaded from live API:', processed.length, 'cards');

      } catch (fallbackError: any) {
        devError('✗ Fallback also failed:', fallbackError);
        setJcNftsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadJCNFTs();
  }, []); // Run only once on mount

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

  // Generate AI hand with strategic ordering based on difficulty
  const generateAIHand = useCallback((difficulty: 'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad') => {
    const available = jcNfts;
    if (available.length < HAND_SIZE) {
      toast.error('AI deck not ready yet...');
      return [];
    }

    const sorted = [...available].sort((a, b) => (b.power || 0) - (a.power || 0));
    let pickedCards: any[] = [];

    // Select cards based on difficulty (same logic as normal battle)
    switch (difficulty) {
      case 'gey':
        const weakest = sorted.filter(c => (c.power || 0) === 15);
        pickedCards = weakest.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        break;
      case 'goofy':
        const weak = sorted.filter(c => {
          const p = c.power || 0;
          return p === 18 || p === 21;
        });
        pickedCards = weak.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        break;
      case 'gooner':
        const medium = sorted.filter(c => {
          const p = c.power || 0;
          return p === 60 || p === 72;
        });
        pickedCards = medium.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        break;
      case 'gangster':
        const cards150 = sorted.filter(c => (c.power || 0) === 150);
        if (cards150.length >= HAND_SIZE) {
          pickedCards = cards150.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        } else {
          const legendaries = sorted.filter(c => (c.rarity || '').toLowerCase().includes('legend'));
          pickedCards = legendaries.slice(0, HAND_SIZE);
        }
        break;
      case 'gigachad':
        pickedCards = sorted.slice(0, HAND_SIZE);
        break;
    }

    // Apply strategic ordering based on difficulty
    let orderedCards: any[] = [];
    switch (difficulty) {
      case 'gey':
      case 'goofy':
        // Random order (no strategy)
        orderedCards = pickedCards.sort(() => Math.random() - 0.5);
        break;
      case 'gooner':
        // Weak-first strategy (sacrifice weak cards)
        orderedCards = [...pickedCards].sort((a, b) => (a.power || 0) - (b.power || 0));
        break;
      case 'gangster':
        // Strong-first strategy (overwhelming force)
        orderedCards = [...pickedCards].sort((a, b) => (b.power || 0) - (a.power || 0));
        break;
      case 'gigachad':
        // Balanced strategy (strong-weak-strong-weak-strong)
        const sortedByPower = [...pickedCards].sort((a, b) => (b.power || 0) - (a.power || 0));
        orderedCards = [
          sortedByPower[0], // strongest
          sortedByPower[4], // weakest
          sortedByPower[1], // 2nd strongest
          sortedByPower[3], // 2nd weakest
          sortedByPower[2]  // middle
        ];
        break;
    }

    devLog(`🤖 AI ordered cards for ${difficulty}:`, orderedCards.map(c => `#${c.tokenId} (${c.power} PWR)`));
    return orderedCards;
  }, [jcNfts]);

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

    let pickedDealer: any[] = [];

    // Different strategies based on difficulty (5 levels)
    // Power-based ranges (actual unique values: 15, 18, 21, 38, 45, 53, 60, 72, 84, 150, 180, 225)
    switch (difficulty) {
      case 'gey':
        // GEY (Level 1): Weakest (15 PWR only), total = 75 PWR
        const weakest = sorted.filter(c => (c.power || 0) === 15);
        pickedDealer = weakest.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        devLog('~ GEY: 15 PWR only');
        devLog('  Available:', weakest.length);
        devLog('  Picked 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        devLog('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'goofy':
        // GOOFY (Level 2): Weak (18-21 PWR), total ~90-105 PWR
        const weak = sorted.filter(c => {
          const p = c.power || 0;
          return p === 18 || p === 21;
        });
        if (weak.length >= HAND_SIZE) {
          pickedDealer = weak.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        } else {
          // Fallback: expand to include nearby power values (15-38 range)
          devLog('  ! Not enough 18-21 PWR cards, using expanded range');
          const weakExpanded = sorted.filter(c => {
            const p = c.power || 0;
            return p >= 18 && p <= 38;
          });
          pickedDealer = weakExpanded.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        }
        devLog('∿ GOOFY: 18-21 PWR');
        devLog('  Available:', weak.length);
        devLog('  Picked 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        devLog('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'gooner':
        // GOONER (Level 3): Medium (60-72 PWR), total ~300-360 PWR
        const medium = sorted.filter(c => {
          const p = c.power || 0;
          return p === 60 || p === 72;
        });
        pickedDealer = medium.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        devLog('† GOONER: 60-72 PWR');
        devLog('  Available:', medium.length);
        devLog('  Picked 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        devLog('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'gangster':
        // GANGSTER (Level 4): Strong legendaries (150 PWR only, total 750)
        // Filter cards with exactly 150 power
        const cards150 = sorted.filter(c => (c.power || 0) === 150);
        devLog('‡ GANGSTER DEBUG:');
        devLog('  Total cards in sorted:', sorted.length);
        devLog('  Cards with 150 PWR:', cards150.length);
        if (cards150.length > 0) {
          devLog('  First 3 cards with 150 PWR:', cards150.slice(0, 3).map(c => `#${c.tokenId} (${c.power} PWR, ${c.rarity})`));
        }

        if (cards150.length >= HAND_SIZE) {
          // Randomize to add variety
          pickedDealer = cards150.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
          devLog('  ✓ Picked', HAND_SIZE, 'random cards from 150 PWR pool');
        } else {
          // Fallback: pick legendaries
          devLog('  ! Not enough 150 PWR cards, using legendaries fallback');
          const legendaries = sorted.filter(c => {
            const r = (c.rarity || '').toLowerCase();
            return r.includes('legend');
          });
          devLog('  Legendaries found:', legendaries.length);
          pickedDealer = legendaries.slice(0, HAND_SIZE);
        }
        devLog('‡ GANGSTER FINAL:', pickedDealer.length, 'cards picked');
        devLog('  Cards:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        devLog('  Total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;

      case 'gigachad':
        // GIGACHAD (Level 5): TOP 5 STRONGEST (always same cards, total ~855)
        pickedDealer = sorted.slice(0, HAND_SIZE);
        devLog('§ GIGACHAD picked top 5:', pickedDealer.map(c => `#${c.tokenId} (${c.power} PWR)`));
        devLog('§ GIGACHAD total PWR:', pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0));
        break;
    }

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

                  ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);
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
              console.log('[DEBUG PvE Elimination] coinsEarned:', coinsEarned, 'finalResult:', finalResult);

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
            ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);
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

  const saveDefenseDeck = useCallback(async () => {
    if (!address || !userProfile || selectedCards.length !== HAND_SIZE) return;

    try {
      // ✓ Verify profile exists in Convex first
      // 🚀 BANDWIDTH FIX: userProfile already verified at function start (line 2398)
      devLog('✓ Profile verified:', userProfile.username);

      // ✓ Validate all cards have required data
      const invalidCards = selectedCards.filter(card =>
        !card.tokenId ||
        typeof card.power !== 'number' ||
        isNaN(card.power) ||
        !card.imageUrl ||
        card.imageUrl === 'undefined' ||
        card.imageUrl === ''
      );

      if (invalidCards.length > 0) {
        devError('✗ Invalid cards detected:', invalidCards);
        toast.error(`${invalidCards.length} card(s) have invalid data (missing image or power). Please refresh and try again.`);
        return;
      }

      // ✓ MUDANÇA: Salvar objetos completos ao invés de apenas tokenIds
      const defenseDeckData = selectedCards.map(card => {
        const hasFoil = card.foil && card.foil !== 'None' && card.foil !== '';
        return {
          tokenId: String(card.tokenId),
          power: Number(card.power) || 0,
          imageUrl: String(card.imageUrl),
          name: card.name || `Card #${card.tokenId}`,
          rarity: card.rarity || 'Common',
          foil: hasFoil ? String(card.foil) : undefined,
        };
      });

      devLog('💾 Saving defense deck:', {
        address,
        cardCount: defenseDeckData.length,
        cards: defenseDeckData.map(c => ({
          tokenId: c.tokenId,
          power: c.power,
          foil: c.foil,
          imageUrl: c.imageUrl.substring(0, 50) + '...'
        }))
      });

      // ✓ Try to save with retry logic
      let saveSuccess = false;
      let lastError: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          setDefenseDeckSaveStatus(`Saving... (Attempt ${attempt}/3)`);
          devLog(`📡 Attempt ${attempt}/3 to save defense deck...`);
          await ConvexProfileService.updateDefenseDeck(address, defenseDeckData);
          devLog(`✓ Defense deck saved successfully on attempt ${attempt}`);
          saveSuccess = true;
          setDefenseDeckSaveStatus('');
          break;
        } catch (err: any) {
          lastError = err;
          devError(`✗ Attempt ${attempt}/3 failed:`, err);

          // If it's the last attempt, throw
          if (attempt === 3) {
            setDefenseDeckSaveStatus('');
            throw err;
          }

          // Wait before retry (exponential backoff)
          setDefenseDeckSaveStatus(`Retrying in ${attempt} second(s)...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }

      if (saveSuccess) {
        if (soundEnabled) AudioManager.buttonSuccess();
        setShowDefenseDeckSaved(true);

        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowDefenseDeckSaved(false);
        }, 3000);

        // Reload profile to get updated defense deck
        await refreshProfile();
      }
    } catch (error: any) {
      devError('Error saving defense deck:', error);

      // More helpful error message
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('Server Error') || errorMsg.includes('Request ID')) {
        toast.error('Convex server error. This might be temporary. Please wait a few seconds and try again.');
      } else if (errorMsg.includes('Profile not found')) {
        toast.error('Your profile was not found. Please refresh the page and try again.');
      } else {
        toast.error(`Error saving defense deck: ${errorMsg}. Please try again or refresh the page.`);
      }
    }
  }, [address, userProfile, selectedCards, soundEnabled]);

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

                    ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);

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

  // Profile loading moved to ProfileContext - no local useEffect needed

  // Load missions when address changes or profile becomes available
  // profileDashboard?._id ensures we wait for account creation before loading
  useEffect(() => {
    if (address && profileDashboard) {
      loadMissions();
    }
  }, [address, profileDashboard?._id]);

  // Helper function to get mission info
  const getMissionInfo = (missionType: string) => {
    const missionData: Record<string, { icon: string; title: string; description: string }> = {
      daily_login: {
        icon: '/images/icons/mission.svg',
        title: 'Daily Login',
        description: 'Login bonus for today',
      },
      first_pve_win: {
        icon: '/images/icons/victory.svg',
        title: 'First PvE Victory',
        description: 'Win your first PvE battle today',
      },
      first_pvp_match: {
        icon: '/images/icons/battle.svg',
        title: 'First PvP Match',
        description: 'Complete your first PvP match today',
      },
      streak_3: {
        icon: '/images/icons/achievement.svg',
        title: '3-Win Streak',
        description: 'Win 3 matches in a row',
      },
      streak_5: {
        icon: '/images/icons/achievement.svg',
        title: '5-Win Streak',
        description: 'Win 5 matches in a row',
      },
      streak_10: {
        icon: '/images/icons/achievement.svg',
        title: '10-Win Streak',
        description: 'Win 10 matches in a row',
      },
      welcome_gift: {
        icon: '/images/icons/coins.svg',
        title: 'Welcome Gift',
        description: 'Receive your welcome bonus!',
      },
      vibefid_minted: {
        icon: '/images/icons/achievement.svg',
        title: 'VibeFID Collection',
        description: 'Own at least one VibeFID card!',
      },
      claim_vibe_badge: {
        icon: '/images/icons/achievement.svg',
        title: 'VIBE Badge',
        description: '2x coins in Wanted Cast!',
      },
    };

    return missionData[missionType] || {
      icon: '/images/icons/help.svg',
      title: 'Unknown Mission',
      description: missionType,
    };
  };

  // Function to load missions
  const loadMissions = async () => {
    if (!address) return;

    setIsLoadingMissions(true);
    try {
      // 🚀 BANDWIDTH FIX: Only call these mutations once per session
      const sessionKey = `vbms_missions_init_${address.toLowerCase()}`;
      const today = new Date().toISOString().split('T')[0];
      const cached = sessionStorage.getItem(sessionKey);

      if (cached !== today) {
        // 🚀 BANDWIDTH FIX: Only call ensureWelcomeGift if user doesn't have it yet
        // This saves ~10MB/day by skipping the mutation for users who already have the gift
        if (!userProfile?.hasReceivedWelcomeGift) {
          await convex.mutation(api.missions.ensureWelcomeGift, {
            playerAddress: address,
          });
        }

        // Mark daily login mission as completed (auto-unlock on login)
        await convex.mutation(api.missions.markDailyLogin, {
          playerAddress: address,
        });

        sessionStorage.setItem(sessionKey, today);
      }

      // Get completed missions from database
      const playerMissions = await convex.query(api.missions.getPlayerMissions, {
        playerAddress: address,
      });

      // Define all possible missions (rewards match backend)
      const allMissionTypes = [
        { type: 'daily_login', reward: 100, date: 'today' },
        { type: 'first_pve_win', reward: 50, date: 'today' },
        { type: 'first_pvp_match', reward: 100, date: 'today' },
        { type: 'streak_3', reward: 150, date: 'today' },
        { type: 'streak_5', reward: 300, date: 'today' },
        { type: 'streak_10', reward: 750, date: 'today' },
        { type: 'welcome_gift', reward: 500, date: 'once' },
        { type: 'vibefid_minted', reward: 5000, date: 'once' },
        { type: 'claim_vibe_badge', reward: 0, date: 'once' }, // Badge reward, not coins
      ];

      // Check VIBE badge eligibility (VibeFID holder check)
      // 🚀 BANDWIDTH FIX: Cache badge eligibility per session (rarely changes)
      let vibeBadgeEligibility = null;
      const badgeCacheKey = `vbms_badge_${address.toLowerCase()}`;
      try {
        const cached = sessionStorage.getItem(badgeCacheKey);
        if (cached) {
          vibeBadgeEligibility = JSON.parse(cached);
        }
      } catch (e) { /* ignore */ }

      if (!vibeBadgeEligibility) {
        // 🚀 ON-CHAIN: Now uses action with Alchemy verification
        vibeBadgeEligibility = await convex.action(api.missions.checkVibeBadgeEligibility, {
          playerAddress: address,
        });
        try {
          sessionStorage.setItem(badgeCacheKey, JSON.stringify(vibeBadgeEligibility));
        } catch (e) { /* ignore */ }
      }

      // Merge with existing missions from DB
      const completeMissionsList = allMissionTypes.map((missionDef) => {
        const existingMission = (playerMissions || []).find(
          (m: any) => m.missionType === missionDef.type
        );

        if (existingMission) {
          return existingMission; // Return actual mission from DB
        } else {
          // Special handling for VIBE badge mission
          if (missionDef.type === 'claim_vibe_badge') {
            return {
              _id: `placeholder_${missionDef.type}`,
              missionType: missionDef.type,
              completed: vibeBadgeEligibility?.eligible || false, // Completed if eligible (has VibeFID)
              claimed: vibeBadgeEligibility?.hasBadge || false,   // Claimed if already has badge
              reward: missionDef.reward,
              date: missionDef.date,
            };
          }

          // Return placeholder for locked mission
          return {
            _id: `placeholder_${missionDef.type}`,
            missionType: missionDef.type,
            completed: false,
            claimed: false,
            reward: missionDef.reward,
            date: missionDef.date,
          };
        }
      });

      setMissions(completeMissionsList);
      devLog('📋 Loaded missions:', completeMissionsList);

      // Show daily claim popup if daily_login mission is unclaimed
      const dailyLoginMission = completeMissionsList.find((m: any) => m.missionType === 'daily_login');
      if (dailyLoginMission?.completed && !dailyLoginMission?.claimed) {
        setShowDailyClaimPopup(true);
      }
    } catch (error) {
      devError('Error loading missions:', error);

      // Fallback: Always show locked missions even on error
      const fallbackMissions = [
        { _id: 'placeholder_daily_login', missionType: 'daily_login', completed: false, claimed: false, reward: 100, date: 'today' },
        { _id: 'placeholder_first_pve_win', missionType: 'first_pve_win', completed: false, claimed: false, reward: 50, date: 'today' },
        { _id: 'placeholder_first_pvp_match', missionType: 'first_pvp_match', completed: false, claimed: false, reward: 100, date: 'today' },
        { _id: 'placeholder_streak_3', missionType: 'streak_3', completed: false, claimed: false, reward: 150, date: 'today' },
        { _id: 'placeholder_streak_5', missionType: 'streak_5', completed: false, claimed: false, reward: 300, date: 'today' },
        { _id: 'placeholder_streak_10', missionType: 'streak_10', completed: false, claimed: false, reward: 750, date: 'today' },
        { _id: 'placeholder_welcome_gift', missionType: 'welcome_gift', completed: false, claimed: false, reward: 500, date: 'once' },
        { _id: 'placeholder_vibefid_minted', missionType: 'vibefid_minted', completed: false, claimed: false, reward: 5000, date: 'once' },
        { _id: 'placeholder_claim_vibe_badge', missionType: 'claim_vibe_badge', completed: false, claimed: false, reward: 0, date: 'once' },
      ];
      setMissions(fallbackMissions);
    } finally {
      setIsLoadingMissions(false);
    }
  };

  // Function to claim individual mission
  const claimMission = async (missionId: string, missionType?: string) => {
    if (!address) return;

    // Special handling for VIBE badge claim (before placeholder check because it uses placeholder ID)
    if (missionType === 'claim_vibe_badge') {
      setIsClaimingMission(missionId);
      try {
        // 🚀 ON-CHAIN: Now uses action with Alchemy verification
        const result = await convex.action(api.missions.claimVibeBadge, {
          playerAddress: address,
        });

        if (soundEnabled) AudioManager.buttonSuccess();
        devLog('✅ VIBE Badge claimed:', result);

        // Reload missions and profile to update UI
        await loadMissions();
        await refreshProfile();
      } catch (error: any) {
        devError('Error claiming VIBE badge:', error);
        if (soundEnabled) AudioManager.buttonError();
        toast.error(error.message || 'Failed to claim VIBE badge');
      } finally {
        setIsClaimingMission(null);
      }
      return;
    }

    // Don't try to claim placeholder missions (except VIBE badge which is handled above)
    if (missionId.startsWith('placeholder_')) {
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    setIsClaimingMission(missionId);
    try {
      // Regular mission claim
      const result = await convex.mutation(api.missions.claimMission, {
        playerAddress: address,
        missionId: missionId as any,
        language: lang,
        chain: effectiveChain,
      });

      if (soundEnabled) AudioManager.buttonSuccess();
      devLog('✅ Mission claimed:', result);

      // Fire TX in background, don't block UI
      if (result?.reward > 0) {
        sendMissionTx(result.reward, ARB_CLAIM_TYPE.MISSION); // fire-and-forget
      }

      // Reload missions and profile to update UI
      await loadMissions();
      await refreshProfile();
      } catch (error: any) {
      devError('Error claiming mission:', error);
      if (soundEnabled) AudioManager.buttonError();
      toast.error(error.message || 'Failed to claim mission');
    } finally {
      setIsClaimingMission(null);
    }
  };

  // Function to claim all missions
  const claimAllMissions = async () => {
    if (!address) return;

    setIsClaimingAll(true);
    try {
      const result = await convex.mutation(api.missions.claimAllMissions, {
        playerAddress: address,
        language: lang,
        chain: effectiveChain,
      });

      if (result && result.claimed > 0) {
        if (soundEnabled) AudioManager.buttonSuccess();
        devLog(`✅ Claimed ${result.claimed} missions (+${result.totalReward} coins)`);

        // Fire TX in background, don't block UI
        sendMissionTx(result.totalReward, ARB_CLAIM_TYPE.MISSION); // fire-and-forget

        // Reload missions and profile
        await loadMissions();
        await refreshProfile();
      } else {
        if (soundEnabled) AudioManager.buttonClick();
        toast.error('No missions to claim!');
      }
    } catch (error: any) {
      devError('Error claiming all missions:', error);
      if (soundEnabled) AudioManager.buttonError();
      toast.error(error.message || 'Failed to claim missions');
    } finally {
      setIsClaimingAll(false);
    }
  };

  // Auto scroll to play buttons when 5 cards are selected
  useEffect(() => {
    if (selectedCards.length === 5 && playButtonsRef.current) {
      setTimeout(() => {
        playButtonsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [selectedCards.length]);

  // Update profile stats when NFTs change (with mutex to prevent race conditions)
  useEffect(() => {
    // Guard: Skip if update already in progress
    if (updateStatsInProgress.current) {
      devLog('⏸️ Stats update already in progress, skipping...');
      return;
    }

    if (address && userProfile && nfts.length > 0) {
      updateStatsInProgress.current = true;

      // 🚀 BANDWIDTH FIX v2: SessionStorage cache to skip duplicate updates in same session
      const statsKey = `vbms_stats_${address.toLowerCase()}`;
      const currentHash = `${nfts.length}-${openedCardsCount}-${totalNftPower}`;
      const cachedHash = sessionStorage.getItem(statsKey);

      if (cachedHash === currentHash) {
        devLog('📊 Stats already sent this session, skipping');
        updateStatsInProgress.current = false;
        return;
      }

      // 🚀 Performance: Using pre-computed memoized values
      devLog('📊 Updating profile stats:', { totalCards: nfts.length, openedCards: openedCardsCount, totalPower: totalNftPower, tokenIds: nftTokenIds.length });

      // Calculate collection-specific powers for leaderboard filtering
      const collectionPowers = nfts.reduce((acc, nft) => {
        const collection = nft.collection || 'vibe'; // Default to vibe if no collection specified
        const power = nft.power || 0;

        if (collection === 'vibe') {
          acc.vibePower = (acc.vibePower || 0) + power;
        } else if (collection === 'gmvbrs') {
          acc.vbrsPower = (acc.vbrsPower || 0) + power;
        } else if (collection === 'vibefid') {
          acc.vibefidPower = (acc.vibefidPower || 0) + power;
        }

        return acc;
      }, {} as { vibePower?: number; vbrsPower?: number; vibefidPower?: number });

      devLog('📊 Collection powers:', collectionPowers);

      // 🚀 BANDWIDTH FIX: Only update if stats actually changed from profile
      const currentStats = userProfile?.stats;
      const statsChanged =
        nfts.length !== (currentStats?.totalCards || 0) ||
        totalNftPower !== (currentStats?.totalPower || 0) ||
        openedCardsCount !== (currentStats?.openedCards || 0);

      if (!statsChanged) {
        devLog('📊 Stats unchanged, skipping update');
        sessionStorage.setItem(statsKey, currentHash); // Cache so we skip next time too
        updateStatsInProgress.current = false;
        return;
      }

      const shouldSendTokenIds = nfts.length !== (currentStats?.totalCards || 0);

      if (shouldSendTokenIds) {
        devLog('📊 Token count changed, sending tokenIds:', { stored: currentStats?.totalCards, current: nfts.length });
      }

      // 🚀 BANDWIDTH FIX: Don't reload profile after update
      ConvexProfileService.updateStats(
        address,
        nfts.length,
        openedCardsCount,
        unopenedCardsCount,
        totalNftPower,
        shouldSendTokenIds ? nftTokenIds : undefined, // Only send when count changed
        collectionPowers
      )
        .then(() => {
          // 🚀 BANDWIDTH FIX v2: Cache the stats we just sent
          sessionStorage.setItem(statsKey, currentHash);

          // Update local state with the stats we just sent (no refetch needed)
          if (userProfile) {
            setUserProfile({
              ...userProfile,
              stats: {
                ...userProfile.stats,
                totalCards: nfts.length,
                openedCards: openedCardsCount,
                unopenedCards: unopenedCardsCount,
                totalPower: totalNftPower,
                ...collectionPowers,
              },
            });
          }
        })
        .catch((error) => {
          devError('Error updating profile stats:', error);
        })
        .finally(() => {
          // Always release the lock
          updateStatsInProgress.current = false;
        });
    }
  }, [address, nfts]); // Removed userProfile to prevent infinite loop

  // Leaderboard loading moved to /leaderboard page to reduce queries

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
      console.error('Error cleaning conflicting defense cards:', err);
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
        musicEnabled={musicEnabled}
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
            console.error("Failed to set chain:", e);
          }
        }}
        onChangelogClick={() => setShowChangelog(true)}
        onReportClick={() => setShowReport(true)}
      />

      {/* Changelog Modal */}
      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
        t={t}
      />

      {/* Bug Report Modal */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        t={t}
        address={address}
        fid={farcasterFidState ?? null}
        currentView={currentView}
      />

      {/* Chain Select Modal (first-time) - only if ARB supported */}
      <ChainSelectionModal
        isOpen={showChainModal && arbSupported}
        onClose={async () => {
          if (address) { try { await markChainModalSeenMutation({ address }); } catch {} }
          setShowChainModal(false);
        }}
        onSelectChain={async (chain) => {
          if (!address) return;
          await setPreferredChainMutation({ address, chain });
          await markChainModalSeenMutation({ address });
          const updated = await ConvexProfileService.getProfile(address);
          setUserProfile(updated);
          setShowChainModal(false);
          if (pendingClaimAction) { pendingClaimAction(); setPendingClaimAction(null); }
        }}
      />

      {/* Arb Mode Announcement Modal - REMOVED */}

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

      {/* REMOVED: Referrals Modal - System disabled */}

      {/* Elimination Mode - Card Ordering Screen */}
      <EliminationOrderingModal
        isOpen={eliminationPhase === 'ordering'}
        orderedPlayerCards={orderedPlayerCards}
        setOrderedPlayerCards={setOrderedPlayerCards}
        soundEnabled={soundEnabled}
        onStartBattle={() => {
          // Generate AI card order based on difficulty
          const aiCards = generateAIHand(eliminationDifficulty);
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


      {/* Raid Boss moved to /raid page */}

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

      {/* Old inline tutorial removed - Now using WelcomeOnboarding component */}

      <header className={`tour-header flex flex-col items-center ${isInFarcaster ? 'gap-1 mb-0 py-1.5 w-full max-w-[304px] mx-auto' : 'gap-3 md:gap-6 mb-4 md:mb-8 p-3 md:p-6'} bg-vintage-charcoal/80 border border-vintage-gold/30 rounded-lg ${isInFarcaster ? 'mt-[60px]' : ''}`}>
        {!isInFarcaster && (
          <div className="text-center relative">
            <div className="absolute inset-0 blur-3xl opacity-30 bg-vintage-gold rounded-full" style={{boxShadow: '0 0 80px rgba(255, 215, 0, 0.4)'}}></div>
            <h1 className="relative text-3xl md:text-5xl lg:text-6xl font-display font-black text-vintage-gold tracking-wider mb-1 md:mb-2" style={{textShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)'}}>
            </h1>
            <p className="relative text-xs md:text-sm text-vintage-burnt-gold font-modern tracking-[0.2em] md:tracking-[0.3em] uppercase">{t('cardBattle')}</p>
          </div>
        )}

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
              {/* notification dot when there are unread VibeMails */}
              {typeof unreadVibeMailCount === 'number' && unreadVibeMailCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-vintage-gold z-10" />
              )}
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm font-bold">{t("vibefidMint")}</span>
              </div>
              <span className="text-[10px] md:text-xs opacity-75 font-normal leading-tight">{t('vibefidCheckScore')}</span>
            </button>
          )}

          {!isInFarcaster && (
            <a
              href="https://farcaster.xyz/miniapps/0sNKxskaSKsH/vbms---game-and-wanted-cast"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 md:px-6 py-2.5 md:py-3 border border-vintage-gold/30 text-purple-300 hover:text-purple-100 bg-purple-900/50 hover:bg-purple-800/60 font-modern font-semibold rounded-lg transition-all duration-300 tracking-wider flex items-center gap-2 text-sm md:text-base"
            >
              <span className="text-base md:text-lg">♦</span> {t('tryMiniapp')}
            </a>
          )}
        </div>

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
          />

          {/* Content wrapper */}
          <div className={isInFarcaster ? 'pb-[60px]' : ''}>

          {/* Price Ticker - TOP */}
          {isInFarcaster && (
            <div className="flex flex-col items-center py-1 w-full max-w-[304px] mx-auto mt-2">
              <PriceTicker className="w-full" />
              <AllCollectionsButton className="mt-1" />
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
              />
            </div>
            <div className="tour-cards-section w-full mt-2">
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

          {/* 🏪 Shop View */}
          {/* Shop moved to /shop page */}

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
              setShowTutorial(true);
              // REMOVED: Referral tracking - System disabled
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
                console.log('✅ PvE attempt consumed successfully');
              }
            } catch (error) {
              console.error('❌ Failed to consume PvE attempt:', error);
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

      {/* Easter Egg removed */}

      {/* TEMPORARILY DISABLED - Causing performance issues */}
      {/* <MobileDebugConsole /> */}

      </div>
    </div>
  );
}
 


