/**
 * Raid Deck Selection Modal
 *
 * Modal for selecting 5 cards for the Raid Boss deck
 * Entry fee: Based on card rarities (Common: 1, Rare: 3, Epic: 5, Legendary: 10, Mythic: 15)
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AudioManager } from '@/lib/audio-manager';
import { CardMedia } from '@/components/CardMedia';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  filterCardsByCollections,
  sortCardsByPower,
  getEnabledCollections,
  type CollectionId,
  type Card,
} from '@/lib/collections/index';
import { useTransferVBMS } from '@/lib/hooks/useVBMSContracts';
import { useFarcasterTransferVBMS } from '@/lib/hooks/useFarcasterVBMS';
import { CONTRACTS } from '@/lib/contracts';
import { parseEther } from 'viem';
import { NotEnoughCardsGuide } from './NotEnoughCardsGuide';
import { useLanguage } from '@/contexts/LanguageContext';

type NFT = Card;

interface RaidDeckSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deck: NFT[]) => void;
  t: (key: string, params?: Record<string, any>) => string;
  selectedCards: NFT[];
  setSelectedCards: (cards: NFT[] | ((prev: NFT[]) => NFT[])) => void;
  availableCards: NFT[];
  sortByPower: boolean;
  setSortByPower: (sort: boolean) => void;
  soundEnabled: boolean;
  playerAddress: string;
}

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

export function RaidDeckSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  t,
  selectedCards,
  setSelectedCards,
  availableCards,
  sortByPower,
  setSortByPower,
  soundEnabled,
  playerAddress,
}: RaidDeckSelectionModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCollections, setSelectedCollections] = useState<CollectionId[]>([]);
  const [isSettingDeck, setIsSettingDeck] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showVibeFIDStep, setShowVibeFIDStep] = useState(false); // Step 2: VibeFID optional selection
  const [selectedVibeFID, setSelectedVibeFID] = useState<NFT | null>(null); // Optional 6th card
  const [cardsLoaded, setCardsLoaded] = useState(false); // Track if cards finished loading
  const CARDS_PER_PAGE = 50;

  // Translations
  const { t: translate } = useLanguage();

  // Track when cards have finished loading
  useEffect(() => {
    // Consider cards loaded if availableCards array has been populated (even if 0 cards)
    // We use a small delay to avoid flash of content
    if (availableCards !== undefined) {
      const timer = setTimeout(() => {
        setCardsLoaded(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [availableCards]);

  // Calculate dynamic cost based on selected cards (including optional VibeFID)
  const totalCost = useMemo(() => {
    let cost = selectedCards.reduce((sum, card) => {
      const rarity = card.rarity.toLowerCase();
      return sum + (COST_BY_RARITY[rarity] || COST_BY_RARITY.common);
    }, 0);

    // Add VibeFID cost if selected
    if (selectedVibeFID) {
      cost += COST_BY_RARITY.vibefid;
    }

    return cost;
  }, [selectedCards, selectedVibeFID]);

  // Web3 hooks
  const { address: walletAddress } = useAccount();
  const effectiveAddress = (playerAddress || walletAddress) as `0x${string}` | undefined;

  // Detect miniapp - check multiple conditions
  const isInMiniapp = typeof window !== 'undefined' && (
    window.parent !== window || // In iframe
    !!(window as any).sdk?.wallet || // Farcaster SDK available
    window.location.href.includes('frames.farcaster.xyz') // Farcaster domain
  );

  // Always use Farcaster hooks (works for both miniapp and web via wagmi)
  const farcasterTransfer = useFarcasterTransferVBMS();
  const { transfer: transferVBMS, isPending: isTransferring } = farcasterTransfer;

  // Debug log
  if (typeof window !== 'undefined') {
    console.log('[RaidDeckSelection] Environment:', {
      isInMiniapp,
      inIframe: window.parent !== window,
      hasSDK: !!(window as any).sdk?.wallet,
      isFarcasterDomain: window.location.href.includes('frames.farcaster.xyz'),
    });
  }

  // Convex queries and mutations
  const currentBoss = useQuery(api.raidBoss.getCurrentRaidBoss);
  const setRaidDeck = useMutation(api.raidBoss.setRaidDeck);

  // Get locked cards (cards in defense deck cannot be used in raid)
  const lockedCardsData = useQuery(
    api.profiles.getLockedCardsForDeckBuilding,
    playerAddress ? { address: playerAddress, mode: "raid" as const } : "skip"
  );
  const lockedTokenIds = new Set(lockedCardsData?.lockedTokenIds || []);

  // Sort cards (exclude VibeFID in Step 1)
  const sortedCards = sortByPower
    ? sortCardsByPower(availableCards.filter(card => showVibeFIDStep || card.collection !== 'vibefid'), false) // false = descending order
    : availableCards.filter(card => showVibeFIDStep || card.collection !== 'vibefid');

  // Filter by collections
  const filteredCards = useMemo(() => {
    if (selectedCollections.length === 0) {
      return sortedCards;
    }
    return filterCardsByCollections(sortedCards, selectedCollections);
  }, [sortedCards, selectedCollections]);

  // Check if user has VibeFID cards
  const vibeFIDCards = useMemo(() => {
    return availableCards.filter(card => card.collection === 'vibefid');
  }, [availableCards]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  // Helper function to calculate buff for a card
  const getCardBuff = (card: NFT): { multiplier: number; label: string; color: string } | null => {
    const isFree = (card as any).isFreeCard;
    if (isFree) return null; // Free cards don't get buffs

    if (card.collection === 'vibefid') {
      return { multiplier: 10.0, label: '10x', color: 'text-red-400' };
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

  // Calculate total power (with buffs)
  const totalPower = selectedCards.reduce((sum: number, card) => {
    const buff = getCardBuff(card);
    const cardPower = buff ? Math.floor(card.power * buff.multiplier) : card.power;
    return sum + cardPower;
  }, 0);

  const totalBasePower = selectedCards.reduce((sum: number, card) => sum + card.power, 0);

  // Check if card is locked (in defense deck)
  const isCardLocked = (card: NFT): boolean => {
    // VibeFID cards are never locked
    if (card.collection === 'vibefid') return false;
    return lockedTokenIds.has(card.tokenId);
  };

  const handleCardClick = (card: NFT) => {
    // Check if card is locked (in defense deck)
    if (isCardLocked(card)) {
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    const isSelected = selectedCards.find((c) => c.tokenId === card.tokenId);

    if (isSelected) {
      setSelectedCards((prev) => prev.filter((c) => c.tokenId !== card.tokenId));
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

  // Step 1: Handle initial 5-card confirmation - go to VibeFID step if available
  const handleConfirm = () => {
    if (selectedCards.length !== DECK_SIZE) return;

    // If user has VibeFID cards, show VibeFID selection step
    if (vibeFIDCards.length > 0) {
      setShowVibeFIDStep(true);
      if (soundEnabled) AudioManager.buttonClick();
    } else {
      // No VibeFID available, proceed directly to payment
      proceedWithPayment();
    }
  };

  // Step 2: Proceed with payment and deck setting (called from VibeFID step or directly)
  const proceedWithPayment = async () => {
    setIsSettingDeck(true);
    setErrorMessage(null);

    try {
      if (soundEnabled) AudioManager.buttonClick();

      console.log(`💰 Transferring ${totalCost} VBMS to pool for raid deck entry...`);

      // Transfer dynamic cost to pool
      const txHash = await transferVBMS(
        CONTRACTS.VBMSPoolTroll as `0x${string}`,
        parseEther(totalCost.toString())
      );

      console.log('✅ Transfer successful, txHash:', txHash);

      // Format deck for Convex (5 regular cards)
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

      // Format VibeFID card if selected
      const vibefidCardData = selectedVibeFID ? {
        tokenId: selectedVibeFID.tokenId,
        name: selectedVibeFID.name,
        imageUrl: selectedVibeFID.imageUrl,
        power: selectedVibeFID.power,
        rarity: selectedVibeFID.rarity,
        collection: selectedVibeFID.collection!,
        foil: selectedVibeFID.foil,
      } : undefined;

      // Call Convex mutation to set raid deck (with optional VibeFID)
      await setRaidDeck({
        address: playerAddress.toLowerCase(),
        deck: deckData,
        vibefidCard: vibefidCardData,
        txHash,
      });

      console.log('✅ Raid deck set successfully!');
      onConfirm(selectedCards);

    } catch (error: any) {
      console.error('❌ Error setting raid deck:', error);
      setErrorMessage(error?.message || 'Failed to set raid deck. Please try again.');
      if (soundEnabled) AudioManager.hapticFeedback('heavy');
    } finally {
      setIsSettingDeck(false);
    }
  };

  const handleCancel = () => {
    if (soundEnabled) AudioManager.buttonNav();
    onClose();
    setSelectedCards([]);
    setShowVibeFIDStep(false);
    setSelectedVibeFID(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-[250] p-2"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold max-w-6xl w-full p-2 md:p-3 shadow-neon max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="text-lg md:text-2xl font-display font-bold text-center mb-1 text-vintage-gold flex-shrink-0">
          {showVibeFIDStep ? '🎴 ADD VIBEFID CARD? 🎴' : '⚔️ BUILD YOUR RAID DECK ⚔️'}
        </h2>

        {/* Step 2: VibeFID Selection */}
        {showVibeFIDStep ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Selected 5 Cards Summary */}
            <div className="flex-shrink-0 mb-2">
              <h3 className="text-sm font-bold text-vintage-burnt-gold mb-1">Your Selected Deck ({selectedCards.length} cards)</h3>
              <div className="grid grid-cols-5 gap-1">
                {selectedCards.map((card, idx) => (
                  <div key={idx} className="relative">
                    <CardMedia src={card.imageUrl} alt={card.name} className="rounded-lg aspect-[2/3] object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-0.5 py-0.5 rounded-b-lg">
                      <div className="text-vintage-gold text-[9px] font-bold text-center">⚡{card.power}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* VibeFID Benefits */}
            <div className="flex-shrink-0 mb-2 bg-purple-900/30 border border-purple-500/50 rounded-lg p-2">
              <h3 className="text-sm font-bold text-purple-400 mb-1">✨ VibeFID 6th Slot Benefits ✨</h3>
              <div className="grid grid-cols-2 gap-1 text-[10px] mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs">💥</span>
                  <div className="font-bold text-red-400">10x Card Damage!</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs">👥</span>
                  <div className="font-bold text-yellow-300">+50% Team Buff</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs">⚡</span>
                  <div className="font-bold text-purple-300">Infinite Energy</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs">🎯</span>
                  <div className="font-bold text-green-300">30% Crit Chance</div>
                </div>
              </div>
              <div className="text-center text-vintage-gold font-bold text-xs">
                Cost: +50 VBMS
              </div>
            </div>

            {/* VibeFID Card Selection */}
            <div className="flex-1 overflow-y-auto mb-2">
              <h3 className="text-sm font-bold text-vintage-gold mb-1">Select VibeFID Card (Optional)</h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {vibeFIDCards.map((card) => {
                  const isSelected = selectedVibeFID?.tokenId === card.tokenId;
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
                        <div className="text-purple-400 text-xs">⚡ {card.power} <span className="text-red-400">(10x = {card.power * 10})</span></div>
                      </div>
                      {isSelected && (
                        <div className="absolute inset-0 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg">
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
            <div className="flex-shrink-0 flex gap-1">
              <button
                onClick={() => {
                  setShowVibeFIDStep(false);
                  setSelectedVibeFID(null);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                disabled={isSettingDeck}
                className="flex-1 px-3 py-2 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-lg font-modern font-semibold text-xs transition disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  setSelectedVibeFID(null);
                  proceedWithPayment();
                }}
                disabled={isSettingDeck}
                className="flex-1 px-3 py-2 bg-vintage-red/80 hover:bg-vintage-red text-white rounded-lg font-bold text-xs transition disabled:opacity-50"
              >
                Skip VibeFID
              </button>
              <button
                onClick={proceedWithPayment}
                disabled={!selectedVibeFID || isSettingDeck}
                className={`flex-1 px-3 py-2 rounded-lg font-display font-bold text-xs transition-all uppercase ${
                  selectedVibeFID && !isSettingDeck
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-neon'
                    : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                }`}
              >
                {isSettingDeck ? (
                  <span className="flex items-center justify-center gap-1 text-[10px]">
                    <LoadingSpinner />
                    Processing...
                  </span>
                ) : selectedVibeFID ? (
                  `ADD VIBEFID (+${COST_BY_RARITY.vibefid} VBMS)`
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
          const hasVibeFID = availableCards.some(card => card.collection === 'vibefid');

          return (
            <div className="mb-2 flex-shrink-0">
              <div className={`border rounded-lg p-2 ${hasVibeFID ? 'bg-purple-900/20 border-purple-500/50' : 'bg-vintage-gold/10 border-vintage-gold/50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-vintage-gold">VibeFID - 6th Slot Special Card</h3>
                  {!hasVibeFID && (
                    <a
                      href="/fid"
                      className="px-3 py-1 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black text-xs font-bold rounded-lg transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (soundEnabled) AudioManager.buttonClick();
                      }}
                    >
                      Mint VibeFID
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-[10px]">
                  <div className="flex items-center gap-0.5">
                    <span className="text-red-400 text-xs">💥</span>
                    <span className="text-vintage-burnt-gold">10x Card Damage!</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-yellow-400 text-xs">👥</span>
                    <span className="text-vintage-burnt-gold">+50% Team Buff</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-purple-400 text-xs">⚡</span>
                    <span className="text-vintage-burnt-gold">Infinite Energy</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-green-400 text-xs">🎯</span>
                    <span className="text-vintage-burnt-gold">30% Crit Chance</span>
                  </div>
                </div>
                {!hasVibeFID && (
                  <p className="text-vintage-burnt-gold text-[9px] mt-1 italic">
                    You don't have a VibeFID yet. Mint one to unlock these powerful benefits!
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Info */}
        <div className="text-center mb-1 flex-shrink-0">
          <p className="text-vintage-burnt-gold text-[10px] font-modern">
            Select {DECK_SIZE} cards • Fee: {totalCost > 0 ? `${totalCost} VBMS` : 'Based on rarities'} • Selected {selectedCards.length}/{DECK_SIZE}
          </p>
          {currentBoss && (
            <div className="text-[9px] font-modern mt-0.5 flex gap-2 justify-center">
              <span className="text-purple-400">VibeFID: +50%</span>
              <span className="text-blue-400">
                {currentBoss.collection === 'vibe' ? 'VBMS' :
                 currentBoss.collection === 'gmvbrs' ? 'GM VBRS' :
                 currentBoss.collection === 'vibefid' ? 'VibeFID' :
                 currentBoss.collection === 'americanfootball' ? 'AFCL' : currentBoss.collection}: 2x
              </span>
            </div>
          )}
        </div>

        {/* Controls Row: Collection Filter + Sort Button */}
        <div className="flex flex-wrap items-center justify-center gap-1 mb-2 flex-shrink-0">
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
            className="px-2 py-1 rounded-lg text-[10px] font-modern font-medium transition-all bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10 focus:outline-none focus:ring-2 focus:ring-vintage-gold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-gold"
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
            className={`px-2 py-1 rounded-lg font-bold text-[10px] transition-all ${
              sortByPower
                ? 'bg-vintage-gold text-vintage-black'
                : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
            }`}
          >
            {sortByPower ? '⚡ Sorted by Power' : '⚡ Sort by Power'}
          </button>
        </div>

        {/* Selected Deck Display */}
        <div className="mb-2 bg-vintage-gold/20 border border-vintage-gold/50 rounded-lg p-2 flex-shrink-0">
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: DECK_SIZE }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] border border-dashed border-vintage-gold/50 rounded-md flex flex-col items-center justify-center overflow-hidden relative"
              >
                {selectedCards[i] ? (
                  <>
                    <CardMedia
                      src={selectedCards[i].imageUrl}
                      alt={`#${selectedCards[i].tokenId}`}
                      className="w-full h-full object-cover rounded-md"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-0.5 text-vintage-gold text-[9px] font-bold text-center">
                      ⚡{selectedCards[i].power?.toLocaleString()}
                    </div>
                  </>
                ) : (
                  <span className="text-vintage-gold text-xl">+</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1 text-center">
            <p className="text-vintage-gold font-bold text-sm">{totalPower.toLocaleString()}</p>
            {totalPower !== totalBasePower && (
              <p className="text-[9px] text-green-400">Base: {totalBasePower.toLocaleString()}</p>
            )}
          </div>
        </div>

        {/* Available Cards Grid */}
        {!cardsLoaded ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : availableCards.length < DECK_SIZE ? (
          <NotEnoughCardsGuide
            currentCards={availableCards.length}
            requiredCards={DECK_SIZE}
            gameMode="raid"
            onClose={onClose}
            t={translate}
          />
        ) : (
          <div className="flex-1 overflow-y-auto mb-2">
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 pb-2">
              {paginatedCards.map((card) => {
                const isSelected = selectedCards.find((c) => c.tokenId === card.tokenId);
                const locked = isCardLocked(card);
                const buff = getCardBuff(card);
                return (
                  <button
                    key={card.tokenId}
                    onClick={() => handleCardClick(card)}
                    disabled={locked}
                    title={locked ? "🔒 This card is in your Defense Deck" : undefined}
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
                        <div className="text-2xl mb-0.5">🛡️</div>
                        <div className="text-[8px] text-white font-bold bg-black/50 px-1 rounded">
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
          <div className="flex items-center justify-center gap-1 mb-2 flex-shrink-0">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className={`px-3 py-1 rounded-lg font-bold text-[10px] transition ${
                currentPage === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
              }`}
            >
              ← Prev
            </button>
            <span className="text-vintage-gold font-bold text-[10px]">
              {currentPage + 1}/{totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className={`px-3 py-1 rounded-lg font-bold text-[10px] transition ${
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
        <div className="space-y-1 flex-shrink-0">
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-2 text-[10px] text-red-200">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={selectedCards.length !== DECK_SIZE || isSettingDeck}
            className={`w-full px-4 py-2 rounded-lg font-display font-bold text-sm transition-all uppercase ${
              selectedCards.length === DECK_SIZE && !isSettingDeck
                ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black shadow-gold'
                : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
            }`}
          >
            {isSettingDeck ? (
              <span className="flex items-center justify-center gap-1 text-xs">
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
            className="w-full px-4 py-2 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-lg font-modern font-semibold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
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
