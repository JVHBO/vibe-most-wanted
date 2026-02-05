"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useProfile } from "@/contexts/ProfileContext";
import { useFarcasterVBMSBalance } from "@/lib/hooks/useFarcasterVBMS";
import { usePlayerCards } from "@/contexts/PlayerCardsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { Id } from "@/convex/_generated/dataModel";
import tcgCardsData from "@/data/vmw-tcg-cards.json";
import { getCharacterFromImage } from "@/lib/vmw-image-mapping";
import { CardMedia } from "@/components/CardMedia";

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS FROM EXTRACTED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

import { CardDetailModal as CardDetailModalComponent } from "@/components/tcg/CardDetailModal";
import { ComboDetailModal } from "@/components/tcg/ComboDetailModal";
import { VibeFIDComboModal } from "@/components/tcg/VibeFIDComboModal";
import { BattleLogPanel } from "@/components/tcg/BattleLogPanel";
import { MemeSoundMenu } from "@/components/tcg/MemeSoundMenu";
import { WaitingView } from "@/components/tcg/WaitingView";
import { PvEResultView } from "@/components/tcg/PvEResultView";
import { PvPResultView } from "@/components/tcg/PvPResultView";
import { DeckBuilder } from "@/components/tcg/DeckBuilder";
import { TCGLobby } from "@/components/tcg/TCGLobby";

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS FROM EXTRACTED MODULES
// ═══════════════════════════════════════════════════════════════════════════════

import { TCG_CONFIG, CARD_NAME_ALIASES, resolveCardName, CARD_COMBOS, type DeckCard, type TCGAbility, type GameLane } from "@/lib/tcgRules";
import type { GameView, GameAction, CardPlayedInfo, PvEGameState, CardCombo, BattleLogEntry, VisualEffectState, CardAnimation, AbilityEffectAnim, FlyingCardState, VibeFIDComboModalState } from "@/lib/tcg/types";
import type { GamePhase } from "@/lib/tcg/types";
import { COLLECTION_COVERS, getCollectionCoverUrl, getVbmsBaccaratImageUrl, getCardDisplayImageUrl } from "@/lib/tcg/images";
import { playSound, stopBgm, playComboVoice, playFiveSecondWarning, playTrackedAudio, playMemeSound, COMBO_VOICE_FILES } from "@/lib/tcg/audio";
import { getRarityCost, sortByResolutionOrder, getVibeFIDAbility, getCardAbility, getTranslatedAbility, getAbilityVisualEffect, getFoilEffect, getFoilClass, getEnergyCost, getAbilityTypeColor, getAbilityTypeLabel, tcgAbilities } from "@/lib/tcg/abilities";
import { generateCpuDeck, cpuPlayCards } from "@/lib/tcg/cpu-ai";
import { detectCombos, getComboBonus, getComboSteal, COMBO_TRANSLATION_KEYS } from "@/lib/tcg/combos";

