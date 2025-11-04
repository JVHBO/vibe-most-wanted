/**
 * PERSONAL MISSIONS SYSTEM
 *
 * Manages claimable daily bonuses and one-time rewards:
 * - Daily login (25 coins)
 * - First PvE win (50 coins)
 * - First PvP match (100 coins)
 * - Welcome gift (500 coins, one-time)
 * - Win streaks (150/300/750 coins)
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { applyLanguageBoost } from "./languageBoost";

// Mission rewards
const MISSION_REWARDS = {
  daily_login: 25,
  first_pve_win: 50,
  first_pvp_match: 100,
  welcome_gift: 500,
  streak_3: 150,
  streak_5: 300,
  streak_10: 750,
};

/**
 * Get all player missions (claimable and claimed)
 */
export const getPlayerMissions = query({
  args: { playerAddress: v.string() },
  handler: async (ctx, { playerAddress }) => {
    const today = new Date().toISOString().split('T')[0];
    const normalizedAddress = playerAddress.toLowerCase();

    // Get today's missions + one-time missions
    const missions = await ctx.db
      .query("personalMissions")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", normalizedAddress))
      .filter((q) =>
        q.or(
          q.eq(q.field("date"), today),
          q.eq(q.field("date"), "once")
        )
      )
      .collect();

    return missions;
  },
});

/**
 * Mark daily login mission as completed (not claimed yet)
 */
export const markDailyLogin = mutation({
  args: { playerAddress: v.string() },
  handler: async (ctx, { playerAddress }) => {
    const today = new Date().toISOString().split('T')[0];
    const normalizedAddress = playerAddress.toLowerCase();

    // Check if mission already exists for today
    const existing = await ctx.db
      .query("personalMissions")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", normalizedAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("date"), today),
          q.eq(q.field("missionType"), "daily_login")
        )
      )
      .first();

    if (!existing) {
      await ctx.db.insert("personalMissions", {
        playerAddress: normalizedAddress,
        date: today,
        missionType: "daily_login",
        completed: true,
        claimed: false,
        reward: MISSION_REWARDS.daily_login,
        completedAt: Date.now(),
      });

      console.log("✅ Daily login mission created for", normalizedAddress);
    }
  },
});

/**
 * Mark first PvE win mission as completed
 */
export const markFirstPveWin = mutation({
  args: { playerAddress: v.string() },
  handler: async (ctx, { playerAddress }) => {
    const today = new Date().toISOString().split('T')[0];
    const normalizedAddress = playerAddress.toLowerCase();

    const existing = await ctx.db
      .query("personalMissions")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", normalizedAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("date"), today),
          q.eq(q.field("missionType"), "first_pve_win")
        )
      )
      .first();

    if (!existing) {
      await ctx.db.insert("personalMissions", {
        playerAddress: normalizedAddress,
        date: today,
        missionType: "first_pve_win",
        completed: true,
        claimed: false,
        reward: MISSION_REWARDS.first_pve_win,
        completedAt: Date.now(),
      });

      console.log("✅ First PvE win mission created for", normalizedAddress);
    }
  },
});

/**
 * Mark first PvP match mission as completed
 */
export const markFirstPvpMatch = mutation({
  args: { playerAddress: v.string() },
  handler: async (ctx, { playerAddress }) => {
    const today = new Date().toISOString().split('T')[0];
    const normalizedAddress = playerAddress.toLowerCase();

    const existing = await ctx.db
      .query("personalMissions")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", normalizedAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("date"), today),
          q.eq(q.field("missionType"), "first_pvp_match")
        )
      )
      .first();

    if (!existing) {
      await ctx.db.insert("personalMissions", {
        playerAddress: normalizedAddress,
        date: today,
        missionType: "first_pvp_match",
        completed: true,
        claimed: false,
        reward: MISSION_REWARDS.first_pvp_match,
        completedAt: Date.now(),
      });

      console.log("✅ First PvP match mission created for", normalizedAddress);
    }
  },
});

/**
 * Create welcome gift for new player (one-time)
 */
export const createWelcomeGift = mutation({
  args: { playerAddress: v.string() },
  handler: async (ctx, { playerAddress }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    // Check if welcome gift already exists
    const existing = await ctx.db
      .query("personalMissions")
      .withIndex("by_player_type", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("missionType", "welcome_gift")
      )
      .first();

    if (!existing) {
      await ctx.db.insert("personalMissions", {
        playerAddress: normalizedAddress,
        date: "once", // One-time mission
        missionType: "welcome_gift",
        completed: true, // Immediately available
        claimed: false,
        reward: MISSION_REWARDS.welcome_gift,
        completedAt: Date.now(),
      });

      console.log("🎁 Welcome gift created for", normalizedAddress);
    }
  },
});

