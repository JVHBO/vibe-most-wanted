"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { useAccount } from 'wagmi';
import { useConvex, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { devLog, devError } from '@/lib/utils/logger';
import { getEnabledCollections } from '@/lib/collections/index';
import { fetchNFTsFromAllCollections, fetchNFTsFromMultipleWallets, processNFTsToCards, getCardKey } from '@/lib/nft';
import { AudioManager } from '@/lib/audio-manager';
import { ConvexProfileService, type UserProfile } from '@/lib/convex-profile';
import { HAND_SIZE, getMaxAttacks } from '@/lib/config';
import type { Card, CardRarity, CardFoil } from '@/lib/types/card';
import type { CollectionId } from '@/lib/collections/index';

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

// Calculate attack power (VibeFID gets 10x)
const calculateLeaderboardAttackPower = (cards: Card[]): number => {
  return cards.reduce((sum, card) => {
    const multiplier = card.collection === 'vibefid' ? 10 : 1;
    return sum + ((card.power || 0) * multiplier);
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

  // Locked cards (cards in defense deck)
  const [attackLockedCards, setAttackLockedCards] = useState<{ lockedTokenIds: string[] } | null>(null);

  // Mutations
  const payAttackEntryFee = useMutation(api.economy.payEntryFee);

  // Load NFTs function - usa módulo centralizado @/lib/nft
  // 🔗 MULTI-WALLET: Busca NFTs de todas as wallets linkadas
  const loadNFTs = useCallback(async () => {
    if (!address) {
      console.log('! [Context] loadNFTs called but no address');
      return;
    }

    // Don't reload if already loaded
    if (status === 'loaded' && nfts.length > 0) {
      console.log('📦 [Context] Cards already loaded:', nfts.length);
      return;
    }

    // Don't load if already fetching
    if (status === 'fetching') {
      console.log('⏳ [Context] Already fetching, skipping');
      return;
    }

    console.log('🎴 [Context] Loading NFTs for:', address);

    try {
      setStatus('fetching');
      setErrorMsg(null);

      // 🔗 MULTI-WALLET: Get all linked addresses
      let allAddresses = [address.toLowerCase()];
      try {
        const linkedData = await convex.query(api.profiles.getLinkedAddresses, { address });
        if (linkedData?.primary) {
          // Build array of all addresses: primary + linked (all lowercase for proper deduplication)
          const primaryLower = linkedData.primary.toLowerCase();
          const linkedLower = (linkedData.linked || []).map((a: string) => a.toLowerCase());
          allAddresses = [primaryLower, ...linkedLower];
          // Remove duplicates and ensure current address is included (case-insensitive)
          allAddresses = [...new Set([...allAddresses, address.toLowerCase()])];
        }
        console.log(`🔗 [Context] Fetching from ${allAddresses.length} wallet(s):`, allAddresses.map(a => a.slice(0,8)));
      } catch (error) {
        console.warn('⚠️ Failed to get linked addresses, using current only:', error);
      }

      // Fetch NFTs from all wallets
      const raw = allAddresses.length > 1
        ? await fetchNFTsFromMultipleWallets(allAddresses)
        : await fetchNFTsFromAllCollections(address);

      // 🔄 METADATA REFRESH: Fetch fresh metadata from tokenUri (same as home page)
      // This fixes cards showing as "unopened" when Alchemy has stale data
      const METADATA_BATCH_SIZE = 50;
      const enrichedRaw: any[] = [];

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
            } catch {
              // Silent fail - use original data if refresh fails
            }
            return nft;
          })
        );
        enrichedRaw.push(...batchResults);
      }

      console.log(`🔄 [Context] Metadata refresh complete: ${enrichedRaw.length} NFTs`);

      const processed = await processNFTsToCards(enrichedRaw); // Já filtra unopened!

      // Deduplicate
      const seen = new Set<string>();
      const deduplicated = processed.filter(card => {
        const key = `${card.collection || 'default'}-${card.tokenId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // 🔗 MULTI-WALLET: Load FREE cards from cardInventory for ALL wallets
      try {
        let allFreeCards: any[] = [];
        for (const walletAddr of allAddresses) {
          const freeCards = await convex.query(api.cardPacks.getPlayerCards, { address: walletAddr });
          if (freeCards && freeCards.length > 0) {
            allFreeCards.push(...freeCards);
          }
        }
        console.log('🆓 FREE cards loaded from all wallets:', allFreeCards.length);

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

          // Deduplicate free cards
          const seenFree = new Set<string>();
          const uniqueFreeCards = freeCardsFormatted.filter((card: any) => {
            if (seenFree.has(card.tokenId)) return false;
            seenFree.add(card.tokenId);
            return true;
          });

          deduplicated.push(...uniqueFreeCards);
        }
      } catch (error) {
        console.warn('⚠️ Failed to load FREE cards:', error);
      }

      console.log('[Context] Setting NFTs:', deduplicated.length);
      setNfts(deduplicated);
      setStatus('loaded');
      console.log('🎉 [Context] Cards loaded! Status set to loaded');

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

  // 🔗 Reset state and reload when address changes (for wallet switching)
  const previousAddressRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    // If address changed, force reload
    if (address && previousAddressRef.current && address.toLowerCase() !== previousAddressRef.current.toLowerCase()) {
      console.log('[Context] 🔄 Address changed from', previousAddressRef.current.slice(0,8), 'to', address.slice(0,8));
      setNfts([]);
      setStatus('idle');
      setAttackSelectedCards([]);
      previousAddressRef.current = address;
      // Force reload after state reset
      setTimeout(() => {
        console.log('[Context] 🔄 Forcing reload after address change');
        loadNFTs();
      }, 100);
      return;
    }

    previousAddressRef.current = address;

    // Auto-load when idle
    console.log('[Context] Auto-load check:', { address: address?.slice(0,8), status, nftsCount: nfts.length });
    if (address && status === 'idle') {
      console.log('[Context] Starting auto-load...');
      loadNFTs();
    }
  }, [address, status, nfts.length, loadNFTs]);

  // Load user profile
  useEffect(() => {
    if (address) {
      ConvexProfileService.getProfile(address).then(profile => {
        if (profile) setUserProfile(profile);
      });
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

  // Load locked cards (defense deck) - same as page.tsx
  useEffect(() => {
    if (address && convex) {
      convex.query(api.profiles.getAvailableCards, { address, mode: 'attack' }).then(result => {
        setAttackLockedCards(result || null);
      }).catch(e => {
        devError('Error loading locked cards:', e);
      });
    }
  }, [address, convex]);

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

  // Helper: Check if card is locked - now takes card object for proper collection+tokenId comparison
  const isCardLocked = useCallback((card: { tokenId: string; collection?: string }, mode: 'attack' | 'pvp') => {
    // VibeFID cards are never locked
    if (card?.collection === 'vibefid') return false;

    if (mode === 'attack') {
      // Use getCardKey for proper collection:tokenId comparison
      const cardKey = getCardKey(card);
      return attackLockedCards?.lockedTokenIds?.includes(cardKey) || false;
    }
    return false;
  }, [attackLockedCards]);

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
