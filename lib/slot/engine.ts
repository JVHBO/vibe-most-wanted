import {
  SLOT_BONUS_FOIL_COUNT,
  SLOT_BONUS_FREE_SPINS,
  SLOT_BONUS_WILDCARD,
  SLOT_CARD_POOL,
  SLOT_COLS,
  SLOT_ROWS,
  SLOT_TOTAL_CELLS,
  createSlotCard,
  pickSlotCard,
  type SlotCard,
  type SlotCardDefinition,
  type SlotRank,
  SLOT_RANK_ORDER,
} from "./config";

type CardCombo = {
  id: string;
  name: string;
  emoji: string;
  cards: string[];
  minCards?: number;
  bonus: {
    type: "power" | "power_percent" | "steal" | "draw" | "energy";
    value: number;
    target: "self" | "lane" | "all_lanes" | "enemy_lane";
  };
  description: string;
};

// Combo system: 4 cards of the same rank anywhere in the grid = combo
// Dragukka (joker) substitutes any rank. Min 2 real cards required.

// In normal mode: dragukka doesn't appear (re-rolled in createRandomSlotCard)
// In bonus mode: only dragukka acts as joker
const BONUS_MODE_EXCLUDED = new Set(["neymar", "clawdmoltopenbot"]);

// Normal mode wildcards: neymar + clawdmoltopenbot can complete any rank combo
// but are REMOVED after use (one-time use per combo step)
const NORMAL_WILDCARDS = new Set(["neymar", "clawdmoltopenbot"]);

// Payout em % da aposta (rank combo = 4 cartas diferentes do mesmo rank)
// Quad (4 idênticas) paga 3x esses valores
const RANK_COMBO_PAYOUT: Record<SlotRank, number> = {
  "A":  400,   // Ás — raro, paga 4x a aposta
  "K":  200,   // Rei
  "Q":  160,
  "J":  120,
  "10": 100,
  "9":  80,
  "8":  60,
  "7":  40,
  "6":  25,
  "5":  18,
  "4":  14,
  "3":  10,
  "2":  8,
};

// Each rank has:
//   nameComplete   — all 4 suits present (♥♦♣♠) — fires as combo
//   nameIncomplete — only 3 suits present  (near miss hint, no payout)
//   suits: the 4 suits in order ♥♦♣♠ mapped to card names
const RANK_COMBO_INFO: Record<SlotRank, {
  nameComplete: string;
  nameIncomplete: string;
  emoji: string;
  cards: string;
  suits: Record<"hearts"|"diamonds"|"clubs"|"spades", string>;
}> = {
  "A": {
    nameComplete:   "The Anon Council",
    nameIncomplete: "Cipher Incomplete",
    emoji: "",
    cards: "Anon + Linda Xied + Vitalik + Jesse",
    suits: { hearts: "Anon", diamonds: "Linda Xied", clubs: "Vitalik", spades: "Jesse" },
  },
  "K": {
    nameComplete:   "Kings of Vibe",
    nameIncomplete: "Throne Unfinished",
    emoji: "",
    cards: "Miguel + Naughty Santa + Ye + Nico",
    suits: { hearts: "Miguel", diamonds: "Naughty Santa", clubs: "Ye", spades: "Nico" },
  },
  "Q": {
    nameComplete:   "Goofy's Revenge",
    nameIncomplete: "Missing Queen",
    emoji: "",
    cards: "Antonio + Goofy Romero + Tukka + Chilipepper",
    suits: { hearts: "Antonio", diamonds: "Goofy Romero", clubs: "Tukka", spades: "Chilipepper" },
  },
  "J": {
    nameComplete:   "The Degens",
    nameIncomplete: "One Degen Missing",
    emoji: "",
    cards: "Zurkchad + Slaterg + B.Armstrong + NFTKid",
    suits: { hearts: "Zurkchad", diamonds: "Slaterg", clubs: "B.Armstrong", spades: "NFTKid" },
  },
  "10": {
    nameComplete:   "Snipers & Bots",
    nameIncomplete: "Sniper Down",
    emoji: "",
    cards: "Jack Sniper + Beeper + Horsefarts + JC Denton",
    suits: { hearts: "Jack Sniper", diamonds: "Beeper", clubs: "Horsefarts", spades: "JC Denton" },
  },
  "9": {
    nameComplete:   "Chain Breakers",
    nameIncomplete: "Chain Incomplete",
    emoji: "",
    cards: "Sartocrates + 0xDeployer + Lombra Jr + Vibe Intern",
    suits: { hearts: "Sartocrates", diamonds: "0xDeployer", clubs: "Lombra Jr", spades: "Vibe Intern" },
  },
  "8": {
    nameComplete:   "The Melted Gang",
    nameIncomplete: "Still Melting",
    emoji: "",
    cards: "Betobutter + Qrcodo + Loground + Melted",
    suits: { hearts: "Betobutter", diamonds: "Qrcodo", clubs: "Loground", spades: "Melted" },
  },
  "7": {
    nameComplete:   "Shill Squad",
    nameIncomplete: "One Shill Short",
    emoji: "",
    cards: "Smolemaru + Ventra + Bradymck + Shills",
    suits: { hearts: "Smolemaru", diamonds: "Ventra", clubs: "Bradymck", spades: "Shills" },
  },
  "6": {
    nameComplete:   "Scum of the Chain",
    nameIncomplete: "Almost Scum",
    emoji: "",
    cards: "Pooster + John Porn + Scum + Vlady",
    suits: { hearts: "Pooster", diamonds: "John Porn", clubs: "Scum", spades: "Vlady" },
  },
  "5": {
    nameComplete:   "Off-Grid Crew",
    nameIncomplete: "One Off-Grid",
    emoji: "",
    cards: "Landmine + Linux + Joonx + Don Filthy",
    suits: { hearts: "Landmine", diamonds: "Linux", clubs: "Joonx", spades: "Don Filthy" },
  },
  "4": {
    nameComplete:   "Romero's Soldiers",
    nameIncomplete: "Deserter Missing",
    emoji: "",
    cards: "Brainpasta + Gaypt + Dan Romero + Morlacos",
    suits: { hearts: "Brainpasta", diamonds: "Gaypt", clubs: "Dan Romero", spades: "Morlacos" },
  },
  "3": {
    nameComplete:   "Common Suspects",
    nameIncomplete: "One Suspect Loose",
    emoji: "",
    cards: "Casa + Groko + Rizkybegitu + Thosmur",
    suits: { hearts: "Casa", diamonds: "Groko", clubs: "Rizkybegitu", spades: "Thosmur" },
  },
  "2": {
    nameComplete:   "Bottom of the Deck",
    nameIncomplete: "Almost Worthless",
    emoji: "",
    cards: "Rachel + Claude + Gozaru + Ink",
    suits: { hearts: "Rachel", diamonds: "Claude", clubs: "Gozaru", spades: "Ink" },
  },
};

