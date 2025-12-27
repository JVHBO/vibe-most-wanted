/**
 * ROUND-BY-ROUND BETTING SYSTEM
 *
 * Spectators can bet on each poker round (1-7) with instant payouts!
 * - Deposit VBMS → Get betting credits
 * - Bet on each round → Win or lose instantly
 * - Credits accumulate during game
 * - Convert remaining credits to TESTVBMS at game end
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Odds configuration (can be adjusted)
const ODDS_CONFIG = {
  rounds1to3: 1.5, // Early rounds: 1.5x
  rounds4to5: 1.8, // Mid rounds: 1.8x
  rounds6to7: 2.0, // Final rounds: 2.0x
  allInRound7: 3.0, // ALL IN on final round: 3.0x (high risk, high reward!)
  tie: 3.5, // Tie bet: 3.5x (higher since it's harder to predict)
};

// Daily Buff System - One collection gets buffed odds each day
const ARENA_COLLECTIONS = [
  "gmvbrs", "vibe", "viberuto", "meowverse",
  "poorlydrawnpepes", "teampothead", "tarot", "americanfootball",
  "vibefid", "baseballcabal", "vibefx", "historyofcomputer",
] as const;

const BUFF_BONUS = 0.5; // +0.5x to odds when buffed

function getUTCDayNumber(): number {
  const now = new Date();
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor(utcMidnight / (1000 * 60 * 60 * 24));
}

function getDailyBuffedCollection(): string {
  const dayNumber = getUTCDayNumber();
  const index = dayNumber % ARENA_COLLECTIONS.length;
  return ARENA_COLLECTIONS[index];
}

function isCollectionBuffed(collectionSlug: string): boolean {
  return collectionSlug.toLowerCase() === getDailyBuffedCollection().toLowerCase();
}

/**
 * Get odds for a specific round and bet type
 * Applies buff bonus if collection is today's daily buff
 * ALL IN on round 7 gets special 3x odds!
 */
function getOddsForRound(roundNumber: number, isTieBet: boolean = false, collectionSlug?: string, isAllIn: boolean = false): number {
  let baseOdds: number;

  // ALL IN on final round gets special 3x odds!
  if (roundNumber === 7 && isAllIn) {
    baseOdds = ODDS_CONFIG.allInRound7;
  } else if (isTieBet) {
    baseOdds = ODDS_CONFIG.tie;
  } else if (roundNumber <= 3) {
    baseOdds = ODDS_CONFIG.rounds1to3;
  } else if (roundNumber <= 5) {
    baseOdds = ODDS_CONFIG.rounds4to5;
  } else {
    baseOdds = ODDS_CONFIG.rounds6to7;
  }

  // Apply buff bonus if collection is today's buffed collection
  if (collectionSlug && isCollectionBuffed(collectionSlug)) {
    baseOdds += BUFF_BONUS;
  }

  return baseOdds;
}

/**
 * GET ROUND BET FOR A SPECIFIC USER
 * Check if user already bet on this round
 */
export const getRoundBet = query({
  args: {
    roomId: v.string(),
    roundNumber: v.number(),
    bettor: v.string(),
  },
  handler: async (ctx, args) => {
    const { roomId, roundNumber, bettor } = args;
    const normalizedBettor = bettor.toLowerCase();

    const bet = await ctx.db
      .query("roundBets")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", roomId).eq("roundNumber", roundNumber)
      )
      .filter((q) => q.eq(q.field("bettor"), normalizedBettor))
      .first();

    return bet;
  },
});

/**
 * GET ALL BETS FOR A SPECTATOR IN A ROOM
 * Used to calculate net gains when game ends
 */
export const getSpectatorBetsForRoom = query({
  args: {
    roomId: v.string(),
    spectatorAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const { roomId, spectatorAddress } = args;
    const normalizedAddress = spectatorAddress.toLowerCase();

    const bets = await ctx.db
      .query("roundBets")
      .withIndex("by_room_round", (q) => q.eq("roomId", roomId))
      .filter((q) => q.eq(q.field("bettor"), normalizedAddress))
      .collect();

    return bets;
  },
});

/**
 * PLACE BET ON A SPECIFIC ROUND
 * Spectator bets credits on who will win this round OR on a tie
 */
