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

// Boss Rotation Order (45 bosses total)
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
  'gmvbrs',           // 10. GMVBRS Rare
  'vibe',           // 11. VIBE Epic
  'vibefid',           // 12. VIBEFID Legendary
  'americanfootball',           // 13. AMERICANFOOTBALL Mythic
  'coquettish',           // 14. COQUETTISH Common
  'viberuto',           // 15. VIBERUTO Rare
  'meowverse',           // 16. MEOWVERSE Epic
  'poorlydrawnpepes',           // 17. POORLYDRAWNPEPES Legendary
  'teampothead',           // 18. TEAMPOTHEAD Mythic
  'gmvbrs',           // 19. GMVBRS Epic
  'vibe',           // 20. VIBE Legendary
  'vibefid',           // 21. VIBEFID Mythic
  'americanfootball',           // 22. AMERICANFOOTBALL Common
  'coquettish',           // 23. COQUETTISH Rare
  'viberuto',           // 24. VIBERUTO Epic
  'meowverse',           // 25. MEOWVERSE Legendary
  'poorlydrawnpepes',           // 26. POORLYDRAWNPEPES Mythic
  'teampothead',           // 27. TEAMPOTHEAD Common
  'gmvbrs',           // 28. GMVBRS Legendary
  'vibe',           // 29. VIBE Mythic
  'vibefid',           // 30. VIBEFID Common
  'americanfootball',           // 31. AMERICANFOOTBALL Rare
  'coquettish',           // 32. COQUETTISH Epic
  'viberuto',           // 33. VIBERUTO Legendary
  'meowverse',           // 34. MEOWVERSE Mythic
  'poorlydrawnpepes',           // 35. POORLYDRAWNPEPES Common
  'teampothead',           // 36. TEAMPOTHEAD Rare
  'gmvbrs',           // 37. GMVBRS Mythic
  'vibe',           // 38. VIBE Common
  'vibefid',           // 39. VIBEFID Rare
  'americanfootball',           // 40. AMERICANFOOTBALL Epic
  'coquettish',           // 41. COQUETTISH Legendary
  'viberuto',           // 42. VIBERUTO Mythic
  'meowverse',           // 43. MEOWVERSE Common
  'poorlydrawnpepes',           // 44. POORLYDRAWNPEPES Rare
  'teampothead',           // 45. TEAMPOTHEAD Epic
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
  'Rare',    // 10. GMVBRS
  'Epic',    // 11. VIBE
  'Legendary',    // 12. VIBEFID
  'Mythic',    // 13. AMERICANFOOTBALL
  'Common',    // 14. COQUETTISH
  'Rare',    // 15. VIBERUTO
  'Epic',    // 16. MEOWVERSE
  'Legendary',    // 17. POORLYDRAWNPEPES
  'Mythic',    // 18. TEAMPOTHEAD
  'Epic',    // 19. GMVBRS
  'Legendary',    // 20. VIBE
  'Mythic',    // 21. VIBEFID
  'Common',    // 22. AMERICANFOOTBALL
  'Rare',    // 23. COQUETTISH
  'Epic',    // 24. VIBERUTO
  'Legendary',    // 25. MEOWVERSE
  'Mythic',    // 26. POORLYDRAWNPEPES
  'Common',    // 27. TEAMPOTHEAD
  'Legendary',    // 28. GMVBRS
  'Mythic',    // 29. VIBE
  'Common',    // 30. VIBEFID
  'Rare',    // 31. AMERICANFOOTBALL
  'Epic',    // 32. COQUETTISH
  'Legendary',    // 33. VIBERUTO
  'Mythic',    // 34. MEOWVERSE
  'Common',    // 35. POORLYDRAWNPEPES
  'Rare',    // 36. TEAMPOTHEAD
  'Mythic',    // 37. GMVBRS
  'Common',    // 38. VIBE
  'Rare',    // 39. VIBEFID
  'Epic',    // 40. AMERICANFOOTBALL
  'Legendary',    // 41. COQUETTISH
  'Mythic',    // 42. VIBERUTO
  'Common',    // 43. MEOWVERSE
  'Rare',    // 44. POORLYDRAWNPEPES
  'Epic',    // 45. TEAMPOTHEAD
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



  teampothead: TEAMPOTHEAD_BOSSES,




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
  const normalizedIndex = bossIndex % 45; // Loop through 30 bosses
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
  const normalizedIndex = bossIndex % 45;
  return {
    index: normalizedIndex,
    collection: BOSS_ROTATION_ORDER[normalizedIndex],
    rarity: BOSS_RARITY_ORDER[normalizedIndex],
    boss: getCurrentBoss(bossIndex),
  };
}
