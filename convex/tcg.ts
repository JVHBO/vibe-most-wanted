/**
 * TCG - VIBE CLASH
 *
 * Marvel Snap style card game
 * - 3 lanes, simultaneous play
 * - 6 turns, energy 1→6
 * - 15 card deck (8+ VBMS, up to 7 Nothing)
 * - Nothing sacrifice mechanics
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TCG_CONFIG = {
  DECK_SIZE: 12,
  MIN_VBMS: 5,
  MAX_NOTHING: 7,
  INITIAL_HAND_SIZE: 3,
  CARDS_PER_TURN: 1,
  TOTAL_TURNS: 6,
  TURN_TIME_SECONDS: 20,
  LANES_COUNT: 3,
  NOTHING_POWER_MULTIPLIER: 0.5, // 50% power
  ROOM_EXPIRY_MINUTES: 10,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TCG ABILITIES - All 53 card abilities
// ═══════════════════════════════════════════════════════════════════════════════

const TCG_ABILITIES: Record<string, { type: string; effect: any }> = {
  // MYTHIC
  "neymar": { type: "onReveal", effect: { action: "buffAllLanes", value: 30 } },
  "anon": { type: "ongoing", effect: { action: "untargetable", buffPerTurn: 10 } },
  "linda xied": { type: "onReveal", effect: { action: "copyHighest", stealFromAll: 20 } },
  "vitalik jumpterin": { type: "ongoing", effect: { action: "reduceEnergyCost", value: 1 } },
  "jesse": { type: "onReveal", effect: { action: "destroyHighestEnemy", gainPower: true } },

  // LEGENDARY
  "antonio": { type: "onReveal", effect: { action: "buffPerCardInLane", value: 25 } },
  "goofy romero": { type: "onReveal", effect: { action: "shuffleEnemyLanes" } },
  "tukka": { type: "onReveal", effect: { action: "debuffLane", value: -20 } }, // Simplified from timeBomb
  "chilipepper": { type: "onReveal", effect: { action: "debuffLane", value: -30 } },
  "miguel": { type: "ongoing", effect: { action: "buffLaneOngoing", value: 15 } },
  "naughty santa": { type: "onReveal", effect: { action: "stealWeakest" } },
  "ye": { type: "onReveal", effect: { action: "draw", value: 3, bonusBuff: 10 } },
  "nico": { type: "ongoing", effect: { action: "adaptivePower" } },

  // EPIC
  "sartocrates": { type: "onReveal", effect: { action: "forceDiscardAndDraw", enemyDiscard: 1, selfDraw: 1 } },
  "0xdeployer": { type: "onReveal", effect: { action: "addCopyToHand", bonusPower: 10 } },
  "lombra jr": { type: "ongoing", effect: { action: "buffPerCardsPlayed", value: 5 } },
  "vibe intern": { type: "ongoing", effect: { action: "convertEnergyEndGame", powerPerEnergy: 8 } },
  "jack the sniper": { type: "onReveal", effect: { action: "debuffStrongest", value: -20, killBonus: 15 } },
  "beeper": { type: "onReveal", effect: { action: "buffAdjacent", value: 15, draw: 1 } },
  "horsefarts": { type: "onReveal", effect: { action: "debuffLane", value: -15 } }, // Simplified
  "jc denton": { type: "ongoing", effect: { action: "buffEachTurn", value: 8 } },
  "zurkchad": { type: "onReveal", effect: { action: "buffIfTurn", minTurn: 3, value: 30 } },
  "slaterg": { type: "onReveal", effect: { action: "buffPerEnemyInLane", basePower: 8, perEnemy: 5 } },
  "brian armstrong": { type: "onReveal", effect: { action: "buffByRarity", targetRarity: "Rare", value: 15 } },
  "nftkid": { type: "onReveal", effect: { action: "buffPerHandSize", multiplier: 10 } },

  // RARE
  "smolemaru": { type: "onReveal", effect: { action: "buffPerCardsPlayed", value: 8 } },
  "ventra": { type: "ongoing", effect: { action: "immuneToDebuff", bonusPower: 10 } },
  "bradymck": { type: "onReveal", effect: { action: "buffPerFriendly", value: 12 } },
  "shills": { type: "onReveal", effect: { action: "buffWeakest", value: 20 } },
  "betobutter": { type: "ongoing", effect: { action: "buffPerTurn", value: 6 } },
  "qrcodo": { type: "onReveal", effect: { action: "draw", value: 2 } },
  "loground": { type: "onReveal", effect: { action: "buffOtherLanes", value: 15 } },
  "melted": { type: "onReveal", effect: { action: "sacrificeBuffAll", value: 20 } },

  // COMMON
  "rachel": { type: "ongoing", effect: { action: "energyPerTurn", value: 1 } },
  "claude": { type: "ongoing", effect: { action: "buffPerCardInPlay", value: 4 } },
  "gozaru": { type: "ongoing", effect: { action: "buffLaneEndTurn", value: 3 } },
  "ink": { type: "ongoing", effect: { action: "destroyLoneCard", duration: 2 } },
  "casa": { type: "ongoing", effect: { action: "buffIfFirst", value: 12 } },
  "groko": { type: "onReveal", effect: { action: "buffPerRarity", targetRarity: "Common", value: 5 } },
  "rizkybegitu": { type: "onReveal", effect: { action: "gamble", win: 25, lose: -10 } },
  "thosmur": { type: "onReveal", effect: { action: "consumeEnergyForPower", powerPerEnergy: 5 } },
  "brainpasta": { type: "onReveal", effect: { action: "buffIfHandSize", minCards: 3, value: 15 } },
  "gaypt": { type: "onReveal", effect: { action: "copyPowerLeft", value: 10 } },
  "dan romero": { type: "ongoing", effect: { action: "reduceEnemyPower", value: 8 } },
  "morlacos": { type: "ongoing", effect: { action: "buffPerTurn", value: 8 } },
  "landmine": { type: "onReveal", effect: { action: "debuffStrongest", value: -20 } },
  "linux": { type: "onReveal", effect: { action: "buffByRarity", targetRarity: "Common", value: 8 } },
  "joonx": { type: "onReveal", effect: { action: "buffIfTurn", maxTurn: 1, value: 20 } },
  "don filthy": { type: "onReveal", effect: { action: "debuffStrongest", value: -12 } },
  "pooster": { type: "onReveal", effect: { action: "buffLastPlayed", value: 12 } },
  "john porn": { type: "onReveal", effect: { action: "debuffLane", value: -15 } },
  "scum": { type: "onReveal", effect: { action: "stealPower", value: 12 } },
  "vlady": { type: "onReveal", effect: { action: "moveRandom", bonusPower: 15 } },
};

// Card name aliases (on-chain name → ability lookup name)
const CARD_NAME_ALIASES: Record<string, string> = {
  "nicogay": "nico",
  "chilli": "chilipepper",
  "filthy": "don filthy",
  "vlad": "vlady",
  "shill": "shills",
  "beto": "betobutter",
  "proxy": "slaterg",
  "lombra": "lombra jr",
  "vibe": "vibe intern",
  "jack": "jack the sniper",
  "horsefacts": "horsefarts",
  "jc": "jc denton",
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crypto-secure shuffle
 */
