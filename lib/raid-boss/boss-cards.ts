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

// Reward Pool by Rarity (scales with difficulty/HP) - 10x multiplier
export const BOSS_REWARDS_BY_RARITY: Record<Lowercase<CardRarity>, number> = {
  common: 10_000,        // 10,000 $TESTVBMS
  rare: 50_000,          // 50,000 $TESTVBMS (5x harder)
  epic: 250_000,         // 250,000 $TESTVBMS (25x harder)
  legendary: 1_000_000,  // 1,000,000 $TESTVBMS (100x harder)
  mythic: 5_000_000,     // 5,000,000 $TESTVBMS (500x harder)
};

// Boss Rotation Order (75 bosses total)
// 15 collections cycling through 5 rarities = 75 bosses
// Pattern: Each round has all 15 collections, rarities rotate
export const BOSS_ROTATION_ORDER: CollectionId[] = [
  // Round 1 (indices 0-14): C, R, E, L, M, C, R, E, L, M, C, R, E, L, M
  'gmvbrs',           // 0. Common
  'vibe',             // 1. Rare
  'vibefid',          // 2. Epic
  'americanfootball', // 3. Legendary
  'viberuto',         // 4. Common
  'meowverse',        // 6. Rare
  'poorlydrawnpepes', // 7. Epic
  'teampothead',      // 8. Legendary
  'tarot',            // 9. Mythic
  'baseballcabal',    // 10. Common
  'vibefx',           // 11. Rare
  'historyofcomputer',// 12. Epic
  'cumioh',           // 13. Legendary
  'viberotbangers',   // 14. Mythic
  // Round 2 (indices 15-29): M, C, R, E, L, M, C, R, E, L, M, C, R, E, L
  'gmvbrs',           // 15. Mythic
  'vibe',             // 16. Common
  'vibefid',          // 17. Rare
  'americanfootball', // 18. Epic
  'viberuto',         // 19. Mythic
  'meowverse',        // 21. Common
  'poorlydrawnpepes', // 22. Rare
  'teampothead',      // 23. Epic
  'tarot',            // 24. Legendary
  'baseballcabal',    // 25. Mythic
  'vibefx',           // 26. Common
  'historyofcomputer',// 27. Rare
  'cumioh',           // 28. Epic
  'viberotbangers',   // 29. Legendary
  // Round 3 (indices 30-44): L, M, C, R, E, L, M, C, R, E, L, M, C, R, E
  'gmvbrs',           // 30. Legendary
  'vibe',             // 31. Mythic
  'vibefid',          // 32. Common
  'americanfootball', // 33. Rare
  'viberuto',         // 34. Legendary
  'meowverse',        // 36. Mythic
  'poorlydrawnpepes', // 37. Common
  'teampothead',      // 38. Rare
  'tarot',            // 39. Epic
  'baseballcabal',    // 40. Legendary
  'vibefx',           // 41. Mythic
  'historyofcomputer',// 42. Common
  'cumioh',           // 43. Rare
  'viberotbangers',   // 44. Epic
  // Round 4 (indices 45-59): E, L, M, C, R, E, L, M, C, R, E, L, M, C, R
  'gmvbrs',           // 45. Epic
  'vibe',             // 46. Legendary
  'vibefid',          // 47. Mythic
  'americanfootball', // 48. Common
  'viberuto',         // 49. Epic
  'meowverse',        // 51. Legendary
  'poorlydrawnpepes', // 52. Mythic
  'teampothead',      // 53. Common
  'tarot',            // 54. Rare
  'baseballcabal',    // 55. Epic
  'vibefx',           // 56. Legendary
  'historyofcomputer',// 57. Mythic
  'cumioh',           // 58. Common
  'viberotbangers',   // 59. Rare
  // Round 5 (indices 60-74): R, E, L, M, C, R, E, L, M, C, R, E, L, M, C
  'gmvbrs',           // 60. Rare
  'vibe',             // 61. Epic
  'vibefid',          // 62. Legendary
  'americanfootball', // 63. Mythic
  'viberuto',         // 64. Rare
  'meowverse',        // 66. Epic
  'poorlydrawnpepes', // 67. Legendary
  'teampothead',      // 68. Mythic
  'tarot',            // 69. Common
  'baseballcabal',    // 70. Rare
  'vibefx',           // 71. Epic
  'historyofcomputer',// 72. Legendary
  'cumioh',           // 73. Mythic
  'viberotbangers',   // 74. Common
];

