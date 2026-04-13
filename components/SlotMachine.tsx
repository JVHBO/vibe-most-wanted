"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import { getVbmsBaccaratImageUrl } from "@/lib/tcg/images";
import { playTrackedAudio } from "@/lib/tcg/audio";
import type { SlotCard } from "@/lib/slot/config";
import {
  SLOT_BET_OPTIONS,
  SLOT_BONUS_COST_MULT,
  SLOT_BONUS_FREE_SPINS,
  SLOT_CARD_LABELS,
  SLOT_CARD_POOL,
  SLOT_COLS,
  SLOT_ROWS,
  SLOT_TOTAL_CELLS,
  createSlotCard,
  getSlotCardRarity,
  isDeveloperSlotAddress,
  pickSlotCard,
} from "@/lib/slot/config";
import type {
  SlotBonusState,
  SlotComboStep,
  SlotPhase,
} from "@/lib/slot/engine";

const COLS = SLOT_COLS;
const ROWS = SLOT_ROWS;
const TOTAL_CELLS = SLOT_TOTAL_CELLS;
const BET_OPTIONS = [...SLOT_BET_OPTIONS];
const BONUS_COST_MULT = SLOT_BONUS_COST_MULT;
const BONUS_FREE_SPINS = SLOT_BONUS_FREE_SPINS;

// GIF de cassino para VBMS Special (slot animation)
// Coloque os arquivos em public/slot-gifs/
const CASINO_SLOT_GIF = "/slot-gifs/casino-slot-animation.gif"; // GIF de cassino para a carta especial
const WILDCARD_GIFS = {
  "gen4_turbo": "/slot-gifs/gen4-turbo-idle-breathing.gif",
  "idle_breathing": "/slot-gifs/gen4-turbo-idle-breathing.gif", // alias
};

interface SpinResult {
  initialGrid: SlotCard[];
  comboSteps: SlotComboStep[];
  finalGrid: SlotCard[];
  winAmount: number;
  maxWin: boolean;
  foilCount: number;
  triggeredBonus: boolean;
  bonusSpinsAwarded: number;
  bonusSpinsRemaining: number;
  bonusState: SlotBonusState;
}
interface ActivePayline { name: string; d: string; color: string; }

// Payline SVG paths (viewBox 0 0 100 100)
const PAYLINE_PATHS: Record<string, string> = {
  "Row 1":      "M10,17 L90,17",
  "Row 2":      "M10,50 L90,50",
  "Row 3":      "M10,83 L90,83",
  "Diagonal V": "M10,17 L30,50 L50,83 L70,50 L90,17",
  "Diagonal N": "M10,83 L30,50 L50,17 L70,50 L90,83",
};
const RARITY_COLORS: Record<string, string> = {
  "mythic":"#6D28D9","legendary":"#6D28D9","epic":"#6D28D9",
  "rare":"#6D28D9","common":"#6B28D9","special":"#FACC15",
};

function getRarityColorForCombo(comboCards: string[]): string {
  for (const cardName of comboCards) {
    const rarity = getSlotCardRarity(cardName);
    if (rarity) {
      return RARITY_COLORS[rarity.toLowerCase()] || "#FFD700";
    }
  }
  return "#FFD700";
}

function computeActivePaylines(patterns: string[]): ActivePayline[] {
  const result: ActivePayline[] = [];
  for (const p of patterns) {
    for (const plName of Object.keys(PAYLINE_PATHS)) {
      if (p.startsWith(plName)) {
        const m = p.match(/(\d+)x (.+)/);
        let color = "#FFD700";
        if (m) {
          const char = m[2].trim().toLowerCase();
          const poolCard = POOL.find(c => c.baccarat === char);
          if (poolCard) color = RARITY_COLORS[poolCard.rarity.toLowerCase()] || "#FFD700";
        }
        result.push({ name: plName, d: PAYLINE_PATHS[plName], color });
        break;
      }
    }
    if (/VBMS Special/i.test(p)) result.push({ name: "VBMS", d: "", color: "#FFD700" });
  }
  return result;
}

// Web Audio reel tick
let _audioCtx: AudioContext | null = null;
function playTick(freq = 160, vol = 0.07, dur = 0.04) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = _audioCtx;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
  } catch(e) {}
}

const VBMS_SPECIAL_IMG = "https://nft-cdn.alchemy.com/base-mainnet/511915cc9b6f20839e2bf2999760530f";

const RS: Record<string, {
  border: string; glow: string; bg: string; labelBg: string; label: string;
  borderW: number; icon: string; cornerGrad: string;
}> = {
  Special:   { border:"#FACC15", glow:"#FACC15", bg:"#111827", labelBg:"#4C1D95", label:"SPECIAL",   borderW:3, icon:"S", cornerGrad:"linear-gradient(135deg,#FACC15 0%,transparent 60%)" },
  Mythic:    { border:"#6D28D9", glow:"#6D28D9", bg:"#111827", labelBg:"#4C1D95", label:"MYTHIC",    borderW:3, icon:"M", cornerGrad:"linear-gradient(135deg,#6D28D9 0%,transparent 60%)" },
  Legendary: { border:"#6D28D9", glow:"#6D28D9", bg:"#111827", labelBg:"#4C1D95", label:"LEGEND",    borderW:3, icon:"L", cornerGrad:"linear-gradient(135deg,#6D28D9 0%,transparent 60%)" },
  Epic:      { border:"#6D28D9", glow:"#6D28D9", bg:"#111827", labelBg:"#4C1D95", label:"EPIC",      borderW:2, icon:"E", cornerGrad:"linear-gradient(135deg,#6D28D9 0%,transparent 60%)" },
  Rare:      { border:"#6D28D9", glow:"#6D28D9", bg:"#111827", labelBg:"#4C1D95", label:"RARE",      borderW:2, icon:"R", cornerGrad:"linear-gradient(135deg,#6D28D9 0%,transparent 60%)" },
  Common:    { border:"#6D28D9", glow:"#6D28D9", bg:"#111827", labelBg:"#4C1D95", label:"COMMON",    borderW:1, icon:"C", cornerGrad:"linear-gradient(135deg,#6D28D9 0%,transparent 60%)" },
};

const LABELS = SLOT_CARD_LABELS;
const POOL = SLOT_CARD_POOL;

function pick(): SlotCard {
  const card = pickSlotCard();
  return createSlotCard({ baccarat: card.baccarat, rarity: card.rarity });
}

// Combo info will be retrieved from TCG combos using detectCombos

// Combo info will be retrieved from detectCombos result

const PAYOUTS: [string, string, string][] = [
  ["4× Mythic",   "50.000","#6D28D9"],["4× Legendary","5.000", "#6D28D9"],
  ["4× Epic",     "800",   "#6D28D9"],["4× Rare",     "120",   "#6D28D9"],["4× Common","12","#6B28D9"],
  ["3× Mythic",   "2.000", "#6D28D9"],["3× Legendary","300",   "#6D28D9"],
  ["3× Epic",     "80",    "#6D28D9"],["3× Rare",     "20",    "#6D28D9"],["3× Common","4", "#6B28D9"],
  ["2× Mythic",   "100",   "#6D28D9"],["2× Legendary","20",    "#6D28D9"],
  ["VBMS ×4 (scatter)","30.000","#FACC15"],["VBMS ×3","1.500","#FACC15"],["VBMS ×2","100","#FACC15"],
];

type SlotMachineProps = {
  onWalletOpen?: () => void;
  duckBgm?: (reason?: "combo" | "bonus") => void;
  restoreBgm?: () => void;
};

