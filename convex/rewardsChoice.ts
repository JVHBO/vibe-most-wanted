/**
 * REWARDS CHOICE SYSTEM
 *
 * Allows players to choose between "Claim Now" or "Claim Later" for rewards
 * Works with PvE, PvP, Attack, and Leaderboard systems
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Process reward choice after battle - Claim Now or Send to Inbox
 */
export const processRewardChoice = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    choice: v.union(v.literal("claim_now"), v.literal("claim_later")),
    source: v.union(
      v.literal("pve"),
      v.literal("pvp"),
      v.literal("attack"),
      v.literal("defense"),
      v.literal("leaderboard")
    ),
  },
  handler: async (ctx, { address, amount, choice, source }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (choice === "claim_now") {
      // Add coins immediately to balance
      const currentCoins = profile.coins || 0;
      const newCoinsBalance = currentCoins + amount;

      await ctx.db.patch(profile._id, {
        coins: newCoinsBalance,
        lifetimeEarned: (profile.lifetimeEarned || 0) + amount,
        lastUpdated: Date.now(),
      });

      return {
        success: true,
        choice: "claim_now",
        amount: amount,
        newBalance: newCoinsBalance,
        message: `${amount} coins claimed successfully!`,
      };
    } else {
      // Send to inbox for later claim
      const currentInbox = profile.coinsInbox || 0;
      const newInboxBalance = currentInbox + amount;

      await ctx.db.patch(profile._id, {
        coinsInbox: newInboxBalance,
        lastUpdated: Date.now(),
      });

      return {
        success: true,
        choice: "claim_later",
        amount: amount,
        newInboxBalance: newInboxBalance,
        message: `${amount} coins sent to inbox! Claim anytime from the inbox menu.`,
      };
    }
  },
});

/**
 * Get pending rewards from a completed match
 * (This is called before the choice is made)
 */
export const getPendingReward = mutation({
  args: {
    address: v.string(),
    matchId: v.id("matches"),
  },
  handler: async (ctx, { address, matchId }) => {
    const match = await ctx.db.get(matchId);

    if (!match) {
      throw new Error("Match not found");
    }

    if (match.playerAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Unauthorized: Not your match");
    }

    // Check if already claimed
    if (match.rewardsClaimed) {
      throw new Error("Rewards already claimed");
    }

    const coinsEarned = match.coinsEarned || 0;

    return {
      matchId: matchId,
      coinsEarned: coinsEarned,
      matchType: match.type,
      result: match.result,
      canClaim: coinsEarned > 0,
    };
  },
});

/**
 * Mark match as claimed after processing reward choice
 */
export const markMatchAsClaimed = mutation({
  args: {
    matchId: v.id("matches"),
    claimType: v.union(v.literal("immediate"), v.literal("inbox")),
  },
  handler: async (ctx, { matchId, claimType }) => {
    const match = await ctx.db.get(matchId);

    if (!match) {
      throw new Error("Match not found");
    }

    if (match.rewardsClaimed) {
      throw new Error("Match already marked as claimed");
    }

    await ctx.db.patch(matchId, {
      rewardsClaimed: true,
      claimedAt: Date.now(),
      claimType: claimType,
    });

    return {
      success: true,
      matchId: matchId,
      claimType: claimType,
    };
  },
});
