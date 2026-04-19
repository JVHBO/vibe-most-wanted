/**
 * API Stats Tracking
 * Persistent counters for debugging Alchemy usage
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Increment a stat counter
export const increment = mutation({
  args: {
    key: v.string(), // e.g., "gift_nfts_total", "gift_nfts_cache_hit", "rpc_failed"
    amount: v.optional(v.number()),
  },
  handler: async (_ctx, _args) => {
    // disabled — api stats tracking removed
  },
});

// Get all stats
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db.query("apiStats").collect();
    const result: Record<string, number> = {};
    for (const stat of stats) {
      result[stat.key] = stat.value;
    }
    return result;
  },
});

// Reset all stats
export const resetAll = mutation({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db.query("apiStats").collect();
    for (const stat of stats) {
      await ctx.db.patch(stat._id, { value: 0, lastUpdated: Date.now() });
    }
    return { reset: true, count: stats.length };
  },
});
