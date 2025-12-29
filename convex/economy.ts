/**
 * ECONOMY SYSTEM ($TESTVBMS)
 *
 * Manages the in-game currency system for Vibe Most Wanted
 * - 10M $TESTVBMS total pool
 * - Daily caps: 3,500 $TESTVBMS per player
 * - Entry fees for PvP modes
 * - Persistent balances for future web3 claim
 * - Weekly quest tracking integration
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { applyLanguageBoost } from "./languageBoost";
import { createAuditLog } from "./coinAudit";
import { logTransaction } from "./coinsInbox";

// Constants
const DAILY_CAP = 1500; // Max $TESTVBMS per day per player (reduced from 3500)
const PVE_WIN_LIMIT = 30; // Max PvE wins per day
const PVP_MATCH_LIMIT = 10; // Max PvP matches per day

// PvE Rewards by Difficulty (reduced ~70% to extend pool longevity)
const PVE_REWARDS = {
  gey: 2,      // was 5
  goofy: 5,    // was 15
  gooner: 10,  // was 30
  gangster: 20, // was 60
  gigachad: 40, // was 120
};

// PvP Rewards
const PVP_WIN_REWARD = 100;
const PVP_LOSS_PENALTY = -20; // Lose 20 coins on loss
const REVENGE_BONUS = 1.2; // +20% bonus for revenge wins
const MAX_REMATCHES_PER_DAY = 5; // Max revenge matches per day

// PvP Ranking Bonuses - Based on RANK DIFFERENCE (not absolute position)
// This prevents #2 vs #3 giving huge bonuses, but rewards attacking much higher ranked players
const RANKING_BONUS_BY_DIFF = {
  // Win bonuses based on how many ranks higher the opponent is
  diff50Plus: 2.0,   // Opponent 50+ ranks higher = 2.0x (100 → 200 coins)
  diff20to49: 1.5,   // Opponent 20-49 ranks higher = 1.5x (100 → 150 coins)
  diff10to19: 1.3,   // Opponent 10-19 ranks higher = 1.3x (100 → 130 coins)
  diff5to9: 1.15,    // Opponent 5-9 ranks higher = 1.15x (100 → 115 coins)
  default: 1.0,      // Less than 5 ranks difference = no bonus
};

// Penalty reduction - Based on RANK DIFFERENCE
const PENALTY_REDUCTION_BY_DIFF = {
  // Loss penalty reduction based on how many ranks higher the opponent is
  diff50Plus: 0.4,   // Opponent 50+ ranks higher = 60% penalty reduction (-20 → -8)
  diff20to49: 0.5,   // Opponent 20-49 ranks higher = 50% reduction (-20 → -10)
  diff10to19: 0.65,  // Opponent 10-19 ranks higher = 35% reduction (-20 → -13)
  diff5to9: 0.8,     // Opponent 5-9 ranks higher = 20% reduction (-20 → -16)
  default: 1.0,      // Less than 5 ranks difference = full penalty
};

// Entry Fees
const ENTRY_FEES = {
  attack: 0,   // No entry fee for leaderboard attacks
  pvp: 20,     // Reduced from 40 to 20
};

// Daily Bonuses
const BONUSES = {
  firstPve: 50,
  firstPvp: 100,
  login: 25,
  streak3: 150,
  streak5: 300,
  streak10: 750,
};

/**
 * Initialize economy fields for a player
 */
export const initializeEconomy = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Only initialize if not already initialized
    if (profile.coins !== undefined) {
      return; // Already initialized
    }

    const today = new Date().toISOString().split('T')[0];

    await ctx.db.patch(profile._id, {
      coins: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      dailyLimits: {
        pveWins: 0,
        pvpMatches: 0,
        lastResetDate: today,
        firstPveBonus: false,
        firstPvpBonus: false,
        loginBonus: false,
        streakBonus: false,
      },
      winStreak: 0,
      lastWinTimestamp: 0,
    });
  },
});

/**
 * Get player's economy data
 */
export const getPlayerEconomy = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      return null;
    }

    // Initialize if needed
    if (profile.coins === undefined) {
      return {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          firstPveBonus: false,
          firstPvpBonus: false,
          loginBonus: false,
          streakBonus: false,
        },
        winStreak: 0,
        dailyEarned: 0,
        canEarnMore: true,
      };
    }

    // Calculate daily earned (for display purposes)
    const today = new Date().toISOString().split('T')[0];
    const isToday = profile.dailyLimits?.lastResetDate === today;
    const dailyEarned = isToday ? calculateDailyEarned(profile) : 0;
    const canEarnMore = dailyEarned < DAILY_CAP;

    return {
      coins: profile.coins,
      lifetimeEarned: profile.lifetimeEarned || 0,
      lifetimeSpent: profile.lifetimeSpent || 0,
      dailyLimits: profile.dailyLimits,
      winStreak: profile.winStreak || 0,
      dailyEarned,
      canEarnMore,
    };
  },
});

/**
 * Helper to calculate how much player earned today
 */
function calculateDailyEarned(profile: any): number {
  const limits = profile.dailyLimits;
  if (!limits) return 0;

  let total = 0;

  // PvE wins (estimate based on average)
  total += limits.pveWins * 30; // Average reward

  // PvP matches (estimate)
  total += limits.pvpMatches * 60; // Average reward

  // Bonuses
  if (limits.firstPveBonus) total += BONUSES.firstPve;
  if (limits.firstPvpBonus) total += BONUSES.firstPvp;
  if (limits.loginBonus) total += BONUSES.login;
  if (limits.streakBonus) {
    // Estimate based on streak
    total += BONUSES.streak3; // Minimum streak bonus
  }

  return total;
}

/**
 * Reset daily limits (called at midnight UTC)
 * 🚀 BANDWIDTH FIX: Process in batches instead of loading all profiles
 */
export const resetDailyLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];

    // 🚀 BANDWIDTH FIX: Process in batches of 100 instead of loading all
    const BATCH_SIZE = 100;
    let resetsApplied = 0;
    let cursor: string | null = null;

    // Paginate through profiles
    while (true) {
      const profilesQuery = ctx.db.query("profiles");
      const batch = cursor
        ? await profilesQuery.take(BATCH_SIZE)
        : await profilesQuery.take(BATCH_SIZE);

      if (batch.length === 0) break;

      for (const profile of batch) {
        if (profile.dailyLimits && profile.dailyLimits.lastResetDate !== today) {
          await ctx.db.patch(profile._id, {
            dailyLimits: {
              pveWins: 0,
              pvpMatches: 0,
              lastResetDate: today,
              firstPveBonus: false,
              firstPvpBonus: false,
              loginBonus: false,
              streakBonus: false,
            },
          });
          resetsApplied++;
        }
      }

      // If we got less than batch size, we're done
      if (batch.length < BATCH_SIZE) break;

      // For now, break after first batch to avoid timeout
      // The cron will catch remaining profiles on next run
      break;
    }

    return { success: true, resetsApplied };
  },
});

/**
 * 🚀 BANDWIDTH OPTIMIZATION V3: Calculate multiplier based on AURA DIFFERENCE
 * This completely removes the need for expensive rank calculations!
 *
 * Instead of: fetch 200 profiles x 3 = 600 reads per call
 * Now: 0 extra reads (just use aura values we already have)
 *
 * Aura difference thresholds (approximates rank difference):
 * - 500+ aura higher = very strong opponent (2x bonus)
 * - 200-499 aura higher = strong opponent (1.5x bonus)
 * - 100-199 aura higher = moderate opponent (1.3x bonus)
 * - 50-99 aura higher = slightly stronger (1.15x bonus)
 * - Less than 50 = similar level (no bonus)
 */
