/**
 * MATCH HISTORY SYSTEM
 *
 * Replaces Firebase match history with Convex
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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
      .withIndex("by_player", (q) => q.eq("playerAddress", address.toLowerCase()))
      .order("desc")
      .take(limit);

    return matches;
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
      v.literal("defense")
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
  },
  handler: async (ctx, args) => {
    const normalizedPlayerAddress = args.playerAddress.toLowerCase();
    const normalizedOpponentAddress = args.opponentAddress?.toLowerCase();

    console.log("🎮 recordMatch called:", {
      playerAddress: normalizedPlayerAddress,
      type: args.type,
      result: args.result,
      playerPower: args.playerPower,
      opponentPower: args.opponentPower,
    });

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
    });

    console.log("✅ Match saved to Convex:", matchId);

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
      if (args.type === "pve") {
        if (args.result === "win") {
          newStats.pveWins = (newStats.pveWins || 0) + 1;
        } else if (args.result === "loss") {
          newStats.pveLosses = (newStats.pveLosses || 0) + 1;
        }
      } else {
        // PvP, attack, or defense
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

      console.log("✅ Profile stats updated");
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
 * Get match statistics for a player
 */
export const getMatchStats = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_player", (q) => q.eq("playerAddress", address.toLowerCase()))
      .collect();

    const stats = {
      total: matches.length,
      wins: matches.filter((m) => m.result === "win").length,
      losses: matches.filter((m) => m.result === "loss").length,
      ties: matches.filter((m) => m.result === "tie").length,
      pve: matches.filter((m) => m.type === "pve").length,
      pvp: matches.filter((m) => m.type === "pvp").length,
      attack: matches.filter((m) => m.type === "attack").length,
      defense: matches.filter((m) => m.type === "defense").length,
    };

    return stats;
  },
});
