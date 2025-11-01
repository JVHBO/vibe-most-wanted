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
const PVP_LOSS_REWARD = 20;

// Entry Fees
const ENTRY_FEES = {
  attack: 50,
  pvp: 80,
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
      profile = updatedProfile as any;
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
    await ctx.db.patch(profile._id, {
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
 * Award coins after PvP battle
 */
export const awardPvPCoins = mutation({
  args: {
    address: v.string(),
    won: v.boolean(),
  },
  handler: async (ctx, { address, won }) => {
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
      profile = updatedProfile as any;
    }

    // Check and reset daily limits
    const dailyLimits = await checkAndResetDailyLimits(ctx, profile);

    // Check PvP match limit
    if (dailyLimits.pvpMatches >= PVP_MATCH_LIMIT) {
      return { awarded: 0, reason: "Daily PvP match limit reached" };
    }

    // Calculate reward
    const baseReward = won ? PVP_WIN_REWARD : PVP_LOSS_REWARD;
    let totalReward = baseReward;
    const bonuses: string[] = [];

    // First PvP bonus
    if (!dailyLimits.firstPvpBonus) {
      totalReward += BONUSES.firstPvp;
      bonuses.push(`First PvP +${BONUSES.firstPvp}`);
      dailyLimits.firstPvpBonus = true;
    }

    // Update win streak
    let newStreak = profile.winStreak || 0;
    if (won) {
      newStreak++;
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
    } else {
      newStreak = 0; // Reset on loss
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
    await ctx.db.patch(profile._id, {
      coins: (profile.coins || 0) + totalReward,
      lifetimeEarned: (profile.lifetimeEarned || 0) + totalReward,
      winStreak: newStreak,
      lastWinTimestamp: Date.now(),
      dailyLimits: {
        ...dailyLimits,
        pvpMatches: dailyLimits.pvpMatches + 1,
      },
    });

    return {
      awarded: totalReward,
      bonuses,
      winStreak: newStreak,
      dailyEarned: dailyEarned + totalReward,
      remaining: DAILY_CAP - (dailyEarned + totalReward),
    };
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
    const profile = await ctx.db
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
      profile = updatedProfile as any;
    }

    // Check and reset daily limits
    const dailyLimits = await checkAndResetDailyLimits(ctx, profile);

    // Check if already claimed
    if (dailyLimits.loginBonus) {
      return { awarded: 0, reason: "Already claimed today" };
    }

    // Award bonus
    const bonus = BONUSES.login;

    await ctx.db.patch(profile._id, {
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

// Export API reference (will be generated by Convex)
import { api } from "./_generated/api";
