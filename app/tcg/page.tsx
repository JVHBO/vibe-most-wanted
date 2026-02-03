"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useProfile } from "@/contexts/ProfileContext";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS";
import { useApproveVBMS } from "@/lib/hooks/useVBMSContracts";
import { CONTRACTS, ERC20_ABI } from "@/lib/contracts";
import { parseEther, formatEther } from "viem";
import { usePlayerCards } from "@/contexts/PlayerCardsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { Id } from "@/convex/_generated/dataModel";
import tcgAbilitiesData from "@/data/tcg-abilities.json";
import tcgCardsData from "@/data/vmw-tcg-cards.json";
import { getCharacterFromImage } from "@/lib/vmw-image-mapping";
import { CardMedia } from "@/components/CardMedia";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type GameView = "lobby" | "deck-builder" | "waiting" | "battle" | "result";

// Collections that can be played in TCG (with 50% power like nothing)
const OTHER_TCG_COLLECTIONS = ["gmvbrs", "cumioh", "viberotbangers", "meowverse", "teampothead", "tarot", "baseballcabal", "poorlydrawnpepes", "viberuto", "vibefx", "historyofcomputer"];

// Card name aliases: onChainName -> baccarat/combo name
// IMPORTANT: Used by detectCombos for matching cards to combos
const CARD_NAME_ALIASES: Record<string, string> = {
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
};

// Helper to resolve card name using aliases
const resolveCardName = (name: string): string => {
  const lower = name.toLowerCase().trim();
  return CARD_NAME_ALIASES[lower] || lower;
};

// Collection cover images - same as Mecha Arena (PokerBattleTable)
const COLLECTION_COVERS: Record<string, string> = {
  vibefid: '/covers/vibefid-cover.png',
  gmvbrs: 'https://nft-cdn.alchemy.com/base-mainnet/d0de7e9fa12eadb1ea2204e67d43e166',
  vibe: 'https://nft-cdn.alchemy.com/base-mainnet/511915cc9b6f20839e2bf2999760530f',
  viberuto: 'https://nft-cdn.alchemy.com/base-mainnet/ec58759f6df558aa4193d58ae9b0e74f',
  meowverse: 'https://nft-cdn.alchemy.com/base-mainnet/16a8f93f75def1a771cca7e417b5d05e',
  poorlydrawnpepes: 'https://nft-cdn.alchemy.com/base-mainnet/96282462557a81c42fad965a48c34f4c',
  teampothead: 'https://nft-cdn.alchemy.com/base-mainnet/ae56485394d1e5f37322d498f0ea11a0',
  tarot: 'https://nft-cdn.alchemy.com/base-mainnet/72ea458dbad1ce6a722306d811a42252',
  baseballcabal: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2F45e455d7-cd23-459b-7ea9-db14c6d36000%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  vibefx: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2F5e6058d2-4c64-4cd9-ab57-66a939fec900%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  historyofcomputer: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2Fa1a0d189-44e1-43e3-60dc-e8b053ec0c00%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  cumioh: '/covers/cumioh-cover.png',
  viberotbangers: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fnft-cdn.alchemy.com%2Fbase-mainnet%2F1269ebe2e27ff8a041cb7253fb5687b6',
};

// Get collection cover image URL (same as Mecha Arena)
const getCollectionCoverUrl = (collection: string | undefined, rarity: string): string => {
  const collectionKey = collection?.toLowerCase() || "vibe";
  return COLLECTION_COVERS[collectionKey] || '/images/card-back.png';
};

interface TCGCard {
  type: "vbms" | "nothing" | "vibefid" | "other";
  cardId: string;
  name?: string;
  rarity: string;
  power: number;
  imageUrl: string;
  foil?: string;
  wear?: string;
  collection?: string;
}

interface DeckCard extends TCGCard {
  selected?: boolean;
  // Ability markers (used internally during turn processing)
  _bombTurn?: number;    // Time Bomb: turn when bomb explodes
  _bombLane?: number;    // Time Bomb: lane where bomb is
  _sacrificed?: boolean; // Sacrifice: card should be removed
}

interface GameAction {
  type: "play" | "sacrifice-hand" | "sacrifice-lane";
  cardIndex: number;
  targetLane?: number;
  targetCardIndex?: number;
}

interface TCGAbility {
  name: string;
  type: "onReveal" | "ongoing" | "active";
  description: string;
  effect: Record<string, any>;
  rarity: string;
}

interface GameLane {
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

interface CardPlayedInfo {
  cardId: string;
  laneIndex: number;
  energyCost: number;
  hadOnReveal: boolean;
}

interface PvEGameState {
  currentTurn: number;
  energy: number;
  cpuEnergy: number;
  bonusEnergy: number;
  cardsPlayedThisTurn: number;
  cardsPlayedInfo: CardPlayedInfo[];
  phase: string;
  playerHand: DeckCard[];
  playerDeckRemaining: DeckCard[];
  cpuHand: DeckCard[];
  cpuDeckRemaining: DeckCard[];
  lanes: GameLane[];
  playerConfirmed: boolean;
  gameOver: boolean;
  winner: string | null;
  tiebreaker?: { type: string; playerPower: number; cpuPower: number } | null;
  auraRewarded?: boolean;
}

// Abilities map from JSON
const tcgAbilities: Record<string, TCGAbility> = tcgAbilitiesData.abilities as Record<string, TCGAbility>;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TCG_CONFIG = {
  LANES: 3,
  CARDS_PER_LANE: 4,
  HAND_SIZE: 5,
  DECK_SIZE: 12,
  MIN_VBMS_OR_VIBEFID: 5, // Minimum 5 VBMS/VibeFID cards
  MAX_NOTHING: 7, // Max 7 Nothing/Other cards
  MAX_VIBEFID: 1, // Only 1 VibeFID card allowed per deck
  TURN_TIME_SECONDS: 35,
  TOTAL_TURNS: 6,
  STARTING_ENERGY: 3,
  ENERGY_PER_TURN: 1,
  MAX_ENERGY: 10,
  ABILITY_DELAY_MS: 900,
};

// ═══════════════════════════════════════════════════════════════════════════════
// GAME PHASES & ORDER SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
//
// TURN STRUCTURE:
// 1. PLAY PHASE    - Player places cards (15 seconds)
// 2. REVEAL PHASE  - In PvP: both players' cards revealed simultaneously
// 3. ABILITY PHASE - OnReveal abilities resolve in ORDER (by energy cost, lower first)
// 4. ONGOING PHASE - Ongoing effects are always active
// 5. RESOLVE PHASE - Final power calculation, turn ends
//
// ABILITY ORDER RULES:
// - OnReveal: Triggers WHEN card is played, in order by energy cost
// - Ongoing: Passive effect, always active while card is in lane
// - Lower energy cost cards resolve FIRST
// - If same cost: Player's card resolves before CPU's card
// - Combos check after all individual abilities resolve
//
type GamePhase = "play" | "reveal" | "ability" | "ongoing" | "resolve";

const PHASE_NAMES: Record<GamePhase, string> = {
  play: "🎴 PLAY PHASE",
  reveal: "👁️ REVEAL",
  ability: "⚡ ABILITIES",
  ongoing: "🔄 ONGOING",
  resolve: "📊 RESOLVE",
};

const RARITY_COLORS: Record<string, string> = {
  Common: "border-gray-500 text-gray-400",
  Rare: "border-blue-500 text-blue-400",
  Epic: "border-purple-500 text-purple-400",
  Legendary: "border-yellow-500 text-yellow-400",
  Mythic: "border-red-500 text-red-400",
};

// Fun lane names for battles - NO EFFECTS, pure card power battles
const LANE_NAMES = [
  { name: "Lane 1", effect: "", description: "" },
  { name: "Lane 2", effect: "", description: "" },
  { name: "Lane 3", effect: "", description: "" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CARD COMBOS
// ═══════════════════════════════════════════════════════════════════════════════

interface CardCombo {
  id: string;
  name: string;
  emoji: string;
  cards: string[]; // Card names that trigger the combo (need all of them)
  minCards?: number; // If set, only need this many of the cards (any combination)
  bonus: {
    type: "power" | "power_percent" | "steal" | "draw" | "energy";
    value: number;
    target: "self" | "lane" | "all_lanes" | "enemy_lane";
  };
  description: string;
}

// Mapping from combo.id to translation key base
const COMBO_TRANSLATION_KEYS: Record<string, string> = {
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
  // Synergy combos (from card descriptions)
  parallel: "tcgComboParallel",
  royal_brothers: "tcgComboRoyalBrothers",
  philosopher_chad: "tcgComboPhilosopherChad",
  scaling_masters: "tcgComboScalingMasters",
  christmas_spirit: "tcgComboChristmasSpirit",
  shadow_network: "tcgComboShadowNetwork",
  pixel_artists: "tcgComboPixelArtists",
  dirty_money: "tcgComboDirtyMoney",
};

const CARD_COMBOS: CardCombo[] = [
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

// Combo detection cache for performance
const comboCache = new Map<string, { combo: CardCombo; matchedCards: string[]; wildcardsUsed: number }[]>();

// Detect combos in a set of cards (memoized)
const detectCombos = (cards: DeckCard[]): { combo: CardCombo; matchedCards: string[]; wildcardsUsed: number }[] => {
  // Create cache key from sorted card names + types (for vibefid wildcard)
  const cacheKey = cards.map(c => `${resolveCardName(c.name || "")}:${c.type}`).sort().join("|");

  // Return cached result if available
  const cached = comboCache.get(cacheKey);
  if (cached) return cached;

  const activeCombos: { combo: CardCombo; matchedCards: string[]; wildcardsUsed: number }[] = [];
  // Apply aliases to card names for proper matching!
  const cardNames = cards.map(c => resolveCardName(c.name || ""));

  // VibeFID cards act as wildcards - can substitute any card in a combo
  const vibefidCount = cards.filter(c => c.type === "vibefid").length;

  for (const combo of CARD_COMBOS) {
    const comboCardsLower = combo.cards.map(c => c.toLowerCase());
    const matchedCards = comboCardsLower.filter(cc => cardNames.includes(cc));

    const requiredCount = combo.minCards || combo.cards.length;

    // Use VibeFID as wildcards to complete combos
    const wildcardsNeeded = Math.max(0, requiredCount - matchedCards.length);
    const wildcardsAvailable = Math.min(vibefidCount, wildcardsNeeded);
    const effectiveMatches = matchedCards.length + wildcardsAvailable;

    if (effectiveMatches >= requiredCount) {
      activeCombos.push({ combo, matchedCards, wildcardsUsed: wildcardsAvailable });
    }
  }

  // Cache result (limit cache size to prevent memory issues)
  if (comboCache.size > 100) comboCache.clear();
  comboCache.set(cacheKey, activeCombos);

  return activeCombos;
};

// Calculate combo bonus for a specific card
// vibefidChoices: Record<string, string> - maps "laneIndex-cardId" to chosen comboId
// laneIndex: optional, used to filter combos by vibefid choices
// RULE: Only ONE combo per lane is active
const getComboBonus = (card: DeckCard, allCardsInLane: DeckCard[], allLanes?: any[], vibefidChoices?: Record<string, string>, laneIndex?: number): number => {
  let combos = detectCombos(allCardsInLane);
  if (combos.length === 0) return 0;

  let totalBonus = 0;
  // Use resolved name to match against combo cards
  const cardNameResolved = resolveCardName(card.name || "");

  // ONLY ONE COMBO PER LANE - filter to single combo
  if (vibefidChoices && laneIndex !== undefined) {
    const vibefidCards = allCardsInLane.filter(c => c.type === "vibefid");
    const chosenComboIds = vibefidCards
      .map(c => vibefidChoices[`${laneIndex}-${c.cardId}`])
      .filter(Boolean);

    if (chosenComboIds.length > 0) {
      // VibeFID choice exists - ONLY that combo is active
      const chosenCombo = combos.find(({ combo }) => chosenComboIds.includes(combo.id));
      combos = chosenCombo ? [chosenCombo] : [];
    } else {
      // No VibeFID choice - only first combo
      combos = [combos[0]];
    }
  } else {
    // No choices tracking - only first combo
    combos = [combos[0]];
  }

  for (const { combo, matchedCards } of combos) {
    // Check if this card is part of the combo
    if (matchedCards.includes(cardNameResolved)) {
      if (combo.bonus.target === "self" || combo.bonus.target === "lane") {
        if (combo.bonus.type === "power") {
          totalBonus += combo.bonus.value;
        } else if (combo.bonus.type === "power_percent") {
          // Percentage bonus will be calculated separately
          totalBonus += Math.floor(card.power * (combo.bonus.value / 100));
        }
      }
    }
    // Lane-wide bonus (apply to all cards in lane, not just combo cards)
    if (combo.bonus.target === "lane" && combo.bonus.type === "power") {
      // Only apply once per card
      if (!matchedCards.includes(cardNameResolved)) {
        totalBonus += Math.floor(combo.bonus.value / allCardsInLane.length);
      }
    }
  }

  return totalBonus;
};

// Get steal amount from combos (negative power to enemies)
// RULE: Only ONE combo per lane is active
const getComboSteal = (playerCards: DeckCard[], vibefidChoices?: Record<string, string>, laneIndex?: number): number => {
  let combos = detectCombos(playerCards);
  if (combos.length === 0) return 0;

  // ONLY ONE COMBO PER LANE - filter to single combo
  if (vibefidChoices && laneIndex !== undefined) {
    const vibefidCards = playerCards.filter(c => c.type === "vibefid");
    const chosenComboIds = vibefidCards
      .map(c => vibefidChoices[`${laneIndex}-${c.cardId}`])
      .filter(Boolean);

    if (chosenComboIds.length > 0) {
      // VibeFID choice exists - ONLY that combo is active
      const chosenCombo = combos.find(({ combo }) => chosenComboIds.includes(combo.id));
      combos = chosenCombo ? [chosenCombo] : [];
    } else {
      // No VibeFID choice - only first combo
      combos = [combos[0]];
    }
  } else {
    // No choices tracking - only first combo
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

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: VBMS Card Image URL
// ═══════════════════════════════════════════════════════════════════════════════

// Build baccarat image URL for VBMS cards (global helper)
const getVbmsBaccaratImageUrl = (cardName: string): string | null => {
  if (!cardName) return null;
  const nameLower = cardName.toLowerCase();
  const allCards = tcgCardsData.cards || [];
  const aliases = (tcgCardsData as any).aliases || {};

  // Check if name is an alias first (e.g., "deployer" -> "0xdeployer")
  const resolvedName = Object.entries(aliases).find(
    ([alias]) => alias.toLowerCase() === nameLower
  )?.[1] as string || nameLower;

  // Find card by onChainName or baccarat name (using resolved name)
  const cardData = allCards.find((c: any) =>
    c.onChainName?.toLowerCase() === resolvedName.toLowerCase() ||
    c.baccarat?.toLowerCase() === resolvedName.toLowerCase() ||
    c.onChainName?.toLowerCase() === nameLower ||
    c.baccarat?.toLowerCase() === nameLower
  );

  if (!cardData || !cardData.suit || !cardData.rank) return null;

  // Get baccarat name (use alias if exists, or baccarat field, or onChainName)
  const baccaratName = aliases[cardData.onChainName] || cardData.baccarat?.toLowerCase() || cardData.onChainName?.toLowerCase();

  // Special case for neymar (joker)
  if (baccaratName === "neymar" || cardData.rank?.includes("?")) {
    return "/images/baccarat/joker, neymar.png";
  }

  // Build rank name
  const rankMap: Record<string, string> = {
    'A': 'ace', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
    '7': '7', '8': '8', '9': '9', '10': '10', 'J': 'jack', 'Q': 'queen', 'K': 'king'
  };
  const rankName = rankMap[cardData.rank] || cardData.rank;

  return `/images/baccarat/${rankName} ${cardData.suit}, ${baccaratName}.png`;
};

// Get the correct display image URL for any card
// - VBMS (vibe most wanted): Use baccarat image
// - All other collections: Use actual card image
const getCardDisplayImageUrl = (card: DeckCard): string => {
  if (card.type === "vbms" && card.name) {
    return getVbmsBaccaratImageUrl(card.name) || card.imageUrl || "/images/card-back.png";
  }
  // For all other collections (nothing, vibefid, etc), use actual card image
  return card.imageUrl || "/images/card-back.png";
};

// ═══════════════════════════════════════════════════════════════════════════════
// SOUND EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════

// Store current BGM audio to stop on game restart
let currentBgmAudio: HTMLAudioElement | null = null;
let allBgmAudios: HTMLAudioElement[] = []; // Track all BGM audios created

const stopBgm = () => {
  // Helper to aggressively stop an audio element
  const killAudio = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    try {
      audio.pause();
      audio.muted = true;
      audio.volume = 0;
      audio.currentTime = 0;
      audio.src = ""; // Force release
      audio.load(); // Reset the audio element
    } catch (e) {}
  };

  // Stop the tracked BGM
  killAudio(currentBgmAudio);
  currentBgmAudio = null;

  // Also stop all tracked BGM audios (backup)
  allBgmAudios.forEach(audio => killAudio(audio));
  allBgmAudios = [];
};

// Track last played sounds to prevent overlap
let lastSoundTime: Record<string, number> = {};
const SOUND_COOLDOWN_MS = 150; // Minimum time between same sound type

const playSound = (type: "card" | "turn" | "ability" | "victory" | "defeat" | "select" | "combo" | "error" | "tick" | "buff" | "debuff" | "destroy" | "steal" | "draw" | "energy" | "shuffle" | "heal" | "shield" | "bomb" | "hit" | "damage") => {
  if (typeof window === "undefined") return;

  // Prevent same sound from playing too quickly (overlap prevention)
  const now = Date.now();
  if (lastSoundTime[type] && now - lastSoundTime[type] < SOUND_COOLDOWN_MS) {
    return; // Skip - sound played too recently
  }
  lastSoundTime[type] = now;

  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const audioCtx = new AudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  switch (type) {
    case "card":
      // Card play: quick swoosh sound
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
      break;

    case "select":
      // Card select: soft click
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.05);
      break;

    case "turn":
      // Turn end: deeper confirmation sound
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(500, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
      break;

    case "ability":
      // Generic ability: magical sparkle (fallback)
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
      break;

    case "buff":
      // Buff: ascending sparkle (positive power up)
      const playBuffNote = (freq: number, delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.1);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.1);
      };
      playBuffNote(523, 0);     // C5
      playBuffNote(659, 0.06);  // E5
      playBuffNote(784, 0.12);  // G5
      return;

    case "debuff":
      // Debuff: descending dark tone (damage/weaken)
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.25);
      break;

    case "destroy":
      // Destroy: explosive boom
      const playBoom = (freq: number, delay: number, dur: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + delay + dur);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + dur);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + dur);
      };
      playBoom(150, 0, 0.3);
      playBoom(100, 0.05, 0.25);
      return;

    case "steal":
      // Steal: quick swoosh grab
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
      break;

    case "draw":
      // Draw: card shuffle/flip
      const playFlip = (delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + delay + 0.05);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.08);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.08);
      };
      playFlip(0);
      playFlip(0.08);
      return;

    case "energy":
      // Energy: power charging hum
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.2);
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime + 0.25);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
      break;

    case "shuffle":
      // Shuffle: chaos/randomize
      const playShuffle = (freq: number, delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        osc.frequency.setValueAtTime(freq * 0.7, audioCtx.currentTime + delay + 0.03);
        osc.frequency.setValueAtTime(freq * 1.2, audioCtx.currentTime + delay + 0.06);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.1);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.1);
      };
      playShuffle(400, 0);
      playShuffle(600, 0.08);
      playShuffle(300, 0.16);
      return;

    case "shield":
      // Shield: protective hum
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(350, audioCtx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
      break;

    case "bomb":
      // Bomb: ticking then boom
      const playTick2 = (delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime + delay);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.05);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.05);
      };
      playTick2(0);
      playTick2(0.1);
      playTick2(0.2);
      // Final boom
      setTimeout(() => playSound("destroy"), 250);
      return;

    case "heal":
      // Heal: gentle ascending chime
      const playHeal = (freq: number, delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.15);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.15);
      };
      playHeal(880, 0);
      playHeal(1047, 0.1);
      playHeal(1319, 0.2);
      return;

    case "victory":
      // Victory: use actual victory music file (plays once)
      try {
        stopBgm(); // Stop any previous BGM
        const victoryAudio = new Audio("/sounds/victory.mp3");
        victoryAudio.volume = 0.6;
        currentBgmAudio = victoryAudio; // Save reference to stop later
        allBgmAudios.push(victoryAudio); // Also track in array for backup cleanup
        victoryAudio.play().catch(() => {});
      } catch {
        // Fallback to synthesized sound
        const playVictoryNote = (freq: number, delay: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.2);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + 0.2);
        };
        playVictoryNote(523, 0);
        playVictoryNote(659, 0.15);
        playVictoryNote(784, 0.3);
        playVictoryNote(1047, 0.45);
      }
      return;

    case "defeat":
      // Defeat: use actual defeat music file
      try {
        stopBgm(); // Stop any previous BGM
        const defeatAudio = new Audio("/sounds/defeat.mp3");
        defeatAudio.volume = 0.6;
        currentBgmAudio = defeatAudio; // Save reference to stop later
        allBgmAudios.push(defeatAudio); // Also track in array for backup cleanup
        defeatAudio.play().catch(() => {});
      } catch {
        // Fallback to synthesized sound
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
      }
      return;

    case "combo":
      // Combo: EPIC announcer-style power chord with dramatic buildup
      const playComboChord = (freqs: number[], delay: number, duration: number, vol: number) => {
        freqs.forEach(freq => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          gain.gain.setValueAtTime(vol, audioCtx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + duration);
        });
      };
      // Dramatic intro hit
      playComboChord([150, 300], 0, 0.15, 0.4);
      // Rising power chord
      playComboChord([200, 400, 600], 0.1, 0.2, 0.35);
      // Epic climax chord
      playComboChord([300, 450, 600, 900], 0.25, 0.4, 0.45);
      // Sparkle finish
      const sparkle = (freq: number, d: number) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = "sine";
        o.frequency.setValueAtTime(freq, audioCtx.currentTime + d);
        g.gain.setValueAtTime(0.2, audioCtx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + d + 0.1);
        o.start(audioCtx.currentTime + d);
        o.stop(audioCtx.currentTime + d + 0.1);
      };
      sparkle(1200, 0.5);
      sparkle(1500, 0.55);
      sparkle(1800, 0.6);
      return;

    case "error":
      // Error: buzzer/rejection sound
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(100, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
      break;

    case "tick":
      // Tick: urgent countdown beep
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.08);
      break;

    case "hit":
      // Hit: use actual attack sound file
      try {
        const attackAudio = new Audio("/sounds/attack.mp3");
        attackAudio.volume = 0.3;
        attackAudio.play().catch(() => {});
      } catch {
        // Fallback to synthesized sound
        const playHit = (freq: number, delay: number, dur: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.3, audioCtx.currentTime + delay + dur);
          gain.gain.setValueAtTime(0.35, audioCtx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + dur);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + dur);
        };
        playHit(200, 0, 0.1);
        playHit(100, 0.02, 0.15);
      }
      return;

    case "damage":
      // Damage: SE_158 hit sound
      try {
        const damageAudio = new Audio("/sounds/hit.mp3");
        damageAudio.volume = 0.3;
        damageAudio.play().catch(() => {});
      } catch {
        // Fallback synthesized thud
        const playImpact = (freq: number, delay: number, type: OscillatorType = "sawtooth") => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = type;
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.3, audioCtx.currentTime + delay + 0.12);
          gain.gain.setValueAtTime(0.5, audioCtx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.15);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + 0.15);
        };
        playImpact(120, 0, "sawtooth");
        playImpact(80, 0.02, "triangle");
        playImpact(200, 0.01, "square");
      }
      return;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMBO VOICE AUDIO
// ═══════════════════════════════════════════════════════════════════════════════

// Mapping from combo ID to audio file name
const COMBO_VOICE_FILES: Record<string, string> = {
  romero_family: "romero.mp3",
  crypto_kings: "cryptokings.mp3",
  mythic_assembly: "mythic.mp3",
  legends_unite: "legends_unite.mp3",
  ai_bros: "ai_takeover.mp3",
  scam_squad: "scam_squad.mp3",
  degen_trio: "degen_trio.mp3",
  vibe_team: "vibe_team.mp3",
  dirty_duo: "dirty_duo.mp3",
  code_masters: "code_masters.mp3",
  content_creators: "content_creators.mp3",
  chaos_agents: "chaos_agents.mp3",
  sniper_support: "sniper_elite.mp3",
  money_makers: "money_makers.mp3",
  underdog_uprising: "underdog_uprising.mp3",
  parallel: "PARALLEL.mp3",
  royal_brothers: "royal_brothers.mp3",
  philosopher_chad: "philosopher_chad.mp3",
  scaling_masters: "scaling_masters.mp3",
  christmas_spirit: "christmas_spirit.mp3",
  shadow_network: "shadow_network.mp3",
  pixel_artists: "pixel_artists.mp3",
  dirty_money: "dirty_money.mp3",
};

// Play combo voice announcement
const playComboVoice = (comboId: string) => {
  if (typeof window === "undefined") return;

  const audioFile = COMBO_VOICE_FILES[comboId];
  if (!audioFile) return; // No voice for this combo

  try {
    const audio = new Audio(`/sounds/combos/${audioFile}`);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    // Silently fail if audio can't play
  }
};

// Meme sounds for profile menu
const playMemeSound = (type: "mechaArena" | "ggez" | "bruh" | "emotional" | "wow") => {
  if (typeof window === "undefined") return;

  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  const audioCtx = new AudioContext();

  const playNote = (freq: number, delay: number, duration: number, type: OscillatorType = "sine", gain: number = 0.3) => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
    gainNode.gain.setValueAtTime(gain, audioCtx.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
  };

  switch (type) {
    case "mechaArena":
      // Epic mecha power-up sound (robotic ascending tones)
      playNote(150, 0, 0.15, "sawtooth", 0.4);
      playNote(200, 0.1, 0.15, "sawtooth", 0.4);
      playNote(300, 0.2, 0.15, "square", 0.3);
      playNote(400, 0.3, 0.15, "square", 0.3);
      playNote(600, 0.4, 0.2, "sawtooth", 0.5);
      playNote(800, 0.5, 0.3, "sawtooth", 0.4);
      playNote(1000, 0.6, 0.4, "sine", 0.3);
      break;

    case "ggez":
      // Taunting "GG EZ" jingle
      playNote(523, 0, 0.1, "square", 0.3);
      playNote(659, 0.1, 0.1, "square", 0.3);
      playNote(784, 0.2, 0.1, "square", 0.3);
      playNote(659, 0.35, 0.1, "square", 0.3);
      playNote(523, 0.45, 0.15, "square", 0.3);
      break;

    case "bruh":
      // Deep "bruh" descending tone
      playNote(200, 0, 0.1, "sawtooth", 0.5);
      playNote(150, 0.1, 0.15, "sawtooth", 0.4);
      playNote(100, 0.25, 0.2, "sawtooth", 0.3);
      playNote(80, 0.45, 0.3, "sawtooth", 0.2);
      break;

    case "emotional":
      // Emotional damage meme sound
      playNote(440, 0, 0.15, "sine", 0.3);
      playNote(415, 0.15, 0.15, "sine", 0.3);
      playNote(392, 0.3, 0.15, "sine", 0.3);
      playNote(349, 0.45, 0.3, "sine", 0.4);
      playNote(330, 0.75, 0.5, "sine", 0.3);
      break;

    case "wow":
      // MLG "wow" ascending
      playNote(300, 0, 0.1, "sine", 0.4);
      playNote(400, 0.08, 0.1, "sine", 0.4);
      playNote(500, 0.16, 0.1, "sine", 0.4);
      playNote(700, 0.24, 0.15, "sine", 0.5);
      playNote(900, 0.35, 0.2, "sine", 0.4);
      playNote(1100, 0.5, 0.3, "sine", 0.3);
      break;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function TCGPage() {
  const router = useRouter();
  const convex = useConvex();
  const { address, isConnected } = useAccount();
  const { userProfile } = useProfile();
  const { nfts, isLoading: cardsLoading, loadNFTs, status } = usePlayerCards();
  const { t, lang } = useLanguage();

  // VBMS onchain balance & transfer hooks
  const { balance: vbmsBalance, refetch: refetchVBMS } = useFarcasterVBMSBalance(address);
  const { approve: approveVBMS, isPending: isApproving } = useApproveVBMS();
  const { writeContractAsync: writeTransfer, isPending: isTransferring } = useWriteContract();
  const [poolTxStep, setPoolTxStep] = useState<"idle" | "approving" | "transferring" | "done" | "error">("idle");

  // Load NFTs when wallet connects
  useEffect(() => {
    if (address && status === 'idle') {
      loadNFTs();
    }
  }, [address, status, loadNFTs]);

  // Cleanup BGM on unmount (when leaving TCG page)
  useEffect(() => {
    return () => {
      stopBgm();
    };
  }, []);

  // Game state
  const [view, setView] = useState<GameView>("lobby");

  // Stop BGM when leaving result view
  useEffect(() => {
    if (view !== "result") {
      stopBgm();
    }
  }, [view]);
  const currentBgmRef = useRef<HTMLAudioElement | null>(null); // Track BGM to stop on restart
  const [currentMatchId, setCurrentMatchId] = useState<Id<"tcgMatches"> | null>(null);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Deck builder state
  const [selectedCards, setSelectedCards] = useState<DeckCard[]>([]);
  const [deckName, setDeckName] = useState("My Deck");
  const [deckSortBy, setDeckSortBy] = useState<"power" | "rarity">("power");
  const [deckSortDesc, setDeckSortDesc] = useState(true); // true = highest first

  // Deck builder pagination
  const CARDS_PER_PAGE = 12;
  const [vbmsPage, setVbmsPage] = useState(0);
  const [vibefidPage, setVibefidPage] = useState(0);
  const [othersPage, setOthersPage] = useState(0);

  // Battle state
  const [pendingActions, setPendingActions] = useState<GameAction[]>([]);
  const [selectedHandCard, setSelectedHandCard] = useState<number | null>(null);

  // Card detail modal state
  const [detailCard, setDetailCard] = useState<DeckCard | null>(null);
  const [detailCombo, setDetailCombo] = useState<CardCombo | null>(null);

  // PvE state (local, no Convex)
  const [isPvE, setIsPvE] = useState(false);
  const [pveGameState, setPveGameState] = useState<PvEGameState | null>(null);
  const [showTiebreakerAnimation, setShowTiebreakerAnimation] = useState(false);
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [dragOverLane, setDragOverLane] = useState<number | null>(null);
  const [touchDragPos, setTouchDragPos] = useState<{ x: number; y: number } | null>(null);
  const [draggedLaneCard, setDraggedLaneCard] = useState<{ laneIndex: number; cardIndex: number } | null>(null);
  const [dragOverHand, setDragOverHand] = useState(false);
  const laneRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const wasDraggingRef = useRef(false);
  const [showBattleIntro, setShowBattleIntro] = useState(false);
  const [showDefeatBait, setShowDefeatBait] = useState(false);
  const [autoMatch, setAutoMatch] = useState(false); // Auto replay mode for PvE
  const [dailyBattles, setDailyBattles] = useState(0); // Track daily battles
  const REWARDED_BATTLES_PER_DAY = 5; // First 5 battles give AURA reward
  const BATTLE_AURA_REWARD = 85; // AURA reward per win (first 5 daily)

  // PvP animation state - track previous game state to detect changes
  const prevPvPGameStateRef = useRef<any>(null);
  const [pvpPowerChanges, setPvpPowerChanges] = useState<Record<string, number>>({});
  const [pvpCardAnimClass, setPvpCardAnimClass] = useState<Record<string, string>>({});

  // Battle Log
  type BattleLogEntry = { turn: number; player: "you" | "cpu" | "opponent"; action: string; lane: number; cardName: string };
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [showBattleLog, setShowBattleLog] = useState(false);

  // TCG match count for missions
  const [tcgMatchCount, setTcgMatchCount] = useState(0);
  const [tcgWinStreak, setTcgWinStreak] = useState(0);

  // Turn timer state
  const [turnTimeRemaining, setTurnTimeRemaining] = useState(TCG_CONFIG.TURN_TIME_SECONDS);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handlePvEEndTurnRef = useRef<() => void>(() => {}); // Ref to avoid stale closure in timer
  const handleSubmitTurnRef = useRef<() => void>(() => {}); // Ref for PvP timer
  const handlePvPSubmitTurnRef = useRef<() => void>(() => {}); // Ref for PvP auto-submit

  // Game phase state - tracks current phase of turn resolution
  const [currentPhase, setCurrentPhase] = useState<GamePhase>("play");
  const [abilityQueue, setAbilityQueue] = useState<{
    card: DeckCard;
    laneIndex: number;
    side: "player" | "cpu";
    ability: any;
  }[]>([]);
  const [currentAbilityIndex, setCurrentAbilityIndex] = useState(-1);
  const [isResolvingAbilities, setIsResolvingAbilities] = useState(false);

  // Sequential reveal state - for animated card reveals
  const [revealQueue, setRevealQueue] = useState<{
    laneIdx: number;
    side: "player" | "cpu";
    cardIdx: number;
    card: DeckCard;
  }[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const pendingRevealDataRef = useRef<{
    cpuHand: DeckCard[];
    cpuDeckRemaining: DeckCard[];
    cpuSkipped: boolean;
  } | null>(null);

  // Profile dropdown state
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Lobby tab state
  const [lobbyTab, setLobbyTab] = useState<"play" | "rules" | "leaderboard">("play");

  // Defense Pool state
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [selectedPoolTier, setSelectedPoolTier] = useState(10000);

  // Attack confirmation modal state
  const [attackConfirmTarget, setAttackConfirmTarget] = useState<{
    address: string;
    username: string;
    deckName: string;
    poolAmount: number;
    attackFee: number;
  } | null>(null);

  // Matchmaking state
  const [isSearching, setIsSearching] = useState(false);
  const [searchElapsed, setSearchElapsed] = useState(0);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Staked match state (PvE local with stake tracking)
  const [stakedMatchInfo, setStakedMatchInfo] = useState<{
    matchId: Id<"tcgMatches"> | null;
    stakeAmount: number;
    opponentUsername: string;
    isCpu: boolean;
  } | null>(null);

  // Visual effects state - expanded for many abilities
  const [visualEffect, setVisualEffect] = useState<{
    type: "explosion" | "play" | "buff" | "debuff" | "draw" | "prize" | "destroy" | "steal" | "shuffle" | "copy" | "snipe" | "king" | "charm" | "reveal" | "shield" | "discard" | null;
    laneIndex?: number;
    position?: { x: number; y: number };
    text?: string;
    emoji?: string;
  } | null>(null);

  // Card-specific animations (shake, glow, power change, etc.)
  const [cardAnimations, setCardAnimations] = useState<{
    [key: string]: { // key = "lane-side-idx" e.g. "0-player-2"
      type: "shake" | "glow-green" | "glow-red" | "slide-out" | "spin" | "pulse" | "float-up" | "explode";
      powerChange?: number;
    };
  }>({});

  // Flying card animation - shows a card moving from one place to another
  const [flyingCard, setFlyingCard] = useState<{
    card: DeckCard;
    fromLane: number;
    fromSide: "player" | "cpu";
    toLane: number;
    toSide: "player" | "cpu";
    action: "kamikaze" | "charm" | "steal";
  } | null>(null);

  // VibeFID combo selection modal state
  const [vibefidComboModal, setVibefidComboModal] = useState<{
    laneIndex: number;
    card: DeckCard;
    possibleCombos: { combo: CardCombo; partnerCard: string }[];
  } | null>(null);

  // Track which combo VibeFID should activate per lane (key = laneIndex-cardId)
  const [vibefidComboChoices, setVibefidComboChoices] = useState<Record<string, string>>({});

  // Track combos already triggered this reveal phase to avoid duplicate sounds
  const shownCombosRef = useRef<Set<string>>(new Set());

  // Ability effect animation - shows attack/buff effect going from source to target
  const [abilityEffectAnim, setAbilityEffectAnim] = useState<{
    type: "attack" | "buff" | "steal" | "destroy";
    sourceLane: number;
    sourceSide: "player" | "cpu";
    targetLane: number;
    targetSide: "player" | "cpu";
    emoji: string;
    powerChange?: number;
  } | null>(null);

  // Helper to trigger card animation
  const triggerCardAnimation = (laneIdx: number, side: "player" | "cpu", cardIdx: number, type: string, powerChange?: number, duration = 800) => {
    const key = `${laneIdx}-${side}-${cardIdx}`;
    setCardAnimations(prev => ({ ...prev, [key]: { type: type as any, powerChange } }));
    setTimeout(() => {
      setCardAnimations(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }, duration);
  };

  // Trigger animations for all cards in a lane
  const triggerLaneAnimation = (laneIdx: number, side: "player" | "cpu", type: string, cards: any[], powerChange?: number) => {
    cards.forEach((_, idx) => {
      setTimeout(() => triggerCardAnimation(laneIdx, side, idx, type, powerChange), idx * 100);
    });
  };

  // Trigger ability effect animation (attack/buff going from source to target)
  const triggerAbilityEffect = (
    type: "attack" | "buff" | "steal" | "destroy",
    sourceLane: number,
    sourceSide: "player" | "cpu",
    targetLane: number,
    targetSide: "player" | "cpu",
    emoji: string,
    powerChange?: number,
    duration = 800
  ) => {
    setAbilityEffectAnim({ type, sourceLane, sourceSide, targetLane, targetSide, emoji, powerChange });
    setTimeout(() => setAbilityEffectAnim(null), duration);
  };

  // Convex queries
  const activeDeck = useQuery(
    api.tcg.getActiveDeck,
    address ? { address } : "skip"
  );
  const playerDecks = useQuery(
    api.tcg.getPlayerDecks,
    address ? { address } : "skip"
  );
  const waitingRooms = useQuery(api.tcg.getWaitingRooms, {});
  const currentMatch = useQuery(
    api.tcg.getMatchById,
    currentMatchId ? { matchId: currentMatchId } : "skip"
  );

  // Opponent profile (for PFP in PvP battle)
  const opponentAddress = currentMatch
    ? (currentMatch.player1Address === address?.toLowerCase()
      ? currentMatch.player2Address
      : currentMatch.player1Address)
    : undefined;
  const opponentProfile = useQuery(
    api.profiles.getProfile,
    opponentAddress ? { address: opponentAddress } : "skip"
  );

  // Convex mutations
  const createMatch = useMutation(api.tcg.createMatch);
  const joinMatch = useMutation(api.tcg.joinMatch);
  const saveDeck = useMutation(api.tcg.saveDeck);
  const submitActions = useMutation(api.tcg.submitActions);
  const cancelMatch = useMutation(api.tcg.cancelMatch);
  const forfeitMatch = useMutation(api.tcg.forfeitMatch);
  const heartbeatMutation = useMutation(api.tcg.heartbeat);
  const claimVictoryByTimeout = useMutation(api.tcg.claimVictoryByTimeout);
  const awardPvECoins = useMutation(api.economy.awardPvECoins);
  const autoMatchMutation = useMutation(api.tcg.autoMatch);
  const setDefenseDeckMutation = useMutation(api.tcg.setDefenseDeck);
  const markTcgMission = useMutation(api.tcg.markTcgMission);
  const setDefensePoolMutation = useMutation(api.tcg.setDefensePool);
  const withdrawDefensePoolMutation = useMutation(api.tcg.withdrawDefensePool);
  const autoMatchWithStakeMutation = useMutation(api.tcg.autoMatchWithStake);
  const finishStakedMatchMutation = useMutation(api.tcg.finishStakedMatch);
  const searchMatchMutation = useMutation(api.tcg.searchMatch);
  const cancelSearchMutation = useMutation(api.tcg.cancelSearch);
  const createMatchFromMatchmakingMutation = useMutation(api.tcg.createMatchFromMatchmaking);
  const deleteDeckMutation = useMutation(api.tcg.deleteDeck);

  // Defense pool queries
  const defenseLeaderboard = useQuery(api.tcg.getDefenseLeaderboard, { limit: 50 });
  const myDefensePool = useQuery(api.tcg.getMyDefensePool, address ? { address } : "skip");

  // Username
  const username = userProfile?.username || address?.slice(0, 8) || "Anon";

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  const shuffleDeck = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // ABILITY ORDER SYSTEM - Sort abilities by rarity cost (lower first)
  // ═══════════════════════════════════════════════════════════════════════════════

  // Get rarity-based priority cost for ability resolution order
  const getRarityCost = (card: DeckCard): number => {
    const rarity = (card.rarity || "common").toLowerCase();
    switch (rarity) {
      case "mythic": return 6;
      case "legendary": return 5;
      case "epic": return 4;
      case "rare": return 3;
      case "common": return 2;
      default: return 1; // Nothing cards
    }
  };

  // Sort cards by resolution order: Lane 1 → 2 → 3, dice roll per lane
  // Matches PvP backend ordering for consistency
  const sortByResolutionOrder = (
    cards: { card: DeckCard; laneIndex: number; side: "player" | "cpu"; ability: any }[]
  ) => {
    // Roll dice for each lane (true = player first, false = cpu first)
    const laneDiceResults = [
      Math.random() < 0.5,
      Math.random() < 0.5,
      Math.random() < 0.5,
    ];

    return [...cards].sort((a, b) => {
      // Lane order first (0, 1, 2)
      if (a.laneIndex !== b.laneIndex) return a.laneIndex - b.laneIndex;

      // Same lane: use dice result to decide player vs CPU
      const playerFirst = laneDiceResults[a.laneIndex];

      if (a.side === b.side) return 0;

      if (playerFirst) {
        return a.side === "player" ? -1 : 1;
      } else {
        return a.side === "cpu" ? -1 : 1;
      }
    });
  };

  // Process ability queue sequentially with visual feedback
  const processAbilityQueue = async (
    queue: { card: DeckCard; laneIndex: number; side: "player" | "cpu"; ability: any }[],
    lanes: any[],
    currentTurn: number
  ): Promise<any[]> => {
    if (queue.length === 0) return lanes;

    let updatedLanes = [...lanes];
    const sortedQueue = sortByResolutionOrder(queue);

    setCurrentPhase("ability");
    setAbilityQueue(sortedQueue);

    for (let i = 0; i < sortedQueue.length; i++) {
      const item = sortedQueue[i];
      setCurrentAbilityIndex(i);

      // Visual highlight for current card
      const cardKey = `${item.laneIndex}-${item.side}-${
        updatedLanes[item.laneIndex][item.side === "player" ? "playerCards" : "cpuCards"].length - 1
      }`;
      triggerCardAnimation(item.laneIndex, item.side, 0, "pulse");

      // NOTE: Sounds are played in processAbilities when effects actually trigger
      // (hit sound for attacks, damage sound when enemy shakes, etc.)

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, TCG_CONFIG.ABILITY_DELAY_MS));
    }

    setCurrentAbilityIndex(-1);
    setAbilityQueue([]);
    setCurrentPhase("resolve");

    return updatedLanes;
  };

  // Use global CARD_NAME_ALIASES (defined at top of file)
  const cardNameAliases = CARD_NAME_ALIASES;

  // Get VibeFID ability based on rarity (with translations)
  const getVibeFIDAbility = (rarity: string | undefined): TCGAbility | null => {
    if (!rarity) return null;
    const rarityLower = rarity.toLowerCase();

    const vibefidAbilities: Record<string, TCGAbility> = {
      "common": {
        name: t('ability_vibefid_common_name') || "📱 First Cast",
        description: t('ability_vibefid_common_desc') || "+5 power for each card already played",
        type: "onReveal",
        effect: { action: "vibefidFirstCast", value: 5 },
        rarity: "Common"
      },
      "rare": {
        name: t('ability_vibefid_rare_name') || "🔗 Reply Guy",
        description: t('ability_vibefid_rare_desc') || "Copy 50% power from strongest friendly in lane",
        type: "ongoing",
        effect: { action: "vibefidReplyGuy", value: 0.5 },
        rarity: "Rare"
      },
      "epic": {
        name: t('ability_vibefid_epic_name') || "✨ Verified",
        description: t('ability_vibefid_epic_desc') || "IMMUNE to debuffs + DOUBLE power if losing lane",
        type: "ongoing",
        effect: { action: "vibefidVerified" },
        rarity: "Epic"
      },
      "legendary": {
        name: t('ability_vibefid_legendary_name') || "👥 Ratio",
        description: t('ability_vibefid_legendary_desc') || "Power becomes EQUAL to strongest card on field!",
        type: "onReveal",
        effect: { action: "vibefidRatio" },
        rarity: "Legendary"
      },
      "mythic": {
        name: t('ability_vibefid_mythic_name') || "🌐 Doxxed",
        description: t('ability_vibefid_mythic_desc') || "ADD total power of all enemy cards in this lane!",
        type: "onReveal",
        effect: { action: "vibefidDoxxed" },
        rarity: "Mythic"
      }
    };

    return vibefidAbilities[rarityLower] || null;
  };

  // Get card ability by name (or by rarity for VibeFID)
  const getCardAbility = (cardName: string | undefined, card?: DeckCard | null): TCGAbility | null => {
    // Check VibeFID first (ability based on rarity, not name)
    if (card?.type === "vibefid") {
      return getVibeFIDAbility(card.rarity);
    }
    if (!cardName) return null;
    const normalizedName = cardName.toLowerCase().trim();
    // Check for alias first
    const resolvedName = cardNameAliases[normalizedName] || normalizedName;
    return tcgAbilities[resolvedName] || null;
  };

  // Get translated ability name and description
  const getTranslatedAbility = (cardName: string | undefined): { name: string; description: string } | null => {
    if (!cardName) return null;
    const normalizedName = cardName.toLowerCase().trim();
    const resolvedName = cardNameAliases[normalizedName] || normalizedName;
    const ability = tcgAbilities[resolvedName];
    if (!ability) return null;

    // Convert card name to camelCase for translation key: "linda xied" -> "LindaXied"
    const keyName = resolvedName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    const nameKey = `ability${keyName}Name` as keyof typeof translations["pt-BR"];
    const descKey = `ability${keyName}Desc` as keyof typeof translations["pt-BR"];

    // Get translated values, fallback to original JSON values
    const translatedName = t(nameKey) !== nameKey ? t(nameKey) : ability.name;
    const translatedDesc = t(descKey) !== descKey ? t(descKey) : ability.description;

    return { name: translatedName, description: translatedDesc };
  };

  // Get visual effect for ability - returns effect type and text
  const getAbilityVisualEffect = (ability: TCGAbility | null, cardName: string): { type: string; text: string; emoji: string } | null => {
    if (!ability) return null;
    const action = ability.effect?.action;
    switch (action) {
      case "destroyHighestEnemy":
        return { type: "destroy", text: "PROTOCOL OVERRIDE!", emoji: "💀" };
      case "buffAllLanes":
        return { type: "king", text: "KING'S ARRIVAL!", emoji: "👑" };
      case "copyHighest":
        return { type: "copy", text: "DIAMOND AUTHORITY!", emoji: "💎" };
      case "shuffleEnemyLanes":
        return { type: "shuffle", text: "CHAOTIC KINGDOM!", emoji: "🌀" };
      case "swapEnemyPowers":
        return { type: "shuffle", text: "COCK TWIST!", emoji: "🔄" };
      case "debuffLane":
        return { type: "debuff", text: "SPICY BURN!", emoji: "🌶️" };
      case "giveCoal":
        return { type: "debuff", text: "NAUGHTY GIFT!", emoji: "🎁" };
      case "draw":
        return { type: "draw", text: `DRAW ${ability.effect?.value || 1}!`, emoji: "🃏" };
      case "debuffRandomEnemy":
        return { type: "snipe", text: "SNIPE SHOT!", emoji: "🎯" };
      case "revealEnemyCard":
        return { type: "reveal", text: "FACT CHECK!", emoji: "👁️" };
      case "forceDiscard":
        return { type: "discard", text: "DISTRACTION!", emoji: "😈" };
      case "stealPower":
        return { type: "steal", text: "STOLEN POWER!", emoji: "🖐️" };
      case "buffAdjacent":
        return { type: "buff", text: "SIGNAL BOOST!", emoji: "📡" };
      case "buffPerCardInLane":
        return { type: "buff", text: "LOGICAL MIND!", emoji: "🧠" };
      case "buffPerFriendly":
        return { type: "buff", text: "COMMUNITY BUILDER!", emoji: "🤝" };
      case "buffPerEnemyInLane":
        return { type: "buff", text: "PROXY POWER!", emoji: "🔌" };
      case "buffWeakest":
        return { type: "buff", text: "SHILL CAMPAIGN!", emoji: "📢" };
      case "buffOtherLanes":
        return { type: "buff", text: "UNDERGROUND!", emoji: "🕳️" };
      case "buffIfFewerCards":
        return { type: "buff", text: "PHILOSOPHICAL STRIKE!", emoji: "🤔" };
      case "addCopyToHand":
        return { type: "copy", text: "SMART CONTRACT!", emoji: "📜" };
      case "moveCard":
        return { type: "shuffle", text: "COFFEE RUN!", emoji: "☕" };
      case "gamble":
        return { type: "buff", text: "RISKY PLAY!", emoji: "🎲" };
      case "debuffStrongest":
        return { type: "snipe", text: "DIRTY TACTICS!", emoji: "🎯" };
      case "buffByRarity":
        return { type: "buff", text: ability.name?.toUpperCase() || "BUFF!", emoji: "✨" };
      case "buffPerHandSize":
        return { type: "buff", text: "NFT FLIP!", emoji: "💰" };
      case "buffPerCardsPlayed":
        return { type: "buff", text: ability.name?.toUpperCase() || "BUFF!", emoji: "📈" };
      case "destroyLoneCard":
        return { type: "destroy", text: "LONE HUNTER!", emoji: "🎯" };
      case "stealOnSkip":
        return { type: "steal", text: "STOLEN!", emoji: "🖐️" };
      case "moveRandom":
        return { type: "shuffle", text: "SHADOW STEP!", emoji: "👤" };
      // VibeFID abilities
      case "vibefidFirstCast":
        return { type: "buff", text: "FIRST CAST!", emoji: "📱" };
      case "vibefidReplyGuy":
        return { type: "buff", text: "REPLY GUY!", emoji: "🔗" };
      case "vibefidVerified":
        return { type: "buff", text: "VERIFICADO!", emoji: "✨" };
      case "vibefidRatio":
        return { type: "copy", text: "RATIO!", emoji: "👥" };
      case "vibefidDoxxed":
        return { type: "steal", text: "DOXXED!", emoji: "🌐" };
      default:
        if (ability.effect?.value && ability.effect.value > 0) {
          return { type: "buff", text: `+${ability.effect.value} POWER!`, emoji: "⬆️" };
        }
        return null;
    }
  };

  // Get foil effect description (affects energy cost, not power)
  const getFoilEffect = (foil: string | undefined): { energyDiscount: number; description: string; isFree: boolean } | null => {
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
  const getFoilClass = (foil: string | undefined) => {
    if (!foil || foil === "None" || foil === "none") return "";
    if (foil === "Prize" || foil === "prize") return "animate-pulse ring-2 ring-yellow-400/50";
    return "ring-1 ring-white/30";
  };

  // Calculate energy cost for a card (centralized function)
  // MUST match backend getCardEnergyCost in convex/tcg.ts
  const getEnergyCost = (card: DeckCard): number => {
    // Base cost by rarity (same as backend)
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
  };

  // Get ability type color
  const getAbilityTypeColor = (type: string): string => {
    if (type === "ongoing") return "text-green-400";
    if (type === "active") return "text-pink-400";
    return "text-blue-400"; // onReveal
  };

  // Get ability type label
  const getAbilityTypeLabel = (type: string): string => {
    switch (type) {
      case "ongoing": return t('tcgOngoing');
      case "active": return "Active";
      case "onReveal":
      default:
        return t('tcgOnReveal');
    }
  };

  const generateCpuDeck = (playerDeck: DeckCard[]): DeckCard[] => {
    // CPU gets ALL 53 VMW cards with random foils!
    const allCards = tcgCardsData.cards || [];

    // Base power by rarity
    const rarityPower: Record<string, number> = {
      "Mythic": 800,
      "Legendary": 240,
      "Epic": 80,
      "Rare": 20,
      "Common": 5,
    };

    // Build rank to name map for image paths
    const rankMap: Record<string, string> = {
      'A': 'ace', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
      '7': '7', '8': '8', '9': '9', '10': '10', 'J': 'jack', 'Q': 'queen', 'K': 'king'
    };

    return allCards.map((card: any, i: number) => {
      // Random foil: 10% Prize, 25% Standard, 65% None (balanced)
      const foilRoll = Math.random();
      const foil = foilRoll < 0.1 ? "Prize" : foilRoll < 0.35 ? "Standard" : "None";

      // Calculate power with foil multiplier (reduced for balance)
      const basePower = rarityPower[card.rarity] || 5;
      const foilMult = foil === "Prize" ? 3 : foil === "Standard" ? 1.5 : 1;
      // Add some randomness: -5% to +10%
      const power = Math.floor(basePower * foilMult * (0.95 + Math.random() * 0.15));

      // Build image path from baccarat folder
      const baccarat = card.baccarat?.toLowerCase() || card.onChainName?.toLowerCase();
      let imageUrl = "/images/card-back.png";

      // Special case for neymar (joker) or any card with ??? suit/rank
      if (baccarat === "neymar" || card.rank?.includes("?") || card.suit?.includes("?")) {
        imageUrl = "/images/baccarat/joker, neymar.png";
      } else if (card.suit && card.rank) {
        const rankName = rankMap[card.rank] || card.rank;
        imageUrl = `/images/baccarat/${rankName} ${card.suit}, ${baccarat}.png`;
      }

      return {
        type: "vbms" as const,
        cardId: `cpu-${i}-${baccarat}`,
        name: baccarat,
        rarity: card.rarity,
        power,
        imageUrl,
        foil,
      };
    });
  };

  // Smart CPU AI logic with ability support
  const cpuPlayCards = (gameState: any): any => {
    let cpuHand = [...gameState.cpuHand];
    let cpuDeckRemaining = [...(gameState.cpuDeckRemaining || [])];
    let newLanes = gameState.lanes.map((l: any) => ({
      ...l,
      playerCards: [...l.playerCards],
      cpuCards: [...l.cpuCards],
    }));
    let cpuEnergy = gameState.cpuEnergy || gameState.currentTurn;
    const currentTurn = gameState.currentTurn;

    if (cpuHand.length === 0) return { cpuHand, cpuDeckRemaining, lanes: newLanes, cpuEnergy };

    // Sort hand by power (highest first), prioritizing cards with good abilities
    const sortedHand = cpuHand
      .map((card: DeckCard, idx: number) => {
        const ability = getCardAbility(card.name, card);
        // Bonus priority for cards with powerful abilities
        const abilityBonus = ability ? (
          ability.rarity === "Mythic" ? 100 :
          ability.rarity === "Legendary" ? 50 :
          ability.rarity === "Epic" ? 25 : 10
        ) : 0;
        return { card, originalIdx: idx, priority: card.power + abilityBonus };
      })
      .sort((a, b) => b.priority - a.priority);

    // Analyze lane states
    const analyzeLanes = () => newLanes.map((lane: any, idx: number) => {
      const deficit = lane.playerPower - lane.cpuPower;
      return {
        laneIdx: idx,
        deficit,
        playerPower: lane.playerPower,
        cpuPower: lane.cpuPower,
        cpuCards: lane.cpuCards.length,
        isWinning: lane.cpuPower > lane.playerPower,
        isClose: Math.abs(deficit) < 30,
      };
    });

    let cardsPlayed = 0;
    const usedCardIndices = new Set<number>();
    const cpuPlays: { cardName: string; lane: number }[] = [];

    // Helper to add CPU card to lane (abilities processed later in handlePvEEndTurn)
    const playCpuCard = (card: DeckCard, laneIdx: number) => {
      cpuPlays.push({ cardName: card.name || "Unknown", lane: laneIdx + 1 });
      // Mark card as played this turn for ability processing
      // _revealed: false means card shows face-down until reveal phase
      const cardWithMeta = {
        ...card,
        _playedThisTurn: true,
        _playedLaneIndex: laneIdx,
        _revealed: false,
      };

      // Add card to lane (no abilities applied here - processed after reveal)
      newLanes[laneIdx].cpuCards.push(cardWithMeta);
    };

    // Calculate card energy cost (uses centralized getEnergyCost)
    const getCardCost = (card: DeckCard) => getEnergyCost(card);

    // Play cards while CPU has enough energy
    while (cpuEnergy > 0 && usedCardIndices.size < sortedHand.length) {
      const laneAnalysis = analyzeLanes();
      const sortedLanes = [...laneAnalysis].sort((a, b) => {
        if (a.isClose && !b.isClose) return -1;
        if (!a.isClose && b.isClose) return 1;
        if (a.deficit > 0 && b.deficit <= 0) return -1;
        if (a.deficit <= 0 && b.deficit > 0) return 1;
        return a.deficit - b.deficit;
      });

      let playedThisRound = false;
      for (const laneInfo of sortedLanes) {
        if (playedThisRound) break;

        for (const { card, originalIdx } of sortedHand) {
          if (usedCardIndices.has(originalIdx)) continue;

          // Check if CPU can afford this card
          const cardCost = getCardCost(card);
          if (cardCost > cpuEnergy) continue;

          // Don't over-commit to lanes we're already winning big
          if (laneInfo.cpuPower > laneInfo.playerPower + 100 && laneInfo.cpuCards >= 2) {
            continue;
          }

          playCpuCard(card, laneInfo.laneIdx);
          usedCardIndices.add(originalIdx);
          cpuEnergy -= cardCost; // Consume energy
          cardsPlayed++;
          playedThisRound = true;
          break;
        }
      }

      // If couldn't play to priority lanes, try worst lane with affordable card
      if (!playedThisRound) {
        const laneAnalysis = analyzeLanes();
        const worstLane = laneAnalysis.reduce((worst: any, lane: any) =>
          !worst || lane.deficit > worst.deficit ? lane : worst, null);

        for (const { card, originalIdx } of sortedHand) {
          if (usedCardIndices.has(originalIdx)) continue;
          const cardCost = getCardCost(card);
          if (cardCost > cpuEnergy) continue; // Can't afford
          if (worstLane) {
            playCpuCard(card, worstLane.laneIdx);
            usedCardIndices.add(originalIdx);
            cpuEnergy -= cardCost;
            cardsPlayed++;
          }
          break;
        }
      }

      // If no affordable cards, break
      const hasAffordableCard = sortedHand.some(({ card, originalIdx }) =>
        !usedCardIndices.has(originalIdx) && getCardCost(card) <= cpuEnergy
      );
      if (!hasAffordableCard) break;
    }

    // Remove played cards from hand
    const newCpuHand = cpuHand.filter((_: any, idx: number) => !usedCardIndices.has(idx));

    // Recalculate lane powers with ongoing effects
    newLanes = newLanes.map((lane: any, laneIdx: number) => {
      let playerPower = 0;
      let cpuPower = 0;

      lane.playerCards.forEach((card: DeckCard) => {
        const basePower = card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power;
        const ongoingBonus = calculateOngoingBonus(card, laneIdx, newLanes, currentTurn, true);
        playerPower += basePower + ongoingBonus;
      });

      lane.cpuCards.forEach((card: DeckCard) => {
        const basePower = card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power;
        const ongoingBonus = calculateOngoingBonus(card, laneIdx, newLanes, currentTurn, false);
        cpuPower += basePower + ongoingBonus;
      });

      return { ...lane, playerPower, cpuPower };
    });

    return { cpuHand: newCpuHand, cpuDeckRemaining, lanes: newLanes, cpuEnergy, cpuPlays };
  };

  // Pick 3 random unique lane names
  const pickRandomLanes = () => {
    const shuffled = [...LANE_NAMES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };

  const initializePvEGame = (playerDeck: DeckCard[], cpuDeck: DeckCard[]) => {
    const shuffledPlayer = shuffleDeck(playerDeck);
    const shuffledCpu = shuffleDeck(cpuDeck);
    const randomLanes = pickRandomLanes();

    return {
      currentTurn: 1,
      energy: 1,
      cpuEnergy: 1,
      bonusEnergy: 0, // Bonus from skipping turns
      cardsPlayedThisTurn: 0, // Track for skip bonus
      cardsPlayedInfo: [] as { cardId: string; laneIndex: number; energyCost: number; hadOnReveal: boolean }[], // Track for undo
      phase: "action",

      playerHand: shuffledPlayer.slice(0, 3),
      playerDeckRemaining: shuffledPlayer.slice(3),
      cpuHand: shuffledCpu.slice(0, 3),
      cpuDeckRemaining: shuffledCpu.slice(3),

      lanes: [
        { laneId: 0, ...randomLanes[0], playerCards: [] as DeckCard[], cpuCards: [] as DeckCard[], playerPower: 0, cpuPower: 0 },
        { laneId: 1, ...randomLanes[1], playerCards: [] as DeckCard[], cpuCards: [] as DeckCard[], playerPower: 0, cpuPower: 0 },
        { laneId: 2, ...randomLanes[2], playerCards: [] as DeckCard[], cpuCards: [] as DeckCard[], playerPower: 0, cpuPower: 0 },
      ],

      playerConfirmed: false,
      gameOver: false,
      winner: null as string | null,
    };
  };

  // Sacrifice Nothing card for +2 energy
  const sacrificeNothingForEnergy = (handIndex: number) => {
    if (!pveGameState) return;

    const card = pveGameState.playerHand[handIndex];
    if (!card || card.type !== "nothing") return;

    // Remove card from hand
    const newHand = pveGameState.playerHand.filter((_: any, i: number) => i !== handIndex);

    // Add +2 energy
    const newEnergy = (pveGameState.energy || 1) + 2;

    playSound("energy");

    setPveGameState({
      ...pveGameState,
      playerHand: newHand,
      energy: newEnergy,
    });

    setSelectedHandCard(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════

  const startPvEMatch = () => {
    // Stop any playing BGM (victory/defeat sounds)
    stopBgm();

    if (!activeDeck) {
      setError("No active deck. Please create a deck first.");
      return;
    }

    // Increment daily battle counter
    const newCount = dailyBattles + 1;
    setDailyBattles(newCount);
    if (typeof window !== 'undefined') {
      const today = new Date().toDateString();
      localStorage.setItem('tcg_daily_battles', JSON.stringify({ date: today, count: newCount }));
    }

    // CPU copies player's deck with power variations based on difficulty
    const cpuDeck = generateCpuDeck(activeDeck.cards as DeckCard[]);
    const gameState = initializePvEGame(activeDeck.cards as DeckCard[], cpuDeck);

    setIsPvE(true);
    setPveGameState(gameState);
    setView("battle");
    setPendingActions([]);
    setSelectedHandCard(null);
    setShowTiebreakerAnimation(false);
    setVibefidComboChoices({}); // Reset combo choices for new game
    setBattleLog([]); // Reset battle log for new game
    setShowBattleLog(false);
    setVibefidComboModal(null); // Close any open combo modal
    setShowDefeatBait(false);
    setShowBattleIntro(true);

    // Disable intro animation after it plays
    setTimeout(() => setShowBattleIntro(false), 2000);

    // Reset phase system for new game
    setCurrentPhase("play");
    setAbilityQueue([]);
    setCurrentAbilityIndex(-1);
  };

  // Apply onReveal ability when card is played
  const applyOnRevealAbility = (
    card: DeckCard,
    laneIndex: number,
    lanes: any[],
    playerHand: DeckCard[],
    playerDeckRemaining: DeckCard[],
    isPlayer: boolean,
    currentTurn?: number,
    addToBattleLog?: (entry: BattleLogEntry) => void
  ): { lanes: any[]; playerHand: DeckCard[]; playerDeckRemaining: DeckCard[]; bonusPower: number; energyToConsume: number } => {
    const ability = getCardAbility(card.name, card);
    if (!ability || ability.type !== "onReveal") {
      return { lanes, playerHand, playerDeckRemaining, bonusPower: 0, energyToConsume: 0 };
    }

    // Helper to add ability log
    const logAbility = (action: string) => {
      if (addToBattleLog && currentTurn !== undefined) {
        addToBattleLog({
          turn: currentTurn,
          player: isPlayer ? "you" : "cpu",
          action,
          lane: laneIndex + 1,
          cardName: card.name || "Unknown",
        });
      }
    };

    let newLanes = lanes.map(l => ({ ...l, playerCards: [...l.playerCards], cpuCards: [...l.cpuCards] }));
    let newHand = [...playerHand];
    let newDeck = [...playerDeckRemaining];
    let bonusPower = 0;
    let energyToConsume = 0; // For abilities that consume extra energy
    const effect = ability.effect;
    const myCards = isPlayer ? "playerCards" : "cpuCards";
    const enemyCards = isPlayer ? "cpuCards" : "playerCards";
    const myPower = isPlayer ? "playerPower" : "cpuPower";
    const enemyPower = isPlayer ? "cpuPower" : "playerPower";

    switch (effect.action) {
      case "buffSelf":
        bonusPower = effect.value || 0;
        logAbility(`⚡ +${bonusPower} power (self buff)`);
        break;

      case "buffOtherInLane":
        // +X power to another card in this lane
        if (newLanes[laneIndex][myCards].length > 0) {
          const targetIdx = Math.floor(Math.random() * newLanes[laneIndex][myCards].length);
          const targetCard = newLanes[laneIndex][myCards][targetIdx];
          newLanes[laneIndex][myCards][targetIdx] = {
            ...targetCard,
            power: targetCard.power + (effect.value || 0),
          };
          newLanes[laneIndex][myPower] += effect.value || 0;
          logAbility(`⬆️ buffed ${targetCard.name} +${effect.value}`);
        }
        break;

      case "debuffEnemyInLane":
        // -X power to an enemy card in this lane
        if (newLanes[laneIndex][enemyCards].length > 0) {
          const targetIdx = Math.floor(Math.random() * newLanes[laneIndex][enemyCards].length);
          const targetCard = newLanes[laneIndex][enemyCards][targetIdx];
          newLanes[laneIndex][enemyCards][targetIdx] = {
            ...targetCard,
            power: Math.max(0, targetCard.power - Math.abs(effect.value || 0)),
          };
          newLanes[laneIndex][enemyPower] = Math.max(0, newLanes[laneIndex][enemyPower] - Math.abs(effect.value || 0));
          logAbility(`⬇️ debuffed enemy ${targetCard.name} -${Math.abs(effect.value || 0)}`);
        }
        break;

      case "draw":
        // Draw X cards
        const drawCount = effect.value || 1;
        for (let i = 0; i < drawCount && newDeck.length > 0; i++) {
          newHand.push(newDeck.shift()!);
        }
        logAbility(`🃏 drew ${drawCount} card(s)`);
        break;

      case "buffAdjacent":
        // +X power to ALL other cards in this lane (Beeper - Signal Boost)
        const myCardsInLane = newLanes[laneIndex][myCards];
        myCardsInLane.forEach((c: DeckCard, cIdx: number) => {
          // Don't buff self (the card being played is added after this)
          newLanes[laneIndex][myCards][cIdx] = {
            ...c,
            power: c.power + (effect.value || 0),
          };
          newLanes[laneIndex][myPower] += effect.value || 0;
        });
        // Handle draw if specified (Beeper - Signal Boost)
        if (effect.draw && effect.draw > 0) {
          for (let i = 0; i < effect.draw && newDeck.length > 0; i++) {
            newHand.push(newDeck.shift()!);
          }
        }
        break;

      case "buffOtherLanes":
        // +X power to all cards in OTHER lanes
        newLanes.forEach((lane: any, idx: number) => {
          if (idx !== laneIndex) {
            lane[myCards].forEach((c: DeckCard, cIdx: number) => {
              lane[myCards][cIdx] = { ...c, power: c.power + (effect.value || 0) };
            });
            lane[myPower] += lane[myCards].length * (effect.value || 0);
          }
        });
        break;

      case "debuffLane":
        // -X power to all enemy cards in this lane
        const enemyCount = newLanes[laneIndex][enemyCards].length;
        newLanes[laneIndex][enemyCards].forEach((c: DeckCard, cIdx: number) => {
          newLanes[laneIndex][enemyCards][cIdx] = {
            ...c,
            power: Math.max(0, c.power - Math.abs(effect.value || 0)),
          };
        });
        newLanes[laneIndex][enemyPower] = Math.max(0,
          newLanes[laneIndex][enemyPower] - (enemyCount * Math.abs(effect.value || 0))
        );
        logAbility(`💥 debuffed ${enemyCount} enemies -${Math.abs(effect.value || 0)} each`);
        break;

      case "buffPerCardInLane":
        // +X power for each card in this lane
        const cardsInLane = newLanes[laneIndex][myCards].length + 1; // +1 for self
        bonusPower = cardsInLane * (effect.value || 0);
        break;

      case "buffPerFriendly":
        // +X power for each other friendly card (all lanes)
        let friendlyCount = -1; // don't count self
        newLanes.forEach(lane => {
          friendlyCount += lane[myCards].length;
        });
        bonusPower = Math.max(0, friendlyCount) * (effect.value || 0);
        break;

      case "buffPerEnemyInLane":
        // +basePower + perEnemy for each enemy in lane (Slaterg - Proxy Power)
        const enemiesInLane = newLanes[laneIndex][enemyCards].length;
        bonusPower = (effect.basePower || 0) + (enemiesInLane * (effect.perEnemy || 0));
        break;

      case "buffIfAlone":
        // +X power if this lane has no other cards
        if (newLanes[laneIndex][myCards].length === 0) {
          bonusPower = effect.value || 0;
        }
        break;

      case "buffWeakest":
        // +X power to the weakest friendly card
        let weakestCard: DeckCard | null = null;
        let weakestLane = -1;
        let weakestIdx = -1;
        newLanes.forEach((lane: any, lIdx: number) => {
          lane[myCards].forEach((c: DeckCard, cIdx: number) => {
            if (!weakestCard || c.power < weakestCard.power) {
              weakestCard = c;
              weakestLane = lIdx;
              weakestIdx = cIdx;
            }
          });
        });
        if (weakestCard && weakestLane >= 0) {
          const cardToUpdate = weakestCard as DeckCard;
          newLanes[weakestLane][myCards][weakestIdx] = {
            ...cardToUpdate,
            power: cardToUpdate.power + (effect.value || 0),
          };
          newLanes[weakestLane][myPower] += effect.value || 0;
        }
        break;

      case "debuffStrongest":
        // -X power to the strongest enemy card (Jack the Sniper - Snipe Shot)
        let strongestCard: DeckCard | null = null;
        let strongestLane = -1;
        let strongestIdx = -1;
        newLanes.forEach((lane: any, lIdx: number) => {
          lane[enemyCards].forEach((c: DeckCard, cIdx: number) => {
            if (!strongestCard || c.power > strongestCard.power) {
              strongestCard = c;
              strongestLane = lIdx;
              strongestIdx = cIdx;
            }
          });
        });
        if (strongestCard && strongestLane >= 0) {
          const cardToDebuff = strongestCard as DeckCard;
          const reduction = Math.abs(effect.value || 0);
          const newPowerValue = Math.max(0, cardToDebuff.power - reduction);
          newLanes[strongestLane][enemyCards][strongestIdx] = {
            ...cardToDebuff,
            power: newPowerValue,
          };
          newLanes[strongestLane][enemyPower] = Math.max(0, newLanes[strongestLane][enemyPower] - reduction);
          // Kill bonus: if target reaches 0 power, gain bonus power (Jack the Sniper)
          if (newPowerValue === 0 && effect.killBonus) {
            bonusPower = effect.killBonus;
            logAbility(`💀 KILLED ${cardToDebuff.name}! +${effect.killBonus} bonus`);
          } else {
            logAbility(`🎯 sniped ${cardToDebuff.name} -${reduction}`);
          }
        }
        break;

      case "buffLastPlayed":
        // +X power to the last card played
        for (let i = newLanes.length - 1; i >= 0; i--) {
          if (newLanes[i][myCards].length > 0) {
            const lastIdx = newLanes[i][myCards].length - 1;
            newLanes[i][myCards][lastIdx] = {
              ...newLanes[i][myCards][lastIdx],
              power: newLanes[i][myCards][lastIdx].power + (effect.value || 0),
            };
            newLanes[i][myPower] += effect.value || 0;
            break;
          }
        }
        break;

      case "stealPower":
        // Steal +X power from enemy here
        if (newLanes[laneIndex][enemyCards].length > 0) {
          const targetIdx = Math.floor(Math.random() * newLanes[laneIndex][enemyCards].length);
          const stealAmount = Math.min(effect.value || 0, newLanes[laneIndex][enemyCards][targetIdx].power);
          newLanes[laneIndex][enemyCards][targetIdx] = {
            ...newLanes[laneIndex][enemyCards][targetIdx],
            power: newLanes[laneIndex][enemyCards][targetIdx].power - stealAmount,
          };
          newLanes[laneIndex][enemyPower] -= stealAmount;
          bonusPower = stealAmount;
        }
        break;

      case "gamble":
        // 50% chance: +win or -lose power
        if (Math.random() > 0.5) {
          bonusPower = effect.win || 0;
        } else {
          bonusPower = effect.lose || 0;
        }
        break;

      case "consumeEnergyForPower":
        // CONSUME all remaining energy for +X power each! (Thosmur - Energy Burst)
        const remainingEnergy = pveGameState?.energy || 0;
        if (remainingEnergy > 0) {
          const powerPerEnergy = effect.powerPerEnergy || 5;
          bonusPower = remainingEnergy * powerPerEnergy;
          // Store for caller to consume
          energyToConsume = remainingEnergy;
        }
        break;

      case "buffIfTurn":
        // +X power if played on specific turn
        const currentTurn = pveGameState?.currentTurn || 1;
        if (effect.minTurn && currentTurn >= effect.minTurn) {
          bonusPower = effect.value || 0;
        } else if (effect.maxTurn && currentTurn <= effect.maxTurn) {
          bonusPower = effect.value || 0;
        }
        break;

      case "buffIfHandSize":
        // +X power if you have Y+ cards in hand
        if (newHand.length >= (effect.minCards || 0)) {
          bonusPower = effect.value || 0;
        }
        break;

      case "buffPerCardsPlayed":
        // +X power for each card you've played this game
        let cardsPlayedTotal = 0;
        newLanes.forEach((lane: any) => {
          cardsPlayedTotal += lane[myCards].length;
        });
        bonusPower = cardsPlayedTotal * (effect.value || 0);
        break;

      case "buffAllLanes":
        // +X power to all your cards + DOUBLE if winning 2+ lanes! (Neymar - King's Arrival - Mythic)
        let lanesWinning = 0;
        newLanes.forEach((lane: any) => {
          if (lane[myPower] > lane[enemyPower]) lanesWinning++;
        });
        const buffMultiplier = (effect.doubleIfWinning && lanesWinning >= 2) ? 2 : 1;
        const buffValue = (effect.value || 30) * buffMultiplier;
        newLanes.forEach((lane: any) => {
          lane[myCards].forEach((c: DeckCard, cIdx: number) => {
            lane[myCards][cIdx] = { ...c, power: c.power + buffValue };
          });
          lane[myPower] += lane[myCards].length * buffValue;
        });
        // Also buff self
        bonusPower = buffValue;
        break;

      case "destroyHighestEnemy":
        // Destroy highest enemy + GAIN its power! (Jesse - Protocol Override - Mythic)
        let highestDestroyPower = -1;
        let highestDestroyLane = -1;
        let highestDestroyIdx = -1;
        newLanes.forEach((lane: any, lIdx: number) => {
          lane[enemyCards].forEach((c: DeckCard, cIdx: number) => {
            if (c.power > highestDestroyPower) {
              highestDestroyPower = c.power;
              highestDestroyLane = lIdx;
              highestDestroyIdx = cIdx;
            }
          });
        });
        if (highestDestroyLane >= 0 && highestDestroyIdx >= 0) {
          const removedCard = newLanes[highestDestroyLane][enemyCards].splice(highestDestroyIdx, 1)[0];
          newLanes[highestDestroyLane][enemyPower] -= removedCard.power;
          // MYTHIC BONUS: Gain the destroyed card's power!
          if (effect.gainPower) {
            bonusPower = removedCard.power;
          }
        }
        break;

      case "kamikaze":
        // KAMIKAZE: Destroy highest enemy AND destroy self! (Landmine)
        let kamikazeHighestPower = -1;
        let kamikazeHighestLane = -1;
        let kamikazeHighestIdx = -1;
        newLanes.forEach((lane: any, lIdx: number) => {
          lane[enemyCards].forEach((c: DeckCard, cIdx: number) => {
            const effectivePower = c.type === "nothing" || c.type === "other" ? Math.floor(c.power * 0.5) : c.power;
            if (effectivePower > kamikazeHighestPower) {
              kamikazeHighestPower = effectivePower;
              kamikazeHighestLane = lIdx;
              kamikazeHighestIdx = cIdx;
            }
          });
        });
        // Destroy highest enemy
        if (kamikazeHighestLane >= 0 && kamikazeHighestIdx >= 0) {
          const removedEnemy = newLanes[kamikazeHighestLane][enemyCards].splice(kamikazeHighestIdx, 1)[0];
          newLanes[kamikazeHighestLane][enemyPower] -= removedEnemy.power;
        }
        // Mark self for destruction (will be removed after ability processing)
        card._sacrificed = true;
        bonusPower = -card.power; // Negate own power since card will be destroyed
        break;


      case "copyHighest":
        // Copy highest power + STEAL from all enemies! (Linda Xied - Diamond Authority - Mythic)
        let highestCopyCard: DeckCard | null = null;
        newLanes.forEach((lane: any) => {
          [...lane.playerCards, ...lane.cpuCards].forEach((c: DeckCard) => {
            if (!highestCopyCard || c.power > highestCopyCard.power) highestCopyCard = c;
          });
        });
        if (highestCopyCard) bonusPower = (highestCopyCard as DeckCard).power;
        // MYTHIC BONUS: Steal power from ALL enemy cards!
        if (effect.stealFromAll) {
          const stealPerCard = effect.stealFromAll || 20;
          newLanes.forEach((lane: any) => {
            lane[enemyCards].forEach((c: DeckCard, cIdx: number) => {
              const stolen = Math.min(stealPerCard, c.power);
              lane[enemyCards][cIdx] = { ...c, power: Math.max(0, c.power - stolen) };
              lane[enemyPower] = Math.max(0, lane[enemyPower] - stolen);
              bonusPower += stolen;
            });
          });
        }
        break;

      case "swapEnemyPowers":
        // Swap power of two enemy cards (Tukka - Legendary)
        const enemyCardsFlat: { lane: number; idx: number }[] = [];
        newLanes.forEach((lane: any, lIdx: number) => {
          lane[enemyCards].forEach((_: DeckCard, cIdx: number) => {
            enemyCardsFlat.push({ lane: lIdx, idx: cIdx });
          });
        });
        if (enemyCardsFlat.length >= 2) {
          const i1 = Math.floor(Math.random() * enemyCardsFlat.length);
          let i2 = Math.floor(Math.random() * enemyCardsFlat.length);
          while (i2 === i1 && enemyCardsFlat.length > 1) i2 = Math.floor(Math.random() * enemyCardsFlat.length);
          const c1 = enemyCardsFlat[i1], c2 = enemyCardsFlat[i2];
          const temp = newLanes[c1.lane][enemyCards][c1.idx].power;
          newLanes[c1.lane][enemyCards][c1.idx].power = newLanes[c2.lane][enemyCards][c2.idx].power;
          newLanes[c2.lane][enemyCards][c2.idx].power = temp;
        }
        break;

      case "giveCoal":
        // Give enemy a Coal card with negative power (Naughty Santa)
        const coalCard: DeckCard = { type: "vbms", cardId: `coal-${Date.now()}`, name: "Coal", rarity: "Common", power: effect.value || -20, imageUrl: "/images/card-back.png" };
        const coalLane = Math.floor(Math.random() * 3);
        newLanes[coalLane][enemyCards].push(coalCard);
        newLanes[coalLane][enemyPower] += coalCard.power;
        break;

      case "debuffRandomEnemy":
        // -X power to random enemy (Jack the Sniper)
        const allEnemies: { lane: number; idx: number }[] = [];
        newLanes.forEach((lane: any, lIdx: number) => lane[enemyCards].forEach((_: DeckCard, cIdx: number) => allEnemies.push({ lane: lIdx, idx: cIdx })));
        if (allEnemies.length > 0) {
          const t = allEnemies[Math.floor(Math.random() * allEnemies.length)];
          const debuff = Math.abs(effect.value || 10);
          newLanes[t.lane][enemyCards][t.idx].power = Math.max(0, newLanes[t.lane][enemyCards][t.idx].power - debuff);
          newLanes[t.lane][enemyPower] = Math.max(0, newLanes[t.lane][enemyPower] - debuff);
        }
        break;

      case "revealEnemyCard":
        // Reveal enemy card AND steal 15 power (Horsefarts - Fact Check)
        if (newLanes[laneIndex][enemyCards].length > 0) {
          const targetIdx = Math.floor(Math.random() * newLanes[laneIndex][enemyCards].length);
          const stealAmt = Math.min(effect.stealPower || 15, newLanes[laneIndex][enemyCards][targetIdx].power);
          newLanes[laneIndex][enemyCards][targetIdx].power -= stealAmt;
          newLanes[laneIndex][enemyPower] -= stealAmt;
          bonusPower = stealAmt;
        } else {
          bonusPower = 10; // Fallback if no enemies
        }
        break;

      case "forceDiscard":
        // Enemy loses power (John Porn)
        if (newLanes[laneIndex][enemyCards].length > 0) {
          const tIdx = Math.floor(Math.random() * newLanes[laneIndex][enemyCards].length);
          newLanes[laneIndex][enemyCards][tIdx].power = Math.max(0, newLanes[laneIndex][enemyCards][tIdx].power - 5);
          newLanes[laneIndex][enemyPower] = Math.max(0, newLanes[laneIndex][enemyPower] - 5);
        }
        break;

      case "addCopyToHand":
        // Add copy to hand (0xdeployer) + bonus power to self
        newHand.push({ ...card, cardId: `${card.cardId}-copy-${Date.now()}` });
        bonusPower = effect.bonusPower || 0;
        break;

      case "moveCard":
        // Move a card to another lane (Vibe Intern)
        for (let li = 0; li < 3; li++) {
          if (li !== laneIndex && newLanes[laneIndex][myCards].length > 0) {
            const moved = newLanes[laneIndex][myCards].shift()!;
            const mPower = moved.type === "nothing" || moved.type === "other" ? Math.floor(moved.power * 0.5) : moved.power;
            newLanes[li][myCards].push(moved);
            newLanes[laneIndex][myPower] -= mPower;
            newLanes[li][myPower] += mPower;
            break;
          }
        }
        break;

      case "buffIfFewerCards":
        // +X if fewer cards than enemy (Sartocrates - Philosophical Strike)
        // Note: +1 because this card is being added
        const myCardCount = newLanes[laneIndex][myCards].length + 1;
        const enemyCardCount = newLanes[laneIndex][enemyCards].length;
        if (myCardCount <= enemyCardCount) bonusPower = effect.value || 30;
        break;

      case "buffByRarity":
        // Buff cards by rarity (Brian Armstrong, Linux)
        const tgtRarity = effect.targetRarity || "Common";
        newLanes.forEach((lane: any) => {
          lane[myCards].forEach((c: DeckCard, cIdx: number) => {
            if (c.rarity === tgtRarity) { lane[myCards][cIdx] = { ...c, power: c.power + (effect.value || 0) }; lane[myPower] += effect.value || 0; }
          });
        });
        break;

      case "buffPerHandSize":
        // Power based on hand size (NFTKid)
        bonusPower = newHand.length * (effect.multiplier || 5);
        break;

      case "copyPowerLeft":
        // Copy power from left card + bonus (GayPT - AI Generated)
        const leftCardCount = newLanes[laneIndex][myCards].length;
        if (leftCardCount > 0) {
          const leftCard = newLanes[laneIndex][myCards][leftCardCount - 1];
          bonusPower = Math.floor(leftCard.power * 0.5) + (effect.value || 10); // Copy 50% + bonus
        } else {
          bonusPower = effect.value || 10; // Just bonus if no left card
        }
        break;

      case "destroyLoneCard":
        // DESTROY enemy card if they have only 1 card in this lane! (Ink - Lone Hunter)
        if (newLanes[laneIndex][enemyCards].length === 1) {
          const destroyedCard = newLanes[laneIndex][enemyCards][0];
          const destroyedPower = destroyedCard.power;
          newLanes[laneIndex][enemyCards] = [];
          newLanes[laneIndex][enemyPower] = 0;
          // Bonus: gain half the destroyed card's power
          bonusPower = Math.floor(destroyedPower / 2);
        }
        break;

      case "moveRandom":
        // Move this card to a random lane + bonus power (Vlady)
        const availableLanes = [0, 1, 2].filter(li => li !== laneIndex);
        if (availableLanes.length > 0) {
          const targetLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
          // Card will be added to target lane with bonus power
          bonusPower = effect.bonusPower || 15;
          // Note: actual moving happens in handlePvEPlayCard after bonusPower is applied
        } else {
          bonusPower = effect.bonusPower || 15; // Just give bonus if no other lanes
        }
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // VIBEFID ABILITIES (based on rarity)
      // ═══════════════════════════════════════════════════════════════════════════════

      case "vibefidFirstCast":
        // +5 power for each card already played this game
        let totalCardsPlayed = 0;
        newLanes.forEach((lane: any) => {
          totalCardsPlayed += lane[myCards].length + lane[enemyCards].length;
        });
        // Don't count self (will be added after)
        bonusPower = totalCardsPlayed * (effect.value || 5);
        break;

      case "vibefidRatio":
        // Power becomes EQUAL to the strongest card on the field
        let highestPowerOnField = 0;
        newLanes.forEach((lane: any) => {
          lane[myCards].forEach((c: DeckCard) => {
            if (c.power > highestPowerOnField) highestPowerOnField = c.power;
          });
          lane[enemyCards].forEach((c: DeckCard) => {
            if (c.power > highestPowerOnField) highestPowerOnField = c.power;
          });
        });
        // bonusPower = difference to reach that power (will be added to card.power)
        bonusPower = Math.max(0, highestPowerOnField - card.power);
        break;

      case "vibefidDoxxed":
        // Copy the TOTAL power of all enemy cards in this lane
        let totalEnemyPowerInLane = 0;
        newLanes[laneIndex][enemyCards].forEach((c: DeckCard) => {
          totalEnemyPowerInLane += c.power || 0;
        });
        bonusPower = totalEnemyPowerInLane;
        break;

      case "buffIfLosing":
        // +base power, or +bonus if LOSING this lane (Rizkybegitu - Lucky Roll)
        const myLanePower = newLanes[laneIndex][myPower];
        const enemyLanePower = newLanes[laneIndex][enemyPower];
        const isLosing = isPlayer ? myLanePower < enemyLanePower : enemyLanePower < myLanePower;
        bonusPower = isLosing ? (effect.bonus || 25) : (effect.base || 10);
        break;

      // ═══════════════════════════════════════════════════════════════════════════════
      // NEW ABILITIES - Implemented Jan 2026
      // ═══════════════════════════════════════════════════════════════════════════════

      case "stealWeakest":
        // CHARM: Steal the weakest enemy card to your side! (Naughty Santa - Legendary)
        let weakestEnemyCard: DeckCard | null = null;
        let weakestEnemyLane = -1;
        let weakestEnemyIdx = -1;
        let weakestEnemyPower = Infinity;
        newLanes.forEach((lane: any, lIdx: number) => {
          lane[enemyCards].forEach((c: DeckCard, cIdx: number) => {
            if (c.power < weakestEnemyPower) {
              weakestEnemyCard = c;
              weakestEnemyLane = lIdx;
              weakestEnemyIdx = cIdx;
              weakestEnemyPower = c.power;
            }
          });
        });
        if (weakestEnemyCard && weakestEnemyLane >= 0) {
          // Remove from enemy
          const stolenCard = newLanes[weakestEnemyLane][enemyCards].splice(weakestEnemyIdx, 1)[0];
          newLanes[weakestEnemyLane][enemyPower] -= stolenCard.power;
          // Add to your side (same lane as this card) with 50% power
          const newPower = Math.floor(stolenCard.power * 0.5);
          stolenCard.power = newPower;
          newLanes[laneIndex][myCards].push(stolenCard);
          newLanes[laneIndex][myPower] += newPower;
        }
        break;

      case "timeBomb":
        // Plant a BOMB! After 2 turns, DESTROY ALL cards in this lane (Tukka - Legendary)
        // Mark this card with bomb info - will be processed in continueAfterReveal
        const currentTurnBomb = pveGameState?.currentTurn || 1;
        card._bombTurn = currentTurnBomb + (effect.delay || 2);
        card._bombLane = laneIndex;
        bonusPower = 0; // No immediate power bonus
        break;

      case "forceDiscardAndDraw":
        // Enemy discards (loses power), you draw! (Sartocrates - Epic)
        // Debuff a random enemy card
        if (newLanes[laneIndex][enemyCards].length > 0) {
          const targetIdx = Math.floor(Math.random() * newLanes[laneIndex][enemyCards].length);
          const debuffAmount = 15;
          newLanes[laneIndex][enemyCards][targetIdx] = {
            ...newLanes[laneIndex][enemyCards][targetIdx],
            power: Math.max(0, newLanes[laneIndex][enemyCards][targetIdx].power - debuffAmount),
          };
          newLanes[laneIndex][enemyPower] = Math.max(0, newLanes[laneIndex][enemyPower] - debuffAmount);
        }
        // Draw 1 card
        if (isPlayer && newDeck.length > 0) {
          newHand.push(newDeck.shift()!);
        }
        bonusPower = effect.selfDraw ? 5 : 0; // Small bonus
        break;

      case "parasiteLane":
        // Mind Parasite: Lock lane, drain power from enemies! (Horsefarts - Epic)
        // Simplified: debuff all enemies in lane + steal some power
        let totalDrained = 0;
        const drainAmount = 10;
        newLanes[laneIndex][enemyCards].forEach((c: DeckCard, cIdx: number) => {
          const drained = Math.min(drainAmount, c.power);
          newLanes[laneIndex][enemyCards][cIdx] = { ...c, power: Math.max(0, c.power - drained) };
          totalDrained += drained;
        });
        newLanes[laneIndex][enemyPower] = Math.max(0, newLanes[laneIndex][enemyPower] - totalDrained);
        bonusPower = totalDrained; // Gain drained power
        break;

      case "sacrificeBuffAll":
        // SACRIFICE: Destroy self and buff ALL allies! (Melted - Rare)
        const buffAllValue = effect.value || 20;
        // Buff all friendly cards in all lanes
        newLanes.forEach((lane: any) => {
          lane[myCards].forEach((c: DeckCard, cIdx: number) => {
            if (c.cardId !== card.cardId) { // Don't buff self (will be destroyed)
              lane[myCards][cIdx] = { ...c, power: c.power + buffAllValue };
              lane[myPower] += buffAllValue;
            }
          });
        });
        // Mark card for destruction (will be removed after ability processing)
        card._sacrificed = true;
        bonusPower = -card.power; // Negate own power since card will be destroyed
        break;

      case "shuffleEnemyLanes":
        // CHAOS: Shuffle ALL ENEMY cards between lanes! (Goofy Romero - Legendary)
        const allEnemyCardsToShuffle: DeckCard[] = [];
        // Collect all enemy cards
        newLanes.forEach((lane: any) => {
          allEnemyCardsToShuffle.push(...lane[enemyCards]);
          lane[enemyCards] = [];
          lane[enemyPower] = 0;
        });
        // Shuffle
        for (let i = allEnemyCardsToShuffle.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allEnemyCardsToShuffle[i], allEnemyCardsToShuffle[j]] = [allEnemyCardsToShuffle[j], allEnemyCardsToShuffle[i]];
        }
        // Redistribute to lanes
        allEnemyCardsToShuffle.forEach((enemyCard, idx) => {
          const targetLane = idx % 3;
          newLanes[targetLane][enemyCards].push(enemyCard);
          newLanes[targetLane][enemyPower] += enemyCard.power;
        });
        bonusPower = 10; // Chaos bonus
        break;
    }

    return { lanes: newLanes, playerHand: newHand, playerDeckRemaining: newDeck, bonusPower, energyToConsume };
  };

  // Calculate ongoing power bonuses
  const calculateOngoingBonus = (card: DeckCard, laneIndex: number, lanes: any[], currentTurn: number, isPlayer: boolean): number => {
    const ability = getCardAbility(card.name, card);
    if (!ability || ability.type !== "ongoing") return 0;

    const effect = ability.effect;
    const myCards = isPlayer ? "playerCards" : "cpuCards";
    const enemyCards = isPlayer ? "cpuCards" : "playerCards";

    switch (effect.action) {
      case "buffPerCardInPlay":
        // +X power for each card in play (Claude - Computing)
        let totalCards = 0;
        lanes.forEach(lane => {
          totalCards += lane.playerCards.length + lane.cpuCards.length;
        });
        return totalCards * (effect.value || 0);

      case "buffPerTurn":
        // +X power for each turn passed
        return currentTurn * (effect.value || 0);

      case "buffLaneOngoing":
        // +X power to all your cards here (including self counted elsewhere)
        return 0; // This affects other cards, not self

      case "buffIfFirst":
        // +X power if played first in this lane (Casa - Home Advantage)
        if (lanes[laneIndex][myCards].length > 0 && lanes[laneIndex][myCards][0].cardId === card.cardId) {
          return effect.value || 0;
        }
        return 0;

      case "doubleIfLosing":
        // Double power if losing this lane (Nico - Legendary Status)
        if (isPlayer) {
          if (lanes[laneIndex].playerPower < lanes[laneIndex].cpuPower) {
            return card.power; // Double = add same amount again
          }
        } else {
          if (lanes[laneIndex].cpuPower < lanes[laneIndex].playerPower) {
            return card.power;
          }
        }
        return 0;

      case "buffEachTurn":
        // +X power at the end of each turn (JC Denton - Nano Augmentation)
        return currentTurn * (effect.value || 0);

      case "reduceEnemyPower":
        // Enemies deal -X power to this lane (Dan Romero - Too Cute)
        return 0; // This is applied differently

      case "untargetable":
        // MYTHIC: Anon - Hidden Identity - IMMUNE + gains power each turn!
        return (effect.buffPerTurn || 0) * currentTurn;

      case "reduceEnergyCost":
        // MYTHIC: Vitalik - Gas Optimization - cards cost less (handled in play) + power buff per turn
        return (effect.energyPerTurn || 0) * currentTurn * 5; // Convert energy to power equivalent

      case "immuneToDebuff":
        // Ventra - Diamond Hands - cannot lose power + bonus
        return effect.bonusPower || 0;

      case "buffPerCardsPlayed":
        // Lombra Jr - Dick Knowledge - +X per card played (ongoing version)
        let cardsPlayedOngoing = 0;
        lanes.forEach((lane: any) => {
          cardsPlayedOngoing += lane[myCards].length;
        });
        return cardsPlayedOngoing * (effect.value || 0);

      // ═══ VIBEFID ONGOING ABILITIES ═══
      case "vibefidReplyGuy":
        // Copy 50% of the strongest friendly card's power in this lane
        let strongestFriendlyPower = 0;
        lanes[laneIndex][myCards].forEach((c: DeckCard) => {
          if (c.cardId !== card.cardId && c.power > strongestFriendlyPower) {
            strongestFriendlyPower = c.power;
          }
        });
        return Math.floor(strongestFriendlyPower * (effect.value || 0.5));

      case "vibefidVerified":
        // IMMUNE to debuffs (handled elsewhere) + DOUBLE power if losing this lane
        const myLanePower = isPlayer ? lanes[laneIndex].playerPower : lanes[laneIndex].cpuPower;
        const enemyLanePower = isPlayer ? lanes[laneIndex].cpuPower : lanes[laneIndex].playerPower;
        if (myLanePower < enemyLanePower) {
          return card.power; // Double = add same amount again
        }
        return 0;

      // ═══════════════════════════════════════════════════════════════════════════════
      // NEW ONGOING ABILITIES - Implemented Jan 2026
      // ═══════════════════════════════════════════════════════════════════════════════

      case "adaptivePower":
        // LOSING: Double power. TIE: +20. WINNING: buff adjacent +15 (Nico - Legendary)
        const nicoMyPower = isPlayer ? lanes[laneIndex].playerPower : lanes[laneIndex].cpuPower;
        const nicoEnemyPower = isPlayer ? lanes[laneIndex].cpuPower : lanes[laneIndex].playerPower;
        if (nicoMyPower < nicoEnemyPower) {
          // LOSING - double power
          return card.power; // Double = add same power again
        } else if (nicoMyPower === nicoEnemyPower) {
          // TIE - +20 power
          return effect.ifTie || 20;
        } else {
          // WINNING - buff adjacent (this is handled as bonus to self for simplicity)
          return effect.ifWinning?.buffAdjacent || 15;
        }

      case "convertEnergyEndGame":
        // At END OF GAME: Convert energy to power (Vibe Intern - Epic)
        // This is handled at game end, but we can show potential power
        // For now, return 0 - the actual conversion happens in game end logic
        return 0;

      case "energyPerTurn":
        // +1 ENERGY each turn (Rachel - Common)
        // Energy bonus is handled separately in turn logic
        // But we give a small power bonus to make it visible
        return currentTurn * 2; // +2 power per turn as visual indicator

      case "buffLaneEndTurn":
        // +3 power to ALL allies in this lane (Gozaru - Common)
        // Similar to buffLaneOngoing but applies at end of each turn
        // For ongoing calculation, we apply it based on turns passed
        return (effect.value || 3) * currentTurn;

      default:
        return 0;
    }
  };

  // Calculate lane effect bonus for a card
  const calculateLaneEffectBonus = (
    card: DeckCard,
    lane: any,
    allCards: DeckCard[],
    isPlayer: boolean,
    currentTurn: number
  ): number => {
    const effect = lane.effect;
    const value = lane.value || 0;

    switch (effect) {
      case "flatBonus":
        return value;

      case "buffPerTurn":
      case "debuffPerTurn":
        return value * currentTurn;

      case "buffFirst":
        return allCards.indexOf(card) === 0 ? value : 0;

      case "buffHighest":
        const maxPower = Math.max(...allCards.map(c => c.power || 0));
        return card.power === maxPower ? value : 0;

      case "buffLowest":
        const minPower = Math.min(...allCards.map(c => c.power || 0));
        return card.power === minPower ? value : 0;

      case "buffPerCard":
        return value * allCards.length;

      case "buffAlone":
        return allCards.length === 1 ? value : 0;

      case "buffCommon":
        const abilityCommon = getCardAbility(card.name, card);
        return abilityCommon?.rarity === "Common" ? value : 0;

      case "buffEpic":
        const abilityEpic = getCardAbility(card.name, card);
        return abilityEpic?.rarity === "Epic" ? value : 0;

      case "doubleLegendary":
        const cardAbility = getCardAbility(card.name, card);
        return cardAbility?.rarity === "Legendary" ? card.power : 0;

      case "buffFoil":
        return card.foil ? value : 0;

      case "buffNothing":
        return card.type === "nothing" || card.type === "other" ? value : 0;

      case "buffVibeFID":
        return card.collection === "vibefid" ? value : 0;

      case "buffOnReveal":
        const abilityOR = getCardAbility(card.name, card);
        return abilityOR?.type === "onReveal" ? value : 0;

      case "buffOngoing":
        const abilityOG = getCardAbility(card.name, card);
        return abilityOG?.type === "ongoing" ? value : 0;

      case "buffIfLosing":
        const playerTotal = lane.playerCards.reduce((sum: number, c: DeckCard) => sum + (c.power || 0), 0);
        const cpuTotal = lane.cpuCards.reduce((sum: number, c: DeckCard) => sum + (c.power || 0), 0);
        if (isPlayer && playerTotal < cpuTotal) return value;
        if (!isPlayer && cpuTotal < playerTotal) return value;
        return 0;

      case "debuffEnemy":
        return isPlayer ? 0 : value;

      case "taxHigh":
        // Cards with 50+ base power get debuffed
        return (card.power || 0) >= 50 ? value : 0;

      case "doubleIfFewer":
        // If you have fewer cards than enemy, double your power
        const myCards = isPlayer ? lane.playerCards : lane.cpuCards;
        const theirCards = isPlayer ? lane.cpuCards : lane.playerCards;
        return myCards.length < theirCards.length ? card.power : 0;

      case "gamble":
        return Math.random() > 0.5 ? card.power : -Math.floor(card.power / 2);

      case "swapSides":
      case "reverseOrder":
      case "highestWins":
      case "noVictory":
      case "copyEnemy":
      case "doubleVictory":
      case "noEffect":
      default:
        return 0;
    }
  };

  // Recalculate lane powers with ongoing effects and lane effects
  const recalculateLanePowers = (lanes: any[], currentTurn: number): any[] => {
    return lanes.map((lane: any, laneIdx: number) => {
      let playerPower = 0;
      let cpuPower = 0;

      // Calculate player power with ongoing bonuses + lane effects
      lane.playerCards.forEach((card: DeckCard) => {
        const basePower = card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power;
        const ongoingBonus = calculateOngoingBonus(card, laneIdx, lanes, currentTurn, true);
        const comboBonus = getComboBonus(card, lane.playerCards, lanes, vibefidComboChoices, laneIdx);
        const laneBonus = calculateLaneEffectBonus(card, lane, lane.playerCards, true, currentTurn);
        playerPower += basePower + ongoingBonus + comboBonus + laneBonus;
      });

      // Calculate CPU power with ongoing bonuses + lane effects (CPU doesn't have vibefid choices)
      lane.cpuCards.forEach((card: DeckCard) => {
        const basePower = card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power;
        const ongoingBonus = calculateOngoingBonus(card, laneIdx, lanes, currentTurn, false);
        const comboBonus = getComboBonus(card, lane.cpuCards, lanes);
        const laneBonus = calculateLaneEffectBonus(card, lane, lane.cpuCards, false, currentTurn);
        cpuPower += basePower + ongoingBonus + comboBonus + laneBonus;
      });

      // Apply lane-wide ongoing effects (like buffLaneOngoing)
      lane.playerCards.forEach((card: DeckCard) => {
        const ability = getCardAbility(card.name, card);
        if (ability?.type === "ongoing" && ability.effect.action === "buffLaneOngoing") {
          playerPower += (lane.playerCards.length - 1) * (ability.effect.value || 0);
        }
      });
      lane.cpuCards.forEach((card: DeckCard) => {
        const ability = getCardAbility(card.name, card);
        if (ability?.type === "ongoing" && ability.effect.action === "buffLaneOngoing") {
          cpuPower += (lane.cpuCards.length - 1) * (ability.effect.value || 0);
        }
      });

      // Apply steal effect from combos (reduce enemy power)
      const playerSteal = getComboSteal(lane.playerCards, vibefidComboChoices, laneIdx);
      const cpuSteal = getComboSteal(lane.cpuCards); // CPU doesn't have vibefid choices
      cpuPower = Math.max(0, cpuPower - playerSteal * lane.cpuCards.length);
      playerPower = Math.max(0, playerPower - cpuSteal * lane.playerCards.length);

      // Apply reduceEnemyPower ongoing ability (Dan Romero - Too Cute)
      lane.playerCards.forEach((card: DeckCard) => {
        const ability = getCardAbility(card.name, card);
        if (ability?.type === "ongoing" && ability.effect.action === "reduceEnemyPower") {
          cpuPower = Math.max(0, cpuPower + (ability.effect.value || 0) * lane.cpuCards.length);
        }
      });
      lane.cpuCards.forEach((card: DeckCard) => {
        const ability = getCardAbility(card.name, card);
        if (ability?.type === "ongoing" && ability.effect.action === "reduceEnemyPower") {
          playerPower = Math.max(0, playerPower + (ability.effect.value || 0) * lane.playerCards.length);
        }
      });

      // Special lane effects that swap powers
      if (lane.effect === "swapSides") {
        const temp = playerPower;
        playerPower = cpuPower;
        cpuPower = temp;
      }

      // Copycat Cafe: match enemy's total power
      if (lane.effect === "copyEnemy") {
        if (playerPower < cpuPower) {
          playerPower = cpuPower; // Player copies CPU
        } else if (cpuPower < playerPower) {
          cpuPower = playerPower; // CPU copies player
        }
      }

      // Clown College: reverse order (lower wins) - handled at victory calculation
      // ATH Peak: highest wins - handled at victory calculation
      // Double Stakes: doubleVictory - handled at victory calculation

      return { ...lane, playerPower: Math.max(0, playerPower), cpuPower: Math.max(0, cpuPower) };
    });
  };

  // Helper to detect which lane is under a touch point
  const getLaneUnderTouch = (x: number, y: number): number | null => {
    // Use lane refs to check bounding boxes (works correctly with 3D transforms)
    for (let i = 0; i < 3; i++) {
      const lane = laneRefs.current[i];
      if (lane) {
        const rect = lane.getBoundingClientRect();
        // Check if point is within lane bounds
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return i;
        }
      } else {
        console.log(`Lane ${i} ref is null!`);
      }
    }
    return null;
  };

  const handlePvEPlayCard = (laneIndex: number, cardIndex?: number, chosenComboId?: string) => {
    const actualCardIndex = cardIndex ?? selectedHandCard;
    if (actualCardIndex === null || !pveGameState) return;

    // BLOCK: Cannot play cards during reveal animation or ability resolution
    // Note: Don't check currentPhase because it may have timing issues during transitions
    if (isRevealing || isResolvingAbilities) {
      playSound("error");
      return;
    }

    const card = pveGameState.playerHand[actualCardIndex];
    if (!card) return;

    // Check lane capacity
    const lane = pveGameState.lanes[laneIndex];
    if ((lane?.playerCards?.length || 0) >= TCG_CONFIG.CARDS_PER_LANE) {
      playSound("error");
      return; // Lane is full
    }

    // Calculate energy cost (centralized)
    const foilEffect = getFoilEffect(card.foil);
    const energyCost = getEnergyCost(card);
    const currentEnergy = pveGameState.energy || 1;

    // Check if player has enough energy
    if (energyCost > currentEnergy) {
      playSound("error"); // Play error sound
      return; // Can't play this card
    }

    // VibeFID combo selection: If VibeFID is being played to a lane with other cards
    // and no combo has been chosen yet, show the combo selection modal
    if (card.type === "vibefid" && lane.playerCards.length > 0 && !chosenComboId) {
      // Find all possible combos with cards already in the lane (only revealed cards count for combos)
      const existingCards = lane.playerCards.filter((c: any) => c._revealed !== false);
      const possibleCombos: { combo: CardCombo; partnerCard: string }[] = [];

      for (const existingCard of existingCards) {
        const existingName = resolveCardName(existingCard.name || "");
        // Find combos that include this card
        for (const combo of CARD_COMBOS) {
          const comboCardsLower = combo.cards.map(c => c.toLowerCase());
          if (comboCardsLower.includes(existingName)) {
            // This combo includes the existing card, VibeFID can complete it as wildcard
            possibleCombos.push({ combo, partnerCard: existingCard.name || "" });
          }
        }
      }

      // If there are multiple possible combos, show selection modal
      if (possibleCombos.length > 1) {
        setVibefidComboModal({
          laneIndex,
          card: { ...card, _tempCardIndex: actualCardIndex } as any,
          possibleCombos,
        });
        return; // Wait for player to choose
      } else if (possibleCombos.length === 1) {
        // Only one combo possible, auto-select it
        chosenComboId = possibleCombos[0].combo.id;
      }
    }

    // Store VibeFID combo choice if one was made
    if (card.type === "vibefid" && chosenComboId) {
      setVibefidComboChoices(prev => ({
        ...prev,
        [`${laneIndex}-${card.cardId}`]: chosenComboId,
      }));
    }

    // Consume energy
    let newEnergy = currentEnergy - energyCost;

    // Remove card from hand
    let newHand = [...pveGameState.playerHand];
    newHand.splice(actualCardIndex, 1);

    // Prize foil bonus: Draw a card!
    let newDeck = [...pveGameState.playerDeckRemaining];
    if (foilEffect && foilEffect.energyDiscount >= 1.0 && newDeck.length > 0) {
      newHand.push(newDeck.shift()!);
      playSound("draw"); // Prize foil sound feedback
    }

    // Add card to lane (with base power)
    let newLanes = pveGameState.lanes.map((lane: any, idx: number) => {
      if (idx === laneIndex) {
        const newPlayerCards = [...lane.playerCards, card];
        return { ...lane, playerCards: newPlayerCards };
      }
      return { ...lane };
    });

    // Play card sound
    playSound("card");

    // Add battle log entry
    setBattleLog(prev => [...prev, {
      turn: pveGameState.currentTurn,
      player: "you",
      action: "played",
      lane: laneIndex + 1,
      cardName: card.name || "Unknown",
    }]);

    // NOTE: onReveal abilities are NOT applied here!
    // They will be applied in handlePvEEndTurn after all cards are revealed
    // This prevents players from playing, seeing the effect, then undoing

    // Mark card as "just played this turn" so onReveal triggers on End Turn
    // _revealed: false means card shows face-down until reveal phase
    const cardWithMeta = {
      ...card,
      _playedThisTurn: true,
      _playedLaneIndex: laneIndex,
      _revealed: false,
    };

    // Update lanes with the card (marked as newly played)
    newLanes = newLanes.map((lane: any, idx: number) => {
      if (idx === laneIndex) {
        const updatedCards = [...lane.playerCards];
        updatedCards[updatedCards.length - 1] = cardWithMeta;
        return { ...lane, playerCards: updatedCards };
      }
      return lane;
    });

    // Get ability to check type (for tracking, not applying)
    const ability = getCardAbility(card.name, card);

    // Track card for undo feature
    const newCardPlayedInfo = {
      cardId: card.cardId,
      laneIndex,
      energyCost,
      hadOnReveal: ability?.type === "onReveal",
    };

    // Recalculate base lane powers (without onReveal effects)
    // Only ongoing effects are applied during placement
    newLanes = recalculateLanePowers(newLanes, pveGameState.currentTurn);

    setPveGameState({
      ...pveGameState,
      energy: newEnergy,
      playerHand: newHand,
      playerDeckRemaining: newDeck,
      lanes: newLanes,
      cardsPlayedThisTurn: (pveGameState.cardsPlayedThisTurn || 0) + 1,
      cardsPlayedInfo: [...(pveGameState.cardsPlayedInfo || []), newCardPlayedInfo],
    });
    setSelectedHandCard(null);
  };

  // Sacrifice Nothing/Other card from hand (discard to draw + gain +2 energy!)
  const handleSacrificeNothingFromHand = (cardIndex: number) => {
    if (!pveGameState) return;

    const card = pveGameState.playerHand[cardIndex];
    if (!card || (card.type !== "nothing" && card.type !== "other")) return;

    // +2 ENERGY for sacrificing Nothing!
    const energyGain = 2;
    const newEnergy = (pveGameState.energy || 1) + energyGain;

    // Remove card from hand
    let newHand = [...pveGameState.playerHand];
    newHand.splice(cardIndex, 1);

    // Draw a new card if deck has cards
    let newDeck = [...pveGameState.playerDeckRemaining];
    if (newDeck.length > 0) {
      newHand.push(newDeck.shift()!);
    }

    playSound("ability");

    setPveGameState({
      ...pveGameState,
      energy: newEnergy,
      playerHand: newHand,
      playerDeckRemaining: newDeck,
    });
    setSelectedHandCard(null);
  };

  // LANDMINE Kamikaze - sacrifice from lane to destroy highest enemy
  const handleLandmineKamikaze = (laneIndex: number, cardIndex: number) => {
    if (!pveGameState) return;

    const lane = pveGameState.lanes[laneIndex];
    const card = lane.playerCards[cardIndex];

    // Only LANDMINE can do kamikaze
    if (!card || (card.name || "").toLowerCase() !== "landmine") return;

    // Find highest power enemy in this lane
    const enemyCards = lane.cpuCards || [];
    let highestEnemyIdx = -1;
    let highestEnemyPower = -1;

    enemyCards.forEach((enemy: any, idx: number) => {
      const enemyPower = enemy.type === "nothing" || enemy.type === "other" ? Math.floor(enemy.power * 0.5) : enemy.power;
      if (enemyPower > highestEnemyPower) {
        highestEnemyPower = enemyPower;
        highestEnemyIdx = idx;
      }
    });

    // 🎬 ANIMATION: Landmine flies up and crashes into enemy!
    triggerCardAnimation(laneIndex, "player", cardIndex, "kamikaze", undefined, 600);

    // After Landmine reaches enemy, enemy explodes
    if (highestEnemyIdx >= 0) {
      setTimeout(() => {
        triggerCardAnimation(laneIndex, "cpu", highestEnemyIdx, "explode", undefined, 500);
        triggerAbilityEffect("destroy", laneIndex, "player", laneIndex, "cpu", "💥", -highestEnemyPower);
        playSound("bomb");
      }, 400);
    } else {
      // No enemy to hit, just explosion sound
      setTimeout(() => playSound("bomb"), 400);
    }

    // Delay removal so animation plays first
    setTimeout(() => {
      // Create new lanes with both cards removed
      const newLanes = pveGameState.lanes.map((l: any, idx: number) => {
        if (idx !== laneIndex) return l;

        // Remove LANDMINE from player cards
        const newPlayerCards = l.playerCards.filter((_: any, i: number) => i !== cardIndex);

        // Remove highest enemy (if exists)
        const newCpuCards = highestEnemyIdx >= 0
          ? l.cpuCards.filter((_: any, i: number) => i !== highestEnemyIdx)
          : l.cpuCards;

        return { ...l, playerCards: newPlayerCards, cpuCards: newCpuCards };
      });

      // Recalculate powers
      const recalculatedLanes = recalculateLanePowers(newLanes, pveGameState.currentTurn);

      setPveGameState({
        ...pveGameState,
        lanes: recalculatedLanes,
      });
    }, 600);
  };

  // NAUGHTY SANTA Charm - seduce an enemy card to your side
  const handleSantaCharm = (laneIndex: number, cardIndex: number) => {
    if (!pveGameState) return;

    const lane = pveGameState.lanes[laneIndex];
    const card = lane.playerCards[cardIndex];

    // Only NAUGHTY SANTA can charm
    if (!card || (card.name || "").toLowerCase() !== "naughty santa") return;

    // Need enemy cards to charm
    const enemyCards = lane.cpuCards || [];
    if (enemyCards.length === 0) return;

    // Find a random enemy to charm (take the first one)
    const charmedEnemy = enemyCards[0];

    // 🎬 ANIMATION: Santa pulses pink, enemy card glows pink
    triggerCardAnimation(laneIndex, "player", cardIndex, "pulse", undefined, 800);
    triggerCardAnimation(laneIndex, "cpu", 0, "glow-green", undefined, 800); // Green = switching sides

    // Play Oiroke no Jutsu sound for Santa charm
    try {
      const audio = new Audio("/sounds/oiroke-no-jutsu.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      playSound("ability");
    }

    // Delay state change so animation plays first
    setTimeout(() => {
      // Create new lanes with enemy moved to player side
      const newLanes = pveGameState.lanes.map((l: any, idx: number) => {
        if (idx !== laneIndex) return l;

        // Add charmed enemy to player cards
        const newPlayerCards = [...l.playerCards, { ...charmedEnemy, charmed: true }];

        // Remove charmed enemy from CPU
        const newCpuCards = l.cpuCards.slice(1);

        return { ...l, playerCards: newPlayerCards, cpuCards: newCpuCards };
      });

      // Recalculate powers
      const recalculatedLanes = recalculateLanePowers(newLanes, pveGameState.currentTurn);

      // Remove Santa after using charm (one-time use)
      const finalLanes = recalculatedLanes.map((l: any, idx: number) => {
        if (idx !== laneIndex) return l;
        return {
          ...l,
          playerCards: l.playerCards.filter((_: any, i: number) => i !== cardIndex),
        };
      });

      setPveGameState({
        ...pveGameState,
        lanes: recalculateLanePowers(finalLanes, pveGameState.currentTurn),
      });
    }, 800);
  };

  // Return card from lane back to hand (undo play)
  const handleReturnCardToHand = (laneIndex: number, cardIndex: number) => {
    if (!pveGameState) return;

    const lane = pveGameState.lanes[laneIndex];
    const card = lane.playerCards[cardIndex];
    if (!card) return;

    // Find the card info in cardsPlayedInfo
    const playedInfo = (pveGameState.cardsPlayedInfo || []).find(
      (info: any) => info.cardId === card.cardId && info.laneIndex === laneIndex
    );

    // Only allow returning cards played THIS turn
    if (!playedInfo) {
      playSound("error");
      return;
    }

    // Warning: if card had onReveal, effects already applied
    if (playedInfo.hadOnReveal) {
      // Still allow, but user should know effects were applied
    }

    // Remove card from lane
    const newLanes = pveGameState.lanes.map((l: any, idx: number) => {
      if (idx !== laneIndex) return l;
      return {
        ...l,
        playerCards: l.playerCards.filter((_: any, i: number) => i !== cardIndex),
      };
    });

    // Return card to hand
    const newHand = [...pveGameState.playerHand, card];

    // Refund energy
    const newEnergy = (pveGameState.energy || 0) + playedInfo.energyCost;

    // Remove from cardsPlayedInfo
    const newCardsPlayedInfo = (pveGameState.cardsPlayedInfo || []).filter(
      (info: any) => !(info.cardId === card.cardId && info.laneIndex === laneIndex)
    );

    // Recalculate powers
    const recalculatedLanes = recalculateLanePowers(newLanes, pveGameState.currentTurn);

    playSound("card"); // Same sound as playing

    setPveGameState({
      ...pveGameState,
      lanes: recalculatedLanes,
      playerHand: newHand,
      energy: newEnergy,
      cardsPlayedThisTurn: Math.max(0, (pveGameState.cardsPlayedThisTurn || 0) - 1),
      cardsPlayedInfo: newCardsPlayedInfo,
    });
  };

  const handlePvEEndTurn = () => {
    if (!pveGameState || isRevealing) return;

    // Reset timer
    setTurnTimeRemaining(TCG_CONFIG.TURN_TIME_SECONDS);

    // PHASE 1: REVEAL - Cards are being revealed
    setCurrentPhase("reveal");
    playSound("turn");

    // Track CPU cards before/after to detect if CPU skipped
    const cpuCardsBefore = pveGameState.lanes.reduce((sum: number, l: any) => sum + l.cpuCards.length, 0);

    // CPU plays cards using smart AI
    const cpuResult = cpuPlayCards(pveGameState);
    const cpuHand = cpuResult.cpuHand;
    const cpuDeckRemaining = cpuResult.cpuDeckRemaining;
    const newLanes = cpuResult.lanes;

    // Add CPU plays to battle log
    if (cpuResult.cpuPlays) {
      setBattleLog(prev => [...prev, ...cpuResult.cpuPlays.map((play: any) => ({
        turn: pveGameState.currentTurn,
        player: "cpu" as const,
        action: "played",
        lane: play.lane,
        cardName: play.cardName,
      }))]);
    }

    const cpuCardsAfter = newLanes.reduce((sum: number, l: any) => sum + l.cpuCards.length, 0);
    const cpuSkipped = cpuCardsAfter === cpuCardsBefore;

    // Collect all unrevealed cards for the reveal queue
    const cardsToReveal: { laneIdx: number; side: "player" | "cpu"; cardIdx: number; card: DeckCard }[] = [];

    newLanes.forEach((lane: any, laneIdx: number) => {
      lane.playerCards.forEach((card: DeckCard, cardIdx: number) => {
        if ((card as any)._revealed === false) {
          cardsToReveal.push({ laneIdx, side: "player", cardIdx, card });
        }
      });
      lane.cpuCards.forEach((card: DeckCard, cardIdx: number) => {
        if ((card as any)._revealed === false) {
          cardsToReveal.push({ laneIdx, side: "cpu", cardIdx, card });
        }
      });
    });

    // Sort cards: alternate player/cpu for dramatic reveal
    const playerReveals = cardsToReveal.filter(c => c.side === "player");
    const cpuReveals = cardsToReveal.filter(c => c.side === "cpu");
    const sortedReveals: typeof cardsToReveal = [];
    const maxLen = Math.max(playerReveals.length, cpuReveals.length);
    for (let i = 0; i < maxLen; i++) {
      if (playerReveals[i]) sortedReveals.push(playerReveals[i]);
      if (cpuReveals[i]) sortedReveals.push(cpuReveals[i]);
    }

    // Update game state with CPU cards (still face-down)
    setPveGameState({
      ...pveGameState,
      lanes: newLanes,
      cpuHand,
      cpuDeckRemaining,
    });

    // Store data for continuation after reveals
    pendingRevealDataRef.current = { cpuHand, cpuDeckRemaining, cpuSkipped };

    // If no cards to reveal, skip directly to ability processing
    if (sortedReveals.length === 0) {
      continueAfterReveal();
      return;
    }

    // Start the reveal sequence
    setRevealQueue(sortedReveals);
    setIsRevealing(true);
  };

  // Keep refs updated so timer callback always has latest version
  useEffect(() => {
    handlePvEEndTurnRef.current = handlePvEEndTurn;
    handleSubmitTurnRef.current = handleSubmitTurn;
  });

  // Process reveal queue - reveals cards one at a time with animations
  useEffect(() => {
    if (!isRevealing || revealQueue.length === 0 || !pveGameState) return;

    const timeoutId = setTimeout(() => {
      const [currentReveal, ...remainingQueue] = revealQueue;

      // Reveal this card in the game state and check for new combos
      setPveGameState(prev => {
        if (!prev) return prev;
        const newLanes = prev.lanes.map((lane: any, laneIdx: number) => {
          if (laneIdx !== currentReveal.laneIdx) return lane;

          if (currentReveal.side === "player") {
            return {
              ...lane,
              playerCards: lane.playerCards.map((c: DeckCard, cIdx: number) => {
                if (cIdx !== currentReveal.cardIdx) return c;
                return { ...c, _revealed: true };
              }),
            };
          } else {
            return {
              ...lane,
              cpuCards: lane.cpuCards.map((c: DeckCard, cIdx: number) => {
                if (cIdx !== currentReveal.cardIdx) return c;
                return { ...c, _revealed: true };
              }),
            };
          }
        });

        // Check for NEW combos after this reveal
        const laneCards = currentReveal.side === "player"
          ? newLanes[currentReveal.laneIdx].playerCards.filter((c: any) => c._revealed !== false)
          : newLanes[currentReveal.laneIdx].cpuCards.filter((c: any) => c._revealed !== false);

        let newCombos = detectCombos(laneCards);

        // ONLY ONE COMBO PER LANE - for player side, respect VibeFID choice
        if (currentReveal.side === "player" && newCombos.length > 0) {
          const vibefidCards = laneCards.filter((c: any) => c.type === "vibefid");
          const chosenComboIds = vibefidCards
            .map((c: any) => vibefidComboChoices[`${currentReveal.laneIdx}-${c.cardId}`])
            .filter(Boolean);

          if (chosenComboIds.length > 0) {
            // VibeFID choice exists - ONLY that combo
            const chosenCombo = newCombos.find(({ combo }) => chosenComboIds.includes(combo.id));
            newCombos = chosenCombo ? [chosenCombo] : [];
          } else {
            // No VibeFID choice - only first combo
            newCombos = [newCombos[0]];
          }
        } else if (currentReveal.side === "cpu" && newCombos.length > 0) {
          // CPU also gets only one combo per lane
          newCombos = [newCombos[0]];
        }

        // Show popup for NEW combos only (filter out already shown combos first)
        const trulyNewCombos = newCombos.filter(({ combo }) => {
          const comboKey = `${currentReveal.laneIdx}-${currentReveal.side}-${combo.id}`;
          return !shownCombosRef.current.has(comboKey);
        });

        trulyNewCombos.forEach(({ combo }, comboIdx) => {
          const comboKey = `${currentReveal.laneIdx}-${currentReveal.side}-${combo.id}`;
          shownCombosRef.current.add(comboKey);
          // Play combo voice announcement (staggered timing for multiple combos)
          const comboDelay = comboIdx * 2500; // 2.5s between each combo voice
          setTimeout(() => {
            playComboVoice(combo.id);
          }, 100 + comboDelay);
        });

        return { ...prev, lanes: newLanes };
      });

      // Play flip sound
      playSound("card");

      // Trigger flip animation for this card
      triggerCardAnimation(
        currentReveal.laneIdx,
        currentReveal.side,
        currentReveal.cardIdx,
        "pulse",
        0
      );

      // Update queue (remove processed card)
      setRevealQueue(remainingQueue);

      // If queue is empty, continue to ability processing
      if (remainingQueue.length === 0) {
        // Check if any combos were shown this turn - need extra delay for voice to finish
        const hadCombos = shownCombosRef.current.size > 0;
        const delayAfterReveal = hadCombos ? 2500 : 500; // Extra delay for combo voices
        setTimeout(() => {
          setIsRevealing(false);
          shownCombosRef.current.clear(); // Reset for next turn
          continueAfterReveal();
        }, delayAfterReveal);
      }
    }, 700); // Delay between each reveal (increased for better pacing)

    return () => clearTimeout(timeoutId);
  }, [revealQueue, isRevealing, pveGameState]);

  // Continuation after all cards are revealed - process abilities and resolve
  const continueAfterReveal = () => {
    if (!pveGameState || !pendingRevealDataRef.current) return;

    const { cpuHand, cpuDeckRemaining, cpuSkipped } = pendingRevealDataRef.current;
    pendingRevealDataRef.current = null;

    let newLanes = [...pveGameState.lanes];

    // Check for stealOnSkip ability if CPU skipped
    if (cpuSkipped) {
      for (let li = 0; li < 3; li++) {
        const playerCardsInLane = newLanes[li].playerCards || [];
        const hasStealOnSkip = playerCardsInLane.some((c: DeckCard) => {
          const ability = getCardAbility(c.name, c);
          return ability?.effect?.action === "stealOnSkip";
        });

        if (hasStealOnSkip) {
          let strongestLane = -1;
          let strongestIdx = -1;
          let strongestPower = -1;
          newLanes.forEach((lane: any, lIdx: number) => {
            lane.cpuCards.forEach((card: DeckCard, cIdx: number) => {
              if (card.power > strongestPower) {
                strongestLane = lIdx;
                strongestIdx = cIdx;
                strongestPower = card.power;
              }
            });
          });

          if (strongestLane >= 0 && strongestIdx >= 0) {
            const stolenCard = { ...newLanes[strongestLane].cpuCards[strongestIdx] };
            newLanes[strongestLane].cpuCards.splice(strongestIdx, 1);
            newLanes[strongestLane].cpuPower -= stolenCard.power;
            stolenCard.power = Math.floor(stolenCard.power * 0.5);
            newLanes[li].playerCards.push(stolenCard);
            newLanes[li].playerPower += stolenCard.power;
            playSound("steal");
          }
          break;
        }
      }
    }

    // PHASE 2: ABILITY - Process onReveal abilities in order
    setCurrentPhase("ability");

    const cardsToProcess: { card: DeckCard; laneIndex: number; side: "player" | "cpu"; ability: any }[] = [];

    newLanes.forEach((lane: any, laneIdx: number) => {
      lane.playerCards.forEach((card: DeckCard) => {
        if ((card as any)._playedThisTurn) {
          const ability = getCardAbility(card.name, card);
          if (ability?.type === "onReveal") {
            cardsToProcess.push({ card, laneIndex: laneIdx, side: "player", ability });
          }
        }
      });
      lane.cpuCards.forEach((card: DeckCard) => {
        if ((card as any)._playedThisTurn) {
          const ability = getCardAbility(card.name, card);
          if (ability?.type === "onReveal") {
            cardsToProcess.push({ card, laneIndex: laneIdx, side: "cpu", ability });
          }
        }
      });
    });

    const sortedCards = sortByResolutionOrder(cardsToProcess);

    let playerHand = [...pveGameState.playerHand];
    let playerDeck = [...pveGameState.playerDeckRemaining];

    // Smart timing: base delay scales with number of abilities (faster if fewer)
    const numAbilities = sortedCards.length;
    const BASE_DELAY_MS = numAbilities <= 2 ? 450 : numAbilities <= 4 ? 350 : 300;

    // Process all abilities immediately (state changes)
    const abilityResults: {
      card: DeckCard;
      laneIndex: number;
      side: "player" | "cpu";
      ability: any;
      result: any;
      animationType: "glow-green" | "glow-red" | "shake" | "pulse";
      actionType: "buff" | "debuff" | "destroy" | "steal" | "none";
    }[] = [];

    const BUFF_ACTIONS = [
      "buffSelf", "buffAllLanes", "buffLane", "buffAdjacent", "buffByRarity",
      "buffOtherLanes", "buffWeakest", "buffLastPlayed", "buffPerCardInLane",
      "buffPerFriendly", "buffPerCardsPlayed", "buffPerHandSize", "buffIfTurn",
      "buffIfFirst", "buffIfHandSize", "buffPerRarity", "buffPerTurn", "buffEachTurn",
      "buffLaneEndTurn", "buffPerCardInPlay", "buffLaneOngoing", "buffIfFewerCards",
      "vibefidFirstCast", "vibefidRatio", "vibefidDoxxed", "adaptivePower",
    ];
    const DEBUFF_ACTIONS = ["debuffLane", "debuffRandomEnemy", "debuffStrongest", "reduceEnemyPower", "lockPowerGain"];
    const DESTROY_ACTIONS = ["destroyHighestEnemy", "timeBomb", "sacrificeBuffAll", "destroyLoneCard", "kamikaze"];
    const STEAL_ACTIONS = ["stealWeakest", "stealPower", "stealStrongest", "copyHighest", "copyAbility", "copyPowerLeft", "stealFromAll"];

    // First pass: apply all abilities and collect results
    sortedCards.forEach((item) => {
      const { card, laneIndex, side, ability } = item;
      const isPlayer = side === "player";

      const result = applyOnRevealAbility(
        card,
        laneIndex,
        newLanes,
        playerHand,
        playerDeck,
        isPlayer,
        pveGameState.currentTurn,
        (entry) => setBattleLog(prev => [...prev, entry])
      );

      newLanes = result.lanes;
      playerHand = result.playerHand;
      playerDeck = result.playerDeckRemaining;

      if (result.bonusPower !== 0) {
        const cardArray = isPlayer ? newLanes[laneIndex].playerCards : newLanes[laneIndex].cpuCards;
        const cardIdx = cardArray.findIndex((c: DeckCard) => c.cardId === card.cardId);
        if (cardIdx >= 0) {
          cardArray[cardIdx] = {
            ...cardArray[cardIdx],
            power: cardArray[cardIdx].power + result.bonusPower,
          };
        }
      }

      // Determine animation type
      const action = ability?.effect?.action || "";
      let animationType: "glow-green" | "glow-red" | "shake" | "pulse" = "pulse";
      let actionType: "buff" | "debuff" | "destroy" | "steal" | "none" = "none";

      if (BUFF_ACTIONS.some(a => action.includes(a))) {
        animationType = "glow-green";
        actionType = "buff";
      } else if (DESTROY_ACTIONS.some(a => action.includes(a))) {
        animationType = "shake";
        actionType = "destroy";
      } else if (DEBUFF_ACTIONS.some(a => action.includes(a))) {
        animationType = "glow-red";
        actionType = "debuff";
      } else if (STEAL_ACTIONS.some(a => action.includes(a))) {
        animationType = "pulse";
        actionType = "steal";
      }

      abilityResults.push({ card, laneIndex, side, ability, result, animationType, actionType });
    });

    // Second pass: schedule animations/sounds with smart timing
    abilityResults.forEach((item, idx) => {
      const { card, laneIndex, side, result, animationType, actionType } = item;
      const isPlayer = side === "player";
      const baseDelay = idx * BASE_DELAY_MS;

      const cardArrayForAnim = isPlayer ? newLanes[laneIndex].playerCards : newLanes[laneIndex].cpuCards;
      const cardIdxForAnim = cardArrayForAnim.findIndex((c: DeckCard) => c.cardId === card.cardId);
      const oppositeSide = side === "player" ? "cpu" : "player";

      // Schedule card glow animation
      if (cardIdxForAnim >= 0) {
        setTimeout(() => {
          triggerCardAnimation(laneIndex, side, cardIdxForAnim, animationType, result.bonusPower);
        }, baseDelay);
      }

      // Schedule ability-specific effects
      const action = item.ability?.effect?.action || "";

      // Special case: kamikaze (Landmine) - fly to enemy and explode both
      if (action === "kamikaze") {
        setTimeout(() => {
          // Card flies to enemy (kamikaze animation)
          triggerCardAnimation(laneIndex, side, cardIdxForAnim, "kamikaze", undefined, 800);
          playSound("hit");
        }, baseDelay);

        // Attack effect + explosion
        setTimeout(() => {
          // Show attack emoji traveling to enemy
          const oppositeSide = side === "player" ? "cpu" : "player";
          triggerAbilityEffect("attack", laneIndex, side, laneIndex, oppositeSide, "👊", 0);
          playSound("bomb");
        }, baseDelay + 400);

        // Enemy card explodes
        setTimeout(() => {
          const enemyCardArray = side === "player" ? newLanes[laneIndex].cpuCards : newLanes[laneIndex].playerCards;
          if (enemyCardArray.length > 0) {
            // Find highest power enemy (the one that gets destroyed)
            const highestIdx = enemyCardArray.reduce((maxIdx: number, c: any, i: number, arr: any[]) =>
              (c.power || 0) > (arr[maxIdx]?.power || 0) ? i : maxIdx, 0);
            triggerCardAnimation(laneIndex, oppositeSide, highestIdx, "explode", undefined, 600);
          }
        }, baseDelay + 600);
      }
      // Special case: sacrificeBuffAll (Melted) - self-sacrifice + buff allies
      else if (action === "sacrificeBuffAll") {
        setTimeout(() => {
          // Self explodes
          triggerCardAnimation(laneIndex, side, cardIdxForAnim, "explode", undefined, 600);
          triggerAbilityEffect("destroy", laneIndex, side, laneIndex, side, "💀", 0);
          playSound("bomb");
        }, baseDelay);

        // All allies glow green (buffed)
        setTimeout(() => {
          newLanes.forEach((lane: any, lIdx: number) => {
            const allyCards = side === "player" ? lane.playerCards : lane.cpuCards;
            allyCards.forEach((_: any, cIdx: number) => {
              triggerCardAnimation(lIdx, side, cIdx, "glow-green", 20, 500);
            });
          });
          triggerAbilityEffect("buff", laneIndex, side, laneIndex, side, "✨", result.bonusPower);
        }, baseDelay + 300);
      } else if (actionType === "debuff" || actionType === "destroy") {
        // Only trigger attack effects if there are enemy cards to attack
        const enemyCards = oppositeSide === "cpu" ? newLanes[laneIndex].cpuCards : newLanes[laneIndex].playerCards;
        if (enemyCards.length > 0) {
          const emoji = actionType === "destroy" ? "💥" : "⚔️";
          setTimeout(() => {
            triggerAbilityEffect("attack", laneIndex, side, laneIndex, oppositeSide, emoji, result.bonusPower);
            playSound("hit");
          }, baseDelay);

          // Shake enemy cards (no extra sound - hit sound already played above)
          const isLaneWide = action.includes("debuffLane") || action.includes("AllLanes");
          setTimeout(() => {
            if (isLaneWide) {
              enemyCards.forEach((_: any, cardIdx: number) => {
                triggerCardAnimation(laneIndex, oppositeSide, cardIdx, "shake", undefined, 400);
              });
            } else {
              const strongestIdx = enemyCards.reduce((maxIdx: number, c: any, i: number, arr: any[]) =>
                (c.power || 0) > (arr[maxIdx]?.power || 0) ? i : maxIdx, 0);
              triggerCardAnimation(laneIndex, oppositeSide, strongestIdx, "shake", undefined, 400);
            }
          }, baseDelay + 150);
        }
      } else if (actionType === "steal") {
        // Only trigger steal effects if there are enemy cards to steal from
        const enemyCardsSteal = oppositeSide === "cpu" ? newLanes[laneIndex].cpuCards : newLanes[laneIndex].playerCards;
        if (enemyCardsSteal.length > 0) {
          const isCharm = action === "stealWeakest"; // Naughty Santa charm
          setTimeout(() => {
            triggerAbilityEffect("steal", laneIndex, oppositeSide, laneIndex, side, isCharm ? "💕" : "🔮", result.bonusPower);
            // Play charm sound for stealWeakest (Naughty Santa)
            if (isCharm) {
              try {
                const audio = new Audio("/sounds/oiroke-no-jutsu.mp3");
                audio.volume = 0.5;
                audio.play().catch(() => playSound("steal"));
              } catch {
                playSound("steal");
              }
            } else {
              playSound("steal");
            }
          }, baseDelay);

          setTimeout(() => {
            if (action.includes("stealFromAll")) {
              enemyCardsSteal.forEach((_: any, cardIdx: number) => {
                triggerCardAnimation(laneIndex, oppositeSide, cardIdx, "shake", undefined, 400);
              });
            } else {
              const weakestIdx = enemyCardsSteal.reduce((minIdx: number, c: any, i: number, arr: any[]) =>
                (c.power || 999) < (arr[minIdx]?.power || 999) ? i : minIdx, 0);
              triggerCardAnimation(laneIndex, oppositeSide, weakestIdx, isCharm ? "glow-green" : "shake", undefined, 400);
            }
          }, baseDelay + 150);
        }
      } else if (actionType === "buff" && result.bonusPower !== 0) {
        setTimeout(() => {
          triggerAbilityEffect("buff", laneIndex, side, laneIndex, side, "✨", result.bonusPower);
        }, baseDelay);
      }
    });

    // Process TIME BOMBS - destroy all cards in lane if bomb turn reached
    const currentTurnNum = pveGameState.currentTurn;
    newLanes.forEach((lane: any, laneIdx: number) => {
      // Check player cards for bombs
      lane.playerCards.forEach((c: any) => {
        if (c._bombTurn && c._bombTurn <= currentTurnNum) {
          // BOOM! Destroy ALL cards in this lane
          playSound("bomb");
          lane.playerCards = [];
          lane.cpuCards = [];
          lane.playerPower = 0;
          lane.cpuPower = 0;
        }
      });
      // Check CPU cards for bombs
      lane.cpuCards.forEach((c: any) => {
        if (c._bombTurn && c._bombTurn <= currentTurnNum) {
          playSound("bomb");
          lane.playerCards = [];
          lane.cpuCards = [];
          lane.playerPower = 0;
          lane.cpuPower = 0;
        }
      });
    });

    // Remove SACRIFICED cards (from sacrificeBuffAll ability)
    newLanes = newLanes.map((lane: any) => ({
      ...lane,
      playerCards: lane.playerCards.filter((c: any) => !c._sacrificed),
      cpuCards: lane.cpuCards.filter((c: any) => !c._sacrificed),
    }));

    // Recalculate lane powers after removing sacrificed cards
    newLanes = newLanes.map((lane: any) => ({
      ...lane,
      playerPower: lane.playerCards.reduce((sum: number, c: DeckCard) => sum + (c.power || 0), 0),
      cpuPower: lane.cpuCards.reduce((sum: number, c: DeckCard) => sum + (c.power || 0), 0),
    }));

    // Clear _playedThisTurn and _revealed flags from all cards
    newLanes = newLanes.map((lane: any) => ({
      ...lane,
      playerCards: lane.playerCards.map((c: DeckCard) => {
        const { _playedThisTurn, _playedLaneIndex, _revealed, _bombTurn, _bombLane, _sacrificed, ...cleanCard } = c as any;
        return cleanCard;
      }),
      cpuCards: lane.cpuCards.map((c: DeckCard) => {
        const { _playedThisTurn, _playedLaneIndex, _revealed, _bombTurn, _bombLane, _sacrificed, ...cleanCard } = c as any;
        return cleanCard;
      }),
    }));

    pveGameState.playerHand = playerHand;
    pveGameState.playerDeckRemaining = playerDeck;

    const nextTurn = pveGameState.currentTurn + 1;
    newLanes = recalculateLanePowers(newLanes, pveGameState.currentTurn);

    // Smart timing: wait for all ability animations before transitioning to resolve
    const totalAnimationTime = numAbilities > 0 ? (numAbilities * BASE_DELAY_MS) + 800 : 0;

    setTimeout(() => {
      setCurrentPhase("resolve");
    }, totalAnimationTime);

    // Check if game over
    if (pveGameState.currentTurn >= TCG_CONFIG.TOTAL_TURNS) {
      // Process CONVERT ENERGY END GAME ability (Vibe Intern - Epic)
      // Check if player has any card with this ability
      const remainingEnergy = pveGameState.energy || 0;
      newLanes.forEach((lane: any) => {
        lane.playerCards.forEach((c: DeckCard) => {
          const ability = getCardAbility(c.name, c);
          if (ability?.effect?.action === "convertEnergyEndGame" && remainingEnergy > 0) {
            const powerPerEnergy = ability.effect.powerPerEnergy || 8;
            const bonusPower = remainingEnergy * powerPerEnergy;
            c.power += bonusPower;
            lane.playerPower += bonusPower;
          }
        });
        // CPU version
        const cpuRemainingEnergy = pveGameState.cpuEnergy || 0;
        lane.cpuCards.forEach((c: DeckCard) => {
          const ability = getCardAbility(c.name, c);
          if (ability?.effect?.action === "convertEnergyEndGame" && cpuRemainingEnergy > 0) {
            const powerPerEnergy = ability.effect.powerPerEnergy || 8;
            const bonusPower = cpuRemainingEnergy * powerPerEnergy;
            c.power += bonusPower;
            lane.cpuPower += bonusPower;
          }
        });
      });

      let playerWins = 0;
      let cpuWins = 0;

      newLanes.forEach((lane: any) => {
        if (lane.effect === "noVictory") return;
        const playerScore = lane.playerPower;
        const cpuScore = lane.cpuPower;
        const victoryValue = lane.effect === "doubleVictory" ? 2 : 1;

        if (lane.effect === "reverseOrder") {
          if (playerScore < cpuScore) playerWins += victoryValue;
          else if (cpuScore < playerScore) cpuWins += victoryValue;
          return;
        }

        if (playerScore > cpuScore) playerWins += victoryValue;
        else if (cpuScore > playerScore) cpuWins += victoryValue;
      });

      let winner: string;
      let tiebreaker: { type: string; playerPower: number; cpuPower: number } | null = null;

      if (playerWins > cpuWins) {
        winner = "player";
      } else if (cpuWins > playerWins) {
        winner = "cpu";
      } else {
        const playerHandPower = pveGameState.playerHand.reduce((sum: number, c: any) => sum + (c.power || 0), 0);
        const cpuHandPower = cpuHand.reduce((sum: number, c: any) => sum + (c.power || 0), 0);
        tiebreaker = { type: "hand", playerPower: playerHandPower, cpuPower: cpuHandPower };

        if (playerHandPower > cpuHandPower) {
          winner = "player";
        } else if (cpuHandPower > playerHandPower) {
          winner = "cpu";
        } else {
          const playerBoardPower = newLanes.reduce((sum: number, l: any) => sum + l.playerPower, 0);
          const cpuBoardPower = newLanes.reduce((sum: number, l: any) => sum + l.cpuPower, 0);
          tiebreaker = { type: "board", playerPower: playerBoardPower, cpuPower: cpuBoardPower };
          winner = playerBoardPower >= cpuBoardPower ? "player" : "cpu";
        }
      }

      // Award AURA for wins within daily rewarded battles
      const earnedAura = winner === "player" && dailyBattles <= REWARDED_BATTLES_PER_DAY;
      if (earnedAura && address) {
        awardPvECoins({ address, difficulty: "gey", won: true }).catch((e: any) => {
          console.error("[TCG] Failed to award AURA:", e);
        });
      }

      // TCG Missions
      if (address) {
        const newMatchCount = tcgMatchCount + 1;
        setTcgMatchCount(newMatchCount);

        // First PvE win
        if (winner === "player") {
          markTcgMission({ playerAddress: address, missionType: "tcg_pve_win" }).catch(() => {});
          setTcgWinStreak(prev => {
            const newStreak = prev + 1;
            if (newStreak >= 3) {
              markTcgMission({ playerAddress: address, missionType: "tcg_win_streak_3" }).catch(() => {});
            }
            return newStreak;
          });
        } else {
          setTcgWinStreak(0);
        }

        // Play 3 matches
        if (newMatchCount >= 3) {
          markTcgMission({ playerAddress: address, missionType: "tcg_play_3" }).catch(() => {});
        }
      }

      setPveGameState({
        ...pveGameState,
        lanes: newLanes,
        cpuHand,
        cpuDeckRemaining,
        gameOver: true,
        winner,
        tiebreaker,
        auraRewarded: earnedAura, // Track if this match gave AURA
      });

      if (tiebreaker) {
        setShowTiebreakerAnimation(true);
        setTimeout(() => {
          setShowTiebreakerAnimation(false);
          if (winner === "player") playSound("victory");
          else playSound("defeat");
          setView("result");
          // Trigger defeat bait after 5 seconds
          if (winner !== "player") {
            setTimeout(() => {
              stopBgm();
              setShowDefeatBait(true);
            }, 5000);
          }
        }, 3500);
      } else {
        setTimeout(() => {
          if (winner === "player") playSound("victory");
          else playSound("defeat");
          setView("result");
          // Trigger defeat bait after 5 seconds
          if (winner !== "player") {
            setTimeout(() => {
              stopBgm();
              setShowDefeatBait(true);
            }, 5000);
          }
        }, 2500);
      }
      return;
    }

    // Next turn
    if (playerDeck.length > 0) {
      playerHand.push(playerDeck.shift()!);
    }
    let cpuHandNext = [...cpuHand];
    let cpuDeckNext = [...cpuDeckRemaining];
    if (cpuDeckNext.length > 0) {
      cpuHandNext.push(cpuDeckNext.shift()!);
    }

    newLanes = recalculateLanePowers(newLanes, nextTurn);

    const playerSkipped = (pveGameState.cardsPlayedThisTurn || 0) === 0;
    let bonusEnergy = playerSkipped ? 2 : 0;
    if (playerSkipped) playSound("energy");

    // Check for ENERGY PER TURN ability (Rachel - Common)
    // Add +1 energy for each card with this ability on the board
    let energyPerTurnBonus = 0;
    newLanes.forEach((lane: any) => {
      lane.playerCards.forEach((c: DeckCard) => {
        const ability = getCardAbility(c.name, c);
        if (ability?.effect?.action === "energyPerTurn") {
          energyPerTurnBonus += ability.effect.value || 1;
        }
      });
    });
    if (energyPerTurnBonus > 0) {
      bonusEnergy += energyPerTurnBonus;
      playSound("energy");
    }

    setPveGameState({
      ...pveGameState,
      currentTurn: nextTurn,
      energy: nextTurn + bonusEnergy,
      cpuEnergy: nextTurn,
      playerHand,
      playerDeckRemaining: playerDeck,
      cpuHand: cpuHandNext,
      cpuDeckRemaining: cpuDeckNext,
      lanes: newLanes,
      cardsPlayedThisTurn: 0,
      cardsPlayedInfo: [],
    });

    setTimeout(() => {
      setCurrentPhase("play");
    }, 500);
  };

  const handleCreateMatch = async () => {
    if (!address) return;
    setError(null);

    try {
      const result = await createMatch({ address, username });
      setCurrentMatchId(result.matchId);
      setView("waiting");
    } catch (err: any) {
      setError(err.message || "Failed to create match");
    }
  };

  const handleJoinMatch = async (roomId: string) => {
    if (!address) return;
    setError(null);

    try {
      const result = await joinMatch({ roomId: roomId.toUpperCase(), address, username });
      setCurrentMatchId(result.matchId);
      setView("battle");
    } catch (err: any) {
      // Extract Convex error message
      const msg = err?.data?.message || err?.message || "Failed to join match";
      // Clean up Convex error format
      const cleanMsg = msg.replace(/^\[.*?\]\s*/, '').replace(/Uncaught Error:\s*/i, '');
      setError(cleanMsg || "Room not found or match unavailable");
    }
  };

  const handleSaveDeck = async () => {
    if (!address || selectedCards.length !== TCG_CONFIG.DECK_SIZE) return;
    setError(null);

    try {
      await saveDeck({
        address,
        deckName,
        cards: selectedCards.map((c: DeckCard) => ({
          type: c.type,
          cardId: c.cardId,
          name: c.name,
          rarity: c.rarity,
          power: c.power,
          imageUrl: c.imageUrl,
          foil: c.foil,
          wear: c.wear,
          collection: c.collection,
        })),
        setActive: true,
      });
      setView("lobby");
    } catch (err: any) {
      setError(err.message || "Failed to save deck");
    }
  };

  const handleCardSelect = (card: DeckCard) => {
    if (selectedCards.find((c: DeckCard) => c.cardId === card.cardId)) {
      // Remove from deck
      setSelectedCards(selectedCards.filter((c: DeckCard) => c.cardId !== card.cardId));
    } else if (selectedCards.length < TCG_CONFIG.DECK_SIZE) {
      // Validate limits
      const vbmsCount = selectedCards.filter((c: DeckCard) => c.type === "vbms").length;
      const nothingCount = selectedCards.filter((c: DeckCard) => c.type === "nothing" || c.type === "other").length;

      if ((card.type === "nothing" || card.type === "other") && nothingCount >= TCG_CONFIG.MAX_NOTHING) {
        setError(`Max ${TCG_CONFIG.MAX_NOTHING} Nothing cards allowed`);
        return;
      }

      // VibeFID limit: only 1 allowed per deck
      const vibefidCount = selectedCards.filter((c: DeckCard) => c.type === "vibefid").length;
      if (card.type === "vibefid" && vibefidCount >= TCG_CONFIG.MAX_VIBEFID) {
        setError(`Max ${TCG_CONFIG.MAX_VIBEFID} VibeFID card allowed`);
        return;
      }

      setSelectedCards([...selectedCards, card]);
      setError(null);
    }
  };

  const handlePlayCard = (laneIndex: number) => {
    if (selectedHandCard === null) return;

    setPendingActions([
      ...pendingActions,
      { type: "play", cardIndex: selectedHandCard, targetLane: laneIndex },
    ]);
    setSelectedHandCard(null);
  };

  const handleSubmitTurn = async () => {
    if (!currentMatchId || !address) return;

    try {
      // Log actions to battle log before submitting
      const currentTurn = currentMatch?.gameState?.currentTurn || 1;
      const myHand = currentMatch?.player1Address === address?.toLowerCase()
        ? currentMatch?.gameState?.player1Hand
        : currentMatch?.gameState?.player2Hand;

      pendingActions.forEach(action => {
        if (action.type === "play" && action.targetLane !== undefined && myHand?.[action.cardIndex]) {
          const card = myHand[action.cardIndex];
          setBattleLog(prev => [...prev, {
            turn: currentTurn,
            player: "you",
            action: "played",
            lane: action.targetLane!,
            cardName: card.name || "Card"
          }]);
        }
      });

      playSound("turn");
      await submitActions({
        matchId: currentMatchId,
        address,
        actions: pendingActions,
      });
      setPendingActions([]);
    } catch (err: any) {
      playSound("error");
      setError(err.message || "Failed to submit actions");
    }
  };

  // Keep ref updated for PvP timer auto-submit
  handlePvPSubmitTurnRef.current = handleSubmitTurn;

  const handleCancelMatch = async () => {
    if (!currentMatchId || !address) return;

    try {
      await cancelMatch({ matchId: currentMatchId, address });
      setCurrentMatchId(null);
      setView("lobby");
    } catch (err: any) {
      setError(err.message || "Failed to cancel match");
    }
  };

  // Watch for match state changes
  useEffect(() => {
    if (currentMatch?.status === "in-progress" && view === "waiting") {
      prevPvPGameStateRef.current = null; // Reset PvP animation tracking for new match
      setPvpPowerChanges({});
      setPvpCardAnimClass({});
      setView("battle");
    }
    if (currentMatch?.status === "finished" && view !== "result") {
      // Delay to show final round resolution before switching to result
      const isWinner = currentMatch.winnerId === address?.toLowerCase();
      const isDraw = !currentMatch.winnerId || currentMatch.winnerId === "tie";

      // Show final lanes for 3 seconds before going to result
      setTimeout(() => {
        setView("result");

        // Play victory/defeat sound for PvP
        if (!isDraw) {
          if (isWinner) {
            playSound("victory");
          } else {
            playSound("defeat");
            setTimeout(() => setShowDefeatBait(true), 5000);
          }
        }
      }, 3000);

      // Process staked match rewards immediately
      if ((currentMatch as any)?.isStakedMatch && currentMatch.winnerId && currentMatchId) {
        finishStakedMatchMutation({
          matchId: currentMatchId,
          winnerAddress: currentMatch.winnerId,
        }).catch((e: any) => console.error("finishStakedMatch error:", e));
      }
    }
  }, [currentMatch?.status, view]);

  // PvP Heartbeat - send every 10s while in battle
  useEffect(() => {
    if (view !== "battle" || isPvE || !currentMatchId || !address) return;

    // Send immediately
    heartbeatMutation({ matchId: currentMatchId, address }).catch(() => {});

    const interval = setInterval(() => {
      heartbeatMutation({ matchId: currentMatchId, address }).catch(() => {});
    }, 10_000);

    return () => clearInterval(interval);
  }, [view, isPvE, currentMatchId, address]);

  // Turn timer countdown - PvE
  useEffect(() => {
    // Only run during active PvE game
    if (view !== "battle" || !isPvE || !pveGameState || pveGameState.currentTurn > TCG_CONFIG.TOTAL_TURNS) {
      return;
    }

    // Reset timer when turn changes
    setTurnTimeRemaining(TCG_CONFIG.TURN_TIME_SECONDS);

    // Clear previous timer
    if (turnTimerRef.current) {
      clearInterval(turnTimerRef.current);
    }

    // Start countdown
    turnTimerRef.current = setInterval(() => {
      setTurnTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up! Auto end turn - use ref to avoid stale closure
          handlePvEEndTurnRef.current();
          return TCG_CONFIG.TURN_TIME_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pveGameState?.currentTurn, view, isPvE]);

  // Turn timer countdown - PvP (EXACT SAME LOGIC AS PvE)
  const pvpTurnTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Only run during active PvP game (same conditions as PvE)
    if (view !== "battle" || isPvE || !currentMatch?.gameState || (currentMatch.gameState.currentTurn > TCG_CONFIG.TOTAL_TURNS)) {
      return;
    }

    // Reset timer when turn changes
    setTurnTimeRemaining(TCG_CONFIG.TURN_TIME_SECONDS);

    // Clear previous timer
    if (pvpTurnTimerRef.current) {
      clearInterval(pvpTurnTimerRef.current);
    }

    // Start countdown
    pvpTurnTimerRef.current = setInterval(() => {
      setTurnTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up! Auto submit turn
          handleSubmitTurnRef.current();
          return TCG_CONFIG.TURN_TIME_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (pvpTurnTimerRef.current) {
        clearInterval(pvpTurnTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatch?.gameState?.currentTurn, view, isPvE]);

  // Timer warning sounds - play "5 SEGUNDOS" voice at 5 seconds, tick at 3 and 1
  useEffect(() => {
    const inBattle = view === "battle" && ((isPvE && pveGameState) || (!isPvE && currentMatch?.gameState));
    if (inBattle) {
      if (turnTimeRemaining === 5) {
        try {
          const countdownAudio = new Audio("/sounds/5 SEGUNDOS.mp3");
          countdownAudio.volume = 0.5;
          countdownAudio.play().catch(() => {});
        } catch {
          playSound("tick");
        }
      } else if (turnTimeRemaining === 3 || turnTimeRemaining === 1) {
        playSound("tick");
      }
    }
  }, [turnTimeRemaining, view, isPvE, pveGameState, currentMatch?.gameState]);

  // Auto match - automatically start next match when result screen appears
  useEffect(() => {
    if (autoMatch && view === "result" && isPvE && pveGameState?.gameOver) {
      // Wait 3 seconds before starting next match
      const autoMatchTimer = setTimeout(() => {
        startPvEMatch();
      }, 3000);
      return () => clearTimeout(autoMatchTimer);
    }
  }, [autoMatch, view, isPvE, pveGameState?.gameOver]);

  // PvP state change detection - detect new cards, power changes, trigger sounds/animations
  useEffect(() => {
    if (!currentMatch?.gameState || isPvE || view !== "battle") return;
    const gs = currentMatch.gameState;
    const prev = prevPvPGameStateRef.current;
    const isPlayer1 = currentMatch.player1Address === address?.toLowerCase();
    const myCards = isPlayer1 ? "player1Cards" : "player2Cards";
    const enemyCards = isPlayer1 ? "player2Cards" : "player1Cards";
    const myPowerKey = isPlayer1 ? "player1Power" : "player2Power";
    const enemyPowerKey = isPlayer1 ? "player2Power" : "player1Power";

    if (prev) {
      const turnChanged = prev.currentTurn !== gs.currentTurn;

      if (turnChanged) {
        playSound("turn");

        // Detect changes per lane
        const newPowerChanges: Record<string, number> = {};
        const newAnimClasses: Record<string, string> = {};

        gs.lanes.forEach((lane: any, laneIndex: number) => {
          const prevLane = prev.lanes?.[laneIndex];
          if (!prevLane) return;

          const prevEnemyCards = prevLane[enemyCards] || [];
          const currEnemyCards = lane[enemyCards] || [];
          const prevMyCards = prevLane[myCards] || [];
          const currMyCards = lane[myCards] || [];

          // Detect new enemy cards (card flip animation)
          if (currEnemyCards.length > prevEnemyCards.length) {
            for (let i = prevEnemyCards.length; i < currEnemyCards.length; i++) {
              newAnimClasses[`${laneIndex}-enemy-${i}`] = "tcg-card-flip";
            }
            playSound("card");

            // Check if new cards have abilities
            const newCards = currEnemyCards.slice(prevEnemyCards.length);
            if (newCards.some((c: any) => getCardAbility(c.name, c))) {
              setTimeout(() => playSound("ability"), 300);
            }
          }

          // Detect new player cards revealed (cards submitted last turn)
          if (currMyCards.length > prevMyCards.length) {
            for (let i = prevMyCards.length; i < currMyCards.length; i++) {
              newAnimClasses[`${laneIndex}-player-${i}`] = "tcg-card-flip";
            }
          }

          // Detect cards that became revealed (face-down → face-up)
          currEnemyCards.forEach((card: any, idx: number) => {
            const prevCard = prevEnemyCards[idx];
            if (prevCard && prevCard._revealed === false && card._revealed !== false) {
              newAnimClasses[`${laneIndex}-enemy-${idx}`] = "tcg-card-flip";
            }
          });
          currMyCards.forEach((card: any, idx: number) => {
            const prevCard = prevMyCards[idx];
            if (prevCard && prevCard._revealed === false && card._revealed !== false) {
              newAnimClasses[`${laneIndex}-player-${idx}`] = "tcg-card-flip";
            }
          });

          // Detect power changes (floating numbers)
          const prevMyPower = prevLane[myPowerKey] || 0;
          const currMyPower = lane[myPowerKey] || 0;
          const prevEnemyPower = prevLane[enemyPowerKey] || 0;
          const currEnemyPower = lane[enemyPowerKey] || 0;

          if (currMyPower !== prevMyPower) {
            newPowerChanges[`${laneIndex}-player`] = currMyPower - prevMyPower;
          }
          if (currEnemyPower !== prevEnemyPower) {
            newPowerChanges[`${laneIndex}-enemy`] = currEnemyPower - prevEnemyPower;
          }

          // Detect stolen/destroyed cards
          if (currEnemyCards.length < prevEnemyCards.length) {
            playSound("bomb");
          }
          if (currMyCards.length < prevMyCards.length) {
            playSound("bomb");
          }
        });

        // Apply animations
        if (Object.keys(newAnimClasses).length > 0) {
          setPvpCardAnimClass(newAnimClasses);
          setTimeout(() => setPvpCardAnimClass({}), 800);
        }

        // Apply power change floats
        if (Object.keys(newPowerChanges).length > 0) {
          setPvpPowerChanges(newPowerChanges);
          setTimeout(() => setPvpPowerChanges({}), 1200);
        }

        // Sound for draw (new card in hand)
        setTimeout(() => playSound("draw"), 500);
      }
    }

    // Save current state as deep copy
    prevPvPGameStateRef.current = JSON.parse(JSON.stringify(gs));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatch?.gameState?.currentTurn, view, isPvE]);

  // Load daily battles count from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const today = new Date().toDateString();
      const stored = localStorage.getItem('tcg_daily_battles');
      if (stored) {
        const { date, count } = JSON.parse(stored);
        if (date === today) {
          setDailyBattles(count);
        } else {
          // New day - reset counter
          setDailyBattles(0);
          localStorage.setItem('tcg_daily_battles', JSON.stringify({ date: today, count: 0 }));
        }
      } else {
        localStorage.setItem('tcg_daily_battles', JSON.stringify({ date: today, count: 0 }));
      }
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPONENT: Card Detail Modal (memoized to prevent scroll reset on timer updates)
  // ═══════════════════════════════════════════════════════════════════════════════

  const CardDetailModal = useMemo(() => {
    return ({ card, onClose, onSelect }: { card: DeckCard; onClose: () => void; onSelect?: () => void }) => {
    const ability = getCardAbility(card.name, card);
    const foilEffect = getFoilEffect(card.foil);
    const isSelected = selectedCards.some((c: DeckCard) => c.cardId === card.cardId);
    const effectivePower = card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power;
    const energyCost = getEnergyCost(card);
    const encodedImageUrl = card.imageUrl || null;

    // Find combos for this card (apply alias for name matching)
    const cardNameLower = card.name?.toLowerCase() || "";
    const resolvedName = cardNameAliases[cardNameLower] || cardNameLower;
    const cardCombos = CARD_COMBOS.filter(combo =>
      combo.cards.map(c => c.toLowerCase()).includes(cardNameLower) ||
      combo.cards.map(c => c.toLowerCase()).includes(resolvedName)
    );

    return (
      <div
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2"
        onClick={onClose}
      >
        <div
          className="bg-vintage-deep-black border border-vintage-gold/30 rounded-2xl p-4 max-w-sm w-full max-h-[90vh] overflow-y-auto backdrop-blur-sm overscroll-contain"
          onClick={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Card Image/Video */}
          <div className="flex justify-center mb-4">
            <div
              className={`relative w-32 h-48 rounded-xl border-4 overflow-hidden bg-gray-800 ${RARITY_COLORS[card.rarity] || "border-gray-500"}`}
            >
              <CardMedia
                src={card.imageUrl}
                alt={card.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {card.foil && card.foil !== "None" && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 rounded-lg" />
              )}
            </div>
          </div>

          {/* Card Info */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-vintage-gold">{card.name}</h3>
            <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
              {card.foil && card.foil !== "None" && (
                <span className="text-sm text-vintage-gold">{card.foil}</span>
              )}
              {(card.type === "nothing" || card.type === "other") && (
                <span className="text-sm text-purple-400">(Nothing)</span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-center gap-4">
              <div>
                <span className="text-vintage-gold font-bold text-2xl">{effectivePower}</span>
                <span className="text-vintage-burnt-gold text-sm ml-1">power</span>
              </div>
              <div>
                <span className={`font-bold text-2xl ${energyCost === 0 ? "text-green-400" : "text-vintage-neon-blue"}`}>
                  {energyCost === 0 ? "FREE" : energyCost}
                </span>
                <span className="text-vintage-burnt-gold text-sm ml-1">{energyCost === 0 ? "" : "⚡"}</span>
              </div>
            </div>
          </div>

          {/* Ability Section - Show for VBMS and VibeFID */}
          {ability && (card.type === "vbms" || card.type === "vibefid") && (() => {
            const translatedAbility = getTranslatedAbility(card.name);
            return (
              <div className={`${card.type === "vibefid" ? "bg-cyan-900/20 border-cyan-500/20" : "bg-vintage-charcoal/30 border-vintage-gold/10"} border rounded-lg p-3 mb-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-purple-400">⚡</span>
                  <span className={`${card.type === "vibefid" ? "text-cyan-400" : "text-vintage-gold"} font-bold text-sm`}>{translatedAbility?.name || ability.name}</span>
                </div>
                <p className="text-vintage-burnt-gold text-sm">{translatedAbility?.description || ability.description}</p>
              </div>
            );
          })()}

          {/* Combo Section - Compact for mobile */}
          {cardCombos.length > 0 && card.type === "vbms" && (
            <div className="mb-3 space-y-2">
              {cardCombos.map((combo) => (
                <div
                  key={combo.id}
                  className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-vintage-gold font-bold text-sm">{COMBO_TRANSLATION_KEYS[combo.id] ? t(COMBO_TRANSLATION_KEYS[combo.id] as keyof typeof translations["pt-BR"]) : combo.name}</span>
                    {combo.minCards && (
                      <span className="text-vintage-burnt-gold/60 text-[10px]">({combo.minCards}+)</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {combo.cards.map((comboCard) => {
                      const isCurrentCard = comboCard.toLowerCase() === cardNameLower || comboCard.toLowerCase() === resolvedName;
                      return (
                        <span
                          key={comboCard}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCurrentCard
                              ? "bg-vintage-gold text-black"
                              : "bg-vintage-charcoal/50 text-vintage-burnt-gold"
                          }`}
                        >
                          {comboCard}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-green-400 text-xs font-bold">
                    ⚡ {COMBO_TRANSLATION_KEYS[combo.id] ? t((COMBO_TRANSLATION_KEYS[combo.id] + "Desc") as keyof typeof translations["pt-BR"]) : combo.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* VibeFID Wildcard Info */}
          {card.type === "vibefid" && (
            <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-3 mb-3">
              <p className="text-cyan-400 text-sm font-bold">🃏 Completes ANY combo!</p>
            </div>
          )}

          {/* Nothing/Other Card Info */}
          {(card.type === "nothing" || card.type === "other") && (
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 mb-3">
              <p className="text-purple-300 text-xs font-bold mb-1">{t('tcgNothingCardTitle')}</p>
              <p className="text-vintage-burnt-gold text-xs">• 50% base power penalty</p>
              <p className="text-vintage-burnt-gold text-xs">• Can be sacrificed from hand (draw new card)</p>
            </div>
          )}

          {/* Foil Effect Section */}
          {foilEffect && (
            <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-3 mb-3">
              <p className="text-vintage-gold text-xs font-bold mb-1">✨ {t('tcgFoilBonus')}</p>
              <p className="text-vintage-burnt-gold text-sm">{foilEffect.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-vintage-charcoal/50 hover:bg-vintage-charcoal border border-vintage-gold/20 hover:border-vintage-gold/40 text-vintage-burnt-gold hover:text-vintage-gold py-2 px-4 rounded-lg transition-all"
            >
              {t('tcgClose')}
            </button>
            {onSelect && (
              <button
                onClick={() => {
                  onSelect();
                  onClose();
                }}
                className={`flex-1 py-2 px-4 rounded-lg transition-all font-bold ${
                  isSelected
                    ? "bg-red-600/20 hover:bg-red-500/30 border border-red-500/50 text-red-400"
                    : "bg-green-600/20 hover:bg-green-500/30 border border-green-500/50 text-green-400"
                }`}
              >
                {isSelected ? t('tcgRemove') : t('tcgAddToDeck')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCards, lang]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: NOT CONNECTED
  // ═══════════════════════════════════════════════════════════════════════════════

  if (!isConnected) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-black" />
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="text-center">
            <h1 className="text-4xl font-display font-bold text-vintage-gold uppercase tracking-widest mb-4">{t('tcgTitle')}</h1>
            <p className="text-vintage-burnt-gold mb-6">{t('tcgSubtitle')}</p>
            <p className="text-vintage-burnt-gold/60">{t('tcgConnectWallet')}</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: LOBBY
  // ═══════════════════════════════════════════════════════════════════════════════

  if (view === "lobby") {
    const hasDeck = activeDeck !== undefined && activeDeck !== null;

    // Get player's VBMS cards for album
    const playerVbmsCards = (nfts || []).filter((card: any) => card.collection === "vibe");

    // Count owned cards by character name
    const ownedCardCounts: Record<string, number> = {};
    playerVbmsCards.forEach((card: any) => {
      const imageUrl = card.imageUrl || card.image || "";
      const characterFromImage = getCharacterFromImage(imageUrl);
      const cardName = (card.character || characterFromImage || card.name || "").toLowerCase();
      if (cardName) {
        ownedCardCounts[cardName] = (ownedCardCounts[cardName] || 0) + 1;
      }
    });

    // All TCG cards from data file
    const allTcgCards = tcgCardsData.cards || [];
    const totalOwned = Object.keys(ownedCardCounts).length;
    const totalCards = allTcgCards.length;

    return (
      <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-black" />

        {/* ===== TOP HUD ===== */}
        <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black via-black/90 to-transparent backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Left: Back button */}
            <button
              onClick={() => router.push("/")}
              className="group px-3 py-2 bg-black/50 hover:bg-vintage-gold/10 text-vintage-burnt-gold hover:text-vintage-gold border border-vintage-gold/20 hover:border-vintage-gold/50 rounded transition-all duration-200 text-xs font-bold uppercase tracking-wider"
            >
              <span className="group-hover:-translate-x-0.5 inline-block transition-transform">&larr;</span> {t('tcgBack')}
            </button>

            {/* Center: Title */}
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-xl font-display font-bold text-vintage-gold uppercase tracking-widest">
                {t('tcgTitle')}
              </h1>
              <button
                onClick={() => setLobbyTab("rules")}
                className="w-5 h-5 rounded-full bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-burnt-gold hover:text-vintage-gold hover:border-vintage-gold/50 text-xs font-bold flex items-center justify-center transition-all"
              >
                ?
              </button>
            </div>

            {/* Right: Deck Builder Button */}
            <button
              onClick={() => setView("deck-builder")}
              className="px-3 py-2 bg-black/50 hover:bg-vintage-gold/10 text-vintage-burnt-gold hover:text-vintage-gold border border-vintage-gold/20 hover:border-vintage-gold/50 rounded transition-all duration-200 text-xs font-bold uppercase tracking-wider"
            >
              {hasDeck ? t('tcgEdit') : t('tcgBuildDeck')}
            </button>
          </div>
        </div>

        {/* ===== MAIN SCROLLABLE CONTENT ===== */}
        <div className="absolute inset-0 pt-16 pb-24 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4">

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center justify-between gap-3">
              <p className="text-red-300 text-xs flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500/50 hover:text-red-400 text-lg leading-none">&times;</button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-black/30 p-1 rounded-lg border border-vintage-gold/10">
            <button
              onClick={() => setLobbyTab("play")}
              className={`flex-1 py-2.5 px-3 font-bold text-xs uppercase tracking-wider rounded transition-all ${
                lobbyTab === "play"
                  ? "bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/30"
                  : "text-vintage-burnt-gold/60 hover:text-vintage-burnt-gold hover:bg-black/20"
              }`}
            >
              {t('tcgPlay')}
            </button>
            <button
              onClick={() => setLobbyTab("leaderboard")}
              className={`flex-1 py-2.5 px-3 font-bold text-xs uppercase tracking-wider rounded transition-all ${
                lobbyTab === "leaderboard"
                  ? "bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/30"
                  : "text-vintage-burnt-gold/60 hover:text-vintage-burnt-gold hover:bg-black/20"
              }`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => setLobbyTab("rules")}
              className={`flex-1 py-2.5 px-3 font-bold text-xs uppercase tracking-wider rounded transition-all ${
                lobbyTab === "rules"
                  ? "bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/30"
                  : "text-vintage-burnt-gold/60 hover:text-vintage-burnt-gold hover:bg-black/20"
              }`}
            >
              {t('tcgRules')}
            </button>
          </div>

          {/* Tab Content */}
          {lobbyTab === "play" && (
            <div className="space-y-4">
              {/* Active Deck Info */}
              {hasDeck && (
                <div className="bg-vintage-charcoal/50 backdrop-blur-sm rounded-xl border border-vintage-gold/20 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[10px] text-vintage-burnt-gold uppercase tracking-wide mb-1">{t('tcgActiveDeck')}</p>
                        <p className="text-lg font-bold text-vintage-gold">{activeDeck.deckName}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-vintage-burnt-gold"><span className="text-vintage-gold font-bold">{activeDeck.vbmsCount}</span> VBMS</span>
                          <span className="text-vintage-gold/30">•</span>
                          <span className="text-vintage-burnt-gold"><span className="text-vintage-gold font-bold">{activeDeck.nothingCount}</span> Nothing</span>
                          <span className="text-vintage-gold/30">•</span>
                          <span className="text-purple-400 font-bold">{activeDeck.totalPower} PWR</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowPoolModal(true)}
                        className={`px-3 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1.5 ${
                          myDefensePool?.isActive
                            ? "bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30"
                            : "bg-black/50 border border-vintage-gold/30 text-vintage-burnt-gold hover:text-vintage-gold hover:border-vintage-gold/50"
                        }`}
                      >
                        {myDefensePool?.isActive ? (
                          <>Pool: {(myDefensePool.poolAmount || 0).toLocaleString()} <span className="text-green-400">✓</span></>
                        ) : (
                          "Defense Pool"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Saved Decks List */}
              {playerDecks && playerDecks.length > 1 && (
                <div className="bg-vintage-charcoal/50 backdrop-blur-sm rounded-xl border border-vintage-gold/20 overflow-hidden">
                  <div className="p-3 border-b border-vintage-gold/20">
                    <h3 className="text-sm font-bold text-vintage-gold uppercase tracking-wide">Saved Decks ({playerDecks.length})</h3>
                  </div>
                  <div className="divide-y divide-vintage-gold/10 max-h-40 overflow-y-auto">
                    {playerDecks.map((deck: any) => {
                      const isActive = deck._id === activeDeck?._id;
                      return (
                        <div
                          key={deck._id}
                          className={`flex items-center gap-3 p-3 hover:bg-vintage-gold/5 transition ${isActive ? 'bg-vintage-gold/10' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${isActive ? "text-vintage-gold" : "text-vintage-burnt-gold"}`}>
                              {deck.deckName}
                              {isActive && <span className="text-green-400 ml-2 text-xs">(Active)</span>}
                            </p>
                            <p className="text-[10px] text-vintage-burnt-gold/50">
                              {deck.vbmsCount || 0} VBMS • {deck.totalPower || 0} PWR
                            </p>
                          </div>
                          {!isActive && (
                            <button
                              onClick={async () => {
                                if (confirm(`Delete deck "${deck.deckName}"?`)) {
                                  try {
                                    await deleteDeckMutation({ deckId: deck._id });
                                  } catch (e: any) {
                                    setError(e.message || "Failed to delete deck");
                                  }
                                }
                              }}
                              className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Play Buttons */}
              <div className="space-y-4">
                {!hasDeck ? (
                  <div className="bg-vintage-charcoal/50 backdrop-blur-sm rounded-xl border border-vintage-gold/20 p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-vintage-gold/10 border border-vintage-gold/30 flex items-center justify-center mx-auto mb-4">
                      <span className="text-vintage-gold text-2xl">🃏</span>
                    </div>
                    <h3 className="text-lg font-bold text-vintage-gold mb-2">No Deck Built</h3>
                    <p className="text-vintage-burnt-gold text-sm mb-4">Create your first deck to start battling!</p>
                    <button
                      onClick={() => setView("deck-builder")}
                      className="px-6 py-3 bg-vintage-gold/20 hover:bg-vintage-gold/30 border border-vintage-gold/50 hover:border-vintage-gold text-vintage-gold font-bold rounded-lg text-sm uppercase tracking-wide transition-all"
                    >
                      {t('tcgBuildDeck')}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Battle Mode Selection */}
                    <div className="bg-vintage-charcoal/50 backdrop-blur-sm rounded-xl border border-vintage-gold/20 overflow-hidden">
                      <div className="p-3 border-b border-vintage-gold/20 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-vintage-gold uppercase tracking-wide">Battle Mode</h3>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-vintage-burnt-gold">Today:</span>
                          {dailyBattles < REWARDED_BATTLES_PER_DAY ? (
                            <span className="text-green-400 font-bold">{dailyBattles}/{REWARDED_BATTLES_PER_DAY} <span className="text-[10px]">(+{BATTLE_AURA_REWARD} AURA)</span></span>
                          ) : (
                            <span className="text-gray-400">{dailyBattles} (free)</span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* PvE Button */}
                        <button
                          onClick={() => startPvEMatch()}
                          className="w-full px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 hover:border-green-400 rounded-lg text-green-400 font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2"
                        >
                          <span>🤖</span>
                          {t('tcgBattleCpu')} {dailyBattles < REWARDED_BATTLES_PER_DAY ? `(+${BATTLE_AURA_REWARD} AURA)` : ""}
                        </button>

                        {/* PvP Section */}
                        <div className="border-t border-vintage-gold/10 pt-3">
                          <p className="text-[10px] text-vintage-burnt-gold uppercase tracking-wide mb-3 text-center">PvP Battle</p>

                          {/* Find Match (Matchmaking → CPU fallback) */}
                          {isSearching ? (
                            <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-3 text-center">
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-amber-400 text-sm font-bold">
                                  {searchElapsed < 5 ? "Searching for players..." : "Matching vs CPU..."}
                                </span>
                              </div>
                              <p className="text-xs text-vintage-burnt-gold/50 mb-2">{Math.max(0, Math.ceil(5 - searchElapsed))}s</p>
                              <button
                                onClick={async () => {
                                  setIsSearching(false);
                                  if (address) await cancelSearchMutation({ address });
                                }}
                                className="px-4 py-1.5 text-xs text-red-400 border border-red-500/30 rounded hover:bg-red-900/20 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                if (!address || !activeDeck?._id) return;
                                try {
                                  setError(null);
                                  setIsSearching(true);
                                  setSearchElapsed(0);

                                  // Start search on server
                                  await searchMatchMutation({ address, username, deckId: activeDeck._id });

                                  // Poll checkMatchmaking every 500ms for up to 5 seconds
                                  let elapsed = 0;
                                  let foundPlayer = false;
                                  const maxSearchTime = 5; // 5 seconds max

                                  while (elapsed < maxSearchTime && !foundPlayer) {
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    elapsed += 0.5;
                                    setSearchElapsed(elapsed);

                                    // Poll the server to check for other players
                                    const matchStatus = await convex.query(api.tcg.checkMatchmaking, { address });

                                    if (matchStatus.status === "found_player" && matchStatus.opponent) {
                                      // Found a real player! Create the match
                                      foundPlayer = true;
                                      const opponent = matchStatus.opponent;

                                      const matchResult = await createMatchFromMatchmakingMutation({
                                        player1Address: address,
                                        player2Address: opponent.address,
                                        player1Username: username,
                                        player2Username: opponent.username,
                                        player1DeckId: activeDeck._id,
                                        player2DeckId: opponent.deckId,
                                      });

                                      if (matchResult?.matchId) {
                                        setCurrentMatchId(matchResult.matchId);
                                        setIsPvE(false);
                                        setView("battle");
                                        setBattleLog([]);
                                      }
                                      setIsSearching(false);
                                      return;
                                    } else if (matchStatus.status === "expired" || matchStatus.status === "not_searching") {
                                      break; // Exit polling loop
                                    }
                                  }

                                  // No live player found - fall back to CPU auto match
                                  await cancelSearchMutation({ address });
                                  setSearchElapsed(elapsed + 0.5);

                                  const result = await autoMatchMutation({ address, username });
                                  if (result?.matchId) {
                                    setCurrentMatchId(result.matchId);
                                    setIsPvE(false);
                                    setView("battle");
                                    setBattleLog([]);
                                  }
                                  setIsSearching(false);
                                } catch (e: any) {
                                  setIsSearching(false);
                                  if (searchTimerRef.current) clearInterval(searchTimerRef.current);
                                  setError(e.message || "No opponents found");
                                }
                              }}
                              disabled={!hasDeck}
                              className="w-full px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 hover:border-amber-400 rounded-lg text-amber-400 font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-2"
                            >
                              <span>⚔️</span>
                              Find Match
                            </button>
                          )}

                          {/* Create / Join Room */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={handleCreateMatch}
                              disabled={!hasDeck}
                              className="px-3 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 hover:border-purple-400 rounded-lg text-purple-400 font-bold text-xs uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Create Room
                            </button>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={roomIdInput}
                                onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                                placeholder="CODE"
                                maxLength={6}
                                disabled={!hasDeck}
                                className="flex-1 bg-black/50 border border-vintage-gold/20 rounded-lg px-2 py-2 text-vintage-gold font-mono text-center uppercase tracking-wider focus:outline-none focus:border-vintage-gold/50 placeholder:text-vintage-burnt-gold/30 text-xs disabled:opacity-40"
                              />
                              <button
                                onClick={() => roomIdInput.length >= 4 && handleJoinMatch(roomIdInput)}
                                disabled={!hasDeck || roomIdInput.length < 4}
                                className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 hover:border-purple-400 rounded-lg text-purple-400 font-bold text-xs uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Join
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>
          )}

          {lobbyTab === "rules" && (
            <div className="space-y-3 text-sm">
              {/* Basic Rules */}
              <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
                <h3 className="font-bold text-vintage-gold mb-2 uppercase tracking-wider text-xs">{t('tcgHowToPlay')}</h3>
                <div className="text-vintage-burnt-gold space-y-1 text-xs">
                  <p>{t('tcgHowToPlayDesc1')}</p>
                  <p>{t('tcgHowToPlayDesc2')}</p>
                  <p>{t('tcgHowToPlayDesc3')}</p>
                  <p>{t('tcgHowToPlayDesc4')}</p>
                  <p>{t('tcgHowToPlayDesc5')}</p>
                </div>
              </div>

              {/* Energy System */}
              <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
                <h3 className="font-bold text-vintage-neon-blue mb-2 uppercase tracking-wider text-xs">{t('tcgEnergySystem')}</h3>
                <div className="text-vintage-burnt-gold space-y-1 text-xs">
                  <p>{t('tcgEnergyTurn1')}</p>
                  <p>{t('tcgEnergyTurn3')}</p>
                  <p>{t('tcgEnergyTurn6')}</p>
                  <p className="text-vintage-gold mt-1">{t('tcgEnergySkipBonus')}</p>
                </div>
              </div>

              {/* Card Types */}
              <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
                <h3 className="font-bold text-purple-400 mb-2 uppercase tracking-wider text-xs">{t('tcgCardTypes')}</h3>
                <div className="text-vintage-burnt-gold space-y-1 text-xs">
                  <p>{t('tcgCardVbms')}</p>
                  <p>{t('tcgCardNothing')}</p>
                  <p><span className="text-pink-400">{t('tcgCardPrizeFoil')}</span></p>
                  <p><span className="text-purple-400">{t('tcgCardStandardFoil')}</span></p>
                </div>
              </div>

              {/* Special Cards */}
              <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
                <h3 className="font-bold text-red-400 mb-2 uppercase tracking-wider text-xs">{t('tcgSpecialCards')}</h3>
                <div className="text-vintage-burnt-gold space-y-1 text-xs">
                  <p>{t('tcgLandmineDesc')}</p>
                  <p>{t('tcgSantaDesc')}</p>
                  <p>{t('tcgJohnPornDesc')}</p>
                </div>
              </div>

              {/* Lane Effects */}
              <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
                <h3 className="font-bold text-cyan-400 mb-2 uppercase tracking-wider text-xs">{t('tcgLaneEffects')}</h3>
                <div className="text-vintage-burnt-gold space-y-1 text-xs">
                  <p><span className="text-green-400">{t('tcgBuffLabel')}:</span> {t('tcgBuffLanes')}</p>
                  <p><span className="text-red-400">{t('tcgDebuffLabel')}:</span> {t('tcgDebuffLanes')}</p>
                  <p><span className="text-purple-400">{t('tcgChaosLabel')}:</span> {t('tcgChaosLanesDesc')}</p>
                  <p><span className="text-vintage-gold">{t('tcgSpecialLabel')}:</span> {t('tcgSpecialLanesDesc')}</p>
                </div>
              </div>

              {/* Combos */}
              <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
                <h3 className="font-bold text-pink-400 mb-2 uppercase tracking-wider text-xs">{t('tcgCombosTotal' as any)}</h3>
                <div className="text-vintage-burnt-gold space-y-2 text-xs">
                  <p className="text-vintage-gold font-semibold">{t('tcgSynergyCombos' as any)}</p>
                  <div className="grid grid-cols-1 gap-0.5 text-[10px]">
                    <p>👑 <span className="text-yellow-400">ANTONIO + MIGUEL</span> = 2x Power</p>
                    <p>🧠 <span className="text-cyan-400">SARTOCRATES + ZURKCHAD</span> = +60 + Immune</p>
                    <p>📊 <span className="text-orange-400">BETOBUTTER + MORLACOS</span> = 2x Scaling</p>
                    <p>🔀 <span className="text-green-400">RIZKYBEGITU + BRADYMCK</span> = 2x Power</p>
                    <p>🎨 <span className="text-pink-400">SMOLEMARU + JOONX</span> = +35</p>
                    <p>🎄 <span className="text-red-400">NAUGHTY SANTA + GOZARU</span> = +40 lane</p>
                    <p>🕶️ <span className="text-purple-400">LOMBRA JR + SLATERG</span> = Steal 30</p>
                    <p>💸 <span className="text-lime-400">SCUM + BETOBUTTER</span> = Steal 40</p>
                  </div>
                  <p className="text-vintage-gold font-semibold pt-1">{t('tcgTeamCombos' as any)}</p>
                  <div className="grid grid-cols-2 gap-0.5 text-[10px]">
                    <p>👨‍👧 Romero Dynasty</p>
                    <p>👑 Crypto Kings</p>
                    <p>🤖 AI Takeover</p>
                    <p>💩 Dirty Duo</p>
                    <p>🎰 Degen Trio</p>
                    <p>💻 Code Masters</p>
                  </div>
                  <p className="text-vintage-gold text-[10px] pt-1">{t('tcgClickComboInfo')}</p>
                </div>
              </div>

              {/* Turn Phases & Ability Order */}
              <div className="bg-vintage-charcoal/30 border border-vintage-gold/10 rounded-lg p-3">
                <h3 className="font-bold text-yellow-400 mb-2 uppercase tracking-wider text-xs">{t('tcgSkillOrderTitle' as any)}</h3>
                <div className="text-vintage-burnt-gold space-y-2 text-xs">
                  {/* Phases */}
                  <div className="space-y-1">
                    <p className="text-vintage-gold font-semibold">{t('tcgTurnPhases' as any)}</p>
                    <p><span className="text-blue-400">1. PLAY</span> - {t('tcgPhasePlay' as any)}</p>
                    <p><span className="text-orange-400">2. REVEAL</span> - {t('tcgPhaseReveal' as any)}</p>
                    <p><span className="text-purple-400">3. ABILITIES</span> - {t('tcgPhaseAbilities' as any)}</p>
                    <p><span className="text-green-400">4. RESOLVE</span> - {t('tcgPhaseResolve' as any)}</p>
                  </div>
                  {/* Order Rules */}
                  <div className="border-t border-vintage-gold/20 pt-2 space-y-1">
                    <p className="text-vintage-gold font-semibold">{t('tcgActivationOrder' as any)}</p>
                    <p>• <span className="text-cyan-400">{t('tcgLowerCostFirst' as any)}</span> (Common → Mythic)</p>
                    <p>• {t('tcgTieBreaker' as any)}</p>
                    <p>• {t('tcgSameLane' as any)}</p>
                  </div>
                  {/* Energy Cost Table */}
                  <div className="border-t border-vintage-gold/20 pt-2">
                    <p className="text-vintage-gold font-semibold mb-1">{t('tcgCostByRarity' as any)}</p>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <span><span className="text-gray-400">Common</span> = 2⚡</span>
                      <span><span className="text-blue-400">Rare</span> = 3⚡</span>
                      <span><span className="text-purple-400">Epic</span> = 4⚡</span>
                      <span><span className="text-orange-400">Legendary</span> = 5⚡</span>
                      <span><span className="text-pink-400">Mythic</span> = 6⚡</span>
                      <span><span className="text-gray-500">Nothing</span> = 1⚡</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-vintage-gold/5 border border-vintage-gold/20 rounded-lg p-3">
                <h3 className="font-bold text-vintage-gold mb-2 uppercase tracking-wider text-xs">{t('tcgTipsTitle')}</h3>
                <div className="text-vintage-burnt-gold space-y-1 text-xs">
                  <p>- {t('tcgTip1')}</p>
                  <p>- {t('tcgTip2')}</p>
                  <p>- {t('tcgTip3')}</p>
                  <p>- {t('tcgTip4')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Tab */}
          {lobbyTab === "leaderboard" && (
            <div className="space-y-3">
              <div className="bg-gradient-to-b from-vintage-charcoal/60 to-vintage-charcoal/30 border border-vintage-gold/15 rounded-lg p-3">
                <h3 className="text-xs font-bold text-vintage-gold uppercase tracking-[0.2em] mb-3 text-center">Defense Leaderboard</h3>

                {/* My Pool Status */}
                {myDefensePool?.isActive && (
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-2 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-green-400/70 uppercase tracking-wider">Your Pool</p>
                        <p className="text-sm font-bold text-green-400">{(myDefensePool.poolAmount || 0).toLocaleString()} VBMS</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-vintage-burnt-gold/50">W: <span className="text-green-400">{myDefensePool.wins}</span> L: <span className="text-red-400">{myDefensePool.losses}</span></p>
                        <p className="text-[9px] text-vintage-burnt-gold/50">Earned: <span className="text-green-400">+{(myDefensePool.totalEarned || 0).toLocaleString()}</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Leaderboard List */}
                {defenseLeaderboard && defenseLeaderboard.length > 0 ? (
                  <div className="space-y-1">
                    {defenseLeaderboard.map((entry: any) => {
                      const isMe = address && entry.address.toLowerCase() === address.toLowerCase();
                      return (
                        <div
                          key={entry.address}
                          className={`flex items-center justify-between p-2 rounded ${
                            isMe ? "bg-vintage-gold/10 border border-vintage-gold/30" : "bg-black/20 border border-vintage-gold/5"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold w-6 text-center ${entry.rank <= 3 ? "text-vintage-gold" : "text-vintage-burnt-gold/50"}`}>
                              #{entry.rank}
                            </span>
                            <div>
                              <p className={`text-xs font-bold truncate max-w-[120px] ${isMe ? "text-vintage-gold" : "text-vintage-burnt-gold"}`}>
                                {entry.username}{isMe ? " *" : ""}
                              </p>
                              <p className="text-[8px] text-vintage-burnt-gold/40">{entry.deckName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs font-bold text-vintage-gold">{(entry.poolAmount || 0).toLocaleString()}</p>
                              <p className="text-[8px] text-vintage-burnt-gold/40">
                                W:<span className="text-green-400">{entry.wins}</span> L:<span className="text-red-400">{entry.losses}</span>
                              </p>
                            </div>
                            {!isMe && activeDeck && (
                              <button
                                onClick={() => {
                                  if (!address) return;
                                  // Show confirmation modal
                                  setAttackConfirmTarget({
                                    address: entry.address,
                                    username: entry.username,
                                    deckName: entry.deckName,
                                    poolAmount: entry.poolAmount,
                                    attackFee: Math.floor(entry.poolAmount * 0.1),
                                  });
                                }}
                                disabled={poolTxStep === "transferring"}
                                className="px-2 py-1.5 bg-orange-600/30 hover:bg-orange-600/50 text-orange-400 border border-orange-500/40 rounded text-[8px] font-bold uppercase tracking-wider transition-all whitespace-nowrap disabled:opacity-40"
                              >
                                {poolTxStep === "transferring" ? "..." : "Fight"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-vintage-burnt-gold/40 text-xs py-4">No defenders yet. Be the first to stake!</p>
                )}
              </div>
            </div>
          )}

          {/* Defense Pool Modal */}
          {showPoolModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setShowPoolModal(false)}>
              <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black border border-vintage-gold/30 rounded-xl p-4 max-w-sm mx-4 w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-bold text-vintage-gold uppercase tracking-[0.2em] mb-3 text-center">Defense Pool</h3>

                {/* Current Pool Status */}
                {myDefensePool?.isActive ? (
                  <div className="space-y-3">
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
                      <p className="text-[9px] text-green-400/70 uppercase tracking-wider mb-1">Active Pool</p>
                      <p className="text-xl font-bold text-green-400">{(myDefensePool.poolAmount || 0).toLocaleString()} VBMS</p>
                      <p className="text-[9px] text-vintage-burnt-gold/50 mt-1">
                        W: {myDefensePool.wins} | L: {myDefensePool.losses} | Earned: +{(myDefensePool.totalEarned || 0).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!address || !myDefensePool?.deckId) return;
                        try {
                          await withdrawDefensePoolMutation({ address, deckId: myDefensePool.deckId });
                          setShowPoolModal(false);
                          setError(null);
                        } catch (e: any) {
                          setError(e.message);
                        }
                      }}
                      className="w-full py-2 bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-500/40 rounded font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Withdraw Pool
                    </button>
                    <p className="text-[8px] text-vintage-burnt-gold/30 text-center">Withdrawn VBMS go to your inbox (claim on home page)</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Tier Selection */}
                    <div>
                      <p className="text-[9px] text-vintage-burnt-gold/50 uppercase tracking-wider mb-2">Select Stake Amount</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {[1000, 5000, 10000, 25000, 50000].map(tier => (
                          <button
                            key={tier}
                            onClick={() => setSelectedPoolTier(tier)}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${
                              selectedPoolTier === tier
                                ? "bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/50"
                                : "bg-black/40 text-vintage-burnt-gold/60 border border-vintage-gold/10 hover:border-vintage-gold/30"
                            }`}
                          >
                            {(tier / 1000).toFixed(0)}k
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="bg-black/30 border border-vintage-gold/10 rounded-lg p-2 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-vintage-burnt-gold/50">You Stake:</span>
                        <span className="text-vintage-gold font-bold">{selectedPoolTier.toLocaleString()} VBMS</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-vintage-burnt-gold/50">Attack Fee (10%):</span>
                        <span className="text-vintage-burnt-gold/70">{Math.floor(selectedPoolTier * 0.1).toLocaleString()} VBMS</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-vintage-burnt-gold/50">Defense Win:</span>
                        <span className="text-green-400 font-bold">+{Math.floor(selectedPoolTier * 0.1 * 0.9).toLocaleString()} VBMS</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-vintage-burnt-gold/50">Defense Lose:</span>
                        <span className="text-red-400 font-bold">-{Math.floor(selectedPoolTier * 0.1 * 0.9).toLocaleString()} VBMS</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-vintage-burnt-gold/50">Contract Tax:</span>
                        <span className="text-vintage-burnt-gold/40">{Math.floor(selectedPoolTier * 0.1 * 0.1).toLocaleString()} VBMS (10% of fee)</span>
                      </div>
                    </div>

                    {/* Balance */}
                    <p className="text-[9px] text-vintage-burnt-gold/40 text-center">
                      Your VBMS Balance: {Number(vbmsBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} VBMS
                    </p>

                    {/* Activate Button - Onchain VBMS transfer */}
                    <button
                      onClick={async () => {
                        if (!address || !activeDeck?._id) return;
                        try {
                          setError(null);
                          setPoolTxStep("transferring");

                          // Transfer VBMS directly to pool contract
                          await writeTransfer({
                            address: CONTRACTS.VBMSToken as `0x${string}`,
                            abi: ERC20_ABI,
                            functionName: "transfer",
                            args: [CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther(selectedPoolTier.toString())],
                          });

                          // Step 3: Register in Convex
                          await setDefensePoolMutation({
                            address,
                            deckId: activeDeck._id,
                            amount: selectedPoolTier,
                            username,
                          });

                          setPoolTxStep("done");
                          refetchVBMS();
                          setShowPoolModal(false);
                          setError(null);
                        } catch (e: any) {
                          setPoolTxStep("error");
                          setError(e.message || "Transaction failed");
                        }
                      }}
                      disabled={!activeDeck?._id || poolTxStep === "transferring" || Number(vbmsBalance || 0) < selectedPoolTier}
                      className="w-full py-2.5 bg-gradient-to-r from-green-700 to-emerald-600 hover:from-green-600 hover:to-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded transition-all disabled:opacity-40"
                    >
                      {poolTxStep === "transferring" ? "Sending VBMS..." : "Activate Defense Pool"}
                    </button>
                    <p className="text-[8px] text-vintage-burnt-gold/30 text-center">VBMS tokens will be sent to the game pool onchain</p>
                  </div>
                )}

                {/* Close */}
                <button
                  onClick={() => setShowPoolModal(false)}
                  className="w-full mt-3 py-1.5 text-vintage-burnt-gold/50 hover:text-vintage-gold text-[10px] uppercase tracking-wider transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Attack Confirmation Modal */}
          {attackConfirmTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setAttackConfirmTarget(null)}>
              <div className="bg-gradient-to-b from-vintage-charcoal to-vintage-deep-black border border-orange-500/30 rounded-xl p-4 max-w-sm mx-4 w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-bold text-orange-400 uppercase tracking-[0.2em] mb-3 text-center">Confirm Attack</h3>

                {/* Target Info */}
                <div className="bg-black/30 border border-orange-500/20 rounded-lg p-3 mb-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-vintage-burnt-gold/60 uppercase">Target</span>
                    <span className="text-sm font-bold text-vintage-gold">{attackConfirmTarget.username}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-vintage-burnt-gold/60 uppercase">Deck</span>
                    <span className="text-xs text-vintage-burnt-gold">{attackConfirmTarget.deckName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-vintage-burnt-gold/60 uppercase">Pool</span>
                    <span className="text-sm font-bold text-green-400">{attackConfirmTarget.poolAmount.toLocaleString()} VBMS</span>
                  </div>
                </div>

                {/* Attack Fee */}
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3 mb-3 text-center">
                  <p className="text-[9px] text-orange-400/70 uppercase tracking-wider mb-1">Attack Fee (10%)</p>
                  <p className="text-xl font-bold text-orange-400">{attackConfirmTarget.attackFee.toLocaleString()} VBMS</p>
                  <p className="text-[9px] text-vintage-burnt-gold/50 mt-1">
                    Win: +{Math.floor(attackConfirmTarget.attackFee * 0.9).toLocaleString()} | Lose: -{attackConfirmTarget.attackFee.toLocaleString()}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setAttackConfirmTarget(null)}
                    className="flex-1 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 border border-gray-600/40 rounded font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!address || !attackConfirmTarget) return;
                      try {
                        setError(null);
                        const target = attackConfirmTarget;
                        setAttackConfirmTarget(null); // Close modal

                        setPoolTxStep("transferring");
                        await writeTransfer({
                          address: CONTRACTS.VBMSToken as `0x${string}`,
                          abi: ERC20_ABI,
                          functionName: "transfer",
                          args: [CONTRACTS.VBMSPoolTroll as `0x${string}`, parseEther(target.attackFee.toString())],
                        });

                        setPoolTxStep("done");
                        const result = await autoMatchWithStakeMutation({
                          address,
                          username,
                          poolTier: target.poolAmount,
                        });
                        if (result?.matchId) {
                          setCurrentMatchId(result.matchId);
                          setIsPvE(false);
                          setView("battle");
                          setBattleLog([]);
                        }
                        refetchVBMS();
                      } catch (e: any) {
                        setPoolTxStep("idle");
                        setError(e.message || "Failed to challenge");
                      }
                    }}
                    disabled={poolTxStep === "transferring"}
                    className="flex-1 py-2 bg-gradient-to-r from-orange-700 to-red-600 hover:from-orange-600 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider rounded transition-all disabled:opacity-40"
                  >
                    {poolTxStep === "transferring" ? "..." : "Attack!"}
                  </button>
                </div>
              </div>
            </div>
          )}

          </div>
        </div>

        {/* ===== BOTTOM STATS BAR ===== */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black via-black/90 to-transparent pt-6 pb-3 px-3">
          <div className="max-w-4xl mx-auto">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-vintage-gold/20 px-4 py-2.5 flex items-center justify-between gap-4 text-xs">
              {/* Deck Status */}
              <div className="flex items-center gap-2">
                <span className="text-vintage-burnt-gold uppercase tracking-wide">Deck</span>
                {hasDeck ? (
                  <span className="text-green-400 font-bold">Ready ✓</span>
                ) : (
                  <span className="text-red-400 font-bold">None</span>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-4 bg-vintage-gold/20" />

              {/* Power */}
              {hasDeck && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-vintage-burnt-gold uppercase tracking-wide">Power</span>
                    <span className="font-bold text-purple-400">{activeDeck?.totalPower || 0}</span>
                  </div>
                  <div className="w-px h-4 bg-vintage-gold/20" />
                </>
              )}

              {/* Daily Battles */}
              <div className="flex items-center gap-2">
                <span className="text-vintage-burnt-gold uppercase tracking-wide">Battles</span>
                <span className={`font-bold ${dailyBattles < REWARDED_BATTLES_PER_DAY ? 'text-green-400' : 'text-gray-400'}`}>
                  {dailyBattles}/{REWARDED_BATTLES_PER_DAY}
                </span>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-4 bg-vintage-gold/20" />

              {/* VBMS Balance */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-vintage-burnt-gold uppercase tracking-wide">VBMS</span>
                <span className="text-vintage-gold font-bold">{Number(vbmsBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: DECK BUILDER
  // ═══════════════════════════════════════════════════════════════════════════════

  if (view === "deck-builder") {
    // Get available cards
    // VBMS, VibeFID, Nothing, and other vibechain collections are allowed in TCG
    const tcgEligibleCards = (nfts || []).filter((card: any) =>
      card.collection === "vibe" ||
      card.collection === "nothing" ||
      card.collection === "vibefid" ||
      OTHER_TCG_COLLECTIONS.includes(card.collection)
    );

    // Note: getVbmsBaccaratImageUrl is now a global helper function

    const availableCards: DeckCard[] = tcgEligibleCards.map((card: any) => {
      const characterFromImage = getCharacterFromImage(card.imageUrl || card.image || "");
      const isVibeFID = card.collection === "vibefid";
      const isVbms = card.collection === "vibe";
      const isOtherCollection = OTHER_TCG_COLLECTIONS.includes(card.collection);
      const cardName = card.character || characterFromImage || card.name || (isVibeFID ? card.displayName || card.username : undefined);

      // For VBMS cards, use baccarat PNG images for consistency with CPU cards
      let imageUrl: string;
      if (isVbms && cardName) {
        imageUrl = getVbmsBaccaratImageUrl(cardName) || card.imageUrl || card.image || "/images/card-back.png";
      } else {
        imageUrl = card.imageUrl || card.image || "/images/card-back.png";
      }

      // Determine card type
      let cardType: "vbms" | "nothing" | "vibefid" | "other";
      if (card.collection === "nothing") cardType = "nothing";
      else if (card.collection === "vibefid") cardType = "vibefid";
      else if (isOtherCollection) cardType = "other";
      else cardType = "vbms";

      return {
        type: cardType,
        cardId: card.tokenId || card.id || `${card.collection}-${card.name}`,
        name: cardName,
        rarity: card.rarity || "Common",
        power: card.power || 50,
        imageUrl,
        foil: card.foil,
        wear: card.wear,
        collection: card.collection,
      };
    });

    // Rarity order for sorting
    const rarityOrder: Record<string, number> = {
      mythic: 5,
      legendary: 4,
      epic: 3,
      rare: 2,
      common: 1,
    };

    // Sort function
    const sortCards = (cards: DeckCard[]) => {
      return [...cards].sort((a, b) => {
        if (deckSortBy === "power") {
          const powerA = a.type === "nothing" || a.type === "other" ? Math.floor(a.power * 0.5) : a.power;
          const powerB = b.type === "nothing" || b.type === "other" ? Math.floor(b.power * 0.5) : b.power;
          return deckSortDesc ? powerB - powerA : powerA - powerB;
        } else {
          const rarityA = rarityOrder[a.rarity?.toLowerCase() || "common"] || 1;
          const rarityB = rarityOrder[b.rarity?.toLowerCase() || "common"] || 1;
          if (rarityA !== rarityB) {
            return deckSortDesc ? rarityB - rarityA : rarityA - rarityB;
          }
          // Same rarity: sort by power
          return deckSortDesc ? b.power - a.power : a.power - b.power;
        }
      });
    };

    const vbmsCards = sortCards(availableCards.filter((c: DeckCard) => c.type === "vbms"));
    const vibefidCards = sortCards(availableCards.filter((c: DeckCard) => c.type === "vibefid"));
    const nothingCards = sortCards(availableCards.filter((c: DeckCard) => c.type === "nothing" || c.type === "other"));

    const selectedVbms = selectedCards.filter((c: DeckCard) => c.type === "vbms").length;
    const selectedVibefid = selectedCards.filter((c: DeckCard) => c.type === "vibefid").length;
    const selectedVbmsOrVibefid = selectedVbms + selectedVibefid;
    const selectedNothing = selectedCards.filter((c: DeckCard) => c.type === "nothing" || c.type === "other").length;
    const totalPower = selectedCards.reduce((sum, c) => {
      const power = c.type === "nothing" || c.type === "other" ? Math.floor(c.power * 0.5) : c.power;
      return sum + power;
    }, 0);

    const canSave =
      selectedCards.length === TCG_CONFIG.DECK_SIZE &&
      selectedVbmsOrVibefid >= TCG_CONFIG.MIN_VBMS_OR_VIBEFID;

    return (
      <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-black" />

        {/* ===== TOP HUD ===== */}
        <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black via-black/95 to-transparent">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setView("lobby")}
              className="group flex items-center gap-1.5 px-3 py-1.5 text-vintage-burnt-gold/70 hover:text-vintage-gold transition-colors text-[11px] font-medium uppercase tracking-[0.15em]"
            >
              <span className="group-hover:-translate-x-0.5 inline-block transition-transform text-vintage-gold/50 group-hover:text-vintage-gold">←</span>
              {t('tcgBack')}
            </button>
            <p className="text-[10px] text-vintage-burnt-gold/50 uppercase tracking-[0.2em]">Select 12 cards</p>
            <button
              onClick={handleSaveDeck}
              disabled={!canSave}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${canSave ? 'bg-vintage-gold text-black hover:bg-yellow-400' : 'bg-black/30 text-vintage-burnt-gold/40 cursor-not-allowed'} transition-colors`}
            >
              {t('tcgSaveDeck')}
            </button>
          </div>
        </div>

        {/* ===== MAIN SCROLLABLE CONTENT ===== */}
        <div className="absolute inset-0 pt-16 pb-4 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4">

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Loading Status */}
          {cardsLoading && (
            <div className="bg-vintage-neon-blue/10 border border-vintage-neon-blue/30 text-vintage-neon-blue px-4 py-2 rounded-lg mb-4 text-sm">
              {t('tcgLoading')} (Status: {status})
            </div>
          )}

          {/* Debug Info */}
          {!cardsLoading && nfts.length === 0 && (
            <div className="bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-gold px-4 py-2 rounded-lg mb-4 text-sm">
              {t('tcgNoCardsFound')}
              <br />
              <span className="text-xs text-vintage-burnt-gold">Status: {status} | Address: {address || 'not connected'}</span>
            </div>
          )}

          {/* Deck Name */}
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            className="w-full bg-black/40 border border-vintage-gold/20 rounded px-3 py-2 text-vintage-gold font-bold tracking-wide focus:outline-none focus:border-vintage-gold/50 placeholder:text-vintage-burnt-gold/30 text-sm mb-3"
            placeholder={t('tcgDeckName')}
          />

          {/* Stats Row */}
          <div className="flex items-center justify-between gap-2 mb-3 text-[10px]">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded ${selectedCards.length === TCG_CONFIG.DECK_SIZE ? "bg-green-900/40 text-green-400" : "bg-black/40 text-vintage-burnt-gold"}`}>
                {selectedCards.length}/{TCG_CONFIG.DECK_SIZE}
              </span>
              <span className={`px-2 py-1 rounded ${selectedVbmsOrVibefid >= TCG_CONFIG.MIN_VBMS_OR_VIBEFID ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
                {selectedVbmsOrVibefid}/{TCG_CONFIG.MIN_VBMS_OR_VIBEFID} VBMS
              </span>
              <span className="px-2 py-1 rounded bg-vintage-gold/20 text-vintage-gold font-bold">
                {totalPower} PWR
              </span>
            </div>
          </div>

          {/* Buttons Row */}
          <div className="flex items-center gap-2 mb-3 text-[10px]">
            <button
              onClick={() => { setDeckSortBy("power"); setDeckSortDesc(!deckSortDesc); }}
              className={`px-3 py-1.5 rounded ${deckSortBy === "power" ? "bg-vintage-gold/20 text-vintage-gold" : "bg-black/40 text-vintage-burnt-gold"}`}
            >
              ⚡ Power {deckSortBy === "power" && (deckSortDesc ? "↓" : "↑")}
            </button>
            <button
              onClick={() => { setDeckSortBy("rarity"); setDeckSortDesc(!deckSortDesc); }}
              className={`px-3 py-1.5 rounded ${deckSortBy === "rarity" ? "bg-purple-900/40 text-purple-400" : "bg-black/40 text-vintage-burnt-gold"}`}
            >
              💎 Rarity {deckSortBy === "rarity" && (deckSortDesc ? "↓" : "↑")}
            </button>
            <div className="flex-1"></div>
              <button
                onClick={() => {
                  // AUTO COMBO v6: VibeFID funciona como wildcard para TODOS os combos!
                  const allCards = [...vbmsCards, ...vibefidCards, ...nothingCards];
                  const hasVibeFID = vibefidCards.length > 0;

                  // Resolve card name (apply aliases)
                  const resolveName = (name: string): string => {
                    const lower = name.toLowerCase();
                    return cardNameAliases[lower] || lower;
                  };

                  // Build card lookup by resolved name (best power)
                  const cardsByName = new Map<string, DeckCard>();
                  for (const card of allCards) {
                    const resolved = resolveName(card.name || "");
                    if (!resolved) continue;
                    const existing = cardsByName.get(resolved);
                    if (!existing || card.power > existing.power) {
                      cardsByName.set(resolved, card);
                    }
                  }

                  // Find ALL combos we can complete (with or without VibeFID)
                  type ComboOption = {
                    combo: typeof CARD_COMBOS[0];
                    cards: DeckCard[];
                    needsWildcard: boolean;
                  };
                  const availableCombos: ComboOption[] = [];

                  for (const combo of CARD_COMBOS) {
                    const minRequired = combo.minCards || combo.cards.length;
                    const foundCards: DeckCard[] = [];

                    for (const comboCardName of combo.cards) {
                      const card = cardsByName.get(comboCardName.toLowerCase());
                      if (card) foundCards.push(card);
                    }

                    const missing = minRequired - foundCards.length;
                    if (foundCards.length >= minRequired) {
                      // Complete without wildcard - add ALL found cards (not just minRequired)
                      availableCombos.push({
                        combo,
                        cards: foundCards,
                        needsWildcard: false
                      });
                    } else if (missing === 1 && hasVibeFID) {
                      // Can complete with VibeFID wildcard (VibeFID works for ALL combos!)
                      availableCombos.push({
                        combo,
                        cards: foundCards,
                        needsWildcard: true
                      });
                    }
                  }

                  // Sort by: fewer cards first (to fit more combos!), then higher bonus
                  availableCombos.sort((a, b) => {
                    // Fewer cards = more room for other combos
                    if (a.cards.length !== b.cards.length) return a.cards.length - b.cards.length;
                    // Then by bonus value
                    return b.combo.bonus.value - a.combo.bonus.value;
                  });

                  // Select combos - VibeFID can complete UNLIMITED combos!
                  const selectedCombos: ComboOption[] = [];
                  const usedCardNames = new Set<string>();
                  const cardsToAdd: DeckCard[] = [];

                  for (const option of availableCombos) {
                    // For wildcard combos, we only need 1 card (VibeFID is the other)
                    // For regular combos, we need all cards
                    const minRequired = option.combo.minCards || option.combo.cards.length;
                    const cardsNeeded = option.needsWildcard ? minRequired - 1 : minRequired;

                    // Get available cards from this combo
                    const availableCards = option.cards.filter(c => {
                      const resolved = resolveName(c.name || "");
                      return !usedCardNames.has(resolved);
                    });

                    // Can we complete this combo?
                    if (availableCards.length < cardsNeeded) continue;

                    // Select best cards (by power) up to cardsNeeded
                    const sortedCards = [...availableCards].sort((a, b) => b.power - a.power);
                    const selectedCards = sortedCards.slice(0, cardsNeeded);

                    // Select this combo!
                    selectedCombos.push(option);
                    for (const card of selectedCards) {
                      usedCardNames.add(resolveName(card.name || ""));
                      cardsToAdd.push(card);
                    }
                  }

                  // Build deck from selected combos
                  const newDeck: DeckCard[] = [];
                  const usedCardIds = new Set<string>();
                  let vbmsOrFidCount = 0;

                  const addCard = (card: DeckCard): boolean => {
                    if (usedCardIds.has(card.cardId)) return true;
                    if (newDeck.length >= TCG_CONFIG.DECK_SIZE) return false;
                    newDeck.push(card);
                    usedCardIds.add(card.cardId);
                    if (card.type === "vbms" || card.type === "vibefid") vbmsOrFidCount++;
                    return true;
                  };

                  // Add VibeFID first (it completes ALL wildcard combos!)
                  for (const vibefid of vibefidCards) {
                    addCard(vibefid);
                  }

                  // Add cards from selected combos
                  for (const card of cardsToAdd) {
                    addCard(card);
                  }

                  // Fill remaining slots with high-power VBMS cards
                  if (newDeck.length < TCG_CONFIG.DECK_SIZE) {
                    const remainingCards = vbmsCards
                      .filter(c => !usedCardIds.has(c.cardId))
                      .sort((a, b) => b.power - a.power);
                    for (const card of remainingCards) {
                      if (!addCard(card)) break;
                    }
                  }

                  setSelectedCards(newDeck);
                  setError(null);
                }}
                className="px-2 py-1 rounded transition-all bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-900/50 hover:border-yellow-500/50"
                title="Auto-build deck - every card in a combo!"
              >
                🎯 COMBO
              </button>
              <button
                onClick={() => {
                  // Auto deck focusing on POWER
                  const allCards = [...vbmsCards, ...vibefidCards, ...nothingCards];

                  // Sort by effective power (accounting for 0.5x penalty)
                  const sortedByPower = [...allCards].sort((a, b) => {
                    const powerA = (a.type === "nothing" || a.type === "other") ? Math.floor(a.power * 0.5) : a.power;
                    const powerB = (b.type === "nothing" || b.type === "other") ? Math.floor(b.power * 0.5) : b.power;
                    return powerB - powerA;
                  });

                  // Build deck respecting constraints
                  const newDeck: DeckCard[] = [];
                  let vbmsOrFidCount = 0;
                  let nothingOrOtherCount = 0;
                  let vibefidUsed = false;

                  for (const card of sortedByPower) {
                    if (newDeck.length >= TCG_CONFIG.DECK_SIZE) break;

                    if (card.type === "vibefid") {
                      if (vibefidUsed) continue;
                      vibefidUsed = true;
                      vbmsOrFidCount++;
                    } else if (card.type === "vbms") {
                      vbmsOrFidCount++;
                    } else if (card.type === "nothing" || card.type === "other") {
                      if (nothingOrOtherCount >= TCG_CONFIG.MAX_NOTHING) continue;
                      nothingOrOtherCount++;
                    }

                    newDeck.push(card);
                  }

                  // Ensure minimum VBMS requirement
                  if (vbmsOrFidCount < TCG_CONFIG.MIN_VBMS_OR_VIBEFID) {
                    const vbmsNotInDeck = vbmsCards
                      .filter(c => !newDeck.find(d => d.cardId === c.cardId))
                      .sort((a, b) => b.power - a.power);
                    const nothingInDeck = newDeck
                      .filter(c => c.type === "nothing" || c.type === "other")
                      .sort((a, b) => Math.floor(a.power * 0.5) - Math.floor(b.power * 0.5));

                    while (vbmsOrFidCount < TCG_CONFIG.MIN_VBMS_OR_VIBEFID && vbmsNotInDeck.length > 0 && nothingInDeck.length > 0) {
                      const toRemove = nothingInDeck.shift();
                      const toAdd = vbmsNotInDeck.shift();
                      if (toRemove && toAdd) {
                        const idx = newDeck.findIndex(c => c.cardId === toRemove.cardId);
                        if (idx !== -1) {
                          newDeck[idx] = toAdd;
                          vbmsOrFidCount++;
                          nothingOrOtherCount--;
                        }
                      }
                    }
                  }

                  setSelectedCards(newDeck);
                  setError(null);
                }}
                className="px-2 py-1 rounded transition-all bg-orange-900/30 border border-orange-500/30 text-orange-400 hover:bg-orange-900/50 hover:border-orange-500/50"
                title="Auto-build deck with highest power cards"
              >
                ⚡ POWER
              </button>
          </div>

          {/* Combo Preview */}
          {selectedCards.length >= 2 && (
            <div className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-500/20 rounded-lg p-2 mb-3">
              <h3 className="text-[9px] font-bold text-yellow-400 mb-1.5 uppercase tracking-[0.2em]">🎯 Combos {selectedVibefid > 0 && <span className="text-cyan-400">(VibeFID = Wildcard!)</span>}</h3>
              {(() => {
                const deckCombos = detectCombos(selectedCards);
                if (deckCombos.length === 0) {
                  return <p className="text-[10px] text-gray-500 italic">No combos yet - add more cards!</p>;
                }
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {deckCombos.map(({ combo, matchedCards, wildcardsUsed }) => (
                      <div
                        key={combo.name}
                        className={`px-2 py-1 bg-black/40 rounded border text-[10px] ${wildcardsUsed > 0 ? 'border-cyan-500/50' : 'border-yellow-500/30'}`}
                        title={`${combo.description}${wildcardsUsed > 0 ? ` (${wildcardsUsed} VibeFID wildcard)` : ''}`}
                      >
                        <span className="text-yellow-400">{combo.emoji}</span>
                        <span className="text-white ml-1">{combo.name}</span>
                        <span className="text-green-400 ml-1">+{combo.bonus.value}</span>
                        {wildcardsUsed > 0 && <span className="text-cyan-400 ml-1">🃏</span>}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Selected Cards */}
          <div className="bg-gradient-to-b from-vintage-charcoal/40 to-black/30 border border-vintage-gold/20 rounded-lg p-3 mb-3">
            <h3 className="text-[9px] font-bold text-vintage-gold mb-2 uppercase tracking-[0.2em]">{t('tcgCurrentDeck')} <span className="text-vintage-burnt-gold/60">({selectedCards.length})</span></h3>
            <div className="flex flex-wrap gap-1.5 min-h-[70px]">
              {selectedCards.map((card: DeckCard) => {
                const ability = getCardAbility(card.name, card);
                return (
                  <div
                    key={card.cardId}
                    className={`relative w-12 h-[68px] rounded border-2 cursor-pointer transition-all hover:scale-105 overflow-hidden ${RARITY_COLORS[card.rarity] || "border-gray-500"}`}
                    title={`${card.name} (${card.rarity}) - ${card.power} power`}
                  >
                    {/* Card image/video */}
                    <CardMedia
                      src={card.imageUrl}
                      alt={card.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Info button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailCard(card);
                      }}
                      className="absolute top-0 right-0 w-3.5 h-3.5 bg-blue-600 hover:bg-blue-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center z-10"
                    >
                      i
                    </button>
                    {/* Remove on click */}
                    <div
                      onClick={() => handleCardSelect(card)}
                      className="absolute inset-0 bg-black/40 rounded-lg flex flex-col items-center justify-end p-0.5"
                    >
                      <span className="text-[7px] text-white truncate w-full text-center">{card.name}</span>
                      <span className="text-[9px] text-yellow-400 font-bold">{card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power}</span>
                      {ability && (card.type === "vbms" || card.type === "vibefid") && (
                        <span className="text-[5px] text-purple-400">⚡</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {selectedCards.length === 0 && (
                <p className="text-vintage-burnt-gold/60 text-sm">{t('tcgClickToAdd')}</p>
              )}
            </div>
          </div>

          {/* Available Cards */}
          <div className="grid md:grid-cols-2 gap-3">
            {/* VBMS Cards */}
            <div className="bg-gradient-to-b from-vintage-charcoal/40 to-black/30 border border-vintage-gold/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[9px] font-bold text-vintage-gold uppercase tracking-[0.2em]">VBMS <span className="text-vintage-burnt-gold/60">({vbmsCards.length})</span></h3>
                {vbmsCards.length > CARDS_PER_PAGE && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setVbmsPage(p => Math.max(0, p - 1))}
                      disabled={vbmsPage === 0}
                      className="w-5 h-5 flex items-center justify-center text-[10px] bg-vintage-gold/20 hover:bg-vintage-gold/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                    >
                      ←
                    </button>
                    <span className="text-[8px] text-vintage-burnt-gold/60 min-w-[40px] text-center">
                      {vbmsPage + 1}/{Math.ceil(vbmsCards.length / CARDS_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => setVbmsPage(p => Math.min(Math.ceil(vbmsCards.length / CARDS_PER_PAGE) - 1, p + 1))}
                      disabled={vbmsPage >= Math.ceil(vbmsCards.length / CARDS_PER_PAGE) - 1}
                      className="w-5 h-5 flex items-center justify-center text-[10px] bg-vintage-gold/20 hover:bg-vintage-gold/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vbmsCards.slice(vbmsPage * CARDS_PER_PAGE, (vbmsPage + 1) * CARDS_PER_PAGE).map((card: DeckCard) => {
                  const isSelected = selectedCards.some((c: DeckCard) => c.cardId === card.cardId);
                  const ability = getCardAbility(card.name, card);
                  return (
                    <div
                      key={card.cardId}
                      className={`relative w-14 h-20 rounded border-2 cursor-pointer transition-all hover:scale-105 overflow-hidden ${
                        isSelected
                          ? "border-green-500 ring-2 ring-green-500/50"
                          : RARITY_COLORS[card.rarity] || "border-gray-500"
                      }`}
                      title={`${card.name} (${card.rarity}) - ${card.power} power`}
                    >
                      <CardMedia src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); setDetailCard(card); }} className="absolute top-0 right-0 w-3.5 h-3.5 bg-blue-600 hover:bg-blue-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center z-10">i</button>
                      <div onClick={() => handleCardSelect(card)} className="absolute inset-0 bg-black/40 rounded flex flex-col items-center justify-end p-0.5">
                        <span className="text-[7px] text-white truncate w-full text-center">{card.name}</span>
                        <span className="text-[10px] text-yellow-400 font-bold">{card.power}</span>
                        {ability && <span className="text-[5px] text-purple-400">⚡</span>}
                      </div>
                    </div>
                  );
                })}
                {vbmsCards.length === 0 && <p className="text-vintage-burnt-gold/60 text-xs">{t('tcgNoVbmsCards')}</p>}
              </div>
            </div>

            {/* VibeFID Cards */}
            {vibefidCards.length > 0 && (
              <div className="bg-gradient-to-b from-cyan-950/40 to-black/30 border border-cyan-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[9px] font-bold text-cyan-400 uppercase tracking-[0.2em]">VibeFID <span className="text-cyan-400/60">({vibefidCards.length})</span> <span className="text-vintage-burnt-gold/50 normal-case tracking-normal">5x</span></h3>
                  {vibefidCards.length > CARDS_PER_PAGE && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setVibefidPage(p => Math.max(0, p - 1))}
                        disabled={vibefidPage === 0}
                        className="w-5 h-5 flex items-center justify-center text-[10px] bg-cyan-500/20 hover:bg-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                      >
                        ←
                      </button>
                      <span className="text-[8px] text-cyan-400/60 min-w-[40px] text-center">
                        {vibefidPage + 1}/{Math.ceil(vibefidCards.length / CARDS_PER_PAGE)}
                      </span>
                      <button
                        onClick={() => setVibefidPage(p => Math.min(Math.ceil(vibefidCards.length / CARDS_PER_PAGE) - 1, p + 1))}
                        disabled={vibefidPage >= Math.ceil(vibefidCards.length / CARDS_PER_PAGE) - 1}
                        className="w-5 h-5 flex items-center justify-center text-[10px] bg-cyan-500/20 hover:bg-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {vibefidCards.slice(vibefidPage * CARDS_PER_PAGE, (vibefidPage + 1) * CARDS_PER_PAGE).map((card: DeckCard) => {
                    const isSelected = selectedCards.some((c: DeckCard) => c.cardId === card.cardId);
                    const ability = getCardAbility(card.name, card);
                    return (
                      <div
                        key={card.cardId}
                        className={`relative w-14 h-20 rounded border-2 cursor-pointer transition-all hover:scale-105 overflow-hidden ${
                          isSelected ? "border-green-500 ring-2 ring-green-500/50" : RARITY_COLORS[card.rarity] || "border-cyan-500"
                        }`}
                        title={`${card.name} (${card.rarity}) - ${card.power} power`}
                      >
                        <CardMedia src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
                        <button onClick={(e) => { e.stopPropagation(); setDetailCard(card); }} className="absolute top-0 right-0 w-3.5 h-3.5 bg-cyan-600 hover:bg-cyan-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center z-10">i</button>
                        <div onClick={() => handleCardSelect(card)} className="absolute inset-0 bg-black/40 rounded flex flex-col items-center justify-end p-0.5">
                          <span className="text-[7px] text-white truncate w-full text-center">{card.name}</span>
                          <span className="text-[10px] text-cyan-400 font-bold">{card.power}</span>
                          {ability && <span className="text-[5px] text-purple-400">⚡</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nothing Cards */}
            <div className="bg-gradient-to-b from-purple-950/40 to-black/30 border border-purple-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[9px] font-bold text-purple-400 uppercase tracking-[0.2em]">Others <span className="text-purple-400/60">({nothingCards.length})</span> <span className="text-vintage-burnt-gold/50 normal-case tracking-normal">50% power</span></h3>
                {nothingCards.length > CARDS_PER_PAGE && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setOthersPage(p => Math.max(0, p - 1))}
                      disabled={othersPage === 0}
                      className="w-5 h-5 flex items-center justify-center text-[10px] bg-purple-500/20 hover:bg-purple-500/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                    >
                      ←
                    </button>
                    <span className="text-[8px] text-purple-400/60 min-w-[40px] text-center">
                      {othersPage + 1}/{Math.ceil(nothingCards.length / CARDS_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => setOthersPage(p => Math.min(Math.ceil(nothingCards.length / CARDS_PER_PAGE) - 1, p + 1))}
                      disabled={othersPage >= Math.ceil(nothingCards.length / CARDS_PER_PAGE) - 1}
                      className="w-5 h-5 flex items-center justify-center text-[10px] bg-purple-500/20 hover:bg-purple-500/40 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {nothingCards.slice(othersPage * CARDS_PER_PAGE, (othersPage + 1) * CARDS_PER_PAGE).map((card: DeckCard) => {
                  const isSelected = selectedCards.some((c: DeckCard) => c.cardId === card.cardId);
                  return (
                    <div
                      key={card.cardId}
                      className={`relative w-14 h-20 rounded border-2 cursor-pointer transition-all hover:scale-105 overflow-hidden ${
                        isSelected ? "border-green-500 ring-2 ring-green-500/50" : "border-purple-500/50"
                      }`}
                      title={`${card.name} (${card.rarity}) - ${Math.floor(card.power * 0.5)} effective power`}
                    >
                      <CardMedia src={card.imageUrl} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
                      <button onClick={(e) => { e.stopPropagation(); setDetailCard(card); }} className="absolute top-0 right-0 w-3.5 h-3.5 bg-purple-600 hover:bg-purple-500 rounded-full text-[7px] text-white font-bold flex items-center justify-center z-10">i</button>
                      <div onClick={() => handleCardSelect(card)} className="absolute inset-0 bg-black/40 rounded flex flex-col items-center justify-end p-0.5">
                        <span className="text-[7px] text-white truncate w-full text-center">{card.name}</span>
                        <span className="text-[10px] text-purple-400 font-bold">{Math.floor(card.power * 0.5)}</span>
                      </div>
                    </div>
                  );
                })}
                {nothingCards.length === 0 && <p className="text-vintage-burnt-gold/60 text-xs">{t('tcgNoNothingCards')}</p>}
              </div>
            </div>
          </div>

          </div>
        </div>

        {/* Card Detail Modal - using key to prevent remount on timer updates */}
        {detailCard && (
          <div key={`detail-modal-${detailCard.cardId}`}>
            <CardDetailModal
              card={detailCard}
              onClose={() => setDetailCard(null)}
              onSelect={() => handleCardSelect(detailCard)}
            />
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: WAITING ROOM
  // ═══════════════════════════════════════════════════════════════════════════════

  if (view === "waiting") {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-vintage-charcoal via-vintage-deep-black to-black" />

        {/* Subtle animated glow */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="text-center max-w-md w-full">
            {/* Header Badge */}
            <div className="mb-8">
              <span className="text-[10px] text-purple-300 bg-purple-900/40 border border-purple-500/30 px-4 py-1.5 rounded-full uppercase tracking-[0.25em] font-medium">PvP Battle</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-vintage-gold uppercase tracking-[0.2em] mb-2">{t('tcgWaitingOpponent')}</h1>
            <p className="text-vintage-burnt-gold/70 mb-8 text-sm tracking-wide">Share this code with your opponent</p>

            {/* Room Code Card */}
            <div className="bg-gradient-to-b from-vintage-charcoal/60 to-black/40 border border-vintage-gold/20 rounded-xl p-8 mb-8 relative overflow-hidden shadow-2xl shadow-black/50">
              {/* Animated border glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-vintage-gold/0 via-vintage-gold/10 to-vintage-gold/0 animate-pulse" />

              <p className="text-[9px] text-vintage-burnt-gold/50 mb-4 uppercase tracking-[0.3em]">{t('tcgRoomCode')}</p>
              <p className="text-5xl md:text-6xl font-mono font-black text-vintage-gold tracking-[0.4em] mb-6 relative drop-shadow-lg">
                {currentMatch?.roomId || "..."}
              </p>

              {/* Copy button */}
              <button
                onClick={() => {
                  if (currentMatch?.roomId) {
                    navigator.clipboard.writeText(currentMatch.roomId);
                  }
                }}
                className="relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-vintage-gold/80 via-yellow-500/80 to-vintage-gold/80 opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                <span className="relative z-10 block py-2.5 px-6 text-black font-black text-xs uppercase tracking-[0.2em]">
                  Copy Code
                </span>
              </button>
            </div>

            {/* Waiting animation */}
            <div className="flex justify-center gap-3 mb-10">
              <span className="w-2.5 h-2.5 bg-vintage-gold/80 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-2.5 h-2.5 bg-vintage-gold/80 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-2.5 h-2.5 bg-vintage-gold/80 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>

            {/* Cancel button */}
            <button
              onClick={handleCancelMatch}
              className="group flex items-center gap-2 mx-auto text-red-400/70 hover:text-red-400 transition-colors text-[11px] uppercase tracking-[0.15em]"
            >
              <span className="text-red-500/50 group-hover:text-red-400 transition-colors">×</span>
              Cancel Match
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: BATTLE (PvP or PvE)
  // ═══════════════════════════════════════════════════════════════════════════════

  // PvE Battle
  if (view === "battle" && isPvE && pveGameState) {
    const gs = pveGameState;

    // Helper to get lane status
    const getLaneStatus = (lane: any) => {
      if (lane.playerPower > lane.cpuPower) return "winning";
      if (lane.cpuPower > lane.playerPower) return "losing";
      return "tied";
    };

    // Detect active combos for display - ONLY ONE COMBO PER LANE
    const getActiveCombosInLane = (laneIndex: number) => {
      const playerCards = gs.lanes[laneIndex].playerCards || [];
      const allCombos = detectCombos(playerCards);

      if (allCombos.length === 0) return [];

      // Check if there are VibeFID cards with specific combo choices in this lane
      const vibefidCards = playerCards.filter((c: DeckCard) => c.type === "vibefid");
      const chosenComboIds = vibefidCards
        .map((c: DeckCard) => vibefidComboChoices[`${laneIndex}-${c.cardId}`])
        .filter(Boolean);

      // If VibeFID choice exists, ONLY that combo is active
      if (chosenComboIds.length > 0) {
        const chosenCombo = allCombos.find(({ combo }) => chosenComboIds.includes(combo.id));
        return chosenCombo ? [chosenCombo] : [];
      }

      // No VibeFID choice - return only the FIRST combo (only one combo per lane)
      return [allCombos[0]];
    };

    return (
      <div className="h-screen bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] flex flex-col overflow-hidden relative">
        {/* Suit decorations background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[5%] tcg-suit-deco text-4xl">♠</div>
          <div className="absolute top-[15%] right-[8%] tcg-suit-deco text-3xl">♥</div>
          <div className="absolute bottom-[25%] left-[10%] tcg-suit-deco text-3xl">♦</div>
          <div className="absolute bottom-[30%] right-[5%] tcg-suit-deco text-4xl">♣</div>
          <div className="absolute top-[40%] left-[2%] tcg-suit-deco text-2xl">♠</div>
          <div className="absolute top-[50%] right-[3%] tcg-suit-deco text-2xl">♥</div>
        </div>

        {/* Tiebreaker Animation Overlay */}
        {showTiebreakerAnimation && gs.tiebreaker && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-none">
            <div className="text-center animate-fade-in">
              {/* Tiebreaker Title */}
              <div className="text-3xl font-black text-yellow-400 mb-6 animate-pulse">
                ⚖️ {t('tcgTiebreaker')} {gs.tiebreaker.type === "hand" ? t('tcgTiebreakerHand') : t('tcgTiebreakerBoard')}!
              </div>

              {/* Power Comparison */}
              <div className="flex items-center justify-center gap-6 mb-4">
                {/* Player Power */}
                <div className="bg-blue-600/30 border-2 border-blue-400 rounded-xl px-6 py-4">
                  <div className="text-blue-300 text-sm font-bold mb-1">{t('tcgYou')}</div>
                  <div className="text-4xl font-black text-blue-400">{gs.tiebreaker.playerPower}</div>
                </div>

                {/* VS */}
                <div className="text-2xl font-black text-yellow-400">VS</div>

                {/* CPU Power */}
                <div className="bg-red-600/30 border-2 border-red-400 rounded-xl px-6 py-4">
                  <div className="text-red-300 text-sm font-bold mb-1">CPU</div>
                  <div className="text-4xl font-black text-red-400">{gs.tiebreaker.cpuPower}</div>
                </div>
              </div>

              {/* Winner Preview */}
              <div className={`text-2xl font-bold mt-4 ${gs.winner === "player" ? "text-green-400" : "text-red-400"}`}>
                {gs.winner === "player" ? "✓" : "✗"} {gs.tiebreaker.playerPower > gs.tiebreaker.cpuPower ? t('tcgYou') : "CPU"} {gs.winner === "player" ? t('tcgVictory') : t('tcgDefeat')}
              </div>
            </div>
          </div>
        )}

        {/* Game Over Overlay - only show if not in tiebreaker animation */}
        {gs.gameOver && !showTiebreakerAnimation && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className={`text-center ${
              gs.winner === "player" ? "text-green-400" : "text-red-400"
            }`}>
              <div className="text-6xl font-black drop-shadow-2xl mb-2 animate-pulse">
                {gs.winner === "player" ? `🏆 ${t('tcgVictory')}` : `💀 ${t('tcgDefeat')}`}
              </div>
              <div className="text-xl font-bold bg-black/50 px-4 py-2 rounded-lg">
                {gs.lanes.filter((l: any) => l.playerPower > l.cpuPower).length} - {gs.lanes.filter((l: any) => l.cpuPower > l.playerPower).length}
              </div>
              {/* Tiebreaker info */}
              {gs.tiebreaker && (
                <div className="mt-3 bg-yellow-500/20 border border-yellow-500/50 px-4 py-2 rounded-lg text-yellow-300">
                  <div className="text-sm font-bold">⚖️ {t('tcgTiebreaker')} {gs.tiebreaker.type === "hand" ? t('tcgTiebreakerHand') : t('tcgTiebreakerBoard')}</div>
                  <div className="text-xs mt-1">
                    {t('tcgYou')}: {gs.tiebreaker.playerPower} vs CPU: {gs.tiebreaker.cpuPower}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative flex flex-col h-full z-10">

          {/* Top Bar - Player Avatars & Turn Indicator */}
          <div className="flex items-center justify-between px-4 py-2">
            {/* Player Avatar (left) - Royal style with dropdown */}
            <div className="relative flex items-center gap-2">
              <div
                className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1a3a1a] to-[#0d280d] overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{
                  border: "3px solid",
                  borderImage: "linear-gradient(135deg, #FFD700, #B8860B, #FFD700) 1",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5), 0 0 15px rgba(255,215,0,0.2)"
                }}
              >
                {userProfile?.farcasterPfpUrl || userProfile?.twitterProfileImageUrl ? (
                  <img
                    src={userProfile.farcasterPfpUrl || userProfile.twitterProfileImageUrl}
                    alt="Player"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-700">
                    <span className="text-xl font-bold text-white">
                      {userProfile?.username?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs">
                <p className="text-[#FFD700] font-bold truncate max-w-[60px]" style={{ textShadow: "0 0 5px rgba(255,215,0,0.3)" }}>
                  {userProfile?.username || "YOU"}
                </p>
                <p className="text-[#B8860B]">{gs.lanes.filter((l: any) => l.playerPower > l.cpuPower).length} lanes</p>
              </div>

              {/* Profile Dropdown Menu - Royal style */}
              {showProfileMenu && (
                <div className="absolute top-16 left-0 z-50 rounded-xl shadow-xl overflow-hidden min-w-[160px]"
                  style={{
                    background: "linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.98) 100%)",
                    border: "2px solid",
                    borderImage: "linear-gradient(135deg, #B8860B, #8B6914, #B8860B) 1",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.7)"
                  }}
                >
                  <div className="p-2 text-xs text-[#B8860B]" style={{ borderBottom: "1px solid rgba(184,134,11,0.3)" }}>
                    🔊 Meme Sounds
                  </div>
                  <button
                    onClick={() => { playMemeSound("mechaArena"); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-purple-600 flex items-center gap-2"
                  >
                    🤖 Mecha Arena
                  </button>
                  <button
                    onClick={() => { playMemeSound("ggez"); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-green-600 flex items-center gap-2"
                  >
                    😎 GG EZ
                  </button>
                  <button
                    onClick={() => { playMemeSound("bruh"); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-orange-600 flex items-center gap-2"
                  >
                    😐 Bruh
                  </button>
                  <button
                    onClick={() => { playMemeSound("emotional"); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-red-600 flex items-center gap-2"
                  >
                    💔 Emotional Damage
                  </button>
                  <button
                    onClick={() => { playMemeSound("wow"); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-yellow-600 flex items-center gap-2"
                  >
                    🤯 MLG Wow
                  </button>
                  <div style={{ borderTop: "1px solid rgba(184,134,11,0.3)" }}>
                    <button
                      onClick={() => {
                        setIsPvE(false);
                        setPveGameState(null);
                        setView("lobby");
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/50 flex items-center gap-2"
                    >
                      🏳️ {t('tcgSurrender')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Turn Indicator + Phase (center) - Royal style */}
            <div className="flex flex-col items-center gap-1">
              {/* Turn number - Royal gold badge */}
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                style={{
                  background: "linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%)",
                  border: "2px solid",
                  borderImage: "linear-gradient(135deg, #8B6914, #FFD700, #8B6914) 1",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.5)"
                }}
              >
                <span className="text-xs text-[#B8860B] uppercase tracking-wider">{t('tcgTurn')}</span>
                <span className="text-xl font-black text-[#FFD700]" style={{ textShadow: "0 0 10px rgba(255,215,0,0.5)" }}>{gs.currentTurn}</span>
                <span className="text-xs text-[#8B6914]">/ {TCG_CONFIG.TOTAL_TURNS}</span>
              </div>
              {/* Ability queue indicator - shows resolving abilities */}
              {abilityQueue.length > 0 && currentAbilityIndex >= 0 && (
                <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded text-[9px]">
                  <span className="text-purple-400">⚡</span>
                  <span className="text-white font-bold">
                    {abilityQueue[currentAbilityIndex]?.card.name}
                  </span>
                  <span className="text-gray-400">
                    ({currentAbilityIndex + 1}/{abilityQueue.length})
                  </span>
                </div>
              )}
            </div>

            {/* CPU Avatar (right) - Royal style */}
            <div className="flex items-center gap-2">
              <div className="text-xs text-right">
                <p className="text-red-400 font-bold" style={{ textShadow: "0 0 5px rgba(239,68,68,0.3)" }}>{t('tcgSkynet')}</p>
                <p className="text-[#8B6914]">{gs.lanes.filter((l: any) => l.cpuPower > l.playerPower).length} {t('tcgLanes')}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#3a1a1a] to-[#280d0d] overflow-hidden"
                style={{
                  border: "3px solid",
                  borderImage: "linear-gradient(135deg, #B8860B, #8B6914, #B8860B) 1",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5), 0 0 10px rgba(255,0,0,0.2)"
                }}
              >
                <img
                  src="https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/c3adc2e6-d45c-46f0-0cc6-f5ed4fce4200/original"
                  alt="CPU"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<span class="text-2xl flex items-center justify-center w-full h-full">🤖</span>';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Battle Arena - 3 Lanes (Royal Card Table style with 3D depth) */}
          <div
            className="flex-1 flex items-stretch justify-center px-2 gap-2 min-h-0"
            style={{
              perspective: "1000px",
              perspectiveOrigin: "50% 80%"
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <div
              className="flex-1 flex items-stretch justify-center gap-2"
              style={{
                transformStyle: "preserve-3d",
                transform: "rotateX(15deg)",
                transformOrigin: "50% 100%"
              }}
              onDragOver={(e) => e.preventDefault()}
            >
            {gs.lanes.map((lane: any, laneIndex: number) => {
              const status = getLaneStatus(lane);
              const activeCombos = getActiveCombosInLane(laneIndex);

              // Win indicator glow - golden for winning
              const winGlow = status === "winning" ? "shadow-[0_0_25px_rgba(255,215,0,0.5)]" :
                             status === "losing" ? "shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "";

              // Check if lane can receive cards
              const canDropInLane = (lane.playerCards?.length || 0) < TCG_CONFIG.CARDS_PER_LANE;
              const isDragOver = dragOverLane === laneIndex && draggedCardIndex !== null;

              // Check for COMBO POTENTIAL when card is selected or being dragged
              const activeCardIndex = draggedCardIndex ?? selectedHandCard;
              const activeCard = activeCardIndex !== null ? gs.playerHand?.[activeCardIndex] : null;
              const hasComboPotenial = activeCard && canDropInLane ? (() => {
                const potentialCards = [...lane.playerCards, activeCard];
                const combos = detectCombos(potentialCards);
                // Only show if it's a NEW combo (not already active)
                const currentCombos = detectCombos(lane.playerCards);
                return combos.length > currentCombos.length ? combos[combos.length - 1] : null;
              })() : null;

              return (
                <div
                  key={lane.laneId}
                  data-lane-index={laneIndex}
                  ref={(el) => { laneRefs.current[laneIndex] = el; }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedCardIndex === null || !canDropInLane) return;
                    e.dataTransfer.dropEffect = "move";
                    setDragOverLane(laneIndex);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedCardIndex !== null && canDropInLane) {
                      setDragOverLane(laneIndex);
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;
                    // Only clear if actually leaving the element bounds
                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                      setDragOverLane(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedCardIndex !== null && canDropInLane) {
                      handlePvEPlayCard(laneIndex, draggedCardIndex);
                    }
                    setDraggedCardIndex(null);
                    setDragOverLane(null);
                  }}
                  className={`flex flex-col w-[33%] h-full rounded-xl overflow-hidden ${winGlow} transition-all tcg-royal-zone ${
                    isDragOver && canDropInLane ? "ring-4 ring-cyan-400 ring-opacity-80" : ""
                  } ${hasComboPotenial ? "tcg-combo-glow" : ""}`}
                  style={{
                    background: hasComboPotenial
                      ? "linear-gradient(180deg, rgba(91,26,91,0.95) 0%, rgba(60,13,60,0.98) 50%, rgba(36,7,36,1) 100%)"
                      : isDragOver && canDropInLane
                        ? "linear-gradient(180deg, rgba(26,91,62,0.95) 0%, rgba(13,60,34,0.98) 50%, rgba(7,36,20,1) 100%)"
                        : "linear-gradient(180deg, rgba(26,71,42,0.95) 0%, rgba(13,40,24,0.98) 50%, rgba(7,26,15,1) 100%)",
                    border: "3px solid",
                    borderImage: hasComboPotenial
                      ? "linear-gradient(135deg, #FFD700, #FF6B00, #FFD700) 1"
                      : isDragOver && canDropInLane
                        ? "linear-gradient(135deg, #00FFFF, #00CED1, #00FFFF) 1"
                        : status === "winning"
                          ? "linear-gradient(135deg, #FFD700, #FFA500, #FFD700) 1"
                          : "linear-gradient(135deg, #B8860B, #8B6914, #B8860B) 1",
                    boxShadow: hasComboPotenial
                      ? "inset 0 0 60px rgba(255,165,0,0.4), 0 0 30px rgba(255,215,0,0.6), 0 4px 15px rgba(0,0,0,0.5)"
                      : isDragOver && canDropInLane
                        ? "inset 0 0 60px rgba(0,255,255,0.3), 0 4px 15px rgba(0,0,0,0.5)"
                        : "inset 0 0 40px rgba(0,0,0,0.6), 0 4px 15px rgba(0,0,0,0.5)"
                  }}
                >
                  {/* Location Header - Royal style */}
                  <div className="relative" style={{
                    background: "linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.95) 100%)",
                    borderBottom: "2px solid",
                    borderImage: "linear-gradient(90deg, transparent, #B8860B, #FFD700, #B8860B, transparent) 1"
                  }}>
                    {/* Score Bar - Royal style */}
                    <div className="flex items-center justify-center gap-3 py-1.5" style={{ background: "rgba(0,0,0,0.5)" }}>
                      <div className={`min-w-[32px] text-center px-2 py-0.5 rounded text-sm font-black ${
                        status === "losing" ? "bg-red-700 text-white" : "bg-[#1a1a1a] text-gray-500 border border-[#333]"
                      }`}>
                        {lane.cpuPower}
                      </div>
                      <div className="text-[10px] text-[#B8860B] font-bold">⚔</div>
                      <div className={`min-w-[32px] text-center px-2 py-0.5 rounded text-sm font-black ${
                        status === "winning" ? "bg-gradient-to-r from-[#B8860B] to-[#FFD700] text-black" : "bg-[#1a1a1a] text-gray-500 border border-[#333]"
                      }`}>
                        {lane.playerPower}
                      </div>
                    </div>
                  </div>

                  {/* CPU Combos (enemy side - top) - ONLY ONE COMBO */}
                  {(() => {
                    const allCpuCombos = detectCombos(lane.cpuCards);
                    if (allCpuCombos.length === 0) return null;
                    // Only show first combo (one combo per lane rule)
                    const cpuCombo = allCpuCombos[0];
                    return (
                      <div className="py-0.5 flex items-center justify-center gap-1 flex-wrap">
                        <button
                          onClick={() => setDetailCombo(cpuCombo.combo)}
                          className="border rounded px-1.5 py-0.5 hover:scale-105 transition-all cursor-pointer bg-red-600/30 border-red-500/60"
                        >
                          <span className="text-[7px] text-red-300 font-bold uppercase tracking-wide">
                            {cpuCombo.combo.emoji} {COMBO_TRANSLATION_KEYS[cpuCombo.combo.id] ? t(COMBO_TRANSLATION_KEYS[cpuCombo.combo.id] as keyof typeof translations["pt-BR"]) : cpuCombo.combo.name}
                          </span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* CPU Cards (top) - Grid 2x2 style */}
                  <div className="flex-1 flex items-start justify-center pt-1 px-1 overflow-hidden">
                    <div className="grid grid-cols-2 gap-1 min-h-[124px]">
                      {lane.cpuCards.map((card: any, idx: number) => {
                        const ability = getCardAbility(card.name, card);
                        const foil = (card.foil || "").toLowerCase();
                        const hasFoil = foil && foil !== "none" && foil !== "";
                        const foilClass = foil.includes("prize") ? "prize-foil" : foil.includes("standard") ? "standard-foil" : "";
                        // Use actual card image (same as deck builder)
                        const cardImageUrl = getCardDisplayImageUrl(card);

                        // Get card animation if any
                        const animKey = `${laneIndex}-cpu-${idx}`;
                        const anim = cardAnimations[animKey];
                        const animClass = anim ? {
                          "shake": "tcg-shake",
                          "glow-green": "tcg-glow-green",
                          "glow-red": "tcg-glow-red",
                          "spin": "tcg-spin",
                          "pulse": "tcg-pulse",
                          "slide-out": "tcg-slide-out",
                          "float-up": "tcg-float-up",
                          "explode": "tcg-explode",
                          "kamikaze": "tcg-kamikaze-fly",
                        }[anim.type] || "" : "";

                        // Check if card is revealed (old cards are always revealed)
                        const isRevealed = (card as any)._revealed !== false;
                        const coverUrl = getCollectionCoverUrl(card.collection, card.rarity);
                        const displayImageUrl = isRevealed ? cardImageUrl : coverUrl;

                        return (
                          <div
                            key={idx}
                            onClick={() => isRevealed && setDetailCard(card)}
                            className={`relative w-10 h-[58px] rounded-md cursor-pointer hover:scale-105 transition-all overflow-hidden ${animClass} ${!isRevealed ? "tcg-card-back" : "tcg-card-flip"}`}
                            style={{
                              boxShadow: isRevealed ? "0 2px 6px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.5)" : "0 2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(100,100,100,0.5)"
                            }}
                          >
                            {/* Card image/video */}
                            {isRevealed ? (
                              <CardMedia
                                src={cardImageUrl}
                                alt={card.name}
                                className="absolute inset-0 w-full h-full object-cover rounded-md"
                              />
                            ) : (
                              <div
                                className="absolute inset-0 bg-cover bg-center rounded-md"
                                style={{ backgroundImage: `url(${coverUrl})` }}
                              />
                            )}
                            {/* Only show details when revealed */}
                            {isRevealed && (
                              <>
                                {/* Foil effect overlay */}
                                {hasFoil && <div className={`absolute inset-0 ${foilClass} rounded-md pointer-events-none z-[5]`}></div>}
                                {/* Power badge - Snap style hexagon-ish */}
                                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-600 flex items-center justify-center z-10 transition-all ${anim?.type === "glow-red" ? "scale-125" : ""}`}
                                  style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
                                  <span className="text-[8px] font-black text-white">{card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power}</span>
                                </div>
                                {/* Power change floating number */}
                                {anim?.powerChange && (
                                  <div className={`absolute inset-0 flex items-center justify-center z-30 pointer-events-none`}>
                                    <span className={`text-lg font-black animate-[floatUp_0.8s_ease-out_forwards] ${anim.powerChange > 0 ? "text-green-400" : "text-red-400"}`}>
                                      {anim.powerChange > 0 ? `+${anim.powerChange}` : anim.powerChange}
                                    </span>
                                  </div>
                                )}
                                {/* Ability indicator - small dot */}
                                {ability && (
                                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold z-10 ${
                                    ability.type === "onReveal" ? "bg-orange-500" : "bg-green-500"
                                  }`}>
                                    {ability.type === "onReveal" ? "R" : "O"}
                                  </div>
                                )}
                              </>
                            )}
                            {/* Face-down indicator */}
                            {!isRevealed && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg opacity-50">?</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {lane.cpuCards.length === 0 && (
                        <div className="w-10 h-[58px] rounded-md"
                          style={{
                            background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)",
                            border: "2px dashed rgba(184,134,11,0.3)",
                            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)"
                          }} />
                      )}
                    </div>
                  </div>

                  {/* Center Divider - Show ALL combos */}
                  <div className="py-0.5 flex items-center justify-center gap-1 flex-wrap">
                    {activeCombos.length > 0 ? (
                      activeCombos.map(({ combo, wildcardsUsed }) => (
                        <button
                          key={combo.id}
                          onClick={() => setDetailCombo(combo)}
                          className={`border rounded px-1.5 py-0.5 hover:scale-105 transition-all cursor-pointer ${
                            wildcardsUsed > 0
                              ? "bg-cyan-600/30 border-cyan-500/60"
                              : "bg-yellow-600/30 border-yellow-500/60"
                          }`}
                        >
                          <span className="text-[7px] text-yellow-300 font-bold uppercase tracking-wide">
                            {combo.emoji} {COMBO_TRANSLATION_KEYS[combo.id] ? t(COMBO_TRANSLATION_KEYS[combo.id] as keyof typeof translations["pt-BR"]) : combo.name}
                            {wildcardsUsed > 0 && <span className="text-cyan-300 ml-0.5">🃏</span>}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="w-12 h-px bg-gray-700/50" />
                    )}
                  </div>

                  {/* Player Cards (bottom) - Grid 2x2 style - increased height */}
                  <div
                    className={`relative flex-1 flex items-end justify-center pb-1 px-1 transition-all overflow-hidden ${
                      selectedHandCard !== null ? "bg-green-900/30 cursor-pointer" : ""
                    }`}
                    onClick={() => selectedHandCard !== null && handlePvEPlayCard(laneIndex)}
                  >
                    {selectedHandCard !== null && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <span className="text-green-400 text-xs font-bold bg-black/60 px-2 py-1 rounded">{t('tcgPlay2')}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-1 min-h-[124px]">
                      {lane.playerCards.map((card: any, idx: number) => {
                        const ability = getCardAbility(card.name, card);
                        const animKey = `${laneIndex}-player-${idx}`;
                        const anim = cardAnimations[animKey];
                        const animClass = anim ? {
                          "shake": "tcg-shake",
                          "glow-green": "tcg-glow-green",
                          "glow-red": "tcg-glow-red",
                          "spin": "tcg-spin",
                          "pulse": "tcg-pulse",
                          "slide-out": "tcg-slide-out",
                          "float-up": "tcg-float-up",
                          "explode": "tcg-explode",
                          "kamikaze": "tcg-kamikaze-fly",
                        }[anim.type] || "" : "";

                        // Check if card is revealed (old cards are always revealed)
                        const isRevealed = (card as any)._revealed !== false;
                        // Use actual card image (same as deck builder)
                        const cardImageUrl = getCardDisplayImageUrl(card);
                        const coverUrl = getCollectionCoverUrl(card.collection, card.rarity);
                        const displayImageUrl = isRevealed ? cardImageUrl : coverUrl;

                        // Can drag back to hand if not revealed and was played this turn
                        const canDragBack = !isRevealed && (gs.cardsPlayedInfo || []).some((info: any) => info.cardId === card.cardId && info.laneIndex === laneIndex);

                        return (
                          <div
                            key={idx}
                            draggable={canDragBack}
                            onDragStart={(e) => {
                              if (!canDragBack) return;
                              e.stopPropagation();
                              setDraggedLaneCard({ laneIndex, cardIndex: idx });
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => {
                              setDraggedLaneCard(null);
                              setDragOverHand(false);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isRevealed) setDetailCard(card);
                            }}
                            className={`relative w-10 h-[58px] rounded-md cursor-pointer hover:scale-110 hover:z-30 transition-all overflow-hidden ${isRevealed ? getFoilClass(card.foil) : ""} ${animClass} ${!isRevealed ? "tcg-card-back" : "tcg-card-flip"} ${draggedLaneCard?.laneIndex === laneIndex && draggedLaneCard?.cardIndex === idx ? "opacity-50 scale-95" : ""}`}
                            style={{
                              zIndex: anim ? 50 : idx,
                              boxShadow: isRevealed ? "0 2px 8px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.5)" : "0 2px 8px rgba(0,0,0,0.8), 0 0 0 1px rgba(100,100,100,0.5)",
                              cursor: canDragBack ? "grab" : "pointer"
                            }}
                          >
                            {/* Card image/video */}
                            {isRevealed ? (
                              <CardMedia
                                src={cardImageUrl}
                                alt={card.name}
                                className="absolute inset-0 w-full h-full object-cover rounded-md"
                              />
                            ) : (
                              <div
                                className="absolute inset-0 bg-cover bg-center rounded-md"
                                style={{ backgroundImage: `url(${coverUrl})` }}
                              />
                            )}
                            {/* Only show details when revealed */}
                            {isRevealed && (
                              <>
                                {/* Power badge - Snap style */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 flex items-center justify-center z-10"
                                  style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
                                  <span className="text-[8px] font-black text-white">{card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power}</span>
                                </div>
                                {/* Ability indicator - small dot */}
                                {ability && (
                                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold ${
                                    ability.type === "onReveal" ? "bg-orange-500" : "bg-green-500"
                                  }`}>
                                    {ability.type === "onReveal" ? "R" : "O"}
                                  </div>
                                )}
                                {/* Landmine kamikaze now triggers automatically on reveal */}
                              </>
                            )}
                            {/* Face-down indicator (player cards) */}
                            {!isRevealed && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg text-blue-400 opacity-70">?</span>
                              </div>
                            )}
                            {/* UNDO Button - Return card to hand (only for unrevealed cards this turn) */}
                            {!isRevealed && (gs.cardsPlayedInfo || []).some((info: any) => info.cardId === card.cardId && info.laneIndex === laneIndex) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReturnCardToHand(laneIndex, idx);
                                }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-gray-700 hover:bg-red-600 rounded-full text-[8px] text-white font-bold flex items-center justify-center z-30 transition-colors"
                                title="Return to hand"
                              >
                                R
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {lane.playerCards.length === 0 && !selectedHandCard && (
                        <div className="w-10 h-[58px] rounded-md"
                          style={{
                            background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)",
                            border: "2px dashed rgba(184,134,11,0.3)",
                            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)"
                          }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Floating Card Indicator while dragging */}
          {draggedCardIndex !== null && touchDragPos && gs.playerHand?.[draggedCardIndex] && (() => {
            const dragCard = gs.playerHand[draggedCardIndex];
            const dragCardImageUrl = getCardDisplayImageUrl(dragCard);
            return (
              <div
                data-drag-ghost="true"
                className="fixed pointer-events-none z-[100]"
                style={{
                  left: touchDragPos.x - 30,
                  top: touchDragPos.y - 42,
                }}
              >
                <div
                  className="w-[60px] h-[85px] rounded-lg border-2 border-cyan-400 shadow-xl shadow-cyan-500/50 bg-cover bg-center opacity-90"
                  style={{ backgroundImage: `url(${dragCardImageUrl})` }}
                />
              </div>
            );
          })()}


          {/* Ability Effect Animation - Attack/Buff effect going across lanes */}
          {abilityEffectAnim && (
            <div className="fixed inset-0 pointer-events-none z-[150]">
              <div
                className={`absolute tcg-ability-effect ${abilityEffectAnim.type === "attack" || abilityEffectAnim.type === "destroy"
                  ? "tcg-attack-effect"
                  : abilityEffectAnim.type === "steal"
                    ? "tcg-steal-effect"
                    : "tcg-buff-effect"
                  }`}
                style={{
                  left: "50%",
                  top: abilityEffectAnim.sourceSide === "player" ? "65%" : "35%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="text-5xl animate-bounce">
                  {abilityEffectAnim.emoji}
                </div>
                {abilityEffectAnim.powerChange !== undefined && abilityEffectAnim.powerChange !== 0 && (
                  <div className={`text-2xl font-black mt-1 ${
                    abilityEffectAnim.type === "attack" || abilityEffectAnim.type === "destroy"
                      ? "text-red-400"
                      : abilityEffectAnim.type === "steal"
                        ? "text-purple-400"
                        : "text-green-400"
                  }`}>
                    {abilityEffectAnim.powerChange > 0 ? "+" : ""}{abilityEffectAnim.powerChange}
                  </div>
                )}
              </div>
              {/* Attack projectile line */}
              {(abilityEffectAnim.type === "attack" || abilityEffectAnim.type === "destroy") && (
                <div
                  className="absolute left-1/2 tcg-attack-projectile"
                  style={{
                    top: abilityEffectAnim.sourceSide === "player" ? "60%" : "40%",
                    height: "20%",
                    width: "4px",
                    background: abilityEffectAnim.type === "destroy"
                      ? "linear-gradient(to top, transparent, #ef4444, #fbbf24)"
                      : "linear-gradient(to top, transparent, #ef4444, #f97316)",
                    transform: abilityEffectAnim.sourceSide === "player"
                      ? "translateX(-50%) scaleY(-1)"
                      : "translateX(-50%)",
                    boxShadow: "0 0 10px #ef4444, 0 0 20px #ef4444",
                    borderRadius: "4px",
                  }}
                />
              )}
              {/* Steal swirl */}
              {abilityEffectAnim.type === "steal" && (
                <div
                  className="absolute left-1/2 tcg-steal-swirl"
                  style={{
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="text-4xl animate-spin">🌀</div>
                </div>
              )}
            </div>
          )}

          {/* Hand - Bottom Bar (Royal style) */}
          <div
            className="relative pt-4 pb-2 px-3 tcg-royal-hand"
            style={{
              background: "linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,1) 100%)",
              borderTop: dragOverHand ? "3px solid #22c55e" : "3px solid",
              borderImage: dragOverHand ? "none" : "linear-gradient(90deg, transparent 5%, #B8860B 20%, #FFD700 50%, #B8860B 80%, transparent 95%) 1"
            }}
            onDragOver={(e) => {
              if (draggedLaneCard) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverHand(true);
              }
            }}
            onDragEnter={(e) => {
              if (draggedLaneCard) {
                e.preventDefault();
                setDragOverHand(true);
              }
            }}
            onDragLeave={(e) => {
              // Only set false if leaving the container entirely
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverHand(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedLaneCard) {
                handleReturnCardToHand(draggedLaneCard.laneIndex, draggedLaneCard.cardIndex);
                setDraggedLaneCard(null);
              }
              setDragOverHand(false);
            }}
          >
            {/* Drop zone indicator */}
            {dragOverHand && draggedLaneCard && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-900/30 pointer-events-none z-20 rounded">
                <span className="text-green-400 text-xs font-bold bg-black/60 px-2 py-1 rounded">↩ Return to Hand</span>
              </div>
            )}
            {/* Cards */}
            <div className="flex justify-center gap-1 mb-3">
              {gs.playerHand?.map((card: any, idx: number) => {
                const ability = getCardAbility(card.name, card);
                const foilEffect = getFoilEffect(card.foil);
                const displayPower = card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power;
                const energyCost = getEnergyCost(card);
                const canAfford = energyCost <= (gs.energy || 1);
                // Use actual card image (same as deck builder)
                const battleHandImageUrl = getCardDisplayImageUrl(card);

                // Check if this card is part of any potential combo
                // Use resolveCardName to handle aliases (e.g., "filthy" -> "don filthy")
                const cardNameResolved = resolveCardName(card.name || "");
                const hasComboPartner = CARD_COMBOS.some(combo => {
                  const comboCardsLower = combo.cards.map(c => c.toLowerCase());
                  if (!comboCardsLower.includes(cardNameResolved)) return false;
                  // Check if any other card in hand or in lanes matches this combo
                  const otherHandCards = gs.playerHand.filter((_: any, i: number) => i !== idx);
                  const allLaneCards = gs.lanes.flatMap((l: any) => l.playerCards || []);
                  const allCards = [...otherHandCards, ...allLaneCards];
                  const matchCount = comboCardsLower.filter(cc =>
                    allCards.some((c: any) => resolveCardName(c.name || "") === cc)
                  ).length;
                  return matchCount >= 1; // Has at least one combo partner available
                });

                // Find which combo this card could form
                const potentialCombo = hasComboPartner ? CARD_COMBOS.find(combo => {
                  const comboCardsLower = combo.cards.map(c => c.toLowerCase());
                  return comboCardsLower.includes(cardNameResolved);
                }) : null;

                return (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!canAfford || e.button !== 0) return;
                      const startX = e.clientX;
                      const startY = e.clientY;
                      wasDraggingRef.current = false;
                      setDraggedCardIndex(idx);
                      setSelectedHandCard(null);
                      setTouchDragPos({ x: startX, y: startY });

                      const handleMouseMove = (moveE: MouseEvent) => {
                        const dx = Math.abs(moveE.clientX - startX);
                        const dy = Math.abs(moveE.clientY - startY);
                        if (dx > 5 || dy > 5) {
                          wasDraggingRef.current = true;
                        }
                        setTouchDragPos({ x: moveE.clientX, y: moveE.clientY });
                        const laneIdx = getLaneUnderTouch(moveE.clientX, moveE.clientY);
                        setDragOverLane(laneIdx);
                      };

                      const handleMouseUp = (upE: MouseEvent) => {
                        const laneIdx = getLaneUnderTouch(upE.clientX, upE.clientY);
                        if (laneIdx !== null && wasDraggingRef.current) {
                          const lane = pveGameState?.lanes[laneIdx];
                          if (lane && (lane.playerCards?.length || 0) < TCG_CONFIG.CARDS_PER_LANE) {
                            handlePvEPlayCard(laneIdx, idx);
                          }
                        }
                        setDraggedCardIndex(null);
                        setDragOverLane(null);
                        setTouchDragPos(null);
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };

                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    onTouchStart={(e) => {
                      if (!canAfford) return;
                      const touch = e.touches[0];
                      setDraggedCardIndex(idx);
                      setSelectedHandCard(null);
                      setTouchDragPos({ x: touch.clientX, y: touch.clientY });
                    }}
                    onTouchMove={(e) => {
                      if (draggedCardIndex !== idx) return;
                      const touch = e.touches[0];
                      setTouchDragPos({ x: touch.clientX, y: touch.clientY });
                      const laneIdx = getLaneUnderTouch(touch.clientX, touch.clientY);
                      setDragOverLane(laneIdx);
                    }}
                    onTouchEnd={(e) => {
                      if (draggedCardIndex !== idx) return;
                      const touch = e.changedTouches[0];
                      const laneIdx = getLaneUnderTouch(touch.clientX, touch.clientY);
                      if (laneIdx !== null) {
                        const lane = pveGameState?.lanes[laneIdx];
                        if (lane && (lane.playerCards?.length || 0) < TCG_CONFIG.CARDS_PER_LANE) {
                          handlePvEPlayCard(laneIdx, idx);
                        }
                      }
                      setDraggedCardIndex(null);
                      setDragOverLane(null);
                      setTouchDragPos(null);
                    }}
                    onClick={(e) => {
                      // Skip click if we were dragging
                      if (wasDraggingRef.current) {
                        wasDraggingRef.current = false;
                        return;
                      }
                      // Open card detail instead of selecting
                      setDetailCard(card);
                    }}
                    className={`relative flex-shrink-0 w-[60px] h-[85px] rounded-lg border-2 transition-all duration-200 select-none ${
                      !canAfford
                        ? "border-red-500/50 opacity-50 cursor-not-allowed grayscale"
                        : draggedCardIndex === idx
                          ? "border-cyan-400 opacity-50 scale-95 cursor-grabbing"
                          : selectedHandCard === idx
                            ? "border-green-400 -translate-y-6 scale-110 z-20 shadow-xl shadow-green-500/50 cursor-pointer"
                            : hasComboPartner
                              ? "border-yellow-400 hover:-translate-y-2 hover:scale-105 ring-2 ring-yellow-400/50 cursor-grab"
                              : `${RARITY_COLORS[card.rarity]?.split(" ")[0] || "border-gray-500"} hover:-translate-y-2 hover:scale-105 cursor-grab`
                    } ${getFoilClass(card.foil)}`}
                    style={{
                      zIndex: selectedHandCard === idx ? 20 : draggedCardIndex === idx ? 30 : idx,
                      userSelect: "none"
                    }}
                  >
                    {/* Card background image/video - non-draggable */}
                    <CardMedia
                      src={card.type === "vbms" ? battleHandImageUrl : card.imageUrl}
                      alt={card.name}
                      className="absolute inset-0 w-full h-full object-cover rounded-lg pointer-events-none"
                    />
                    {card.foil && card.foil !== "None" && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-yellow-400/20 rounded-lg pointer-events-none" />
                    )}
                    {/* Can't Afford Overlay */}
                    {!canAfford && (
                      <div className="absolute inset-0 bg-red-900/40 rounded-lg flex items-center justify-center pointer-events-none">
                        <span className="text-red-400 text-xl">⚡</span>
                      </div>
                    )}
                    {/* Energy Cost Badge (top-left) - Special for Foils */}
                    {foilEffect ? (
                      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg z-10 bg-gradient-to-br from-cyan-400 to-teal-500 border-cyan-200">
                        <span className="text-xs font-bold text-white">{energyCost}</span>
                      </div>
                    ) : (
                      <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg z-10 ${
                        canAfford
                          ? "bg-gradient-to-br from-blue-400 to-blue-600 border-white"
                          : "bg-gradient-to-br from-red-500 to-red-700 border-red-300"
                      }`}>
                        <span className="text-xs font-bold text-white">{energyCost}</span>
                      </div>
                    )}
                    {/* Power Badge (bottom-right) */}
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-yellow-200 flex items-center justify-center shadow-lg">
                      <span className="text-[10px] font-bold text-black">{displayPower}</span>
                    </div>
                    {/* Combo Indicator (top-right) - only if has combo - CLICKABLE */}
                    {hasComboPartner && potentialCombo && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailCombo(potentialCombo); }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-yellow-200 flex items-center justify-center shadow-lg z-10 animate-bounce hover:scale-125 transition-transform cursor-pointer"
                      >
                        <span className="text-xs">{potentialCombo.emoji}</span>
                      </button>
                    )}
                    {/* Info Button (top-right) - only if no combo indicator */}
                    {(!hasComboPartner || !potentialCombo) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailCard(card); }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 hover:bg-blue-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center z-10 shadow-lg"
                      >
                        ?
                      </button>
                    )}
                    {/* Info Button below combo indicator when combo exists */}
                    {hasComboPartner && potentialCombo && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailCard(card); }}
                        className="absolute top-5 -right-1 w-4 h-4 bg-blue-600 hover:bg-blue-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center z-10 shadow-lg"
                      >
                        ?
                      </button>
                    )}
                    {/* Card Name */}
                    <div className="absolute bottom-5 left-0 right-0 text-center">
                      <span className="text-[7px] text-white font-bold drop-shadow-lg bg-black/50 px-1 rounded">{card.name}</span>
                    </div>
                    {/* Sacrifice Button for Nothing cards (bottom-left) */}
                    {(card.type === "nothing" || card.type === "other") && (() => {
                      const sacrificeEnergy = Math.max(1, Math.floor(energyCost / 2));
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSacrificeNothingFromHand(idx);
                          }}
                          className="absolute -bottom-2 -left-2 w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 rounded-full text-[9px] text-white font-bold flex items-center justify-center z-10 shadow-lg border-2 border-purple-300 animate-pulse"
                          title={`Sacrifice: +${sacrificeEnergy}⚡ + Draw`}
                        >
                          +{sacrificeEnergy}⚡
                        </button>
                      );
                    })()}
                    {/* Combo hint on hover */}
                    {hasComboPartner && potentialCombo && selectedHandCard !== idx && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-[8px] text-yellow-400 bg-black/80 px-1 rounded">{potentialCombo.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {(!gs.playerHand || gs.playerHand.length === 0) && (
                <span className="text-gray-500 text-sm">{t('tcgNoCardsInHand')}</span>
              )}
            </div>

            {/* Bottom Action Bar - Marvel Snap Style */}
            <div className="flex items-center justify-between">
              {/* Back Button (left) - Royal style */}
              <button
                onClick={() => {
                  setIsPvE(false);
                  setPveGameState(null);
                  setView("lobby");
                }}
                className="bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] hover:from-[#2a2a2a] hover:to-[#3a3a3a] text-[#B8860B] hover:text-[#FFD700] font-bold py-2 px-4 rounded-lg text-sm shadow-lg transition-all"
                style={{
                  border: "2px solid",
                  borderImage: "linear-gradient(135deg, #8B6914, #B8860B, #8B6914) 1"
                }}
              >
                ← BACK
              </button>

              {/* Energy Orb (center) - Royal gold style */}
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: "radial-gradient(circle at 30% 30%, #FFD700, #B8860B, #8B6914)",
                  boxShadow: "0 0 20px rgba(255,215,0,0.5), inset 0 2px 10px rgba(255,255,255,0.3), inset 0 -5px 15px rgba(0,0,0,0.4)",
                  border: "3px solid #FFD700"
                }}
              >
                <span className="text-2xl font-black text-black drop-shadow-[0_1px_1px_rgba(255,215,0,0.5)]">{gs.energy}</span>
              </div>

              {/* End Turn Button (right) - Royal style */}
              <button
                onClick={handlePvEEndTurn}
                className={`font-bold py-2 px-4 rounded-lg text-sm shadow-lg transition-all min-w-[100px] ${
                  turnTimeRemaining <= 5
                    ? 'bg-gradient-to-r from-red-700 to-red-900 border-2 border-red-500 text-white animate-pulse'
                    : turnTimeRemaining <= 10
                      ? 'bg-gradient-to-r from-orange-600 to-amber-700 border-2 border-orange-400 text-white'
                      : 'bg-gradient-to-r from-[#B8860B] to-[#8B6914] hover:from-[#FFD700] hover:to-[#B8860B] text-black border-2 border-[#FFD700]'
                }`}
                style={turnTimeRemaining > 10 ? {
                  boxShadow: "0 0 15px rgba(255,215,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)"
                } : undefined}
              >
                {turnTimeRemaining <= 10 ? (
                  <span className="text-2xl font-black">{turnTimeRemaining}</span>
                ) : (
                  <>
                    {t('tcgEndTurn')} <span className="text-black/70">{gs.currentTurn}/{TCG_CONFIG.TOTAL_TURNS}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Card Detail Modal */}
        {detailCard && (
          <CardDetailModal
            card={detailCard}
            onClose={() => setDetailCard(null)}
          />
        )}

        {/* Combo Detail Modal */}
        {detailCombo && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setDetailCombo(null)}>
            <div className="bg-gradient-to-br from-yellow-900 via-amber-900 to-orange-950 rounded-2xl p-6 max-w-sm w-full border-2 border-yellow-500 shadow-2xl shadow-yellow-500/30" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">{detailCombo.emoji}</div>
                <h2 className="text-2xl font-black text-yellow-400">{detailCombo.name}</h2>
              </div>

              {/* Cards in Combo */}
              <div className="mb-4">
                <p className="text-xs text-yellow-300/70 mb-2 uppercase tracking-wider">{t('tcgCardsRequired')}</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {detailCombo.cards.map((cardName, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-black/40 rounded text-sm text-white capitalize">
                      {cardName}
                    </span>
                  ))}
                </div>
                {detailCombo.minCards && (
                  <p className="text-xs text-yellow-400/60 mt-1 text-center">
                    (Need at least {detailCombo.minCards} of these)
                  </p>
                )}
              </div>

              {/* Effect */}
              <div className="bg-black/30 rounded-xl p-4 mb-4">
                <p className="text-xs text-yellow-300/70 mb-1 uppercase tracking-wider">{t('tcgBonusEffect')}</p>
                <p className="text-yellow-100 font-bold">{detailCombo.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    detailCombo.bonus.type === "power" ? "bg-green-600" :
                    detailCombo.bonus.type === "power_percent" ? "bg-purple-600" :
                    detailCombo.bonus.type === "steal" ? "bg-red-600" : "bg-blue-600"
                  }`}>
                    {detailCombo.bonus.type === "power" ? `+${detailCombo.bonus.value} Power` :
                     detailCombo.bonus.type === "power_percent" ? `+${detailCombo.bonus.value}% Power` :
                     detailCombo.bonus.type === "steal" ? `-${detailCombo.bonus.value} Enemy` :
                     detailCombo.bonus.type}
                  </span>
                  <span className="text-xs text-yellow-400/60">
                    to {detailCombo.bonus.target === "self" ? "combo cards" : detailCombo.bonus.target}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setDetailCombo(null)}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 rounded-lg transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        {/* VibeFID Combo Selection Modal */}
        {vibefidComboModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-950 rounded-2xl p-6 max-w-sm w-full border-2 border-cyan-500 shadow-2xl shadow-cyan-500/30" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">🃏</div>
                <h2 className="text-2xl font-black text-cyan-400">{t('tcgChooseCombo') || "Choose Combo"}</h2>
                <p className="text-sm text-cyan-300/70 mt-1">VibeFID = Wildcard 🌟</p>
              </div>

              {/* Combo Options */}
              <div className="space-y-3 mb-4">
                {vibefidComboModal.possibleCombos.map(({ combo, partnerCard }) => (
                  <button
                    key={combo.id}
                    onClick={() => {
                      const cardIndex = (vibefidComboModal.card as any)._tempCardIndex;
                      setVibefidComboModal(null);
                      handlePvEPlayCard(vibefidComboModal.laneIndex, cardIndex, combo.id);
                    }}
                    className="w-full bg-black/40 hover:bg-cyan-800/40 border border-cyan-500/40 hover:border-cyan-400 rounded-xl p-4 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{combo.emoji}</span>
                      <div>
                        <div className="text-cyan-300 font-bold">
                          {COMBO_TRANSLATION_KEYS[combo.id] ? t(COMBO_TRANSLATION_KEYS[combo.id] as keyof typeof translations["pt-BR"]) : combo.name}
                        </div>
                        <div className="text-xs text-cyan-400/60">
                          VibeFID + {partnerCard}
                        </div>
                        <div className="text-xs text-green-400 mt-1">
                          {combo.bonus.type === "power" ? `+${combo.bonus.value} Power` :
                           combo.bonus.type === "steal" ? `Steal ${combo.bonus.value}` :
                           combo.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Cancel / Auto Button */}
              <button
                onClick={() => {
                  // Auto-select first combo (default behavior)
                  const firstCombo = vibefidComboModal.possibleCombos[0];
                  const cardIndex = (vibefidComboModal.card as any)._tempCardIndex;
                  setVibefidComboModal(null);
                  handlePvEPlayCard(vibefidComboModal.laneIndex, cardIndex, firstCombo?.combo.id);
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors text-sm"
              >
                {t('tcgAutoSelect') || "Auto (First Card)"} - {vibefidComboModal.possibleCombos[0]?.combo.emoji} {vibefidComboModal.possibleCombos[0]?.combo.name}
              </button>
            </div>
          </div>
        )}

        {/* Battle Log Floating Button */}
        <button
          onClick={() => setShowBattleLog(!showBattleLog)}
          className="fixed bottom-20 right-3 w-10 h-10 rounded-full bg-black/80 border border-vintage-gold/40 flex items-center justify-center z-30 hover:bg-black/90 transition-all"
        >
          <span className="text-lg">📜</span>
        </button>

        {/* Battle Log Panel */}
        {showBattleLog && (
          <div className="fixed right-0 top-0 bottom-0 w-64 bg-black/95 border-l border-vintage-gold/30 z-40 overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-vintage-gold font-bold text-sm uppercase tracking-wider">Battle Log</h3>
              <button onClick={() => setShowBattleLog(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            {battleLog.length === 0 ? (
              <p className="text-gray-500 text-xs">No actions yet...</p>
            ) : (
              <div className="space-y-1">
                {battleLog.map((entry, i) => (
                  <div key={i} className={`text-[10px] px-2 py-1 rounded ${
                    entry.player === "you" ? "bg-blue-900/30 text-blue-300" : "bg-red-900/30 text-red-300"
                  }`}>
                    <span className="text-vintage-gold/60">T{entry.turn}:</span>{" "}
                    <span className="font-bold">{entry.player === "you" ? "You" : "CPU"}</span>{" "}
                    {entry.action} <span className="text-white font-medium">{entry.cardName}</span> → Lane {entry.lane}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // PvP Battle
  if (view === "battle" && currentMatch?.gameState) {
    const gs = currentMatch.gameState;
    const isPlayer1 = currentMatch.player1Address === address?.toLowerCase();
    const myHand = isPlayer1 ? gs.player1Hand : gs.player2Hand;
    const myCards = isPlayer1 ? "player1Cards" : "player2Cards";
    const enemyCards = isPlayer1 ? "player2Cards" : "player1Cards";
    const myPower = isPlayer1 ? "player1Power" : "player2Power";
    const enemyPower = isPlayer1 ? "player2Power" : "player1Power";
    const myConfirmed = isPlayer1 ? gs.player1Confirmed : gs.player2Confirmed;
    const opponentConfirmed = isPlayer1 ? gs.player2Confirmed : gs.player1Confirmed;
    const energy = isPlayer1
      ? (gs.player1Energy || gs.energy || gs.currentTurn || 1)
      : (gs.player2Energy || gs.energy || gs.currentTurn || 1);
    const isFinished = currentMatch.status === "finished";

    // Opponent name formatting
    const rawOpponentName = isPlayer1 ? currentMatch.player2Username : currentMatch.player1Username;
    const isCpuMatch = (currentMatch as any).isCpuOpponent;
    const opponentDisplayName = rawOpponentName
      ? (isCpuMatch ? `${rawOpponentName} (CPU)` : rawOpponentName)
      : t('tcgOpponent');

    // Calculate pending actions energy cost (play costs energy, sacrifice gives +2)
    const pendingEnergyCost = pendingActions.reduce((total, action) => {
      if (action.type === "play" && myHand && myHand[action.cardIndex]) {
        return total + getEnergyCost(myHand[action.cardIndex]);
      }
      if (action.type === "sacrifice-hand") {
        return total - 2; // Sacrifice gives +2 energy (negative cost)
      }
      return total;
    }, 0);
    const remainingEnergy = energy - pendingEnergyCost;

    // Get lane status
    const getLaneStatus = (lane: any) => {
      const myP = lane[myPower] || 0;
      const enemyP = lane[enemyPower] || 0;
      if (myP > enemyP) return "winning";
      if (myP < enemyP) return "losing";
      return "tie";
    };

    return (
      <div className="h-screen bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] flex flex-col overflow-hidden relative">
        {/* Suit decorations background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[5%] tcg-suit-deco text-4xl">♠</div>
          <div className="absolute top-[15%] right-[8%] tcg-suit-deco text-3xl">♥</div>
          <div className="absolute bottom-[25%] left-[10%] tcg-suit-deco text-3xl">♦</div>
          <div className="absolute bottom-[30%] right-[5%] tcg-suit-deco text-4xl">♣</div>
          <div className="absolute top-[40%] left-[2%] tcg-suit-deco text-2xl">♠</div>
          <div className="absolute top-[50%] right-[3%] tcg-suit-deco text-2xl">♥</div>
        </div>

        {/* Game Over Overlay for PvP - shows final result before switching to result view */}
        {isFinished && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-fade-in">
            <div className={`text-center ${
              currentMatch.winnerId === address?.toLowerCase() ? "text-green-400" : (!currentMatch.winnerId || currentMatch.winnerId === "tie") ? "text-yellow-400" : "text-red-400"
            }`}>
              <div className="text-6xl font-black drop-shadow-2xl mb-2 animate-pulse">
                {currentMatch.winnerId === address?.toLowerCase()
                  ? `🏆 ${t('tcgVictory')}`
                  : (!currentMatch.winnerId || currentMatch.winnerId === "tie")
                    ? `⚖️ TIE`
                    : `💀 ${t('tcgDefeat')}`}
              </div>
              <div className="text-xl font-bold bg-black/50 px-4 py-2 rounded-lg">
                {gs.lanes.filter((l: any) => (l[myPower] || 0) > (l[enemyPower] || 0)).length} - {gs.lanes.filter((l: any) => (l[enemyPower] || 0) > (l[myPower] || 0)).length}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="relative flex flex-col h-full z-10">

          {/* Top Bar - Player Avatars & Turn Indicator */}
          <div className="flex items-center justify-between px-4 py-2">
            {/* Player Avatar (left) - Royal style with dropdown */}
            <div className="relative flex items-center gap-2">
              <div
                className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1a3a1a] to-[#0d280d] overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{
                  border: "3px solid",
                  borderImage: "linear-gradient(135deg, #FFD700, #B8860B, #FFD700) 1",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5), 0 0 15px rgba(255,215,0,0.2)"
                }}
              >
                {userProfile?.farcasterPfpUrl || userProfile?.twitterProfileImageUrl ? (
                  <img
                    src={userProfile.farcasterPfpUrl || userProfile.twitterProfileImageUrl}
                    alt="Player"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-700">
                    <span className="text-xl font-bold text-white">
                      {userProfile?.username?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs">
                <p className="text-[#FFD700] font-bold truncate max-w-[60px]" style={{ textShadow: "0 0 5px rgba(255,215,0,0.3)" }}>
                  {userProfile?.username || "YOU"}
                </p>
                <p className="text-[#B8860B]">{gs.lanes.filter((l: any) => (l[myPower] || 0) > (l[enemyPower] || 0)).length} lanes</p>
              </div>

              {/* Profile Dropdown Menu - Royal style */}
              {showProfileMenu && (
                <div className="absolute top-16 left-0 z-50 rounded-xl shadow-xl overflow-hidden min-w-[160px]"
                  style={{
                    background: "linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.98) 100%)",
                    border: "2px solid",
                    borderImage: "linear-gradient(135deg, #B8860B, #8B6914, #B8860B) 1",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.7)"
                  }}
                >
                  <div className="p-2 text-xs text-[#B8860B]" style={{ borderBottom: "1px solid rgba(184,134,11,0.3)" }}>
                    🔊 Meme Sounds
                  </div>
                  <button
                    onClick={() => { playMemeSound("mechaArena"); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-purple-600 flex items-center gap-2"
                  >
                    🤖 Mecha Arena
                  </button>
                  <button
                    onClick={() => { playMemeSound("ggez"); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-green-600 flex items-center gap-2"
                  >
                    😎 GG EZ
                  </button>
                  <button
                    onClick={() => { playMemeSound("bruh"); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-orange-600 flex items-center gap-2"
                  >
                    😐 Bruh
                  </button>
                  <button
                    onClick={() => { playMemeSound("emotional"); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-red-600 flex items-center gap-2"
                  >
                    💔 Emotional Damage
                  </button>
                  <button
                    onClick={() => { playMemeSound("wow"); setShowProfileMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-yellow-600 flex items-center gap-2"
                  >
                    🤯 MLG Wow
                  </button>
                  <div style={{ borderTop: "1px solid rgba(184,134,11,0.3)" }}>
                    <button
                      onClick={() => {
                        if (currentMatchId && address) {
                          forfeitMatch({ matchId: currentMatchId, address }).catch((e: any) => console.error("Forfeit error:", e));
                        }
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/50 flex items-center gap-2"
                    >
                      🏳️ {t('tcgSurrender')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Turn Indicator + PvP Status (center) */}
            <div className="flex flex-col items-center gap-1">
              {/* Turn number - Royal gold badge */}
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                style={{
                  background: "linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%)",
                  border: "2px solid",
                  borderImage: "linear-gradient(135deg, #8B6914, #FFD700, #8B6914) 1",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.5)"
                }}
              >
                <span className="text-xs text-purple-400 font-bold">PvP</span>
                <span className="text-xs text-[#B8860B] uppercase tracking-wider">{t('tcgTurn')}</span>
                <span className="text-xl font-black text-[#FFD700]" style={{ textShadow: "0 0 10px rgba(255,215,0,0.5)" }}>{gs.currentTurn}</span>
                <span className="text-xs text-[#8B6914]">/ {TCG_CONFIG.TOTAL_TURNS}</span>
              </div>
              {/* Confirmed status indicators */}
              <div className="flex items-center gap-2 text-[9px]">
                <span className={`px-1.5 py-0.5 rounded ${myConfirmed ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-400"}`}>
                  {myConfirmed ? "✓ " + t('tcgReady') : t('tcgPlanning')}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${opponentConfirmed ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-400"}`}>
                  {opponentConfirmed ? "✓" : "⏳"}
                </span>
              </div>
            </div>

            {/* Opponent Avatar (right) - Royal style */}
            <div className="flex items-center gap-2">
              <div className="text-xs text-right">
                <p className="text-red-400 font-bold truncate max-w-[60px]" style={{ textShadow: "0 0 5px rgba(239,68,68,0.3)" }}>{opponentDisplayName}</p>
                <p className="text-[#8B6914]">{gs.lanes.filter((l: any) => (l[enemyPower] || 0) > (l[myPower] || 0)).length} {t('tcgLanes')}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#3a1a1a] to-[#280d0d] overflow-hidden flex items-center justify-center"
                style={{
                  border: "3px solid",
                  borderImage: "linear-gradient(135deg, #B8860B, #8B6914, #B8860B) 1",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.5), 0 0 10px rgba(255,0,0,0.2)"
                }}
              >
                {opponentProfile?.farcasterPfpUrl || opponentProfile?.twitterProfileImageUrl ? (
                  <img
                    src={opponentProfile.farcasterPfpUrl || opponentProfile.twitterProfileImageUrl}
                    alt="Opponent"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-red-400">
                    {opponentDisplayName?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Opponent Disconnect Warning - SKIP for CPU matches */}
          {(() => {
            // CPU opponents never disconnect - skip warning entirely
            if ((currentMatch as any)?.isCpuOpponent) return null;

            const opponentLastSeen = isPlayer1 ? (currentMatch as any)?.player2LastSeen : (currentMatch as any)?.player1LastSeen;
            const now = Date.now();
            const timeSince = opponentLastSeen ? (now - opponentLastSeen) / 1000 : null;
            const matchAge = ((currentMatch as any)?.startedAt || (currentMatch as any)?.createdAt)
              ? (now - ((currentMatch as any)?.startedAt || (currentMatch as any)?.createdAt)) / 1000
              : 0;

            // Show warning if opponent hasn't sent heartbeat in 30s+
            const showWarning = timeSince !== null ? timeSince > 30 : matchAge > 60;
            const canClaim = timeSince !== null ? timeSince > 60 : matchAge > 120;

            if (!showWarning) return null;

            return (
              <div className={`mx-4 px-3 py-1.5 rounded-lg flex items-center justify-between text-xs ${
                canClaim ? "bg-red-900/50 border border-red-500/50" : "bg-yellow-900/50 border border-yellow-500/50"
              }`}>
                <span className={canClaim ? "text-red-300" : "text-yellow-300"}>
                  {canClaim ? "⚠ Opponent disconnected!" : "⏳ Opponent may have disconnected..."}
                </span>
                <div className="flex gap-2">
                  {canClaim && currentMatchId && address && (
                    <button
                      onClick={() => {
                        claimVictoryByTimeout({ matchId: currentMatchId, address }).catch((e: any) => {
                          console.error("Claim victory error:", e);
                        });
                      }}
                      className="bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-1 rounded text-xs transition-colors"
                    >
                      🏆 Claim Victory
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (currentMatchId && address) {
                        forfeitMatch({ matchId: currentMatchId, address }).catch((e: any) => {
                          console.error("Forfeit error:", e);
                        });
                      }
                    }}
                    className="bg-red-700 hover:bg-red-600 text-white font-bold px-3 py-1 rounded text-xs transition-colors"
                  >
                    🏳 Surrender
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Battle Arena - 3 Lanes (Royal Card Table style with 3D depth) */}
          <div
            className="flex-1 flex items-stretch justify-center px-2 gap-2 min-h-0"
            style={{ perspective: "1000px", perspectiveOrigin: "50% 80%" }}
          >
            <div
              className="flex-1 flex items-stretch justify-center gap-2"
              style={{ transformStyle: "preserve-3d", transform: "rotateX(15deg)", transformOrigin: "50% 100%" }}
            >
            {gs.lanes.map((lane: any, laneIndex: number) => {
              const status = getLaneStatus(lane);
              const pendingInLane = pendingActions.filter(a => a.targetLane === laneIndex).length;
              const myLaneCards = lane[myCards] || [];
              const enemyLaneCards = lane[enemyCards] || [];

              // Win indicator glow - golden for winning
              const winGlow = status === "winning" ? "shadow-[0_0_25px_rgba(255,215,0,0.5)]" :
                             status === "losing" ? "shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "";

              // Check if lane can receive cards (account for pending plays)
              const canDropInLane = (myLaneCards.length + pendingInLane) < TCG_CONFIG.CARDS_PER_LANE;

              // Combo detection for player cards in this lane
              const playerCombos = detectCombos(myLaneCards);
              const enemyCombos = detectCombos(enemyLaneCards);

              // Check for COMBO POTENTIAL when card is selected
              const activeCard = selectedHandCard !== null ? myHand?.[selectedHandCard] : null;
              const hasComboPotenial = activeCard && canDropInLane ? (() => {
                const potentialCards = [...myLaneCards, activeCard];
                const combos = detectCombos(potentialCards);
                const currentCombos = detectCombos(myLaneCards);
                return combos.length > currentCombos.length ? combos[combos.length - 1] : null;
              })() : null;

              return (
                <div
                  key={lane.laneId}
                  data-lane-index={laneIndex}
                  ref={(el) => { laneRefs.current[laneIndex] = el; }}
                  className={`flex flex-col w-[33%] h-full rounded-xl overflow-hidden ${winGlow} transition-all tcg-royal-zone ${hasComboPotenial ? "tcg-combo-glow" : ""}`}
                  style={{
                    background: hasComboPotenial
                      ? "linear-gradient(180deg, rgba(91,26,91,0.95) 0%, rgba(60,13,60,0.98) 50%, rgba(36,7,36,1) 100%)"
                      : "linear-gradient(180deg, rgba(26,71,42,0.95) 0%, rgba(13,40,24,0.98) 50%, rgba(7,26,15,1) 100%)",
                    border: "3px solid",
                    borderImage: hasComboPotenial
                      ? "linear-gradient(135deg, #FFD700, #FF6B00, #FFD700) 1"
                      : status === "winning"
                        ? "linear-gradient(135deg, #FFD700, #FFA500, #FFD700) 1"
                        : "linear-gradient(135deg, #B8860B, #8B6914, #B8860B) 1",
                    boxShadow: hasComboPotenial
                      ? "inset 0 0 60px rgba(255,165,0,0.4), 0 0 30px rgba(255,215,0,0.6), 0 4px 15px rgba(0,0,0,0.5)"
                      : "inset 0 0 40px rgba(0,0,0,0.6), 0 4px 15px rgba(0,0,0,0.5)"
                  }}
                >
                  {/* Location Header - Royal style */}
                  <div className="relative" style={{
                    background: "linear-gradient(180deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.95) 100%)",
                    borderBottom: "2px solid",
                    borderImage: "linear-gradient(90deg, transparent, #B8860B, #FFD700, #B8860B, transparent) 1"
                  }}>
                    {/* Score Bar - Royal style */}
                    <div className="flex items-center justify-center gap-3 py-1.5" style={{ background: "rgba(0,0,0,0.5)" }}>
                      <div className={`min-w-[32px] text-center px-2 py-0.5 rounded text-sm font-black ${
                        status === "losing" ? "bg-red-700 text-white" : "bg-[#1a1a1a] text-gray-500 border border-[#333]"
                      }`}>
                        {lane[enemyPower] || 0}
                      </div>
                      <div className="text-[10px] text-[#B8860B] font-bold">⚔</div>
                      <div className={`min-w-[32px] text-center px-2 py-0.5 rounded text-sm font-black ${
                        status === "winning" ? "bg-gradient-to-r from-[#B8860B] to-[#FFD700] text-black" : "bg-[#1a1a1a] text-gray-500 border border-[#333]"
                      }`}>
                        {lane[myPower] || 0}
                      </div>
                    </div>
                  </div>

                  {/* Enemy Combos (top) */}
                  {enemyCombos.length > 0 && (
                    <div className="py-0.5 flex items-center justify-center gap-1 flex-wrap">
                      <button
                        onClick={() => setDetailCombo(enemyCombos[0].combo)}
                        className="border rounded px-1.5 py-0.5 hover:scale-105 transition-all cursor-pointer bg-red-600/30 border-red-500/60"
                      >
                        <span className="text-[7px] text-red-300 font-bold uppercase tracking-wide">
                          {enemyCombos[0].combo.emoji} {COMBO_TRANSLATION_KEYS[enemyCombos[0].combo.id] ? t(COMBO_TRANSLATION_KEYS[enemyCombos[0].combo.id] as keyof typeof translations["pt-BR"]) : enemyCombos[0].combo.name}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Enemy Cards (top) - Grid 2x2 style */}
                  <div className="flex-1 flex items-start justify-center pt-1 px-1 overflow-hidden">
                    {/* Floating power change for enemy side */}
                    {pvpPowerChanges[`${laneIndex}-enemy`] && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                        <span className={`text-lg font-black animate-[floatUp_0.8s_ease-out_forwards] ${pvpPowerChanges[`${laneIndex}-enemy`] > 0 ? "text-red-400" : "text-green-400"}`}>
                          {pvpPowerChanges[`${laneIndex}-enemy`] > 0 ? `+${pvpPowerChanges[`${laneIndex}-enemy`]}` : pvpPowerChanges[`${laneIndex}-enemy`]}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-1 min-h-[124px]">
                      {enemyLaneCards.map((card: any, idx: number) => {
                        const ability = getCardAbility(card.name, card);
                        const foil = (card.foil || "").toLowerCase();
                        const hasFoil = foil && foil !== "none" && foil !== "";
                        const foilClass = foil.includes("prize") ? "prize-foil" : foil.includes("standard") ? "standard-foil" : "";
                        const cardImageUrl = getCardDisplayImageUrl(card);
                        const isRevealed = (card as any)._revealed !== false;
                        const coverUrl = getCollectionCoverUrl(card.collection, card.rarity);
                        const pvpAnim = pvpCardAnimClass[`${laneIndex}-enemy-${idx}`] || "";

                        return (
                          <div
                            key={idx}
                            onClick={() => isRevealed && setDetailCard(card)}
                            className={`relative w-10 h-[58px] rounded-md cursor-pointer hover:scale-105 transition-all overflow-hidden ${pvpAnim || (!isRevealed ? "tcg-card-back" : "tcg-card-flip")}`}
                            style={{
                              boxShadow: isRevealed ? "0 2px 6px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.5)" : "0 2px 6px rgba(0,0,0,0.8), 0 0 0 1px rgba(100,100,100,0.5)"
                            }}
                          >
                            {isRevealed ? (
                              <CardMedia
                                src={cardImageUrl}
                                alt={card.name}
                                className="absolute inset-0 w-full h-full object-cover rounded-md"
                              />
                            ) : (
                              <div
                                className="absolute inset-0 bg-cover bg-center rounded-md"
                                style={{ backgroundImage: `url(${coverUrl})` }}
                              />
                            )}
                            {isRevealed && (
                              <>
                                {hasFoil && <div className={`absolute inset-0 ${foilClass} rounded-md pointer-events-none z-[5]`}></div>}
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-600 flex items-center justify-center z-10"
                                  style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
                                  <span className="text-[8px] font-black text-white">{card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power}</span>
                                </div>
                                {ability && (
                                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold z-10 ${
                                    ability.type === "onReveal" ? "bg-orange-500" : "bg-green-500"
                                  }`}>
                                    {ability.type === "onReveal" ? "R" : "O"}
                                  </div>
                                )}
                              </>
                            )}
                            {!isRevealed && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg opacity-50">?</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {enemyLaneCards.length === 0 && (
                        <div className="w-10 h-[58px] rounded-md"
                          style={{
                            background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)",
                            border: "2px dashed rgba(184,134,11,0.3)",
                            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)"
                          }} />
                      )}
                    </div>
                  </div>

                  {/* Center Divider - Show player combos */}
                  <div className="py-0.5 flex items-center justify-center gap-1 flex-wrap">
                    {playerCombos.length > 0 ? (
                      playerCombos.map(({ combo, wildcardsUsed }) => (
                        <button
                          key={combo.id}
                          onClick={() => setDetailCombo(combo)}
                          className={`border rounded px-1.5 py-0.5 hover:scale-105 transition-all cursor-pointer ${
                            wildcardsUsed > 0
                              ? "bg-cyan-600/30 border-cyan-500/60"
                              : "bg-yellow-600/30 border-yellow-500/60"
                          }`}
                        >
                          <span className="text-[7px] text-yellow-300 font-bold uppercase tracking-wide">
                            {combo.emoji} {COMBO_TRANSLATION_KEYS[combo.id] ? t(COMBO_TRANSLATION_KEYS[combo.id] as keyof typeof translations["pt-BR"]) : combo.name}
                            {wildcardsUsed > 0 && <span className="text-cyan-300 ml-0.5">🃏</span>}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="w-12 h-px bg-gray-700/50" />
                    )}
                  </div>

                  {/* Player Cards (bottom) - Grid 2x2 style */}
                  <div
                    className={`relative flex-1 flex items-end justify-center pb-1 px-1 transition-all overflow-hidden ${
                      selectedHandCard !== null && canDropInLane ? "bg-green-900/30 cursor-pointer" : ""
                    }`}
                    onClick={() => {
                      if (selectedHandCard !== null && canDropInLane && myHand?.[selectedHandCard]) {
                        const cardCost = getEnergyCost(myHand[selectedHandCard]);
                        if (cardCost <= remainingEnergy) {
                          handlePlayCard(laneIndex);
                          playSound("card");
                        } else {
                          playSound("error");
                        }
                      }
                    }}
                  >
                    {selectedHandCard !== null && canDropInLane && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <span className="text-green-400 text-xs font-bold bg-black/60 px-2 py-1 rounded">{t('tcgPlay2')}</span>
                      </div>
                    )}
                    {/* Floating power change for player side */}
                    {pvpPowerChanges[`${laneIndex}-player`] && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                        <span className={`text-lg font-black animate-[floatUp_0.8s_ease-out_forwards] ${pvpPowerChanges[`${laneIndex}-player`] > 0 ? "text-green-400" : "text-red-400"}`}>
                          {pvpPowerChanges[`${laneIndex}-player`] > 0 ? `+${pvpPowerChanges[`${laneIndex}-player`]}` : pvpPowerChanges[`${laneIndex}-player`]}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-1 min-h-[124px]">
                      {myLaneCards.map((card: any, idx: number) => {
                        const ability = getCardAbility(card.name, card);
                        const isRevealed = (card as any)._revealed !== false;
                        const cardImageUrl = getCardDisplayImageUrl(card);
                        const coverUrl = getCollectionCoverUrl(card.collection, card.rarity);
                        const pvpAnim = pvpCardAnimClass[`${laneIndex}-player-${idx}`] || "";

                        return (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isRevealed) setDetailCard(card);
                            }}
                            className={`relative w-10 h-[58px] rounded-md cursor-pointer hover:scale-110 hover:z-30 transition-all overflow-hidden ${isRevealed ? getFoilClass(card.foil) : ""} ${pvpAnim || (!isRevealed ? "tcg-card-back" : "tcg-card-flip")}`}
                            style={{
                              zIndex: idx,
                              boxShadow: isRevealed ? "0 2px 8px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.5)" : "0 2px 8px rgba(0,0,0,0.8), 0 0 0 1px rgba(100,100,100,0.5)"
                            }}
                          >
                            {isRevealed ? (
                              <CardMedia
                                src={cardImageUrl}
                                alt={card.name}
                                className="absolute inset-0 w-full h-full object-cover rounded-md"
                              />
                            ) : (
                              <div
                                className="absolute inset-0 bg-cover bg-center rounded-md"
                                style={{ backgroundImage: `url(${coverUrl})` }}
                              />
                            )}
                            {isRevealed && (
                              <>
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 flex items-center justify-center z-10"
                                  style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
                                  <span className="text-[8px] font-black text-white">{card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power}</span>
                                </div>
                                {ability && (
                                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold z-10 ${
                                    ability.type === "onReveal" ? "bg-orange-500" : "bg-green-500"
                                  }`}>
                                    {ability.type === "onReveal" ? "R" : "O"}
                                  </div>
                                )}
                              </>
                            )}
                            {!isRevealed && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg text-blue-400 opacity-70">?</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Pending cards preview (ghost) */}
                      {pendingActions
                        .filter(a => a.type === "play" && a.targetLane === laneIndex)
                        .map((action, pIdx) => {
                          const pendingCard = myHand?.[action.cardIndex];
                          if (!pendingCard) return null;
                          const cardImageUrl = getCardDisplayImageUrl(pendingCard);
                          return (
                            <div
                              key={`pending-${pIdx}`}
                              className="relative w-10 h-[58px] rounded-md overflow-hidden opacity-50 border-2 border-dashed border-green-400 animate-pulse"
                              title={`Queued: ${pendingCard.name}`}
                            >
                              <CardMedia
                                src={cardImageUrl}
                                alt={pendingCard.name}
                                className="absolute inset-0 w-full h-full object-cover rounded-md"
                              />
                              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                <span className="text-green-400 text-xs font-bold">⏳</span>
                              </div>
                              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-600 flex items-center justify-center z-10"
                                style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
                                <span className="text-[8px] font-black text-white">{pendingCard.type === "nothing" || pendingCard.type === "other" ? Math.floor(pendingCard.power * 0.5) : pendingCard.power}</span>
                              </div>
                            </div>
                          );
                        })}
                      {myLaneCards.length === 0 && pendingInLane === 0 && selectedHandCard === null && (
                        <div className="w-10 h-[58px] rounded-md"
                          style={{
                            background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)",
                            border: "2px dashed rgba(184,134,11,0.3)",
                            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)"
                          }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Floating Card Indicator while dragging */}
          {draggedCardIndex !== null && touchDragPos && myHand?.[draggedCardIndex] && (() => {
            const dragCard = myHand[draggedCardIndex];
            const dragCardImageUrl = getCardDisplayImageUrl(dragCard);
            return (
              <div
                data-drag-ghost="true"
                className="fixed pointer-events-none z-[100]"
                style={{
                  left: touchDragPos.x - 30,
                  top: touchDragPos.y - 42,
                }}
              >
                <div
                  className="w-[60px] h-[85px] rounded-lg border-2 border-cyan-400 shadow-xl shadow-cyan-500/50 bg-cover bg-center opacity-90"
                  style={{ backgroundImage: `url(${dragCardImageUrl})` }}
                />
              </div>
            );
          })()}

          {/* Pending Actions Display */}
          {pendingActions.length > 0 && (
            <div className="bg-yellow-900/30 px-3 py-1" style={{ borderTop: "1px solid rgba(255,215,0,0.3)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-yellow-400 font-bold">
                  {(() => {
                    const plays = pendingActions.filter(a => a.type === "play").length;
                    const sacrifices = pendingActions.filter(a => a.type === "sacrifice-hand").length;
                    const parts = [];
                    if (plays > 0) parts.push(`${plays} play`);
                    if (sacrifices > 0) parts.push(`${sacrifices} sacrifice (+${sacrifices * 2}⚡)`);
                    return parts.join(", ") + " queued";
                  })()}
                </span>
                <button
                  onClick={() => setPendingActions([])}
                  className="text-xs text-red-400 hover:text-red-300 font-bold"
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          )}

          {/* Hand - Bottom Bar (Royal style) */}
          <div
            className="relative pt-4 pb-2 px-3 tcg-royal-hand"
            style={{
              background: "linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,1) 100%)",
              borderTop: "3px solid",
              borderImage: "linear-gradient(90deg, transparent 5%, #B8860B 20%, #FFD700 50%, #B8860B 80%, transparent 95%) 1"
            }}
          >
            {/* Cards */}
            <div className="flex justify-center gap-1 mb-3">
              {myHand?.map((card: any, idx: number) => {
                const ability = getCardAbility(card.name, card);
                const foilEffect = getFoilEffect(card.foil);
                const displayPower = card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power;
                const energyCost = getEnergyCost(card);
                const canAfford = energyCost <= remainingEnergy;
                const battleHandImageUrl = getCardDisplayImageUrl(card);
                const isPending = pendingActions.some(a => a.cardIndex === idx);

                // Check combo partners
                const cardNameResolved = resolveCardName(card.name || "");
                const hasComboPartner = CARD_COMBOS.some(combo => {
                  const comboCardsLower = combo.cards.map(c => c.toLowerCase());
                  if (!comboCardsLower.includes(cardNameResolved)) return false;
                  const otherHandCards = (myHand || []).filter((_: any, i: number) => i !== idx);
                  const allLaneCards = gs.lanes.flatMap((l: any) => l[myCards] || []);
                  const allCards = [...otherHandCards, ...allLaneCards];
                  const matchCount = comboCardsLower.filter(cc =>
                    allCards.some((c: any) => resolveCardName(c.name || "") === cc)
                  ).length;
                  return matchCount >= 1;
                });

                const potentialCombo = hasComboPartner ? CARD_COMBOS.find(combo => {
                  const comboCardsLower = combo.cards.map(c => c.toLowerCase());
                  return comboCardsLower.includes(cardNameResolved);
                }) : null;

                if (isPending) return null; // Hide cards that are queued

                return (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!canAfford || e.button !== 0) return;
                      const startX = e.clientX;
                      const startY = e.clientY;
                      wasDraggingRef.current = false;
                      setDraggedCardIndex(idx);
                      setSelectedHandCard(null);
                      setTouchDragPos({ x: startX, y: startY });

                      const handleMouseMove = (moveE: MouseEvent) => {
                        const dx = Math.abs(moveE.clientX - startX);
                        const dy = Math.abs(moveE.clientY - startY);
                        if (dx > 5 || dy > 5) {
                          wasDraggingRef.current = true;
                        }
                        setTouchDragPos({ x: moveE.clientX, y: moveE.clientY });
                        const laneIdx = getLaneUnderTouch(moveE.clientX, moveE.clientY);
                        setDragOverLane(laneIdx);
                      };

                      const handleMouseUp = (upE: MouseEvent) => {
                        const laneIdx = getLaneUnderTouch(upE.clientX, upE.clientY);
                        if (laneIdx !== null && wasDraggingRef.current) {
                          const lane = gs.lanes[laneIdx];
                          const laneMyCards = lane?.[myCards] || [];
                          const pendingInLane = pendingActions.filter(a => a.targetLane === laneIdx).length;
                          if (lane && (laneMyCards.length + pendingInLane) < TCG_CONFIG.CARDS_PER_LANE) {
                            setPendingActions(prev => [...prev, { type: "play", cardIndex: idx, targetLane: laneIdx }]);
                            playSound("card");
                          }
                        }
                        setDraggedCardIndex(null);
                        setDragOverLane(null);
                        setTouchDragPos(null);
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };

                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    onTouchStart={(e) => {
                      if (!canAfford) return;
                      const touch = e.touches[0];
                      setDraggedCardIndex(idx);
                      setSelectedHandCard(null);
                      setTouchDragPos({ x: touch.clientX, y: touch.clientY });
                    }}
                    onTouchMove={(e) => {
                      if (draggedCardIndex !== idx) return;
                      const touch = e.touches[0];
                      setTouchDragPos({ x: touch.clientX, y: touch.clientY });
                      const laneIdx = getLaneUnderTouch(touch.clientX, touch.clientY);
                      setDragOverLane(laneIdx);
                    }}
                    onTouchEnd={(e) => {
                      if (draggedCardIndex !== idx) return;
                      const touch = e.changedTouches[0];
                      const laneIdx = getLaneUnderTouch(touch.clientX, touch.clientY);
                      if (laneIdx !== null) {
                        const lane = gs.lanes[laneIdx];
                        const laneMyCards = lane?.[myCards] || [];
                        const pendingInLane = pendingActions.filter(a => a.targetLane === laneIdx).length;
                        if (lane && (laneMyCards.length + pendingInLane) < TCG_CONFIG.CARDS_PER_LANE) {
                          setPendingActions(prev => [...prev, { type: "play", cardIndex: idx, targetLane: laneIdx }]);
                          playSound("card");
                        }
                      }
                      setDraggedCardIndex(null);
                      setDragOverLane(null);
                      setTouchDragPos(null);
                    }}
                    onClick={(e) => {
                      if (wasDraggingRef.current) {
                        wasDraggingRef.current = false;
                        return;
                      }
                      if (!canAfford) {
                        playSound("error");
                        return;
                      }
                      playSound("select");
                      setSelectedHandCard(selectedHandCard === idx ? null : idx);
                    }}
                    className={`relative flex-shrink-0 w-[60px] h-[85px] rounded-lg border-2 transition-all duration-200 select-none ${
                      !canAfford
                        ? "border-red-500/50 opacity-50 cursor-not-allowed grayscale"
                        : draggedCardIndex === idx
                          ? "border-cyan-400 opacity-50 scale-95 cursor-grabbing"
                          : selectedHandCard === idx
                            ? "border-green-400 -translate-y-6 scale-110 z-20 shadow-xl shadow-green-500/50 cursor-pointer"
                            : hasComboPartner
                              ? "border-yellow-400 hover:-translate-y-2 hover:scale-105 ring-2 ring-yellow-400/50 cursor-grab"
                              : `${RARITY_COLORS[card.rarity]?.split(" ")[0] || "border-gray-500"} hover:-translate-y-2 hover:scale-105 cursor-grab`
                    } ${getFoilClass(card.foil)}`}
                    style={{
                      zIndex: selectedHandCard === idx ? 20 : draggedCardIndex === idx ? 30 : idx,
                      userSelect: "none"
                    }}
                  >
                    {/* Card background image/video */}
                    <CardMedia
                      src={card.type === "vbms" ? battleHandImageUrl : card.imageUrl}
                      alt={card.name}
                      className="absolute inset-0 w-full h-full object-cover rounded-lg pointer-events-none"
                    />
                    {card.foil && card.foil !== "None" && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-yellow-400/20 rounded-lg pointer-events-none" />
                    )}
                    {/* Can't Afford Overlay */}
                    {!canAfford && (
                      <div className="absolute inset-0 bg-red-900/40 rounded-lg flex items-center justify-center pointer-events-none">
                        <span className="text-red-400 text-xl">⚡</span>
                      </div>
                    )}
                    {/* Energy Cost Badge */}
                    {foilEffect ? (
                      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg z-10 bg-gradient-to-br from-cyan-400 to-teal-500 border-cyan-200">
                        <span className="text-xs font-bold text-white">{energyCost}</span>
                      </div>
                    ) : (
                      <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg z-10 ${
                        canAfford
                          ? "bg-gradient-to-br from-blue-400 to-blue-600 border-white"
                          : "bg-gradient-to-br from-red-500 to-red-700 border-red-300"
                      }`}>
                        <span className="text-xs font-bold text-white">{energyCost}</span>
                      </div>
                    )}
                    {/* Power Badge (bottom-right) */}
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-yellow-200 flex items-center justify-center shadow-lg">
                      <span className="text-[10px] font-bold text-black">{displayPower}</span>
                    </div>
                    {/* Combo Indicator */}
                    {hasComboPartner && potentialCombo && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailCombo(potentialCombo); }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-yellow-200 flex items-center justify-center shadow-lg z-10 animate-bounce hover:scale-125 transition-transform cursor-pointer"
                      >
                        <span className="text-xs">{potentialCombo.emoji}</span>
                      </button>
                    )}
                    {/* Info Button */}
                    {(!hasComboPartner || !potentialCombo) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailCard(card); }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 hover:bg-blue-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center z-10 shadow-lg"
                      >
                        ?
                      </button>
                    )}
                    {hasComboPartner && potentialCombo && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailCard(card); }}
                        className="absolute top-5 -right-1 w-4 h-4 bg-blue-600 hover:bg-blue-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center z-10 shadow-lg"
                      >
                        ?
                      </button>
                    )}
                    {/* Card Name */}
                    <div className="absolute bottom-5 left-0 right-0 text-center">
                      <span className="text-[7px] text-white font-bold drop-shadow-lg bg-black/50 px-1 rounded">{card.name}</span>
                    </div>
                    {/* Sacrifice Button for Nothing/Other cards (PvP) */}
                    {(card.type === "nothing" || card.type === "other") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add sacrifice-hand action to pending actions
                          setPendingActions(prev => [...prev, { type: "sacrifice-hand", cardIndex: idx }]);
                          playSound("card");
                        }}
                        className="absolute -bottom-2 -left-2 w-7 h-7 bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 rounded-full text-[9px] text-white font-bold flex items-center justify-center z-10 shadow-lg border-2 border-purple-300 animate-pulse"
                        title="Sacrifice: +2⚡ + Draw"
                      >
                        +2⚡
                      </button>
                    )}
                    {/* Combo hint */}
                    {hasComboPartner && potentialCombo && selectedHandCard !== idx && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-[8px] text-yellow-400 bg-black/80 px-1 rounded">{potentialCombo.name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {(!myHand || myHand.length === 0) && (
                <span className="text-gray-500 text-sm">{t('tcgNoCardsInHand')}</span>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-between">
              {/* Back Button */}
              <button
                onClick={() => setView("lobby")}
                className="bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] hover:from-[#2a2a2a] hover:to-[#3a3a3a] text-[#B8860B] hover:text-[#FFD700] font-bold py-2 px-4 rounded-lg text-sm shadow-lg transition-all"
                style={{
                  border: "2px solid",
                  borderImage: "linear-gradient(135deg, #8B6914, #B8860B, #8B6914) 1"
                }}
              >
                ← BACK
              </button>

              {/* Energy Orb (center) - Royal gold style */}
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: "radial-gradient(circle at 30% 30%, #FFD700, #B8860B, #8B6914)",
                  boxShadow: "0 0 20px rgba(255,215,0,0.5), inset 0 2px 10px rgba(255,255,255,0.3), inset 0 -5px 15px rgba(0,0,0,0.4)",
                  border: "3px solid #FFD700"
                }}
              >
                <span className="text-2xl font-black text-black drop-shadow-[0_1px_1px_rgba(255,215,0,0.5)]">{remainingEnergy}</span>
              </div>

              {/* End Turn / Submit Button - with timer like PvE */}
              <button
                onClick={handleSubmitTurn}
                disabled={myConfirmed}
                className={`font-bold py-2 px-4 rounded-lg text-sm shadow-lg transition-all min-w-[100px] ${
                  myConfirmed
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : turnTimeRemaining <= 5
                    ? 'bg-gradient-to-r from-red-700 to-red-900 border-2 border-red-500 text-white animate-pulse'
                    : turnTimeRemaining <= 10
                      ? 'bg-gradient-to-r from-orange-600 to-amber-700 border-2 border-orange-400 text-white'
                    : pendingActions.length > 0
                      ? "bg-gradient-to-r from-[#B8860B] to-[#8B6914] hover:from-[#FFD700] hover:to-[#B8860B] text-black border-2 border-[#FFD700] animate-pulse"
                      : "bg-gradient-to-r from-[#B8860B] to-[#8B6914] hover:from-[#FFD700] hover:to-[#B8860B] text-black border-2 border-[#FFD700]"
                }`}
                style={!myConfirmed && turnTimeRemaining > 10 ? {
                  boxShadow: "0 0 15px rgba(255,215,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3)"
                } : undefined}
              >
                {myConfirmed ? (
                  "⏳ " + t('tcgLoading')
                ) : turnTimeRemaining <= 10 ? (
                  <span className="text-2xl font-black">{turnTimeRemaining}</span>
                ) : pendingActions.length > 0 ? (
                  `▶ ${t('tcgEndTurn')} (${pendingActions.length})`
                ) : (
                  <>{t('tcgEndTurn')} <span className="text-black/70">{currentMatch?.gameState?.currentTurn || 1}/{TCG_CONFIG.TOTAL_TURNS}</span></>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Card Detail Modal */}
        {detailCard && (
          <CardDetailModal
            card={detailCard}
            onClose={() => setDetailCard(null)}
          />
        )}

        {/* Combo Detail Modal */}
        {detailCombo && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setDetailCombo(null)}>
            <div className="bg-gradient-to-br from-yellow-900 via-amber-900 to-orange-950 rounded-2xl p-6 max-w-sm w-full border-2 border-yellow-500 shadow-2xl shadow-yellow-500/30" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">{detailCombo.emoji}</div>
                <h2 className="text-2xl font-black text-yellow-400">{detailCombo.name}</h2>
              </div>
              <div className="mb-4">
                <p className="text-xs text-yellow-300/70 mb-2 uppercase tracking-wider">{t('tcgCardsRequired')}</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {detailCombo.cards.map((cardName: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-black/40 rounded text-sm text-white capitalize">
                      {cardName}
                    </span>
                  ))}
                </div>
                {detailCombo.minCards && (
                  <p className="text-xs text-yellow-400/60 mt-1 text-center">
                    (Need at least {detailCombo.minCards} of these)
                  </p>
                )}
              </div>
              <div className="bg-black/30 rounded-xl p-4 mb-4">
                <p className="text-xs text-yellow-300/70 mb-1 uppercase tracking-wider">{t('tcgBonusEffect')}</p>
                <p className="text-yellow-100 font-bold">{detailCombo.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    detailCombo.bonus.type === "power" ? "bg-green-600" :
                    detailCombo.bonus.type === "power_percent" ? "bg-purple-600" :
                    detailCombo.bonus.type === "steal" ? "bg-red-600" : "bg-blue-600"
                  }`}>
                    {detailCombo.bonus.type === "power" ? `+${detailCombo.bonus.value} Power` :
                     detailCombo.bonus.type === "power_percent" ? `+${detailCombo.bonus.value}% Power` :
                     detailCombo.bonus.type === "steal" ? `-${detailCombo.bonus.value} Enemy` :
                     detailCombo.bonus.type}
                  </span>
                  <span className="text-xs text-yellow-400/60">
                    to {detailCombo.bonus.target === "self" ? "combo cards" : detailCombo.bonus.target}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailCombo(null)}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 rounded-lg transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        {/* Battle Log Floating Button (PvP) */}
        <button
          onClick={() => setShowBattleLog(!showBattleLog)}
          className="fixed bottom-20 right-3 w-10 h-10 rounded-full bg-black/80 border border-vintage-gold/40 flex items-center justify-center z-30 hover:bg-black/90 transition-all"
        >
          <span className="text-lg">📜</span>
        </button>

        {/* Battle Log Panel (PvP) */}
        {showBattleLog && (
          <div className="fixed right-0 top-0 bottom-0 w-64 bg-black/95 border-l border-vintage-gold/30 z-40 overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-vintage-gold font-bold text-sm uppercase tracking-wider">Battle Log</h3>
              <button onClick={() => setShowBattleLog(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            {battleLog.length === 0 ? (
              <p className="text-gray-500 text-xs">No actions yet...</p>
            ) : (
              <div className="space-y-1">
                {battleLog.map((entry, i) => (
                  <div key={i} className={`text-[10px] px-2 py-1 rounded ${
                    entry.player === "you" ? "bg-blue-900/30 text-blue-300" : "bg-red-900/30 text-red-300"
                  }`}>
                    <span className="text-vintage-gold/60">T{entry.turn}:</span>{" "}
                    <span className="font-bold">{entry.player === "you" ? "You" : entry.player === "cpu" ? "CPU" : "Opponent"}</span>{" "}
                    {entry.action} <span className="text-white font-medium">{entry.cardName}</span> → Lane {entry.lane + 1}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: RESULT (PvP or PvE)
  // ═══════════════════════════════════════════════════════════════════════════════

  // PvE Result
  if (view === "result" && isPvE && pveGameState) {
    const winner = pveGameState.winner;
    const isWinner = winner === "player";
    const isDraw = winner === "tie";

    // Calculate lanes won
    const lanesWon = pveGameState.lanes.filter((lane: any) => lane.playerPower > lane.cpuPower).length;
    const lanesLost = pveGameState.lanes.filter((lane: any) => lane.cpuPower > lane.playerPower).length;
    const lanesTied = pveGameState.lanes.filter((lane: any) => lane.playerPower === lane.cpuPower).length;

    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isDraw
          ? "bg-gradient-to-b from-gray-900 via-gray-800 to-black"
          : isWinner
            ? "bg-gradient-to-b from-yellow-900/30 via-gray-900 to-black"
            : "bg-gradient-to-b from-red-900/30 via-gray-900 to-black"
      }`}>
        <div className="text-center max-w-md w-full">
          {/* PvE Badge */}
          <span className="text-xs text-green-400 bg-green-900/50 px-3 py-1 rounded-full mb-4 inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            {t('tcgCpuMode')}
          </span>

          {/* Result Icon & Title - OR Bait Video on defeat */}
          <div className="my-6">
            {showDefeatBait && !isWinner && !isDraw ? (
              /* Bait video replaces the defeat text - loops */
              <video
                autoPlay
                loop
                playsInline
                className="w-48 h-48 mx-auto mb-4 rounded-xl object-cover"
                ref={(el) => {
                  // Try to play with sound after user interaction
                  if (el) {
                    el.volume = 0.7;
                    el.play().catch(() => {
                      // If autoplay with sound fails, try muted
                      el.muted = true;
                      el.play().catch(() => {});
                    });
                  }
                }}
              >
                <source src="/sounds/defeat-bait.mp4" type="video/mp4" />
              </video>
            ) : isWinner ? (
              <img
                src="/images/angry-angry-kid.png"
                alt="Victory"
                className="w-32 h-32 mx-auto mb-4 animate-bounce object-contain"
              />
            ) : (
              <div className={`text-6xl mb-4`}>
                {isDraw ? "🤝" : "💔"}
              </div>
            )}
            {!showDefeatBait && (
              <>
                <h1
                  className={`text-5xl font-black mb-2 ${
                    isDraw ? "text-gray-400" : isWinner ? "text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" : "text-red-400"
                  }`}
                >
                  {isDraw ? t('tcgDraw') : isWinner ? t('tcgVictory') : t('tcgDefeat')}
                </h1>
                <p className="text-gray-500 text-sm">
                  {isDraw ? "Both sides are equal!" : isWinner ? "You outsmarted the CPU!" : "The CPU was too strong..."}
                </p>
              </>
            )}
          </div>

          {/* Lane Results */}
          <div className="bg-gray-800/30 rounded-xl p-4 mb-6 border border-gray-700/50">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Lane Breakdown</p>
            <div className="flex gap-3 justify-center">
              {pveGameState.lanes.map((lane: any, idx: number) => {
                const playerWon = lane.playerPower > lane.cpuPower;
                const isTie = lane.playerPower === lane.cpuPower;

                return (
                  <div
                    key={idx}
                    className={`flex-1 bg-gray-900/50 border-2 rounded-xl p-3 transition-all ${
                      playerWon
                        ? "border-green-500/70 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                        : isTie
                          ? "border-gray-600"
                          : "border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    }`}
                  >
                    <div className={`text-lg mb-1 ${
                      playerWon ? "text-green-400" : isTie ? "text-gray-400" : "text-red-400"
                    }`}>
                      {playerWon ? "✓" : isTie ? "=" : "✗"}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{lane.name || `${t('tcgLane')} ${idx + 1}`}</p>
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-lg font-bold ${playerWon ? "text-green-400" : "text-white"}`}>
                        {lane.playerPower}
                      </span>
                      <span className="text-gray-600 text-xs">vs</span>
                      <span className={`text-lg font-bold ${!playerWon && !isTie ? "text-red-400" : "text-white"}`}>
                        {lane.cpuPower}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="flex justify-center gap-6 mt-4 pt-3 border-t border-gray-700/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{lanesWon}</p>
                <p className="text-xs text-gray-500">{t('tcgWinning')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-400">{lanesTied}</p>
                <p className="text-xs text-gray-500">{t('tcgTied')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{lanesLost}</p>
                <p className="text-xs text-gray-500">{t('tcgLosing')}</p>
              </div>
            </div>
          </div>

          {/* AURA Reward Display */}
          {isWinner && (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/30">
              <p className="text-yellow-400 font-bold text-lg">
                {pveGameState.auraRewarded ? (
                  <>+{BATTLE_AURA_REWARD} AURA</>
                ) : (
                  <span className="text-gray-400 text-sm">No AURA reward (daily limit reached)</span>
                )}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => startPvEMatch()}
              className={`font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 ${
                isWinner
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white shadow-lg shadow-green-500/30"
                  : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black shadow-lg shadow-yellow-500/30"
              }`}
            >
              {t('tcgPlayAgain')}
            </button>
            <button
              onClick={() => {
                stopBgm(); // Stop victory/defeat music
                setIsPvE(false);
                setPveGameState(null);
                setView("lobby");
                setAutoMatch(false); // Reset auto match when leaving
              }}
              className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
            >
              {t('tcgBackToLobby')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PvP Result
  if (view === "result" && currentMatch) {
    const isWinner = currentMatch.winnerId === address?.toLowerCase();
    const isDraw = !currentMatch.winnerId;
    const isPlayer1 = currentMatch.player1Address === address?.toLowerCase();
    const pvpOpponentName = isPlayer1 ? currentMatch.player2Username : currentMatch.player1Username;
    const pvpIsCpu = (currentMatch as any).isCpuOpponent;
    const pvpOpponentDisplay = pvpOpponentName ? (pvpIsCpu ? `${pvpOpponentName} (CPU)` : pvpOpponentName) : "Opponent";

    // Calculate lanes won
    const lanesWon = currentMatch.laneResults?.filter((lane: any) =>
      lane.winner === (isPlayer1 ? "player1" : "player2")
    ).length || 0;
    const lanesLost = currentMatch.laneResults?.filter((lane: any) =>
      lane.winner === (isPlayer1 ? "player2" : "player1")
    ).length || 0;
    const lanesTied = currentMatch.laneResults?.filter((lane: any) =>
      lane.winner === "tie"
    ).length || 0;

    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isDraw
          ? "bg-gradient-to-b from-gray-900 via-gray-800 to-black"
          : isWinner
            ? "bg-gradient-to-b from-yellow-900/30 via-gray-900 to-black"
            : "bg-gradient-to-b from-red-900/30 via-gray-900 to-black"
      }`}>
        <div className="text-center max-w-md w-full">
          {/* PvP Badge */}
          <span className="text-xs text-purple-400 bg-purple-900/50 px-3 py-1 rounded-full mb-4 inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
            {(currentMatch as any)?.isStakedMatch ? "Staked Battle" : "PvP Battle"}
          </span>

          {/* Staked Match Reward Info */}
          {(currentMatch as any)?.isStakedMatch && (currentMatch as any)?.stakeAmount > 0 && (
            <div className={`mb-2 px-4 py-2 rounded-lg border ${isWinner ? "bg-green-900/30 border-green-500/40" : "bg-red-900/30 border-red-500/40"}`}>
              <p className={`text-sm font-bold ${isWinner ? "text-green-400" : "text-red-400"}`}>
                {isWinner
                  ? `+${Math.floor((currentMatch as any).stakeAmount * 2 * 0.9).toLocaleString()} VBMS`
                  : `-${(currentMatch as any).stakeAmount.toLocaleString()} VBMS`
                }
              </p>
              {isWinner && (
                <p className="text-[9px] text-green-400/60">Reward sent to your inbox. Claim on home page.</p>
              )}
            </div>
          )}

          {/* Result Icon & Title - OR Bait Video on defeat */}
          <div className="my-6">
            {showDefeatBait && !isWinner && !isDraw ? (
              /* Bait video replaces the defeat text - loops */
              <video
                autoPlay
                loop
                playsInline
                className="w-48 h-48 mx-auto mb-4 rounded-xl object-cover"
                ref={(el) => {
                  // Try to play with sound after user interaction
                  if (el) {
                    el.volume = 0.7;
                    el.play().catch(() => {
                      // If autoplay with sound fails, try muted
                      el.muted = true;
                      el.play().catch(() => {});
                    });
                  }
                }}
              >
                <source src="/sounds/defeat-bait.mp4" type="video/mp4" />
              </video>
            ) : isWinner ? (
              <img
                src="/images/angry-angry-kid.png"
                alt="Victory"
                className="w-32 h-32 mx-auto mb-4 animate-bounce object-contain"
              />
            ) : (
              <div className={`text-6xl mb-4`}>
                {isDraw ? "🤝" : "💔"}
              </div>
            )}
            {!showDefeatBait && (
              <>
                <h1
                  className={`text-5xl font-black mb-2 ${
                    isDraw ? "text-gray-400" : isWinner ? "text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" : "text-red-400"
                  }`}
                >
                  {isDraw ? t('tcgDraw') : isWinner ? t('tcgVictory') : t('tcgDefeat')}
                </h1>
                <p className="text-gray-500 text-sm">
                  vs <span className="text-vintage-burnt-gold max-w-[150px] truncate inline-block align-bottom">{pvpOpponentDisplay}</span>
                </p>
              </>
            )}
          </div>

          {/* Lane Results */}
          {currentMatch.laneResults && (
            <div className="bg-gray-800/30 rounded-xl p-4 mb-6 border border-gray-700/50">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Lane Breakdown</p>
              <div className="flex gap-3 justify-center">
                {currentMatch.laneResults.map((lane: any, idx: number) => {
                  const playerWon = lane.winner === (isPlayer1 ? "player1" : "player2");
                  const isTie = lane.winner === "tie";
                  const yourPower = isPlayer1 ? lane.player1FinalPower : lane.player2FinalPower;
                  const enemyPower = isPlayer1 ? lane.player2FinalPower : lane.player1FinalPower;

                  return (
                    <div
                      key={idx}
                      className={`flex-1 bg-gray-900/50 border-2 rounded-xl p-3 transition-all ${
                        playerWon
                          ? "border-green-500/70 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                          : isTie
                            ? "border-gray-600"
                            : "border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                      }`}
                    >
                      <div className={`text-lg mb-1 ${
                        playerWon ? "text-green-400" : isTie ? "text-gray-400" : "text-red-400"
                      }`}>
                        {playerWon ? "✓" : isTie ? "=" : "✗"}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{t('tcgLane')} {idx + 1}</p>
                      <div className="flex items-center justify-center gap-1">
                        <span className={`text-lg font-bold ${playerWon ? "text-green-400" : "text-white"}`}>
                          {yourPower}
                        </span>
                        <span className="text-gray-600 text-xs">vs</span>
                        <span className={`text-lg font-bold ${!playerWon && !isTie ? "text-red-400" : "text-white"}`}>
                          {enemyPower}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Stats */}
              <div className="flex justify-center gap-6 mt-4 pt-3 border-t border-gray-700/50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{lanesWon}</p>
                  <p className="text-xs text-gray-500">{t('tcgWinning')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">{lanesTied}</p>
                  <p className="text-xs text-gray-500">{t('tcgTied')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{lanesLost}</p>
                  <p className="text-xs text-gray-500">{t('tcgLosing')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                stopBgm(); // Stop victory/defeat music
                setCurrentMatchId(null);
                setView("lobby");
              }}
              className={`font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 ${
                isWinner
                  ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black shadow-lg shadow-yellow-500/30"
                  : "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white"
              }`}
            >
              {t('tcgBackToLobby')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: LOADING
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="text-yellow-400 animate-pulse">{t('tcgLoading')}</div>
    </div>
  );
}
