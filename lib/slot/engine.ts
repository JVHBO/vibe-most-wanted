import { COMBO_TRANSLATION_KEYS, detectCombos } from "../tcg/combos";
import { getComboVoicePath } from "../tcg/comboMeta";
import {
  CARD_COMBOS,
  resolveCardName,
  type DeckCard,
} from "../tcgRules";
import type { CardCombo } from "../tcg/types";
import {
  SLOT_BONUS_FOIL_COUNT,
  SLOT_BONUS_FREE_SPINS,
  SLOT_BONUS_WILDCARD,
  SLOT_COLS,
  SLOT_ROWS,
  SLOT_RARITY_ORDER,
  SLOT_RARITY_REWARD,
  SLOT_TOTAL_CELLS,
  createSlotCard,
  getSlotCardRarity,
  pickSlotCard,
  type SlotCard,
  type SlotRarity,
} from "./config";

const NORMAL_FOIL_CHANCE = 0.15;
const BONUS_FOIL_CHANCE = 0.18;
const BONUS_WEIGHT_MULTIPLIER = 3.5;
const BONUS_WILDCARD_SPAWN_CHANCE = 0.12;
const BONUS_WILDCARD_FORCE_SPAWN_CHANCE = 0.4;
const MAX_CHAIN_STEPS = 20;

export type SlotPhase =
  | "IDLE"
  | "SPIN"
  | "COMBO"
  | "CASCADE"
  | "BONUS"
  | "END";

export type SlotBonusState = {
  persistentWildcards: Array<{
    index: number;
    growthLevel: number;
  }>;
};

export type SlotComboPresentation = {
  id: string;
  name: string;
  description: string;
  translationKey: string | null;
  audioPath: string | null;
  cards: string[];
  minCards: number;
};

export type SlotComboStep = {
  combo: SlotComboPresentation;
  beforeGrid: SlotCard[];
  afterGrid: SlotCard[];
  matchedIndices: number[];
  removedIndices: number[];
  preservedFoilIndices: number[];
  wildcardIndices: number[];
  fillIndices: number[];
  reward: number;
};

export type SlotSpinResolution = {
  initialGrid: SlotCard[];
  comboSteps: SlotComboStep[];
  finalGrid: SlotCard[];
  totalWin: number;
  finalFoilCount: number;
  triggeredBonus: boolean;
  bonusSpinsAwarded: number;
  bonusState: SlotBonusState;
};

export type SlotComboCatalogEntry = {
  combo: SlotComboPresentation;
  availableCards: string[];
  missingCards: string[];
  possibleInSlot: boolean;
};

type SlotComboMatch = {
  combo: CardCombo;
  matchedIndices: number[];
  wildcardIndices: number[];
  removedIndices: number[];
  preservedFoilIndices: number[];
  reward: number;
  staticKey: string;
};

function cloneCard(card: SlotCard): SlotCard {
  return createSlotCard(card);
}

export function cloneGrid(grid: SlotCard[]): SlotCard[] {
  return grid.map(cloneCard);
}

export function isSlotBonusWildcard(card: Pick<SlotCard, "baccarat">): boolean {
  return card.baccarat === SLOT_BONUS_WILDCARD;
}

export function countFoils(grid: SlotCard[]): number {
  return grid.filter((card) => card.hasFoil).length;
}

function createBonusWildcard(level = 1): SlotCard {
  return createSlotCard({
    baccarat: SLOT_BONUS_WILDCARD,
    rarity: "Special",
    wildcardLevel: Math.max(1, Math.min(4, level)),
    persistentWildcard: true,
  });
}

