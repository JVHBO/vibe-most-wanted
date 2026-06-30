import { ConvexError, v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { requireInternalAdminKey } from "./adminAuth";

const disabled = { disabled: true, message: "Social quests disabled" };

export const getSocialQuestProgress = query({
  args: { address: v.string() },
  handler: async () => ({}),
});

export const markQuestCompletedInternal = internalMutation({
  args: {
    address: v.string(),
    questId: v.string(),
  },
  handler: async () => ({ success: false, alreadyCompleted: false, ...disabled }),
});

export const markQuestCompleted = mutation({
  args: {
    address: v.string(),
    questId: v.string(),
  },
  handler: async () => ({ success: false, alreadyCompleted: false, ...disabled }),
});

export const claimSocialQuestReward = mutation({
  args: {
    address: v.string(),
    questId: v.string(),
  },
  handler: async () => {
    throw new ConvexError("Social quests disabled");
  },
});

export const getClaimableSocialRewards = query({
  args: { address: v.string() },
  handler: async () => ({ totalClaimable: 0, claimableQuests: [], count: 0 }),
});

export const verifyAndCompleteQuest = action({
  args: {
    address: v.string(),
    questId: v.string(),
    userFid: v.number(),
  },
  handler: async () => ({ completed: false, ...disabled }),
});

export const getCustomFollowQuests = query({
  args: {},
  handler: async () => [],
});

export const getClaimedCustomQuestIds = query({
  args: { address: v.string() },
  handler: async () => [],
});

export const adminDeleteCustomFollowQuest = mutation({
  args: { id: v.string(), adminKey: v.string() },
  handler: async (_ctx, args) => {
    requireInternalAdminKey(args.adminKey);
    return { deleted: false, id: args.id, ...disabled };
  },
});

export const addCustomFollowQuest = mutation({
  args: {
    address: v.string(),
    targetUsername: v.string(),
    displayName: v.optional(v.string()),
    targetFid: v.number(),
    pfpUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    txHash: v.optional(v.string()),
  },
  handler: async () => {
    throw new ConvexError("Social quests disabled");
  },
});

export const claimCustomFollowReward = mutation({
  args: {
    address: v.string(),
    questId: v.id("customFollowQuests"),
  },
  handler: async () => {
    throw new ConvexError("Social quests disabled");
  },
});
