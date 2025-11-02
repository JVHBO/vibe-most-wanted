/**
 * ECONOMY SYSTEM ($TESTVBMS)
 *
 * Manages the in-game currency system for Vibe Most Wanted
 * - 10M $TESTVBMS total pool
 * - Daily caps: 3,500 $TESTVBMS per player
 * - Entry fees for PvP modes
 * - Persistent balances for future web3 claim
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Constants
const DAILY_CAP = 3500; // Max $TESTVBMS per day per player
const PVE_WIN_LIMIT = 30; // Max PvE wins per day
const PVP_MATCH_LIMIT = 10; // Max PvP matches per day

// PvE Rewards by Difficulty
const PVE_REWARDS = {
  gey: 5,
  goofy: 15,
  gooner: 30,
  gangster: 60,
  gigachad: 120,
};

// PvP Rewards
const PVP_WIN_REWARD = 100;
const PVP_LOSS_PENALTY = -20; // Lose 20 coins on loss

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
  attack: 50,
  pvp: 40,  // Reduced from 80 to 40
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
 */
export const resetDailyLimits = mutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];

    // Get all profiles
    const profiles = await ctx.db.query("profiles").collect();

    for (const profile of profiles) {
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
      }
    }

    return { success: true, resetsApplied: profiles.length };
  },
});

/**
 * Get opponent's leaderboard ranking
 * Returns ranking position (1 = first place) or 999 if not ranked
 */
async function getOpponentRanking(ctx: any, opponentAddress: string): Promise<number> {
  const leaderboard = await ctx.db
    .query("profiles")
    .filter((q: any) => q.gte(q.field("stats.totalPower"), 0))
    .collect();

  // Sort by total power (descending)
  const sorted = leaderboard.sort((a: any, b: any) =>
    (b.stats?.totalPower || 0) - (a.stats?.totalPower || 0)
  );

  // Find opponent's position
  const position = sorted.findIndex((p: any) =>
    p.address.toLowerCase() === opponentAddress.toLowerCase()
  );

  return position === -1 ? 999 : position + 1; // 1-indexed
}

/**
 * Calculate reward multiplier based on RANK DIFFERENCE
 * @param playerRank - Your ranking position (1 = first place)
 * @param opponentRank - Opponent's ranking position
 * @param isWin - true if player won, false if lost
 * @returns multiplier for coins (e.g., 1.5x, 2.0x)
 */
function calculateRankingMultiplier(playerRank: number, opponentRank: number, isWin: boolean): number {
  // Calculate rank difference (positive = opponent is higher ranked, negative = opponent is lower ranked)
  const rankDiff = playerRank - opponentRank; // If you're rank 50 and opponent is rank 3, diff = 47 (good!)

  if (isWin) {
    // Win bonuses - ONLY if opponent is higher ranked (opponentRank < playerRank)
    if (rankDiff <= 0) {
      // Attacking lower-ranked or equal players = no bonus
      return RANKING_BONUS_BY_DIFF.default;
    }

    // Opponent is higher ranked - calculate bonus based on how much higher
    if (rankDiff >= 50) return RANKING_BONUS_BY_DIFF.diff50Plus;   // 2.0x
    if (rankDiff >= 20) return RANKING_BONUS_BY_DIFF.diff20to49;   // 1.5x
    if (rankDiff >= 10) return RANKING_BONUS_BY_DIFF.diff10to19;   // 1.3x
    if (rankDiff >= 5) return RANKING_BONUS_BY_DIFF.diff5to9;      // 1.15x
    return RANKING_BONUS_BY_DIFF.default; // < 5 ranks = 1.0x
  } else {
    // Loss penalty reduction - ONLY if opponent is higher ranked
    if (rankDiff <= 0) {
      // Losing to lower-ranked or equal players = full penalty (no mercy!)
      return PENALTY_REDUCTION_BY_DIFF.default;
    }

    // Opponent is higher ranked - reduce penalty based on how much higher
    if (rankDiff >= 50) return PENALTY_REDUCTION_BY_DIFF.diff50Plus;   // 40% penalty (60% reduced)
    if (rankDiff >= 20) return PENALTY_REDUCTION_BY_DIFF.diff20to49;   // 50% penalty
    if (rankDiff >= 10) return PENALTY_REDUCTION_BY_DIFF.diff10to19;   // 65% penalty
    if (rankDiff >= 5) return PENALTY_REDUCTION_BY_DIFF.diff5to9;      // 80% penalty
    return PENALTY_REDUCTION_BY_DIFF.default; // < 5 ranks = 100% penalty
  }
}

