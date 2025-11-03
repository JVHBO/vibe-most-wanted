/**
 * QUEST SYSTEM (DAILY & WEEKLY)
 *
 * DAILY QUESTS: One random quest per day (global)
 * WEEKLY QUESTS: Personal quests that reset every Sunday
 * WEEKLY REWARDS: TOP 10 leaderboard rewards (distributed Sunday 00:00 UTC)
 *
 * Players complete by playing matches
 * Rewards $TESTVBMS coins
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
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

// ============================================================================
// 📅 WEEKLY QUESTS & REWARDS
// ============================================================================

// Weekly quest definitions (personal, reset every Sunday)
const WEEKLY_QUESTS = {
  attackWins: {
    id: "weekly_attack_wins",
    name: "Attack Master",
    description: "Win 20 attacks",
    target: 20,
    reward: 300, // TODO: Ajustar valores depois
    icon: "🏆",
  },
  totalMatches: {
    id: "weekly_total_matches",
    name: "Active Player",
    description: "Play 30 matches (any mode)",
    target: 30,
    reward: 200,
    icon: "🎲",
  },
  defenseWins: {
    id: "weekly_defense_wins",
    name: "Fortress",
    description: "Defend successfully 10 times",
    target: 10,
    reward: 400,
    icon: "🛡️",
  },
  pveStreak: {
    id: "weekly_pve_streak",
    name: "Unbeatable",
    description: "Win 10 PvE battles in a row",
    target: 10,
    reward: 500,
    icon: "🔥",
  },
} as const;

// 🏅 Weekly Leaderboard Rewards (APENAS TOP 10!)
export const WEEKLY_LEADERBOARD_REWARDS = {
  rank1: 1000,    // 1st place
  rank2: 750,     // 2nd place
  rank3: 500,     // 3rd place
  rank4to10: 300, // 4th-10th place
  // SEM top20 ou top50 - APENAS TOP 10!
} as const;

/**
 * Get weekly quest progress for player
 */
export const getWeeklyProgress = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();
    const lastSunday = getLastSunday();

    // Get player's weekly progress
    const progress = await ctx.db
      .query("weeklyProgress")
      .withIndex("by_player_week", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("weekStart", lastSunday)
      )
      .first();

    if (!progress) {
      // Initialize weekly progress
      return {
        weekStart: lastSunday,
        weekEnd: getNextSunday(),
        quests: initializeWeeklyQuests(),
      };
    }

    return {
      weekStart: lastSunday,
      weekEnd: getNextSunday(),
      quests: progress.quests || initializeWeeklyQuests(),
    };
  },
});

/**
 * Update weekly quest progress
 * 🛡️ CRITICAL FIX: Converted to internalMutation to prevent client-side farming
 */
export const updateWeeklyProgress = internalMutation({
  args: {
    address: v.string(),
    questId: v.string(),
    increment: v.optional(v.number()),
  },
  handler: async (ctx, { address, questId, increment = 1 }) => {
    const normalizedAddress = address.toLowerCase();
    const lastSunday = getLastSunday();

    let progress = await ctx.db
      .query("weeklyProgress")
      .withIndex("by_player_week", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("weekStart", lastSunday)
      )
      .first();

    // Initialize if not exists
    if (!progress) {
      const progressId = await ctx.db.insert("weeklyProgress", {
        playerAddress: normalizedAddress,
        weekStart: lastSunday,
        quests: initializeWeeklyQuests(),
      });
      progress = await ctx.db.get(progressId);
      if (!progress) throw new Error("Failed to create weekly progress");
    }

    // Update quest progress
    const quests = { ...progress.quests };
    if (quests[questId]) {
      quests[questId].current = Math.min(
        (quests[questId].current || 0) + increment,
        quests[questId].target
      );
      quests[questId].completed = quests[questId].current >= quests[questId].target;
    }

    await ctx.db.patch(progress._id, { quests });

    return { success: true, progress: quests[questId] };
  },
});

/**
 * Update PvE streak progress (special handling for consecutive wins)
 */
export const updatePveStreak = mutation({
  args: {
    address: v.string(),
    won: v.boolean(),
  },
  handler: async (ctx, { address, won }) => {
    const normalizedAddress = address.toLowerCase();
    const lastSunday = getLastSunday();

    let progress = await ctx.db
      .query("weeklyProgress")
      .withIndex("by_player_week", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("weekStart", lastSunday)
      )
      .first();

    // Initialize if not exists
    if (!progress) {
      const progressId = await ctx.db.insert("weeklyProgress", {
        playerAddress: normalizedAddress,
        weekStart: lastSunday,
        quests: initializeWeeklyQuests(),
        pveStreakCurrent: 0,
      });
      progress = await ctx.db.get(progressId);
      if (!progress) throw new Error("Failed to create weekly progress");
    }

    const quests = { ...progress.quests };
    const questId = "weekly_pve_streak";

    // Initialize pveStreakCurrent if not exists
    let currentStreak = progress.pveStreakCurrent || 0;

    if (won) {
      // Increment streak
      currentStreak += 1;

      // Update quest with MAX streak achieved
      if (quests[questId]) {
        quests[questId].current = Math.max(
          quests[questId].current || 0,
          currentStreak
        );
        quests[questId].completed = quests[questId].current >= quests[questId].target;
      }
    } else {
      // Reset streak on loss
      currentStreak = 0;
    }

    // Update progress
    await ctx.db.patch(progress._id, {
      quests,
      pveStreakCurrent: currentStreak,
    });

    console.log(`🔥 PvE Streak ${won ? 'continued' : 'reset'}: ${currentStreak} (max: ${quests[questId]?.current || 0})`);

    return {
      success: true,
      currentStreak,
      maxStreak: quests[questId]?.current || 0,
    };
  },
});

