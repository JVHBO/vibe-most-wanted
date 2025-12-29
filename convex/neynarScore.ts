/**
 * Neynar Score History
 * Track score changes over time for each FID
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

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
 * If no history exists, checks farcasterCards for mint-time score
 */
export const getScoreHistory = query({
  args: { fid: v.number() },
  handler: async (ctx, { fid }) => {
    const history = await ctx.db
      .query("neynarScoreHistory")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .order("desc")
      .take(50);

    // If no history, check if there's a minted card with neynarScore
    if (history.length === 0) {
      const card = await ctx.db
        .query("farcasterCards")
        .withIndex("by_fid", (q) => q.eq("fid", fid))
        .first();

      if (card && card.neynarScore) {
        // Return mint-time score as first/only entry
        return {
          firstCheck: {
            score: card.neynarScore,
            rarity: card.rarity,
            checkedAt: card.mintedAt || card._creationTime,
          },
          latestCheck: {
            score: card.neynarScore,
            rarity: card.rarity,
            checkedAt: card.mintedAt || card._creationTime,
          },
          totalChecks: 1,
          scoreDiff: 0,
          percentChange: "0",
          history: [{
            _id: "mint" as any,
            fid: card.fid,
            username: card.username,
            score: card.neynarScore,
            rarity: card.rarity,
            checkedAt: card.mintedAt || card._creationTime,
          }],
          isMintTimeOnly: true,
        };
      }

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

/**
 * Backfill score history from existing farcasterCards
 * Adds mint-time score as first entry for cards without history
 */
export const backfillScoreHistory = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all farcaster cards
    const cards = await ctx.db
      .query("farcasterCards")
      .collect();

    let backfilledCount = 0;
    let skippedCount = 0;

    for (const card of cards) {
      // Check if this FID already has history
      const existingHistory = await ctx.db
        .query("neynarScoreHistory")
        .withIndex("by_fid", (q) => q.eq("fid", card.fid))
        .first();

      if (existingHistory) {
        skippedCount++;
        continue;
      }

      // Add mint-time score as first entry
      await ctx.db.insert("neynarScoreHistory", {
        fid: card.fid,
        username: card.username,
        score: card.neynarScore,
        rarity: card.rarity,
        checkedAt: card.mintedAt || card._creationTime,
      });

      backfilledCount++;
      console.log("Backfilled FID " + card.fid + " with score " + card.neynarScore);
    }

    console.log("Backfill complete: " + backfilledCount + " added, " + skippedCount + " skipped");
    return {
      success: true,
      backfilledCount,
      skippedCount,
    };
  },
});
