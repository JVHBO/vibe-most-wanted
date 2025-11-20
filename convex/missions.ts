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

// Mission rewards (coins OR packs)
const MISSION_REWARDS = {
  daily_login: { type: "coins", amount: 100 },
  first_pve_win: { type: "coins", amount: 50 },
  first_pvp_match: { type: "pack", packType: "mission", amount: 1 }, // Changed to pack!
  play_3_games: { type: "pack", packType: "mission", amount: 1 }, // NEW
  win_5_games: { type: "pack", packType: "mission", amount: 2 }, // NEW
  streak_3: { type: "coins", amount: 150 },
  streak_5: { type: "pack", packType: "achievement", amount: 1 }, // Changed to pack!
  streak_10: { type: "pack", packType: "achievement", amount: 3 }, // Changed to pack!
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
        reward: MISSION_REWARDS.daily_login.amount,
        completedAt: Date.now(),
      });

      // devLog (server-side)("✅ Daily login mission created for", normalizedAddress);
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
        reward: MISSION_REWARDS.first_pve_win.amount,
        completedAt: Date.now(),
      });

      // devLog (server-side)("✅ First PvE win mission created for", normalizedAddress);
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
        reward: MISSION_REWARDS.first_pvp_match.amount,
        completedAt: Date.now(),
      });

      // devLog (server-side)("✅ First PvP match mission created for", normalizedAddress);
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
        reward: MISSION_REWARDS[missionType].amount,
        completedAt: Date.now(),
      });

      // devLog (server-side)(`🔥 ${streak}-win streak mission created for`, normalizedAddress);
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
    skipCoins: v.optional(v.boolean()), // If true, only calculate reward without adding coins
  },
  handler: async (ctx, { playerAddress, missionId, language, skipCoins }) => {
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

    // Get reward info
    const rewardInfo = MISSION_REWARDS[mission.missionType as keyof typeof MISSION_REWARDS];

    let boostedReward = 0;
    let newBalance = profile.coins || 0;

    if (rewardInfo.type === "coins") {
      // 🇨🇳 Apply language boost to mission reward
      boostedReward = language ? applyLanguageBoost(rewardInfo.amount, language) : rewardInfo.amount;

      // Award coins directly to balance (or just calculate if skipCoins)
      if (!skipCoins) {
        const currentBalance = profile.coins || 0;
        newBalance = currentBalance + boostedReward;
        const newLifetimeEarned = (profile.lifetimeEarned || 0) + boostedReward;

        await ctx.db.patch(profile._id, {
          coins: newBalance,
          lifetimeEarned: newLifetimeEarned,
        });

        console.log(`💰 Mission reward added to balance: ${boostedReward} TESTVBMS for ${normalizedAddress}. Balance: ${currentBalance} → ${newBalance}`);
      } else {
        newBalance = profile.coins || 0;
      }
    } else if (rewardInfo.type === "pack") {
      // Award pack(s)
      if (!("packType" in rewardInfo)) {
        throw new Error("Pack reward missing packType");
      }

      const existingPack = await ctx.db
        .query("cardPacks")
        .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
        .filter((q) => q.eq(q.field("packType"), rewardInfo.packType))
        .first();

      if (existingPack) {
        await ctx.db.patch(existingPack._id, {
          unopened: existingPack.unopened + rewardInfo.amount,
        });
      } else {
        await ctx.db.insert("cardPacks", {
          address: normalizedAddress,
          packType: rewardInfo.packType,
          unopened: rewardInfo.amount,
          sourceId: mission.missionType,
          earnedAt: Date.now(),
        });
      }
    }

    // Mark mission as claimed
    await ctx.db.patch(missionId, {
      claimed: true,
      claimedAt: Date.now(),
    });


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

    // Award coins directly to balance
    const currentBalance = profile.coins || 0;
    const newBalance = currentBalance + totalReward;
    const newLifetimeEarned = (profile.lifetimeEarned || 0) + totalReward;

    await ctx.db.patch(profile._id, {
      coins: newBalance,
      lifetimeEarned: newLifetimeEarned,
    });

    console.log(`💰 Mission rewards added to balance: ${totalReward} TESTVBMS for ${normalizedAddress}. Balance: ${currentBalance} → ${newBalance}`);

    // Mark all as claimed
    const now = Date.now();
    for (const mission of missions) {
      await ctx.db.patch(mission._id, {
        claimed: true,
        claimedAt: now,
      });
    }


    return {
      success: true,
      claimed: missions.length,
      totalReward,
      newBalance: newBalance,
    };
  },
});

/**
 * Ensure welcome gift exists for player (migration for old users)
 * Creates welcome_gift mission if it doesn't exist
 */
export const ensureWelcomeGift = mutation({
  args: { playerAddress: v.string() },
  handler: async (ctx, { playerAddress }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    // Check if welcome_gift already exists
    const existing = await ctx.db
      .query("personalMissions")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", normalizedAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("date"), "once"),
          q.eq(q.field("missionType"), "welcome_gift")
        )
      )
      .first();

    if (!existing) {
      // Create welcome_gift for old users who don't have it
      await ctx.db.insert("personalMissions", {
        playerAddress: normalizedAddress,
        date: "once",
        missionType: "welcome_gift",
        completed: true, // Auto-completed
        claimed: false, // Not claimed yet
        reward: 500,
        completedAt: Date.now(),
      });

      console.log(`🎁 Created welcome_gift mission for ${normalizedAddress}`);
      return { created: true };
    }

    return { created: false };
  },
});