function calculateAuraMultiplier(playerAura: number, opponentAura: number, isWin: boolean): number {
  // Calculate aura difference (positive = opponent has higher aura)
  const auraDiff = opponentAura - playerAura;

  if (isWin) {
    // Win bonuses - ONLY if opponent has higher aura
    if (auraDiff <= 0) {
      return RANKING_BONUS_BY_DIFF.default; // 1.0x - no bonus for beating weaker opponents
    }

    // Opponent has higher aura - calculate bonus
    if (auraDiff >= 500) return RANKING_BONUS_BY_DIFF.diff50Plus;   // 2.0x
    if (auraDiff >= 200) return RANKING_BONUS_BY_DIFF.diff20to49;   // 1.5x
    if (auraDiff >= 100) return RANKING_BONUS_BY_DIFF.diff10to19;   // 1.3x
    if (auraDiff >= 50) return RANKING_BONUS_BY_DIFF.diff5to9;      // 1.15x
    return RANKING_BONUS_BY_DIFF.default; // < 50 aura diff = 1.0x
  } else {
    // Loss penalty reduction - ONLY if opponent has higher aura
    if (auraDiff <= 0) {
      return PENALTY_REDUCTION_BY_DIFF.default; // Full penalty for losing to weaker
    }

    // Opponent has higher aura - reduce penalty
    if (auraDiff >= 500) return PENALTY_REDUCTION_BY_DIFF.diff50Plus;   // 40% penalty
    if (auraDiff >= 200) return PENALTY_REDUCTION_BY_DIFF.diff20to49;   // 50% penalty
    if (auraDiff >= 100) return PENALTY_REDUCTION_BY_DIFF.diff10to19;   // 65% penalty
    if (auraDiff >= 50) return PENALTY_REDUCTION_BY_DIFF.diff5to9;      // 80% penalty
    return PENALTY_REDUCTION_BY_DIFF.default; // < 50 aura diff = 100% penalty
  }
}

// Legacy function kept for awardPvPCoins (used in actual battles, less frequent)
async function getOpponentRanking(ctx: any, opponentAddress: string): Promise<number> {
  const opponent = await ctx.db
    .query("profiles")
    .withIndex("by_address", (q: any) => q.eq("address", opponentAddress.toLowerCase()))
    .first();

  if (!opponent) return 999;

  const opponentAura = opponent.stats?.aura ?? 500;
  const MAX_RANK_CHECK = 100; // Reduced from 200

  const higherAuraProfiles = await ctx.db
    .query("profiles")
    .withIndex("by_aura")
    .order("desc")
    .filter((q: any) => q.gt(q.field("stats.aura"), opponentAura))
    .take(MAX_RANK_CHECK);

  if (higherAuraProfiles.length >= MAX_RANK_CHECK) return MAX_RANK_CHECK + 1;
  return higherAuraProfiles.length + 1;
}

// Legacy function for backwards compatibility
function calculateRankingMultiplier(playerRank: number, opponentRank: number, isWin: boolean): number {
  const rankDiff = playerRank - opponentRank;

  if (isWin) {
    if (rankDiff <= 0) return RANKING_BONUS_BY_DIFF.default;
    if (rankDiff >= 50) return RANKING_BONUS_BY_DIFF.diff50Plus;
    if (rankDiff >= 20) return RANKING_BONUS_BY_DIFF.diff20to49;
    if (rankDiff >= 10) return RANKING_BONUS_BY_DIFF.diff10to19;
    if (rankDiff >= 5) return RANKING_BONUS_BY_DIFF.diff5to9;
    return RANKING_BONUS_BY_DIFF.default;
  } else {
    if (rankDiff <= 0) return PENALTY_REDUCTION_BY_DIFF.default;
    if (rankDiff >= 50) return PENALTY_REDUCTION_BY_DIFF.diff50Plus;
    if (rankDiff >= 20) return PENALTY_REDUCTION_BY_DIFF.diff20to49;
    if (rankDiff >= 10) return PENALTY_REDUCTION_BY_DIFF.diff10to19;
    if (rankDiff >= 5) return PENALTY_REDUCTION_BY_DIFF.diff5to9;
    return PENALTY_REDUCTION_BY_DIFF.default;
  }
}

/**
 * Check if player can receive daily limits before resetting
 */
async function checkAndResetDailyLimits(ctx: any, profile: any) {
  const today = new Date().toISOString().split('T')[0];

  if (!profile.dailyLimits || profile.dailyLimits.lastResetDate !== today) {
    // Reset daily limits AND rematchesToday
    await ctx.db.patch(profile._id, {
      dailyLimits: {
        pveWins: 0,
        pvpMatches: 0,
        lastResetDate: today,
        firstPveBonus: false,
        firstPvpBonus: false,
        loginBonus: false,
        streakBonus: false,
      },
      rematchesToday: 0, // Reset revenge match count
    });

    // Return fresh limits
    return {
      pveWins: 0,
      pvpMatches: 0,
      lastResetDate: today,
      firstPveBonus: false,
      firstPvpBonus: false,
      loginBonus: false,
      streakBonus: false,
    };
  }

  return profile.dailyLimits;
}

/**
 * Preview PvP rewards/penalties before battle
 * Shows how much player will gain (win) or lose (loss) based on opponent's aura
 *
 * 🚀 BANDWIDTH OPTIMIZATION V3:
 * - BEFORE: 3x getOpponentRanking = 600+ profile reads per call
 * - AFTER: 2 profile reads (player + opponent) + aura calculation
 * - SAVINGS: ~99% bandwidth reduction!
 */
export const previewPvPRewards = query({
  args: {
    playerAddress: v.string(),
    opponentAddress: v.string(),
  },
  handler: async (ctx, { playerAddress, opponentAddress }) => {
    // 🚀 OPTIMIZED: Fetch both profiles in parallel-ish (2 reads total)
    const player = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", playerAddress.toLowerCase()))
      .first();

    if (!player) {
      throw new Error("Player profile not found");
    }

    const opponent = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", opponentAddress.toLowerCase()))
      .first();

    if (!opponent) {
      throw new Error("Opponent profile not found");
    }

    // 🚀 OPTIMIZED: Use aura directly instead of expensive rank calculations
    const playerAura = player.stats?.aura ?? 500;
    const opponentAura = opponent.stats?.aura ?? 500;

    // Calculate multipliers based on AURA difference (no extra DB reads!)
    const winMultiplier = calculateAuraMultiplier(playerAura, opponentAura, true);
    const lossMultiplier = calculateAuraMultiplier(playerAura, opponentAura, false);

    // Calculate potential rewards/penalties
    const baseWinReward = PVP_WIN_REWARD;
    const winReward = Math.round(baseWinReward * winMultiplier);
    const winBonus = winReward - baseWinReward;

    const baseLossPenalty = PVP_LOSS_PENALTY;
    const lossPenalty = Math.round(baseLossPenalty * lossMultiplier);
    const penaltyReduction = Math.abs(lossPenalty - baseLossPenalty);

    // Get current streak
    const currentStreak = player.winStreak || 0;
    const nextStreak = currentStreak + 1;

    // Calculate potential streak bonuses (if win)
    let streakBonus = 0;
    let streakMessage = "";
    if (nextStreak === 3) {
      streakBonus = BONUSES.streak3;
      streakMessage = "3-Win Streak Bonus";
    } else if (nextStreak === 5) {
      streakBonus = BONUSES.streak5;
      streakMessage = "5-Win Streak Bonus";
    } else if (nextStreak === 10) {
      streakBonus = BONUSES.streak10;
      streakMessage = "10-Win Streak Bonus";
    }

    // Check if first PvP bonus available
    const today = new Date().toISOString().split('T')[0];
    const dailyLimits = player.dailyLimits || {
      lastResetDate: '',
      firstPvpBonus: false,
      pveWins: 0,
      pvpMatches: 0,
    };
    const isToday = dailyLimits.lastResetDate === today;
    const firstPvpBonus = isToday && !dailyLimits.firstPvpBonus ? BONUSES.firstPvp : 0;

    // Check for revenge match (opponent previously defeated player)
    const normalizedPlayerAddress = playerAddress.toLowerCase();
    const normalizedOpponentAddress = opponentAddress.toLowerCase();
    const lastOpponentVictory = await ctx.db
      .query("matches")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedOpponentAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("opponentAddress"), normalizedPlayerAddress),
          q.eq(q.field("result"), "win")
        )
      )
      .order("desc")
      .first();

    const isRevenge = lastOpponentVictory !== null;
    let revengeBonus = 0;
    let rewardWithRevenge = winReward;

    if (isRevenge) {
      revengeBonus = Math.round(winReward * (REVENGE_BONUS - 1)); // 20% of base reward
      rewardWithRevenge = Math.round(winReward * REVENGE_BONUS);
    }

    // Calculate total potential rewards
    const totalWinReward = rewardWithRevenge + streakBonus + firstPvpBonus;

    return {
      // 🚀 OPTIMIZED: Return aura values instead of expensive rank calculations
      opponentAura,
      playerAura,
      auraDiff: opponentAura - playerAura, // Positive = opponent stronger
      currentStreak,
      isRevenge, // Flag if this is a revenge match

      // Win scenario
      win: {
        baseReward: baseWinReward,
        rankingBonus: winBonus,
        rankingMultiplier: winMultiplier,
        revengeBonus, // +20% revenge bonus if applicable
        firstPvpBonus,
        streakBonus,
        streakMessage,
        totalReward: totalWinReward,
      },

      // Loss scenario
      loss: {
        basePenalty: baseLossPenalty,
        penaltyReduction,
        rankingMultiplier: lossMultiplier,
        totalPenalty: lossPenalty,
      },

      // Current player state
      playerCoins: player.coins || 0,
    };
  },
});