function shuffleDeck<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const j = randomBytes[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate unique room ID
 */
function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const randomBytes = new Uint32Array(6);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < 6; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * Draw initial hand - ensures at least 1 VBMS in hand
 */
function drawInitialHand(deck: any[]): { hand: any[]; remaining: any[] } {
  const shuffled = shuffleDeck(deck);
  const hand: any[] = [];
  const remaining = [...shuffled];

  // Draw INITIAL_HAND_SIZE cards
  for (let i = 0; i < TCG_CONFIG.INITIAL_HAND_SIZE && remaining.length > 0; i++) {
    hand.push(remaining.shift());
  }

  return { hand, remaining };
}

/**
 * Draw card for turn - Turn 1 guarantees VBMS
 */
function drawCard(deck: any[], turn: number): { card: any | null; remaining: any[] } {
  if (deck.length === 0) {
    return { card: null, remaining: deck };
  }

  const remaining = [...deck];

  if (turn === 1) {
    // Turn 1: Guarantee VBMS
    const vbmsIndex = remaining.findIndex(c => c.type === "vbms");
    if (vbmsIndex !== -1) {
      const card = remaining.splice(vbmsIndex, 1)[0];
      return { card, remaining };
    }
  }

  // Random draw
  const card = remaining.shift();
  return { card: card || null, remaining };
}

/**
 * Calculate card power (Nothing has 50% penalty)
 */
function calculateCardPower(card: any): number {
  const basePower = card.power || 0;
  if (card.type === "nothing") {
    return Math.floor(basePower * TCG_CONFIG.NOTHING_POWER_MULTIPLIER);
  }
  return basePower;
}

/**
 * Calculate lane power
 */
function calculateLanePower(cards: any[]): number {
  return cards.reduce((sum, card) => sum + calculateCardPower(card), 0);
}

/**
 * Get card ability by name
 */
function getCardAbility(cardName: string): { type: string; effect: any } | null {
  if (!cardName) return null;
  const normalized = cardName.toLowerCase().trim();
  const aliased = CARD_NAME_ALIASES[normalized] || normalized;
  return TCG_ABILITIES[aliased] || null;
}

/**
 * Apply onReveal ability when card is played
 * Returns: { bonusPower, newHand, newDeck, lanes, energyConsumed }
 */
function applyOnRevealAbility(
  card: any,
  laneIndex: number,
  lanes: any[],
  myCards: string,
  enemyCards: string,
  myPower: string,
  enemyPower: string,
  hand: any[],
  deck: any[],
  currentTurn: number,
  totalCardsPlayed: number
): { bonusPower: number; hand: any[]; deck: any[]; lanes: any[]; energyConsumed: number } {
  const ability = getCardAbility(card.name);
  if (!ability || ability.type !== "onReveal") {
    return { bonusPower: 0, hand, deck, lanes, energyConsumed: 0 };
  }

  const effect = ability.effect;
  let bonusPower = 0;
  let newHand = [...hand];
  let newDeck = [...deck];
  let newLanes = lanes.map((l: any) => ({
    ...l,
    player1Cards: [...l.player1Cards],
    player2Cards: [...l.player2Cards],
  }));
  let energyConsumed = 0;

  switch (effect.action) {
    case "buffAdjacent":
      // +X power to ALL other cards in this lane
      newLanes[laneIndex][myCards].forEach((c: any, idx: number) => {
        newLanes[laneIndex][myCards][idx] = { ...c, power: c.power + (effect.value || 0) };
      });
      newLanes[laneIndex][myPower] += newLanes[laneIndex][myCards].length * (effect.value || 0);
      // Handle draw
      if (effect.draw && effect.draw > 0) {
        for (let i = 0; i < effect.draw && newDeck.length > 0; i++) {
          newHand.push(newDeck.shift());
        }
      }
      break;

    case "buffOtherLanes":
      // +X power to all cards in OTHER lanes
      newLanes.forEach((lane: any, idx: number) => {
        if (idx !== laneIndex) {
          lane[myCards].forEach((c: any, cIdx: number) => {
            lane[myCards][cIdx] = { ...c, power: c.power + (effect.value || 0) };
          });
          lane[myPower] += lane[myCards].length * (effect.value || 0);
        }
      });
      break;

    case "buffAllLanes":
      // +X power to ALL my cards in ALL lanes
      newLanes.forEach((lane: any) => {
        lane[myCards].forEach((c: any, cIdx: number) => {
          lane[myCards][cIdx] = { ...c, power: c.power + (effect.value || 0) };
        });
        lane[myPower] += lane[myCards].length * (effect.value || 0);
      });
      bonusPower = effect.value || 0; // Also buff self
      break;

    case "debuffLane":
      // -X power to all enemy cards in this lane
      newLanes[laneIndex][enemyCards].forEach((c: any, cIdx: number) => {
        const reduction = Math.abs(effect.value || 0);
        newLanes[laneIndex][enemyCards][cIdx] = { ...c, power: Math.max(0, c.power - reduction) };
      });
      newLanes[laneIndex][enemyPower] = Math.max(0,
        newLanes[laneIndex][enemyPower] - (newLanes[laneIndex][enemyCards].length * Math.abs(effect.value || 0))
      );
      break;

    case "debuffStrongest": {
      // -X power to the strongest enemy card
      let strongestCard: any = null;
      let strongestLane = -1;
      let strongestIdx = -1;
      newLanes.forEach((lane: any, lIdx: number) => {
        lane[enemyCards].forEach((c: any, cIdx: number) => {
          if (!strongestCard || c.power > strongestCard.power) {
            strongestCard = c;
            strongestLane = lIdx;
            strongestIdx = cIdx;
          }
        });
      });
      if (strongestCard && strongestLane >= 0) {
        const reduction = Math.abs(effect.value || 0);
        const newPowerValue = Math.max(0, strongestCard.power - reduction);
        newLanes[strongestLane][enemyCards][strongestIdx] = { ...strongestCard, power: newPowerValue };
        newLanes[strongestLane][enemyPower] = Math.max(0, newLanes[strongestLane][enemyPower] - reduction);
        // Kill bonus
        if (newPowerValue === 0 && effect.killBonus) {
          bonusPower = effect.killBonus;
        }
      }
      break;
    }

    case "destroyHighestEnemy": {
      // DESTROY highest power enemy card
      let highestCard: any = null;
      let highestLane = -1;
      let highestIdx = -1;
      newLanes.forEach((lane: any, lIdx: number) => {
        lane[enemyCards].forEach((c: any, cIdx: number) => {
          if (!highestCard || c.power > highestCard.power) {
            highestCard = c;
            highestLane = lIdx;
            highestIdx = cIdx;
          }
        });
      });
      if (highestCard && highestLane >= 0) {
        const destroyedPower = highestCard.power;
        newLanes[highestLane][enemyCards].splice(highestIdx, 1);
        newLanes[highestLane][enemyPower] = Math.max(0, newLanes[highestLane][enemyPower] - destroyedPower);
        if (effect.gainPower) {
          bonusPower = destroyedPower;
        }
      }
      break;
    }

    case "draw":
      // Draw X cards
      for (let i = 0; i < (effect.value || 1) && newDeck.length > 0; i++) {
        newHand.push(newDeck.shift());
      }
      // Bonus buff to all cards
      if (effect.bonusBuff) {
        newLanes.forEach((lane: any) => {
          lane[myCards].forEach((c: any, cIdx: number) => {
            lane[myCards][cIdx] = { ...c, power: c.power + effect.bonusBuff };
          });
          lane[myPower] += lane[myCards].length * effect.bonusBuff;
        });
        bonusPower = effect.bonusBuff;
      }
      break;

    case "stealPower": {
      // Steal power from enemy in lane
      if (newLanes[laneIndex][enemyCards].length > 0) {
        const targetIdx = Math.floor(Math.random() * newLanes[laneIndex][enemyCards].length);
        const target = newLanes[laneIndex][enemyCards][targetIdx];
        const stealAmount = Math.min(effect.value || 0, target.power);
        newLanes[laneIndex][enemyCards][targetIdx] = { ...target, power: target.power - stealAmount };
        newLanes[laneIndex][enemyPower] -= stealAmount;
        bonusPower = stealAmount;
      }
      break;
    }

    case "stealWeakest": {
      // Steal weakest enemy card to your side
      let weakestCard: any = null;
      let weakestLane = -1;
      let weakestIdx = -1;
      newLanes.forEach((lane: any, lIdx: number) => {
        lane[enemyCards].forEach((c: any, cIdx: number) => {
          if (!weakestCard || c.power < weakestCard.power) {
            weakestCard = c;
            weakestLane = lIdx;
            weakestIdx = cIdx;
          }
        });
      });
      if (weakestCard && weakestLane >= 0) {
        const stolenCard = newLanes[weakestLane][enemyCards].splice(weakestIdx, 1)[0];
        newLanes[weakestLane][enemyPower] -= stolenCard.power;
        newLanes[laneIndex][myCards].push(stolenCard);
        newLanes[laneIndex][myPower] += stolenCard.power;
      }
      break;
    }

    case "buffPerCardInLane":
      // +X power for each card in this lane
      const cardsInLane = newLanes[laneIndex][myCards].length + 1; // +1 for self
      bonusPower = cardsInLane * (effect.value || 0);
      break;

    case "buffPerFriendly": {
      // +X power for each friendly card on field
      let friendlyCount = 0;
      newLanes.forEach((lane: any) => {
        friendlyCount += lane[myCards].length;
      });
      bonusPower = friendlyCount * (effect.value || 0);
      break;
    }

    case "buffPerEnemyInLane":
      // +basePower + perEnemy for each enemy in lane
      const enemiesInLane = newLanes[laneIndex][enemyCards].length;
      bonusPower = (effect.basePower || 0) + (enemiesInLane * (effect.perEnemy || 0));
      break;

    case "buffWeakest": {
      // +X power to weakest friendly card
      let weakest: any = null;
      let weakestLane = -1;
      let weakestIdx = -1;
      newLanes.forEach((lane: any, lIdx: number) => {
        lane[myCards].forEach((c: any, cIdx: number) => {
          if (!weakest || c.power < weakest.power) {
            weakest = c;
            weakestLane = lIdx;
            weakestIdx = cIdx;
          }
        });
      });
      if (weakest && weakestLane >= 0) {
        newLanes[weakestLane][myCards][weakestIdx] = { ...weakest, power: weakest.power + (effect.value || 0) };
        newLanes[weakestLane][myPower] += effect.value || 0;
      }
      break;
    }

    case "buffLastPlayed": {
      // +X power to last card played
      for (let i = newLanes.length - 1; i >= 0; i--) {
        if (newLanes[i][myCards].length > 0) {
          const lastIdx = newLanes[i][myCards].length - 1;
          const lastCard = newLanes[i][myCards][lastIdx];
          const buffValue = (lastCard.rarity === "Rare" || lastCard.rarity === "Epic" || lastCard.rarity === "Legendary" || lastCard.rarity === "Mythic")
            ? (effect.rareBonus || effect.value || 0)
            : (effect.value || 0);
          newLanes[i][myCards][lastIdx] = { ...lastCard, power: lastCard.power + buffValue };
          newLanes[i][myPower] += buffValue;
          break;
        }
      }
      break;
    }

    case "addCopyToHand":
      // Add copy of this card to hand
      newHand.push({ ...card, cardId: `${card.cardId}-copy-${Date.now()}` });
      bonusPower = effect.bonusPower || 0;
      break;

    case "gamble":
      // 50% chance win or lose
      if (Math.random() > 0.5) {
        bonusPower = effect.win || 0;
      } else {
        bonusPower = effect.lose || 0;
      }
      break;

    case "buffIfTurn":
      // +X power if specific turn condition
      if (effect.minTurn && currentTurn >= effect.minTurn) {
        bonusPower = effect.value || 0;
      } else if (effect.maxTurn && currentTurn <= effect.maxTurn) {
        bonusPower = effect.value || 0;
      }
      break;

    case "buffIfHandSize":
      // +X power if hand size >= X
      if (newHand.length >= (effect.minCards || 0)) {
        bonusPower = effect.value || 0;
      }
      break;

    case "buffPerCardsPlayed":
      // +X power per card played this game
      bonusPower = totalCardsPlayed * (effect.value || 0);
      break;

    case "buffByRarity": {
      // +X power to all cards of specific rarity
      const targetRarity = effect.targetRarity;
      newLanes.forEach((lane: any) => {
        lane[myCards].forEach((c: any, cIdx: number) => {
          if (c.rarity === targetRarity) {
            lane[myCards][cIdx] = { ...c, power: c.power + (effect.value || 0) };
            lane[myPower] += effect.value || 0;
          }
        });
      });
      break;
    }

    case "buffPerRarity": {
      // +X power per card of specific rarity on field
      const targetRarity = effect.targetRarity;
      let count = 0;
      newLanes.forEach((lane: any) => {
        lane[myCards].forEach((c: any) => {
          if (c.rarity === targetRarity) count++;
        });
      });
      bonusPower = count * (effect.value || 0);
      break;
    }

    case "buffPerHandSize":
      // +X power per card in hand
      bonusPower = newHand.length * (effect.multiplier || 0);
      break;

    case "consumeEnergyForPower":
      // Consume all remaining energy for power
      // Note: energy handling would need to be passed in, simplified here
      energyConsumed = currentTurn; // Consume up to current turn energy
      bonusPower = energyConsumed * (effect.powerPerEnergy || 5);
      break;

    case "copyPowerLeft": {
      // Copy power from card to the left
      const myCardsInThisLane = newLanes[laneIndex][myCards];
      if (myCardsInThisLane.length > 0) {
        const leftCard = myCardsInThisLane[myCardsInThisLane.length - 1];
        bonusPower = Math.floor(leftCard.power * 0.5) + (effect.value || 0);
      } else {
        bonusPower = effect.value || 0;
      }
      break;
    }

    case "copyHighest": {
      // Copy power of highest card on field + steal from all
      let highestPower = 0;
      newLanes.forEach((lane: any) => {
        lane[myCards].forEach((c: any) => { if (c.power > highestPower) highestPower = c.power; });
        lane[enemyCards].forEach((c: any) => { if (c.power > highestPower) highestPower = c.power; });
      });
      bonusPower = Math.max(0, highestPower - card.power);
      // Steal from all enemies
      if (effect.stealFromAll) {
        newLanes.forEach((lane: any) => {
          lane[enemyCards].forEach((c: any, cIdx: number) => {
            const stealAmount = Math.min(effect.stealFromAll, c.power);
            lane[enemyCards][cIdx] = { ...c, power: c.power - stealAmount };
            lane[enemyPower] -= stealAmount;
          });
        });
      }
      break;
    }

    case "shuffleEnemyLanes": {
      // Shuffle all enemy cards between lanes
      const allEnemyCards: any[] = [];
      newLanes.forEach((lane: any) => {
        allEnemyCards.push(...lane[enemyCards]);
        lane[enemyCards] = [];
        lane[enemyPower] = 0;
      });
      // Redistribute randomly
      for (const c of shuffleDeck(allEnemyCards)) {
        const randomLane = Math.floor(Math.random() * 3);
        newLanes[randomLane][enemyCards].push(c);
        newLanes[randomLane][enemyPower] += calculateCardPower(c);
      }
      break;
    }

    case "forceDiscardAndDraw":
      // Force enemy to discard, you draw
      // Note: Can't affect enemy hand in simultaneous play, simplified to just draw
      for (let i = 0; i < (effect.selfDraw || 1) && newDeck.length > 0; i++) {
        newHand.push(newDeck.shift());
      }
      break;

    case "sacrificeBuffAll":
      // Destroy self and buff all allies
      newLanes.forEach((lane: any) => {
        lane[myCards].forEach((c: any, cIdx: number) => {
          lane[myCards][cIdx] = { ...c, power: c.power + (effect.value || 0) };
        });
        lane[myPower] += lane[myCards].length * (effect.value || 0);
      });
      // Mark card for destruction (power = 0)
      bonusPower = -card.power; // Will make power 0
      break;

    case "moveRandom":
      // Move to random lane with bonus power
      bonusPower = effect.bonusPower || 0;
      // Note: Actual lane change handled separately
      break;

    default:
      // Unknown action, no effect
      break;
  }

  return { bonusPower, hand: newHand, deck: newDeck, lanes: newLanes, energyConsumed };
}

/**
 * Apply ongoing abilities at end of turn
 */
function applyOngoingAbilities(
  lanes: any[],
  player1Cards: string,
  player2Cards: string,
  player1Power: string,
  player2Power: string,
  currentTurn: number
): any[] {
  let newLanes = lanes.map((l: any) => ({
    ...l,
    player1Cards: [...l.player1Cards],
    player2Cards: [...l.player2Cards],
  }));

  // Process each card's ongoing ability
  for (let laneIdx = 0; laneIdx < 3; laneIdx++) {
    // Player 1 cards
    for (let cardIdx = 0; cardIdx < newLanes[laneIdx][player1Cards].length; cardIdx++) {
      const card = newLanes[laneIdx][player1Cards][cardIdx];
      const ability = getCardAbility(card.name);
      if (!ability || ability.type !== "ongoing") continue;

      const effect = ability.effect;
      switch (effect.action) {
        case "buffEachTurn":
        case "buffPerTurn":
          newLanes[laneIdx][player1Cards][cardIdx] = { ...card, power: card.power + (effect.value || 0) };
          newLanes[laneIdx][player1Power] += effect.value || 0;
          break;

        case "buffLaneOngoing":
          // Buff all other cards in lane
          newLanes[laneIdx][player1Cards].forEach((c: any, idx: number) => {
            if (idx !== cardIdx) {
              newLanes[laneIdx][player1Cards][idx] = { ...c, power: c.power + (effect.value || 0) };
              newLanes[laneIdx][player1Power] += effect.value || 0;
            }
          });
          break;

        case "buffLaneEndTurn":
          // Buff all cards in lane (including self)
          newLanes[laneIdx][player1Cards].forEach((c: any, idx: number) => {
            newLanes[laneIdx][player1Cards][idx] = { ...c, power: c.power + (effect.value || 0) };
          });
          newLanes[laneIdx][player1Power] += newLanes[laneIdx][player1Cards].length * (effect.value || 0);
          break;

        case "buffPerCardInPlay": {
          // +X for each card in play
          let totalCards = 0;
          newLanes.forEach((lane: any) => {
            totalCards += lane[player1Cards].length + lane[player2Cards].length;
          });
          const buff = totalCards * (effect.value || 0);
          newLanes[laneIdx][player1Cards][cardIdx] = { ...card, power: card.power + buff };
          newLanes[laneIdx][player1Power] += buff;
          break;
        }

        case "untargetable":
          // Immune + buff per turn
          if (effect.buffPerTurn) {
            newLanes[laneIdx][player1Cards][cardIdx] = { ...card, power: card.power + effect.buffPerTurn };
            newLanes[laneIdx][player1Power] += effect.buffPerTurn;
          }
          break;

        case "reduceEnemyPower":
          // Reduce all enemy cards in this lane
          newLanes[laneIdx][player2Cards].forEach((c: any, idx: number) => {
            const reduction = Math.min(effect.value || 0, c.power);
            newLanes[laneIdx][player2Cards][idx] = { ...c, power: c.power - reduction };
            newLanes[laneIdx][player2Power] -= reduction;
          });
          break;
      }
    }

    // Player 2 cards (same logic, swapped)
    for (let cardIdx = 0; cardIdx < newLanes[laneIdx][player2Cards].length; cardIdx++) {
      const card = newLanes[laneIdx][player2Cards][cardIdx];
      const ability = getCardAbility(card.name);
      if (!ability || ability.type !== "ongoing") continue;

      const effect = ability.effect;
      switch (effect.action) {
        case "buffEachTurn":
        case "buffPerTurn":
          newLanes[laneIdx][player2Cards][cardIdx] = { ...card, power: card.power + (effect.value || 0) };
          newLanes[laneIdx][player2Power] += effect.value || 0;
          break;

        case "buffLaneOngoing":
          newLanes[laneIdx][player2Cards].forEach((c: any, idx: number) => {
            if (idx !== cardIdx) {
              newLanes[laneIdx][player2Cards][idx] = { ...c, power: c.power + (effect.value || 0) };
              newLanes[laneIdx][player2Power] += effect.value || 0;
            }
          });
          break;

        case "buffLaneEndTurn":
          newLanes[laneIdx][player2Cards].forEach((c: any, idx: number) => {
            newLanes[laneIdx][player2Cards][idx] = { ...c, power: c.power + (effect.value || 0) };
          });
          newLanes[laneIdx][player2Power] += newLanes[laneIdx][player2Cards].length * (effect.value || 0);
          break;

        case "buffPerCardInPlay": {
          let totalCards = 0;
          newLanes.forEach((lane: any) => {
            totalCards += lane[player1Cards].length + lane[player2Cards].length;
          });
          const buff = totalCards * (effect.value || 0);
          newLanes[laneIdx][player2Cards][cardIdx] = { ...card, power: card.power + buff };
          newLanes[laneIdx][player2Power] += buff;
          break;
        }

        case "untargetable":
          if (effect.buffPerTurn) {
            newLanes[laneIdx][player2Cards][cardIdx] = { ...card, power: card.power + effect.buffPerTurn };
            newLanes[laneIdx][player2Power] += effect.buffPerTurn;
          }
          break;

        case "reduceEnemyPower":
          newLanes[laneIdx][player1Cards].forEach((c: any, idx: number) => {
            const reduction = Math.min(effect.value || 0, c.power);
            newLanes[laneIdx][player1Cards][idx] = { ...c, power: c.power - reduction };
            newLanes[laneIdx][player1Power] -= reduction;
          });
          break;
      }
    }
  }

  return newLanes;
}

/**
 * Count total cards played by a player
 */
function countCardsPlayed(lanes: any[], playerCards: string): number {
  let count = 0;
  lanes.forEach((lane: any) => {
    count += lane[playerCards].length;
  });
  return count;
}

/**
 * Get card energy cost based on rarity
 */
function getCardEnergyCost(card: any): number {
  if (!card || !card.rarity) return 1;
  switch (card.rarity.toLowerCase()) {
    case "mythic": return 6;
    case "legendary": return 5;
    case "epic": return 4;
    case "rare": return 3;
    case "common": return 2;
    default: return 1;
  }
}

/**
 * Crypto-secure random boolean (dice roll)
 */
function randomCoinFlip(): boolean {
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  return randomBytes[0] % 2 === 0;
}

/**
 * Initialize empty game state
 */
function initializeGameState(player1Deck: any[], player2Deck: any[]) {
  const p1Shuffled = shuffleDeck(player1Deck);
  const p2Shuffled = shuffleDeck(player2Deck);

  const p1Initial = drawInitialHand(p1Shuffled);
  const p2Initial = drawInitialHand(p2Shuffled);

  return {
    currentTurn: 1,
    energy: 1,
    phase: "draw" as const,
    turnEndsAt: Date.now() + (TCG_CONFIG.TURN_TIME_SECONDS * 1000),

    player1Hand: p1Initial.hand,
    player2Hand: p2Initial.hand,
    player1DeckRemaining: p1Initial.remaining,
    player2DeckRemaining: p2Initial.remaining,

    lanes: [
      { laneId: 0, player1Cards: [], player2Cards: [], player1Power: 0, player2Power: 0 },
      { laneId: 1, player1Cards: [], player2Cards: [], player1Power: 0, player2Power: 0 },
      { laneId: 2, player1Cards: [], player2Cards: [], player1Power: 0, player2Power: 0 },
    ],

    player1Actions: [],
    player2Actions: [],
    player1Confirmed: false,
    player2Confirmed: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get match by room ID
 */
export const getMatch = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db
      .query("tcgMatches")
      .withIndex("by_room_id", (q: any) => q.eq("roomId", args.roomId))
      .first();

    return match;
  },
});

