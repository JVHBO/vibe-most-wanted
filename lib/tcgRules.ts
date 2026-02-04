/**
 * TCG Rules Engine - Vibe Clash
 * Centralized game rules, ability processing, and combo detection
 *
 * IMPORTANT: This file must stay in sync with app/tcg/page.tsx
 * Any changes here should be reflected there and vice versa.
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
// CONFIGURATION - MUST MATCH page.tsx TCG_CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export const TCG_CONFIG = {
  LANES: 3,
  CARDS_PER_LANE: 4,
  HAND_SIZE: 5,
  DECK_SIZE: 12,
  MIN_VBMS_OR_VIBEFID: 5,
  MAX_NOTHING: 7,
  MAX_VIBEFID: 1,
  TURN_TIME_SECONDS: 35,
  TOTAL_TURNS: 6,
  STARTING_ENERGY: 3,
  ENERGY_PER_TURN: 1,
  MAX_ENERGY: 10,
  ABILITY_DELAY_MS: 900,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CARD NAME ALIASES - MUST MATCH page.tsx CARD_NAME_ALIASES
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
// FOIL EFFECTS - MUST MATCH page.tsx getFoilEffect
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
// ENERGY COST - MUST MATCH page.tsx getEnergyCost
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
// POWER CALCULATIONS - MUST MATCH page.tsx basePower calculation
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
// COMBOS - MUST MATCH page.tsx CARD_COMBOS exactly
// ═══════════════════════════════════════════════════════════════════════════════

export const CARD_COMBOS: ComboDefinition[] = [
  // ═══ LEGENDARY COMBOS (Very Strong!) ═══
  {
    id: "romero_family",
    name: "Romero Dynasty",
    emoji: "👨‍👧",
    cards: ["dan romero", "goofy romero"],
    bonus: { type: "power", value: 60, target: "self" },
    description: "+60 power EACH! Father & Son unite!",
  },
  {
    id: "crypto_kings",
    name: "Crypto Kings",
    emoji: "👑",
    cards: ["brian armstrong", "vitalik jumpterin"],
    bonus: { type: "power", value: 80, target: "lane" },
    description: "+80 power to ALL cards in lane!",
  },
  {
    id: "mythic_assembly",
    name: "MYTHIC ASSEMBLY",
    emoji: "💎",
    cards: ["neymar", "anon", "linda xied", "jesse"],
    minCards: 2,
    bonus: { type: "power", value: 100, target: "self" },
    description: "+100 power to EACH Mythic! BROKEN!",
  },
  {
    id: "legends_unite",
    name: "Legends Unite",
    emoji: "⭐",
    cards: ["nico", "ye"],
    bonus: { type: "power", value: 70, target: "self" },
    description: "+70 power to each Legend!",
  },

  // ═══ EPIC COMBOS ═══
  {
    id: "ai_bros",
    name: "AI Takeover",
    emoji: "🤖",
    cards: ["claude", "groko", "gaypt"],
    minCards: 2,
    bonus: { type: "power", value: 50, target: "self" },
    description: "+50 power to each AI card!",
  },
  {
    id: "scam_squad",
    name: "Scam Squad",
    emoji: "🚨",
    cards: ["shills", "landmine"],
    bonus: { type: "steal", value: 25, target: "enemy_lane" },
    description: "STEAL 25 power from EACH enemy!",
  },
  {
    id: "degen_trio",
    name: "Degen Trio",
    emoji: "🎰",
    cards: ["nftkid", "john porn"],
    bonus: { type: "power_percent", value: 100, target: "self" },
    description: "DOUBLE power of degen cards!",
  },
  {
    id: "vibe_team",
    name: "Vibe Team",
    emoji: "✨",
    cards: ["vibe intern", "beeper", "jc denton"],
    minCards: 2,
    bonus: { type: "power", value: 50, target: "lane" },
    description: "+50 power to ALL cards in lane!",
  },
  {
    id: "dirty_duo",
    name: "Dirty Duo",
    emoji: "💩",
    cards: ["don filthy", "vlady"],
    bonus: { type: "steal", value: 40, target: "enemy_lane" },
    description: "STEAL 40 power from strongest enemy!",
  },
  {
    id: "code_masters",
    name: "Code Masters",
    emoji: "💻",
    cards: ["horsefarts", "0xdeployer", "linux"],
    minCards: 2,
    bonus: { type: "power", value: 45, target: "self" },
    description: "+45 power to each coder!",
  },
  {
    id: "content_creators",
    name: "Content Creators",
    emoji: "📱",
    cards: ["pooster", "qrcodo"],
    bonus: { type: "power", value: 40, target: "self" },
    description: "+40 power each! Content is KING!",
  },
  {
    id: "chaos_agents",
    name: "Chaos Agents",
    emoji: "🌀",
    cards: ["tukka", "brainpasta", "chilipepper"],
    minCards: 2,
    bonus: { type: "power", value: 60, target: "all_lanes" },
    description: "+60 power across ALL lanes!",
  },
  {
    id: "sniper_support",
    name: "Sniper Elite",
    emoji: "🎯",
    cards: ["jack the sniper", "loground"],
    bonus: { type: "steal", value: 35, target: "enemy_lane" },
    description: "STEAL 35 power from enemies!",
  },

  // ═══ RARE COMBOS ═══
  {
    id: "money_makers",
    name: "Money Makers",
    emoji: "💰",
    cards: ["melted", "rachel"],
    bonus: { type: "power", value: 40, target: "lane" },
    description: "+40 power to entire lane!",
  },
  {
    id: "underdog_uprising",
    name: "Underdog Uprising",
    emoji: "🐕",
    cards: ["ink", "casa", "thosmur"],
    minCards: 2,
    bonus: { type: "power_percent", value: 80, target: "self" },
    description: "+80% power! Commons RISE UP!",
  },

  // ═══ SYNERGY COMBOS (From card descriptions) ═══
  {
    id: "parallel",
    name: "Parallel",
    emoji: "🔀",
    cards: ["rizkybegitu", "bradymck"],
    bonus: { type: "power_percent", value: 100, target: "self" },
    description: "MIRROR: DOUBLE power! Rizky + Brady = unstoppable duo!",
  },
  {
    id: "royal_brothers",
    name: "Royal Brothers",
    emoji: "👑",
    cards: ["antonio", "miguel"],
    bonus: { type: "power_percent", value: 100, target: "self" },
    description: "ANTONIO + MIGUEL = DOUBLE power! Royal synergy!",
  },
  {
    id: "philosopher_chad",
    name: "Philosopher Chad",
    emoji: "🧠",
    cards: ["sartocrates", "zurkchad"],
    bonus: { type: "power", value: 60, target: "self" },
    description: "SARTOCRATES + ZURKCHAD = +60 power + IMMUNITY aura!",
  },
  {
    id: "scaling_masters",
    name: "Scaling Masters",
    emoji: "📊",
    cards: ["ventra", "morlacos"],
    bonus: { type: "power_percent", value: 100, target: "self" },
    description: "VENTRA + MORLACOS = DOUBLE scaling! Unstoppable!",
  },
  {
    id: "christmas_spirit",
    name: "Christmas Spirit",
    emoji: "🎄",
    cards: ["naughty santa", "gozaru"],
    bonus: { type: "power", value: 40, target: "lane" },
    description: "SANTA + GOZARU = +40 power to entire lane! Holiday cheer!",
  },
  {
    id: "shadow_network",
    name: "Shadow Network",
    emoji: "🕶️",
    cards: ["lombra jr", "slaterg"],
    bonus: { type: "steal", value: 30, target: "enemy_lane" },
    description: "LOMBRA + SLATERG = STEAL 30 power! Underground connections!",
  },
  {
    id: "pixel_artists",
    name: "Pixel Artists",
    emoji: "🎨",
    cards: ["smolemaru", "joonx"],
    bonus: { type: "power", value: 35, target: "self" },
    description: "SMOLEMARU + JOONX = +35 power each! Creative minds!",
  },
  {
    id: "dirty_money",
    name: "Dirty Money",
    emoji: "💸",
    cards: ["scum", "betobutter"],
    bonus: { type: "steal", value: 40, target: "enemy_lane" },
    description: "SCUM + BETO = STEAL 40 power! Crime pays!",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMBO DETECTION - MUST MATCH page.tsx detectCombos logic
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