function createRandomSlotCard(isBonusMode: boolean, allowWildcardSpawn: boolean): SlotCard {
  if (
    isBonusMode &&
    allowWildcardSpawn &&
    Math.random() < BONUS_WILDCARD_SPAWN_CHANCE
  ) {
    return createBonusWildcard(1);
  }

  const picked = pickSlotCard(isBonusMode ? BONUS_WEIGHT_MULTIPLIER : 1);
  const foilChance = isBonusMode ? BONUS_FOIL_CHANCE : NORMAL_FOIL_CHANCE;

  return createSlotCard({
    baccarat: picked.baccarat,
    rarity: picked.rarity,
    hasFoil: Math.random() < foilChance,
  });
}

export function createInitialSlotGrid(
  isBonusMode: boolean,
  bonusState?: SlotBonusState | null,
): SlotCard[] {
  const persistentWildcards = new Map<number, number>(
    (bonusState?.persistentWildcards ?? []).map((entry) => [
      entry.index,
      entry.growthLevel,
    ]),
  );

  const grid: SlotCard[] = [];
  let hasWildcard = persistentWildcards.size > 0;

  for (let index = 0; index < SLOT_TOTAL_CELLS; index += 1) {
    const persistentLevel = persistentWildcards.get(index);
    if (persistentLevel) {
      grid.push(createBonusWildcard(persistentLevel));
      continue;
    }

    const card = createRandomSlotCard(isBonusMode, isBonusMode);
    if (isSlotBonusWildcard(card)) {
      hasWildcard = true;
    }
    grid.push(card);
  }

  if (isBonusMode && !hasWildcard && Math.random() < BONUS_WILDCARD_FORCE_SPAWN_CHANCE) {
    const replaceIndex = Math.floor(Math.random() * SLOT_TOTAL_CELLS);
    grid[replaceIndex] = createBonusWildcard(1);
  }

  return grid;
}

function toDeckCard(card: SlotCard, index: number): DeckCard {
  return {
    cardId: `slot-${index}-${card.baccarat}`,
    name: card.baccarat,
    rarity: card.rarity,
    power: 0,
    imageUrl: "",
    foil: card.hasFoil ? "foil" : undefined,
    type: isSlotBonusWildcard(card)
      ? "vibefid"
      : card.baccarat === "vbms_special"
        ? "vbms"
        : "other",
  };
}

function getHighestRarity(indices: number[], grid: SlotCard[]): SlotRarity {
  const raritySet = indices
    .map((index) => grid[index]?.rarity)
    .filter(Boolean) as SlotRarity[];

  for (const rarity of SLOT_RARITY_ORDER) {
    if (raritySet.includes(rarity)) {
      return rarity;
    }
  }

  return "Common";
}

export function getSlotComboPresentation(combo: CardCombo): SlotComboPresentation {
  return {
    id: combo.id,
    name: combo.name,
    description: combo.description,
    translationKey: COMBO_TRANSLATION_KEYS[combo.id] ?? null,
    audioPath: getComboVoicePath(combo.id),
    cards: combo.cards,
    minCards: combo.minCards ?? combo.cards.length,
  };
}

function getSlotComboReward(
  combo: CardCombo,
  matchedIndices: number[],
  wildcardIndices: number[],
  grid: SlotCard[],
): number {
  const highestRarity = getHighestRarity(matchedIndices, grid);
  const baseReward = SLOT_RARITY_REWARD[highestRarity] ?? SLOT_RARITY_REWARD.Common;
  const cardFactor = Math.max(
    combo.minCards ?? combo.cards.length,
    matchedIndices.length + wildcardIndices.length,
  );
  const typeMultiplier =
    combo.bonus.type === "power_percent"
      ? 1.2
      : combo.bonus.type === "steal"
        ? 1.1
        : 1;

  return Math.max(
    20,
    Math.round((baseReward + combo.bonus.value * cardFactor) * typeMultiplier),
  );
}

