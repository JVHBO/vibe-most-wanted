/**
 * 📊 Alchemy API Call Tracking System
 *
 * Tracks ALL Alchemy API calls from both VBMS and VibeFID
 * to understand usage patterns and optimize.
 *
 * Usage:
 * - Call trackAlchemyCall() before each Alchemy request
 * - Query getAlchemyStats() to see usage breakdown
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Track an Alchemy API call
 */
export const trackAlchemyCall = mutation({
  args: {
    source: v.union(v.literal("vbms"), v.literal("vibefid"), v.literal("unknown")),
    endpoint: v.string(), // e.g., "getNFTsForOwner", "getNFTMetadata"
    contractAddress: v.optional(v.string()),
    ownerAddress: v.optional(v.string()),
    pageNumber: v.optional(v.number()),
    cached: v.optional(v.boolean()), // Was this served from cache?
    responseTime: v.optional(v.number()), // ms
    success: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = new Date().getHours();

    await ctx.db.insert("alchemyTracking", {
      ...args,
      timestamp: now,
      date: today,
      hour,
    });

    // Also update daily aggregates
    const existingAggregate = await ctx.db
      .query("alchemyDailyStats")
      .withIndex("by_date_source", (q) =>
        q.eq("date", today).eq("source", args.source)
      )
      .first();

    if (existingAggregate) {
      await ctx.db.patch(existingAggregate._id, {
        totalCalls: existingAggregate.totalCalls + 1,
        cachedCalls: existingAggregate.cachedCalls + (args.cached ? 1 : 0),
        failedCalls: existingAggregate.failedCalls + (args.success === false ? 1 : 0),
        lastCallAt: now,
      });
    } else {
      await ctx.db.insert("alchemyDailyStats", {
        date: today,
        source: args.source,
        totalCalls: 1,
        cachedCalls: args.cached ? 1 : 0,
        failedCalls: args.success === false ? 1 : 0,
        lastCallAt: now,
      });
    }

    return { tracked: true };
  },
});

/**
 * Get Alchemy usage stats for the last N days
 */
export const getAlchemyStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Get daily aggregates
    const dailyStats = await ctx.db
      .query("alchemyDailyStats")
      .collect();

    const filteredStats = dailyStats.filter(s => s.date >= cutoffStr);

    // Aggregate by source
    const bySource: Record<string, { total: number; cached: number; failed: number }> = {
      vbms: { total: 0, cached: 0, failed: 0 },
      vibefid: { total: 0, cached: 0, failed: 0 },
      unknown: { total: 0, cached: 0, failed: 0 },
    };

    const byDate: Record<string, Record<string, number>> = {};

    for (const stat of filteredStats) {
      if (bySource[stat.source]) {
        bySource[stat.source].total += stat.totalCalls;
        bySource[stat.source].cached += stat.cachedCalls;
        bySource[stat.source].failed += stat.failedCalls;
      }

      if (!byDate[stat.date]) {
        byDate[stat.date] = { vbms: 0, vibefid: 0, unknown: 0 };
      }
      byDate[stat.date][stat.source] = stat.totalCalls;
    }

    const grandTotal = Object.values(bySource).reduce((sum, s) => sum + s.total, 0);

    return {
      summary: {
        totalCalls: grandTotal,
        bySource,
        cacheHitRate: grandTotal > 0
          ? ((bySource.vbms.cached + bySource.vibefid.cached + bySource.unknown.cached) / grandTotal * 100).toFixed(1) + '%'
          : '0%',
      },
      byDate,
      period: `${days} days`,
    };
  },
});

/**
 * Get recent Alchemy calls (for debugging)
 */
export const getRecentAlchemyCalls = query({
  args: {
    limit: v.optional(v.number()),
    source: v.optional(v.union(v.literal("vbms"), v.literal("vibefid"), v.literal("unknown"))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    let query = ctx.db.query("alchemyTracking");

    if (args.source) {
      query = query.filter((q) => q.eq(q.field("source"), args.source));
    }

    const calls = await query
      .order("desc")
      .take(limit);

    return calls.map(c => ({
      ...c,
      timestampStr: new Date(c.timestamp).toISOString(),
    }));
  },
});

/**
 * Get hourly breakdown for today
 */
export const getTodayHourlyStats = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];

    const calls = await ctx.db
      .query("alchemyTracking")
      .filter((q) => q.eq(q.field("date"), today))
      .collect();

    // Group by hour and source
    const hourly: Record<number, { vbms: number; vibefid: number; unknown: number }> = {};

    for (let h = 0; h < 24; h++) {
      hourly[h] = { vbms: 0, vibefid: 0, unknown: 0 };
    }

    for (const call of calls) {
      if (hourly[call.hour] && call.source) {
        hourly[call.hour][call.source]++;
      }
    }

    return {
      date: today,
      hourly,
      totalToday: calls.length,
    };
  },
});