/**
 * Get match by ID
 */
export const getMatchById = query({
  args: { matchId: v.id("tcgMatches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.matchId);
  },
});

/**
 * Get player's saved decks
 */
export const getPlayerDecks = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const decks = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address", (q: any) => q.eq("address", args.address.toLowerCase()))
      .take(20);

    return decks;
  },
});

/**
 * Get player's active deck
 */
export const getActiveDeck = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const deck = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address_active", (q: any) =>
        q.eq("address", args.address.toLowerCase()).eq("isActive", true)
      )
      .first();

    return deck;
  },
});

/**
 * Get player's match history
 */
export const getPlayerHistory = query({
  args: {
    address: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const addr = args.address.toLowerCase();

    // Get matches where player was player1 or player2
    const asPlayer1 = await ctx.db
      .query("tcgHistory")
      .withIndex("by_player1", (q: any) => q.eq("player1Address", addr))
      .order("desc")
      .take(limit);

    const asPlayer2 = await ctx.db
      .query("tcgHistory")
      .withIndex("by_player2", (q: any) => q.eq("player2Address", addr))
      .order("desc")
      .take(limit);

    // Merge and sort by finishedAt
    const all = [...asPlayer1, ...asPlayer2]
      .sort((a, b) => b.finishedAt - a.finishedAt)
      .slice(0, limit);

    return all;
  },
});

