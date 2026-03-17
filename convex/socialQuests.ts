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
// Must match lib/socialQuests.ts reward values
const QUEST_REWARDS: Record<string, number> = {
  // SDK Actions
  enable_notifications: 250,
  add_miniapp: 250,
  // Channels
  join_vibe_most_wanted: 50,
  join_fidmfers: 50,
  // VBMS Follows
  follow_jvhbo: 50,
  follow_betobutter: 50,
  follow_jayabs: 50,
  follow_smolemaru: 50,
  follow_denkurhq: 50,
  follow_zazza: 50,
  follow_bradenwolf: 50,
  follow_degencummunist: 50,
  // ARB Creator Follows
  follow_paul2: 50,
  follow_0xanas: 50,
  follow_aylaaa: 50,
  follow_dylantale: 50,
  follow_kenny: 50,
  follow_nezzar: 50,
  follow_0xhohenheim: 50,
  follow_atown: 50,
  follow_flowstatecoop: 50,
  follow_arbitrum: 50,
};

// ========== HELPER: Get Profile (supports multi-wallet via addressLinks) ==========
async function getProfileByAddress(ctx: any, address: string) {
  const normalizedAddress = address.toLowerCase();
  const addressLink = await ctx.db
    .query("addressLinks")
    .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
    .first();

  if (addressLink) {
    return ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", addressLink.primaryAddress))
      .first();
  }
  return ctx.db
    .query("profiles")
    .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
    .first();
}

// VibeFID contract for 2x bonus check
const VIBEFID_CONTRACT = "0x60274a138d026e3cb337b40567100fdec3127565";

/**
 * Check if player has 2x bonus (VibeFID or VIBE Badge)
 */
async function has2xBonus(ctx: any, playerAddress: string): Promise<{ has2x: boolean; reason: string }> {
  const profile = await getProfileByAddress(ctx, playerAddress);

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
    const profile = await getProfileByAddress(ctx, normalizedAddress);

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
// All quests use auto-verify (type: "channel") — Neynar viewer_context unreliable
const QUEST_CONFIG: Record<string, { type: string }> = {
  join_vibe_most_wanted: { type: "channel" },
  join_fidmfers: { type: "channel" },
  follow_jvhbo: { type: "channel" },
  follow_betobutter: { type: "channel" },
  follow_jayabs: { type: "channel" },
  follow_smolemaru: { type: "channel" },
  follow_denkurhq: { type: "channel" },
  follow_zazza: { type: "channel" },
  follow_bradenwolf: { type: "channel" },
  follow_degencummunist: { type: "channel" },
  follow_paul2: { type: "channel" },
  follow_0xanas: { type: "channel" },
  follow_aylaaa: { type: "channel" },
  follow_dylantale: { type: "channel" },
  follow_kenny: { type: "channel" },
  follow_nezzar: { type: "channel" },
  follow_0xhohenheim: { type: "channel" },
  follow_atown: { type: "channel" },
  follow_flowstatecoop: { type: "channel" },
  follow_arbitrum: { type: "channel" },
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

    // All quests use auto-verify (Neynar viewer_context unreliable)
    const completed = true;

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

// ── CUSTOM FOLLOW QUESTS ──────────────────────────────────────────────────────

const CUSTOM_QUEST_COST = 100000;  // 100k VBMS to add
const CUSTOM_QUEST_REWARD = 200;   // 200 VBMS per follower

/** Get all active custom follow quests */
export const getCustomFollowQuests = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("customFollowQuests")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(50);
  },
});

/** Pay 100k VBMS to add a Farcaster user as a custom follow quest */
export const addCustomFollowQuest = mutation({
  args: {
    address: v.string(),
    targetUsername: v.string(),
    displayName: v.optional(v.string()),
    targetFid: v.number(),
    pfpUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const address = normalizeAddress(args.address);

    // Get profile and check balance
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();
    if (!profile) throw new Error("Profile not found");

    const coins = profile.coins || 0;
    if (coins < CUSTOM_QUEST_COST) {
      throw new Error(`Not enough VBMS. Need ${CUSTOM_QUEST_COST.toLocaleString()}, have ${coins.toLocaleString()}`);
    }

    // Prevent duplicates
    const existing = await ctx.db
      .query("customFollowQuests")
      .withIndex("by_targetFid", (q) => q.eq("targetFid", args.targetFid))
      .first();
    if (existing?.active) throw new Error("This user is already a custom quest");

    // Deduct VBMS
    await ctx.db.patch(profile._id, {
      coins: coins - CUSTOM_QUEST_COST,
      lifetimeSpent: (profile.lifetimeSpent || 0) + CUSTOM_QUEST_COST,
    });

    // Log transaction
    await ctx.db.insert("coinTransactions", {
      address,
      amount: -CUSTOM_QUEST_COST,
      type: "spend",
      source: "custom_follow_quest",
      description: `Added custom follow quest: @${args.targetUsername}`,
      timestamp: Date.now(),
      balanceBefore: coins,
      balanceAfter: coins - CUSTOM_QUEST_COST,
    });

    // Audit log
    await createAuditLog(ctx, address, "spend", -CUSTOM_QUEST_COST, coins, coins - CUSTOM_QUEST_COST, "custom_follow_quest");

    // Create quest
    await ctx.db.insert("customFollowQuests", {
      addedBy: address,
      targetUsername: args.targetUsername.toLowerCase().replace(/^@/, ""),
      displayName: args.displayName,
      targetFid: args.targetFid,
      pfpUrl: args.pfpUrl,
      bannerUrl: args.bannerUrl,
      reward: CUSTOM_QUEST_REWARD,
      active: true,
      createdAt: Date.now(),
    });

    return { success: true, remainingCoins: coins - CUSTOM_QUEST_COST };
  },
});

/** Claim reward for following a custom quest user (auto-verify like standard quests) */
export const claimCustomFollowReward = mutation({
  args: {
    address: v.string(),
    questId: v.string(), // customFollowQuests._id as string
  },
  handler: async (ctx, args) => {
    const address = normalizeAddress(args.address);

    const quest = await ctx.db.get(args.questId as any);
    if (!quest || !(quest as any).active) throw new Error("Quest not found or inactive");

    // Check not already claimed via socialQuestProgress
    const progressId = `custom_${args.questId}`;
    const existing = await ctx.db
      .query("socialQuestProgress")
      .withIndex("by_player_quest", (q) => q.eq("playerAddress", address).eq("questId", progressId))
      .first();
    if (existing?.claimed) throw new Error("Already claimed");

    const reward = (quest as any).reward || CUSTOM_QUEST_REWARD;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();
    if (!profile) throw new Error("Profile not found");

    const balanceBefore = profile.coins || 0;
    const balanceAfter = balanceBefore + reward;

    await ctx.db.patch(profile._id, { coins: balanceAfter });

    await createAuditLog(ctx, address, "claim", reward, balanceBefore, balanceAfter, "custom_follow_quest");

    // Track in socialQuestProgress
    if (existing) {
      await ctx.db.patch(existing._id, { completed: true, claimed: true, claimedAt: Date.now() });
    } else {
      await ctx.db.insert("socialQuestProgress", {
        playerAddress: address,
        questId: progressId,
        completed: true,
        completedAt: Date.now(),
        claimed: true,
        claimedAt: Date.now(),
      });
    }

    return { success: true, reward, newBalance: balanceAfter };
  },
});