export const placeBetOnRound = mutation({
  args: {
    address: v.string(),
    roomId: v.string(),
    roundNumber: v.number(),
    betOn: v.string(), // Address of player to bet on OR "tie" for draw bet
    amount: v.number(),
    isAllIn: v.optional(v.boolean()), // ALL IN on final round for 3x odds!
  },
  handler: async (ctx, args) => {
    const { address, roomId, roundNumber, betOn, amount, isAllIn = false } = args;
    const normalizedAddress = address.toLowerCase();
    const normalizedBetOn = betOn.toLowerCase();

    // Validate round number
    if (roundNumber < 1 || roundNumber > 7) {
      throw new Error("Invalid round number (must be 1-7)");
    }

    // Check if round already has bet from this user
    const existingBet = await ctx.db
      .query("roundBets")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", roomId).eq("roundNumber", roundNumber)
      )
      .filter((q) => q.eq(q.field("bettor"), normalizedAddress))
      .first();

    if (existingBet) {
      throw new Error("You already bet on this round");
    }

    // Check betting credits balance
    const credits = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!credits || credits.balance < amount) {
      throw new Error("Insufficient betting credits");
    }

    // Deduct credits
    await ctx.db.patch(credits._id, {
      balance: credits.balance - amount,
    });

    // Check if this is a tie bet
    const isTieBet = normalizedBetOn === "tie";

    // Get room info for collection (buff check)
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
      .first();

    const collectionSlug = room?.cpuCollection || undefined;

    // Get odds for this round (with buff bonus if applicable, and ALL IN bonus on round 7)
    const odds = getOddsForRound(roundNumber, isTieBet, collectionSlug, isAllIn);
    const isBuffed = collectionSlug ? isCollectionBuffed(collectionSlug) : false;

    // Create bet
    await ctx.db.insert("roundBets", {
      roomId,
      roundNumber,
      bettor: normalizedAddress,
      betOn: normalizedBetOn,
      amount,
      odds,
      status: "active",
      timestamp: Date.now(),
    });

    console.log(`🎰 Round bet placed: ${normalizedAddress} bet ${amount} credits on round ${roundNumber} at ${odds}x odds [roomId: ${roomId}]`);

    // Check if this is a CPU vs CPU room - if so, shorten betting window
    if (room?.isCpuVsCpu) {
      // Call shortenBettingWindow mutation
      await ctx.runMutation(internal.pokerBattle.shortenBettingWindow, { roomId });
    }

    // Get bettor's username for chat message
    const bettorProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    // Get player's username that was bet on or "Tie"
    let betOnUsername = "Player";
    if (isTieBet) {
      betOnUsername = "Tie/Draw";
    } else {
      const betOnProfile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", normalizedBetOn))
        .first();
      betOnUsername = betOnProfile?.username || "Player";
    }

    // Send chat message visible to everyone
    await ctx.db.insert("pokerChatMessages", {
      roomId,
      sender: normalizedAddress,
      senderUsername: bettorProfile?.username || "Spectator",
      message: `🎰 Bet ${amount} credits on ${betOnUsername} at ${odds}x odds${isBuffed ? " 🔥" : ""} for Round ${roundNumber}`,
      timestamp: Date.now(),
      type: "text" as const,
    });

    return {
      success: true,
      newBalance: credits.balance - amount,
      odds,
      potentialWin: Math.floor(amount * odds),
    };
  },
});

/**
 * RESOLVE ROUND BETS
 * Called when a poker round ends - pays winners instantly!
 *
 * OPTIMIZATION: Added duplicate call protection to prevent write conflicts
 */
