/**
 * Player Quests — Social quests created by players, distributed via VibeMail
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { normalizeAddress } from "./utils";
import { createAuditLog } from "./coinAudit";

const FEE_PERCENT = 0.1; // 10% platform fee
const MIN_REWARD = 50;
const MAX_REWARD = 5000;
const MAX_COMPLETERS = 20;
const QUEST_DURATION_MS = 48 * 60 * 60 * 1000; // 48h

async function getProfile(ctx: any, address: string) {
  const normalized = normalizeAddress(address);
  return ctx.db
    .query("profiles")
    .withIndex("by_address", (q: any) => q.eq("address", normalized))
    .first();
}

/**
 * Create a player quest. Deducts totalCost = reward * completers * (1 + FEE_PERCENT) from creator.
 */
export const createPlayerQuest = mutation({
  args: {
    address: v.string(),
    fid: v.number(),
    username: v.string(),
    questType: v.union(
      v.literal("follow_me"),
      v.literal("join_channel"),
      v.literal("rt_cast"),
      v.literal("use_miniapp")
    ),
    targetUrl: v.string(),
    targetDisplay: v.string(),
    rewardPerCompleter: v.number(),
    maxCompleters: v.number(),
  },
  handler: async (ctx, args) => {
    const normalized = normalizeAddress(args.address);

    // Validate inputs
    if (args.rewardPerCompleter < MIN_REWARD || args.rewardPerCompleter > MAX_REWARD) {
      throw new Error(`Reward must be between ${MIN_REWARD} and ${MAX_REWARD} coins`);
    }
    if (args.maxCompleters < 1 || args.maxCompleters > MAX_COMPLETERS) {
      throw new Error(`Max completers must be between 1 and ${MAX_COMPLETERS}`);
    }
    if (!args.targetUrl.trim()) {
      throw new Error("Target URL/handle is required");
    }

    const rewardPool = args.rewardPerCompleter * args.maxCompleters;
    const fee = Math.ceil(rewardPool * FEE_PERCENT);
    const totalCost = rewardPool + fee;

    // Get profile and check balance
    const profile = await getProfile(ctx, normalized);
    if (!profile) throw new Error("Profile not found");
    if ((profile.coins || 0) < totalCost) {
      throw new Error(`Insufficient coins. Need ${totalCost}, have ${profile.coins || 0}`);
    }

    const now = Date.now();
    const balanceBefore = profile.coins || 0;
    const balanceAfter = balanceBefore - totalCost;

    // Deduct coins
    await ctx.db.patch(profile._id, {
      coins: balanceAfter,
      lastUpdated: now,
    });

    // Log transaction
    await ctx.db.insert("coinTransactions", {
      address: normalized,
      amount: -totalCost,
      type: "spend",
      source: "player_quest_create",
      description: `Created quest: ${args.questType} (${args.maxCompleters} slots × ${args.rewardPerCompleter} + ${fee} fee)`,
      timestamp: now,
      balanceBefore,
      balanceAfter,
    });

    await createAuditLog(ctx, normalized, "spend", totalCost, balanceBefore, balanceAfter, "player_quest_create", args.questType);

    // Create quest
    const questId = await ctx.db.insert("playerQuests", {
      creatorAddress: normalized,
      creatorFid: args.fid,
      creatorUsername: args.username,
      questType: args.questType,
      targetUrl: args.targetUrl.trim(),
      targetDisplay: args.targetDisplay.trim(),
      rewardPerCompleter: args.rewardPerCompleter,
      maxCompleters: args.maxCompleters,
      completedCount: 0,
      totalCostLocked: rewardPool,
      status: "active",
      createdAt: now,
      expiresAt: now + QUEST_DURATION_MS,
    });

    return { success: true, questId, totalCost, fee };
  },
});

/**
 * Pay quest reward to a completer. Called from Next.js API route after Neynar verification.
 * Secured by VMW_INTERNAL_SECRET.
 */