/**
 * Claim weekly quest reward
 */
export const claimWeeklyReward = mutation({
  args: {
    address: v.string(),
    questId: v.string(),
  },
  handler: async (ctx, { address, questId }) => {
    const normalizedAddress = address.toLowerCase();
    const lastSunday = getLastSunday();

    const progress = await ctx.db
      .query("weeklyProgress")
      .withIndex("by_player_week", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("weekStart", lastSunday)
      )
      .first();

    if (!progress || !progress.quests[questId]) {
      throw new Error("Quest not found");
    }

    const quest = progress.quests[questId];

    if (!quest.completed) {
      throw new Error("Quest not completed yet");
    }

    if (quest.claimed) {
      throw new Error("Reward already claimed");
    }

    // Get quest definition
    const questDef = Object.values(WEEKLY_QUESTS).find((q) => q.id === questId);
    if (!questDef) {
      throw new Error("Quest definition not found");
    }

    // Award coins
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const reward = questDef.reward;
    await ctx.db.patch(profile._id, {
      coins: (profile.coins || 0) + reward,
      lifetimeEarned: (profile.lifetimeEarned || 0) + reward,
    });

    // Mark as claimed
    const updatedQuests = { ...progress.quests };
    updatedQuests[questId].claimed = true;
    await ctx.db.patch(progress._id, { quests: updatedQuests });

    console.log(`✅ Weekly quest reward claimed: ${questId} → ${reward} coins`);

    return {
      success: true,
      reward,
      newBalance: (profile.coins || 0) + reward,
    };
  },
});

/**
 * 🏅 Distribute weekly leaderboard rewards (TOP 10 ONLY!)
 * Called by cron job every Sunday at 00:00 UTC
 */
export const distributeWeeklyRewards = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🏅 Starting weekly rewards distribution (TOP 10 ONLY)...");

    // Get top 10 players by total power
    const topPlayers = await ctx.db
      .query("profiles")
      .withIndex("by_total_power")
      .order("desc")
      .take(10); // APENAS TOP 10!

    if (topPlayers.length === 0) {
      console.log("⚠️ No players found");
      return { distributed: 0, rewards: [] };
    }

    const rewards = [];

    for (let i = 0; i < topPlayers.length; i++) {
      const rank = i + 1;
      const player = topPlayers[i];

      let reward = 0;
      if (rank === 1) {
        reward = WEEKLY_LEADERBOARD_REWARDS.rank1;
      } else if (rank === 2) {
        reward = WEEKLY_LEADERBOARD_REWARDS.rank2;
      } else if (rank === 3) {
        reward = WEEKLY_LEADERBOARD_REWARDS.rank3;
      } else if (rank <= 10) {
        reward = WEEKLY_LEADERBOARD_REWARDS.rank4to10;
      }

      if (reward > 0) {
        await ctx.db.patch(player._id, {
          coins: (player.coins || 0) + reward,
          lifetimeEarned: (player.lifetimeEarned || 0) + reward,
        });

        rewards.push({
          rank,
          username: player.username,
          address: player.address,
          reward,
        });

        console.log(`💰 Rank #${rank} ${player.username}: +${reward} $TESTVBMS`);
      }
    }

    console.log(`✅ Weekly rewards distributed to ${rewards.length} players (TOP 10)`);

    return {
      distributed: rewards.length,
      rewards,
      timestamp: Date.now(),
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function initializeWeeklyQuests() {
  return Object.fromEntries(
    Object.values(WEEKLY_QUESTS).map((quest) => [
      quest.id,
      {
        current: 0,
        target: quest.target,
        completed: false,
        claimed: false,
      },
    ])
  );
}

function getLastSunday(): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const lastSunday = new Date(now);
  lastSunday.setUTCDate(now.getUTCDate() - dayOfWeek);
  lastSunday.setUTCHours(0, 0, 0, 0);
  return lastSunday.toISOString().split('T')[0];
}

function getNextSunday(): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const nextSunday = new Date(now);
  nextSunday.setUTCDate(now.getUTCDate() + (7 - dayOfWeek));
  nextSunday.setUTCHours(0, 0, 0, 0);
  return nextSunday.toISOString().split('T')[0];
}
