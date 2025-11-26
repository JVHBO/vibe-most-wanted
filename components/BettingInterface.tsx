"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";

interface BettingInterfaceProps {
  roomId: string;
  player1Address: string;
  player1Username: string;
  player2Address: string;
  player2Username: string;
  isGameStarted: boolean;
  isGameOver: boolean;
}

export function BettingInterface({
  roomId,
  player1Address,
  player1Username,
  player2Address,
  player2Username,
  isGameStarted,
  isGameOver,
}: BettingInterfaceProps) {
  const { address } = useAccount();
  const [betAmount, setBetAmount] = useState<string>("10");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isBetting, setIsBetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Preset bet amounts
  const PRESETS = [10, 25, 50, 100, 250];

  // Get betting credits balance
  const credits = useQuery(
    api.bettingCredits.getBettingCredits,
    address ? { address } : "skip"
  );

  // Get room bets
  const roomBets = useQuery(
    api.bettingCredits.getRoomBets,
    { roomId }
  );

  // Place bet mutation
  const placeBet = useMutation(api.bettingCredits.placeBetWithCredits);

  // Calculate betting stats - memoized to prevent recalculation on every render
  const { betsOnPlayer1, betsOnPlayer2, totalOnPlayer1, totalOnPlayer2 } = useMemo(() => {
    const p1Bets = roomBets?.filter((b: any) => b.betOn.toLowerCase() === player1Address.toLowerCase()) || [];
    const p2Bets = roomBets?.filter((b: any) => b.betOn.toLowerCase() === player2Address.toLowerCase()) || [];
    return {
      betsOnPlayer1: p1Bets,
      betsOnPlayer2: p2Bets,
      totalOnPlayer1: p1Bets.reduce((sum: number, b: any) => sum + b.amount, 0),
      totalOnPlayer2: p2Bets.reduce((sum: number, b: any) => sum + b.amount, 0),
    };
  }, [roomBets, player1Address, player2Address]);

  // Check if user already bet - memoized
  const userBet = useMemo(() =>
    roomBets?.find((b: any) => b.bettor.toLowerCase() === address?.toLowerCase()),
    [roomBets, address]
  );

  // Handle place bet
  const handlePlaceBet = async () => {
    if (!address || !selectedPlayer || !betAmount) return;

    const amount = parseFloat(betAmount);
    if (amount <= 0 || isNaN(amount)) {
      setError("Invalid bet amount");
      return;
    }

    if (!credits || credits.balance < amount) {
      setError("Insufficient betting credits");
      return;
    }

    setIsBetting(true);
    setError(null);
    setSuccess(null);

    try {
      await placeBet({
        address,
        roomId,
        betOn: selectedPlayer,
        amount,
      });

      setSuccess(`✅ Bet placed: ${amount} credits on ${selectedPlayer === player1Address ? player1Username : player2Username}!`);
      setBetAmount("10");
      setSelectedPlayer(null);
    } catch (err: any) {
      console.error("Error placing bet:", err);
      setError(err.message || "Failed to place bet");
    } finally {
      setIsBetting(false);
    }
  };

  // Disable betting if game already started or over
  const bettingDisabled = isGameStarted || isGameOver || !!userBet;

  return (
    <div className="bg-vintage-charcoal/90 backdrop-blur-lg rounded-xl border-2 border-purple-500/50 p-6 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-display font-bold text-purple-400 mb-2">
          🎰 Spectator Betting
        </h2>
        <p className="text-vintage-ice/70 text-sm">
          {bettingDisabled
            ? userBet
              ? `You bet ${userBet.amount} credits on ${userBet.betOn === player1Address ? player1Username : player2Username}`
              : "Betting is closed"
            : "Pool system: Winners split 95% of total bets! TESTVBMS → Inbox"}
        </p>
      </div>

      {/* Credits Balance */}
      <div className="bg-vintage-black/60 rounded-lg p-4 mb-6">
        <p className="text-vintage-ice/70 text-sm mb-1">Your Betting Credits</p>
        <p className="text-3xl font-display font-bold text-purple-400">
          {credits?.balance || 0} Credits
        </p>
      </div>

      {/* Player Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Player 1 */}
        <button
          onClick={() => !bettingDisabled && setSelectedPlayer(player1Address)}
          disabled={bettingDisabled}
          className={`relative p-6 rounded-xl border-2 transition-all ${
            selectedPlayer === player1Address
              ? "border-purple-500 bg-purple-500/20 scale-105"
              : "border-vintage-gold/30 bg-vintage-charcoal/60 hover:border-purple-500/50"
          } ${bettingDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="text-center mb-3">
            <div className="text-4xl mb-2">🎮</div>
            <p className="text-vintage-gold font-display font-bold text-lg">
              {player1Username}
            </p>
          </div>
          <div className="bg-vintage-black/40 rounded-lg p-3">
            <p className="text-vintage-ice/70 text-xs mb-1">Total Bets</p>
            <p className="text-purple-400 font-bold text-xl">{totalOnPlayer1}</p>
            <p className="text-vintage-ice/50 text-xs">{betsOnPlayer1.length} bettors</p>
          </div>
        </button>

        {/* Player 2 */}
        <button
          onClick={() => !bettingDisabled && setSelectedPlayer(player2Address)}
          disabled={bettingDisabled}
          className={`relative p-6 rounded-xl border-2 transition-all ${
            selectedPlayer === player2Address
              ? "border-pink-500 bg-pink-500/20 scale-105"
              : "border-vintage-gold/30 bg-vintage-charcoal/60 hover:border-pink-500/50"
          } ${bettingDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="text-center mb-3">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-vintage-gold font-display font-bold text-lg">
              {player2Username}
            </p>
          </div>
          <div className="bg-vintage-black/40 rounded-lg p-3">
            <p className="text-vintage-ice/70 text-xs mb-1">Total Bets</p>
            <p className="text-pink-400 font-bold text-xl">{totalOnPlayer2}</p>
            <p className="text-vintage-ice/50 text-xs">{betsOnPlayer2.length} bettors</p>
          </div>
        </button>
      </div>

      {!bettingDisabled && (
        <>
          {/* Bet Amount Input */}
          <div className="mb-4">
            <label className="text-vintage-ice text-sm font-bold mb-2 block">
              Bet Amount
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full bg-vintage-black/60 border-2 border-vintage-gold/30 focus:border-purple-500 rounded-lg px-4 py-3 text-vintage-ice text-xl font-display outline-none"
              placeholder="10"
              min="1"
              max={credits?.balance || 0}
            />
          </div>

          {/* Presets */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setBetAmount(preset.toString())}
                disabled={!credits || credits.balance < preset}
                className="bg-vintage-charcoal hover:bg-purple-500/20 border border-vintage-gold/30 hover:border-purple-500 rounded-lg py-2 text-vintage-gold font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Info */}
          {selectedPlayer && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
              <p className="text-blue-400 text-sm mb-2">
                💰 Betting on <span className="font-bold">{selectedPlayer === player1Address ? player1Username : player2Username}</span>
              </p>
              <p className="text-vintage-ice/70 text-xs">
                🏆 Pool-based system: Winners split 95% of total bets proportionally
              </p>
              <p className="text-vintage-ice/70 text-xs">
                📬 Winnings sent to inbox as TESTVBMS (claim anytime!)
              </p>
            </div>
          )}

          {/* Error/Success */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={!selectedPlayer || !betAmount || parseFloat(betAmount) <= 0 || isBetting}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-display font-bold text-xl transition-all disabled:cursor-not-allowed shadow-lg"
          >
            {isBetting ? "Placing Bet..." : "Place Bet 🎰"}
          </button>
        </>
      )}

      {/* Show user's bet if already placed */}
      {userBet && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mt-4">
          <p className="text-purple-400 text-center mb-2">
            🎲 Your bet: <span className="font-bold">{userBet.amount} credits</span> on{" "}
            <span className="font-bold">{userBet.betOn === player1Address ? player1Username : player2Username}</span>
          </p>
          <p className="text-vintage-ice/70 text-xs text-center">
            📬 If you win, TESTVBMS will be sent to your inbox!
          </p>
          <p className="text-vintage-ice/70 text-xs text-center mt-1">
            🏆 Your share = ({userBet.amount} / total on winner) × 95% of pool
          </p>
        </div>
      )}
    </div>
  );
}