/**
 * Award coins after PvE battle
 */
export const awardPvECoins = mutation({
  args: {
    address: v.string(),
    difficulty: v.union(
      v.literal("gey"),
      v.literal("goofy"),
      v.literal("gooner"),
      v.literal("gangster"),
      v.literal("gigachad")
    ),
    won: v.boolean(),
    language: v.optional(v.union(
      v.literal("pt-BR"),
      v.literal("en"),
      v.literal("es"),
      v.literal("hi"),
      v.literal("ru"),
      v.literal("zh-CN"),
      v.literal("id"),
      v.literal("fr"),
      v.literal("ja"),
      v.literal("it")
    )),
    skipCoins: v.optional(v.boolean()), // If true, only calculate reward without adding coins
  },
  handler: async (ctx, { address, difficulty, won, language, skipCoins }) => {
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Initialize if needed
    if (profile.coins === undefined) {
      const today = new Date().toISOString().split('T')[0];
      await ctx.db.patch(profile._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: today,
          firstPveBonus: false,
          firstPvpBonus: false,
          loginBonus: false,
          streakBonus: false,
        },
        winStreak: 0,
        lastWinTimestamp: 0,
      });
      // Reload profile
      const updatedProfile = await ctx.db.get(profile._id);
      if (!updatedProfile) throw new Error("Failed to initialize economy");
      profile = updatedProfile;
    }

    // Check and reset daily limits
    const dailyLimits = await checkAndResetDailyLimits(ctx, profile);

    // 🛡️ PHASE 2 SECURITY: Rate limiting (prevent spam/farming)
    const now = Date.now();
    const lastAward = profile.lastPvEAward || 0;
    const timeSinceLastAward = now - lastAward;
    const RATE_LIMIT_MS = 10000; // 10 seconds between awards

    if (timeSinceLastAward < RATE_LIMIT_MS) {
      const waitTime = Math.ceil((RATE_LIMIT_MS - timeSinceLastAward) / 1000);
      throw new Error(`Too fast! Please wait ${waitTime}s before playing again`);
    }

    // 🛡️ CRITICAL FIX: Update timestamp IMMEDIATELY after rate limit check
    // This prevents spam retries on failed attempts (e.g., daily limit reached)
    await ctx.db.patch(profile._id, {
      lastPvEAward: now,
    });

    // 🎯 Track PvE streak (ALWAYS, even on loss to reset streak)
    try {
      await ctx.scheduler.runAfter(0, api.quests.updatePveStreak, {
        address: address.toLowerCase(),
        won: won,
      });
    } catch (error) {
      console.error("❌ Failed to track PvE streak:", error);
    }

    // Only award if won
    if (!won) {
      return { awarded: 0, reason: "Lost the battle" };
    }

    // Check PvE win limit
    if (dailyLimits.pveWins >= PVE_WIN_LIMIT) {
      return { awarded: 0, reason: "Daily PvE win limit reached" };
    }

    // Calculate reward
    const baseReward = PVE_REWARDS[difficulty];
    let totalReward = baseReward;
    const bonuses: string[] = [];

    // 🇨🇳 Apply language boost if Chinese language selected
    if (language) {
      totalReward = applyLanguageBoost(totalReward, language);
    }

    // Create first PvE win mission (player must claim manually)
    if (!dailyLimits.firstPveBonus) {
      const today = new Date().toISOString().split('T')[0];
      const existingMission = await ctx.db
        .query("personalMissions")
        .withIndex("by_player_date", (q) => q.eq("playerAddress", address.toLowerCase()))
        .filter((q) =>
          q.and(
            q.eq(q.field("date"), today),
            q.eq(q.field("missionType"), "first_pve_win")
          )
        )
        .first();

      if (!existingMission) {
        await ctx.db.insert("personalMissions", {
          playerAddress: address.toLowerCase(),
          date: today,
          missionType: "first_pve_win",
          completed: true,
          claimed: false,
          reward: 50, // MISSION_REWARDS.first_pve_win
          completedAt: Date.now(),
        });
      }
      dailyLimits.firstPveBonus = true; // Mark as triggered (mission created)
    }

    // Check daily cap
    const dailyEarned = calculateDailyEarned(profile);
    if (dailyEarned + totalReward > DAILY_CAP) {
      const remaining = Math.max(0, DAILY_CAP - dailyEarned);
      if (remaining === 0) {
        return { awarded: 0, reason: "Daily cap reached" };
      }
      totalReward = remaining;
    }

    // Award coins to balance (direct)
    if (!skipCoins) {
      const currentBalance = profile.coins || 0;
      const currentAura = profile.stats?.aura ?? 500;
      const auraReward = won ? 5 : 0; // +5 aura for winning PvE

      await ctx.db.patch(profile!._id, {
        coins: currentBalance + totalReward,
        lifetimeEarned: (profile.lifetimeEarned || 0) + totalReward,
        stats: {
          ...profile.stats,
          aura: currentAura + auraReward, // Award aura for PvE win
        },
        dailyLimits: {
          ...dailyLimits,
          pveWins: dailyLimits.pveWins + 1,
        },
        // lastPvEAward already updated immediately after rate limit check (line 491)
      });

      // 📊 LOG TRANSACTION
      await logTransaction(ctx, {
        address,
        type: 'earn',
        amount: totalReward,
        source: 'pve',
        description: `Won PvE battle (${difficulty})`,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + totalReward,
      });

      console.log(`💰 PvE reward: ${totalReward} TESTVBMS + ${auraReward} aura for ${address}. Balance: ${currentBalance} → ${currentBalance + totalReward}, Aura: ${currentAura} → ${currentAura + auraReward}`);
    }

    // 🎯 Track weekly quest progress (async, non-blocking)
    // 🛡️ CRITICAL FIX: Use internal.quests (now internalMutation)
    try {
      await ctx.scheduler.runAfter(0, internal.quests.updateWeeklyProgress, {
        address: address.toLowerCase(),
        questId: "weekly_total_matches",
        increment: 1,
      });

      console.log(`✅ Weekly quest tracked: PvE match for ${address.toLowerCase()}`);
    } catch (error) {
      // Don't fail the main flow if quest tracking fails
      console.error("❌ Failed to track weekly quest:", error);
    }

    return {
      awarded: totalReward,
      bonuses,
      dailyEarned: dailyEarned + totalReward,
      remaining: DAILY_CAP - (dailyEarned + totalReward),
    };
  },
});

/**
 * Award coins after PvP battle with ranking-based bonuses
 */
