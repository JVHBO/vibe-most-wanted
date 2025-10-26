import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * MATCH QUERIES & MUTATIONS
 *
 * Handles PvP match history and results
 */

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get player's match history
 */
export const getPlayerMatches = query({
  args: {
    playerAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { playerAddress, limit = 50 }) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_player", (q) =>
        q.eq("playerAddress", playerAddress.toLowerCase())
      )
      .order("desc")
      .take(limit);

    return matches;
  },
});

/**
 * Get recent matches (for activity feed)
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
 * Get specific match by ID
 */
export const getMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    return match;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Record a match result
 */
export const createMatch = mutation({
  args: {
    matchId: v.string(), // Firebase legacy ID or generated ID
    type: v.union(v.literal("attack"), v.literal("defense"), v.literal("pvp")),
    result: v.union(v.literal("win"), v.literal("loss"), v.literal("draw")),

    playerAddress: v.string(),
    playerPower: v.optional(v.number()),
    playerCards: v.optional(v.array(v.any())),

    opponentAddress: v.string(),
    opponentUsername: v.optional(v.string()),
    opponentPower: v.optional(v.number()),
    opponentCards: v.optional(v.array(v.any())),

    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const newId = await ctx.db.insert("matches", {
      matchId: args.matchId,
      type: args.type,
      result: args.result,
      playerAddress: args.playerAddress.toLowerCase(),
      playerPower: args.playerPower,
      playerCards: args.playerCards,
      opponentAddress: args.opponentAddress.toLowerCase(),
      opponentUsername: args.opponentUsername,
      opponentPower: args.opponentPower,
      opponentCards: args.opponentCards,
      timestamp: args.timestamp || Date.now(),
    });

    return newId;
  },
});
