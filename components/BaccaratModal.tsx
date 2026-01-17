"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import { useFarcasterVBMSBalance, useFarcasterTransferVBMS, useFarcasterApproveVBMS } from "@/lib/hooks/useFarcasterVBMS";
import { CONTRACTS } from "@/lib/contracts";
import { parseEther } from "viem";

interface BaccaratModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  username: string;
  soundEnabled?: boolean;
  t: (key: any) => string;
}

type BetChoice = "player" | "banker" | "tie" | null;
type ViewMode = "lobby" | "deposit" | "betting" | "dealing" | "result";
type DepositStep = "amount" | "approving" | "transferring" | "done";

// Card suit symbols
const SUIT_SYMBOLS: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const SUIT_COLORS: Record<string, string> = {
  hearts: "text-red-500",
  diamonds: "text-red-500",
  clubs: "text-vintage-ice",
  spades: "text-vintage-ice",
};

// Card images mapping - rank_suit -> filename
const CARD_IMAGES: Record<string, string> = {
  // Aces
  "A_hearts": "ace hearts, anon.png",
  "A_diamonds": "ace diamonds, linda xied.png",
  "A_clubs": "ace clubs, vitalik jumpterin.png",
  "A_spades": "ace spades, jesse.png",
  // 2s
  "2_hearts": "2 hearts, rachel.png",
  "2_diamonds": "2 diamonds, claude.png",
  "2_clubs": "2 clubs, gozaru.png",
  "2_spades": "2 spades, ink.png",
  // 3s
  "3_hearts": "3 hearts, casa.png",
  "3_diamonds": "3 diamonds, groko.png",
  "3_clubs": "3 clubs, rizkybegitu.png",
  "3_spades": "3 spades, thosmur.png",
  // 4s
  "4_hearts": "4 hearts, brainpasta.png",
  "4_diamonds": "4 diamonds, gaypt.png",
  "4_clubs": "4 clubs, dan romero.png",
  "4_spades": "4 spades, morlacos.png",
  // 5s
  "5_hearts": "5 hearts, landmine.png",
  "5_diamonds": "5 diamonds, linux.png",
  "5_clubs": "5 clubs, joonx.png",
  "5_spades": "5 spades, don filthy.png",
  // 6s
  "6_hearts": "6 hearts, pooster.png",
  "6_diamonds": "6 diamonds, john porn.png",
  "6_clubs": "6 clubs, scum.png",
  "6_spades": "6 spades, vlady.png",
  // 7s
  "7_hearts": "7 hearts, smolemaru.png",
  "7_diamonds": "7 diamonds, ventra.png",
  "7_clubs": "7 clubs, bradymck.png",
  "7_spades": "7 spades, shills.png",
  // 8s
  "8_hearts": "8 hearts, betobutter.png",
  "8_diamonds": "8 diamonds, qrcodo.png",
  "8_clubs": "8 clubs, loground.png",
  "8_spades": "8 spades, melted.png",
  // 9s
  "9_hearts": "9 hearts, sartocrates.png",
  "9_diamonds": "9 diamonds, 0xdeployer.png",
  "9_clubs": "9 clubs, lombra jr.png",
  "9_spades": "9 spades, vibe intern.png",
  // 10s
  "10_hearts": "10 hearts, jack the sniper.png",
  "10_diamonds": "10 diamonds, beeper.png",
  "10_clubs": "10 clubs, horsefarts.png",
  "10_spades": "10 spades, jc denton.png",
  // Jacks
  "J_hearts": "jack hearts, zurkchad.png",
  "J_diamonds": "jack diamonds, slaterg.png",
  "J_clubs": "jack clubs, brian armstrong.png",
  "J_spades": "jack spades, nftkid.png",
  // Queens
  "Q_hearts": "queen hearts, antonio.png",
  "Q_diamonds": "queen diamonds, goofy romero.png",
  "Q_clubs": "queen clubs, tukka.png",
  "Q_spades": "queen spades, chilipepper.png",
  // Kings
  "K_hearts": "king hearts, miguel.png",
  "K_diamonds": "king diamonds, naughty santa.png",
  "K_clubs": "king clubs, ye.png",
  "K_spades": "king spades, nico.png",
};