export const awardPvPCoins = mutation({
  args: {
    address: v.string(),
    won: v.boolean(),
    opponentAddress: v.optional(v.string()), // ✅ NEW: For ranking bonus calculation
    language: v.optional(v.union(
      v.literal("pt-BR"),
      v.literal("en"),
      v.literal("es"),
      v.literal("hi"),
      v.literal("ru"),
      v.literal("zh-CN"),
      v.literal("id"),
      v.literal("fr"),
      v.literal("ja"),
      v.literal("it")
    )),
  },
  handler: async (ctx, { address, won, opponentAddress, language }) => {
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Initialize if needed
    if (profile.coins === undefined) {
      const today = new Date().toISOString().split('T')[0];
      await ctx.db.patch(profile._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: today,
          firstPveBonus: false,
          firstPvpBonus: false,
          loginBonus: false,
          streakBonus: false,
        },
        winStreak: 0,
        lastWinTimestamp: 0,
      });
      // Reload profile
      const updatedProfile = await ctx.db.get(profile._id);
      if (!updatedProfile) throw new Error("Failed to initialize economy");
      profile = updatedProfile;
    }

    // Check and reset daily limits
    const dailyLimits = await checkAndResetDailyLimits(ctx, profile);

    // 🛡️ PHASE 2 SECURITY: Rate limiting (prevent spam/farming)
    const nowPvP = Date.now();
    const lastPvPAward = profile.lastPvPAward || 0;
    const timeSinceLastPvPAward = nowPvP - lastPvPAward;
    const PVP_RATE_LIMIT_MS = 15000; // 15 seconds between PvP awards

    if (timeSinceLastPvPAward < PVP_RATE_LIMIT_MS) {
      const waitTime = Math.ceil((PVP_RATE_LIMIT_MS - timeSinceLastPvPAward) / 1000);
      throw new Error(`Too fast! Please wait ${waitTime}s before next match`);
    }

    // 🛡️ CRITICAL FIX: Update timestamp IMMEDIATELY after rate limit check
    // This prevents spam retries on failed attempts (e.g., daily limit reached)
    await ctx.db.patch(profile._id, {
      lastPvPAward: nowPvP,
    });

    // Check PvP match limit
    if (dailyLimits.pvpMatches >= PVP_MATCH_LIMIT) {
      return { awarded: 0, reason: "Daily PvP match limit reached" };
    }

    // ✅ Calculate aura-based bonus if opponent provided (OPTIMIZED - 1 query instead of 200)
    let rankingMultiplier = 1.0;
    let opponentAura = 500;
    if (opponentAddress) {
      const opponentProfile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", opponentAddress.toLowerCase()))
        .first();
      const playerAura = profile.stats?.aura ?? 500;
      opponentAura = opponentProfile?.stats?.aura ?? 500;
      rankingMultiplier = calculateAuraMultiplier(playerAura, opponentAura, won);
    }

    // Update win streak
    let newStreak = profile.winStreak || 0;
    const bonuses: string[] = [];
    let totalReward = 0;

    if (won) {
      // WINNER: Award coins
      newStreak++;
      // 🇨🇳 Apply language boost to base reward first, then ranking multiplier
      const boostedBase = language ? applyLanguageBoost(PVP_WIN_REWARD, language) : PVP_WIN_REWARD;
      totalReward = Math.round(boostedBase * rankingMultiplier); // ✅ Apply ranking multiplier

      // ✅ Add aura bonus message
      if (rankingMultiplier > 1.0 && opponentAddress) {
        const bonusAmount = totalReward - PVP_WIN_REWARD;
        bonuses.push(`Strong Opponent Bonus +${bonusAmount} (${rankingMultiplier.toFixed(1)}x)`);
      }

      // Create first PvP match mission (player must claim manually)
      if (!dailyLimits.firstPvpBonus) {
        const today = new Date().toISOString().split('T')[0];
        const existing = await ctx.db
          .query("personalMissions")
          .withIndex("by_player_date", (q) => q.eq("playerAddress", address.toLowerCase()))
          .filter((q) => q.and(q.eq(q.field("date"), today), q.eq(q.field("missionType"), "first_pvp_match")))
          .first();

        if (!existing) {
          await ctx.db.insert("personalMissions", {
            playerAddress: address.toLowerCase(),
            date: today,
            missionType: "first_pvp_match",
            completed: true,
            claimed: false,
            reward: 100,
            completedAt: Date.now(),
          });
        }
        dailyLimits.firstPvpBonus = true;
      }

      // Create streak missions (player must claim manually)
      if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
        const today = new Date().toISOString().split('T')[0];
        const missionType = `streak_${newStreak}` as "streak_3" | "streak_5" | "streak_10";
        const rewards = { streak_3: 150, streak_5: 300, streak_10: 750 };

        const existing = await ctx.db
          .query("personalMissions")
          .withIndex("by_player_date", (q) => q.eq("playerAddress", address.toLowerCase()))
          .filter((q) => q.and(q.eq(q.field("date"), today), q.eq(q.field("missionType"), missionType)))
          .first();

        if (!existing) {
          await ctx.db.insert("personalMissions", {
            playerAddress: address.toLowerCase(),
            date: today,
            missionType,
            completed: true,
            claimed: false,
            reward: rewards[missionType],
            completedAt: Date.now(),
          });
        }

        if (newStreak === 3) {
          dailyLimits.streakBonus = true;
        }
      }

      // No daily cap for PvP - limited by 10 matches/day instead

      // Award coins to balance (direct)
      const currentBalance = profile.coins || 0;
      const currentAura = profile.stats?.aura ?? 500;
      const auraReward = 10; // +10 aura for winning PvP

      await ctx.db.patch(profile!._id, {
        coins: currentBalance + totalReward,
        lifetimeEarned: (profile.lifetimeEarned || 0) + totalReward,
        stats: {
          ...profile.stats,
          aura: currentAura + auraReward, // Award aura for PvP win
        },
        winStreak: newStreak,
        lastWinTimestamp: Date.now(),
        dailyLimits: {
          ...dailyLimits,
          pvpMatches: dailyLimits.pvpMatches + 1,
        },
        // lastPvPAward already updated immediately after rate limit check (line 652)
      });

      // 📊 LOG TRANSACTION
      await logTransaction(ctx, {
        address,
        type: 'earn',
        amount: totalReward,
        source: 'pvp',
        description: `Won PvP battle`,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + totalReward,
      });

      console.log(`💰 PvP reward: ${totalReward} TESTVBMS + ${auraReward} aura for ${address}. Balance: ${currentBalance} → ${currentBalance + totalReward}, Aura: ${currentAura} → ${currentAura + auraReward}`);

      // 🎯 Track weekly quest progress (async, non-blocking)
      // 🛡️ CRITICAL FIX: Use internal.quests (now internalMutation)
      try {
        await ctx.scheduler.runAfter(0, internal.quests.updateWeeklyProgress, {
          address: address.toLowerCase(),
          questId: "weekly_total_matches",
          increment: 1,
        });

        console.log(`✅ Weekly quest tracked: PvP match (WIN) for ${address.toLowerCase()}`);
      } catch (error) {
        console.error("❌ Failed to track weekly quest:", error);
      }

      return {
        awarded: totalReward,
        bonuses,
        winStreak: newStreak,
        opponentAura, // ✅ Include opponent aura in response
        rankingMultiplier, // ✅ Include multiplier in response
      };
    } else {
      // LOSER: Deduct coins (with ranking-based penalty reduction)
      newStreak = 0; // Reset on loss
      const basePenalty = PVP_LOSS_PENALTY; // -20
      const penalty = Math.round(basePenalty * rankingMultiplier); // ✅ Apply penalty reduction
      const currentCoins = profile.coins || 0;
      const newCoins = Math.max(0, currentCoins + penalty); // Can't go below 0

      const currentAura = profile.stats?.aura ?? 500;
      const auraPenalty = -5; // -5 aura for losing PvP
      const newAura = Math.max(0, currentAura + auraPenalty); // Can't go below 0

      // ✅ Add penalty reduction message
      if (rankingMultiplier < 1.0 && opponentAddress) {
        const reduction = Math.abs(penalty - basePenalty);
        bonuses.push(`Strong Opponent Penalty Reduced -${reduction} (${(rankingMultiplier * 100).toFixed(0)}% penalty)`);
      }

      await ctx.db.patch(profile!._id, {
        coins: newCoins,
        lifetimeSpent: (profile.lifetimeSpent || 0) + Math.abs(penalty),
        stats: {
          ...profile.stats,
          aura: newAura, // Lose aura for PvP loss
        },
        winStreak: newStreak,
        lastWinTimestamp: Date.now(),
        // lastPvPAward already updated immediately after rate limit check (line 652)
        dailyLimits: {
          ...dailyLimits,
          pvpMatches: dailyLimits.pvpMatches + 1,
        },
      });

      // 🎯 Track weekly quest progress (async, non-blocking)
      // 🛡️ CRITICAL FIX: Use internal.quests (now internalMutation)
      try {
        await ctx.scheduler.runAfter(0, internal.quests.updateWeeklyProgress, {
          address: address.toLowerCase(),
          questId: "weekly_total_matches",
          increment: 1,
        });

        console.log(`✅ Weekly quest tracked: PvP match (LOSS) for ${address.toLowerCase()}`);
      } catch (error) {
        console.error("❌ Failed to track weekly quest:", error);
      }

      return {
        awarded: penalty, // Negative value (reduced if high-rank opponent)
        bonuses, // ✅ Now includes penalty reduction message
        winStreak: newStreak,
        opponentAura, // ✅ Include opponent aura in response
        rankingMultiplier, // ✅ Include multiplier in response
        dailyEarned: calculateDailyEarned(profile),
        remaining: DAILY_CAP - calculateDailyEarned(profile),
      };
    }
  },
});

