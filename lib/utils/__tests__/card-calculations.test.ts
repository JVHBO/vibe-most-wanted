import { describe, it, expect } from 'vitest';
import {
  calcTotalPower,
  sortByPower,
  filterByPower,
  filterByExactPower,
  filterLegendaries,
  strongestCards,
  calcCardStats,
  shuffleCards,
  filterByPowerValues,
  groupByRarity,
  powerDistribution,
  powerByCollection,
} from '../card-calculations';
import type { NFT } from '@/hooks/useCardCalculations';

function makeNFT(overrides: Partial<NFT> = {}): NFT {
  return { tokenId: '1', power: 10, ...overrides };
}

// ═══════════════════════════════════════════════════════════════
// calcTotalPower
// ═══════════════════════════════════════════════════════════════
describe('calcTotalPower', () => {
  it('returns 0 for empty array', () => {
    expect(calcTotalPower([])).toBe(0);
  });

  it('sums base power without collection', () => {
    const cards = [makeNFT({ power: 10 }), makeNFT({ power: 20 })];
    expect(calcTotalPower(cards)).toBe(30);
  });

  it('applies 5x multiplier for vibefid', () => {
    const cards = [makeNFT({ power: 10, collection: 'vibefid' })];
    expect(calcTotalPower(cards)).toBe(50);
  });

  it('applies 2x multiplier for vibe', () => {
    const cards = [makeNFT({ power: 10, collection: 'vibe' })];
    expect(calcTotalPower(cards)).toBe(20);
  });

  it('applies 0.5x multiplier for nothing (floored)', () => {
    const cards = [makeNFT({ power: 15, collection: 'nothing' })];
    expect(calcTotalPower(cards)).toBe(7);
  });

  it('handles mixed collections', () => {
    const cards = [
      makeNFT({ power: 10, collection: 'vibefid' }), // 50
      makeNFT({ power: 10, collection: 'vibe' }),     // 20
      makeNFT({ power: 10, collection: 'nothing' }),  // 5
      makeNFT({ power: 10 }),                         // 10
    ];
    expect(calcTotalPower(cards)).toBe(85);
  });

  it('treats undefined power as 0', () => {
    const cards = [makeNFT({ power: undefined })];
    expect(calcTotalPower(cards)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// sortByPower
// ═══════════════════════════════════════════════════════════════
describe('sortByPower', () => {
  it('returns empty array for empty input', () => {
    expect(sortByPower([])).toEqual([]);
  });

  it('sorts descending by display power', () => {
    const nfts = [
      makeNFT({ tokenId: 'a', power: 5 }),
      makeNFT({ tokenId: 'b', power: 50 }),
      makeNFT({ tokenId: 'c', power: 20 }),
    ];
    const sorted = sortByPower(nfts);
    expect(sorted.map((n) => n.tokenId)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the original array', () => {
    const nfts = [makeNFT({ power: 5 }), makeNFT({ power: 50 })];
    const original = [...nfts];
    sortByPower(nfts);
    expect(nfts).toEqual(original);
  });
});

// ═══════════════════════════════════════════════════════════════
// filterByPower
// ═══════════════════════════════════════════════════════════════
describe('filterByPower', () => {
  const nfts = [
    makeNFT({ power: 10 }),
    makeNFT({ power: 15 }),
    makeNFT({ power: 20 }),
    makeNFT({ power: 30 }),
  ];

  it('filters by exact power when no max provided', () => {
    expect(filterByPower(nfts, 15).length).toBe(1);
    expect(filterByPower(nfts, 15)[0].power).toBe(15);
  });

  it('filters by range when max provided', () => {
    expect(filterByPower(nfts, 10, 20).length).toBe(3);
  });

  it('returns empty when no match', () => {
    expect(filterByPower(nfts, 99)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// filterByExactPower
// ═══════════════════════════════════════════════════════════════
describe('filterByExactPower', () => {
  it('returns cards with exact power', () => {
    const nfts = [makeNFT({ power: 15 }), makeNFT({ power: 20 }), makeNFT({ power: 15 })];
    expect(filterByExactPower(nfts, 15).length).toBe(2);
  });

  it('treats undefined power as 0', () => {
    const nfts = [makeNFT({ power: undefined })];
    expect(filterByExactPower(nfts, 0).length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// filterLegendaries
// ═══════════════════════════════════════════════════════════════
describe('filterLegendaries', () => {
  it('filters cards with rarity containing "legend"', () => {
    const nfts = [
      makeNFT({ rarity: 'Legendary' }),
      makeNFT({ rarity: 'Common' }),
      makeNFT({ rarity: 'legend' }),
    ];
    expect(filterLegendaries(nfts).length).toBe(2);
  });

  it('is case-insensitive', () => {
    const nfts = [makeNFT({ rarity: 'LEGENDARY' })];
    expect(filterLegendaries(nfts).length).toBe(1);
  });

  it('returns empty for no legendaries', () => {
    const nfts = [makeNFT({ rarity: 'Common' }), makeNFT({ rarity: 'Rare' })];
    expect(filterLegendaries(nfts)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// strongestCards
// ═══════════════════════════════════════════════════════════════
describe('strongestCards', () => {
  it('returns top N cards by display power', () => {
    const nfts = [
      makeNFT({ tokenId: 'a', power: 5 }),
      makeNFT({ tokenId: 'b', power: 100 }),
      makeNFT({ tokenId: 'c', power: 50 }),
      makeNFT({ tokenId: 'd', power: 20 }),
    ];
    const top2 = strongestCards(nfts, 2);
    expect(top2.length).toBe(2);
    expect(top2[0].tokenId).toBe('b');
    expect(top2[1].tokenId).toBe('c');
  });

  it('returns all cards if count exceeds length', () => {
    const nfts = [makeNFT(), makeNFT()];
    expect(strongestCards(nfts, 10).length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// calcCardStats
// ═══════════════════════════════════════════════════════════════
describe('calcCardStats', () => {
  it('returns zeroed stats for empty array', () => {
    const stats = calcCardStats([]);
    expect(stats).toEqual({
      totalPower: 0,
      avgPower: 0,
      maxPower: 0,
      minPower: 0,
      count: 0,
    });
  });

  it('calculates correct stats', () => {
    const cards = [makeNFT({ power: 10 }), makeNFT({ power: 20 }), makeNFT({ power: 30 })];
    const stats = calcCardStats(cards);
    expect(stats.totalPower).toBe(60);
    expect(stats.avgPower).toBe(20);
    expect(stats.maxPower).toBe(30);
    expect(stats.minPower).toBe(10);
    expect(stats.count).toBe(3);
  });

  it('rounds average power', () => {
    const cards = [makeNFT({ power: 10 }), makeNFT({ power: 11 })];
    const stats = calcCardStats(cards);
    expect(stats.avgPower).toBe(Math.round(21 / 2));
  });
});

// ═══════════════════════════════════════════════════════════════
// shuffleCards
// ═══════════════════════════════════════════════════════════════
describe('shuffleCards', () => {
  it('returns array of same length', () => {
    const nfts = [makeNFT({ tokenId: 'a' }), makeNFT({ tokenId: 'b' }), makeNFT({ tokenId: 'c' })];
    expect(shuffleCards(nfts).length).toBe(3);
  });

  it('contains all original elements', () => {
    const nfts = [makeNFT({ tokenId: 'a' }), makeNFT({ tokenId: 'b' }), makeNFT({ tokenId: 'c' })];
    const shuffled = shuffleCards(nfts);
    const ids = shuffled.map((n) => n.tokenId).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the original array', () => {
    const nfts = [makeNFT({ tokenId: 'a' }), makeNFT({ tokenId: 'b' })];
    const original = [...nfts];
    shuffleCards(nfts);
    expect(nfts).toEqual(original);
  });
});

// ═══════════════════════════════════════════════════════════════
// filterByPowerValues
// ═══════════════════════════════════════════════════════════════
describe('filterByPowerValues', () => {
  it('filters by multiple power values', () => {
    const nfts = [
      makeNFT({ power: 15 }),
      makeNFT({ power: 18 }),
      makeNFT({ power: 21 }),
      makeNFT({ power: 30 }),
    ];
    const result = filterByPowerValues(nfts, [18, 21]);
    expect(result.length).toBe(2);
  });

  it('returns empty when no values match', () => {
    const nfts = [makeNFT({ power: 10 })];
    expect(filterByPowerValues(nfts, [99, 100])).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// groupByRarity
// ═══════════════════════════════════════════════════════════════
describe('groupByRarity', () => {
  it('groups cards by lowercased rarity', () => {
    const nfts = [
      makeNFT({ rarity: 'Common' }),
      makeNFT({ rarity: 'Common' }),
      makeNFT({ rarity: 'Rare' }),
      makeNFT({ rarity: 'Legendary' }),
    ];
    const groups = groupByRarity(nfts);
    expect(groups['common'].length).toBe(2);
    expect(groups['rare'].length).toBe(1);
    expect(groups['legendary'].length).toBe(1);
  });

  it('uses "unknown" for cards without rarity', () => {
    const nfts = [makeNFT({ rarity: undefined })];
    const groups = groupByRarity(nfts);
    expect(groups['unknown'].length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// powerDistribution
// ═══════════════════════════════════════════════════════════════
describe('powerDistribution', () => {
  it('creates histogram of power values', () => {
    const nfts = [
      makeNFT({ power: 15 }),
      makeNFT({ power: 15 }),
      makeNFT({ power: 20 }),
    ];
    const dist = powerDistribution(nfts);
    expect(dist[15]).toBe(2);
    expect(dist[20]).toBe(1);
  });

  it('returns empty object for empty array', () => {
    expect(powerDistribution([])).toEqual({});
  });
});

// ═══════════════════════════════════════════════════════════════
// powerByCollection
// ═══════════════════════════════════════════════════════════════
describe('powerByCollection', () => {
  it('separates power by collection', () => {
    const nfts = [
      makeNFT({ power: 10, collectionId: 'vibe' }),
      makeNFT({ power: 20, collectionId: 'gmvbrs' }),
      makeNFT({ power: 30, collectionId: 'vibefid' }),
    ];
    const result = powerByCollection(nfts);
    expect(result.vibePower).toBe(10);
    expect(result.vbrsPower).toBe(20);
    expect(result.vibefidPower).toBe(30);
  });

  it('defaults to vibe for unknown collections', () => {
    const nfts = [makeNFT({ power: 10, collectionId: 'something-else' })];
    const result = powerByCollection(nfts);
    expect(result.vibePower).toBe(10);
  });

  it('defaults to vibe when collectionId is undefined', () => {
    const nfts = [makeNFT({ power: 10 })];
    const result = powerByCollection(nfts);
    expect(result.vibePower).toBe(10);
  });

  it('maps custom to vibe', () => {
    const nfts = [makeNFT({ power: 10, collectionId: 'custom' })];
    const result = powerByCollection(nfts);
    expect(result.vibePower).toBe(10);
  });

  it('returns zeroes for empty array', () => {
    const result = powerByCollection([]);
    expect(result).toEqual({ vibePower: 0, vbrsPower: 0, vibefidPower: 0 });
  });
});
