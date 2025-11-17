/**
 * 🏆 ACHIEVEMENT DEFINITIONS
 *
 * Complete achievement system with:
 * - Rarity collection achievements
 * - Wear/Condition achievements
 * - Foil collection achievements
 * - Progressive milestone achievements (1/100, etc)
 */

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "rarity" | "wear" | "foil" | "progressive";
  requirement: {
    type: string; // "have_rarity", "have_wear", "have_foil", "collect_count"
    count: number;
    rarity?: string;
    wear?: string;
    foil?: string;
  };
  reward: number; // $TESTVBMS coins
  tier?: number; // For progressive achievements (1, 5, 10, 25, 50, 100)
}

/**
 * 🎯 RARITY COLLECTION ACHIEVEMENTS
 * Reward for collecting your first card of each rarity
 */
export const RARITY_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "common_collector_1",
    name: "Common Collector",
    description: "Own your first Common card",
    icon: "📦",
    category: "rarity",
    requirement: {
      type: "have_rarity",
      count: 1,
      rarity: "Common",
    },
    reward: 15,
  },
  {
    id: "rare_collector_1",
    name: "Rare Collector",
    description: "Own your first Rare card",
    icon: "💎",
    category: "rarity",
    requirement: {
      type: "have_rarity",
      count: 1,
      rarity: "Rare",
    },
    reward: 30,
  },
  {
    id: "epic_collector_1",
    name: "Epic Collector",
    description: "Own your first Epic card",
    icon: "🔮",
    category: "rarity",
    requirement: {
      type: "have_rarity",
      count: 1,
      rarity: "Epic",
    },
    reward: 60,
  },
  {
    id: "legendary_collector_1",
    name: "Legendary Collector",
    description: "Own your first Legendary card",
    icon: "⭐",
    category: "rarity",
    requirement: {
      type: "have_rarity",
      count: 1,
      rarity: "Legendary",
    },
    reward: 150,
  },
  {
    id: "mythic_collector_1",
    name: "Mythic Collector",
    description: "Own your first Mythic card",
    icon: "🌟",
    category: "rarity",
    requirement: {
      type: "have_rarity",
      count: 1,
      rarity: "Mythic",
    },
    reward: 300,
  },
];

/**
 * 💎 WEAR/CONDITION ACHIEVEMENTS
 * Reward for collecting pristine cards
 */
export const WEAR_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "pristine_first",
    name: "Pristine Collector",
    description: "Own your first Pristine card",
    icon: "✨",
    category: "wear",
    requirement: {
      type: "have_wear",
      count: 1,
      wear: "Pristine",
    },
    reward: 100,
  },
  {
    id: "pristine_10",
    name: "Pristine Hoarder",
    description: "Own 10 Pristine cards",
    icon: "💫",
    category: "wear",
    requirement: {
      type: "have_wear",
      count: 10,
      wear: "Pristine",
    },
    reward: 300,
  },
  {
    id: "pristine_50",
    name: "Pristine Master",
    description: "Own 50 Pristine cards",
    icon: "🌠",
    category: "wear",
    requirement: {
      type: "have_wear",
      count: 50,
      wear: "Pristine",
    },
    reward: 1500,
  },
  {
    id: "pristine_100",
    name: "Pristine Legend",
    description: "Own 100 Pristine cards",
    icon: "👑",
    category: "wear",
    requirement: {
      type: "have_wear",
      count: 100,
      wear: "Pristine",
    },
    reward: 5000,
  },
];

/**
 * 🎴 FOIL ACHIEVEMENTS
 * Reward for collecting foil cards
 */
export const FOIL_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "standard_foil_1",
    name: "Shiny Collector",
    description: "Own your first Standard Foil card",
    icon: "🎴",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 1,
      foil: "Standard",
    },
    reward: 60,
  },
  {
    id: "standard_foil_10",
    name: "Foil Enthusiast",
    description: "Own 10 Standard Foil cards",
    icon: "🃏",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 10,
      foil: "Standard",
    },
    reward: 300,
  },
  {
    id: "standard_foil_50",
    name: "Foil Master",
    description: "Own 50 Standard Foil cards",
    icon: "🎰",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 50,
      foil: "Standard",
    },
    reward: 1500,
  },
  {
    id: "prize_foil_1",
    name: "Prize Winner",
    description: "Own your first Prize Foil card",
    icon: "🏆",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 1,
      foil: "Prize",
    },
    reward: 150,
  },
  {
    id: "prize_foil_10",
    name: "Elite Collector",
    description: "Own 10 Prize Foil cards",
    icon: "🥇",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 10,
      foil: "Prize",
    },
    reward: 600,
  },
  {
    id: "prize_foil_50",
    name: "Prize Legend",
    description: "Own 50 Prize Foil cards",
    icon: "👑",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 50,
      foil: "Prize",
    },
    reward: 3000,
  },
];