/**
 * Get waiting rooms for matchmaking
 */
export const getWaitingRooms = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("tcgMatches")
      .withIndex("by_status", (q: any) => q.eq("status", "waiting"))
      .order("desc")
      .take(20);

    return rooms;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS - DECK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save a new deck
 */
export const saveDeck = mutation({
  args: {
    address: v.string(),
    deckName: v.string(),
    cards: v.array(v.object({
      type: v.union(v.literal("vbms"), v.literal("nothing"), v.literal("vibefid"), v.literal("other")),
      cardId: v.string(),
      name: v.optional(v.string()),
      rarity: v.string(),
      power: v.number(),
      imageUrl: v.string(),
      foil: v.optional(v.string()),
      wear: v.optional(v.string()),
      collection: v.optional(v.string()),
    })),
    setActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Validate deck
    const vbmsCount = args.cards.filter(c => c.type === "vbms").length;
    const vibefidCount = args.cards.filter(c => c.type === "vibefid").length;
    const nothingCount = args.cards.filter(c => c.type === "nothing").length;
    const otherCount = args.cards.filter(c => c.type === "other").length;
    const halfPowerCount = nothingCount + otherCount; // Both have 50% power penalty

    if (args.cards.length !== TCG_CONFIG.DECK_SIZE) {
      throw new Error(`Deck must have exactly ${TCG_CONFIG.DECK_SIZE} cards`);
    }

    // Require minimum VBMS or VibeFID cards
    if (vbmsCount + vibefidCount < TCG_CONFIG.MIN_VBMS) {
      throw new Error(`Deck must have at least ${TCG_CONFIG.MIN_VBMS} VBMS/VibeFID cards`);
    }

    if (halfPowerCount > TCG_CONFIG.MAX_NOTHING) {
      throw new Error(`Deck can have at most ${TCG_CONFIG.MAX_NOTHING} Nothing/Other cards`);
    }

    // Calculate total power (nothing and other have 50% penalty)
    const totalPower = args.cards.reduce((sum, card) => {
      const power = (card.type === "nothing" || card.type === "other")
        ? Math.floor(card.power * TCG_CONFIG.NOTHING_POWER_MULTIPLIER)
        : card.power;
      return sum + power;
    }, 0);

    // If setActive, deactivate other decks first
    if (args.setActive) {
      const existingDecks = await ctx.db
        .query("tcgDecks")
        .withIndex("by_address", (q: any) => q.eq("address", addr))
        .take(50);

      for (const deck of existingDecks) {
        if (deck.isActive) {
          await ctx.db.patch(deck._id, { isActive: false });
        }
      }
    }

    // Save deck
    const deckId = await ctx.db.insert("tcgDecks", {
      address: addr,
      deckName: args.deckName,
      cards: args.cards,
      vbmsCount,
      nothingCount,
      totalPower,
      isActive: args.setActive || false,
      createdAt: Date.now(),
    });

    return { deckId, totalPower };
  },
});

/**
 * Set active deck
 */
export const setActiveDeck = mutation({
  args: {
    address: v.string(),
    deckId: v.id("tcgDecks"),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Verify ownership
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.address !== addr) {
      throw new Error("Deck not found");
    }

    // Deactivate other decks
    const existingDecks = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .take(50);

    for (const d of existingDecks) {
      if (d.isActive && d._id !== args.deckId) {
        await ctx.db.patch(d._id, { isActive: false });
      }
    }

    // Activate this deck
    await ctx.db.patch(args.deckId, { isActive: true });

    return { success: true };
  },
});

/**
 * Delete a deck
 */
export const deleteDeck = mutation({
  args: {
    address: v.string(),
    deckId: v.id("tcgDecks"),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.address !== addr) {
      throw new Error("Deck not found");
    }

    await ctx.db.delete(args.deckId);

    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS - MATCH MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new match room
 */
export const createMatch = mutation({
  args: {
    address: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Check if player has active deck
    const activeDeck = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address_active", (q: any) =>
        q.eq("address", addr).eq("isActive", true)
      )
      .first();

    if (!activeDeck) {
      throw new Error("No active deck. Please create and select a deck first.");
    }

    // Generate room ID
    const roomId = generateRoomId();

    // Create match
    const matchId = await ctx.db.insert("tcgMatches", {
      roomId,
      status: "waiting",
      player1Address: addr,
      player1Username: args.username,
      player1Deck: activeDeck.cards,
      player1Ready: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + (TCG_CONFIG.ROOM_EXPIRY_MINUTES * 60 * 1000),
    });

    return { matchId, roomId };
  },
});

/**
 * Join an existing match
 */
export const joinMatch = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Find match
    const match = await ctx.db
      .query("tcgMatches")
      .withIndex("by_room_id", (q: any) => q.eq("roomId", args.roomId))
      .first();

    if (!match) {
      throw new Error("Match not found");
    }

    if (match.status !== "waiting") {
      throw new Error("Match is not available");
    }

    if (match.player1Address === addr) {
      throw new Error("Cannot join your own match");
    }

    // Check if player has active deck
    const activeDeck = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address_active", (q: any) =>
        q.eq("address", addr).eq("isActive", true)
      )
      .first();

    if (!activeDeck) {
      throw new Error("No active deck. Please create and select a deck first.");
    }

    // Validate player1 has deck
    if (!match.player1Deck || match.player1Deck.length === 0) {
      throw new Error("Match creator doesn't have a valid deck");
    }

    // Initialize game state
    const gameState = initializeGameState(match.player1Deck, activeDeck.cards);

    // Update match
    await ctx.db.patch(match._id, {
      status: "in-progress",
      player2Address: addr,
      player2Username: args.username,
      player2Deck: activeDeck.cards,
      player2Ready: true,
      gameState,
      startedAt: Date.now(),
    });

    return { success: true, matchId: match._id };
  },
});

/**
 * Submit actions for current turn
 */