/**
 * Mark win streak mission as completed
 */
export const markWinStreak = mutation({
  args: {
    playerAddress: v.string(),
    streak: v.union(v.literal(3), v.literal(5), v.literal(10)),
  },
  handler: async (ctx, { playerAddress, streak }) => {
    const today = new Date().toISOString().split('T')[0];
    const normalizedAddress = playerAddress.toLowerCase();
    const missionType = `streak_${streak}` as "streak_3" | "streak_5" | "streak_10";

    const existing = await ctx.db
      .query("personalMissions")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", normalizedAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("date"), today),
          q.eq(q.field("missionType"), missionType)
        )
      )
      .first();

    if (!existing) {
      await ctx.db.insert("personalMissions", {
        playerAddress: normalizedAddress,
        date: today,
        missionType,
        completed: true,
        claimed: false,
        reward: MISSION_REWARDS[missionType],
        completedAt: Date.now(),
      });

      console.log(`🔥 ${streak}-win streak mission created for`, normalizedAddress);
    }
  },
});

/**
 * Claim mission reward
 */
export const claimMission = mutation({
  args: {
    playerAddress: v.string(),
    missionId: v.id("personalMissions"),
    language: v.optional(v.union(
      v.literal("pt-BR"),
      v.literal("en"),
      v.literal("es"),
      v.literal("hi"),
      v.literal("ru"),
      v.literal("zh-CN")
    )),
  },
  handler: async (ctx, { playerAddress, missionId, language }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    // Get mission
    const mission = await ctx.db.get(missionId);
    if (!mission) {
      throw new Error("Mission not found");
    }

    // Verify ownership
    if (mission.playerAddress !== normalizedAddress) {
      throw new Error("Mission does not belong to this player");
    }

    // Check if already claimed
    if (mission.claimed) {
      throw new Error("Mission already claimed");
    }

    // Check if completed
    if (!mission.completed) {
      throw new Error("Mission not completed yet");
    }

    // Get player profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // 🇨🇳 Apply language boost to mission reward
    const boostedReward = language ? applyLanguageBoost(mission.reward, language) : mission.reward;

    // Award coins
    const newBalance = (profile.coins || 0) + boostedReward;
    const newLifetimeEarned = (profile.lifetimeEarned || 0) + boostedReward;

    await ctx.db.patch(profile._id, {
      coins: newBalance,
      lifetimeEarned: newLifetimeEarned,
    });

    // Mark mission as claimed
    await ctx.db.patch(missionId, {
      claimed: true,
      claimedAt: Date.now(),
    });

    console.log(
      `✅ Mission claimed: ${mission.missionType} (+${boostedReward} coins) for`,
      normalizedAddress
    );

    return {
      success: true,
      reward: boostedReward,
      newBalance,
      missionType: mission.missionType,
    };
  },
});

/**
 * Claim all completed missions at once
 */
export const claimAllMissions = mutation({
  args: {
    playerAddress: v.string(),
    language: v.optional(v.union(
      v.literal("pt-BR"),
      v.literal("en"),
      v.literal("es"),
      v.literal("hi"),
      v.literal("ru"),
      v.literal("zh-CN")
    )),
  },
  handler: async (ctx, { playerAddress, language }) => {
    const normalizedAddress = playerAddress.toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    // Get all unclaimed but completed missions
    const missions = await ctx.db
      .query("personalMissions")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", normalizedAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), true),
          q.eq(q.field("claimed"), false),
          q.or(
            q.eq(q.field("date"), today),
            q.eq(q.field("date"), "once")
          )
        )
      )
      .collect();

    if (missions.length === 0) {
      return {
        success: true,
        claimed: 0,
        totalReward: 0,
      };
    }

    // Get player profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // 🇨🇳 Calculate total reward with language boost applied to each mission
    const totalReward = missions.reduce((sum, m) => {
      const boostedReward = language ? applyLanguageBoost(m.reward, language) : m.reward;
      return sum + boostedReward;
    }, 0);

    // Award coins
    const newBalance = (profile.coins || 0) + totalReward;
    const newLifetimeEarned = (profile.lifetimeEarned || 0) + totalReward;

    await ctx.db.patch(profile._id, {
      coins: newBalance,
      lifetimeEarned: newLifetimeEarned,
    });

    // Mark all as claimed
    const now = Date.now();
    for (const mission of missions) {
      await ctx.db.patch(mission._id, {
        claimed: true,
        claimedAt: now,
      });
    }

    console.log(
      `✅ Claimed ${missions.length} missions (+${totalReward} coins) for`,
      normalizedAddress
    );

    return {
      success: true,
      claimed: missions.length,
      totalReward,
      newBalance,
    };
  },
});