// Audio paths for rank combos (4 different suits of same rank)
export const RANK_COMBO_AUDIO: Record<string, { path: string; volume: number }> = {
  "A":   { path: "/sounds/slot/the_anon_council.mp3",   volume: 0.7 },
  "K":   { path: "/sounds/slot/kings_of_vibe.mp3",      volume: 0.7 },
  "Q":   { path: "/sounds/slot/goofy_revenge.mp3",      volume: 0.7 },
  "J":   { path: "/sounds/slot/the_degens.mp3",         volume: 0.7 },
  "10":  { path: "/sounds/slot/snipers_and_bots.mp3",   volume: 0.65 },
  "9":   { path: "/sounds/slot/chain_breakers.mp3",     volume: 0.7 },
  "8":   { path: "/sounds/slot/the_melted_gang.mp3",    volume: 0.7 },
  "7":   { path: "/sounds/slot/shill_squad.mp3",        volume: 0.65 },
  "6":   { path: "/sounds/slot/scum_of_the_chain.mp3",  volume: 0.65 },
  "5":   { path: "/sounds/slot/off_grid_crew.mp3",      volume: 0.7 },
  "4":   { path: "/sounds/slot/romero_soldiers.mp3",    volume: 0.7 },
  "3":   { path: "/sounds/slot/common_suspects.mp3",    volume: 0.7 },
  "2":   { path: "/sounds/slot/bottom_of_the_deck.mp3", volume: 0.6 },
};

// Audio paths for quad combos (4 identical cards)
export const CARD_QUAD_AUDIO: Record<string, { path: string; volume: number }> = {
  "anon":              { path: "/sounds/slot/anon_dominance.mp3",    volume: 0.8 },
  "linda xied":        { path: "/sounds/slot/diamond_authority.mp3", volume: 0.75 },
  "vitalik jumpterin": { path: "/sounds/slot/protocol_override.mp3", volume: 0.75 },
  "jesse":             { path: "/sounds/slot/kings_arrival.mp3",     volume: 0.75 },
  "miguel":            { path: "/sounds/slot/miguel_dynasty.mp3",    volume: 0.75 },
  "naughty santa":     { path: "/sounds/slot/santas_wrath.mp3",      volume: 0.7 },
  "ye":                { path: "/sounds/slot/ye_universe.mp3",       volume: 0.7 },
  "nico":              { path: "/sounds/slot/nico_supremacy.mp3",    volume: 0.7 },
  "antonio":           { path: "/sounds/slot/antonio_empire.mp3",    volume: 0.7 },
  "goofy romero":      { path: "/sounds/slot/goofy_kingdom.mp3",     volume: 0.7 },
  "tukka":             { path: "/sounds/slot/tukka_takeover.mp3",    volume: 0.75 },
  "chilipepper":       { path: "/sounds/slot/chilli_overdose.mp3",   volume: 0.7 },
  "zurkchad":          { path: "/sounds/slot/chad_overload.mp3",     volume: 0.7 },
  "slaterg":           { path: "/sounds/slot/slaterg_protocol.mp3",  volume: 0.7 },
  "brian armstrong":   { path: "/sounds/slot/armstrong_lock.mp3",    volume: 0.7 },
  "nftkid":            { path: "/sounds/slot/nft_flood.mp3",         volume: 0.65 },
  "jack the sniper":   { path: "/sounds/slot/no_escape.mp3",         volume: 0.7 },
  "beeper":            { path: "/sounds/slot/all_bots_online.mp3",   volume: 0.7 },
  "horsefarts":        { path: "/sounds/slot/unstoppable.mp3",       volume: 0.7 },
  "jc denton":         { path: "/sounds/slot/denton_order.mp3",      volume: 0.7 },
  "sartocrates":       { path: "/sounds/slot/socratic_method.mp3",   volume: 0.65 },
  "0xdeployer":        { path: "/sounds/slot/deploy_everything.mp3", volume: 0.7 },
  "lombra jr":         { path: "/sounds/slot/lombra_smoke.mp3",      volume: 0.7 },
  "vibe intern":       { path: "/sounds/slot/intern_revolt.mp3",     volume: 0.7 },
  "betobutter":        { path: "/sounds/slot/butter_overflow.mp3",   volume: 0.65 },
  "qrcodo":            { path: "/sounds/slot/scan_everything.mp3",   volume: 0.65 },
  "loground":          { path: "/sounds/slot/ground_zero.mp3",       volume: 0.65 },
  "melted":            { path: "/sounds/slot/fully_melted.mp3",      volume: 0.65 },
  "smolemaru":         { path: "/sounds/slot/smole_army.mp3",        volume: 0.65 },
  "ventra":            { path: "/sounds/slot/ventra_gay.mp3",        volume: 0.65 },
  "bradymck":          { path: "/sounds/slot/brady_run.mp3",         volume: 0.65 },
  "shills":            { path: "/sounds/slot/shill_storm.mp3",       volume: 0.65 },
  "pooster":           { path: "/sounds/slot/pooster_parade.mp3",    volume: 0.6 },
  "john porn":         { path: "/sounds/slot/full_send.mp3",         volume: 0.6 },
  "scum":              { path: "/sounds/slot/pure_scum.mp3",         volume: 0.6 },
  "vlady":             { path: "/sounds/slot/vlady_rule.mp3",        volume: 0.6 },
  "landmine":          { path: "/sounds/slot/field_of_mines.mp3",    volume: 0.6 },
  "linux":             { path: "/sounds/slot/root_access.mp3",       volume: 0.6 },
  "joonx":             { path: "/sounds/slot/joon_cascade.mp3",      volume: 0.6 },
  "don filthy":        { path: "/sounds/slot/filthy_rich.mp3",       volume: 0.6 },
  "brainpasta":        { path: "/sounds/slot/brain_overflow.mp3",    volume: 0.6 },
  "gaypt":             { path: "/sounds/slot/gaypt_spiral.mp3",      volume: 0.6 },
  "dan romero":        { path: "/sounds/slot/romero_army.mp3",       volume: 0.65 },
  "morlacos":          { path: "/sounds/slot/morlacos_invasion.mp3", volume: 0.6 },
  "casa":              { path: "/sounds/slot/home_invasion.mp3",     volume: 0.6 },
  "groko":             { path: "/sounds/slot/groko_mob.mp3",         volume: 0.6 },
  "rizkybegitu":       { path: "/sounds/slot/rizky_business.mp3",    volume: 0.6 },
  "thosmur":           { path: "/sounds/slot/thosmur_flood.mp3",     volume: 0.6 },
  "rachel":            { path: "/sounds/slot/rachel_revenge.mp3",    volume: 0.6 },
  "claude":            { path: "/sounds/slot/ai_takeover.mp3",       volume: 0.7 },
  "gozaru":            { path: "/sounds/slot/gozaru_storm.mp3",      volume: 0.6 },
  "ink":               { path: "/sounds/slot/ink_everywhere.mp3",    volume: 0.6 },
};

