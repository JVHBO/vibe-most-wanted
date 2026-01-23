"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useProfile } from "@/contexts/ProfileContext";
import { usePlayerCards } from "@/contexts/PlayerCardsContext";
import { Id } from "@/convex/_generated/dataModel";
import tcgAbilitiesData from "@/data/tcg-abilities.json";
import { getCharacterFromImage } from "@/lib/vmw-image-mapping";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type GameView = "lobby" | "deck-builder" | "waiting" | "battle" | "result";

interface TCGCard {
  type: "vbms" | "nothing";
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
}

interface GameAction {
  type: "play" | "sacrifice-hand" | "sacrifice-lane";
  cardIndex: number;
  targetLane?: number;
  targetCardIndex?: number;
}

interface TCGAbility {
  name: string;
  type: "onReveal" | "ongoing" | "onDestroy";
  description: string;
  effect: Record<string, any>;
  rarity: string;
}

// Abilities map from JSON
const tcgAbilities: Record<string, TCGAbility> = tcgAbilitiesData.abilities as Record<string, TCGAbility>;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TCG_CONFIG = {
  DECK_SIZE: 15,
  MIN_VBMS: 8,
  MAX_NOTHING: 7,
  TURN_TIME_SECONDS: 20,
  TOTAL_TURNS: 6,
};

const RARITY_COLORS: Record<string, string> = {
  Common: "border-gray-500 text-gray-400",
  Rare: "border-blue-500 text-blue-400",
  Epic: "border-purple-500 text-purple-400",
  Legendary: "border-yellow-500 text-yellow-400",
  Mythic: "border-red-500 text-red-400",
};