/**
 * Clean up old tracking data (keep last 30 days)
 */
export const cleanupOldTracking = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Delete old tracking records
    const oldRecords = await ctx.db
      .query("alchemyTracking")
      .filter((q) => q.lt(q.field("date"), cutoffStr))
      .collect();

    let deleted = 0;
    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
      deleted++;
    }

    // Delete old daily stats
    const oldStats = await ctx.db
      .query("alchemyDailyStats")
      .filter((q) => q.lt(q.field("date"), cutoffStr))
      .collect();

    for (const stat of oldStats) {
      await ctx.db.delete(stat._id);
      deleted++;
    }

    console.log(`🗑️ Cleaned up ${deleted} old Alchemy tracking records`);
    return { deleted };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Alchemy CU (Compute Unit) costs per endpoint
 * Reference: https://docs.alchemy.com/reference/compute-unit-costs
 */
const ALCHEMY_CU_COSTS: Record<string, number> = {
  'getNFTsForOwner': 300,      // NFT API - expensive
  'getNFTMetadata': 50,        // Single NFT metadata
  'getOwnersForNFT': 100,      // Get owners
  'getNFTsForCollection': 300, // Collection NFTs
  'getContractMetadata': 10,   // Contract info
  'eth_call': 26,              // Basic RPC
  'eth_getBalance': 19,        // Balance check
  'unknown': 50,               // Default estimate
};

/**
 * 📊 FULL DASHBOARD - All stats in one query
 */
export const getAlchemyDashboard = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    // Get all tracking data for the period
    const allCalls = await ctx.db
      .query("alchemyTracking")
      .filter((q) => q.gte(q.field("date"), cutoffStr))
      .collect();

    // === BASIC STATS ===
    const totalCalls = allCalls.length;
    const cachedCalls = allCalls.filter(c => c.cached).length;
    const failedCalls = allCalls.filter(c => c.success === false).length;
    const cacheHitRate = totalCalls > 0 ? (cachedCalls / totalCalls * 100).toFixed(1) : '0';

    // === BY SOURCE (VBMS vs VibeFID) ===
    const bySource: Record<string, { calls: number; cached: number; failed: number; cuEstimate: number }> = {
      vbms: { calls: 0, cached: 0, failed: 0, cuEstimate: 0 },
      vibefid: { calls: 0, cached: 0, failed: 0, cuEstimate: 0 },
      unknown: { calls: 0, cached: 0, failed: 0, cuEstimate: 0 },
    };

    // === BY COLLECTION ===
    const byCollection: Record<string, { calls: number; cuEstimate: number }> = {};

    // === BY USER (top callers) ===
    const byUser: Record<string, number> = {};

    // === BY HOUR (today only) ===
    const todayCalls = allCalls.filter(c => c.date === today);
    const byHour: Record<number, { vbms: number; vibefid: number }> = {};
    for (let h = 0; h < 24; h++) {
      byHour[h] = { vbms: 0, vibefid: 0 };
    }

    // === RESPONSE TIME STATS ===
    const responseTimes: number[] = [];

    // Process all calls
    for (const call of allCalls) {
      const source = call.source || 'unknown';
      const cuCost = call.cached ? 0 : (ALCHEMY_CU_COSTS[call.endpoint] || ALCHEMY_CU_COSTS['unknown']);

      // By source
      if (bySource[source]) {
        bySource[source].calls++;
        if (call.cached) bySource[source].cached++;
        if (call.success === false) bySource[source].failed++;
        bySource[source].cuEstimate += cuCost;
      }

      // By collection
      if (call.contractAddress && !call.cached) {
        const contract = call.contractAddress.toLowerCase().slice(0, 10) + '...';
        if (!byCollection[contract]) {
          byCollection[contract] = { calls: 0, cuEstimate: 0 };
        }
        byCollection[contract].calls++;
        byCollection[contract].cuEstimate += cuCost;
      }

      // By user
      if (call.ownerAddress) {
        const user = call.ownerAddress.toLowerCase();
        byUser[user] = (byUser[user] || 0) + 1;
      }

      // Response times
      if (call.responseTime && call.responseTime > 0) {
        responseTimes.push(call.responseTime);
      }

      // By hour (today only)
      if (call.date === today && byHour[call.hour]) {
        if (source === 'vbms') byHour[call.hour].vbms++;
        else if (source === 'vibefid') byHour[call.hour].vibefid++;
      }
    }

    // Calculate total CU estimate
    const totalCU = Object.values(bySource).reduce((sum, s) => sum + s.cuEstimate, 0);

    // Top 10 collections by CU
    const topCollections = Object.entries(byCollection)
      .sort((a, b) => b[1].cuEstimate - a[1].cuEstimate)
      .slice(0, 10)
      .map(([contract, data]) => ({ contract, ...data }));

    // Top 10 users by calls
    const topUsers = Object.entries(byUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([address, calls]) => ({
        address: address.slice(0, 10) + '...' + address.slice(-6),
        calls,
      }));

    // Response time stats
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    // === ALERTS ===
    const alerts: string[] = [];
    const todayTotal = todayCalls.length;

    if (todayTotal > 10000) {
      alerts.push(`🚨 HIGH USAGE: ${todayTotal.toLocaleString()} calls today!`);
    }
    if (bySource.vbms.calls > bySource.vibefid.calls * 3) {
      alerts.push(`⚠️ VBMS is making 3x more calls than VibeFID`);
    }
    if (bySource.vibefid.calls > bySource.vbms.calls * 3) {
      alerts.push(`⚠️ VibeFID is making 3x more calls than VBMS`);
    }
    const failRate = totalCalls > 0 ? (failedCalls / totalCalls * 100) : 0;
    if (failRate > 5) {
      alerts.push(`⚠️ High failure rate: ${failRate.toFixed(1)}%`);
    }

    return {
      period: `${days} days`,
      generated: new Date().toISOString(),

      summary: {
        totalCalls,
        cachedCalls,
        failedCalls,
        cacheHitRate: `${cacheHitRate}%`,
        totalCU_estimate: totalCU,
        avgResponseTime: `${avgResponseTime}ms`,
        maxResponseTime: `${maxResponseTime}ms`,
      },

      bySource,
      topCollections,
      topUsers,

      today: {
        date: today,
        totalCalls: todayTotal,
        byHour,
      },

      alerts,

      // Cost estimate (rough - Alchemy pricing varies)
      costEstimate: {
        totalCU,
        note: 'Free tier: 300M CU/month. Growth: 400 CU/$1',
        estimatedMonthlyCU: Math.round(totalCU / days * 30),
      },
    };
  },
});

