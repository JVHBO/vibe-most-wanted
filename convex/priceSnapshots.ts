import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Price Snapshots for Ticker
 *
 * Stores daily price snapshots to show up/down trends in the price ticker.
 * Call savePriceSnapshot once per day to capture current prices.
 */

// Save a daily price snapshot
export const savePriceSnapshot = mutation({
  args: {
    prices: v.array(v.object({
      collectionId: v.string(),
      priceEth: v.number(),
      priceUsd: v.number(),
    })),
    ethUsdPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0]; // "2025-12-03"

    // Check if we already have a snapshot for today
    const existingSnapshot = await ctx.db
      .query("priceSnapshots")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existingSnapshot) {
      // Update existing snapshot
      await ctx.db.patch(existingSnapshot._id, {
        prices: args.prices,
        ethUsdPrice: args.ethUsdPrice,
        timestamp: Date.now(),
      });
      return { updated: true, date: today };
    }

    // Create new snapshot
    await ctx.db.insert("priceSnapshots", {
      date: today,
      prices: args.prices,
      ethUsdPrice: args.ethUsdPrice,
      timestamp: Date.now(),
    });

    return { created: true, date: today };
  },
});

// Get yesterday's prices for comparison (falls back to most recent if no yesterday)
export const getYesterdayPrices = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Try yesterday first
    let snapshot = await ctx.db
      .query("priceSnapshots")
      .withIndex("by_date", (q) => q.eq("date", yesterdayStr))
      .first();

    // Fallback: get most recent snapshot (not today)
    if (!snapshot) {
      const allSnapshots = await ctx.db
        .query("priceSnapshots")
        .order("desc")
        .take(5);

      snapshot = allSnapshots.find(s => s.date !== today) || null;
    }

    if (!snapshot) {
      return null;
    }

    // Convert to map for easy lookup
    const priceMap: Record<string, { priceEth: number; priceUsd: number }> = {};
    for (const p of snapshot.prices) {
      priceMap[p.collectionId] = { priceEth: p.priceEth, priceUsd: p.priceUsd };
    }

    return {
      date: snapshot.date,
      prices: priceMap,
      ethUsdPrice: snapshot.ethUsdPrice,
    };
  },
});

// Get recent snapshots (last 7 days)
export const getRecentSnapshots = query({
  args: {},
  handler: async (ctx) => {
    const snapshots = await ctx.db
      .query("priceSnapshots")
      .order("desc")
      .take(7);

    return snapshots;
  },
});

// Admin: Insert snapshot with custom date (for backfilling historical data)
export const insertHistoricalSnapshot = internalMutation({
  args: {
    date: v.string(),
    prices: v.array(v.object({
      collectionId: v.string(),
      priceEth: v.number(),
      priceUsd: v.number(),
    })),
    ethUsdPrice: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if snapshot already exists for this date
    const existing = await ctx.db
      .query("priceSnapshots")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (existing) {
      return { error: "Snapshot already exists for this date", date: args.date };
    }

    await ctx.db.insert("priceSnapshots", {
      date: args.date,
      prices: args.prices,
      ethUsdPrice: args.ethUsdPrice,
      timestamp: Date.now(),
    });

    return { created: true, date: args.date };
  },
});
