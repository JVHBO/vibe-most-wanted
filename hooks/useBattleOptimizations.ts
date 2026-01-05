import { useMemo, useCallback } from 'react';
import { HAND_SIZE } from '@/lib/config';
import type { NFT } from './useCardCalculations';

/**
 * 🎮 BATTLE OPTIMIZATIONS
 *
 * Memoized functions for battle-related calculations.
 * Prevents re-computing AI decks and card selections on every render.
 */

export type Difficulty = 'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad';

/**
 * Select AI deck based on difficulty (memoized)
 *
 * @example
 * const aiDeck = useAIDeckSelection(availableCards, 'gangster');
 */
export function useAIDeckSelection(
  availableCards: NFT[],
  difficulty: Difficulty
): NFT[] {
  return useMemo(() => {
    if (availableCards.length === 0) return [];

    const sorted = [...availableCards].sort((a, b) => (b.power || 0) - (a.power || 0));
    let pickedCards: NFT[] = [];

    switch (difficulty) {
      case 'gey':
        // 15 power only
        const weakest = sorted.filter((c) => (c.power || 0) === 15);
        pickedCards = weakest.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        break;

      case 'goofy':
        // 18 or 21 power
        const weak = sorted.filter((c) => {
          const p = c.power || 0;
          return p === 18 || p === 21;
        });
        pickedCards = weak.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        break;

      case 'gooner':
        // 60 or 72 power
        const medium = sorted.filter((c) => {
          const p = c.power || 0;
          return p === 60 || p === 72;
        });
        pickedCards = medium.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        break;

      case 'gangster':
        // 150 power or legendaries
        const cards150 = sorted.filter((c) => (c.power || 0) === 150);
        if (cards150.length >= HAND_SIZE) {
          pickedCards = cards150.sort(() => Math.random() - 0.5).slice(0, HAND_SIZE);
        } else {
          const legendaries = sorted.filter((c) =>
            (c.rarity || '').toLowerCase().includes('legend')
          );
          pickedCards = legendaries.slice(0, HAND_SIZE);
        }
        break;

      case 'gigachad':
        // Strongest cards
        pickedCards = sorted.slice(0, HAND_SIZE);
        break;
    }

    // Fallback if not enough cards
    if (pickedCards.length < HAND_SIZE) {
      pickedCards = sorted.slice(0, HAND_SIZE);
    }

    return pickedCards;
  }, [availableCards, difficulty]);
}

/**
 * Calculate battle result (memoized)
 *
 * @example
 * const result = useBattleResult(playerCards, opponentCards);
 */
export function useBattleResult(
  playerCards: NFT[],
  opponentCards: NFT[]
): {
  playerPower: number;
  opponentPower: number;
  winner: 'player' | 'opponent' | 'tie';
  powerDifference: number;
} {
  return useMemo(() => {
    // 🚀 Apply collection buffs (VBMS 2x, VibeFID 5x)
    const playerPower = playerCards.reduce((sum, c) => {
      const basePower = c.power || 0;
      const collection = (c as any).collection;
      if (collection === 'vibefid') return sum + basePower * 5;
      if (collection === 'vibe') return sum + basePower * 2;
      return sum + basePower;
    }, 0);
    const opponentPower = opponentCards.reduce((sum, c) => {
      const basePower = c.power || 0;
      const collection = (c as any).collection;
      if (collection === 'vibefid') return sum + basePower * 5;
      if (collection === 'vibe') return sum + basePower * 2;
      return sum + basePower;
    }, 0);

    let winner: 'player' | 'opponent' | 'tie';
    if (playerPower > opponentPower) {
      winner = 'player';
    } else if (opponentPower > playerPower) {
      winner = 'opponent';
    } else {
      winner = 'tie';
    }

    return {
      playerPower,
      opponentPower,
      winner,
      powerDifference: Math.abs(playerPower - opponentPower),
    };
  }, [playerCards, opponentCards]);
}

/**
 * Validate card selection (memoized)
 * Checks if cards are valid for battle
 *
 * @example
 * const validation = useCardValidation(selectedCards, 5);
 */