// Quad names: short, dramatic, narration-ready — style inspired by TCG (Romero Dynasty, AI Takeover)
const CARD_QUAD_NAMES: Record<string, string> = {
  // Aces (Mythic)
  "anon":              "Anon Dominance",
  "linda xied":        "Diamond Authority",
  "vitalik jumpterin": "Protocol Override",
  "jesse":             "King's Arrival",
  // Kings (Legendary)
  "miguel":            "Miguel Dynasty",
  "naughty santa":     "Santa's Wrath",
  "ye":                "Ye's Universe",
  "nico":              "Nico Supremacy",
  // Queens (Legendary)
  "antonio":           "Antonio's Empire",
  "goofy romero":      "Goofy's Kingdom",
  "tukka":             "Tukka Takeover",
  "chilipepper":       "Chilli Overdose",
  // Jacks (Epic)
  "zurkchad":          "Chad Overload",
  "slaterg":           "Slaterg Protocol",
  "brian armstrong":   "Armstrong Lock",
  "nftkid":            "NFT Flood",
  // Tens (Epic)
  "jack the sniper":   "No Escape",
  "beeper":            "All Bots Online",
  "horsefarts":        "Unstoppable",
  "jc denton":         "Denton's Order",
  // Nines (Epic)
  "sartocrates":       "Socratic Method",
  "0xdeployer":        "Deploy Everything",
  "lombra jr":         "Lombra's Smoke",
  "vibe intern":       "Intern Revolt",
  // Eights (Rare)
  "betobutter":        "Butter Overflow",
  "qrcodo":            "Scan Everything",
  "loground":          "Ground Zero",
  "melted":            "Fully Melted",
  // Sevens (Rare)
  "smolemaru":         "Smole Army",
  "ventra":            "Ventra Gay",
  "bradymck":          "Brady's Run",
  "shills":            "Shill Storm",
  // Sixes (Common)
  "pooster":           "Pooster Parade",
  "john porn":         "Full Send",
  "scum":              "Pure Scum",
  "vlady":             "Vlady's Rule",
  // Fives (Common)
  "landmine":          "Field of Mines",
  "linux":             "Root Access",
  "joonx":             "Joon Cascade",
  "don filthy":        "Filthy Rich",
  // Fours (Common)
  "brainpasta":        "Brain Overflow",
  "gaypt":             "Gaypt Spiral",
  "dan romero":        "Romero's Army",
  "morlacos":          "Morlacos Invasion",
  // Threes (Common)
  "casa":              "Home Invasion",
  "groko":             "Groko Mob",
  "rizkybegitu":       "Rizky Business",
  "thosmur":           "Thosmur Flood",
  // Twos (Common)
  "rachel":            "Rachel's Revenge",
  "claude":            "AI Takeover",
  "gozaru":            "Gozaru Storm",
  "ink":               "Ink Everywhere",
};

/** Create a CardCombo for a complete rank match (all 4 suits present) */
function createRankCombo(rank: SlotRank): CardCombo {
  const info = RANK_COMBO_INFO[rank];
  return {
    id: `rank_${rank}`,
    name: info.nameComplete,
    emoji: info.emoji,
    cards: [],
    bonus: { type: "power", value: RANK_COMBO_PAYOUT[rank], target: "self" },
    description: info.cards,
  };
}

