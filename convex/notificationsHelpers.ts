/**
 * Helper queries and mutations for notification Actions
 * Separated to avoid circular dependencies
 */
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get all notification tokens
 */
export const getAllTokens = query({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("notificationTokens").collect();
    return tokens;
  },
});

/**
 * Get tip rotation state
 */
export const getTipState = query({
  args: {},
  handler: async (ctx) => {
    let tipState = await ctx.db.query("tipRotationState").first();

    if (!tipState) {
      return { currentTipIndex: 0, lastSentAt: Date.now(), _id: null };
    }

    return tipState;
  },
});

/**
 * Initialize tip state
 */
export const initTipState = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("tipRotationState").first();
    if (existing) return existing._id;

    const newId = await ctx.db.insert("tipRotationState", {
      currentTipIndex: 0,
      lastSentAt: Date.now(),
    });
    return newId;
  },
});

/**
 * Update tip rotation state
 */
export const updateTipState = mutation({
  args: {
    tipStateId: v.id("tipRotationState"),
    currentTipIndex: v.number(),
  },
  handler: async (ctx, { tipStateId, currentTipIndex }) => {
    await ctx.db.patch(tipStateId, {
      currentTipIndex,
      lastSentAt: Date.now(),
    });
  },
});
