import {
  SLOT_BONUS_FOIL_COUNT,
  SLOT_BONUS_FREE_SPINS,
  SLOT_BONUS_WILDCARD,
  SLOT_COLS,
  SLOT_ROWS,
  SLOT_TOTAL_CELLS,
  createSlotCard,
  pickSlotCard,
  type SlotCard,
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

// Payout % of bet for each rank
const RANK_COMBO_PAYOUT: Record<SlotRank, number> = {
  "A":  1000,
  "K":  500,
  "Q":  400,
  "J":  300,
  "10": 250,
  "9":  200,
  "8":  150,
  "7":  100,
  "6":  60,
  "5":  40,
  "4":  30,
  "3":  20,
  "2":  15,
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
  "lombra jr":         "Lombra's Shadow",
  "vibe intern":       "Intern Revolt",
  // Eights (Rare)
  "betobutter":        "Butter Overflow",
  "qrcodo":            "Scan Everything",
  "loground":          "Ground Zero",
  "melted":            "Fully Melted",
  // Sevens (Rare)
  "smolemaru":         "Smole Army",
  "ventra":            "Ventra Surge",
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
function detectQuadCombo(grid: SlotCard[], isBonusMode: boolean): {
  combo: CardCombo;
  matchedIndices: number[];
  wildcardIndices: number[];
} | null {
  const nameGroups = new Map<string, number[]>();
  const jokerIndices: number[] = [];

  for (let i = 0; i < grid.length; i++) {
    const card = grid[i]!;
    const isJoker = card.baccarat === SLOT_BONUS_WILDCARD && isBonusMode;
    if (isJoker) {
      jokerIndices.push(i);
    } else if (card.rank) {
      // Only cards with rank qualify (excludes neymar, clawdmoltopenbot)
      if (!nameGroups.has(card.baccarat)) nameGroups.set(card.baccarat, []);
      nameGroups.get(card.baccarat)!.push(i);
    }
  }

  // Find card name with most duplicates — at least 2 real copies needed
  let bestName = "";
  let bestIndices: number[] = [];

  for (const [name, indices] of nameGroups) {
    const needed = Math.max(0, 4 - indices.length);
    const jokersToUse = Math.min(needed, jokerIndices.length);
    const total = indices.length + jokersToUse;
    if (total >= 4 && indices.length >= 2 && indices.length > bestIndices.length) {
      bestName = name;
      bestIndices = indices;
    }
  }

  if (!bestName) return null;

  const needed = Math.max(0, 4 - bestIndices.length);
  const jokersToUse = Math.min(needed, jokerIndices.length);
  const card = grid[bestIndices[0]!]!;
  const rank = card.rank!;
  const info = RANK_COMBO_INFO[rank];
  const label = card.baccarat.split(" ").map(w => w[0]!.toUpperCase() + w.slice(1)).join(" ");

  return {
    combo: {
      id: `quad_${bestName}`,
      name: `Quad ${label}!`,
      emoji: "💀",
      cards: [],
      bonus: { type: "power", value: RANK_COMBO_PAYOUT[rank] * 3, target: "self" },
      description: `4x ${label} — ultra rare!`,
    },
    matchedIndices: bestIndices,
    wildcardIndices: jokerIndices.slice(0, jokersToUse),
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

/** Detect rank combo (4-of-a-kind by rank, one per suit) anywhere in the 5×3 grid */
function detectRankCombo(grid: SlotCard[], isBonusMode: boolean): {
  combo: CardCombo;
  matchedIndices: number[];
  wildcardIndices: number[];
} | null {
  const rankGroups = new Map<SlotRank, number[]>();
  const jokerIndices: number[] = [];

  for (let i = 0; i < grid.length; i++) {
    const card = grid[i]!;
    const isJoker = card.baccarat === SLOT_BONUS_WILDCARD && isBonusMode;
    if (isJoker) {
      jokerIndices.push(i);
    } else if (card.rank) {
      if (!rankGroups.has(card.rank)) rankGroups.set(card.rank, []);
      rankGroups.get(card.rank)!.push(i);
    }
  }

  for (const rank of SLOT_RANK_ORDER) {
    const indices = rankGroups.get(rank) ?? [];
    const needed = Math.max(0, 4 - indices.length);
    const jokersToUse = Math.min(needed, jokerIndices.length);
    const total = indices.length + jokersToUse;

    if (total >= 4 && indices.length >= 2) {
      return {
        combo: createRankCombo(rank),
        matchedIndices: indices,
        wildcardIndices: jokerIndices.slice(0, jokersToUse),
      };
    }
  }

  return null;
}

const NORMAL_FOIL_CHANCE = 0.15;
const BONUS_FOIL_CHANCE = 0.15;
const BONUS_WEIGHT_MULTIPLIER = 3.5;
const BONUS_WILDCARD_SPAWN_CHANCE = 0.12;
const BONUS_WILDCARD_FORCE_SPAWN_CHANCE = 0.4;
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
};

export type SlotComboPresentation = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  translationKey: string | null;
  audioPath: string | null;
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
  let hasWildcard = persistentWildcards.size > 0;

  for (let index = 0; index < SLOT_TOTAL_CELLS; index += 1) {
    const persistentLevel = persistentWildcards.get(index);
    if (persistentLevel) {
      grid.push(createBonusWildcard(persistentLevel));
      continue;
    }

    const card = createRandomSlotCard(isBonusMode, isBonusMode);
    if (isSlotBonusWildcard(card, isBonusMode)) {
      hasWildcard = true;
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

  if (isBonusMode && !hasWildcard && Math.random() < BONUS_WILDCARD_FORCE_SPAWN_CHANCE) {
    const replaceIndex = Math.floor(Math.random() * SLOT_TOTAL_CELLS);
    grid[replaceIndex] = createBonusWildcard(1);
  }

  return grid;
}



export function getSlotComboPresentation(combo: CardCombo): SlotComboPresentation {
  return {
    id: combo.id,
    name: combo.name,
    emoji: combo.emoji ?? '',
    description: combo.description,
    translationKey: null,
    audioPath: null,
    cards: combo.cards,
    minCards: combo.minCards ?? combo.cards.length,
  };
}

function getSlotComboReward(
  combo: CardCombo,
  _matchedIndices: number[],
  _wildcardIndices: number[],
  _grid: SlotCard[],
  cascadeStep: number,
): number {
  // combo.bonus.value is the payout percentage of bet (e.g., 10 = 10% of bet)
  const basePercent = combo.bonus.value;

  // Cascade multiplier: each successive combo pays more (1x, 2x, 3x, 5x, 8x...)
  const cascadeMult = cascadeStep === 0 ? 1
    : cascadeStep === 1 ? 2
    : cascadeStep === 2 ? 3
    : cascadeStep <= 5 ? 5
    : 8;

  return Math.max(1, Math.round(basePercent * cascadeMult));
}

function findNextCombo(
  grid: SlotCard[],
  skippedStaticCombos: Set<string>,
  isBonusMode: boolean,
): SlotComboMatch | null {
  // Priority 1: Quad (4 identical cards) — strongest combo
  // Priority 2: Four-of-a-kind (4 same rank, different suits)
  const match = detectQuadCombo(grid, isBonusMode) ?? detectRankCombo(grid, isBonusMode);
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

export function extractBonusState(grid: SlotCard[], spinsRemaining = 0): SlotBonusState {
  return {
    persistentWildcards: grid
      .map((card, index) =>
        card.baccarat === SLOT_BONUS_WILDCARD
          ? { index, growthLevel: card.wildcardLevel ?? 1 }
          : null,
      )
      .filter(Boolean) as SlotBonusState["persistentWildcards"],
    spinsRemaining,
  };
}

export function resolveSlotSpin(
  isBonusMode: boolean,
  bonusState?: SlotBonusState | null,
  forceFoilCount = 0,
): SlotSpinResolution {
  const initialGrid = createInitialSlotGrid(isBonusMode, bonusState, forceFoilCount);
  const comboSteps: SlotComboStep[] = [];
  let currentGrid = cloneGrid(initialGrid);
  let totalWin = 0;
  let skippedStaticCombos = new Set<string>();

  for (let guard = 0; guard < MAX_CHAIN_STEPS; guard += 1) {
    const comboMatch = findNextCombo(currentGrid, skippedStaticCombos, isBonusMode);
    if (!comboMatch) {
      break;
    }

    // Apply cascade multiplier to reward
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

  return {
    initialGrid,
    comboSteps,
    finalGrid: currentGrid,
    totalWin,
    finalFoilCount,
    triggeredBonus: bonusSpinsAwarded > 0 || (isBonusMode && spinsRemaining > 0),
    bonusSpinsAwarded,
    bonusSpinsRemaining: spinsRemaining,
    bonusState: extractBonusState(currentGrid, spinsRemaining),
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