function collectComboMatch(
  grid: SlotCard[],
  comboResult: ReturnType<typeof detectCombos>[number],
): SlotComboMatch | null {
  const usedIndices = new Set<number>();
  const matchedIndices: number[] = [];
  const matchedCardNames = new Set(comboResult.matchedCards.map((name) => resolveCardName(name)));

  for (const cardName of comboResult.combo.cards.map((name) => resolveCardName(name))) {
    if (!matchedCardNames.has(cardName)) {
      continue;
    }

    const index = grid.findIndex(
      (card, cardIndex) =>
        !usedIndices.has(cardIndex) &&
        resolveCardName(card.baccarat) === cardName,
    );

    if (index >= 0) {
      matchedIndices.push(index);
      usedIndices.add(index);
    }
  }

  const wildcardIndices: number[] = [];
  for (let index = 0; index < grid.length; index += 1) {
    if (wildcardIndices.length >= comboResult.wildcardsUsed) {
      break;
    }
    if (usedIndices.has(index)) {
      continue;
    }
    if (isSlotBonusWildcard(grid[index])) {
      wildcardIndices.push(index);
      usedIndices.add(index);
    }
  }

  const requiredCount = comboResult.combo.minCards ?? comboResult.combo.cards.length;
  if (matchedIndices.length + wildcardIndices.length < requiredCount) {
    return null;
  }

  const preservedFoilIndices = matchedIndices.filter((index) => grid[index]?.hasFoil);
  const removedIndices = matchedIndices.filter((index) => !grid[index]?.hasFoil);
  const highlightKey = [...matchedIndices, ...wildcardIndices]
    .sort((left, right) => left - right)
    .join(",");

  return {
    combo: comboResult.combo,
    matchedIndices,
    wildcardIndices,
    removedIndices,
    preservedFoilIndices,
    reward: getSlotComboReward(
      comboResult.combo,
      matchedIndices,
      wildcardIndices,
      grid,
    ),
    staticKey: `${comboResult.combo.id}:${highlightKey}`,
  };
}

function findNextCombo(
  grid: SlotCard[],
  skippedStaticCombos: Set<string>,
): SlotComboMatch | null {
  const comboResults = detectCombos(grid.map(toDeckCard));

  for (const comboResult of comboResults) {
    const slotMatch = collectComboMatch(grid, comboResult);
    if (!slotMatch) {
      continue;
    }
    if (skippedStaticCombos.has(slotMatch.staticKey)) {
      continue;
    }
    return slotMatch;
  }

  return null;
}

function growWildcards(grid: SlotCard[], wildcardIndices: number[]): SlotCard[] {
  const nextGrid = cloneGrid(grid);

  for (const index of wildcardIndices) {
    const card = nextGrid[index];
    if (!card || !isSlotBonusWildcard(card)) {
      continue;
    }
    nextGrid[index] = createBonusWildcard((card.wildcardLevel ?? 1) + 1);
  }

  return nextGrid;
}

function cascadeGrid(
  grid: SlotCard[],
  removedIndices: number[],
  isBonusMode: boolean,
): { afterGrid: SlotCard[]; fillIndices: number[] } {
  if (removedIndices.length === 0) {
    return { afterGrid: cloneGrid(grid), fillIndices: [] };
  }

  const workingGrid: Array<SlotCard | null> = cloneGrid(grid);
  for (const index of removedIndices) {
    workingGrid[index] = null;
  }

  const fillIndices: number[] = [];
  const afterGrid = new Array<SlotCard>(SLOT_TOTAL_CELLS);

  for (let col = 0; col < SLOT_COLS; col += 1) {
    const survivors: SlotCard[] = [];
    for (let row = 0; row < SLOT_ROWS; row += 1) {
      const index = row * SLOT_COLS + col;
      const card = workingGrid[index];
      if (card) {
        survivors.push(cloneCard(card));
      }
    }

    const missingCount = SLOT_ROWS - survivors.length;
    const newCards = Array.from({ length: missingCount }, () =>
      createRandomSlotCard(isBonusMode, isBonusMode),
    );

    for (let row = 0; row < missingCount; row += 1) {
      fillIndices.push(row * SLOT_COLS + col);
    }

    const finalColumn = [...newCards, ...survivors];
    for (let row = 0; row < SLOT_ROWS; row += 1) {
      afterGrid[row * SLOT_COLS + col] = finalColumn[row]!;
    }
  }

  return { afterGrid, fillIndices };
}

