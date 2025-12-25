/**
 * Helper queries and mutations for notification Actions
 * Separated to avoid circular dependencies
 */
import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";

/**
 * Get all notification tokens (internal)
 * 🚀 BANDWIDTH FIX: Converted to internalQuery (not public)
 */
export const getAllTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all tokens (no limit for internal use - currently ~1700 users)
    const tokens = await ctx.db.query("notificationTokens").collect();
    return tokens;
  },
});

/**
 * Get all notification tokens (for external scripts)
 * 🚀 BANDWIDTH FIX: Converted to internalQuery (not public)
 * Use via: npx convex run notificationsHelpers:getAllTokensPublic --env-file .env.prod
 */
export const getAllTokensPublic = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("notificationTokens").collect();
    return tokens;
  },
});

/**
 * Get ALL notification tokens with pagination (for broadcasts)
 * 🚀 BANDWIDTH FIX: Converted to internalQuery + use .take() for efficiency
 * Use via: npx convex run notificationsHelpers:getAllTokensPaginated --env-file .env.prod
 */
export const getAllTokensPaginated = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 500;
    
    // 🚀 BANDWIDTH FIX: Use .take() instead of .collect()
    // For broadcasts, we process in batches anyway
    const tokens = await ctx.db.query("notificationTokens").take(limit);

    return {
      tokens,
      count: tokens.length,
      hasMore: tokens.length === limit,
    };
  },
});

/**
 * Get tip rotation state
 */
export const getTipState = internalQuery({
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
 * 🚀 BANDWIDTH FIX: Converted to internalQuery (only used by internalAction)
 */
export const getLastLowEnergyNotification = internalQuery({
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
 * 🚀 BANDWIDTH FIX: Converted to internalMutation (only used by internalAction)
 */
export const updateLowEnergyNotification = internalMutation({
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

// ============================================================================
// CLEANUP STALE TOKENS
// ============================================================================

/**
 * Clean up stale notification tokens with deprecated URLs
 * Use: npx convex run notificationsHelpers:cleanupStaleTokens --env-file .env.prod
 */
export const cleanupStaleTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("notificationTokens").collect();

    let deletedOldUrl = 0;
    let deletedInvalidFormat = 0;

    for (const token of tokens) {
      // Delete tokens with old deprecated URL
      if (token.url.includes("/v1/notify")) {
        await ctx.db.delete(token._id);
        deletedOldUrl++;
        console.log(`🗑️ Deleted stale token for FID ${token.fid} (old URL)`);
      }
      // Delete tokens with invalid format (not UUID)
      else if (token.token && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token.token)) {
        await ctx.db.delete(token._id);
        deletedInvalidFormat++;
        console.log(`🗑️ Deleted invalid token for FID ${token.fid} (bad format)`);
      }
    }

    console.log(`🧹 Cleanup complete: ${deletedOldUrl} old URL tokens, ${deletedInvalidFormat} invalid format tokens deleted`);
    return { deletedOldUrl, deletedInvalidFormat, total: deletedOldUrl + deletedInvalidFormat };
  },
});

/**
 * Get stats about notification tokens (for debugging)
 */
export const getTokenStats = query({
  args: {},
  handler: async (ctx) => {
    const tokens = await ctx.db.query("notificationTokens").collect();

    const stats = {
      total: tokens.length,
      neynar: 0,
      warpcastNew: 0,
      warpcastOld: 0,
      invalidFormat: 0,
    };

    for (const token of tokens) {
      if (token.url.includes("neynar")) {
        stats.neynar++;
      } else if (token.url.includes("/v1/frame-notifications")) {
        stats.warpcastNew++;
      } else if (token.url.includes("/v1/notify")) {
        stats.warpcastOld++;
      }

      // Check UUID format
      if (token.token && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token.token)) {
        stats.invalidFormat++;
      }
    }

    return stats;
  },
});