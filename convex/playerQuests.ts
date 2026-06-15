import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const disabled = { disabled: true, message: "Player quests disabled" };

export const createPlayerQuest = mutation({
  args: {
    address: v.string(),
    fid: v.number(),
    username: v.string(),
    questType: v.union(
      v.literal("follow_me"),
      v.literal("join_channel"),
      v.literal("rt_cast"),
      v.literal("use_miniapp"),
      v.literal("like_cast")
    ),
    targetUrl: v.string(),
    targetDisplay: v.string(),
    rewardPerCompleter: v.number(),
    maxCompleters: v.number(),
  },
  handler: async () => {
    throw new ConvexError("Player quests disabled");
  },
});

export const payQuestReward = mutation({
  args: {
    secret: v.string(),
    questId: v.id("playerQuests"),
    completerAddress: v.string(),
    completerFid: v.number(),
  },
  handler: async () => {
    throw new ConvexError("Player quest rewards disabled");
  },
});

export const cancelPlayerQuest = mutation({
  args: {
    address: v.string(),
    questId: v.id("playerQuests"),
  },
  handler: async () => ({ success: false, refund: 0, ...disabled }),
});

export const getActiveQuests = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async () => [],
});

export const getQuestsForCompleter = query({
  args: {
    completerFid: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async () => [],
});

export const getMyCreatedQuests = query({
  args: {
    address: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async () => [],
});

export const getQuestCompletions = query({
  args: {
    questId: v.id("playerQuests"),
  },
  handler: async () => [],
});