/** Detect quad combo: 4+ identical cards (same baccarat name) anywhere in grid — pays 3× rank payout */
function detectQuadCombo(
  grid: SlotCard[],
  isBonusMode: boolean,
  usedWildcardIndices: Set<number> = new Set(),
): {
  combo: CardCombo;
  matchedIndices: number[];
  wildcardIndices: number[];
} | null {
  const nameGroups = new Map<string, number[]>();
  // bonusJokerIndices: dragukka in bonus mode — persistent, excluded once used this spin
  const bonusJokerIndices: number[] = [];
  // normalJokerIndices: neymar/clawdmoltopenbot in normal mode — removed after use
  const normalJokerIndices: number[] = [];

  // First pass: count special wildcards to detect if any have 4+ (quad special)
  const specialCounts = new Map<string, number[]>();
  for (let i = 0; i < grid.length; i++) {
    const card = grid[i]!;
    if (!isBonusMode && NORMAL_WILDCARDS.has(card.baccarat)) {
      if (!specialCounts.has(card.baccarat)) specialCounts.set(card.baccarat, []);
      specialCounts.get(card.baccarat)!.push(i);
    }
  }

  for (let i = 0; i < grid.length; i++) {
    const card = grid[i]!;
    const isBonusJoker = card.baccarat === SLOT_BONUS_WILDCARD && isBonusMode && !usedWildcardIndices.has(i);
    const isNormalJoker = !isBonusMode && NORMAL_WILDCARDS.has(card.baccarat);
    if (isBonusJoker) {
      bonusJokerIndices.push(i);
    } else if (isNormalJoker) {
      // If 4+ of this special exist → treat as regular card (can form special quad)
      // Otherwise → treat as wildcard joker
      const count = specialCounts.get(card.baccarat)?.length ?? 0;
      if (count >= 4) {
        if (!nameGroups.has(card.baccarat)) nameGroups.set(card.baccarat, []);
        nameGroups.get(card.baccarat)!.push(i);
      } else {
        normalJokerIndices.push(i);
      }
    } else if (card.rank) {
      if (!nameGroups.has(card.baccarat)) nameGroups.set(card.baccarat, []);
      nameGroups.get(card.baccarat)!.push(i);
    }
  }

  // Find card name with most duplicates — at least 2 real copies needed
  let bestName = "";
  let bestIndices: number[] = [];
  let bestBonusNeeded = 0;
  let bestNormalNeeded = 0;

  for (const [name, indices] of nameGroups) {
    const needed = Math.max(0, 4 - indices.length);
    const bonusToUse = Math.min(needed, bonusJokerIndices.length);
    const stillNeeded = needed - bonusToUse;
    const normalToUse = Math.min(stillNeeded, normalJokerIndices.length);
    const total = indices.length + bonusToUse + normalToUse;
    // Wildcards fill at most 1 slot — requires 3 real copies minimum
    if (total >= 4 && indices.length >= 3 && indices.length > bestIndices.length) {
      bestName = name;
      bestIndices = indices;
      bestBonusNeeded = bonusToUse;
      bestNormalNeeded = normalToUse;
    }
  }

  if (!bestName) return null;

  const card = grid[bestIndices[0]!]!;
  const rank = card.rank;
  const label = card.baccarat.split(" ").map(w => w[0]!.toUpperCase() + w.slice(1)).join(" ");

  // Special cards (neymar, clawd) have no rank — use fixed ultra-rare payout
  const SPECIAL_QUAD_NAMES: Record<string, string> = {
    "neymar":            "Neymar's Miracle",
    "clawdmoltopenbot":  "Bot Singularity",
  };
  const specialName = SPECIAL_QUAD_NAMES[bestName];
  const quadName = specialName ?? CARD_QUAD_NAMES[bestName] ?? `Quad ${label}!`;
  const payoutValue = rank ? RANK_COMBO_PAYOUT[rank] * 3 : 5000; // specials pay 5000%

  return {
    combo: {
      id: `quad_${bestName}`,
      name: quadName,
      emoji: specialName ? "🌟" : "💀",
      cards: [],
      bonus: { type: "power", value: payoutValue, target: "self" },
      description: `4x ${label} — ultra rare!`,
    },
    // normal jokers (neymar/clawd) go into matchedIndices → will be removed
    matchedIndices: [...bestIndices, ...normalJokerIndices.slice(0, bestNormalNeeded)],
    // bonus joker (dragukka) goes into wildcardIndices → persists
    wildcardIndices: bonusJokerIndices.slice(0, bestBonusNeeded),
  };
}

/** Detect near-miss: exactly 3 cards of same rank in final grid (no combo, but close) */
export function detectNearMiss(grid: SlotCard[], isBonusMode: boolean): SlotNearMiss | null {
  const rankGroups = new Map<SlotRank, { indices: number[]; suits: Set<string> }>();
  const jokerIndices: number[] = [];

  for (let i = 0; i < grid.length; i++) {
    const card = grid[i]!;
    const isJoker = card.baccarat === SLOT_BONUS_WILDCARD && isBonusMode;
    if (isJoker) {
      jokerIndices.push(i);
    } else if (card.rank && card.suit) {
      if (!rankGroups.has(card.rank)) rankGroups.set(card.rank, { indices: [], suits: new Set() });
      const g = rankGroups.get(card.rank)!;
      if (!g.suits.has(card.suit)) {
        g.indices.push(i);
        g.suits.add(card.suit);
      }
    }
  }

  for (const rank of SLOT_RANK_ORDER) {
    const g = rankGroups.get(rank);
    if (!g) continue;
    const total = g.indices.length + jokerIndices.length;
    // Near miss: exactly 3 real cards (no joker fill needed to reach 3), can't reach 4
    if (g.indices.length === 3 && total < 4) {
      const info = RANK_COMBO_INFO[rank];
      const allSuits: Array<"hearts"|"diamonds"|"clubs"|"spades"> = ["hearts","diamonds","clubs","spades"];
      const missingSuit = allSuits.find(s => !g.suits.has(s))!;
      return {
        rank,
        nameIncomplete: info.nameIncomplete,
        emoji: info.emoji,
        presentIndices: g.indices,
        missingSuit,
        missingCard: info.suits[missingSuit],
      };
    }
  }
  return null;
}

