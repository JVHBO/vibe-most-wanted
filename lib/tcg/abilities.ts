/**
 * TCG Ability Helpers - Ability resolution, visual effects, foil effects
 * Pure functions that don't depend on React state
 */

import { CARD_NAME_ALIASES, resolveCardName, getFoilEffect as getFoilEffectFromRules, getEnergyCost as getEnergyCostFromRules, type DeckCard, type TCGAbility } from "@/lib/tcgRules";
import tcgAbilitiesData from "@/data/tcg-abilities.json";

// Abilities map from JSON
export const tcgAbilities: Record<string, TCGAbility> = tcgAbilitiesData.abilities as Record<string, TCGAbility>;

// Get rarity-based priority cost for ability resolution order
export const getRarityCost = (card: DeckCard): number => {
  const rarity = (card.rarity || "common").toLowerCase();
  switch (rarity) {
    case "mythic": return 6;
    case "legendary": return 5;
    case "epic": return 4;
    case "rare": return 3;
    case "common": return 2;
    default: return 1;
  }
};

// Sort cards by resolution order: Lane 1->2->3, dice roll per lane
// Matches PvP backend ordering for consistency
export const sortByResolutionOrder = (
  cards: { card: DeckCard; laneIndex: number; side: "player" | "cpu"; ability: any }[]
) => {
  const laneDiceResults = [
    Math.random() < 0.5,
    Math.random() < 0.5,
    Math.random() < 0.5,
  ];

  return [...cards].sort((a, b) => {
    if (a.laneIndex !== b.laneIndex) return a.laneIndex - b.laneIndex;
    const playerFirst = laneDiceResults[a.laneIndex];
    if (a.side === b.side) return 0;
    if (playerFirst) {
      return a.side === "player" ? -1 : 1;
    } else {
      return a.side === "cpu" ? -1 : 1;
    }
  });
};

// Get VibeFID ability based on rarity
// t: translation function
export const getVibeFIDAbility = (rarity: string | undefined, t: (key: string) => string): TCGAbility | null => {
  if (!rarity) return null;
  const rarityLower = rarity.toLowerCase();

  const vibefidAbilities: Record<string, TCGAbility> = {
    "common": {
      name: t('ability_vibefid_common_name') || "First Cast",
      description: t('ability_vibefid_common_desc') || "+5 power for each card already played",
      type: "onReveal",
      effect: { action: "vibefidFirstCast", value: 5 },
      rarity: "Common"
    },
    "rare": {
      name: t('ability_vibefid_rare_name') || "Reply Guy",
      description: t('ability_vibefid_rare_desc') || "Copy 50% power from strongest friendly in lane",
      type: "ongoing",
      effect: { action: "vibefidReplyGuy", value: 0.5 },
      rarity: "Rare"
    },
    "epic": {
      name: t('ability_vibefid_epic_name') || "Verified",
      description: t('ability_vibefid_epic_desc') || "IMMUNE to debuffs + DOUBLE power if losing lane",
      type: "ongoing",
      effect: { action: "vibefidVerified" },
      rarity: "Epic"
    },
    "legendary": {
      name: t('ability_vibefid_legendary_name') || "Ratio",
      description: t('ability_vibefid_legendary_desc') || "Power becomes EQUAL to strongest card on field!",
      type: "onReveal",
      effect: { action: "vibefidRatio" },
      rarity: "Legendary"
    },
    "mythic": {
      name: t('ability_vibefid_mythic_name') || "Doxxed",
      description: t('ability_vibefid_mythic_desc') || "ADD total power of all enemy cards in this lane!",
      type: "onReveal",
      effect: { action: "vibefidDoxxed" },
      rarity: "Mythic"
    }
  };

  return vibefidAbilities[rarityLower] || null;
};

