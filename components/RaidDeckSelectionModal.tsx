/**
 * Raid Deck Selection Modal
 *
 * Modal for selecting 5 cards for the Raid Boss deck
 * Entry fee: Based on card rarities (Common: 1, Rare: 3, Epic: 5, Legendary: 10, Mythic: 15)
 */

'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AudioManager } from '@/lib/audio-manager';
import { CardMedia } from '@/components/CardMedia';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  filterCardsByCollections,
  sortCardsByPower,
  type CollectionId,
  type Card,
} from '@/lib/collections/index';
import { useTransferVBMS } from '@/lib/hooks/useVBMSContracts';
import { useFarcasterTransferVBMS } from '@/lib/hooks/useFarcasterVBMS';
import { CONTRACTS } from '@/lib/contracts';
import { parseEther } from 'viem';

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
  const CARDS_PER_PAGE = 50;

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

  // Detect miniapp
  const isInMiniapp = typeof window !== 'undefined' && (
    window.parent !== window ||
    !!(window as any).sdk?.wallet
  );

  // Use Farcaster or Wagmi hooks based on environment
  const wagmiTransfer = useTransferVBMS();
  const farcasterTransfer = useFarcasterTransferVBMS();
  const { transfer: transferVBMS, isPending: isTransferring } = isInMiniapp ? farcasterTransfer : wagmiTransfer;

  // Convex queries and mutations
  const currentBoss = useQuery(api.raidBoss.getCurrentRaidBoss);
  const setRaidDeck = useMutation(api.raidBoss.setRaidDeck);

  if (!isOpen) return null;

  // Helper function to calculate buff for a card
  const getCardBuff = (card: NFT): { multiplier: number; label: string; color: string } | null => {
    const isFree = (card as any).isFreeCard;
    if (isFree) return null; // Free cards don't get buffs

    if (card.collection === 'vibefid') {
      return { multiplier: 1.5, label: '+50%', color: 'text-purple-400' };
    }

    if (currentBoss && card.collection === currentBoss.collection) {
      return { multiplier: 1.2, label: '+20%', color: 'text-blue-400' };
    }

    return null;
  };

  // Sort cards
  const sortedCards = sortByPower
    ? sortCardsByPower(availableCards, false) // false = descending order
    : availableCards;

  // Filter by collections
  const filteredCards = useMemo(() => {
    if (selectedCollections.length === 0) {
      return sortedCards;
    }
    return filterCardsByCollections(sortedCards, selectedCollections);
  }, [sortedCards, selectedCollections]);

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

  const handleCardClick = (card: NFT) => {
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

  // Check if user has VibeFID cards
  const vibeFIDCards = useMemo(() => {
    return availableCards.filter(card => card.collection === 'vibefid');
  }, [availableCards]);

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
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-[250] p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-6xl w-full p-4 md:p-6 lg:p-8 shadow-neon h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2 text-vintage-gold flex-shrink-0">
          {showVibeFIDStep ? '🎴 ADD VIBEFID CARD? 🎴' : '⚔️ BUILD YOUR RAID DECK ⚔️'}
        </h2>

        {/* Step 2: VibeFID Selection */}
        {showVibeFIDStep ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Selected 5 Cards Summary */}
            <div className="flex-shrink-0 mb-4">
              <h3 className="text-lg font-bold text-vintage-burnt-gold mb-2">Your Selected Deck ({selectedCards.length} cards)</h3>
              <div className="grid grid-cols-5 gap-2">
                {selectedCards.map((card, idx) => (
                  <div key={idx} className="relative">
                    <CardMedia src={card.imageUrl} alt={card.name} className="rounded-lg aspect-[3/4] object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 rounded-b-lg">
                      <div className="text-white text-[10px] font-bold truncate">{card.name}</div>
                      <div className="text-vintage-gold text-[10px]">⚡ {card.power}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* VibeFID Benefits */}
            <div className="flex-shrink-0 mb-4 bg-purple-900/30 border-2 border-purple-500/50 rounded-xl p-4">
              <h3 className="text-lg font-bold text-purple-400 mb-3">✨ VibeFID 6th Slot Benefits ✨</h3>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <div className="font-bold text-purple-300">Infinite Energy</div>
                    <div className="text-xs text-vintage-burnt-gold">Never needs refueling</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📈</span>
                  <div>
                    <div className="font-bold text-blue-300">+10% Deck Power</div>
                    <div className="text-xs text-vintage-burnt-gold">Boosts all 5 cards</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <div className="font-bold text-red-300">+50% Boss Damage</div>
                    <div className="text-xs text-vintage-burnt-gold">Deals massive damage</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <div className="font-bold text-green-300">Use in All Modes</div>
                    <div className="text-xs text-vintage-burnt-gold">PvE, PvP, Defense</div>
                  </div>
                </div>
              </div>
              <div className="text-center text-vintage-gold font-bold text-lg">
                Cost: +50 VBMS
              </div>
            </div>

            {/* VibeFID Card Selection */}
            <div className="flex-1 overflow-y-auto mb-4">
              <h3 className="text-md font-bold text-vintage-gold mb-2">Select VibeFID Card (Optional)</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
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
                        <div className="text-purple-400 text-xs">⚡ {card.power}</div>
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
            <div className="flex-shrink-0 flex gap-3">
              <button
                onClick={() => {
                  setShowVibeFIDStep(false);
                  setSelectedVibeFID(null);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                disabled={isSettingDeck}
                className="flex-1 px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  setSelectedVibeFID(null);
                  proceedWithPayment();
                }}
                disabled={isSettingDeck}
                className="flex-1 px-6 py-3 bg-vintage-red/80 hover:bg-vintage-red text-white rounded-xl font-bold transition disabled:opacity-50"
              >
                Continue Without VibeFID
              </button>
              <button
                onClick={proceedWithPayment}
                disabled={!selectedVibeFID || isSettingDeck}
                className={`flex-1 px-6 py-4 rounded-xl font-display font-bold text-lg transition-all uppercase ${
                  selectedVibeFID && !isSettingDeck
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-neon hover:scale-105'
                    : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                }`}
              >
                {isSettingDeck ? (
                  <span className="flex items-center justify-center gap-2">
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
            <div className="mb-3 flex-shrink-0">
              <div className={`border-2 rounded-xl p-3 ${hasVibeFID ? 'bg-purple-900/20 border-purple-500/50' : 'bg-vintage-gold/10 border-vintage-gold/50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-vintage-gold">VibeFID - 6th Slot Special Card</h3>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-purple-400">⚡</span>
                    <span className="text-vintage-burnt-gold">Infinite Energy</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">📈</span>
                    <span className="text-vintage-burnt-gold">+10% Deck Power</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-red-400">🎯</span>
                    <span className="text-vintage-burnt-gold">+50% Boss Damage</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-green-400">🔄</span>
                    <span className="text-vintage-burnt-gold">Use in All Modes</span>
                  </div>
                </div>
                {!hasVibeFID && (
                  <p className="text-vintage-burnt-gold text-[10px] mt-2 italic">
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
            Select {DECK_SIZE} cards • Entry Fee: {totalCost > 0 ? `${totalCost} VBMS` : 'Based on rarities'}
          </p>
          <p className="text-vintage-neon-blue text-xs font-modern mt-1">
            Cards attack automatically every 5 minutes
          </p>
          {currentBoss && (
            <div className="text-xs font-modern mt-2 space-y-0.5">
              <p className="text-purple-400">VibeFID cards: +50% power boost</p>
              <p className="text-blue-400">
                {currentBoss.collection === 'vibe' ? 'VBMS' :
                 currentBoss.collection === 'gmvbrs' ? 'GM VBRS' :
                 currentBoss.collection === 'vibefid' ? 'VibeFID' :
                 currentBoss.collection === 'americanfootball' ? 'AFCL' : currentBoss.collection}
                {' '}cards: +20% vs current boss
              </p>
              <p className="text-gray-500">Free cards: no bonus</p>
            </div>
          )}
        </div>

        {/* Counter */}
        <div className="text-center mb-2 flex-shrink-0">
          <p className="text-vintage-burnt-gold text-sm sm:text-base font-modern">
            Selected {selectedCards.length}/{DECK_SIZE}
          </p>
        </div>

        {/* Controls Row: Collection Filter + Sort Button */}
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
            className="px-3 py-1.5 rounded-lg text-xs font-modern font-medium transition-all bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10 focus:outline-none focus:ring-2 focus:ring-vintage-gold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-gold"
          >
            <option value="all">All Collections</option>
            <option value="vibe">VBMS</option>
            <option value="vibefid">VIBEFID</option>
            <option value="americanfootball">AFCL</option>
            <option value="gmvbrs">VBRS</option>
          </select>

          <button
            onClick={() => {
              setSortByPower(!sortByPower);
              setCurrentPage(0);
              if (soundEnabled) AudioManager.buttonClick();
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              sortByPower
                ? 'bg-vintage-gold text-vintage-black'
                : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
            }`}
          >
            {sortByPower ? '⚡ Sorted by Power' : '⚡ Sort by Power'}
          </button>
        </div>

        {/* Selected Deck Display */}
        <div className="mb-4 bg-vintage-gold/20 border-2 border-vintage-gold/50 rounded-xl p-3 flex-shrink-0">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: DECK_SIZE }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] border-2 border-dashed border-vintage-gold/50 rounded-lg flex flex-col items-center justify-center overflow-hidden relative"
              >
                {selectedCards[i] ? (
                  <>
                    <CardMedia
                      src={selectedCards[i].imageUrl}
                      alt={`#${selectedCards[i].tokenId}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-0.5 text-vintage-gold text-xs font-bold text-center">
                      {selectedCards[i].power?.toLocaleString()}
                    </div>
                  </>
                ) : (
                  <span className="text-vintage-gold text-3xl">+</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-center">
            <p className="text-xs text-vintage-burnt-gold">Total Power</p>
            <p className="text-2xl font-bold text-vintage-gold">{totalPower.toLocaleString()}</p>
            {totalPower !== totalBasePower && (
              <p className="text-xs text-green-400">Base: {totalBasePower.toLocaleString()}</p>
            )}
          </div>
        </div>

        {/* Available Cards Grid */}
        {availableCards.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mb-4">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 pb-4">
              {paginatedCards.map((card) => {
                const isSelected = selectedCards.find((c) => c.tokenId === card.tokenId);
                const buff = getCardBuff(card);
                return (
                  <button
                    key={card.tokenId}
                    onClick={() => handleCardClick(card)}
                    className={`aspect-[2/3] relative rounded-lg overflow-hidden border-2 transition ${
                      isSelected
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
                    {isSelected && (
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
            <span className="text-vintage-gold font-bold">
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
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={selectedCards.length !== DECK_SIZE || isSettingDeck}
            className={`w-full px-6 py-4 rounded-xl font-display font-bold text-lg transition-all uppercase tracking-wide ${
              selectedCards.length === DECK_SIZE && !isSettingDeck
                ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black shadow-gold hover:scale-105'
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
            className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
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
