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

interface RaidBoss {
  collection: string;
  name: string;
}

interface CardReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newCard: Card) => void;
  availableCards: Card[];
  oldCard: Card | null;
  currentBoss: RaidBoss | null | undefined;
  soundEnabled: boolean;
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
  currentBoss,
  soundEnabled,
}: CardReplacementModalProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [sortByPower, setSortByPower] = useState(true);

  // Calculate buffed power for a card
  const getBuffedPower = (card: Card): { power: number; buffPercent: number; buffType: string } => {
    let power = card.power;
    let buffPercent = 0;
    let buffType = '';

    // Only apply buffs to NFTs (not free cards)
    if (!card.isFreeCard && currentBoss) {
      // VibeFID cards get +50% power against all bosses
      if (card.collection === 'vibefid') {
        buffPercent = 50;
        buffType = 'VibeFID Bonus';
        power = Math.floor(power * 1.5);
      }
      // Cards matching boss collection get +20% power
      else if (card.collection === currentBoss.collection) {
        buffPercent = 20;
        buffType = 'Collection Match';
        power = Math.floor(power * 1.2);
      }
    }

    return { power, buffPercent, buffType };
  };

  // Sort available cards
  const sortedCards = useMemo(() => {
    return sortCardsByPower(availableCards, !sortByPower); // ascending when sortByPower is false
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
            Replace Card
          </h2>
          <p className="text-center text-vintage-burnt-gold text-sm mt-2">
            Select a card to replace {oldCard?.name || ''}
          </p>
        </div>

        {/* Sort Toggle */}
        <div className="flex-shrink-0 mb-3 flex items-center justify-between">
          <div className="text-sm text-vintage-burnt-gold">
            {sortedCards.length} Available Cards
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
              const { power, buffPercent, buffType } = getBuffedPower(card);

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
                    src={card.imageUrl}
                    alt={card.name}
                    className="rounded-lg aspect-[3/4] object-cover"
                  />

                  {/* Cost Badge */}
                  <div className="absolute top-1 right-1 bg-vintage-gold text-vintage-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                    {cost} VBMS
                  </div>

                  {/* Buff Badge */}
                  {buffPercent > 0 && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                      +{buffPercent}%
                    </div>
                  )}

                  {/* Card Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 rounded-b-lg">
                    <div className="text-white text-xs font-bold truncate">{card.name}</div>
                    <div className="flex items-center gap-1">
                      {buffPercent > 0 ? (
                        <>
                          <div className="text-gray-400 text-xs line-through">⚡ {card.power}</div>
                          <div className="text-green-400 text-xs font-bold">⚡ {power}</div>
                        </>
                      ) : (
                        <div className="text-vintage-gold text-xs">⚡ {card.power}</div>
                      )}
                    </div>
                    {buffType && (
                      <div className="text-green-400 text-[10px]">{buffType}</div>
                    )}
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
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCard}
            className="flex-1 px-4 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedCard
              ? `Replace (${replacementCost} VBMS)`
              : 'Select a Card'}
          </button>
        </div>
      </div>
    </div>
  );
}
