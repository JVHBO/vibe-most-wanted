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

// Boss Rotation Order (65 bosses total)
// Alternating collections with escalating rarities for variety
// Pattern: GM VBRS → VBMS → VIBEFID → AFCL → COQUETTISH → VIBERUTO (rotating rarities)
export const BOSS_ROTATION_ORDER: CollectionId[] = [
  'gmvbrs',           // 1. GMVBRS Common
  'vibe',           // 2. VIBE Rare
  'vibefid',           // 3. VIBEFID Epic
  'americanfootball',           // 4. AMERICANFOOTBALL Legendary
  'coquettish',           // 5. COQUETTISH Mythic
  'viberuto',           // 6. VIBERUTO Common
  'meowverse',           // 7. MEOWVERSE Rare
  'poorlydrawnpepes',           // 8. POORLYDRAWNPEPES Epic
  'teampothead',           // 9. TEAMPOTHEAD Legendary
  'tarot',           // 10. TAROT Mythic
  'baseballcabal',           // 11. BASEBALLCABAL Common
  'vibefx',           // 12. VIBEFX Rare
  'historyofcomputer',           // 13. HISTORYOFCOMPUTER Epic
  'gmvbrs',           // 14. GMVBRS Rare
  'vibe',           // 15. VIBE Epic
  'vibefid',           // 16. VIBEFID Legendary
  'americanfootball',           // 17. AMERICANFOOTBALL Mythic
  'coquettish',           // 18. COQUETTISH Common
  'viberuto',           // 19. VIBERUTO Rare
  'meowverse',           // 20. MEOWVERSE Epic
  'poorlydrawnpepes',           // 21. POORLYDRAWNPEPES Legendary
  'teampothead',           // 22. TEAMPOTHEAD Mythic
  'tarot',           // 23. TAROT Common
  'baseballcabal',           // 24. BASEBALLCABAL Rare
  'vibefx',           // 25. VIBEFX Epic
  'historyofcomputer',           // 26. HISTORYOFCOMPUTER Legendary
  'gmvbrs',           // 27. GMVBRS Epic
  'vibe',           // 28. VIBE Legendary
  'vibefid',           // 29. VIBEFID Mythic
  'americanfootball',           // 30. AMERICANFOOTBALL Common
  'coquettish',           // 31. COQUETTISH Rare
  'viberuto',           // 32. VIBERUTO Epic
  'meowverse',           // 33. MEOWVERSE Legendary
  'poorlydrawnpepes',           // 34. POORLYDRAWNPEPES Mythic
  'teampothead',           // 35. TEAMPOTHEAD Common
  'tarot',           // 36. TAROT Rare
  'baseballcabal',           // 37. BASEBALLCABAL Epic
  'vibefx',           // 38. VIBEFX Legendary
  'historyofcomputer',           // 39. HISTORYOFCOMPUTER Mythic
  'gmvbrs',           // 40. GMVBRS Legendary
  'vibe',           // 41. VIBE Mythic
  'vibefid',           // 42. VIBEFID Common
  'americanfootball',           // 43. AMERICANFOOTBALL Rare
  'coquettish',           // 44. COQUETTISH Epic
  'viberuto',           // 45. VIBERUTO Legendary
  'meowverse',           // 46. MEOWVERSE Mythic
  'poorlydrawnpepes',           // 47. POORLYDRAWNPEPES Common
  'teampothead',           // 48. TEAMPOTHEAD Rare
  'tarot',           // 49. TAROT Epic
  'baseballcabal',           // 50. BASEBALLCABAL Legendary
  'vibefx',           // 51. VIBEFX Mythic
  'historyofcomputer',           // 52. HISTORYOFCOMPUTER Common
  'gmvbrs',           // 53. GMVBRS Mythic
  'vibe',           // 54. VIBE Common
  'vibefid',           // 55. VIBEFID Rare
  'americanfootball',           // 56. AMERICANFOOTBALL Epic
  'coquettish',           // 57. COQUETTISH Legendary
  'viberuto',           // 58. VIBERUTO Mythic
  'meowverse',           // 59. MEOWVERSE Common
  'poorlydrawnpepes',           // 60. POORLYDRAWNPEPES Rare
  'teampothead',           // 61. TEAMPOTHEAD Epic
  'tarot',           // 62. TAROT Legendary
  'baseballcabal',           // 63. BASEBALLCABAL Mythic
  'vibefx',           // 64. VIBEFX Common
  'historyofcomputer',           // 65. HISTORYOFCOMPUTER Rare
];

