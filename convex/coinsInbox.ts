/**
 * COINS INBOX SYSTEM
 *
 * Manages the "claim later" feature for $TESTVBMS coins
 * Allows players to accumulate coins in their inbox and claim them later
 * Integrated with PvE, PvP, Attack, and Leaderboard reward systems
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Send battle rewards to inbox instead of claiming immediately
 */
export const sendCoinsToInbox = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    source: v.string(), // "pve", "pvp", "attack", "leaderboard"
  },
  handler: async (ctx, { address, amount }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentInbox = profile.coinsInbox || 0;

    await ctx.db.patch(profile._id, {
      coinsInbox: currentInbox + amount,
      lastUpdated: Date.now(),
    });

    return {
      success: true,
      newInboxBalance: currentInbox + amount,
      amountAdded: amount,
    };
  },
});

/**
 * Claim all coins from inbox
 */
export const claimAllCoinsFromInbox = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const inboxAmount = profile.coinsInbox || 0;

    if (inboxAmount === 0) {
      throw new Error("No coins in inbox to claim");
    }

    const currentCoins = profile.coins || 0;
    const newCoinsBalance = currentCoins + inboxAmount;

    await ctx.db.patch(profile._id, {
      coins: newCoinsBalance,
      coinsInbox: 0,
      lifetimeEarned: (profile.lifetimeEarned || 0) + inboxAmount,
      lastUpdated: Date.now(),
    });

    return {
      success: true,
      claimedAmount: inboxAmount,
      newCoinsBalance: newCoinsBalance,
    };
  },
});

/**
 * Get player's inbox status
 */
export const getInboxStatus = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      return null;
    }

    return {
      coinsInbox: profile.coinsInbox || 0, // For backward compatibility
      coins: profile.coins || 0,
      inbox: profile.coinsInbox || 0, // VBMS tokens from leaderboard/rewards
      lifetimeEarned: profile.lifetimeEarned || 0,
    };
  },
});

/**
 * Check if player has unclaimed coins
 */
export const hasUnclaimedCoins = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      return false;
    }

    return (profile.coinsInbox || 0) > 0;
  },
});