export const BOSS_RARITY_ORDER: CardRarity[] = [
  // Round 1 (indices 0-14)
  'Common',    // 0. gmvbrs
  'Rare',      // 1. vibe
  'Epic',      // 2. vibefid
  'Legendary', // 3. americanfootball
  'Common',    // 4. viberuto
  'Rare',      // 6. meowverse
  'Epic',      // 7. poorlydrawnpepes
  'Legendary', // 8. teampothead
  'Mythic',    // 9. tarot
  'Common',    // 10. baseballcabal
  'Rare',      // 11. vibefx
  'Epic',      // 12. historyofcomputer
  'Legendary', // 13. cumioh
  'Mythic',    // 14. viberotbangers
  // Round 2 (indices 15-29)
  'Mythic',    // 15. gmvbrs
  'Common',    // 16. vibe
  'Rare',      // 17. vibefid
  'Epic',      // 18. americanfootball
  'Mythic',    // 19. viberuto
  'Common',    // 21. meowverse
  'Rare',      // 22. poorlydrawnpepes
  'Epic',      // 23. teampothead
  'Legendary', // 24. tarot
  'Mythic',    // 25. baseballcabal
  'Common',    // 26. vibefx
  'Rare',      // 27. historyofcomputer
  'Epic',      // 28. cumioh
  'Legendary', // 29. viberotbangers
  // Round 3 (indices 30-44)
  'Legendary', // 30. gmvbrs
  'Mythic',    // 31. vibe
  'Common',    // 32. vibefid
  'Rare',      // 33. americanfootball
  'Legendary', // 34. viberuto
  'Mythic',    // 36. meowverse
  'Common',    // 37. poorlydrawnpepes
  'Rare',      // 38. teampothead
  'Epic',      // 39. tarot
  'Legendary', // 40. baseballcabal
  'Mythic',    // 41. vibefx
  'Common',    // 42. historyofcomputer
  'Rare',      // 43. cumioh
  'Epic',      // 44. viberotbangers
  // Round 4 (indices 45-59)
  'Epic',      // 45. gmvbrs
  'Legendary', // 46. vibe
  'Mythic',    // 47. vibefid
  'Common',    // 48. americanfootball
  'Epic',      // 49. viberuto
  'Legendary', // 51. meowverse
  'Mythic',    // 52. poorlydrawnpepes
  'Common',    // 53. teampothead
  'Rare',      // 54. tarot
  'Epic',      // 55. baseballcabal
  'Legendary', // 56. vibefx
  'Mythic',    // 57. historyofcomputer
  'Common',    // 58. cumioh
  'Rare',      // 59. viberotbangers
  // Round 5 (indices 60-74)
  'Rare',      // 60. gmvbrs
  'Epic',      // 61. vibe
  'Legendary', // 62. vibefid
  'Mythic',    // 63. americanfootball
  'Rare',      // 64. viberuto
  'Epic',      // 66. meowverse
  'Legendary', // 67. poorlydrawnpepes
  'Mythic',    // 68. teampothead
  'Common',    // 69. tarot
  'Rare',      // 70. baseballcabal
  'Epic',      // 71. vibefx
  'Legendary', // 72. historyofcomputer
  'Mythic',    // 73. cumioh
  'Common',    // 74. viberotbangers
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
 * Viberuto Boss Cards
 */
export const VIBERUTO_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: 'viberuto-boss-common',
    collection: 'viberuto',
    name: 'Vibeten',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/viberuto/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'The ninja who defeated Uchiha Madara',
  },
  Rare: {
    tokenId: 'viberuto-boss-rare',
    collection: 'viberuto',
    name: 'Vibe-bee',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/viberuto/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'Super rapper and jinchuuriki',
  },
  Epic: {
    tokenId: 'viberuto-boss-epic',
    collection: 'viberuto',
    name: 'Vibenato',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/viberuto/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'Teleports, still late',
  },
  Legendary: {
    tokenId: 'viberuto-boss-legendary',
    collection: 'viberuto',
    name: 'Viberama',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/viberuto/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'Broke every rival, including his wallet',
  },
  Mythic: {
    tokenId: 'viberuto-boss-mythic',
    collection: 'viberuto',
    name: 'Vibomoro',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/viberuto/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'Inherited chakra, distributed it like free samples',
  },
};