/**
 * Check if player can receive daily limits before resetting
 */
async function checkAndResetDailyLimits(ctx: any, profile: any) {
  const today = new Date().toISOString().split('T')[0];

  if (!profile.dailyLimits || profile.dailyLimits.lastResetDate !== today) {
    // Reset daily limits
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
 * Shows how much player will gain (win) or lose (loss) based on opponent's ranking
 */
export const previewPvPRewards = query({
  args: {
    playerAddress: v.string(),
    opponentAddress: v.string(),
  },
  handler: async (ctx, { playerAddress, opponentAddress }) => {
    const player = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", playerAddress.toLowerCase()))
      .first();

    if (!player) {
      throw new Error("Player profile not found");
    }

    // Get both player and opponent rankings
    const playerRank = await getOpponentRanking(ctx, playerAddress);
    const opponentRank = await getOpponentRanking(ctx, opponentAddress);

    // Calculate multipliers based on rank difference
    const winMultiplier = calculateRankingMultiplier(playerRank, opponentRank, true);
    const lossMultiplier = calculateRankingMultiplier(playerRank, opponentRank, false);

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

    // Calculate total potential rewards
    const totalWinReward = winReward + streakBonus + firstPvpBonus;

    return {
      opponentRank,
      currentStreak,

      // Win scenario
      win: {
        baseReward: baseWinReward,
        rankingBonus: winBonus,
        rankingMultiplier: winMultiplier,
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
      playerRank: await getOpponentRanking(ctx, playerAddress),
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
  },
  handler: async (ctx, { address, difficulty, won }) => {
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

    // First PvE bonus
    if (!dailyLimits.firstPveBonus) {
      totalReward += BONUSES.firstPve;
      bonuses.push(`First PvE +${BONUSES.firstPve}`);
      dailyLimits.firstPveBonus = true;
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

    // Award coins
    await ctx.db.patch(profile!._id, {
      coins: (profile.coins || 0) + totalReward,
      lifetimeEarned: (profile.lifetimeEarned || 0) + totalReward,
      dailyLimits: {
        ...dailyLimits,
        pveWins: dailyLimits.pveWins + 1,
      },
    });

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
  },
  handler: async (ctx, { address, won, opponentAddress }) => {
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

    // Check PvP match limit
    if (dailyLimits.pvpMatches >= PVP_MATCH_LIMIT) {
      return { awarded: 0, reason: "Daily PvP match limit reached" };
    }

    // ✅ Calculate ranking bonus if opponent provided
    let playerRank = 999;
    let opponentRank = 999;
    let rankingMultiplier = 1.0;
    if (opponentAddress) {
      playerRank = await getOpponentRanking(ctx, address);
      opponentRank = await getOpponentRanking(ctx, opponentAddress);
      rankingMultiplier = calculateRankingMultiplier(playerRank, opponentRank, won);
    }

    // Update win streak
    let newStreak = profile.winStreak || 0;
    const bonuses: string[] = [];
    let totalReward = 0;

    if (won) {
      // WINNER: Award coins
      newStreak++;
      totalReward = Math.round(PVP_WIN_REWARD * rankingMultiplier); // ✅ Apply ranking multiplier

      // ✅ Add ranking bonus message
      if (rankingMultiplier > 1.0 && opponentAddress) {
        const bonusAmount = totalReward - PVP_WIN_REWARD;
        bonuses.push(`Rank #${opponentRank} Bonus +${bonusAmount} (${rankingMultiplier.toFixed(1)}x)`);
      }

      // First PvP bonus
      if (!dailyLimits.firstPvpBonus) {
        totalReward += BONUSES.firstPvp;
        bonuses.push(`First PvP +${BONUSES.firstPvp}`);
        dailyLimits.firstPvpBonus = true;
      }

      // Streak bonuses
      if (newStreak === 3 && !dailyLimits.streakBonus) {
        totalReward += BONUSES.streak3;
        bonuses.push(`3-Win Streak +${BONUSES.streak3}`);
        dailyLimits.streakBonus = true;
      } else if (newStreak === 5) {
        totalReward += BONUSES.streak5;
        bonuses.push(`5-Win Streak +${BONUSES.streak5}`);
      } else if (newStreak === 10) {
        totalReward += BONUSES.streak10;
        bonuses.push(`10-Win Streak +${BONUSES.streak10}`);
      }

      // Check daily cap for winners only
      const dailyEarned = calculateDailyEarned(profile);
      if (dailyEarned + totalReward > DAILY_CAP) {
        const remaining = Math.max(0, DAILY_CAP - dailyEarned);
        if (remaining === 0) {
          return { awarded: 0, reason: "Daily cap reached" };
        }
        totalReward = remaining;
      }

      // Award coins
      await ctx.db.patch(profile!._id, {
        coins: (profile.coins || 0) + totalReward,
        lifetimeEarned: (profile.lifetimeEarned || 0) + totalReward,
        winStreak: newStreak,
        lastWinTimestamp: Date.now(),
        dailyLimits: {
          ...dailyLimits,
          pvpMatches: dailyLimits.pvpMatches + 1,
        },
      });

      const dailyEarnedAfter = dailyEarned + totalReward;

      return {
        awarded: totalReward,
        bonuses,
        winStreak: newStreak,
        opponentRank, // ✅ Include opponent rank in response
        rankingMultiplier, // ✅ Include multiplier in response
        dailyEarned: dailyEarnedAfter,
        remaining: DAILY_CAP - dailyEarnedAfter,
      };
    } else {
      // LOSER: Deduct coins (with ranking-based penalty reduction)
      newStreak = 0; // Reset on loss
      const basePenalty = PVP_LOSS_PENALTY; // -20
      const penalty = Math.round(basePenalty * rankingMultiplier); // ✅ Apply penalty reduction
      const currentCoins = profile.coins || 0;
      const newCoins = Math.max(0, currentCoins + penalty); // Can't go below 0

      // ✅ Add penalty reduction message
      if (rankingMultiplier < 1.0 && opponentAddress) {
        const reduction = Math.abs(penalty - basePenalty);
        bonuses.push(`Rank #${opponentRank} Penalty Reduced -${reduction} (${(rankingMultiplier * 100).toFixed(0)}% penalty)`);
      }

      await ctx.db.patch(profile!._id, {
        coins: newCoins,
        lifetimeSpent: (profile.lifetimeSpent || 0) + Math.abs(penalty),
        winStreak: newStreak,
        lastWinTimestamp: Date.now(),
        dailyLimits: {
          ...dailyLimits,
          pvpMatches: dailyLimits.pvpMatches + 1,
        },
      });

      return {
        awarded: penalty, // Negative value (reduced if high-rank opponent)
        bonuses, // ✅ Now includes penalty reduction message
        winStreak: newStreak,
        opponentRank, // ✅ Include opponent rank in response
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

    // Check if already claimed
    if (dailyLimits.loginBonus) {
      return { awarded: 0, reason: "Already claimed today" };
    }

    // Award bonus
    const bonus = BONUSES.login;

    await ctx.db.patch(profile!._id, {
      coins: (profile.coins || 0) + bonus,
      lifetimeEarned: (profile.lifetimeEarned || 0) + bonus,
      dailyLimits: {
        ...dailyLimits,
        loginBonus: true,
      },
    });

    return { awarded: bonus, newBalance: (profile.coins || 0) + bonus };
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
      throw new Error(`Insufficient funds. Need ${fee} $TESTVBMS but only have ${currentCoins}`);
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
 * Add coins to a player (admin/system use)
 * Used for bonuses, compensation, and welcome gifts
 */
export const addCoins = mutation({
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
  },
  handler: async (ctx, args) => {
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

    // Check PvP match limit
    if (dailyLimits.pvpMatches >= PVP_MATCH_LIMIT) {
      throw new Error("Daily PvP match limit reached");
    }

    // ===== STEP 2: Calculate ranking bonus =====
    const playerRank = await getOpponentRanking(ctx, normalizedPlayerAddress);
    const opponentRank = await getOpponentRanking(ctx, normalizedOpponentAddress);
    const won = args.result === 'win';
    const rankingMultiplier = calculateRankingMultiplier(playerRank, opponentRank, won);

    // ===== STEP 3: Calculate and award/deduct coins =====
    let newStreak = profile.winStreak || 0;
    const bonuses: string[] = [];
    let totalReward = 0;
    let newCoins = profile.coins || 0;

    if (won) {
      // WINNER: Award coins
      newStreak++;
      totalReward = Math.round(PVP_WIN_REWARD * rankingMultiplier);

      // Add ranking bonus message
      if (rankingMultiplier > 1.0) {
        const bonusAmount = totalReward - PVP_WIN_REWARD;
        bonuses.push(`Rank #${opponentRank} Bonus +${bonusAmount} (${rankingMultiplier.toFixed(1)}x)`);
      }

      // First PvP bonus
      if (!dailyLimits.firstPvpBonus) {
        totalReward += BONUSES.firstPvp;
        bonuses.push(`First PvP +${BONUSES.firstPvp}`);
        dailyLimits.firstPvpBonus = true;
      }

      // Streak bonuses
      if (newStreak === 3 && !dailyLimits.streakBonus) {
        totalReward += BONUSES.streak3;
        bonuses.push(`3-Win Streak +${BONUSES.streak3}`);
        dailyLimits.streakBonus = true;
      } else if (newStreak === 5) {
        totalReward += BONUSES.streak5;
        bonuses.push(`5-Win Streak +${BONUSES.streak5}`);
      } else if (newStreak === 10) {
        totalReward += BONUSES.streak10;
        bonuses.push(`10-Win Streak +${BONUSES.streak10}`);
      }

      // Check daily cap
      const dailyEarned = calculateDailyEarned(profile);
      if (dailyEarned + totalReward > DAILY_CAP) {
        const remaining = Math.max(0, DAILY_CAP - dailyEarned);
        if (remaining === 0) {
          throw new Error("Daily cap reached");
        }
        totalReward = remaining;
      }

      newCoins = (profile.coins || 0) + totalReward;
    } else if (args.result === 'loss') {
      // LOSER: Deduct coins
      newStreak = 0;
      const basePenalty = PVP_LOSS_PENALTY; // -20
      const penalty = Math.round(basePenalty * rankingMultiplier);
      totalReward = penalty; // Negative value

      // Add penalty reduction message
      if (rankingMultiplier < 1.0) {
        const reduction = Math.abs(penalty - basePenalty);
        bonuses.push(`Rank #${opponentRank} Penalty Reduced -${reduction} (${(rankingMultiplier * 100).toFixed(0)}% penalty)`);
      }

      newCoins = Math.max(0, (profile.coins || 0) + penalty); // Can't go below 0
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

    // Update attack win/loss stats
    if (args.result === "win") {
      newStats.attackWins = (newStats.attackWins || 0) + 1;
      newStats.pvpWins = (newStats.pvpWins || 0) + 1;
    } else if (args.result === "loss") {
      newStats.attackLosses = (newStats.attackLosses || 0) + 1;
      newStats.pvpLosses = (newStats.pvpLosses || 0) + 1;
    }

    // Update profile atomically (all fields at once)
    await ctx.db.patch(profile._id, {
      coins: newCoins,
      lifetimeEarned: won ? (profile.lifetimeEarned || 0) + totalReward : profile.lifetimeEarned,
      lifetimeSpent: !won && totalReward < 0 ? (profile.lifetimeSpent || 0) + Math.abs(totalReward) : profile.lifetimeSpent,
      winStreak: newStreak,
      lastWinTimestamp: Date.now(),
      stats: newStats,
      dailyLimits: {
        ...dailyLimits,
        pvpMatches: dailyLimits.pvpMatches + 1,
      },
      lastUpdated: Date.now(),
    });

    // ===== STEP 6: Get and return updated profile =====
    const updatedProfile = await ctx.db.get(profile._id);

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
      opponentRank,
      rankingMultiplier,
      profile: updatedProfile, // Return updated profile so no need for getProfile() call
      dailyEarned: calculateDailyEarned(updatedProfile!),
      remaining: DAILY_CAP - calculateDailyEarned(updatedProfile!),
    };
  },
});

// Export API reference (will be generated by Convex)
import { api } from "./_generated/api";
