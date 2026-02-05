/**
 * TCG CPU AI - Deck generation and card play strategy
 * Fix Issue #9: CPU sacrifices Nothing cards when low energy
 * Fix Issue #12: CPU strategy variation (30% aggressive, 40% balanced, 20% defensive, 10% chaotic)
 */

import type { DeckCard, TCGAbility } from "@/lib/tcgRules";
import tcgCardsData from "@/data/vmw-tcg-cards.json";
import { getCardAbility, getEnergyCost } from "@/lib/tcg/abilities";

// CPU strategy types for Issue #12
type CpuStrategy = "aggressive" | "balanced" | "defensive" | "chaotic";

function rollStrategy(): CpuStrategy {
  const roll = Math.random();
  if (roll < 0.30) return "aggressive";
  if (roll < 0.70) return "balanced";
  if (roll < 0.90) return "defensive";
  return "chaotic";
}

export const generateCpuDeck = (playerDeck: DeckCard[]): DeckCard[] => {
  const allCards = tcgCardsData.cards || [];

  const rarityPower: Record<string, number> = {
    "Mythic": 800,
    "Legendary": 240,
    "Epic": 80,
    "Rare": 20,
    "Common": 5,
  };

  const rankMap: Record<string, string> = {
    'A': 'ace', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
    '7': '7', '8': '8', '9': '9', '10': '10', 'J': 'jack', 'Q': 'queen', 'K': 'king'
  };

  return allCards.map((card: any, i: number) => {
    const foilRoll = Math.random();
    const foil = foilRoll < 0.1 ? "Prize" : foilRoll < 0.35 ? "Standard" : "None";

    const basePower = rarityPower[card.rarity] || 5;
    const foilMult = foil === "Prize" ? 3 : foil === "Standard" ? 1.5 : 1;
    const power = Math.floor(basePower * foilMult * (0.95 + Math.random() * 0.15));

    const baccarat = card.baccarat?.toLowerCase() || card.onChainName?.toLowerCase();
    let imageUrl = "/images/card-back.png";

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

// Smart CPU AI logic with ability support, Nothing sacrifice, and strategy variation
export const cpuPlayCards = (
  gameState: any,
  calculateOngoingBonus: (card: DeckCard, laneIndex: number, lanes: any[], currentTurn: number, isPlayer: boolean) => number,
  t?: (key: string) => string
): any => {
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

  // FIX Issue #12: Roll strategy for this turn
  const strategy = rollStrategy();

  // FIX Issue #9: CPU sacrifices Nothing cards when low energy and has no good plays
  const hasAffordableGoodCard = cpuHand.some((card: DeckCard) => {
    if (card.type === "nothing" || card.type === "other") return false;
    return getEnergyCost(card) <= cpuEnergy;
  });

  if (cpuEnergy < 3 && !hasAffordableGoodCard) {
    const nothingIdx = cpuHand.findIndex((c: DeckCard) => c.type === "nothing" || c.type === "other");
    if (nothingIdx >= 0) {
      cpuHand = cpuHand.filter((_: any, i: number) => i !== nothingIdx);
      cpuEnergy += 2;
      // Draw a card
      if (cpuDeckRemaining.length > 0) {
        cpuHand.push(cpuDeckRemaining[0]);
        cpuDeckRemaining = cpuDeckRemaining.slice(1);
      }
    }
  }

  // Sort hand by power (highest first), prioritizing cards with powerful abilities
  const sortedHand = cpuHand
    .map((card: DeckCard, idx: number) => {
      const ability = getCardAbility(card.name, card, t);
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

  const playCpuCard = (card: DeckCard, laneIdx: number) => {
    cpuPlays.push({ cardName: card.name || "Unknown", lane: laneIdx + 1 });
    const cardWithMeta = {
      ...card,
      _playedThisTurn: true,
      _playedLaneIndex: laneIdx,
      _revealed: false,
    };
    newLanes[laneIdx].cpuCards.push(cardWithMeta);
  };

  const getCardCost = (card: DeckCard) => getEnergyCost(card);

  // FIX Issue #12: Strategy-based lane sorting
  const sortLanesByStrategy = (laneAnalysis: any[]) => {
    switch (strategy) {
      case "aggressive":
        // Prioritize lanes we're already winning (reinforce)
        return [...laneAnalysis].sort((a, b) => {
          if (a.isWinning && !b.isWinning) return -1;
          if (!a.isWinning && b.isWinning) return 1;
          return a.deficit - b.deficit;
        });
      case "defensive":
        // Prioritize lanes we're losing (shore up)
        return [...laneAnalysis].sort((a, b) => {
          if (a.deficit > 0 && b.deficit <= 0) return -1;
          if (a.deficit <= 0 && b.deficit > 0) return 1;
          return b.deficit - a.deficit;
        });
      case "chaotic":
        // Random order (bluff)
        return [...laneAnalysis].sort(() => Math.random() - 0.5);
      case "balanced":
      default:
        // Original behavior: close lanes first, then losing
        return [...laneAnalysis].sort((a, b) => {
          if (a.isClose && !b.isClose) return -1;
          if (!a.isClose && b.isClose) return 1;
          if (a.deficit > 0 && b.deficit <= 0) return -1;
          if (a.deficit <= 0 && b.deficit > 0) return 1;
          return a.deficit - b.deficit;
        });
    }
  };

  while (cpuEnergy > 0 && usedCardIndices.size < sortedHand.length) {
    const laneAnalysis = analyzeLanes();
    const sortedLanes = sortLanesByStrategy(laneAnalysis);

    let playedThisRound = false;

    // FIX Issue #12: 15% chance of bluff (play weak card in strong lane)
    const shouldBluff = strategy !== "balanced" && Math.random() < 0.15;

    for (const laneInfo of sortedLanes) {
      if (playedThisRound) break;

      // Choose card order based on bluff
      const cardOrder = shouldBluff ? [...sortedHand].reverse() : sortedHand;

      for (const { card, originalIdx } of cardOrder) {
        if (usedCardIndices.has(originalIdx)) continue;

        const cardCost = getCardCost(card);
        if (cardCost > cpuEnergy) continue;

        // Don't over-commit to lanes we're already winning big (except chaotic)
        if (strategy !== "chaotic" && laneInfo.cpuPower > laneInfo.playerPower + 100 && laneInfo.cpuCards >= 2) {
          continue;
        }

        playCpuCard(card, laneInfo.laneIdx);
        usedCardIndices.add(originalIdx);
        cpuEnergy -= cardCost;
        cardsPlayed++;
        playedThisRound = true;
        break;
      }
    }

    // If couldn't play to priority lanes, try worst lane with affordable card
    if (!playedThisRound) {
      const laneAnalysis2 = analyzeLanes();
      const worstLane = laneAnalysis2.reduce((worst: any, lane: any) =>
        !worst || lane.deficit > worst.deficit ? lane : worst, null);

      for (const { card, originalIdx } of sortedHand) {
        if (usedCardIndices.has(originalIdx)) continue;
        const cardCost = getCardCost(card);
        if (cardCost > cpuEnergy) continue;
        if (worstLane) {
          playCpuCard(card, worstLane.laneIdx);
          usedCardIndices.add(originalIdx);
          cpuEnergy -= cardCost;
          cardsPlayed++;
        }
        break;
      }
    }

    const hasAffordable = sortedHand.some(({ card, originalIdx }) =>
      !usedCardIndices.has(originalIdx) && getCardCost(card) <= cpuEnergy
    );
    if (!hasAffordable) break;
  }

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