/**
 * Get usage comparison between sources
 */
export const getSourceComparison = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];

    // Last 24 hours
    const last24h = Date.now() - (24 * 60 * 60 * 1000);

    const recentCalls = await ctx.db
      .query("alchemyTracking")
      .filter((q) => q.gte(q.field("timestamp"), last24h))
      .collect();

    const vbms = recentCalls.filter(c => c.source === 'vbms');
    const vibefid = recentCalls.filter(c => c.source === 'vibefid');

    const vbmsCU = vbms.filter(c => !c.cached).reduce((sum, c) =>
      sum + (ALCHEMY_CU_COSTS[c.endpoint] || 50), 0);
    const vibefidCU = vibefid.filter(c => !c.cached).reduce((sum, c) =>
      sum + (ALCHEMY_CU_COSTS[c.endpoint] || 50), 0);

    return {
      period: 'Last 24 hours',

      vbms: {
        totalCalls: vbms.length,
        actualFetches: vbms.filter(c => !c.cached).length,
        cachedHits: vbms.filter(c => c.cached).length,
        failures: vbms.filter(c => c.success === false).length,
        estimatedCU: vbmsCU,
      },

      vibefid: {
        totalCalls: vibefid.length,
        actualFetches: vibefid.filter(c => !c.cached).length,
        cachedHits: vibefid.filter(c => c.cached).length,
        failures: vibefid.filter(c => c.success === false).length,
        estimatedCU: vibefidCU,
      },

      winner: vbmsCU > vibefidCU
        ? `VBMS usa ${((vbmsCU / (vibefidCU || 1)) * 100 - 100).toFixed(0)}% mais CU`
        : vibefidCU > vbmsCU
          ? `VibeFID usa ${((vibefidCU / (vbmsCU || 1)) * 100 - 100).toFixed(0)}% mais CU`
          : 'Uso igual',
    };
  },
});