/**
 * Meowverse Boss Cards
 */
export const MEOWVERSE_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: '2429',
    collection: 'meowverse',
    name: 'Heavenly Chonk',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/meowverse/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'A gentle sky guardian powered by serenity… and snacks',
  },
  Rare: {
    tokenId: '2430',
    collection: 'meowverse',
    name: 'Noodle Nimbus',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/meowverse/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'Rides a legendary cloud, powering up between noodle bites',
  },
  Epic: {
    tokenId: '2431',
    collection: 'meowverse',
    name: 'Blade Paws',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/meowverse/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'A brave cat warrior on a quest, swinging a legendary sword of light',
  },
  Legendary: {
    tokenId: '2432',
    collection: 'meowverse',
    name: 'Goldra, the Nine Claws',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/meowverse/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'A golden beast with living serpents for fur and a petrifying glare',
  },
  Mythic: {
    tokenId: '2433',
    collection: 'meowverse',
    name: 'King Clawster',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/meowverse/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'A streetwise feline king who rules with sharp claws and sharper instincts',
  },
};


/**
 * Poorly Drawn Pepes Boss Cards
 */
export const POORLYDRAWNPEPES_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: '7464',
    collection: 'poorlydrawnpepes',
    name: 'Pepe Fish',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/poorlydrawnpepes/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'Swims in circles, finds nothing, vibes anyway',
  },
  Rare: {
    tokenId: '7465',
    collection: 'poorlydrawnpepes',
    name: 'Pepe Dev',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/poorlydrawnpepes/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'Lives on caffeine, commits bugs with confidence',
  },
  Epic: {
    tokenId: '7466',
    collection: 'poorlydrawnpepes',
    name: 'Angel Investor Pepe',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/poorlydrawnpepes/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'Turns your chaos into capital. Maybe',
  },
  Legendary: {
    tokenId: '7467',
    collection: 'poorlydrawnpepes',
    name: 'Vibecat Pepe',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/poorlydrawnpepes/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'Breaks every rule and still demands treats',
  },
  Mythic: {
    tokenId: '7468',
    collection: 'poorlydrawnpepes',
    name: 'Wizard Pepe',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/poorlydrawnpepes/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'Casts spells nobody asked for, results unpredictable',
  },
};


/**
 * Team Pothead Boss Cards
 */
export const TEAMPOTHEAD_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: '6456',
    collection: 'teampothead',
    name: 'Smoke Naga',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/teampothead/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'A swirling cloud-serpent that forgets what it’s doing mid-attack',
  },
  Rare: {
    tokenId: '6457',
    collection: 'teampothead',
    name: 'Bulbablaze',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/teampothead/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'A leafy frog forever stuck in a confused, happy haze',
  },
  Epic: {
    tokenId: '6458',
    collection: 'teampothead',
    name: 'Vaporeonado',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/teampothead/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'A spacey sea-creature clutching a mystical bong like a comfort toy',
  },
  Legendary: {
    tokenId: '6459',
    collection: 'teampothead',
    name: 'Dr. Buddafé',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/teampothead/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'A smug green mastermind whose plans vanish as fast as his focus',
  },
  Mythic: {
    tokenId: '6460',
    collection: 'teampothead',
    name: 'Big Bluntkarp',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/teampothead/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'A giant golden fish drifting through smoke like it’s cosmic water',
  },
};




/**
 * Tarot Boss Cards
 */
