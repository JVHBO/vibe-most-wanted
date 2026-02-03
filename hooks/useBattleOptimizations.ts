import { useMemo, useCallback } from 'react';
import { HAND_SIZE } from '@/lib/config';
import type { NFT } from './useCardCalculations';
import {
  selectAIDeck,
  calcBattleResult,
  validateCards,
  calcEliminationRounds,
  selectStrongest,
  calcWinProbability,
  calcBattleRecommendations,
} from '@/lib/utils/battle-calculations';
import { shuffleCards } from '@/lib/utils/card-calculations';

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
  return useMemo(() => selectAIDeck(availableCards, difficulty), [availableCards, difficulty]);
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
  return useMemo(() => calcBattleResult(playerCards, opponentCards), [playerCards, opponentCards]);
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
  return useMemo(() => validateCards(cards, requiredCount), [cards, requiredCount]);
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
  return useMemo(() => calcEliminationRounds(playerCards, opponentCards), [playerCards, opponentCards]);
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
      return selectStrongest(nfts, count);
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
    return shuffleCards(cards);
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
  return useMemo(() => calcWinProbability(playerPower, opponentPower), [playerPower, opponentPower]);
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
  return useMemo(() => calcBattleRecommendations(availableCards, targetPower), [availableCards, targetPower]);
}
