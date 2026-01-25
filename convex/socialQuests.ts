/**
 * Social Quests Backend
 *
 * Handles social quest progress and rewards
 * Verification is done via external API, backend just tracks claims
 */

import { v } from "convex/values";
import { query, mutation, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeAddress } from "./utils";
import { createAuditLog } from "./coinAudit";

// Social Quest Rewards (halved - Vibe Clash is main mode)
// Must match lib/socialQuests.ts
const QUEST_REWARDS: Record<string, number> = {
  // SDK Actions (notifications & miniapp)
  enable_notifications: 250,  // was 500
  add_miniapp: 250,           // was 500
  // Channels
  join_vibe_most_wanted: 100, // was 200
  join_fidmfers: 100,         // was 200
  // Follows
  follow_jvhbo: 50,           // was 100
  follow_betobutter: 50,      // was 100
  follow_jayabs: 50,          // was 100
  follow_smolemaru: 50,       // was 100
  follow_denkurhq: 50,        // was 100
  follow_zazza: 50,           // was 100
  follow_bradenwolf: 50,      // was 100
  follow_viberotbangers_creator: 50, // was 100
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
 * Mark a social quest as completed (internal use only)
 *
 * 🔒 SECURITY FIX (2026-01-16): Changed from mutation to internalMutation
 * EXPLOIT PATCHED: Anyone could call this directly without verification
 * Now must be called from verified server-side code
 */
export const markQuestCompletedInternal = internalMutation({
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

// SDK quest types that can be marked complete from frontend
// These are verified client-side by Farcaster SDK
const SDK_QUEST_TYPES = ["enable_notifications", "add_miniapp"];

/**
 * Mark SDK quest as completed (for notification/miniapp quests)
 *
 * These quests are verified client-side via Farcaster SDK, so they can be
 * marked complete directly from frontend without server verification.
 */
export const markQuestCompleted = mutation({
  args: {
    address: v.string(),
    questId: v.string(),
  },
  handler: async (ctx, { address, questId }) => {
    const normalizedAddress = normalizeAddress(address);

    // Only allow SDK quest types from frontend
    if (!SDK_QUEST_TYPES.includes(questId)) {
      throw new Error("This quest type requires server verification");
    }

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

// Quest configuration for verification
const QUEST_CONFIG: Record<string, { type: string; targetFid?: number }> = {
  // Channels (auto-verified - Neynar API requires paid plan)
  join_vibe_most_wanted: { type: "channel" },
  join_fidmfers: { type: "channel" },
  // Follows
  follow_jvhbo: { type: "follow", targetFid: 893424 },
  follow_betobutter: { type: "follow", targetFid: 17715 },
  follow_jayabs: { type: "follow", targetFid: 9314 },
  follow_smolemaru: { type: "follow", targetFid: 5966 },
  follow_denkurhq: { type: "follow", targetFid: 545270 },
  follow_zazza: { type: "follow", targetFid: 193506 },
  follow_bradenwolf: { type: "follow", targetFid: 20911 },
  follow_viberotbangers_creator: { type: "follow", targetFid: 17715 },
};

/**
 * Verify and complete a follow/channel quest
 *
 * This action verifies the quest completion via Neynar API and marks it complete.
 * Used for follow/channel quests that need server-side verification.
 */
export const verifyAndCompleteQuest = action({
  args: {
    address: v.string(),
    questId: v.string(),
    userFid: v.number(),
  },
  handler: async (ctx, { address, questId, userFid }) => {
    const config = QUEST_CONFIG[questId];
    if (!config) {
      throw new Error("Invalid quest ID for verification");
    }

    let completed = false;

    if (config.type === "follow" && config.targetFid) {
      // Verify follow via Neynar
      const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
      if (!NEYNAR_API_KEY) {
        throw new Error("NEYNAR_API_KEY not configured");
      }

      try {
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${config.targetFid}&viewer_fid=${userFid}`,
          {
            headers: {
              accept: "application/json",
              api_key: NEYNAR_API_KEY,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.users && data.users.length > 0) {
            completed = data.users[0].viewer_context?.following === true;
          }
        }
      } catch (error) {
        console.error("Neynar verification failed:", error);
        throw new Error("Failed to verify quest. Please try again.");
      }
    } else if (config.type === "channel") {
      // Auto-verify channel quests (Neynar API requires paid plan)
      completed = true;
    }

    if (!completed) {
      return { completed: false, message: "Quest not completed yet" };
    }

    // Mark as completed via internal mutation
    await ctx.runMutation(internal.socialQuests.markQuestCompletedInternal, {
      address,
      questId,
    });

    return { completed: true, message: "Quest verified and marked complete!" };
  },
});