/** Detect rank combo (4-of-a-kind by rank, one per suit) anywhere in the 5×3 grid.
 *  RULE: exactly 1 card per suit (♥♦♣♠) — duplicates of the same suit are ignored.
 *  Always 4 cards total: real cards fill suit slots, dragukka fills remaining slots. */
function detectRankCombo(
  grid: SlotCard[],
  isBonusMode: boolean,
  usedWildcardIndices: Set<number> = new Set(),
): {
  combo: CardCombo;
  matchedIndices: number[];
  wildcardIndices: number[];
} | null {
  // rankGroups: only 1 card per suit per rank (first occurrence wins)
  const rankGroups = new Map<SlotRank, { indices: number[]; suits: Set<string> }>();
  // bonusJokerIndices: dragukka — persistent, once per spin
  const bonusJokerIndices: number[] = [];
  // normalJokerIndices: neymar/clawdmoltopenbot — removed after use
  const normalJokerIndices: number[] = [];

  for (let i = 0; i < grid.length; i++) {
    const card = grid[i]!;
    const isBonusJoker = card.baccarat === SLOT_BONUS_WILDCARD && isBonusMode && !usedWildcardIndices.has(i);
    const isNormalJoker = !isBonusMode && NORMAL_WILDCARDS.has(card.baccarat);
    if (isBonusJoker) {
      bonusJokerIndices.push(i);
    } else if (isNormalJoker) {
      normalJokerIndices.push(i);
    } else if (card.rank && card.suit) {
      if (!rankGroups.has(card.rank)) rankGroups.set(card.rank, { indices: [], suits: new Set() });
      const g = rankGroups.get(card.rank)!;
      // Only first card of each suit counts — no duplicate suits allowed
      if (!g.suits.has(card.suit)) {
        g.indices.push(i);
        g.suits.add(card.suit);
      }
    }
  }

  for (const rank of SLOT_RANK_ORDER) {
    const g = rankGroups.get(rank);
    const indices = g?.indices ?? [];
    const needed = Math.max(0, 4 - indices.length);
    const bonusToUse = Math.min(needed, bonusJokerIndices.length);
    const stillNeeded = needed - bonusToUse;
    const normalToUse = Math.min(stillNeeded, normalJokerIndices.length);
    const total = indices.length + bonusToUse + normalToUse;

    // Requires 4 total AND minimum 3 real cards — wildcards can fill at most 1 slot
    if (total >= 4 && indices.length >= 3) {
      return {
        combo: createRankCombo(rank),
        matchedIndices: [...indices, ...normalJokerIndices.slice(0, normalToUse)],
        wildcardIndices: bonusJokerIndices.slice(0, bonusToUse),
      };
    }
  }

  return null;
}

const NORMAL_FOIL_CHANCE = 0.15;
const BONUS_FOIL_CHANCE = 0.07;                  // reduzido de 0.15 — menos foils no bonus
const BONUS_WEIGHT_MULTIPLIER = 2.0;
const BONUS_WILDCARD_SPAWN_CHANCE = 0.02;        // 2% por célula
const BONUS_WILDCARD_FORCE_SPAWN_CHANCE = 0.08;  // 8% de forçar uma dragukka se nenhuma existe
const BONUS_WILDCARD_GUARANTEED_AFTER = 5;       // garantir 1 dragukka após X spins sem aparecer
const BONUS_WILDCARD_MAX_PER_GRID = 1;           // máx 1 nova dragukka por spin
const MAX_CHAIN_STEPS = 20;

export type SlotPhase =
  | "IDLE"
  | "SPIN"
  | "COMBO"
  | "CASCADE"
  | "BONUS"
  | "END";

export type SlotBonusState = {
  persistentWildcards: Array<{
    index: number;
    growthLevel: number;
  }>;
  spinsRemaining: number;
  spinsSinceLastDragukka?: number; // contador para garantia de dragukka
};

export type SlotComboPresentation = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  translationKey: string | null;
  audioPath: string | null;
  audioVolume?: number;
  cards: string[];
  minCards: number;
};

export type SlotComboStep = {
  combo: SlotComboPresentation;
  beforeGrid: SlotCard[];
  afterGrid: SlotCard[];
  matchedIndices: number[];
  removedIndices: number[];
  preservedFoilIndices: number[];
  wildcardIndices: number[];
  fillIndices: number[];
  reward: number;
};

export type SlotNearMiss = {
  rank: SlotRank;
  nameIncomplete: string;
  emoji: string;
  presentIndices: number[];   // 3 cards found
  missingSuit: "hearts" | "diamonds" | "clubs" | "spades";
  missingCard: string;        // name of the missing card
};

export type SlotSpinResolution = {
  initialGrid: SlotCard[];
  comboSteps: SlotComboStep[];
  finalGrid: SlotCard[];
  totalWin: number;
  finalFoilCount: number;
  triggeredBonus: boolean;
  bonusSpinsAwarded: number;
  bonusSpinsRemaining: number;
  bonusState: SlotBonusState;
  nearMiss: SlotNearMiss | null;  // 3-of-a-kind detected but no combo
};

export type SlotComboCatalogEntry = {
  combo: SlotComboPresentation;
  availableCards: string[];
  missingCards: string[];
  possibleInSlot: boolean;
};

type SlotComboMatch = {
  combo: CardCombo;
  matchedIndices: number[];
  wildcardIndices: number[];
  removedIndices: number[];
  preservedFoilIndices: number[];
  reward: number;
  staticKey: string;
};

function cloneCard(card: SlotCard): SlotCard {
  return createSlotCard(card);
}

export function cloneGrid(grid: SlotCard[]): SlotCard[] {
  return grid.map(cloneCard);
}

export function isSlotBonusWildcard(card: Pick<SlotCard, "baccarat">, isBonusMode = false): boolean {
  return isBonusMode && card.baccarat === SLOT_BONUS_WILDCARD;
}

export function countFoils(grid: SlotCard[]): number {
  return grid.filter((card) => card.hasFoil).length;
}

