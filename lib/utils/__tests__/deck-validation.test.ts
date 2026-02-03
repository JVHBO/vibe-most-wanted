import { describe, it, expect } from 'vitest';
import {
  validateDeck,
  calculateCardPower,
  calculateLanePower,
  TCG_CONFIG,
  type DeckCard,
} from '../deck-validation';

function makeCard(overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    type: 'vbms',
    cardId: '1',
    rarity: 'Common',
    power: 20,
    imageUrl: 'https://example.com/card.png',
    ...overrides,
  };
}

function makeDeck(vbms = 7, nothing = 5): DeckCard[] {
  const cards: DeckCard[] = [];
  for (let i = 0; i < vbms; i++) {
    cards.push(makeCard({ cardId: `vbms-${i}`, type: 'vbms', power: 20 }));
  }
  for (let i = 0; i < nothing; i++) {
    cards.push(makeCard({ cardId: `nothing-${i}`, type: 'nothing', power: 10 }));
  }
  return cards;
}

// ═══════════════════════════════════════════════════════════════
// validateDeck
// ═══════════════════════════════════════════════════════════════
describe('validateDeck', () => {
  it('accepts a valid deck of 12 cards with enough VBMS', () => {
    const cards = makeDeck(7, 5);
    const result = validateDeck(cards);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects deck with wrong size', () => {
    const cards = makeDeck(5, 0); // only 5 cards
    const result = validateDeck(cards);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(`Deck must have exactly ${TCG_CONFIG.DECK_SIZE} cards`);
  });

  it('rejects empty deck', () => {
    const result = validateDeck([]);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects deck with too few VBMS/VibeFID cards', () => {
    // 4 vbms + 8 nothing = 12 cards but only 4 VBMS (need 5)
    const cards = makeDeck(4, 8);
    const result = validateDeck(cards);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(`Deck must have at least ${TCG_CONFIG.MIN_VBMS} VBMS/VibeFID cards`);
  });

  it('counts vibefid towards VBMS minimum', () => {
    const cards: DeckCard[] = [];
    for (let i = 0; i < 3; i++) cards.push(makeCard({ cardId: `vbms-${i}`, type: 'vbms' }));
    for (let i = 0; i < 2; i++) cards.push(makeCard({ cardId: `vfid-${i}`, type: 'vibefid' }));
    for (let i = 0; i < 7; i++) cards.push(makeCard({ cardId: `nothing-${i}`, type: 'nothing' }));
    // 3 vbms + 2 vibefid = 5, meets minimum
    const result = validateDeck(cards);
    expect(result.isValid).toBe(true);
  });

  it('rejects deck with too many nothing/other cards', () => {
    // 5 vbms + 8 nothing = 13 cards (wrong size too, but test MAX_NOTHING)
    const cards: DeckCard[] = [];
    for (let i = 0; i < 4; i++) cards.push(makeCard({ cardId: `vbms-${i}`, type: 'vbms' }));
    for (let i = 0; i < 8; i++) cards.push(makeCard({ cardId: `nothing-${i}`, type: 'nothing' }));
    const result = validateDeck(cards);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(`Deck can have at most ${TCG_CONFIG.MAX_NOTHING} Nothing/Other cards`);
  });

  it('counts "other" towards nothing limit', () => {
    const cards: DeckCard[] = [];
    for (let i = 0; i < 5; i++) cards.push(makeCard({ cardId: `vbms-${i}`, type: 'vbms' }));
    for (let i = 0; i < 4; i++) cards.push(makeCard({ cardId: `nothing-${i}`, type: 'nothing' }));
    for (let i = 0; i < 4; i++) cards.push(makeCard({ cardId: `other-${i}`, type: 'other' }));
    // 4 nothing + 4 other = 8 > 7 limit, but also 13 cards
    const result = validateDeck(cards);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(`Deck can have at most ${TCG_CONFIG.MAX_NOTHING} Nothing/Other cards`);
  });

  it('can report multiple errors at once', () => {
    const cards = makeDeck(2, 2); // 4 cards, 2 vbms, 2 nothing
    const result = validateDeck(cards);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2); // wrong size + not enough VBMS
  });

  it('calculates total power with nothing penalty', () => {
    const cards: DeckCard[] = [];
    for (let i = 0; i < 6; i++) cards.push(makeCard({ cardId: `vbms-${i}`, type: 'vbms', power: 20 }));
    for (let i = 0; i < 6; i++) cards.push(makeCard({ cardId: `nothing-${i}`, type: 'nothing', power: 20 }));
    const result = validateDeck(cards);
    // 6 * 20 (vbms) + 6 * 10 (nothing at 50%) = 120 + 60 = 180
    expect(result.totalPower).toBe(180);
  });

  it('applies 50% penalty to "other" type too', () => {
    const cards: DeckCard[] = [];
    for (let i = 0; i < 6; i++) cards.push(makeCard({ cardId: `vbms-${i}`, type: 'vbms', power: 10 }));
    for (let i = 0; i < 6; i++) cards.push(makeCard({ cardId: `other-${i}`, type: 'other', power: 10 }));
    const result = validateDeck(cards);
    // 6 * 10 + 6 * 5 = 90
    expect(result.totalPower).toBe(90);
  });

  it('floors the nothing power calculation', () => {
    const cards: DeckCard[] = [];
    for (let i = 0; i < 5; i++) cards.push(makeCard({ cardId: `vbms-${i}`, type: 'vbms', power: 10 }));
    for (let i = 0; i < 7; i++) cards.push(makeCard({ cardId: `nothing-${i}`, type: 'nothing', power: 15 }));
    const result = validateDeck(cards);
    // 5 * 10 + 7 * floor(15*0.5) = 50 + 7*7 = 50 + 49 = 99
    expect(result.totalPower).toBe(99);
  });

  it('accepts exactly minimum VBMS and maximum nothing', () => {
    // 5 vbms + 7 nothing = 12 cards, exactly at limits
    const cards = makeDeck(5, 7);
    const result = validateDeck(cards);
    expect(result.isValid).toBe(true);
  });

  it('accepts all-VBMS deck', () => {
    const cards: DeckCard[] = [];
    for (let i = 0; i < 12; i++) cards.push(makeCard({ cardId: `vbms-${i}`, type: 'vbms', power: 30 }));
    const result = validateDeck(cards);
    expect(result.isValid).toBe(true);
    expect(result.totalPower).toBe(360);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateCardPower
// ═══════════════════════════════════════════════════════════════
describe('calculateCardPower', () => {
  it('returns full power for vbms', () => {
    expect(calculateCardPower({ power: 20, type: 'vbms' })).toBe(20);
  });

  it('returns 50% for nothing', () => {
    expect(calculateCardPower({ power: 20, type: 'nothing' })).toBe(10);
  });

  it('returns 50% for other', () => {
    expect(calculateCardPower({ power: 20, type: 'other' })).toBe(10);
  });

  it('floors odd power values for nothing', () => {
    expect(calculateCardPower({ power: 15, type: 'nothing' })).toBe(7);
  });

  it('returns 0 for 0 power', () => {
    expect(calculateCardPower({ power: 0, type: 'vbms' })).toBe(0);
  });

  it('returns full power when type is undefined', () => {
    expect(calculateCardPower({ power: 30 })).toBe(30);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateLanePower
// ═══════════════════════════════════════════════════════════════
describe('calculateLanePower', () => {
  it('sums card powers', () => {
    const cards = [
      { power: 10, type: 'vbms' },
      { power: 20, type: 'vbms' },
    ];
    expect(calculateLanePower(cards)).toBe(30);
  });

  it('applies nothing penalty per card', () => {
    const cards = [
      { power: 20, type: 'vbms' },
      { power: 20, type: 'nothing' },
    ];
    expect(calculateLanePower(cards)).toBe(30);
  });

  it('returns 0 for empty lane', () => {
    expect(calculateLanePower([])).toBe(0);
  });
});
