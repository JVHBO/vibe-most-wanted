/**
 * Neynar Score History
 * Track score changes over time for each FID
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Save a Neynar score check to history
 */
export const saveScoreCheck = mutation({
  args: {
    fid: v.number(),
    username: v.string(),
    score: v.number(),
    rarity: v.string(),
  },
  handler: async (ctx, { fid, username, score, rarity }) => {
    await ctx.db.insert("neynarScoreHistory", {
      fid,
      username,
      score,
      rarity,
      checkedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get all score history entries (for debugging)
 */
export const getAllScoreHistory = query({
  args: {},
  handler: async (ctx) => {
    const history = await ctx.db
      .query("neynarScoreHistory")
      .order("desc")
      .take(20);
    return history;
  },
});

/**
 * Get score history for a FID
 */
export const getScoreHistory = query({
  args: { fid: v.number() },
  handler: async (ctx, { fid }) => {
    const history = await ctx.db
      .query("neynarScoreHistory")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .order("desc")
      .take(50);

    if (history.length === 0) {
      return null;
    }

    // Get first (oldest) and last (newest) entries
    const sorted = [...history].sort((a, b) => a.checkedAt - b.checkedAt);
    const firstCheck = sorted[0];
    const latestCheck = sorted[sorted.length - 1];

    // Calculate progress
    const scoreDiff = latestCheck.score - firstCheck.score;
    const percentChange = firstCheck.score > 0
      ? ((scoreDiff / firstCheck.score) * 100).toFixed(1)
      : "0";

    return {
      firstCheck: {
        score: firstCheck.score,
        rarity: firstCheck.rarity,
        checkedAt: firstCheck.checkedAt,
      },
      latestCheck: {
        score: latestCheck.score,
        rarity: latestCheck.rarity,
        checkedAt: latestCheck.checkedAt,
      },
      totalChecks: history.length,
      scoreDiff,
      percentChange,
      history: history.slice(0, 10), // Last 10 checks
    };
  },
});
