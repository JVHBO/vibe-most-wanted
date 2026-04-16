/**
 * TCG Rules Engine - Vibe Clash
 * Centralized game rules, ability processing, and combo detection
 *
 * SINGLE SOURCE OF TRUTH for TCG rules, types, combos, and config.
 * app/tcg/page.tsx imports from this file - do NOT duplicate.
 */

import tcgAbilitiesData from "@/data/tcg-abilities.json";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type CardType = "vbms" | "nothing" | "vibefid" | "other";
export type AbilityType = "onReveal" | "ongoing" | "active";
export type AbilityCategory = "offensive" | "support" | "control" | "economy" | "wildcard";
export type GamePhase = "play" | "reveal" | "ability" | "ongoing" | "resolve";
export type Rarity = "Common" | "Rare" | "Epic" | "Legendary" | "Mythic";

export interface TCGCard {
  type: CardType;
  cardId: string;
  name?: string;
  rarity: string;
  power: number;
  imageUrl: string;
  foil?: string;
  wear?: string;
  collection?: string;
}

export interface DeckCard extends TCGCard {
  selected?: boolean;
  _bombTurn?: number;
  _bombLane?: number;
  _sacrificed?: boolean;
}

export interface TCGAbility {
  name: string;
  type: AbilityType;
  category?: AbilityCategory;
  description: string;
  effect: Record<string, any>;
  rarity: string;
}

export interface GameLane {
  laneId: number;
  name: string;
  effect: string;
  value?: number;
  description: string;
  playerCards: DeckCard[];
  cpuCards: DeckCard[];
  playerPower: number;
  cpuPower: number;
  bomb?: { turnsLeft: number; owner: "player" | "cpu" };
}

export interface FoilEffect {
  energyDiscount: number;
  description: string;
  isFree: boolean;
}

export interface ComboBonus {
  type: "power" | "steal" | "power_percent";
  value: number;
  target: "self" | "lane" | "all_lanes" | "enemy_lane";
}

export interface ComboDefinition {
  id: string;
  name: string;
  emoji: string;
  cards: string[];
  minCards?: number;
  bonus: ComboBonus;
  description: string;
}

