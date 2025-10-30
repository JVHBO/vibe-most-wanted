import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * PROFILE QUERIES & MUTATIONS
 *
 * Replaces ProfileService from Firebase
 */

// ============================================================================
// QUERIES (read data)
// ============================================================================

/**
 * Get a profile by wallet address
 */
export const getProfile = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    return profile;
  },
});

/**
 * Get leaderboard (top 100 by total power)
 */
export const getLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_total_power")
      .order("desc")
      .take(limit);

    return profiles;
  },
});

/**
 * Check if username is available
 */
export const isUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) =>
        q.eq("username", username.toLowerCase())
      )
      .first();

    return !existing;
  },
});

/**
 * Get profile by username
 */
export const getProfileByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) =>
        q.eq("username", username.toLowerCase())
      )
      .first();

    return profile;
  },
});

// ============================================================================
// MUTATIONS (write data)
// ============================================================================

/**
 * Create or update a profile
 */
export const upsertProfile = mutation({
  args: {
    address: v.string(),
    username: v.string(),
    stats: v.optional(
      v.object({
        totalPower: v.number(),
        totalCards: v.number(),
        openedCards: v.number(),
        unopenedCards: v.number(),
        pveWins: v.number(),
        pveLosses: v.number(),
        pvpWins: v.number(),
        pvpLosses: v.number(),
        attackWins: v.number(),
        attackLosses: v.number(),
        defenseWins: v.number(),
        defenseLosses: v.number(),
      })
    ),
    defenseDeck: v.optional(v.array(
      v.object({
        tokenId: v.string(),
        power: v.number(),
        imageUrl: v.string(),
        name: v.string(),
        rarity: v.string(),
      })
    )),
    twitter: v.optional(v.string()),
    twitterHandle: v.optional(v.string()),
    fid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();
    const username = args.username.toLowerCase();

    // Check if profile exists
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing profile
      await ctx.db.patch(existing._id, {
        ...args,
        address,
        username,
        lastUpdated: now,
      });
      return existing._id;
    } else {
      // Create new profile
      const newId = await ctx.db.insert("profiles", {
        address,
        username,
        stats: args.stats || {
          totalPower: 0,
          totalCards: 0,
          openedCards: 0,
          unopenedCards: 0,
          pveWins: 0,
          pveLosses: 0,
          pvpWins: 0,
          pvpLosses: 0,
          attackWins: 0,
          attackLosses: 0,
          defenseWins: 0,
          defenseLosses: 0,
        },
        defenseDeck: args.defenseDeck,
        attacksToday: 0,
        rematchesToday: 0,
        twitter: args.twitter,
        twitterHandle: args.twitterHandle,
        createdAt: now,
        lastUpdated: now,
      });
      return newId;
    }
  },
});

/**
 * Update profile stats
 */
export const updateStats = mutation({
  args: {
    address: v.string(),
    stats: v.object({
      totalPower: v.number(),
      totalCards: v.number(),
      openedCards: v.number(),
      unopenedCards: v.number(),
      pveWins: v.number(),
      pveLosses: v.number(),
      pvpWins: v.number(),
      pvpLosses: v.number(),
      attackWins: v.number(),
      attackLosses: v.number(),
      defenseWins: v.number(),
      defenseLosses: v.number(),
    }),
  },
  handler: async (ctx, { address, stats }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    await ctx.db.patch(profile._id, {
      stats,
      lastUpdated: Date.now(),
    });
  },
});

/**
 * Update defense deck
 */
export const updateDefenseDeck = mutation({
  args: {
    address: v.string(),
    defenseDeck: v.array(
      v.object({
        tokenId: v.string(),
        power: v.number(),
        imageUrl: v.string(),
        name: v.string(),
        rarity: v.string(),
      })
    ),
  },
  handler: async (ctx, { address, defenseDeck }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    await ctx.db.patch(profile._id, {
      defenseDeck,
      lastUpdated: Date.now(),
    });
  },
});

/**
 * Update attacks today
 */
export const updateAttacks = mutation({
  args: {
    address: v.string(),
    attacksToday: v.number(),
    lastAttackDate: v.string(),
  },
  handler: async (ctx, { address, attacksToday, lastAttackDate }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    await ctx.db.patch(profile._id, {
      attacksToday,
      lastAttackDate,
      lastUpdated: Date.now(),
    });
  },
});

/**
 * Increment a stat (useful for wins/losses)
 */
