import {
  a as i
} from "./5B5TEMMX.js";

// convex/achievementDefinitions.ts
var o = [
  {
    id: "common_collector_1",
    name: "Common Collector",
    description: "Own your first Common card",
    icon: "\u{1F4E6}",
    category: "rarity",
    requirement: {
      type: "have_rarity",
      count: 1,
      rarity: "Common"
    },
    reward: 15
  },
  {
    id: "rare_collector_1",
    name: "Rare Collector",
    description: "Own your first Rare card",
    icon: "\u{1F48E}",
    category: "rarity",
    requirement: {
      type: "have_rarity",
      count: 1,
      rarity: "Rare"
    },
    reward: 30
  },
  {
    id: "epic_collector_1",
    name: "Epic Collector",
    description: "Own your first Epic card",
    icon: "\u{1F52E}",
    category: "rarity",
    requirement: {
      type: "have_rarity",
      count: 1,
      rarity: "Epic"
    },
    reward: 60
  },
  {
    id: "legendary_collector_1",
    name: "Legendary Collector",
    description: "Own your first Legendary card",
    icon: "\u2B50",
    category: "rarity",
    requirement: {
      type: "have_rarity",
      count: 1,
      rarity: "Legendary"
    },
    reward: 150
  },
  {
    id: "mythic_collector_1",
    name: "Mythic Collector",
    description: "Own your first Mythic card",
    icon: "\u{1F31F}",
    category: "rarity",
    requirement: {
      type: "have_rarity",
      count: 1,
      rarity: "Mythic"
    },
    reward: 300
  }
], c = [
  {
    id: "pristine_first",
    name: "Pristine Collector",
    description: "Own your first Pristine card",
    icon: "\u2728",
    category: "wear",
    requirement: {
      type: "have_wear",
      count: 1,
      wear: "Pristine"
    },
    reward: 100
  },
  {
    id: "pristine_10",
    name: "Pristine Hoarder",
    description: "Own 10 Pristine cards",
    icon: "\u{1F4AB}",
    category: "wear",
    requirement: {
      type: "have_wear",
      count: 10,
      wear: "Pristine"
    },
    reward: 300
  },
  {
    id: "pristine_50",
    name: "Pristine Master",
    description: "Own 50 Pristine cards",
    icon: "\u{1F320}",
    category: "wear",
    requirement: {
      type: "have_wear",
      count: 50,
      wear: "Pristine"
    },
    reward: 1500
  },
  {
    id: "pristine_100",
    name: "Pristine Legend",
    description: "Own 100 Pristine cards",
    icon: "\u{1F451}",
    category: "wear",
    requirement: {
      type: "have_wear",
      count: 100,
      wear: "Pristine"
    },
    reward: 5e3
  }
], n = [
  {
    id: "standard_foil_1",
    name: "Shiny Collector",
    description: "Own your first Standard Foil card",
    icon: "\u{1F3B4}",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 1,
      foil: "Standard"
    },
    reward: 60
  },
  {
    id: "standard_foil_10",
    name: "Foil Enthusiast",
    description: "Own 10 Standard Foil cards",
    icon: "\u{1F0CF}",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 10,
      foil: "Standard"
    },
    reward: 300
  },
  {
    id: "standard_foil_50",
    name: "Foil Master",
    description: "Own 50 Standard Foil cards",
    icon: "\u{1F3B0}",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 50,
      foil: "Standard"
    },
    reward: 1500
  },
  {
    id: "prize_foil_1",
    name: "Prize Winner",
    description: "Own your first Prize Foil card",
    icon: "\u{1F3C6}",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 1,
      foil: "Prize"
    },
    reward: 150
  },
  {
    id: "prize_foil_10",
    name: "Elite Collector",
    description: "Own 10 Prize Foil cards",
    icon: "\u{1F947}",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 10,
      foil: "Prize"
    },
    reward: 600
  },
  {
    id: "prize_foil_50",
    name: "Prize Legend",
    description: "Own 50 Prize Foil cards",
    icon: "\u{1F451}",
    category: "foil",
    requirement: {
      type: "have_foil",
      count: 50,
      foil: "Prize"
    },
    reward: 3e3
  }
], a = [
  // COMMON PROGRESSIVE (15 coins per milestone)
  {
    id: "common_progressive_1",
    name: "Common Beginner I",
    description: "Collect 1 Common card",
    icon: "\u{1F4E6}",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, rarity: "Common" },
    reward: 3,
    tier: 1
  },
  {
    id: "common_progressive_5",
    name: "Common Beginner II",
    description: "Collect 5 Common cards",
    icon: "\u{1F4E6}",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, rarity: "Common" },
    reward: 15,
    tier: 5
  },
  {
    id: "common_progressive_10",
    name: "Common Collector I",
    description: "Collect 10 Common cards",
    icon: "\u{1F4E6}",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, rarity: "Common" },
    reward: 30,
    tier: 10
  },
  {
    id: "common_progressive_25",
    name: "Common Collector II",
    description: "Collect 25 Common cards",
    icon: "\u{1F4E6}",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, rarity: "Common" },
    reward: 83,
    tier: 25
  },
  {
    id: "common_progressive_50",
    name: "Common Master",
    description: "Collect 50 Common cards",
    icon: "\u{1F4E6}",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, rarity: "Common" },
    reward: 150,
    tier: 50
  },
  {
    id: "common_progressive_100",
    name: "Common Legend",
    description: "Collect 100 Common cards",
    icon: "\u{1F4E6}",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, rarity: "Common" },
    reward: 300,
    tier: 100
  },
  // RARE PROGRESSIVE (50 coins per milestone)
  {
    id: "rare_progressive_1",
    name: "Rare Beginner I",
    description: "Collect 1 Rare card",
    icon: "\u{1F48E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, rarity: "Rare" },
    reward: 15,
    tier: 1
  },
  {
    id: "rare_progressive_5",
    name: "Rare Beginner II",
    description: "Collect 5 Rare cards",
    icon: "\u{1F48E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, rarity: "Rare" },
    reward: 83,
    tier: 5
  },
  {
    id: "rare_progressive_10",
    name: "Rare Collector I",
    description: "Collect 10 Rare cards",
    icon: "\u{1F48E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, rarity: "Rare" },
    reward: 150,
    tier: 10
  },
  {
    id: "rare_progressive_25",
    name: "Rare Collector II",
    description: "Collect 25 Rare cards",
    icon: "\u{1F48E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, rarity: "Rare" },
    reward: 400,
    tier: 25
  },
  {
    id: "rare_progressive_50",
    name: "Rare Master",
    description: "Collect 50 Rare cards",
    icon: "\u{1F48E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, rarity: "Rare" },
    reward: 750,
    tier: 50
  },
  {
    id: "rare_progressive_100",
    name: "Rare Legend",
    description: "Collect 100 Rare cards",
    icon: "\u{1F48E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, rarity: "Rare" },
    reward: 1500,
    tier: 100
  },
  // EPIC PROGRESSIVE (100 coins per milestone)
  {
    id: "epic_progressive_1",
    name: "Epic Beginner I",
    description: "Collect 1 Epic card",
    icon: "\u{1F52E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, rarity: "Epic" },
    reward: 30,
    tier: 1
  },
  {
    id: "epic_progressive_5",
    name: "Epic Beginner II",
    description: "Collect 5 Epic cards",
    icon: "\u{1F52E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, rarity: "Epic" },
    reward: 150,
    tier: 5
  },
  {
    id: "epic_progressive_10",
    name: "Epic Collector I",
    description: "Collect 10 Epic cards",
    icon: "\u{1F52E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, rarity: "Epic" },
    reward: 300,
    tier: 10
  },
  {
    id: "epic_progressive_25",
    name: "Epic Collector II",
    description: "Collect 25 Epic cards",
    icon: "\u{1F52E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, rarity: "Epic" },
    reward: 750,
    tier: 25
  },
  {
    id: "epic_progressive_50",
    name: "Epic Master",
    description: "Collect 50 Epic cards",
    icon: "\u{1F52E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, rarity: "Epic" },
    reward: 1500,
    tier: 50
  },
  {
    id: "epic_progressive_100",
    name: "Epic Legend",
    description: "Collect 100 Epic cards",
    icon: "\u{1F52E}",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, rarity: "Epic" },
    reward: 3e3,
    tier: 100
  },
  // LEGENDARY PROGRESSIVE (200 coins per milestone)
  {
    id: "legendary_progressive_1",
    name: "Legendary Beginner I",
    description: "Collect 1 Legendary card",
    icon: "\u2B50",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, rarity: "Legendary" },
    reward: 60,
    tier: 1
  },
  {
    id: "legendary_progressive_5",
    name: "Legendary Beginner II",
    description: "Collect 5 Legendary cards",
    icon: "\u2B50",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, rarity: "Legendary" },
    reward: 300,
    tier: 5
  },
  {
    id: "legendary_progressive_10",
    name: "Legendary Collector I",
    description: "Collect 10 Legendary cards",
    icon: "\u2B50",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, rarity: "Legendary" },
    reward: 600,
    tier: 10
  },
  {
    id: "legendary_progressive_25",
    name: "Legendary Collector II",
    description: "Collect 25 Legendary cards",
    icon: "\u2B50",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, rarity: "Legendary" },
    reward: 1500,
    tier: 25
  },
  {
    id: "legendary_progressive_50",
    name: "Legendary Master",
    description: "Collect 50 Legendary cards",
    icon: "\u2B50",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, rarity: "Legendary" },
    reward: 3e3,
    tier: 50
  },
  {
    id: "legendary_progressive_100",
    name: "Legendary Overlord",
    description: "Collect 100 Legendary cards",
    icon: "\u2B50",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, rarity: "Legendary" },
    reward: 8e3,
    tier: 100
  },
  // MYTHIC PROGRESSIVE (500 coins per milestone)
  {
    id: "mythic_progressive_1",
    name: "Mythic Beginner I",
    description: "Collect 1 Mythic card",
    icon: "\u{1F31F}",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, rarity: "Mythic" },
    reward: 150,
    tier: 1
  },
  {
    id: "mythic_progressive_5",
    name: "Mythic Beginner II",
    description: "Collect 5 Mythic cards",
    icon: "\u{1F31F}",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, rarity: "Mythic" },
    reward: 750,
    tier: 5
  },
  {
    id: "mythic_progressive_10",
    name: "Mythic Collector I",
    description: "Collect 10 Mythic cards",
    icon: "\u{1F31F}",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, rarity: "Mythic" },
    reward: 1500,
    tier: 10
  },
  {
    id: "mythic_progressive_25",
    name: "Mythic Collector II",
    description: "Collect 25 Mythic cards",
    icon: "\u{1F31F}",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, rarity: "Mythic" },
    reward: 4e3,
    tier: 25
  },
  {
    id: "mythic_progressive_50",
    name: "Mythic Master",
    description: "Collect 50 Mythic cards",
    icon: "\u{1F31F}",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, rarity: "Mythic" },
    reward: 8e3,
    tier: 50
  },
  {
    id: "mythic_progressive_100",
    name: "Mythic God",
    description: "Collect 100 Mythic cards - Ultimate Achievement!",
    icon: "\u{1F31F}",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, rarity: "Mythic" },
    reward: 15e3,
    tier: 100
  },
  // PRISTINE PROGRESSIVE
  {
    id: "pristine_progressive_1",
    name: "Pristine Starter",
    description: "Collect 1 Pristine card",
    icon: "\u2728",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, wear: "Pristine" },
    reward: 30,
    tier: 1
  },
  {
    id: "pristine_progressive_5",
    name: "Pristine Keeper",
    description: "Collect 5 Pristine cards",
    icon: "\u2728",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, wear: "Pristine" },
    reward: 150,
    tier: 5
  },
  {
    id: "pristine_progressive_10",
    name: "Pristine Guardian",
    description: "Collect 10 Pristine cards",
    icon: "\u{1F4AB}",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, wear: "Pristine" },
    reward: 300,
    tier: 10
  },
  {
    id: "pristine_progressive_25",
    name: "Pristine Curator",
    description: "Collect 25 Pristine cards",
    icon: "\u{1F4AB}",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, wear: "Pristine" },
    reward: 750,
    tier: 25
  },
  {
    id: "pristine_progressive_50",
    name: "Pristine Archivist",
    description: "Collect 50 Pristine cards",
    icon: "\u{1F320}",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, wear: "Pristine" },
    reward: 1500,
    tier: 50
  },
  {
    id: "pristine_progressive_100",
    name: "Pristine Perfectionist",
    description: "Collect 100 Pristine cards",
    icon: "\u{1F451}",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, wear: "Pristine" },
    reward: 5e3,
    tier: 100
  },
  // STANDARD FOIL PROGRESSIVE
  {
    id: "standard_foil_progressive_1",
    name: "Foil Starter",
    description: "Collect 1 Standard Foil",
    icon: "\u{1F3B4}",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, foil: "Standard" },
    reward: 30,
    tier: 1
  },
  {
    id: "standard_foil_progressive_5",
    name: "Foil Collector",
    description: "Collect 5 Standard Foils",
    icon: "\u{1F3B4}",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, foil: "Standard" },
    reward: 150,
    tier: 5
  },
  {
    id: "standard_foil_progressive_10",
    name: "Foil Hunter",
    description: "Collect 10 Standard Foils",
    icon: "\u{1F0CF}",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, foil: "Standard" },
    reward: 300,
    tier: 10
  },
  {
    id: "standard_foil_progressive_25",
    name: "Foil Expert",
    description: "Collect 25 Standard Foils",
    icon: "\u{1F0CF}",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, foil: "Standard" },
    reward: 750,
    tier: 25
  },
  {
    id: "standard_foil_progressive_50",
    name: "Foil Veteran",
    description: "Collect 50 Standard Foils",
    icon: "\u{1F3B0}",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, foil: "Standard" },
    reward: 1500,
    tier: 50
  },
  {
    id: "standard_foil_progressive_100",
    name: "Foil Emperor",
    description: "Collect 100 Standard Foils",
    icon: "\u{1F3B0}",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, foil: "Standard" },
    reward: 3e3,
    tier: 100
  },
  // PRIZE FOIL PROGRESSIVE
  {
    id: "prize_foil_progressive_1",
    name: "Prize Rookie",
    description: "Collect 1 Prize Foil",
    icon: "\u{1F3C6}",
    category: "progressive",
    requirement: { type: "collect_count", count: 1, foil: "Prize" },
    reward: 83,
    tier: 1
  },
  {
    id: "prize_foil_progressive_5",
    name: "Prize Champion",
    description: "Collect 5 Prize Foils",
    icon: "\u{1F3C6}",
    category: "progressive",
    requirement: { type: "collect_count", count: 5, foil: "Prize" },
    reward: 400,
    tier: 5
  },
  {
    id: "prize_foil_progressive_10",
    name: "Prize Master",
    description: "Collect 10 Prize Foils",
    icon: "\u{1F947}",
    category: "progressive",
    requirement: { type: "collect_count", count: 10, foil: "Prize" },
    reward: 750,
    tier: 10
  },
  {
    id: "prize_foil_progressive_25",
    name: "Prize Elite",
    description: "Collect 25 Prize Foils",
    icon: "\u{1F947}",
    category: "progressive",
    requirement: { type: "collect_count", count: 25, foil: "Prize" },
    reward: 2e3,
    tier: 25
  },
  {
    id: "prize_foil_progressive_50",
    name: "Prize Sovereign",
    description: "Collect 50 Prize Foils",
    icon: "\u{1F451}",
    category: "progressive",
    requirement: { type: "collect_count", count: 50, foil: "Prize" },
    reward: 4e3,
    tier: 50
  },
  {
    id: "prize_foil_progressive_100",
    name: "Prize Deity",
    description: "Collect 100 Prize Foils - Legendary Status!",
    icon: "\u{1F451}",
    category: "progressive",
    requirement: { type: "collect_count", count: 100, foil: "Prize" },
    reward: 8e3,
    tier: 100
  }
], s = [
  {
    id: "enable_notifications",
    name: "Stay Connected",
    description: "Enable notifications to receive game updates",
    icon: "\u{1F514}",
    category: "social",
    requirement: {
      type: "enable_notifications",
      count: 1
    },
    reward: 1e3
  },
  {
    id: "add_miniapp",
    name: "VBMS Fan",
    description: "Add VBMS to your Farcaster favorites",
    icon: "\u2B50",
    category: "social",
    requirement: {
      type: "add_miniapp",
      count: 1
    },
    reward: 1e3
  }
], t = [
  ...s,
  // Social achievements first (notifications, miniapp)
  ...o,
  ...c,
  ...n,
  ...a
];
function d(e) {
  return t.find((r) => r.id === e);
}
i(d, "getAchievementById");
function l(e) {
  return t.filter((r) => r.category === e);
}
i(l, "getAchievementsByCategory");

export {
  o as a,
  c as b,
  n as c,
  a as d,
  s as e,
  t as f,
  d as g,
  l as h
};
//# sourceMappingURL=5IIR4IPG.js.map
