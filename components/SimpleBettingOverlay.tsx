"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isCollectionBuffed, BUFF_CONFIG } from "@/lib/dailyBuff";

interface SimpleBettingOverlayProps {
  roomId: string;
  currentRound: number;
  player1Address: string;
  player1Username: string;
  player2Address: string;
  player2Username: string;
  spectatorAddress: string;
  cpuCollection?: string;
  onBetPlaced?: () => void;
}

/**
 * SIMPLE BETTING OVERLAY
 *
 * Ultra-simple UI for spectators to bet on each round
 * - Just tap the card to bet
 * - Shows current round and odds
 * - Instant visual feedback
 * - ALL IN option on final round (round 7)!
 */
export function SimpleBettingOverlay({
  roomId,
  currentRound,
  player1Address,
  player1Username,
  player2Address,
  player2Username,
  spectatorAddress,
  cpuCollection,
  onBetPlaced,
}: SimpleBettingOverlayProps) {
  const [isBetting, setIsBetting] = useState(false);
  const [isAllIn, setIsAllIn] = useState(false);

  // Get betting credits balance
  const credits = useQuery(
    api.bettingCredits.getBettingCredits,
    spectatorAddress ? { address: spectatorAddress } : "skip"
  );

  // Check if already bet on this round
  const existingBet = useQuery(
    api.roundBetting.getRoundBet,
    roomId && spectatorAddress ? {
      roomId,
      roundNumber: currentRound,
      bettor: spectatorAddress,
    } : "skip"
  );

  // Place bet mutation
  const placeBet = useMutation(api.roundBetting.placeBetOnRound);

  // Check if this is the final round (round 7)
  const isFinalRound = currentRound === 7;

  // Check if collection is buffed today
  const isBuffed = cpuCollection ? isCollectionBuffed(cpuCollection) : false;
  const buffBonus = isBuffed ? BUFF_CONFIG.oddsBonus : 0;

  // Get odds for current round - HIGHER for final round!
  const getOdds = (round: number, allIn: boolean = false, isTie: boolean = false) => {
    let baseOdds: number;
    if (isTie) {
      baseOdds = 3.5;
    } else if (round === 7 && allIn) {
      baseOdds = 3.0;
    } else if (round <= 3) {
      baseOdds = 1.5;
    } else if (round <= 5) {
      baseOdds = 1.8;
    } else {
      baseOdds = 2.0;
    }
    // Always add buff bonus at the end (sovereign)
    return baseOdds + buffBonus;
  };

  const odds = getOdds(currentRound, isAllIn);
  const tieOdds = getOdds(currentRound, false, true);

  // Calculate bet amount - 15% of current balance, ALL IN uses entire balance!
  const normalBetAmount = Math.floor((credits?.balance || 100) * 0.15);
  const allInAmount = credits?.balance || 0;
  const betAmount = isAllIn ? allInAmount : normalBetAmount;

  // Get short display name for buttons (removes common prefixes like "MECHA ")
  const getShortName = (fullName: string) => {
    // Remove common CPU prefixes to show distinguishing part
    const prefixes = ["MECHA ", "CPU ", "BOT "];
    for (const prefix of prefixes) {
      if (fullName.toUpperCase().startsWith(prefix)) {
        return fullName.substring(prefix.length);
      }
    }
    return fullName;
  };

  // Get display name for bet
  const getBetDisplayName = (betOn: string) => {
    if (betOn.toLowerCase() === "tie") return "TIE";
    if (betOn === player1Address) return player1Username;
    if (betOn === player2Address) return player2Username;
    return "Unknown";
  };

  // Get odds for existing bet display
  const getExistingBetOdds = () => {
    if (existingBet?.betOn.toLowerCase() === "tie") return tieOdds;
    return odds;
  };

  // Handle bet
  const handleBet = async (playerAddress: string, playerName: string) => {
    if (!spectatorAddress || isBetting || existingBet) return;

    if (!credits || credits.balance < betAmount) {
      alert(`Insufficient credits! You need ${betAmount} credits.`);
      return;
    }

    setIsBetting(true);
    try {
      await placeBet({
        address: spectatorAddress,
        roomId,
        roundNumber: currentRound,
        betOn: playerAddress,
        amount: betAmount,
        isAllIn: isAllIn && isFinalRound, // Only send isAllIn if it's the final round
      });

      if (onBetPlaced) onBetPlaced();
    } catch (err: any) {
      console.error("Failed to place bet:", err);
      alert(err.message || "Failed to place bet");
    } finally {
      setIsBetting(false);
    }
  };

  // Don't show if already bet on this round - show compact confirmation
  if (existingBet) {
    const displayOdds = getExistingBetOdds();
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] bg-vintage-gold/80 backdrop-blur-sm border border-vintage-gold rounded-lg px-2 py-1">
        <p className="text-vintage-black text-[10px] font-bold text-center">
          BET: {existingBet.amount}c on {getBetDisplayName(existingBet.betOn)} (+{Math.floor(existingBet.amount * displayOdds)}c)
        </p>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] backdrop-blur-md rounded-lg p-2 shadow-xl w-72 sm:w-96 transition-all ${
      isFinalRound && isAllIn
        ? 'bg-gradient-to-br from-vintage-charcoal to-vintage-black border-2 border-vintage-gold animate-pulse'
        : isFinalRound
        ? 'bg-gradient-to-br from-vintage-charcoal to-vintage-black border-2 border-vintage-burnt-gold'
        : 'bg-vintage-charcoal/95 border border-vintage-gold/50'
    }`}>
      {/* Header with ALL IN toggle for final round */}
      <div className="text-center mb-2">
        {isFinalRound ? (
          <div className="space-y-1">
            <p className="text-vintage-gold font-bold text-xs animate-pulse">FINAL ROUND</p>
            <button
              onClick={() => setIsAllIn(!isAllIn)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                isAllIn
                  ? 'bg-vintage-gold text-vintage-black animate-pulse shadow-lg shadow-vintage-gold/50'
                  : 'bg-vintage-black text-vintage-burnt-gold hover:bg-vintage-gold/20 border border-vintage-gold/50'
              }`}
            >
              {isAllIn ? 'ALL IN ACTIVE (3x)' : 'Click for ALL IN (3x)'}
            </button>
            <p className={`font-bold text-sm ${isAllIn ? 'text-vintage-gold' : 'text-vintage-burnt-gold'}`}>
              {odds}x - {credits?.balance || 0}
            </p>
          </div>
        ) : (
          <p className="text-vintage-gold font-bold text-sm">
            {odds}x - {credits?.balance || 0}
          </p>
        )}
      </div>

      {/* ALL IN warning */}
      {isFinalRound && isAllIn && (
        <div className="mb-2 bg-vintage-gold/20 border border-vintage-gold/50 rounded px-2 py-1">
          <p className="text-vintage-gold text-[10px] text-center font-bold">
            ALL IN: Betting {allInAmount} credits!
          </p>
        </div>
      )}

      {/* Compact Player Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleBet(player1Address, player1Username)}
          disabled={isBetting || !credits || credits.balance < betAmount}
          className={`rounded-lg py-2 px-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isFinalRound && isAllIn
              ? 'bg-vintage-gold/30 hover:bg-vintage-gold/50 border-2 border-vintage-gold'
              : 'bg-vintage-gold/20 hover:bg-vintage-gold/40 border border-vintage-gold/50'
          }`}
        >
          <p className="text-vintage-gold font-bold text-xs truncate">{getShortName(player1Username)}</p>
          <p className={`text-[10px] ${isAllIn ? 'text-vintage-gold font-bold' : 'text-vintage-burnt-gold'}`}>
            +{Math.floor(betAmount * odds)}c
          </p>
        </button>

        {/* TIE BUTTON */}
        <button
          onClick={() => handleBet("tie", "TIE")}
          disabled={isBetting || !credits || credits.balance < betAmount}
          className="rounded-lg py-2 px-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-vintage-black/60 hover:bg-vintage-black/80 border border-vintage-ice/30"
        >
          <p className="text-vintage-ice font-bold text-xs">TIE</p>
          <p className="text-[10px] text-vintage-ice/70">
            {tieOdds}x (+{Math.floor(betAmount * tieOdds)}c)
          </p>
        </button>

        <button
          onClick={() => handleBet(player2Address, player2Username)}
          disabled={isBetting || !credits || credits.balance < betAmount}
          className={`rounded-lg py-2 px-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isFinalRound && isAllIn
              ? 'bg-vintage-burnt-gold/30 hover:bg-vintage-burnt-gold/50 border-2 border-vintage-burnt-gold'
              : 'bg-vintage-burnt-gold/20 hover:bg-vintage-burnt-gold/40 border border-vintage-burnt-gold/50'
          }`}
        >
          <p className="text-vintage-burnt-gold font-bold text-xs truncate">{getShortName(player2Username)}</p>
          <p className={`text-[10px] ${isAllIn ? 'text-vintage-burnt-gold font-bold' : 'text-vintage-burnt-gold/70'}`}>
            +{Math.floor(betAmount * odds)}c
          </p>
        </button>
      </div>

      {/* Loading state */}
      {isBetting && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="text-vintage-gold text-sm font-bold">{isAllIn ? 'ALL IN...' : 'Betting...'}</div>
        </div>
      )}
    </div>
  );
}
