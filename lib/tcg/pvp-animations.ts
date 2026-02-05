/**
 * PvP Animation Builder - Detects state changes between turns and builds animation queue
 * Used to show ability effects, power changes, and combo announcements in PvP matches
 */

import { getCardAbility, getAbilityVisualEffect } from "./abilities";
import { detectCombos } from "./combos";
import type { DeckCard } from "@/lib/tcgRules";
import type { SoundType } from "./audio";

export interface AnimationEvent {
  type: "reveal" | "ability" | "buff" | "debuff" | "destroy" | "combo" | "sound";
  delay: number; // ms from start
  laneIndex: number;
  side: "player" | "enemy";
  cardIndex?: number;
  cardName?: string;
  soundType?: SoundType;
  visualEffect?: { type: string; text: string; emoji: string };
  powerChange?: number;
  comboId?: string;
}

/**
 * Compare previous and current PvP game state to build an animation queue.
 * Returns events sorted by delay for sequential playback.
 */
export function buildAnimationQueue(
  prevState: any,
  newState: any,
  myCardsKey: string,
  enemyCardsKey: string,
  myPowerKey: string,
  enemyPowerKey: string,
  t: (key: string) => string,
): AnimationEvent[] {
  const events: AnimationEvent[] = [];
  let delay = 0;

  if (!prevState?.lanes || !newState?.lanes) return events;

  newState.lanes.forEach((lane: any, laneIndex: number) => {
    const prevLane = prevState.lanes?.[laneIndex];
    if (!prevLane) return;

    const prevEnemyCards: DeckCard[] = prevLane[enemyCardsKey] || [];
    const currEnemyCards: DeckCard[] = lane[enemyCardsKey] || [];
    const prevMyCards: DeckCard[] = prevLane[myCardsKey] || [];
    const currMyCards: DeckCard[] = lane[myCardsKey] || [];

    // Detect new enemy cards with abilities
    if (currEnemyCards.length > prevEnemyCards.length) {
      const newCards = currEnemyCards.slice(prevEnemyCards.length);
      newCards.forEach((card, i) => {
        const cardIdx = prevEnemyCards.length + i;

        // Card reveal
        events.push({
          type: "reveal",
          delay,
          laneIndex,
          side: "enemy",
          cardIndex: cardIdx,
          cardName: card.name,
          soundType: "card",
        });
        delay += 200;

        // Ability effect
        const ability = getCardAbility(card.name, card, t);
        if (ability) {
          const visual = getAbilityVisualEffect(ability, card.name || "");
          events.push({
            type: "ability",
            delay,
            laneIndex,
            side: "enemy",
            cardIndex: cardIdx,
            cardName: card.name,
            soundType: "ability",
            visualEffect: visual || undefined,
          });
          delay += 400;
        }
      });
    }

    // Detect new player cards revealed
    if (currMyCards.length > prevMyCards.length) {
      const newCards = currMyCards.slice(prevMyCards.length);
      newCards.forEach((card, i) => {
        const cardIdx = prevMyCards.length + i;
        events.push({
          type: "reveal",
          delay,
          laneIndex,
          side: "player",
          cardIndex: cardIdx,
          cardName: card.name,
          soundType: "card",
        });
        delay += 200;

        const ability = getCardAbility(card.name, card, t);
        if (ability) {
          const visual = getAbilityVisualEffect(ability, card.name || "");
          events.push({
            type: "ability",
            delay,
            laneIndex,
            side: "player",
            cardIndex: cardIdx,
            cardName: card.name,
            soundType: "ability",
            visualEffect: visual || undefined,
          });
          delay += 400;
        }
      });
    }

    // Power changes (buff/debuff)
    const prevMyPower = prevLane[myPowerKey] || 0;
    const currMyPower = lane[myPowerKey] || 0;
    if (currMyPower !== prevMyPower) {
      const diff = currMyPower - prevMyPower;
      events.push({
        type: diff > 0 ? "buff" : "debuff",
        delay,
        laneIndex,
        side: "player",
        powerChange: diff,
        soundType: diff > 0 ? "buff" : "debuff",
      });
    }

    const prevEnemyPower = prevLane[enemyPowerKey] || 0;
    const currEnemyPower = lane[enemyPowerKey] || 0;
    if (currEnemyPower !== prevEnemyPower) {
      const diff = currEnemyPower - prevEnemyPower;
      events.push({
        type: diff > 0 ? "buff" : "debuff",
        delay,
        laneIndex,
        side: "enemy",
        powerChange: diff,
        soundType: diff > 0 ? "buff" : "debuff",
      });
    }

    // Destroyed cards
    if (currEnemyCards.length < prevEnemyCards.length) {
      events.push({
        type: "destroy",
        delay,
        laneIndex,
        side: "enemy",
        soundType: "bomb",
      });
      delay += 300;
    }
    if (currMyCards.length < prevMyCards.length) {
      events.push({
        type: "destroy",
        delay,
        laneIndex,
        side: "player",
        soundType: "bomb",
      });
      delay += 300;
    }
  });

  // Detect combos across all lanes
  newState.lanes.forEach((lane: any, laneIndex: number) => {
    [
      { cards: lane[myCardsKey] || [], side: "player" as const },
      { cards: lane[enemyCardsKey] || [], side: "enemy" as const },
    ].forEach(({ cards, side }) => {
      if (cards.length === 0) return;
      const combos = detectCombos(cards);
      combos.forEach(({ combo }) => {
        events.push({
          type: "combo",
          delay: delay + 600,
          laneIndex,
          side,
          comboId: combo.id,
        });
      });
    });
  });

  return events.sort((a, b) => a.delay - b.delay);
}