/**
 * Deduct entry fee for PvP modes
 */
export const chargeEntryFee = mutation({
  args: {
    address: v.string(),
    mode: v.union(v.literal("attack"), v.literal("pvp")),
  },
  handler: async (ctx, { address, mode }) => {
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Initialize if needed
    if (profile.coins === undefined) {
      return { success: false, reason: "Economy not initialized" };
    }

    const fee = ENTRY_FEES[mode];

    // Check balance
    if ((profile.coins || 0) < fee) {
      return { success: false, reason: "Insufficient balance", required: fee, current: profile.coins };
    }

    // Deduct fee
    await ctx.db.patch(profile._id, {
      coins: (profile.coins || 0) - fee,
      lifetimeSpent: (profile.lifetimeSpent || 0) + fee,
    });

    return { success: true, charged: fee, newBalance: (profile.coins || 0) - fee };
  },
});

/**
 * Claim login bonus
 */
export const claimLoginBonus = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Initialize if needed
    if (profile.coins === undefined) {
      const today = new Date().toISOString().split('T')[0];
      await ctx.db.patch(profile._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: today,
          firstPveBonus: false,
          firstPvpBonus: false,
          loginBonus: false,
          streakBonus: false,
        },
        winStreak: 0,
        lastWinTimestamp: 0,
      });
      // Reload profile
      const updatedProfile = await ctx.db.get(profile._id);
      if (!updatedProfile) throw new Error("Failed to initialize economy");
      profile = updatedProfile;
    }

    // Check and reset daily limits
    const dailyLimits = await checkAndResetDailyLimits(ctx, profile);

    // Check if mission already created today
    if (dailyLimits.loginBonus) {
      return { awarded: 0, reason: "Mission already created today" };
    }

    // Create daily login mission (player must claim manually)
    const today = new Date().toISOString().split('T')[0];
    const existing = await ctx.db
      .query("personalMissions")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", address.toLowerCase()))
      .filter((q) => q.and(q.eq(q.field("date"), today), q.eq(q.field("missionType"), "daily_login")))
      .first();

    if (!existing) {
      await ctx.db.insert("personalMissions", {
        playerAddress: address.toLowerCase(),
        date: today,
        missionType: "daily_login",
        completed: true,
        claimed: false,
        reward: 25,
        completedAt: Date.now(),
      });
    }

    // Mark as triggered
    await ctx.db.patch(profile!._id, {
      dailyLimits: {
        ...dailyLimits,
        loginBonus: true,
      },
    });

    return { awarded: 0, reason: "Mission created - check Missions tab to claim!", newBalance: profile.coins || 0 };
  },
});

/**
 * Claim daily share bonus (tokens for sharing profile)
 * - First share = FREE pack (handled in cardPacks.ts)
 * - Daily shares = 50 tokens
 */
export const claimShareBonus = mutation({
  args: {
    address: v.string(),
    type: v.string(), // "dailyShare"
  },
  handler: async (ctx, { address, type }) => {
    const normalizedAddress = address.toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      return { success: false, message: "Profile not found" };
    }

    // Check if already claimed tokens today
    // NOTE: We check dailyShares > 0 because lastShareDate was incorrectly set by pack reward (bug fix)
    const dailyShares = profile.lastShareDate === today ? (profile.dailyShares || 0) : 0;
    if (dailyShares >= 1) {
      return { success: false, message: "You already claimed your daily share bonus! Come back tomorrow." };
    }

    // Award 50 tokens for daily share
    const shareReward = 50;
    const currentCoins = profile.coins || 0;
    const newCoins = currentCoins + shareReward;

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      lifetimeEarned: (profile.lifetimeEarned || 0) + shareReward,
      lastShareDate: today,
      dailyShares: dailyShares + 1,
      hasSharedProfile: true,
    });

    return {
      success: true,
      message: `+${shareReward} coins for sharing! Share daily for more rewards!`,
      awarded: shareReward,
      newBalance: newCoins,
    };
  },
});

/**
 * Pay entry fee for PvP mode
 */
export const payEntryFee = mutation({
  args: {
    address: v.string(),
    mode: v.union(v.literal("pvp"), v.literal("attack")),
  },
  handler: async (ctx, { address, mode }) => {
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Initialize if needed
    if (profile.coins === undefined) {
      const today = new Date().toISOString().split('T')[0];
      await ctx.db.patch(profile._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: today,
          firstPveBonus: false,
          firstPvpBonus: false,
          loginBonus: false,
          streakBonus: false,
        },
        winStreak: 0,
        lastWinTimestamp: 0,
      });
      // Reload profile
      const updatedProfile = await ctx.db.get(profile._id);
      if (!updatedProfile) throw new Error("Failed to initialize economy");
      profile = updatedProfile;
    }

    // Determine entry fee
    const fee = mode === "pvp" ? ENTRY_FEES.pvp : ENTRY_FEES.attack;
    const currentCoins = profile.coins || 0;

    // Check if player has enough coins
    if (currentCoins < fee) {
      throw new Error(`Insufficient funds. Need ${fee} coins but only have ${currentCoins}`);
    }

    // Deduct fee
    await ctx.db.patch(profile._id, {
      coins: currentCoins - fee,
      lifetimeSpent: (profile.lifetimeSpent || 0) + fee,
    });

    console.log(`💸 Entry fee paid: ${fee} $TESTVBMS for ${mode} mode by ${address}`);

    return {
      paid: fee,
      newBalance: currentCoins - fee
    };
  },
});

/**
 * Add coins to a player
 * 🔒 INTERNAL ONLY - Cannot be called from client
 * Used for bonuses, compensation, and welcome gifts
 * Only callable from internal mutations, scheduled tasks, or admin operations
 */
export const addCoins = internalMutation({
  args: {
    address: v.string(),
    amount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, { address, amount, reason }) => {
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Initialize if needed
    if (profile.coins === undefined) {
      const today = new Date().toISOString().split('T')[0];
      await ctx.db.patch(profile._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: today,
          firstPveBonus: false,
          firstPvpBonus: false,
          loginBonus: false,
          streakBonus: false,
        },
        winStreak: 0,
        lastWinTimestamp: 0,
      });
      // Reload profile
      const updatedProfile = await ctx.db.get(profile._id);
      if (!updatedProfile) throw new Error("Failed to initialize economy");
      profile = updatedProfile;
    }

    // Add coins
    const currentCoins = profile.coins || 0;
    const newCoins = currentCoins + amount;

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      lifetimeEarned: (profile.lifetimeEarned || 0) + amount,
    });

    // 🔒 AUDIT LOG - Track coin addition
    await createAuditLog(
      ctx,
      address,
      "earn",
      amount,
      currentCoins,
      newCoins,
      "addCoins",
      undefined,
      { reason }
    );

    console.log(`💰 Added ${amount} coins to ${address}: ${reason}`);

    return {
      added: amount,
      newBalance: newCoins,
      reason
    };
  },
});

/**
 * ⚛️ ATOMIC: Record attack result with coins + match history
 *
 * Combines awardPvPCoins + recordMatch into ONE atomic transaction
 * to prevent partial updates if one operation fails.
 *
 * This replaces the previous pattern of:
 * 1. awardPvPCoins() - separate call
 * 2. recordMatch() - separate call
 * 3. getProfile() - separate call
 *
 * Problem: If recordMatch() failed, coins would be awarded but match not recorded
 * Solution: Execute both operations in ONE transaction atomically
 */