export const incrementStat = mutation({
  args: {
    address: v.string(),
    stat: v.union(
      v.literal("pvpWins"),
      v.literal("pvpLosses"),
      v.literal("attackWins"),
      v.literal("attackLosses"),
      v.literal("defenseWins"),
      v.literal("defenseLosses")
    ),
  },
  handler: async (ctx, { address, stat }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    const newStats = { ...profile.stats };
    newStats[stat] = (newStats[stat] || 0) + 1;

    await ctx.db.patch(profile._id, {
      stats: newStats,
      lastUpdated: Date.now(),
    });
  },
});

// ============================================================================
// SECURE MUTATIONS (With Web3 Authentication)
// ============================================================================

import {
  authenticateActionWithBackend,
  verifyNonce,
  incrementNonce,
} from "./auth";

/**
 * SECURE: Update stats with Web3 signature verification
 *
 * Required message format:
 * "Update stats: {address} nonce:{N} at {timestamp}"
 */
export const updateStatsSecure = mutation({
  args: {
    address: v.string(),
    signature: v.string(),
    message: v.string(),
    stats: v.object({
      totalPower: v.number(),
      totalCards: v.number(),
      openedCards: v.number(),
      unopenedCards: v.number(),
      pveWins: v.number(),
      pveLosses: v.number(),
      pvpWins: v.number(),
      pvpLosses: v.number(),
      attackWins: v.number(),
      attackLosses: v.number(),
      defenseWins: v.number(),
      defenseLosses: v.number(),
    }),
  },
  handler: async (ctx, { address, signature, message, stats }) => {
    // 1. Authenticate with full backend ECDSA verification
    const auth = await authenticateActionWithBackend(ctx, address, signature, message);
    if (!auth.success) {
      throw new Error(`Unauthorized: ${auth.error}`);
    }

    // 2. Verify nonce (prevent replay attacks)
    const nonceValid = await verifyNonce(ctx, address, message);
    if (!nonceValid) {
      throw new Error("Invalid nonce - possible replay attack");
    }

    // 3. Perform the action (same as original mutation)
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    await ctx.db.patch(profile._id, {
      stats,
      lastUpdated: Date.now(),
    });

    // 4. Increment nonce for next action
    await incrementNonce(ctx, address);

    console.log("✅ SECURE: Stats updated for", address);
  },
});

/**
 * SECURE: Update defense deck with Web3 signature verification
 */
export const updateDefenseDeckSecure = mutation({
  args: {
    address: v.string(),
    signature: v.string(),
    message: v.string(),
    defenseDeck: v.array(
      v.object({
        tokenId: v.string(),
        power: v.number(),
        imageUrl: v.string(),
        name: v.string(),
        rarity: v.string(),
      })
    ),
  },
  handler: async (ctx, { address, signature, message, defenseDeck }) => {
    // 1. Authenticate with full backend ECDSA verification
    const auth = await authenticateActionWithBackend(ctx, address, signature, message);
    if (!auth.success) {
      throw new Error(`Unauthorized: ${auth.error}`);
    }

    // 2. Verify nonce
    const nonceValid = await verifyNonce(ctx, address, message);
    if (!nonceValid) {
      throw new Error("Invalid nonce - possible replay attack");
    }

    // 3. Perform action
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    await ctx.db.patch(profile._id, {
      defenseDeck,
      lastUpdated: Date.now(),
    });

    // 4. Increment nonce
    await incrementNonce(ctx, address);

    console.log("✅ SECURE: Defense deck updated for", address);
  },
});

/**
 * SECURE: Increment a stat with Web3 signature verification
 */
export const incrementStatSecure = mutation({
  args: {
    address: v.string(),
    signature: v.string(),
    message: v.string(),
    stat: v.union(
      v.literal("pvpWins"),
      v.literal("pvpLosses"),
      v.literal("attackWins"),
      v.literal("attackLosses"),
      v.literal("defenseWins"),
      v.literal("defenseLosses")
    ),
  },
  handler: async (ctx, { address, signature, message, stat }) => {
    // 1. Authenticate with full backend ECDSA verification
    const auth = await authenticateActionWithBackend(ctx, address, signature, message);
    if (!auth.success) {
      throw new Error(`Unauthorized: ${auth.error}`);
    }

    // 2. Verify nonce
    const nonceValid = await verifyNonce(ctx, address, message);
    if (!nonceValid) {
      throw new Error("Invalid nonce - possible replay attack");
    }

    // 3. Perform action
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    const newStats = { ...profile.stats };
    newStats[stat] = (newStats[stat] || 0) + 1;

    await ctx.db.patch(profile._id, {
      stats: newStats,
      lastUpdated: Date.now(),
    });

    // 4. Increment nonce
    await incrementNonce(ctx, address);

    console.log(`✅ SECURE: ${stat} incremented for`, address);
  },
});