function createBonusWildcard(level = 1): SlotCard {
  return createSlotCard({
    baccarat: SLOT_BONUS_WILDCARD,
    rarity: "Special",
    wildcardLevel: Math.max(1, Math.min(4, level)),
    persistentWildcard: true,
  });
}

function createRandomSlotCard(isBonusMode: boolean, allowWildcardSpawn: boolean): SlotCard {
  // Wildcard só spawn em bonus mode
  if (
    isBonusMode &&
    allowWildcardSpawn &&
    Math.random() < BONUS_WILDCARD_SPAWN_CHANCE
  ) {
    return createBonusWildcard(1);
  }

  const picked = pickSlotCard(isBonusMode ? BONUS_WEIGHT_MULTIPLIER : 1);

  // Fora do bonus: se a carta sorteada for dragukka, re-sortear
  // para garantir que a wild nunca apareça em spins normais
  if (!isBonusMode && picked.baccarat === SLOT_BONUS_WILDCARD) {
    const fallback = pickSlotCard(1);
    const foilChance = NORMAL_FOIL_CHANCE;
    return createSlotCard({
      baccarat: fallback.baccarat,
      rarity: fallback.rarity,
      hasFoil: Math.random() < foilChance,
    });
  }

  // No bonus mode: if card is neymar or clawdmoltopenbot, re-roll
  // only dragukka acts as wildcard in bonus
  if (isBonusMode && BONUS_MODE_EXCLUDED.has(picked.baccarat)) {
    const fallback = pickSlotCard(isBonusMode ? BONUS_WEIGHT_MULTIPLIER : 1);
    const foilChance = BONUS_FOIL_CHANCE;
    return createSlotCard({
      baccarat: fallback.baccarat,
      rarity: fallback.rarity,
      hasFoil: Math.random() < foilChance,
    });
  }

  const foilChance = isBonusMode ? BONUS_FOIL_CHANCE : NORMAL_FOIL_CHANCE;

  return createSlotCard({
    baccarat: picked.baccarat,
    rarity: picked.rarity,
    hasFoil: Math.random() < foilChance,
  });
}

export function createInitialSlotGrid(
  isBonusMode: boolean,
  bonusState?: SlotBonusState | null,
  forceFoilCount = 0,
): SlotCard[] {
  const persistentWildcards = new Map<number, number>(
    (bonusState?.persistentWildcards ?? []).map((entry) => [
      entry.index,
      entry.growthLevel,
    ]),
  );

  const grid: SlotCard[] = [];
  // Persistent dragukkas already count as wildcards
  let newWildcardCount = 0;

  for (let index = 0; index < SLOT_TOTAL_CELLS; index += 1) {
    const persistentLevel = persistentWildcards.get(index);
    if (persistentLevel) {
      grid.push(createBonusWildcard(persistentLevel));
      continue;
    }

    // Limit new dragukka spawns to BONUS_WILDCARD_MAX_PER_GRID per spin
    const allowSpawn = isBonusMode && newWildcardCount < BONUS_WILDCARD_MAX_PER_GRID;
    const card = createRandomSlotCard(isBonusMode, allowSpawn);
    if (isSlotBonusWildcard(card, isBonusMode)) {
      newWildcardCount++;
    }
    grid.push(card);
  }

  // Buy bonus: garantir X foils forçados
  if (forceFoilCount > 0) {
    const nonFoilIndices = grid.map((c, i) => (c.hasFoil ? -1 : i)).filter(i => i >= 0);
    const shuffled = nonFoilIndices.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(forceFoilCount, shuffled.length); i++) {
      const idx = shuffled[i];
      if (idx !== undefined) grid[idx] = { ...grid[idx]!, hasFoil: true };
    }
  }

  if (isBonusMode) {
    const spinsSince = bonusState?.spinsSinceLastDragukka ?? 0;
    const hasNewWildcard = newWildcardCount > 0;
    // Force spawn if: no new dragukka this spin AND (spinsSince >= GUARANTEED or random force)
    if (!hasNewWildcard) {
      const shouldForce =
        spinsSince >= BONUS_WILDCARD_GUARANTEED_AFTER ||
        Math.random() < BONUS_WILDCARD_FORCE_SPAWN_CHANCE;
      if (shouldForce) {
        // Replace a non-persistent, non-foil cell
        const candidates = grid
          .map((c, i) => i)
          .filter(i => !persistentWildcards.has(i) && !grid[i]!.hasFoil);
        if (candidates.length > 0) {
          const replaceIndex = candidates[Math.floor(Math.random() * candidates.length)]!;
          grid[replaceIndex] = createBonusWildcard(1);
        }
      }
    }
  }

  return grid;
}



/** Resolve audioPath/audioVolume from a combo ID — usable on client AND server */
export function resolveComboAudio(comboId: string): { audioPath: string | null; audioVolume: number } {
  if (comboId.startsWith("rank_")) {
    const rank = comboId.slice(5);
    const a = RANK_COMBO_AUDIO[rank];
    if (a) return { audioPath: a.path, audioVolume: a.volume };
  } else if (comboId.startsWith("quad_")) {
    const cardName = comboId.slice(5);
    const a = CARD_QUAD_AUDIO[cardName];
    if (a) return { audioPath: a.path, audioVolume: a.volume };
  }
  return { audioPath: null, audioVolume: 0.7 };
}

export function getSlotComboPresentation(combo: CardCombo): SlotComboPresentation {
  let audioPath: string | null = null;
  let audioVolume: number | undefined;

  if (combo.id.startsWith("rank_")) {
    const rank = combo.id.slice(5) as SlotRank;
    const a = RANK_COMBO_AUDIO[rank];
    if (a) { audioPath = a.path; audioVolume = a.volume; }
  } else if (combo.id.startsWith("quad_")) {
    const cardName = combo.id.slice(5);
    const a = CARD_QUAD_AUDIO[cardName];
    if (a) { audioPath = a.path; audioVolume = a.volume; }
  }

  return {
    id: combo.id,
    name: combo.name,
    emoji: combo.emoji ?? '',
    description: combo.description,
    translationKey: null,
    audioPath,
    audioVolume,
    cards: combo.cards,
    minCards: combo.minCards ?? combo.cards.length,
  };
}

