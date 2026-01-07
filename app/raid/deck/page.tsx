"use client";

/**
 * Raid Deck Selection Page
 *
 * Full-screen page for selecting 5 cards for the Raid Boss deck
 * Entry fee: Based on card rarities (Common: 1, Rare: 3, Epic: 5, Legendary: 10, Mythic: 15)
 */

import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AudioManager } from '@/lib/audio-manager';
import { CardMedia } from '@/components/CardMedia';
import LoadingSpinner from '@/components/LoadingSpinner';
import { PriceTicker } from '@/components/PriceTicker';
import {
  filterCardsByCollections,
  sortCardsByPower,
  getEnabledCollections,
  type CollectionId,
  type Card,
} from '@/lib/collections/index';
import { isSameCard, findCard, getCardKey } from '@/lib/nft';
import { useFarcasterTransferVBMS } from '@/lib/hooks/useFarcasterVBMS';
import { CONTRACTS } from '@/lib/contracts';
import { parseEther } from 'viem';
import { NotEnoughCardsGuide } from '@/components/NotEnoughCardsGuide';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlayerCards } from '@/contexts/PlayerCardsContext';
import { sdk } from '@farcaster/miniapp-sdk';
import { openMarketplace } from '@/lib/marketplace-utils';
import Link from 'next/link';
import { usePrimaryAddress } from '@/lib/hooks/usePrimaryAddress';

type NFT = Card;

const DECK_SIZE = 5;

// Cost by rarity (in VBMS)
const COST_BY_RARITY: Record<string, number> = {
  common: 1,
  rare: 3,
  epic: 5,
  legendary: 10,
  mythic: 15,
  vibefid: 50,
};

