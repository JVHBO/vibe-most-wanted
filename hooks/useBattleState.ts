"use client";

import { useState } from "react";

export const VICTORY_IMAGES = [
  '/victory-1.jpg',
  '/victory-2.jpg',
  '/victory-3.jpg',
  '/bom.jpg',
];

export type BattleResult = {
  result: 'win' | 'loss' | 'tie';
  playerPower: number;
  opponentPower: number;
  opponentName: string;
  opponentTwitter?: string;
  type: 'pve' | 'pvp' | 'attack' | 'defense';
  coinsEarned?: number;
  playerPfpUrl?: string;
  opponentPfpUrl?: string;
};

/**
 * Centralizes all battle/game-flow state from page.tsx.
 */
export function useBattleState() {
  // Core battle
  const [result, setResult] = useState<string>('');
  const [isBattling, setIsBattling] = useState<boolean>(false);
  const [dealerCards, setDealerCards] = useState<any[]>([]);
  const [battlePhase, setBattlePhase] = useState<string>('cards');
  const [battleOpponentName, setBattleOpponentName] = useState<string>('Dealer');
  const [battlePlayerName, setBattlePlayerName] = useState<string>('You');
  const [battlePlayerPfp, setBattlePlayerPfp] = useState<string | null>(null);
  const [battleOpponentPfp, setBattleOpponentPfp] = useState<string | null>(null);
  const [currentVictoryImage, setCurrentVictoryImage] = useState<string>(VICTORY_IMAGES[0]);
  const [lastBattleResult, setLastBattleResult] = useState<BattleResult | null>(null);
  const [tieGifLoaded, setTieGifLoaded] = useState<boolean>(false);
  const [sharesRemaining, setSharesRemaining] = useState<number | undefined>(undefined);

  // Game mode
  const [gameMode, setGameMode] = useState<'ai' | 'pvp' | null>(null);
  const [pvpMode, setPvpMode] = useState<'menu' | 'pvpMenu' | 'autoMatch' | 'selectMode' | 'createRoom' | 'joinRoom' | 'inRoom' | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [eliminationDifficulty, setEliminationDifficulty] = useState<'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad'>('gey');

  // Elimination mode
  const [battleMode, setBattleMode] = useState<'normal' | 'elimination'>('normal');
  const [eliminationPhase, setEliminationPhase] = useState<'ordering' | 'battle' | null>(null);
  const [orderedPlayerCards, setOrderedPlayerCards] = useState<any[]>([]);
  const [orderedOpponentCards, setOrderedOpponentCards] = useState<any[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundResults, setRoundResults] = useState<('win' | 'loss' | 'tie')[]>([]);
  const [eliminationPlayerScore, setEliminationPlayerScore] = useState<number>(0);
  const [eliminationOpponentScore, setEliminationOpponentScore] = useState<number>(0);

  // PvP preview
  const [pvpPreviewData, setPvpPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  return {
    // Core battle
    result, setResult,
    isBattling, setIsBattling,
    dealerCards, setDealerCards,
    battlePhase, setBattlePhase,
    battleOpponentName, setBattleOpponentName,
    battlePlayerName, setBattlePlayerName,
    battlePlayerPfp, setBattlePlayerPfp,
    battleOpponentPfp, setBattleOpponentPfp,
    currentVictoryImage, setCurrentVictoryImage,
    lastBattleResult, setLastBattleResult,
    tieGifLoaded, setTieGifLoaded,
    sharesRemaining, setSharesRemaining,
    // Game mode
    gameMode, setGameMode,
    pvpMode, setPvpMode,
    roomCode, setRoomCode,
    currentRoom, setCurrentRoom,
    eliminationDifficulty, setEliminationDifficulty,
    // Elimination
    battleMode, setBattleMode,
    eliminationPhase, setEliminationPhase,
    orderedPlayerCards, setOrderedPlayerCards,
    orderedOpponentCards, setOrderedOpponentCards,
    currentRound, setCurrentRound,
    roundResults, setRoundResults,
    eliminationPlayerScore, setEliminationPlayerScore,
    eliminationOpponentScore, setEliminationOpponentScore,
    // PvP preview
    pvpPreviewData, setPvpPreviewData,
    isLoadingPreview, setIsLoadingPreview,
  };
}