export const payQuestReward = mutation({
  args: {
    secret: v.string(),
    questId: v.id("playerQuests"),
    completerAddress: v.string(),
    completerFid: v.number(),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.VMW_INTERNAL_SECRET;
    if (!expectedSecret || args.secret !== expectedSecret) {
      throw new Error("Unauthorized");
    }

    const normalized = normalizeAddress(args.completerAddress);
    const quest = await ctx.db.get(args.questId);
    if (!quest) throw new Error("Quest not found");
    if (quest.status !== "active") throw new Error("Quest is no longer active");

    const now = Date.now();
    if (now > quest.expiresAt) throw new Error("Quest has expired");
    if (quest.completedCount >= quest.maxCompleters) throw new Error("Quest is full");

    // Check not already completed
    const existing = await ctx.db
      .query("playerQuestCompletions")
      .withIndex("by_completer_quest", (q) =>
        q.eq("completerFid", args.completerFid).eq("questId", args.questId)
      )
      .first();
    if (existing) throw new Error("Already completed this quest");

    // Get completer profile
    const profile = await getProfile(ctx, normalized);
    if (!profile) throw new Error("Completer profile not found");

    const reward = quest.rewardPerCompleter;
    const balanceBefore = profile.coins || 0;
    const balanceAfter = balanceBefore + reward;

    // Pay completer
    await ctx.db.patch(profile._id, {
      coins: balanceAfter,
      lifetimeEarned: (profile.lifetimeEarned || 0) + reward,
      lastUpdated: now,
    });

    // Log
    await ctx.db.insert("coinTransactions", {
      address: normalized,
      amount: reward,
      type: "earn",
      source: "player_quest_complete",
      description: `Completed quest: ${quest.questType} by @${quest.creatorUsername}`,
      timestamp: now,
      balanceBefore,
      balanceAfter,
    });

    await createAuditLog(ctx, normalized, "earn", reward, balanceBefore, balanceAfter, "player_quest_complete", args.questId);

    // Record completion
    await ctx.db.insert("playerQuestCompletions", {
      questId: args.questId,
      completerAddress: normalized,
      completerFid: args.completerFid,
      completedAt: now,
      rewardPaid: reward,
    });

    // Update quest
    const newCount = quest.completedCount + 1;
    const isNowFull = newCount >= quest.maxCompleters;
    await ctx.db.patch(args.questId, {
      completedCount: newCount,
      status: isNowFull ? "completed" : "active",
    });

    return { success: true, reward, newCount };
  },
});

/**
 * Cancel a quest and refund unclaimed coins.
 */
export const cancelPlayerQuest = mutation({
  args: {
    address: v.string(),
    questId: v.id("playerQuests"),
  },
  handler: async (ctx, args) => {
    const normalized = normalizeAddress(args.address);
    const quest = await ctx.db.get(args.questId);
    if (!quest) throw new Error("Quest not found");
    if (quest.creatorAddress !== normalized) throw new Error("Not your quest");
    if (quest.status !== "active") throw new Error("Quest is not active");

    // Calculate refund (unclaimed reward pool only — fee is non-refundable)
    const remainingSlots = quest.maxCompleters - quest.completedCount;
    const refund = remainingSlots * quest.rewardPerCompleter;

    if (refund > 0) {
      const profile = await getProfile(ctx, normalized);
      if (profile) {
        const now = Date.now();
        const balanceBefore = profile.coins || 0;
        const balanceAfter = balanceBefore + refund;

        await ctx.db.patch(profile._id, {
          coins: balanceAfter,
          lastUpdated: now,
        });

        await ctx.db.insert("coinTransactions", {
          address: normalized,
          amount: refund,
          type: "earn",
          source: "player_quest_refund",
          description: `Quest refund: ${remainingSlots} unclaimed slots`,
          timestamp: now,
          balanceBefore,
          balanceAfter,
        });

        await createAuditLog(ctx, normalized, "earn", refund, balanceBefore, balanceAfter, "player_quest_refund", args.questId);
      }
    }

    await ctx.db.patch(args.questId, { status: "cancelled" });

    return { success: true, refund };
  },
});

/**
 * Get active quests (excludes creator's own quests and already-completed by completer).
 */
export const getActiveQuests = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const now = Date.now();

    const quests = await ctx.db
      .query("playerQuests")
      .withIndex("by_status_created", (q) => q.eq("status", "active"))
      .order("desc")
      .take(limit);

    // Filter expired ones
    return quests.filter((q) => q.expiresAt > now);
  },
});

/**
 * Get active quests for a specific completer FID (exclude their own and already completed).
 */
export const getQuestsForCompleter = query({
  args: {
    completerFid: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const now = Date.now();

    const quests = await ctx.db
      .query("playerQuests")
      .withIndex("by_status_created", (q) => q.eq("status", "active"))
      .order("desc")
      .take(50);

    // Filter expired and creator's own
    const eligible = quests.filter(
      (q) => q.expiresAt > now && q.creatorFid !== args.completerFid
    );

    // Check which ones the user already completed
    const completions = await ctx.db
      .query("playerQuestCompletions")
      .withIndex("by_completer", (q) => q.eq("completerFid", args.completerFid))
      .take(200);

    const completedQuestIds = new Set(completions.map((c) => c.questId));

    return eligible
      .filter((q) => !completedQuestIds.has(q._id))
      .slice(0, limit);
  },
});

/**
 * Get quests created by a player.
 */
export const getMyCreatedQuests = query({
  args: {
    address: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const normalized = normalizeAddress(args.address);
    return ctx.db
      .query("playerQuests")
      .withIndex("by_creator", (q) => q.eq("creatorAddress", normalized))
      .order("desc")
      .take(args.limit ?? 10);
  },
});

/**
 * Get completions for a quest (for the creator to see who completed).
 */
export const getQuestCompletions = query({
  args: {
    questId: v.id("playerQuests"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("playerQuestCompletions")
      .withIndex("by_quest", (q) => q.eq("questId", args.questId))
      .order("desc")
      .take(50);
  },
});
