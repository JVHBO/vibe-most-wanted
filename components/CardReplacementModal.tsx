/**
 * Card Replacement Modal
 *
 * Modal for selecting a replacement card when a card runs out of energy
 */

'use client';

import { useState, useMemo } from 'react';
import { CardMedia } from '@/components/CardMedia';
import { AudioManager } from '@/lib/audio-manager';
import { sortCardsByPower } from '@/lib/collections/index';
import type { Card } from '@/lib/types/card';

interface CardReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newCard: Card) => void;
  availableCards: Card[];
  oldCard: Card | null;
  soundEnabled: boolean;
  t: (key: string, params?: Record<string, any>) => string;
}

// Replacement cost by rarity (in VBMS)
const REPLACE_COST_BY_RARITY: Record<string, number> = {
  common: 1,
  rare: 3,
  epic: 5,
  legendary: 10,
  mythic: 15,
  vibefid: 50,
};

export function CardReplacementModal({
  isOpen,
  onClose,
  onConfirm,
  availableCards,
  oldCard,
  soundEnabled,
  t,
}: CardReplacementModalProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [sortByPower, setSortByPower] = useState(true);

  // Sort available cards
  const sortedCards = useMemo(() => {
    return sortCardsByPower(availableCards, sortByPower ? 'power-desc' : 'tokenId-asc');
  }, [availableCards, sortByPower]);

  // Calculate replacement cost for selected card
  const replacementCost = selectedCard
    ? REPLACE_COST_BY_RARITY[selectedCard.rarity.toLowerCase()] || 1
    : 0;

  const handleConfirm = () => {
    if (!selectedCard) return;

    onConfirm(selectedCard);
    setSelectedCard(null);
    onClose();
    if (soundEnabled) AudioManager.buttonSuccess();
  };

  const handleClose = () => {
    setSelectedCard(null);
    onClose();
    if (soundEnabled) AudioManager.buttonClick();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-[210] p-4"
      onClick={handleClose}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-4xl w-full p-4 md:p-6 shadow-neon max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center text-vintage-gold">
            {t('raid_boss.replace_card', 'Replace Card')}
          </h2>
          <p className="text-center text-vintage-burnt-gold text-sm mt-2">
            {t('raid_boss.select_replacement', 'Select a card to replace')} {oldCard?.name || ''}
          </p>
        </div>

        {/* Sort Toggle */}
        <div className="flex-shrink-0 mb-3 flex items-center justify-between">
          <div className="text-sm text-vintage-burnt-gold">
            {sortedCards.length} {t('available_cards', 'Available Cards')}
          </div>
          <button
            onClick={() => {
              setSortByPower(!sortByPower);
              if (soundEnabled) AudioManager.buttonClick();
            }}
            className="px-3 py-1 bg-vintage-gold/20 hover:bg-vintage-gold/30 text-vintage-gold rounded border border-vintage-gold/50 text-xs transition"
          >
            {sortByPower ? '↓ Power' : '# ID'}
          </button>
        </div>

        {/* Card Grid */}
        <div className="flex-1 overflow-y-auto mb-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {sortedCards.map((card) => {
              const isSelected = selectedCard?.tokenId === card.tokenId;
              const cost = REPLACE_COST_BY_RARITY[card.rarity.toLowerCase()] || 1;

              return (
                <div
                  key={card.tokenId}
                  onClick={() => {
                    setSelectedCard(card);
                    if (soundEnabled) AudioManager.selectCardByRarity(card.rarity);
                  }}
                  className={`relative cursor-pointer transition-all transform hover:scale-105 ${
                    isSelected
                      ? 'ring-4 ring-vintage-gold shadow-neon scale-105'
                      : 'hover:ring-2 hover:ring-vintage-gold/50'
                  }`}
                >
                  <CardMedia
                    imageUrl={card.imageUrl}
                    name={card.name}
                    className="rounded-lg aspect-[3/4] object-cover"
                  />

                  {/* Cost Badge */}
                  <div className="absolute top-1 right-1 bg-vintage-gold text-vintage-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                    {cost} VBMS
                  </div>

                  {/* Card Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 rounded-b-lg">
                    <div className="text-white text-xs font-bold truncate">{card.name}</div>
                    <div className="text-vintage-gold text-xs">⚡ {card.power}</div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-vintage-gold/20 rounded-lg flex items-center justify-center">
                      <div className="bg-vintage-gold text-vintage-black rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg">
                        ✓
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-vintage-red/80 hover:bg-vintage-red text-white rounded-lg font-bold transition"
          >
            {t('cancel', 'Cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCard}
            className="flex-1 px-4 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedCard
              ? `${t('replace', 'Replace')} (${replacementCost} VBMS)`
              : t('select_card', 'Select a Card')}
          </button>
        </div>
      </div>
    </div>
  );
}
