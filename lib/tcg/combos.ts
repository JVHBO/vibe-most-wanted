/**
 * TCG Combos - Combo detection, bonus calculation, and translation keys
 * Fix Issue #10: LRU cache eviction instead of clearing all
 */

import { CARD_COMBOS, resolveCardName, type DeckCard, type ComboResult } from "@/lib/tcgRules";
import type { CardCombo } from "@/lib/tcg/types";

// Re-export CARD_COMBOS for convenience
export { CARD_COMBOS } from "@/lib/tcgRules";

// Mapping from combo.id to translation key base
export const COMBO_TRANSLATION_KEYS: Record<string, string> = {
  romero_family: "tcgComboRomeroDynasty",
  crypto_kings: "tcgComboCryptoKings",
  mythic_assembly: "tcgComboMythicAssembly",
  legends_unite: "tcgComboLegendsUnite",
  ai_bros: "tcgComboAITakeover",
  scam_squad: "tcgComboScamSquad",
  degen_trio: "tcgComboDegenTrio",
  vibe_team: "tcgComboVibeTeam",
  dirty_duo: "tcgComboDirtyDuo",
  code_masters: "tcgComboCodeMasters",
  content_creators: "tcgComboContentCreators",
  chaos_agents: "tcgComboChaosAgents",
  sniper_support: "tcgComboSniperElite",
  money_makers: "tcgComboMoneyMakers",
  underdog_uprising: "tcgComboUnderdogUprising",
  parallel: "tcgComboParallel",
  royal_brothers: "tcgComboRoyalBrothers",
  philosopher_chad: "tcgComboPhilosopherChad",
  scaling_masters: "tcgComboScalingMasters",
  christmas_spirit: "tcgComboChristmasSpirit",
  shadow_network: "tcgComboShadowNetwork",
  pixel_artists: "tcgComboPixelArtists",
  dirty_money: "tcgComboDirtyMoney",
};

// FIX Issue #10: LRU cache with eviction instead of clear-all
const LRU_MAX_SIZE = 100;
const comboCache = new Map<string, { result: { combo: CardCombo; matchedCards: string[]; wildcardsUsed: number }[]; lastUsed: number }>();

function lruEvict() {
  if (comboCache.size <= LRU_MAX_SIZE) return;
  // Find and delete oldest entry
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  for (const [key, val] of comboCache) {
    if (val.lastUsed < oldestTime) {
      oldestTime = val.lastUsed;
      oldestKey = key;
    }
  }
  if (oldestKey) comboCache.delete(oldestKey);
}

// Detect combos in a set of cards (memoized with LRU)
export const detectCombos = (cards: DeckCard[]): { combo: CardCombo; matchedCards: string[]; wildcardsUsed: number }[] => {
  const cacheKey = cards.map(c => `${resolveCardName(c.name || "")}:${c.type}`).sort().join("|");

  const cached = comboCache.get(cacheKey);
  if (cached) {
    cached.lastUsed = Date.now();
    return cached.result;
  }

  const activeCombos: { combo: CardCombo; matchedCards: string[]; wildcardsUsed: number }[] = [];
  const cardNames = cards.map(c => resolveCardName(c.name || ""));
  const vibefidCount = cards.filter(c => c.type === "vibefid").length;

  for (const combo of CARD_COMBOS) {
    const comboCardsLower = combo.cards.map(c => c.toLowerCase());
    const matchedCards = comboCardsLower.filter(cc => cardNames.includes(cc));
    const requiredCount = combo.minCards || combo.cards.length;
    const wildcardsNeeded = Math.max(0, requiredCount - matchedCards.length);
    const wildcardsAvailable = Math.min(vibefidCount, wildcardsNeeded);
    const effectiveMatches = matchedCards.length + wildcardsAvailable;

    if (effectiveMatches >= requiredCount) {
      activeCombos.push({ combo: combo as CardCombo, matchedCards, wildcardsUsed: wildcardsAvailable });
    }
  }

  comboCache.set(cacheKey, { result: activeCombos, lastUsed: Date.now() });
  lruEvict();

  return activeCombos;
};

// Calculate combo bonus for a specific card
// RULE: Only ONE combo per lane is active
export const getComboBonus = (
  card: DeckCard,
  allCardsInLane: DeckCard[],
  _allLanes?: any[],
  vibefidChoices?: Record<string, string>,
  laneIndex?: number
): number => {
  let combos = detectCombos(allCardsInLane);
  if (combos.length === 0) return 0;

  let totalBonus = 0;
  const cardNameResolved = resolveCardName(card.name || "");

  // ONLY ONE COMBO PER LANE - filter to single combo
  if (vibefidChoices && laneIndex !== undefined) {
    const vibefidCards = allCardsInLane.filter(c => c.type === "vibefid");
    const chosenComboIds = vibefidCards
      .map(c => vibefidChoices[`${laneIndex}-${c.cardId}`])
      .filter(Boolean);

    if (chosenComboIds.length > 0) {
      const chosenCombo = combos.find(({ combo }) => chosenComboIds.includes(combo.id));
      combos = chosenCombo ? [chosenCombo] : [];
    } else {
      combos = [combos[0]];
    }
  } else {
    combos = [combos[0]];
  }

  for (const { combo, matchedCards } of combos) {
    if (matchedCards.includes(cardNameResolved)) {
      if (combo.bonus.target === "self" || combo.bonus.target === "lane") {
        if (combo.bonus.type === "power") {
          totalBonus += combo.bonus.value;
        } else if (combo.bonus.type === "power_percent") {
          totalBonus += Math.floor(card.power * (combo.bonus.value / 100));
        }
      }
    }
    // Lane-wide bonus
    if (combo.bonus.target === "lane" && combo.bonus.type === "power") {
      if (!matchedCards.includes(cardNameResolved)) {
        totalBonus += Math.floor(combo.bonus.value / allCardsInLane.length);
      }
    }
  }

  return totalBonus;
};

// Get steal amount from combos
// RULE: Only ONE combo per lane is active
export const getComboSteal = (
  playerCards: DeckCard[],
  vibefidChoices?: Record<string, string>,
  laneIndex?: number
): number => {
  let combos = detectCombos(playerCards);
  if (combos.length === 0) return 0;

  // ONLY ONE COMBO PER LANE
  if (vibefidChoices && laneIndex !== undefined) {
    const vibefidCards = playerCards.filter(c => c.type === "vibefid");
    const chosenComboIds = vibefidCards
      .map(c => vibefidChoices[`${laneIndex}-${c.cardId}`])
      .filter(Boolean);

    if (chosenComboIds.length > 0) {
      const chosenCombo = combos.find(({ combo }) => chosenComboIds.includes(combo.id));
      combos = chosenCombo ? [chosenCombo] : [];
    } else {
      combos = [combos[0]];
    }
  } else {
    combos = [combos[0]];
  }

  let totalSteal = 0;
  for (const { combo } of combos) {
    if (combo.bonus.type === "steal") {
      totalSteal += combo.bonus.value;
    }
  }

  return totalSteal;
};