const getCardImageUrl = (rank: string, suit: string) => {
  const key = `${rank}_${suit}`;
  const filename = CARD_IMAGES[key];
  if (filename) {
    return `/images/baccarat/${encodeURIComponent(filename)}`;
  }
  return null;
};

/**
 * BACCARAT MODAL
 * Casino-style baccarat game using betting credits
 */
export function BaccaratModal({
  isOpen,
  onClose,
  address,
  username,
  soundEnabled,
  t,
}: BaccaratModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("lobby");
  const [selectedBet, setSelectedBet] = useState<BetChoice>(null);
  const [betAmount, setBetAmount] = useState(50);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Deposit states
  const [depositStep, setDepositStep] = useState<DepositStep>("amount");
  const [depositAmount, setDepositAmount] = useState<string>("100");
  const [depositError, setDepositError] = useState<string | null>(null);

  // VBMS hooks for deposit
  const { balance: vbmsBalance } = useFarcasterVBMSBalance(address);
  const { approve, isPending: isApproving } = useFarcasterApproveVBMS();
  const { transfer, isPending: isTransferring } = useFarcasterTransferVBMS();

  const DEPOSIT_PRESETS = [100, 500, 1000, 2500];

  // Queries
  const currentTable = useQuery(api.baccarat.getCurrentTable);
  const bettingCredits = useQuery(
    api.bettingCredits.getBettingCredits,
    address ? { address } : "skip"
  );
  const recentHistory = useQuery(api.baccarat.getRecentHistory);

  // Mutations
  const createOrGetTable = useMutation(api.baccarat.createOrGetTable);
  const placeBet = useMutation(api.baccarat.placeBet);
  const dealAndResolve = useMutation(api.baccarat.dealAndResolve);
  const cashOut = useMutation(api.baccarat.cashOut);

  // Update countdown timer
  useEffect(() => {
    if (currentTable?.status === "waiting" && currentTable.timeRemaining > 0) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, currentTable.bettingEndsAt - Date.now());
        setCountdown(Math.ceil(remaining / 1000));

        // Auto-deal when time runs out
        if (remaining <= 0 && currentTable.totalBets > 0) {
          handleDeal();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [currentTable]);

  // Handle entering the game
  const handleEnterGame = async () => {
    try {
      await createOrGetTable({});
      setViewMode("betting");
      if (soundEnabled) AudioManager.buttonClick();
    } catch (err) {
      console.error("Failed to enter game:", err);
    }
  };

  // Handle placing bet
  const handlePlaceBet = async () => {
    if (!selectedBet || !currentTable?.tableId) return;

    setIsPlacingBet(true);
    try {
      await placeBet({
        tableId: currentTable.tableId,
        address,
        username,
        betOn: selectedBet,
        amount: betAmount,
      });
      if (soundEnabled) AudioManager.buttonSuccess();
      setSelectedBet(null);
    } catch (err: any) {
      console.error("Failed to place bet:", err);
      if (soundEnabled) AudioManager.buttonError();
      alert(err.message || "Failed to place bet");
    } finally {
      setIsPlacingBet(false);
    }
  };

  // Handle dealing cards
  const handleDeal = async () => {
    if (!currentTable?.tableId) return;

    setViewMode("dealing");
    try {
      await dealAndResolve({ tableId: currentTable.tableId });
      setShowResult(true);
      setViewMode("result");
      if (soundEnabled) AudioManager.buttonSuccess();
    } catch (err) {
      console.error("Failed to deal:", err);
    }
  };

  // Handle cash out
  const handleCashOut = async () => {
    try {
      const result = await cashOut({ address });
      if (soundEnabled) AudioManager.buttonSuccess();
      alert(`Cashed out ${result.cashedOut} credits!`);
    } catch (err: any) {
      console.error("Failed to cash out:", err);
      alert(err.message || "Failed to cash out");
    }
  };

  // Handle new round
  const handleNewRound = async () => {
    await createOrGetTable({});
    setViewMode("betting");
    setShowResult(false);
    setSelectedBet(null);
  };

  // Handle deposit
  const handleDeposit = async () => {
    if (!address || !depositAmount) return;

    const amountNum = parseFloat(depositAmount);
    if (amountNum < 100) {
      setDepositError("Minimum: 100 VBMS");
      return;
    }
    if (amountNum > 5000) {
      setDepositError("Maximum: 5,000 VBMS");
      return;
    }
    if (parseFloat(vbmsBalance) < amountNum) {
      setDepositError("Insufficient VBMS");
      return;
    }

    setDepositError(null);

    try {
      setDepositStep("approving");
      await approve(CONTRACTS.VBMSBetting as `0x${string}`, parseEther(depositAmount));

      setDepositStep("transferring");
      const txHash = await transfer(CONTRACTS.VBMSBetting as `0x${string}`, parseEther(depositAmount));

      console.log("✅ Deposited to betting:", txHash);

      const response = await fetch('/api/betting/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          amount: depositAmount,
          txHash,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process deposit');
      }

      console.log("🎰 Credits added:", data.creditsAdded);

      setDepositStep("done");
      if (soundEnabled) AudioManager.buttonSuccess();

      setTimeout(() => {
        setViewMode("lobby");
        setDepositStep("amount");
      }, 1500);
    } catch (err: any) {
      console.error("Error depositing:", err);
      setDepositError(err.message || "Failed to deposit");
      setDepositStep("amount");
    }
  };

  // Check if player has bet this round
  const playerBet = currentTable?.bets?.find(
    (b: any) => b.playerAddress === address.toLowerCase()
  );

  // SSR check
  if (typeof window === "undefined") return null;
  if (!isOpen) return null;

  const credits = bettingCredits?.balance || 0;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-vintage-charcoal to-vintage-black rounded-2xl border-2 border-vintage-gold/50 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-vintage-gold/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display font-bold text-vintage-gold flex items-center gap-2">
                🎴 Baccarat
              </h1>
              <p className="text-xs text-vintage-burnt-gold">
                Bet on Player, Banker, or Tie
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-vintage-gold hover:text-vintage-burnt-gold text-xl rounded-full hover:bg-vintage-gold/10"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Credits Display */}
        <div className="mx-4 mt-3 bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-vintage-ice/50 text-xs">Your Credits</p>
              <p className="text-vintage-gold text-xl font-bold">{credits}</p>
            </div>
            {credits > 0 && (
              <button
                onClick={handleCashOut}
                className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 rounded-lg text-green-400 text-xs font-bold transition-all"
              >
                CASH OUT
              </button>
            )}
          </div>
        </div>

        {/* ============ LOBBY VIEW ============ */}
        {viewMode === "lobby" && (
          <div className="p-4">
            {/* How to Play */}
            <div className="bg-vintage-black/30 border border-vintage-gold/20 rounded-lg p-4 mb-4">
              <h3 className="text-vintage-gold font-bold mb-2">How to Play</h3>
              <ul className="text-vintage-ice/70 text-sm space-y-1">
                <li>• Bet on <span className="text-blue-400">Player</span>, <span className="text-red-400">Banker</span>, or <span className="text-green-400">Tie</span></li>
                <li>• Closest to 9 wins</li>
                <li>• Player pays 1:1</li>
                <li>• Banker pays 0.95:1 (5% commission)</li>
                <li>• Tie pays 8:1</li>
              </ul>
            </div>

            {/* Recent Results */}
            {recentHistory && recentHistory.length > 0 && (
              <div className="mb-4">
                <p className="text-vintage-ice/50 text-xs mb-2">Recent Results</p>
                <div className="flex gap-1 flex-wrap">
                  {recentHistory.slice(0, 10).map((h: any, i: number) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                        h.winner === "player"
                          ? "bg-blue-600/30 text-blue-400"
                          : h.winner === "banker"
                          ? "bg-red-600/30 text-red-400"
                          : "bg-green-600/30 text-green-400"
                      }`}
                    >
                      {h.winner === "player" ? "P" : h.winner === "banker" ? "B" : "T"}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enter Button or Deposit */}
            {credits > 0 ? (
              <button
                onClick={handleEnterGame}
                className="w-full py-3 bg-vintage-gold/20 hover:bg-vintage-gold/30 border border-vintage-gold/50 text-vintage-gold font-bold rounded-lg transition-all"
              >
                Enter Table
              </button>
            ) : (
              <button
                onClick={() => setViewMode("deposit")}
                className="w-full py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-400 font-bold rounded-lg transition-all"
              >
                Deposit VBMS to Play
              </button>
            )}
          </div>
        )}

        {/* ============ DEPOSIT VIEW ============ */}
        {viewMode === "deposit" && (
          <div className="p-4">
            <div className="text-center mb-4">
              <h3 className="text-vintage-gold font-bold text-lg">Deposit VBMS</h3>
              <p className="text-vintage-ice/50 text-xs">
                Your VBMS: {parseFloat(vbmsBalance).toFixed(0)}
              </p>
            </div>

            {depositStep === "amount" && (
              <>
                {/* Preset amounts */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {DEPOSIT_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setDepositAmount(amt.toString())}
                      disabled={parseFloat(vbmsBalance) < amt}
                      className={`py-2 rounded-lg border text-sm font-bold transition-all ${
                        depositAmount === amt.toString()
                          ? "bg-green-600/30 border-green-500 text-green-400"
                          : parseFloat(vbmsBalance) < amt
                          ? "bg-vintage-black/20 border-vintage-gold/10 text-vintage-ice/30"
                          : "bg-vintage-black/30 border-vintage-gold/20 text-vintage-ice hover:border-green-500/50"
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>

                {/* Custom input */}
                <div className="mb-4">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Custom amount"
                    className="w-full px-4 py-2 bg-vintage-black/50 border border-vintage-gold/30 rounded-lg text-vintage-ice focus:border-green-500 focus:outline-none"
                  />
                </div>

                {depositError && (
                  <p className="text-red-400 text-sm text-center mb-4">{depositError}</p>
                )}

                <button
                  onClick={handleDeposit}
                  disabled={!depositAmount || parseFloat(depositAmount) < 100}
                  className="w-full py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/50 text-green-400 font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  Deposit {depositAmount} VBMS
                </button>

                <button
                  onClick={() => setViewMode("lobby")}
                  className="w-full py-2 mt-2 text-vintage-ice/50 hover:text-vintage-ice text-sm transition-all"
                >
                  ← Back
                </button>
              </>
            )}

            {depositStep === "approving" && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-vintage-gold">Approving...</p>
                <p className="text-vintage-ice/50 text-xs">Confirm in wallet</p>
              </div>
            )}

            {depositStep === "transferring" && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-vintage-gold">Depositing...</p>
                <p className="text-vintage-ice/50 text-xs">Confirm transfer</p>
              </div>
            )}

            {depositStep === "done" && (
              <div className="text-center py-8">
                <p className="text-4xl mb-4">✅</p>
                <p className="text-green-400 font-bold">Deposit Complete!</p>
                <p className="text-vintage-ice/50 text-xs">+{depositAmount} credits</p>
              </div>
            )}
          </div>
        )}

        {/* ============ BETTING VIEW ============ */}
        {viewMode === "betting" && currentTable && (
          <div className="p-4">
            {/* Countdown */}
            <div className="text-center mb-4">
              <p className="text-vintage-ice/50 text-xs">Time to bet</p>
              <p className={`text-3xl font-bold ${countdown <= 5 ? "text-red-400 animate-pulse" : "text-vintage-gold"}`}>
                {countdown}s
              </p>
            </div>

            {/* Betting Options */}
            {!playerBet ? (
              <>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {/* Player Bet */}
                  <button
                    onClick={() => setSelectedBet("player")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedBet === "player"
                        ? "bg-blue-600/30 border-blue-500"
                        : "bg-vintage-black/30 border-vintage-gold/20 hover:border-blue-500/50"
                    }`}
                  >
                    <p className="text-blue-400 font-bold text-lg">PLAYER</p>
                    <p className="text-vintage-ice/50 text-xs">1:1</p>
                  </button>

                  {/* Tie Bet */}
                  <button
                    onClick={() => setSelectedBet("tie")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedBet === "tie"
                        ? "bg-green-600/30 border-green-500"
                        : "bg-vintage-black/30 border-vintage-gold/20 hover:border-green-500/50"
                    }`}
                  >
                    <p className="text-green-400 font-bold text-lg">TIE</p>
                    <p className="text-vintage-ice/50 text-xs">8:1</p>
                  </button>

                  {/* Banker Bet */}
                  <button
                    onClick={() => setSelectedBet("banker")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedBet === "banker"
                        ? "bg-red-600/30 border-red-500"
                        : "bg-vintage-black/30 border-vintage-gold/20 hover:border-red-500/50"
                    }`}
                  >
                    <p className="text-red-400 font-bold text-lg">BANKER</p>
                    <p className="text-vintage-ice/50 text-xs">0.95:1</p>
                  </button>
                </div>

                {/* Bet Amount */}
                {selectedBet && (
                  <div className="mb-4">
                    <p className="text-vintage-ice/50 text-xs mb-2">Bet Amount</p>
                    <div className="flex gap-2">
                      {[10, 50, 100, 500].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setBetAmount(amt)}
                          disabled={credits < amt}
                          className={`flex-1 py-2 rounded-lg border transition-all ${
                            betAmount === amt
                              ? "bg-vintage-gold/30 border-vintage-gold text-vintage-gold"
                              : credits < amt
                              ? "bg-vintage-black/20 border-vintage-gold/10 text-vintage-ice/30"
                              : "bg-vintage-black/30 border-vintage-gold/20 text-vintage-ice hover:border-vintage-gold/40"
                          }`}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Place Bet Button */}
                {selectedBet && (
                  <button
                    onClick={handlePlaceBet}
                    disabled={isPlacingBet || credits < betAmount}
                    className="w-full py-3 bg-vintage-gold/20 hover:bg-vintage-gold/30 border border-vintage-gold/50 text-vintage-gold font-bold rounded-lg transition-all disabled:opacity-50"
                  >
                    {isPlacingBet ? "Placing..." : `Bet ${betAmount} on ${selectedBet.toUpperCase()}`}
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-vintage-gold font-bold">Bet Placed!</p>
                <p className="text-vintage-ice/50 text-sm">
                  {playerBet.amount} on {playerBet.betOn.toUpperCase()}
                </p>
                <p className="text-vintage-ice/30 text-xs mt-2">
                  Waiting for cards...
                </p>
              </div>
            )}

            {/* Current Bets Summary */}
            <div className="mt-4 pt-3 border-t border-vintage-gold/20">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-blue-400">{currentTable.playerBets || 0}</p>
                  <p className="text-vintage-ice/30">Player</p>
                </div>
                <div>
                  <p className="text-green-400">{currentTable.tieBets || 0}</p>
                  <p className="text-vintage-ice/30">Tie</p>
                </div>
                <div>
                  <p className="text-red-400">{currentTable.bankerBets || 0}</p>
                  <p className="text-vintage-ice/30">Banker</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ DEALING VIEW ============ */}
        {viewMode === "dealing" && (
          <div className="p-8 text-center">
            <div className="animate-pulse">
              <p className="text-vintage-gold text-xl font-bold mb-2">Dealing Cards...</p>
              <div className="flex justify-center gap-4">
                <div className="w-12 h-16 bg-vintage-gold/20 rounded-lg animate-bounce"></div>
                <div className="w-12 h-16 bg-vintage-gold/20 rounded-lg animate-bounce delay-100"></div>
              </div>
            </div>
          </div>
        )}

        {/* ============ RESULT VIEW ============ */}
        {viewMode === "result" && currentTable && (
          <div className="p-4">
            {/* Winner Banner */}
            <div className={`text-center py-4 rounded-lg mb-4 ${
              currentTable.winner === "player"
                ? "bg-blue-600/20 border border-blue-500/50"
                : currentTable.winner === "banker"
                ? "bg-red-600/20 border border-red-500/50"
                : "bg-green-600/20 border border-green-500/50"
            }`}>
              <p className="text-vintage-ice/50 text-xs">Winner</p>
              <p className={`text-2xl font-bold ${
                currentTable.winner === "player"
                  ? "text-blue-400"
                  : currentTable.winner === "banker"
                  ? "text-red-400"
                  : "text-green-400"
              }`}>
                {currentTable.winner?.toUpperCase()}
              </p>
            </div>

            {/* Cards Display */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Player Cards */}
              <div className="text-center">
                <p className="text-blue-400 font-bold mb-2">Player ({currentTable.playerScore})</p>
                <div className="flex justify-center gap-1">
                  {currentTable.playerCards?.map((card: any, i: number) => {
                    const imgUrl = getCardImageUrl(card.rank, card.suit);
                    return (
                      <div
                        key={i}
                        className="w-16 h-22 rounded-lg overflow-hidden shadow-lg border border-vintage-gold/30"
                      >
                        {imgUrl ? (
                          <img src={imgUrl} alt={`${card.rank} ${card.suit}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white flex flex-col items-center justify-center">
                            <span className={`text-sm font-bold ${SUIT_COLORS[card.suit]}`}>{card.rank}</span>
                            <span className={`text-lg ${SUIT_COLORS[card.suit]}`}>{SUIT_SYMBOLS[card.suit]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Banker Cards */}
              <div className="text-center">
                <p className="text-red-400 font-bold mb-2">Banker ({currentTable.bankerScore})</p>
                <div className="flex justify-center gap-1">
                  {currentTable.bankerCards?.map((card: any, i: number) => {
                    const imgUrl = getCardImageUrl(card.rank, card.suit);
                    return (
                      <div
                        key={i}
                        className="w-16 h-22 rounded-lg overflow-hidden shadow-lg border border-vintage-gold/30"
                      >
                        {imgUrl ? (
                          <img src={imgUrl} alt={`${card.rank} ${card.suit}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white flex flex-col items-center justify-center">
                            <span className={`text-sm font-bold ${SUIT_COLORS[card.suit]}`}>{card.rank}</span>
                            <span className={`text-lg ${SUIT_COLORS[card.suit]}`}>{SUIT_SYMBOLS[card.suit]}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Player Result */}
            {playerBet && (
              <div className={`text-center py-3 rounded-lg mb-4 ${
                playerBet.status === "won"
                  ? "bg-green-600/20 border border-green-500/50"
                  : playerBet.status === "lost"
                  ? "bg-red-600/20 border border-red-500/50"
                  : "bg-vintage-gold/20 border border-vintage-gold/50"
              }`}>
                {playerBet.status === "won" && (
                  <>
                    <p className="text-green-400 font-bold">YOU WON!</p>
                    <p className="text-vintage-ice/70">+{playerBet.payout} credits</p>
                  </>
                )}
                {playerBet.status === "lost" && (
                  <>
                    <p className="text-red-400 font-bold">YOU LOST</p>
                    <p className="text-vintage-ice/70">-{playerBet.amount} credits</p>
                  </>
                )}
                {playerBet.status === "push" && (
                  <>
                    <p className="text-vintage-gold font-bold">PUSH</p>
                    <p className="text-vintage-ice/70">Bet returned</p>
                  </>
                )}
              </div>
            )}

            {/* Play Again Button */}
            <button
              onClick={handleNewRound}
              className="w-full py-3 bg-vintage-gold/20 hover:bg-vintage-gold/30 border border-vintage-gold/50 text-vintage-gold font-bold rounded-lg transition-all"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
