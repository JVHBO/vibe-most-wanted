/**
 * Pure functions for TCG deck validation.
 * Extracted from convex/tcg.ts saveDeck mutation for testability.
 */

export const TCG_CONFIG = {
  DECK_SIZE: 12,
  MIN_VBMS: 5,
  MAX_NOTHING: 7,
  NOTHING_POWER_MULTIPLIER: 0.5,
};

export interface DeckCard {
  type: 'vbms' | 'vibefid' | 'nothing' | 'other';
  cardId: string;
  name?: string;
  rarity: string;
  power: number;
  imageUrl: string;
}

export interface DeckValidationResult {
  isValid: boolean;
  errors: string[];
  totalPower: number;
}

/**
 * Validate a TCG deck against all rules
 */
export function validateDeck(cards: DeckCard[]): DeckValidationResult {
  const errors: string[] = [];

  // Deck size
  if (cards.length !== TCG_CONFIG.DECK_SIZE) {
    errors.push(`Deck must have exactly ${TCG_CONFIG.DECK_SIZE} cards`);
  }

  const vbmsCount = cards.filter(c => c.type === 'vbms').length;
  const vibefidCount = cards.filter(c => c.type === 'vibefid').length;
  const nothingCount = cards.filter(c => c.type === 'nothing').length;
  const otherCount = cards.filter(c => c.type === 'other').length;
  const halfPowerCount = nothingCount + otherCount;

  // Minimum VBMS/VibeFID
  if (vbmsCount + vibefidCount < TCG_CONFIG.MIN_VBMS) {
    errors.push(`Deck must have at least ${TCG_CONFIG.MIN_VBMS} VBMS/VibeFID cards`);
  }

  // Max nothing/other
  if (halfPowerCount > TCG_CONFIG.MAX_NOTHING) {
    errors.push(`Deck can have at most ${TCG_CONFIG.MAX_NOTHING} Nothing/Other cards`);
  }

  // Calculate total power
  const totalPower = cards.reduce((sum, card) => {
    const power = (card.type === 'nothing' || card.type === 'other')
      ? Math.floor(card.power * TCG_CONFIG.NOTHING_POWER_MULTIPLIER)
      : card.power;
    return sum + power;
  }, 0);

  return { isValid: errors.length === 0, errors, totalPower };
}

/**
 * Calculate card power with nothing/other penalty
 */
export function calculateCardPower(card: { power: number; type?: string }): number {
  const basePower = card.power || 0;
  if (card.type === 'nothing' || card.type === 'other') {
    return Math.floor(basePower * TCG_CONFIG.NOTHING_POWER_MULTIPLIER);
  }
  return basePower;
}

/**
 * Calculate lane power from cards
 */
export function calculateLanePower(cards: { power: number; type?: string }[]): number {
  return cards.reduce((sum, card) => sum + calculateCardPower(card), 0);
}
