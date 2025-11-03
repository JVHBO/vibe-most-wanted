import { useMemo } from 'react';
import type { NFT } from './useCardCalculations';

/**
 * 🎴 NFT OPERATIONS (Optimized)
 *
 * Memoized hooks for common NFT operations like filtering,
 * counting, and categorizing cards.
 */

/**
 * Check if NFT is unrevealed (memoized utility)
 */
export function isUnrevealed(nft: NFT): boolean {
  const status = (nft.status || '').toLowerCase();
  return status === 'unopened' || status === 'unrevealed' || status.includes('pack');
}

/**
 * Separate revealed and unrevealed cards (memoized)
 *
 * @example
 * const { revealed, unrevealed } = useSeparatedCards(nfts);
 */
export function useSeparatedCards(nfts: NFT[]): {
  revealed: NFT[];
  unrevealed: NFT[];
  revealedCount: number;
  unrevealedCount: number;
} {
  return useMemo(() => {
    const revealed = nfts.filter((nft) => !isUnrevealed(nft));
    const unrevealed = nfts.filter((nft) => isUnrevealed(nft));

    return {
      revealed,
      unrevealed,
      revealedCount: revealed.length,
      unrevealedCount: unrevealed.length,
    };
  }, [nfts]);
}

/**
 * Count cards by status (memoized)
 *
 * @example
 * const counts = useCardCounts(nfts);
 * // { total: 50, opened: 30, unopened: 20 }
 */
export function useCardCounts(nfts: NFT[]): {
  total: number;
  opened: number;
  unopened: number;
} {
  return useMemo(() => {
    const opened = nfts.filter((nft) => !isUnrevealed(nft)).length;
    const unopened = nfts.filter((nft) => isUnrevealed(nft)).length;

    return {
      total: nfts.length,
      opened,
      unopened,
    };
  }, [nfts]);
}

/**
 * Get token IDs array (memoized)
 *
 * @example
 * const tokenIds = useTokenIds(nfts);
 */
export function useTokenIds(nfts: NFT[]): string[] {
  return useMemo(() => {
    return nfts.map((nft) => nft.tokenId).filter(Boolean);
  }, [nfts]);
}

/**
 * Group NFTs by any property (memoized)
 *
 * @example
 * const byRarity = useGroupBy(nfts, 'rarity');
 * const byStatus = useGroupBy(nfts, 'status');
 */
export function useGroupBy(
  nfts: NFT[],
  property: keyof NFT
): Record<string, NFT[]> {
  return useMemo(() => {
    const groups: Record<string, NFT[]> = {};

    nfts.forEach((nft) => {
      const value = String(nft[property] || 'unknown').toLowerCase();
      if (!groups[value]) {
        groups[value] = [];
      }
      groups[value].push(nft);
    });

    return groups;
  }, [nfts, property]);
}

/**
 * Search NFTs by text query (memoized)
 *
 * @example
 * const results = useSearchNFTs(nfts, 'legendary', ['rarity', 'name']);
 */
export function useSearchNFTs(
  nfts: NFT[],
  query: string,
  searchFields: string[] = ['name', 'rarity', 'status']
): NFT[] {
  return useMemo(() => {
    if (!query || query.trim() === '') return nfts;

    const lowerQuery = query.toLowerCase();

    return nfts.filter((nft) => {
      return searchFields.some((field) => {
        const value = String(nft[field] || '').toLowerCase();
        return value.includes(lowerQuery);
      });
    });
  }, [nfts, query, searchFields]);
}

/**
 * Filter NFTs by multiple criteria (memoized)
 *
 * @example
 * const filtered = useFilterNFTs(nfts, {
 *   minPower: 50,
 *   maxPower: 150,
 *   rarity: 'legendary',
 *   status: 'opened'
 * });
 */
export function useFilterNFTs(
  nfts: NFT[],
  filters: {
    minPower?: number;
    maxPower?: number;
    rarity?: string;
    status?: string;
    revealed?: boolean;
  }
): NFT[] {
  return useMemo(() => {
    return nfts.filter((nft) => {
      // Power range filter
      if (filters.minPower !== undefined) {
        if ((nft.power || 0) < filters.minPower) return false;
      }
      if (filters.maxPower !== undefined) {
        if ((nft.power || 0) > filters.maxPower) return false;
      }

      // Rarity filter
      if (filters.rarity !== undefined) {
        const rarity = (nft.rarity || '').toLowerCase();
        if (rarity !== filters.rarity.toLowerCase()) return false;
      }

      // Status filter
      if (filters.status !== undefined) {
        const status = (nft.status || '').toLowerCase();
        if (status !== filters.status.toLowerCase()) return false;
      }

      // Revealed filter
      if (filters.revealed !== undefined) {
        const revealed = !isUnrevealed(nft);
        if (revealed !== filters.revealed) return false;
      }

      return true;
    });
  }, [nfts, filters]);
}

