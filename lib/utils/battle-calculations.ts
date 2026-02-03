import { HAND_SIZE } from '@/lib/config';
import type { NFT } from '@/hooks/useCardCalculations';
import type { Difficulty } from '@/hooks/useBattleOptimizations';

/**
 * Pure functions for battle calculations.
 * Extracted from useBattleOptimizations hooks for testability.
 */

/** Select AI deck based on difficulty */
export function selectAIDeck(availableCards: NFT[], difficulty: Difficulty, handSize: number = HAND_SIZE): NFT[] {
  if (availableCards.length === 0) return [];

  const sorted = [...availableCards].sort((a, b) => (b.power || 0) - (a.power || 0));
  let pickedCards: NFT[] = [];

  switch (difficulty) {
    case 'gey': {
      const weakest = sorted.filter((c) => (c.power || 0) === 15);
      pickedCards = weakest.sort(() => Math.random() - 0.5).slice(0, handSize);
      break;
    }
    case 'goofy': {
      const weak = sorted.filter((c) => {
        const p = c.power || 0;
        return p === 18 || p === 21;
      });
      pickedCards = weak.sort(() => Math.random() - 0.5).slice(0, handSize);
      break;
    }
    case 'gooner': {
      const medium = sorted.filter((c) => {
        const p = c.power || 0;
        return p === 60 || p === 72;
      });
      pickedCards = medium.sort(() => Math.random() - 0.5).slice(0, handSize);
      break;
    }
    case 'gangster': {
      const cards150 = sorted.filter((c) => (c.power || 0) === 150);
      if (cards150.length >= handSize) {
        pickedCards = cards150.sort(() => Math.random() - 0.5).slice(0, handSize);
      } else {
        const legendaries = sorted.filter((c) =>
          (c.rarity || '').toLowerCase().includes('legend')
        );
        pickedCards = legendaries.slice(0, handSize);
      }
      break;
    }
    case 'gigachad':
      pickedCards = sorted.slice(0, handSize);
      break;
  }

  if (pickedCards.length < handSize) {
    pickedCards = sorted.slice(0, handSize);
  }

  return pickedCards;
}

/** Calculate battle result with collection buffs */
export function calcBattleResult(
  playerCards: NFT[],
  opponentCards: NFT[]
): {
  playerPower: number;
  opponentPower: number;
  winner: 'player' | 'opponent' | 'tie';
  powerDifference: number;
} {
  const calcPower = (cards: NFT[]) =>
    cards.reduce((sum, c) => {
      const basePower = c.power || 0;
      const collection = (c as any).collection;
      if (collection === 'vibefid') return sum + basePower * 5;
      if (collection === 'vibe') return sum + basePower * 2;
      if (collection === 'nothing') return sum + Math.floor(basePower * 0.5);
      return sum + basePower;
    }, 0);

  const playerPower = calcPower(playerCards);
  const opponentPower = calcPower(opponentCards);

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
}

/** Validate card selection for battle */
export function validateCards(
  cards: NFT[],
  requiredCount: number = HAND_SIZE
): { isValid: boolean; errors: string[] } {
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

  return { isValid: errors.length === 0, errors };
}

/** Calculate elimination mode rounds */
export function calcEliminationRounds(
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
}

/** Select strongest N cards */
export function selectStrongest(nfts: NFT[], count: number = HAND_SIZE): NFT[] {
  const sorted = [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
  return sorted.slice(0, count);
}

/** Calculate win probability based on power difference (sigmoid) */
export function calcWinProbability(playerPower: number, opponentPower: number): number {
  if (opponentPower === 0) return 1.0;
  const ratio = playerPower / opponentPower;
  return 1 / (1 + Math.exp(-5 * (ratio - 1)));
}

/** Get battle recommendations for card selection */
export function calcBattleRecommendations(
  availableCards: NFT[],
  targetPower: number,
  handSize: number = HAND_SIZE
): {
  recommended: NFT[];
  totalPower: number;
  confidence: 'low' | 'medium' | 'high';
} {
  const sorted = [...availableCards].sort((a, b) => (b.power || 0) - (a.power || 0));

  let recommended: NFT[] = [];
  let currentPower = 0;

  for (let i = 0; i < sorted.length && recommended.length < handSize; i++) {
    recommended.push(sorted[i]);
    currentPower += sorted[i].power || 0;
  }

  let confidence: 'low' | 'medium' | 'high';
  const ratio = currentPower / targetPower;
  if (ratio >= 1.2) {
    confidence = 'high';
  } else if (ratio >= 1.0) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return { recommended, totalPower: currentPower, confidence };
}
