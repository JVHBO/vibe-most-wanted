/**
 * Helper queries and mutations for notification Actions
 * Separated to avoid circular dependencies
 */
import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";

/**
 * Get all notification tokens
 * 🚀 BANDWIDTH FIX: Converted to internalQuery + limited to 500
 */
export const getAllTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    // 🚀 BANDWIDTH FIX: Limit to 500 tokens max
    const tokens = await ctx.db.query("notificationTokens").take(500);
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

// ============================================================================
// LOW ENERGY NOTIFICATION COOLDOWN
// ============================================================================

/**
 * COOLDOWN para notificações de energia baixa
 */
const NOTIFICATION_COOLDOWN = 6 * 60 * 60 * 1000; // 6 horas

/**
 * Get last notification time for a user
 */
export const getLastLowEnergyNotification = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const notification = await ctx.db
      .query("lowEnergyNotifications")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();
    return notification;
  },
});

/**
 * Update last notification time
 */
export const updateLowEnergyNotification = mutation({
  args: { 
    address: v.string(),
    lowEnergyCount: v.number(),
    expiredCount: v.number(),
  },
  handler: async (ctx, { address, lowEnergyCount, expiredCount }) => {
    const existing = await ctx.db
      .query("lowEnergyNotifications")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastNotifiedAt: now,
        lowEnergyCount,
        expiredCount,
      });
    } else {
      await ctx.db.insert("lowEnergyNotifications", {
        address: address.toLowerCase(),
        lastNotifiedAt: now,
        lowEnergyCount,
        expiredCount,
      });
    }
  },
});