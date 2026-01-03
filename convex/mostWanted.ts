/**
 * Most Wanted Ranking - Optimized
 * Cards ranked by Neynar Score increase since mint
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

/**
 * Get Most Wanted Ranking - Optimized version
 * Uses pre-calculated latestNeynarScore field on cards
 */
export const getRanking = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 12, 20000);
    const offset = args.offset || 0;

    // Get all cards that have score history
    const cards = await ctx.db
      .query("farcasterCards")
      .collect();

    // Get today's votes using index
    const today = new Date().toISOString().split('T')[0];
    const allVotes = await ctx.db
      .query("cardVotes")
      .withIndex("by_date", (q) => q.eq("date", today))
      .collect();

    // Create vote count map
    const voteMap = new Map<number, number>();
    for (const vote of allVotes) {
      const current = voteMap.get(vote.cardFid) || 0;
      voteMap.set(vote.cardFid, current + vote.voteCount);
    }

    // Calculate score diff and sort - only include MINTED cards (with contractAddress)
    const withDiff = cards
      .filter(c => c.contractAddress) // Only cards that were actually minted on blockchain
      .map(card => ({
        _id: card._id,
        fid: card.fid,
        username: card.username,
        displayName: card.displayName,
        pfpUrl: card.pfpUrl,
        cardImageUrl: card.cardImageUrl,
        rarity: card.rarity,
        mintScore: card.neynarScore,
        currentScore: card.latestNeynarScore ?? card.neynarScore,
        scoreDiff: (card.latestNeynarScore ?? card.neynarScore) - card.neynarScore,
        votes: voteMap.get(card.fid) || 0,
      }))
      .sort((a, b) => b.scoreDiff - a.scoreDiff);

    return {
      cards: withDiff.slice(offset, offset + limit),
      totalCount: withDiff.length,
      hasMore: offset + limit < withDiff.length,
    };
  },
});

/**
 * Update latest Neynar score on a card
 * Called when user checks their score
 */
export const updateLatestScore = mutation({
  args: {
    fid: v.number(),
    score: v.number(),
  },
  handler: async (ctx, { fid, score }) => {
    const card = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .first();

    if (!card) return { success: false, error: "Card not found" };

    await ctx.db.patch(card._id, {
      latestNeynarScore: score,
      latestScoreCheckedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Batch update all cards' latest Neynar scores
 * Only saves if score changed since last check
 */
export const batchUpdateScores = mutation({
  args: {
    updates: v.array(v.object({
      fid: v.number(),
      score: v.number(),
    })),
  },
  handler: async (ctx, { updates }) => {
    let updatedCount = 0;
    let skippedCount = 0;

    for (const { fid, score } of updates) {
      const card = await ctx.db
        .query("farcasterCards")
        .withIndex("by_fid", (q) => q.eq("fid", fid))
        .first();

      if (!card) continue;

      // Skip if score hasn't changed (within 0.0001 threshold)
      const lastScore = card.latestNeynarScore ?? card.neynarScore;
      if (Math.abs(lastScore - score) < 0.0001) {
        skippedCount++;
        continue;
      }

      await ctx.db.patch(card._id, {
        latestNeynarScore: score,
        latestScoreCheckedAt: Date.now(),
      });

      updatedCount++;
    }

    return { success: true, updatedCount, skippedCount };
  },
});

/**
 * Get all FIDs that need score update
 */
export const getFidsForScoreUpdate = query({
  args: {},
  handler: async (ctx) => {
    const cards = await ctx.db.query("farcasterCards").collect();
    return cards.map(c => c.fid);
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CACHED RANKING (reduces bandwidth by ~90%)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get Most Wanted Ranking from cache (FAST)
 * Returns pre-computed ranking data
 */
export const getRankingCached = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 12, 200);
    const offset = args.offset || 0;

    // Get cached data
    const cache = await ctx.db
      .query("mostWantedCache")
      .withIndex("by_type", (q) => q.eq("type", "most_wanted"))
      .first();

    if (!cache) {
      // Fallback to direct query if cache doesn't exist
      console.log("⚠️ Most Wanted cache not found, using direct query");
      return { cards: [], totalCount: 0, hasMore: false, fromCache: false };
    }

    const cards = cache.data.slice(offset, offset + limit);
    return {
      cards,
      totalCount: cache.totalCount,
      hasMore: offset + limit < cache.totalCount,
      fromCache: true,
      cacheAge: Date.now() - cache.updatedAt,
    };
  },
});

/**
 * Update Most Wanted cache (called by cron)
 * Caches top 200 cards sorted by score diff
 */
export const updateMostWantedCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      // Get all minted cards
      const cards = await ctx.db
        .query("farcasterCards")
        .filter((q) => q.neq(q.field("contractAddress"), undefined))
        .collect();

      // Get today's votes using index
      const today = new Date().toISOString().split('T')[0];
      const allVotes = await ctx.db
        .query("cardVotes")
        .withIndex("by_date", (q) => q.eq("date", today))
        .collect();

      // Create vote count map
      const voteMap = new Map<number, number>();
      for (const vote of allVotes) {
        const current = voteMap.get(vote.cardFid) || 0;
        voteMap.set(vote.cardFid, current + vote.voteCount);
      }

      // Calculate and sort
      const rankedCards = cards
        .map(card => ({
          fid: card.fid,
          username: card.username,
          displayName: card.displayName,
          pfpUrl: card.pfpUrl,
          cardImageUrl: card.cardImageUrl,
          rarity: card.rarity,
          mintScore: card.neynarScore,
          currentScore: card.latestNeynarScore ?? card.neynarScore,
          scoreDiff: (card.latestNeynarScore ?? card.neynarScore) - card.neynarScore,
          votes: voteMap.get(card.fid) || 0,
        }))
        .sort((a, b) => b.scoreDiff - a.scoreDiff)
        .slice(0, 200); // Cache top 200

      // Update or create cache
      const existingCache = await ctx.db
        .query("mostWantedCache")
        .withIndex("by_type", (q) => q.eq("type", "most_wanted"))
        .first();

      if (existingCache) {
        await ctx.db.patch(existingCache._id, {
          data: rankedCards,
          totalCount: cards.length,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("mostWantedCache", {
          type: "most_wanted",
          data: rankedCards,
          totalCount: cards.length,
          updatedAt: Date.now(),
        });
      }

      console.log(`✅ Most Wanted cache updated: ${rankedCards.length} cards cached, ${cards.length} total`);
      return { success: true, cached: rankedCards.length, total: cards.length };
    } catch (error) {
      console.error("❌ updateMostWantedCache error:", error);
      return { success: false, error: String(error) };
    }
  },
});
