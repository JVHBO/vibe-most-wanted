/**
 * Neynar Score History
 * Track score changes over time for each FID
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Save a Neynar score check to history
 * Only saves if the score has changed from the last check
 */
export const saveScoreCheck = mutation({
  args: {
    fid: v.number(),
    username: v.string(),
    score: v.number(),
    rarity: v.string(),
  },
  handler: async (ctx, { fid, username, score, rarity }) => {
    // Get the most recent score for this FID
    const lastCheck = await ctx.db
      .query("neynarScoreHistory")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .order("desc")
      .first();

    // Only save if score changed (or first entry)
    if (lastCheck && Math.abs(lastCheck.score - score) < 0.0001) {
      console.log("Score unchanged for FID " + fid + ": " + score);
      return { success: true, saved: false, reason: "score_unchanged" };
    }

    await ctx.db.insert("neynarScoreHistory", {
      fid,
      username,
      score,
      rarity,
      checkedAt: Date.now(),
    });

    const prevScore = lastCheck ? lastCheck.score : "N/A";
    console.log("Score saved for FID " + fid + ": " + prevScore + " -> " + score);
    return { success: true, saved: true };
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
 * ALWAYS uses mint-time score from farcasterCards as baseline (first check)
 */
export const getScoreHistory = query({
  args: { fid: v.number() },
  handler: async (ctx, { fid }) => {
    // Always get the card's mint-time score as baseline
    const card = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .first();

    const history = await ctx.db
      .query("neynarScoreHistory")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .order("desc")
      .take(50);

    // If no card exists, return null
    if (!card || !card.neynarScore) {
      if (history.length === 0) return null;

      // No card but has history - use history only
      const sorted = [...history].sort((a, b) => a.checkedAt - b.checkedAt);
      const firstCheck = sorted[0];
      const latestCheck = sorted[sorted.length - 1];
      const scoreDiff = latestCheck.score - firstCheck.score;
      const percentChange = firstCheck.score > 0
        ? ((scoreDiff / firstCheck.score) * 100).toFixed(1)
        : "0";

      return {
        firstCheck: { score: firstCheck.score, rarity: firstCheck.rarity, checkedAt: firstCheck.checkedAt },
        latestCheck: { score: latestCheck.score, rarity: latestCheck.rarity, checkedAt: latestCheck.checkedAt },
        totalChecks: history.length,
        scoreDiff,
        percentChange,
        history: history.slice(0, 10),
      };
    }

    // Create mint-time entry from card data
    const mintTimeEntry = {
      _id: "mint" as any,
      fid: card.fid,
      username: card.username,
      score: card.neynarScore,
      rarity: card.rarity,
      checkedAt: card.mintedAt || card._creationTime,
    };

    // If no history, return just the mint-time score
    if (history.length === 0) {
      return {
        firstCheck: { score: card.neynarScore, rarity: card.rarity, checkedAt: mintTimeEntry.checkedAt },
        latestCheck: { score: card.neynarScore, rarity: card.rarity, checkedAt: mintTimeEntry.checkedAt },
        totalChecks: 1,
        scoreDiff: 0,
        percentChange: "0",
        history: [mintTimeEntry],
        isMintTimeOnly: true,
      };
    }

    // Combine mint-time with history, sorted by time
    const allEntries = [...history, mintTimeEntry].sort((a, b) => a.checkedAt - b.checkedAt);

    // First check is ALWAYS the mint-time score
    const firstCheck = mintTimeEntry;
    const latestCheck = allEntries[allEntries.length - 1];

    // Calculate progress from mint-time to latest
    const scoreDiff = latestCheck.score - firstCheck.score;
    const percentChange = firstCheck.score > 0
      ? ((scoreDiff / firstCheck.score) * 100).toFixed(1)
      : "0";

    // Return last 10 entries (most recent first)
    const recentHistory = allEntries.slice(-10).reverse();

    return {
      firstCheck: { score: firstCheck.score, rarity: firstCheck.rarity, checkedAt: firstCheck.checkedAt },
      latestCheck: { score: latestCheck.score, rarity: latestCheck.rarity, checkedAt: latestCheck.checkedAt },
      totalChecks: allEntries.length,
      scoreDiff,
      percentChange,
      history: recentHistory,
      mintTimeScore: card.neynarScore,
    };
  },
});

/**
 * Backfill score history from existing farcasterCards
 */
export const backfillScoreHistory = mutation({
  args: {},
  handler: async (ctx) => {
    const cards = await ctx.db.query("farcasterCards").collect();

    let backfilledCount = 0;
    let skippedCount = 0;

    for (const card of cards) {
      const existingHistory = await ctx.db
        .query("neynarScoreHistory")
        .withIndex("by_fid", (q) => q.eq("fid", card.fid))
        .first();

      if (existingHistory) {
        skippedCount++;
        continue;
      }

      await ctx.db.insert("neynarScoreHistory", {
        fid: card.fid,
        username: card.username,
        score: card.neynarScore,
        rarity: card.rarity,
        checkedAt: card.mintedAt || card._creationTime,
      });

      backfilledCount++;
    }

    return { success: true, backfilledCount, skippedCount };
  },
});

/**
 * Delete duplicate score entries (entries with same score as previous)
 */
export const cleanupDuplicateScores = mutation({
  args: {},
  handler: async (ctx) => {
    const allHistory = await ctx.db.query("neynarScoreHistory").collect();

    // Group by FID
    const byFid = new Map<number, typeof allHistory>();
    for (const entry of allHistory) {
      const list = byFid.get(entry.fid) || [];
      list.push(entry);
      byFid.set(entry.fid, list);
    }

    let deletedCount = 0;

    for (const [fid, entries] of byFid) {
      // Sort by time
      const sorted = entries.sort((a, b) => a.checkedAt - b.checkedAt);

      // Keep first entry, delete duplicates
      let prevScore: number | null = null;
      for (const entry of sorted) {
        if (prevScore !== null && Math.abs(entry.score - prevScore) < 0.0001) {
          await ctx.db.delete(entry._id);
          deletedCount++;
        } else {
          prevScore = entry.score;
        }
      }
    }

    console.log("Cleanup complete: " + deletedCount + " duplicates deleted");
    return { success: true, deletedCount };
  },
});