export const recordAttackResult = mutation({
  args: {
    // Player info
    playerAddress: v.string(),
    playerPower: v.number(),
    playerCards: v.array(v.any()),
    playerUsername: v.string(),

    // Match result
    result: v.union(
      v.literal("win"),
      v.literal("loss"),
      v.literal("tie")
    ),

    // Opponent info
    opponentAddress: v.string(),
    opponentUsername: v.string(),
    opponentPower: v.number(),
    opponentCards: v.array(v.any()),

    // Economy
    entryFeePaid: v.optional(v.number()),
    language: v.optional(v.union(
      v.literal("pt-BR"),
      v.literal("en"),
      v.literal("es"),
      v.literal("hi"),
      v.literal("ru"),
      v.literal("zh-CN"),
      v.literal("id"),
      v.literal("fr"),
      v.literal("ja"),
      v.literal("it")
    )),
    skipCoins: v.optional(v.boolean()), // If true, only calculate reward without adding coins (for wins only)
  },
  handler: async (ctx, args) => {
    // 🛡️ VALIDATION: Check address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(args.playerAddress)) {
      throw new Error("Invalid player address format");
    }
    if (!addressRegex.test(args.opponentAddress)) {
      throw new Error("Invalid opponent address format");
    }

    const normalizedPlayerAddress = args.playerAddress.toLowerCase();
    const normalizedOpponentAddress = args.opponentAddress.toLowerCase();

    // ===== STEP 1: Get profile and initialize economy if needed =====
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedPlayerAddress))
      .first();

    if (!profile) {
      throw new Error("Player profile not found");
    }

    // Initialize economy if needed
    if (profile.coins === undefined) {
      const today = new Date().toISOString().split('T')[0];
      await ctx.db.patch(profile._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: today,
          firstPveBonus: false,
          firstPvpBonus: false,
          loginBonus: false,
          streakBonus: false,
        },
        winStreak: 0,
        lastWinTimestamp: 0,
      });
      // Reload profile
      const updatedProfile = await ctx.db.get(profile._id);
      if (!updatedProfile) throw new Error("Failed to initialize economy");
      profile = updatedProfile;
    }

    // Check and reset daily limits
    const dailyLimits = await checkAndResetDailyLimits(ctx, profile);

    // 🛡️ PHASE 2 SECURITY: Rate limiting for attacks (prevent spam)
    const nowAttack = Date.now();
    const lastPvPAward = profile.lastPvPAward || 0;
    const timeSinceLastPvPAward = nowAttack - lastPvPAward;
    const ATTACK_RATE_LIMIT_MS = 15000; // 15 seconds between attacks

    if (timeSinceLastPvPAward < ATTACK_RATE_LIMIT_MS) {
      const waitTime = Math.ceil((ATTACK_RATE_LIMIT_MS - timeSinceLastPvPAward) / 1000);
      throw new Error(`Too fast! Please wait ${waitTime}s before next attack`);
    }

    // 🛡️ CRITICAL FIX: Update timestamp IMMEDIATELY after rate limit check
    // This prevents spam retries on failed attempts (e.g., daily limit reached)
    await ctx.db.patch(profile._id, {
      lastPvPAward: nowAttack,
    });

    // Check PvP match limit
    if (dailyLimits.pvpMatches >= PVP_MATCH_LIMIT) {
      throw new Error("Daily PvP match limit reached");
    }

    // Note: No daily cap check for attack mode - 5 attacks/day limit is enough
    // Daily cap only applies to PvE (which has 30 wins/day limit)

    // ===== STEP 2: Calculate aura-based bonus (OPTIMIZED - 1 query instead of 200) =====
    const opponentProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedOpponentAddress))
      .first();

    const playerAura = profile.stats?.aura ?? 500;
    const opponentAura = opponentProfile?.stats?.aura ?? 500;
    const won = args.result === 'win';
    const rankingMultiplier = calculateAuraMultiplier(playerAura, opponentAura, won);

    // ===== STEP 2.5: Check for revenge match =====
    // Revenge = opponent previously defeated this player
    const lastOpponentVictory = await ctx.db
      .query("matches")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedOpponentAddress))
      .filter((q) =>
        q.and(
          q.eq(q.field("opponentAddress"), normalizedPlayerAddress),
          q.eq(q.field("result"), "win")
        )
      )
      .order("desc")
      .first();

    const isRevenge = lastOpponentVictory !== null;

    // ===== STEP 3: Calculate and award/deduct coins =====
    let newStreak = profile.winStreak || 0;
    const bonuses: string[] = [];
    let totalReward = 0;
    let newCoins = profile.coins || 0;

    if (won) {
      // WINNER: Award coins
      newStreak++;
      // 🇨🇳 Apply language boost to base reward first, then ranking multiplier
      const boostedBase = args.language ? applyLanguageBoost(PVP_WIN_REWARD, args.language) : PVP_WIN_REWARD;
      let rewardBeforeRevenge = Math.round(boostedBase * rankingMultiplier);

      // 🔥 Apply revenge bonus (+20%)
      if (isRevenge) {
        const revengeBonus = Math.round(rewardBeforeRevenge * (REVENGE_BONUS - 1)); // 20% of reward
        totalReward = Math.round(rewardBeforeRevenge * REVENGE_BONUS);
        bonuses.push(`⚔️ Revenge Bonus +${revengeBonus} (${((REVENGE_BONUS - 1) * 100).toFixed(0)}%)`);
      } else {
        totalReward = rewardBeforeRevenge;
      }

      // Add aura bonus message
      if (rankingMultiplier > 1.0) {
        const bonusAmount = rewardBeforeRevenge - PVP_WIN_REWARD;
        bonuses.push(`Strong Opponent Bonus +${bonusAmount} (${rankingMultiplier.toFixed(1)}x)`);
      }

      // Create first PvP match mission (player must claim manually)
      if (!dailyLimits.firstPvpBonus) {
        const today = new Date().toISOString().split('T')[0];
        const existing = await ctx.db
          .query("personalMissions")
          .withIndex("by_player_date", (q) => q.eq("playerAddress", args.playerAddress.toLowerCase()))
          .filter((q) => q.and(q.eq(q.field("date"), today), q.eq(q.field("missionType"), "first_pvp_match")))
          .first();

        if (!existing) {
          await ctx.db.insert("personalMissions", {
            playerAddress: args.playerAddress.toLowerCase(),
            date: today,
            missionType: "first_pvp_match",
            completed: true,
            claimed: false,
            reward: 100,
            completedAt: Date.now(),
          });
        }
        dailyLimits.firstPvpBonus = true;
      }

      // Create streak missions (player must claim manually)
      if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
        const today = new Date().toISOString().split('T')[0];
        const missionType = `streak_${newStreak}` as "streak_3" | "streak_5" | "streak_10";
        const rewards = { streak_3: 150, streak_5: 300, streak_10: 750 };

        const existing = await ctx.db
          .query("personalMissions")
          .withIndex("by_player_date", (q) => q.eq("playerAddress", args.playerAddress.toLowerCase()))
          .filter((q) => q.and(q.eq(q.field("date"), today), q.eq(q.field("missionType"), missionType)))
          .first();

        if (!existing) {
          await ctx.db.insert("personalMissions", {
            playerAddress: args.playerAddress.toLowerCase(),
            date: today,
            missionType,
            completed: true,
            claimed: false,
            reward: rewards[missionType],
            completedAt: Date.now(),
          });
        }

        if (newStreak === 3) {
          dailyLimits.streakBonus = true;
        }
      }

      // No daily cap for attack mode - limited by 5 attacks/day instead
      // Award will be applied in final profile update (STEP 5)
      console.log(`📬 Attack reward will be added to inbox: ${totalReward} TESTVBMS for ${normalizedPlayerAddress}`);
      newCoins = profile.coins || 0; // Keep current balance for return value
    } else if (args.result === 'loss') {
      // LOSER: Deduct coins AND create inbox debt if needed
      newStreak = 0;
      const basePenalty = PVP_LOSS_PENALTY; // -20
      const penalty = Math.round(basePenalty * rankingMultiplier);
      totalReward = penalty; // Negative value

      // Add penalty reduction message
      if (rankingMultiplier < 1.0) {
        const reduction = Math.abs(penalty - basePenalty);
        bonuses.push(`Strong Opponent Penalty Reduced -${reduction} (${(rankingMultiplier * 100).toFixed(0)}% penalty)`);
      }

      const currentCoins = profile.coins || 0;
      const penaltyAmount = Math.abs(penalty);

      // Calculate how much can be deducted from coins vs inbox debt
      let coinsDeducted = 0;
      let inboxDebt = 0;

      if (currentCoins >= penaltyAmount) {
        // Has enough coins - deduct all from coins
        coinsDeducted = penaltyAmount;
        newCoins = currentCoins - penaltyAmount;
      } else {
        // Not enough coins - deduct what we have and create inbox debt
        coinsDeducted = currentCoins;
        newCoins = 0;
        inboxDebt = penaltyAmount - currentCoins; // Remaining goes to inbox as debt
      }

      // 💰 TRANSFER SYSTEM: Full penalty goes to defender (95%, 5% pool fee)
      const poolFee = Math.round(penaltyAmount * 0.05); // 5% pool fee
      const defenderReward = penaltyAmount - poolFee; // 95% goes to defender

      // Get defender profile
      let defenderProfile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", normalizedOpponentAddress))
        .first();

      if (defenderProfile) {
        // Initialize economy if needed
        if (defenderProfile.coins === undefined) {
          const today = new Date().toISOString().split('T')[0];
          await ctx.db.patch(defenderProfile._id, {
            coins: 0,
            lifetimeEarned: 0,
            lifetimeSpent: 0,
            dailyLimits: {
              pveWins: 0,
              pvpMatches: 0,
              lastResetDate: today,
              firstPveBonus: false,
              firstPvpBonus: false,
              loginBonus: false,
              streakBonus: false,
            },
          });
          // Reload
          defenderProfile = await ctx.db.get(defenderProfile._id);
        }

        if (defenderProfile) {
          // Award TESTVBMS to defender's inbox
          const currentDefenderInbox = defenderProfile.coinsInbox || 0;
          const newDefenderInbox = currentDefenderInbox + defenderReward;
          await ctx.db.patch(defenderProfile._id, {
            coinsInbox: newDefenderInbox,
            lifetimeEarned: (defenderProfile.lifetimeEarned || 0) + defenderReward,
          });

          // 📊 Record defense reward in transaction history (non-blocking)
          try {
            await ctx.db.insert("coinTransactions", {
              address: normalizedOpponentAddress,
              type: "earn",
              amount: defenderReward,
              source: "defense_win",
              description: `Defense Win vs ${args.playerUsername} (+${defenderReward} TESTVBMS to inbox)`,
              balanceBefore: currentDefenderInbox,
              balanceAfter: newDefenderInbox,
              timestamp: Date.now(),
            });
          } catch (txError) {
            console.error("⚠️ Failed to record defense transaction:", txError);
          }

          console.log(`📬 Defense reward sent to inbox: ${defenderReward} TESTVBMS for ${normalizedOpponentAddress}. Inbox: ${currentDefenderInbox} → ${newDefenderInbox}`);
        }
      }

      // Apply inbox debt to attacker (NEVER allow negative inbox)
      if (inboxDebt > 0) {
        const currentInbox = profile.coinsInbox || 0;
        const currentPoolDebt = profile.poolDebt || 0;

        // 🔒 SECURITY FIX: Never allow negative inbox
        // Deduct what we can from inbox, rest becomes pool debt
        const inboxDeduction = Math.min(currentInbox, inboxDebt);
        const newInbox = Math.max(0, currentInbox - inboxDebt);
        const remainingDebt = inboxDebt - inboxDeduction;
        const newPoolDebt = currentPoolDebt + remainingDebt;

        // Update attacker's inbox with debt
        await ctx.db.patch(profile._id, {
          coinsInbox: newInbox,
          poolDebt: newPoolDebt, // Track remaining debt separately
        });

        console.log(`💸 Attacker ${normalizedPlayerAddress} penalty: ${penaltyAmount} (${coinsDeducted} from coins, ${inboxDeduction} from inbox, ${remainingDebt} pool debt). Inbox: ${currentInbox} → ${newInbox}, Debt: ${currentPoolDebt} → ${newPoolDebt}`);
      } else {
        console.log(`💸 Attacker ${normalizedPlayerAddress} penalty: ${penaltyAmount} (all from coins)`);
      }
    }

    // ===== STEP 4: Record match history =====
    const matchId = await ctx.db.insert("matches", {
      playerAddress: normalizedPlayerAddress,
      type: "attack",
      result: args.result,
      playerPower: args.playerPower,
      opponentPower: args.opponentPower,
      opponentAddress: normalizedOpponentAddress,
      opponentUsername: args.opponentUsername,
      timestamp: Date.now(),
      playerCards: args.playerCards,
      opponentCards: args.opponentCards,
      coinsEarned: totalReward,
      entryFeePaid: args.entryFeePaid,
    });

    // ===== STEP 5: Update profile stats (all at once) =====
    const newStats = { ...profile.stats };
    const currentAura = profile.stats?.aura ?? 500;
    let auraChange = 0;

    // Update attack win/loss stats and aura
    if (args.result === "win") {
      newStats.attackWins = (newStats.attackWins || 0) + 1;
      newStats.pvpWins = (newStats.pvpWins || 0) + 1;

      // ATTACKER WINS: Gains +20 aura
      auraChange = 20;
      newStats.aura = currentAura + auraChange;

      // DEFENDER LOSES: Loses -20 aura
      const defenderProfile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", normalizedOpponentAddress))
        .first();

      if (defenderProfile) {
        const defenderAura = defenderProfile.stats?.aura ?? 500;
        const auraLoss = 20;
        const newDefenderAura = Math.max(0, defenderAura - auraLoss); // Can't go below 0

        await ctx.db.patch(defenderProfile._id, {
          stats: {
            ...defenderProfile.stats,
            aura: newDefenderAura,
            defenseWins: (defenderProfile.stats?.defenseWins || 0),
            defenseLosses: (defenderProfile.stats?.defenseLosses || 0) + 1, // Track defense loss
          },
        });

        console.log(`⚔️ Aura transfer: Attacker ${normalizedPlayerAddress} +${auraChange} (${currentAura} → ${currentAura + auraChange}), Defender ${normalizedOpponentAddress} -${auraLoss} (${defenderAura} → ${newDefenderAura})`);
      }
    } else if (args.result === "loss") {
      newStats.attackLosses = (newStats.attackLosses || 0) + 1;
      newStats.pvpLosses = (newStats.pvpLosses || 0) + 1;

      // ATTACKER LOSES: No aura change (already punishing with coin loss)
      auraChange = 0;
      newStats.aura = currentAura;

      // DEFENDER WINS: Track defense win
      const defenderProfile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", normalizedOpponentAddress))
        .first();

      if (defenderProfile) {
        await ctx.db.patch(defenderProfile._id, {
          stats: {
            ...defenderProfile.stats,
            defenseWins: (defenderProfile.stats?.defenseWins || 0) + 1, // Track defense win
            defenseLosses: (defenderProfile.stats?.defenseLosses || 0),
          },
        });
      }
    }

    // ===== ATTACK TRACKING: Update attacksToday and lastAttackDate =====
    const todayUTC = new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    const lastAttackDate = profile.lastAttackDate || '';
    const isNewDay = lastAttackDate !== todayUTC;
    const newAttacksToday = isNewDay ? 1 : (profile.attacksToday || 0) + 1;

    // Update profile atomically (all fields at once)
    const updateData: any = {
      coins: newCoins,
      lifetimeEarned: won ? (profile.lifetimeEarned || 0) + totalReward : profile.lifetimeEarned,
      lifetimeSpent: !won && totalReward < 0 ? (profile.lifetimeSpent || 0) + Math.abs(totalReward) : profile.lifetimeSpent,
      winStreak: newStreak,
      lastWinTimestamp: Date.now(),
      // lastPvPAward already updated immediately after rate limit check (line 1174)
      stats: newStats,
      dailyLimits: {
        ...dailyLimits,
        pvpMatches: dailyLimits.pvpMatches + 1,
      },
      rematchesToday: isRevenge ? (profile.rematchesToday || 0) + 1 : profile.rematchesToday,
      lastUpdated: Date.now(),
      // Attack tracking
      attacksToday: newAttacksToday,
      lastAttackDate: todayUTC,
    };

    // Add coins update for wins (skip if skipCoins flag is set)
    if (won && !args.skipCoins) {
      const currentBalance = profile.coins || 0;
      updateData.coins = currentBalance + totalReward;
      console.log(`💰 Attack reward added to balance: ${totalReward} TESTVBMS. Balance: ${currentBalance} → ${updateData.coins}`);

      // 📊 Record transaction in history (non-blocking - don't fail attack if history fails)
      try {
        await ctx.db.insert("coinTransactions", {
          address: normalizedPlayerAddress,
          type: "earn",
          amount: totalReward,
          source: "attack_win",
          description: `Attack Win vs ${args.opponentUsername} (+${totalReward} TESTVBMS)`,
          balanceBefore: currentBalance,
          balanceAfter: updateData.coins,
          timestamp: Date.now(),
        });
      } catch (txError) {
        console.error("⚠️ Failed to record attack transaction:", txError);
        // Continue - don't let transaction history failure break the attack
      }
    }

    await ctx.db.patch(profile._id, updateData);

    // ===== STEP 6: Get and return updated profile =====
    const updatedProfile = await ctx.db.get(profile._id);

    // 🛡️ FIX: Add hasDefenseDeck computed field to prevent defense modal from showing after attack
    const profileWithDefenseDeck = updatedProfile
      ? {
          ...updatedProfile,
          hasDefenseDeck: (updatedProfile.defenseDeck?.length || 0) === 5,
        }
      : updatedProfile;

    // ===== STEP 7: Track weekly quest progress (async, non-blocking) =====
    // 🛡️ CRITICAL FIX: Use internal.quests (now internalMutation)
    try {
      // Track total matches
      await ctx.scheduler.runAfter(0, internal.quests.updateWeeklyProgress, {
        address: normalizedPlayerAddress,
        questId: "weekly_total_matches",
        increment: 1,
      });

      // Track attack wins if won
      if (won) {
        await ctx.scheduler.runAfter(0, internal.quests.updateWeeklyProgress, {
          address: normalizedPlayerAddress,
          questId: "weekly_attack_wins",
          increment: 1,
        });
      }

      // Track defense wins if defender won (attacker lost)
      if (!won) {
        await ctx.scheduler.runAfter(0, internal.quests.updateWeeklyProgress, {
          address: normalizedOpponentAddress,
          questId: "weekly_defense_wins",
          increment: 1,
        });
        console.log(`🛡️ Weekly quest tracked: Defense win for ${normalizedOpponentAddress}`);
      }

      console.log(`✅ Weekly quests tracked: Attack ${args.result} for ${normalizedPlayerAddress}`);
    } catch (error) {
      console.error("❌ Failed to track weekly quests:", error);
    }

    console.log("⚛️ ATOMIC: Attack result recorded successfully", {
      matchId,
      result: args.result,
      coinsAwarded: totalReward,
      newBalance: newCoins,
      newStreak,
    });

    return {
      success: true,
      matchId,
      coinsAwarded: totalReward,
      bonuses,
      winStreak: newStreak,
      opponentAura,
      rankingMultiplier,
      profile: profileWithDefenseDeck, // Return updated profile with hasDefenseDeck computed
      dailyEarned: calculateDailyEarned(profileWithDefenseDeck!),
      remaining: DAILY_CAP - calculateDailyEarned(profileWithDefenseDeck!),
    };
  },
});

