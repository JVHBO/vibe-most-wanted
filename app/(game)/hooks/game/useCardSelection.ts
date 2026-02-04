import { useState, useCallback, useMemo } from 'react';
import { calculateTotalPower, getCardDisplayPower } from '@/lib/power-utils';

export interface SelectableCard {
  tokenId?: string;
  cardId?: string;
  power?: number;
  collection?: string;
  [key: string]: any;
}

function getCardKey(card: SelectableCard): string {
  return card.cardId || card.tokenId || '';
}

export function useCardSelection(maxSelection: number) {
  const [selectedCards, setSelectedCards] = useState<SelectableCard[]>([]);

  const isSelected = useCallback(
    (card: SelectableCard) => selectedCards.some((c) => getCardKey(c) === getCardKey(card)),
    [selectedCards]
  );

  const toggleCard = useCallback(
    (card: SelectableCard) => {
      setSelectedCards((prev) => {
        const key = getCardKey(card);
        const exists = prev.some((c) => getCardKey(c) === key);
        if (exists) return prev.filter((c) => getCardKey(c) !== key);
        if (prev.length >= maxSelection) return prev;
        return [...prev, card];
      });
    },
    [maxSelection]
  );

  const clearSelection = useCallback(() => setSelectedCards([]), []);

  const isFull = selectedCards.length >= maxSelection;

  const totalPower = useMemo(
    () => calculateTotalPower(selectedCards),
    [selectedCards]
  );

  const cardPowers = useMemo(
    () => selectedCards.map((c) => getCardDisplayPower(c)),
    [selectedCards]
  );

  return {
    selectedCards,
    setSelectedCards,
    isSelected,
    toggleCard,
    clearSelection,
    isFull,
    count: selectedCards.length,
    totalPower,
    cardPowers,
  };
}
