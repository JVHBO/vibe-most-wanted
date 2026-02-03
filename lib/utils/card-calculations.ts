import { getCardDisplayPower } from '@/lib/power-utils';
import type { NFT } from '@/hooks/useCardCalculations';

/**
 * Pure functions for card calculations.
 * Extracted from useCardCalculations hooks for testability.
 */

/** Calculate total power of cards with collection buffs */
export function calcTotalPower(cards: NFT[]): number {
  return cards.reduce((sum, card) => {
    const basePower = card.power || 0;
    const collection = (card as any).collection;
    if (collection === 'vibefid') return sum + basePower * 5;
    if (collection === 'vibe') return sum + basePower * 2;
    if (collection === 'nothing') return sum + Math.floor(basePower * 0.5);
    return sum + basePower;
  }, 0);
}

/** Sort NFTs by display power (descending) */
export function sortByPower(nfts: NFT[]): NFT[] {
  return [...nfts].sort((a, b) => getCardDisplayPower(b) - getCardDisplayPower(a));
}

/** Filter NFTs by power range */
export function filterByPower(nfts: NFT[], minPower: number, maxPower?: number): NFT[] {
  return nfts.filter((nft) => {
    const power = nft.power || 0;
    if (maxPower !== undefined) {
      return power >= minPower && power <= maxPower;
    }
    return power === minPower;
  });
}

/** Filter NFTs by exact power value */
export function filterByExactPower(nfts: NFT[], power: number): NFT[] {
  return nfts.filter((nft) => (nft.power || 0) === power);
}

/** Filter legendary cards */
export function filterLegendaries(nfts: NFT[]): NFT[] {
  return nfts.filter((nft) => {
    const rarity = (nft.rarity || '').toLowerCase();
    return rarity.includes('legend');
  });
}

/** Get strongest N cards by display power */
export function strongestCards(nfts: NFT[], count: number): NFT[] {
  const sorted = [...nfts].sort((a, b) => getCardDisplayPower(b) - getCardDisplayPower(a));
  return sorted.slice(0, count);
}

/** Calculate card statistics */
export function calcCardStats(cards: NFT[]): {
  totalPower: number;
  avgPower: number;
  maxPower: number;
  minPower: number;
  count: number;
} {
  if (cards.length === 0) {
    return { totalPower: 0, avgPower: 0, maxPower: 0, minPower: 0, count: 0 };
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
}

/** Shuffle cards randomly */
export function shuffleCards(nfts: NFT[]): NFT[] {
  return [...nfts].sort(() => Math.random() - 0.5);
}

/** Filter cards by multiple power values */
export function filterByPowerValues(nfts: NFT[], powers: number[]): NFT[] {
  return nfts.filter((nft) => {
    const power = nft.power || 0;
    return powers.includes(power);
  });
}

/** Group cards by rarity */
export function groupByRarity(nfts: NFT[]): Record<string, NFT[]> {
  const groups: Record<string, NFT[]> = {};
  nfts.forEach((nft) => {
    const rarity = (nft.rarity || 'unknown').toLowerCase();
    if (!groups[rarity]) {
      groups[rarity] = [];
    }
    groups[rarity].push(nft);
  });
  return groups;
}

/** Calculate power distribution histogram */
export function powerDistribution(nfts: NFT[]): Record<number, number> {
  const distribution: Record<number, number> = {};
  nfts.forEach((nft) => {
    const power = nft.power || 0;
    distribution[power] = (distribution[power] || 0) + 1;
  });
  return distribution;
}

/** Calculate power totals by collection */
export function powerByCollection(nfts: NFT[]): {
  vibePower: number;
  vbrsPower: number;
  vibefidPower: number;
} {
  const powers = { vibePower: 0, vbrsPower: 0, vibefidPower: 0 };

  nfts.forEach((nft) => {
    const power = nft.power || 0;
    const collectionId = nft.collectionId?.toLowerCase() || 'vibe';

    if (collectionId === 'vibe' || collectionId === 'custom') {
      powers.vibePower += power;
    } else if (collectionId === 'gmvbrs') {
      powers.vbrsPower += power;
    } else if (collectionId === 'vibefid') {
      powers.vibefidPower += power;
    } else {
      powers.vibePower += power;
    }
  });

  return powers;
}