function getSlotComboReward(
  combo: CardCombo,
  _matchedIndices: number[],
  _wildcardIndices: number[],
  _grid: SlotCard[],
  _cascadeStep: number,
): number {
  // combo.bonus.value is the payout percentage of bet (e.g., 10 = 10% of bet)
  // No cascade multiplier, no bonus multiplier — flat payout
  return Math.max(1, combo.bonus.value);
}

function findNextCombo(
  grid: SlotCard[],
  skippedStaticCombos: Set<string>,
  isBonusMode: boolean,
  usedWildcardIndices: Set<number> = new Set(),
): SlotComboMatch | null {
  // Priority 1: Quad (4 identical cards) — strongest combo
  // Priority 2: Four-of-a-kind (4 same rank, different suits)
  const match = detectQuadCombo(grid, isBonusMode, usedWildcardIndices) ?? detectRankCombo(grid, isBonusMode, usedWildcardIndices);
  if (!match) return null;

  const { combo, matchedIndices, wildcardIndices } = match;
  const allIndices = [...matchedIndices, ...wildcardIndices].sort((a, b) => a - b);
  const staticKey = `${combo.id}:${allIndices.join(",")}`;

  if (skippedStaticCombos.has(staticKey)) return null;

  const preservedFoilIndices = matchedIndices.filter((i) => grid[i]?.hasFoil);
  const removedIndices = matchedIndices.filter((i) => !grid[i]?.hasFoil);
  return { combo, matchedIndices, wildcardIndices, removedIndices, preservedFoilIndices, reward: 0, staticKey };
}

function growWildcards(grid: SlotCard[], _wildcardIndices: number[]): SlotCard[] {
  // Wildcards do NOT grow — they persist between bonus spins at their original level
  return cloneGrid(grid);
}

function cascadeGrid(
  grid: SlotCard[],
  removedIndices: number[],
  isBonusMode: boolean,
): { afterGrid: SlotCard[]; fillIndices: number[] } {
  if (removedIndices.length === 0) {
    return { afterGrid: cloneGrid(grid), fillIndices: [] };
  }

  const workingGrid: Array<SlotCard | null> = cloneGrid(grid);
  for (const index of removedIndices) {
    workingGrid[index] = null;
  }

  const fillIndices: number[] = [];
  const afterGrid = new Array<SlotCard>(SLOT_TOTAL_CELLS);

  for (let col = 0; col < SLOT_COLS; col += 1) {
    const survivors: SlotCard[] = [];
    for (let row = 0; row < SLOT_ROWS; row += 1) {
      const index = row * SLOT_COLS + col;
      const card = workingGrid[index];
      if (card) {
        survivors.push(cloneCard(card));
      }
    }

    const missingCount = SLOT_ROWS - survivors.length;
    const newCards = Array.from({ length: missingCount }, () =>
      createRandomSlotCard(isBonusMode, false),
    );

    for (let row = 0; row < missingCount; row += 1) {
      fillIndices.push(row * SLOT_COLS + col);
    }

    const finalColumn = [...newCards, ...survivors];
    for (let row = 0; row < SLOT_ROWS; row += 1) {
      afterGrid[row * SLOT_COLS + col] = finalColumn[row]!;
    }
  }

  return { afterGrid, fillIndices };
}

function makeGridSignature(grid: SlotCard[]): string {
  return grid
    .map((card) => `${card.baccarat}:${card.hasFoil ? "f" : "n"}`)
    .join("|");
}

export function extractBonusState(grid: SlotCard[], spinsRemaining = 0, prevSpinsSince = 0, hadNewDragukka = false): SlotBonusState {
  return {
    persistentWildcards: grid
      .map((card, index) =>
        card.baccarat === SLOT_BONUS_WILDCARD
          ? { index, growthLevel: card.wildcardLevel ?? 1 }
          : null,
      )
      .filter(Boolean) as SlotBonusState["persistentWildcards"],
    spinsRemaining,
    spinsSinceLastDragukka: hadNewDragukka ? 0 : prevSpinsSince + 1,
  };
}

/** Force a combo by completing the rank that already has the most cards in the grid.
 *  Replaces non-rank cells with the missing suit(s) of the best candidate rank. */
function forceNearestRankCombo(grid: SlotCard[]): void {
  // Tally how many distinct suits of each rank are present
  const rankSuits = new Map<SlotRank, Set<string>>();
  for (const card of grid) {
    if (card.rank && card.suit) {
      if (!rankSuits.has(card.rank)) rankSuits.set(card.rank, new Set());
      rankSuits.get(card.rank)!.add(card.suit);
    }
  }

  // Find rank with most suits present (best candidate)
  let bestRank: SlotRank | null = null;
  let bestCount = 0;
  for (const [rank, suits] of rankSuits) {
    if (suits.size > bestCount && suits.size < 4) {
      bestCount = suits.size;
      bestRank = rank;
    }
  }
  // If no rank started, pick a random common one
  if (!bestRank) {
    const commons: SlotRank[] = ["2", "3", "4", "5", "6"];
    bestRank = commons[Math.floor(Math.random() * commons.length)]!;
  }

  const info = RANK_COMBO_INFO[bestRank];
  const allSuits: Array<"hearts" | "diamonds" | "clubs" | "spades"> = ["hearts", "diamonds", "clubs", "spades"];
  const presentSuits = rankSuits.get(bestRank) ?? new Set<string>();
  const missingSuits = allSuits.filter(s => !presentSuits.has(s));

  // Replace non-rank cells with the missing suits
  const nonRankIndices = grid
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !(c.rank === bestRank))
    .map(({ i }) => i)
    .sort(() => Math.random() - 0.5);

  for (let m = 0; m < missingSuits.length && m < nonRankIndices.length; m++) {
    const suit = missingSuits[m]!;
    const cardName = info.suits[suit];
    const def = SLOT_CARD_POOL.find((d: SlotCardDefinition) => d.baccarat.toLowerCase() === cardName.toLowerCase());
    if (!def || nonRankIndices[m] === undefined) continue;
    const idx = nonRankIndices[m]!;
    grid[idx] = {
      baccarat: def.baccarat,
      rarity: def.rarity,
      rank: bestRank,
      suit,
      hasFoil: false,
    };
  }
}

