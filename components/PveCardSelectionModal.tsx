/**
 * PvE Card Selection Modal Component
 *
 * Modal for selecting cards to battle against AI in PvE mode
 * Updated to match Poker Battle deck-building format with pagination
 */

import { useState, useMemo } from 'react';
import { AudioManager } from '@/lib/audio-manager';
import FoilCardEffect from '@/components/FoilCardEffect';
import { CardMedia } from '@/components/CardMedia';
import LoadingSpinner from '@/components/LoadingSpinner';
import { filterCardsByCollections, COLLECTIONS, getEnabledCollections, getCardUniqueId, isSameCard, type CollectionId, type Card } from '@/lib/collections/index';

// Using Card type from lib/collections which has proper typing
type NFT = Card;

interface PveCardSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDifficultyModalOpen: boolean;
  t: (key: any) => string;
  handSize: number;
  pveSelectedCards: NFT[];
  setPveSelectedCards: (cards: NFT[] | ((prev: NFT[]) => NFT[])) => void;
  sortedPveNfts: NFT[];
  pveSortByPower: boolean;
  setPveSortByPower: (sort: boolean) => void;
  soundEnabled: boolean;
  jcNfts: any[];
  setIsDifficultyModalOpen: (open: boolean) => void;
  pveSelectedCardsPower: number;
}

export function PveCardSelectionModal({
  isOpen,
  onClose,
  isDifficultyModalOpen,
  t,
  handSize,
  pveSelectedCards,
  setPveSelectedCards,
  sortedPveNfts,
  pveSortByPower,
  setPveSortByPower,
  soundEnabled,
  jcNfts,
  setIsDifficultyModalOpen,
  pveSelectedCardsPower,
}: PveCardSelectionModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCollections, setSelectedCollections] = useState<CollectionId[]>([]);
  const CARDS_PER_PAGE = 50;

  // Apply collection filter
  const filteredCards = useMemo(() => {
    if (selectedCollections.length === 0) {
      return sortedPveNfts;
    }
    return filterCardsByCollections(sortedPveNfts, selectedCollections);
  }, [sortedPveNfts, selectedCollections]);

  // Pagination
  const totalPages = Math.ceil(filteredCards.length / CARDS_PER_PAGE);
  const paginatedCards = filteredCards.slice(
    currentPage * CARDS_PER_PAGE,
    (currentPage + 1) * CARDS_PER_PAGE
  );

  // Loading state
  const isLoading = sortedPveNfts.length === 0;

  // Early return AFTER all hooks
  if (!isOpen || isDifficultyModalOpen) return null;

  const handleCardClick = (nft: NFT) => {
    const isSelected = pveSelectedCards.find(c => isSameCard(c, nft));

    if (isSelected) {
      setPveSelectedCards(prev => prev.filter(c => !isSameCard(c, nft)));
      if (soundEnabled) {
        AudioManager.deselectCard();
        AudioManager.hapticFeedback('light');
      }
    } else if (pveSelectedCards.length < handSize) {
      setPveSelectedCards(prev => [...prev, nft]);
      if (soundEnabled) {
        AudioManager.selectCardByRarity(nft.rarity);
      }
    }
  };

  const handleChooseDifficulty = () => {
    if (pveSelectedCards.length === handSize && jcNfts.length >= handSize) {
      if (soundEnabled) AudioManager.buttonClick();
      setIsDifficultyModalOpen(true);
    }
  };

  const handleCancel = () => {
    if (soundEnabled) AudioManager.buttonNav();
    onClose();
    setPveSelectedCards([]);
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-neon-blue max-w-6xl w-full p-4 md:p-6 lg:p-8 shadow-neon h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2 text-vintage-neon-blue flex-shrink-0">
          BUILD YOUR DECK
        </h2>

        {/* Counter */}
        <div className="text-center mb-2 flex-shrink-0">
          <p className="text-vintage-burnt-gold text-sm sm:text-base font-modern">
            Select {handSize} cards ({pveSelectedCards.length}/{handSize})
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
            {getEnabledCollections().map(col => (
              <option key={col.id} value={col.id}>{col.displayName}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setPveSortByPower(!pveSortByPower);
              setCurrentPage(0);
              if (soundEnabled) AudioManager.buttonClick();
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              pveSortByPower
                ? 'bg-vintage-gold text-vintage-black'
                : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
            }`}
          >
            {pveSortByPower ? '⚡ Sorted by Power' : '⚡ Sort by Power'}
          </button>
        </div>

        {/* Selected Deck Display */}
        <div className="mb-4 bg-green-900/40 border-2 border-vintage-neon-blue/50 rounded-xl p-3 flex-shrink-0">
          <div className={`grid gap-2 ${handSize === 10 ? 'grid-cols-5 md:grid-cols-10' : 'grid-cols-5'}`}>
            {Array.from({ length: handSize }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] border-2 border-dashed border-vintage-neon-blue/50 rounded-lg flex flex-col items-center justify-center overflow-hidden relative"
              >
                {pveSelectedCards[i] ? (
                  <>
                    <CardMedia
                      src={pveSelectedCards[i].imageUrl}
                      alt={`#${pveSelectedCards[i].tokenId}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-0.5 text-vintage-neon-blue text-xs font-bold text-center">
                      {pveSelectedCards[i].power?.toLocaleString()}
                    </div>
                  </>
                ) : (
                  <span className="text-vintage-neon-blue text-3xl">+</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-center">
            <p className="text-xs text-vintage-burnt-gold">Total Power</p>
            <p className="text-2xl font-bold text-vintage-neon-blue">
              {pveSelectedCardsPower.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Available Cards Grid */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mb-4">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 pb-4">
              {paginatedCards.map((nft) => {
                const isSelected = pveSelectedCards.find(c => isSameCard(c, nft));
                return (
                  <button
                    key={getCardUniqueId(nft)}
                    onClick={() => handleCardClick(nft)}
                    className={`aspect-[2/3] relative rounded-lg overflow-hidden border-2 transition ${
                      isSelected
                        ? 'border-vintage-neon-blue shadow-neon scale-95'
                        : 'border-vintage-gold/30 hover:border-vintage-gold/60 hover:scale-105'
                    }`}
                  >
                    <CardMedia
                      src={nft.imageUrl}
                      alt={`#${nft.tokenId}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">
                      {nft.power?.toLocaleString()}
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-vintage-neon-blue/20 flex items-center justify-center">
                        <span className="text-4xl text-vintage-neon-blue">✓</span>
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
          <button
            onClick={handleChooseDifficulty}
            disabled={pveSelectedCards.length !== handSize || jcNfts.length < handSize}
            className={`w-full px-6 py-4 rounded-xl font-display font-bold text-lg transition-all uppercase tracking-wide ${
              pveSelectedCards.length === handSize && jcNfts.length >= handSize
                ? 'bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black shadow-gold hover:scale-105'
                : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
            }`}
          >
            {jcNfts.length < handSize
              ? 'Loading opponent deck...'
              : pveSelectedCards.length === handSize
              ? 'CHOOSE DIFFICULTY'
              : `SELECT ${handSize - pveSelectedCards.length} MORE`}
          </button>

          <button
            onClick={handleCancel}
            className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