/**
 * Paginate NFTs (memoized)
 *
 * @example
 * const page = usePaginatedNFTs(nfts, 1, 20);
 * // { items: [...], page: 1, pageSize: 20, totalPages: 5 }
 */
export function usePaginatedNFTs(
  nfts: NFT[],
  page: number,
  pageSize: number
): {
  items: NFT[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
} {
  return useMemo(() => {
    const totalPages = Math.ceil(nfts.length / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const items = nfts.slice(startIndex, endIndex);

    return {
      items,
      page,
      pageSize,
      totalPages,
      totalItems: nfts.length,
    };
  }, [nfts, page, pageSize]);
}

/**
 * Get unique values for a property (memoized)
 *
 * @example
 * const rarities = useUniqueValues(nfts, 'rarity');
 * // ['common', 'rare', 'legendary']
 */
export function useUniqueValues(nfts: NFT[], property: keyof NFT): string[] {
  return useMemo(() => {
    const values = new Set<string>();
    nfts.forEach((nft) => {
      const value = String(nft[property] || '').toLowerCase();
      if (value) values.add(value);
    });
    return Array.from(values).sort();
  }, [nfts, property]);
}

/**
 * Calculate collection statistics (memoized)
 *
 * @example
 * const stats = useCollectionStats(nfts);
 */
export function useCollectionStats(nfts: NFT[]): {
  total: number;
  revealed: number;
  unrevealed: number;
  totalPower: number;
  avgPower: number;
  rarities: Record<string, number>;
  powerRange: { min: number; max: number };
} {
  return useMemo(() => {
    const revealed = nfts.filter((nft) => !isUnrevealed(nft));
    const unrevealed = nfts.filter((nft) => isUnrevealed(nft));

    const powers = revealed.map((nft) => nft.power || 0);
    const totalPower = powers.reduce((sum, p) => sum + p, 0);
    const avgPower = revealed.length > 0 ? totalPower / revealed.length : 0;

    const rarities: Record<string, number> = {};
    revealed.forEach((nft) => {
      const rarity = (nft.rarity || 'unknown').toLowerCase();
      rarities[rarity] = (rarities[rarity] || 0) + 1;
    });

    const minPower = powers.length > 0 ? Math.min(...powers) : 0;
    const maxPower = powers.length > 0 ? Math.max(...powers) : 0;

    return {
      total: nfts.length,
      revealed: revealed.length,
      unrevealed: unrevealed.length,
      totalPower,
      avgPower: Math.round(avgPower),
      rarities,
      powerRange: { min: minPower, max: maxPower },
    };
  }, [nfts]);
}

/**
 * Sort NFTs with custom comparator (memoized)
 *
 * @example
 * const sorted = useSortedNFTs(nfts, 'power', 'desc');
 * const sortedByRarity = useSortedNFTs(nfts, 'rarity', 'asc');
 */
export function useSortedNFTs(
  nfts: NFT[],
  sortBy: keyof NFT,
  order: 'asc' | 'desc' = 'desc'
): NFT[] {
  return useMemo(() => {
    return [...nfts].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'desc' ? bValue - aValue : aValue - bValue;
      }

      // Handle strings
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      const comparison = aStr.localeCompare(bStr);
      return order === 'desc' ? -comparison : comparison;
    });
  }, [nfts, sortBy, order]);
}

/**
 * Find NFT by token ID (memoized)
 *
 * @example
 * const nft = useFindNFT(nfts, '1234');
 */
export function useFindNFT(nfts: NFT[], tokenId: string): NFT | undefined {
  return useMemo(() => {
    return nfts.find((nft) => nft.tokenId === tokenId);
  }, [nfts, tokenId]);
}

/**
 * Find multiple NFTs by token IDs (memoized)
 *
 * @example
 * const selectedNFTs = useFindMultipleNFTs(nfts, ['123', '456', '789']);
 */
export function useFindMultipleNFTs(nfts: NFT[], tokenIds: string[]): NFT[] {
  return useMemo(() => {
    const tokenIdSet = new Set(tokenIds);
    return nfts.filter((nft) => tokenIdSet.has(nft.tokenId));
  }, [nfts, tokenIds]);
}