// Get card ability by name (or by rarity for VibeFID)
export const getCardAbility = (cardName: string | undefined, card?: DeckCard | null, t?: (key: string) => string): TCGAbility | null => {
  if (card?.type === "vibefid") {
    return getVibeFIDAbility(card.rarity, t || ((k: string) => k));
  }
  if (!cardName) return null;
  const normalizedName = cardName.toLowerCase().trim();
  const resolvedName = CARD_NAME_ALIASES[normalizedName] || normalizedName;
  return tcgAbilities[resolvedName] || null;
};

// Get translated ability name and description
export const getTranslatedAbility = (
  cardName: string | undefined,
  t: (key: string) => string,
  translations: any,
  lang: string
): { name: string; description: string } | null => {
  if (!cardName) return null;
  const normalizedName = cardName.toLowerCase().trim();
  const resolvedName = CARD_NAME_ALIASES[normalizedName] || normalizedName;
  const ability = tcgAbilities[resolvedName];
  if (!ability) return null;

  const keyName = resolvedName
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const nameKey = `ability${keyName}Name`;
  const descKey = `ability${keyName}Desc`;

  const translatedName = t(nameKey) !== nameKey ? t(nameKey) : ability.name;
  const translatedDesc = t(descKey) !== descKey ? t(descKey) : ability.description;

  return { name: translatedName, description: translatedDesc };
};

// Get visual effect for ability - returns effect type and text
export const getAbilityVisualEffect = (ability: TCGAbility | null, _cardName: string): { type: string; text: string; emoji: string } | null => {
  if (!ability) return null;
  const action = ability.effect?.action;
  switch (action) {
    case "destroyHighestEnemy": return { type: "destroy", text: "PROTOCOL OVERRIDE!", emoji: "💀" };
    case "buffAllLanes": return { type: "king", text: "KING'S ARRIVAL!", emoji: "👑" };
    case "copyHighest": return { type: "copy", text: "DIAMOND AUTHORITY!", emoji: "💎" };
    case "shuffleEnemyLanes": return { type: "shuffle", text: "CHAOTIC KINGDOM!", emoji: "🌀" };
    case "swapEnemyPowers": return { type: "shuffle", text: "COCK TWIST!", emoji: "🔄" };
    case "debuffLane": return { type: "debuff", text: "SPICY BURN!", emoji: "🌶️" };
    case "giveCoal": return { type: "debuff", text: "NAUGHTY GIFT!", emoji: "🎁" };
    case "draw": return { type: "draw", text: `DRAW ${ability.effect?.value || 1}!`, emoji: "🃏" };
    case "debuffRandomEnemy": return { type: "snipe", text: "SNIPE SHOT!", emoji: "🎯" };
    case "revealEnemyCard": return { type: "reveal", text: "FACT CHECK!", emoji: "👁️" };
    case "forceDiscard": return { type: "discard", text: "DISTRACTION!", emoji: "😈" };
    case "stealPower": return { type: "steal", text: "STOLEN POWER!", emoji: "🖐️" };
    case "buffAdjacent": return { type: "buff", text: "SIGNAL BOOST!", emoji: "📡" };
    case "buffPerCardInLane": return { type: "buff", text: "LOGICAL MIND!", emoji: "🧠" };
    case "buffPerFriendly": return { type: "buff", text: "COMMUNITY BUILDER!", emoji: "🤝" };
    case "buffPerEnemyInLane": return { type: "buff", text: "PROXY POWER!", emoji: "🔌" };
    case "buffWeakest": return { type: "buff", text: "SHILL CAMPAIGN!", emoji: "📢" };
    case "buffOtherLanes": return { type: "buff", text: "UNDERGROUND!", emoji: "🕳️" };
    case "buffIfFewerCards": return { type: "buff", text: "PHILOSOPHICAL STRIKE!", emoji: "🤔" };
    case "addCopyToHand": return { type: "copy", text: "SMART CONTRACT!", emoji: "📜" };
    case "moveCard": return { type: "shuffle", text: "COFFEE RUN!", emoji: "☕" };
    case "buffIfLosing": return { type: "buff", text: "UNDERDOG!", emoji: "🎲" };
    case "timeBomb": return { type: "destroy", text: "BOMB PLANTED!", emoji: "💣" };
    case "parasiteLane": return { type: "steal", text: "PARASITE!", emoji: "🧠" };
    case "kamikaze": return { type: "destroy", text: "KAMIKAZE!", emoji: "💥" };
    case "debuffStrongest": return { type: "snipe", text: "DIRTY TACTICS!", emoji: "🎯" };
    case "buffByRarity": return { type: "buff", text: ability.name?.toUpperCase() || "BUFF!", emoji: "✨" };
    case "buffPerHandSize": return { type: "buff", text: "NFT FLIP!", emoji: "💰" };
    case "buffPerCardsPlayed": return { type: "buff", text: ability.name?.toUpperCase() || "BUFF!", emoji: "📈" };
    case "destroyLoneCard": return { type: "destroy", text: "LONE HUNTER!", emoji: "🎯" };
    case "stealOnSkip": return { type: "steal", text: "STOLEN!", emoji: "🖐️" };
    case "moveRandom": return { type: "shuffle", text: "SHADOW STEP!", emoji: "👤" };
    case "vibefidFirstCast": return { type: "buff", text: "FIRST CAST!", emoji: "📱" };
    case "vibefidReplyGuy": return { type: "buff", text: "REPLY GUY!", emoji: "🔗" };
    case "vibefidVerified": return { type: "buff", text: "VERIFICADO!", emoji: "✨" };
    case "vibefidRatio": return { type: "copy", text: "RATIO!", emoji: "👥" };
    case "vibefidDoxxed": return { type: "steal", text: "DOXXED!", emoji: "🌐" };
    case "systemOverride": return { type: "steal", text: "SYSTEM OVERRIDE!", emoji: "🤖" };
    default:
      if (ability.effect?.value && ability.effect.value > 0) {
        return { type: "buff", text: `+${ability.effect.value} POWER!`, emoji: "⬆️" };
      }
      return null;
  }
};

