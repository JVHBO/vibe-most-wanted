/**
 * Social Quests Backend
 *
 * Handles social quest progress and rewards
 * Verification is done via external API, backend just tracks claims
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { normalizeAddress } from "./utils";

// Social Quest Rewards (must match lib/socialQuests.ts)
const QUEST_REWARDS: Record<string, number> = {
  // Channels
  join_vibe_most_wanted: 500,
  join_cumioh: 500,
  join_fidmfers: 500,
  // Follows
  follow_jvhbo: 500,
  follow_betobutter: 500,
  follow_morlacos: 500,
  follow_jayabs: 500,
  follow_degencummunist: 500,
  follow_smolemaru: 500,
  follow_denkurhq: 500,
  follow_zazza: 500,
  follow_loground: 500,
  follow_sartocrates: 500,
  follow_bradenwolf: 500,
  follow_viberotbangers_creator: 500,
};

/**
 * Get social quest progress for a player
 */
export const getSocialQuestProgress = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = normalizeAddress(address);

    const progress = await ctx.db
      .query("socialQuestProgress")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .collect();

    // Convert to map for easy lookup
    const progressMap: Record<string, { completed: boolean; claimed: boolean; claimedAt?: number }> = {};
    for (const p of progress) {
      progressMap[p.questId] = {
        completed: p.completed,
        claimed: p.claimed,
        claimedAt: p.claimedAt,
      };
    }

    return progressMap;
  },
});

/**
 * Mark a social quest as completed (called after API verification)
 */
export const markQuestCompleted = mutation({
  args: {
    address: v.string(),
    questId: v.string(),
  },
  handler: async (ctx, { address, questId }) => {
    const normalizedAddress = normalizeAddress(address);

    // Check if quest exists in rewards
    if (!QUEST_REWARDS[questId]) {
      throw new Error("Invalid quest ID");
    }

    // Check if already marked
    const existing = await ctx.db
      .query("socialQuestProgress")
      .withIndex("by_player_quest", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("questId", questId)
      )
      .first();

    if (existing) {
      if (!existing.completed) {
        await ctx.db.patch(existing._id, {
          completed: true,
          completedAt: Date.now(),
        });
      }
      return { success: true, alreadyCompleted: existing.completed };
    }

    // Create new progress entry
    await ctx.db.insert("socialQuestProgress", {
      playerAddress: normalizedAddress,
      questId,
      completed: true,
      completedAt: Date.now(),
      claimed: false,
    });

    return { success: true, alreadyCompleted: false };
  },
});

/**
 * Claim social quest reward
 */
export const claimSocialQuestReward = mutation({
  args: {
    address: v.string(),
    questId: v.string(),
  },
  handler: async (ctx, { address, questId }) => {
    const normalizedAddress = normalizeAddress(address);

    // Get reward amount
    const reward = QUEST_REWARDS[questId];
    if (!reward) {
      throw new Error("Invalid quest ID");
    }

    // Get quest progress
    const progress = await ctx.db
      .query("socialQuestProgress")
      .withIndex("by_player_quest", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("questId", questId)
      )
      .first();

    if (!progress) {
      throw new Error("Quest not completed yet");
    }

    if (!progress.completed) {
      throw new Error("Quest not completed yet");
    }

    if (progress.claimed) {
      throw new Error("Reward already claimed");
    }

    // Get player profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Add coins to balance
    const currentBalance = profile.coins || 0;
    const newBalance = currentBalance + reward;
    const newLifetimeEarned = (profile.lifetimeEarned || 0) + reward;

    await ctx.db.patch(profile._id, {
      coins: newBalance,
      lifetimeEarned: newLifetimeEarned,
      lastUpdated: Date.now(),
    });

    console.log(`💰 Social quest reward: ${reward} TESTVBMS for ${normalizedAddress}. Balance: ${currentBalance} → ${newBalance}`);

    // Mark as claimed
    await ctx.db.patch(progress._id, {
      claimed: true,
      claimedAt: Date.now(),
    });

    return {
      success: true,
      reward,
      newBalance,
      questId,
    };
  },
});

/**
 * Get total claimable social quest rewards
 */
export const getClaimableSocialRewards = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = normalizeAddress(address);

    const progress = await ctx.db
      .query("socialQuestProgress")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), true),
          q.eq(q.field("claimed"), false)
        )
      )
      .collect();

    let totalClaimable = 0;
    const claimableQuests: string[] = [];

    for (const p of progress) {
      const reward = QUEST_REWARDS[p.questId];
      if (reward) {
        totalClaimable += reward;
        claimableQuests.push(p.questId);
      }
    }

    return {
      totalClaimable,
      claimableQuests,
      count: claimableQuests.length,
    };
  },
});