export const resolveRoundBets = mutation({
  args: {
    roomId: v.string(),
    roundNumber: v.number(),
    winnerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const { roomId, roundNumber, winnerAddress } = args;
    const normalizedWinner = winnerAddress.toLowerCase();

    console.log(`🎲 Resolving round ${roundNumber} bets for room ${roomId}, winner: ${normalizedWinner}`);

    // Get all active bets for this round
    const bets = await ctx.db
      .query("roundBets")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", roomId).eq("roundNumber", roundNumber)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // OPTIMIZATION: If no active bets, return early (also handles duplicate calls)
    if (bets.length === 0) {
      console.log(`No active bets for round ${roundNumber} (may be already resolved)`);
      return {
        success: true,
        betsResolved: 0,
        winners: 0,
        losers: 0,
        alreadyResolved: true,
      };
    }

    let winnersCount = 0;
    let losersCount = 0;

    // Check if the round was a tie (no winner)
    const isTieRound = !normalizedWinner || normalizedWinner === "tie";

    // Process each bet
    for (const bet of bets) {
      const isTieBet = bet.betOn.toLowerCase() === "tie";
      const isWinner = isTieRound ? isTieBet : (bet.betOn.toLowerCase() === normalizedWinner);

      // Get bettor's profile for username
      const bettorProfile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", bet.bettor))
        .first();

      const bettorUsername = bettorProfile?.username || "Spectator";

      if (isWinner) {
        // WINNER: Calculate payout and add credits back
        const payout = Math.floor(bet.amount * bet.odds);
        winnersCount++;

        // Get bettor's credits
        const credits = await ctx.db
          .query("bettingCredits")
          .withIndex("by_address", (q) => q.eq("address", bet.bettor))
          .first();

        if (credits) {
          // Add payout to balance
          await ctx.db.patch(credits._id, {
            balance: credits.balance + payout,
          });

          console.log(`✅ Winner: ${bet.bettor} won ${payout} credits (${bet.amount} × ${bet.odds})`);
        }

        // Update bet status
        await ctx.db.patch(bet._id, {
          status: "won",
          payout,
          resolvedAt: Date.now(),
        });

        // Log transaction
        await ctx.db.insert("bettingTransactions", {
          address: bet.bettor,
          type: "win",
          amount: payout,
          roomId,
          timestamp: Date.now(),
        });

        // Send chat message for winner (visible to everyone)
        await ctx.db.insert("pokerChatMessages", {
          roomId,
          sender: bet.bettor,
          senderUsername: bettorUsername,
          message: `🎉 Won ${payout} credits! (${bet.amount} × ${bet.odds}x)`,
          timestamp: Date.now(),
          type: "text" as const,
        });
      } else {
        // LOSER: No payout, credits already deducted
        losersCount++;

        // Update bet status
        await ctx.db.patch(bet._id, {
          status: "lost",
          resolvedAt: Date.now(),
        });

        console.log(`❌ Loser: ${bet.bettor} lost ${bet.amount} credits`);

        // Log transaction
        await ctx.db.insert("bettingTransactions", {
          address: bet.bettor,
          type: "loss",
          amount: -bet.amount,
          roomId,
          timestamp: Date.now(),
        });

        // Send chat message for loser (visible to everyone)
        await ctx.db.insert("pokerChatMessages", {
          roomId,
          sender: bet.bettor,
          senderUsername: bettorUsername,
          message: `💔 Lost ${bet.amount} credits on Round ${roundNumber}`,
          timestamp: Date.now(),
          type: "text" as const,
        });
      }
    }

    console.log(`🎰 Round ${roundNumber} resolved: ${winnersCount} winners, ${losersCount} losers`);

    return {
      success: true,
      betsResolved: bets.length,
      winners: winnersCount,
      losers: losersCount,
    };
  },
});

/**
 * CONVERT CREDITS TO COINS
 * Called when poker game ends - converts remaining betting credits to TESTVBMS
 */
export const convertCreditsToCoins = mutation({
  args: {
    address: v.string(),
    roomId: v.optional(v.string()), // Optional for tracking
  },
  handler: async (ctx, args) => {
    const { address, roomId } = args;
    const normalizedAddress = address.toLowerCase();

    // Get betting credits
    const credits = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!credits || credits.balance === 0) {
      return {
        success: true,
        converted: 0,
        message: "No credits to convert",
      };
    }

    const amount = credits.balance;

    // Get profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Add to coins (direct to balance)
    const currentBalance = profile.coins || 0;
    const newBalance = currentBalance + amount;

    await ctx.db.patch(profile._id, {
      coins: newBalance,
      lifetimeEarned: (profile.lifetimeEarned || 0) + amount,
      lastUpdated: Date.now(),
    });

    // Reset betting credits to 0
    await ctx.db.patch(credits._id, {
      balance: 0,
    });

    // Log transaction
    await ctx.db.insert("bettingTransactions", {
      address: normalizedAddress,
      type: "withdraw",
      amount,
      roomId,
      timestamp: Date.now(),
    });

    console.log(`💰 Converted ${amount} credits to TESTVBMS for ${normalizedAddress}`);

    return {
      success: true,
      converted: amount,
      newCoinsBalance: newBalance,
      message: `${amount} credits converted to TESTVBMS!`,
    };
  },
});

/**
 * GET ACTIVE BETS FOR A ROUND
 */
export const getRoundBets = query({
  args: {
    roomId: v.string(),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const bets = await ctx.db
      .query("roundBets")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", args.roomId).eq("roundNumber", args.roundNumber)
      )
      .collect();

    return bets;
  },
});

/**
 * GET MY BETS FOR A ROOM
 */
export const getMyRoomBets = query({
  args: {
    address: v.string(),
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    // 🚀 BANDWIDTH FIX: Use proper index + filter (double withIndex doesn't work)
    const bets = await ctx.db
      .query("roundBets")
      .withIndex("by_bettor", (q) => q.eq("bettor", normalizedAddress))
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .collect();

    return bets;
  },
});

/**
 * GET BETTING STATS FOR A ROOM (for UI display)
 */
export const getRoomBettingStats = query({
  args: {
    roomId: v.string(),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const bets = await ctx.db
      .query("roundBets")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", args.roomId).eq("roundNumber", args.roundNumber)
      )
      .collect();

    // Calculate totals per player
    const stats: Record<string, { total: number; count: number }> = {};

    for (const bet of bets) {
      if (!stats[bet.betOn]) {
        stats[bet.betOn] = { total: 0, count: 0 };
      }
      stats[bet.betOn].total += bet.amount;
      stats[bet.betOn].count += 1;
    }

    return {
      bets,
      stats,
      totalBets: bets.length,
    };
  },
});
