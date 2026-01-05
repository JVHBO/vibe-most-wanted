"use client";
// Updated: Removed warning banners
import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
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
import { useAccount, useDisconnect, useConnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery, useMutation, useConvex } from "convex/react";
import { toast } from "sonner";
import { isMiniappMode } from "@/lib/utils/miniapp";

import { api } from "@/convex/_generated/api";
import FoilCardEffect from "@/components/FoilCardEffect";
import DifficultyModal from "@/components/DifficultyModal";
import { ProgressBar } from "@/components/ProgressBar";
import AchievementsView from "@/components/AchievementsView";
// Shop moved to /shop page
import { CreateProfileModal } from "@/components/CreateProfileModal";
import { TutorialModal } from "@/components/TutorialModal";
// WelcomeOnboarding removed - now using only GuidedTour for onboarding
import { GuidedTour, DEFAULT_TOUR_STEPS, type TourStep } from "@/components/GuidedTour";
import { SettingsModal } from "@/components/SettingsModal";
// REMOVED: Referrals system disabled
import { CpuArenaModal } from "@/components/CpuArenaModal";
import { InboxDisplay } from "@/components/InboxDisplay";
import { CoinsInboxDisplay } from "@/components/CoinsInboxDisplay";
import { CoinsInboxModal } from "@/components/CoinsInboxModal";
import { CardMedia } from "@/components/CardMedia";
import { PveCardSelectionModal } from "@/components/PveCardSelectionModal";
import { NotEnoughCardsGuide } from "@/components/NotEnoughCardsGuide";
import { EliminationOrderingModal } from "@/components/EliminationOrderingModal";
import { PvPMenuModals } from "@/components/PvPMenuModals";
import { PvPEntryFeeModal } from "@/components/PvPEntryFeeModal";
import { GamePopups } from "@/components/GamePopups";
import { PvPInRoomModal } from "@/components/PvPInRoomModal";
import { AttackCardSelectionModal } from "@/components/AttackCardSelectionModal";
import { PokerBattleTable } from "@/components/PokerBattleTable";
import { PokerMatchmaking } from "@/components/PokerMatchmaking";
// RaidBossModal moved to /raid page
import { PriceTicker } from "@/components/PriceTicker";
import { AllCollectionsButton } from "@/components/AllCollectionsButton";
import ShameList from "@/components/ShameList";
import BannedScreen from "@/components/BannedScreen";
import { SocialQuestsPanel } from "@/components/SocialQuestsPanel";
// New Home Components
import { HomeHeader, BottomNavigation, GameGrid, CardsPreview, WantedCast } from "@/components/home";
// TEMPORARILY DISABLED - Causing performance issues
// import { MobileDebugConsole } from "@/components/MobileDebugConsole";
import { HAND_SIZE, getMaxAttacks, JC_CONTRACT_ADDRESS as JC_WALLET_ADDRESS, IS_DEV } from "@/lib/config";
// 🚀 Performance-optimized hooks
import { useTotalPower, useSortedByPower, useStrongestCards, usePowerByCollection } from "@/hooks/useCardCalculations";
// 🚀 BANDWIDTH FIX: Cached hooks for infrequent data
import { useCachedDailyQuest } from "@/lib/convex-cache";
// 📝 Development logger (silent in production)
import { devLog, devError, devWarn } from "@/lib/utils/logger";
import { openMarketplace } from "@/lib/marketplace-utils";
// 🔒 Session Lock (prevents multi-device exploit)
import { useSessionLock } from "@/lib/hooks/useSessionLock";
import { SessionLockedModal } from "@/components/SessionLockedModal";
// 🔊 Audio Manager
import { AudioManager } from "@/lib/audio-manager";
// 🎨 Loading Spinner
import LoadingSpinner from "@/components/LoadingSpinner";
import { CardLoadingScreen } from "@/components/CardLoadingScreen";
// 💎 VBMS Blockchain Contracts
import { useApproveVBMS, useCreateBattle, useJoinBattle, useFinishVBMSBattle, useActiveBattle } from "@/lib/hooks/useVBMSContracts";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS"; // Miniapp-compatible balance hook
import { CONTRACTS } from "@/lib/contracts";

import { filterCardsByCollections, getEnabledCollections, COLLECTIONS, getCollectionContract, getCardUniqueId, type CollectionId } from "@/lib/collections/index";
import { findAttr, isUnrevealed, calcPower, normalizeUrl } from "@/lib/nft/attributes";
import { isSameCard, findCard, getCardKey } from "@/lib/nft";
import { getImage, fetchNFTs, clearAllNftCache } from "@/lib/nft/fetcher";
import { convertIpfsUrl } from "@/lib/ipfs-url-converter";
import type { Card } from "@/lib/types/card";
import { RunawayEasterEgg } from "@/components/RunawayEasterEgg";

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

/**
 * Fetch NFTs from all enabled collections
 * Returns all NFTs with collection property set
 */
async function fetchNFTsFromAllCollections(owner: string, onProgress?: (page: number, cards: number) => void): Promise<any[]> {
  const enabledCollections = getEnabledCollections();
  devLog('🎴 Fetching NFTs from', enabledCollections.length, 'enabled collections');

  const allNfts: any[] = [];
  const collectionCounts: Record<string, number> = {};

  for (const collection of enabledCollections) {
    try {
      devLog(`📡 Fetching from ${collection.displayName} (${collection.contractAddress})`);
      const nfts = await fetchNFTs(owner, collection.contractAddress, onProgress);
      // Tag each NFT with its collection
      const tagged = nfts.map(nft => ({ ...nft, collection: collection.id }));
      allNfts.push(...tagged);
      collectionCounts[collection.displayName] = nfts.length;
      devLog(`✓ Found ${nfts.length} NFTs from ${collection.displayName}`);
    } catch (error) {
      collectionCounts[collection.displayName] = -1; // Mark as failed
      devError(`✗ Failed to fetch from ${collection.displayName}:`, error);
    }
  }

  // Log summary for debugging inconsistencies
  console.log('📊 CARD FETCH SUMMARY:', JSON.stringify(collectionCounts));
  console.log(`📊 Total raw NFTs: ${allNfts.length}`);

  devLog(`✅ Total NFTs from all collections: ${allNfts.length}`);
  return allNfts;
}