export const submitActions = mutation({
  args: {
    matchId: v.id("tcgMatches"),
    address: v.string(),
    actions: v.array(v.object({
      type: v.union(
        v.literal("play"),
        v.literal("sacrifice-hand"),
        v.literal("sacrifice-lane")
      ),
      cardIndex: v.number(),
      targetLane: v.optional(v.number()),
      targetCardIndex: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "in-progress" || !match.gameState) {
      throw new Error("Match not found or not in progress");
    }

    const isPlayer1 = match.player1Address === addr;
    const isPlayer2 = match.player2Address === addr;

    if (!isPlayer1 && !isPlayer2) {
      throw new Error("You are not in this match");
    }

    // Update actions for this player
    const updateField = isPlayer1 ? "player1Actions" : "player2Actions";
    const confirmField = isPlayer1 ? "player1Confirmed" : "player2Confirmed";

    const updatedGameState = {
      ...match.gameState,
      [updateField]: args.actions,
      [confirmField]: true,
    };

    await ctx.db.patch(match._id, { gameState: updatedGameState });

    // Check if both players confirmed
    const bothConfirmed = isPlayer1
      ? (updatedGameState.player2Confirmed === true)
      : (updatedGameState.player1Confirmed === true);

    if (bothConfirmed && updatedGameState.player1Confirmed && updatedGameState.player2Confirmed) {
      // Process turn
      await processTurn(ctx, match._id);
    }

    return { success: true, bothConfirmed };
  },
});

/**
 * Process turn after both players confirmed
 */
async function processTurn(ctx: any, matchId: Id<"tcgMatches">) {
  const match = await ctx.db.get(matchId);
  if (!match || !match.gameState) return;

  const gs = match.gameState;

  // Process player 1 actions - place cards first
  let p1Hand = [...gs.player1Hand];
  let p1DeckRemaining = [...gs.player1DeckRemaining];
  let lanes = gs.lanes.map((l: any) => ({ ...l, player1Cards: [...l.player1Cards], player2Cards: [...l.player2Cards] }));

  // Track cards played this turn for ability processing
  const p1CardsPlayedThisTurn: { card: any; lane: number }[] = [];
  const p2CardsPlayedThisTurn: { card: any; lane: number }[] = [];

  for (const action of (gs.player1Actions || [])) {
    // Validate action before processing
    if (action.targetLane !== undefined && (action.targetLane < 0 || action.targetLane > 2)) {
      console.warn(`P1 invalid targetLane: ${action.targetLane}, skipping action`);
      continue;
    }
    if (action.type === "play" && action.targetLane !== undefined) {
      // Validate cardIndex bounds
      if (action.cardIndex < 0 || action.cardIndex >= p1Hand.length) {
        console.warn(`P1 invalid cardIndex: ${action.cardIndex}, hand size: ${p1Hand.length}, skipping`);
        continue;
      }
      const card = p1Hand.splice(action.cardIndex, 1)[0];
      if (card) {
        lanes[action.targetLane].player1Cards.push(card);
        p1CardsPlayedThisTurn.push({ card, lane: action.targetLane });
      }
    } else if (action.type === "sacrifice-hand") {
      if (action.cardIndex < 0 || action.cardIndex >= p1Hand.length) {
        console.warn(`P1 sacrifice-hand invalid cardIndex: ${action.cardIndex}, skipping`);
        continue;
      }
      p1Hand.splice(action.cardIndex, 1);
      if (p1DeckRemaining.length > 0) {
        p1Hand.push(p1DeckRemaining.shift());
      }
    } else if (action.type === "sacrifice-lane" && action.targetLane !== undefined) {
      if (action.cardIndex < 0 || action.cardIndex >= lanes[action.targetLane].player1Cards.length) {
        console.warn(`P1 sacrifice-lane invalid cardIndex: ${action.cardIndex}, skipping`);
        continue;
      }
      const sacrificedCard = lanes[action.targetLane].player1Cards.splice(action.cardIndex, 1)[0];
      if (sacrificedCard && action.targetCardIndex !== undefined) {
        const targetLane = action.targetLane;
        if (lanes[targetLane].player1Cards[action.targetCardIndex]) {
          const buffAmount = calculateSacrificeBuff(sacrificedCard);
          lanes[targetLane].player1Cards[action.targetCardIndex].power += buffAmount;
        }
      }
    }
  }

  // Process player 2 actions - place cards
  let p2Hand = [...gs.player2Hand];
  let p2DeckRemaining = [...gs.player2DeckRemaining];

  for (const action of (gs.player2Actions || [])) {
    // Validate action before processing
    if (action.targetLane !== undefined && (action.targetLane < 0 || action.targetLane > 2)) {
      console.warn(`P2 invalid targetLane: ${action.targetLane}, skipping action`);
      continue;
    }
    if (action.type === "play" && action.targetLane !== undefined) {
      // Validate cardIndex bounds
      if (action.cardIndex < 0 || action.cardIndex >= p2Hand.length) {
        console.warn(`P2 invalid cardIndex: ${action.cardIndex}, hand size: ${p2Hand.length}, skipping`);
        continue;
      }
      const card = p2Hand.splice(action.cardIndex, 1)[0];
      if (card) {
        lanes[action.targetLane].player2Cards.push(card);
        p2CardsPlayedThisTurn.push({ card, lane: action.targetLane });
      }
    } else if (action.type === "sacrifice-hand") {
      if (action.cardIndex < 0 || action.cardIndex >= p2Hand.length) {
        console.warn(`P2 sacrifice-hand invalid cardIndex: ${action.cardIndex}, skipping`);
        continue;
      }
      p2Hand.splice(action.cardIndex, 1);
      if (p2DeckRemaining.length > 0) {
        p2Hand.push(p2DeckRemaining.shift());
      }
    } else if (action.type === "sacrifice-lane" && action.targetLane !== undefined) {
      if (action.cardIndex < 0 || action.cardIndex >= lanes[action.targetLane].player2Cards.length) {
        console.warn(`P2 sacrifice-lane invalid cardIndex: ${action.cardIndex}, skipping`);
        continue;
      }
      const sacrificedCard = lanes[action.targetLane].player2Cards.splice(action.cardIndex, 1)[0];
      if (sacrificedCard && action.targetCardIndex !== undefined) {
        const targetLane = action.targetLane;
        if (lanes[targetLane].player2Cards[action.targetCardIndex]) {
          const buffAmount = calculateSacrificeBuff(sacrificedCard);
          lanes[targetLane].player2Cards[action.targetCardIndex].power += buffAmount;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // APPLY ONREVEAL ABILITIES (after both players placed cards)
  // Order: Lower energy cost first, then alternating P1/P2 at same cost
  // ═══════════════════════════════════════════════════════════════════════════════

  // Count total cards played before this turn (for buffPerCardsPlayed abilities)
  const p1TotalCardsPlayed = countCardsPlayed(lanes, "player1Cards");
  const p2TotalCardsPlayed = countCardsPlayed(lanes, "player2Cards");

  // Combine all cards played this turn with player info
  const allCardsPlayed: { card: any; lane: number; player: 1 | 2 }[] = [
    ...p1CardsPlayedThisTurn.map(c => ({ ...c, player: 1 as const })),
    ...p2CardsPlayedThisTurn.map(c => ({ ...c, player: 2 as const })),
  ];

  // Sort by: Lane first (1, 2, 3), then DICE ROLL within each lane
  // Each lane gets its own dice roll to decide P1 or P2 first
  const laneDiceResults = [randomCoinFlip(), randomCoinFlip(), randomCoinFlip()]; // One dice per lane

  allCardsPlayed.sort((a, b) => {
    // First: sort by lane (Lane 1 → 2 → 3)
    if (a.lane !== b.lane) return a.lane - b.lane;
    // Same lane: use that lane's dice result
    const p1First = laneDiceResults[a.lane];
    if (a.player === b.player) return 0; // Same player, keep order
    // Different players: dice decides
    if (p1First) {
      return a.player === 1 ? -1 : 1; // P1 first
    } else {
      return a.player === 2 ? -1 : 1; // P2 first
    }
  });

  // Apply abilities in fair order (Lane 1 → 2 → 3, dice per lane)
  for (const { card, lane, player } of allCardsPlayed) {
    const isP1 = player === 1;
    const myCards = isP1 ? "player1Cards" : "player2Cards";
    const enemyCards = isP1 ? "player2Cards" : "player1Cards";
    const myPower = isP1 ? "player1Power" : "player2Power";
    const enemyPower = isP1 ? "player2Power" : "player1Power";
    const hand = isP1 ? p1Hand : p2Hand;
    const deck = isP1 ? p1DeckRemaining : p2DeckRemaining;
    const totalPlayed = isP1 ? p1TotalCardsPlayed : p2TotalCardsPlayed;

    const result = applyOnRevealAbility(
      card, lane, lanes,
      myCards, enemyCards,
      myPower, enemyPower,
      hand, deck,
      gs.currentTurn, totalPlayed
    );

    // Apply bonus power to the card
    const cardIdx = lanes[lane][myCards].findIndex((c: any) => c.cardId === card.cardId);
    if (cardIdx >= 0 && result.bonusPower !== 0) {
      lanes[lane][myCards][cardIdx] = {
        ...lanes[lane][myCards][cardIdx],
        power: Math.max(0, lanes[lane][myCards][cardIdx].power + result.bonusPower)
      };
    }

    // Update hand/deck/lanes from ability
    if (isP1) {
      p1Hand = result.hand;
      p1DeckRemaining = result.deck;
    } else {
      p2Hand = result.hand;
      p2DeckRemaining = result.deck;
    }
    lanes = result.lanes;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // APPLY ONGOING ABILITIES (at end of each turn)
  // ═══════════════════════════════════════════════════════════════════════════════

  lanes = applyOngoingAbilities(
    lanes,
    "player1Cards", "player2Cards",
    "player1Power", "player2Power",
    gs.currentTurn
  );

  // Recalculate lane powers (final)
  for (const lane of lanes) {
    lane.player1Power = calculateLanePower(lane.player1Cards);
    lane.player2Power = calculateLanePower(lane.player2Cards);
  }

  // Check if game is over (turn 6)
  if (gs.currentTurn >= TCG_CONFIG.TOTAL_TURNS) {
    // Determine winner
    const laneResults = lanes.map((lane: any) => ({
      laneId: lane.laneId,
      winner: lane.player1Power > lane.player2Power ? "player1" as const
        : lane.player2Power > lane.player1Power ? "player2" as const
        : "tie" as const,
      player1FinalPower: lane.player1Power,
      player2FinalPower: lane.player2Power,
    }));

    const p1Wins = laneResults.filter((r: any) => r.winner === "player1").length;
    const p2Wins = laneResults.filter((r: any) => r.winner === "player2").length;

    const winnerId = p1Wins > p2Wins ? match.player1Address
      : p2Wins > p1Wins ? match.player2Address
      : null; // Tie

    const winnerUsername = p1Wins > p2Wins ? match.player1Username
      : p2Wins > p1Wins ? match.player2Username
      : null;

    await ctx.db.patch(matchId, {
      status: "finished",
      winnerId,
      winnerUsername,
      laneResults,
      finishedAt: Date.now(),
      gameState: {
        ...gs,
        lanes,
        player1Hand: p1Hand,
        player2Hand: p2Hand,
        player1DeckRemaining: p1DeckRemaining,
        player2DeckRemaining: p2DeckRemaining,
        phase: "resolution",
      },
    });

    // Save to history (always, including ties)
    await ctx.db.insert("tcgHistory", {
      matchId,
      roomId: match.roomId,
      player1Address: match.player1Address,
      player1Username: match.player1Username,
      player2Address: match.player2Address!,
      player2Username: match.player2Username!,
      winnerId: winnerId || "tie", // "tie" for draws
      winnerUsername: winnerUsername || "TIE",
      lanesWonByWinner: Math.max(p1Wins, p2Wins),
      laneResults,
      totalTurns: gs.currentTurn,
      player1TotalPower: lanes.reduce((sum: number, l: any) => sum + l.player1Power, 0),
      player2TotalPower: lanes.reduce((sum: number, l: any) => sum + l.player2Power, 0),
      finishedAt: Date.now(),
    });

    // 🎯 Vibe Clash PvP Aura Rewards (+50 win, -40 loss)
    // Only update aura when there's a clear winner (not on ties)
    if (winnerId) {
      const loserId = winnerId === match.player1Address
        ? match.player2Address
        : match.player1Address;

      // Update winner's aura (+50)
      const winnerProfile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", winnerId))
        .first();

      if (winnerProfile) {
        const winnerCurrentAura = winnerProfile.stats?.aura ?? 500;
        await ctx.db.patch(winnerProfile._id, {
          stats: {
            ...winnerProfile.stats,
            aura: winnerCurrentAura + 50,
          },
        });
        console.log(`🎯 Vibe Clash: ${winnerId} WIN +50 aura (${winnerCurrentAura} → ${winnerCurrentAura + 50})`);
      }

      // Update loser's aura (-40)
      if (loserId) {
        const loserProfile = await ctx.db
          .query("profiles")
          .withIndex("by_address", (q: any) => q.eq("address", loserId))
          .first();

        if (loserProfile) {
          const loserCurrentAura = loserProfile.stats?.aura ?? 500;
          const newLoserAura = Math.max(0, loserCurrentAura - 40); // Can't go below 0
          await ctx.db.patch(loserProfile._id, {
            stats: {
              ...loserProfile.stats,
              aura: newLoserAura,
            },
          });
          console.log(`🎯 Vibe Clash: ${loserId} LOSS -40 aura (${loserCurrentAura} → ${newLoserAura})`);
        }
      }
    } else {
      console.log(`🎯 Vibe Clash: TIE - ${match.player1Username} vs ${match.player2Username} (no aura changes)`);
    }

    return;
  }

  // Next turn
  const nextTurn = gs.currentTurn + 1;

  // Draw cards for next turn
  const p1Draw = drawCard(p1DeckRemaining, nextTurn);
  const p2Draw = drawCard(p2DeckRemaining, nextTurn);

  if (p1Draw.card) p1Hand.push(p1Draw.card);
  if (p2Draw.card) p2Hand.push(p2Draw.card);

  await ctx.db.patch(matchId, {
    gameState: {
      currentTurn: nextTurn,
      energy: nextTurn,
      phase: "action",
      turnEndsAt: Date.now() + (TCG_CONFIG.TURN_TIME_SECONDS * 1000),
      player1Hand: p1Hand,
      player2Hand: p2Hand,
      player1DeckRemaining: p1Draw.remaining,
      player2DeckRemaining: p2Draw.remaining,
      lanes,
      player1Actions: [],
      player2Actions: [],
      player1Confirmed: false,
      player2Confirmed: false,
    },
  });
}

/**
 * Calculate sacrifice buff amount
 */
function calculateSacrificeBuff(card: any): number {
  const basePower = card.type === "nothing"
    ? Math.floor(card.power * TCG_CONFIG.NOTHING_POWER_MULTIPLIER)
    : card.power;

  // Foil multiplier
  let multiplier = 1;
  if (card.foil === "Standard") {
    multiplier = 1.5;
  } else if (card.foil === "Prize") {
    multiplier = 2;
  }

  return Math.floor(basePower * multiplier);
}

/**
 * Cancel a match (host only, while waiting)
 */
export const cancelMatch = mutation({
  args: {
    matchId: v.id("tcgMatches"),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (match.player1Address !== addr) {
      throw new Error("Only host can cancel");
    }

    if (match.status !== "waiting") {
      throw new Error("Can only cancel waiting matches");
    }

    await ctx.db.patch(args.matchId, {
      status: "cancelled",
      finishedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Forfeit a match (during game)
 */
export const forfeitMatch = mutation({
  args: {
    matchId: v.id("tcgMatches"),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "in-progress") {
      throw new Error("Match not found or not in progress");
    }

    const isPlayer1 = match.player1Address === addr;
    const isPlayer2 = match.player2Address === addr;

    if (!isPlayer1 && !isPlayer2) {
      throw new Error("You are not in this match");
    }

    // Winner is the other player
    const winnerId = isPlayer1 ? match.player2Address : match.player1Address;
    const winnerUsername = isPlayer1 ? match.player2Username : match.player1Username;
    const loserId = addr; // The player who forfeited

    await ctx.db.patch(args.matchId, {
      status: "finished",
      winnerId,
      winnerUsername,
      finishedAt: Date.now(),
    });

    // 🎯 Vibe Clash PvP Aura Rewards on Forfeit (+50 win, -40 loss)
    if (winnerId) {
      const winnerProfile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", winnerId))
        .first();

      if (winnerProfile) {
        const winnerCurrentAura = winnerProfile.stats?.aura ?? 500;
        await ctx.db.patch(winnerProfile._id, {
          stats: {
            ...winnerProfile.stats,
            aura: winnerCurrentAura + 50,
          },
        });
        console.log(`🎯 Vibe Clash Forfeit: ${winnerId} WIN +50 aura (${winnerCurrentAura} → ${winnerCurrentAura + 50})`);
      }
    }

    // Update forfeiter's aura (-40)
    const loserProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", loserId))
      .first();

    if (loserProfile) {
      const loserCurrentAura = loserProfile.stats?.aura ?? 500;
      const newLoserAura = Math.max(0, loserCurrentAura - 40);
      await ctx.db.patch(loserProfile._id, {
        stats: {
          ...loserProfile.stats,
          aura: newLoserAura,
        },
      });
      console.log(`🎯 Vibe Clash Forfeit: ${loserId} LOSS -40 aura (${loserCurrentAura} → ${newLoserAura})`);
    }

    return { success: true, winnerId };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEARTBEAT & DISCONNECT DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export const heartbeat = mutation({
  args: {
    matchId: v.id("tcgMatches"),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "in-progress") return;

    const isPlayer1 = match.player1Address === addr;
    const isPlayer2 = match.player2Address === addr;
    if (!isPlayer1 && !isPlayer2) return;

    const now = Date.now();
    await ctx.db.patch(args.matchId, isPlayer1
      ? { player1LastSeen: now }
      : { player2LastSeen: now }
    );
  },
});

export const claimVictoryByTimeout = mutation({
  args: {
    matchId: v.id("tcgMatches"),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();
    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "in-progress") {
      throw new Error("Match not found or not in progress");
    }

    const isPlayer1 = match.player1Address === addr;
    const isPlayer2 = match.player2Address === addr;
    if (!isPlayer1 && !isPlayer2) {
      throw new Error("You are not in this match");
    }

    const now = Date.now();
    const TIMEOUT_MS = 60_000; // 60 seconds

    const opponentLastSeen = isPlayer1 ? match.player2LastSeen : match.player1LastSeen;

    // If opponent never sent heartbeat and match started > 60s ago, allow claim
    if (opponentLastSeen === undefined) {
      const matchAge = now - (match.startedAt || match.createdAt);
      if (matchAge < TIMEOUT_MS) {
        throw new Error("Opponent may still be connecting");
      }
    } else if (now - opponentLastSeen < TIMEOUT_MS) {
      throw new Error("Opponent is still connected");
    }

    // Forfeit the opponent
    const winnerId = addr;
    const winnerUsername = isPlayer1 ? match.player1Username : match.player2Username;
    const loserId = isPlayer1 ? match.player2Address : match.player1Address;

    await ctx.db.patch(args.matchId, {
      status: "finished",
      winnerId,
      winnerUsername,
      finishedAt: now,
    });

    // Aura rewards: +50 winner, -40 loser (same as forfeit)
    const winnerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", winnerId))
      .first();

    if (winnerProfile) {
      const currentAura = winnerProfile.stats?.aura ?? 500;
      await ctx.db.patch(winnerProfile._id, {
        stats: { ...winnerProfile.stats, aura: currentAura + 50 },
      });
      console.log(`🎯 Vibe Clash Timeout Win: ${winnerId} +50 aura`);
    }

    if (loserId) {
      const loserProfile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", loserId))
        .first();

      if (loserProfile) {
        const currentAura = loserProfile.stats?.aura ?? 500;
        const newAura = Math.max(0, currentAura - 40);
        await ctx.db.patch(loserProfile._id, {
          stats: { ...loserProfile.stats, aura: newAura },
        });
        console.log(`🎯 Vibe Clash Timeout Loss: ${loserId} -40 aura`);
      }
    }

    return { success: true, winnerId };
  },
});

// Cleanup stale matches (called by cron)
export const cleanupStaleMatches = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const BOTH_GONE_MS = 120_000; // 2 minutes
    const ONE_GONE_MS = 90_000; // 90 seconds

    const matches = await ctx.db
      .query("tcgMatches")
      .withIndex("by_status", (q: any) => q.eq("status", "in-progress"))
      .collect();

    let cleaned = 0;
    for (const match of matches) {
      const p1Last = match.player1LastSeen;
      const p2Last = match.player2LastSeen;

      // Both players gone > 2 min → cancel
      if (p1Last && p2Last && (now - p1Last > BOTH_GONE_MS) && (now - p2Last > BOTH_GONE_MS)) {
        await ctx.db.patch(match._id, { status: "cancelled", finishedAt: now });
        cleaned++;
        continue;
      }

      // One player gone > 90s, other active → forfeit
      if (p1Last && p2Last) {
        if ((now - p1Last > ONE_GONE_MS) && (now - p2Last < 30_000)) {
          // Player 1 gone, player 2 wins
          await ctx.db.patch(match._id, {
            status: "finished",
            winnerId: match.player2Address,
            winnerUsername: match.player2Username,
            finishedAt: now,
          });
          cleaned++;
        } else if ((now - p2Last > ONE_GONE_MS) && (now - p1Last < 30_000)) {
          // Player 2 gone, player 1 wins
          await ctx.db.patch(match._id, {
            status: "finished",
            winnerId: match.player1Address,
            winnerUsername: match.player1Username,
            finishedAt: now,
          });
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} stale TCG matches`);
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEFENSE DECK & AUTO MATCH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Set a deck as defense deck for auto-match PvP
 */
export const setDefenseDeck = mutation({
  args: {
    address: v.string(),
    deckId: v.id("tcgDecks"),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Verify deck ownership
    const deck = await ctx.db.get(args.deckId);
    if (!deck) {
      throw new Error("Deck not found");
    }
    if (deck.address.toLowerCase() !== addr) {
      throw new Error("This deck doesn't belong to you");
    }

    // Clear existing defense deck for this user
    const existingDefense = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address", (q: any) => q.eq("address", deck.address))
      .collect();

    for (const d of existingDefense) {
      if (d.isDefenseDeck && d._id !== args.deckId) {
        await ctx.db.patch(d._id, { isDefenseDeck: false });
      }
    }

    // Set new defense deck
    await ctx.db.patch(args.deckId, { isDefenseDeck: true });

    console.log(`🛡️ Defense deck set: ${deck.deckName} for ${addr}`);
    return { success: true };
  },
});

/**
 * Get players with defense decks (for auto-match)
 */
export const getPlayersWithDefenseDeck = query({
  args: { excludeAddress: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Query all decks and filter for defense decks
    const allDecks = await ctx.db
      .query("tcgDecks")
      .collect();

    const defenseDecks = allDecks.filter((d: any) => d.isDefenseDeck === true);
    const exclude = args.excludeAddress?.toLowerCase();

    const players = defenseDecks
      .filter((d: any) => d.address.toLowerCase() !== exclude)
      .map((d: any) => ({
        address: d.address,
        deckName: d.deckName,
        totalPower: d.totalPower,
        cards: d.cards,
      }));

    return players;
  },
});

/**
 * Auto Match - Find random opponent with defense deck and create match
 */
export const autoMatch = mutation({
  args: {
    address: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Get player's active deck
    const activeDeck = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address_active", (q: any) =>
        q.eq("address", addr).eq("isActive", true)
      )
      .first();

    if (!activeDeck) {
      throw new Error("No active deck. Please create and select a deck first.");
    }

    // Find opponents with defense decks (query all decks and filter for isDefenseDeck=true)
    const allDecks = await ctx.db
      .query("tcgDecks")
      .collect();

    const defenseDecks = allDecks.filter((d: any) => d.isDefenseDeck === true);
    const opponents = defenseDecks.filter((d: any) => d.address.toLowerCase() !== addr);

    if (opponents.length === 0) {
      throw new Error("No opponents available. Set your deck as Defense first, or try again later!");
    }

    // Pick random opponent
    const opponent = opponents[Math.floor(Math.random() * opponents.length)];

    // Get opponent profile for username
    const opponentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", opponent.address))
      .first();

    const opponentUsername = opponentProfile?.username || "Unknown";

    // Create match directly in-progress
    const roomId = generateRoomId();
    const gameState = initializeGameState(activeDeck.cards, opponent.cards);

    const matchId = await ctx.db.insert("tcgMatches", {
      roomId,
      status: "in-progress",
      player1Address: addr,
      player1Username: args.username,
      player1Deck: activeDeck.cards,
      player1Ready: true,
      player2Address: opponent.address,
      player2Username: opponentUsername,
      player2Deck: opponent.cards,
      player2Ready: true,
      gameState,
      createdAt: Date.now(),
      startedAt: Date.now(),
      expiresAt: Date.now() + (TCG_CONFIG.ROOM_EXPIRY_MINUTES * 60 * 1000),
    });

    return {
      matchId,
      roomId,
      opponentUsername,
      opponentPower: opponent.totalPower,
      isAutoMatch: true,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TCG MISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

const TCG_MISSION_REWARDS: Record<string, number> = {
  tcg_pve_win: 25,
  tcg_pvp_match: 50,
  tcg_play_3: 75,
  tcg_win_streak_3: 150,
};

/**
 * Mark a VibeClash mission as completed (called from frontend after PvE/PvP)
 */
export const markTcgMission = mutation({
  args: {
    playerAddress: v.string(),
    missionType: v.union(
      v.literal("tcg_pve_win"),
      v.literal("tcg_pvp_match"),
      v.literal("tcg_play_3"),
      v.literal("tcg_win_streak_3")
    ),
  },
  handler: async (ctx, { playerAddress, missionType }) => {
    const today = new Date().toISOString().split('T')[0];
    const normalizedAddress = playerAddress.toLowerCase();

    const existing = await ctx.db
      .query("personalMissions")
      .withIndex("by_player_date_type", (q: any) =>
        q.eq("playerAddress", normalizedAddress)
          .eq("date", today)
          .eq("missionType", missionType)
      )
      .first();

    if (!existing) {
      await ctx.db.insert("personalMissions", {
        playerAddress: normalizedAddress,
        date: today,
        missionType,
        completed: true,
        claimed: false,
        reward: TCG_MISSION_REWARDS[missionType] || 0,
        completedAt: Date.now(),
      });
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEFENSE POOL STAKING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const POOL_TIERS = [1000, 5000, 10000, 25000, 50000]; // Available pool amounts
const POOL_FEE_PERCENT = 10; // 10% fee on wins/losses

/**
 * Set defense pool - stake VBMS into your defense deck
 */
export const setDefensePool = mutation({
  args: {
    address: v.string(),
    deckId: v.id("tcgDecks"),
    amount: v.number(), // Must be one of POOL_TIERS
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Validate pool tier
    if (!POOL_TIERS.includes(args.amount)) {
      throw new Error(`Invalid pool amount. Must be one of: ${POOL_TIERS.join(", ")}`);
    }

    // Verify deck ownership
    const deck = await ctx.db.get(args.deckId);
    if (!deck) {
      throw new Error("Deck not found");
    }
    if (deck.address.toLowerCase() !== addr) {
      throw new Error("This deck doesn't belong to you");
    }

    // Check if deck already has a pool
    if (deck.defensePool && deck.defensePool > 0 && deck.defensePoolActive) {
      throw new Error("This deck already has an active pool. Withdraw first.");
    }

    // Get profile (no balance check - VBMS sent onchain to pool contract)
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Clear existing defense deck for this user
    const existingDefense = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address", (q: any) => q.eq("address", deck.address))
      .collect();

    for (const d of existingDefense) {
      if (d._id !== args.deckId && (d.isDefenseDeck || d.defensePoolActive)) {
        await ctx.db.patch(d._id, {
          isDefenseDeck: false,
          defensePoolActive: false
        });
      }
    }

    // Set defense pool on deck
    await ctx.db.patch(args.deckId, {
      isDefenseDeck: true,
      defensePool: args.amount,
      defensePoolActive: true,
    });

    // Update or create leaderboard entry
    const existingEntry = await ctx.db
      .query("tcgDefenseLeaderboard")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .first();

    if (existingEntry) {
      await ctx.db.patch(existingEntry._id, {
        deckId: args.deckId,
        deckName: deck.deckName,
        poolAmount: args.amount,
        username: args.username,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("tcgDefenseLeaderboard", {
        address: addr,
        username: args.username,
        deckId: args.deckId,
        deckName: deck.deckName,
        poolAmount: args.amount,
        totalWins: 0,
        totalLosses: 0,
        totalEarned: 0,
        totalLost: 0,
        lastUpdated: Date.now(),
      });
    }

    // Log transaction (VBMS sent onchain, not deducted from coins)
    await ctx.db.insert("coinTransactions", {
      address: addr,
      amount: -args.amount,
      type: "spend",
      source: "tcg_defense_pool_onchain",
      description: `Staked ${args.amount} VBMS onchain in defense pool`,
      timestamp: Date.now(),
      balanceBefore: 0,
      balanceAfter: 0,
    });

    console.log(`🛡️💰 Defense pool set: ${deck.deckName} with ${args.amount} VBMS for ${addr}`);
    return {
      success: true,
      poolAmount: args.amount,
    };
  },
});

/**
 * Withdraw defense pool - return staked VBMS to coinsInbox
 */
export const withdrawDefensePool = mutation({
  args: {
    address: v.string(),
    deckId: v.id("tcgDecks"),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Verify deck ownership
    const deck = await ctx.db.get(args.deckId);
    if (!deck) {
      throw new Error("Deck not found");
    }
    if (deck.address.toLowerCase() !== addr) {
      throw new Error("This deck doesn't belong to you");
    }

    // Check if deck has a pool
    const poolAmount = deck.defensePool || 0;
    if (poolAmount <= 0 || !deck.defensePoolActive) {
      throw new Error("No active pool to withdraw");
    }

    // Get profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Return pool to coinsInbox (requires claim on home page)
    const currentInbox = profile.coinsInbox || 0;
    const newInbox = currentInbox + poolAmount;
    await ctx.db.patch(profile._id, { coinsInbox: newInbox });

    // Clear defense pool on deck
    await ctx.db.patch(args.deckId, {
      isDefenseDeck: false,
      defensePool: 0,
      defensePoolActive: false,
    });

    // Remove from leaderboard
    const leaderboardEntry = await ctx.db
      .query("tcgDefenseLeaderboard")
      .withIndex("by_deck", (q: any) => q.eq("deckId", args.deckId))
      .first();

    if (leaderboardEntry) {
      await ctx.db.delete(leaderboardEntry._id);
    }

    // Log transaction
    await ctx.db.insert("coinTransactions", {
      address: addr,
      amount: poolAmount,
      type: "earn",
      source: "tcg_defense_pool_withdraw",
      description: `Withdrew ${poolAmount} VBMS from defense pool`,
      timestamp: Date.now(),
      balanceBefore: currentInbox,
      balanceAfter: newInbox,
    });

    console.log(`🛡️💸 Defense pool withdrawn: ${poolAmount} VBMS for ${addr}`);
    return {
      success: true,
      withdrawn: poolAmount,
      newInbox
    };
  },
});

/**
 * Get defense leaderboard - sorted by pool amount
 */
export const getDefenseLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get all leaderboard entries and sort by pool
    const entries = await ctx.db
      .query("tcgDefenseLeaderboard")
      .collect();

    // Sort by poolAmount descending
    const sorted = entries.sort((a, b) => b.poolAmount - a.poolAmount);

    return sorted.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      address: entry.address,
      username: entry.username,
      deckId: entry.deckId,
      deckName: entry.deckName,
      poolAmount: entry.poolAmount,
      wins: entry.totalWins,
      losses: entry.totalLosses,
      totalEarned: entry.totalEarned,
      totalLost: entry.totalLost,
    }));
  },
});

/**
 * Get user's defense pool status
 */
export const getMyDefensePool = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    const leaderboardEntry = await ctx.db
      .query("tcgDefenseLeaderboard")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .first();

    if (!leaderboardEntry) {
      return null;
    }

    // Get deck details
    const deck = await ctx.db.get(leaderboardEntry.deckId);

    return {
      deckId: leaderboardEntry.deckId,
      deckName: leaderboardEntry.deckName,
      poolAmount: leaderboardEntry.poolAmount,
      wins: leaderboardEntry.totalWins,
      losses: leaderboardEntry.totalLosses,
      totalEarned: leaderboardEntry.totalEarned,
      totalLost: leaderboardEntry.totalLost,
      deckPower: deck?.totalPower || 0,
      isActive: deck?.defensePoolActive || false,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME MATCHMAKING (3 second window)
// ═══════════════════════════════════════════════════════════════════════════════

const MATCHMAKING_TIMEOUT_MS = 30000; // 30 seconds max search
const MATCHMAKING_LIVE_WINDOW_MS = 3000; // 3 seconds to find live player

/**
 * Start searching for a match
 */
export const searchMatch = mutation({
  args: {
    address: v.string(),
    username: v.string(),
    deckId: v.id("tcgDecks"),
    poolTier: v.optional(v.number()), // If staked match, which tier
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Verify deck ownership
    const deck = await ctx.db.get(args.deckId);
    if (!deck) {
      throw new Error("Deck not found");
    }
    if (deck.address.toLowerCase() !== addr) {
      throw new Error("This deck doesn't belong to you");
    }

    // Remove any existing matchmaking entry for this user
    const existing = await ctx.db
      .query("tcgMatchmaking")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Create new matchmaking entry
    const now = Date.now();
    const matchmakingId = await ctx.db.insert("tcgMatchmaking", {
      address: addr,
      username: args.username,
      deckId: args.deckId,
      poolTier: args.poolTier,
      searchingAt: now,
      expiresAt: now + MATCHMAKING_TIMEOUT_MS,
    });

    console.log(`🔍 ${args.username} started searching for match (tier: ${args.poolTier || 'free'})`);
    return {
      matchmakingId,
      searchingAt: now,
    };
  },
});

/**
 * Cancel matchmaking search
 */
export const cancelSearch = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    const existing = await ctx.db
      .query("tcgMatchmaking")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      console.log(`❌ Search cancelled for ${addr}`);
      return { success: true, cancelled: true };
    }

    return { success: true, cancelled: false };
  },
});

/**
 * Check matchmaking - find another player or timeout to CPU
 */
export const checkMatchmaking = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();
    const now = Date.now();

    // Get my matchmaking entry
    const myEntry = await ctx.db
      .query("tcgMatchmaking")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .first();

    if (!myEntry) {
      return { status: "not_searching" };
    }

    // Check if expired
    if (now > myEntry.expiresAt) {
      return { status: "expired" };
    }

    // Check if still in live player window (first 3 seconds)
    const searchDuration = now - myEntry.searchingAt;
    const inLiveWindow = searchDuration < MATCHMAKING_LIVE_WINDOW_MS;

    // Look for other players searching (with same pool tier if specified)
    const allSearching = await ctx.db
      .query("tcgMatchmaking")
      .withIndex("by_searching", (q: any) => q.gt("expiresAt", now))
      .collect();

    // Filter for same pool tier and exclude self
    const potentialMatches = allSearching.filter(entry =>
      entry.address.toLowerCase() !== addr &&
      entry.poolTier === myEntry.poolTier
    );

    if (potentialMatches.length > 0) {
      // Found a live player!
      const opponent = potentialMatches[0];
      return {
        status: "found_player",
        opponent: {
          address: opponent.address,
          username: opponent.username,
          deckId: opponent.deckId,
        },
      };
    }

    // No live player found
    if (inLiveWindow) {
      return {
        status: "searching",
        elapsed: searchDuration,
        timeLeft: MATCHMAKING_LIVE_WINDOW_MS - searchDuration,
      };
    }

    // Past live window - fall back to CPU
    return {
      status: "timeout_cpu",
      elapsed: searchDuration,
    };
  },
});

/**
 * Create PvP match from matchmaking (when two players find each other)
 */
export const createMatchFromMatchmaking = mutation({
  args: {
    player1Address: v.string(),
    player2Address: v.string(),
    player1Username: v.string(),
    player2Username: v.string(),
    player1DeckId: v.id("tcgDecks"),
    player2DeckId: v.id("tcgDecks"),
    poolTier: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const addr1 = args.player1Address.toLowerCase();
    const addr2 = args.player2Address.toLowerCase();

    // Get decks
    const deck1 = await ctx.db.get(args.player1DeckId);
    const deck2 = await ctx.db.get(args.player2DeckId);

    if (!deck1 || !deck2) {
      throw new Error("One or both decks not found");
    }

    // Remove both from matchmaking
    const mm1 = await ctx.db
      .query("tcgMatchmaking")
      .withIndex("by_address", (q: any) => q.eq("address", addr1))
      .first();
    const mm2 = await ctx.db
      .query("tcgMatchmaking")
      .withIndex("by_address", (q: any) => q.eq("address", addr2))
      .first();

    if (mm1) await ctx.db.delete(mm1._id);
    if (mm2) await ctx.db.delete(mm2._id);

    // If staked match, deduct from both players
    if (args.poolTier && args.poolTier > 0) {
      const profile1 = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", addr1))
        .first();
      const profile2 = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q: any) => q.eq("address", addr2))
        .first();

      if (!profile1 || !profile2) {
        throw new Error("One or both profiles not found");
      }

      const coins1 = profile1.coins || 0;
      const coins2 = profile2.coins || 0;

      if (coins1 < args.poolTier || coins2 < args.poolTier) {
        throw new Error("One or both players have insufficient balance");
      }

      // Deduct stake from both
      await ctx.db.patch(profile1._id, { coins: coins1 - args.poolTier });
      await ctx.db.patch(profile2._id, { coins: coins2 - args.poolTier });
    }

    // Create match
    const roomId = generateRoomId();
    const gameState = initializeGameState(deck1.cards, deck2.cards);

    const matchId = await ctx.db.insert("tcgMatches", {
      roomId,
      status: "in-progress",
      player1Address: addr1,
      player1Username: args.player1Username,
      player1Deck: deck1.cards,
      player1Ready: true,
      player2Address: addr2,
      player2Username: args.player2Username,
      player2Deck: deck2.cards,
      player2Ready: true,
      gameState,
      createdAt: Date.now(),
      startedAt: Date.now(),
      expiresAt: Date.now() + (TCG_CONFIG.ROOM_EXPIRY_MINUTES * 60 * 1000),
      isStakedMatch: args.poolTier ? true : false,
      stakeAmount: args.poolTier || 0,
      isCpuOpponent: false,
    });

    console.log(`⚔️ PvP match created: ${args.player1Username} vs ${args.player2Username} (stake: ${args.poolTier || 0})`);
    return {
      matchId,
      roomId,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// STAKED AUTO-MATCH (vs CPU defense pool decks)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Auto-match with stake - find a defense pool deck and fight vs CPU
 * Attacker pays the pool tier amount. CPU plays for the defender.
 */
export const autoMatchWithStake = mutation({
  args: {
    address: v.string(),
    username: v.string(),
    poolTier: v.number(), // Must match a defender's pool amount
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    if (!POOL_TIERS.includes(args.poolTier)) {
      throw new Error(`Invalid pool tier. Must be one of: ${POOL_TIERS.join(", ")}`);
    }

    // Get player's active deck
    const activeDeck = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address_active", (q: any) =>
        q.eq("address", addr).eq("isActive", true)
      )
      .first();

    if (!activeDeck) {
      throw new Error("No active deck. Please create and select a deck first.");
    }

    // Check player balance
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // VBMS sent onchain by frontend - no offchain balance check needed

    // Find defense pool decks with matching tier
    const allDecks = await ctx.db.query("tcgDecks").collect();
    const poolDecks = allDecks.filter((d: any) =>
      d.defensePoolActive === true &&
      d.defensePool === args.poolTier &&
      d.address.toLowerCase() !== addr
    );

    if (poolDecks.length === 0) {
      throw new Error(`No defenders with ${args.poolTier} VBMS pool available. Try a different tier!`);
    }

    // Pick random opponent
    const opponent = poolDecks[Math.floor(Math.random() * poolDecks.length)];

    // Get opponent profile for username
    const opponentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", opponent.address))
      .first();

    const opponentUsername = opponentProfile?.username || "Unknown";

    // Attack fee = 10% of pool tier (sent onchain by frontend)
    const attackFee = Math.floor(args.poolTier * 0.1);

    // VBMS already sent onchain - log in Convex
    await ctx.db.insert("coinTransactions", {
      address: addr,
      amount: -attackFee,
      type: "spend",
      source: "tcg_staked_match_onchain",
      description: `Attack fee ${attackFee} VBMS (10% of ${args.poolTier} pool) for VibeClash vs ${opponentUsername}`,
      timestamp: Date.now(),
      balanceBefore: 0,
      balanceAfter: 0,
    });

    // Remove attacker from matchmaking if present
    const mm = await ctx.db
      .query("tcgMatchmaking")
      .withIndex("by_address", (q: any) => q.eq("address", addr))
      .first();
    if (mm) await ctx.db.delete(mm._id);

    // Create match
    const roomId = generateRoomId();
    const gameState = initializeGameState(activeDeck.cards, opponent.cards);

    const matchId = await ctx.db.insert("tcgMatches", {
      roomId,
      status: "in-progress",
      player1Address: addr,
      player1Username: args.username,
      player1Deck: activeDeck.cards,
      player1Ready: true,
      player2Address: opponent.address,
      player2Username: opponentUsername,
      player2Deck: opponent.cards,
      player2Ready: true,
      gameState,
      createdAt: Date.now(),
      startedAt: Date.now(),
      expiresAt: Date.now() + (TCG_CONFIG.ROOM_EXPIRY_MINUTES * 60 * 1000),
      isStakedMatch: true,
      stakeAmount: attackFee,
      isCpuOpponent: true,
    });

    console.log(`⚔️💰 Staked match: ${args.username} vs ${opponentUsername} (CPU) fee=${attackFee} VBMS (pool=${args.poolTier})`);
    return {
      matchId,
      roomId,
      opponentUsername,
      opponentPower: opponent.totalPower,
      isAutoMatch: true,
      isCpuOpponent: true,
      stakeAmount: attackFee,
      poolTier: args.poolTier,
    };
  },
});

/**
 * Finish a staked match - distribute rewards
 * Called when a staked match ends (win/lose)
 *
 * Winner gets 90% of the total pot (both stakes)
 * 10% is burned (fee/sink)
 */
export const finishStakedMatch = mutation({
  args: {
    matchId: v.id("tcgMatches"),
    winnerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (!match.isStakedMatch || !match.stakeAmount) {
      return { success: false, reason: "Not a staked match" };
    }

    // Prevent double-processing
    if ((match as any).stakePaid) {
      return { success: false, reason: "Already processed" };
    }

    // stakeAmount = attack fee (10% of pool, already paid onchain by attacker)
    const attackFee = match.stakeAmount || 0;
    // Contract tax = 10% of attack fee (stays in contract as sink)
    const contractTax = Math.floor(attackFee * POOL_FEE_PERCENT / 100);
    // Winner gets 90% of attack fee
    const winnerReward = attackFee - contractTax;

    const winnerAddr = args.winnerAddress.toLowerCase();
    const p1Addr = (match.player1Address || "").toLowerCase();
    const p2Addr = (match.player2Address || "").toLowerCase();
    const isPlayer1Winner = winnerAddr === p1Addr;
    const loserAddr = isPlayer1Winner ? p2Addr : p1Addr;

    // Award winner - to coinsInbox (requires claim)
    const winnerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", winnerAddr))
      .first();

    if (winnerProfile) {
      const currentInbox = winnerProfile.coinsInbox || 0;
      await ctx.db.patch(winnerProfile._id, {
        coinsInbox: currentInbox + winnerReward,
        lifetimeEarned: (winnerProfile.lifetimeEarned || 0) + winnerReward,
      });

      await ctx.db.insert("coinTransactions", {
        address: winnerAddr,
        amount: winnerReward,
        type: "earn",
        source: "tcg_staked_win",
        description: `Won VibeClash staked match: +${winnerReward} VBMS (fee=${attackFee}, tax=${contractTax})`,
        timestamp: Date.now(),
        balanceBefore: currentInbox,
        balanceAfter: currentInbox + winnerReward,
      });
    }

    // If CPU match - update defender's pool and leaderboard
    if (match.isCpuOpponent) {
      // Defender is player2 (CPU side)
      const defenderAddr = p2Addr;
      const attackerWon = isPlayer1Winner;

      // Find defender's deck and leaderboard entry
      const defenderDecks = await ctx.db
        .query("tcgDecks")
        .withIndex("by_address", (q: any) => q.eq("address", match.player2Address || ""))
        .collect();

      const defenderDeck = defenderDecks.find((d: any) =>
        d.defensePoolActive === true
      );

      if (defenderDeck) {
        if (attackerWon) {
          // Attacker won: defender loses winnerReward from pool
          const newPool = Math.max(0, (defenderDeck.defensePool || 0) - winnerReward);
          if (newPool <= 0) {
            // Pool depleted
            await ctx.db.patch(defenderDeck._id, {
              defensePool: 0,
              defensePoolActive: false,
              isDefenseDeck: false,
            });
          } else {
            await ctx.db.patch(defenderDeck._id, {
              defensePool: newPool,
            });
          }
        } else {
          // Defender won (CPU won): defender gains winnerReward in pool
          await ctx.db.patch(defenderDeck._id, {
            defensePool: (defenderDeck.defensePool || 0) + winnerReward,
          });
        }
      }

      // Update leaderboard
      const leaderboardEntry = await ctx.db
        .query("tcgDefenseLeaderboard")
        .withIndex("by_address", (q: any) => q.eq("address", defenderAddr))
        .first();

      if (leaderboardEntry) {
        if (attackerWon) {
          // Defender lost - loses winnerReward from pool
          const newPool = Math.max(0, leaderboardEntry.poolAmount - winnerReward);
          await ctx.db.patch(leaderboardEntry._id, {
            totalLosses: leaderboardEntry.totalLosses + 1,
            totalLost: leaderboardEntry.totalLost + winnerReward,
            poolAmount: newPool,
            lastUpdated: Date.now(),
          });
          if (newPool <= 0) {
            await ctx.db.delete(leaderboardEntry._id);
          }
        } else {
          // Defender won - gains winnerReward
          await ctx.db.patch(leaderboardEntry._id, {
            totalWins: leaderboardEntry.totalWins + 1,
            totalEarned: leaderboardEntry.totalEarned + winnerReward,
            poolAmount: leaderboardEntry.poolAmount + winnerReward,
            lastUpdated: Date.now(),
          });
        }
      }
    }

    // Mark match as stake-paid to prevent double processing
    await ctx.db.patch(args.matchId, { stakePaid: true } as any);

    console.log(`💰 Staked match finished: winner=${winnerAddr}, reward=${winnerReward}, attackFee=${attackFee}, tax=${contractTax}`);
    return {
      success: true,
      winnerReward,
      attackFee,
      contractTax,
    };
  },
});
