/**
 * Daily Attempts System
 *
 * Handles daily attempt limits for CPU poker mode and PvE battles
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Maximum attempts per day
const MAX_POKER_CPU_ATTEMPTS = 5;
const MAX_PVE_ATTEMPTS = 10;

// Get today's date in format YYYY-MM-DD
function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Get player's remaining poker CPU attempts for today
export const getRemainingPokerAttempts = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", args.address.toLowerCase()))
      .first();

    if (!profile) {
      return { remaining: MAX_POKER_CPU_ATTEMPTS, total: MAX_POKER_CPU_ATTEMPTS };
    }

    const today = getTodayDate();
    const dailyLimits = profile.dailyLimits;

    // If no daily limits or date is different, reset to max
    if (!dailyLimits || dailyLimits.lastResetDate !== today) {
      return { remaining: MAX_POKER_CPU_ATTEMPTS, total: MAX_POKER_CPU_ATTEMPTS };
    }

    const used = dailyLimits.pokerCpuAttempts || 0;
    const remaining = Math.max(0, MAX_POKER_CPU_ATTEMPTS - used);

    return { remaining, total: MAX_POKER_CPU_ATTEMPTS };
  },
});

// Get player's remaining PvE attempts for today
export const getRemainingPveAttempts = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", args.address.toLowerCase()))
      .first();

    if (!profile) {
      return { remaining: MAX_PVE_ATTEMPTS, total: MAX_PVE_ATTEMPTS };
    }

    const today = getTodayDate();
    const dailyLimits = profile.dailyLimits;

    // If no daily limits or date is different, reset to max
    if (!dailyLimits || dailyLimits.lastResetDate !== today) {
      return { remaining: MAX_PVE_ATTEMPTS, total: MAX_PVE_ATTEMPTS };
    }

    const used = dailyLimits.pveWins || 0;
    const remaining = Math.max(0, MAX_PVE_ATTEMPTS - used);

    return { remaining, total: MAX_PVE_ATTEMPTS };
  },
});

// Consume one poker CPU attempt
export const consumePokerAttempt = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", args.address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const today = getTodayDate();
    let dailyLimits = profile.dailyLimits;

    // Reset if new day
    if (!dailyLimits || dailyLimits.lastResetDate !== today) {
      dailyLimits = {
        pveWins: 0,
        pvpMatches: 0,
        pokerCpuAttempts: 0,
        lastResetDate: today,
        firstPveBonus: false,
        firstPvpBonus: false,
        loginBonus: false,
        streakBonus: false,
      };
    }

    const used = dailyLimits.pokerCpuAttempts || 0;

    // Check if player has attempts left
    if (used >= MAX_POKER_CPU_ATTEMPTS) {
      throw new Error(`Daily limit reached. You can play ${MAX_POKER_CPU_ATTEMPTS} CPU poker games per day. Come back tomorrow!`);
    }

    // Increment attempts
    dailyLimits.pokerCpuAttempts = used + 1;

    await ctx.db.patch(profile._id, {
      dailyLimits,
    });

    const remaining = MAX_POKER_CPU_ATTEMPTS - dailyLimits.pokerCpuAttempts;
    console.log(`🎮 ${args.address} consumed poker CPU attempt. Remaining: ${remaining}/${MAX_POKER_CPU_ATTEMPTS}`);

    return {
      success: true,
      remaining,
      total: MAX_POKER_CPU_ATTEMPTS,
    };
  },
});

// Consume one PvE attempt
export const consumePveAttempt = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", args.address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const today = getTodayDate();
    let dailyLimits = profile.dailyLimits;

    // Reset if new day
    if (!dailyLimits || dailyLimits.lastResetDate !== today) {
      dailyLimits = {
        pveWins: 0,
        pvpMatches: 0,
        pokerCpuAttempts: 0,
        lastResetDate: today,
        firstPveBonus: false,
        firstPvpBonus: false,
        loginBonus: false,
        streakBonus: false,
      };
    }

    const used = dailyLimits.pveWins || 0;

    // Check if player has attempts left
    if (used >= MAX_PVE_ATTEMPTS) {
      throw new Error(`Daily limit reached. You can play ${MAX_PVE_ATTEMPTS} PvE battles per day. Come back tomorrow!`);
    }

    // Increment attempts
    dailyLimits.pveWins = used + 1;

    await ctx.db.patch(profile._id, {
      dailyLimits,
    });

    const remaining = MAX_PVE_ATTEMPTS - dailyLimits.pveWins;
    console.log(`⚔️ ${args.address} consumed PvE attempt. Remaining: ${remaining}/${MAX_PVE_ATTEMPTS}`);

    return {
      success: true,
      remaining,
      total: MAX_PVE_ATTEMPTS,
    };
  },
});

// Award coins to player for winning CPU poker game
export const awardPokerWin = mutation({
  args: {
    address: v.string(),
    difficulty: v.union(
      v.literal("gey"),
      v.literal("goofy"),
      v.literal("gooner"),
      v.literal("gangster"),
      v.literal("gigachad")
    ),
    coinsWon: v.number(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", args.address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Add coins to player
    const currentCoins = profile.coins || 0;
    const newCoins = currentCoins + args.coinsWon;

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      lifetimeEarned: (profile.lifetimeEarned || 0) + args.coinsWon,
    });

    console.log(`💰 ${args.address} won ${args.coinsWon} coins on ${args.difficulty} difficulty (total: ${newCoins})`);

    return {
      success: true,
      coinsWon: args.coinsWon,
      newBalance: newCoins,
    };
  },
});
