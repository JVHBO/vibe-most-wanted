/**
 * Social Quests Backend
 *
 * Handles social quest progress and rewards
 * Verification is done via external API, backend just tracks claims
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { normalizeAddress } from "./utils";
import { createAuditLog } from "./coinAudit";

// Social Quest Rewards (must match lib/socialQuests.ts)
// REDUCED Jan 14 2026 - Sybil attack mitigation
// Removed collections no longer on site: cumioh, history-of-computer, tarot
const QUEST_REWARDS: Record<string, number> = {
  // SDK Actions (notifications & miniapp - 500 VBMS each)
  enable_notifications: 500,
  add_miniapp: 500,
  // Channels - 200 each
  join_vibe_most_wanted: 200,
  join_fidmfers: 200,
  // Follows - 100 each (only active collections)
  follow_jvhbo: 100,
  follow_betobutter: 100,
  follow_jayabs: 100,
  follow_smolemaru: 100,
  follow_denkurhq: 100,
  follow_zazza: 100,
  follow_bradenwolf: 100,
  follow_viberotbangers_creator: 100,
};

// VibeFID contract for 2x bonus check
const VIBEFID_CONTRACT = "0x60274a138d026e3cb337b40567100fdec3127565";

/**
 * Check if player has 2x bonus (VibeFID or VIBE Badge)
 */
async function has2xBonus(ctx: any, playerAddress: string): Promise<{ has2x: boolean; reason: string }> {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_address", (q: any) => q.eq("address", playerAddress))
    .first();

  if (!profile) return { has2x: false, reason: "" };

  // Check VIBE Badge first (stored in profile)
  if (profile.hasVibeBadge) {
    return { has2x: true, reason: "VIBE Badge" };
  }

  // Check VibeFID ownership
  if (profile.ownedTokenIds?.some((id: string) => id.toLowerCase().startsWith("vibefid:"))) {
    return { has2x: true, reason: "VibeFID" };
  }

  return { has2x: false, reason: "" };
}

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

    // Get base reward amount
    const baseReward = QUEST_REWARDS[questId];
    if (!baseReward) {
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

    // Check for 2x bonus (VibeFID or VIBE Badge)
    const bonusCheck = await has2xBonus(ctx, normalizedAddress);
    const multiplier = bonusCheck.has2x ? 2 : 1;
    const reward = baseReward * multiplier;
    const bonusText = bonusCheck.has2x ? ` (2x ${bonusCheck.reason})` : "";

    // Add coins to balance
    const currentBalance = profile.coins || 0;
    const newBalance = currentBalance + reward;
    const newLifetimeEarned = (profile.lifetimeEarned || 0) + reward;

    await ctx.db.patch(profile._id, {
      coins: newBalance,
      lifetimeEarned: newLifetimeEarned,
      lastUpdated: Date.now(),
    });

    // 📊 Log transaction
    await ctx.db.insert("coinTransactions", {
      address: normalizedAddress,
      amount: reward,
      type: "earn",
      source: "social_quest",
      description: `Social quest: ${questId}${bonusText}`,
      timestamp: Date.now(),
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
    });

    // 🔒 SECURITY: Add audit log for tracking
    await createAuditLog(
      ctx,
      normalizedAddress,
      "earn",
      reward,
      currentBalance,
      newBalance,
      "social_quest",
      questId,
      { reason: `Social quest completed: ${questId}${bonusText}` }
    );

    console.log(`💰 Social quest reward: ${reward} coins for ${normalizedAddress}${bonusText}. Balance: ${currentBalance} → ${newBalance}`);

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