// Get foil effect description (affects energy cost, not power)
export const getFoilEffect = (foil: string | undefined): { energyDiscount: number; description: string; isFree: boolean } | null => {
  if (!foil || foil === "None" || foil === "none") return null;
  const foilLower = foil.toLowerCase();
  if (foilLower === "standard") {
    return { energyDiscount: 0.5, description: "Standard Foil: 50% energy discount", isFree: false };
  }
  if (foilLower === "prize") {
    return { energyDiscount: 1.0, description: "Prize Foil: 100% energy discount", isFree: false };
  }
  return null;
};

// Helper for foil shimmer visual effect class
export const getFoilClass = (foil: string | undefined) => {
  if (!foil || foil === "None" || foil === "none") return "";
  if (foil === "Prize" || foil === "prize") return "animate-pulse ring-2 ring-yellow-400/50";
  return "ring-1 ring-white/30";
};

// Calculate energy cost for a card (centralized)
export const getEnergyCost = (card: DeckCard): number => {
  let baseCost = 1;
  const rarity = (card.rarity || "").toLowerCase();
  switch (rarity) {
    case "mythic": baseCost = 6; break;
    case "legendary": baseCost = 5; break;
    case "epic": baseCost = 4; break;
    case "rare": baseCost = 3; break;
    case "common": baseCost = 2; break;
    default: baseCost = 1; break;
  }
  const foilEffect = getFoilEffect(card.foil);
  if (!foilEffect) return baseCost;
  return Math.max(1, Math.floor(baseCost * (1 - foilEffect.energyDiscount)));
};

// Get ability type color
export const getAbilityTypeColor = (type: string): string => {
  if (type === "ongoing") return "text-green-400";
  if (type === "active") return "text-pink-400";
  return "text-blue-400";
};

// Get ability type label
export const getAbilityTypeLabel = (type: string, t: (key: string) => string): string => {
  switch (type) {
    case "ongoing": return t('tcgOngoing');
    case "active": return "Active";
    case "onReveal":
    default:
      return t('tcgOnReveal');
  }
};
