"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { useAccount } from 'wagmi';
import { useConvex, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { devLog, devError, devWarn } from '@/lib/utils/logger';
import { getEnabledCollections, getCollectionContract, type CollectionId } from '@/lib/collections/index';
import { getCardKey } from '@/lib/nft';
import { findAttr, calcPower, isUnrevealed } from '@/lib/nft/attributes';
import { getImage, fetchNFTs, checkCollectionBalances } from '@/lib/nft/fetcher';
import { convertIpfsUrl } from '@/lib/ipfs-url-converter';
import { AudioManager } from '@/lib/audio-manager';
import { ConvexProfileService, type UserProfile } from '@/lib/convex-profile';
import { HAND_SIZE, getMaxAttacks } from '@/lib/config';
import type { Card, CardRarity, CardFoil, CardWear } from '@/lib/types/card';

/**
 * 🎴 FETCH NFTs - localStorage cache only (no Convex bandwidth)
 * OPTIMIZATION (Jan 2026):
 * - Uses localStorage cache (30 min TTL)
 * - RPC balance check to skip empty collections
 * - No Convex usage = minimal bandwidth cost
 */
async function fetchNFTsFromAllCollections(owner: string, forceRefresh: boolean = false): Promise<any[]> {
  devLog('🎴 [Context] Starting NFT fetch (localStorage cache)...');

  const enabledCollections = getEnabledCollections();
  const collectionsWithContract = enabledCollections.filter(c => c.contractAddress);

  // RPC balance check - skips collections where user has 0 NFTs
  const { collectionsWithNfts, balances } = await checkCollectionBalances(owner, collectionsWithContract);

  devLog(`📊 [Context] ${collectionsWithNfts.length}/${collectionsWithContract.length} collections have NFTs`);

  const allNfts: any[] = [];

  for (const collection of collectionsWithNfts) {
    try {
      const balance = balances[collection.contractAddress.toLowerCase()];
      // fetchNFTs uses localStorage cache internally (30 min TTL)
      const nfts = await fetchNFTs(owner, collection.contractAddress, undefined, balance);
      const tagged = nfts.map(nft => ({ ...nft, collection: collection.id }));
      allNfts.push(...tagged);
    } catch (err) {
      devError(`✗ [Context] Failed: ${collection.displayName}`, err);
    }
  }

  devLog(`✅ [Context] Fetched ${allNfts.length} NFTs total`);
  return allNfts;
}

// Avatar URL helper
const getAvatarUrl = (twitterData?: string | null | { twitter?: string; twitterProfileImageUrl?: string }): string | null => {
  if (!twitterData) return null;
  if (typeof twitterData === 'object' && twitterData.twitterProfileImageUrl) {
    const profileImageUrl = twitterData.twitterProfileImageUrl;
    if (profileImageUrl.includes('pbs.twimg.com')) {
      return profileImageUrl.replace('_normal', '_400x400');
    }
    return profileImageUrl;
  }
  return null;
};

// Calculate attack power (VibeFID 10x, VBMS 2x, Nothing 0.5x)
const calculateLeaderboardAttackPower = (cards: Card[]): number => {
  return cards.reduce((sum, card) => {
    const multiplier = card.collection === 'vibefid' ? 10 : card.collection === 'vibe' ? 2 : card.collection === 'nothing' ? 0.5 : 1;
    return sum + Math.floor((card.power || 0) * multiplier);
  }, 0);
};

interface BattleResult {
  won: boolean;
  playerPower: number;
  opponentPower: number;
  auraChange: number;
  coinsWon: number;
  opponentUsername: string;
}

interface PlayerCardsContextType {
  // NFT Cards
  nfts: Card[];
  isLoading: boolean;
  status: 'idle' | 'fetching' | 'loaded' | 'error';
  errorMsg: string | null;
  loadNFTs: () => Promise<void>;
  forceReloadNFTs: () => Promise<void>;
  syncNftsFromHome: (cards: Card[]) => void; // 🔗 Sync cards from home page

  // Sorted for attack
  sortedAttackNfts: Card[];
  sortAttackByPower: boolean;
  setSortAttackByPower: Dispatch<SetStateAction<boolean>>;

  // Attack modal state
  showAttackCardSelection: boolean;
  setShowAttackCardSelection: Dispatch<SetStateAction<boolean>>;
  attackSelectedCards: Card[];
  setAttackSelectedCards: Dispatch<SetStateAction<Card[]>>;
  targetPlayer: UserProfile | null;
  setTargetPlayer: Dispatch<SetStateAction<UserProfile | null>>;
  attackSelectedCardsPower: number;

  // Battle state
  isAttacking: boolean;
  setIsAttacking: Dispatch<SetStateAction<boolean>>;
  isLoadingPreview: boolean;
  setIsLoadingPreview: Dispatch<SetStateAction<boolean>>;
  showBattleScreen: boolean;
  setShowBattleScreen: Dispatch<SetStateAction<boolean>>;
  battlePhase: string;
  setBattlePhase: Dispatch<SetStateAction<string>>;
  isBattling: boolean;
  setIsBattling: Dispatch<SetStateAction<boolean>>;
  selectedCards: Card[];
  setSelectedCards: Dispatch<SetStateAction<Card[]>>;
  dealerCards: Card[];
  setDealerCards: Dispatch<SetStateAction<Card[]>>;
  playerPower: number;
  setPlayerPower: Dispatch<SetStateAction<number>>;
  dealerPower: number;
  setDealerPower: Dispatch<SetStateAction<number>>;
  battleOpponentName: string;
  setBattleOpponentName: Dispatch<SetStateAction<string>>;
  battlePlayerName: string;
  setBattlePlayerName: Dispatch<SetStateAction<string>>;
  battleOpponentPfp: string | null;
  setBattleOpponentPfp: Dispatch<SetStateAction<string | null>>;
  battlePlayerPfp: string | null;
  setBattlePlayerPfp: Dispatch<SetStateAction<string | null>>;
  gameMode: 'ai' | 'pvp' | null;
  setGameMode: Dispatch<SetStateAction<'ai' | 'pvp' | null>>;
  result: string;
  setResult: Dispatch<SetStateAction<string>>;

  // Popups
  showWinPopup: boolean;
  setShowWinPopup: Dispatch<SetStateAction<boolean>>;
  showLossPopup: boolean;
  setShowLossPopup: Dispatch<SetStateAction<boolean>>;
  showTiePopup: boolean;
  setShowTiePopup: Dispatch<SetStateAction<boolean>>;

  // PvP Preview
  pvpPreviewData: any;
  setPvpPreviewData: Dispatch<SetStateAction<any>>;
  showPvPPreview: boolean;
  setShowPvPPreview: Dispatch<SetStateAction<boolean>>;

  // Error handling
  errorMessage: string | null;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;

  // Attack tracking
  attacksRemaining: number;
  setAttacksRemaining: Dispatch<SetStateAction<number>>;
  maxAttacks: number;
  lastBattleResult: BattleResult | null;
  setLastBattleResult: Dispatch<SetStateAction<BattleResult | null>>;

  // User profile (for battle display)
  userProfile: UserProfile | null;
  setUserProfile: Dispatch<SetStateAction<UserProfile | null>>;
  refreshUserProfile: () => Promise<void>;

  // Locked cards
  attackLockedCards: { lockedTokenIds: string[] } | null;

  // Helper functions
  isCardLocked: (card: { tokenId: string; collection?: string }, mode: 'attack' | 'pvp') => boolean;
  getAvatarUrl: (data: any) => string | null;
  showVictory: () => void;

  // Entry fee
  payEntryFee: (params: { address: string; mode: 'attack' | 'pvp' }) => Promise<void>;
}

const PlayerCardsContext = createContext<PlayerCardsContextType | null>(null);

export function PlayerCardsProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const convex = useConvex();

  // NFT state
  const [nfts, setNfts] = useState<Card[]>([]);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'loaded' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Attack modal state
  const [sortAttackByPower, setSortAttackByPower] = useState(false);
  const [showAttackCardSelection, setShowAttackCardSelection] = useState(false);
  const [attackSelectedCards, setAttackSelectedCards] = useState<Card[]>([]);
  const [targetPlayer, setTargetPlayer] = useState<UserProfile | null>(null);

  // Battle state
  const [isAttacking, setIsAttacking] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showBattleScreen, setShowBattleScreen] = useState(false);
  const [battlePhase, setBattlePhase] = useState('cards');
  const [isBattling, setIsBattling] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [playerPower, setPlayerPower] = useState(0);
  const [dealerPower, setDealerPower] = useState(0);
  const [battleOpponentName, setBattleOpponentName] = useState('Dealer');
  const [battlePlayerName, setBattlePlayerName] = useState('You');
  const [battleOpponentPfp, setBattleOpponentPfp] = useState<string | null>(null);
  const [battlePlayerPfp, setBattlePlayerPfp] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'ai' | 'pvp' | null>(null);
  const [result, setResult] = useState('');

  // Popups
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [showLossPopup, setShowLossPopup] = useState(false);
  const [showTiePopup, setShowTiePopup] = useState(false);

  // PvP Preview
  const [pvpPreviewData, setPvpPreviewData] = useState<any>(null);
  const [showPvPPreview, setShowPvPPreview] = useState(false);

  // Error handling
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Attack tracking
  const [attacksRemaining, setAttacksRemaining] = useState(5);
  const maxAttacks = getMaxAttacks(address);
  const [lastBattleResult, setLastBattleResult] = useState<BattleResult | null>(null);

  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // 🚀 BANDWIDTH FIX: Derive locked cards from userProfile.defenseDeck
  // No need for separate getAvailableCards query - saves ~16MB/day
  const lockedTokenIds = useMemo(() => {
    if (!userProfile?.defenseDeck || userProfile.defenseDeck.length === 0) {
      return [];
    }
    const locked: string[] = [];
    for (const card of userProfile.defenseDeck) {
      if (typeof card === 'object' && card !== null && 'tokenId' in card) {
        // Skip VibeFID cards - they're exempt from lock
        if (card.collection === 'vibefid') continue;
        locked.push(`${card.collection || 'default'}:${card.tokenId}`);
      } else if (typeof card === 'string') {
        locked.push(`default:${card}`);
      }
    }
    return locked;
  }, [userProfile?.defenseDeck]);

  // Legacy: Keep attackLockedCards for backward compat (derived from lockedTokenIds)
  const attackLockedCards = useMemo(() => ({ lockedTokenIds }), [lockedTokenIds]);

  // Mutations
  const payAttackEntryFee = useMutation(api.economy.payEntryFee);

  // 🎴 LOAD NFTs - SAME LOGIC AS HOME PAGE!
  // 🔗 MULTI-WALLET: Busca NFTs de todas as wallets linkadas
  const loadNFTs = useCallback(async () => {
    if (!address) {
      devLog('! [Context] loadNFTs called but no address');
      return;
    }

    // Don't reload if already loaded
    if (status === 'loaded' && nfts.length > 0) {
      devLog('📦 [Context] Cards already loaded:', nfts.length);
      return;
    }

    // Don't load if already fetching
    if (status === 'fetching') {
      devLog('⏳ [Context] Already fetching, skipping');
      return;
    }

    devLog('🎴 [Context] Loading NFTs for:', address);

    try {
      setStatus('fetching');
      setErrorMsg(null);

      // 🔗 MULTI-WALLET: Get all linked addresses
      // 🚀 BANDWIDTH FIX: Cache linked addresses in sessionStorage (1 hour)
      let allAddresses = [address.toLowerCase()];
      try {
        const cacheKey = `vbms_linked_${address.toLowerCase()}`;
        const cached = sessionStorage.getItem(cacheKey);
        let linkedData = null;

        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 60 * 60 * 1000) { // 1 hour cache
            linkedData = parsed.data;
          }
        }

        if (!linkedData) {
          linkedData = await convex.query(api.profiles.getLinkedAddresses, { address });
          sessionStorage.setItem(cacheKey, JSON.stringify({ data: linkedData, timestamp: Date.now() }));
        }

        if (linkedData?.primary) {
          const primaryLower = linkedData.primary.toLowerCase();
          const linkedLower = (linkedData.linked || []).map((a: string) => a.toLowerCase());
          allAddresses = [primaryLower, ...linkedLower];
          allAddresses = [...new Set([...allAddresses, address.toLowerCase()])];
        }
        devLog(`🔗 [Context] Fetching from ${allAddresses.length} wallet(s):`, allAddresses.map(a => a.slice(0,8)));
      } catch (error) {
        console.warn('⚠️ Failed to get linked addresses, using current only:', error);
      }

      // 🎴 FETCH NFTs - SAME AS HOME PAGE!
      let raw: any[] = [];
      for (const walletAddr of allAddresses) {
        const walletNfts = await fetchNFTsFromAllCollections(walletAddr);
        const tagged = walletNfts.map(nft => ({ ...nft, ownerAddress: walletAddr.toLowerCase() }));
        raw.push(...tagged);
        devLog(`✓ [Context] Wallet ${walletAddr.slice(0,8)}...: ${walletNfts.length} NFTs`);
      }
      devLog('✓ [Context] Received NFTs from all wallets:', raw.length);

      // 🔄 METADATA REFRESH - SAME AS HOME PAGE!
      const METADATA_BATCH_SIZE = 50;
      const enrichedRaw = [];
      for (let i = 0; i < raw.length; i += METADATA_BATCH_SIZE) {
        const batch = raw.slice(i, i + METADATA_BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (nft) => {
            // Handle tokenUri as string or object with gateway property
            const tokenUri = typeof nft?.tokenUri === 'string'
              ? nft.tokenUri
              : (nft?.tokenUri?.gateway || nft?.raw?.tokenUri);
            if (!tokenUri) return nft;
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
              const res = await fetch(tokenUri, { signal: controller.signal });
              clearTimeout(timeoutId);
              if (res.ok) {
                const metadata = await res.json();
                console.log(`✅ [Context] Refreshed metadata for NFT #${nft.tokenId}`);
                return { ...nft, metadata: metadata, raw: { ...nft.raw, metadata: metadata } };
              }
            } catch (error) {
              devWarn(`⚠️ [Context] Failed to refresh metadata for NFT #${nft.tokenId}:`, error);
            }
            return nft;
          })
        );
        enrichedRaw.push(...batchResults);
      }

      // 🔍 FILTER UNOPENED - Use isUnrevealed for better detection (handles stale Alchemy data)
      const revealed = enrichedRaw.filter((nft) => {
        // isUnrevealed checks for Wear/Foil/Character attributes which prove the card is revealed
        // even if Alchemy has stale rarity="Unopened" data
        return !isUnrevealed(nft);
      });

      const filtered = enrichedRaw.length - revealed.length;
      devLog(`📊 [Context] NFT Stats: Total=${enrichedRaw.length}, Revealed=${revealed.length}, Filtered=${filtered}`);

      // 🖼️ PROCESS IMAGES - SAME AS HOME PAGE!
      const IMAGE_BATCH_SIZE = 50;
      const processed: Card[] = [];

      for (let i = 0; i < revealed.length; i += IMAGE_BATCH_SIZE) {
        const batch = revealed.slice(i, i + IMAGE_BATCH_SIZE);
        const enriched = await Promise.all(
          batch.map(async (nft) => {
            // 🎯 Detect collection from contract address
            let collection: CollectionId = 'vibe';
            const contractAddr = nft?.contract?.address?.toLowerCase();
            const isVibeFID = contractAddr === getCollectionContract('vibefid')?.toLowerCase();

            // 🎬 Get image URL
            let imageUrl: string;
            if (isVibeFID) {
              imageUrl = await getImage(nft, 'vibefid');
            } else {
              imageUrl = await getImage(nft);
            }

            if (contractAddr) {
              if (isVibeFID) {
                collection = 'vibefid';
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
              tokenId: nft.tokenId,
              name: nft.title || nft.name || `Card #${nft.tokenId}`,
              imageUrl,
              collection,
              rarity: findAttr(nft, 'rarity') as CardRarity,
              foil: findAttr(nft, 'foil') as CardFoil || 'None',
              wear: findAttr(nft, 'wear') as CardWear || undefined,
              power: calcPower(nft, isVibeFID),
              isFreeCard: false,
              // TCG character name (from VMW "name" trait - e.g., "nicogay", "tukka")
              character: findAttr(nft, 'name') || undefined,
            };
          })
        );
        processed.push(...enriched);
      }

      // 🆓 LOAD FREE CARDS - SAME AS HOME PAGE!
      try {
        let allFreeCards: any[] = [];
        for (const walletAddr of allAddresses) {
          const freeCards = await convex.query(api.cardPacks.getPlayerCards, { address: walletAddr });
          if (freeCards && freeCards.length > 0) {
            allFreeCards.push(...freeCards);
          }
        }
        devLog('🆓 [Context] FREE cards loaded from all wallets:', allFreeCards.length);

        if (allFreeCards.length > 0) {
          const freeCardsFormatted = allFreeCards.map((card: any) => ({
            tokenId: card.cardId,
            name: card.name || `FREE ${card.rarity} Card`,
            imageUrl: card.imageUrl,
            rarity: card.rarity as CardRarity,
            foil: (card.foil || 'None') as CardFoil,
            power: card.power,
            collection: 'nothing' as CollectionId,
            isFreeCard: true,
          }));
          processed.push(...freeCardsFormatted);
        }
      } catch (error) {
        console.warn('⚠️ [Context] Failed to load FREE cards:', error);
      }

      // 🔒 DEDUPLICATION - SAME AS HOME PAGE!
      const seenCards = new Set<string>();
      const deduplicated = processed.filter((card: any) => {
        const uniqueId = `${card.collection || 'vibe'}_${card.tokenId}`;
        if (seenCards.has(uniqueId)) {
          devLog(`⚠️ [Context] Removing duplicate card: ${uniqueId}`);
          return false;
        }
        seenCards.add(uniqueId);
        return true;
      });

      // Final count
      devLog(`📊 [Context] Cards loaded: ${deduplicated.length} (from ${raw.length} raw)`);

      setNfts(deduplicated);
      setStatus('loaded');

    } catch (error) {
      devError('[Context] Error loading NFTs:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load cards');
      setStatus('error');
    }
  }, [address, status, nfts.length, convex]);

  // Force reload (ignores cache)
  const forceReloadNFTs = useCallback(async () => {
    if (!address) return;
    setStatus('idle');
    setNfts([]);
    // Wait a tick then load
    setTimeout(() => loadNFTs(), 0);
  }, [address, loadNFTs]);

  // 🔗 SYNC FROM HOME: Home page loads cards and syncs here
  // This ensures ALL pages use the SAME cards loaded by home
  const syncNftsFromHome = useCallback((cards: Card[]) => {
    devLog('[Context] 🔗 Syncing', cards.length, 'cards from home page');
    setNfts(cards);
    setStatus('loaded');
    setErrorMsg(null);
  }, []);

  // 🔗 Reset state and reload when address changes (for wallet switching)
  const previousAddressRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    // If address changed, force reload
    if (address && previousAddressRef.current && address.toLowerCase() !== previousAddressRef.current.toLowerCase()) {
      devLog('[Context] 🔄 Address changed from', previousAddressRef.current.slice(0,8), 'to', address.slice(0,8));
      setNfts([]);
      setStatus('idle');
      setAttackSelectedCards([]);
      previousAddressRef.current = address;
      // Force reload after state reset
      setTimeout(() => {
        devLog('[Context] 🔄 Forcing reload after address change');
        loadNFTs();
      }, 100);
      return;
    }

    previousAddressRef.current = address;

    // Auto-load when idle
    devLog('[Context] Auto-load check:', { address: address?.slice(0,8), status });
    if (address && status === 'idle') {
      devLog('[Context] Starting auto-load...');
      loadNFTs();
    }
  }, [address, status, loadNFTs]);

  // Load user profile
  useEffect(() => {
    if (address) {
      ConvexProfileService.getProfile(address).then(profile => {
        if (profile) setUserProfile(profile);
      });
    }
  }, [address]);

  // 🔄 Function to manually refresh user profile (after burns, purchases, etc.)
  const refreshUserProfile = useCallback(async () => {
    if (!address) return;
    devLog('[Context] Refreshing user profile...');
    const profile = await ConvexProfileService.getProfile(address);
    if (profile) {
      setUserProfile(profile);
      devLog('[Context] Profile refreshed, coins:', profile.coins);
    }
  }, [address]);

  // Calculate attacks remaining based on userProfile (same as page.tsx)
  useEffect(() => {
    if (!userProfile || !address) {
      setAttacksRemaining(0);
      return;
    }

    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0];
    const lastAttackDate = userProfile.lastAttackDate || '';
    const attacksToday = userProfile.attacksToday || 0;

    if (lastAttackDate === todayUTC) {
      setAttacksRemaining(Math.max(0, maxAttacks - attacksToday));
    } else {
      setAttacksRemaining(maxAttacks);
    }
  }, [userProfile?.lastAttackDate, userProfile?.attacksToday, maxAttacks, address]);

  // 🚀 BANDWIDTH FIX: Removed getAvailableCards useEffect
  // lockedTokenIds is now derived from userProfile.defenseDeck (see line ~260)
  // Saves ~16MB/day bandwidth

  // Clear on disconnect
  useEffect(() => {
    if (!address) {
      setNfts([]);
      setStatus('idle');
      setAttackSelectedCards([]);
      setTargetPlayer(null);
      setUserProfile(null);
    }
  }, [address]);

  // Sorted NFTs for attack modal
  const sortedAttackNfts = useMemo(() => {
    if (!sortAttackByPower) return nfts;
    return [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
  }, [nfts, sortAttackByPower]);

  // Calculate attack power
  const attackSelectedCardsPower = useMemo(() => {
    return calculateLeaderboardAttackPower(attackSelectedCards);
  }, [attackSelectedCards]);

  // 🚀 BANDWIDTH FIX: Helper to check if card is locked
  // Uses lockedTokenIds derived from userProfile.defenseDeck
  const isCardLocked = useCallback((card: { tokenId: string; collection?: string }, _mode: 'attack' | 'pvp') => {
    // VibeFID cards are never locked
    if (card?.collection === 'vibefid') return false;

    // Use getCardKey for proper collection:tokenId comparison
    const cardKey = getCardKey(card);
    return lockedTokenIds.includes(cardKey);
  }, [lockedTokenIds]);

  // Helper: Show victory
  const showVictory = useCallback(() => {
    setShowWinPopup(true);
    AudioManager.win();
  }, []);

  // Pay entry fee
  const payEntryFee = useCallback(async ({ address, mode }: { address: string; mode: 'attack' | 'pvp' }) => {
    await payAttackEntryFee({ address, mode });
  }, [payAttackEntryFee]);

  const value: PlayerCardsContextType = {
    // NFT Cards
    nfts,
    isLoading: status === 'fetching',
    status,
    errorMsg,
    loadNFTs,
    forceReloadNFTs,
    syncNftsFromHome, // 🔗 Sync from home page

    // Sorted for attack
    sortedAttackNfts,
    sortAttackByPower,
    setSortAttackByPower,

    // Attack modal state
    showAttackCardSelection,
    setShowAttackCardSelection,
    attackSelectedCards,
    setAttackSelectedCards,
    targetPlayer,
    setTargetPlayer,
    attackSelectedCardsPower,

    // Battle state
    isAttacking,
    setIsAttacking,
    isLoadingPreview,
    setIsLoadingPreview,
    showBattleScreen,
    setShowBattleScreen,
    battlePhase,
    setBattlePhase,
    isBattling,
    setIsBattling,
    selectedCards,
    setSelectedCards,
    dealerCards,
    setDealerCards,
    playerPower,
    setPlayerPower,
    dealerPower,
    setDealerPower,
    battleOpponentName,
    setBattleOpponentName,
    battlePlayerName,
    setBattlePlayerName,
    battleOpponentPfp,
    setBattleOpponentPfp,
    battlePlayerPfp,
    setBattlePlayerPfp,
    gameMode,
    setGameMode,
    result,
    setResult,

    // Popups
    showWinPopup,
    setShowWinPopup,
    showLossPopup,
    setShowLossPopup,
    showTiePopup,
    setShowTiePopup,

    // PvP Preview
    pvpPreviewData,
    setPvpPreviewData,
    showPvPPreview,
    setShowPvPPreview,

    // Error handling
    errorMessage,
    setErrorMessage,

    // Attack tracking
    attacksRemaining,
    setAttacksRemaining,
    maxAttacks,
    lastBattleResult,
    setLastBattleResult,

    // User profile
    userProfile,
    setUserProfile,
    refreshUserProfile,

    // Locked cards
    attackLockedCards,

    // Helper functions
    isCardLocked,
    getAvatarUrl,
    showVictory,
    payEntryFee,
  };

  return (
    <PlayerCardsContext.Provider value={value}>
      {children}
    </PlayerCardsContext.Provider>
  );
}

export function usePlayerCards() {
  const context = useContext(PlayerCardsContext);
  if (!context) {
    throw new Error('usePlayerCards must be used within PlayerCardsProvider');
  }
  return context;
}
