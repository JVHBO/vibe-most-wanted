/**
 * DAILY QUEST SYSTEM
 *
 * Generates one random quest per day (global)
 * Players complete by playing matches
 * Rewards $TESTVBMS coins
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";

// Quest pool with 10 different quest types
const QUEST_POOL = [
  {
    type: "win_pve_3",
    description: "Win 3 PvE battles",
    requirement: { count: 3 },
    reward: 150,
    difficulty: "easy",
  },
  {
    type: "win_pve_5",
    description: "Win 5 PvE battles",
    requirement: { count: 5 },
    reward: 300,
    difficulty: "medium",
  },
  {
    type: "defeat_gangster",
    description: "Defeat Gangster difficulty AI",
    requirement: { count: 1, difficulty: "gangster" },
    reward: 250,
    difficulty: "medium",
  },
  {
    type: "defeat_gigachad",
    description: "Defeat Gigachad difficulty AI",
    requirement: { count: 1, difficulty: "gigachad" },
    reward: 500,
    difficulty: "hard",
  },
  {
    type: "play_pvp_3",
    description: "Play 3 PvP matches (win or lose)",
    requirement: { count: 3 },
    reward: 200,
    difficulty: "medium",
  },
  {
    type: "win_pvp_3",
    description: "Win 3 PvP matches",
    requirement: { count: 3 },
    reward: 400,
    difficulty: "hard",
  },
  {
    type: "win_streak_3",
    description: "Win 3 battles in a row",
    requirement: { count: 3 },
    reward: 350,
    difficulty: "hard",
  },
  {
    type: "low_power_win",
    description: "Win a PvE battle with max 300 power",
    requirement: { count: 1, maxPower: 300 },
    reward: 200,
    difficulty: "medium",
  },
  {
    type: "complete_5_battles",
    description: "Complete 5 battles (any mode)",
    requirement: { count: 5 },
    reward: 250,
    difficulty: "easy",
  },
  {
    type: "perfect_day",
    description: "Win 2 PvE and 2 PvP battles",
    requirement: { count: 2 }, // 2 of each
    reward: 600,
    difficulty: "hard",
  },
];

/**
 * Get or generate today's daily quest (global)
 */
export const getDailyQuest = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0]; // "2025-11-01"

    // Check if quest already exists for today
    const existingQuest = await ctx.db
      .query("dailyQuests")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existingQuest) {
      return existingQuest;
    }

    // No quest exists - this should only happen if generation failed
    // Return null and let the mutation handle generation
    return null;
  },
});

/**
 * Generate today's daily quest (called by cron or first player of the day)
 */
export const generateDailyQuest = mutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];

    // Check if quest already exists
    const existing = await ctx.db
      .query("dailyQuests")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existing) {
      console.log("✅ Daily quest already exists for", today);
      return existing._id;
    }

    // Pick random quest from pool
    const randomIndex = Math.floor(Math.random() * QUEST_POOL.length);
    const questTemplate = QUEST_POOL[randomIndex];

    // Create quest
    const questId = await ctx.db.insert("dailyQuests", {
      date: today,
      type: questTemplate.type,
      description: questTemplate.description,
      requirement: questTemplate.requirement,
      reward: questTemplate.reward,
      difficulty: questTemplate.difficulty,
      createdAt: Date.now(),
    });

    console.log("✅ Generated daily quest:", questTemplate.type, "for", today);
    return questId;
  },
});

/**
 * Get quest progress for a specific player
 */
export const getQuestProgress = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const today = new Date().toISOString().split('T')[0];
    const normalizedAddress = address.toLowerCase();

    // Get today's quest
    const quest = await ctx.db
      .query("dailyQuests")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (!quest) {
      return null;
    }

    // Check if player has already completed/claimed
    const progress = await ctx.db
      .query("questProgress")
      .withIndex("by_player_date", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("questDate", today)
      )
      .first();

    if (progress) {
      return {
        quest,
        progress: progress.completed ? quest.requirement.count || 1 : 0,
        completed: progress.completed,
        claimed: progress.claimed,
      };
    }

    // Calculate progress from today's matches
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), todayStart),
          q.lt(q.field("timestamp"), todayEnd)
        )
      )
      .collect();

    // Calculate progress based on quest type
    let currentProgress = 0;
    let completed = false;

    switch (quest.type) {
      case "win_pve_3":
      case "win_pve_5":
        currentProgress = matches.filter(
          (m) => m.type === "pve" && m.result === "win"
        ).length;
        completed = currentProgress >= (quest.requirement.count || 0);
        break;

      case "defeat_gangster":
      case "defeat_gigachad":
        currentProgress = matches.filter(
          (m) =>
            m.type === "pve" &&
            m.result === "win" &&
            m.difficulty === quest.requirement.difficulty
        ).length;
        completed = currentProgress >= (quest.requirement.count || 0);
        break;

      case "play_pvp_3":
        currentProgress = matches.filter((m) => m.type === "pvp").length;
        completed = currentProgress >= (quest.requirement.count || 0);
        break;

      case "win_pvp_3":
        currentProgress = matches.filter(
          (m) => m.type === "pvp" && m.result === "win"
        ).length;
        completed = currentProgress >= (quest.requirement.count || 0);
        break;

      case "win_streak_3":
        // Calculate longest win streak today
        let streak = 0;
        let maxStreak = 0;
        const sortedMatches = matches.sort((a, b) => a.timestamp - b.timestamp);
        for (const match of sortedMatches) {
          if (match.result === "win") {
            streak++;
            maxStreak = Math.max(maxStreak, streak);
          } else {
            streak = 0;
          }
        }
        currentProgress = maxStreak;
        completed = maxStreak >= (quest.requirement.count || 0);
        break;

      case "low_power_win":
        currentProgress = matches.filter(
          (m) =>
            m.type === "pve" &&
            m.result === "win" &&
            m.playerPower <= (quest.requirement.maxPower || 0)
        ).length;
        completed = currentProgress >= (quest.requirement.count || 0);
        break;

      case "complete_5_battles":
        currentProgress = matches.length;
        completed = currentProgress >= (quest.requirement.count || 0);
        break;

      case "perfect_day":
        const pveWins = matches.filter(
          (m) => m.type === "pve" && m.result === "win"
        ).length;
        const pvpWins = matches.filter(
          (m) => m.type === "pvp" && m.result === "win"
        ).length;
        const requiredCount = quest.requirement.count || 2;
        currentProgress = Math.min(pveWins, pvpWins); // Show the limiting factor
        completed = pveWins >= requiredCount && pvpWins >= requiredCount;
        break;
    }

    return {
      quest,
      progress: currentProgress,
      completed,
      claimed: false,
    };
  },
});