export const TAROT_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: '2274',
    collection: 'tarot',
    name: 'Feet Juggler',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/tarot/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'A playful performer looping enchanted feet through the air with impossible precision',
  },
  Rare: {
    tokenId: '2275',
    collection: 'tarot',
    name: 'The Ink',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/tarot/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'A hooded figure holding a glowing tablet, blending art and mystery by the water’s edge',
  },
  Epic: {
    tokenId: '2276',
    collection: 'tarot',
    name: 'Computer Historian',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/tarot/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'A quirky scholar stacked with glowing screens, preserving the digital tales of every era',
  },
  Legendary: {
    tokenId: '2277',
    collection: 'tarot',
    name: 'New God',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/tarot/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'A serene blue entity sits between two ancient pillars, radiating quiet, mysterious power',
  },
  Mythic: {
    tokenId: '2278',
    collection: 'tarot',
    name: 'The Builders',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/tarot/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'Guided by a radiant winged figure, two creators stand ready to shape a new world',
  },
};


/**
 * Baseball Cabal Boss Cards
 */
export const BASEBALLCABAL_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: '7160',
    collection: 'baseballcabal',
    name: 'Phantom Pitcher',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/baseballcabal/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: "You'll never see the ball coming",
  },
  Rare: {
    tokenId: '7161',
    collection: 'baseballcabal',
    name: 'The Closer',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/baseballcabal/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'Last inning specialist. Zero mercy',
  },
  Epic: {
    tokenId: '7162',
    collection: 'baseballcabal',
    name: 'The Whale',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/baseballcabal/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'Bought every card. Now wants yours',
  },
  Legendary: {
    tokenId: '7163',
    collection: 'baseballcabal',
    name: 'Diamond Hands Dave',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/baseballcabal/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'Never drops the ball. Never sells',
  },
  Mythic: {
    tokenId: '7164',
    collection: 'baseballcabal',
    name: 'The Rug Puller',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/baseballcabal/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'Promises home runs, delivers strikeouts',
  },
};


/**
 * Vibe FX Boss Cards
 */
export const VIBEFX_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: '10384',
    collection: 'vibefx',
    name: 'Barrel Bob',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/vibefx/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'Found behind a gas station. Promoted to warrior',
  },
  Rare: {
    tokenId: '10385',
    collection: 'vibefx',
    name: 'The Grinder',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/vibefx/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'Drills first, thinks never',
  },
  Epic: {
    tokenId: '10386',
    collection: 'vibefx',
    name: 'Shills81',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/vibefx/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'Cute face, killer instincts. Do not let the cupcake head fool you',
  },
  Legendary: {
    tokenId: '10387',
    collection: 'vibefx',
    name: 'Redphone',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/vibefx/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'We all float down here... in the metaverse',
  },
  Mythic: {
    tokenId: '10388',
    collection: 'vibefx',
    name: 'The Goddess',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/vibefx/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'OG deity of the Vibe realm. Bow or be liquidated',
  },
};


/**
 * History of Computer Boss Cards
 */
export const HISTORYOFCOMPUTER_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: '6152',
    collection: 'historyofcomputer',
    name: 'Arcane Bug Summoner',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/historyofcomputer/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'Accidentally summoned a demon while debugging. Claims it’s a feature',
  },
  Rare: {
    tokenId: '6153',
    collection: 'historyofcomputer',
    name: 'Cable Wizard Duo',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/historyofcomputer/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'They do not know what any of the cables do, but somehow it works',
  },
  Epic: {
    tokenId: '6154',
    collection: 'historyofcomputer',
    name: 'Bologna Meat Computer',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/historyofcomputer/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'Runs on pure spite, cold cuts, and 3% electricity',
  },
  Legendary: {
    tokenId: '6155',
    collection: 'historyofcomputer',
    name: 'Lab Rats of the Mainframe',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/historyofcomputer/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'Optimizing the machine by pressing random buttons with extreme confidence',
  },
  Mythic: {
    tokenId: '6156',
    collection: 'historyofcomputer',
    name: 'Duck of Computing',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/historyofcomputer/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'Explaining the bug to the rubber duck… for the 7th hour',
  },
};


/**
 * $CU-MI-OH\! Boss Cards
 */
