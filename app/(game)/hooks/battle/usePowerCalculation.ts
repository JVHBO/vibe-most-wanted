import { useMemo } from 'react';
import {
  calculateTotalPower,
  getCardDisplayPower,
  getCollectionMultiplier,
} from '@/lib/power-utils';

type Card = { power?: number; collection?: string };

export function usePowerCalculation(cards: Card[], isLeaderboardAttack = false) {
  const totalPower = useMemo(
    () => calculateTotalPower(cards, isLeaderboardAttack),
    [cards, isLeaderboardAttack]
  );

  const cardPowers = useMemo(
    () => cards.map((c) => getCardDisplayPower(c, isLeaderboardAttack)),
    [cards, isLeaderboardAttack]
  );

  const avgPower = useMemo(
    () => (cards.length === 0 ? 0 : Math.round(totalPower / cards.length)),
    [totalPower, cards.length]
  );

  return { totalPower, cardPowers, avgPower };
}

// Re-export pure functions for direct use
export { calculateTotalPower, getCardDisplayPower, getCollectionMultiplier };
