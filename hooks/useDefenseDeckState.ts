"use client";

import { useState } from "react";
import type { CollectionId } from "@/lib/collections/index";

type AiDifficulty = 'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad';

/**
 * Defense deck, PvE card selection, and AI difficulty state from page.tsx
 */
export function useDefenseDeckState() {
  // Defense deck config
  const [defenseDeckWarningDismissed, setDefenseDeckWarningDismissed] = useState<boolean>(false);
  const [defenseDeckSaveStatus, setDefenseDeckSaveStatus] = useState<string>('');
  const [defenseDeckSortByPower, setDefenseDeckSortByPower] = useState<boolean>(true);
  const [defenseDeckCollection, setDefenseDeckCollection] = useState<CollectionId | 'all'>('all');

  // PvE card selection
  const [pveSelectedCards, setPveSelectedCards] = useState<any[]>([]);
  const [pveSortByPower, setPveSortByPower] = useState<boolean>(false);

  // AI difficulty
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('gey');
  const [unlockedDifficulties, setUnlockedDifficulties] = useState<Set<string>>(new Set(['gey']));
  const [tempSelectedDifficulty, setTempSelectedDifficulty] = useState<AiDifficulty | null>(null);

  return {
    defenseDeckWarningDismissed, setDefenseDeckWarningDismissed,
    defenseDeckSaveStatus, setDefenseDeckSaveStatus,
    defenseDeckSortByPower, setDefenseDeckSortByPower,
    defenseDeckCollection, setDefenseDeckCollection,
    pveSelectedCards, setPveSelectedCards,
    pveSortByPower, setPveSortByPower,
    aiDifficulty, setAiDifficulty,
    unlockedDifficulties, setUnlockedDifficulties,
    tempSelectedDifficulty, setTempSelectedDifficulty,
  };
}