function makeGridSignature(grid: SlotCard[]): string {
  return grid
    .map((card) => `${card.baccarat}:${card.hasFoil ? "f" : "n"}`)
    .join("|");
}

export function extractBonusState(grid: SlotCard[]): SlotBonusState {
  return {
    persistentWildcards: grid
      .map((card, index) =>
        isSlotBonusWildcard(card)
          ? {
              index,
              growthLevel: card.wildcardLevel ?? 1,
            }
          : null,
      )
      .filter(Boolean) as SlotBonusState["persistentWildcards"],
  };
}

export function resolveSlotSpin(
  isBonusMode: boolean,
  bonusState?: SlotBonusState | null,
): SlotSpinResolution {
  const initialGrid = createInitialSlotGrid(isBonusMode, bonusState);
  const comboSteps: SlotComboStep[] = [];
  let currentGrid = cloneGrid(initialGrid);
  let totalWin = 0;
  let skippedStaticCombos = new Set<string>();

  for (let guard = 0; guard < MAX_CHAIN_STEPS; guard += 1) {
    const comboMatch = findNextCombo(currentGrid, skippedStaticCombos);
    if (!comboMatch) {
      break;
    }

    const beforeGrid = cloneGrid(currentGrid);
    const gridAfterWildcardGrowth = growWildcards(currentGrid, comboMatch.wildcardIndices);
    const { afterGrid, fillIndices } = cascadeGrid(
      gridAfterWildcardGrowth,
      comboMatch.removedIndices,
      isBonusMode,
    );

    comboSteps.push({
      combo: getSlotComboPresentation(comboMatch.combo),
      beforeGrid,
      afterGrid,
      matchedIndices: comboMatch.matchedIndices,
      removedIndices: comboMatch.removedIndices,
      preservedFoilIndices: comboMatch.preservedFoilIndices,
      wildcardIndices: comboMatch.wildcardIndices,
      fillIndices,
      reward: comboMatch.reward,
    });

    totalWin += comboMatch.reward;

    if (comboMatch.removedIndices.length === 0) {
      skippedStaticCombos.add(comboMatch.staticKey);
    } else {
      skippedStaticCombos = new Set<string>();
    }

    const previousSignature = makeGridSignature(currentGrid);
    currentGrid = cloneGrid(afterGrid);
    if (comboMatch.removedIndices.length === 0 && makeGridSignature(currentGrid) !== previousSignature) {
      skippedStaticCombos = new Set<string>();
    }
  }

  const finalFoilCount = countFoils(currentGrid);
  const bonusSpinsAwarded =
    !isBonusMode && finalFoilCount >= SLOT_BONUS_FOIL_COUNT
      ? SLOT_BONUS_FREE_SPINS
      : 0;

  return {
    initialGrid,
    comboSteps,
    finalGrid: currentGrid,
    totalWin,
    finalFoilCount,
    triggeredBonus: bonusSpinsAwarded > 0,
    bonusSpinsAwarded,
    bonusState: extractBonusState(currentGrid),
  };
}

export function getSlotComboCatalog(): SlotComboCatalogEntry[] {
  return CARD_COMBOS.map((combo) => {
    const availableCards = combo.cards.filter(
      (cardName) => getSlotCardRarity(resolveCardName(cardName)) !== null,
    );
    const missingCards = combo.cards.filter(
      (cardName) => getSlotCardRarity(resolveCardName(cardName)) === null,
    );

    return {
      combo: getSlotComboPresentation(combo),
      availableCards,
      missingCards,
      possibleInSlot: availableCards.length >= (combo.minCards ?? combo.cards.length),
    };
  });
}
