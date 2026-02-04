"use client";

import { useState, useMemo, useCallback } from 'react';
import { CardDisplay } from '@/components/cards/CardDisplay';
import { getCardDisplayPower } from '@/lib/power-utils';

export interface CardSelectorCard {
  imageUrl?: string;
  tokenId?: string;
  name?: string;
  power?: number;
  collection?: string;
  rarity?: string;
  cardId?: string;
}

interface CardSelectorProps {
  cards: CardSelectorCard[];
  selectedCards: CardSelectorCard[];
  onSelectionChange: (cards: CardSelectorCard[]) => void;
  maxSelection: number;
  sortByPower?: boolean;
  cardSize?: 'sm' | 'md' | 'lg';
}

function getCardId(card: CardSelectorCard): string {
  return card.cardId || card.tokenId || '';
}

function isSame(a: CardSelectorCard, b: CardSelectorCard): boolean {
  return getCardId(a) === getCardId(b);
}

export function CardSelector({
  cards,
  selectedCards,
  onSelectionChange,
  maxSelection,
  sortByPower = false,
  cardSize = 'md',
}: CardSelectorProps) {
  const displayCards = useMemo(() => {
    if (!sortByPower) return cards;
    return [...cards].sort(
      (a, b) => getCardDisplayPower(b) - getCardDisplayPower(a)
    );
  }, [cards, sortByPower]);

  const handleCardClick = useCallback(
    (card: CardSelectorCard) => {
      const isSelected = selectedCards.some((c) => isSame(c, card));
      if (isSelected) {
        onSelectionChange(selectedCards.filter((c) => !isSame(c, card)));
      } else if (selectedCards.length < maxSelection) {
        onSelectionChange([...selectedCards, card]);
      }
    },
    [selectedCards, onSelectionChange, maxSelection]
  );

  const totalPower = useMemo(
    () => selectedCards.reduce((sum, c) => sum + getCardDisplayPower(c), 0),
    [selectedCards]
  );

  return (
    <div>
      <div className="text-center mb-2">
        <span className="text-vintage-burnt-gold text-sm font-modern">
          {selectedCards.length}/{maxSelection} selected
        </span>
        <span className="ml-2 text-vintage-neon-blue font-bold text-sm">
          Power: {totalPower.toLocaleString()}
        </span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {displayCards.map((card) => (
          <CardDisplay
            key={getCardId(card)}
            card={card}
            isSelected={selectedCards.some((c) => isSame(c, card))}
            onClick={() => handleCardClick(card)}
            size={cardSize}
          />
        ))}
      </div>
    </div>
  );
}
