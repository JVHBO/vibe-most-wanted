/**
 * TCG Frontend Types - Types exclusive to the frontend (not in tcgRules.ts)
 */

import type { DeckCard, GameLane, TCGAbility } from "@/lib/tcgRules";

// Re-export for convenience
export type { TCGCard, DeckCard, GameLane, TCGAbility, CardType, AbilityType, AbilityCategory, Rarity, ComboDefinition, ComboResult, ComboBonus, FoilEffect, DeckValidation } from "@/lib/tcgRules";

export type GameView = "lobby" | "deck-builder" | "waiting" | "battle" | "result";
export type GamePhase = "play" | "reveal" | "ability" | "ongoing" | "resolve";

export interface GameAction {
  type: "play" | "sacrifice-hand" | "sacrifice-lane";
  cardIndex: number;
  targetLane?: number;
  targetCardIndex?: number;
}

export interface CardPlayedInfo {
  cardId: string;
  laneIndex: number;
  energyCost: number;
  hadOnReveal: boolean;
}

export interface PvEGameState {
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

export interface CardCombo {
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
}

export interface BattleLogEntry {
  turn: number;
  player: "you" | "cpu" | "opponent";
  action: string;
  lane: number;
  cardName: string;
  abilityName?: string;
  effectType?: "buff" | "debuff" | "destroy" | "steal" | "draw" | "move" | "copy" | "special";
  targets?: string[];
  powerChange?: number;
  details?: string;
}

export interface VisualEffectState {
  type: "explosion" | "play" | "buff" | "debuff" | "draw" | "prize" | "destroy" | "steal" | "shuffle" | "copy" | "snipe" | "king" | "charm" | "reveal" | "shield" | "discard" | null;
  laneIndex?: number;
  position?: { x: number; y: number };
  text?: string;
  emoji?: string;
}

export interface CardAnimation {
  type: "shake" | "glow-green" | "glow-red" | "slide-out" | "spin" | "pulse" | "float-up" | "explode";
  powerChange?: number;
}

export interface AbilityEffectAnim {
  type: "attack" | "buff" | "steal" | "destroy";
  sourceLane: number;
  sourceSide: "player" | "cpu";
  targetLane: number;
  targetSide: "player" | "cpu";
  emoji: string;
  powerChange?: number;
}

export interface FlyingCardState {
  card: DeckCard;
  fromLane: number;
  fromSide: "player" | "cpu";
  toLane: number;
  toSide: "player" | "cpu";
  action: "kamikaze" | "charm" | "steal";
}

export interface VibeFIDComboModalState {
  laneIndex: number;
  card: DeckCard;
  possibleCombos: { combo: CardCombo; partnerCard: string }[];
}
