import { useMemo } from 'react';
import {
  calcTotalPower,
  sortByPower,
  filterByPower as filterByPowerPure,
  filterByExactPower as filterByExactPowerPure,
  filterLegendaries as filterLegendariesPure,
  strongestCards as strongestCardsPure,
  calcCardStats,
  shuffleCards,
  filterByPowerValues as filterByPowerValuesPure,
  groupByRarity as groupByRarityPure,
  powerDistribution as powerDistributionPure,
  powerByCollection as powerByCollectionPure,
} from '@/lib/utils/card-calculations';

/**
 * 🚀 PERFORMANCE OPTIMIZED HOOKS
 *
 * Custom hooks for expensive card calculations.
 * Uses React.useMemo to prevent re-computing on every render.
 * All power calculations use collection multipliers (VibeFID 5x, VBMS 2x, Nothing 0.5x)
 */

export interface NFT {
  tokenId: string;
  power?: number;
  rarity?: string;
  status?: string;
  collection?: string;
  [key: string]: any;
}

/**
 * Calculate total power of a card array (memoized)
 *
 * @example
 * const power = useTotalPower(selectedCards);
 */
export function useTotalPower(cards: NFT[]): number {
  return useMemo(() => calcTotalPower(cards), [cards]);
}

/**
 * Sort NFTs by power (descending, memoized)
 * Uses collection multipliers (VibeFID 5x, VBMS 2x, Nothing 0.5x)
 *
 * @example
 * const sortedNFTs = useSortedByPower(nfts);
 */
export function useSortedByPower(nfts: NFT[]): NFT[] {
  return useMemo(() => sortByPower(nfts), [nfts]);
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
  return useMemo(() => filterByPowerPure(nfts, minPower, maxPower), [nfts, minPower, maxPower]);
}

/**
 * Filter NFTs by exact power value (memoized)
 *
 * @example
 * const power15Cards = useFilterByExactPower(nfts, 15);
 */
export function useFilterByExactPower(nfts: NFT[], power: number): NFT[] {
  return useMemo(() => filterByExactPowerPure(nfts, power), [nfts, power]);
}

/**
 * Filter legendary cards (memoized)
 *
 * @example
 * const legendaries = useFilterLegendaries(nfts);
 */
export function useFilterLegendaries(nfts: NFT[]): NFT[] {
  return useMemo(() => filterLegendariesPure(nfts), [nfts]);
}

/**
 * Get strongest N cards (memoized)
 * Uses collection multipliers (VibeFID 5x, VBMS 2x, Nothing 0.5x)
 *
 * @example
 * const top5 = useStrongestCards(nfts, 5);
 */
export function useStrongestCards(nfts: NFT[], count: number): NFT[] {
  return useMemo(() => strongestCardsPure(nfts, count), [nfts, count]);
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
  return useMemo(() => calcCardStats(cards), [cards]);
}

/**
 * Shuffle array (memoized with dependency)
 * Note: Add a dependency key to force re-shuffle
 *
 * @example
 * const shuffled = useShuffledCards(nfts, Date.now());
 */
export function useShuffledCards(nfts: NFT[], shuffleKey?: number): NFT[] {
  return useMemo(() => shuffleCards(nfts), [nfts, shuffleKey]);
}

/**
 * Filter cards by multiple power values (memoized)
 *
 * @example
 * const goofyCards = useFilterByPowerValues(nfts, [18, 21]);
 */
export function useFilterByPowerValues(nfts: NFT[], powers: number[]): NFT[] {
  return useMemo(() => filterByPowerValuesPure(nfts, powers), [nfts, powers]);
}

/**
 * Group cards by rarity (memoized)
 *
 * @example
 * const grouped = useGroupedByRarity(nfts);
 * // { common: [...], rare: [...], legendary: [...] }
 */
export function useGroupedByRarity(nfts: NFT[]): Record<string, NFT[]> {
  return useMemo(() => groupByRarityPure(nfts), [nfts]);
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
  return useMemo(() => powerDistributionPure(nfts), [nfts]);
}

/**
 * Calculate power by collection (memoized)
 * Returns object with power totals for each collection
 *
 * @example
 * const powers = usePowerByCollection(nfts);
 * // { vibePower: 500, vbrsPower: 300, vibefidPower: 200 }
 */
export function usePowerByCollection(nfts: NFT[]): {
  vibePower: number;
  vbrsPower: number;
  vibefidPower: number;
} {
  return useMemo(() => powerByCollectionPure(nfts), [nfts]);
}
