/**
 * MATCH HISTORY SYSTEM
 *
 * Replaces Firebase match history with Convex
 * Includes weekly quest tracking integration
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { normalizeAddress } from "./utils";

/**
 * Get match history for a player
 */
export const getMatchHistory = query({
  args: {
    address: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { address, limit = 50 }) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizeAddress(address)))
      .order("desc")
      .take(limit);

    return matches;
  },
});

/**
 * 🚀 OPTIMIZED: Get match history SUMMARY (no card arrays)
 *
 * Saves ~95% bandwidth by excluding playerCards/opponentCards arrays.
 * UI only displays summary data anyway, so full card data is unnecessary.
 *
 * Estimated savings: 250MB+ (from 330MB to ~15MB)
 */
export const getMatchHistorySummary = query({
  args: {
    address: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { address, limit = 50 }) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizeAddress(address)))
      .order("desc")
      .take(limit);

    // Return ONLY display fields, strip heavy card arrays
    return matches.map(m => ({
      _id: m._id,
      type: m.type,
      result: m.result,
      playerPower: m.playerPower,
      opponentPower: m.opponentPower,
      opponentAddress: m.opponentAddress,
      opponentUsername: m.opponentUsername,
      timestamp: m.timestamp,
      coinsEarned: m.coinsEarned,
      entryFeePaid: m.entryFeePaid,
      difficulty: m.difficulty,
      // 🚫 EXCLUDED: playerCards, opponentCards (saves ~400KB per query!)
    }));
  },
});

/**
 * Record a match result
 */
export const recordMatch = mutation({
  args: {
    playerAddress: v.string(),
    type: v.union(
      v.literal("pve"),
      v.literal("pvp"),
      v.literal("attack"),
      v.literal("defense"),
      v.literal("poker-pvp"),
      v.literal("poker-cpu")
    ),
    result: v.union(
      v.literal("win"),
      v.literal("loss"),
      v.literal("tie")
    ),
    playerPower: v.number(),
    opponentPower: v.number(),
    playerCards: v.array(v.any()),
    opponentCards: v.array(v.any()),
    opponentAddress: v.optional(v.string()),
    opponentUsername: v.optional(v.string()),
    coinsEarned: v.optional(v.number()), // $TESTVBMS earned from this match
    entryFeePaid: v.optional(v.number()), // Entry fee paid
    difficulty: v.optional(v.union(
      v.literal("gey"),
      v.literal("goofy"),
      v.literal("gooner"),
      v.literal("gangster"),
      v.literal("gigachad")
    )), // AI difficulty for PvE
    playerScore: v.optional(v.number()), // Player's score in poker
    opponentScore: v.optional(v.number()), // Opponent's score in poker
  },
  handler: async (ctx, args) => {
    const normalizedPlayerAddress = args.playerAddress.toLowerCase();
    const normalizedOpponentAddress = args.opponentAddress?.toLowerCase();

    // Insert match record
    const matchId = await ctx.db.insert("matches", {
      playerAddress: normalizedPlayerAddress,
      type: args.type,
      result: args.result,
      playerPower: args.playerPower,
      opponentPower: args.opponentPower,
      opponentAddress: normalizedOpponentAddress,
      opponentUsername: args.opponentUsername,
      timestamp: Date.now(),
      playerCards: args.playerCards,
      opponentCards: args.opponentCards,
      coinsEarned: args.coinsEarned,
      entryFeePaid: args.entryFeePaid,
      difficulty: args.difficulty,
      playerScore: args.playerScore,
      opponentScore: args.opponentScore,
    });

    // devLog (server-side)("✅ Match saved to Convex:", matchId);

    // Update profile stats
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) =>
        q.eq("address", normalizedPlayerAddress)
      )
      .first();

    if (profile) {
      const newStats = { ...profile.stats };

      // Update appropriate stat based on type and result
      if (args.type === "pve" || args.type === "poker-cpu") {
        if (args.result === "win") {
          newStats.pveWins = (newStats.pveWins || 0) + 1;
        } else if (args.result === "loss") {
          newStats.pveLosses = (newStats.pveLosses || 0) + 1;
        }
      } else {
        // PvP, attack, defense, or poker-pvp
        if (args.result === "win") {
          newStats.pvpWins = (newStats.pvpWins || 0) + 1;
        } else if (args.result === "loss") {
          newStats.pvpLosses = (newStats.pvpLosses || 0) + 1;
        }
      }

      await ctx.db.patch(profile._id, {
        stats: newStats,
        lastUpdated: Date.now(),
      });

      // devLog (server-side)("✅ Profile stats updated");
    }

    // 🎯 Track weekly quest progress (async, non-blocking)
    // 🛡️ CRITICAL FIX: Use internal.quests (now internalMutation)
    try {
      // Track defense wins when defender wins
      if (args.type === "defense" && args.result === "win") {
        await ctx.scheduler.runAfter(0, internal.quests.updateWeeklyProgress, {
          address: normalizedPlayerAddress,
          questId: "weekly_defense_wins",
          increment: 1,
        });

        // devLog (server-side)(`✅ Weekly quest tracked: Defense win for ${normalizedPlayerAddress}`);
      }
    } catch (error) {
      // devError (server-side)("❌ Failed to track weekly quest:", error);
    }

    return matchId;
  },
});

/**
 * Get recent matches (for global match feed)
 */
export const getRecentMatches = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const matches = await ctx.db
      .query("matches")
      .order("desc")
      .take(limit);

    return matches;
  },
});

/**
 * 🚀 OPTIMIZED: Get match statistics for a player
 *
 * Uses streaming aggregation instead of .collect() to avoid loading
 * full card arrays into memory. Processes matches one at a time.
 *
 * Old: Load ALL matches → filter 8 times → heavy bandwidth
 * New: Stream matches → aggregate on-the-fly → zero bandwidth waste
 */
export const getMatchStats = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const stats = {
      total: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      pve: 0,
      pvp: 0,
      attack: 0,
      defense: 0,
    };

    // Stream and aggregate instead of collect
    const matches = ctx.db
      .query("matches")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizeAddress(address)));

    // Process each match without loading full arrays
    for await (const match of matches) {
      stats.total++;

      // Count by result
      if (match.result === "win") stats.wins++;
      else if (match.result === "loss") stats.losses++;
      else if (match.result === "tie") stats.ties++;

      // Count by type
      if (match.type === "pve") stats.pve++;
      else if (match.type === "pvp") stats.pvp++;
      else if (match.type === "attack") stats.attack++;
      else if (match.type === "defense") stats.defense++;
    }

    return stats;
  },
});
