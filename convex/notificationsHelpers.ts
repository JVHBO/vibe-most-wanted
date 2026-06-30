import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

export const getAllTokens = internalQuery({
  args: {},
  handler: async () => [],
});

export const getAllTokensPublic = internalQuery({
  args: {},
  handler: async () => [],
});

export const getAllTokensPaginated = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async () => ({ tokens: [], count: 0, hasMore: false }),
});

export const getTipState = internalQuery({
  args: {},
  handler: async () => ({ currentTipIndex: 0, lastSentAt: 0, _id: null }),
});

export const initTipState = mutation({
  args: {},
  handler: async () => null,
});

export const updateTipState = mutation({
  args: {
    tipStateId: v.id("tipRotationState"),
    currentTipIndex: v.number(),
  },
  handler: async () => ({ notificationsDisabled: true }),
});

export const getLastLowEnergyNotification = internalQuery({
  args: { address: v.string() },
  handler: async () => null,
});

export const updateLowEnergyNotification = internalMutation({
  args: {
    address: v.string(),
    lowEnergyCount: v.number(),
    expiredCount: v.number(),
  },
  handler: async () => ({ notificationsDisabled: true }),
});

export const cleanupStaleTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("notificationTokens").take(5000);
    for (const token of tokens) {
      await ctx.db.delete(token._id);
    }
    return { deletedOldUrl: 0, deletedInvalidFormat: 0, total: tokens.length, notificationsDisabled: true };
  },
});

export const getTokenStats = query({
  args: {},
  handler: async () => ({
    total: 0,
    neynar: 0,
    warpcastNew: 0,
    warpcastOld: 0,
    invalidFormat: 0,
    notificationsDisabled: true,
  }),
});
