import {
  SLOT_BONUS_FOIL_COUNT,
  SLOT_BONUS_FREE_SPINS,
  SLOT_BONUS_WILDCARD,
  SLOT_CARD_POOL,
  SLOT_COLS,
  SLOT_PATTERNS,
  SLOT_ROWS,
  SLOT_SPECIAL_DRAGUKKA_PAYOUT,
  SLOT_TOTAL_CELLS,
  createSlotCard,
  getSlotPatternTooltip,
  isAnySlotWildcard,
  isDragukkaCard,
  isNormalWildcardCard,
  pickSlotCard,
  type SlotCard,
  type SlotCardDefinition,
  type SlotPattern,
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

// Combo system: 4 cards of the same rank forming one of the defined SLOT_PATTERNS (H/V/D/L) = combo
// Dragukka (joker) substitutes any rank, but payout combos always require 4 matched cards total.

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
function createRankCombo(rank: SlotRank, cards: string[], pattern: SlotPattern): CardCombo {
  const info = RANK_COMBO_INFO[rank];
  return {
    id: `rank_${rank}`,
    name: info.nameComplete,
    emoji: info.emoji,
    cards,
    minCards: 4,
    bonus: { type: "power", value: RANK_COMBO_PAYOUT[rank], target: "self" },
    description: `${info.cards} • ${getSlotPatternTooltip(pattern)}`,
  };
}

function createQuadCombo(name: string, cards: string[], payoutValue: number, pattern: SlotPattern): CardCombo {
  const label = name.split(" ").map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ");
  const specialName = name === "neymar" ? "Neymar's Miracle" : name === "clawdmoltopenbot" ? "Bot Singularity" : null;
  const quadName = specialName ?? CARD_QUAD_NAMES[name] ?? `Quad ${label}!`;
  return {
    id: `quad_${name}`,
    name: quadName,
    emoji: specialName ? "🌟" : "💀",
    cards,
    minCards: 4,
    bonus: { type: "power", value: payoutValue, target: "self" },
    description: `4x ${label} • ${getSlotPatternTooltip(pattern)}`,
  };
}

function createAllDragukkaCombo(pattern: SlotPattern): CardCombo {
  return {
    id: `quad_dragukka_${pattern.id}`,
    name: "Dragukka Storm",
    emoji: "🐉",
    cards: Array(4).fill(SLOT_BONUS_WILDCARD),
    minCards: 4,
    bonus: { type: "power", value: SLOT_SPECIAL_DRAGUKKA_PAYOUT, target: "self" },
    description: `4x Dragukka • ${getSlotPatternTooltip(pattern)}`,
  };
}

function getPatternCards(grid: SlotCard[], pattern: SlotPattern) {
  return pattern.indices.map((index) => ({ index, card: grid[index]! }));
}

function detectPatternCombo(
  grid: SlotCard[],
  pattern: SlotPattern,
  isBonusMode: boolean,
  usedWildcardIndices: Set<number> = new Set(),
): {
  combo: CardCombo;
  matchedIndices: number[];
  wildcardIndices: number[];
} | null {
  const entries = getPatternCards(grid, pattern);
  const availableEntries = entries.filter(({ index }) => !usedWildcardIndices.has(index));
  if (availableEntries.length !== 4) return null;

  const dragukkaEntries = availableEntries.filter(({ card }) => isBonusMode && isDragukkaCard(card.baccarat));
  const normalWildcardEntries = availableEntries.filter(({ card }) => !isBonusMode && isNormalWildcardCard(card.baccarat));
  const realEntries = availableEntries.filter(({ card }) => !isAnySlotWildcard(card.baccarat));

  if (dragukkaEntries.length === 4) {
    return {
      combo: createAllDragukkaCombo(pattern),
      matchedIndices: dragukkaEntries.map(({ index }) => index),
      wildcardIndices: [],
    };
  }

  const byName = new Map<string, typeof realEntries>();
  for (const entry of realEntries) {
    const current = byName.get(entry.card.baccarat) ?? [];
    current.push(entry);
    byName.set(entry.card.baccarat, current);
  }

  for (const [name, items] of byName) {
    const total = items.length + dragukkaEntries.length + normalWildcardEntries.length;
    if (total < 4) continue;
    if (items.length < 1) continue;

    const card = items[0]!.card;
    const payoutValue = card.rank ? RANK_COMBO_PAYOUT[card.rank] * 3 : 5000;
    const matched = [
      ...items.map(({ index }) => index),
      ...normalWildcardEntries.slice(0, Math.max(0, 4 - items.length - dragukkaEntries.length)).map(({ index }) => index),
    ].slice(0, 4 - dragukkaEntries.length);
    const wildcardIndices = dragukkaEntries.slice(0, Math.max(0, 4 - matched.length)).map(({ index }) => index);
    const cards = [...matched.map((index) => grid[index]!.baccarat), ...wildcardIndices.map((index) => grid[index]!.baccarat)].slice(0, 4);
    if (cards.length !== 4) continue;

    return {
      combo: createQuadCombo(name, cards, payoutValue, pattern),
      matchedIndices: matched,
      wildcardIndices,
    };
  }

  const byRank = new Map<SlotRank, Map<string, { index: number; card: SlotCard }>>();
  for (const entry of realEntries) {
    if (!entry.card.rank || !entry.card.suit) continue;
    const suits = byRank.get(entry.card.rank) ?? new Map();
    if (!suits.has(entry.card.suit)) suits.set(entry.card.suit, entry);
    byRank.set(entry.card.rank, suits);
  }

  for (const rank of SLOT_RANK_ORDER) {
    const suitEntries = byRank.get(rank);
    const realCount = suitEntries?.size ?? 0;
    const total = realCount + dragukkaEntries.length + normalWildcardEntries.length;
    if (total < 4) continue;
    if (realCount < 1) continue;

    const realMatched = [...(suitEntries?.values() ?? [])].map(({ index }) => index);
    const normalNeeded = Math.max(0, Math.min(normalWildcardEntries.length, 4 - realMatched.length - dragukkaEntries.length));
    const wildcardNeeded = Math.max(0, 4 - realMatched.length - normalNeeded);
    const matchedIndices = [...realMatched, ...normalWildcardEntries.slice(0, normalNeeded).map(({ index }) => index)];
    const wildcardIndices = dragukkaEntries.slice(0, wildcardNeeded).map(({ index }) => index);
    const cards = [...matchedIndices.map((index) => grid[index]!.baccarat), ...wildcardIndices.map((index) => grid[index]!.baccarat)].slice(0, 4);
    if (cards.length !== 4) continue;

    return {
      combo: createRankCombo(rank, cards, pattern),
      matchedIndices,
      wildcardIndices,
    };
  }

  return null;
}

export function detectNearMiss(grid: SlotCard[], isBonusMode: boolean): SlotNearMiss | null {
  for (const pattern of SLOT_PATTERNS) {
    const entries = getPatternCards(grid, pattern);
    const dragukkaCount = entries.filter(({ card }) => isBonusMode && isDragukkaCard(card.baccarat)).length;
    const realCards = entries.filter(({ card }) => !isAnySlotWildcard(card.baccarat));
    const ranks = new Map<SlotRank, { indices: number[]; suits: Set<string> }>();

    for (const { index, card } of realCards) {
      if (!card.rank || !card.suit) continue;
      const current = ranks.get(card.rank) ?? { indices: [], suits: new Set<string>() };
      if (!current.suits.has(card.suit)) {
        current.indices.push(index);
        current.suits.add(card.suit);
      }
      ranks.set(card.rank, current);
    }

    for (const rank of SLOT_RANK_ORDER) {
      const current = ranks.get(rank);
      if (!current) continue;
      if (current.indices.length === 3 && current.indices.length + dragukkaCount < 4) {
        const info = RANK_COMBO_INFO[rank];
        const allSuits: Array<"hearts"|"diamonds"|"clubs"|"spades"> = ["hearts","diamonds","clubs","spades"];
        const missingSuit = allSuits.find((suit) => !current.suits.has(suit))!;
        return {
          rank,
          nameIncomplete: `${info.nameIncomplete} • ${getSlotPatternTooltip(pattern)}`,
          emoji: info.emoji,
          presentIndices: current.indices,
          missingSuit,
          missingCard: info.suits[missingSuit],
        };
      }
    }
  }
  return null;
}

function getBestBoostPattern(grid: SlotCard[], isBonusMode: boolean): SlotPattern | null {
  let best: { pattern: SlotPattern; score: number } | null = null;

  for (const pattern of SLOT_PATTERNS) {
    const entries = getPatternCards(grid, pattern);
    const dragukkaCount = entries.filter(({ card }) => isBonusMode && isDragukkaCard(card.baccarat)).length;
    const normalWildcardCount = entries.filter(({ card }) => !isBonusMode && isNormalWildcardCard(card.baccarat)).length;
    const realCards = entries.filter(({ card }) => !isAnySlotWildcard(card.baccarat));

    const countsByRank = new Map<string, number>();
    const countsByName = new Map<string, number>();
    for (const { card } of realCards) {
      if (card.rank) countsByRank.set(card.rank, (countsByRank.get(card.rank) ?? 0) + 1);
      countsByName.set(card.baccarat, (countsByName.get(card.baccarat) ?? 0) + 1);
    }

    const bestRankCount = Math.max(0, ...countsByRank.values());
    const bestQuadCount = Math.max(0, ...countsByName.values());
    const progress = Math.max(bestRankCount, bestQuadCount) + dragukkaCount + normalWildcardCount;
    if (progress < 2 || progress >= 4) continue;

    const patternWeight = pattern.type === "horizontal" ? 1 : pattern.type === "vertical" ? 1 : pattern.type === "diagonal" ? 1.1 : 1.15;
    const score = progress * patternWeight;
    if (!best || score > best.score) best = { pattern, score };
  }

  return best?.pattern ?? null;
}

function forcePatternCombo(grid: SlotCard[], isBonusMode: boolean): void {
  const pattern = getBestBoostPattern(grid, isBonusMode);
  if (!pattern) return;

  const entries = getPatternCards(grid, pattern);
  const realCards = entries.filter(({ card }) => !isAnySlotWildcard(card.baccarat));
  const countsByRank = new Map<SlotRank, number>();

  for (const { card } of realCards) {
    if (!card.rank) continue;
    countsByRank.set(card.rank, (countsByRank.get(card.rank) ?? 0) + 1);
  }

  const targetRank = [...countsByRank.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "7";
  const info = RANK_COMBO_INFO[targetRank];
  const allSuits: Array<"hearts" | "diamonds" | "clubs" | "spades"> = ["hearts", "diamonds", "clubs", "spades"];
  const usedSuits = new Set(realCards.map(({ card }) => card.suit).filter(Boolean) as string[]);
  const missingSuits = allSuits.filter((suit) => !usedSuits.has(suit)).slice(0, 4);

  for (const { index, card } of entries) {
    if (isAnySlotWildcard(card.baccarat)) continue;
    if (card.rank === targetRank) continue;
    const nextSuit = missingSuits.shift();
    if (!nextSuit) break;
    const baccarat = info.suits[nextSuit];
    const def = SLOT_CARD_POOL.find((entry) => entry.baccarat.toLowerCase() === baccarat.toLowerCase());
    if (!def) continue;
    grid[index] = createSlotCard({ baccarat: def.baccarat, rarity: def.rarity, rank: targetRank, suit: nextSuit, hasFoil: card.hasFoil });
  }
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

  const foilChance = isBonusMode ? BONUS_FOIL_CHANCE : NORMAL_FOIL_CHANCE;
  let picked = pickSlotCard(isBonusMode ? BONUS_WEIGHT_MULTIPLIER : 1);

  // Fora do bonus: dragukka nunca pode sair
  if (!isBonusMode) {
    let guard = 0;
    while (picked.baccarat === SLOT_BONUS_WILDCARD && guard < 64) {
      picked = pickSlotCard(1);
      guard += 1;
    }
  }

  // No bonus mode: only dragukka acts as wildcard
  if (isBonusMode) {
    let guard = 0;
    while (BONUS_MODE_EXCLUDED.has(picked.baccarat) && guard < 64) {
      picked = pickSlotCard(BONUS_WEIGHT_MULTIPLIER);
      guard += 1;
    }
  }

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
  let match: { combo: CardCombo; matchedIndices: number[]; wildcardIndices: number[] } | null = null;

  for (const pattern of SLOT_PATTERNS) {
    const candidate = detectPatternCombo(grid, pattern, isBonusMode, usedWildcardIndices);
    if (!candidate) continue;
    match = candidate;
    break;
  }

  if (!match) return null;

  const { combo, matchedIndices, wildcardIndices } = match;
  const allIndices = [...matchedIndices, ...wildcardIndices].sort((a, b) => a - b);
  const staticKey = `${combo.id}:${allIndices.join(",")}`;

  if (skippedStaticCombos.has(staticKey)) return null;

  // Preserve foils (never removed). Remove everything else that participated in the combo,
  // including wildcards like Dragukka, so 4-dragukka can't loop forever.
  const preservedFoilIndices = allIndices.filter((i) => grid[i]?.hasFoil);
  const removedIndices = allIndices.filter((i) => !grid[i]?.hasFoil);

  return {
    combo,
    matchedIndices,
    wildcardIndices,
    removedIndices,
    preservedFoilIndices,
    reward: 0,
    staticKey,
  };
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


export function resolveSlotSpin(
  isBonusMode: boolean,
  bonusState?: SlotBonusState | null,
  forceFoilCount = 0,
  comboBoostChance = 0, // 0–1: probability of forcing a rank combo this spin
): SlotSpinResolution {
  const initialGrid = createInitialSlotGrid(isBonusMode, bonusState, forceFoilCount);

  // Combo boost: prefer the best partially-built valid shape
  if (comboBoostChance > 0 && Math.random() < comboBoostChance) {
    forcePatternCombo(initialGrid, isBonusMode);
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