// Fun lane names for battles
// Lane effects - each lane has a unique effect that modifies gameplay
const LANE_NAMES = [
  // Buff lanes
  { name: "Gayland", emoji: "🌈", effect: "buffAll", value: 5, description: "All cards get +5 power" },
  { name: "Moon Base", emoji: "🌙", effect: "buffFirst", value: 20, description: "First card played gets +20 power" },
  { name: "Whale Waters", emoji: "🐋", effect: "buffHighest", value: 25, description: "Highest power card gets +25" },
  { name: "Shrimp Shore", emoji: "🦐", effect: "buffLowest", value: 20, description: "Lowest power card gets +20" },
  { name: "Pump Station", emoji: "📈", effect: "buffPerTurn", value: 5, description: "Cards gain +5 power each turn" },
  { name: "Staking Grounds", emoji: "🥩", effect: "buffPerTurn", value: 3, description: "Cards gain +3 power each turn" },

  // Debuff lanes
  { name: "Scam City", emoji: "🚨", effect: "debuffAll", value: -8, description: "All cards have -8 power" },
  { name: "Dump District", emoji: "📉", effect: "debuffPerTurn", value: -3, description: "Cards lose -3 power each turn" },
  { name: "Paper Hands Plaza", emoji: "📄", effect: "debuffPerTurn", value: -5, description: "Cards lose -5 power each turn" },

  // Energy lanes
  { name: "Gas Station", emoji: "⛽", effect: "reduceCost", value: 1, description: "Cards cost -1 energy here" },
  { name: "Brian's Coinbase", emoji: "🪙", effect: "gainEnergy", value: 1, description: "Gain +1 energy when playing here" },
  { name: "Goblin Town", emoji: "👺", effect: "increaseCost", value: 1, description: "Cards cost +1 energy here" },

  // Special mechanics
  { name: "Diamond Hands Arena", emoji: "💎", effect: "immune", description: "Cards can't lose power here" },
  { name: "Miguel's Castle", emoji: "🏰", effect: "protected", description: "Cards can't be destroyed here" },
  { name: "Vlady's Dungeon", emoji: "⛓️", effect: "debuffEnemy", value: -10, description: "Enemy cards have -10 power" },
  { name: "Nico's Throne", emoji: "👑", effect: "doubleLegendary", description: "Legendary cards have double power" },
  { name: "Dan's Backyard", emoji: "🏡", effect: "buffCommon", value: 15, description: "Common cards get +15 power" },
  { name: "NFT Gallery", emoji: "🖼️", effect: "buffFoil", value: 30, description: "Foil cards get +30 power" },
  { name: "Mint Factory", emoji: "🏭", effect: "buffNothing", value: 25, description: "Nothing cards get +25 power" },

  // Chaos lanes
  { name: "Degen Valley", emoji: "🎰", effect: "gamble", description: "Cards have 50% chance to double or halve power" },
  { name: "Goofy Empire", emoji: "🤡", effect: "randomBuff", value: 15, description: "Random card gets +15 power each turn" },
  { name: "Groko's Lab", emoji: "🧪", effect: "randomEffect", description: "Random buff or debuff each turn" },
  { name: "Tukka's Twist", emoji: "🌀", effect: "swapPowers", description: "Swap all cards powers at game end" },
  { name: "Liquidity Pool", emoji: "💧", effect: "swapSides", description: "Player and enemy power are swapped" },

  // Destruction lanes
  { name: "Rug Pull Alley", emoji: "🧹", effect: "destroyOnTurn", turn: 4, description: "Random card destroyed on turn 4" },
  { name: "Floor is Lava", emoji: "🌋", effect: "destroyLowest", description: "Lowest power card destroyed each turn" },
  { name: "Landmine Field", emoji: "💣", effect: "destroyOnPlay", description: "50% chance card explodes when played" },

  // Draw/Card lanes
  { name: "Beeper's Signal Tower", emoji: "📡", effect: "drawOnPlay", description: "Draw a card when playing here" },
  { name: "Airdrop Zone", emoji: "🪂", effect: "freeCard", turn: 3, description: "Free random card on turn 3" },

  // Power multiplier lanes
  { name: "Vibe HQ", emoji: "✨", effect: "buffVibeFID", value: 20, description: "VibeFID cards get +20 power" },
  { name: "Ye's Studio", emoji: "🎤", effect: "buffWithAbility", value: 10, description: "Cards with abilities get +10 power" },
  { name: "Claude's Server Room", emoji: "🤖", effect: "doubleOngoing", description: "Ongoing effects are doubled" },
  { name: "Porn Hub", emoji: "🔞", effect: "buffPerCard", value: 8, description: "Cards get +8 power per card here" },

  // Victory condition lanes
  { name: "ATH Peak", emoji: "⛰️", effect: "highestWins", description: "Only highest power card counts" },
  { name: "Bridge to Nowhere", emoji: "🌉", effect: "noVictory", description: "This lane doesn't count for victory" },

  // Absurd but fun
  { name: "Potato Kingdom", emoji: "🥔", effect: "buffAll", value: 10, description: "All cards get +10 power" },
  { name: "Banana Republic", emoji: "🍌", effect: "randomBuff", value: 20, description: "Random card gets +20 each turn" },
  { name: "Clown College", emoji: "🎪", effect: "reverseOrder", description: "Lowest total power wins this lane" },
  { name: "Copium Den", emoji: "💨", effect: "buffIfLosing", value: 15, description: "Your cards get +15 if you're losing" },
  { name: "Hopium Farms", emoji: "🌿", effect: "buffPerTurn", value: 8, description: "Cards gain +8 power each turn" },
  { name: "Touch Grass Field", emoji: "🌾", effect: "noEffect", description: "No special effect" },
  { name: "Mom's Basement", emoji: "🛋️", effect: "buffAlone", value: 30, description: "Single card here gets +30 power" },
  { name: "Twitter HQ", emoji: "🐦", effect: "chaos", description: "Random effect every turn" },
  { name: "Discord Server", emoji: "💬", effect: "buffPerCard", value: 5, description: "Cards get +5 power per card here" },
  { name: "Farcaster Frame", emoji: "🖼️", effect: "buffVibeFID", value: 15, description: "VibeFID cards get +15 power" },
  { name: "Scum's Hideout", emoji: "🕳️", effect: "hidden", description: "Cards are hidden until game end" },
  { name: "Casa's Crib", emoji: "🏠", effect: "firstFree", description: "First card each turn is free" },
  { name: "Proxy's Matrix", emoji: "🔮", effect: "copyEnemy", description: "Copy opponent's highest card power" },
  { name: "The Blockchain", emoji: "⛓️", effect: "locked", description: "Cards can't be moved or removed" },
  { name: "Mempool Madness", emoji: "🏊", effect: "delayed", description: "Cards activate next turn" },
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

const CARD_COMBOS: CardCombo[] = [
  // ═══ CHARACTER COMBOS ═══
  {
    id: "romero_family",
    name: "Romero Family",
    emoji: "👨‍👧",
    cards: ["dan romero", "goofy romero"],
    bonus: { type: "power", value: 25, target: "self" },
    description: "+25 power to both Romeros",
  },
  {
    id: "ai_bros",
    name: "AI Bros",
    emoji: "🤖",
    cards: ["claude", "groko", "gaypt"],
    minCards: 2,
    bonus: { type: "power", value: 15, target: "self" },
    description: "+15 power to each AI card",
  },
  {
    id: "crypto_kings",
    name: "Crypto Kings",
    emoji: "👑",
    cards: ["brian armstrong", "vitalik jumpterin"],
    bonus: { type: "power", value: 30, target: "lane" },
    description: "+30 power to all cards in lane",
  },
  {
    id: "scam_squad",
    name: "Scam Squad",
    emoji: "🚨",
    cards: ["scum", "shills", "landmine"],
    minCards: 2,
    bonus: { type: "steal", value: 8, target: "enemy_lane" },
    description: "Steal 8 power from each enemy in lane",
  },
  {
    id: "degen_trio",
    name: "Degen Trio",
    emoji: "🎰",
    cards: ["nftkid", "john porn", "rizkybegitu"],
    minCards: 2,
    bonus: { type: "power_percent", value: 50, target: "self" },
    description: "+50% power to degen cards",
  },
  {
    id: "vibe_team",
    name: "Vibe Team",
    emoji: "✨",
    cards: ["vibe intern", "beeper", "jc denton"],
    minCards: 2,
    bonus: { type: "power", value: 20, target: "lane" },
    description: "+20 power to all cards in lane",
  },
  {
    id: "dirty_duo",
    name: "Dirty Duo",
    emoji: "💩",
    cards: ["don filthy", "vlady"],
    bonus: { type: "steal", value: 15, target: "enemy_lane" },
    description: "Steal 15 power from strongest enemy",
  },
  {
    id: "legends_unite",
    name: "Legends Unite",
    emoji: "⭐",
    cards: ["nico", "miguel", "ye"],
    minCards: 2,
    bonus: { type: "power", value: 25, target: "self" },
    description: "+25 power to each Legend",
  },
  {
    id: "code_masters",
    name: "Code Masters",
    emoji: "💻",
    cards: ["horsefarts", "0xdeployer", "linux"],
    minCards: 2,
    bonus: { type: "power", value: 18, target: "self" },
    description: "+18 power to each coder",
  },
  {
    id: "content_creators",
    name: "Content Creators",
    emoji: "📱",
    cards: ["pooster", "bradymck", "qrcodo"],
    minCards: 2,
    bonus: { type: "draw", value: 1, target: "self" },
    description: "Draw 1 card + 10 power each",
  },
  {
    id: "mythic_assembly",
    name: "Mythic Assembly",
    emoji: "💎",
    cards: ["neymar", "anon", "linda xied", "vitalik jumpterin", "jesse"],
    minCards: 2,
    bonus: { type: "power", value: 40, target: "self" },
    description: "+40 power to each Mythic",
  },
  {
    id: "underdog_uprising",
    name: "Underdog Uprising",
    emoji: "🐕",
    cards: ["rachel", "ink", "casa", "thosmur", "brainpasta"],
    minCards: 3,
    bonus: { type: "power_percent", value: 100, target: "self" },
    description: "Double power of Common cards",
  },
  {
    id: "chaos_agents",
    name: "Chaos Agents",
    emoji: "🌀",
    cards: ["tukka", "goofy romero", "chilipepper"],
    minCards: 2,
    bonus: { type: "power", value: 20, target: "all_lanes" },
    description: "+20 power to random cards in all lanes",
  },
  {
    id: "money_makers",
    name: "Money Makers",
    emoji: "💰",
    cards: ["betobutter", "ventra", "melted"],
    minCards: 2,
    bonus: { type: "power", value: 15, target: "lane" },
    description: "+15 power to entire lane",
  },
  {
    id: "sniper_support",
    name: "Sniper Support",
    emoji: "🎯",
    cards: ["jack the sniper", "beeper", "loground"],
    minCards: 2,
    bonus: { type: "steal", value: 12, target: "enemy_lane" },
    description: "Steal 12 power from enemies",
  },
  {
    id: "full_house",
    name: "Full House",
    emoji: "🏠",
    cards: ["casa", "lombra jr", "antonio"],
    bonus: { type: "power", value: 35, target: "lane" },
    description: "+35 power to all cards in lane",
  },
  {
    id: "proxy_war",
    name: "Proxy War",
    emoji: "🔮",
    cards: ["slaterg", "zurkchad", "morlacos"],
    minCards: 2,
    bonus: { type: "power_percent", value: 30, target: "self" },
    description: "+30% power to proxy cards",
  },
  {
    id: "santa_helpers",
    name: "Santa's Helpers",
    emoji: "🎅",
    cards: ["naughty santa", "smolemaru", "gozaru"],
    minCards: 2,
    bonus: { type: "power", value: 20, target: "self" },
    description: "+20 power to each helper",
  },
  {
    id: "explosive_combo",
    name: "Explosive Combo",
    emoji: "💥",
    cards: ["landmine", "chilipepper", "joonx"],
    minCards: 2,
    bonus: { type: "steal", value: 10, target: "enemy_lane" },
    description: "-10 power to all enemies in lane",
  },
  {
    id: "persistence_pays",
    name: "Persistence Pays",
    emoji: "🔄",
    cards: ["morlacos", "thosmur", "sartocrates"],
    minCards: 2,
    bonus: { type: "power", value: 12, target: "self" },
    description: "+12 power to persistent cards",
  },
];

// Detect combos in a set of cards
const detectCombos = (cards: DeckCard[]): { combo: CardCombo; matchedCards: string[] }[] => {
  const activeCombos: { combo: CardCombo; matchedCards: string[] }[] = [];
  const cardNames = cards.map(c => (c.name || "").toLowerCase());

  for (const combo of CARD_COMBOS) {
    const comboCardsLower = combo.cards.map(c => c.toLowerCase());
    const matchedCards = comboCardsLower.filter(cc => cardNames.includes(cc));

    const requiredCount = combo.minCards || combo.cards.length;

    if (matchedCards.length >= requiredCount) {
      activeCombos.push({ combo, matchedCards });
    }
  }

  return activeCombos;
};

// Calculate combo bonus for a specific card
const getComboBonus = (card: DeckCard, allCardsInLane: DeckCard[], allLanes?: any[]): number => {
  const combos = detectCombos(allCardsInLane);
  let totalBonus = 0;
  const cardNameLower = (card.name || "").toLowerCase();

  for (const { combo, matchedCards } of combos) {
    // Check if this card is part of the combo
    if (matchedCards.includes(cardNameLower)) {
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
      if (!matchedCards.includes(cardNameLower)) {
        totalBonus += Math.floor(combo.bonus.value / allCardsInLane.length);
      }
    }
  }

  return totalBonus;
};

// Get steal amount from combos (negative power to enemies)
const getComboSteal = (playerCards: DeckCard[]): number => {
  const combos = detectCombos(playerCards);
  let totalSteal = 0;

  for (const { combo } of combos) {
    if (combo.bonus.type === "steal") {
      totalSteal += combo.bonus.value;
    }
  }

  return totalSteal;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SOUND EFFECTS
// ═══════════════════════════════════════════════════════════════════════════════

const playSound = (type: "card" | "turn" | "ability" | "victory" | "defeat" | "select" | "combo" | "error") => {
  if (typeof window === "undefined") return;

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
      // Ability trigger: magical sparkle
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
      break;

    case "victory":
      // Victory: triumphant ascending notes
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
      playVictoryNote(523, 0);      // C5
      playVictoryNote(659, 0.15);   // E5
      playVictoryNote(784, 0.3);    // G5
      playVictoryNote(1047, 0.45);  // C6
      return;

    case "defeat":
      // Defeat: descending sad notes
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
      break;

    case "combo":
      // Combo: epic power-up sound with multiple notes
      const playComboNote = (freq: number, delay: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + delay + 0.1);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.15);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.15);
      };
      playComboNote(400, 0);
      playComboNote(600, 0.08);
      playComboNote(800, 0.16);
      playComboNote(1000, 0.24);
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
  const { address, isConnected } = useAccount();
  const { userProfile } = useProfile();
  const { nfts, isLoading: cardsLoading, loadNFTs, status } = usePlayerCards();

  // Load NFTs when wallet connects
  useEffect(() => {
    if (address && status === 'idle') {
      loadNFTs();
    }
  }, [address, status, loadNFTs]);

  // Game state
  const [view, setView] = useState<GameView>("lobby");
  const [currentMatchId, setCurrentMatchId] = useState<Id<"tcgMatches"> | null>(null);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Deck builder state
  const [selectedCards, setSelectedCards] = useState<DeckCard[]>([]);
  const [deckName, setDeckName] = useState("My Deck");

  // Battle state
  const [pendingActions, setPendingActions] = useState<GameAction[]>([]);
  const [selectedHandCard, setSelectedHandCard] = useState<number | null>(null);

  // Card detail modal state
  const [detailCard, setDetailCard] = useState<DeckCard | null>(null);
  const [detailCombo, setDetailCombo] = useState<CardCombo | null>(null);

  // PvE state (local, no Convex)
  const [isPvE, setIsPvE] = useState(false);
  const [pveGameState, setPveGameState] = useState<any>(null);

  // Profile dropdown state
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Visual effects state
  const [visualEffect, setVisualEffect] = useState<{
    type: "explosion" | "play" | "buff" | "debuff" | "draw" | null;
    laneIndex?: number;
    position?: { x: number; y: number };
    text?: string;
  } | null>(null);

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

  // Convex mutations
  const createMatch = useMutation(api.tcg.createMatch);
  const joinMatch = useMutation(api.tcg.joinMatch);
  const saveDeck = useMutation(api.tcg.saveDeck);
  const submitActions = useMutation(api.tcg.submitActions);
  const cancelMatch = useMutation(api.tcg.cancelMatch);
  const forfeitMatch = useMutation(api.tcg.forfeitMatch);

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

  // Aliases: onChainName -> baccarat name (used in abilities)
  const cardNameAliases: Record<string, string> = {
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
  };

  // Get card ability by name
  const getCardAbility = (cardName: string | undefined): TCGAbility | null => {
    if (!cardName) return null;
    const normalizedName = cardName.toLowerCase().trim();
    // Check for alias first
    const resolvedName = cardNameAliases[normalizedName] || normalizedName;
    return tcgAbilities[resolvedName] || null;
  };

  // Get foil effect description
  const getFoilEffect = (foil: string | undefined): { multiplier: number; description: string } | null => {
    if (!foil || foil === "None" || foil === "none") return null;
    if (foil === "Standard" || foil === "standard") {
      return { multiplier: 1.5, description: "Standard Foil: +50% power multiplier" };
    }
    if (foil === "Prize" || foil === "prize") {
      return { multiplier: 2.0, description: "Prize Foil: +100% power multiplier + special effect on sacrifice" };
    }
    return null;
  };

  // Get ability type color
  const getAbilityTypeColor = (type: string): string => {
    switch (type) {
      case "onReveal": return "text-blue-400";
      case "ongoing": return "text-green-400";
      case "onDestroy": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  // Get ability type label
  const getAbilityTypeLabel = (type: string): string => {
    switch (type) {
      case "onReveal": return "On Reveal";
      case "ongoing": return "Ongoing";
      case "onDestroy": return "On Destroy";
      default: return type;
    }
  };

  const generateCpuDeck = (playerDeck: DeckCard[]): DeckCard[] => {
    // CPU copies the player's deck with slight power variations
    return playerDeck.map((card, i) => ({
      ...card,
      cardId: `cpu-${i}`,
      // Add some randomness: -10% to +20% power variation
      power: Math.floor(card.power * (0.9 + Math.random() * 0.3)),
    }));
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
        const ability = getCardAbility(card.name);
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

    // Helper to apply CPU ability when playing a card
    const playCpuCard = (card: DeckCard, laneIdx: number) => {
      // Add card to lane first
      newLanes[laneIdx].cpuCards.push(card);

      // Apply onReveal ability (simplified version for CPU)
      const ability = getCardAbility(card.name);
      let bonusPower = 0;

      if (ability?.type === "onReveal") {
        const effect = ability.effect;
        switch (effect.action) {
          case "buffSelf":
            bonusPower = effect.value || 0;
            break;
          case "draw":
            const drawCount = effect.value || 1;
            for (let i = 0; i < drawCount && cpuDeckRemaining.length > 0; i++) {
              cpuHand.push(cpuDeckRemaining.shift()!);
            }
            break;
          case "debuffLane":
            // Debuff all player cards in this lane
            newLanes[laneIdx].playerCards.forEach((c: DeckCard, cIdx: number) => {
              newLanes[laneIdx].playerCards[cIdx] = {
                ...c,
                power: Math.max(0, c.power - Math.abs(effect.value || 0)),
              };
            });
            break;
          case "buffPerCardInLane":
            bonusPower = (newLanes[laneIdx].cpuCards.length) * (effect.value || 0);
            break;
          case "buffAllLanes":
            // Buff all CPU cards
            newLanes.forEach((lane: any) => {
              lane.cpuCards.forEach((c: DeckCard, cIdx: number) => {
                lane.cpuCards[cIdx] = { ...c, power: c.power + (effect.value || 0) };
              });
            });
            break;
          case "destroyHighestEnemy":
            // Destroy highest player card
            let highestPower = -1;
            let highestLaneIdx = -1;
            let highestCardIdx = -1;
            newLanes.forEach((lane: any, lIdx: number) => {
              lane.playerCards.forEach((c: DeckCard, cIdx: number) => {
                if (c.power > highestPower) {
                  highestPower = c.power;
                  highestLaneIdx = lIdx;
                  highestCardIdx = cIdx;
                }
              });
            });
            if (highestLaneIdx >= 0 && highestCardIdx >= 0) {
              newLanes[highestLaneIdx].playerCards.splice(highestCardIdx, 1);
            }
            break;
          case "gamble":
            bonusPower = Math.random() > 0.5 ? (effect.win || 0) : (effect.lose || 0);
            break;
          case "buffIfTurn":
            if (effect.minTurn && currentTurn >= effect.minTurn) {
              bonusPower = effect.value || 0;
            } else if (effect.maxTurn && currentTurn <= effect.maxTurn) {
              bonusPower = effect.value || 0;
            }
            break;
        }
      }

      // Apply bonus power to the card
      if (bonusPower !== 0) {
        const cardIdx = newLanes[laneIdx].cpuCards.length - 1;
        newLanes[laneIdx].cpuCards[cardIdx] = {
          ...newLanes[laneIdx].cpuCards[cardIdx],
          power: newLanes[laneIdx].cpuCards[cardIdx].power + bonusPower,
        };
      }
    };

    // Calculate card energy cost (same as player: ceil(power/30), min 1)
    const getCardCost = (card: DeckCard) => Math.max(1, Math.ceil(card.power / 30));

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
        const basePower = card.type === "nothing" ? Math.floor(card.power * 0.5) : card.power;
        const ongoingBonus = calculateOngoingBonus(card, laneIdx, newLanes, currentTurn, true);
        playerPower += basePower + ongoingBonus;
      });

      lane.cpuCards.forEach((card: DeckCard) => {
        const basePower = card.type === "nothing" ? Math.floor(card.power * 0.5) : card.power;
        const ongoingBonus = calculateOngoingBonus(card, laneIdx, newLanes, currentTurn, false);
        cpuPower += basePower + ongoingBonus;
      });

      return { ...lane, playerPower, cpuPower };
    });

    return { cpuHand: newCpuHand, cpuDeckRemaining, lanes: newLanes, cpuEnergy };
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════

  const startPvEMatch = () => {
    if (!activeDeck) {
      setError("No active deck. Please create a deck first.");
      return;
    }

    // CPU copies player's deck with power variations
    const cpuDeck = generateCpuDeck(activeDeck.cards as DeckCard[]);
    const gameState = initializePvEGame(activeDeck.cards as DeckCard[], cpuDeck);

    setIsPvE(true);
    setPveGameState(gameState);
    setView("battle");
    setPendingActions([]);
    setSelectedHandCard(null);
  };

  // Apply onReveal ability when card is played
  const applyOnRevealAbility = (
    card: DeckCard,
    laneIndex: number,
    lanes: any[],
    playerHand: DeckCard[],
    playerDeckRemaining: DeckCard[],
    isPlayer: boolean
  ): { lanes: any[]; playerHand: DeckCard[]; playerDeckRemaining: DeckCard[]; bonusPower: number } => {
    const ability = getCardAbility(card.name);
    if (!ability || ability.type !== "onReveal") {
      return { lanes, playerHand, playerDeckRemaining, bonusPower: 0 };
    }

    let newLanes = lanes.map(l => ({ ...l, playerCards: [...l.playerCards], cpuCards: [...l.cpuCards] }));
    let newHand = [...playerHand];
    let newDeck = [...playerDeckRemaining];
    let bonusPower = 0;
    const effect = ability.effect;
    const myCards = isPlayer ? "playerCards" : "cpuCards";
    const enemyCards = isPlayer ? "cpuCards" : "playerCards";
    const myPower = isPlayer ? "playerPower" : "cpuPower";
    const enemyPower = isPlayer ? "cpuPower" : "playerPower";

    switch (effect.action) {
      case "buffSelf":
        bonusPower = effect.value || 0;
        break;

      case "buffOtherInLane":
        // +X power to another card in this lane
        if (newLanes[laneIndex][myCards].length > 0) {
          const targetIdx = Math.floor(Math.random() * newLanes[laneIndex][myCards].length);
          newLanes[laneIndex][myCards][targetIdx] = {
            ...newLanes[laneIndex][myCards][targetIdx],
            power: newLanes[laneIndex][myCards][targetIdx].power + (effect.value || 0),
          };
          newLanes[laneIndex][myPower] += effect.value || 0;
        }
        break;

      case "debuffEnemyInLane":
        // -X power to an enemy card in this lane
        if (newLanes[laneIndex][enemyCards].length > 0) {
          const targetIdx = Math.floor(Math.random() * newLanes[laneIndex][enemyCards].length);
          newLanes[laneIndex][enemyCards][targetIdx] = {
            ...newLanes[laneIndex][enemyCards][targetIdx],
            power: Math.max(0, newLanes[laneIndex][enemyCards][targetIdx].power - Math.abs(effect.value || 0)),
          };
          newLanes[laneIndex][enemyPower] = Math.max(0, newLanes[laneIndex][enemyPower] - Math.abs(effect.value || 0));
        }
        break;

      case "draw":
        // Draw X cards
        const drawCount = effect.value || 1;
        for (let i = 0; i < drawCount && newDeck.length > 0; i++) {
          newHand.push(newDeck.shift()!);
        }
        break;

      case "buffAdjacent":
        // +X power to adjacent cards (cards played before/after in same lane)
        const cardCount = newLanes[laneIndex][myCards].length;
        if (cardCount > 0) {
          // Buff the last card in the lane (the one played right before)
          const lastIdx = cardCount - 1;
          newLanes[laneIndex][myCards][lastIdx] = {
            ...newLanes[laneIndex][myCards][lastIdx],
            power: newLanes[laneIndex][myCards][lastIdx].power + (effect.value || 0),
          };
          newLanes[laneIndex][myPower] += effect.value || 0;
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
        newLanes[laneIndex][enemyCards].forEach((c: DeckCard, cIdx: number) => {
          newLanes[laneIndex][enemyCards][cIdx] = {
            ...c,
            power: Math.max(0, c.power - Math.abs(effect.value || 0)),
          };
        });
        newLanes[laneIndex][enemyPower] = Math.max(0,
          newLanes[laneIndex][enemyPower] - (newLanes[laneIndex][enemyCards].length * Math.abs(effect.value || 0))
        );
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
          newLanes[weakestLane][myCards][weakestIdx] = {
            ...weakestCard,
            power: weakestCard.power + (effect.value || 0),
          };
          newLanes[weakestLane][myPower] += effect.value || 0;
        }
        break;

      case "debuffStrongest":
        // -X power to the strongest enemy card
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
          const reduction = Math.abs(effect.value || 0);
          newLanes[strongestLane][enemyCards][strongestIdx] = {
            ...strongestCard,
            power: Math.max(0, strongestCard.power - reduction),
          };
          newLanes[strongestLane][enemyPower] = Math.max(0, newLanes[strongestLane][enemyPower] - reduction);
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
        // +X power to all your cards in all lanes (Mythic)
        newLanes.forEach((lane: any) => {
          lane[myCards].forEach((c: DeckCard, cIdx: number) => {
            lane[myCards][cIdx] = { ...c, power: c.power + (effect.value || 0) };
          });
          lane[myPower] += lane[myCards].length * (effect.value || 0);
        });
        break;

      case "destroyHighestEnemy":
        // Destroy the highest power enemy card (Mythic)
        let highestPower = -1;
        let highestLaneIdx = -1;
        let highestCardIdx = -1;
        newLanes.forEach((lane: any, lIdx: number) => {
          lane[enemyCards].forEach((c: DeckCard, cIdx: number) => {
            if (c.power > highestPower) {
              highestPower = c.power;
              highestLaneIdx = lIdx;
              highestCardIdx = cIdx;
            }
          });
        });
        if (highestLaneIdx >= 0 && highestCardIdx >= 0) {
          const removedCard = newLanes[highestLaneIdx][enemyCards].splice(highestCardIdx, 1)[0];
          newLanes[highestLaneIdx][enemyPower] -= removedCard.power;
        }
        break;

      case "shuffleAllLanes":
        // Shuffle all cards in all lanes randomly (Legendary)
        const allCards: { card: DeckCard; isPlayer: boolean }[] = [];
        newLanes.forEach(lane => {
          lane.playerCards.forEach((c: DeckCard) => allCards.push({ card: c, isPlayer: true }));
          lane.cpuCards.forEach((c: DeckCard) => allCards.push({ card: c, isPlayer: false }));
        });
        // Shuffle
        for (let i = allCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
        }
        // Redistribute
        newLanes = newLanes.map(lane => ({
          ...lane,
          playerCards: [],
          cpuCards: [],
          playerPower: 0,
          cpuPower: 0,
        }));
        allCards.forEach((item, idx: number) => {
          const laneIdx = idx % 3;
          const cardPower = item.card.type === "nothing" ? Math.floor(item.card.power * 0.5) : item.card.power;
          if (item.isPlayer) {
            newLanes[laneIdx].playerCards.push(item.card);
            newLanes[laneIdx].playerPower += cardPower;
          } else {
            newLanes[laneIdx].cpuCards.push(item.card);
            newLanes[laneIdx].cpuPower += cardPower;
          }
        });
        break;
    }

    return { lanes: newLanes, playerHand: newHand, playerDeckRemaining: newDeck, bonusPower };
  };

  // Calculate ongoing power bonuses
  const calculateOngoingBonus = (card: DeckCard, laneIndex: number, lanes: any[], currentTurn: number, isPlayer: boolean): number => {
    const ability = getCardAbility(card.name);
    if (!ability || ability.type !== "ongoing") return 0;

    const effect = ability.effect;
    const myCards = isPlayer ? "playerCards" : "cpuCards";
    const enemyCards = isPlayer ? "cpuCards" : "playerCards";

    switch (effect.action) {
      case "buffPerCardInPlay":
        // +X power for each card in play
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
        // +X power if played first in this lane
        if (lanes[laneIndex][myCards].length > 0 && lanes[laneIndex][myCards][0].cardId === card.cardId) {
          return effect.value || 0;
        }
        return 0;

      case "doubleIfLosing":
        // Double power if losing this lane
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
        // +X power at the end of each turn (accumulates)
        return currentTurn * (effect.value || 0);

      case "reduceEnemyPower":
        // Enemies deal -X power to this lane (reduces enemy power calculation)
        return 0; // This is applied differently

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
      case "buffAll":
        return value;

      case "debuffAll":
        return value; // negative value

      case "buffPerTurn":
      case "debuffPerTurn":
        return value * currentTurn;

      case "buffFirst":
        // Only first card played gets bonus
        const isFirst = allCards.indexOf(card) === 0;
        return isFirst ? value : 0;

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
        // Check card rarity from abilities
        const ability = getCardAbility(card.name);
        return ability?.rarity === "Common" ? value : 0;

      case "doubleLegendary":
        const cardAbility = getCardAbility(card.name);
        return cardAbility?.rarity === "Legendary" ? card.power : 0; // Double = add same power

      case "buffFoil":
        return card.foil ? value : 0;

      case "buffNothing":
        return card.type === "nothing" ? value : 0;

      case "buffVibeFID":
        return card.collection === "vibefid" ? value : 0;

      case "buffWithAbility":
        return getCardAbility(card.name) ? value : 0;

      case "buffIfLosing":
        // Bonus if player is losing this lane
        const playerTotal = lane.playerCards.reduce((sum: number, c: DeckCard) => sum + (c.power || 0), 0);
        const cpuTotal = lane.cpuCards.reduce((sum: number, c: DeckCard) => sum + (c.power || 0), 0);
        if (isPlayer && playerTotal < cpuTotal) return value;
        if (!isPlayer && cpuTotal < playerTotal) return value;
        return 0;

      case "debuffEnemy":
        // Only debuff enemy cards
        return isPlayer ? 0 : value;

      case "gamble":
        // 50% chance double, 50% chance halve (calculated once per card on reveal)
        // For now, apply a random factor
        return Math.random() > 0.5 ? card.power : -Math.floor(card.power / 2);

      case "swapSides":
        // This is handled at the lane level, not per card
        return 0;

      case "reverseOrder":
        // This is handled at victory calculation
        return 0;

      case "highestWins":
        // This is handled at victory calculation
        return 0;

      case "noVictory":
        // This is handled at victory calculation
        return 0;

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
        const basePower = card.type === "nothing" ? Math.floor(card.power * 0.5) : card.power;
        const ongoingBonus = calculateOngoingBonus(card, laneIdx, lanes, currentTurn, true);
        const comboBonus = getComboBonus(card, lane.playerCards, lanes);
        const laneBonus = calculateLaneEffectBonus(card, lane, lane.playerCards, true, currentTurn);
        playerPower += basePower + ongoingBonus + comboBonus + laneBonus;
      });

      // Calculate CPU power with ongoing bonuses + lane effects
      lane.cpuCards.forEach((card: DeckCard) => {
        const basePower = card.type === "nothing" ? Math.floor(card.power * 0.5) : card.power;
        const ongoingBonus = calculateOngoingBonus(card, laneIdx, lanes, currentTurn, false);
        const comboBonus = getComboBonus(card, lane.cpuCards, lanes);
        const laneBonus = calculateLaneEffectBonus(card, lane, lane.cpuCards, false, currentTurn);
        cpuPower += basePower + ongoingBonus + comboBonus + laneBonus;
      });

      // Apply lane-wide ongoing effects (like buffLaneOngoing)
      lane.playerCards.forEach((card: DeckCard) => {
        const ability = getCardAbility(card.name);
        if (ability?.type === "ongoing" && ability.effect.action === "buffLaneOngoing") {
          playerPower += (lane.playerCards.length - 1) * (ability.effect.value || 0);
        }
      });
      lane.cpuCards.forEach((card: DeckCard) => {
        const ability = getCardAbility(card.name);
        if (ability?.type === "ongoing" && ability.effect.action === "buffLaneOngoing") {
          cpuPower += (lane.cpuCards.length - 1) * (ability.effect.value || 0);
        }
      });

      // Apply steal effect from combos (reduce enemy power)
      const playerSteal = getComboSteal(lane.playerCards);
      const cpuSteal = getComboSteal(lane.cpuCards);
      cpuPower = Math.max(0, cpuPower - playerSteal * lane.cpuCards.length);
      playerPower = Math.max(0, playerPower - cpuSteal * lane.playerCards.length);

      // Special lane effects that swap powers
      if (lane.effect === "swapSides") {
        const temp = playerPower;
        playerPower = cpuPower;
        cpuPower = temp;
      }

      // Clown College: reverse order (lower wins)
      // This is shown in UI but handled at victory calculation

      return { ...lane, playerPower: Math.max(0, playerPower), cpuPower: Math.max(0, cpuPower) };
    });
  };

  const handlePvEPlayCard = (laneIndex: number) => {
    if (selectedHandCard === null || !pveGameState) return;

    const card = pveGameState.playerHand[selectedHandCard];
    if (!card) return;

    // Check if card is Prize foil (FREE to play + draws a card)
    const isPrizeFoil = card.foil === "Prize" || card.foil === "prize";

    // Calculate energy cost (Prize foil = FREE)
    const baseCost = Math.max(1, Math.ceil(card.power / 30));
    const energyCost = isPrizeFoil ? 0 : baseCost;
    const currentEnergy = pveGameState.energy || 1;

    // Check if player has enough energy
    if (energyCost > currentEnergy) {
      playSound("error"); // Play error sound
      return; // Can't play this card
    }

    // Consume energy
    const newEnergy = currentEnergy - energyCost;

    // Remove card from hand
    let newHand = [...pveGameState.playerHand];
    newHand.splice(selectedHandCard, 1);

    // Prize foil bonus: Draw a card!
    let newDeck = [...pveGameState.playerDeckRemaining];
    if (isPrizeFoil && newDeck.length > 0) {
      newHand.push(newDeck.shift()!);
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

    // Apply onReveal ability
    const abilityResult = applyOnRevealAbility(
      card,
      laneIndex,
      newLanes,
      newHand,
      newDeck,
      true
    );
    newLanes = abilityResult.lanes;
    newHand = abilityResult.playerHand;

    // If card got bonus power from ability, update it and play ability sound
    if (abilityResult.bonusPower !== 0) {
      playSound("ability");
      const cardIdx = newLanes[laneIndex].playerCards.length - 1;
      newLanes[laneIndex].playerCards[cardIdx] = {
        ...newLanes[laneIndex].playerCards[cardIdx],
        power: newLanes[laneIndex].playerCards[cardIdx].power + abilityResult.bonusPower,
      };
    }

    // Check for combos BEFORE recalculating (to detect new combos)
    const combosBeforePlay = detectCombos(pveGameState.lanes[laneIndex]?.playerCards || []);

    // Recalculate all lane powers (including ongoing effects)
    newLanes = recalculateLanePowers(newLanes, pveGameState.currentTurn);

    // Check for combos AFTER playing
    const combosAfterPlay = detectCombos(newLanes[laneIndex]?.playerCards || []);

    // If a new combo was activated, play combo sound
    if (combosAfterPlay.length > combosBeforePlay.length) {
      setTimeout(() => playSound("combo"), 200); // Slight delay for effect
    }

    setPveGameState({
      ...pveGameState,
      energy: newEnergy,
      playerHand: newHand,
      playerDeckRemaining: abilityResult.playerDeckRemaining,
      lanes: newLanes,
    });
    setSelectedHandCard(null);
  };

  // Sacrifice Nothing card from hand (discard to draw + gain energy)
  const handleSacrificeNothingFromHand = (cardIndex: number) => {
    if (!pveGameState) return;

    const card = pveGameState.playerHand[cardIndex];
    if (!card || card.type !== "nothing") return;

    // Calculate energy gain (half of what it would cost, minimum 1)
    const cardCost = Math.max(1, Math.ceil(card.power / 30));
    const energyGain = Math.max(1, Math.floor(cardCost / 2));
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
      const enemyPower = enemy.type === "nothing" ? Math.floor(enemy.power * 0.5) : enemy.power;
      if (enemyPower > highestEnemyPower) {
        highestEnemyPower = enemyPower;
        highestEnemyIdx = idx;
      }
    });

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

    // Show explosion effect
    setVisualEffect({
      type: "explosion",
      laneIndex: laneIndex,
      text: highestEnemyIdx >= 0 ? `💥 DESTROYED! -${highestEnemyPower}` : "💥 BOOM!",
    });

    // Play explosion sound
    playSound("ability");

    // Clear effect after animation
    setTimeout(() => setVisualEffect(null), 1500);

    setPveGameState({
      ...pveGameState,
      lanes: recalculatedLanes,
    });
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

    // Show charm effect with hearts
    setVisualEffect({
      type: "buff",
      laneIndex: laneIndex,
      text: `CHARMED! 💕 +${charmedEnemy.power}`,
    });

    // Play ability sound
    playSound("ability");

    // Clear effect after animation
    setTimeout(() => setVisualEffect(null), 2000);

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
  };

  const handlePvEEndTurn = () => {
    if (!pveGameState) return;

    // Play turn end sound
    playSound("turn");

    // CPU plays cards using smart AI
    const cpuResult = cpuPlayCards(pveGameState);
    let cpuHand = cpuResult.cpuHand;
    let cpuDeckRemaining = cpuResult.cpuDeckRemaining;
    let newLanes = cpuResult.lanes;

    // Recalculate all lane powers with ongoing effects for current turn
    const nextTurn = pveGameState.currentTurn + 1;
    newLanes = recalculateLanePowers(newLanes, pveGameState.currentTurn);

    // Check if game over (turn 6)
    if (pveGameState.currentTurn >= TCG_CONFIG.TOTAL_TURNS) {
      const playerWins = newLanes.filter((l: any) => l.playerPower > l.cpuPower).length;
      const cpuWins = newLanes.filter((l: any) => l.cpuPower > l.playerPower).length;
      const winner = playerWins > cpuWins ? "player" : cpuWins > playerWins ? "cpu" : "tie";

      // First update state to show final board
      setPveGameState({
        ...pveGameState,
        lanes: newLanes,
        cpuHand,
        cpuDeckRemaining,
        gameOver: true,
        winner,
      });

      // Wait 2.5 seconds to show final board, then go to result
      setTimeout(() => {
        if (winner === "player") playSound("victory");
        else if (winner === "cpu") playSound("defeat");
        setView("result");
      }, 2500);
      return;
    }

    // Next turn - draw cards
    let playerHand = [...pveGameState.playerHand];
    let playerDeckRemaining = [...pveGameState.playerDeckRemaining];

    if (playerDeckRemaining.length > 0) {
      playerHand.push(playerDeckRemaining.shift()!);
    }
    if (cpuDeckRemaining.length > 0) {
      cpuHand.push(cpuDeckRemaining.shift()!);
    }

    // Recalculate powers for the new turn (ongoing effects may scale with turn)
    newLanes = recalculateLanePowers(newLanes, nextTurn);

    setPveGameState({
      ...pveGameState,
      currentTurn: nextTurn,
      energy: nextTurn,
      cpuEnergy: nextTurn, // CPU gets same energy as player each turn
      playerHand,
      playerDeckRemaining,
      cpuHand,
      cpuDeckRemaining,
      lanes: newLanes,
    });
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
      const result = await joinMatch({ roomId, address, username });
      setCurrentMatchId(result.matchId);
      setView("battle");
    } catch (err: any) {
      setError(err.message || "Failed to join match");
    }
  };

  const handleSaveDeck = async () => {
    if (!address || selectedCards.length !== TCG_CONFIG.DECK_SIZE) return;
    setError(null);

    try {
      await saveDeck({
        address,
        deckName,
        cards: selectedCards.map((c) => ({
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
    if (selectedCards.find((c) => c.cardId === card.cardId)) {
      // Remove from deck
      setSelectedCards(selectedCards.filter((c) => c.cardId !== card.cardId));
    } else if (selectedCards.length < TCG_CONFIG.DECK_SIZE) {
      // Validate limits
      const vbmsCount = selectedCards.filter((c) => c.type === "vbms").length;
      const nothingCount = selectedCards.filter((c) => c.type === "nothing").length;

      if (card.type === "nothing" && nothingCount >= TCG_CONFIG.MAX_NOTHING) {
        setError(`Max ${TCG_CONFIG.MAX_NOTHING} Nothing cards allowed`);
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
      await submitActions({
        matchId: currentMatchId,
        address,
        actions: pendingActions,
      });
      setPendingActions([]);
    } catch (err: any) {
      setError(err.message || "Failed to submit actions");
    }
  };

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
      setView("battle");
    }
    if (currentMatch?.status === "finished") {
      setView("result");
    }
  }, [currentMatch?.status, view]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPONENT: Card Detail Modal
  // ═══════════════════════════════════════════════════════════════════════════════

  const CardDetailModal = ({ card, onClose, onSelect }: { card: DeckCard; onClose: () => void; onSelect?: () => void }) => {
    const ability = getCardAbility(card.name);
    const foilEffect = getFoilEffect(card.foil);
    const isSelected = selectedCards.some((c) => c.cardId === card.cardId);
    const effectivePower = card.type === "nothing" ? Math.floor(card.power * 0.5) : card.power;
    const foilPower = foilEffect ? Math.floor(effectivePower * foilEffect.multiplier) : effectivePower;

    return (
      <div
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-gray-900 border-2 border-yellow-500/50 rounded-2xl p-4 max-w-sm w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card Image */}
          <div className="flex justify-center mb-4">
            <div
              className={`w-32 h-48 rounded-xl border-4 bg-cover bg-center ${RARITY_COLORS[card.rarity] || "border-gray-500"}`}
              style={{ backgroundImage: `url(${card.imageUrl})` }}
            >
              {card.foil && card.foil !== "None" && (
                <div className="w-full h-full bg-gradient-to-br from-white/20 via-transparent to-white/10 rounded-lg" />
              )}
            </div>
          </div>

          {/* Card Info */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-white">{card.name}</h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className={`text-sm ${RARITY_COLORS[card.rarity]?.split(" ")[1] || "text-gray-400"}`}>
                {card.rarity}
              </span>
              {card.foil && card.foil !== "None" && (
                <span className="text-sm text-yellow-400">&#x2728; {card.foil}</span>
              )}
              {card.type === "nothing" && (
                <span className="text-sm text-purple-400">(Nothing)</span>
              )}
            </div>
            <div className="mt-2">
              <span className="text-yellow-400 font-bold text-2xl">{foilPower}</span>
              <span className="text-gray-400 text-sm ml-1">power</span>
              {foilEffect && (
                <span className="text-green-400 text-xs ml-2">(base: {effectivePower})</span>
              )}
            </div>
          </div>

          {/* Ability Section */}
          {ability && card.type === "vbms" && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold ${getAbilityTypeColor(ability.type)}`}>
                  [{getAbilityTypeLabel(ability.type)}]
                </span>
                <span className="text-white font-bold text-sm">{ability.name}</span>
              </div>
              <p className="text-gray-300 text-sm">{ability.description}</p>
            </div>
          )}

          {/* Nothing Card Info */}
          {card.type === "nothing" && (
            <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3 mb-3">
              <p className="text-purple-300 text-xs font-bold mb-1">Nothing Card</p>
              <p className="text-gray-400 text-xs">&#x2022; 50% base power penalty</p>
              <p className="text-gray-400 text-xs">&#x2022; Can be sacrificed from hand (draw new card)</p>
              <p className="text-gray-400 text-xs">&#x2022; Can be sacrificed from lane (buff another card)</p>
            </div>
          )}

          {/* Foil Effect Section */}
          {foilEffect && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 mb-3">
              <p className="text-yellow-400 text-xs font-bold mb-1">&#x2728; Foil Bonus</p>
              <p className="text-gray-300 text-sm">{foilEffect.description}</p>
            </div>
          )}

          {/* Wear */}
          {card.wear && (
            <div className="text-center text-xs text-gray-500 mb-3">
              Condition: {card.wear}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
            {onSelect && (
              <button
                onClick={() => {
                  onSelect();
                  onClose();
                }}
                className={`flex-1 py-2 px-4 rounded-lg transition-colors font-bold ${
                  isSelected
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-green-600 hover:bg-green-500 text-white"
                }`}
              >
                {isSelected ? "Remove" : "Add to Deck"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: NOT CONNECTED
  // ═══════════════════════════════════════════════════════════════════════════════

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-yellow-400 mb-4">VIBE CLASH</h1>
          <p className="text-gray-400 mb-6">TCG Mode - Marvel Snap Style</p>
          <p className="text-gray-500">Connect your wallet to play</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: LOBBY
  // ═══════════════════════════════════════════════════════════════════════════════

  if (view === "lobby") {
    const vbmsCards = selectedCards.filter((c) => c.type === "vbms").length;
    const hasDeck = activeDeck !== undefined && activeDeck !== null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4">
        {/* Header */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push("/")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              &larr; Back
            </button>
            <h1 className="text-3xl font-bold text-yellow-400">VIBE CLASH</h1>
            <div className="w-16" />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Main Content */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Play Options */}
            <div className="space-y-4">
              <div className="bg-gray-800/50 border border-yellow-500/30 rounded-xl p-6">
                <h2 className="text-xl font-bold text-yellow-400 mb-4">Play</h2>

                {!hasDeck ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">You need a deck to play!</p>
                    <button
                      onClick={() => setView("deck-builder")}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                      Build Your Deck
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <p className="text-sm text-gray-400">Active Deck</p>
                      <p className="text-lg font-bold text-white">{activeDeck.deckName}</p>
                      <p className="text-sm text-gray-500">
                        {activeDeck.vbmsCount} VBMS | {activeDeck.nothingCount} Nothing | Power: {activeDeck.totalPower}
                      </p>
                    </div>

                    <button
                      onClick={() => startPvEMatch()}
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                      &#x1F916; Play vs CPU (Test Mode)
                    </button>

                    {/* PvP disabled for now */}
                    <div className="w-full bg-gray-700 text-gray-400 font-bold py-3 px-6 rounded-lg text-center cursor-not-allowed">
                      🔒 PvP Coming Soon
                    </div>

                    <button
                      onClick={() => setView("deck-builder")}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      Edit Deck
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Waiting Rooms */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Open Rooms</h2>

              {waitingRooms && waitingRooms.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {waitingRooms.map((room) => (
                    <div
                      key={room._id}
                      className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-mono text-yellow-400">{room.roomId}</p>
                        <p className="text-sm text-gray-400">{room.player1Username}</p>
                      </div>
                      <button
                        onClick={() => handleJoinMatch(room.roomId)}
                        disabled={!hasDeck}
                        className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No open rooms</p>
              )}
            </div>
          </div>

          {/* Rules */}
          <div className="mt-8 bg-gray-800/30 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3">How to Play</h3>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>&#x2022; Build a deck with 15 cards (min 8 VBMS, max 7 Nothing)</li>
              <li>&#x2022; Battle across 3 lanes over 6 turns</li>
              <li>&#x2022; Energy increases each turn (1 &rarr; 6)</li>
              <li>&#x2022; Win 2/3 lanes to win the match</li>
              <li>&#x2022; Nothing cards have 50% power but can be sacrificed</li>
            </ul>
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
    // Only VBMS (vibe collection) and Nothing cards are allowed in TCG
    const tcgEligibleCards = (nfts || []).filter((card: any) =>
      card.collection === "vibe" || card.collection === "nothing"
    );

    const availableCards: DeckCard[] = tcgEligibleCards.map((card: any) => {
      // Try to get character name from: 1) character field, 2) image mapping, 3) card name
      const imageUrl = card.imageUrl || card.image || "/images/card-back.png";
      const characterFromImage = getCharacterFromImage(imageUrl);
      const cardName = card.character || characterFromImage || card.name;

      return {
        type: card.collection === "nothing" ? "nothing" : "vbms",
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

    const vbmsCards = availableCards.filter((c) => c.type === "vbms");
    const nothingCards = availableCards.filter((c) => c.type === "nothing");

    const selectedVbms = selectedCards.filter((c) => c.type === "vbms").length;
    const selectedNothing = selectedCards.filter((c) => c.type === "nothing").length;
    const totalPower = selectedCards.reduce((sum, c) => {
      const power = c.type === "nothing" ? Math.floor(c.power * 0.5) : c.power;
      return sum + power;
    }, 0);

    const canSave =
      selectedCards.length === TCG_CONFIG.DECK_SIZE &&
      selectedVbms >= TCG_CONFIG.MIN_VBMS;

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setView("lobby")}
              className="text-gray-400 hover:text-white transition-colors"
            >
              &larr; Back
            </button>
            <h1 className="text-2xl font-bold text-yellow-400">Deck Builder</h1>
            <button
              onClick={handleSaveDeck}
              disabled={!canSave}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Save Deck
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Loading Status */}
          {cardsLoading && (
            <div className="bg-blue-900/50 border border-blue-500 text-blue-200 px-4 py-2 rounded-lg mb-4">
              Loading your cards... (Status: {status})
            </div>
          )}

          {/* Debug Info */}
          {!cardsLoading && nfts.length === 0 && (
            <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-200 px-4 py-2 rounded-lg mb-4">
              No cards found. Make sure your wallet is connected and you own VBMS or Nothing cards.
              <br />
              <span className="text-xs text-yellow-400">Status: {status} | Address: {address || 'not connected'}</span>
            </div>
          )}

          {/* Deck Stats */}
          <div className="bg-gray-800/50 border border-yellow-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
                placeholder="Deck Name"
              />
              <div className="flex gap-4 text-sm">
                <span className={`${selectedCards.length === TCG_CONFIG.DECK_SIZE ? "text-green-400" : "text-gray-400"}`}>
                  {selectedCards.length}/{TCG_CONFIG.DECK_SIZE} Cards
                </span>
                <span className={`${selectedVbms >= TCG_CONFIG.MIN_VBMS ? "text-green-400" : "text-red-400"}`}>
                  {selectedVbms} VBMS (min {TCG_CONFIG.MIN_VBMS})
                </span>
                <span className={`${selectedNothing <= TCG_CONFIG.MAX_NOTHING ? "text-green-400" : "text-red-400"}`}>
                  {selectedNothing} Nothing (max {TCG_CONFIG.MAX_NOTHING})
                </span>
                <span className="text-yellow-400">Power: {totalPower}</span>
              </div>
            </div>
          </div>

          {/* Selected Cards */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-bold text-white mb-2">Your Deck ({selectedCards.length})</h3>
            <div className="flex flex-wrap gap-2 min-h-[80px]">
              {selectedCards.map((card) => {
                const ability = getCardAbility(card.name);
                return (
                  <div
                    key={card.cardId}
                    className={`relative w-14 h-20 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 bg-cover bg-center ${RARITY_COLORS[card.rarity] || "border-gray-500"}`}
                    style={{ backgroundImage: `url(${card.imageUrl})` }}
                    title={`${card.name} (${card.rarity}) - ${card.power} power`}
                  >
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
                      className="w-full h-full bg-black/40 rounded-lg flex flex-col items-center justify-end p-0.5"
                    >
                      <span className="text-[7px] text-white truncate w-full text-center">{card.name}</span>
                      <span className="text-[9px] text-yellow-400 font-bold">{card.type === "nothing" ? Math.floor(card.power * 0.5) : card.power}</span>
                      {ability && card.type === "vbms" && (
                        <span className={`text-[5px] ${getAbilityTypeColor(ability.type)}`}>
                          {ability.type === "onReveal" ? "R" : ability.type === "ongoing" ? "O" : "D"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {selectedCards.length === 0 && (
                <p className="text-gray-500 text-sm">Click cards below to add them</p>
              )}
            </div>
          </div>

          {/* Available Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* VBMS Cards */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-bold text-yellow-400 mb-2">VBMS Cards ({vbmsCards.length})</h3>
              <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
                {vbmsCards.map((card) => {
                  const isSelected = selectedCards.some((c) => c.cardId === card.cardId);
                  const ability = getCardAbility(card.name);
                  return (
                    <div
                      key={card.cardId}
                      className={`relative w-16 h-24 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 bg-cover bg-center ${
                        isSelected
                          ? "border-green-500 ring-2 ring-green-500/50"
                          : RARITY_COLORS[card.rarity] || "border-gray-500"
                      }`}
                      style={{ backgroundImage: `url(${card.imageUrl})` }}
                      title={`${card.name} (${card.rarity}) - ${card.power} power`}
                    >
                      {/* Info button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailCard(card);
                        }}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-blue-600 hover:bg-blue-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center z-10"
                      >
                        i
                      </button>
                      {/* Add/Remove on click */}
                      <div
                        onClick={() => handleCardSelect(card)}
                        className="w-full h-full bg-black/40 rounded-lg flex flex-col items-center justify-end p-1"
                      >
                        <span className="text-[8px] text-white truncate w-full text-center">{card.name}</span>
                        <span className="text-xs text-yellow-400 font-bold">{card.power}</span>
                        {ability && (
                          <span className={`text-[6px] ${getAbilityTypeColor(ability.type)}`}>
                            {ability.type === "onReveal" ? "R" : ability.type === "ongoing" ? "O" : "D"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {vbmsCards.length === 0 && (
                  <p className="text-gray-500 text-sm">No VBMS cards found</p>
                )}
              </div>
            </div>

            {/* Nothing Cards */}
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-bold text-purple-400 mb-2">Nothing Cards ({nothingCards.length}) <span className="text-gray-500 text-xs">50% power</span></h3>
              <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
                {nothingCards.map((card) => {
                  const isSelected = selectedCards.some((c) => c.cardId === card.cardId);
                  return (
                    <div
                      key={card.cardId}
                      className={`relative w-16 h-24 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 bg-cover bg-center ${
                        isSelected
                          ? "border-green-500 ring-2 ring-green-500/50"
                          : "border-purple-500/50"
                      }`}
                      style={{ backgroundImage: `url(${card.imageUrl})` }}
                      title={`${card.name} (${card.rarity}) - ${Math.floor(card.power * 0.5)} effective power`}
                    >
                      {/* Info button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailCard(card);
                        }}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-purple-600 hover:bg-purple-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center z-10"
                      >
                        i
                      </button>
                      {/* Add/Remove on click */}
                      <div
                        onClick={() => handleCardSelect(card)}
                        className="w-full h-full bg-black/40 rounded-lg flex flex-col items-center justify-end p-1"
                      >
                        <span className="text-[8px] text-white truncate w-full text-center">{card.name}</span>
                        <span className="text-xs text-purple-400 font-bold">{Math.floor(card.power * 0.5)}</span>
                      </div>
                    </div>
                  );
                })}
                {nothingCards.length === 0 && (
                  <p className="text-gray-500 text-sm">No Nothing cards found</p>
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
            <span><span className="text-blue-400">R</span> = On Reveal</span>
            <span><span className="text-green-400">O</span> = Ongoing</span>
            <span><span className="text-red-400">D</span> = On Destroy</span>
            <span className="text-gray-600">|</span>
            <span>Click <span className="text-blue-400 bg-blue-600 px-1 rounded">i</span> for details</span>
          </div>
        </div>

        {/* Card Detail Modal */}
        {detailCard && (
          <CardDetailModal
            card={detailCard}
            onClose={() => setDetailCard(null)}
            onSelect={() => handleCardSelect(detailCard)}
          />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: WAITING ROOM
  // ═══════════════════════════════════════════════════════════════════════════════

  if (view === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-yellow-400 mb-4">Waiting for Opponent</h1>
          <div className="bg-gray-800/50 border border-yellow-500/30 rounded-xl p-8 mb-6">
            <p className="text-gray-400 mb-2">Room Code</p>
            <p className="text-4xl font-mono font-bold text-yellow-400 tracking-wider">
              {currentMatch?.roomId || "..."}
            </p>
            <p className="text-sm text-gray-500 mt-2">Share this code with your opponent</p>
          </div>

          <div className="animate-pulse text-gray-400 mb-6">
            <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
            <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1 animation-delay-200"></span>
            <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animation-delay-400"></span>
          </div>

          <button
            onClick={handleCancelMatch}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            Cancel
          </button>
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

    // Helper for foil shimmer effect
    const getFoilClass = (foil: string | undefined) => {
      if (!foil || foil === "None" || foil === "none") return "";
      if (foil === "Prize" || foil === "prize") return "animate-pulse ring-2 ring-yellow-400/50";
      return "ring-1 ring-white/30";
    };

    // Detect active combos for display
    const getActiveCombosInLane = (laneIndex: number) => {
      const playerCards = gs.lanes[laneIndex].playerCards || [];
      return detectCombos(playerCards);
    };

    return (
      <div className="h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black flex flex-col overflow-hidden relative">
        {/* Starfield effect */}
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(131, 58, 180, 0.3) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(29, 78, 216, 0.2) 0%, transparent 30%)' }} />

        {/* Game Over Overlay */}
        {gs.gameOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className={`text-center animate-pulse ${
              gs.winner === "player" ? "text-green-400" : gs.winner === "cpu" ? "text-red-400" : "text-yellow-400"
            }`}>
              <div className="text-6xl font-black drop-shadow-2xl mb-2">
                {gs.winner === "player" ? "🏆 VICTORY!" : gs.winner === "cpu" ? "💀 DEFEAT" : "🤝 TIE"}
              </div>
              <div className="text-xl font-bold bg-black/50 px-4 py-2 rounded-lg">
                {gs.lanes.filter((l: any) => l.playerPower > l.cpuPower).length} - {gs.lanes.filter((l: any) => l.cpuPower > l.playerPower).length}
              </div>
            </div>
          </div>
        )}

        {/* Visual Effects Overlay */}
        {visualEffect && (
          <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
            {/* Explosion Effect */}
            {visualEffect.type === "explosion" && (
              <div className="animate-ping">
                <div className="text-8xl animate-bounce">💥</div>
                <div className="text-center mt-4 bg-red-600/80 px-6 py-2 rounded-xl">
                  <span className="text-2xl font-black text-white">{visualEffect.text}</span>
                </div>
              </div>
            )}
            {/* Charm Effect (Hearts) */}
            {visualEffect.type === "buff" && visualEffect.text?.includes("CHARM") && (
              <div className="relative w-full h-full">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-4xl animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 0.5}s`,
                      animationDuration: `${0.5 + Math.random() * 0.5}s`,
                    }}
                  >
                    💕
                  </div>
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-pink-600/80 px-8 py-4 rounded-xl animate-pulse">
                    <span className="text-3xl font-black text-white">💋 {visualEffect.text}</span>
                  </div>
                </div>
              </div>
            )}
            {/* Draw Effect */}
            {visualEffect.type === "draw" && (
              <div className="animate-bounce">
                <div className="text-6xl">🃏</div>
                <div className="text-center mt-2 bg-green-600/80 px-4 py-2 rounded-xl">
                  <span className="text-xl font-black text-white">{visualEffect.text || "+1 CARD"}</span>
                </div>
              </div>
            )}
            {/* Buff Effect */}
            {visualEffect.type === "buff" && !visualEffect.text?.includes("CHARM") && (
              <div className="animate-pulse">
                <div className="text-6xl">⬆️</div>
                <div className="text-center mt-2 bg-green-600/80 px-4 py-2 rounded-xl">
                  <span className="text-xl font-black text-white">{visualEffect.text}</span>
                </div>
              </div>
            )}
            {/* Debuff Effect */}
            {visualEffect.type === "debuff" && (
              <div className="animate-pulse">
                <div className="text-6xl">⬇️</div>
                <div className="text-center mt-2 bg-red-600/80 px-4 py-2 rounded-xl">
                  <span className="text-xl font-black text-white">{visualEffect.text}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="relative flex flex-col h-full z-10">

          {/* Top Bar - Player Avatars & Turn Indicator */}
          <div className="flex items-center justify-between px-4 py-2">
            {/* Player Avatar (left) - with dropdown */}
            <div className="relative flex items-center gap-2">
              <div
                className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400 overflow-hidden shadow-lg shadow-blue-500/40 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                {userProfile?.pfpUrl ? (
                  <img
                    src={userProfile.pfpUrl}
                    alt="You"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
              </div>
              <div className="text-xs">
                <p className="text-blue-400 font-bold truncate max-w-[60px]">
                  {userProfile?.displayName || userProfile?.username || "YOU"}
                </p>
                <p className="text-gray-400">{gs.lanes.filter((l: any) => l.playerPower > l.cpuPower).length} lanes</p>
              </div>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute top-16 left-0 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                  <div className="p-2 border-b border-gray-700 text-xs text-gray-400">
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
                  <div className="border-t border-gray-700">
                    <button
                      onClick={() => {
                        setIsPvE(false);
                        setPveGameState(null);
                        setView("lobby");
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900 flex items-center gap-2"
                    >
                      🏳️ Surrender
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Turn Indicator (center) */}
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full">
              <span className="text-xs text-gray-400">TURN</span>
              <span className="text-lg font-bold text-yellow-400">{gs.currentTurn}</span>
              <span className="text-xs text-gray-500">/ {TCG_CONFIG.TOTAL_TURNS}</span>
            </div>

            {/* CPU Avatar (right) */}
            <div className="flex items-center gap-2">
              <div className="text-xs text-right">
                <p className="text-red-400 font-bold">SKYNET</p>
                <p className="text-gray-400">{gs.lanes.filter((l: any) => l.cpuPower > l.playerPower).length} lanes</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-400 overflow-hidden shadow-lg shadow-red-500/40">
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

          {/* Battle Arena - 3 Lanes */}
          <div className="flex-1 flex items-center justify-center px-2 gap-2 min-h-0">
            {gs.lanes.map((lane: any, laneIndex: number) => {
              const status = getLaneStatus(lane);
              const activeCombos = getActiveCombosInLane(laneIndex);
              const laneBg = status === "winning" ? "from-green-900/40 to-green-950/60" :
                            status === "losing" ? "from-red-900/40 to-red-950/60" :
                            "from-purple-900/30 to-indigo-950/50";
              const laneBorder = status === "winning" ? "border-green-500 shadow-green-500/30" :
                                status === "losing" ? "border-red-500 shadow-red-500/30" :
                                "border-cyan-500/50 shadow-cyan-500/20";

              return (
                <div
                  key={lane.laneId}
                  className={`flex flex-col w-[32%] h-full rounded-xl border-2 bg-gradient-to-b ${laneBg} ${laneBorder} shadow-lg overflow-hidden`}
                >
                  {/* Lane Title Card */}
                  <div className={`relative mx-auto -mt-1 w-[90%] py-2 px-2 rounded-b-xl bg-gradient-to-b from-indigo-800 to-indigo-950 border-2 border-t-0 ${
                    status === "winning" ? "border-green-500" : status === "losing" ? "border-red-500" : "border-cyan-500/50"
                  }`}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-base">{lane.emoji || "🎯"}</span>
                      <span className="text-[10px] font-bold text-white truncate">{lane.name || `Lane ${laneIndex + 1}`}</span>
                    </div>
                    {/* Lane Effect Description */}
                    {lane.description && lane.effect !== "noEffect" && (
                      <div className={`text-center mt-0.5 px-1 py-0.5 rounded text-[7px] font-medium ${
                        lane.effect?.includes("buff") || lane.effect?.includes("gain") ? "bg-green-900/50 text-green-300" :
                        lane.effect?.includes("debuff") || lane.effect?.includes("destroy") ? "bg-red-900/50 text-red-300" :
                        lane.effect?.includes("swap") || lane.effect?.includes("gamble") || lane.effect?.includes("random") ? "bg-purple-900/50 text-purple-300" :
                        "bg-cyan-900/50 text-cyan-300"
                      }`}>
                        {lane.description}
                      </div>
                    )}
                    {/* Score badges */}
                    <div className="flex items-center justify-between mt-1">
                      <div className={`px-2 py-0.5 rounded text-xs font-bold ${status === "losing" ? "bg-red-600 text-white" : "bg-gray-700 text-gray-300"}`}>
                        {lane.cpuPower}
                      </div>
                      <div className={`px-2 py-0.5 rounded text-xs font-bold ${status === "winning" ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"}`}>
                        {lane.playerPower}
                      </div>
                    </div>
                  </div>

                  {/* CPU Cards (top) */}
                  <div className="flex-1 flex items-start justify-center pt-2 px-1">
                    <div className="flex -space-x-6">
                      {lane.cpuCards.map((card: any, idx: number) => {
                        const ability = getCardAbility(card.name);
                        return (
                          <div
                            key={idx}
                            onClick={() => setDetailCard(card)}
                            className={`relative w-14 h-20 rounded-lg border-2 border-red-500/70 bg-cover bg-center shadow-lg cursor-pointer hover:scale-110 hover:z-30 transition-transform ${getFoilClass(card.foil)}`}
                            style={{
                              backgroundImage: card.imageUrl ? `url(${card.imageUrl})` : undefined,
                              zIndex: idx
                            }}
                          >
                            {/* Power badge */}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-red-300 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white">{card.type === "nothing" ? Math.floor(card.power * 0.5) : card.power}</span>
                            </div>
                            {/* Ability indicator */}
                            {ability && (
                              <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                ability.type === "onReveal" ? "bg-orange-500" : ability.type === "ongoing" ? "bg-green-500" : "bg-purple-500"
                              }`}>
                                {ability.type === "onReveal" ? "R" : ability.type === "ongoing" ? "O" : "D"}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {lane.cpuCards.length === 0 && (
                        <div className="w-14 h-20 rounded-lg border-2 border-dashed border-red-500/30 bg-red-900/20" />
                      )}
                    </div>
                  </div>

                  {/* Center Divider with Combo Display */}
                  <div className="py-1 flex items-center justify-center">
                    {activeCombos.length > 0 ? (
                      <button
                        onClick={() => setDetailCombo(activeCombos[0].combo)}
                        className="bg-yellow-500/20 border border-yellow-500/50 rounded-full px-2 py-0.5 animate-pulse hover:bg-yellow-500/40 hover:scale-105 transition-all cursor-pointer"
                      >
                        <span className="text-[9px] text-yellow-400 font-bold">
                          {activeCombos[0].combo.emoji} {activeCombos[0].combo.name}
                        </span>
                      </button>
                    ) : (
                      <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-500 to-transparent" />
                    )}
                  </div>

                  {/* Player Cards (bottom) - clickable area */}
                  <div
                    className={`relative flex-1 flex items-end justify-center pb-2 px-1 rounded-b-lg transition-all ${
                      selectedHandCard !== null ? "bg-green-500/20 ring-2 ring-green-400/50 ring-inset cursor-pointer hover:bg-green-500/30" : ""
                    }`}
                    onClick={() => selectedHandCard !== null && handlePvEPlayCard(laneIndex)}
                  >
                    {selectedHandCard !== null && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <span className="text-green-400 text-sm font-bold animate-pulse bg-black/50 px-2 py-1 rounded">⬇ PLAY</span>
                      </div>
                    )}
                    <div className="flex -space-x-6">
                      {lane.playerCards.map((card: any, idx: number) => {
                        const ability = getCardAbility(card.name);
                        return (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailCard(card);
                            }}
                            className={`relative w-14 h-20 rounded-lg border-2 border-blue-500/70 bg-cover bg-center shadow-lg cursor-pointer hover:scale-110 hover:z-30 transition-transform ${getFoilClass(card.foil)}`}
                            style={{
                              backgroundImage: `url(${card.imageUrl})`,
                              zIndex: idx
                            }}
                          >
                            {/* Power badge */}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-2 border-blue-300 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white">{card.type === "nothing" ? Math.floor(card.power * 0.5) : card.power}</span>
                            </div>
                            {/* Ability indicator */}
                            {ability && (
                              <div className={`absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                ability.type === "onReveal" ? "bg-orange-500" : ability.type === "ongoing" ? "bg-green-500" : "bg-purple-500"
                              }`}>
                                {ability.type === "onReveal" ? "R" : ability.type === "ongoing" ? "O" : "D"}
                              </div>
                            )}
                            {/* LANDMINE Kamikaze Button */}
                            {(card.name || "").toLowerCase() === "landmine" && lane.cpuCards.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLandmineKamikaze(laneIndex, idx);
                                }}
                                className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-br from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center z-20 shadow-lg border-2 border-red-300 animate-pulse"
                                title="💥 Kamikaze: Destroy self + highest enemy"
                              >
                                💥
                              </button>
                            )}
                            {/* NAUGHTY SANTA Charm Button */}
                            {(card.name || "").toLowerCase() === "naughty santa" && lane.cpuCards.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSantaCharm(laneIndex, idx);
                                }}
                                className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-br from-pink-500 to-red-500 hover:from-pink-400 hover:to-red-400 rounded-full text-[10px] text-white font-bold flex items-center justify-center z-20 shadow-lg border-2 border-pink-300 animate-pulse"
                                title="💋 Charm: Seduce an enemy to your side"
                              >
                                💋
                              </button>
                            )}
                            {/* Charmed indicator */}
                            {card.charmed && (
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl pointer-events-none animate-pulse">
                                💕
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {lane.playerCards.length === 0 && !selectedHandCard && (
                        <div className="w-14 h-20 rounded-lg border-2 border-dashed border-blue-500/30 bg-blue-900/20" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hand - Bottom Bar */}
          <div className="bg-gradient-to-t from-black via-gray-900/95 to-transparent pt-4 pb-2 px-3">
            {/* Combo Preview when card is selected */}
            {selectedHandCard !== null && gs.playerHand?.[selectedHandCard] && (() => {
              const selectedCard = gs.playerHand[selectedHandCard];
              // Check potential combos for each lane
              const comboPreviews = gs.lanes.map((lane: any, laneIdx: number) => {
                const potentialCards = [...lane.playerCards, selectedCard];
                const combos = detectCombos(potentialCards);
                return { laneIdx, combos };
              }).filter((p: any) => p.combos.length > 0);

              if (comboPreviews.length > 0) {
                return (
                  <div className="flex justify-center gap-2 mb-2">
                    {comboPreviews.map((preview: any, pIdx: number) => (
                      <div key={pIdx} className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-3 py-1 animate-pulse">
                        <span className="text-[10px] text-yellow-400">
                          Lane {preview.laneIdx + 1}: {preview.combos[0].combo.emoji} {preview.combos[0].combo.name}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            {/* Cards */}
            <div className="flex justify-center gap-1 mb-3">
              {gs.playerHand?.map((card: any, idx: number) => {
                const ability = getCardAbility(card.name);
                const foilEffect = getFoilEffect(card.foil);
                const displayPower = card.type === "nothing" ? Math.floor(card.power * 0.5) : card.power;
                const foilPower = foilEffect ? Math.floor(displayPower * foilEffect.multiplier) : displayPower;
                // Check if Prize foil (FREE + Draw)
                const isPrizeFoil = card.foil === "Prize" || card.foil === "prize";
                // Calculate "cost" as energy needed (Prize foil = FREE)
                const baseCost = Math.max(1, Math.ceil(card.power / 30));
                const energyCost = isPrizeFoil ? 0 : baseCost;
                // Check if player can afford this card (Prize foil always affordable)
                const canAfford = isPrizeFoil || energyCost <= (gs.energy || 1);

                // Check if this card is part of any potential combo
                const cardNameLower = (card.name || "").toLowerCase();
                const hasComboPartner = CARD_COMBOS.some(combo => {
                  const comboCardsLower = combo.cards.map(c => c.toLowerCase());
                  if (!comboCardsLower.includes(cardNameLower)) return false;
                  // Check if any other card in hand or in lanes matches this combo
                  const otherHandCards = gs.playerHand.filter((_: any, i: number) => i !== idx);
                  const allLaneCards = gs.lanes.flatMap((l: any) => l.playerCards || []);
                  const allCards = [...otherHandCards, ...allLaneCards];
                  const matchCount = comboCardsLower.filter(cc =>
                    allCards.some((c: any) => (c.name || "").toLowerCase() === cc)
                  ).length;
                  return matchCount >= 1; // Has at least one combo partner available
                });

                // Find which combo this card could form
                const potentialCombo = hasComboPartner ? CARD_COMBOS.find(combo => {
                  const comboCardsLower = combo.cards.map(c => c.toLowerCase());
                  return comboCardsLower.includes(cardNameLower);
                }) : null;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (!canAfford) {
                        playSound("error");
                        return;
                      }
                      playSound("select");
                      setSelectedHandCard(selectedHandCard === idx ? null : idx);
                    }}
                    className={`relative flex-shrink-0 w-[60px] h-[85px] rounded-lg border-2 transition-all duration-200 bg-cover bg-center ${
                      !canAfford
                        ? "border-red-500/50 opacity-50 cursor-not-allowed grayscale"
                        : selectedHandCard === idx
                          ? "border-green-400 -translate-y-6 scale-110 z-20 shadow-xl shadow-green-500/50 cursor-pointer"
                          : hasComboPartner
                            ? "border-yellow-400 hover:-translate-y-2 hover:scale-105 ring-2 ring-yellow-400/50 cursor-pointer"
                            : `${RARITY_COLORS[card.rarity]?.split(" ")[0] || "border-gray-500"} hover:-translate-y-2 hover:scale-105 cursor-pointer`
                    } ${getFoilClass(card.foil)}`}
                    style={{ backgroundImage: `url(${card.imageUrl})`, zIndex: selectedHandCard === idx ? 20 : idx }}
                  >
                    {card.foil && card.foil !== "None" && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-yellow-400/20 rounded-lg pointer-events-none" />
                    )}
                    {/* Can't Afford Overlay */}
                    {!canAfford && (
                      <div className="absolute inset-0 bg-red-900/40 rounded-lg flex items-center justify-center pointer-events-none">
                        <span className="text-red-400 text-xl">⚡</span>
                      </div>
                    )}
                    {/* Energy Cost Badge (top-left) - Special for Prize foil */}
                    {isPrizeFoil ? (
                      <div className="absolute -top-2 -left-2 w-8 h-6 rounded-full border-2 flex items-center justify-center shadow-lg z-10 bg-gradient-to-br from-yellow-400 via-amber-300 to-yellow-500 border-yellow-200 animate-pulse">
                        <span className="text-[8px] font-black text-black">FREE</span>
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
                    {/* Prize Foil Draw Indicator */}
                    {isPrizeFoil && (
                      <div className="absolute top-6 -left-1 w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 border border-green-200 flex items-center justify-center shadow-lg z-10">
                        <span className="text-[8px]">🃏</span>
                      </div>
                    )}
                    {/* Power Badge (bottom-right) */}
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-2 border-yellow-200 flex items-center justify-center shadow-lg">
                      <span className="text-[10px] font-bold text-black">{foilPower}</span>
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
                    {card.type === "nothing" && (() => {
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
                <span className="text-gray-500 text-sm">No cards in hand</span>
              )}
            </div>

            {/* Bottom Action Bar - Marvel Snap Style */}
            <div className="flex items-center justify-between">
              {/* Back Button (left) */}
              <button
                onClick={() => {
                  setIsPvE(false);
                  setPveGameState(null);
                  setView("lobby");
                }}
                className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white font-bold py-2 px-4 rounded-lg text-sm border border-red-500 shadow-lg"
              >
                ← BACK
              </button>

              {/* Energy Orb (center) */}
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 via-cyan-300 to-blue-500 border-4 border-cyan-200 flex items-center justify-center shadow-lg shadow-cyan-400/50">
                <span className="text-xl font-bold text-white drop-shadow-lg">{gs.energy}</span>
              </div>

              {/* End Turn Button (right) */}
              <button
                onClick={handlePvEEndTurn}
                className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-bold py-2 px-4 rounded-lg text-sm border border-purple-400 shadow-lg"
              >
                END TURN <span className="text-yellow-300">{gs.currentTurn}/{TCG_CONFIG.TOTAL_TURNS}</span>
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
                <p className="text-xs text-yellow-300/70 mb-2 uppercase tracking-wider">Cards Required:</p>
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
                <p className="text-xs text-yellow-300/70 mb-1 uppercase tracking-wider">Bonus Effect:</p>
                <p className="text-yellow-100 font-bold">{detailCombo.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    detailCombo.bonus.type === "power" ? "bg-green-600" :
                    detailCombo.bonus.type === "steal" ? "bg-red-600" : "bg-blue-600"
                  }`}>
                    {detailCombo.bonus.type === "power" ? `+${detailCombo.bonus.value} Power` :
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
      </div>
    );
  }

  // PvP Battle
  if (view === "battle" && currentMatch?.gameState) {
    const gs = currentMatch.gameState;
    const isPlayer1 = currentMatch.player1Address === address?.toLowerCase();
    const myHand = isPlayer1 ? gs.player1Hand : gs.player2Hand;
    const myConfirmed = isPlayer1 ? gs.player1Confirmed : gs.player2Confirmed;
    const opponentConfirmed = isPlayer1 ? gs.player2Confirmed : gs.player1Confirmed;

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black p-2">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="text-sm">
            <span className="text-gray-400">Turn</span>
            <span className="text-yellow-400 font-bold ml-2">{gs.currentTurn}/{TCG_CONFIG.TOTAL_TURNS}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">Energy</span>
            <span className="text-blue-400 font-bold ml-2">{gs.energy}</span>
          </div>
          <div className="text-sm">
            <span className={myConfirmed ? "text-green-400" : "text-gray-400"}>
              {myConfirmed ? "Ready" : "Planning"}
            </span>
            <span className="text-gray-600 mx-2">|</span>
            <span className={opponentConfirmed ? "text-green-400" : "text-gray-400"}>
              {opponentConfirmed ? "Opponent Ready" : "Opponent Planning"}
            </span>
          </div>
        </div>

        {/* Lanes */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {gs.lanes.map((lane: any, laneIndex: number) => (
            <div
              key={lane.laneId}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-2 min-h-[300px]"
            >
              <div className="text-center text-sm text-gray-400 mb-2">
                Lane {laneIndex + 1}
              </div>

              {/* Opponent's cards */}
              <div className="min-h-[100px] border-b border-gray-700 pb-2 mb-2">
                <div className="text-xs text-gray-500 mb-1">Opponent ({lane[isPlayer1 ? "player2Power" : "player1Power"]})</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {(isPlayer1 ? lane.player2Cards : lane.player1Cards).map((card: any, idx: number) => (
                    <div
                      key={idx}
                      className="w-10 h-14 bg-red-900/50 border border-red-500/50 rounded text-center text-[8px] text-white flex flex-col justify-end p-0.5"
                    >
                      <span className="text-yellow-400 font-bold">{card.power}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* My cards */}
              <div
                className={`min-h-[100px] rounded-lg transition-colors ${
                  selectedHandCard !== null
                    ? "bg-green-500/20 border-2 border-dashed border-green-500 cursor-pointer"
                    : ""
                }`}
                onClick={() => selectedHandCard !== null && handlePlayCard(laneIndex)}
              >
                <div className="text-xs text-gray-500 mb-1">You ({lane[isPlayer1 ? "player1Power" : "player2Power"]})</div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {(isPlayer1 ? lane.player1Cards : lane.player2Cards).map((card: any, idx: number) => (
                    <div
                      key={idx}
                      className="w-10 h-14 bg-blue-900/50 border border-blue-500/50 rounded text-center text-[8px] text-white flex flex-col justify-end p-0.5"
                    >
                      <span className="truncate">{card.name}</span>
                      <span className="text-yellow-400 font-bold">{card.power}</span>
                    </div>
                  ))}
                </div>
                {selectedHandCard !== null && (
                  <p className="text-center text-xs text-green-400 mt-2">Click to play here</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Hand */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Your Hand ({myHand?.length || 0})</span>
            <button
              onClick={handleSubmitTurn}
              disabled={myConfirmed}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 text-black font-bold py-2 px-4 rounded-lg text-sm transition-colors"
            >
              {myConfirmed ? "Waiting..." : "End Turn"}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {myHand?.map((card: any, idx: number) => (
              <div
                key={idx}
                onClick={() => setSelectedHandCard(selectedHandCard === idx ? null : idx)}
                className={`flex-shrink-0 w-16 h-24 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 bg-cover bg-center ${
                  selectedHandCard === idx
                    ? "border-green-500 ring-2 ring-green-500/50 -translate-y-2"
                    : RARITY_COLORS[card.rarity] || "border-gray-500"
                }`}
                style={{ backgroundImage: `url(${card.imageUrl})` }}
              >
                <div className="w-full h-full bg-black/40 rounded-lg flex flex-col items-center justify-end p-1">
                  <span className="text-[8px] text-white truncate w-full text-center">{card.name}</span>
                  <span className="text-xs text-yellow-400 font-bold">
                    {card.type === "nothing" ? Math.floor(card.power * 0.5) : card.power}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
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

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <span className="text-xs text-green-400 bg-green-900/50 px-2 py-0.5 rounded mb-4 inline-block">CPU MODE</span>

          <h1
            className={`text-4xl font-bold mb-4 ${
              isDraw ? "text-gray-400" : isWinner ? "text-yellow-400" : "text-red-400"
            }`}
          >
            {isDraw ? "DRAW" : isWinner ? "VICTORY!" : "DEFEAT"}
          </h1>

          <div className="flex gap-4 justify-center mb-6">
            {pveGameState.lanes.map((lane: any, idx: number) => {
              const playerWon = lane.playerPower > lane.cpuPower;
              const isTie = lane.playerPower === lane.cpuPower;
              return (
                <div
                  key={idx}
                  className={`bg-gray-800/50 border-2 rounded-lg p-4 ${
                    playerWon ? "border-green-500" : isTie ? "border-gray-500" : "border-red-500"
                  }`}
                >
                  <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
                    <span>{lane.emoji || "🎯"}</span>
                    <span>{lane.name || `Lane ${idx + 1}`}</span>
                  </p>
                  <p className="text-lg font-bold">
                    <span className={playerWon ? "text-green-400" : "text-white"}>{lane.playerPower}</span>
                    <span className="text-gray-500 mx-2">vs</span>
                    <span className={!playerWon && !isTie ? "text-red-400" : "text-white"}>{lane.cpuPower}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {playerWon ? "✓ You won" : isTie ? "— Tie" : "✕ CPU won"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                // Play again
                startPvEMatch();
              }}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Play Again
            </button>
            <button
              onClick={() => {
                setIsPvE(false);
                setPveGameState(null);
                setView("lobby");
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Back to Lobby
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

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1
            className={`text-4xl font-bold mb-4 ${
              isDraw ? "text-gray-400" : isWinner ? "text-yellow-400" : "text-red-400"
            }`}
          >
            {isDraw ? "DRAW" : isWinner ? "VICTORY!" : "DEFEAT"}
          </h1>

          {currentMatch.laneResults && (
            <div className="flex gap-4 justify-center mb-6">
              {currentMatch.laneResults.map((lane: any, idx: number) => (
                <div
                  key={idx}
                  className={`bg-gray-800/50 border-2 rounded-lg p-4 ${
                    lane.winner === (currentMatch.player1Address === address?.toLowerCase() ? "player1" : "player2")
                      ? "border-green-500"
                      : lane.winner === "tie"
                      ? "border-gray-500"
                      : "border-red-500"
                  }`}
                >
                  <p className="text-sm text-gray-400">Lane {idx + 1}</p>
                  <p className="text-lg font-bold">
                    {lane.player1FinalPower} - {lane.player2FinalPower}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setCurrentMatchId(null);
              setView("lobby");
            }}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: LOADING
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="text-yellow-400 animate-pulse">Loading...</div>
    </div>
  );
}