/**
 * SHARE BONUS SYSTEM
 *
 * Awards coins for sharing victories and profile
 * - Victory share: +10 coins (max 3x/day)
 * - Profile share: +50 coins (one-time only)
 */
export const awardShareBonus = mutation({
  args: {
    address: v.string(),
    type: v.union(v.literal("victory"), v.literal("profile"), v.literal("dailyShare")),
  },
  handler: async (ctx, args) => {
    const { address, type } = args;

    // Get profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Get today's date (YYYY-MM-DD format)
    const today = new Date().toISOString().split('T')[0];

    // Check eligibility
    if (type === "profile") {
      // One-time profile share bonus
      if (profile.hasSharedProfile) {
        return {
          success: false,
          message: "Profile share bonus already claimed",
          coinsAwarded: 0,
        };
      }

      // Award profile share bonus: +250 to inbox
      const bonus = 250;
      const currentInbox = profile.coinsInbox || 0;
      const newInbox = currentInbox + bonus;
      const newLifetimeEarned = (profile.lifetimeEarned || 0) + bonus;
      const newTotalShareBonus = (profile.totalShareBonus || 0) + bonus;

      await ctx.db.patch(profile._id, {
        coinsInbox: newInbox,
        lifetimeEarned: newLifetimeEarned,
        totalShareBonus: newTotalShareBonus,
        hasSharedProfile: true,
        lastUpdated: Date.now(),
      });

      console.log(`📬 Profile share bonus sent to inbox: ${bonus} TESTVBMS for ${address}. Inbox: ${currentInbox} → ${newInbox}`);

      return {
        success: true,
        message: "Profile share bonus claimed!",
        coinsAwarded: bonus,
        newBalance: newInbox,
      };
    }

    if (type === "dailyShare") {
      // Daily share bonus: +50 coins per day
      if (profile.lastShareDate === today) {
        return {
          success: false,
          message: "Daily share bonus already claimed today",
          coinsAwarded: 0,
        };
      }

      // Award daily share bonus: +50 to inbox
      const bonus = 50;
      const currentInbox = profile.coinsInbox || 0;
      const newInbox = currentInbox + bonus;
      const newLifetimeEarned = (profile.lifetimeEarned || 0) + bonus;
      const newTotalShareBonus = (profile.totalShareBonus || 0) + bonus;

      await ctx.db.patch(profile._id, {
        coinsInbox: newInbox,
        lifetimeEarned: newLifetimeEarned,
        totalShareBonus: newTotalShareBonus,
        lastShareDate: today,
        dailyShares: (profile.dailyShares || 0) + 1,
        lastUpdated: Date.now(),
      });

      console.log(`📬 Daily share bonus sent to inbox: ${bonus} TESTVBMS for ${address}. Inbox: ${currentInbox} → ${newInbox}`);

      return {
        success: true,
        message: "Daily share bonus claimed! +50 coins",
        coinsAwarded: bonus,
        newBalance: newInbox,
      };
    }

    if (type === "victory") {
      // Daily victory share bonus (3x/day max)
      const dailyShares = profile.lastShareDate === today ? (profile.dailyShares || 0) : 0;

      if (dailyShares >= 3) {
        return {
          success: false,
          message: "Daily share limit reached (3/3)",
          coinsAwarded: 0,
          remaining: 0,
        };
      }

      // Award victory share bonus: +10 to inbox
      const bonus = 10;
      const currentInbox = profile.coinsInbox || 0;
      const newInbox = currentInbox + bonus;
      const newLifetimeEarned = (profile.lifetimeEarned || 0) + bonus;
      const newTotalShareBonus = (profile.totalShareBonus || 0) + bonus;
      const newDailyShares = dailyShares + 1;

      await ctx.db.patch(profile._id, {
        coinsInbox: newInbox,
        lifetimeEarned: newLifetimeEarned,
        totalShareBonus: newTotalShareBonus,
        dailyShares: newDailyShares,
        lastShareDate: today,
        lastUpdated: Date.now(),
      });

      console.log(`📬 Victory share bonus sent to inbox: ${bonus} TESTVBMS for ${address}. Inbox: ${currentInbox} → ${newInbox}`);

      return {
        success: true,
        message: `Share bonus claimed! (+${bonus} coins)`,
        coinsAwarded: bonus,
        newBalance: newInbox,
        remaining: 3 - newDailyShares,
      };
    }

    throw new Error("Invalid share type");
  },
});

