import { describe, it, expect } from 'vitest';
import {
  calculateTotalPower,
  getCardDisplayPower,
  getCollectionMultiplier,
} from '@/lib/power-utils';

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
    expect(getCardDisplayPower({ power: 7, collection: 'nothing' })).toBe(3); // floor(3.5)
    expect(getCardDisplayPower({ power: 50, collection: 'vibefid' })).toBe(250);
    expect(getCardDisplayPower({ power: 50, collection: 'vibefid' }, true)).toBe(500);
    expect(getCardDisplayPower(null)).toBe(0);
    expect(getCardDisplayPower({ collection: 'vibe' })).toBe(0); // no power field
  });

  it('sums total power for mixed collections', () => {
    const cards = [
      { power: 100, collection: 'vibe' },      // 200
      { power: 50, collection: 'vibefid' },     // 250
      { power: 20, collection: 'nothing' },     // 10
      { power: 30, collection: 'gmvbrs' },      // 30
    ];
    expect(calculateTotalPower(cards)).toBe(490);
  });

  it('uses 10x VibeFID multiplier for leaderboard attacks', () => {
    const cards = [
      { power: 100, collection: 'vibefid' },   // 1000 (10x)
      { power: 50, collection: 'vibe' },        // 100 (2x)
    ];
    expect(calculateTotalPower(cards, true)).toBe(1100);
    expect(calculateTotalPower(cards, false)).toBe(600); // 500 + 100
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotalPower([])).toBe(0);
    expect(calculateTotalPower([], true)).toBe(0);
  });
});