/**
 * Claim quest reward
 */
export const claimQuestReward = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const today = new Date().toISOString().split('T')[0];
    const normalizedAddress = address.toLowerCase();

    // Get today's quest
    const quest = await ctx.db
      .query("dailyQuests")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (!quest) {
      throw new Error("No daily quest available");
    }

    // Get player profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Check if already claimed
    const existingProgress = await ctx.db
      .query("questProgress")
      .withIndex("by_player_date", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("questDate", today)
      )
      .first();

    if (existingProgress && existingProgress.claimed) {
      throw new Error("Quest reward already claimed");
    }

    // Calculate completion (reuse logic from getQuestProgress)
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), todayStart),
          q.lt(q.field("timestamp"), todayEnd)
        )
      )
      .collect();

    // Verify completion (simplified check)
    let isCompleted = false;

    switch (quest.type) {
      case "win_pve_3":
      case "win_pve_5":
        isCompleted =
          matches.filter((m) => m.type === "pve" && m.result === "win")
            .length >= (quest.requirement.count || 0);
        break;
      case "defeat_gangster":
      case "defeat_gigachad":
        isCompleted =
          matches.filter(
            (m) =>
              m.type === "pve" &&
              m.result === "win" &&
              m.difficulty === quest.requirement.difficulty
          ).length >= (quest.requirement.count || 0);
        break;
      case "play_pvp_3":
        isCompleted =
          matches.filter((m) => m.type === "pvp").length >=
          (quest.requirement.count || 0);
        break;
      case "win_pvp_3":
        isCompleted =
          matches.filter((m) => m.type === "pvp" && m.result === "win")
            .length >= (quest.requirement.count || 0);
        break;
      case "low_power_win":
        isCompleted =
          matches.filter(
            (m) =>
              m.type === "pve" &&
              m.result === "win" &&
              m.playerPower <= (quest.requirement.maxPower || 0)
          ).length >= (quest.requirement.count || 0);
        break;
      case "complete_5_battles":
        isCompleted = matches.length >= (quest.requirement.count || 0);
        break;
      case "perfect_day":
        const pveWins = matches.filter(
          (m) => m.type === "pve" && m.result === "win"
        ).length;
        const pvpWins = matches.filter(
          (m) => m.type === "pvp" && m.result === "win"
        ).length;
        isCompleted =
          pveWins >= (quest.requirement.count || 2) &&
          pvpWins >= (quest.requirement.count || 2);
        break;
      case "win_streak_3":
        let streak = 0;
        let maxStreak = 0;
        const sortedMatches = matches.sort((a, b) => a.timestamp - b.timestamp);
        for (const match of sortedMatches) {
          if (match.result === "win") {
            streak++;
            maxStreak = Math.max(maxStreak, streak);
          } else {
            streak = 0;
          }
        }
        isCompleted = maxStreak >= (quest.requirement.count || 0);
        break;
    }

    if (!isCompleted) {
      throw new Error("Quest not completed yet");
    }

    // Award coins
    const currentCoins = profile.coins || 0;
    const newCoins = currentCoins + quest.reward;
    const lifetimeEarned = (profile.lifetimeEarned || 0) + quest.reward;

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      lifetimeEarned,
      lastUpdated: Date.now(),
    });

    // Mark as claimed
    if (existingProgress) {
      await ctx.db.patch(existingProgress._id, {
        claimed: true,
        claimedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("questProgress", {
        playerAddress: normalizedAddress,
        questDate: today,
        completed: true,
        claimed: true,
        claimedAt: Date.now(),
      });
    }

    console.log(`✅ Quest reward claimed: ${quest.reward} coins for ${normalizedAddress}`);

    return {
      reward: quest.reward,
      newBalance: newCoins,
    };
  },
});
