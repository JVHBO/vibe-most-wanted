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

export interface BossCard extends Card {
  hp: number; // Boss HP based on rarity
  description?: string; // Flavor text for the boss
}

// HP Scaling by Rarity (10x original values for longer boss battles)
export const BOSS_HP_BY_RARITY: Record<Lowercase<CardRarity>, number> = {
  common: 10_000_000,       // 10M HP
  rare: 50_000_000,         // 50M HP
  epic: 250_000_000,        // 250M HP
  legendary: 1_000_000_000, // 1B HP
  mythic: 5_000_000_000,    // 5B HP
};

// Reward Pool by Rarity (scales with difficulty/HP)
export const BOSS_REWARDS_BY_RARITY: Record<Lowercase<CardRarity>, number> = {
  common: 1_000,       // 1,000 $TESTVBMS
  rare: 5_000,         // 5,000 $TESTVBMS (5x harder)
  epic: 25_000,        // 25,000 $TESTVBMS (25x harder)
  legendary: 100_000,  // 100,000 $TESTVBMS (100x harder)
  mythic: 500_000,     // 500,000 $TESTVBMS (500x harder)
};

// Boss Rotation Order (20 bosses total)
// Alternating collections with escalating rarities for variety
// Pattern: GM VBRS → VBMS → VIBEFID → AFCL (rotating rarities)
export const BOSS_ROTATION_ORDER: CollectionId[] = [
  'gmvbrs',           // 1. GM VBRS Common
  'vibe',             // 2. VBMS Rare
  'vibefid',          // 3. VIBEFID Epic
  'americanfootball', // 4. AFCL Legendary
  'gmvbrs',           // 5. GM VBRS Mythic
  'vibe',             // 6. VBMS Common
  'vibefid',          // 7. VIBEFID Rare
  'americanfootball', // 8. AFCL Epic
  'gmvbrs',           // 9. GM VBRS Legendary
  'vibe',             // 10. VBMS Mythic
  'vibefid',          // 11. VIBEFID Common
  'americanfootball', // 12. AFCL Rare
  'gmvbrs',           // 13. GM VBRS Epic
  'vibe',             // 14. VBMS Legendary
  'vibefid',          // 15. VIBEFID Mythic
  'americanfootball', // 16. AFCL Common
  'gmvbrs',           // 17. GM VBRS Rare
  'vibe',             // 18. VBMS Epic
  'vibefid',          // 19. VIBEFID Legendary
  'americanfootball', // 20. AFCL Mythic
];

export const BOSS_RARITY_ORDER: CardRarity[] = [
  'Common',    // 1. GM VBRS
  'Rare',      // 2. VBMS
  'Epic',      // 3. VIBEFID
  'Legendary', // 4. AFCL
  'Mythic',    // 5. GM VBRS
  'Common',    // 6. VBMS
  'Rare',      // 7. VIBEFID
  'Epic',      // 8. AFCL
  'Legendary', // 9. GM VBRS
  'Mythic',    // 10. VBMS
  'Common',    // 11. VIBEFID
  'Rare',      // 12. AFCL
  'Epic',      // 13. GM VBRS
  'Legendary', // 14. VBMS
  'Mythic',    // 15. VIBEFID
  'Common',    // 16. AFCL
  'Rare',      // 17. GM VBRS
  'Epic',      // 18. VBMS
  'Legendary', // 19. VIBEFID
  'Mythic',    // 20. AFCL
];

/**
 * GM VBRS Boss Cards
 * TODO: Add actual card images and tokenIds
 */
export const GMVBRS_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: 'gmvbrs-boss-common',
    collection: 'gmvbrs',
    name: 'Street Brawler',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/gmvbrs/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'A common street fighter looking for trouble',
  },
  Rare: {
    tokenId: 'gmvbrs-boss-rare',
    collection: 'gmvbrs',
    name: 'Vibe Enforcer',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/gmvbrs/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'Elite muscle from the Vibe crew',
  },
  Epic: {
    tokenId: 'gmvbrs-boss-epic',
    collection: 'gmvbrs',
    name: 'Underboss Reaper',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/gmvbrs/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'Second-in-command of the most dangerous gang',
  },
  Legendary: {
    tokenId: 'gmvbrs-boss-legendary',
    collection: 'gmvbrs',
    name: 'Don Crimson',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/gmvbrs/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'Legendary crime lord who runs the city',
  },
  Mythic: {
    tokenId: 'gmvbrs-boss-mythic',
    collection: 'gmvbrs',
    name: 'The Godfather',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/gmvbrs/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'The untouchable kingpin of all organized crime',
  },
};

/**
 * VBMS (Vibe Most Wanted) Boss Cards
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
 * American Football Boss Cards
 * TODO: Add actual card images and tokenIds
 */
export const AFCL_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: 'afcl-boss-common',
    collection: 'americanfootball',
    name: 'Rookie Crusher',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/afcl/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'Fresh talent eager to prove themselves',
  },
  Rare: {
    tokenId: 'afcl-boss-rare',
    collection: 'americanfootball',
    name: 'Pro Bowl Dominator',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/afcl/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'All-star athlete with incredible skills',
  },
  Epic: {
    tokenId: 'afcl-boss-epic',
    collection: 'americanfootball',
    name: 'Super Bowl Champion',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/afcl/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'Championship winner with rings to prove it',
  },
  Legendary: {
    tokenId: 'afcl-boss-legendary',
    collection: 'americanfootball',
    name: 'Hall of Fame Legend',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/afcl/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'Immortalized in football history forever',
  },
  Mythic: {
    tokenId: 'afcl-boss-mythic',
    collection: 'americanfootball',
    name: 'The G.O.A.T.',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/afcl/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'The Greatest Of All Time - unmatched perfection',
  },
};

/**
 * All Boss Cards organized by collection
 */
export const ALL_BOSS_CARDS: Record<CollectionId, Record<CardRarity, BossCard>> = {
  gmvbrs: GMVBRS_BOSSES,
  vibe: VBMS_BOSSES,
  vibefid: VIBEFID_BOSSES,
  americanfootball: AFCL_BOSSES,
  coquettish: {} as Record<CardRarity, BossCard>, // Not used for raid bosses yet
  custom: {} as Record<CardRarity, BossCard>, // Not used for raid bosses
};

/**
 * Get boss card by collection and rarity
 */
export function getBossCard(collection: CollectionId, rarity: CardRarity): BossCard | undefined {
  return ALL_BOSS_CARDS[collection]?.[rarity];
}

/**
 * Get current boss based on rotation index
 * @param bossIndex - Current boss index (0-19)
 */
export function getCurrentBoss(bossIndex: number): BossCard | undefined {
  const normalizedIndex = bossIndex % 20; // Loop through 20 bosses
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
  const normalizedIndex = bossIndex % 20;
  return {
    index: normalizedIndex,
    collection: BOSS_ROTATION_ORDER[normalizedIndex],
    rarity: BOSS_RARITY_ORDER[normalizedIndex],
    boss: getCurrentBoss(bossIndex),
  };
}