// Collections that can be played in TCG (with 50% power like nothing)
const OTHER_TCG_COLLECTIONS = ["gmvbrs", "cumioh", "viberotbangers", "meowverse", "teampothead", "tarot", "baseballcabal", "poorlydrawnpepes", "viberuto", "vibefx", "historyofcomputer"];

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & GAME PHASES
// ═══════════════════════════════════════════════════════════════════════════════

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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function TCGPage() {
  const router = useRouter();
  const convex = useConvex();
  const { address, isConnected } = useAccount();
  const { userProfile } = useProfile();
  const { nfts, isLoading: cardsLoading, loadNFTs, status } = usePlayerCards();
  const { t, lang } = useLanguage();

  // VBMS onchain balance
  const { balance: vbmsBalance, refetch: refetchVBMS } = useFarcasterVBMSBalance(address);

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
  const [error, setError] = useState<string | null>(null);

  // (Deck builder state moved to components/tcg/DeckBuilder.tsx)
  // (Lobby state moved to components/tcg/TCGLobby.tsx)

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
  const [dailyBattles, setDailyBattles] = useState(0); // Track daily battles (loaded from server)
  const [autoSelectCombo, setAutoSelectCombo] = useState(() => typeof window !== "undefined" && localStorage.getItem("tcg_auto_select_combo") === "true");
  const REWARDED_BATTLES_PER_DAY = 5; // First 5 battles give AURA reward
  const BATTLE_AURA_REWARD = 85; // AURA reward per win (first 5 daily)

  // PvP animation state - track previous game state to detect changes
  const prevPvPGameStateRef = useRef<any>(null);
  const [pvpPowerChanges, setPvpPowerChanges] = useState<Record<string, number>>({});
  const [pvpCardAnimClass, setPvpCardAnimClass] = useState<Record<string, string>>({});

  // Battle Log (BattleLogEntry type imported from @/lib/tcg/types)
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [showBattleLog, setShowBattleLog] = useState(false);

  // TCG match count for missions
  const [tcgMatchCount, setTcgMatchCount] = useState(0);
  const [tcgWinStreak, setTcgWinStreak] = useState(0);

  // Turn timer state
  const [turnTimeRemaining, setTurnTimeRemaining] = useState<number>(TCG_CONFIG.TURN_TIME_SECONDS);
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

  // (Lobby state moved to components/tcg/TCGLobby.tsx)

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

  // Convex mutations (lobby mutations moved to components/tcg/TCGLobby.tsx)
  const submitActions = useMutation(api.tcg.submitActions);
  const cancelMatch = useMutation(api.tcg.cancelMatch);
  const forfeitMatch = useMutation(api.tcg.forfeitMatch);
  const heartbeatMutation = useMutation(api.tcg.heartbeat);
  const claimVictoryByTimeout = useMutation(api.tcg.claimVictoryByTimeout);
  const awardPvECoins = useMutation(api.economy.awardPvECoins);
  const markTcgMission = useMutation(api.tcg.markTcgMission);
  const recordPvEBattle = useMutation(api.tcg.recordPvEBattle);
  const finishStakedMatchMutation = useMutation(api.tcg.finishStakedMatch);

  // Defense pool queries (passed as props to TCGLobby)
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

  // getRarityCost and sortByResolutionOrder imported from @/lib/tcg/abilities

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


  // ═══════════════════════════════════════════════════════════════════════════════
  // ABILITY HELPERS, CPU AI - imported from @/lib/tcg/abilities and @/lib/tcg/cpu-ai
  // getVibeFIDAbility, getCardAbility, getTranslatedAbility, getAbilityVisualEffect,
  // getFoilEffect, getFoilClass, getEnergyCost, getAbilityTypeColor, getAbilityTypeLabel
  // generateCpuDeck, cpuPlayCards
  // ═══════════════════════════════════════════════════════════════════════════════


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

    // Increment daily battle counter (optimistic update, server records on match end)
    setDailyBattles(prev => prev + 1);

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
    shownCombosRef.current.clear(); // FIX Issue #8: Reset combo voice tracking per match (not per turn)
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
    const ability = getCardAbility(card.name, card, t as (k: string) => string);
    if (!ability || ability.type !== "onReveal") {
      return { lanes, playerHand, playerDeckRemaining, bonusPower: 0, energyToConsume: 0 };
    }

    // Helper to add ability log with enhanced details
    const logAbility = (
      action: string,
      opts?: {
        abilityName?: string;
        effectType?: "buff" | "debuff" | "destroy" | "steal" | "draw" | "move" | "copy" | "special";
        targets?: string[];
        powerChange?: number;
        details?: string;
      }
    ) => {
      if (addToBattleLog && currentTurn !== undefined) {
        addToBattleLog({
          turn: currentTurn,
          player: isPlayer ? "you" : "cpu",
          action,
          lane: laneIndex + 1,
          cardName: card.name || "Unknown",
          abilityName: opts?.abilityName || ability?.name,
          effectType: opts?.effectType,
          targets: opts?.targets,
          powerChange: opts?.powerChange,
          details: opts?.details,
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
        logAbility(`⚡ +${bonusPower} power`, { effectType: "buff", powerChange: bonusPower, details: "Self buff" });
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
          logAbility(`⬆️ buffed ally +${effect.value}`, { effectType: "buff", targets: [targetCard.name || "Unknown"], powerChange: effect.value || 0 });
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
          logAbility(`⬇️ debuffed enemy -${Math.abs(effect.value || 0)}`, { effectType: "debuff", targets: [targetCard.name || "Unknown"], powerChange: -Math.abs(effect.value || 0) });
        }
        break;

      case "draw":
        // Draw X cards (respecting MAX_HAND_SIZE)
        const drawCount = effect.value || 1;
        let actualDrawn = 0;
        let burned = 0;
        for (let i = 0; i < drawCount && newDeck.length > 0; i++) {
          if (newHand.length < TCG_CONFIG.MAX_HAND_SIZE) {
            newHand.push(newDeck.shift()!);
            actualDrawn++;
          } else {
            const burnedCard = newDeck.shift()!; // Burn card (discard without drawing)
            burned++;
            playSound("destroy");
            logAbility(`🔥 ${burnedCard?.name || "Card"} BURNED (hand full)`, { effectType: "destroy", details: "Hand full - card discarded" });
          }
        }
        logAbility(`🃏 drew ${actualDrawn} card(s)${burned > 0 ? ` (${burned} burned - hand full)` : ""}`, { effectType: "draw", details: `${actualDrawn} drawn${burned > 0 ? `, ${burned} burned` : ""}` });
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
        // Handle draw if specified (Beeper - Signal Boost) - respects MAX_HAND_SIZE
        if (effect.draw && effect.draw > 0) {
          for (let i = 0; i < effect.draw && newDeck.length > 0; i++) {
            if (newHand.length < TCG_CONFIG.MAX_HAND_SIZE) {
              newHand.push(newDeck.shift()!);
            } else {
              newDeck.shift(); // Burn if hand full
            }
          }
        }
        logAbility(`📡 boosted ${myCardsInLane.length} allies +${effect.value}`, { effectType: "buff", powerChange: myCardsInLane.length * (effect.value || 0), details: effect.draw ? `+${effect.draw} draw` : undefined });
        break;

      case "buffOtherLanes":
        // +X power to all cards in OTHER lanes
        let otherLaneCardCount = 0;
        newLanes.forEach((lane: any, idx: number) => {
          if (idx !== laneIndex) {
            lane[myCards].forEach((c: DeckCard, cIdx: number) => {
              lane[myCards][cIdx] = { ...c, power: c.power + (effect.value || 0) };
              otherLaneCardCount++;
            });
            lane[myPower] += lane[myCards].length * (effect.value || 0);
          }
        });
        logAbility(`🌐 buffed ${otherLaneCardCount} cards in other lanes +${effect.value}`, { effectType: "buff", powerChange: otherLaneCardCount * (effect.value || 0) });
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
        logAbility(`💥 debuffed ${enemyCount} enemies -${Math.abs(effect.value || 0)} each`, { effectType: "debuff", powerChange: -(enemyCount * Math.abs(effect.value || 0)) });
        break;

      case "buffPerCardInLane":
        // +X power for each card in this lane
        const cardsInLane = newLanes[laneIndex][myCards].length + 1; // +1 for self
        bonusPower = cardsInLane * (effect.value || 0);
        logAbility(`📊 +${bonusPower} power (${cardsInLane} cards × ${effect.value})`, { effectType: "buff", powerChange: bonusPower, details: `${cardsInLane} cards in lane` });
        break;

      case "buffPerFriendly":
        // +X power for each other friendly card (all lanes)
        let friendlyCount = -1; // don't count self
        newLanes.forEach(lane => {
          friendlyCount += lane[myCards].length;
        });
        bonusPower = Math.max(0, friendlyCount) * (effect.value || 0);
        logAbility(`👥 +${bonusPower} power (${Math.max(0, friendlyCount)} allies × ${effect.value})`, { effectType: "buff", powerChange: bonusPower, details: `${Math.max(0, friendlyCount)} allies total` });
        break;

      case "buffPerEnemyInLane":
        // +basePower + perEnemy for each enemy in lane (Slaterg - Proxy Power)
        const enemiesInLane = newLanes[laneIndex][enemyCards].length;
        bonusPower = (effect.basePower || 0) + (enemiesInLane * (effect.perEnemy || 0));
        logAbility(`🎯 +${bonusPower} power (base ${effect.basePower} + ${enemiesInLane} × ${effect.perEnemy})`, { effectType: "buff", powerChange: bonusPower, details: `${enemiesInLane} enemies in lane` });
        break;

      case "buffIfAlone":
        // +X power if this lane has no other cards
        if (newLanes[laneIndex][myCards].length === 0) {
          bonusPower = effect.value || 0;
          logAbility(`🏝️ +${bonusPower} power (alone in lane)`, { effectType: "buff", powerChange: bonusPower, details: "Solo bonus" });
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
          logAbility(`💪 buffed ${cardToUpdate.name} +${effect.value || 0} (weakest ally)`, { effectType: "buff", targets: [cardToUpdate.name || "Unknown"], powerChange: effect.value || 0 });
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
            logAbility(`💀 KILLED ${cardToDebuff.name}! +${effect.killBonus} bonus`, { effectType: "destroy", targets: [cardToDebuff.name || "Unknown"], powerChange: effect.killBonus || 0, details: "Kill bonus activated" });
          } else {
            logAbility(`🎯 sniped ${cardToDebuff.name} -${reduction}`, { effectType: "debuff", targets: [cardToDebuff.name || "Unknown"], powerChange: -reduction });
          }
        }
        break;

      case "buffLastPlayed":
        // +X power to the last card played
        for (let i = newLanes.length - 1; i >= 0; i--) {
          if (newLanes[i][myCards].length > 0) {
            const lastIdx = newLanes[i][myCards].length - 1;
            const lastPlayedCard = newLanes[i][myCards][lastIdx];
            newLanes[i][myCards][lastIdx] = {
              ...lastPlayedCard,
              power: lastPlayedCard.power + (effect.value || 0),
            };
            newLanes[i][myPower] += effect.value || 0;
            logAbility(`⏮️ buffed last played ${lastPlayedCard.name} +${effect.value}`, { effectType: "buff", targets: [lastPlayedCard.name || "Unknown"], powerChange: effect.value || 0 });
            break;
          }
        }
        break;

      case "stealPower":
        // Steal +X power from enemy here
        if (newLanes[laneIndex][enemyCards].length > 0) {
          const targetIdx = Math.floor(Math.random() * newLanes[laneIndex][enemyCards].length);
          const targetCard = newLanes[laneIndex][enemyCards][targetIdx];
          const stealAmount = Math.min(effect.value || 0, targetCard.power);
          newLanes[laneIndex][enemyCards][targetIdx] = {
            ...targetCard,
            power: targetCard.power - stealAmount,
          };
          newLanes[laneIndex][enemyPower] -= stealAmount;
          bonusPower = stealAmount;
          logAbility(`🔥 stole ${stealAmount} power from ${targetCard.name}`, { effectType: "steal", targets: [targetCard.name || "Unknown"], powerChange: stealAmount });
        }
        break;

      case "gamble":
        // 50% chance: +win or -lose power
        const gambleWon = Math.random() > 0.5;
        if (gambleWon) {
          bonusPower = effect.win || 0;
          logAbility(`🎰 WON! +${bonusPower} power`, { effectType: "special", powerChange: bonusPower, details: "Lucky roll!" });
        } else {
          bonusPower = effect.lose || 0;
          logAbility(`🎰 LOST! ${bonusPower} power`, { effectType: "special", powerChange: bonusPower, details: "Bad luck..." });
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
          logAbility(`⚡ consumed ${remainingEnergy} energy → +${bonusPower} power`, { effectType: "special", powerChange: bonusPower, details: `${remainingEnergy} × ${powerPerEnergy}` });
        }
        break;

      case "buffIfTurn":
        // +X power if played on specific turn
        const currentTurn = pveGameState?.currentTurn || 1;
        if (effect.minTurn && currentTurn >= effect.minTurn) {
          bonusPower = effect.value || 0;
          logAbility(`🕐 late game bonus +${bonusPower}`, { effectType: "buff", powerChange: bonusPower, details: `Turn ${currentTurn}+` });
        } else if (effect.maxTurn && currentTurn <= effect.maxTurn) {
          bonusPower = effect.value || 0;
          logAbility(`🕐 early game bonus +${bonusPower}`, { effectType: "buff", powerChange: bonusPower, details: `Turn ≤${effect.maxTurn}` });
        }
        break;

      case "buffIfHandSize":
        // +X power if you have Y+ cards in hand
        if (newHand.length >= (effect.minCards || 0)) {
          bonusPower = effect.value || 0;
          logAbility(`🃏 hand size bonus +${bonusPower}`, { effectType: "buff", powerChange: bonusPower, details: `${newHand.length} cards in hand` });
        }
        break;

      case "buffPerCardsPlayed":
        // +X power for each card you've played this game
        let cardsPlayedTotal = 0;
        newLanes.forEach((lane: any) => {
          cardsPlayedTotal += lane[myCards].length;
        });
        bonusPower = cardsPlayedTotal * (effect.value || 0);
        logAbility(`📈 +${bonusPower} power (${cardsPlayedTotal} cards played)`, { effectType: "buff", powerChange: bonusPower, details: `${cardsPlayedTotal} × ${effect.value}` });
        break;

      case "buffAllLanes":
        // +X power to all your cards + DOUBLE if winning 2+ lanes! (Neymar - King's Arrival - Mythic)
        let lanesWinning = 0;
        let totalCardsBuffed = 0;
        newLanes.forEach((lane: any) => {
          if (lane[myPower] > lane[enemyPower]) lanesWinning++;
          totalCardsBuffed += lane[myCards].length;
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
        logAbility(`👑 KING'S ARRIVAL! +${buffValue} to ALL (${totalCardsBuffed + 1} cards)`, { effectType: "buff", powerChange: (totalCardsBuffed + 1) * buffValue, details: buffMultiplier === 2 ? "DOUBLED! (winning 2+ lanes)" : undefined });
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
            logAbility(`💀 DESTROYED ${removedCard.name} (+${removedCard.power} power!)`, { effectType: "destroy", targets: [removedCard.name || "Unknown"], powerChange: removedCard.power, details: "Gained destroyed card's power" });
          } else {
            logAbility(`💀 DESTROYED ${removedCard.name}`, { effectType: "destroy", targets: [removedCard.name || "Unknown"] });
          }
        }
        break;

      case "kamikaze":
        // KAMIKAZE: Destroy highest enemy AND destroy self! (Landmine)
        let kamikazeHighestPower = -1;
        let kamikazeHighestLane = -1;
        let kamikazeHighestIdx = -1;
        let kamikazeTargetName = "";
        newLanes.forEach((lane: any, lIdx: number) => {
          lane[enemyCards].forEach((c: DeckCard, cIdx: number) => {
            const effectivePower = c.type === "nothing" || c.type === "other" ? Math.floor(c.power * 0.5) : c.power;
            if (effectivePower > kamikazeHighestPower) {
              kamikazeHighestPower = effectivePower;
              kamikazeHighestLane = lIdx;
              kamikazeHighestIdx = cIdx;
              kamikazeTargetName = c.name || "Unknown";
            }
          });
        });
        // Destroy highest enemy
        if (kamikazeHighestLane >= 0 && kamikazeHighestIdx >= 0) {
          const removedEnemy = newLanes[kamikazeHighestLane][enemyCards].splice(kamikazeHighestIdx, 1)[0];
          newLanes[kamikazeHighestLane][enemyPower] -= removedEnemy.power;
          logAbility(`💣 KAMIKAZE! Destroyed ${kamikazeTargetName} (self-destruct)`, { effectType: "destroy", targets: [kamikazeTargetName || "Unknown", card.name || "Unknown"], details: "Mutual destruction" });
        }
        // Mark self for destruction (will be removed after ability processing)
        card._sacrificed = true;
        bonusPower = -card.power; // Negate own power since card will be destroyed
        break;


      case "copyHighest":
        // Copy highest power + STEAL from all enemies! (Linda Xied - Diamond Authority - Mythic)
        let highestCopyCard: DeckCard | null = null;
        let totalStolenFromAll = 0;
        let highestCopyCardName = "Unknown";
        newLanes.forEach((lane: any) => {
          [...lane.playerCards, ...lane.cpuCards].forEach((c: DeckCard) => {
            if (!highestCopyCard || c.power > highestCopyCard.power) {
              highestCopyCard = c;
              highestCopyCardName = c.name || "Unknown";
            }
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
              totalStolenFromAll += stolen;
            });
          });
        }
        logAbility(`💎 DIAMOND AUTHORITY! Copied ${highestCopyCardName} +stole ${totalStolenFromAll}`, { effectType: "copy", targets: [highestCopyCardName], powerChange: bonusPower, details: "Copied highest + stole from all" });
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
          const card1Name = newLanes[c1.lane][enemyCards][c1.idx].name;
          const card2Name = newLanes[c2.lane][enemyCards][c2.idx].name;
          const temp = newLanes[c1.lane][enemyCards][c1.idx].power;
          newLanes[c1.lane][enemyCards][c1.idx].power = newLanes[c2.lane][enemyCards][c2.idx].power;
          newLanes[c2.lane][enemyCards][c2.idx].power = temp;
          logAbility(`🔀 swapped powers: ${card1Name} ↔ ${card2Name}`, { effectType: "special", targets: [card1Name, card2Name], details: "Enemy powers swapped" });
        }
        break;

      case "giveCoal":
        // Give enemy a Coal card with negative power (Naughty Santa)
        const coalCard: DeckCard = { type: "vbms", cardId: `coal-${Date.now()}`, name: "Coal", rarity: "Common", power: effect.value || -20, imageUrl: "/images/card-back.png" };
        const coalLane = Math.floor(Math.random() * 3);
        newLanes[coalLane][enemyCards].push(coalCard);
        newLanes[coalLane][enemyPower] += coalCard.power;
        logAbility(`🎅 gave Coal to enemy (${effect.value} power)`, { effectType: "debuff", powerChange: effect.value, details: `Lane ${coalLane + 1}` });
        break;

      case "debuffRandomEnemy":
        // -X power to random enemy (Jack the Sniper)
        const allEnemies: { lane: number; idx: number }[] = [];
        newLanes.forEach((lane: any, lIdx: number) => lane[enemyCards].forEach((_: DeckCard, cIdx: number) => allEnemies.push({ lane: lIdx, idx: cIdx })));
        if (allEnemies.length > 0) {
          const t = allEnemies[Math.floor(Math.random() * allEnemies.length)];
          const debuff = Math.abs(effect.value || 10);
          const randomTargetName = newLanes[t.lane][enemyCards][t.idx].name;
          newLanes[t.lane][enemyCards][t.idx].power = Math.max(0, newLanes[t.lane][enemyCards][t.idx].power - debuff);
          newLanes[t.lane][enemyPower] = Math.max(0, newLanes[t.lane][enemyPower] - debuff);
          logAbility(`🎯 sniped random ${randomTargetName} -${debuff}`, { effectType: "debuff", targets: [randomTargetName], powerChange: -debuff });
        }
        break;

      case "revealEnemyCard":
        // Reveal enemy card AND steal 15 power (Horsefarts - Fact Check)
        if (newLanes[laneIndex][enemyCards].length > 0) {
          const targetIdx = Math.floor(Math.random() * newLanes[laneIndex][enemyCards].length);
          const revealTargetName = newLanes[laneIndex][enemyCards][targetIdx].name;
          const stealAmt = Math.min(effect.stealPower || 15, newLanes[laneIndex][enemyCards][targetIdx].power);
          newLanes[laneIndex][enemyCards][targetIdx].power -= stealAmt;
          newLanes[laneIndex][enemyPower] -= stealAmt;
          bonusPower = stealAmt;
          logAbility(`👁️ FACT CHECK! Stole ${stealAmt} from ${revealTargetName}`, { effectType: "steal", targets: [revealTargetName], powerChange: stealAmt });
        } else {
          bonusPower = 10; // Fallback if no enemies
          logAbility(`👁️ no target, +10 fallback`, { effectType: "buff", powerChange: 10 });
        }
        break;

      case "forceDiscard":
        // Enemy loses power (John Porn)
        if (newLanes[laneIndex][enemyCards].length > 0) {
          const tIdx = Math.floor(Math.random() * newLanes[laneIndex][enemyCards].length);
          const targetCardName = newLanes[laneIndex][enemyCards][tIdx].name;
          newLanes[laneIndex][enemyCards][tIdx].power = Math.max(0, newLanes[laneIndex][enemyCards][tIdx].power - 5);
          newLanes[laneIndex][enemyPower] = Math.max(0, newLanes[laneIndex][enemyPower] - 5);
          logAbility(`📉 forced discard on ${targetCardName} (-5)`, { effectType: "debuff", targets: [targetCardName], powerChange: -5 });
        }
        break;

      case "addCopyToHand":
        // Add copy to hand (0xdeployer) + bonus power to self - respects MAX_HAND_SIZE
        if (newHand.length < TCG_CONFIG.MAX_HAND_SIZE) {
          newHand.push({ ...card, cardId: `${card.cardId}-copy-${Date.now()}` });
          bonusPower = effect.bonusPower || 0;
          logAbility(`📋 added copy to hand +${bonusPower}`, { effectType: "copy", powerChange: bonusPower, details: "Copy created" });
        } else {
          bonusPower = effect.bonusPower || 0;
          playSound("destroy");
          logAbility(`🔥 copy burned (hand full) +${bonusPower}`, { effectType: "destroy", powerChange: bonusPower, details: "Hand full - copy discarded" });
        }
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
            logAbility(`↔️ moved ${moved.name} to Lane ${li + 1}`, { effectType: "move", targets: [moved.name || "Unknown"], details: `Lane ${laneIndex + 1} → Lane ${li + 1}` });
            break;
          }
        }
        break;

      case "buffIfFewerCards":
        // +X if fewer cards than enemy (Sartocrates - Philosophical Strike)
        // Note: +1 because this card is being added
        const myCardCount = newLanes[laneIndex][myCards].length + 1;
        const enemyCardCount = newLanes[laneIndex][enemyCards].length;
        if (myCardCount <= enemyCardCount) {
          bonusPower = effect.value || 30;
          logAbility(`🎭 underdog bonus +${bonusPower} (${myCardCount} vs ${enemyCardCount})`, { effectType: "buff", powerChange: bonusPower, details: "Fewer cards than enemy" });
        }
        break;

      case "buffByRarity":
        // Buff cards by rarity (Brian Armstrong, Linux)
        const tgtRarity = effect.targetRarity || "Common";
        let rarityBuffCount = 0;
        newLanes.forEach((lane: any) => {
          lane[myCards].forEach((c: DeckCard, cIdx: number) => {
            if (c.rarity === tgtRarity) {
              lane[myCards][cIdx] = { ...c, power: c.power + (effect.value || 0) };
              lane[myPower] += effect.value || 0;
              rarityBuffCount++;
            }
          });
        });
        logAbility(`✨ buffed ${rarityBuffCount} ${tgtRarity} cards +${effect.value}`, { effectType: "buff", powerChange: rarityBuffCount * (effect.value || 0), details: `${tgtRarity} bonus` });
        break;

      case "buffPerHandSize":
        // Power based on hand size (NFTKid)
        bonusPower = newHand.length * (effect.multiplier || 5);
        logAbility(`🃏 +${bonusPower} power (${newHand.length} cards × ${effect.multiplier || 5})`, { effectType: "buff", powerChange: bonusPower, details: "Hand size bonus" });
        break;

      case "copyPowerLeft":
        // Copy power from left card + bonus (GayPT - AI Generated)
        const leftCardCount = newLanes[laneIndex][myCards].length;
        if (leftCardCount > 0) {
          const leftCard = newLanes[laneIndex][myCards][leftCardCount - 1];
          bonusPower = Math.floor(leftCard.power * 0.5) + (effect.value || 10); // Copy 50% + bonus
          logAbility(`🤖 copied ${leftCard.name} (50%) +${effect.value} = +${bonusPower}`, { effectType: "copy", targets: [leftCard.name || "Unknown"], powerChange: bonusPower });
        } else {
          bonusPower = effect.value || 10; // Just bonus if no left card
          logAbility(`🤖 no card to copy, +${bonusPower} base`, { effectType: "buff", powerChange: bonusPower });
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
          logAbility(`🎯 LONE HUNTER! Destroyed ${destroyedCard.name} +${bonusPower}`, { effectType: "destroy", targets: [destroyedCard.name || "Unknown"], powerChange: bonusPower, details: "Target was alone" });
        }
        break;

      case "moveRandom":
        // Move this card to a random lane + bonus power (Vlady)
        const availableLanes = [0, 1, 2].filter(li => li !== laneIndex);
        if (availableLanes.length > 0) {
          const targetLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
          // Card will be added to target lane with bonus power
          bonusPower = effect.bonusPower || 15;
          logAbility(`🎲 moved to Lane ${targetLane + 1} +${bonusPower}`, { effectType: "move", powerChange: bonusPower, details: "Random lane jump" });
          // Note: actual moving happens in handlePvEPlayCard after bonusPower is applied
        } else {
          bonusPower = effect.bonusPower || 15; // Just give bonus if no other lanes
          logAbility(`🎲 +${bonusPower} (no move needed)`, { effectType: "buff", powerChange: bonusPower });
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
        logAbility(`🎭 First Cast! +${bonusPower} (${totalCardsPlayed} cards × ${effect.value || 5})`, { effectType: "buff", powerChange: bonusPower, details: "VibeFID ability" });
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
        logAbility(`📊 Ratio'd! Matched highest power (${highestPowerOnField})`, { effectType: "copy", powerChange: bonusPower, details: "VibeFID ability" });
        break;

      case "vibefidDoxxed":
        // Copy the TOTAL power of all enemy cards in this lane
        let totalEnemyPowerInLane = 0;
        newLanes[laneIndex][enemyCards].forEach((c: DeckCard) => {
          totalEnemyPowerInLane += c.power || 0;
        });
        bonusPower = totalEnemyPowerInLane;
        logAbility(`🔍 Doxxed! +${bonusPower} (copied lane enemy power)`, { effectType: "copy", powerChange: bonusPower, details: "VibeFID ability" });
        break;

      case "buffIfLosing":
        // +base power, or +bonus if LOSING this lane (Rizkybegitu - Lucky Roll)
        const myLanePower = newLanes[laneIndex][myPower];
        const enemyLanePower = newLanes[laneIndex][enemyPower];
        const isLosing = isPlayer ? myLanePower < enemyLanePower : enemyLanePower < myLanePower;
        bonusPower = isLosing ? (effect.bonus || 25) : (effect.base || 10);
        logAbility(isLosing ? `🎲 Lucky comeback! +${bonusPower}` : `🎲 +${bonusPower} base`, { effectType: "buff", powerChange: bonusPower, details: isLosing ? "Underdog bonus!" : "Standard bonus" });
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
          const originalPower = stolenCard.power;
          newLanes[weakestEnemyLane][enemyPower] -= stolenCard.power;
          // Add to your side (same lane as this card) with 50% power
          const newPower = Math.floor(stolenCard.power * 0.5);
          stolenCard.power = newPower;
          newLanes[laneIndex][myCards].push(stolenCard);
          newLanes[laneIndex][myPower] += newPower;
          logAbility(`💘 CHARMED ${stolenCard.name}! (${originalPower} → ${newPower})`, { effectType: "steal", targets: [stolenCard.name || "Unknown"], powerChange: newPower, details: "Card switched sides" });
        }
        break;

      case "timeBomb":
        // Plant a BOMB on the LANE! After N turns, DESTROY ALL cards in this lane (Tukka - Legendary)
        // Store bomb on lane (not card) so it persists between turns
        newLanes[laneIndex].bomb = {
          turnsLeft: effect.delay || 2,
          owner: isPlayer ? "player" : "cpu",
        };
        bonusPower = 0; // No immediate power bonus
        logAbility(`💣 TIME BOMB planted! Explodes in ${effect.delay || 2} turns`, { effectType: "special", details: `Explodes in ${effect.delay || 2} turns` });
        break;

      case "forceDiscardAndDraw":
        // Enemy discards (loses power), you draw! (Sartocrates - Epic)
        // Debuff a random enemy card
        let discardTargetName = "";
        if (newLanes[laneIndex][enemyCards].length > 0) {
          const targetIdx = Math.floor(Math.random() * newLanes[laneIndex][enemyCards].length);
          discardTargetName = newLanes[laneIndex][enemyCards][targetIdx].name;
          const debuffAmount = 15;
          newLanes[laneIndex][enemyCards][targetIdx] = {
            ...newLanes[laneIndex][enemyCards][targetIdx],
            power: Math.max(0, newLanes[laneIndex][enemyCards][targetIdx].power - debuffAmount),
          };
          newLanes[laneIndex][enemyPower] = Math.max(0, newLanes[laneIndex][enemyPower] - debuffAmount);
        }
        // Draw 1 card (respects MAX_HAND_SIZE)
        let drewCard = false;
        if (isPlayer && newDeck.length > 0) {
          if (newHand.length < TCG_CONFIG.MAX_HAND_SIZE) {
            newHand.push(newDeck.shift()!);
            drewCard = true;
          } else {
            const burnedCard = newDeck.shift()!;
            playSound("destroy");
            logAbility(`🔥 ${burnedCard?.name || "Card"} BURNED (hand full)`, { effectType: "destroy", details: "Hand full - card discarded" });
          }
        }
        bonusPower = effect.selfDraw ? 5 : 0; // Small bonus
        logAbility(`📜 ${discardTargetName ? `debuffed ${discardTargetName} -15` : ""}${drewCard ? " + drew 1" : " (hand full)"}`, { effectType: "debuff", targets: discardTargetName ? [discardTargetName] : [], powerChange: -15, details: "Discard + draw" });
        break;

      case "parasiteLane":
        // Mind Parasite: Lock lane, drain power from enemies! (Horsefarts - Epic)
        // Simplified: debuff all enemies in lane + steal some power
        let totalDrained = 0;
        const drainAmount = 10;
        const drainedTargets: string[] = [];
        newLanes[laneIndex][enemyCards].forEach((c: DeckCard, cIdx: number) => {
          const drained = Math.min(drainAmount, c.power);
          newLanes[laneIndex][enemyCards][cIdx] = { ...c, power: Math.max(0, c.power - drained) };
          totalDrained += drained;
          if (drained > 0) drainedTargets.push(c.name || "Unknown");
        });
        newLanes[laneIndex][enemyPower] = Math.max(0, newLanes[laneIndex][enemyPower] - totalDrained);
        bonusPower = totalDrained; // Gain drained power
        logAbility(`🧠 MIND PARASITE! Drained ${totalDrained} power`, { effectType: "steal", targets: drainedTargets, powerChange: totalDrained, details: `${drainedTargets.length} enemies drained` });
        break;

      case "sacrificeBuffAll":
        // SACRIFICE: Destroy self and buff ALL allies! (Melted - Rare)
        const buffAllValue = effect.value || 20;
        let alliesBuffedCount = 0;
        // Buff all friendly cards in all lanes
        newLanes.forEach((lane: any) => {
          lane[myCards].forEach((c: DeckCard, cIdx: number) => {
            if (c.cardId !== card.cardId) { // Don't buff self (will be destroyed)
              lane[myCards][cIdx] = { ...c, power: c.power + buffAllValue };
              lane[myPower] += buffAllValue;
              alliesBuffedCount++;
            }
          });
        });
        // Mark card for destruction (will be removed after ability processing)
        card._sacrificed = true;
        bonusPower = -card.power; // Negate own power since card will be destroyed
        logAbility(`💀 SACRIFICE! Buffed ${alliesBuffedCount} allies +${buffAllValue} each`, { effectType: "special", powerChange: alliesBuffedCount * buffAllValue, details: "Self-destruct for team" });
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
        logAbility(`🌀 CHAOS! Shuffled ${allEnemyCardsToShuffle.length} enemy cards`, { effectType: "special", powerChange: 10, details: "All enemy positions scrambled" });
        break;
    }

    return { lanes: newLanes, playerHand: newHand, playerDeckRemaining: newDeck, bonusPower, energyToConsume };
  };

  // Calculate ongoing power bonuses
  const calculateOngoingBonus = (card: DeckCard, laneIndex: number, lanes: any[], currentTurn: number, isPlayer: boolean): number => {
    const ability = getCardAbility(card.name, card, t as (k: string) => string);
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
        const abilityCommon = getCardAbility(card.name, card, t as (k: string) => string);
        return abilityCommon?.rarity === "Common" ? value : 0;

      case "buffEpic":
        const abilityEpic = getCardAbility(card.name, card, t as (k: string) => string);
        return abilityEpic?.rarity === "Epic" ? value : 0;

      case "doubleLegendary":
        const cardAbility = getCardAbility(card.name, card, t as (k: string) => string);
        return cardAbility?.rarity === "Legendary" ? card.power : 0;

      case "buffFoil":
        return card.foil ? value : 0;

      case "buffNothing":
        return card.type === "nothing" || card.type === "other" ? value : 0;

      case "buffVibeFID":
        return card.collection === "vibefid" ? value : 0;

      case "buffOnReveal":
        const abilityOR = getCardAbility(card.name, card, t as (k: string) => string);
        return abilityOR?.type === "onReveal" ? value : 0;

      case "buffOngoing":
        const abilityOG = getCardAbility(card.name, card, t as (k: string) => string);
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
        const ability = getCardAbility(card.name, card, t as (k: string) => string);
        if (ability?.type === "ongoing" && ability.effect.action === "buffLaneOngoing") {
          playerPower += (lane.playerCards.length - 1) * (ability.effect.value || 0);
        }
      });
      lane.cpuCards.forEach((card: DeckCard) => {
        const ability = getCardAbility(card.name, card, t as (k: string) => string);
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
        const ability = getCardAbility(card.name, card, t as (k: string) => string);
        if (ability?.type === "ongoing" && ability.effect.action === "reduceEnemyPower") {
          cpuPower = Math.max(0, cpuPower + (ability.effect.value || 0) * lane.cpuCards.length);
        }
      });
      lane.cpuCards.forEach((card: DeckCard) => {
        const ability = getCardAbility(card.name, card, t as (k: string) => string);
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

      // If there are multiple possible combos, show selection modal (or auto-select best)
      if (possibleCombos.length > 1) {
        const autoSelect = typeof window !== "undefined" && localStorage.getItem("tcg_auto_select_combo") === "true";
        if (autoSelect) {
          // Auto-select combo with highest bonus value
          const best = possibleCombos.reduce((a, b) => {
            const aVal = a.combo.bonus?.value || 0;
            const bVal = b.combo.bonus?.value || 0;
            return bVal > aVal ? b : a;
          });
          chosenComboId = best.combo.id;
        } else {
          setVibefidComboModal({
            laneIndex,
            card: { ...card, _tempCardIndex: actualCardIndex } as any,
            possibleCombos,
          });
          return; // Wait for player to choose
        }
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

    // Prize foil bonus: Draw a card! (respects MAX_HAND_SIZE)
    let newDeck = [...pveGameState.playerDeckRemaining];
    if (foilEffect && foilEffect.energyDiscount >= 1.0 && newDeck.length > 0) {
      if (newHand.length < TCG_CONFIG.MAX_HAND_SIZE) {
        newHand.push(newDeck.shift()!);
        playSound("draw"); // Prize foil sound feedback
      } else {
        const burnedCard = newDeck.shift()!;
        playSound("destroy");
        setBattleLog(prev => [...prev, {
          turn: pveGameState.currentTurn,
          player: "you" as const,
          action: "🔥 BURNED (hand full - prize foil)",
          lane: laneIndex + 1,
          cardName: burnedCard?.name || "Card",
          effectType: "destroy" as const,
          details: "Hand full - card discarded",
        }]);
      }
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
    const ability = getCardAbility(card.name, card, t as (k: string) => string);

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

    // Draw a new card if deck has cards (respects MAX_HAND_SIZE)
    let newDeck = [...pveGameState.playerDeckRemaining];
    if (newDeck.length > 0 && newHand.length < TCG_CONFIG.MAX_HAND_SIZE) {
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
    playTrackedAudio("/sounds/oiroke-no-jutsu.mp3", 0.5);

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
    const cpuResult = cpuPlayCards(pveGameState, calculateOngoingBonus, t as (k: string) => string);
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
          // FIX Issue #8: Don't clear per turn - keep combos tracked per match to prevent voice spam
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
          const ability = getCardAbility(c.name, c, t as (k: string) => string);
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
          const ability = getCardAbility(card.name, card, t as (k: string) => string);
          if (ability?.type === "onReveal") {
            cardsToProcess.push({ card, laneIndex: laneIdx, side: "player", ability });
          }
        }
      });
      lane.cpuCards.forEach((card: DeckCard) => {
        if ((card as any)._playedThisTurn) {
          const ability = getCardAbility(card.name, card, t as (k: string) => string);
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

    // Process TIME BOMBS - decrement timer, destroy all cards in lane when expired
    newLanes.forEach((lane: any) => {
      if (lane.bomb) {
        lane.bomb.turnsLeft--;
        if (lane.bomb.turnsLeft <= 0) {
          // BOOM! Destroy ALL cards in this lane
          playSound("bomb");
          lane.playerCards = [];
          lane.cpuCards = [];
          lane.playerPower = 0;
          lane.cpuPower = 0;
          delete lane.bomb;
        }
      }
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
          const ability = getCardAbility(c.name, c, t as (k: string) => string);
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
          const ability = getCardAbility(c.name, c, t as (k: string) => string);
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

      // Record battle and award AURA server-side (Issue #3)
      let earnedAura = false;
      if (address) {
        recordPvEBattle({ address, won: winner === "player" }).then((result) => {
          if (result) {
            setDailyBattles(result.pveCount);
            if (result.auraAwarded > 0) {
              earnedAura = true;
            }
          }
        }).catch((e: any) => {
          console.error("[TCG] Failed to record battle:", e);
        });
        // Also award coins via existing system
        if (winner === "player" && dailyBattles <= REWARDED_BATTLES_PER_DAY) {
          earnedAura = true;
          awardPvECoins({ address, difficulty: "gey", won: true }).catch(() => {});
        }
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

    // Next turn - draw cards (respects MAX_HAND_SIZE)
    if (playerDeck.length > 0 && playerHand.length < TCG_CONFIG.MAX_HAND_SIZE) {
      playerHand.push(playerDeck.shift()!);
    }
    let cpuHandNext = [...cpuHand];
    let cpuDeckNext = [...cpuDeckRemaining];
    if (cpuDeckNext.length > 0 && cpuHandNext.length < TCG_CONFIG.MAX_HAND_SIZE) {
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
        const ability = getCardAbility(c.name, c, t as (k: string) => string);
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

  // handleCreateMatch/handleJoinMatch moved to components/tcg/TCGLobby.tsx
  // handleSaveDeck/handleCardSelect moved to components/tcg/DeckBuilder.tsx

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
        playFiveSecondWarning();
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
            if (newCards.some((c: any) => getCardAbility(c.name, c, t as (k: string) => string))) {
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

        // Detect and play combo voice announcements
        let comboDelay = 0;
        gs.lanes.forEach((lane: any, laneIdx: number) => {
          const myLaneCards = lane[myCards] || [];
          const enemyLaneCards = lane[enemyCards] || [];

          [{ cards: myLaneCards, side: "player" }, { cards: enemyLaneCards, side: "enemy" }].forEach(({ cards, side }) => {
            if (cards.length === 0) return;
            const combos = detectCombos(cards);
            combos.forEach(({ combo }) => {
              const comboKey = `${laneIdx}-${side}-${combo.id}`;
              if (!shownCombosRef.current.has(comboKey)) {
                shownCombosRef.current.add(comboKey);
                setTimeout(() => playComboVoice(combo.id), 600 + comboDelay);
                comboDelay += 2500;
              }
            });
          });
        });
      }
    }

    // Save current state as deep copy
    prevPvPGameStateRef.current = JSON.parse(JSON.stringify(gs));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatch?.gameState?.currentTurn, view, isPvE]);

  // Load daily battles count from server (Issue #3: server-side tracking)
  const dailyStatsLoadedRef = useRef(false);
  useEffect(() => {
    if (!address || dailyStatsLoadedRef.current) return;
    dailyStatsLoadedRef.current = true;
    convex.query(api.tcg.getDailyBattleStats, { address }).then((stats) => {
      if (stats) {
        setDailyBattles(stats.pveCount);
      }
    }).catch(() => {});
  }, [address, convex]);

  // Card Detail Modal - uses extracted component (memoized via React.memo)
  const CardDetailModal = useMemo(() => {
    return ({ card, onClose, onSelect }: { card: DeckCard; onClose: () => void; onSelect?: () => void }) => (
      <CardDetailModalComponent
        card={card}
        onClose={onClose}
        onSelect={onSelect}
        selectedCards={[]}
        t={t as (k: string) => string}
        lang={lang}
      />
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

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
    return (
      <TCGLobby
        activeDeck={activeDeck}
        playerDecks={playerDecks}
        address={address}
        username={username}
        nfts={nfts}
        dailyBattles={dailyBattles}
        vbmsBalance={vbmsBalance}
        refetchVBMS={refetchVBMS}
        myDefensePool={myDefensePool}
        defenseLeaderboard={defenseLeaderboard}
        autoSelectCombo={autoSelectCombo}
        onAutoSelectComboChange={setAutoSelectCombo}
        onStartPvE={() => startPvEMatch()}
        onMatchCreated={(matchId) => {
          setCurrentMatchId(matchId);
          setView("waiting");
        }}
        onMatchJoined={(matchId) => {
          setCurrentMatchId(matchId);
          setIsPvE(false);
          setView("battle");
          setBattleLog([]);
        }}
        onNavigate={(v) => setView(v as GameView)}
        onGoHome={() => router.push("/")}
        t={t as (k: string) => string}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: DECK BUILDER
  // ═══════════════════════════════════════════════════════════════════════════════

  if (view === "deck-builder") {
    return (
      <DeckBuilder
        nfts={nfts}
        cardsLoading={cardsLoading}
        status={status}
        address={address}
        onBack={() => setView("lobby")}
        t={t as (k: string) => string}
        lang={lang}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: WAITING ROOM
  // ═══════════════════════════════════════════════════════════════════════════════

  if (view === "waiting") {
    return (
      <WaitingView
        roomId={currentMatch?.roomId}
        onCancel={handleCancelMatch}
        t={t as (k: string) => string}
      />
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
              <MemeSoundMenu
                show={showProfileMenu}
                onClose={() => setShowProfileMenu(false)}
                onSurrender={() => {
                  setIsPvE(false);
                  setPveGameState(null);
                  setView("lobby");
                  setShowProfileMenu(false);
                }}
                t={t as (k: string) => string}
              />
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
                        const ability = getCardAbility(card.name, card, t as (k: string) => string);
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
                        const ability = getCardAbility(card.name, card, t as (k: string) => string);
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
            {/* Cards - scrollable when many cards, smaller cards if 7+ */}
            <div className={`flex justify-center mb-3 overflow-x-auto max-w-full px-2 ${(gs.playerHand?.length || 0) > 6 ? "gap-0.5" : "gap-1"}`}
                 style={{ scrollbarWidth: "thin" }}>
              {gs.playerHand?.map((card: any, idx: number) => {
                const ability = getCardAbility(card.name, card, t as (k: string) => string);
                const foilEffect = getFoilEffect(card.foil);
                const displayPower = card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power;
                const energyCost = getEnergyCost(card);
                const canAfford = energyCost <= (gs.energy || 1);
                // Use actual card image (same as deck builder)
                const battleHandImageUrl = getCardDisplayImageUrl(card);
                // Smaller cards when hand is big
                const handSize = gs.playerHand?.length || 0;
                const cardWidth = handSize > 8 ? "w-[45px]" : handSize > 6 ? "w-[52px]" : "w-[60px]";
                const cardHeight = handSize > 8 ? "h-[64px]" : handSize > 6 ? "h-[74px]" : "h-[85px]";

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
                    className={`relative flex-shrink-0 ${cardWidth} ${cardHeight} rounded-lg border-2 transition-all duration-200 select-none ${
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
          <ComboDetailModal
            combo={detailCombo}
            onClose={() => setDetailCombo(null)}
            t={t as (k: string) => string}
          />
        )}

        {/* VibeFID Combo Selection Modal */}
        {vibefidComboModal && (
          <VibeFIDComboModal
            modal={vibefidComboModal}
            onSelectCombo={(laneIndex, cardIndex, comboId) => handlePvEPlayCard(laneIndex, cardIndex, comboId)}
            onClose={() => setVibefidComboModal(null)}
            t={t as (k: string) => string}
          />
        )}

        {/* Battle Log */}
        <BattleLogPanel
          battleLog={battleLog}
          show={showBattleLog}
          onToggle={() => setShowBattleLog(!showBattleLog)}
          t={t as (k: string) => string}
        />
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
              <MemeSoundMenu
                show={showProfileMenu}
                onClose={() => setShowProfileMenu(false)}
                onSurrender={() => {
                  if (currentMatchId && address) {
                    forfeitMatch({ matchId: currentMatchId, address }).catch((e: any) => console.error("Forfeit error:", e));
                  }
                  setShowProfileMenu(false);
                }}
                t={t as (k: string) => string}
              />
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
                        const ability = getCardAbility(card.name, card, t as (k: string) => string);
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
                        const ability = getCardAbility(card.name, card, t as (k: string) => string);
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
            {/* Cards - scrollable when many cards, smaller cards if 7+ */}
            <div className={`flex justify-center mb-3 overflow-x-auto max-w-full px-2 ${(myHand?.length || 0) > 6 ? "gap-0.5" : "gap-1"}`}
                 style={{ scrollbarWidth: "thin" }}>
              {myHand?.map((card: any, idx: number) => {
                const ability = getCardAbility(card.name, card, t as (k: string) => string);
                const foilEffect = getFoilEffect(card.foil);
                const displayPower = card.type === "nothing" || card.type === "other" ? Math.floor(card.power * 0.5) : card.power;
                const energyCost = getEnergyCost(card);
                const canAfford = energyCost <= remainingEnergy;
                const battleHandImageUrl = getCardDisplayImageUrl(card);
                const isPending = pendingActions.some(a => a.cardIndex === idx);
                // Smaller cards when hand is big
                const handSize = myHand?.length || 0;
                const cardWidth = handSize > 8 ? "w-[45px]" : handSize > 6 ? "w-[52px]" : "w-[60px]";
                const cardHeight = handSize > 8 ? "h-[64px]" : handSize > 6 ? "h-[74px]" : "h-[85px]";

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
                    className={`relative flex-shrink-0 ${cardWidth} ${cardHeight} rounded-lg border-2 transition-all duration-200 select-none ${
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
          <ComboDetailModal
            combo={detailCombo}
            onClose={() => setDetailCombo(null)}
            t={t as (k: string) => string}
          />
        )}

        {/* Battle Log (PvP) */}
        <BattleLogPanel
          battleLog={battleLog}
          show={showBattleLog}
          onToggle={() => setShowBattleLog(!showBattleLog)}
          isPvP
          t={t as (k: string) => string}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER: RESULT (PvP or PvE)
  // ═══════════════════════════════════════════════════════════════════════════════

  // PvE Result
  if (view === "result" && isPvE && pveGameState) {
    return (
      <PvEResultView
        pveGameState={pveGameState}
        showDefeatBait={showDefeatBait}
        onPlayAgain={() => startPvEMatch()}
        onBackToLobby={() => {
          stopBgm();
          setIsPvE(false);
          setPveGameState(null);
          setView("lobby");
          setAutoMatch(false);
        }}
        t={t as (k: string) => string}
      />
    );
  }

  // PvP Result
  if (view === "result" && currentMatch) {
    return (
      <PvPResultView
        currentMatch={currentMatch}
        address={address}
        showDefeatBait={showDefeatBait}
        onBackToLobby={() => {
          stopBgm();
          setCurrentMatchId(null);
          setView("lobby");
        }}
        t={t as (k: string) => string}
      />
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