export default function SlotMachine({
  onWalletOpen,
  duckBgm,
  restoreBgm,
}: SlotMachineProps) {
  const { isConnected, address } = useAccount();
  const { userProfile } = useProfile();
  const spinMut = useMutation(api.slot.spinSlot);
  const statsQ  = useQuery(api.slot.getSlotDailyStats, { address: address || "" });

  const [cells, setCells]           = useState<SlotCard[]>(() => Array.from({ length: TOTAL_CELLS }, pick));
  const [isSpinning, setIsSpinning] = useState(false);
  const [stopped, setStopped]       = useState<Set<number>>(new Set([0,1,2,3,4]));
  const [winCells, setWinCells]     = useState<Set<number>>(new Set());   // highlighted winners
  const [newCells, setNewCells]     = useState<Set<number>>(new Set());   // cells falling in (cascade)
  const [activePaylines, setActivePaylines] = useState<ActivePayline[]>([]);
  const [winAmt, setWinAmt]         = useState<number | null>(null);
  const [isJackpot, setIsJackpot]   = useState(false);
  const [betIdx, setBetIdx]         = useState(0);
  const [showBonusConfirm, setShowBonusConfirm] = useState(false);
  const [bonusSpinsRemaining, setBonusSpinsRemaining] = useState(statsQ?.bonusSpinsAvailable || 0);
  const [showBonusAnimation, setShowBonusAnimation] = useState(false);
  const [comboDisplay, setComboDisplay] = useState<{ name: string; color: string; winAmt: number } | null>(null);
  const [deceleratingCols, setDeceleratingCols] = useState<Set<number>>(new Set());
  const [foilSuspenseCols, setFoilSuspenseCols]   = useState<Set<number>>(new Set()); // cols glowing with foil suspense
  const [epicFoilCards, setEpicFoilCards]         = useState<Array<{idx:number; card:SlotCard; img:string; row:number; col:number}>|null>(null);
  const [epicFoilPhase, setEpicFoilPhase]         = useState<'fly'|'spin'|null>(null);
  const [lockedGifIdx, setLockedGifIdx]           = useState<number|null>(null);   // index of locked GIF card in grid
  const [gifScale, setGifScale]                   = useState(1);                    // 1..4 grow multiplier
  const [showGallery, setShowGallery]           = useState(false);
  const [showIndices, setShowIndices]           = useState(false);
  const [devFoilAll, setDevFoilAll]             = useState(false);
  const [lastWinDetails, setLastWinDetails]     = useState<string[]>([]);
  const [card3D, setCard3D]                     = useState<{ card: SlotCard; img: string; label: string; flyIn: boolean } | null>(null);
  const [phase, setPhase]                       = useState<SlotPhase>("IDLE");
  const [bonusState, setBonusState]             = useState<SlotBonusState>({ persistentWildcards: [] });
  const [autoBonusMode, setAutoBonusMode]       = useState(false);

  const card3DRotRef  = useRef({ rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 });
  const card3DInnerRef = useRef<HTMLDivElement | null>(null);
  const ivs = useRef<Record<number, ReturnType<typeof setInterval>>>({});
  const foilsFoundRef = useRef(0);
  const lockedGifRef  = useRef<number|null>(null); // ref para leitura síncrona em playCascade
  const spinSequenceRef = useRef(0);
  const bonusStateRef = useRef<SlotBonusState>({ persistentWildcards: [] });

  // isBonusActive: derivado — verdadeiro enquanto há bonus spins ou animação épica ativa
  const isBonusActive = bonusSpinsRemaining > 0 || autoBonusMode || epicFoilCards !== null || phase === "BONUS";

  const freeLeft = statsQ?.remainingFreeSpins ?? 0;
  const coins    = userProfile?.coins ?? 0;
  const betMult  = BET_OPTIONS[betIdx];
  const betCost  = betMult;
  const bonusCost = betCost * BONUS_COST_MULT;

  // Sincronizar bonus spins da query
  useEffect(() => {
    if (statsQ?.bonusSpinsAvailable !== undefined) {
      setBonusSpinsRemaining(statsQ.bonusSpinsAvailable);
    }
  }, [statsQ?.bonusSpinsAvailable]);

  useEffect(() => {
    bonusStateRef.current = bonusState;
  }, [bonusState]);

  // Access control — apenas wallets autorizados
  const isAllowed = !address || isDeveloperSlotAddress(address);

  const startCol = useCallback((col: number) => {
    ivs.current[col] = setInterval(() => {
      setCells(prev => {
        const n = [...prev];
        for (let r = 0; r < ROWS; r++) n[r * COLS + col] = pick();
        return n;
      });
    }, 55);
  }, []);

  // Para coluna com desaceleração visual + callback quando termina
  const slowAndStopCol = useCallback((col: number, cards: SlotCard[], onDone?: () => void) => {
    clearInterval(ivs.current[col]);
    delete ivs.current[col];

    // Marcar como desacelerando (CSS diferente)
    setDeceleratingCols(prev => new Set([...prev, col]));

    // Passos de desaceleração: delays crescentes, cada um mostra carta aleatória
    const slowSteps = [85, 130, 190, 270, 370];
    let step = 0;

    const tick = () => {
      if (step >= slowSteps.length) {
        setCells(prev => {
          const n = [...prev];
          cards.forEach((card, row) => {
            if (row * COLS + col < n.length) n[row * COLS + col] = card;
          });
          return n;
        });
        setStopped(prev => new Set([...prev, col]));
        setDeceleratingCols(prev => { const s = new Set(prev); s.delete(col); return s; });
        // Clique suave ao parar coluna
        playTick(90 + col * 10, 0.07, 0.08);
        onDone?.();
        return;
      }
      setCells(prev => {
        const n = [...prev];
        for (let r = 0; r < ROWS; r++) n[r * COLS + col] = pick();
        return n;
      });
      setTimeout(tick, slowSteps[step++]);
    };

    setTimeout(tick, slowSteps[step++]);
  }, []);

  const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

  const waitForTrackedAudio = useCallback(async (audio: HTMLAudioElement | null, fallbackMs: number) => {
    if (!audio) {
      await sleep(fallbackMs);
      return;
    }

    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        audio.removeEventListener("ended", finish);
        audio.removeEventListener("error", finish);
        resolve();
      };

      audio.addEventListener("ended", finish, { once: true });
      audio.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, fallbackMs);
    });
  }, []);

  const playNarration = useCallback(async (src: string | null, reason: "combo" | "bonus", volume = 0.65) => {
    duckBgm?.(reason);
    const audio = src ? playTrackedAudio(src, volume) : null;
    await waitForTrackedAudio(audio, reason === "bonus" ? 2400 : 2200);
    restoreBgm?.();
  }, [duckBgm, restoreBgm, waitForTrackedAudio]);

  const finishSpinVisuals = useCallback((finalGrid: SlotCard[], totalWin: number, maxWin: boolean, details: string[]) => {
    setPhase("END");
    setCells(finalGrid);
    setIsSpinning(false);
    setWinAmt(totalWin);
    setIsJackpot(maxWin);
    setLastWinDetails(details);
    setWinCells(new Set());
    setNewCells(new Set());
    setActivePaylines([]);
    setComboDisplay(null);

    if (maxWin) {
      const rarityOrder = ["Special","Mythic","Legendary","Epic","Rare","Common"];
      const topCard = [...finalGrid].sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity))[0];
      if (topCard) {
        const img = topCard.baccarat === "vbms_special" ? CASINO_SLOT_GIF : getVbmsBaccaratImageUrl(topCard.baccarat);
        const label = LABELS[topCard.baccarat] ?? topCard.baccarat;
        setTimeout(() => setCard3D({ card: topCard, img: img || "", label, flyIn: true }), 600);
      }
    }

    if (totalWin > 0) {
      toast.success(`+${totalWin.toLocaleString()} coins!`);
    }

    const gifCellIdx = finalGrid.findIndex((card) => card.baccarat === "vbms_special");
    if (gifCellIdx >= 0 && lockedGifRef.current === null) {
      lockedGifRef.current = gifCellIdx;
      setLockedGifIdx(gifCellIdx);
    }

    setTimeout(() => setPhase("IDLE"), 80);
  }, []);

  const playComboResolution = useCallback(async (
    steps: SlotComboStep[],
    finalGrid: SlotCard[],
    totalWin: number,
    sequenceId: number,
  ): Promise<string[]> => {
    let runningWin = 0;
    const details: string[] = [];

    for (const step of steps) {
      if (spinSequenceRef.current !== sequenceId) {
        return details;
      }

      setPhase("COMBO");
      setCells(step.beforeGrid);
      setWinCells(new Set([...step.matchedIndices, ...step.wildcardIndices]));
      setActivePaylines([]);
      setComboDisplay({
        name: step.combo.name,
        color: getRarityColorForCombo(step.combo.cards),
        winAmt: step.reward,
      });

      await sleep(140);
      await playNarration(step.combo.audioPath, "combo", 0.7);

      runningWin += step.reward;
      details.push(`${step.combo.name} -> +${step.reward}`);
      setWinAmt(runningWin);

      setPhase("CASCADE");
      playTrackedAudio("/sounds/hit.mp3", 0.35);
      await sleep(220);
      setWinCells(new Set());
      setCells(step.afterGrid);
      setNewCells(new Set(step.fillIndices));

      if (step.fillIndices.length > 0) {
        const cascadeFreq = 200 + step.fillIndices.length * 20;
        playTick(cascadeFreq, 0.15, 0.1);
      }

      await sleep(520);
      setNewCells(new Set());
      setComboDisplay(null);
      await sleep(120);
    }

    setCells(finalGrid);
    setWinAmt(totalWin);
    return details;
  }, [playNarration]);

  const triggerEpicFoil = useCallback(async (
    foilCells: Array<{idx:number;card:SlotCard;img:string;row:number;col:number}>,
  ) => {
    setPhase("BONUS");
    setShowBonusAnimation(true);
    setEpicFoilCards(foilCells);
    setEpicFoilPhase("fly");
    window.setTimeout(() => setEpicFoilPhase("spin"), 1400);
    await playNarration("/sounds/evolution.mp3", "bonus", 0.8);
    await sleep(1200);
    setEpicFoilCards(null);
    setEpicFoilPhase(null);
    setShowBonusAnimation(false);
  }, [playNarration]);

  const spin = async (isFree: boolean, forceBonusMode = false) => {
    if (!isConnected || !address) { toast.error("Conecte a carteira!"); return; }
    if (!isAllowed) { toast.error("Acesso restrito!"); return; }
    if (isSpinning) return;

    if (isAllowed) {
      isFree = true;
    }

    const isUsingBonus = forceBonusMode || (isFree && bonusSpinsRemaining > 0 && (autoBonusMode || freeLeft <= 0));
    if (isFree && freeLeft <= 0 && !isUsingBonus && !isAllowed) { toast.error("Sem free spins hoje!"); return; }
    if (!isFree && !forceBonusMode && coins < betCost && !isAllowed) { toast.error(`Precisa de ${betCost} coins!`); return; }

    const sequenceId = spinSequenceRef.current + 1;
    spinSequenceRef.current = sequenceId;

    setIsSpinning(true);
    setPhase("SPIN");
    setWinCells(new Set());
    setNewCells(new Set());
    setActivePaylines([]);
    setWinAmt(null);
    setIsJackpot(false);
    setStopped(new Set());
    setShowBonusAnimation(false);
    setComboDisplay(null);
    setDeceleratingCols(new Set());
    setFoilSuspenseCols(new Set());
    setEpicFoilCards(null);
    setEpicFoilPhase(null);
    foilsFoundRef.current = 0;
    if (!isUsingBonus) {
      setBonusState({ persistentWildcards: [] });
      setAutoBonusMode(false);
    }

    if (bonusSpinsRemaining <= 0 && !isUsingBonus) {
      lockedGifRef.current = null;
      setLockedGifIdx(null);
      setGifScale(1);
    }

    const spinStartTime = Date.now();
    for (let c = 0; c < COLS; c++) startCol(c);

    try {
      const res = await spinMut({
        address,
        isFreeSpin: isFree,
        bonusMultiplier: isUsingBonus ? 2 : 1,
        betMultiplier: isFree ? 1 : betMult,
        isBonusMode: isUsingBonus,
        bonusState: isUsingBonus ? bonusStateRef.current : undefined,
      }) as SpinResult;

      if (spinSequenceRef.current !== sequenceId) {
        return;
      }

      setBonusSpinsRemaining(res.bonusSpinsRemaining);
      setBonusState(res.bonusState);

      const MIN_SPIN_MS = 1600;
      const elapsed = Date.now() - spinStartTime;
      const baseDelay = Math.max(0, MIN_SPIN_MS - elapsed);

      const stopSequential = (col: number) => {
        if (col >= COLS) {
          const gifInGrid = res.initialGrid.findIndex(c => c.baccarat === "vbms_special");
          if (gifInGrid >= 0) {
            lockedGifRef.current = gifInGrid;
            setLockedGifIdx(gifInGrid);
          }

          (async () => {
            const details = await playComboResolution(
              res.comboSteps,
              res.finalGrid,
              res.winAmount,
              sequenceId,
            );

            if (spinSequenceRef.current !== sequenceId) {
              return;
            }

            if (res.triggeredBonus && res.foilCount >= 4) {
              const finalFoils = res.finalGrid
                .map((card, idx) => ({
                  idx,
                  card,
                  img: card.baccarat === "vbms_special" ? CASINO_SLOT_GIF : (getVbmsBaccaratImageUrl(card.baccarat) || ""),
                  row: Math.floor(idx / COLS),
                  col: idx % COLS,
                }))
                .filter((entry) => entry.card.hasFoil);

              await triggerEpicFoil(finalFoils);
              toast.success(`BONUS SPINS +${res.bonusSpinsAwarded}`);
            }

            finishSpinVisuals(res.finalGrid, res.winAmount, res.maxWin, details);

            const shouldContinueBonus = res.bonusSpinsRemaining > 0 && (autoBonusMode || isUsingBonus || res.triggeredBonus);

            if (shouldContinueBonus) {
              setAutoBonusMode(true);
              window.setTimeout(() => {
                if (spinSequenceRef.current === sequenceId) {
                  spin(true, true);
                }
              }, 900);
            } else {
              setAutoBonusMode(false);
              if (res.bonusSpinsRemaining <= 0) {
                setBonusState({ persistentWildcards: [] });
              }
            }
          })().catch(() => {
            setIsSpinning(false);
            setPhase("IDLE");
          });

          return;
        }

        const colCards = Array.from({ length: ROWS }, (_, row) =>
          res.initialGrid[row * COLS + col] ?? pick()
        );

        slowAndStopCol(col, colCards, () => {
          // Count foils just revealed in this column
          const colFoils = colCards.filter(c => c.hasFoil).length;
          foilsFoundRef.current += colFoils;

          // If 2+ foils found and next column still pending → glow with suspense
          if (foilsFoundRef.current >= 2 && col + 1 < COLS) {
            setFoilSuspenseCols(prev => new Set([...prev, col + 1]));
            playTick(220, 0.09, 0.12);
          }

          setTimeout(() => stopSequential(col + 1), 80);
        });
      };

      setTimeout(() => stopSequential(0), baseDelay);
    } catch (err: any) {
      Object.values(ivs.current).forEach(clearInterval);
      ivs.current = {};
      setIsSpinning(false);
      setPhase("IDLE");
      setStopped(new Set([0,1,2,3,4]));
      toast.error(err.data?.message || err.message || "Erro no spin");
    }
  };

  const renderCard = (card: SlotCard, idx: number) => {
    const col        = idx % COLS;
    const spinning   = !stopped.has(col);
    const decelerating = spinning && deceleratingCols.has(col);
    const isWin      = !spinning && winCells.has(idx);
    const isNew      = !spinning && newCells.has(idx);
    const effectiveCard = devFoilAll ? { ...card, hasFoil: true } : card;
    const s          = RS[effectiveCard.rarity] ?? RS.Common;
    const isLockedGif = lockedGifIdx === idx && effectiveCard.baccarat === 'vbms_special';
    const cardScale = Math.max(isLockedGif ? gifScale : 1, effectiveCard.wildcardLevel ?? 1);

    // Determinar imagem:VBMS Special → GIF de cassino | Wildcards → GIFs animados | Outras → imagens normais
    const isVBMSspecial = effectiveCard.baccarat === "vbms_special";
    const isWildcard = ["gen4_turbo", "idle_breathing"].includes(effectiveCard.baccarat);

    const img = isVBMSspecial
      ? CASINO_SLOT_GIF
      : isWildcard
        ? WILDCARD_GIFS[effectiveCard.baccarat as keyof typeof WILDCARD_GIFS] || getVbmsBaccaratImageUrl(effectiveCard.baccarat)
        : getVbmsBaccaratImageUrl(effectiveCard.baccarat);

    const label = LABELS[effectiveCard.baccarat] ?? effectiveCard.baccarat;

    const borderColor = isWin ? "#FFD700" : s.border;
    const borderW     = isWin ? 3 : s.borderW;

    // Efeito de foil: shimmer animado + borda brilhante
    const foilEffect = effectiveCard.hasFoil ? {
      animation: "prizeFoilShine 3s linear infinite",
      border: `${borderW}px solid ${isWin ? '#FFD700' : '#FFA500'}`,
      boxShadow: `0 0 15px ${isWin ? '#FFD700' : '#FFA500'}88, inset 0 0 20px ${isWin ? '#FFD70033' : '#FFA50022'}`
    } : {};

    let rarityAnim: string | undefined = undefined;
    if (!spinning && !isWin && !effectiveCard.hasFoil) {
      if (effectiveCard.rarity === "Mythic") {
        rarityAnim = "mythic-border 1.6s ease-in-out infinite";
      } else if (effectiveCard.rarity === "Legendary") {
        rarityAnim = "legendary-border 1.8s ease-in-out infinite";
      }
    }

    return (
      <div
        className={`absolute inset-0 flex flex-col overflow-hidden ${decelerating ? "slot-decel" : spinning ? "slot-spin" : isNew ? "card-fall-in" : isWin ? "win-flash" : "transition-all duration-150"} ${effectiveCard.hasFoil ? "foil-card" : ""}`}
        style={{
          border: foilEffect.border || `${borderW}px solid ${borderColor}`,
          boxShadow: foilEffect.boxShadow || (isWin
            ? `0 0 20px #FFD700, 0 0 8px #FFD700, inset 0 0 16px #FFD70033`
            : undefined),
          animation: `${rarityAnim || foilEffect.animation || ''}`.trim(),
          background: s.bg,
          transform: cardScale > 1 ? `scale(${cardScale})` : undefined,
          transformOrigin: 'center center',
          zIndex: cardScale > 1 ? 20 : undefined,
        }}
      >
        {/* Rarity corner triangle */}
        <div
          className="absolute top-0 left-0 w-5 h-5 z-10 pointer-events-none"
          style={{ background: s.cornerGrad }}
        >
          <span className="absolute top-0 left-0.5 text-[7px] font-black leading-none" style={{ color: s.border }}>
            {s.icon}
          </span>
        </div>

        {/* Card image */}
        <div className="relative flex-1 min-h-0 overflow-hidden" style={{ background: "#111" }}>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={label}
              className={`w-full h-full ${isVBMSspecial || isWildcard ? 'object-contain' : 'object-cover object-center'}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[9px] font-black text-gray-300 px-0.5 text-center leading-tight">
              {label.toUpperCase()}
            </div>
          )}
          {!spinning && (effectiveCard.rarity === "Mythic" || effectiveCard.rarity === "Legendary" || isWildcard) && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${s.glow}22 0%, transparent 50%, ${s.glow}11 100%)` }}
            />
          )}
          {isWin   && <div className="absolute inset-0 bg-yellow-300/20 animate-pulse pointer-events-none" />}
          {spinning && <div className="absolute inset-0 bg-black/55 pointer-events-none" />}
          {/* Prize foil rainbow overlay — não aplica em GIFs (fica bugado) */}
          {!spinning && effectiveCard.hasFoil && !isVBMSspecial && !isWildcard && <div className="prize-foil" />}
          {/* Locked GIF indicator */}
          {isLockedGif && (
            <div className="absolute top-0 right-0 z-30 px-1 py-0.5 text-[7px] font-black text-black rounded-bl"
              style={{ background: '#FFD700' }}>LOCKED</div>
          )}
          {/* Dev index overlay */}
          {showIndices && !spinning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <span className="text-[10px] font-black text-white" style={{ textShadow:"0 0 4px #000,0 0 8px #000" }}>{idx}</span>
            </div>
          )}
        </div>

        {/* Name label — full name, auto-shrink font */}
        <div
          className="shrink-0 flex items-center gap-0.5 px-0.5 py-[2px]"
          style={{ background: isWin ? "#92400e" : s.labelBg }}
        >
          <span className="text-[5px] font-black leading-none shrink-0" style={{ color: s.border }}>{s.icon}</span>
          <span
            className="text-[5px] font-black text-white truncate leading-none flex-1 text-center"
            style={{ fontSize: label.length > 12 ? "4px" : "5px" }}
          >
            {label.toUpperCase()}
          </span>
        </div>
      </div>
    );
  };

  const wood = "linear-gradient(180deg,#7a4520 0%,#3d1c02 35%,#6b3a1a 65%,#3d1c02 100%)";
  const dark = "linear-gradient(180deg,#1a0900 0%,#0d0500 100%)";

  // Tela de acesso restrito
  if (address && !isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <div className="text-4xl font-black" style={{ color:"#FFD700" }}>ACESSO RESTRITO</div>
        <div className="text-sm text-gray-400">Este slot machine e privado e esta em desenvolvimento.</div>
        <div className="text-xs text-gray-600 font-mono break-all">{address}</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes slot-blur {
          0%   { transform:translateY(-6px); filter:blur(2.5px) brightness(1.1); }
          50%  { transform:translateY(6px);  filter:blur(3px) brightness(0.85); }
          100% { transform:translateY(-6px); filter:blur(2.5px) brightness(1.1); }
        }
        .slot-spin { animation: slot-blur 0.08s ease-in-out infinite; }
        @keyframes slot-blur-slow {
          0%   { transform:translateY(-3px); filter:blur(1px) brightness(1.05); }
          50%  { transform:translateY(3px);  filter:blur(1.5px) brightness(0.9); }
          100% { transform:translateY(-3px); filter:blur(1px) brightness(1.05); }
        }
        .slot-decel { animation: slot-blur-slow 0.18s ease-in-out infinite; }
        @keyframes win-pulse {
          0%,100%{ opacity:1; transform:scale(1); }
          50%    { opacity:0.75; transform:scale(1.015); }
        }
        .win-pulse { animation: win-pulse 0.45s ease-in-out infinite; }
        @keyframes jackpot-glow {
          0%,100%{ text-shadow:0 0 6px #a855f7,0 0 14px #a855f7; }
          50%    { text-shadow:0 0 20px #a855f7,0 0 40px #a855f7,0 0 60px #c084fc; }
        }
        .jackpot-text { animation: jackpot-glow 0.7s ease-in-out infinite; }
        @keyframes mythic-border {
          0%,100%{ box-shadow:0 0 8px #a855f7, 0 0 2px #a855f7, inset 0 0 8px rgba(168,85,247,0.15); }
          50%    { box-shadow:0 0 18px #a855f7, 0 0 6px #c084fc, inset 0 0 14px rgba(168,85,247,0.25); }
        }
        @keyframes legendary-border {
          0%,100%{ box-shadow:0 0 8px #f59e0b, 0 0 2px #f59e0b, inset 0 0 6px rgba(245,158,11,0.1); }
          50%    { box-shadow:0 0 16px #fbbf24, 0 0 5px #fde68a, inset 0 0 12px rgba(245,158,11,0.2); }
        }
        @keyframes subtitle-blink {
          0%,45%  { opacity:1; }
          50%,95% { opacity:0.25; }
          100%    { opacity:1; }
        }
        .subtitle-blink { animation: subtitle-blink 1.4s ease-in-out infinite; }
        /* foil-card usa .prize-foil de globals.css (mais colorido) */
        .foil-card { }
        /* Foil breathing animation */
        @keyframes foil-breathe {
          0%, 100% { box-shadow: 0 0 15px #FFA500, inset 0 0 20px #FFA50022; }
          50% { box-shadow: 0 0 25px #FACC15, inset 0 0 30px #FACC1533; }
        }
        .foil-card {
          animation: foil-breathe 3s ease-in-out infinite;
        }
        @keyframes combo-reveal {
          0%   { opacity:0; transform:scale(0.4) translateY(30px); }
          18%  { opacity:1; transform:scale(1.12) translateY(-4px); }
          28%  { transform:scale(1); }
          68%  { opacity:1; transform:scale(1); }
          100% { opacity:0; transform:scale(0.85) translateY(-24px); }
        }
        .combo-overlay { animation: combo-reveal 2.8s cubic-bezier(.34,1.56,.64,1) forwards; }
        @keyframes combo-shimmer {
          0%,100% { text-shadow: 0 0 12px var(--cc), 0 0 30px var(--cc); }
          50%     { text-shadow: 0 0 24px var(--cc), 0 0 60px var(--cc), 0 0 90px var(--cc); }
        }
        .combo-text { animation: combo-shimmer 0.6s ease-in-out infinite; }
        @keyframes card-fall-in {
          0%   { transform: translateY(-100%); opacity: 0; }
          60%  { transform: translateY(6px); opacity: 1; }
          80%  { transform: translateY(-3px); }
          100% { transform: translateY(0); opacity: 1; }
        }
        .card-fall-in { animation: card-fall-in 0.45s cubic-bezier(.34,1.56,.64,1) forwards; }
        @keyframes win-flash {
          0%,100% { opacity: 1; transform: scale(1); }
          30%     { opacity: 0.4; transform: scale(0.96); }
          60%     { opacity: 1; transform: scale(1.03); }
        }
        .win-flash { animation: win-flash 0.35s ease-in-out 3; }
        @keyframes payline-draw {
          0%   { stroke-dashoffset: 350; opacity: 1; }
          65%  { stroke-dashoffset: 0; opacity: 1; }
          85%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        .payline-draw { stroke-dasharray: 350; stroke-dashoffset: 350; animation: payline-draw 0.85s ease-out forwards; }
        /* Foil suspense column glow */
        @keyframes foil-suspense-pulse {
          0%,100% { box-shadow: 0 0 8px #FFA500, 0 0 16px #FFD700; filter: brightness(1.15) saturate(1.2); }
          50%     { box-shadow: 0 0 24px #FFD700, 0 0 48px #FF8C00, 0 0 72px #FF6B00; filter: brightness(1.5) saturate(1.6); }
        }
        .foil-suspense-col { animation: foil-suspense-pulse 0.38s ease-in-out infinite; z-index: 5; }
        /* Epic foil fly-in from grid position */
        @keyframes epic-fly {
          0%   { transform: translate(var(--sx), var(--sy)) scale(0.5); opacity:0; }
          60%  { opacity:1; }
          100% { transform: translate(0,0) scale(1); opacity:1; }
        }
        .epic-foil-fly { animation: epic-fly 1.1s cubic-bezier(.34,1.56,.64,1) both; animation-delay: var(--delay); }
        /* Epic foil group spin */
        @keyframes epic-spin {
          0%   { transform: translate(0,0) scale(1) rotateY(0deg); }
          40%  { transform: translate(0,0) scale(1.15) rotateY(180deg); }
          100% { transform: translate(0,0) scale(1) rotateY(360deg); }
        }
        .epic-foil-spin { animation: epic-spin 1.8s cubic-bezier(.34,1.2,.64,1) both; animation-delay: var(--delay); }
        /* Bonus text pop */
        @keyframes epic-bonus-pop {
          0%   { transform: scale(0); opacity:0; }
          60%  { transform: scale(1.2); opacity:1; }
          100% { transform: scale(1); opacity:1; }
        }
        .epic-bonus-text { animation: epic-bonus-pop 0.6s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes card-3d-fly-in {
          0%   { opacity:0; transform:perspective(900px) rotateY(-120deg) translateY(-160px) scale(0.4); }
          55%  { opacity:1; transform:perspective(900px) rotateY(18deg) translateY(8px) scale(1.06); }
          75%  { transform:perspective(900px) rotateY(-8deg) translateY(-4px) scale(0.97); }
          90%  { transform:perspective(900px) rotateY(4deg) translateY(2px) scale(1.01); }
          100% { opacity:1; transform:perspective(900px) rotateY(0deg) translateY(0) scale(1); }
        }
        .card-3d-fly-in { animation: card-3d-fly-in 0.95s cubic-bezier(.34,1.2,.64,1) forwards; }
      `}</style>


      {/* CARD GALLERY MODAL */}
      {showGallery && (
        <div className="fixed inset-0 z-[400] flex flex-col bg-black/95 overflow-hidden" onClick={() => setShowGallery(false)}>
          <div className="flex items-center justify-between px-4 py-2 border-b-2 border-yellow-500 shrink-0" style={{ background:"#0d0500" }} onClick={e => e.stopPropagation()}>
            <span className="font-black text-xs uppercase tracking-widest text-yellow-400">Card Gallery ({POOL.length} cartas)</span>
            <button onClick={() => setShowGallery(false)} className="w-7 h-7 rounded-full bg-red-600 border-2 border-black font-black text-white flex items-center justify-center">×</button>
          </div>
          <div className="overflow-y-auto flex-1 p-2" onClick={e => e.stopPropagation()}>
            {/* Rarity groups */}
            {(["Special","Mythic","Legendary","Epic","Rare","Common"] as const).map(rar => {
              const cards = POOL.filter(c => c.rarity === rar);
              if (!cards.length) return null;
              const rs = RS[rar];
              return (
                <div key={rar} className="mb-4">
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: rs.border }}>
                    {rar} ({cards.length})
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                    {cards.map(c => {
                      const cImg = c.baccarat === "vbms_special" ? CASINO_SLOT_GIF : getVbmsBaccaratImageUrl(c.baccarat);
                      const cLabel = LABELS[c.baccarat] ?? c.baccarat;
                      return (
                        <div
                          key={c.baccarat}
                          className="relative flex flex-col overflow-hidden rounded cursor-pointer active:scale-95 transition-transform"
                          style={{ border:`${rs.borderW}px solid ${rs.border}`, background: rs.bg, aspectRatio:"3/4", boxShadow:`0 0 6px ${rs.border}44` }}
                          onClick={() => {
                            card3DRotRef.current = { rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 };
                            setCard3D({ card: { baccarat: c.baccarat, rarity: c.rarity }, img: cImg || '', label: cLabel, flyIn: true });
                          }}
                        >
                          <div className="relative flex-1 overflow-hidden" style={{ background:"#111" }}>
                            {cImg ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={cImg} alt={cLabel} className="w-full h-full object-cover object-center" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-[8px] text-gray-300 text-center px-0.5">{cLabel.toUpperCase()}</div>
                            )}
                          </div>
                          <div className="px-0.5 py-0.5 text-center" style={{ background: rs.labelBg }}>
                            <span className="text-[6px] font-black text-white leading-none" style={{ fontSize: cLabel.length > 10 ? "5px" : "6px" }}>{cLabel.toUpperCase()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* Foil preview row */}
            <div className="mb-4">
              <div className="text-[10px] font-black uppercase tracking-widest mb-2 px-1 text-orange-400">FOIL EFFECT (preview)</div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                {POOL.slice(0, 5).map(c => {
                  const cImg = getVbmsBaccaratImageUrl(c.baccarat);
                  const rs = RS[c.rarity as keyof typeof RS] ?? RS.Common;
                  const cLabel = LABELS[c.baccarat] ?? c.baccarat;
                  return (
                    <div key={c.baccarat+"_foil"} className="relative foil-card flex flex-col overflow-hidden rounded" style={{ border:`${rs.borderW}px solid #FFA500`, background: rs.bg, aspectRatio:"3/4", boxShadow:`0 0 15px #FFA50088` }}>
                      <div className="relative flex-1 overflow-hidden" style={{ background:"#111" }}>
                        {cImg && <img src={cImg} alt={cLabel} className="w-full h-full object-cover object-center" />}
                        <div className="prize-foil" />
                      </div>
                      <div className="px-0.5 py-0.5 text-center" style={{ background: rs.labelBg }}>
                        <span className="text-[6px] font-black text-white leading-none">✨ FOIL</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D CARD VIEWER — igual ao /raffle, drag para girar */}
      {card3D && (
        <div
          className="fixed inset-0 z-[500] flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
          onClick={() => {
            setCard3D(null);
            card3DRotRef.current = { rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 };
          }}
        >
          <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            {/* Rarity tag */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full border-2 font-black text-xs uppercase tracking-widest"
                style={{ borderColor: (RS[card3D.card.rarity] ?? RS.Common).border, color: (RS[card3D.card.rarity] ?? RS.Common).border, background: (RS[card3D.card.rarity] ?? RS.Common).bg }}>
                {card3D.card.rarity}
              </div>
              {card3D.card.hasFoil && <div className="px-2 py-1 rounded-full border-2 border-orange-400 text-orange-300 font-black text-xs">✨ FOIL</div>}
            </div>

            {/* 3D card wrapper — drag to spin */}
            <div
              className={`select-none ${card3D.flyIn ? "card-3d-fly-in" : ""}`}
              style={{ perspective: '900px', width: 204, height: 310, cursor: 'grab' }}
              onMouseDown={e => { card3DRotRef.current.dragging = true; card3DRotRef.current.lastX = e.clientX; card3DRotRef.current.lastY = e.clientY; (e.currentTarget as HTMLDivElement).style.cursor = 'grabbing'; }}
              onMouseMove={e => {
                if (!card3DRotRef.current.dragging) return;
                const dx = e.clientX - card3DRotRef.current.lastX; const dy = e.clientY - card3DRotRef.current.lastY;
                card3DRotRef.current.lastX = e.clientX; card3DRotRef.current.lastY = e.clientY;
                card3DRotRef.current.rotY += dx * 0.7;
                card3DRotRef.current.rotX -= dy * 0.4;
                card3DRotRef.current.rotX = Math.max(-40, Math.min(40, card3DRotRef.current.rotX));
                if (card3DInnerRef.current) card3DInnerRef.current.style.transform = `rotateY(${card3DRotRef.current.rotY}deg) rotateX(${card3DRotRef.current.rotX}deg)`;
              }}
              onMouseUp={e => { card3DRotRef.current.dragging = false; (e.currentTarget as HTMLDivElement).style.cursor = 'grab'; }}
              onMouseLeave={e => { card3DRotRef.current.dragging = false; (e.currentTarget as HTMLDivElement).style.cursor = 'grab'; }}
              onTouchStart={e => { const t = e.touches[0]; card3DRotRef.current.dragging = true; card3DRotRef.current.lastX = t.clientX; card3DRotRef.current.lastY = t.clientY; }}
              onTouchMove={e => {
                if (!card3DRotRef.current.dragging) return;
                const t = e.touches[0];
                const dx = t.clientX - card3DRotRef.current.lastX; const dy = t.clientY - card3DRotRef.current.lastY;
                card3DRotRef.current.lastX = t.clientX; card3DRotRef.current.lastY = t.clientY;
                card3DRotRef.current.rotY += dx * 0.7;
                card3DRotRef.current.rotX -= dy * 0.4;
                card3DRotRef.current.rotX = Math.max(-40, Math.min(40, card3DRotRef.current.rotX));
                if (card3DInnerRef.current) card3DInnerRef.current.style.transform = `rotateY(${card3DRotRef.current.rotY}deg) rotateX(${card3DRotRef.current.rotX}deg)`;
              }}
              onTouchEnd={() => { card3DRotRef.current.dragging = false; }}
            >
              <div
                ref={card3DInnerRef}
                style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transform: 'rotateY(0deg) rotateX(0deg)', transition: 'transform 0.05s ease-out' }}
              >
                {/* FRONT — igual ao raffle: imagem preenchendo tudo, sem label */}
                <div style={{
                  position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' as any,
                  borderRadius: 12, overflow: 'hidden',
                  boxShadow: `0 0 40px ${(RS[card3D.card.rarity] ?? RS.Common).border}88`,
                  background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {card3D.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card3D.img} alt={card3D.label} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                  )}
                  {card3D.card.hasFoil && <div className="prize-foil" style={{ borderRadius: 12 }} />}
                </div>
                {/* BACK — igual ao raffle: scale(1.13) para cobrir bordas do formato */}
                <div style={{
                  position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' as any,
                  transform: 'rotateY(180deg)', borderRadius: 12, overflow: 'hidden',
                  boxShadow: '0 0 40px rgba(255,215,0,0.5)',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/card-back.png" alt="Card Back" draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.13) translateY(1.3%)', transformOrigin: 'center', pointerEvents: 'none' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/gif-background.png'; }} />
                </div>
              </div>
            </div>

            <p className="text-white/40 text-[10px] uppercase tracking-widest">Arraste para girar</p>
            <button
              onClick={() => { setCard3D(null); card3DRotRef.current = { rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 }; }}
              className="text-white/30 text-xs font-black uppercase tracking-widest hover:text-white/60 transition-colors"
            >✕ Fechar</button>
          </div>
        </div>
      )}

      {/* EPIC FOIL OVERLAY — 4 foil cards flip 3D in-place side by side */}
      {epicFoilCards && epicFoilPhase && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center overflow-hidden pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="relative" style={{ width: 'min(86vw, 360px)', aspectRatio: '5 / 3' }}>
            {epicFoilCards.map((fc, i) => {
              const rs = RS[fc.card.rarity] ?? RS.Common;
              const cellWidth = 100 / COLS;
              const cellHeight = 100 / ROWS;
              return (
                <div
                  key={fc.idx}
                  className={epicFoilPhase === 'fly' ? 'epic-foil-fly' : 'epic-foil-spin'}
                  style={{
                    position: 'absolute',
                    left: `calc(${fc.col * cellWidth}% + 4px)`,
                    top: `calc(${fc.row * cellHeight}% + 4px)`,
                    width: `calc(${cellWidth}% - 8px)`,
                    height: `calc(${cellHeight}% - 8px)`,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: `3px solid ${rs.border}`,
                    boxShadow: `0 0 20px ${rs.border}88, 0 0 40px #FFA50055`,
                    background: rs.bg,
                    '--delay': `${i * 0.08}s`,
                  } as React.CSSProperties}
                >
                  {fc.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fc.img} alt="" draggable={false} style={{ width:'100%', height:'100%', objectFit:'cover', pointerEvents:'none' }} />
                  )}
                  <div className="prize-foil" />
                </div>
              );
            })}
            {epicFoilPhase === 'spin' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center epic-bonus-text">
                  <div className="font-black uppercase tracking-widest" style={{ fontSize: 32, color:'#FFD700', textShadow:'0 0 20px #FFD700, 0 0 40px #FFA500' }}>
                    BONUS!
                  </div>
                  <div className="font-black text-white text-sm uppercase tracking-widest mt-1" style={{ textShadow:'0 0 10px #a855f7' }}>
                    FREE SPINS
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação BUY BONUS */}
      {showBonusConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/85" onClick={() => setShowBonusConfirm(false)}>
          <div
            className="w-full max-w-[280px] overflow-hidden rounded-xl border-4"
            style={{ borderColor:"#7c3aed", background:"#0d0015", boxShadow:"4px 4px 0 #000" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 py-2 border-b-2 border-[#7c3aed] flex items-center justify-between" style={{ background:"linear-gradient(180deg,#4c1d95,#2e1065)" }}>
              <span className="font-black text-sm uppercase tracking-widest" style={{ color:"#FFD700", textShadow:"1px 1px 0 #000" }}>BUY BONUS</span>
              <button onClick={() => setShowBonusConfirm(false)} className="w-6 h-6 rounded-full bg-red-600 border-2 border-black font-black text-white text-sm flex items-center justify-center">×</button>
            </div>
            <div className="p-4 text-center space-y-3">
              <div className="text-white text-sm">Custo: <span className="font-black text-purple-300">{bonusCost} coins</span></div>
              <div className="text-gray-400 text-xs">Multiplicador de prêmio: <span className="font-black text-green-400">2×</span></div>
              <div className="text-gray-500 text-[10px]">Saldo atual: <span className="text-white font-bold">{coins.toLocaleString()} coins</span></div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowBonusConfirm(false)}
                  className="flex-1 py-2 border-2 border-gray-600 font-black text-xs uppercase text-gray-400 hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { setShowBonusConfirm(false); spin(false, true); }}
                  className="flex-1 py-2 border-2 border-black font-black text-xs uppercase active:scale-95 transition-transform"
                  style={{ background:"linear-gradient(180deg,#7c3aed,#4c1d95)", color:"#FFD700", textShadow:"1px 1px 0 #000", boxShadow:"0 3px 0 #000" }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full w-full max-w-[420px] mx-auto select-none">
        {/* MACHINE FRAME */}
        <div
          className="relative flex flex-col flex-1 min-h-0 w-full overflow-hidden border-4"
          style={{
            borderColor: "#c87941",
            boxShadow: "0 0 0 2px #0d0500, inset 0 1px 0 rgba(255,200,100,0.2)",
            background: wood,
          }}
        >

          {/* REEL AREA — flex-1 preenche o espaço disponível */}
          <div
            className="flex-1 min-h-0 relative overflow-hidden"
            style={{
              background: isBonusActive
                ? "linear-gradient(180deg,#1a0040 0%,#0d001f 40%,#050010 70%,#000 100%)"
                : "linear-gradient(180deg,#000 0%,#100500 40%,#080200 70%,#000 100%)",
              boxShadow: isBonusActive
                ? "inset 0 12px 28px rgba(168,85,247,0.4), inset 0 -12px 28px rgba(168,85,247,0.4)"
                : "inset 0 12px 28px rgba(0,0,0,0.98), inset 0 -12px 28px rgba(0,0,0,0.98)",
            }}
          >
            {/* Payline dots — one per row */}
            <div className="absolute left-0.5 top-0 bottom-0 z-20 flex flex-col justify-around pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
            </div>
            <div className="absolute right-0.5 top-0 bottom-0 z-20 flex flex-col justify-around pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] border border-black shadow-lg" />
            </div>

            {/* Cards grid — flex layout para rows/cols iguais garantidos */}
            <div className="absolute inset-0 mx-3 my-1 flex flex-col" style={{ gap: "3px" }}>
              {Array.from({ length: ROWS }, (_, row) => (
                <div key={row} className="flex min-h-0" style={{ flex: 1, gap: "3px" }}>
                  {Array.from({ length: COLS }, (_, col) => {
                    const i = row * COLS + col;
                    return (
                      <div
                        key={col}
                        className={`relative min-w-0 ${foilSuspenseCols.has(col) && !stopped.has(col) ? 'foil-suspense-col' : ''}`}
                        style={{
                          flex: 1,
                          borderRight: col < COLS - 1 ? "1px solid rgba(200,121,65,0.18)" : "none",
                          cursor: !isSpinning && stopped.has(col) ? 'pointer' : 'default',
                        }}
                        onClick={() => {
                          if (isSpinning || !stopped.has(col)) return;
                          const c = cells[i];
                          const img = c.baccarat === "vbms_special" ? CASINO_SLOT_GIF : getVbmsBaccaratImageUrl(c.baccarat);
                          card3DRotRef.current = { rotY: 0, rotX: 0, dragging: false, lastX: 0, lastY: 0 };
                          setCard3D({ card: c, img: img || '', label: LABELS[c.baccarat] ?? c.baccarat, flyIn: true });
                        }}
                      >
                        {renderCard(cells[i], i)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Payline SVG overlay — draws winning lines */}
            {activePaylines.length > 0 && (
              <svg
                className="absolute inset-0 pointer-events-none z-30"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ width: "100%", height: "100%", padding: "0 12px 4px 12px", boxSizing: "border-box" }}
              >
                {activePaylines.filter(p => p.d).map((pl, i) => (
                  <path
                    key={i}
                    d={pl.d}
                    stroke={pl.color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="payline-draw"
                    style={{ filter: `drop-shadow(0 0 5px ${pl.color})` }}
                  />
                ))}
              </svg>
            )}
          </div>

          {/* COMBO NAME OVERLAY */}
          {comboDisplay && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
              <div
                className="combo-overlay flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-4 border-black"
                style={{
                  background: `linear-gradient(160deg,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.95) 100%)`,
                  boxShadow: `0 0 40px ${comboDisplay.color}88, 0 0 80px ${comboDisplay.color}44, 4px 4px 0 #000`,
                }}
              >
                <div
                  className="combo-text font-black uppercase tracking-widest text-center leading-none"
                  style={{
                    fontSize: "clamp(16px,5vw,26px)",
                    color: comboDisplay.color,
                    ["--cc" as string]: comboDisplay.color,
                  }}
                >
                  {comboDisplay.name}
                </div>
                <div
                  className="font-black text-white text-center"
                  style={{ fontSize: "clamp(12px,3.5vw,18px)", textShadow: `1px 1px 0 #000, 0 0 10px ${comboDisplay.color}` }}
                >
                  +{comboDisplay.winAmt.toLocaleString()} COINS
                </div>
              </div>
            </div>
          )}

          {/* FOIL COUNTER & BONUS INDICATOR - Removed per user request */}
          {/* {(foilCountDisplay > 0 || showBonusAnimation) && (
            <div className="absolute top-2 right-2 z-30 px-2 py-1 rounded text-xs font-black border-2"
              style={{
                background: showBonusAnimation ? "#7c3aed" : foilCountDisplay >= 4 ? "#10b981" : "#f59e0b",
                color: "#fff",
                borderColor: "#000",
                boxShadow: "0 2px 0 #000",
              }}
            >
              {showBonusAnimation ? (
                <span className="animate-pulse">🎰 BONUS +{BONUS_FREE_SPINS}!</span>
              ) : (
                <span>FOIL {foilCountDisplay}/{BONUS_FOIL_COUNT}</span>
              )}
            </div>
          )} */}

          {/* WIN BAR */}
          <div
            className={`shrink-0 text-center py-1.5 border-y-2 border-[#c87941] min-h-[32px] flex items-center justify-center ${winAmt !== null && winAmt > 0 ? "win-pulse" : ""}`}
            style={{
              background: winAmt !== null && winAmt > 0
                ? "linear-gradient(90deg,#78350f 0%,#d97706 40%,#fbbf24 50%,#d97706 60%,#78350f 100%)"
                : dark,
            }}
          >
            {winAmt === null ? (
              <div className="text-center">
                {/* Prominent bonus spins banner */}
                {(bonusSpinsRemaining > 0 && freeLeft <= 0) || freeLeft > 0 ? (
                  <div className="flex items-center justify-center space-x-2">
                    {bonusSpinsRemaining > 0 && freeLeft <= 0 ? (
                      <span className="text-[12px] font-black uppercase tracking-widest" style={{
                        background: "linear-gradient(180deg,#a855f7 0%,#7c3aed 50%,#6d28d9 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}>
                        🎰 {bonusSpinsRemaining} BONUS SPINS
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:"#34d399" }}>
                        {freeLeft} FREE SPIN{freeLeft > 1 ? "S" : ""} disponíveis
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="subtitle-blink text-[10px] font-bold uppercase tracking-widest" style={{ color:"#f59e0b" }}>
                    WIN UP TO 50.000 COINS
                  </span>
                )}
              </div>
            ) : winAmt > 0 ? (
              <div>
                <div className="text-lg font-black text-white" style={{ textShadow:"1px 1px 0 #000,0 0 10px #FFD700" }}>
                  +{winAmt.toLocaleString()} COINS!
                </div>
                {isJackpot && <div className="text-xs font-black text-purple-300 jackpot-text">JACKPOT MAXIMO!</div>}
              </div>
            ) : (
              <span className="text-xs font-bold" style={{ color:"#c87941" }}>Sem linhas ganhadoras</span>
            )}
          </div>

          {/* BALANCE BAR — abaixo do grid */}
          <div className="shrink-0 flex items-center justify-between px-4 py-1 border-b-2 border-[#c87941]" style={{ background: dark }}>
            <span className="text-[8px] font-bold uppercase text-gray-500">BALANCE</span>
            <span className="text-base font-black text-green-400">{coins.toLocaleString()} coins</span>
          </div>

          {/* CONTROLS */}
          <div
            className="shrink-0 px-3 pt-2 pb-2"
            style={{ background: wood, paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Row 1: WALLET | SPIN | BONUS */}
            <div className="flex items-center gap-2 mb-2">

              {/* BUY BONUS */}
              <button
                onClick={() => setShowBonusConfirm(true)}
                disabled={isSpinning || coins < bonusCost || freeLeft > 0}
                className="flex-1 h-10 border-2 border-black font-black uppercase tracking-wide active:scale-95 transition-transform disabled:opacity-40 flex flex-col items-center justify-center leading-none"
                style={{
                  background: isSpinning || coins < bonusCost || freeLeft > 0
                    ? "linear-gradient(180deg,#374151,#1f2937)"
                    : "linear-gradient(180deg,#7c3aed,#4c1d95)",
                  color: "#FFD700",
                  boxShadow: "0 3px 0 #000",
                  textShadow: "1px 1px 0 #000",
                  borderColor: "#7c3aed",
                }}
              >
                <span className="text-[9px]">BUY BONUS</span>
                <span className="text-[8px] font-bold" style={{ color: "#c4b5fd" }}>{bonusCost}c · 2×</span>
              </button>

              {/* SPIN — centro */}
              <button
                onClick={() => {
                  // Dev mode: ALLOWED_ADDRESSES get infinite free spins
                  if (isAllowed) {
                    // Always allow spinning for dev addresses - use free spin mode
                    spin(true);
                    return;
                  }

                  // Priorizar bonus spins sobre free spins (normal mode)
                  if (bonusSpinsRemaining > 0 && freeLeft <= 0) {
                    spin(true, true); // Usar bonus spin (força modo bônus)
                  } else if (freeLeft > 0) {
                    spin(true); // Usar free spin diário
                  } else {
                    spin(false); // Spin pago
                  }
                }}
                disabled={isSpinning || ((bonusSpinsRemaining <= 0 && freeLeft <= 0 && coins < betCost) && !isAllowed)}
                className="w-14 h-14 rounded-full border-4 border-black font-black flex-none flex flex-col items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
                style={{
                  background: isSpinning
                    ? "linear-gradient(180deg,#6b7280,#4b5563)"
                    : bonusSpinsRemaining > 0
                      ? "linear-gradient(180deg,#a855f7 0%,#7c3aed 50%,#6d28d9 100%)" //roxo para bonus
                      : freeLeft > 0
                        ? "linear-gradient(180deg,#34d399 0%,#059669 50%,#047857 100%)"
                        : isAllowed
                          ? "linear-gradient(180deg,#34d399 0%,#059669 50%,#047857 100%)" // Dev mode: always show free
                          : "linear-gradient(180deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)",
                  boxShadow: isSpinning ? "0 2px 0 #000" : "0 5px 0 #000, 0 0 18px rgba(251,191,36,0.55)",
                  color: "#000",
                  transform: isSpinning ? "translateY(3px)" : undefined,
                }}
              >
                <span className={`text-[10px] font-black leading-none tracking-widest ${isSpinning ? "animate-spin" : ""}`}>
                  {isAllowed ? "FREE" : (bonusSpinsRemaining > 0 ? "BONUS" : freeLeft > 0 ? "FREE" : "SPIN")}
                </span>
                {(isAllowed || bonusSpinsRemaining > 0 || freeLeft > 0) && !isSpinning && (
                  <span className="text-[8px] font-black mt-0.5 text-green-900">
                    {isAllowed ? "∞" : (bonusSpinsRemaining > 0 ? bonusSpinsRemaining : freeLeft)}x
                  </span>
                )}
              </button>

              {/* WALLET (DEP/WIT) */}
              <button
                onClick={onWalletOpen}
                disabled={!onWalletOpen}
                className="flex-1 h-10 border-2 border-black font-black uppercase tracking-wide active:scale-95 transition-transform disabled:opacity-40 flex flex-col items-center justify-center leading-none"
                style={{
                  background: "linear-gradient(180deg,#7a4520,#3d1c02)",
                  color: "#FFD700",
                  boxShadow: "0 3px 0 #000",
                  textShadow: "1px 1px 0 #000",
                  borderColor: "#c87941",
                }}
              >
                <span className="text-[9px]">DEPOSIT</span>
                <span className="text-[8px] font-bold" style={{ color: "#c87941" }}>WITHDRAW</span>
              </button>
            </div>

            {/* Row 2: BET SELECTOR */}
            <div
              className="flex items-center gap-3 px-3 py-1.5 border-2 border-black rounded"
              style={{
                background: freeLeft > 0
                  ? "linear-gradient(180deg,#1a2e1a,#0d1a0d)"
                  : "linear-gradient(180deg,#1e3a5f,#172554)",
                opacity: freeLeft > 0 ? 0.65 : 1,
              }}
            >
              <button
                onClick={() => setBetIdx(i => Math.max(0, i - 1))}
                disabled={betIdx === 0 || isSpinning || freeLeft > 0}
                className="w-7 h-7 rounded border-2 border-blue-400 bg-blue-900 font-black text-blue-300 text-base flex items-center justify-center disabled:opacity-30 flex-none"
              >−</button>
              <div className="flex-1 text-center">
                <div className="text-[8px] font-bold uppercase text-blue-300 leading-none">BET PER SPIN</div>
                <div className="text-lg font-black text-white leading-tight">{betCost}</div>
                <div className="text-[8px] font-bold leading-none" style={{ color: freeLeft > 0 ? "#34d399" : "#6b7280" }}>
                  {freeLeft > 0 ? "FREE MODE" : "coins"}
                </div>
              </div>
              <button
                onClick={() => setBetIdx(i => Math.min(BET_OPTIONS.length - 1, i + 1))}
                disabled={betIdx === BET_OPTIONS.length - 1 || isSpinning || freeLeft > 0}
                className="w-7 h-7 rounded border-2 border-blue-400 bg-blue-900 font-black text-blue-300 text-base flex items-center justify-center disabled:opacity-30 flex-none"
              >+</button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
