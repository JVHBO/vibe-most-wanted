import { describe, it, expect } from 'vitest';
import {
  findAttribute,
  normalizeRarity,
  normalizeWear,
  normalizeFoil,
  calculateCardPower,
  calculateCardPowerDetailed,
  calculateCardPowerFromNFT,
  updateCardPower,
  calculateDeckPower,
  sortCardsByPower,
  getStrongestCard,
  getWeakestCard,
  filterCardsByMinPower,
  filterCardsByMaxPower,
  filterCardsByPowerRange,
  getDeckStats,
} from '../card-power';
import type { Card, CardRarity } from '../../types/card';

// Helper to create a Card object for testing
function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    tokenId: '1',
    power: 10,
    imageUrl: '',
    name: 'Test Card',
    rarity: 'Common',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// findAttribute
// ═══════════════════════════════════════════════════════════════
describe('findAttribute', () => {
  it('returns the attribute value when found', () => {
    const nft = {
      raw: {
        metadata: {
          attributes: [
            { trait_type: 'Rarity', value: 'Epic' },
            { trait_type: 'Wear', value: 'Mint' },
          ],
        },
      },
    };
    expect(findAttribute(nft, 'rarity')).toBe('Epic');
    expect(findAttribute(nft, 'wear')).toBe('Mint');
  });

  it('is case-insensitive for trait_type', () => {
    const nft = {
      raw: { metadata: { attributes: [{ trait_type: 'RARITY', value: 'Rare' }] } },
    };
    expect(findAttribute(nft, 'rarity')).toBe('Rare');
  });

  it('returns null when attribute is not found', () => {
    const nft = {
      raw: { metadata: { attributes: [{ trait_type: 'Rarity', value: 'Common' }] } },
    };
    expect(findAttribute(nft, 'foil')).toBeNull();
  });

  it('returns null for null/undefined nft', () => {
    expect(findAttribute(null, 'rarity')).toBeNull();
    expect(findAttribute(undefined, 'rarity')).toBeNull();
  });

  it('returns null when nft has no attributes', () => {
    expect(findAttribute({}, 'rarity')).toBeNull();
    expect(findAttribute({ raw: {} }, 'rarity')).toBeNull();
    expect(findAttribute({ raw: { metadata: {} } }, 'rarity')).toBeNull();
  });

  it('returns numeric attribute values', () => {
    const nft = {
      raw: { metadata: { attributes: [{ trait_type: 'power', value: 42 }] } },
    };
    expect(findAttribute(nft, 'power')).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════
// normalizeRarity
// ═══════════════════════════════════════════════════════════════
describe('normalizeRarity', () => {
  it('normalizes mythic variants', () => {
    expect(normalizeRarity('Mythic')).toBe('Mythic');
    expect(normalizeRarity('mythic')).toBe('Mythic');
    expect(normalizeRarity('MYTHIC')).toBe('Mythic');
    expect(normalizeRarity('Super Mythic')).toBe('Mythic');
  });

  it('normalizes legendary variants', () => {
    expect(normalizeRarity('Legendary')).toBe('Legendary');
    expect(normalizeRarity('legendary')).toBe('Legendary');
    expect(normalizeRarity('legend')).toBe('Legendary');
  });

  it('normalizes epic variants', () => {
    expect(normalizeRarity('Epic')).toBe('Epic');
    expect(normalizeRarity('epic card')).toBe('Epic');
  });

  it('normalizes rare variants', () => {
    expect(normalizeRarity('Rare')).toBe('Rare');
    expect(normalizeRarity('rare')).toBe('Rare');
    expect(normalizeRarity('Ultra Rare')).toBe('Rare');
  });

  it('defaults to Common for unknown values', () => {
    expect(normalizeRarity('Common')).toBe('Common');
    expect(normalizeRarity('unknown')).toBe('Common');
    expect(normalizeRarity('')).toBe('Common');
  });

  // Priority: mythic > legendary > epic > rare > common
  it('respects priority when multiple keywords match', () => {
    expect(normalizeRarity('mythic legendary')).toBe('Mythic');
    expect(normalizeRarity('legendary epic')).toBe('Legendary');
    expect(normalizeRarity('epic rare')).toBe('Epic');
  });
});

// ═══════════════════════════════════════════════════════════════
// normalizeWear
// ═══════════════════════════════════════════════════════════════
describe('normalizeWear', () => {
  it('normalizes Pristine', () => {
    expect(normalizeWear('Pristine')).toBe('Pristine');
    expect(normalizeWear('pristine')).toBe('Pristine');
  });

  it('normalizes Mint', () => {
    expect(normalizeWear('Mint')).toBe('Mint');
    expect(normalizeWear('mint condition')).toBe('Mint');
  });

  it('normalizes Lightly Played', () => {
    expect(normalizeWear('Lightly Played')).toBe('Lightly Played');
    expect(normalizeWear('lightly used')).toBe('Lightly Played');
  });

  it('normalizes Moderately Played', () => {
    expect(normalizeWear('Moderately Played')).toBe('Moderately Played');
  });

  it('normalizes Heavily Played', () => {
    expect(normalizeWear('Heavily Played')).toBe('Heavily Played');
    expect(normalizeWear('heavily worn')).toBe('Heavily Played');
  });

  it('defaults to Lightly Played for unknown values', () => {
    expect(normalizeWear('unknown')).toBe('Lightly Played');
    expect(normalizeWear('')).toBe('Lightly Played');
  });
});

// ═══════════════════════════════════════════════════════════════
// normalizeFoil
// ═══════════════════════════════════════════════════════════════
describe('normalizeFoil', () => {
  it('normalizes Prize', () => {
    expect(normalizeFoil('Prize')).toBe('Prize');
    expect(normalizeFoil('prize foil')).toBe('Prize');
  });

  it('normalizes Standard', () => {
    expect(normalizeFoil('Standard')).toBe('Standard');
    expect(normalizeFoil('standard')).toBe('Standard');
  });

  it('defaults to None for unknown values', () => {
    expect(normalizeFoil('None')).toBe('None');
    expect(normalizeFoil('unknown')).toBe('None');
    expect(normalizeFoil('')).toBe('None');
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateCardPower / calculateCardPowerDetailed
// ═══════════════════════════════════════════════════════════════
describe('calculateCardPower', () => {
  it('calculates power with default config for each rarity', () => {
    // base only, no wear/foil
    expect(calculateCardPower({ rarity: 'Common' })).toBe(5);
    expect(calculateCardPower({ rarity: 'Rare' })).toBe(20);
    expect(calculateCardPower({ rarity: 'Epic' })).toBe(80);
    expect(calculateCardPower({ rarity: 'Legendary' })).toBe(240);
    expect(calculateCardPower({ rarity: 'Mythic' })).toBe(800);
  });

  it('applies wear multiplier', () => {
    // Pristine = 1.8x
    expect(calculateCardPower({ rarity: 'Common', wear: 'Pristine' })).toBe(Math.round(5 * 1.8));
    // Mint = 1.4x
    expect(calculateCardPower({ rarity: 'Common', wear: 'Mint' })).toBe(Math.round(5 * 1.4));
    // Lightly Played = 1.0x
    expect(calculateCardPower({ rarity: 'Common', wear: 'Lightly Played' })).toBe(5);
  });

  it('applies foil multiplier', () => {
    // Prize = 15x
    expect(calculateCardPower({ rarity: 'Common', foil: 'Prize' })).toBe(Math.round(5 * 15));
    // Standard = 2.5x
    expect(calculateCardPower({ rarity: 'Common', foil: 'Standard' })).toBe(Math.round(5 * 2.5));
    // None = 1x
    expect(calculateCardPower({ rarity: 'Common', foil: 'None' })).toBe(5);
  });

  it('applies both wear and foil multipliers together', () => {
    // Mythic + Pristine + Prize = 800 * 1.8 * 15 = 21600
    expect(calculateCardPower({ rarity: 'Mythic', wear: 'Pristine', foil: 'Prize' })).toBe(21600);
    // Rare + Mint + Standard = 20 * 1.4 * 2.5 = 70
    expect(calculateCardPower({ rarity: 'Rare', wear: 'Mint', foil: 'Standard' })).toBe(70);
  });

  it('returns minimum of 1', () => {
    // Even with the lowest possible values the formula should never return < 1
    // Common (5) * 1.0 * 1.0 = 5 which is > 1, but the Math.max(1,...) guard is there
    expect(calculateCardPower({ rarity: 'Common' })).toBeGreaterThanOrEqual(1);
  });

  it('uses VibeFID config when collection is vibefid', () => {
    // VibeFID Mythic base = 600, Prize = 6.0x, Pristine = 1.8x
    // 600 * 1.8 * 6.0 = 6480
    expect(calculateCardPower({ rarity: 'Mythic', wear: 'Pristine', foil: 'Prize', collection: 'vibefid' })).toBe(6480);
    // VibeFID Common base = 10
    expect(calculateCardPower({ rarity: 'Common', collection: 'vibefid' })).toBe(10);
    // VibeFID Legendary base = 100, Standard = 2.0x, Mint = 1.4x → 100 * 1.4 * 2.0 = 280
    expect(calculateCardPower({ rarity: 'Legendary', wear: 'Mint', foil: 'Standard', collection: 'vibefid' })).toBe(280);
  });

  it('uses default config for other collections', () => {
    expect(calculateCardPower({ rarity: 'Common', collection: 'gmvbrs' })).toBe(5);
    expect(calculateCardPower({ rarity: 'Common', collection: 'vibe' })).toBe(5);
  });
});

describe('calculateCardPowerDetailed', () => {
  it('returns a full breakdown', () => {
    const result = calculateCardPowerDetailed({ rarity: 'Epic', wear: 'Mint', foil: 'Standard' });
    expect(result.power).toBe(Math.round(80 * 1.4 * 2.5)); // 280
    expect(result.baseValue).toBe(80);
    expect(result.wearMultiplier).toBe(1.4);
    expect(result.foilMultiplier).toBe(2.5);
    expect(result.breakdown.rarity).toContain('Epic');
    expect(result.breakdown.wear).toContain('Mint');
    expect(result.breakdown.foil).toContain('Standard');
  });

  it('handles missing wear and foil gracefully', () => {
    const result = calculateCardPowerDetailed({ rarity: 'Rare' });
    expect(result.wearMultiplier).toBe(1.0);
    expect(result.foilMultiplier).toBe(1.0);
    expect(result.power).toBe(20);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateCardPowerFromNFT
// ═══════════════════════════════════════════════════════════════
describe('calculateCardPowerFromNFT', () => {
  it('extracts attributes from NFT metadata and calculates power', () => {
    const nft = {
      raw: {
        metadata: {
          attributes: [
            { trait_type: 'rarity', value: 'Legendary' },
            { trait_type: 'wear', value: 'Pristine' },
            { trait_type: 'foil', value: 'Standard' },
          ],
        },
      },
    };
    // Legendary(240) * Pristine(1.8) * Standard(2.5) = 1080
    expect(calculateCardPowerFromNFT(nft)).toBe(1080);
  });

  it('defaults to Common when rarity attribute is missing', () => {
    const nft = { raw: { metadata: { attributes: [] } } };
    expect(calculateCardPowerFromNFT(nft)).toBe(5); // Common base
  });

  it('handles NFT with no attributes at all', () => {
    expect(calculateCardPowerFromNFT({})).toBe(5);
    expect(calculateCardPowerFromNFT(null)).toBe(5);
  });

  it('respects collection parameter', () => {
    const nft = {
      raw: {
        metadata: {
          attributes: [{ trait_type: 'rarity', value: 'Common' }],
        },
      },
    };
    expect(calculateCardPowerFromNFT(nft, 'vibefid')).toBe(10); // VibeFID Common = 10
  });
});

// ═══════════════════════════════════════════════════════════════
// updateCardPower
// ═══════════════════════════════════════════════════════════════
describe('updateCardPower', () => {
  it('recalculates and returns a new card with updated power', () => {
    const card = makeCard({ rarity: 'Rare', power: 999 }); // wrong power
    const updated = updateCardPower(card);
    expect(updated.power).toBe(20); // Rare base
    expect(updated).not.toBe(card); // should be a new object
    expect(updated.name).toBe(card.name); // other fields preserved
  });

  it('applies wear/foil from the card', () => {
    const card = makeCard({ rarity: 'Epic', wear: 'Pristine', foil: 'Prize' });
    const updated = updateCardPower(card);
    // Epic(80) * Pristine(1.8) * Prize(15) = 2160
    expect(updated.power).toBe(2160);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateDeckPower (uses collection multipliers from power-utils)
// ═══════════════════════════════════════════════════════════════
describe('calculateDeckPower', () => {
  it('returns 0 for empty deck', () => {
    expect(calculateDeckPower([])).toBe(0);
  });

  it('sums display power of all cards', () => {
    const cards = [
      makeCard({ power: 10, collection: 'vibe' }),    // 10 * 2x = 20
      makeCard({ power: 5, collection: 'nothing' }),   // 5 * 0.5x = 2 (floor)
      makeCard({ power: 100, collection: 'vibefid' }), // 100 * 5x = 500
      makeCard({ power: 50, collection: 'gmvbrs' }),   // 50 * 1x = 50
    ];
    expect(calculateDeckPower(cards)).toBe(20 + 2 + 500 + 50);
  });
});

// ═══════════════════════════════════════════════════════════════
// sortCardsByPower
// ═══════════════════════════════════════════════════════════════
describe('sortCardsByPower', () => {
  it('sorts descending by default', () => {
    const cards = [
      makeCard({ power: 10, collection: 'gmvbrs' }),  // display: 10
      makeCard({ power: 50, collection: 'gmvbrs' }),  // display: 50
      makeCard({ power: 5, collection: 'gmvbrs' }),   // display: 5
    ];
    const sorted = sortCardsByPower(cards);
    expect(sorted.map(c => c.power)).toEqual([50, 10, 5]);
  });

  it('sorts ascending when specified', () => {
    const cards = [
      makeCard({ power: 50, collection: 'gmvbrs' }),
      makeCard({ power: 5, collection: 'gmvbrs' }),
      makeCard({ power: 10, collection: 'gmvbrs' }),
    ];
    const sorted = sortCardsByPower(cards, true);
    expect(sorted.map(c => c.power)).toEqual([5, 10, 50]);
  });

  it('does not mutate the original array', () => {
    const cards = [makeCard({ power: 10 }), makeCard({ power: 5 })];
    const original = [...cards];
    sortCardsByPower(cards);
    expect(cards).toEqual(original);
  });

  it('accounts for collection multipliers in sort order', () => {
    // vibe card with power 10 → display 20 (2x)
    // gmvbrs card with power 15 → display 15 (1x)
    const vibeCard = makeCard({ power: 10, collection: 'vibe', tokenId: 'a' });
    const otherCard = makeCard({ power: 15, collection: 'gmvbrs', tokenId: 'b' });
    const sorted = sortCardsByPower([otherCard, vibeCard]);
    // vibe (20) > gmvbrs (15), so vibe card first
    expect(sorted[0].tokenId).toBe('a');
  });
});

// ═══════════════════════════════════════════════════════════════
// getStrongestCard / getWeakestCard
// ═══════════════════════════════════════════════════════════════
describe('getStrongestCard / getWeakestCard', () => {
  it('returns null for empty array', () => {
    expect(getStrongestCard([])).toBeNull();
    expect(getWeakestCard([])).toBeNull();
  });

  it('returns strongest card', () => {
    const cards = [
      makeCard({ power: 5, tokenId: 'a' }),
      makeCard({ power: 100, tokenId: 'b' }),
      makeCard({ power: 20, tokenId: 'c' }),
    ];
    expect(getStrongestCard(cards)?.tokenId).toBe('b');
  });

  it('returns weakest card', () => {
    const cards = [
      makeCard({ power: 5, tokenId: 'a' }),
      makeCard({ power: 100, tokenId: 'b' }),
      makeCard({ power: 20, tokenId: 'c' }),
    ];
    expect(getWeakestCard(cards)?.tokenId).toBe('a');
  });
});

// ═══════════════════════════════════════════════════════════════
// filterCardsByMinPower / MaxPower / PowerRange
// ═══════════════════════════════════════════════════════════════
describe('filterCardsByMinPower', () => {
  it('filters cards at or above minimum power', () => {
    const cards = [
      makeCard({ power: 5 }),
      makeCard({ power: 20 }),
      makeCard({ power: 100 }),
    ];
    expect(filterCardsByMinPower(cards, 20).length).toBe(2);
  });

  it('returns empty for threshold above all cards', () => {
    expect(filterCardsByMinPower([makeCard({ power: 5 })], 999)).toEqual([]);
  });
});

describe('filterCardsByMaxPower', () => {
  it('filters cards at or below maximum power', () => {
    const cards = [
      makeCard({ power: 5 }),
      makeCard({ power: 20 }),
      makeCard({ power: 100 }),
    ];
    expect(filterCardsByMaxPower(cards, 20).length).toBe(2);
  });
});

describe('filterCardsByPowerRange', () => {
  it('filters within range inclusive', () => {
    const cards = [
      makeCard({ power: 5 }),
      makeCard({ power: 20 }),
      makeCard({ power: 50 }),
      makeCard({ power: 100 }),
    ];
    expect(filterCardsByPowerRange(cards, 10, 60).length).toBe(2);
  });

  it('returns empty when no cards in range', () => {
    expect(filterCardsByPowerRange([makeCard({ power: 5 })], 10, 20)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// getDeckStats
// ═══════════════════════════════════════════════════════════════
describe('getDeckStats', () => {
  it('returns zeroed stats for empty deck', () => {
    const stats = getDeckStats([]);
    expect(stats.totalCards).toBe(0);
    expect(stats.totalPower).toBe(0);
    expect(stats.averagePower).toBe(0);
    expect(stats.minPower).toBe(0);
    expect(stats.maxPower).toBe(0);
  });

  it('calculates correct stats for a deck', () => {
    const cards = [
      makeCard({ power: 10, rarity: 'Common', collection: 'gmvbrs' }),
      makeCard({ power: 20, rarity: 'Rare', collection: 'gmvbrs' }),
      makeCard({ power: 80, rarity: 'Epic', collection: 'gmvbrs' }),
    ];
    const stats = getDeckStats(cards);
    expect(stats.totalCards).toBe(3);
    // Display powers: 10, 20, 80 (1x multiplier for gmvbrs)
    expect(stats.totalPower).toBe(110);
    expect(stats.averagePower).toBe(Math.round(110 / 3));
    expect(stats.minPower).toBe(10);
    expect(stats.maxPower).toBe(80);
  });

  it('counts rarity distribution', () => {
    const cards = [
      makeCard({ rarity: 'Common' }),
      makeCard({ rarity: 'Common' }),
      makeCard({ rarity: 'Rare' }),
    ];
    const stats = getDeckStats(cards);
    expect(stats.rarityDistribution['Common']).toBe(2);
    expect(stats.rarityDistribution['Rare']).toBe(1);
  });

  it('counts collection distribution', () => {
    const cards = [
      makeCard({ collection: 'vibe' }),
      makeCard({ collection: 'vibe' }),
      makeCard({ collection: 'vibefid' }),
    ];
    const stats = getDeckStats(cards);
    expect(stats.collectionDistribution['vibe']).toBe(2);
    expect(stats.collectionDistribution['vibefid']).toBe(1);
  });

  it('defaults collection to vibe when undefined', () => {
    const cards = [makeCard({})]; // no collection
    const stats = getDeckStats(cards);
    expect(stats.collectionDistribution['vibe']).toBe(1);
  });
});