export interface ComboResult {
  combo: ComboDefinition;
  matchedCards: string[];
  wildcardsUsed: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - Source of truth - TCG_CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const TCG_CONFIG = {
  LANES: 3,
  CARDS_PER_LANE: 4,
  HAND_SIZE: 5,
  DECK_SIZE: 12,
  MIN_VBMS_OR_VIBEFID: 5,
  MAX_NOTHING: 7,
  MAX_VIBEFID: 1,
  TURN_TIME_SECONDS: 35, // PvE: casual. Backend (convex/tcg.ts) uses 20s for PvP
  TOTAL_TURNS: 6,
  STARTING_ENERGY: 3,
  ENERGY_PER_TURN: 1,
  MAX_ENERGY: 10,
  ABILITY_DELAY_MS: 900,
  MAX_HAND_SIZE: 10, // Maximum cards in hand - excess cards are burned (discarded)
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CARD NAME ALIASES - Source of truth - CARD_NAME_ALIASES
// ═══════════════════════════════════════════════════════════════════════════════

export const CARD_NAME_ALIASES: Record<string, string> = {
  "proxy": "slaterg",
  "filthy": "don filthy",
  "vlad": "vlady",
  "shill": "shills",
  "beto": "betobutter",
  "lombra": "lombra jr",
  "vibe": "vibe intern",
  "jack": "jack the sniper",
  "horsefacts": "horsefarts",
  "jc": "jc denton",
  "nicogay": "nico",
  "chilli": "chilipepper",
  "goofy romero": "goofy romero",
  "linda xied": "linda xied",
  "beeper": "beeper",
  "clawdmolt": "clawdmoltopenbot",
  "clawdmolt openbot": "clawdmoltopenbot",
};

export function resolveCardName(name: string): string {
  const lower = name.toLowerCase().trim();
  return CARD_NAME_ALIASES[lower] || lower;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABILITIES DATA
// ═══════════════════════════════════════════════════════════════════════════════

const tcgAbilities: Record<string, TCGAbility> = tcgAbilitiesData.abilities as Record<string, TCGAbility>;

export function getAbility(cardName: string | undefined): TCGAbility | null {
  if (!cardName) return null;
  const resolved = resolveCardName(cardName);
  return tcgAbilities[resolved] || null;
}

export function getAbilityCategory(cardName: string | undefined): AbilityCategory | null {
  const ability = getAbility(cardName);
  return ability?.category || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOIL EFFECTS - Source of truth - getFoilEffect
// ═══════════════════════════════════════════════════════════════════════════════

export function getFoilEffect(foil: string | undefined): FoilEffect | null {
  if (!foil || foil === "None" || foil === "none") return null;
  const foilLower = foil.toLowerCase();
  if (foilLower === "standard") {
    return { energyDiscount: 0.5, description: "Standard Foil: 50% energy discount", isFree: false };
  }
  if (foilLower === "prize") {
    return { energyDiscount: 1.0, description: "Prize Foil: 100% energy discount", isFree: false };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENERGY COST - Source of truth - getEnergyCost
// ═══════════════════════════════════════════════════════════════════════════════

export function getEnergyCost(card: TCGCard): number {
  // Base cost by rarity
  let baseCost = 1;
  const rarity = (card.rarity || "").toLowerCase();
  switch (rarity) {
    case "mythic": baseCost = 6; break;
    case "legendary": baseCost = 5; break;
    case "epic": baseCost = 4; break;
    case "rare": baseCost = 3; break;
    case "common": baseCost = 2; break;
    default: baseCost = 1; break; // Nothing/Other cards cost 1
  }

  // Apply foil discount
  const foilEffect = getFoilEffect(card.foil);
  if (!foilEffect) return baseCost;
  return Math.max(1, Math.floor(baseCost * (1 - foilEffect.energyDiscount)));
}

export function canPlayCard(card: TCGCard, currentEnergy: number): boolean {
  return getEnergyCost(card) <= currentEnergy;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POWER CALCULATIONS - Source of truth - basePower calculation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get base power for a card.
 * - Nothing/Other cards: 50% power penalty
 * - VibeFID cards: NO multiplier (they use special abilities instead)
 * - VBMS cards: full power
 */
export function getCardBasePower(card: TCGCard): number {
  if (card.type === "nothing" || card.type === "other") {
    return Math.floor(card.power * 0.5);
  }
  // VibeFID uses abilities for power, not multiplier in TCG
  return card.power;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECK VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface DeckValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    total: number;
    vbms: number;
    vibefid: number;
    nothing: number;
    other: number;
  };
}

export function validateDeck(cards: TCGCard[]): DeckValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const stats = {
    total: cards.length,
    vbms: cards.filter(c => c.type === "vbms").length,
    vibefid: cards.filter(c => c.type === "vibefid").length,
    nothing: cards.filter(c => c.type === "nothing").length,
    other: cards.filter(c => c.type === "other").length,
  };

  if (stats.total !== TCG_CONFIG.DECK_SIZE) {
    errors.push(`Deck must have exactly ${TCG_CONFIG.DECK_SIZE} cards (has ${stats.total})`);
  }

  const mainCards = stats.vbms + stats.vibefid;
  if (mainCards < TCG_CONFIG.MIN_VBMS_OR_VIBEFID) {
    errors.push(`Need at least ${TCG_CONFIG.MIN_VBMS_OR_VIBEFID} VBMS/VibeFID cards (has ${mainCards})`);
  }

  const fillerCards = stats.nothing + stats.other;
  if (fillerCards > TCG_CONFIG.MAX_NOTHING) {
    errors.push(`Max ${TCG_CONFIG.MAX_NOTHING} Nothing/Other cards allowed (has ${fillerCards})`);
  }

  if (stats.vibefid > TCG_CONFIG.MAX_VIBEFID) {
    errors.push(`Max ${TCG_CONFIG.MAX_VIBEFID} VibeFID card allowed (has ${stats.vibefid})`);
  }

  if (stats.nothing > 3) {
    warnings.push("Many Nothing cards reduce overall deck power");
  }

  return { valid: errors.length === 0, errors, warnings, stats };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMBOS - Source of truth - CARD_COMBOS exactly
// ═══════════════════════════════════════════════════════════════════════════════

export const CARD_COMBOS: ComboDefinition[] = [
  // ═══ MYTHIC — 4 Aces ═══
  {
    id: "four_aces",
    name: "Four Aces",
    emoji: "💎",
    cards: ["anon", "linda xied", "vitalik jumpterin", "jesse"],
    bonus: { type: "power", value: 100, target: "self" },
    description: "+100 power to ALL four Aces! BROKEN!",
  },

  // ═══ LEGENDARY — 4 Kings + 4 Queens ═══
  {
    id: "four_kings",
    name: "Four Kings",
    emoji: "👑",
    cards: ["miguel", "chilipepper", "ye", "nico"],
    bonus: { type: "power", value: 90, target: "self" },
    description: "+90 power to each King! Royal might!",
  },
  {
    id: "four_queens",
    name: "Four Queens",
    emoji: "⭐",
    cards: ["antonio", "goofy romero", "tukka", "chilipepper"],
    bonus: { type: "power", value: 80, target: "self" },
    description: "+80 power to each Queen! Legend tier!",
  },

  // ═══ EPIC — 4 Jacks, 4 10s, 4 9s ═══
  {
    id: "four_jacks",
    name: "Four Jacks",
    emoji: "🃏",
    cards: ["zurkchad", "slaterg", "brian armstrong", "nftkid"],
    bonus: { type: "power", value: 60, target: "lane" },
    description: "+60 power to entire lane! Jack squad!",
  },
  {
    id: "four_tens",
    name: "Four Tens",
    emoji: "🔥",
    cards: ["jack the sniper", "beeper", "horsefarts", "jc denton"],
    bonus: { type: "power", value: 55, target: "self" },
    description: "+55 power to each card! Hot hand!",
  },
  {
    id: "four_nines",
    name: "Four Nines",
    emoji: "🌀",
    cards: ["sartocrates", "0xdeployer", "lombra jr", "vibe intern"],
    bonus: { type: "power", value: 50, target: "all_lanes" },
    description: "+50 power across ALL lanes! Chaos!",
  },

  // ═══ RARE — 4 Eights, 4 Sevens ═══
  {
    id: "four_eights",
    name: "Four Eights",
    emoji: "🔮",
    cards: ["betobutter", "qrcodo", "loground", "melted"],
    bonus: { type: "power", value: 40, target: "lane" },
    description: "+40 power to entire lane! Rare power!",
  },
  {
    id: "four_sevens",
    name: "Four Sevens",
    emoji: "🎯",
    cards: ["smolemaru", "ventra", "bradymck", "shills"],
    bonus: { type: "power_percent", value: 50, target: "self" },
    description: "+50% power! Lucky sevens!",
  },

  // ═══ COMMON — 4 Fives, 4 Fours, 4 Threes, 4 Twos ═══
  {
    id: "four_fives",
    name: "Four Fives",
    emoji: "🎲",
    cards: ["john porn", "linux", "joonx", "don filthy"],
    bonus: { type: "power", value: 30, target: "self" },
    description: "+30 power each! High five!",
  },
  {
    id: "four_fours",
    name: "Four Fours",
    emoji: "🐕",
    cards: ["brainpasta", "gaypt", "dan romero", "morlacos"],
    bonus: { type: "power", value: 25, target: "self" },
    description: "+25 power each! Underdog power!",
  },
  {
    id: "four_threes",
    name: "Four Threes",
    emoji: "🍀",
    cards: ["casa", "groko", "rizkybegitu", "thosmur"],
    bonus: { type: "power_percent", value: 40, target: "self" },
    description: "+40% power! Triple threat!",
  },
  {
    id: "four_twos",
    name: "Four Twos",
    emoji: "📱",
    cards: ["claude", "gozaru", "ink", "casa"],
    minCards: 3,
    bonus: { type: "power", value: 20, target: "self" },
    description: "+20 power each! Commons rise!",
  },

  // ═══ SPECIAL — 4 Dragukkas (bonus mode only) ═══
  {
    id: "four_dragukkas",
    name: "Four Dragukkas",
    emoji: "🐉",
    cards: ["dragukka", "dragukka", "dragukka", "dragukka"],
    bonus: { type: "power", value: 200, target: "self" },
    description: "+200 power! MEGA WILDCARD! Bonus only!",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMBO DETECTION - Source of truth - detectCombos logic
// ═══════════════════════════════════════════════════════════════════════════════

const comboCache = new Map<string, ComboResult[]>();

export function detectCombos(cards: DeckCard[]): ComboResult[] {
  // Create cache key from sorted card names + types (for vibefid wildcard)
  const cacheKey = cards.map(c => `${resolveCardName(c.name || "")}:${c.type}`).sort().join("|");

  const cached = comboCache.get(cacheKey);
  if (cached) return cached;

  const activeCombos: ComboResult[] = [];
  const cardNames = cards.map(c => resolveCardName(c.name || ""));

  // VibeFID cards act as wildcards - can substitute any card in a combo
  const vibefidCount = cards.filter(c => c.type === "vibefid").length;

  for (const combo of CARD_COMBOS) {
    const comboCardsLower = combo.cards.map(c => c.toLowerCase());
    const matchingCards = comboCardsLower.filter(c => cardNames.includes(c));
    const minRequired = combo.minCards || combo.cards.length;

    // Count how many we're missing
    const missingCards = minRequired - matchingCards.length;

    // Can we complete it with wildcards?
    if (missingCards <= vibefidCount && matchingCards.length + Math.min(missingCards, vibefidCount) >= minRequired) {
      activeCombos.push({
        combo,
        matchedCards: matchingCards,
        wildcardsUsed: Math.max(0, missingCards),
      });
    }
  }

  comboCache.set(cacheKey, activeCombos);
  return activeCombos;
}

export function clearComboCache(): void {
  comboCache.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMBO POWER CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getComboBonus(comboResult: ComboResult, cardPower: number): number {
  const { bonus } = comboResult.combo;

  switch (bonus.type) {
    case "power":
      return bonus.value;
    case "power_percent":
      return Math.floor(cardPower * (bonus.value / 100));
    case "steal":
      return 0; // Steal is handled separately (reduces enemy power)
    default:
      return 0;
  }
}

export function getComboSteal(comboResult: ComboResult): number {
  const { bonus } = comboResult.combo;
  if (bonus.type === "steal") {
    return bonus.value;
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME FLOW HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getLaneWinner(lane: GameLane): "player" | "cpu" | "tie" {
  if (lane.playerPower > lane.cpuPower) return "player";
  if (lane.cpuPower > lane.playerPower) return "cpu";
  return "tie";
}

export function countLaneWins(lanes: GameLane[]): { player: number; cpu: number; ties: number } {
  return lanes.reduce(
    (acc, lane) => {
      const winner = getLaneWinner(lane);
      if (winner === "player") acc.player++;
      else if (winner === "cpu") acc.cpu++;
      else acc.ties++;
      return acc;
    },
    { player: 0, cpu: 0, ties: 0 }
  );
}

export function determineWinner(lanes: GameLane[]): "player" | "cpu" | "tie" {
  const wins = countLaneWins(lanes);

  // Win by lanes (best of 3)
  if (wins.player >= 2) return "player";
  if (wins.cpu >= 2) return "cpu";

  // Tiebreaker: total power
  const playerTotal = lanes.reduce((sum, l) => sum + l.playerPower, 0);
  const cpuTotal = lanes.reduce((sum, l) => sum + l.cpuPower, 0);

  if (playerTotal > cpuTotal) return "player";
  if (cpuTotal > playerTotal) return "cpu";

  return "tie";
}

export function canPlaceCard(lane: GameLane, isPlayer: boolean): boolean {
  const cards = isPlayer ? lane.playerCards : lane.cpuCards;
  return cards.length < TCG_CONFIG.CARDS_PER_LANE;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case "Mythic": return "border-pink-500";
    case "Legendary": return "border-orange-500";
    case "Epic": return "border-purple-500";
    case "Rare": return "border-blue-500";
    default: return "border-gray-500";
  }
}

export function getCategoryConfig(category: AbilityCategory | undefined): { emoji: string; color: string; label: string } {
  const configs: Record<AbilityCategory, { emoji: string; color: string; label: string }> = {
    offensive: { emoji: "⚔️", color: "text-red-400", label: "Offensive" },
    support: { emoji: "💚", color: "text-green-400", label: "Support" },
    control: { emoji: "🎭", color: "text-purple-400", label: "Control" },
    economy: { emoji: "⚡", color: "text-yellow-400", label: "Economy" },
    wildcard: { emoji: "🃏", color: "text-cyan-400", label: "Wildcard" },
  };
  return category ? configs[category] : { emoji: "❓", color: "text-gray-400", label: "Unknown" };
}