export default function RaidDeckPage() {
  const router = useRouter();
  const { isConnecting } = useAccount();
  const { primaryAddress: address } = usePrimaryAddress(); // 🔗 MULTI-WALLET: Use primary address
  const { t } = useLanguage();
  const { nfts: availableCards, isLoading: isLoadingCards } = usePlayerCards();
  const [soundEnabled] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);

  // Deck selection state
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCollections, setSelectedCollections] = useState<CollectionId[]>([]);
  const [isSettingDeck, setIsSettingDeck] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showVibeFIDStep, setShowVibeFIDStep] = useState(false);
  const [selectedCards, setSelectedCards] = useState<NFT[]>([]);
  const [selectedVibeFID, setSelectedVibeFID] = useState<NFT | null>(null);
  const [sortByPower, setSortByPower] = useState(true);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const CARDS_PER_PAGE = 50;

  // Check if running in Farcaster miniapp
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track when cards have finished loading
  useEffect(() => {
    // Only mark as loaded when context has finished loading
    if (!isLoadingCards) {
      const timer = setTimeout(() => {
        setCardsLoaded(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Reset to loading state when cards are being fetched
      setCardsLoaded(false);
    }
  }, [isLoadingCards]);

  // Calculate dynamic cost based on selected cards
  const totalCost = useMemo(() => {
    let cost = selectedCards.reduce((sum, card) => {
      const rarity = card.rarity.toLowerCase();
      return sum + (COST_BY_RARITY[rarity] || COST_BY_RARITY.common);
    }, 0);
    if (selectedVibeFID) {
      cost += COST_BY_RARITY.vibefid;
    }
    return cost;
  }, [selectedCards, selectedVibeFID]);

  // Web3 hooks
  const farcasterTransfer = useFarcasterTransferVBMS();
  const { transfer: transferVBMS, isPending: isTransferring } = farcasterTransfer;

  // Convex queries and mutations
  const currentBoss = useQuery(api.raidBoss.getCurrentRaidBoss);
  const setRaidDeck = useMutation(api.raidBoss.setRaidDeck);

  // Get locked cards - uses collection:tokenId format for proper comparison
  const lockedCardsData = useQuery(
    api.profiles.getLockedCardsForDeckBuilding,
    address ? { address: address.toLowerCase(), mode: "raid" as const } : "skip"
  );
  // Convert to Set of card keys (collection:tokenId) for accurate comparison
  const lockedCardKeys = new Set(lockedCardsData?.lockedTokenIds || []);

  // Filter cards - exclude vibefid from main selection (shown in step 2)
  // Note: Unopened cards are already filtered by PlayerCardsContext
  const revealedCards = (availableCards || []).filter(card => {
    if (!showVibeFIDStep && card.collection === 'vibefid') return false;
    return true;
  });

  const sortedCards = sortByPower
    ? sortCardsByPower(revealedCards, false)
    : revealedCards;

  const filteredCards = useMemo(() => {
    if (selectedCollections.length === 0) return sortedCards;
    return filterCardsByCollections(sortedCards, selectedCollections);
  }, [sortedCards, selectedCollections]);

  const vibeFIDCards = useMemo(() => {
    // Note: Unopened cards are already filtered by PlayerCardsContext
    return (availableCards || []).filter(card => card.collection === 'vibefid');
  }, [availableCards]);

  // Helper function to calculate buff
  const getCardBuff = (card: NFT): { multiplier: number; label: string; color: string } | null => {
    const isFree = (card as any).isFreeCard;
    if (isFree) return null;
    if (card.collection === 'vibefid') {
      return { multiplier: 5.0, label: '5x', color: 'text-purple-400' };
    }
    if (card.collection === 'vibe') {
      return { multiplier: 2.0, label: '2x', color: 'text-yellow-400' };
    }
    if (card.collection === 'nothing') {
      return { multiplier: 0.5, label: '-50%', color: 'text-red-400' };
    }
    if (currentBoss && card.collection === currentBoss.collection) {
      return { multiplier: 2.0, label: '2x', color: 'text-blue-400' };
    }
    return null;
  };

  // Pagination
  const totalPages = Math.ceil(filteredCards.length / CARDS_PER_PAGE);
  const paginatedCards = filteredCards.slice(
    currentPage * CARDS_PER_PAGE,
    (currentPage + 1) * CARDS_PER_PAGE
  );

  // Calculate total power
  const totalPower = selectedCards.reduce((sum: number, card) => {
    const buff = getCardBuff(card);
    const cardPower = buff ? Math.floor(card.power * buff.multiplier) : card.power;
    return sum + cardPower;
  }, 0);

  const totalBasePower = selectedCards.reduce((sum: number, card) => sum + card.power, 0);

  // Check if card is locked - uses collection:tokenId for accurate comparison
  const isCardLocked = (card: NFT): boolean => {
    if (card.collection === 'vibefid') return false;
    // Use getCardKey to properly identify card across collections
    return lockedCardKeys.has(getCardKey(card));
  };

  const handleCardClick = (card: NFT) => {
    if (isCardLocked(card)) {
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    // Use findCard to check by BOTH tokenId AND collection
    const isSelected = findCard(selectedCards, card);

    if (isSelected) {
      // Use isSameCard to filter by BOTH tokenId AND collection
      setSelectedCards((prev) => prev.filter((c) => !isSameCard(c, card)));
      if (soundEnabled) {
        AudioManager.deselectCard();
        AudioManager.hapticFeedback('light');
      }
    } else if (selectedCards.length < DECK_SIZE) {
      setSelectedCards((prev) => [...prev, card]);
      if (soundEnabled) {
        AudioManager.selectCardByRarity(card.rarity);
      }
    }
  };

  const handleConfirm = () => {
    if (selectedCards.length !== DECK_SIZE) return;
    if (vibeFIDCards.length > 0) {
      setShowVibeFIDStep(true);
      if (soundEnabled) AudioManager.buttonClick();
    } else {
      proceedWithPayment();
    }
  };

  const proceedWithPayment = async () => {
    if (!address) return;
    setIsSettingDeck(true);
    setErrorMessage(null);

    try {
      if (soundEnabled) AudioManager.buttonClick();

      const txHash = await transferVBMS(
        CONTRACTS.VBMSPoolTroll as `0x${string}`,
        parseEther(totalCost.toString())
      );

      const deckData = selectedCards.map((card) => ({
        tokenId: card.tokenId,
        name: card.name,
        imageUrl: card.imageUrl,
        power: card.power,
        rarity: card.rarity,
        collection: card.collection!,
        foil: card.foil,
        isFreeCard: (card as any).isFreeCard || false,
      }));

      const vibefidCardData = selectedVibeFID ? {
        tokenId: selectedVibeFID.tokenId,
        name: selectedVibeFID.name,
        imageUrl: selectedVibeFID.imageUrl,
        power: selectedVibeFID.power,
        rarity: selectedVibeFID.rarity,
        collection: selectedVibeFID.collection!,
        foil: selectedVibeFID.foil,
      } : undefined;

      await setRaidDeck({
        address: address.toLowerCase(),
        deck: deckData,
        vibefidCard: vibefidCardData,
        txHash,
      });

      if (soundEnabled) AudioManager.buttonSuccess();
      router.push('/raid');

    } catch (error: any) {
      console.error('Error setting raid deck:', error);
      setErrorMessage(error?.message || 'Failed to set raid deck. Please try again.');
      if (soundEnabled) AudioManager.hapticFeedback('heavy');
    } finally {
      setIsSettingDeck(false);
    }
  };

  const handleCancel = () => {
    if (soundEnabled) AudioManager.buttonNav();
    router.push('/raid');
  };

  // Loading states
  if (!isMounted || isConnecting) {
    return (
      <div className="min-h-screen bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!address) {
    return (
      <div className="min-h-screen bg-vintage-deep-black text-white">
        <PriceTicker />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">🎴</div>
            <h1 className="text-2xl font-display font-bold text-vintage-gold mb-4">
              Build Raid Deck
            </h1>
            <p className="text-vintage-burnt-gold text-lg mb-6">
              Connect your wallet to build your raid deck
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-vintage-gold text-vintage-black rounded-lg font-bold hover:bg-vintage-ice transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vintage-deep-black flex flex-col">
      <PriceTicker />

      {/* Header */}
      <div className="flex-shrink-0 bg-vintage-charcoal border-b-2 border-vintage-gold/30 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="group px-3 py-2 bg-black/50 hover:bg-vintage-gold/10 text-vintage-burnt-gold hover:text-vintage-gold border border-vintage-gold/20 hover:border-vintage-gold/50 rounded transition-all duration-200 text-xs font-bold uppercase tracking-wider"
          >
            <span className="group-hover:-translate-x-0.5 inline-block transition-transform">←</span> Back
          </button>
          <h1 className="text-lg md:text-2xl font-display font-bold text-vintage-gold whitespace-nowrap">
            {showVibeFIDStep ? 'VibeFID Card?' : 'Raid Deck'}
          </h1>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-6xl mx-auto w-full p-4">
        {showVibeFIDStep ? (
          /* Step 2: VibeFID Selection */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Selected 5 Cards Summary */}
            <div className="flex-shrink-0 mb-4">
              <h3 className="text-sm font-bold text-vintage-burnt-gold mb-2">Your Selected Deck ({selectedCards.length} cards)</h3>
              <div className="grid grid-cols-5 gap-2">
                {selectedCards.map((card, idx) => (
                  <div key={idx} className="relative">
                    <CardMedia src={card.imageUrl} alt={card.name} className="rounded-lg aspect-[2/3] object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-1 py-1 rounded-b-lg">
                      <div className="text-vintage-gold text-xs font-bold text-center">{card.power}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* VibeFID Benefits */}
            <div className="flex-shrink-0 mb-4 bg-purple-900/30 border border-purple-500/50 rounded-lg p-4">
              <h3 className="text-lg font-bold text-purple-400 mb-2">VibeFID 6th Slot Benefits</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💥</span>
                  <div className="font-bold text-purple-400">5x Card Damage!</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">👥</span>
                  <div className="font-bold text-yellow-300">+50% Team Buff</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <div className="font-bold text-purple-300">Infinite Energy</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <div className="font-bold text-green-300">30% Crit Chance</div>
                </div>
              </div>
              <div className="text-center text-vintage-gold font-bold text-sm mt-3">
                Cost: +50 VBMS
              </div>
            </div>

            {/* VibeFID Card Selection */}
            <div className="flex-1 overflow-y-auto mb-4">
              <h3 className="text-sm font-bold text-vintage-gold mb-2">Select VibeFID Card (Optional)</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {vibeFIDCards.map((card) => {
                  // Use isSameCard for proper collection + tokenId comparison
                  const isSelected = selectedVibeFID ? isSameCard(selectedVibeFID, card) : false;
                  return (
                    <div
                      key={card.tokenId}
                      onClick={() => {
                        setSelectedVibeFID(isSelected ? null : card);
                        if (soundEnabled) AudioManager.selectCardByRarity('vibefid');
                      }}
                      className={`relative cursor-pointer transition-all transform hover:scale-105 ${
                        isSelected
                          ? 'ring-4 ring-purple-500 shadow-neon scale-105'
                          : 'hover:ring-2 hover:ring-purple-400/50'
                      }`}
                    >
                      <CardMedia src={card.imageUrl} alt={card.name} className="rounded-lg aspect-[3/4] object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 rounded-b-lg">
                        <div className="text-white text-xs font-bold truncate">{card.name}</div>
                        <div className="text-purple-400 text-xs">{card.power} <span className="text-purple-300">(5x = {card.power * 5})</span></div>
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <div className="bg-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl">
                            ✓
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VibeFID Step Footer */}
            <div className="flex-shrink-0 flex gap-2">
              <button
                onClick={() => {
                  setShowVibeFIDStep(false);
                  setSelectedVibeFID(null);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                disabled={isSettingDeck}
                className="flex-1 px-4 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-lg font-bold transition disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  setSelectedVibeFID(null);
                  proceedWithPayment();
                }}
                disabled={isSettingDeck}
                className="flex-1 px-4 py-3 bg-vintage-red/80 hover:bg-vintage-red text-white rounded-lg font-bold transition disabled:opacity-50"
              >
                Skip VibeFID
              </button>
              <button
                onClick={proceedWithPayment}
                disabled={!selectedVibeFID || isSettingDeck}
                className={`flex-1 px-4 py-3 rounded-lg font-display font-bold transition-all uppercase ${
                  selectedVibeFID && !isSettingDeck
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-neon'
                    : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                }`}
              >
                {isSettingDeck ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner />
                    Processing...
                  </span>
                ) : selectedVibeFID ? (
                  `ADD VIBEFID (+50 VBMS)`
                ) : (
                  'SELECT VIBEFID'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Step 1: Regular Card Selection */
          <>
            {/* VibeFID Benefits Box */}
            {(() => {
              const hasVibeFID = (availableCards || []).some(card => card.collection === 'vibefid');
              return (
                <div className="mb-4 flex-shrink-0">
                  <div className={`border rounded-lg p-3 ${hasVibeFID ? 'bg-purple-900/20 border-purple-500/50' : 'bg-vintage-gold/10 border-vintage-gold/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-vintage-gold">VibeFID - 6th Slot Special Card</h3>
                      {!hasVibeFID && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (soundEnabled) AudioManager.buttonClick();
                            await openMarketplace('https://farcaster.xyz/miniapps/aisYLhjuH5_G/vibefid', sdk, true);
                          }}
                          className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black text-sm font-bold rounded-lg transition cursor-pointer"
                        >
                          Mint VibeFID
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-red-400">💥</span>
                        <span className="text-purple-400">5x Card Damage!</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">👥</span>
                        <span className="text-vintage-burnt-gold">+50% Team Buff</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400">⚡</span>
                        <span className="text-vintage-burnt-gold">Infinite Energy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-green-400">🎯</span>
                        <span className="text-vintage-burnt-gold">30% Crit Chance</span>
                      </div>
                    </div>
                    {!hasVibeFID && (
                      <p className="text-vintage-burnt-gold text-xs mt-2 italic">
                        You don't have a VibeFID yet. Mint one to unlock these powerful benefits!
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Info */}
            <div className="text-center mb-2 flex-shrink-0">
              <p className="text-vintage-burnt-gold text-sm font-modern">
                Select {DECK_SIZE} cards • Fee: {totalCost > 0 ? `${totalCost} VBMS` : 'Based on rarities'} • Selected {selectedCards.length}/{DECK_SIZE}
              </p>
              {currentBoss && (
                <div className="text-xs font-modern mt-1 flex gap-3 justify-center">
                  <span className="text-purple-400">VibeFID: +50%</span>
                  <span className="text-blue-400">
                    {currentBoss.collection === 'vibe' ? 'VBMS' :
                     currentBoss.collection === 'gmvbrs' ? 'GM VBRS' :
                     currentBoss.collection === 'vibefid' ? 'VibeFID' : currentBoss.collection}: 2x
                  </span>
                </div>
              )}
            </div>

            {/* Controls Row */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4 flex-shrink-0">
              <select
                value={selectedCollections.length === 0 ? 'all' : selectedCollections[0]}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setSelectedCollections([]);
                  } else {
                    setSelectedCollections([e.target.value as CollectionId]);
                  }
                  setCurrentPage(0);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className="px-3 py-2 rounded-lg text-sm font-modern font-medium transition-all bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10 focus:outline-none focus:ring-2 focus:ring-vintage-gold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-gold"
              >
                <option value="all">All Collections</option>
                {getEnabledCollections().map(col => (
                  <option key={col.id} value={col.id}>{col.displayName}</option>
                ))}
              </select>

              <button
                onClick={() => {
                  setSortByPower(!sortByPower);
                  setCurrentPage(0);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                  sortByPower
                    ? 'bg-vintage-gold text-vintage-black'
                    : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
                }`}
              >
                {sortByPower ? '⚡ Sorted by Power' : '⚡ Sort by Power'}
              </button>
            </div>

            {/* Selected Deck Display */}
            <div className="mb-4 bg-vintage-gold/20 border border-vintage-gold/50 rounded-lg p-3 flex-shrink-0">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: DECK_SIZE }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] border border-dashed border-vintage-gold/50 rounded-lg flex flex-col items-center justify-center overflow-hidden relative"
                  >
                    {selectedCards[i] ? (
                      <>
                        <CardMedia
                          src={selectedCards[i].imageUrl}
                          alt={`#${selectedCards[i].tokenId}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-1 text-vintage-gold text-xs font-bold text-center">
                          {selectedCards[i].power?.toLocaleString()}
                        </div>
                      </>
                    ) : (
                      <span className="text-vintage-gold text-2xl">+</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-center">
                <p className="text-vintage-gold font-bold text-lg">{totalPower.toLocaleString()}</p>
                {totalPower !== totalBasePower && (
                  <p className="text-xs text-green-400">Base: {totalBasePower.toLocaleString()}</p>
                )}
              </div>
            </div>

            {/* Available Cards Grid */}
            {!cardsLoaded ? (
              <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : revealedCards.length < DECK_SIZE ? (
              <NotEnoughCardsGuide
                currentCards={revealedCards.length}
                requiredCards={DECK_SIZE}
                gameMode="raid"
                onClose={() => router.push('/raid')}
                t={t}
              />
            ) : (
              <div className="flex-1 overflow-y-auto mb-4">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 pb-2">
                  {paginatedCards.map((card) => {
                    // Use findCard for proper collection + tokenId comparison
                    const isSelected = findCard(selectedCards, card);
                    const locked = isCardLocked(card);
                    const buff = getCardBuff(card);
                    return (
                      <button
                        key={getCardKey(card)}
                        onClick={() => handleCardClick(card)}
                        disabled={locked}
                        title={locked ? "This card is in your Defense Deck" : undefined}
                        className={`aspect-[2/3] relative rounded-lg overflow-hidden border-2 transition ${
                          locked
                            ? 'opacity-50 cursor-not-allowed border-vintage-gold/30'
                            : isSelected
                            ? 'border-vintage-gold shadow-gold scale-95'
                            : 'border-vintage-gold/30 hover:border-vintage-gold/60 hover:scale-105'
                        }`}
                      >
                        <CardMedia
                          src={card.imageUrl}
                          alt={`#${card.tokenId}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">
                          {card.power?.toLocaleString()}
                        </div>
                        {buff && (
                          <div className={`absolute top-0 right-0 bg-black/80 ${buff.color} text-xs px-1 rounded-bl font-bold`}>
                            {buff.label}
                          </div>
                        )}
                        {locked && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                            <div className="text-2xl mb-1">🛡️</div>
                            <div className="text-xs text-white font-bold bg-black/50 px-2 rounded">
                              IN DEFENSE
                            </div>
                          </div>
                        )}
                        {isSelected && !locked && (
                          <div className="absolute inset-0 bg-vintage-gold/20 flex items-center justify-center">
                            <span className="text-4xl text-vintage-gold">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-4 flex-shrink-0">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                    currentPage === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
                  }`}
                >
                  ← Prev
                </button>
                <span className="text-vintage-gold font-bold text-sm">
                  {currentPage + 1}/{totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                    currentPage === totalPages - 1
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
                  }`}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 flex-shrink-0">
              {errorMessage && (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={selectedCards.length !== DECK_SIZE || isSettingDeck}
                className={`w-full px-4 py-3 rounded-lg font-display font-bold text-base transition-all uppercase ${
                  selectedCards.length === DECK_SIZE && !isSettingDeck
                    ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black shadow-gold'
                    : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                }`}
              >
                {isSettingDeck ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner />
                    Processing...
                  </span>
                ) : selectedCards.length === DECK_SIZE ? (
                  `SET RAID DECK (${totalCost} VBMS)`
                ) : (
                  `SELECT ${DECK_SIZE - selectedCards.length} MORE`
                )}
              </button>

              <button
                onClick={handleCancel}
                disabled={isSettingDeck}
                className="w-full px-4 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-lg font-modern font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