export const BOSS_RARITY_ORDER: CardRarity[] = [
  'Common',    // 1. GMVBRS
  'Rare',    // 2. VIBE
  'Epic',    // 3. VIBEFID
  'Legendary',    // 4. AMERICANFOOTBALL
  'Mythic',    // 5. COQUETTISH
  'Common',    // 6. VIBERUTO
  'Rare',    // 7. MEOWVERSE
  'Epic',    // 8. POORLYDRAWNPEPES
  'Legendary',    // 9. TEAMPOTHEAD
  'Mythic',    // 10. TAROT
  'Common',    // 11. BASEBALLCABAL
  'Rare',    // 12. VIBEFX
  'Epic',    // 13. HISTORYOFCOMPUTER
  'Rare',    // 14. GMVBRS
  'Epic',    // 15. VIBE
  'Legendary',    // 16. VIBEFID
  'Mythic',    // 17. AMERICANFOOTBALL
  'Common',    // 18. COQUETTISH
  'Rare',    // 19. VIBERUTO
  'Epic',    // 20. MEOWVERSE
  'Legendary',    // 21. POORLYDRAWNPEPES
  'Mythic',    // 22. TEAMPOTHEAD
  'Common',    // 23. TAROT
  'Rare',    // 24. BASEBALLCABAL
  'Epic',    // 25. VIBEFX
  'Legendary',    // 26. HISTORYOFCOMPUTER
  'Epic',    // 27. GMVBRS
  'Legendary',    // 28. VIBE
  'Mythic',    // 29. VIBEFID
  'Common',    // 30. AMERICANFOOTBALL
  'Rare',    // 31. COQUETTISH
  'Epic',    // 32. VIBERUTO
  'Legendary',    // 33. MEOWVERSE
  'Mythic',    // 34. POORLYDRAWNPEPES
  'Common',    // 35. TEAMPOTHEAD
  'Rare',    // 36. TAROT
  'Epic',    // 37. BASEBALLCABAL
  'Legendary',    // 38. VIBEFX
  'Mythic',    // 39. HISTORYOFCOMPUTER
  'Legendary',    // 40. GMVBRS
  'Mythic',    // 41. VIBE
  'Common',    // 42. VIBEFID
  'Rare',    // 43. AMERICANFOOTBALL
  'Epic',    // 44. COQUETTISH
  'Legendary',    // 45. VIBERUTO
  'Mythic',    // 46. MEOWVERSE
  'Common',    // 47. POORLYDRAWNPEPES
  'Rare',    // 48. TEAMPOTHEAD
  'Epic',    // 49. TAROT
  'Legendary',    // 50. BASEBALLCABAL
  'Mythic',    // 51. VIBEFX
  'Common',    // 52. HISTORYOFCOMPUTER
  'Mythic',    // 53. GMVBRS
  'Common',    // 54. VIBE
  'Rare',    // 55. VIBEFID
  'Epic',    // 56. AMERICANFOOTBALL
  'Legendary',    // 57. COQUETTISH
  'Mythic',    // 58. VIBERUTO
  'Common',    // 59. MEOWVERSE
  'Rare',    // 60. POORLYDRAWNPEPES
  'Epic',    // 61. TEAMPOTHEAD
  'Legendary',    // 62. TAROT
  'Mythic',    // 63. BASEBALLCABAL
  'Common',    // 64. VIBEFX
  'Rare',    // 65. HISTORYOFCOMPUTER
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

 * Coquettish Boss Cards

 */

export const COQUETTISH_BOSSES: Record<CardRarity, BossCard> = {
  Common: {
    tokenId: 'coquettish-boss-common',
    collection: 'coquettish',
    name: 'Flirty Charmer',
    rarity: 'Common',
    power: 15,
    imageUrl: '/images/raid-bosses/coquettish/common.png',
    hp: BOSS_HP_BY_RARITY.common,
    description: 'A playful trickster with irresistible charm',
    },
    Rare: {
    tokenId: 'coquettish-boss-rare',
    collection: 'coquettish',
    name: 'Seductive Vixen',
    rarity: 'Rare',
    power: 20,
    imageUrl: '/images/raid-bosses/coquettish/rare.png',
    hp: BOSS_HP_BY_RARITY.rare,
    description: 'Enchanting beauty that captivates all who dare challenge',
    },
    Epic: {
    tokenId: 'coquettish-boss-epic',
    collection: 'coquettish',
    name: 'Enchanting Temptress',
    rarity: 'Epic',
    power: 80,
    imageUrl: '/images/raid-bosses/coquettish/epic.png',
    hp: BOSS_HP_BY_RARITY.epic,
    description: 'Bewitching power that leaves opponents spellbound',
    },
    Legendary: {
    tokenId: 'coquettish-boss-legendary',
    collection: 'coquettish',
    name: 'Alluring Siren',
    rarity: 'Legendary',
    power: 240,
    imageUrl: '/images/raid-bosses/coquettish/legendary.png',
    hp: BOSS_HP_BY_RARITY.legendary,
    description: 'Legendary seductress whose beauty is matched only by her strength',
    },
    Mythic: {
    tokenId: 'coquettish-boss-mythic',
    collection: 'coquettish',
    name: 'Divine Seductress',
    rarity: 'Mythic',
    power: 800,
    imageUrl: '/images/raid-bosses/coquettish/mythic.png',
    hp: BOSS_HP_BY_RARITY.mythic,
    description: 'The ultimate embodiment of allure and power combined',
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
 * All Boss Cards organized by collection
 */
export const ALL_BOSS_CARDS: Record<CollectionId, Record<CardRarity, BossCard>> = {
  gmvbrs: GMVBRS_BOSSES,
  vibe: VBMS_BOSSES,
  vibefid: VIBEFID_BOSSES,
  americanfootball: AFCL_BOSSES,
  coquettish: COQUETTISH_BOSSES,

  viberuto: VIBERUTO_BOSSES,

  meowverse: MEOWVERSE_BOSSES,


  poorlydrawnpepes: POORLYDRAWNPEPES_BOSSES,



  teampothead: TEAMPOTHEAD_BOSSES,  tarot: TAROT_BOSSES,
  baseballcabal: BASEBALLCABAL_BOSSES,

  vibefx: VIBEFX_BOSSES,


  historyofcomputer: HISTORYOFCOMPUTER_BOSSES,



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
  const normalizedIndex = bossIndex % 65; // Loop through 30 bosses
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
  const normalizedIndex = bossIndex % 65;
  return {
    index: normalizedIndex,
    collection: BOSS_ROTATION_ORDER[normalizedIndex],
    rarity: BOSS_RARITY_ORDER[normalizedIndex],
    boss: getCurrentBoss(bossIndex),
  };
}
