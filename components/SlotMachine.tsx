"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useProfile } from "@/contexts/ProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

// Card display mapping
const CARD_DISPLAY: Record<string, { label: string; rarity: string }> = {
  "jesse": { label: "Jesse", rarity: "Mythic" },
  "anon": { label: "Anon", rarity: "Mythic" },
  "linda xied": { label: "Linda", rarity: "Mythic" },
  "vitalik jumpterin": { label: "Vitalik", rarity: "Mythic" },
  "antonio": { label: "Antonio", rarity: "Legendary" },
  "goofy romero": { label: "Goofy", rarity: "Legendary" },
  "tukka": { label: "Tukka", rarity: "Legendary" },
  "chilipepper": { label: "Chilli", rarity: "Legendary" },
  "miguel": { label: "Miguel", rarity: "Legendary" },
  "ye": { label: "Ye", rarity: "Legendary" },
  "nico": { label: "Nico", rarity: "Legendary" },
  "sartocrates": { label: "Sart", rarity: "Epic" },
  "0xdeployer": { label: "Deploy", rarity: "Epic" },
  "lombra jr": { label: "Lombra", rarity: "Epic" },
  "vibe intern": { label: "Vibe", rarity: "Epic" },
  "jack the sniper": { label: "Jack", rarity: "Epic" },
  "beeper": { label: "Beep", rarity: "Epic" },
  "horsefarts": { label: "Horse", rarity: "Epic" },
  "jc denton": { label: "JC", rarity: "Epic" },
  "zurkchad": { label: "Zurk", rarity: "Epic" },
  "slaterg": { label: "Slater", rarity: "Epic" },
  "brian armstrong": { label: "Brian", rarity: "Epic" },
  "nftkid": { label: "NFTKid", rarity: "Epic" },
  "smolemaru": { label: "Smol", rarity: "Rare" },
  "ventra": { label: "Ventra", rarity: "Rare" },
  "bradymck": { label: "Brady", rarity: "Rare" },
  "shills": { label: "Shill", rarity: "Rare" },
  "betobutter": { label: "Beto", rarity: "Rare" },
  "qrcodo": { label: "Qr", rarity: "Rare" },
  "loground": { label: "Log", rarity: "Rare" },
  "melted": { label: "Melt", rarity: "Rare" },
  "rachel": { label: "Rachel", rarity: "Common" },
  "claude": { label: "Claude", rarity: "Common" },
  "gozaru": { label: "Goz", rarity: "Common" },
  "ink": { label: "Ink", rarity: "Common" },
  "casa": { label: "Casa", rarity: "Common" },
  "groko": { label: "Groko", rarity: "Common" },
  "rizkybegitu": { label: "Rizky", rarity: "Common" },
  "thosmur": { label: "Thos", rarity: "Common" },
  "brainpasta": { label: "Brain", rarity: "Common" },
  "gaypt": { label: "Gaypt", rarity: "Common" },
  "dan romero": { label: "Dan", rarity: "Common" },
  "morlacos": { label: "Morl", rarity: "Common" },
  "landmine": { label: "Lane", rarity: "Common" },
  "linux": { label: "Linux", rarity: "Common" },
  "joonx": { label: "Joonx", rarity: "Common" },
  "don filthy": { label: "Filthy", rarity: "Common" },
  "pooster": { label: "Poost", rarity: "Common" },
  "john porn": { label: "John", rarity: "Common" },
  "scum": { label: "Scum", rarity: "Common" },
  "vlady": { label: "Vlad", rarity: "Common" },
};

const RARITY_COLORS: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  Mythic: { border: "#A855F7", bg: "#1E1B4B", text: "#C4B5FD", glow: "#8B5CF6" },
  Legendary: { border: "#F59E0B", bg: "#422006", text: "#FDE68A", glow: "#FBBF24" },
  Epic: { border: "#EC4899", bg: "#420617", text: "#FBCFE8", glow: "#F472B6" },
  Rare: { border: "#3B82F6", bg: "#172554", text: "#93C5FD", glow: "#60A5FA" },
  Common: { border: "#9CA3AF", bg: "#111827", text: "#D1D5DB", glow: "#6B7280" },
};

// Layout configuration: 2 cards high, 6 cards wide (12 total visible, others overflow scroll)
const CARDS_PER_ROW = 6;
const ROWS_VISIBLE = 2;
const TOTAL_CARDS = 12; // Show 12 cards at a time (2 rows x 6 cols)

interface SpinResult {
  grid: string[];
  winAmount: number;
  patterns: string[];
  maxWin: boolean;
}