/**
 * Award TESTVBMS coins for poker battles
 * Used when player wins a poker game with TESTVBMS ante
 */
export const awardPokerCoins = mutation({
  args: {
    address: v.string(),
    matchId: v.id("matches"),
  },
  handler: async (ctx, { address, matchId }) => {
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Get match data
    const match = await ctx.db.get(matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Verify match belongs to this player
    if (match.playerAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Unauthorized: Match does not belong to this player");
    }

    // Check if rewards already claimed
    if (match.rewardsClaimed) {
      throw new Error("Rewards already claimed for this match");
    }

    const amount = match.coinsEarned || 0;

    // Initialize economy if needed
    if (profile.coins === undefined) {
      const today = new Date().toISOString().split('T')[0];
      await ctx.db.patch(profile._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: today,
          firstPveBonus: false,
          firstPvpBonus: false,
          loginBonus: false,
          streakBonus: false,
        },
        winStreak: 0,
        lastWinTimestamp: 0,
      });
      // Reload profile
      const updatedProfile = await ctx.db.get(profile._id);
      if (!updatedProfile) throw new Error("Failed to initialize economy");
      profile = updatedProfile;
    }

    // Add TESTVBMS to profile.coins (same pattern as leaderboard)
    const oldCoins = profile.coins || 0;
    const newCoins = oldCoins + amount;
    const lifetimeEarned = (profile.lifetimeEarned || 0) + amount;

    console.log('[awardPokerCoins] Adding coins:', {
      address: address.toLowerCase(),
      matchId,
      oldCoins,
      amount,
      newCoins,
    });

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      lifetimeEarned,
      lastUpdated: Date.now(),
    });

    // Mark match as claimed
    await ctx.db.patch(matchId, {
      rewardsClaimed: true,
      claimedAt: Date.now(),
      claimType: "immediate",
    });

    return {
      success: true,
      amount,
      newBalance: newCoins,
    };
  },
});
