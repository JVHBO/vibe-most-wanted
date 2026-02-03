import { describe, it, expect } from 'vitest';
import {
  selectAIDeck,
  calcBattleResult,
  validateCards,
  calcEliminationRounds,
  selectStrongest,
  calcWinProbability,
  calcBattleRecommendations,
} from '../battle-calculations';
import type { NFT } from '@/hooks/useCardCalculations';

function makeNFT(overrides: Partial<NFT> = {}): NFT {
  return { tokenId: '1', power: 10, ...overrides };
}

function makeCards(powers: number[], extras: Partial<NFT> = {}): NFT[] {
  return powers.map((power, i) => makeNFT({ tokenId: String(i), power, ...extras }));
}

// ═══════════════════════════════════════════════════════════════
// selectAIDeck
// ═══════════════════════════════════════════════════════════════
describe('selectAIDeck', () => {
  it('returns empty for empty cards', () => {
    expect(selectAIDeck([], 'gey')).toEqual([]);
  });

  it('gey picks only power 15 cards', () => {
    const cards = makeCards([15, 15, 15, 15, 15, 20, 30]);
    const deck = selectAIDeck(cards, 'gey', 5);
    expect(deck.length).toBe(5);
    deck.forEach((c) => expect(c.power).toBe(15));
  });

  it('goofy picks power 18 or 21 cards', () => {
    const cards = makeCards([18, 18, 21, 21, 18, 15, 30]);
    const deck = selectAIDeck(cards, 'goofy', 5);
    expect(deck.length).toBe(5);
    deck.forEach((c) => expect([18, 21]).toContain(c.power));
  });

  it('gooner picks power 60 or 72 cards', () => {
    const cards = makeCards([60, 60, 72, 72, 60, 15, 30]);
    const deck = selectAIDeck(cards, 'gooner', 5);
    expect(deck.length).toBe(5);
    deck.forEach((c) => expect([60, 72]).toContain(c.power));
  });

  it('gigachad picks strongest cards', () => {
    const cards = makeCards([100, 50, 80, 20, 90, 10, 70]);
    const deck = selectAIDeck(cards, 'gigachad', 5);
    expect(deck.length).toBe(5);
    expect(deck.map((c) => c.power)).toEqual([100, 90, 80, 70, 50]);
  });

  it('falls back to strongest when not enough cards for difficulty', () => {
    const cards = makeCards([15, 20, 30, 40, 50]);
    // gey wants power=15 only, but there's only 1 → fallback
    const deck = selectAIDeck(cards, 'gey', 5);
    expect(deck.length).toBe(5);
  });

  it('gangster picks power 150 when enough available', () => {
    const cards = makeCards([150, 150, 150, 150, 150, 15, 20]);
    const deck = selectAIDeck(cards, 'gangster', 5);
    expect(deck.length).toBe(5);
    deck.forEach((c) => expect(c.power).toBe(150));
  });

  it('gangster falls back to legendaries when not enough 150', () => {
    const cards = [
      makeNFT({ tokenId: '0', power: 150 }),
      makeNFT({ tokenId: '1', power: 100, rarity: 'Legendary' }),
      makeNFT({ tokenId: '2', power: 80, rarity: 'Legendary' }),
      makeNFT({ tokenId: '3', power: 60, rarity: 'Legendary' }),
      makeNFT({ tokenId: '4', power: 50, rarity: 'Legendary' }),
      makeNFT({ tokenId: '5', power: 40, rarity: 'Legendary' }),
      makeNFT({ tokenId: '6', power: 10, rarity: 'Common' }),
    ];
    const deck = selectAIDeck(cards, 'gangster', 5);
    expect(deck.length).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════
// calcBattleResult
// ═══════════════════════════════════════════════════════════════
describe('calcBattleResult', () => {
  it('player wins with higher power', () => {
    const player = makeCards([20, 30]);
    const opponent = makeCards([10, 15]);
    const result = calcBattleResult(player, opponent);
    expect(result.winner).toBe('player');
    expect(result.playerPower).toBe(50);
    expect(result.opponentPower).toBe(25);
    expect(result.powerDifference).toBe(25);
  });

  it('opponent wins with higher power', () => {
    const player = makeCards([10]);
    const opponent = makeCards([50]);
    const result = calcBattleResult(player, opponent);
    expect(result.winner).toBe('opponent');
  });

  it('tie with equal power', () => {
    const player = makeCards([25]);
    const opponent = makeCards([25]);
    const result = calcBattleResult(player, opponent);
    expect(result.winner).toBe('tie');
    expect(result.powerDifference).toBe(0);
  });

  it('applies collection buffs', () => {
    const player = [makeNFT({ power: 10, collection: 'vibefid' })]; // 50
    const opponent = [makeNFT({ power: 10, collection: 'vibe' })]; // 20
    const result = calcBattleResult(player, opponent);
    expect(result.playerPower).toBe(50);
    expect(result.opponentPower).toBe(20);
    expect(result.winner).toBe('player');
  });

  it('applies nothing 0.5x (floored)', () => {
    const player = [makeNFT({ power: 15, collection: 'nothing' })]; // 7
    const opponent = [makeNFT({ power: 7 })]; // 7
    const result = calcBattleResult(player, opponent);
    expect(result.playerPower).toBe(7);
    expect(result.opponentPower).toBe(7);
    expect(result.winner).toBe('tie');
  });

  it('handles empty arrays', () => {
    const result = calcBattleResult([], []);
    expect(result.playerPower).toBe(0);
    expect(result.opponentPower).toBe(0);
    expect(result.winner).toBe('tie');
  });
});

// ═══════════════════════════════════════════════════════════════
// validateCards
// ═══════════════════════════════════════════════════════════════
describe('validateCards', () => {
  it('valid when cards meet requirements', () => {
    const cards = makeCards([10, 20, 30, 40, 50]);
    const result = validateCards(cards, 5);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('invalid when wrong count', () => {
    const cards = makeCards([10, 20]);
    const result = validateCards(cards, 5);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Must select exactly 5 cards');
  });

  it('invalid when cards have no tokenId', () => {
    const cards = [makeNFT({ tokenId: '', power: 10 })];
    const result = validateCards(cards, 1);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('defaults to HAND_SIZE (5) for required count', () => {
    const cards = makeCards([10, 20, 30]);
    const result = validateCards(cards);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Must select exactly 5 cards');
  });
});

// ═══════════════════════════════════════════════════════════════
// calcEliminationRounds
// ═══════════════════════════════════════════════════════════════
describe('calcEliminationRounds', () => {
  it('creates rounds matching card pairs', () => {
    const player = makeCards([30, 10, 20]);
    const opponent = makeCards([20, 20, 10]);
    const rounds = calcEliminationRounds(player, opponent);

    expect(rounds.length).toBe(3);
    expect(rounds[0].round).toBe(1);
    expect(rounds[0].winner).toBe('player'); // 30 > 20
    expect(rounds[1].winner).toBe('opponent'); // 10 < 20
    expect(rounds[2].winner).toBe('player'); // 20 > 10
  });

  it('handles tie rounds', () => {
    const player = makeCards([20]);
    const opponent = makeCards([20]);
    const rounds = calcEliminationRounds(player, opponent);
    expect(rounds[0].winner).toBe('tie');
  });

  it('uses min length of both arrays', () => {
    const player = makeCards([10, 20, 30]);
    const opponent = makeCards([10, 20]);
    const rounds = calcEliminationRounds(player, opponent);
    expect(rounds.length).toBe(2);
  });

  it('handles empty arrays', () => {
    expect(calcEliminationRounds([], [])).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// selectStrongest
// ═══════════════════════════════════════════════════════════════
describe('selectStrongest', () => {
  it('selects top N cards by power', () => {
    const nfts = makeCards([5, 100, 50, 20, 80]);
    const top3 = selectStrongest(nfts, 3);
    expect(top3.length).toBe(3);
    expect(top3.map((c) => c.power)).toEqual([100, 80, 50]);
  });

  it('returns all when count exceeds length', () => {
    const nfts = makeCards([10, 20]);
    expect(selectStrongest(nfts, 10).length).toBe(2);
  });

  it('does not mutate original', () => {
    const nfts = makeCards([5, 100, 50]);
    const original = nfts.map((n) => n.power);
    selectStrongest(nfts, 2);
    expect(nfts.map((n) => n.power)).toEqual(original);
  });
});

// ═══════════════════════════════════════════════════════════════
// calcWinProbability
// ═══════════════════════════════════════════════════════════════
describe('calcWinProbability', () => {
  it('returns 1.0 when opponent power is 0', () => {
    expect(calcWinProbability(100, 0)).toBe(1.0);
  });

  it('returns ~0.5 when powers are equal', () => {
    const prob = calcWinProbability(100, 100);
    expect(prob).toBeCloseTo(0.5, 1);
  });

  it('returns > 0.5 when player is stronger', () => {
    expect(calcWinProbability(200, 100)).toBeGreaterThan(0.5);
  });

  it('returns < 0.5 when player is weaker', () => {
    expect(calcWinProbability(50, 100)).toBeLessThan(0.5);
  });

  it('approaches 1.0 with large advantage', () => {
    expect(calcWinProbability(1000, 100)).toBeGreaterThan(0.99);
  });

  it('approaches 0.0 with large disadvantage', () => {
    expect(calcWinProbability(10, 1000)).toBeLessThan(0.01);
  });
});

// ═══════════════════════════════════════════════════════════════
// calcBattleRecommendations
// ═══════════════════════════════════════════════════════════════
describe('calcBattleRecommendations', () => {
  it('picks strongest cards up to handSize', () => {
    const cards = makeCards([100, 50, 80, 20, 90, 10, 70]);
    const result = calcBattleRecommendations(cards, 200, 5);
    expect(result.recommended.length).toBe(5);
    expect(result.recommended.map((c) => c.power)).toEqual([100, 90, 80, 70, 50]);
    expect(result.totalPower).toBe(390);
  });

  it('high confidence when power ratio >= 1.2', () => {
    const cards = makeCards([100, 100, 100, 100, 100]);
    const result = calcBattleRecommendations(cards, 100, 5);
    expect(result.confidence).toBe('high');
  });

  it('medium confidence when power ratio >= 1.0 and < 1.2', () => {
    const cards = makeCards([20, 20, 20, 20, 20]);
    const result = calcBattleRecommendations(cards, 100, 5);
    expect(result.confidence).toBe('medium');
  });

  it('low confidence when power ratio < 1.0', () => {
    const cards = makeCards([10, 10, 10, 10, 10]);
    const result = calcBattleRecommendations(cards, 100, 5);
    expect(result.confidence).toBe('low');
  });

  it('handles fewer cards than handSize', () => {
    const cards = makeCards([10, 20]);
    const result = calcBattleRecommendations(cards, 100, 5);
    expect(result.recommended.length).toBe(2);
    expect(result.totalPower).toBe(30);
  });
});
