import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DISABLED_STATS = {
  totalAchievements: 0,
  completedAchievements: 0,
  claimedAchievements: 0,
  unclaimedAchievements: 0,
  totalRewards: 0,
  claimedRewards: 0,
};

export const getPlayerAchievements = query({
  args: { playerAddress: v.string() },
  handler: async () => [],
});

export const getAchievementStats = query({
  args: { playerAddress: v.string() },
  handler: async () => DISABLED_STATS,
});

export const getUnclaimedAchievements = query({
  args: { playerAddress: v.string() },
  handler: async () => [],
});

export const checkAndUpdateAchievements = mutation({
  args: {
    playerAddress: v.string(),
    nfts: v.array(v.any()),
  },
  handler: async () => ({
    success: true,
    disabled: true,
    newlyCompletedCount: 0,
    completedAchievements: [],
  }),
});

export const claimAchievementReward = mutation({
  args: {
    playerAddress: v.string(),
    achievementId: v.string(),
  },
  handler: async (_, args) => ({
    success: true,
    disabled: true,
    achievementId: args.achievementId,
    achievementName: "Achievements disabled",
    reward: 0,
  }),
});
