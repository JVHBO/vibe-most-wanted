import { describe, it, expect } from 'vitest';
import {
  calculateTotalPower,
  getCardDisplayPower,
  getCollectionMultiplier,
} from '@/lib/power-utils';
import { calculateCardPowerDetailed } from '@/lib/utils/card-power';

describe('Power Calculation', () => {
  it('applies correct collection multipliers', () => {
    expect(getCollectionMultiplier('vibefid')).toBe(5);
    expect(getCollectionMultiplier('vibefid', true)).toBe(10);
    expect(getCollectionMultiplier('vibe')).toBe(2);
    expect(getCollectionMultiplier('nothing')).toBe(0.5);
    expect(getCollectionMultiplier('gmvbrs')).toBe(1);
    expect(getCollectionMultiplier(undefined)).toBe(1);
  });

  it('calculates single card display power with floor', () => {
    expect(getCardDisplayPower({ power: 100, collection: 'vibe' })).toBe(200);
    expect(getCardDisplayPower({ power: 7, collection: 'nothing' })).toBe(3);
    expect(getCardDisplayPower({ power: 50, collection: 'vibefid' })).toBe(250);
    expect(getCardDisplayPower({ power: 50, collection: 'vibefid' }, true)).toBe(500);
    expect(getCardDisplayPower(null)).toBe(0);
    expect(getCardDisplayPower({ collection: 'vibe' })).toBe(0);
  });

  it('sums total power for mixed collections', () => {
    const cards = [
      { power: 100, collection: 'vibe' },
      { power: 50, collection: 'vibefid' },
      { power: 20, collection: 'nothing' },
      { power: 30, collection: 'gmvbrs' },
    ];
    expect(calculateTotalPower(cards)).toBe(490);
  });

  it('uses 10x VibeFID multiplier for leaderboard attacks', () => {
    const cards = [
      { power: 100, collection: 'vibefid' },
      { power: 50, collection: 'vibe' },
    ];
    expect(calculateTotalPower(cards, true)).toBe(1100);
    expect(calculateTotalPower(cards, false)).toBe(600);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotalPower([])).toBe(0);
    expect(calculateTotalPower([], true)).toBe(0);
  });

  // ═══════════════════════════════════════════════════════════════
  // Rarity-based power (Common, Rare, Epic)
  // ═══════════════════════════════════════════════════════════════
  it('calculates correct base power per rarity', () => {
    const common = calculateCardPowerDetailed({ rarity: 'Common' });
    const rare = calculateCardPowerDetailed({ rarity: 'Rare' });
    const epic = calculateCardPowerDetailed({ rarity: 'Epic' });
    const legendary = calculateCardPowerDetailed({ rarity: 'Legendary' });
    const mythic = calculateCardPowerDetailed({ rarity: 'Mythic' });

    expect(common.baseValue).toBe(5);
    expect(rare.baseValue).toBe(20);
    expect(epic.baseValue).toBe(80);
    expect(legendary.baseValue).toBe(240);
    expect(mythic.baseValue).toBe(800);

    expect(common.power).toBe(5);
    expect(rare.power).toBe(20);
    expect(epic.power).toBe(80);
  });

  it('applies foil multiplier correctly', () => {
    const noFoil = calculateCardPowerDetailed({ rarity: 'Rare', foil: 'None' });
    const standard = calculateCardPowerDetailed({ rarity: 'Rare', foil: 'Standard' });
    const prize = calculateCardPowerDetailed({ rarity: 'Rare', foil: 'Prize' });

    expect(noFoil.power).toBe(20);           // 20 * 1.0
    expect(standard.power).toBe(50);          // 20 * 2.5
    expect(prize.power).toBe(300);            // 20 * 15.0
    expect(noFoil.foilMultiplier).toBe(1.0);
    expect(standard.foilMultiplier).toBe(2.5);
    expect(prize.foilMultiplier).toBe(15.0);
  });

  it('returns minimum power of 1 for any card', () => {
    const result = calculateCardPowerDetailed({ rarity: 'Common', wear: 'Heavily Played', foil: 'None' });
    expect(result.power).toBeGreaterThanOrEqual(1);
  });

  it('handles null/undefined card gracefully', () => {
    expect(getCardDisplayPower(null)).toBe(0);
    expect(getCardDisplayPower(undefined)).toBe(0);
    expect(getCardDisplayPower({ power: undefined })).toBe(0);
  });
});
