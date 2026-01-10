/**
 * Access Analytics - Track miniapp vs web visits
 *
 * Helps understand where users are coming from:
 * - miniapp: Farcaster miniapp (via SDK)
 * - web: Direct website access
 * - frame: Farcaster frame (legacy)
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get today's date as string (YYYY-MM-DD)
function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Log a user access (call from frontend when app loads)
 */
export const logAccess = mutation({
  args: {
    address: v.string(),
    source: v.union(
      v.literal("miniapp"),
      v.literal("farcaster_web"),
      v.literal("web"),
      v.literal("frame")
    ),
  },
  handler: async (ctx, { address, source }) => {
    const today = getTodayKey();
    const normalizedAddress = address.toLowerCase();

    // Find or create today's record for this source
    const existing = await ctx.db
      .query("accessAnalytics")
      .withIndex("by_date_source", (q) =>
        q.eq("date", today).eq("source", source)
      )
      .first();

    if (existing) {
      // Check if user already counted today
      if (existing.addresses.includes(normalizedAddress)) {
        // Just increment sessions, don't add duplicate user
        await ctx.db.patch(existing._id, {
          sessions: existing.sessions + 1,
        });
      } else {
        // New unique user for today
        await ctx.db.patch(existing._id, {
          uniqueUsers: existing.uniqueUsers + 1,
          sessions: existing.sessions + 1,
          addresses: [...existing.addresses, normalizedAddress],
        });
      }
    } else {
      // Create new record for today
      await ctx.db.insert("accessAnalytics", {
        date: today,
        source,
        uniqueUsers: 1,
        sessions: 1,
        addresses: [normalizedAddress],
      });
    }

    console.log(`📊 Access logged: ${source} - ${normalizedAddress}`);
  },
});

/**
 * Get analytics for a date range
 */
export const getAnalytics = query({
  args: {
    startDate: v.optional(v.string()), // YYYY-MM-DD, defaults to 7 days ago
    endDate: v.optional(v.string()),   // YYYY-MM-DD, defaults to today
  },
  handler: async (ctx, { startDate, endDate }) => {
    const today = getTodayKey();

    // Default to last 7 days
    const end = endDate || today;
    const start = startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    // Get all records in date range
    const records = await ctx.db
      .query("accessAnalytics")
      .withIndex("by_date")
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), start),
          q.lte(q.field("date"), end)
        )
      )
      .collect();

    // Aggregate by source
    const totals: Record<string, { uniqueUsers: number; sessions: number }> = {
      miniapp: { uniqueUsers: 0, sessions: 0 },
      farcaster_web: { uniqueUsers: 0, sessions: 0 },
      web: { uniqueUsers: 0, sessions: 0 },
      frame: { uniqueUsers: 0, sessions: 0 },
    };

    const byDate: Record<string, typeof totals> = {};

    for (const record of records) {
      // Totals
      if (!totals[record.source]) {
        totals[record.source] = { uniqueUsers: 0, sessions: 0 };
      }
      totals[record.source].uniqueUsers += record.uniqueUsers;
      totals[record.source].sessions += record.sessions;

      // By date
      if (!byDate[record.date]) {
        byDate[record.date] = {
          miniapp: { uniqueUsers: 0, sessions: 0 },
          farcaster_web: { uniqueUsers: 0, sessions: 0 },
          web: { uniqueUsers: 0, sessions: 0 },
          frame: { uniqueUsers: 0, sessions: 0 },
        };
      }
      byDate[record.date][record.source] = {
        uniqueUsers: record.uniqueUsers,
        sessions: record.sessions,
      };
    }

    // Calculate percentages
    const farcasterTotal = totals.miniapp.uniqueUsers + totals.farcaster_web.uniqueUsers;
    const totalUsers = farcasterTotal + totals.web.uniqueUsers + totals.frame.uniqueUsers;
    const miniappPercent = totalUsers > 0 ? Math.round((totals.miniapp.uniqueUsers / totalUsers) * 100) : 0;
    const farcasterWebPercent = totalUsers > 0 ? Math.round((totals.farcaster_web.uniqueUsers / totalUsers) * 100) : 0;
    const webPercent = totalUsers > 0 ? Math.round((totals.web.uniqueUsers / totalUsers) * 100) : 0;

    return {
      totals,
      byDate,
      summary: {
        totalUniqueUsers: totalUsers,
        farcasterTotal,
        miniappPercent,
        farcasterWebPercent,
        webPercent,
        dateRange: { start, end },
      },
    };
  },
});

/**
 * Get addresses by source (for debugging)
 */
export const getAddressesBySource = query({
  args: {
    date: v.optional(v.string()),
    source: v.union(v.literal("miniapp"), v.literal("farcaster_web"), v.literal("web"), v.literal("frame")),
  },
  handler: async (ctx, { date, source }) => {
    const targetDate = date || getTodayKey();

    const record = await ctx.db
      .query("accessAnalytics")
      .withIndex("by_date_source", (q) =>
        q.eq("date", targetDate).eq("source", source)
      )
      .first();

    return {
      date: targetDate,
      source,
      addresses: record?.addresses || [],
      count: record?.addresses.length || 0,
    };
  },
});

/**
 * Get today's analytics (quick view)
 */
export const getTodayAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const today = getTodayKey();

    const records = await ctx.db
      .query("accessAnalytics")
      .withIndex("by_date", (q) => q.eq("date", today))
      .collect();

    const sources = {
      miniapp: { uniqueUsers: 0, sessions: 0 },
      farcaster_web: { uniqueUsers: 0, sessions: 0 },
      web: { uniqueUsers: 0, sessions: 0 },
      frame: { uniqueUsers: 0, sessions: 0 },
    };

    for (const record of records) {
      if (record.source in sources) {
        sources[record.source as keyof typeof sources] = {
          uniqueUsers: record.uniqueUsers,
          sessions: record.sessions,
        };
      }
    }

    const farcasterTotal = sources.miniapp.uniqueUsers + sources.farcaster_web.uniqueUsers;
    const total = farcasterTotal + sources.web.uniqueUsers + sources.frame.uniqueUsers;

    return {
      date: today,
      ...sources,
      total,
      farcasterTotal, // miniapp + farcaster_web (all Farcaster traffic)
      miniappPercent: total > 0 ? Math.round((sources.miniapp.uniqueUsers / total) * 100) : 0,
      farcasterWebPercent: total > 0 ? Math.round((sources.farcaster_web.uniqueUsers / total) * 100) : 0,
      farcasterTotalPercent: total > 0 ? Math.round((farcasterTotal / total) * 100) : 0,
    };
  },
});

/**
 * Log detailed debug info for access (helps understand detection issues)
 */
export const logAccessDebug = mutation({
  args: {
    address: v.string(),
    source: v.string(),
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
    currentUrl: v.optional(v.string()),
    isIframe: v.optional(v.boolean()),
    sdkAvailable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("accessDebugLogs", {
      address: args.address.toLowerCase(),
      source: args.source,
      userAgent: args.userAgent,
      referrer: args.referrer,
      currentUrl: args.currentUrl,
      isIframe: args.isIframe,
      sdkAvailable: args.sdkAvailable,
      timestamp: Date.now(),
    });

    console.log(`🔍 Access debug logged: ${args.source} - ${args.address}`);
  },
});

/**
 * Get recent debug logs for analysis
 */
export const getAccessDebugLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    const logs = await ctx.db
      .query("accessDebugLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Get debug logs by address
 */
export const getAccessDebugByAddress = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const logs = await ctx.db
      .query("accessDebugLogs")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .collect();

    return logs;
  },
});
