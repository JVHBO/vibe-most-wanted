/**
 * Raid Boss Cards Database
 *
 * This file contains the hardcoded boss cards for each collection.
 * Each collection has 5 bosses (one per rarity: Common, Rare, Epic, Legendary, Mythic)
 *
 * Instructions to add a boss card:
 * 1. Add the image to /public/images/raid-bosses/{collection}/{rarity}.png
 * 2. Update the card entry below with the correct tokenId, name, and imageUrl
 */

import type { Card, CardRarity } from '@/lib/types/card';
import type { CollectionId } from '@/lib/collections';
import { getAssetUrl } from '@/lib/ipfs-assets';

export interface BossCard extends Card {
  hp: number; // Boss HP based on rarity
  description?: string; // Flavor text for the boss
}

// HP Scaling by Rarity - REDUCED Jan 14 2026 (was 10x too high)
export const BOSS_HP_BY_RARITY: Record<Lowercase<CardRarity>, number> = {
  common: 100_000,          // 100k HP
  rare: 500_000,            // 500k HP
  epic: 2_500_000,          // 2.5M HP
  legendary: 5_000_000,     // 5M HP
  mythic: 10_000_000,       // 10M HP
};

// Reward Pool by Rarity - REDUCED Jan 14 2026
export const BOSS_REWARDS_BY_RARITY: Record<Lowercase<CardRarity>, number> = {
  common: 1_000,           // 1k coins
  rare: 5_000,             // 5k coins
  epic: 25_000,            // 25k coins
  legendary: 100_000,      // 100k coins
  mythic: 500_000,         // 500k coins
};

// Boss Rotation Order (10 bosses total)
// Only VMW collections: vibe (VBMS) and vibefid (VibeFID)
// 2 collections × 5 rarities = 10 bosses
// Pattern: vibe all rarities first, then vibefid all rarities, repeat
export const BOSS_ROTATION_ORDER: CollectionId[] = [
  // vibe collection (5 rarities)
  'vibe', 'vibe', 'vibe', 'vibe', 'vibe',
  // vibefid collection (5 rarities)
  'vibefid', 'vibefid', 'vibefid', 'vibefid', 'vibefid',
  // Cycle repeats every 10 bosses
];

export const BOSS_RARITY_ORDER: CardRarity[] = [
  // 10-boss cycle
  // vibe (Common → Mythic)
  'Common', 'Rare', 'Epic', 'Legendary', 'Mythic',
  // vibefid (Common → Mythic)
  'Common', 'Rare', 'Epic', 'Legendary', 'Mythic',
];

/**
 * VBMS ($VBMS) Boss Cards
 * These will be fetched from JC's NFTs dynamically
 */
export const VBMS_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: 'vibe-boss-common',
    collection: 'vibe',
    name: 'Petty Thief',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/vibe/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'Small-time criminal with big ambitions',
  },
  Rare: {
    tokenId: 'vibe-boss-rare',
    collection: 'vibe',
    name: 'Armed Robber',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/vibe/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'Dangerous outlaw wanted for multiple heists',
  },
  Epic: {
    tokenId: 'vibe-boss-epic',
    collection: 'vibe',
    name: 'Cartel Lieutenant',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/vibe/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'High-ranking member of a powerful cartel',
  },
  Legendary: {
    tokenId: 'vibe-boss-legendary',
    collection: 'vibe',
    name: 'El Diablo',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/vibe/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'Feared crime lord with a ruthless reputation',
  },
  Mythic: {
    tokenId: 'vibe-boss-mythic',
    collection: 'vibe',
    name: 'The Phantom',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/vibe/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'The most wanted criminal - identity unknown',
  },
};

/**
 * VibeFID Boss Cards
 * TODO: Add actual card images and tokenIds
 */
export const VIBEFID_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: 'vibefid-boss-common',
    collection: 'vibefid',
    name: 'Digital Wanderer',
    rarity: 'Common',
    power: 10,
    imageUrl: '/images/raid-bosses/vibefid/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'A common FID holder exploring the metaverse',
  },
  Rare: {
    tokenId: 'vibefid-boss-rare',
    collection: 'vibefid',
    name: 'Cyber Sentinel',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/vibefid/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'Guardian of the digital realm',
  },
  Epic: {
    tokenId: 'vibefid-boss-epic',
    collection: 'vibefid',
    name: 'Protocol Enforcer',
    rarity: 'Epic',
    power: 50,
    imageUrl: '/images/raid-bosses/vibefid/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'Elite defender of the blockchain',
  },
  Legendary: {
    tokenId: 'vibefid-boss-legendary',
    collection: 'vibefid',
    name: 'The Architect',
    rarity: 'Legendary',
    power: 100,
    imageUrl: '/images/raid-bosses/vibefid/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'Master builder of the decentralized future',
  },
  Mythic: {
    tokenId: 'vibefid-boss-mythic',
    collection: 'vibefid',
    name: 'Satoshi Reborn',
    rarity: 'Mythic',
    power: 600,
    imageUrl: '/images/raid-bosses/vibefid/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'The legendary creator returns from the shadows',
  },
};

/**
 * VIBE MOST WANTED RAID BOSSES ONLY
 *
 * Simplified to only include:
 * - vibe (VBMS) collection
 * - vibefid (VibeFID) collection
 *
 * All other external collections removed for VMW ecosystem purity.
 */

export const ALL_BOSS_CARDS: Record<CollectionId, Record<CardRarity, BossCard>> = {
  vibe: VBMS_BOSSES,
  vibefid: VIBEFID_BOSSES,
  nothing: {} as Record<CardRarity, BossCard>,
  custom: {} as Record<CardRarity, BossCard>,
};

/**
 * Get boss card by collection and rarity
 */
export function getBossCard(collection: CollectionId, rarity: CardRarity): BossCard | undefined {
  const boss = ALL_BOSS_CARDS[collection]?.[rarity];
  if (!boss) return undefined;
  // Convert imageUrl to IPFS URL in production
  return {
    ...boss,
    imageUrl: getAssetUrl(boss.imageUrl),
  };
}

/**
 * Get current boss based on rotation index
 * 10-boss cycle: vibe (5 rarities) + vibefid (5 rarities) = 10 bosses
 * @param bossIndex - Current boss index (0-9, loops every 10)
 */
export function getCurrentBoss(bossIndex: number): BossCard | undefined {
  const normalizedIndex = bossIndex % 10; // Loop through 10 bosses (vibe ×5 + vibefid ×5)
  const collection = BOSS_ROTATION_ORDER[normalizedIndex];
  const rarity = BOSS_RARITY_ORDER[normalizedIndex];
  return getBossCard(collection, rarity);
}

/**
 * Get next boss based on current index
 */
export function getNextBoss(currentBossIndex: number): BossCard | undefined {
  return getCurrentBoss(currentBossIndex + 1);
}

/**
 * Get previous boss based on current index
 */
export function getPreviousBoss(currentBossIndex: number): BossCard | undefined {
  return getCurrentBoss(currentBossIndex - 1);
}

/**
 * Get boss rotation info
 */
export function getBossRotationInfo(bossIndex: number) {
  const normalizedIndex = bossIndex % 10; // 10-boss cycle
  return {
    index: normalizedIndex,
    collection: BOSS_ROTATION_ORDER[normalizedIndex],
    rarity: BOSS_RARITY_ORDER[normalizedIndex],
    boss: getCurrentBoss(bossIndex),
  };
}