const NFTCard = memo(({ nft, selected, onSelect, locked = false, lockedReason }: { nft: any; selected: boolean; onSelect: (nft: any) => void; locked?: boolean; lockedReason?: string }) => {
  const tid = nft.tokenId;
  const [imgError, setImgError] = useState(0);

  const getRarityColor = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) return 'from-orange-500 to-yellow-400';
    if (r.includes('epic')) return 'from-purple-500 to-pink-500';
    if (r.includes('rare')) return 'from-blue-500 to-cyan-400';
    return 'from-gray-600 to-gray-500';
  };

  const getRarityRing = (rarity: string) => {
    const r = (rarity || '').toLowerCase();
    if (r.includes('legend')) return 'ring-vintage-gold shadow-gold-lg';
    if (r.includes('epic')) return 'ring-vintage-silver shadow-neon';
    if (r.includes('rare')) return 'ring-vintage-burnt-gold shadow-gold';
    return 'ring-vintage-charcoal shadow-lg';
  };

  const fallbacks = useMemo(() => {
    const allUrls = [];
    if (nft.imageUrl) allUrls.push(nft.imageUrl);
    if (nft?.raw?.metadata?.image) allUrls.push(String(nft.raw.metadata.image));
    [nft?.image?.cachedUrl, nft?.image?.thumbnailUrl, nft?.image?.pngUrl, nft?.image?.originalUrl].forEach((url) => {
      if (url) allUrls.push(String(url));
    });
    if (nft?.metadata?.image) allUrls.push(String(nft.metadata.image));
    allUrls.push(`https://via.placeholder.com/300x420/6366f1/ffffff?text=NFT+%23${tid}`);
    // Allow both absolute URLs (http/https) and relative paths (for FREE cards)
    // Convert IPFS URLs to Filebase gateway for better reliability (VibeFID fix)
    return [...new Set(allUrls)]
      .filter(url => url && !url.includes('undefined') && (url.startsWith('http') || url.startsWith('/')))
      .map(url => convertIpfsUrl(url) || url);
  }, [nft, tid]);

  const currentSrc = fallbacks[imgError] || fallbacks[fallbacks.length - 1];
  const foilValue = (nft.foil || '').trim();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (locked) return; // Don't allow selection if locked
    onSelect(nft);
  }, [nft, onSelect, locked]);

  return (
    <>
      <style>{`
        @keyframes holographic {
          0% {
            background-position: 0% 50%;
            filter: hue-rotate(0deg) brightness(1.2) saturate(1.5);
          }
          25% {
            background-position: 50% 100%;
            filter: hue-rotate(90deg) brightness(1.3) saturate(1.6);
          }
          50% {
            background-position: 100% 50%;
            filter: hue-rotate(180deg) brightness(1.4) saturate(1.7);
          }
          75% {
            background-position: 50% 0%;
            filter: hue-rotate(270deg) brightness(1.3) saturate(1.6);
          }
          100% {
            background-position: 0% 50%;
            filter: hue-rotate(360deg) brightness(1.2) saturate(1.5);
          }
        }

        @keyframes prizePulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 1; }
        }

        @keyframes prizeGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 140, 0, 0.4), 0 0 60px rgba(255, 0, 255, 0.3); }
          50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 140, 0, 0.6), 0 0 90px rgba(255, 0, 255, 0.5); }
        }


        @keyframes cardReflection {
          0% {
            transform: translateX(-200%) translateY(-200%) rotate(45deg);
            opacity: 0;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: translateX(200%) translateY(200%) rotate(45deg);
            opacity: 0;
          }
        }

        @keyframes rainbowShine {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }

        @keyframes rainbowShine {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .prize-card-ring {
          animation: prizeGlow 2s ease-in-out infinite;
        }
      `}</style>
      
      <div
        className={`relative group transition-all duration-300 ${locked ? 'opacity-50 cursor-not-allowed' : selected ? 'scale-95' : 'hover:scale-105'} ${locked ? '' : 'cursor-pointer'}`}
        onClick={handleClick}
        title={locked ? lockedReason : undefined}
        style={{filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6))'}}
      >
        {/* Ring wrapper OUTSIDE overflow-hidden */}
        <div className={`rounded-lg ${
          locked ? 'ring-2 ring-red-500/50' :
          selected ? `ring-4 ${getRarityRing(nft.rarity || '')} shadow-xl` :
          'ring-2 ring-vintage-deep-black/50 hover:ring-vintage-gold/50'
        }`}>
          <FoilCardEffect
            foilType={(foilValue === 'Standard' || foilValue === 'Prize') ? foilValue as 'Standard' | 'Prize' : null}
            className="relative rounded-lg"
          >
            <div style={{boxShadow: 'inset 0 0 10px rgba(255, 215, 0, 0.1)'}} className="rounded-lg overflow-hidden">
            <CardMedia src={currentSrc} alt={`#${tid}`} className="w-full aspect-[2/3] object-cover bg-vintage-deep-black pointer-events-none" loading="lazy" />

            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-1.5 pointer-events-none z-20">
              <div className="flex items-center justify-between">
                <span className={`font-bold text-xs drop-shadow-lg bg-gradient-to-r ${getRarityColor(nft.rarity || '')} bg-clip-text text-transparent`}>{nft.power || 0}</span>
                {selected && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
                    <path d="M20 6L9 17L4 12" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 pointer-events-none z-20">
              {nft.rarity && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-white drop-shadow-lg">
                  {nft.rarity}
                </div>
              )}
            </div>
            {/* Locked overlay for cards in raid deck */}
            {locked && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-30 rounded-lg">
                <div className="text-3xl mb-1">⚔️</div>
                <div className="text-[10px] text-white font-bold bg-red-600/80 px-2 py-0.5 rounded">
                  IN RAID
                </div>
              </div>
            )}
          </div>
          </FoilCardEffect>
        </div>
      </div>
    </>
  );
});

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

  // State for Farcaster context detection
  const [isInFarcaster, setIsInFarcaster] = useState<boolean>(false);
  const [isCheckingFarcaster, setIsCheckingFarcaster] = useState<boolean>(false);

  // 🔧 DEV MODE: Force admin wallet for testing
  const DEV_WALLET_BYPASS = false; // DISABLED: Only for localhost testing
  const address = DEV_WALLET_BYPASS
    ? '0xbb4c7d8b2e32c7c99d358be999377c208cce53c2'
    : wagmiAddress;

  // Debug bypass (removed console.log for production)

  // 🚀 BANDWIDTH FIX: Consolidated dashboard query (replaces 5 separate queries)
  const profileDashboard = useQuery(api.profiles.getProfileDashboard, address ? { address } : "skip");

  // Derived values for backward compatibility
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
  const questProgress = useQuery(api.quests.getQuestProgress, address ? { address } : "skip");

  // 🎯 Weekly Quests & Missions
  const weeklyProgress = useQuery(api.quests.getWeeklyProgress, address ? { address } : "skip");

  // 🎴 Personal missions (VibeFID, welcome gift, etc.)
  const playerMissions = useQuery(api.missions.getPlayerMissions, address ? { playerAddress: address } : "skip");

  // 🚫 Ban check for exploiters
  const banCheck = useQuery(api.blacklist.checkBan, address ? { address } : "skip");

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
          const profile = await ConvexProfileService.getProfile(wagmiAddress);
          if (profile && (!profile.fid || profile.fid !== fid.toString())) {
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
  }, [isInFarcaster, wagmiAddress]);

  // Notify Farcaster SDK that app is ready
  useEffect(() => {
    const initFarcasterSDK = async () => {
      try {
        if (typeof window !== 'undefined') {
          await sdk.actions.ready();
          devLog('✅ Farcaster SDK ready called');
        }
      } catch (error) {
        devError('Error calling Farcaster SDK ready:', error);
      }
    };
    initFarcasterSDK();
  }, []);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [musicVolume, setMusicVolume] = useState<number>(0.1); // Volume padrão 10%
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [showGuidedTour, setShowGuidedTour] = useState<boolean>(false);
  const [sortByPower, setSortByPower] = useState<boolean>(false);
  const [sortAttackByPower, setSortAttackByPower] = useState<boolean>(false);
  const [cardTypeFilter, setCardTypeFilter] = useState<'all' | 'free' | 'nft'>('all');
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [selectedCollections, setSelectedCollections] = useState<CollectionId[]>([]);
  const [nfts, setNfts] = useState<any[]>([]);
  const [jcNfts, setJcNfts] = useState<any[]>([]);
  const [jcNftsLoading, setJcNftsLoading] = useState<boolean>(true);
  const [jcLoadingProgress, setJcLoadingProgress] = useState<{page: number, cards: number} | null>(null);
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const [status, setStatus] = useState<string>("idle");
  const [skippedCardLoading, setSkippedCardLoading] = useState<boolean>(false);
  
  // Check sessionStorage on mount to skip loading if already loaded this session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const alreadyLoaded = sessionStorage.getItem('vbms_cards_loaded') === 'true';
      if (alreadyLoaded) {
        setSkippedCardLoading(true);
      }
    }
  }, []);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<any[]>([]);
  const [playerPower, setPlayerPower] = useState<number>(0);
  const [dealerPower, setDealerPower] = useState<number>(0);
  const [result, setResult] = useState<string>('');
  const [isBattling, setIsBattling] = useState<boolean>(false);
  const [dealerCards, setDealerCards] = useState<any[]>([]);
  const [showBattleScreen, setShowBattleScreen] = useState<boolean>(false);
  const [battlePhase, setBattlePhase] = useState<string>('cards');
  const [battleOpponentName, setBattleOpponentName] = useState<string>('Dealer');
  const [battlePlayerName, setBattlePlayerName] = useState<string>('You');
  const [battlePlayerPfp, setBattlePlayerPfp] = useState<string | null>(null);
  const [battleOpponentPfp, setBattleOpponentPfp] = useState<string | null>(null);
  const [showLossPopup, setShowLossPopup] = useState<boolean>(false);
  const [showWinPopup, setShowWinPopup] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Miniapp: 12 cards (1.5 rows), Website: 24 cards (3 full rows of 8)
  const CARDS_PER_PAGE = isInFarcaster ? 12 : 24;

  // 🎉 Victory Images - 5 screens!
  const VICTORY_IMAGES = [
    '/victory-1.jpg',   // Gigachad
    '/victory-2.jpg',   // Hearts
    '/victory-3.jpg',   // Sensual
    '/littlebird.mp4',  // Little Bird (video)
    '/bom.jpg',         // Bom
  ];
  const [currentVictoryImage, setCurrentVictoryImage] = useState<string>(VICTORY_IMAGES[0]);
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastVictoryIndexRef = useRef<number>(-1); // Track last victory screen to prevent consecutive duplicates

  // PvP States
  const [gameMode, setGameMode] = useState<'ai' | 'pvp' | null>(null);
  const [pvpMode, setPvpMode] = useState<'menu' | 'pvpMenu' | 'autoMatch' | 'selectMode' | 'createRoom' | 'joinRoom' | 'inRoom' | null>(null);
  const [modeMenuOpen, setModeMenuOpen] = useState<'poker' | 'battle' | 'boss' | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedRoomMode, setSelectedRoomMode] = useState<'ranked' | 'casual'>('ranked');

  // AI Difficulty (5 levels with progressive unlock)
  const [aiDifficulty, setAiDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>('gey');
  const [eliminationDifficulty, setEliminationDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>('gey');
  const [pokerCpuDifficulty, setPokerCpuDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>('gey');

  // Convex client for imperative queries
  const convex = useConvex();

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
  const strongestJcNftsForPoker = useStrongestCards(jcNfts, 10); // Poker Battle needs 10 cards

  // Economy mutations
  const awardPvECoins = useMutation(api.economy.awardPvECoins);
  const awardPvPCoins = useMutation(api.economy.awardPvPCoins);
  const recordAttackResult = useMutation(api.economy.recordAttackResult); // ⚛️ ATOMIC: Combines coins + match + profile update
  const claimLoginBonus = useMutation(api.economy.claimLoginBonus);
  const payEntryFee = useMutation(api.economy.payEntryFee);
  const claimQuestReward = useMutation(api.quests.claimQuestReward);

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

  // 🎁 Welcome Pack (enabled in miniapp too)
  // 🚀 BANDWIDTH FIX: Use profileDashboard instead of separate query
  const hasReceivedWelcomePack = profileDashboard?.hasReceivedWelcomePack ?? undefined;
  const claimWelcomePack = useMutation(api.welcomePack.claimWelcomePack);

  // 🎯 Weekly Quests mutations
  const claimWeeklyReward = useMutation(api.quests.claimWeeklyReward);

  // 🏅 Weekly Leaderboard Rewards (skip in miniapp for performance)
  const weeklyRewardEligibility = useQuery(
    api.quests.checkWeeklyRewardEligibility,
    (address && !isMiniappMode()) ? { address } : "skip"
  );
  const claimWeeklyLeaderboardReward = useMutation(api.quests.claimWeeklyLeaderboardReward);
  const [isClaimingWeeklyReward, setIsClaimingWeeklyReward] = useState<boolean>(false);

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

  // 🔒 Defense Lock System - Get locked cards for Attack/PvP modes
  const attackLockedCards = useQuery(
    api.profiles.getAvailableCards,
    address ? { address, mode: "attack" } : "skip"
  );
  const pvpLockedCards = useQuery(
    api.profiles.getAvailableCards,
    address ? { address, mode: "pvp" } : "skip"
  );

  // 🔒 Defense/Raid Lock System - Cards in raid cannot be used in defense and vice-versa
  const defenseLockedCards = useQuery(
    api.profiles.getLockedCardsForDeckBuilding,
    address ? { address, mode: "defense" } : "skip"
  );
  const defenseLockedTokenIds = useMemo(() =>
    new Set(defenseLockedCards?.lockedTokenIds || []),
    [defenseLockedCards]
  );

  // 🔋 Raid Deck Energy - Check for expired cards to show red dot on button
  const raidDeckEnergy = useQuery(
    api.raidBoss.getPlayerRaidDeck,
    address ? { address } : "skip"
  );
  const hasExpiredRaidCards = useMemo(() => {
    if (!raidDeckEnergy?.cardEnergy) return false;
    const now = Date.now();
    return raidDeckEnergy.cardEnergy.some(
      (ce: { energyExpiresAt: number }) => ce.energyExpiresAt !== 0 && now > ce.energyExpiresAt
    );
  }, [raidDeckEnergy?.cardEnergy]);

  // Clean conflicting cards from defense deck on load
  const cleanConflictingDefense = useMutation(api.profiles.cleanConflictingDefenseCards);

  // 🛡️ Defense Deck Warning - Show popup if player has no defense deck
  const [showDefenseDeckWarning, setShowDefenseDeckWarning] = useState<boolean>(false);
  const [defenseDeckWarningDismissed, setDefenseDeckWarningDismissed] = useState<boolean>(false);

  const [loginBonusClaimed, setLoginBonusClaimed] = useState<boolean>(false);
  const [isClaimingBonus, setIsClaimingBonus] = useState<boolean>(false);
  const [showWelcomePackPopup, setShowWelcomePackPopup] = useState<boolean>(false);
  const [isClaimingWelcomePack, setIsClaimingWelcomePack] = useState<boolean>(false);
  const [isClaimingQuest, setIsClaimingQuest] = useState<boolean>(false);
  const [unlockedDifficulties, setUnlockedDifficulties] = useState<Set<string>>(new Set(['gey']));
  const [isDifficultyModalOpen, setIsDifficultyModalOpen] = useState(false);
  const [tempSelectedDifficulty, setTempSelectedDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad' | null>(null);

  // Elimination Mode States
  const [battleMode, setBattleMode] = useState<'normal' | 'elimination'>('normal');
  const [eliminationPhase, setEliminationPhase] = useState<'ordering' | 'battle' | null>(null);
  const [orderedPlayerCards, setOrderedPlayerCards] = useState<any[]>([]);
  const [orderedOpponentCards, setOrderedOpponentCards] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundResults, setRoundResults] = useState<('win' | 'loss' | 'tie')[]>([]);
  const [eliminationPlayerScore, setEliminationPlayerScore] = useState<number>(0);
  const [eliminationOpponentScore, setEliminationOpponentScore] = useState<number>(0);
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

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState<boolean>(false);
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [isCreatingProfile, setIsCreatingProfile] = useState<boolean>(false);
  // REMOVED: Referral system disabled
  // Leaderboard moved to /leaderboard page
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCpuArena, setShowCpuArena] = useState<boolean>(false);
  // REMOVED: showReferrals - Referral system disabled
  const [showChangeUsername, setShowChangeUsername] = useState<boolean>(false);

  // Missions States
  const [missions, setMissions] = useState<any[]>([]);
  const [isLoadingMissions, setIsLoadingMissions] = useState<boolean>(false);
  const [isClaimingMission, setIsClaimingMission] = useState<string | null>(null);
  const [isClaimingAll, setIsClaimingAll] = useState<boolean>(false);
  const [missionsSubView, setMissionsSubView] = useState<'missions' | 'social'>('social');

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

  // Defense Deck States
  const [showDefenseDeckSaved, setShowDefenseDeckSaved] = useState<boolean>(false);
  const [defenseDeckSaveStatus, setDefenseDeckSaveStatus] = useState<string>(''); // For retry feedback
  const [showDefenseDeckModal, setShowDefenseDeckModal] = useState<boolean>(false);
  const [defenseDeckSortByPower, setDefenseDeckSortByPower] = useState<boolean>(true); // Default to sorted by power
  const [defenseDeckCollection, setDefenseDeckCollection] = useState<CollectionId | 'all'>('all');
  const [showPveCardSelection, setShowPveCardSelection] = useState<boolean>(false);
  const [pveSelectedCards, setPveSelectedCards] = useState<any[]>([]);
  const [pveSortByPower, setPveSortByPower] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [isChangingUsername, setIsChangingUsername] = useState<boolean>(false);

  // PvP Entry Fee Modal
  const [showPvPEntryFeeModal, setShowPvPEntryFeeModal] = useState<boolean>(false);

  // Leaderboard Rewards Info Modal
  const [showLeaderboardRewardsModal, setShowLeaderboardRewardsModal] = useState<boolean>(false);

  // My Cards Modal (for miniapp)
  const [showMyCardsModal, setShowMyCardsModal] = useState<boolean>(false);

  // Attack States
  const [showAttackCardSelection, setShowAttackCardSelection] = useState<boolean>(false);
  const [attackSelectedCards, setAttackSelectedCards] = useState<any[]>([]);
  const [targetPlayer, setTargetPlayer] = useState<UserProfile | null>(null);
  const [attacksRemaining, setAttacksRemaining] = useState<number>(getMaxAttacks(null));
  const [isAttacking, setIsAttacking] = useState<boolean>(false);
  const [isConfirmingCards, setIsConfirmingCards] = useState<boolean>(false);

  // Poker Battle States
  const [showPokerBattle, setShowPokerBattle] = useState<boolean>(false);
  const [pokerMode, setPokerMode] = useState<'cpu' | 'pvp'>('pvp');

  // Raid Boss States
  // Raid Boss moved to /raid page

  // 🚀 Performance: Memoized battle card power totals (for UI display)
  const pveSelectedCardsPower = useTotalPower(pveSelectedCards);
  // Collection power multipliers for leaderboard attacks (VibeFID 10x, VBMS 2x, Nothing 0.5x)
  const calculateLeaderboardAttackPower = (cards: any[]) => {
    return cards.reduce((sum, c) => {
      const multiplier = c.collection === 'vibefid' ? 10 : c.collection === 'vibe' ? 2 : c.collection === 'nothing' ? 0.5 : 1;
      return sum + Math.floor((c.power || 0) * multiplier);
    }, 0);
  };
  const attackSelectedCardsPower = calculateLeaderboardAttackPower(attackSelectedCards);
  const dealerCardsPower = calculateLeaderboardAttackPower(dealerCards); // VibeFID 10x applies to defender too

  // ✅ PvP Preview States
  const [showPvPPreview, setShowPvPPreview] = useState<boolean>(false);
  const [pvpPreviewData, setPvpPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // Notifications States
  const [defensesReceived, setDefensesReceived] = useState<any[]>([]);
  const [unreadDefenses, setUnreadDefenses] = useState<number>(0);

  // Refs for preventing race conditions
  const updateStatsInProgress = useRef(false);

  // Calculate max attacks for current user
  const maxAttacks = useMemo(() => getMaxAttacks(address), [address]);

  // Battle Result States for sharing
  const [lastBattleResult, setLastBattleResult] = useState<{
    result: 'win' | 'loss' | 'tie';
    playerPower: number;
    opponentPower: number;
    opponentName: string;
    opponentTwitter?: string;
    type: 'pve' | 'pvp' | 'attack' | 'defense';
    coinsEarned?: number;
    playerPfpUrl?: string;
    opponentPfpUrl?: string;
  } | null>(null);
  const [showTiePopup, setShowTiePopup] = useState(false);
  const [tieGifLoaded, setTieGifLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDailyClaimPopup, setShowDailyClaimPopup] = useState(false);

  // Reward Choice Modal State
  // Share incentives
  const [sharesRemaining, setSharesRemaining] = useState<number | undefined>(undefined);

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
        const updatedProfile = await ConvexProfileService.getProfile(address);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
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
    video.src = '/tie.mp4';
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
      console.log('[Farcaster] 🔍 Initializing wallet connection...');
      try {
        console.log('[Farcaster] SDK check:', {
          hasSdk: !!sdk,
          hasWallet: !!sdk?.wallet,
          hasEthProvider: !!sdk?.wallet?.ethProvider,
        });

        // CRITICAL: Don't use iframe detection - check if Farcaster SDK is ACTUALLY functional
        // The SDK only exists and works in real Farcaster miniapp context
        if (!sdk || typeof sdk.wallet === 'undefined' || !sdk.wallet.ethProvider) {
          console.log('[Farcaster] ⚠️ Not in Farcaster miniapp - SDK not available');
          setIsInFarcaster(false);
          return;
        }

        // Verify SDK context is valid with a timeout (prevent hanging)
        try {
          const contextPromise = sdk.context;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SDK context timeout')), 2000)
          );

          const context = await Promise.race([contextPromise, timeoutPromise]) as any;

          if (!context || !context.user || !context.user.fid) {
            console.log('[Farcaster] ⚠️ SDK present but invalid context - not in miniapp');
            setIsInFarcaster(false);
            return;
          }

          console.log('[Farcaster] ✅ Farcaster miniapp confirmed - FID:', context.user.fid);
        } catch (contextError) {
          console.log('[Farcaster] ⚠️ Failed to get valid SDK context:', contextError);
          setIsInFarcaster(false);
          return;
        }

        console.log('[Farcaster] ✅ Enabling miniapp mode and connecting wallet');
        setIsInFarcaster(true);
        setIsCheckingFarcaster(true);

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
            alert('⚠️ Erro: Connector Farcaster não encontrado. Por favor, recarregue a página.');
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
      }
    };
    initFarcasterWallet();
  }, [connect, connectors]);

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

    // Play audio based on which screen was selected
    if (randomIndex === 0) {
      // victory-1.jpg - Play default win sound
      if (soundEnabled) AudioManager.win();
    } else if (randomIndex === 1) {
      // victory-2.jpg - Play Marvin audio
      const audio = new Audio('/marvin-victory.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => devLog('Audio play failed:', err));
      victoryAudioRef.current = audio;
    } else if (randomIndex === 4) {
      // bom.jpg - Play default win sound
      if (soundEnabled) AudioManager.win();
    }
    // victory-3.jpg (index 2) - audio plays automatically via GamePopups component
    // littlebird.mp4 (index 3) - video has its own audio

    setCurrentVictoryImage(victoryImage);

    // TESTVBMS already added - just show victory
    setShowWinPopup(true);
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
  const handleDailyClaimNow = async () => {
    if (!address || loginBonusClaimed) return;

    try {
      devLog('💎 Daily claim - creating and claiming mission...');

      // Step 1: Create the daily login mission
      const result = await claimLoginBonus({ address });

      if (result.reason?.includes('Mission created')) {
        devLog('✓ Daily mission created');

        // Step 2: Immediately claim all unclaimed missions (including the one just created)
        const claimResult = await convex.mutation(api.missions.claimAllMissions, {
          playerAddress: address,
          language: lang,
        });

        if (claimResult && claimResult.claimed > 0) {
          devLog(`✅ Claimed ${claimResult.claimed} missions (+${claimResult.totalReward} TESTVBMS)`);
          if (soundEnabled) AudioManager.buttonSuccess();

          // Refresh profile to show new balance
          const updatedProfile = await ConvexProfileService.getProfile(address);
          setUserProfile(updatedProfile);
        }

        setLoginBonusClaimed(true);
      } else if (result.awarded > 0) {
        // Old flow - already paid
        devLog(`✓ Login bonus claimed: +${result.awarded} $TESTVBMS`);
        setLoginBonusClaimed(true);
        if (soundEnabled) AudioManager.buttonClick();
      } else {
        devLog(`! ${result.reason}`);
        if (soundEnabled) AudioManager.buttonError();
      }
    } catch (error) {
      devError('✗ Error claiming daily bonus:', error);
      if (soundEnabled) AudioManager.buttonError();
    }
  };

  // 🎁 Handler to claim welcome pack
  const handleClaimWelcomePack = async () => {
    if (!address || isClaimingWelcomePack) return;

    try {
      setIsClaimingWelcomePack(true);
      devLog('🎁 Claiming welcome pack...');

      const result = await claimWelcomePack({ address });

      devLog('✓ Welcome pack claimed: 1 Basic Pack!');
      setShowWelcomePackPopup(false);
      if (soundEnabled) AudioManager.buttonClick();
    } catch (error: any) {
      devError('✗ Error claiming welcome pack:', error);
      alert(error.message || 'Failed to claim welcome pack');
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingWelcomePack(false);
    }
  };

  // 🎯 Handler to claim daily quest reward
  const handleClaimQuestReward = async () => {
    if (!address || isClaimingQuest) return;

    try {
      setIsClaimingQuest(true);
      devLog('🎯 Claiming quest reward...');

      const result = await claimQuestReward({ address });

      devLog(`✓ Quest reward claimed: +${result.reward} $TESTVBMS`);
      if (soundEnabled) AudioManager.buttonClick();
    } catch (error: any) {
      devError('✗ Error claiming quest reward:', error);
      alert(error.message || 'Failed to claim quest reward');
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setIsClaimingQuest(false);
    }
  };

  // 🏅 Handler to claim weekly leaderboard reward
  const handleClaimWeeklyLeaderboardReward = async () => {
    if (!address || isClaimingWeeklyReward) return;

    try {
      setIsClaimingWeeklyReward(true);
      devLog('🏅 Claiming weekly leaderboard reward...');

      const result = await claimWeeklyLeaderboardReward({ address });

      devLog(`✓ Weekly reward claimed: Rank #${result.rank} → +${result.reward} $TESTVBMS`);
      if (soundEnabled) AudioManager.buttonClick();
    } catch (error: any) {
      devError('✗ Error claiming weekly reward:', error);
      alert(error.message || 'Failed to claim weekly reward');
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
  type GameMode = 'poker-cpu' | 'battle-ai' | 'mecha' | 'raid';
  const handleGameModeSelect = (mode: GameMode) => {
    if (!userProfile) {
      setShowCreateProfile(true);
      return;
    }
    if (soundEnabled) AudioManager.buttonClick();

    switch (mode) {
      case 'poker-cpu':
        setPokerMode('cpu');
        setTempSelectedDifficulty(pokerCpuDifficulty);
        setIsDifficultyModalOpen(true);
        break;
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

  // 🎁 Show welcome pack popup if user hasn't received it (only AFTER profile is created)
  useEffect(() => {
    if (address && userProfile && hasReceivedWelcomePack === false) {
      setShowWelcomePackPopup(true);
    }
  }, [address, userProfile, hasReceivedWelcomePack]);

  // 🛡️ Show defense deck warning if player has no defense deck set up
  useEffect(() => {
    console.log('[DEBUG] Defense deck check:', {
      hasAddress: !!address,
      hasProfile: !!userProfile,
      hasDefenseDeck: userProfile?.hasDefenseDeck,
      defenseDeckLength: userProfile?.defenseDeck?.length,
      dismissed: defenseDeckWarningDismissed,
      nftsCount: nfts.length
    });
    // Only show if: has profile, no defense deck, hasn't been dismissed, and has cards to select
    if (
      address &&
      userProfile &&
      !userProfile.hasDefenseDeck &&
      !defenseDeckWarningDismissed &&
      nfts.length >= 5 // Only show if player has enough cards
    ) {
      console.log('[DEBUG] Showing defense deck warning - hasDefenseDeck is FALSE');
      // Small delay to not overwhelm with popups
      const timer = setTimeout(() => {
        setShowDefenseDeckWarning(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [address, userProfile, defenseDeckWarningDismissed, nfts.length]);

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

  // Sync login bonus claimed status and show popup on login
  useEffect(() => {
    if (playerEconomy?.dailyLimits?.loginBonus) {
      setLoginBonusClaimed(true);
    } else {
      setLoginBonusClaimed(false);
      // Show daily claim popup on login if bonus not claimed
      if (address && userProfile && playerEconomy) {
        setShowDailyClaimPopup(true);
      }
    }
  }, [playerEconomy, address, userProfile]);

  // Check for Twitter OAuth success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const twitterConnected = urlParams.get('twitter_connected');
    const error = urlParams.get('error');

    if (twitterConnected) {
      // Check if this is a popup window
      if (window.opener) {
        // This is the popup - send message to parent and close
        window.opener.postMessage({ type: 'twitter_connected', username: twitterConnected }, window.location.origin);
        window.close();
      } else if (userProfile) {
        // This is the main window - update profile
        setUserProfile({ ...userProfile, twitter: twitterConnected });
        // Clean up URL
        window.history.replaceState({}, '', '/');
        // Show success message
        alert(`✓ Twitter connected: @${twitterConnected}`);
      }
    } else if (error === 'twitter_auth_failed') {
      if (window.opener) {
        // This is the popup - notify parent and close
        window.opener.postMessage({ type: 'twitter_error' }, window.location.origin);
        window.close();
      } else {
        alert('✗ Failed to connect Twitter. Please try again.');
        window.history.replaceState({}, '', '/');
      }
    }

    // Listen for messages from OAuth popup
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'twitter_connected') {
        devLog('✓ Twitter connected via popup:', event.data.username);
        if (address) {
          // Reload profile from Convex to get the updated Twitter handle
          ConvexProfileService.getProfile(address).then((profile) => {
            if (profile) {
              setUserProfile(profile);
              devLog('✓ Profile reloaded with Twitter:', profile.twitter);
            }
          });
        }
      } else if (event.data.type === 'twitter_error') {
        alert('✗ Failed to connect Twitter. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userProfile, address]);

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

  const loadNFTs = useCallback(async () => {
    if (!address) {
      devLog('! loadNFTs called but no address');
      return;
    }
    devLog('🎴 Starting to load NFTs for address:', address);
    try {
      setStatus("fetching");
      setErrorMsg(null);

      // 🔗 MULTI-WALLET: Get all linked addresses first
      let allAddresses: string[] = [address];
      try {
        const linkedData = await convex.query(api.profiles.getLinkedAddresses, { address });
        if (linkedData?.primary) {
          // Build array of all addresses: primary + linked
          allAddresses = [linkedData.primary, ...(linkedData.linked || [])];
          // Remove duplicates (case-insensitive) and ensure current address is included
          const seen = new Set<string>();
          allAddresses = allAddresses.filter(addr => {
            const lower = addr.toLowerCase();
            if (seen.has(lower)) return false;
            seen.add(lower);
            return true;
          });
          if (!allAddresses.some(a => a.toLowerCase() === address.toLowerCase())) {
            allAddresses.push(address);
          }
        }
        devLog(`🔗 [Page] Fetching from ${allAddresses.length} wallet(s):`, allAddresses.map(a => a.slice(0,8)));
      } catch (error) {
        devWarn('⚠️ Failed to get linked addresses, using current only:', error);
      }

      // Fetch NFTs from all linked wallets
      devLog('📡 Fetching NFTs from all enabled collections...');
      let raw: any[] = [];
      for (const walletAddr of allAddresses) {
        const walletNfts = await fetchNFTsFromAllCollections(walletAddr);
        // Tag each NFT with owner address
        const tagged = walletNfts.map(nft => ({ ...nft, ownerAddress: walletAddr.toLowerCase() }));
        raw.push(...tagged);
        devLog(`✓ Wallet ${walletAddr.slice(0,8)}...: ${walletNfts.length} NFTs`);
      }
      devLog('✓ Received NFTs from all wallets:', raw.length);

      const METADATA_BATCH_SIZE = 50;
      const enrichedRaw = [];

      for (let i = 0; i < raw.length; i += METADATA_BATCH_SIZE) {
        const batch = raw.slice(i, i + METADATA_BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (nft) => {
            const tokenUri = nft?.tokenUri?.gateway || nft?.raw?.tokenUri;
            if (!tokenUri) return nft;
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 2000);
              const res = await fetch(tokenUri, { signal: controller.signal });
              clearTimeout(timeoutId);
              if (res.ok) {
                const metadata = await res.json();
                return { ...nft, metadata: metadata, raw: { ...nft.raw, metadata: metadata } };
              }
            } catch (error) {
              devWarn(`⚠️ Failed to refresh metadata for NFT #${nft.tokenId}:`, error);
            }
            return nft;
          })
        );
        enrichedRaw.push(...batchResults);
      }

      // Filter unopened cards AFTER metadata refresh (not before)
      // This ensures we have fresh attributes to check
      const revealed = enrichedRaw.filter((nft) => {
        const rarity = findAttr(nft, 'rarity').toLowerCase();
        const status = findAttr(nft, 'status').toLowerCase();
        // Keep cards that are NOT unopened
        return rarity !== 'unopened' && status !== 'unopened';
      });

      const filtered = enrichedRaw.length - revealed.length;
      setFilteredCount(filtered);
      devLog(`📊 NFT Stats: Total=${enrichedRaw.length}, Revealed=${revealed.length}, Filtered=${filtered}`);


      const IMAGE_BATCH_SIZE = 50;
      const processed = [];

      for (let i = 0; i < revealed.length; i += IMAGE_BATCH_SIZE) {
        const batch = revealed.slice(i, i + IMAGE_BATCH_SIZE);
        const enriched = await Promise.all(
          batch.map(async (nft) => {
            // 🎯 CRITICAL: Detect collection from contract address FIRST
            let collection: CollectionId = 'vibe'; // default
            const contractAddr = nft?.contract?.address?.toLowerCase();
            const isVibeFID = contractAddr === getCollectionContract('vibefid')?.toLowerCase();

            // 🎬 Get image URL - getImage handles VibeFID video detection automatically
            let imageUrl: string;
            if (isVibeFID) {
              // VibeFID: Use getImage with 'vibefid' hint for video URL detection
              imageUrl = await getImage(nft, 'vibefid');
            } else {
              imageUrl = await getImage(nft);
            }

            if (contractAddr) {
              if (isVibeFID) {
                collection = 'vibefid';
              } else if (contractAddr === getCollectionContract('americanfootball')?.toLowerCase()) {
                collection = 'americanfootball';
              } else if (contractAddr === getCollectionContract('gmvbrs')?.toLowerCase()) {
                collection = 'gmvbrs';
              } else if (contractAddr === getCollectionContract('viberotbangers')?.toLowerCase()) {
                collection = 'viberotbangers';
              } else if (contractAddr === getCollectionContract('cumioh')?.toLowerCase()) {
                collection = 'cumioh';
              } else if (contractAddr === getCollectionContract('historyofcomputer')?.toLowerCase()) {
                collection = 'historyofcomputer';
              } else if (contractAddr === getCollectionContract('vibefx')?.toLowerCase()) {
                collection = 'vibefx';
              } else if (contractAddr === getCollectionContract('baseballcabal')?.toLowerCase()) {
                collection = 'baseballcabal';
              } else if (contractAddr === getCollectionContract('tarot')?.toLowerCase()) {
                collection = 'tarot';
              
              } else if (contractAddr === getCollectionContract('teampothead')?.toLowerCase()) {
                collection = 'teampothead';
              } else if (contractAddr === getCollectionContract('poorlydrawnpepes')?.toLowerCase()) {
                collection = 'poorlydrawnpepes';
              } else if (contractAddr === getCollectionContract('meowverse')?.toLowerCase()) {
                collection = 'meowverse';
              } else if (contractAddr === getCollectionContract('viberuto')?.toLowerCase()) {
                collection = 'viberuto';
              }
            }

            return {
              ...nft,
              imageUrl,
              name: nft.title || nft.name || `Card #${nft.tokenId}`, // Add name for Card type compatibility
              collection, // 🎯 ADD COLLECTION FIELD
              rarity: findAttr(nft, 'rarity'),
              status: findAttr(nft, 'status'),
              wear: findAttr(nft, 'wear'),
              foil: findAttr(nft, 'foil'),
              power: calcPower(nft, isVibeFID),
              badgeType: 'NFT', // Explicitly mark as NFT (not FREE_CARD)
              isFreeCard: false, // Explicitly mark as not a free card
            };
          })
        );
        processed.push(...enriched);
      }

      // Load FREE cards from cardInventory
      try {
        const freeCards = await convex.query(api.cardPacks.getPlayerCards, { address });
        devLog('🆓 FREE cards loaded:', freeCards?.length || 0);

        if (freeCards && freeCards.length > 0) {
          const freeCardsFormatted = freeCards.map((card: any) => ({
            tokenId: card.cardId,
            title: `FREE ${card.rarity} Card`,
            name: card.name || `FREE ${card.rarity} Card`, // Add name for Card type compatibility
            description: `Free card from pack opening`,
            imageUrl: card.imageUrl,
            rarity: card.rarity,
            status: 'revealed',
            wear: card.wear,
            foil: card.foil || 'None',
            power: card.power,
            badgeType: card.badgeType, // 'FREE_CARD'
            isFreeCard: true,
            collection: 'nothing', // Collection for filtering
          }));
          processed.push(...freeCardsFormatted);
        }
      } catch (error) {
        devWarn('⚠️ Failed to load FREE cards:', error);
      }

      // 🔒 DEDUPLICATION: Remove duplicate cards (same collection + tokenId)
      const seenCards = new Set<string>();
      const deduplicated = processed.filter((card: any) => {
        const uniqueId = `${card.collection || 'vibe'}_${card.tokenId}`;
        if (seenCards.has(uniqueId)) {
          devLog(`⚠️ Removing duplicate card: ${uniqueId}`);
          return false;
        }
        seenCards.add(uniqueId);
        return true;
      });

      if (processed.length !== deduplicated.length) {
        devLog(`📊 Deduplication: ${processed.length} -> ${deduplicated.length} cards`);
      }

      setNfts([...deduplicated]);
      setStatus("loaded");
      // Mark cards as loaded for this session (prevents loading screen on navigation)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vbms_cards_loaded', 'true');
      }
      // DETAILED LOGGING for debugging inconsistency
      console.log('📊 FINAL CARD COUNT SUMMARY:');
      console.log(`   Raw from collections: ${raw.length}`);
      console.log(`   After metadata refresh: ${enrichedRaw.length}`);
      console.log(`   After unopened filter: ${revealed.length} (filtered ${filtered})`);
      console.log(`   After image processing + FREE: ${processed.length}`);
      console.log(`   After deduplication: ${deduplicated.length}`);
      devLog('🎉 Cards loaded successfully (NFTs + FREE):', deduplicated.length);

      // Check if player has VibeFID and mark achievement
      const hasVibeFID = processed.some((card: any) => card.collection === 'vibefid');
      if (hasVibeFID && address) {
        try {
          await convex.mutation(api.missions.markVibeFIDMinted, {
            playerAddress: address.toLowerCase(),
          });
          devLog('✅ VibeFID achievement checked');
        } catch (error) {
          devWarn('⚠️ Failed to mark VibeFID achievement:', error);
        }
      }
    } catch (e: any) {
      devLog('✗ Error loading NFTs:', e);
      setStatus("failed");
      setErrorMsg(e.message);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      devLog('📦 Address changed, loading NFTs:', address);
      loadNFTs();
    }
  }, [address, loadNFTs]);

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
      alert('AI deck not ready yet...');
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

    // Calculate player power (one-time calculation per battle, no need for memoization)
    const playerTotal = cards.reduce((sum, c) => sum + (c.power || 0), 0);
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
      alert('Loading AI deck... Please try again in a moment.');
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

    const dealerTotal = pickedDealer.reduce((sum, c) => sum + (c.power || 0), 0);

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

        setPlayerPower(playerCard.power || 0);
        setDealerPower(opponentCard.power || 0);

        setBattlePhase('clash');
        if (soundEnabled) AudioManager.cardBattle();
      }, 2500);

      setTimeout(() => {
        const playerCard = orderedPlayerCards[currentRound - 1];
        const opponentCard = orderedOpponentCards[currentRound - 1];
        const playerCardPower = playerCard?.power || 0;
        const opponentCardPower = opponentCard?.power || 0;

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
                setTimeout(() => {
                  if (finalResult === 'win') {
                    showVictory();
                  } else if (finalResult === 'loss') {
                    setShowLossPopup(true);
                    if (soundEnabled) AudioManager.lose();
                  } else {
                    setShowTiePopup(true);
                    if (soundEnabled) AudioManager.tie();
                  }
                }, 100);
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

                setPlayerPower(nextPlayerCard?.power || 0);
                setDealerPower(nextOpponentCard?.power || 0);

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
          setTimeout(() => {
            if (matchResult === 'win') {
              showVictory();
            } else if (matchResult === 'loss') {
              setShowLossPopup(true);
              if (soundEnabled) AudioManager.lose();
            } else {
              setShowTiePopup(true);
              if (soundEnabled) AudioManager.tie();
            }
          }, 100);
        }, 2000);
      })();
    }, 4500);
  }, [selectedCards, nfts, t, soundEnabled, isBattling, aiDifficulty, address, userProfile]);

  const saveDefenseDeck = useCallback(async () => {
    if (!address || !userProfile || selectedCards.length !== HAND_SIZE) return;

    try {
      // ✓ Verify profile exists in Convex first
      devLog('🔍 Verifying profile exists...');
      const existingProfile = await ConvexProfileService.getProfile(address);
      if (!existingProfile) {
        devError('✗ Profile not found in Convex!');
        alert('Error: Your profile was not found. Please create a profile first.');
        return;
      }
      devLog('✓ Profile verified:', existingProfile.username);

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
        alert(`Error: ${invalidCards.length} card(s) have invalid data (missing image or power). Please refresh the page and try again.`);
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
        const updatedProfile = await ConvexProfileService.getProfile(address);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
      }
    } catch (error: any) {
      devError('Error saving defense deck:', error);

      // More helpful error message
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('Server Error') || errorMsg.includes('Request ID')) {
        alert('Error: Convex server error. This might be temporary. Please wait a few seconds and try again.');
      } else if (errorMsg.includes('Profile not found')) {
        alert('Error: Your profile was not found. Please refresh the page and try again.');
      } else {
        alert(`Error saving defense deck: ${errorMsg}\n\nPlease try again or refresh the page.`);
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

    // Apply sort
    if (!sortByPower) return filtered;
    return [...filtered].sort((a, b) => (b.power || 0) - (a.power || 0));
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
  const sortedAttackNfts = useMemo(() => {
    if (!sortAttackByPower) return nfts;
    return [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
  }, [nfts, sortAttackByPower]);

  // Helper to check if card is locked - VibeFID cards are exempt (can be used anywhere)
  // Now takes a card object for proper collection+tokenId comparison
  const isCardLocked = (card: { tokenId: string; collection?: string }, mode: 'attack' | 'pvp') => {
    // VibeFID cards are never locked - they can be used in attack even if in defense deck
    if (card?.collection === 'vibefid') return false;

    const lockedCards = mode === 'attack' ? attackLockedCards : pvpLockedCards;
    // Use getCardKey for proper collection+tokenId comparison
    const cardKey = getCardKey(card);
    return (lockedCards?.lockedTokenIds as string[] | undefined)?.includes(cardKey) || false;
  };

  // Sorted NFTs for PvE modal (PvE allows defense cards - NO lock)
  // Always create a new array to trigger proper React updates
  const sortedPveNfts = useMemo(() => {
    const cardsCopy = [...nfts];
    if (pveSortByPower) {
      cardsCopy.sort((a, b) => (b.power || 0) - (a.power || 0));
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
            let opponentTwitter = undefined;
            let opponentPfpUrl = undefined;
            if (opponentAddress) {
              try {
                const opponentProfile = await ConvexProfileService.getProfile(opponentAddress);
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
                  setTimeout(() => {
                    if (matchResult === 'win') {
                      showVictory();
                    } else if (matchResult === 'loss') {
                      setShowLossPopup(true);
                      if (soundEnabled) AudioManager.lose();
                    } else {
                      setShowTiePopup(true);
                      if (soundEnabled) AudioManager.tie();
                    }
                  }, 100);

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

  // Load user profile when wallet connects
  useEffect(() => {
    if (address) {
      setIsLoadingProfile(true);
      console.log('[DEBUG] Loading profile for address:', address);
      ConvexProfileService.getProfile(address).then((profile) => {
        console.log('[DEBUG] Profile loaded:', {
          username: profile?.username,
          hasDefenseDeck: profile?.hasDefenseDeck,
          defenseDeckLength: profile?.defenseDeck?.length,
          address: profile?.address
        });
        setUserProfile(profile);
        setIsLoadingProfile(false);

        // Only show create profile if profile is actually null (not exists in DB)
        if (!profile) {
          devLog('🆕 New user detected - forcing profile creation');
          setShowCreateProfile(true);
        } else {
          setShowCreateProfile(false);
        }

        // Load match history
        if (profile) {
          ConvexProfileService.getMatchHistory(address, 20).then(setMatchHistory);
        }
      });
    } else {
      setUserProfile(null);
      setMatchHistory([]);
      setShowCreateProfile(false);
    }
  }, [address]);

  // Load missions when address changes
  useEffect(() => {
    if (address) {
      loadMissions();
    }
  }, [address]);

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
      // Ensure welcome_gift exists for this player (migration for old users)
      await convex.mutation(api.missions.ensureWelcomeGift, {
        playerAddress: address,
      });

      // Mark daily login mission as completed (auto-unlock on login)
      await convex.mutation(api.missions.markDailyLogin, {
        playerAddress: address,
      });

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
      const vibeBadgeEligibility = await convex.query(api.missions.checkVibeBadgeEligibility, {
        playerAddress: address,
      });

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
        const result = await convex.mutation(api.missions.claimVibeBadge, {
          playerAddress: address,
        });

        if (soundEnabled) AudioManager.buttonSuccess();
        devLog('✅ VIBE Badge claimed:', result);

        // Reload missions and profile to update UI
        await loadMissions();
        const updatedProfile = await ConvexProfileService.getProfile(address);
        setUserProfile(updatedProfile);
      } catch (error: any) {
        devError('Error claiming VIBE badge:', error);
        if (soundEnabled) AudioManager.buttonError();
        alert(error.message || 'Failed to claim VIBE badge');
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
        skipCoins: false, // Send to inbox
      });

      if (soundEnabled) AudioManager.buttonSuccess();
      devLog('✅ Mission claimed:', result);

      // Reload missions and profile to update UI
      await loadMissions();
      const updatedProfile = await ConvexProfileService.getProfile(address);
      setUserProfile(updatedProfile);
    } catch (error: any) {
      devError('Error claiming mission:', error);
      if (soundEnabled) AudioManager.buttonError();
      alert(error.message || 'Failed to claim mission');
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
      });

      if (result && result.claimed > 0) {
        if (soundEnabled) AudioManager.buttonSuccess();
        devLog(`✅ Claimed ${result.claimed} missions (+${result.totalReward} coins)`);

        // Reload missions and profile
        await loadMissions();
        const updatedProfile = await ConvexProfileService.getProfile(address);
        setUserProfile(updatedProfile);
      } else {
        if (soundEnabled) AudioManager.buttonClick();
        alert('No missions to claim!');
      }
    } catch (error: any) {
      devError('Error claiming all missions:', error);
      if (soundEnabled) AudioManager.buttonError();
      alert(error.message || 'Failed to claim missions');
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
        } else if (collection === 'americanfootball') {
          acc.afclPower = (acc.afclPower || 0) + power;
        }

        return acc;
      }, {} as { vibePower?: number; vbrsPower?: number; vibefidPower?: number; afclPower?: number });

      devLog('📊 Collection powers:', collectionPowers);

      // Update stats and reload profile to show updated values
      ConvexProfileService.updateStats(address, nfts.length, openedCardsCount, unopenedCardsCount, totalNftPower, nftTokenIds, collectionPowers)
        .then(() => {
          // Reload profile to get updated stats
          return ConvexProfileService.getProfile(address);
        })
        .then((updatedProfile) => {
          if (updatedProfile) {
            setUserProfile(updatedProfile);
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

  // Cache for collection-based power calculations
  const [collectionPowerCache, setCollectionPowerCache] = useState<Map<string, Map<string, number>>>(new Map());
  const [isCalculatingCollectionPower, setIsCalculatingCollectionPower] = useState(false);

  // Helper to calculate power from NFT attributes (matches nft-fetcher.ts logic)
  const calculateCardPowerFromAttributes = useCallback((nft: any): number => {
    const findAttr = (trait: string): string => {
      const locs = [
        nft?.raw?.metadata?.attributes,
        nft?.metadata?.attributes,
        nft?.metadata?.traits,
        nft?.raw?.metadata?.traits
      ];
      for (const attrs of locs) {
        if (!Array.isArray(attrs)) continue;
        const found = attrs.find((a: any) => {
          const traitType = String(a?.trait_type || a?.traitType || a?.name || '').toLowerCase().trim();
          const searchTrait = trait.toLowerCase().trim();
          return traitType === searchTrait || traitType.includes(searchTrait) || searchTrait.includes(traitType);
        });
        if (found) {
          return String(found?.value || found?.trait_value || found?.displayType || '').trim();
        }
      }
      return '';
    };

    // Check if this is a free card - exclude from power calculation
    const badgeType = findAttr('badgetype') || findAttr('badge_type') || findAttr('badge');
    if (badgeType.toLowerCase().includes('free')) {
      return 0; // Free cards don't contribute to power
    }

    const foil = findAttr('foil') || 'None';
    const rarity = findAttr('rarity') || 'Common';
    const wear = findAttr('wear') || 'Lightly Played';

    // Also check if rarity is explicitly "free"
    if (rarity.toLowerCase().includes('free')) {
      return 0;
    }

    // Base power by rarity
    let base = 5;
    const r = rarity.toLowerCase();
    if (r.includes('mythic')) base = 800;
    else if (r.includes('legend')) base = 240;
    else if (r.includes('epic')) base = 80;
    else if (r.includes('rare')) base = 20;
    else if (r.includes('common')) base = 5;

    // Wear multiplier
    let wearMult = 1.0;
    const w = wear.toLowerCase();
    if (w.includes('pristine')) wearMult = 1.8;
    else if (w.includes('mint')) wearMult = 1.4;

    // Foil multiplier
    let foilMult = 1.0;
    const f = foil.toLowerCase();
    if (f.includes('prize')) foilMult = 15.0;
    else if (f.includes('standard')) foilMult = 2.5;

    const power = base * wearMult * foilMult;
    return Math.max(1, Math.round(power));
  }, []);

  // Calculate power for a specific collection (smart approach: use Alchemy API)
  const calculateCollectionPower = useCallback(async (address: string, collectionId: CollectionId): Promise<number> => {
    // TEMPORARILY DISABLED: Alchemy API calls causing infinite loading
    // Update cache with 0 to prevent infinite calculation loop
    setCollectionPowerCache(prev => {
      const newCache = new Map(prev);
      const addressCache = newCache.get(address) || new Map();
      addressCache.set(collectionId, 0);
      newCache.set(address, addressCache);
      return newCache;
    });

    return 0;

    /* DISABLED CODE - Uncomment when Alchemy API is fixed
    // Check cache first
    const addressCache = collectionPowerCache.get(address);
    if (addressCache?.has(collectionId)) {
      return addressCache.get(collectionId)!;
    }

    try {
      // Get collection contract address from collections config
      const contractAddress = getCollectionContract(collectionId);

      if (!contractAddress) return 0;

      // Fetch NFTs for this collection from Alchemy with retry logic
      let response: Response;
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        response = await fetch(
          `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner?owner=${address}&contractAddresses[]=${contractAddress}&withMetadata=true`
        );

        if (response.status === 429 && retries < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retries) * 1000;
          devLog(`⏳ [Leaderboard] Rate limited for ${address.substring(0, 8)}..., retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }

        break;
      }

      if (!response!.ok) throw new Error(`Alchemy API error: ${response!.status}`);

      const data = await response!.json();
      const nfts = data.ownedNfts || [];

      // Calculate total power from attributes
      let totalPower = 0;
      for (const nft of nfts) {
        const power = calculateCardPowerFromAttributes(nft);
        totalPower += power;
      }

      // Update cache
      setCollectionPowerCache(prev => {
        const newCache = new Map(prev);
        const addressCache = newCache.get(address) || new Map();
        addressCache.set(collectionId, totalPower);
        newCache.set(address, addressCache);
        return newCache;
      });

      return totalPower;
    } catch (error) {
      devError('[Leaderboard] Error calculating collection power:', error);
      return 0;
    }
    */
  }, [collectionPowerCache]);

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
  useEffect(() => {
    if (address && defenseLockedCards?.lockedTokenIds?.length) {
      cleanConflictingDefense({ address }).catch(err => {
        console.error('Error cleaning conflicting defense cards:', err);
      });
    }
  }, [address, defenseLockedCards?.lockedTokenIds?.length, cleanConflictingDefense]);

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
    setShowPokerBattle(false);
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
    <div className="min-h-screen game-background text-vintage-ice p-4 lg:p-6 overflow-x-hidden relative">
      {/* 🔒 Session Lock Modal - blocks everything when another device takes over */}
      {isSessionLocked && (
        <SessionLockedModal
          reason={lockReason}
          onReconnect={forceReconnect}
        />
      )}

      {/* Card Loading Screen - shows while fetching NFTs */}
      <CardLoadingScreen
        isLoading={!skippedCardLoading && nfts.length === 0 && status !== 'loaded'}
        onSkip={() => setSkippedCardLoading(true)}
        cardsLoaded={nfts.length}
      />


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
        showWelcomePackPopup={showWelcomePackPopup}
        setShowWelcomePackPopup={setShowWelcomePackPopup}
        isClaimingWelcomePack={isClaimingWelcomePack}
        handleClaimWelcomePack={handleClaimWelcomePack}
        t={t}
      />

      {/* Defense Deck Warning Popup */}
      {showDefenseDeckWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-vintage-charcoal to-vintage-black border-2 border-vintage-gold rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-display font-bold text-vintage-gold text-center mb-4">
              {t('defenseDeckWarningTitle')}
            </h2>
            <p className="text-vintage-burnt-gold text-center mb-6 font-modern">
              {t('defenseDeckWarningMessage')}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowDefenseDeckWarning(false);
                  setDefenseDeckWarningDismissed(true);
                  // Open defense deck modal
                  setShowDefenseDeckModal(true);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-vintage-gold to-yellow-500 text-vintage-black font-display font-bold text-lg rounded-xl hover:scale-105 transition-all shadow-lg"
              >
                {t('defenseDeckWarningButton')}
              </button>
              <button
                onClick={() => {
                  setShowDefenseDeckWarning(false);
                  setDefenseDeckWarningDismissed(true);
                  if (soundEnabled) AudioManager.buttonNav();
                }}
                className="w-full px-6 py-2 bg-vintage-black/50 text-vintage-gold border border-vintage-gold/30 font-modern rounded-xl hover:bg-vintage-gold/10 transition-all"
              >
                {t('defenseDeckWarningDismiss')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defense Deck Modal */}
      {showDefenseDeckModal && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowDefenseDeckModal(false)}
        >
          <div
            className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-vintage-gold/30">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-display font-bold text-vintage-gold">
                  🛡️ Defense Deck
                </h2>
                <button
                  onClick={() => setShowDefenseDeckModal(false)}
                  className="text-vintage-gold hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-vintage-burnt-gold mt-1">
                Select 5 cards to defend against attacks
              </p>
            </div>

            {/* Not enough cards warning */}
            {nfts.length < HAND_SIZE && (status === "loaded" || status === "failed") && (
              <NotEnoughCardsGuide
                currentCards={nfts.length}
                requiredCards={HAND_SIZE}
                gameMode="defense"
                onClose={() => setShowDefenseDeckModal(false)}
                t={t}
              />
            )}

            {/* Normal UI - only show if enough cards or still loading */}
            {(nfts.length >= HAND_SIZE || status === "fetching" || status === "idle") && (
            <>
            {/* Controls Row: Collection Filter + Sort */}
            <div className="flex-shrink-0 px-4 pt-3 flex flex-wrap items-center justify-center gap-2">
              <select
                value={defenseDeckCollection}
                onChange={(e) => setDefenseDeckCollection(e.target.value as CollectionId | 'all')}
                className="px-3 py-2 rounded-lg text-sm font-modern font-medium bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10 focus:outline-none focus:ring-2 focus:ring-vintage-gold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-gold"
              >
                <option value="all">All Collections</option>
                <option value="vibe">VBMS</option>
                <option value="viberotbangers">BANGER</option>
                <option value="cumioh">CUMIO</option>
                <option value="historyofcomputer">HSTR</option>
                <option value="vibefx">VBFX</option>
                <option value="baseballcabal">BBCL</option>
                <option value="tarot">TRT</option>
                <option value="teampothead">TMPT</option>
                <option value="poorlydrawnpepes">PDP</option>
                <option value="meowverse">MEOVV</option>
                <option value="viberuto">VBRTO</option>
                <option value="vibefid">VIBEFID</option>
                <option value="americanfootball">AFCL</option>
                <option value="gmvbrs">VBRS</option>
                <option value="nothing">NOTHING</option>
              </select>
              <button
                onClick={() => {
                  setDefenseDeckSortByPower(!defenseDeckSortByPower);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  defenseDeckSortByPower
                    ? 'bg-vintage-gold text-vintage-black'
                    : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
                }`}
              >
                {defenseDeckSortByPower ? '⚡ Sorted by Power' : '⚡ Sort by Power'}
              </button>

              {/* Refresh Button */}
              <button
                onClick={async () => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setStatus('idle');
                  setNfts([]);
                  setTimeout(() => loadNFTs(), 0);
                }}
                className="px-4 py-2 rounded-lg font-bold text-sm transition-all bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30 flex items-center gap-1"
                title="Refresh cards"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {/* Selected Cards Preview */}
            <div className="flex-shrink-0 p-4 bg-vintage-felt-green/30 border-b border-vintage-gold/20">
              <div className="grid grid-cols-5 gap-2">
                {selectedCards.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedCards(selectedCards.filter((_, idx) => idx !== i));
                      if (soundEnabled) AudioManager.buttonClick();
                    }}
                    className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-gold shadow-gold cursor-pointer hover:ring-red-500 transition-all group"
                  >
                    <CardMedia src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">{c.power}</div>
                    <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/30 flex items-center justify-center transition-all">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-2xl font-bold">×</span>
                    </div>
                  </div>
                ))}
                {[...Array(HAND_SIZE - selectedCards.length)].map((_, i) => (
                  <div key={`e-${i}`} className="aspect-[2/3] rounded-xl border-2 border-dashed border-vintage-gold/40 flex items-center justify-center text-vintage-gold/50 bg-vintage-felt-green/30">
                    <span className="text-2xl font-bold">+</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="text-vintage-gold font-modern">
                  <span className="font-bold">{selectedCards.length}/{HAND_SIZE}</span> cards selected
                </div>
                <div className="flex gap-2">
                  {nfts.length >= HAND_SIZE && selectedCards.length === 0 && (
                    <button
                      onClick={() => {
                        selectStrongest();
                        if (soundEnabled) AudioManager.buttonSuccess();
                      }}
                      className="px-3 py-1 bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/50 rounded-lg text-xs hover:bg-vintage-gold/30 transition font-modern font-semibold"
                    >
                      Select Strongest
                    </button>
                  )}
                  {selectedCards.length > 0 && (
                    <button
                      onClick={() => {
                        clearSelection();
                        if (soundEnabled) AudioManager.buttonClick();
                      }}
                      className="px-3 py-1 bg-vintage-black/50 text-vintage-gold border border-vintage-gold/50 rounded-lg text-xs hover:bg-vintage-black/70 transition font-modern"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card Grid (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4">
              {(status === "fetching" || nfts.length === 0) ? (
                <div className="flex items-center justify-center min-h-[200px]">
                  <div className="text-center">
                    <LoadingSpinner />
                    <p className="text-vintage-gold/70 text-sm mt-2 font-modern">Loading cards...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {(() => {
                    // Apply collection filter
                    let filteredCards = defenseDeckCollection === 'all' 
                      ? nfts 
                      : filterCardsByCollections(nfts, [defenseDeckCollection as CollectionId]);
                    // Apply power sort
                    if (defenseDeckSortByPower) {
                      filteredCards = [...filteredCards].sort((a, b) => (b.power || 0) - (a.power || 0));
                    }
                    return filteredCards;
                  })().map((nft) => {
                    const isSelected = selectedCards.some(c => isSameCard(c, nft));
                    return (
                      <div
                        key={getCardUniqueId(nft)}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCards(selectedCards.filter(c => !isSameCard(c, nft)));
                          } else if (selectedCards.length < HAND_SIZE) {
                            setSelectedCards([...selectedCards, nft]);
                          }
                          if (soundEnabled) AudioManager.selectCardByRarity(nft.rarity);
                        }}
                        className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-all ${
                          isSelected
                            ? 'ring-4 ring-vintage-gold shadow-gold scale-95 opacity-50'
                            : 'hover:ring-2 hover:ring-vintage-gold/50 hover:scale-105'
                        } ${selectedCards.length >= HAND_SIZE && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <CardMedia src={nft.imageUrl} alt={`#${nft.tokenId}`} className="w-full h-full object-cover" />
                        <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">{nft.power}</div>
                        {isSelected && (
                          <div className="absolute inset-0 bg-vintage-gold/30 flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-vintage-gold/30 flex gap-3">
              <button
                onClick={() => {
                  setShowDefenseDeckModal(false);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className="flex-1 px-4 py-3 bg-vintage-red/80 hover:bg-vintage-red text-white rounded-lg font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await saveDefenseDeck();
                  setShowDefenseDeckModal(false);
                }}
                disabled={selectedCards.length !== HAND_SIZE}
                className={`flex-1 px-4 py-3 rounded-lg font-bold transition ${
                  selectedCards.length === HAND_SIZE
                    ? 'bg-vintage-gold hover:bg-yellow-500 text-vintage-black'
                    : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                }`}
              >
                {selectedCards.length === HAND_SIZE ? 'Save Defense Deck' : `Select ${HAND_SIZE - selectedCards.length} more`}
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* My Cards Modal (for miniapp) */}
      {showMyCardsModal && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-2 pt-14 pb-20"
          onClick={() => setShowMyCardsModal(false)}
        >
          <div
            className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold/50 w-full max-h-full flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 p-3 border-b border-vintage-gold/30">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-display font-bold text-vintage-gold">
                  My Cards ({nfts.length})
                </h2>
                <button
                  onClick={() => setShowMyCardsModal(false)}
                  className="text-vintage-gold hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {nfts.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {nfts.map((nft) => (
                    <div
                      key={getCardUniqueId(nft)}
                      className={`aspect-[2/3] rounded-lg overflow-hidden border-2 ${
                        nft.rarity === 'Mythic' ? 'border-pink-400' :
                        nft.rarity === 'Legendary' ? 'border-yellow-400' :
                        nft.rarity === 'Epic' ? 'border-purple-400' :
                        nft.rarity === 'Rare' ? 'border-blue-400' :
                        'border-vintage-gold/30'
                      }`}
                    >
                      <CardMedia
                        src={nft.imageUrl || ''}
                        alt={nft.name || 'Card'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="text-vintage-gold/50 text-sm">No cards yet</span>
                  <Link
                    href="/shop"
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setShowMyCardsModal(false);
                    }}
                    className="mt-4 px-4 py-2 bg-vintage-gold text-vintage-black rounded-lg font-semibold text-sm"
                  >
                    Get Cards
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Rewards Modal */}
      {showLeaderboardRewardsModal && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowLeaderboardRewardsModal(false)}
        >
          <div
            className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-vintage-gold/30">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-display font-bold text-vintage-gold">
                  🏆 Weekly Ranking Rewards
                </h2>
                <button
                  onClick={() => setShowLeaderboardRewardsModal(false)}
                  className="text-vintage-gold hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-xs text-vintage-burnt-gold mt-1">
                Top 10 players receive rewards every Sunday at 00:00 UTC
              </p>
            </div>

            {/* Rewards List */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 rounded-lg border border-yellow-500/30">
                <div className="flex items-center gap-3 w-full">
                  <span className="text-2xl">🥇</span>
                  <span className="font-bold text-yellow-400">1st Place</span>
                </div>
                <span className="font-mono font-bold text-yellow-300">1,000 coins</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-400/20 to-gray-500/10 rounded-lg border border-gray-400/30">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">🥈</span>
                  <span className="font-bold text-gray-300">2nd Place</span>
                </div>
                <span className="font-mono font-bold text-gray-200">750 coins</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-600/20 to-amber-700/10 rounded-lg border border-amber-600/30">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥉</span>
                  <span className="font-bold text-amber-400">3rd Place</span>
                </div>
                <span className="font-mono font-bold text-amber-300">500 coins</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-vintage-gold/10 to-vintage-gold/5 rounded-lg border border-vintage-gold/20">
                <div className="flex items-center gap-3 justify-center w-full">
                  <span className="text-2xl">🎖️</span>
                  <span className="font-bold text-vintage-gold">4th - 10th Place</span>
                </div>
                <span className="font-mono font-bold text-vintage-burnt-gold">300 coins</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-vintage-gold/30 text-center">
              <p className="text-xs text-vintage-burnt-gold">
                Ranking based on Aura score. Rewards are claimable after each Sunday reset.
              </p>
            </div>
          </div>
        </div>
      )}

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

      {showBattleScreen && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300]">
          <div className="w-full max-w-6xl p-8">
            {/* Title - Different for Elimination Mode */}
            {battleMode === 'elimination' ? (
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-2xl md:text-4xl font-bold text-purple-400 uppercase tracking-wider mb-2">
                  ✦ ELIMINATION MODE
                </h2>
                <div className="flex items-center justify-center gap-4 md:gap-8 text-lg md:text-2xl font-bold">
                  <span className="text-cyan-400">Round {currentRound}/5</span>
                  <span className="text-vintage-gold">•</span>
                  <span className="text-cyan-400">You {eliminationPlayerScore}</span>
                  <span className="text-vintage-gold">-</span>
                  <span className="text-red-400">{eliminationOpponentScore} Opponent</span>
                </div>
              </div>
            ) : (
              <h2 className="text-3xl md:text-5xl font-bold text-center mb-8 md:mb-12 text-yellow-400 uppercase tracking-wider" style={{ animation: 'battlePowerPulse 2s ease-in-out infinite' }}>
                {t('battle')}
              </h2>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
              {/* Player Cards */}
              <div>
                {/* Player Header with Avatar */}
                <div className="flex flex-col items-center mb-3 md:mb-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-cyan-500 shadow-lg shadow-cyan-500/50 mb-2 bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center relative">
                    {userProfile?.twitter ? (
                      <img
                        src={getAvatarUrl({ twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl }) || ''}
                        alt={battlePlayerName}
                        className="w-full h-full object-cover absolute inset-0"
                        onLoad={() => devLog('Player PFP loaded:', userProfile.twitter)}
                        onError={(e) => {
                          devLog('Player PFP failed to load, using fallback:', userProfile.twitter);
                          (e.target as HTMLImageElement).src = getAvatarFallback();
                        }}
                      />
                    ) : null}
                    <span className={`text-2xl md:text-3xl font-bold text-white ${userProfile?.twitter ? 'opacity-0' : 'opacity-100'}`}>
                      {battlePlayerName?.substring(0, 2).toUpperCase() || '??'}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-vintage-neon-blue text-center">{battlePlayerName}</h3>
                </div>

                {/* Cards Display - Different for Elimination Mode */}
                {battleMode === 'elimination' ? (
                  // Show only current round's card (single large card)
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-purple-400 font-bold text-lg">Position #{currentRound}</div>
                    <div
                      className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden ring-4 ring-cyan-500"
                      style={{
                        animation: battlePhase === 'clash'
                          ? `battleGlowBlue 1.5s ease-in-out infinite`
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      <FoilCardEffect
                        foilType={(selectedCards[currentRound - 1]?.foil === 'Standard' || selectedCards[currentRound - 1]?.foil === 'Prize') ? selectedCards[currentRound - 1].foil : null}
                        className="w-full h-full"
                      >
                        <CardMedia src={selectedCards[currentRound - 1]?.imageUrl} alt={`#${selectedCards[currentRound - 1]?.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                      </FoilCardEffect>
                      <div
                        className="absolute top-0 left-0 bg-cyan-500 text-white text-lg md:text-xl font-bold px-3 py-2 rounded-br"
                        style={{
                          animation: battlePhase === 'clash'
                            ? 'battlePowerPulse 1s ease-in-out infinite'
                            : undefined
                        }}
                      >
                        {selectedCards[currentRound - 1]?.power}
                      </div>
                    </div>
                    {/* Show mini previous cards if not first round */}
                    {currentRound > 1 && (
                      <div className="flex gap-1 mt-2">
                        {orderedPlayerCards.slice(0, currentRound - 1).map((card, i) => (
                          <div key={i} className={`w-12 h-16 rounded border-2 ${roundResults[i] === 'win' ? 'border-green-500' : roundResults[i] === 'loss' ? 'border-red-500' : 'border-yellow-500'} opacity-50`}>
                            <CardMedia src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Normal mode - show all 5 cards
                  <>
                    <div
                      className="grid grid-cols-5 gap-1 md:gap-2"
                      style={{
                        animation: battlePhase === 'clash'
                          ? 'battleCardShake 2s ease-in-out'
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      {selectedCards.map((c, i) => (
                        <div
                          key={i}
                          className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-cyan-500"
                          style={{
                            animation: battlePhase === 'clash'
                              ? `battleGlowBlue 1.5s ease-in-out infinite`
                              : undefined,
                            animationDelay: `${i * 0.1}s`
                          }}
                        >
                          <FoilCardEffect
                            foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null}
                            className="w-full h-full"
                          >
                            <CardMedia src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                          </FoilCardEffect>
                          <div
                            className="absolute top-0 left-0 bg-cyan-500 text-white text-xs md:text-sm font-bold px-1 md:px-2 py-1 rounded-br"
                            style={{
                              animation: battlePhase === 'clash'
                                ? 'battlePowerPulse 1s ease-in-out infinite'
                                : undefined
                            }}
                          >
                            {c.power}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 md:mt-4 text-center">
                      <p
                        className="text-3xl md:text-4xl font-bold text-vintage-neon-blue"
                        style={{
                          animation: battlePhase === 'result'
                            ? 'battlePowerPulse 1.5s ease-in-out 3'
                            : undefined
                        }}
                      >
                        {playerPower}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Opponent Cards */}
              <div>
                {/* Opponent Header with Avatar */}
                <div className="flex flex-col items-center mb-3 md:mb-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-red-500 shadow-lg shadow-red-500/50 mb-2 bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center relative">
                    {battleOpponentPfp ? (
                      <img
                        src={battleOpponentPfp}
                        alt={battleOpponentName}
                        className="w-full h-full object-cover absolute inset-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          setBattleOpponentPfp(null); // Reset to null so initials show
                        }}
                      />
                    ) : null}
                    <span className={`text-2xl md:text-3xl font-bold text-white ${battleOpponentPfp ? 'opacity-0' : 'opacity-100'}`}>
                      {battleOpponentName?.substring(0, 2).toUpperCase() || '??'}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-red-400 text-center">{battleOpponentName}</h3>
                </div>

                {/* Cards Display - Different for Elimination Mode */}
                {battleMode === 'elimination' ? (
                  // Show only current round's card (single large card)
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-purple-400 font-bold text-lg">Position #{currentRound}</div>
                    <div
                      className="relative w-48 md:w-64 aspect-[2/3] rounded-lg overflow-hidden ring-4 ring-red-500"
                      style={{
                        animation: battlePhase === 'clash'
                          ? `battleGlowRed 1.5s ease-in-out infinite`
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      <FoilCardEffect
                        foilType={(dealerCards[currentRound - 1]?.foil === 'Standard' || dealerCards[currentRound - 1]?.foil === 'Prize') ? dealerCards[currentRound - 1].foil : null}
                        className="w-full h-full"
                      >
                        <CardMedia src={dealerCards[currentRound - 1]?.imageUrl} alt={`#${dealerCards[currentRound - 1]?.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                      </FoilCardEffect>
                      <div
                        className="absolute top-0 left-0 bg-red-500 text-white text-lg md:text-xl font-bold px-3 py-2 rounded-br"
                        style={{
                          animation: battlePhase === 'clash'
                            ? 'battlePowerPulse 1s ease-in-out infinite'
                            : undefined
                        }}
                      >
                        {dealerCards[currentRound - 1]?.collection === 'vibefid'
                          ? `${((dealerCards[currentRound - 1]?.power || 0) * 10).toLocaleString()}`
                          : dealerCards[currentRound - 1]?.power?.toLocaleString()}
                      </div>
                      {battlePhase === 'result' && (
                        <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">
                          #{dealerCards[currentRound - 1]?.tokenId}
                        </div>
                      )}
                    </div>
                    {/* Show mini previous cards if not first round */}
                    {currentRound > 1 && (
                      <div className="flex gap-1 mt-2">
                        {orderedOpponentCards.slice(0, currentRound - 1).map((card, i) => (
                          <div key={i} className={`w-12 h-16 rounded border-2 ${roundResults[i] === 'loss' ? 'border-green-500' : roundResults[i] === 'win' ? 'border-red-500' : 'border-yellow-500'} opacity-50`}>
                            <CardMedia src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Normal mode - show all 5 cards
                  <>
                    <div
                      className="grid grid-cols-5 gap-1 md:gap-2"
                      style={{
                        animation: battlePhase === 'clash'
                          ? 'battleCardShake 2s ease-in-out'
                          : 'battleCardFadeIn 0.8s ease-out'
                      }}
                    >
                      {dealerCards.map((c, i) => (
                        <div
                          key={i}
                          className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-500"
                          style={{
                            animation: battlePhase === 'clash'
                              ? `battleGlowRed 1.5s ease-in-out infinite`
                              : undefined,
                            animationDelay: `${i * 0.1}s`
                          }}
                        >
                          <FoilCardEffect
                            foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null}
                            className="w-full h-full"
                          >
                            <CardMedia src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                          </FoilCardEffect>
                          <div
                            className="absolute top-0 left-0 bg-red-500 text-white text-xs md:text-sm font-bold px-1 md:px-2 py-1 rounded-br"
                            style={{
                              animation: battlePhase === 'clash'
                                ? 'battlePowerPulse 1s ease-in-out infinite'
                                : undefined
                            }}
                          >
                            {c.power}
                          </div>
                          {battlePhase === 'result' && (
                            <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">
                              #{c.tokenId}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 md:mt-4 text-center">
                      <p
                        className="text-3xl md:text-4xl font-bold text-red-400"
                        style={{
                          animation: battlePhase === 'result'
                            ? 'battlePowerPulse 1.5s ease-in-out 3'
                            : undefined
                        }}
                      >
                        {dealerPower}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Result */}
            {battlePhase === 'result' && result && (
              <div className="text-center" style={{ animation: 'battleResultSlide 0.8s ease-out' }}>
                <div className={`text-3xl md:text-6xl font-bold ${
                  result === t('playerWins') ? 'text-green-400' :
                  result === t('dealerWins') ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {battleMode === 'elimination' && currentRound <= 5
                    ? (result === t('playerWins') ? '★ ROUND WIN!' : result === t('dealerWins') ? '† ROUND LOST' : '~ ROUND TIE')
                    : result
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
      />

      {/* ✅ PvP Preview Modal - Shows potential gains/losses before battle */}
      {showPvPPreview && pvpPreviewData && targetPlayer && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300] p-2 sm:p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-vintage-charcoal via-vintage-black to-vintage-charcoal rounded-xl sm:rounded-2xl border-2 border-vintage-gold max-w-2xl w-full p-4 sm:p-6 md:p-8 shadow-2xl shadow-vintage-gold/30 my-4">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-vintage-gold mb-1 sm:mb-2">
                ⚔️ BATTLE PREVIEW
              </h2>
              <p className="text-xs sm:text-sm text-vintage-burnt-gold font-modern">
                Potential gains and losses for this battle
              </p>
            </div>

            {/* Aura Comparison */}
            <div className="flex justify-between items-center mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-4 bg-vintage-black/50 rounded-lg sm:rounded-xl border border-vintage-gold/30">
              <div className="text-center flex-1">
                <p className="text-[10px] sm:text-xs text-vintage-burnt-gold font-modern mb-0.5 sm:mb-1">YOUR AURA</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-cyan-400">{pvpPreviewData.playerAura}</p>
              </div>
              <div className="text-vintage-gold text-lg sm:text-xl md:text-2xl">VS</div>
              <div className="text-center flex-1">
                <p className="text-[10px] sm:text-xs text-vintage-burnt-gold font-modern mb-0.5 sm:mb-1">OPPONENT AURA</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-400">{pvpPreviewData.opponentAura}</p>
              </div>
            </div>

            {/* Win/Loss Scenarios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
              {/* Win Scenario */}
              <div className="bg-green-900/20 border-2 border-green-500/50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <NextImage src="/images/icons/victory.svg" alt="Victory" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                  <h3 className="text-sm sm:text-base md:text-xl font-bold text-green-400 font-display">IF YOU WIN</h3>
                </div>

                <div className="mb-2 sm:mb-3 md:mb-4">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-300 mb-0.5 sm:mb-1">
                    +{pvpPreviewData.win.totalReward}
                  </p>
                  <p className="text-xs sm:text-sm text-green-200/70">$TESTVBMS</p>
                </div>

                <div className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between text-green-100/80">
                    <span>Base Reward:</span>
                    <span className="font-mono">+{pvpPreviewData.win.baseReward}</span>
                  </div>

                  {pvpPreviewData.win.rankingBonus > 0 && (
                    <div className="flex justify-between text-yellow-300 font-medium">
                      <span>⭐ Ranking Bonus ({pvpPreviewData.win.rankingMultiplier.toFixed(1)}x):</span>
                      <span className="font-mono">+{pvpPreviewData.win.rankingBonus}</span>
                    </div>
                  )}

                  {pvpPreviewData.win.firstPvpBonus > 0 && (
                    <div className="flex justify-between text-blue-300">
                      <span>First PvP Today:</span>
                      <span className="font-mono">+{pvpPreviewData.win.firstPvpBonus}</span>
                    </div>
                  )}

                  {pvpPreviewData.win.streakBonus > 0 && (
                    <div className="flex justify-between text-purple-300 font-medium">
                      <span>🔥 {pvpPreviewData.win.streakMessage}:</span>
                      <span className="font-mono">+{pvpPreviewData.win.streakBonus}</span>
                    </div>
                  )}
                </div>

                {pvpPreviewData.currentStreak > 0 && (
                  <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-orange-500/20 rounded text-[10px] sm:text-xs text-orange-200 border border-orange-500/30">
                    Current Streak: {pvpPreviewData.currentStreak} win{pvpPreviewData.currentStreak !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Loss Scenario */}
              <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <NextImage src="/images/icons/defeat.svg" alt="Defeat" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                  <h3 className="text-sm sm:text-base md:text-xl font-bold text-red-400 font-display">IF YOU LOSE</h3>
                </div>

                <div className="mb-2 sm:mb-3 md:mb-4">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-300 mb-0.5 sm:mb-1">
                    {pvpPreviewData.loss.totalPenalty}
                  </p>
                  <p className="text-xs sm:text-sm text-red-200/70">$TESTVBMS</p>
                </div>

                <div className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between text-red-100/80">
                    <span>Base Penalty:</span>
                    <span className="font-mono">{pvpPreviewData.loss.basePenalty}</span>
                  </div>

                  {pvpPreviewData.loss.penaltyReduction > 0 && (
                    <div className="flex justify-between text-orange-300 font-medium">
                      <span>🛡️ Penalty Reduced ({Math.round(pvpPreviewData.loss.rankingMultiplier * 100)}%):</span>
                      <span className="font-mono">+{pvpPreviewData.loss.penaltyReduction}</span>
                    </div>
                  )}
                </div>

                {pvpPreviewData.loss.penaltyReduction > 0 && (
                  <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-orange-500/20 rounded text-[10px] sm:text-xs text-orange-200 border border-orange-500/30">
                    Fighting a high-ranked opponent reduces your loss!
                  </div>
                )}
              </div>
            </div>

            {/* Current Balance */}
            <div className="mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 bg-vintage-black/50 rounded-lg border border-vintage-gold/20 text-center">
              <p className="text-[10px] sm:text-xs text-vintage-burnt-gold mb-0.5 sm:mb-1">YOUR CURRENT BALANCE</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-vintage-gold">{parseFloat(vbmsBlockchainBalance || '0').toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} VBMS</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 md:gap-4">
              <button
                onClick={async () => {
                  // Fechar modal e continuar com o ataque
                  setShowPvPPreview(false);
                  if (soundEnabled) AudioManager.buttonClick();

                  // Agora sim, fazer o ataque
                  setIsAttacking(true);

                  try {
                    // Pay entry fee
                    await payEntryFee({ address: address || '', mode: 'attack' });
                    devLog('Attack entry fee paid: 50 $TESTVBMS');

                    // Setup battle (código original continua aqui...)
                    devLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    devLog(`✦ ATTACKING: ${targetPlayer.username}`);
                    devLog(`🛡️ Validating opponent's defense deck...`);

                    // ✅ SECURITY: Validate defense deck against owned NFTs
                    const validatedDeck = await ConvexProfileService.getValidatedDefenseDeck(targetPlayer.address);

                    if (validatedDeck.removedCards.length > 0) {
                      devWarn(`⚠️ Removed ${validatedDeck.removedCards.length} invalid cards from ${targetPlayer.username}'s defense deck (no longer owned)`);
                    }

                    if (!validatedDeck.isValid) {
                      devWarn(`⚠️ Could not validate ${targetPlayer.username}'s defense deck - using as-is`);
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
                    setBattleOpponentName(targetPlayer.username);
                    setBattlePlayerName(userProfile?.username || 'You');
                    setBattleOpponentPfp(getAvatarUrl(targetPlayer.twitter));
                    setBattlePlayerPfp(getAvatarUrl(userProfile ? { twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl } : null));
                    setShowAttackCardSelection(false);
                    setIsBattling(true);
                    setShowBattleScreen(true);
                    setBattlePhase('cards');
                    setGameMode('pvp');

                    if (soundEnabled) AudioManager.playHand();

                    // Calculate power totals (one-time calculation per attack, no need for memoization)
                    const playerTotal = calculateLeaderboardAttackPower(attackSelectedCards);
                    const dealerTotal = defenderCards.reduce((sum, c) => sum + (c.power || 0), 0);

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
                        setShowTiePopup(true);
                        if (soundEnabled) AudioManager.tie();
                        setTimeout(() => setShowTiePopup(false), 3000);
                      }

                      let coinsEarned = 0;

                      if (userProfile && address) {
                        try {
                          // ⚛️ ATOMIC: Single transaction for coins + match + profile update
                          const result = await recordAttackResult({
                            playerAddress: address,
                            playerPower: playerTotal,
                            playerCards: attackSelectedCards,
                            playerUsername: userProfile.username,
                            result: matchResult,
                            opponentAddress: targetPlayer.address,
                            opponentUsername: targetPlayer.username,
                            opponentPower: dealerTotal,
                            opponentCards: defenderCards,
                            entryFeePaid: 0, // No entry fee for leaderboard attacks
                            language: lang,
                          });

                          coinsEarned = result.coinsAwarded || 0;

                          devLog(`⚛️ ATOMIC: Attack recorded successfully`);
                          devLog(`💰 Coins awarded: ${coinsEarned}`);
                          if (result.bonuses && result.bonuses.length > 0) {
                            devLog(`🎁 Bonuses: ${result.bonuses.join(', ')}`);
                          }

                          // Update UI with returned profile (no separate getProfile call needed!)
                          if (result.profile) {
                            setUserProfile(result.profile);
                            setAttacksRemaining(maxAttacks - (result.profile.attacksToday || 0));
                          }
                        } catch (error: any) {
                          devError('⚛️ ATOMIC: Error recording attack:', error);
                        }
                      }

                      setLastBattleResult({
                        result: matchResult,
                        playerPower: playerTotal,
                        opponentPower: dealerTotal,
                        opponentName: targetPlayer.username,
                        opponentTwitter: targetPlayer.twitter,
                        type: 'attack',
                        coinsEarned,
                        playerPfpUrl: userProfile?.twitterProfileImageUrl,
                        opponentPfpUrl: targetPlayer.twitterProfileImageUrl,
                      });

                      // 🔔 Send notification (outside atomic transaction - non-critical)
                      if (address && userProfile) {

                        // 🔔 Send notification to defender with coins info
                        fetch('/api/notifications/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'defense_attacked',
                            data: {
                              defenderAddress: targetPlayer.address,
                              defenderUsername: targetPlayer.username || 'Unknown',
                              attackerUsername: userProfile.username || 'Unknown',
                              result: matchResult === 'win' ? 'lose' : 'win', // Inverted: attacker wins = defender loses
                              coinsChange: coinsEarned, // Attacker's coin change
                            },
                          }),
                        }).catch(err => devError('Error sending notification:', err));
                      }

                      // Close battle first
                      setIsBattling(false);
                      setShowBattleScreen(false);
                      setBattlePhase('cards');
                      setIsAttacking(false);
                      setShowAttackCardSelection(false);
                      setTargetPlayer(null);
                      setAttackSelectedCards([]);

                      // 🎯 Show victory/loss popup after closing
                      setTimeout(() => {
                        if (matchResult === 'win') {
                          showVictory();
                        } else if (matchResult === 'loss') {
                          setShowLossPopup(true);
                          if (soundEnabled) AudioManager.lose();
                        }
                        // Note: Tie popup is already shown above
                      }, 100);
                    }, 4500);

                  } catch (error: any) {
                    setErrorMessage('Error: ' + error.message);
                    setIsAttacking(false);
                    if (soundEnabled) AudioManager.buttonError();
                  }
                }}
                disabled={isAttacking}
                className="flex-1 px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-600 text-white rounded-lg sm:rounded-xl font-display font-bold text-sm sm:text-base md:text-xl shadow-lg transition-all uppercase tracking-wider border-2 border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAttacking ? 'ATTACKING...' : '⚔️ ATTACK'}
              </button>

              <button
                onClick={() => {
                  setShowPvPPreview(false);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                disabled={isAttacking}
                className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-vintage-black/50 border-2 border-vintage-burnt-gold text-vintage-burnt-gold rounded-lg sm:rounded-xl hover:bg-vintage-burnt-gold hover:text-vintage-black transition-all font-modern font-bold text-sm sm:text-base md:text-lg uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Poker Battle - handles both CPU and PvP modes */}
      {showPokerBattle && (
        <PokerBattleTable
          onClose={() => setShowPokerBattle(false)}
          playerCards={sortedNfts}
          isCPUMode={pokerMode === 'cpu'}
          opponentDeck={pokerMode === 'cpu' ? strongestJcNftsForPoker : []}
          difficulty={pokerMode === 'cpu' ? pokerCpuDifficulty : undefined}
          playerAddress={address || ''}
          playerUsername={userProfile?.username || ''}
          isInFarcaster={isInFarcaster}
          soundEnabled={soundEnabled}
        />
      )}

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
          {/* VibeFID Button - Opens VibeFID miniapp */}
          {isInFarcaster && (
            <button
              onClick={async () => {
                if (soundEnabled) AudioManager.buttonClick();
                await openMarketplace('https://farcaster.xyz/miniapps/aisYLhjuH5_G/vibefid', sdk, isInFarcaster);
              }}
              className="tour-vibefid-btn px-8 md:px-12 py-2 md:py-2 border border-vintage-gold/30 bg-vintage-gold text-vintage-black font-modern font-semibold rounded-lg transition-all duration-300 hover:bg-vintage-gold/80 tracking-wider flex flex-col items-center justify-center gap-0.5 text-xs md:text-base cursor-pointer"
            >
              <div className="flex items-center justify-center gap-1">
                <span className="text-sm font-bold">{t("vibefidMint")}</span>
              </div>
              <span className="text-[10px] md:text-xs opacity-75 font-normal leading-tight">{t('vibefidCheckScore')}</span>
            </button>
          )}

          {!isInFarcaster && (
            <a
              href="https://farcaster.xyz/miniapps/UpOGC4pheWVP/vibe-most-wanted"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 md:px-6 py-2.5 md:py-3 border border-vintage-gold/30 text-purple-300 hover:text-purple-100 bg-purple-900/50 hover:bg-purple-800/60 font-modern font-semibold rounded-lg transition-all duration-300 tracking-wider flex items-center gap-2 text-sm md:text-base"
            >
              <span className="text-base md:text-lg">♦</span> {t('tryMiniapp')}
            </a>
          )}
        </div>

        <div className="flex items-center gap-3 justify-center w-full">
          {/* REMOVED: Referrals Button - System disabled */}

          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonClick();
              setShowSettings(true);
            }}
            className="tour-settings-btn bg-vintage-charcoal/80 border border-vintage-gold/30 text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/10 transition font-bold text-sm md:text-base"
            title={t('settings')}
          >
            <NextImage src="/images/icons/settings.svg" alt="Settings" width={20} height={20} className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Coins Inbox removed from header - use navigation tab "Claim" button instead */}

          <Link
            href="/docs"
            className="bg-vintage-charcoal/80 border border-vintage-gold/30 text-vintage-gold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-vintage-gold/10 transition font-bold text-sm md:text-base inline-flex items-center justify-center"
            title="Documentação"
          >
            <NextImage src="/images/icons/help.svg" alt="Help" width={20} height={20} className="w-5 h-5 md:w-6 md:h-6" />
          </Link>
        </div>
      </header>

      {!address ? (
        <div className="flex flex-col items-center justify-center py-20">
          {/* Show loading ONLY while actively checking for Farcaster */}
          {isCheckingFarcaster ? (
            <div className="bg-vintage-charcoal backdrop-blur-lg p-8 rounded-2xl border-2 border-vintage-gold max-w-md text-center">
              <div className="text-6xl mb-4 text-vintage-gold font-display animate-pulse">♠</div>
              <div className="w-full px-6 py-4 bg-vintage-gold/20 text-vintage-gold rounded-xl border-2 border-vintage-gold/50 font-display font-semibold">
                {t('loading')}...
              </div>
            </div>
          ) : (
            /* Show connect modal - different for Farcaster miniapp vs regular web */
            <div className="bg-vintage-charcoal backdrop-blur-lg p-8 rounded-2xl border-2 border-vintage-gold max-w-md text-center">
              <div className="text-6xl mb-4 text-vintage-gold font-display">♠</div>
              <h2 className="text-2xl font-bold mb-4 text-vintage-gold">{t('connectTitle')}</h2>
              <p className="text-vintage-burnt-gold mb-6">{t('connectDescription')}</p>

              <div className="flex justify-center">
                {isInFarcaster ? (
                  /* In Farcaster miniapp: Show custom Farcaster wallet button */
                  <button
                    onClick={async () => {
                      try {
                        if (soundEnabled) AudioManager.buttonClick();
                        setIsCheckingFarcaster(true);

                        // Find and connect with Farcaster wagmi connector
                        console.log('[Connect Button] 🔍 Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));

                        // Try multiple possible connector IDs (case variations)
                        const farcasterConnector = connectors.find((c) =>
                          c.id === 'farcasterMiniApp' ||
                          c.id === 'farcaster' ||
                          c.name?.toLowerCase().includes('farcaster')
                        );

                        if (!farcasterConnector) {
                          console.error('[Connect Button] ❌ Available connector IDs:', connectors.map(c => c.id));
                          throw new Error('Farcaster connector not found. Available: ' + connectors.map(c => c.id).join(', '));
                        }

                        console.log('[Connect Button] ✅ Found connector:', farcasterConnector.id);

                        await connect({ connector: farcasterConnector });
                        devLog('✓ Connected Farcaster wallet via wagmi');
                      } catch (err: any) {
                        devError('Failed to connect Farcaster wallet:', err);
                        if (soundEnabled) AudioManager.buttonError();

                        // Show user-friendly error message
                        if (err?.message?.includes('not been authorized')) {
                          alert('Por favor, autorize o acesso à carteira nas configurações do Farcaster');
                        } else {
                          alert('Failed to connect Farcaster wallet. Please try again.');
                        }
                      } finally {
                        setIsCheckingFarcaster(false);
                      }
                    }}
                    className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold"
                  >
                    Connect Farcaster Wallet
                  </button>
                ) : (
                  /* Regular web: Show RainbowKit modal */
                  <ConnectButton.Custom>
                    {({
                      account,
                      chain,
                      openAccountModal,
                      openChainModal,
                      openConnectModal,
                      mounted,
                    }) => {
                      return (
                        <div
                          {...(!mounted && {
                            'aria-hidden': true,
                            'style': {
                              opacity: 0,
                              pointerEvents: 'none',
                              userSelect: 'none',
                            },
                          })}
                        >
                          {(() => {
                            if (!mounted || !account || !chain) {
                              return (
                                <button
                                  onClick={openConnectModal}
                                  className="w-full px-6 py-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl shadow-gold hover:shadow-gold-lg transition-all font-display font-semibold"
                                >
                                  {t('connectWallet')}
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      );
                    }}
                  </ConnectButton.Custom>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className={`mb-3 md:mb-6 ${isInFarcaster ? 'fixed top-0 left-0 right-0 z-[100] m-0' : ''}`}>
            <div className={`bg-vintage-charcoal/80 backdrop-blur-lg p-1 md:p-3 ${isInFarcaster ? 'rounded-none border-b-2' : 'rounded-xl border-2'} border-vintage-gold/30`}>
              <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
                {/* Left: Profile */}
                <div className="flex items-center gap-2">
                  {userProfile ? (
                    <Link
                      href={`/profile/${userProfile.username}`}
                      onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
                      className="flex items-center gap-2 px-4 py-2 bg-vintage-black hover:bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg transition"
                    >
                      {userProfile.twitter ? (
                        <img
                          src={getAvatarUrl({ twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl }) || ''}
                          alt={userProfile.username}
                          className="w-6 h-6 rounded-full"
                          onError={(e) => { (e.target as HTMLImageElement).src = getAvatarFallback(); }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-vintage-gold to-vintage-burnt-gold flex items-center justify-center text-xs font-bold text-vintage-black">
                          {userProfile.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-vintage-gold">@{userProfile.username}</span>
                        <BadgeList badges={getUserBadges(userProfile.address, userProfile.userIndex ?? 9999, userProfile.hasVibeBadge)} size="sm" />
                      </div>
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        if (soundEnabled) AudioManager.buttonClick();
                        setShowCreateProfile(true);
                      }}
                      className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold/80 text-vintage-black rounded-lg text-sm font-semibold"
                    >
                      {t('createProfile')}
                    </button>
                  )}
                </div>

                {/* Right: VBMS Balance */}
                <div className="flex items-center gap-2">
                  {address && userProfile && (
                    <Link
                      href="/dex"
                      onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
                      className="tour-dex-btn bg-vintage-black hover:bg-vintage-gold/10 border border-vintage-gold/30 px-2 md:px-3 py-1.5 md:py-2 rounded-lg flex items-baseline justify-center gap-0 transition"
                    >
                      <span className="text-vintage-gold text-base md:text-lg font-bold leading-none">$</span>
                      <span className="text-vintage-gold font-display font-bold text-base md:text-lg leading-none ml-0.5">
                        {Number(vbmsBlockchainBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-vintage-gold text-base md:text-lg font-bold leading-none ml-1">+</span>
                    </Link>
                  )}
                  {!isInFarcaster && (
                    <div className="tour-price-ticker hidden md:block">
                      <PriceTicker className="-mt-2" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={isInFarcaster ? 'fixed bottom-0 left-0 right-0 z-[100] safe-area-bottom' : 'mb-3 md:mb-6 relative z-40'}>
            <div className={`tour-nav-bar bg-vintage-charcoal/95 backdrop-blur-lg ${isInFarcaster ? 'rounded-none border-t-2' : 'rounded-xl border-2'} border-vintage-gold/30 ${isInFarcaster ? 'p-1' : 'p-2'} flex gap-1`}>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setCurrentView('game');
                }}
                className={`flex-1 min-w-0 ${isInFarcaster ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5' : 'px-2 md:px-6 py-2 md:py-3 flex items-center gap-2'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-[10px] leading-tight' : 'text-xs md:text-base'} ${
                  currentView === 'game'
                    ? 'bg-vintage-gold text-vintage-black'
                    : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
                }`}
              >
                {isInFarcaster ? (
                  <>
                    <span className="text-[10px] font-bold whitespace-nowrap">{t('title')}</span>
                    <span className="text-xl leading-none">♠</span>
                  </>
                ) : (
                  <>
                    <span className="text-base md:text-lg">♠</span>
                    <span className="hidden sm:inline">{t('title')}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  setCurrentView('inbox');
                }}
                className={`relative flex-1 min-w-0 ${isInFarcaster ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5' : 'px-2 md:px-6 py-2 md:py-3 flex items-center gap-2'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-[10px] leading-tight' : 'text-xs md:text-base'} ${
                  currentView === 'inbox'
                    ? 'bg-vintage-gold text-vintage-black'
                    : 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30'
                }`}
              >
                {/* Red dot if TESTVBMS available to convert */}
                {inboxStatus && inboxStatus.coins >= 100 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-vintage-gold z-10" />
                )}
                {isInFarcaster ? (
                  <>
                    <span className="text-[10px] font-bold whitespace-nowrap">Claim</span>
                    <NextImage src="/images/icons/inbox.svg" alt="Claim" width={20} height={20} className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <NextImage src="/images/icons/inbox.svg" alt="Claim" width={20} height={20} className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="hidden sm:inline">Claim</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  router.push('/leaderboard');
                }}
                className={`flex-1 min-w-0 ${isInFarcaster ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5' : 'px-2 md:px-6 py-2 md:py-3 flex items-center gap-2'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-[10px] leading-tight' : 'text-xs md:text-base'} bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30`}
              >
                {isInFarcaster ? (
                  <>
                    <span className="text-[9px] font-bold whitespace-nowrap">{t('leaderboard')}</span>
                    <span className="text-xl leading-none">♔</span>
                  </>
                ) : (
                  <>
                    <span className="text-base md:text-lg">♔</span>
                    <span className="hidden sm:inline">{t('leaderboard')}</span>
                  </>
                )}
              </button>
              <Link
                href="/shop"
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className={`flex-1 min-w-0 ${isInFarcaster ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5' : 'px-2 md:px-6 py-2 md:py-3 flex items-center gap-2'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-[10px] leading-tight' : 'text-xs md:text-base'} bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30`}
              >
                {isInFarcaster ? (
                  <>
                    <span className="text-[10px] font-bold whitespace-nowrap">{t('navShop')}</span>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span className="hidden sm:inline">{t('navShop')}</span>
                  </>
                )}
              </Link>
              <Link
                href="/quests"
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className={`flex-1 min-w-0 ${isInFarcaster ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5' : 'px-2 md:px-6 py-2 md:py-3 flex items-center gap-2'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-[10px] leading-tight' : 'text-xs md:text-base'} relative bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30`}
              >
                {isInFarcaster ? (
                  <>
                    <span className="text-[10px] font-bold whitespace-nowrap">{t('navQuests')}</span>
                    <span className="text-xl leading-none">◈</span>
                  </>
                ) : (
                  <>
                    <span className="text-base md:text-lg">◈</span>
                    <span className="hidden sm:inline">{t('navQuests')}</span>
                  </>
                )}
                {hasClaimableMissions && (
                  <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3 animate-pulse border border-vintage-gold" />
                )}
              </Link>
            </div>
          </div>

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
              <button onClick={() => { clearAllNftCache(); loadNFTs(); }} className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm">{t('retryButton')}</button>
            </div>
          )}

          {/* Game View */}
          {currentView === 'game' && (
          <>
          {/* GAME BUTTONS - EXACT CENTER */}
          {isInFarcaster ? (
            <>
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xs px-2 z-10">
                <div className="tour-game-grid">
                  <GameGrid
                    soundEnabled={soundEnabled}
                    disabled={!userProfile}
                    onSelect={handleGameModeSelect}
                  />
                </div>
              </div>
              {/* CARDS - BELOW CENTER */}
              <div className="fixed top-[65%] left-1/2 -translate-x-1/2 w-full max-w-xs px-2 z-10">
                <div className="tour-cards-section">
                  <CardsPreview
                    cards={nfts}
                    soundEnabled={soundEnabled}
                    loading={status === 'fetching'}
                    onViewAll={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setShowMyCardsModal(true);
                    }}
                  />
                </div>
              </div>
              {/* WANTED CAST - SAME GAP AS GAMEMODE TO CARDS */}
              <div className="tour-wanted-cast fixed top-[78%] left-1/2 -translate-x-1/2 w-full max-w-xs px-2 z-10">
                <WantedCast soundEnabled={soundEnabled} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center px-2">
              <div className="tour-game-grid w-full max-w-xs">
                <GameGrid
                  soundEnabled={soundEnabled}
                  disabled={!userProfile}
                  onSelect={handleGameModeSelect}
                />
              </div>
              <div className="tour-cards-section w-full max-w-xs mt-4">
                <CardsPreview
                  cards={nfts}
                  soundEnabled={soundEnabled}
                  loading={status === 'fetching'}
                  onViewAll={() => {
                    if (soundEnabled) AudioManager.buttonClick();
                    setShowMyCardsModal(true);
                  }}
                />
              </div>
              <div className="tour-wanted-cast mt-2 w-full max-w-xs">
                <WantedCast soundEnabled={soundEnabled} />
              </div>
            </div>
          )}

          {/* LEGACY LAYOUT - HIDDEN (replaced by new compact layout above) */}
          <div className="hidden">
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="bg-vintage-charcoal/50 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/50 p-6">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                  <h2 className="text-2xl font-display font-bold text-vintage-gold flex items-center gap-2">
                    <span className="text-3xl">♦</span>
                    {t('yourNfts')}
                    {nfts.length > 0 && <span className="text-sm text-vintage-burnt-gold">({nfts.length})</span>}
                  </h2>

                  {nfts.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => { clearAllNftCache(); loadNFTs(); }}
                        disabled={status === 'fetching'}
                        className="px-4 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 disabled:bg-vintage-black disabled:text-vintage-burnt-gold border border-vintage-gold/50 text-vintage-gold rounded-lg text-sm font-modern font-semibold transition-all"
                        title="Refresh cards and metadata"
                      >
                        ↻
                      </button>
                      <select
                        value={selectedCollections.length === 0 ? 'all' : selectedCollections[0]}
                        onChange={(e) => {
                          if (e.target.value === 'all') {
                            setSelectedCollections([]);
                          } else {
                            setSelectedCollections([e.target.value as CollectionId]);
                          }
                        }}
                        className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-modern font-medium transition-all bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10 focus:outline-none focus:ring-2 focus:ring-vintage-gold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-gold"
                      >
                        <option value="all" className="bg-vintage-charcoal text-vintage-gold">All</option>
                        <option value="vibe" className="bg-vintage-charcoal text-vintage-gold">VBMS</option>
                        <option value="viberotbangers" className="bg-vintage-charcoal text-vintage-gold">BANGER</option>
                        <option value="cumioh" className="bg-vintage-charcoal text-vintage-gold">CUMIO</option>
                        <option value="historyofcomputer" className="bg-vintage-charcoal text-vintage-gold">HSTR</option>
                        <option value="vibefx" className="bg-vintage-charcoal text-vintage-gold">VBFX</option>
                        <option value="baseballcabal" className="bg-vintage-charcoal text-vintage-gold">BBCL</option>
                        <option value="tarot" className="bg-vintage-charcoal text-vintage-gold">TRT</option>
                        <option value="teampothead" className="bg-vintage-charcoal text-vintage-gold">TMPT</option>
                        <option value="poorlydrawnpepes" className="bg-vintage-charcoal text-vintage-gold">PDP</option>
                        <option value="meowverse" className="bg-vintage-charcoal text-vintage-gold">MEOVV</option>
                        <option value="viberuto" className="bg-vintage-charcoal text-vintage-gold">VBRTO</option>
                        <option value="vibefid" className="bg-vintage-charcoal text-vintage-gold">VIBEFID</option>
                        <option value="americanfootball" className="bg-vintage-charcoal text-vintage-gold">AFCL</option>
                        <option value="gmvbrs" className="bg-vintage-charcoal text-vintage-gold">VBRS</option>
                        <option value="nothing" className="bg-vintage-charcoal text-vintage-gold">NOTHING</option>
                      </select>
                      <button
                        onClick={() => setSortByPower(!sortByPower)}
                        className={`px-4 py-2 rounded-lg text-sm font-modern font-medium transition-all ${
                          sortByPower
                            ? 'bg-vintage-gold text-vintage-black shadow-gold'
                            : 'bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10'
                        }`}
                      >
                        {sortByPower ? '↓ ' + t('sortByPower') : '⇄ ' + t('sortDefault')}
                      </button>
                      <button
                        onClick={() => setCardTypeFilter(cardTypeFilter === 'all' ? 'free' : cardTypeFilter === 'free' ? 'nft' : 'all')}
                        className={`px-4 py-2 rounded-lg text-sm font-modern font-medium transition-all ${
                          cardTypeFilter !== 'all'
                            ? 'bg-vintage-gold text-vintage-black shadow-gold'
                            : 'bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10'
                        }`}
                      >
                        {cardTypeFilter === 'all' ? '⊞ All Cards' : cardTypeFilter === 'free' ? '◈ FREE Only' : '🎴 NFT Only'}
                      </button>
                    </div>
                  )}
                </div>

                {status === 'fetching' && (
                  <div className="flex items-center justify-center gap-3 text-vintage-neon-blue py-12">
                    <LoadingSpinner size="md" variant="purple" />
                    <p className="font-medium text-lg">{t('loading')}</p>
                  </div>
                )}

                {nfts.length === 0 && (status === 'loaded' || status === 'failed') && (
                  <div className="text-center py-12 px-4">
                    <div className="text-6xl mb-4">🃏</div>
                    <h3 className="text-xl font-bold text-vintage-gold mb-2">{t('noCardsTitle')}</h3>
                    <p className="text-vintage-burnt-gold mb-6 max-w-md mx-auto">{t('noCardsExplain')}</p>

                    <div className="bg-vintage-charcoal/50 rounded-xl p-4 mb-6 max-w-sm mx-auto text-left">
                      <p className="text-vintage-gold font-bold mb-3">{t('howToGetPacks')}</p>
                      <ul className="space-y-2 text-sm text-vintage-burnt-gold">
                        <li>{t('howToGetPacksStep1')}</li>
                        <li>{t('howToGetPacksStep2')}</li>
                        <li>{t('howToGetPacksStep3')}</li>
                      </ul>
                    </div>

                    <button
                      onClick={async () => {
                        if (soundEnabled) AudioManager.buttonClick();
                        await openMarketplace('https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT', sdk, isInFarcaster);
                      }}
                      className="inline-block px-6 py-3 border-2 border-red-600 text-white font-modern font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 tracking-wider cursor-pointer text-lg"
                      style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xl">◆</span>
                        <span>{t('buyPacksOnVibeMarket')}</span>
                      </div>
                    </button>
                  </div>
                )}

                {/* Warning when player has 1-4 cards (not enough to play) */}
                {nfts.length > 0 && nfts.length < HAND_SIZE && (status === 'loaded' || status === 'failed') && (
                  <div className="mb-6 p-4 bg-amber-900/30 border border-amber-500/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">⚠️</span>
                      <div className="flex-1">
                        <h4 className="text-amber-300 font-bold mb-1">{t('notEnoughCardsTitle')}</h4>
                        <p className="text-amber-200/80 text-sm mb-3">
                          {t('notEnoughCardsExplain').replace('{count}', String(nfts.length))}
                        </p>
                        <div className="bg-vintage-charcoal/50 rounded-lg p-3 mb-3">
                          <p className="text-vintage-gold font-bold text-sm mb-2">{t('howToGetPacks')}</p>
                          <ul className="space-y-1 text-xs text-vintage-burnt-gold">
                            <li>{t('howToGetPacksStep1')}</li>
                            <li>{t('howToGetPacksStep2')}</li>
                            <li>{t('howToGetPacksStep3')}</li>
                          </ul>
                        </div>
                        <button
                          onClick={async () => {
                            if (soundEnabled) AudioManager.buttonClick();
                            await openMarketplace('https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT', sdk, isInFarcaster);
                          }}
                          className="px-4 py-2 border-2 border-red-600 text-white font-modern font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 cursor-pointer text-sm"
                          style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                        >
                          <div className="flex items-center gap-2">
                            <span>◆</span>
                            <span>{t('buyPacksOnVibeMarket')}</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Buy Collection Button - Show when filtered by collection with no NFTs */}
                {selectedCollections.length > 0 &&
                 filteredAndSortedNfts.length === 0 &&
                 nfts.length > 0 &&
                 (() => {
                   const collection = COLLECTIONS[selectedCollections[0]];
                   return collection?.marketplaceUrl;
                 })() && (
                  <div className="text-center py-8 mb-6">
                    <p className="text-vintage-burnt-gold mb-4">You don't have any NFTs from this collection yet</p>
                    {selectedCollections[0] === 'nothing' ? (
                      <Link
                        href="/shop"
                        onClick={() => {
                          if (soundEnabled) AudioManager.buttonClick();
                        }}
                        className="inline-block px-4 md:px-6 py-2.5 md:py-3 border-2 border-red-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 tracking-wider cursor-pointer"
                        style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-base md:text-lg">◆</span>
                          <span>{COLLECTIONS[selectedCollections[0]].buttonText || 'GET NOTHING CARDS'}</span>
                        </div>
                      </Link>
                    ) : COLLECTIONS[selectedCollections[0]].marketplaceUrl?.startsWith('/') ? (
                      <Link
                        href={COLLECTIONS[selectedCollections[0]].marketplaceUrl!}
                        className="inline-block px-4 md:px-6 py-2.5 md:py-3 border-2 border-red-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 tracking-wider"
                        style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-base md:text-lg">◆</span>
                          <span>{COLLECTIONS[selectedCollections[0]].buttonText || `BUY ${COLLECTIONS[selectedCollections[0]].displayName.toUpperCase()} PACKS`}</span>
                        </div>
                      </Link>
                    ) : (
                      <button
                        onClick={async () => {
                          if (soundEnabled) AudioManager.buttonClick();
                          await openMarketplace(COLLECTIONS[selectedCollections[0]].marketplaceUrl!, sdk, isInFarcaster);
                        }}
                        className="inline-block px-4 md:px-6 py-2.5 md:py-3 border-2 border-red-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 tracking-wider cursor-pointer"
                        style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-base md:text-lg">◆</span>
                          <span>{COLLECTIONS[selectedCollections[0]].buttonText || `BUY ${COLLECTIONS[selectedCollections[0]].displayName.toUpperCase()} PACKS`}</span>
                        </div>
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
                  {displayNfts.map((nft) => {
                    // Check if card is locked (in raid deck) - VibeFID cards are exempt
                    // Use getCardKey for proper collection:tokenId comparison
                    const isLockedInRaid = nft.collection !== 'vibefid' && defenseLockedTokenIds.has(getCardKey(nft));
                    return (
                    <NFTCard
                      key={getCardUniqueId(nft)}
                      nft={nft}
                      selected={selectedCards.some(c => isSameCard(c, nft))}
                      onSelect={handleSelectCard}
                      locked={isLockedInRaid}
                      lockedReason="This card is in your Raid Deck"
                    />
                    );
                  })}

                  {/* Buy Collection Button - Show as grid item when filtering by collection */}
                  {selectedCollections.length > 0 &&
                   displayNfts.length < CARDS_PER_PAGE &&
                   (() => {
                     const collection = COLLECTIONS[selectedCollections[0]];
                     return collection?.marketplaceUrl;
                   })() && (
                    selectedCollections[0] === 'nothing' ? (
                      <Link
                        href="/shop"
                        onClick={() => {
                          if (soundEnabled) AudioManager.buttonClick();
                        }}
                        className="aspect-[2/3] flex flex-col items-center justify-center border-2 border-red-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 hover:scale-105 tracking-wider p-4 cursor-pointer"
                        style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                      >
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                          <span className="text-2xl md:text-3xl">◆</span>
                          <span className="text-xs md:text-sm leading-tight">
                            {COLLECTIONS[selectedCollections[0]].buttonText || 'GET NOTHING CARDS'}
                          </span>
                        </div>
                      </Link>
                    ) : COLLECTIONS[selectedCollections[0]].marketplaceUrl?.startsWith('/') ? (
                      <Link
                        href={COLLECTIONS[selectedCollections[0]].marketplaceUrl!}
                        className="aspect-[2/3] flex flex-col items-center justify-center border-2 border-red-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 hover:scale-105 tracking-wider p-4"
                        style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                      >
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                          <span className="text-2xl md:text-3xl">◆</span>
                          <span className="text-xs md:text-sm leading-tight">
                            {COLLECTIONS[selectedCollections[0]].buttonText || `BUY ${COLLECTIONS[selectedCollections[0]].displayName.toUpperCase()} PACKS`}
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <button
                        onClick={async () => {
                          if (soundEnabled) AudioManager.buttonClick();
                          await openMarketplace(COLLECTIONS[selectedCollections[0]].marketplaceUrl!, sdk, isInFarcaster);
                        }}
                        className="aspect-[2/3] flex flex-col items-center justify-center border-2 border-red-600 text-white font-modern font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-600/50 hover:scale-105 tracking-wider p-4 cursor-pointer"
                        style={{background: 'linear-gradient(145deg, #DC2626, #991B1B)'}}
                      >
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                          <span className="text-2xl md:text-3xl">◆</span>
                          <span className="text-xs md:text-sm leading-tight">
                            {COLLECTIONS[selectedCollections[0]].buttonText || `BUY ${COLLECTIONS[selectedCollections[0]].displayName.toUpperCase()} PACKS`}
                          </span>
                        </div>
                      </button>
                    )
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 mt-6">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 disabled:bg-vintage-black disabled:text-vintage-burnt-gold border border-vintage-gold/50 text-vintage-gold rounded-lg transition font-modern"
                    >
                      ←
                    </button>
                    <span className="text-sm text-vintage-burnt-gold">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-vintage-charcoal hover:bg-vintage-gold/20 disabled:bg-vintage-black disabled:text-vintage-burnt-gold border border-vintage-gold/50 text-vintage-gold rounded-lg transition font-modern"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold p-6 sticky top-6 shadow-gold" style={{boxShadow: '0 0 30px rgba(255, 215, 0, 0.3), inset 0 0 60px rgba(0, 0, 0, 0.5)'}}>
                {/* 🎴 POKER MODE Button */}
                <div className="mb-4">
                  <button
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setModeMenuOpen(modeMenuOpen === 'poker' ? null : 'poker');
                    }}
                    disabled={!userProfile}
                    className={`w-full px-6 py-3 rounded-xl font-display font-bold transition-all uppercase tracking-wide flex items-center justify-between ${
                      userProfile
                        ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black shadow-gold hover:scale-105'
                        : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">♠</span>
                      {t('homePokerBattle')}
                    </span>
                    <span className="text-xl">{modeMenuOpen === 'poker' ? '▼' : '▶'}</span>
                  </button>

                  {/* Poker Submenu */}
                  {modeMenuOpen === 'poker' && (
                    <div className="mt-2 ml-4 space-y-2 border-l-2 border-vintage-gold/30 pl-4">
                      {/* Poker vs CPU */}
                      <button
                        onClick={() => {
                          if (soundEnabled) AudioManager.buttonClick();
                          setPokerMode('cpu');
                          setTempSelectedDifficulty(pokerCpuDifficulty);
                          setIsDifficultyModalOpen(true);
                          setModeMenuOpen(null);
                        }}
                        className="w-full px-4 py-2 rounded-lg font-modern font-semibold transition-all bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 hover:border-purple-500/60"
                      >
                        ♣ {t('homeVsCpu')}
                      </button>

                      {/* Poker vs Player */}
                      <button
                        onClick={() => {
                          if (soundEnabled) AudioManager.buttonClick();
                          setPokerMode('pvp');
                          setShowPokerBattle(true);
                          setModeMenuOpen(null);
                        }}
                        className="w-full px-4 py-2 rounded-lg font-modern font-semibold transition-all bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 border border-orange-500/30 hover:border-orange-500/60"
                      >
                        ♥ {t('homeVsPlayer')}
                      </button>
                    </div>
                  )}
                </div>

                {/* 🤖 MECHA ARENA Button */}
                <div className="mb-4">
                  <button
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setShowCpuArena(true);
                    }}
                    disabled={!userProfile}
                    className={`w-full px-6 py-3 rounded-xl font-display font-bold transition-all uppercase tracking-wide flex items-center justify-between ${
                      userProfile
                        ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 text-white hover:scale-105 shadow-lg shadow-pink-500/50 border-2 border-purple-400/50'
                        : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="10" rx="2" />
                        <circle cx="8.5" cy="16" r="1.5" />
                        <circle cx="15.5" cy="16" r="1.5" />
                        <path d="M12 11V7" />
                        <circle cx="12" cy="5" r="2" />
                      </svg>
                      {t('homeMechaArena')}
                    </span>
                    <span className="text-xl">▶</span>
                  </button>
                </div>

                {/* ⚔️ BATTLE AUTO MODE Button */}
                <div className="mb-4">
                  <button
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setModeMenuOpen(modeMenuOpen === 'battle' ? null : 'battle');
                    }}
                    disabled={!userProfile}
                    className={`w-full px-6 py-3 rounded-xl font-display font-bold transition-all uppercase tracking-wide flex items-center justify-between ${
                      userProfile
                        ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black shadow-gold hover:scale-105'
                        : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">♦</span>
                      {t('homeBattleAuto')}
                    </span>
                    <span className="text-xl">{modeMenuOpen === 'battle' ? '▼' : '▶'}</span>
                  </button>

                  {/* Battle Submenu */}
                  {modeMenuOpen === 'battle' && (
                    <div className="mt-2 ml-4 space-y-2 border-l-2 border-vintage-gold/30 pl-4">
                      {/* Battle vs AI */}
                      <button
                        onClick={() => {
                          if (soundEnabled) AudioManager.buttonClick();
                          setPokerMode('pvp'); // Reset poker mode
                          setShowPveCardSelection(true);
                          setPveSelectedCards([]);
                          setModeMenuOpen(null);
                        }}
                        className="w-full px-4 py-2 rounded-lg font-modern font-semibold transition-all bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 hover:border-blue-500/60"
                      >
                        ♣ {t('homeVsAI')}
                      </button>

                      {/* Battle vs Player */}
                      <button
                        onClick={() => {
                          if (soundEnabled) AudioManager.buttonClick();
                          setPokerMode('pvp'); // Reset poker mode
                          setGameMode('pvp');
                          setPvpMode('pvpMenu');
                          setModeMenuOpen(null);
                        }}
                        className="w-full px-4 py-2 rounded-lg font-modern font-semibold transition-all bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 hover:border-red-500/60"
                      >
                        ♥ {t('homeVsPlayer')}
                      </button>
                    </div>
                  )}
                </div>

                {/* 💀 BOSS RAID Button - Link to /raid page */}
                <div className="mb-4">
                  {userProfile ? (
                    <Link
                      href="/raid"
                      onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
                      className="w-full px-6 py-3 rounded-xl font-display font-bold transition-all uppercase tracking-wide flex items-center justify-between bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white hover:scale-105 shadow-lg shadow-red-500/50 border-2 border-orange-400/50"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="8" r="5" />
                          <path d="M9 8h.01M15 8h.01" strokeLinecap="round" />
                          <path d="M9 11c1 1 5 1 6 0" />
                          <path d="M12 13v4" />
                          <path d="M8 21l4-4 4 4" />
                        </svg>
                        {t('homeBossRaid')}
                        {hasExpiredRaidCards && (
                          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" title="Cards need refuel!" />
                        )}
                      </span>
                      <span className="text-xl">▶</span>
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full px-6 py-3 rounded-xl font-display font-bold transition-all uppercase tracking-wide flex items-center justify-between bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="8" r="5" />
                          <path d="M9 8h.01M15 8h.01" strokeLinecap="round" />
                          <path d="M9 11c1 1 5 1 6 0" />
                          <path d="M12 13v4" />
                          <path d="M8 21l4-4 4 4" />
                        </svg>
                        {t('homeBossRaid')}
                      </span>
                      <span className="text-xl">▶</span>
                    </button>
                  )}
                </div>

                <div ref={playButtonsRef} className="mt-6 space-y-4">
                  {dealerCards.length > 0 && !showBattleScreen && (
                    <div className="bg-gradient-to-br from-vintage-wine to-vintage-black backdrop-blur p-4 rounded-xl border-2 border-vintage-gold/50">
                      <p className="text-xs font-modern font-semibold text-vintage-gold mb-3"><span className="text-lg">♦</span> {t('dealerCards').toUpperCase()}</p>
                      <div className="grid grid-cols-5 gap-2 mb-3">
                        {dealerCards.map((c, i) => (
                          <FoilCardEffect key={i} foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-500 shadow-lg shadow-red-500/30">
                            <CardMedia src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" />
                            <div className="absolute top-0 left-0 bg-red-500 text-white text-xs px-1 rounded-br">{c.collection === 'vibefid' ? ((c.power || 0) * 10).toLocaleString() : c.power}</div>
                            <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">#{c.tokenId}</div>
                          </FoilCardEffect>
                        ))}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-vintage-burnt-gold">{t('dealerTotalPower')}</p>
                        {/* 🚀 Performance: Use memoized power total */}
                        <p className="text-2xl font-bold text-red-400">{dealerCardsPower}</p>
                      </div>
                    </div>
                  )}

                  {playerPower > 0 && (
                    <div className="bg-vintage-charcoal/80 backdrop-blur p-4 rounded-xl border-2 border-vintage-gold/30 space-y-3">
                      <p className="text-xs font-semibold text-vintage-burnt-gold font-modern">§ {t('lastResult')}</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-vintage-burnt-gold">{t('you')}</p>
                          <p className="text-2xl font-bold text-blue-400">{playerPower}</p>
                        </div>
                        <div className="text-2xl">✦</div>
                        <div className="text-right">
                          <p className="text-xs text-vintage-burnt-gold">{t('dealer')}</p>
                          <p className="text-2xl font-bold text-red-400">{dealerPower}</p>
                        </div>
                      </div>
                      {result && (
                        <div className="text-center pt-3 border-t border-vintage-gold/30">
                          <p className="text-xl font-bold text-yellow-300 animate-pulse">{result}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </>
          )}


          {/* 🎯 Missions View */}
          {currentView === 'missions' && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Toggle Buttons: Missions / Achievements */}
              <div className="flex justify-center gap-1 md:gap-2 mb-4 px-2">
                <button
                  onClick={() => {
                    if (soundEnabled) AudioManager.buttonNav();
                    setMissionsSubView('missions');
                  }}
                  className={`px-3 md:px-6 py-2 rounded-lg font-display font-bold text-xs md:text-base transition-all flex-shrink-0 ${
                    missionsSubView === 'missions'
                      ? 'bg-vintage-gold text-vintage-black shadow-gold'
                      : 'bg-vintage-charcoal border-2 border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/20'
                  }`}
                >
                  ◈ {t('missions')}
                </button>
                <button
                  onClick={() => {
                    if (soundEnabled) AudioManager.buttonNav();
                    setMissionsSubView('social');
                  }}
                  className={`px-3 md:px-6 py-2 rounded-lg font-display font-bold text-xs md:text-base transition-all flex-shrink-0 ${
                    missionsSubView === 'social'
                      ? 'bg-vintage-gold text-vintage-black shadow-gold'
                      : 'bg-vintage-charcoal border-2 border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/20'
                  }`}
                >
                  <svg className="inline-block w-3 h-3 md:w-4 md:h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                  Social
                </button>
              </div>

              {/* Missions Sub-View */}
              {missionsSubView === 'missions' && (
              <>
              {/* Daily Missions Section */}
              <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold p-4 md:p-8">
                <div className="text-center mb-6">
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-vintage-gold mb-2">
                    🎁 Daily Missions
                  </h1>
                  <p className="text-vintage-burnt-gold font-modern text-sm md:text-base">
                    Complete missions and claim your rewards!
                  </p>
                </div>

                {isLoadingMissions ? (
                  <div className="flex justify-center items-center py-20">
                    <LoadingSpinner size="xl" variant="gold" />
                  </div>
                ) : missions.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-2xl mb-4">🎯</p>
                    <p className="text-vintage-burnt-gold font-modern">
                      No missions available yet. Play some matches to unlock rewards!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {missions.map((mission) => {
                        const missionInfo = getMissionInfo(mission.missionType);
                        const isClaimed = mission.claimed;
                        const isCompleted = mission.completed;

                        return (
                          <div
                            key={mission._id}
                            className={`bg-vintage-black/50 rounded-xl p-4 md:p-6 border-2 transition-all ${
                              isClaimed
                                ? 'border-vintage-gold/20 opacity-60'
                                : isCompleted
                                ? 'border-vintage-gold shadow-gold'
                                : 'border-vintage-gold/30'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              {/* Mission Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <NextImage src={missionInfo.icon} alt={missionInfo.title} width={32} height={32} />
                                  <h3 className="text-lg md:text-xl font-display font-bold text-vintage-gold">
                                    {missionInfo.title}
                                  </h3>
                                </div>
                                <p className="text-sm md:text-base text-vintage-burnt-gold font-modern mb-3">
                                  {missionInfo.description}
                                </p>
                                <div className="flex items-center gap-2">
                                  {mission.missionType === 'claim_vibe_badge' ? (
                                    <>
                                      <span className="text-yellow-400 font-bold text-lg">✨ VIBE Badge</span>
                                      <span className="text-vintage-burnt-gold text-sm">(2x Wanted Cast)</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-vintage-gold font-bold text-lg">
                                        +{mission.reward}
                                      </span>
                                      <span className="text-vintage-burnt-gold text-sm">$TESTVBMS</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Claim Button */}
                              <div className="flex-shrink-0">
                                {isClaimed ? (
                                  <div className="px-4 py-2 bg-green-600/20 border-2 border-green-500 rounded-lg text-green-400 font-bold text-sm md:text-base whitespace-nowrap">
                                    ✓ Claimed
                                  </div>
                                ) : isCompleted ? (
                                  <button
                                    onClick={() => claimMission(mission._id, mission.missionType)}
                                    disabled={isClaimingMission === mission._id}
                                    className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-lg font-display font-bold text-sm md:text-base shadow-gold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                  >
                                    {isClaimingMission === mission._id ? 'Claiming...' : 'Claim'}
                                  </button>
                                ) : (
                                  <div className="px-4 py-2 bg-vintage-charcoal border-2 border-vintage-gold/30 rounded-lg text-vintage-burnt-gold text-sm md:text-base whitespace-nowrap">
                                    Locked
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Claim All Button */}
                    {missions.some((m) => m.completed && !m.claimed) && (
                      <div className="border-t-2 border-vintage-gold/20 pt-6">
                        <button
                          onClick={claimAllMissions}
                          disabled={isClaimingAll}
                          className="w-full px-8 py-4 bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold hover:from-vintage-gold-dark hover:to-vintage-gold text-vintage-black rounded-xl font-display font-bold text-lg md:text-xl shadow-gold-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isClaimingAll ? 'Claiming All...' : `🎁 Claim All Rewards (${missions.filter((m) => m.completed && !m.claimed).length})`}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              </>
              )}

              

              {/* Social Quests Sub-View */}
              {missionsSubView === 'social' && address && (
                <SocialQuestsPanel
                  address={address}
                  userFid={userProfile?.farcasterFid || (userProfile?.fid ? parseInt(userProfile.fid) : undefined)}
                  soundEnabled={soundEnabled}
                  hasVibeBadge={userProfile?.hasVibeBadge}
                  onRewardClaimed={(amount: number) => {
                    setSuccessMessage(`Claimed ${amount} $TESTVBMS!`);
                  }}
                />
              )}
            </div>
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
          // Check if this is Poker CPU mode
          if (pokerMode === 'cpu') {
            if (soundEnabled) AudioManager.buttonClick();
            setPokerCpuDifficulty(difficulty);
            setIsDifficultyModalOpen(false);
            setTempSelectedDifficulty(null);
            setShowPokerBattle(true);
          } else {
            // PvE Mode: Consume daily attempt before starting battle
            try {
              if (address) {
                await consumePveAttempt({ address });
                console.log('✅ PvE attempt consumed successfully');
              }
            } catch (error) {
              console.error('❌ Failed to consume PvE attempt:', error);
              alert(error instanceof Error ? error.message : 'Failed to start battle. Please try again.');
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
          }
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

      {/* Easter Egg - Runaway Image */}
      <RunawayEasterEgg />

      {/* TEMPORARILY DISABLED - Causing performance issues */}
      {/* <MobileDebugConsole /> */}

      </div>
    </div>
  );
}
 