export const CUMIOH_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: 'cumioh-common',
    collection: 'cumioh',
    name: 'THE.HOES.MÜR',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/cumioh/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'Just a full time Lad on retake.tv/live/203751',
  },
  Rare: {
    tokenId: 'cumioh-rare',
    collection: 'cumioh',
    name: '$.C.U.M.ilady',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/cumioh/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'Divinely loved, technically genius and spiritually transcendent. This card deals damage by casting loving commentary\!',
  },
  Epic: {
    tokenId: 'cumioh-epic',
    collection: 'cumioh',
    name: 'DARK MAGICIAN MILADY',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/cumioh/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'This card gains 333 ATK for every $.C.U.M.ilady on the field when this card is casted',
  },
  Legendary: {
    tokenId: 'cumioh-legendary',
    collection: 'cumioh',
    name: 'ily 3-Thousand Dragon',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/cumioh/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'Lover of all the things, clicks every link and mints to HODL for a minimum of 1000 years in their treasure horde spread across hundreds of wallets',
  },
  Mythic: {
    tokenId: 'cumioh-mythic',
    collection: 'cumioh',
    name: 'BIZORDIA THE BIZARRE ONE',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/cumioh/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'If you have Right Leg of the Bizarre One, Left Leg of the Bizarre One, Right Arm of the Bizarre One and Left Arm of the Bizarre One in addition to this card on the field, you win the Duel',
  },
};

/**
 * Vibe Rot Bangers Boss Cards
 */
export const VIBEROTBANGERS_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: 'viberotbangers-common',
    collection: 'viberotbangers',
    name: 'The Slippage Saint',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/viberotbangers/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'Every trade against him costs more than expected',
  },
  Rare: {
    tokenId: 'viberotbangers-rare',
    collection: 'viberotbangers',
    name: 'Booty Liquidity Beast',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/viberotbangers/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'An unholy fusion of greed, memes, and bad decisions',
  },
  Epic: {
    tokenId: 'viberotbangers-epic',
    collection: 'viberotbangers',
    name: 'Leverage Temptress',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/viberotbangers/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'Lures traders in with beauty and liquidates them silently',
  },
  Legendary: {
    tokenId: 'viberotbangers-legendary',
    collection: 'viberotbangers',
    name: 'Bagholder King',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/viberotbangers/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'The bag that bites back when you try to exit',
  },
  Mythic: {
    tokenId: 'viberotbangers-mythic',
    collection: 'viberotbangers',
    name: 'Hydra of Degens',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/viberotbangers/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'Many minds, one wallet, infinite bad ideas',
  },
};

/**
 * All Boss Cards organized by collection
 */
export const ALL_BOSS_CARDS: Record<CollectionId, Record<CardRarity, BossCard>> = {
  viberotbangers: VIBEROTBANGERS_BOSSES,
  gmvbrs: GMVBRS_BOSSES,
  vibe: VBMS_BOSSES,
  vibefid: VIBEFID_BOSSES,
  americanfootball: AFCL_BOSSES,
  viberuto: VIBERUTO_BOSSES,

  meowverse: MEOWVERSE_BOSSES,


  poorlydrawnpepes: POORLYDRAWNPEPES_BOSSES,



  teampothead: TEAMPOTHEAD_BOSSES,  tarot: TAROT_BOSSES,
  baseballcabal: BASEBALLCABAL_BOSSES,

  vibefx: VIBEFX_BOSSES,


  historyofcomputer: HISTORYOFCOMPUTER_BOSSES,



  cumioh: CUMIOH_BOSSES,

  nothing: {} as Record<CardRarity, BossCard>, // Free cards - no raid bosses
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
 * @param bossIndex - Current boss index (0-24)
 */
export function getCurrentBoss(bossIndex: number): BossCard | undefined {
  const normalizedIndex = bossIndex % 75; // Loop through 30 bosses
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
  const normalizedIndex = bossIndex % 75;
  return {
    index: normalizedIndex,
    collection: BOSS_ROTATION_ORDER[normalizedIndex],
    rarity: BOSS_RARITY_ORDER[normalizedIndex],
    boss: getCurrentBoss(bossIndex),
  };
}