/**
 * 📊 PROGRESSIVE ACHIEVEMENTS
 * Progressive milestones for each rarity with counter (1/100, 5/100, etc)
 * Each milestone awards coins
 */
export const PROGRESSIVE_ACHIEVEMENTS: AchievementDefinition[] = [
  // COMMON PROGRESSIVE (15 coins per milestone)
  {
    id: "common_progressive_1",
    name: "Common Beginner I",
    description: "Collect 1 Common card",
    icon: "📦",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, rarity: "Common" },
    reward: 3,
    tier: 1,
  },
  {
    id: "common_progressive_5",
    name: "Common Beginner II",
    description: "Collect 5 Common cards",
    icon: "📦",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, rarity: "Common" },
    reward: 15,
    tier: 5,
  },
  {
    id: "common_progressive_10",
    name: "Common Collector I",
    description: "Collect 10 Common cards",
    icon: "📦",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, rarity: "Common" },
    reward: 30,
    tier: 10,
  },
  {
    id: "common_progressive_25",
    name: "Common Collector II",
    description: "Collect 25 Common cards",
    icon: "📦",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, rarity: "Common" },
    reward: 83,
    tier: 25,
  },
  {
    id: "common_progressive_50",
    name: "Common Master",
    description: "Collect 50 Common cards",
    icon: "📦",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, rarity: "Common" },
    reward: 150,
    tier: 50,
  },
  {
    id: "common_progressive_100",
    name: "Common Legend",
    description: "Collect 100 Common cards",
    icon: "📦",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, rarity: "Common" },
    reward: 300,
    tier: 100,
  },

  // RARE PROGRESSIVE (50 coins per milestone)
  {
    id: "rare_progressive_1",
    name: "Rare Beginner I",
    description: "Collect 1 Rare card",
    icon: "💎",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, rarity: "Rare" },
    reward: 15,
    tier: 1,
  },
  {
    id: "rare_progressive_5",
    name: "Rare Beginner II",
    description: "Collect 5 Rare cards",
    icon: "💎",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, rarity: "Rare" },
    reward: 83,
    tier: 5,
  },
  {
    id: "rare_progressive_10",
    name: "Rare Collector I",
    description: "Collect 10 Rare cards",
    icon: "💎",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, rarity: "Rare" },
    reward: 150,
    tier: 10,
  },
  {
    id: "rare_progressive_25",
    name: "Rare Collector II",
    description: "Collect 25 Rare cards",
    icon: "💎",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, rarity: "Rare" },
    reward: 400,
    tier: 25,
  },
  {
    id: "rare_progressive_50",
    name: "Rare Master",
    description: "Collect 50 Rare cards",
    icon: "💎",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, rarity: "Rare" },
    reward: 750,
    tier: 50,
  },
  {
    id: "rare_progressive_100",
    name: "Rare Legend",
    description: "Collect 100 Rare cards",
    icon: "💎",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, rarity: "Rare" },
    reward: 1500,
    tier: 100,
  },

  // EPIC PROGRESSIVE (100 coins per milestone)
  {
    id: "epic_progressive_1",
    name: "Epic Beginner I",
    description: "Collect 1 Epic card",
    icon: "🔮",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, rarity: "Epic" },
    reward: 30,
    tier: 1,
  },
  {
    id: "epic_progressive_5",
    name: "Epic Beginner II",
    description: "Collect 5 Epic cards",
    icon: "🔮",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, rarity: "Epic" },
    reward: 150,
    tier: 5,
  },
  {
    id: "epic_progressive_10",
    name: "Epic Collector I",
    description: "Collect 10 Epic cards",
    icon: "🔮",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, rarity: "Epic" },
    reward: 300,
    tier: 10,
  },
  {
    id: "epic_progressive_25",
    name: "Epic Collector II",
    description: "Collect 25 Epic cards",
    icon: "🔮",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, rarity: "Epic" },
    reward: 750,
    tier: 25,
  },
  {
    id: "epic_progressive_50",
    name: "Epic Master",
    description: "Collect 50 Epic cards",
    icon: "🔮",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, rarity: "Epic" },
    reward: 1500,
    tier: 50,
  },
  {
    id: "epic_progressive_100",
    name: "Epic Legend",
    description: "Collect 100 Epic cards",
    icon: "🔮",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, rarity: "Epic" },
    reward: 3000,
    tier: 100,
  },

  // LEGENDARY PROGRESSIVE (200 coins per milestone)
  {
    id: "legendary_progressive_1",
    name: "Legendary Beginner I",
    description: "Collect 1 Legendary card",
    icon: "⭐",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, rarity: "Legendary" },
    reward: 60,
    tier: 1,
  },
  {
    id: "legendary_progressive_5",
    name: "Legendary Beginner II",
    description: "Collect 5 Legendary cards",
    icon: "⭐",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, rarity: "Legendary" },
    reward: 300,
    tier: 5,
  },
  {
    id: "legendary_progressive_10",
    name: "Legendary Collector I",
    description: "Collect 10 Legendary cards",
    icon: "⭐",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, rarity: "Legendary" },
    reward: 600,
    tier: 10,
  },
  {
    id: "legendary_progressive_25",
    name: "Legendary Collector II",
    description: "Collect 25 Legendary cards",
    icon: "⭐",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, rarity: "Legendary" },
    reward: 1500,
    tier: 25,
  },
  {
    id: "legendary_progressive_50",
    name: "Legendary Master",
    description: "Collect 50 Legendary cards",
    icon: "⭐",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, rarity: "Legendary" },
    reward: 3000,
    tier: 50,
  },
  {
    id: "legendary_progressive_100",
    name: "Legendary Overlord",
    description: "Collect 100 Legendary cards",
    icon: "⭐",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, rarity: "Legendary" },
    reward: 8000,
    tier: 100,
  },

  // MYTHIC PROGRESSIVE (500 coins per milestone)
  {
    id: "mythic_progressive_1",
    name: "Mythic Beginner I",
    description: "Collect 1 Mythic card",
    icon: "🌟",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, rarity: "Mythic" },
    reward: 150,
    tier: 1,
  },
  {
    id: "mythic_progressive_5",
    name: "Mythic Beginner II",
    description: "Collect 5 Mythic cards",
    icon: "🌟",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, rarity: "Mythic" },
    reward: 750,
    tier: 5,
  },
  {
    id: "mythic_progressive_10",
    name: "Mythic Collector I",
    description: "Collect 10 Mythic cards",
    icon: "🌟",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, rarity: "Mythic" },
    reward: 1500,
    tier: 10,
  },
  {
    id: "mythic_progressive_25",
    name: "Mythic Collector II",
    description: "Collect 25 Mythic cards",
    icon: "🌟",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, rarity: "Mythic" },
    reward: 4000,
    tier: 25,
  },
  {
    id: "mythic_progressive_50",
    name: "Mythic Master",
    description: "Collect 50 Mythic cards",
    icon: "🌟",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, rarity: "Mythic" },
    reward: 8000,
    tier: 50,
  },
  {
    id: "mythic_progressive_100",
    name: "Mythic God",
    description: "Collect 100 Mythic cards - Ultimate Achievement!",
    icon: "🌟",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, rarity: "Mythic" },
    reward: 15000,
    tier: 100,
  },

  // PRISTINE PROGRESSIVE
  {
    id: "pristine_progressive_1",
    name: "Pristine Starter",
    description: "Collect 1 Pristine card",
    icon: "✨",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, wear: "Pristine" },
    reward: 30,
    tier: 1,
  },
  {
    id: "pristine_progressive_5",
    name: "Pristine Keeper",
    description: "Collect 5 Pristine cards",
    icon: "✨",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, wear: "Pristine" },
    reward: 150,
    tier: 5,
  },
  {
    id: "pristine_progressive_10",
    name: "Pristine Guardian",
    description: "Collect 10 Pristine cards",
    icon: "💫",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, wear: "Pristine" },
    reward: 300,
    tier: 10,
  },
  {
    id: "pristine_progressive_25",
    name: "Pristine Curator",
    description: "Collect 25 Pristine cards",
    icon: "💫",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, wear: "Pristine" },
    reward: 750,
    tier: 25,
  },
  {
    id: "pristine_progressive_50",
    name: "Pristine Archivist",
    description: "Collect 50 Pristine cards",
    icon: "🌠",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, wear: "Pristine" },
    reward: 1500,
    tier: 50,
  },
  {
    id: "pristine_progressive_100",
    name: "Pristine Perfectionist",
    description: "Collect 100 Pristine cards",
    icon: "👑",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, wear: "Pristine" },
    reward: 5000,
    tier: 100,
  },

  // STANDARD FOIL PROGRESSIVE
  {
    id: "standard_foil_progressive_1",
    name: "Foil Starter",
    description: "Collect 1 Standard Foil",
    icon: "🎴",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, foil: "Standard" },
    reward: 30,
    tier: 1,
  },
  {
    id: "standard_foil_progressive_5",
    name: "Foil Collector",
    description: "Collect 5 Standard Foils",
    icon: "🎴",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, foil: "Standard" },
    reward: 150,
    tier: 5,
  },
  {
    id: "standard_foil_progressive_10",
    name: "Foil Hunter",
    description: "Collect 10 Standard Foils",
    icon: "🃏",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, foil: "Standard" },
    reward: 300,
    tier: 10,
  },
  {
    id: "standard_foil_progressive_25",
    name: "Foil Expert",
    description: "Collect 25 Standard Foils",
    icon: "🃏",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, foil: "Standard" },
    reward: 750,
    tier: 25,
  },
  {
    id: "standard_foil_progressive_50",
    name: "Foil Veteran",
    description: "Collect 50 Standard Foils",
    icon: "🎰",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, foil: "Standard" },
    reward: 1500,
    tier: 50,
  },
  {
    id: "standard_foil_progressive_100",
    name: "Foil Emperor",
    description: "Collect 100 Standard Foils",
    icon: "🎰",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, foil: "Standard" },
    reward: 3000,
    tier: 100,
  },

  // PRIZE FOIL PROGRESSIVE
  {
    id: "prize_foil_progressive_1",
    name: "Prize Rookie",
    description: "Collect 1 Prize Foil",
    icon: "🏆",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, foil: "Prize" },
    reward: 83,
    tier: 1,
  },
  {
    id: "prize_foil_progressive_5",
    name: "Prize Champion",
    description: "Collect 5 Prize Foils",
    icon: "🏆",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, foil: "Prize" },
    reward: 400,
    tier: 5,
  },
  {
    id: "prize_foil_progressive_10",
    name: "Prize Master",
    description: "Collect 10 Prize Foils",
    icon: "🥇",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, foil: "Prize" },
    reward: 750,
    tier: 10,
  },
  {
    id: "prize_foil_progressive_25",
    name: "Prize Elite",
    description: "Collect 25 Prize Foils",
    icon: "🥇",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, foil: "Prize" },
    reward: 2000,
    tier: 25,
  },
  {
    id: "prize_foil_progressive_50",
    name: "Prize Sovereign",
    description: "Collect 50 Prize Foils",
    icon: "👑",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, foil: "Prize" },
    reward: 4000,
    tier: 50,
  },
  {
    id: "prize_foil_progressive_100",
    name: "Prize Deity",
    description: "Collect 100 Prize Foils - Legendary Status!",
    icon: "👑",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, foil: "Prize" },
    reward: 8000,
    tier: 100,
  },
];

/**
 * ALL ACHIEVEMENTS (Combined)
 */
export const ALL_ACHIEVEMENTS: AchievementDefinition[] = [
  ...RARITY_ACHIEVEMENTS,
  ...WEAR_ACHIEVEMENTS,
  ...FOIL_ACHIEVEMENTS,
  ...PROGRESSIVE_ACHIEVEMENTS,
];

/**
 * Get achievement by ID
 */
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ALL_ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: string): AchievementDefinition[] {
  return ALL_ACHIEVEMENTS.filter((a) => a.category === category);
}