export default function SlotMachine() {
  const { isConnected, address } = useAccount();
  const { profile } = useProfile();
  const { t } = useLanguage();

  const [grid, setGrid] = useState<string[]>(Array(TOTAL_CARDS).fill("loading"));
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [winningCells, setWinningCells] = useState<number[]>([]);
  const [showAllCards, setShowAllCards] = useState(false); // For modal with all 16 cards

  const spinMutation = useMutation(api.slot.spinSlot);
  const statsQuery = useQuery(api.slot.getSlotDailyStats, {
    address: address || "",
  });
  const configQuery = useQuery(api.slot.getSlotConfig);

  const hasFreeSpins = statsQuery && statsQuery.remainingFreeSpins > 0;
  const canAffordPaid = profile && profile.coins && profile.coins >= (configQuery?.spinCost || 1);

  // Get weighted random card (matching backend logic)
  const getRandomCardBaccarat = useCallback(() => {
    const cardKeys = Object.keys(CARD_DISPLAY);
    const weights = [1,1,1,1,3,3,3,3,3,3,3,6,6,6,6,6,6,6,6,6,6,6,6,10,10,10,10,10,10,10,10,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20];
    const totalWeight = weights.reduce((a,b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < cardKeys.length; i++) {
      random -= weights[i];
      if (random <= 0) return cardKeys[i];
    }
    return cardKeys[0];
  }, []);

  // Generate full 4x4 grid (16 cards) but show only 12 at a time
  const generateFullGrid = useCallback(() => {
    return Array.from({ length: 16 }, () => getRandomCardBaccarat());
  }, [getRandomCardBaccarat]);

  // Animate cards sliding in from left with staggered timing
  const animateGrid = useCallback((fullGrid: string[]) => {
    let spinCount = 0;
    const maxSpins = 40;
    let currentGrid = Array(TOTAL_CARDS).fill("loading");

    const interval = setInterval(() => {
      // Generate random cards for visible area
      const newGrid = Array.from({ length: TOTAL_CARDS }, () => getRandomCardBaccarat());
      setGrid(newGrid);
      spinCount++;
      if (spinCount >= maxSpins) {
        clearInterval(interval);
        // Set final grid (first 12 cards of fullGrid)
        setGrid(fullGrid.slice(0, TOTAL_CARDS));
      }
    }, 60);

    return interval;
  }, [getRandomCardBaccarat]);

  const performSpin = async (isFree: boolean) => {
    if (!isConnected || !address) {
      toast.error(t("connectWallet") || "Connect wallet!");
      return;
    }

    if (isSpinning) return;

    if (isFree && (!hasFreeSpins || statsQuery!.remainingFreeSpins <= 0)) {
      toast.error("No free spins remaining today!");
      return;
    }

    if (!isFree && !canAffordPaid) {
      toast.error(`Need ${configQuery?.spinCost} coins!`);
      return;
    }

    setIsSpinning(true);
    setGrid(Array(TOTAL_CARDS).fill("loading"));
    setWinningCells([]);
    setLastResult(null);
    setShowAllCards(false);

    // Generate final grid first (for backend)
    const finalGrid = generateFullGrid();

    const interval = animateGrid(finalGrid);

    try {
      const result: SpinResult = await spinMutation({
        address: address,
        isFreeSpin: isFree,
        bonusMultiplier: 1,
      });

      clearInterval(interval);
      setGrid(result.grid.slice(0, TOTAL_CARDS));
      setLastResult(result);

      if (result.winAmount > 0) {
        const { calculateWinningCells } = getWinningPatterns(result.patterns);
        const winning = calculateWinningCells(result.patterns).filter(idx => idx < TOTAL_CARDS);
        setWinningCells(winning);
        toast.success(`🎰 Won ${result.winAmount} coins!`);
      } else {
        toast.info("No win this time!");
      }

    } catch (error: any) {
      clearInterval(interval);
      console.error("Spin error:", error);
      toast.error(error.data?.message || error.message || "Spin failed");
      setGrid(Array(TOTAL_CARDS).fill("empty"));
    } finally {
      setIsSpinning(false);
    }
  };

  // Calculate winning cells from patterns
  const getWinningPatterns = useCallback((patterns: string[]) => {
    const cells: number[] = [];

    patterns.forEach(pattern => {
      if (pattern.startsWith("Row ")) {
        const row = parseInt(pattern.split(" ")[1]) - 1;
        for (let i = 0; i < 4; i++) cells.push(row * 4 + i);
      } else if (pattern.startsWith("Col ")) {
        const col = parseInt(pattern.split(" ")[1]) - 1;
        for (let i = 0; i < 4; i++) cells.push(i * 4 + col);
      } else if (pattern.startsWith("Diagonal \\")) {
        cells.push(0, 5, 10, 15);
      } else if (pattern.startsWith("Diagonal /")) {
        cells.push(3, 6, 9, 12);
      }
    });

    return { calculateWinningCells: () => [...new Set(cells)] };
  }, []);

  // Render individual card cell (vertical stack of 2 cards)
  const renderCell = (baccaratKey: string, index: number) => {
    if (baccaratKey === "loading" || baccaratKey === "empty") {
      return (
        <div className="relative h-full border-2 border-dashed border-gray-600 bg-gray-800 animate-pulse flex items-center justify-center overflow-hidden">
          <span className="text-3xl">?</span>
        </div>
      );
    }

    const cardInfo = CARD_DISPLAY[baccaratKey] || { label: baccaratKey, rarity: "Common" };
    const colors = RARITY_COLORS[cardInfo.rarity] || RARITY_COLORS.Common;
    const isWinning = winningCells.includes(index);

    return (
      <div
        className={`relative h-full border-2 flex flex-col transition-all duration-300`}
        style={{
          borderColor: isWinning ? "#FFD700" : colors.border,
          backgroundColor: isWinning ? "#0a0a0a" : colors.bg,
          boxShadow: isWinning
            ? `0 0 30px ${colors.glow}, inset 0 0 20px ${colors.glow}`
            : `inset 0 0 15px rgba(0,0,0,0.5), 0 2px 0 #000`,
        }}
      >
        {/* Rarity glow top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 shadow-[0_0_10px_currentColor]" style={{ background: colors.glow }} />

        {/* Card 1 (top half) */}
        <div className="flex-1 flex flex-col items-center justify-center p-1 border-b" style={{ borderColor: colors.glow }}>
          <div className="text-[8px] font-bold opacity-60 uppercase" style={{ color: colors.glow }}>{cardInfo.rarity.slice(0, 3)}</div>
          <div className="font-black text-xs leading-none truncate w-full text-center" style={{ color: colors.text, textShadow: "0 0 3px currentColor" }}>
            {cardInfo.label.substring(0, 8).toUpperCase()}
          </div>
        </div>

        {/* Card 2 (bottom half) */}
        <div className="flex-1 flex flex-col items-center justify-center p-1">
          <div className="text-[8px] font-bold opacity-60 uppercase" style={{ color: colors.glow }}>{cardInfo.rarity.slice(0, 3)}</div>
          <div className="font-black text-xs leading-none truncate w-full text-center" style={{ color: colors.text, textShadow: "0 0 3px currentColor" }}>
            {cardInfo.label.substring(0, 8).toUpperCase()}
          </div>
          <div className="text-[6px] font-mono opacity-40 mt-0.5" style={{ color: colors.glow }}>
            {baccaratKey.substring(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Win effect */}
        {isWinning && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 via-transparent to-yellow-400/10 animate-pulse" />
            <div className="absolute inset-0 border-2" style={{ borderColor: "#FFD700", boxShadow: "0 0 30px #FFD700 inset" }} />
          </>
        )}
      </div>
    );
  };

  // Grid layout: horizontal scroll with 2 rows
  const gridContainerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${CARDS_PER_ROW}, 1fr)`,
    gridTemplateRows: `repeat(${ROWS_VISIBLE}, 1fr)`,
    gap: '6px',
    width: '100%',
    maxWidth: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '8px',
    scrollBehavior: 'smooth',
    WebkitOverflowScrolling: 'touch',
  };

  // Full grid modal style (4x4)
  const fullGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '4px',
    width: '100%',
    maxWidth: '320px',
  };

  return (
    <>
      <style jsx global>{`
        @keyframes win-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.5); }
        }
        @keyframes coin-burst {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx) * 1px), calc(-50% - 100px)) scale(1); opacity: 0; }
        }
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 0.8; }
          100% { transform: translateY(-20vh); opacity: 0; }
        }
        .slot-grid::-webkit-scrollbar {
          height: 8px;
        }
        .slot-grid::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.3);
          border-radius: 4px;
        }
        .slot-grid::-webkit-scrollbar-thumb {
          background: #FFD700;
          border-radius: 4px;
        }
      `}</style>

      <div className="flex flex-col items-center gap-3 p-3 max-w-2xl mx-auto">
        {/* Title & Stats */}
        <div className="text-center w-full">
          <h1 className="text-xl font-black uppercase tracking-wider mb-1" style={{ fontFamily: "var(--font-cinzel)", color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>
            VIBE SLOTS
          </h1>
          <p className="text-xs font-bold text-gray-400 mb-2">2×6 GRID - MATCH LINES TO WIN</p>

          <div className="flex justify-center gap-3 mb-2">
            <div className="bg-black border-2 border-yellow-500 rounded-lg px-3 py-1.5 text-center">
              <div className="text-[10px] font-bold text-gray-400">COINS</div>
              <div className="text-lg font-black text-green-400">{(profile?.coins || 0).toLocaleString()}</div>
            </div>
            {statsQuery && (
              <div className="bg-black border-2 border-blue-500 rounded-lg px-3 py-1.5 text-center">
                <div className="text-[10px] font-bold text-gray-400">FREE SPINS</div>
                <div className="text-lg font-black text-blue-400">{statsQuery.remainingFreeSpins}</div>
              </div>
            )}
          </div>
        </div>

        {/* Slot Grid Container */}
        <div className="relative w-full max-w-[600px]">
          {/* Winning Effect */}
          {lastResult && lastResult.winAmount > 0 && (
            <div className="absolute inset-0 -z-10 pointer-events-none">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={`coin-${i}`}
                  className="absolute w-4 h-4 bg-yellow-400 rounded-full border border-yellow-600 shadow-[0_0_10px_#FFD700] animate-[float-up_3s_ease-out_infinite]"
                  style={{
                    left: `${Math.random() * 100}%`,
                    bottom: '0',
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Main Grid: 2 rows x 6 cols */}
          <div
            className="slot-grid bg-gray-900 border-4 border-black rounded-lg shadow-[4px_4px_0_0_#000]"
            style={gridContainerStyle}
          >
            {grid.map((card, index) => (
              <div key={index} className="aspect-[3/4] min-w-[60px] max-w-[80px]">
                {renderCell(card, index)}
              </div>
            ))}
          </div>

          {/* Show All Cards Button (if there are more cards) */}
          {!isSpinning && lastResult && lastResult.grid.length > TOTAL_CARDS && (
            <div className="text-center mt-2">
              <button
                onClick={() => setShowAllCards(true)}
                className="text-xs font-bold text-yellow-400 hover:text-yellow-300 underline"
              >
                Show all {lastResult.grid.length} cards →
              </button>
            </div>
          )}

          {/* Win Display */}
          {lastResult && !isSpinning && (
            <div className="mt-3 text-center">
              {lastResult.winAmount > 0 ? (
                <div className="space-y-1">
                  <div className="text-2xl font-black text-yellow-400 animate-pulse">
                    🎰 {lastResult.winAmount.toLocaleString()} WON! 🎰
                  </div>
                  {lastResult.maxWin && (
                    <div className="text-sm font-black text-purple-400 animate-bounce">
                      ⭐ MEGA JACKPOT!!! ⭐
                    </div>
                  )}
                  <div className="text-xs font-bold text-gray-400 max-w-md mx-auto">
                    {lastResult.patterns.join(" | ")}
                  </div>
                </div>
              ) : (
                <div className="text-sm font-bold text-gray-500">No winning lines</div>
              )}
            </div>
          )}
        </div>

        {/* Spin Buttons */}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {hasFreeSpins && (
            <button
              onClick={() => performSpin(true)}
              disabled={isSpinning}
              className="w-full py-3 px-4 border-4 border-blue-500 bg-blue-600 hover:bg-blue-500 text-white font-black text-base uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[3px_3px_0_0_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
            >
              {isSpinning ? "SPINNING..." : `FREE SPIN (${statsQuery?.remainingFreeSpins})`}
            </button>
          )}

          <button
            onClick={() => performSpin(false)}
            disabled={isSpinning || !canAffordPaid}
            className="w-full py-3 px-4 border-4 border-yellow-500 bg-yellow-600 hover:bg-yellow-500 text-black font-black text-base uppercase disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[3px_3px_0_0_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
          >
            {isSpinning ? "SPINNING..." : `BUY SPIN (${configQuery?.spinCost} coin)`}
          </button>
        </div>

        {/* Info */}
        <div className="text-center text-xs font-bold text-gray-500 max-w-md space-y-0.5">
          <p>Match 2+ cards in any row, column or diagonal (4×4 grid internally)</p>
          <p>Mythic (purple) = highest value | 4× Mythic = JACKPOT!</p>
        </div>
      </div>

      {/* Full Grid Modal */}
      {showAllCards && lastResult && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90" onClick={() => setShowAllCards(false)}>
          <div
            className="w-full max-w-sm border-4 border-purple-500 rounded-2xl overflow-hidden bg-gray-900"
            style={{ boxShadow: '4px 4px 0px #A855F7' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-purple-600 border-b-4 border-black px-3 py-1.5 flex items-center justify-between">
              <span className="font-black text-xs uppercase tracking-widest text-white">All 16 Cards</span>
              <button onClick={() => setShowAllCards(false)} className="rounded-full flex items-center justify-center" style={{ background: '#DC2626', width: 24, height: 24, color: '#fff', fontSize: 16, lineHeight: 1, fontWeight: 700 }}>×</button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2" style={fullGridStyle}>
                {lastResult.grid.map((card, idx) => (
                  <div key={idx}>
                    {renderCell(card, idx)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