export function resolveSlotSpin(
  isBonusMode: boolean,
  bonusState?: SlotBonusState | null,
  forceFoilCount = 0,
  comboBoostChance = 0, // 0–1: probability of forcing a rank combo this spin
): SlotSpinResolution {
  const initialGrid = createInitialSlotGrid(isBonusMode, bonusState, forceFoilCount);

  // Combo boost: replace cells to force the highest-progress rank to complete
  if (comboBoostChance > 0 && Math.random() < comboBoostChance) {
    forceNearestRankCombo(initialGrid);
  }

  const comboSteps: SlotComboStep[] = [];
  let currentGrid = cloneGrid(initialGrid);
  let totalWin = 0;
  let skippedStaticCombos = new Set<string>();
  // Track dragukka indices already used this spin (once per round rule)
  const usedWildcardIndices = new Set<number>();

  for (let guard = 0; guard < MAX_CHAIN_STEPS; guard += 1) {
    const comboMatch = findNextCombo(currentGrid, skippedStaticCombos, isBonusMode, usedWildcardIndices);
    if (!comboMatch) {
      break;
    }

    // Mark dragukka wildcards used this spin so they can't contribute again
    for (const idx of comboMatch.wildcardIndices) {
      usedWildcardIndices.add(idx);
    }

    comboMatch.reward = getSlotComboReward(
      comboMatch.combo,
      comboMatch.matchedIndices,
      comboMatch.wildcardIndices,
      currentGrid,
      comboSteps.length,
    );

    const beforeGrid = cloneGrid(currentGrid);
    const gridAfterWildcardGrowth = growWildcards(currentGrid, comboMatch.wildcardIndices);
    const { afterGrid, fillIndices } = cascadeGrid(
      gridAfterWildcardGrowth,
      comboMatch.removedIndices,
      isBonusMode,
    );

    comboSteps.push({
      combo: getSlotComboPresentation(comboMatch.combo),
      beforeGrid,
      afterGrid,
      matchedIndices: comboMatch.matchedIndices,
      removedIndices: comboMatch.removedIndices,
      preservedFoilIndices: comboMatch.preservedFoilIndices,
      wildcardIndices: comboMatch.wildcardIndices,
      fillIndices,
      reward: comboMatch.reward,
    });

    totalWin += comboMatch.reward;

    if (comboMatch.removedIndices.length === 0) {
      skippedStaticCombos.add(comboMatch.staticKey);
    } else {
      skippedStaticCombos = new Set<string>();
    }

    const previousSignature = makeGridSignature(currentGrid);
    currentGrid = cloneGrid(afterGrid);
    if (comboMatch.removedIndices.length === 0 && makeGridSignature(currentGrid) !== previousSignature) {
      skippedStaticCombos = new Set<string>();
    }
  }

  const finalFoilCount = countFoils(currentGrid);
  const foilRetrigger = finalFoilCount >= SLOT_BONUS_FOIL_COUNT;

  // Outside bonus: trigger bonus mode. Inside bonus: re-trigger extra spins.
  const bonusSpinsAwarded = foilRetrigger ? SLOT_BONUS_FREE_SPINS : 0;

  // Track spins remaining: if already in bonus, count down but add re-triggers
  const spinsRemaining = isBonusMode
    ? Math.max(0, (bonusState?.spinsRemaining ?? SLOT_BONUS_FREE_SPINS) - 1 + bonusSpinsAwarded)
    : bonusSpinsAwarded;

  // Near miss: detect on final grid only when no combos fired
  const nearMiss = comboSteps.length === 0
    ? detectNearMiss(currentGrid, isBonusMode)
    : null;

  // Detect if a new dragukka appeared this spin (wasn't in the initial persistent wildcards)
  const persistentIndices = new Set((bonusState?.persistentWildcards ?? []).map(w => w.index));
  const hadNewDragukka = isBonusMode && initialGrid.some(
    (c, i) => c.baccarat === SLOT_BONUS_WILDCARD && !persistentIndices.has(i)
  );

  return {
    initialGrid,
    comboSteps,
    finalGrid: currentGrid,
    totalWin,
    finalFoilCount,
    triggeredBonus: bonusSpinsAwarded > 0 || (isBonusMode && spinsRemaining > 0),
    bonusSpinsAwarded,
    bonusSpinsRemaining: spinsRemaining,
    bonusState: extractBonusState(currentGrid, spinsRemaining, bonusState?.spinsSinceLastDragukka ?? 0, hadNewDragukka),
    nearMiss,
  };
}

export function getSlotComboCatalog(): SlotComboCatalogEntry[] {
  const entries: SlotComboCatalogEntry[] = [];

  // Four-of-a-kind combos (4 same rank, different suits) — ordered highest to lowest
  for (const rank of SLOT_RANK_ORDER) {
    const info = RANK_COMBO_INFO[rank];
    entries.push({
      combo: {
        id: `rank_${rank}`,
        name: info.nameComplete,
        emoji: info.emoji,
        description: info.cards,
        translationKey: null,
        audioPath: null,
        cards: [],
        minCards: 4,
      },
      availableCards: [],
      missingCards: [],
      possibleInSlot: true,
    });
  }

  return entries;
}