export function useCardValidation(
  cards: NFT[],
  requiredCount: number = HAND_SIZE
): {
  isValid: boolean;
  errors: string[];
} {
  return useMemo(() => {
    const errors: string[] = [];

    if (cards.length !== requiredCount) {
      errors.push(`Must select exactly ${requiredCount} cards`);
    }

    const invalidCards = cards.filter(
      (card) =>
        !card.tokenId || typeof card.power !== 'number' || card.power === undefined
    );

    if (invalidCards.length > 0) {
      errors.push(`${invalidCards.length} card(s) have invalid data`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [cards, requiredCount]);
}

/**
 * Get elimination mode rounds (memoized)
 * Pre-computes all 5 rounds for elimination battle
 *
 * @example
 * const rounds = useEliminationRounds(playerCards, opponentCards);
 */
export function useEliminationRounds(
  playerCards: NFT[],
  opponentCards: NFT[]
): Array<{
  round: number;
  playerCard: NFT;
  opponentCard: NFT;
  playerPower: number;
  opponentPower: number;
  winner: 'player' | 'opponent' | 'tie';
}> {
  return useMemo(() => {
    const rounds = [];
    const maxRounds = Math.min(playerCards.length, opponentCards.length);

    for (let i = 0; i < maxRounds; i++) {
      const playerCard = playerCards[i];
      const opponentCard = opponentCards[i];
      const playerPower = playerCard?.power || 0;
      const opponentPower = opponentCard?.power || 0;

      let winner: 'player' | 'opponent' | 'tie';
      if (playerPower > opponentPower) {
        winner = 'player';
      } else if (opponentPower > playerPower) {
        winner = 'opponent';
      } else {
        winner = 'tie';
      }

      rounds.push({
        round: i + 1,
        playerCard,
        opponentCard,
        playerPower,
        opponentPower,
        winner,
      });
    }

    return rounds;
  }, [playerCards, opponentCards]);
}

/**
 * Create callback for auto-selecting strongest cards
 *
 * @example
 * const selectStrongest = useAutoSelectStrongest(nfts);
 * selectStrongest(5); // Returns 5 strongest cards
 */
export function useAutoSelectStrongest(nfts: NFT[]) {
  return useCallback(
    (count: number = HAND_SIZE): NFT[] => {
      const sorted = [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
      return sorted.slice(0, count);
    },
    [nfts]
  );
}

/**
 * Create callback for randomizing card order
 *
 * @example
 * const shuffleCards = useShuffleCards();
 * const shuffled = shuffleCards(selectedCards);
 */
export function useShuffleCards() {
  return useCallback((cards: NFT[]): NFT[] => {
    return [...cards].sort(() => Math.random() - 0.5);
  }, []);
}

/**
 * Calculate win probability based on power difference (memoized)
 *
 * @example
 * const probability = useWinProbability(playerPower, opponentPower);
 * // Returns 0.0 to 1.0
 */
export function useWinProbability(
  playerPower: number,
  opponentPower: number
): number {
  return useMemo(() => {
    if (opponentPower === 0) return 1.0;
    const ratio = playerPower / opponentPower;
    // Sigmoid function for smooth probability curve
    return 1 / (1 + Math.exp(-5 * (ratio - 1)));
  }, [playerPower, opponentPower]);
}

/**
 * Get battle recommendations (memoized)
 * Suggests which cards to use based on opponent
 *
 * @example
 * const recommendations = useBattleRecommendations(playerCards, opponentPower);
 */
export function useBattleRecommendations(
  availableCards: NFT[],
  targetPower: number
): {
  recommended: NFT[];
  totalPower: number;
  confidence: 'low' | 'medium' | 'high';
} {
  return useMemo(() => {
    // Sort by power
    const sorted = [...availableCards].sort((a, b) => (b.power || 0) - (a.power || 0));

    // Try to find cards that match target power
    let recommended: NFT[] = [];
    let currentPower = 0;

    // Greedy algorithm: pick strongest cards until we exceed target
    for (let i = 0; i < sorted.length && recommended.length < HAND_SIZE; i++) {
      recommended.push(sorted[i]);
      currentPower += sorted[i].power || 0;
    }

    // Calculate confidence
    let confidence: 'low' | 'medium' | 'high';
    const ratio = currentPower / targetPower;
    if (ratio >= 1.2) {
      confidence = 'high';
    } else if (ratio >= 1.0) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      recommended,
      totalPower: currentPower,
      confidence,
    };
  }, [availableCards, targetPower]);
}
