/**
 * COINS INBOX SYSTEM
 *
 * Manages the "claim later" feature for $TESTVBMS coins
 * Allows players to accumulate coins in their inbox and claim them later
 * Integrated with PvE, PvP, Attack, and Leaderboard reward systems
 */

import { v } from "convex/values";
import { mutation, query, internalMutation, MutationCtx } from "./_generated/server";

/**
 * Internal helper to log coin transactions - can be called from any mutation
 * Use this to track ALL coin movements in the system
 */
export async function logTransaction(
  ctx: MutationCtx,
  args: {
    address: string;
    type: 'earn' | 'claim' | 'convert' | 'spend' | 'bonus' | 'refund';
    amount: number;
    source: string;
    description: string;
    balanceBefore: number;
    balanceAfter: number;
    txHash?: string;
  }
) {
  await ctx.db.insert("coinTransactions", {
    address: args.address.toLowerCase(),
    type: args.type,
    amount: args.amount,
    source: args.source,
    description: args.description,
    balanceBefore: args.balanceBefore,
    balanceAfter: args.balanceAfter,
    timestamp: Date.now(),
    txHash: args.txHash,
  });
}

/**
 * Send battle rewards to inbox instead of claiming immediately
 */
export const sendCoinsToInbox = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    source: v.string(), // "pve", "pvp", "attack", "leaderboard"
  },
  handler: async (ctx, { address, amount, source }) => {
    const normalizedAddress = address.toLowerCase();
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentInbox = profile.coinsInbox || 0;
    const newInbox = currentInbox + amount;

    await ctx.db.patch(profile._id, {
      coinsInbox: newInbox,
      lastUpdated: Date.now(),
    });

    // Register transaction in history
    await ctx.db.insert("coinTransactions", {
      address: normalizedAddress,
      type: "earn",
      amount,
      source,
      description: `Earned ${amount} coins from ${source}`,
      balanceBefore: currentInbox,
      balanceAfter: newInbox,
      timestamp: Date.now(),
    });

    return {
      success: true,
      newInboxBalance: newInbox,
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
    const normalizedAddress = address.toLowerCase();
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
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

    // Register claim transaction
    await ctx.db.insert("coinTransactions", {
      address: normalizedAddress,
      type: "claim",
      amount: inboxAmount,
      source: "inbox",
      description: `Claimed ${inboxAmount} coins from inbox to balance`,
      balanceBefore: currentCoins,
      balanceAfter: newCoinsBalance,
      timestamp: Date.now(),
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

    // Calculate cooldown remaining (3 minutes = 180000ms)
    const COOLDOWN_MS = 3 * 60 * 1000;
    const lastConversion = profile.pendingConversionTimestamp || 0;
    const timeSinceLastConversion = Date.now() - lastConversion;
    const cooldownRemaining = lastConversion > 0 && timeSinceLastConversion < COOLDOWN_MS
      ? Math.ceil((COOLDOWN_MS - timeSinceLastConversion) / 1000)
      : 0;

    return {
      coinsInbox: profile.coinsInbox || 0, // For backward compatibility
      coins: profile.coins || 0,
      inbox: profile.coinsInbox || 0, // TESTVBMS inbox (rewards accumulate here)
      lifetimeEarned: profile.lifetimeEarned || 0,
      cooldownRemaining, // Seconds until next conversion allowed (0 = ready)
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

/**
 * Get transaction history for player
 */
export const getTransactionHistory = query({
  args: {
    address: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { address, limit = 50 }) => {
    const normalizedAddress = address.toLowerCase();

    const transactions = await ctx.db
      .query("coinTransactions")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .order("desc")
      .take(limit);

    return transactions;
  },
});

/**
 * Internal helper to log any coin transaction
 * Can be imported and used by other modules
 */
export const logCoinTransaction = mutation({
  args: {
    address: v.string(),
    type: v.string(), // 'earn' | 'claim' | 'convert' | 'spend' | 'bonus' | 'refund'
    amount: v.number(),
    source: v.string(), // 'pve', 'pvp', 'attack', 'boss', 'mission', 'quest', 'shame', 'leaderboard', 'convert', etc
    description: v.string(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    await ctx.db.insert("coinTransactions", {
      address: normalizedAddress,
      type: args.type,
      amount: args.amount,
      source: args.source,
      description: args.description,
      balanceBefore: args.balanceBefore,
      balanceAfter: args.balanceAfter,
      timestamp: Date.now(),
      txHash: args.txHash,
    });

    return { success: true };
  },
});
