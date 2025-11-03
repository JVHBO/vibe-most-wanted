import { useMemo } from 'react';

/**
 * 🚀 PERFORMANCE OPTIMIZED HOOKS
 *
 * Custom hooks for expensive card calculations.
 * Uses React.useMemo to prevent re-computing on every render.
 */

export interface NFT {
  tokenId: string;
  power?: number;
  rarity?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Calculate total power of a card array (memoized)
 *
 * @example
 * const power = useTotalPower(selectedCards);
 */
export function useTotalPower(cards: NFT[]): number {
  return useMemo(() => {
    return cards.reduce((sum, card) => sum + (card.power || 0), 0);
  }, [cards]);
}

/**
 * Sort NFTs by power (descending, memoized)
 *
 * @example
 * const sortedNFTs = useSortedByPower(nfts);
 */
export function useSortedByPower(nfts: NFT[]): NFT[] {
  return useMemo(() => {
    return [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
  }, [nfts]);
}

/**
 * Filter NFTs by power range (memoized)
 *
 * @example
 * const weakCards = useFilterByPower(nfts, 15, 30);
 */
export function useFilterByPower(
  nfts: NFT[],
  minPower: number,
  maxPower?: number
): NFT[] {
  return useMemo(() => {
    return nfts.filter((nft) => {
      const power = nft.power || 0;
      if (maxPower !== undefined) {
        return power >= minPower && power <= maxPower;
      }
      return power === minPower;
    });
  }, [nfts, minPower, maxPower]);
}

/**
 * Filter NFTs by exact power value (memoized)
 *
 * @example
 * const power15Cards = useFilterByExactPower(nfts, 15);
 */
export function useFilterByExactPower(nfts: NFT[], power: number): NFT[] {
  return useMemo(() => {
    return nfts.filter((nft) => (nft.power || 0) === power);
  }, [nfts, power]);
}

/**
 * Filter legendary cards (memoized)
 *
 * @example
 * const legendaries = useFilterLegendaries(nfts);
 */
export function useFilterLegendaries(nfts: NFT[]): NFT[] {
  return useMemo(() => {
    return nfts.filter((nft) => {
      const rarity = (nft.rarity || '').toLowerCase();
      return rarity.includes('legend');
    });
  }, [nfts]);
}

/**
 * Get strongest N cards (memoized)
 *
 * @example
 * const top5 = useStrongestCards(nfts, 5);
 */
export function useStrongestCards(nfts: NFT[], count: number): NFT[] {
  return useMemo(() => {
    const sorted = [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
    return sorted.slice(0, count);
  }, [nfts, count]);
}

/**
 * Calculate card statistics (memoized)
 * Returns: { totalPower, avgPower, maxPower, minPower, count }
 *
 * @example
 * const stats = useCardStats(selectedCards);
 */
export function useCardStats(cards: NFT[]): {
  totalPower: number;
  avgPower: number;
  maxPower: number;
  minPower: number;
  count: number;
} {
  return useMemo(() => {
    if (cards.length === 0) {
      return {
        totalPower: 0,
        avgPower: 0,
        maxPower: 0,
        minPower: 0,
        count: 0,
      };
    }

    const powers = cards.map((c) => c.power || 0);
    const totalPower = powers.reduce((sum, p) => sum + p, 0);
    const avgPower = totalPower / cards.length;
    const maxPower = Math.max(...powers);
    const minPower = Math.min(...powers);

    return {
      totalPower,
      avgPower: Math.round(avgPower),
      maxPower,
      minPower,
      count: cards.length,
    };
  }, [cards]);
}

/**
 * Shuffle array (memoized with dependency)
 * Note: Add a dependency key to force re-shuffle
 *
 * @example
 * const shuffled = useShuffledCards(nfts, Date.now());
 */
export function useShuffledCards(nfts: NFT[], shuffleKey?: number): NFT[] {
  return useMemo(() => {
    return [...nfts].sort(() => Math.random() - 0.5);
  }, [nfts, shuffleKey]);
}

/**
 * Filter cards by multiple power values (memoized)
 *
 * @example
 * const goofyCards = useFilterByPowerValues(nfts, [18, 21]);
 */
export function useFilterByPowerValues(nfts: NFT[], powers: number[]): NFT[] {
  return useMemo(() => {
    return nfts.filter((nft) => {
      const power = nft.power || 0;
      return powers.includes(power);
    });
  }, [nfts, powers]);
}

/**
 * Group cards by rarity (memoized)
 *
 * @example
 * const grouped = useGroupedByRarity(nfts);
 * // { common: [...], rare: [...], legendary: [...] }
 */
export function useGroupedByRarity(nfts: NFT[]): Record<string, NFT[]> {
  return useMemo(() => {
    const groups: Record<string, NFT[]> = {};

    nfts.forEach((nft) => {
      const rarity = (nft.rarity || 'unknown').toLowerCase();
      if (!groups[rarity]) {
        groups[rarity] = [];
      }
      groups[rarity].push(nft);
    });

    return groups;
  }, [nfts]);
}

/**
 * Calculate power distribution (memoized)
 * Returns histogram of power values
 *
 * @example
 * const distribution = usePowerDistribution(nfts);
 * // { 15: 5, 18: 10, 21: 8, ... }
 */
export function usePowerDistribution(nfts: NFT[]): Record<number, number> {
  return useMemo(() => {
    const distribution: Record<number, number> = {};

    nfts.forEach((nft) => {
      const power = nft.power || 0;
      distribution[power] = (distribution[power] || 0) + 1;
    });

    return distribution;
  }, [nfts]);
}
