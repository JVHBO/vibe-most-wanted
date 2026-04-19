/**
 * MATCH HISTORY SYSTEM — matches table removed, profile stats preserved
 */

import { v } from "convex/values";
import { deckCardValidator } from "./cardSchema";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeAddress } from "./utils";

export const getMatchHistory = query({
  args: { address: v.string(), limit: v.optional(v.number()) },
  handler: async (_ctx, _args) => [],
});

export const getMatchHistorySummary = query({
  args: { address: v.string(), limit: v.optional(v.number()) },
  handler: async (_ctx, _args) => [],
});

export const getRecentMatches = query({
  args: { limit: v.optional(v.number()) },
  handler: async (_ctx, _args) => [],
});

export const getMatchStats = query({
  args: { address: v.string() },
  handler: async (_ctx, _args) => ({
    total: 0, wins: 0, losses: 0, ties: 0,
    pve: 0, pvp: 0, attack: 0, defense: 0,
  }),
});

/**
 * Record a match — saves profile stats only, no match history
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
    result: v.union(v.literal("win"), v.literal("loss"), v.literal("tie")),
    playerPower: v.number(),
    opponentPower: v.number(),
    playerCards: v.array(deckCardValidator),
    opponentCards: v.array(deckCardValidator),
    opponentAddress: v.optional(v.string()),
    opponentUsername: v.optional(v.string()),
    coinsEarned: v.optional(v.number()),
    entryFeePaid: v.optional(v.number()),
    difficulty: v.optional(v.union(
      v.literal("gey"),
      v.literal("goofy"),
      v.literal("gooner"),
      v.literal("gangster"),
      v.literal("gigachad")
    )),
    playerScore: v.optional(v.number()),
    opponentScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const normalizedPlayerAddress = normalizeAddress(args.playerAddress);

    // Update profile stats
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedPlayerAddress))
      .first();

    if (profile) {
      const newStats = { ...profile.stats };
      if (args.type === "pve" || args.type === "poker-cpu") {
        if (args.result === "win") newStats.pveWins = (newStats.pveWins || 0) + 1;
        else if (args.result === "loss") newStats.pveLosses = (newStats.pveLosses || 0) + 1;
      } else {
        if (args.result === "win") newStats.pvpWins = (newStats.pvpWins || 0) + 1;
        else if (args.result === "loss") newStats.pvpLosses = (newStats.pvpLosses || 0) + 1;
      }
      await ctx.db.patch(profile._id, { stats: newStats, lastUpdated: Date.now() });
    }

    // Track weekly defense quest
    try {
      if (args.type === "defense" && args.result === "win") {
        await ctx.scheduler.runAfter(0, internal.quests.updateWeeklyProgress, {
          address: normalizedPlayerAddress,
          questId: "weekly_defense_wins",
          increment: 1,
        });
      }
    } catch {}

    return null;
  },
});
