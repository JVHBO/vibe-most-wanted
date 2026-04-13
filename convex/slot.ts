/**
 * SLOT MACHINE SYSTEM - 5x3 GRID
 *
 * Reuses the shared slot engine for:
 * - TCG combo detection
 * - ordered combo -> cascade resolution
 * - foil preservation
 * - bonus wildcard persistence during bonus spins
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  resolveSlotSpin,
  type SlotBonusState,
} from "../lib/slot/engine";
import {
  SLOT_BONUS_FREE_SPINS,
  SLOT_SPIN_BASE_COST,
  SLOT_TOTAL_CELLS,
} from "../lib/slot/config";

const bonusStateValidator = v.object({
  persistentWildcards: v.array(
    v.object({
      index: v.number(),
      growthLevel: v.number(),
    }),
  ),
});

// Helper to get profile by address (supports multi-wallet via addressLinks)
async function getProfileByAddress(ctx: any, address: string) {
  const normalizedAddress = address.toLowerCase();
  const addressLink = await ctx.db
    .query("addressLinks")
    .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
    .first();

  if (addressLink) {
    return ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", addressLink.primaryAddress))
      .first();
  }

  return ctx.db
    .query("profiles")
    .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
    .first();
}

async function getOrCreateDailyStats(ctx: any, normalizedAddress: string) {
  const today = new Date().toISOString().split("T")[0];
  let stats = await ctx.db
    .query("slotDailyStats")
    .withIndex("by_player_date", (q: any) =>
      q.eq("playerAddress", normalizedAddress).eq("date", today),
    )
    .first();

  if (stats) {
    return { stats, today };
  }

  const newStatsId = await ctx.db.insert("slotDailyStats", {
    playerAddress: normalizedAddress,
    date: today,
    freeSpinsUsed: 0,
    paidSpinsUsed: 0,
    totalSpins: 0,
    totalWon: 0,
    lastSpinTime: Date.now(),
  });

  const insertedStats = await ctx.db.get(newStatsId);
  if (!insertedStats) {
    throw new Error("Failed to create slot stats record");
  }

  return { stats: insertedStats, today };
}

/**
 * Get slot configuration
 */
export const getSlotConfig = query({
  args: {},
  handler: async () => {
    return {
      spinCost: SLOT_SPIN_BASE_COST,
      freeSpinsPerDay: 10,
      gridSize: SLOT_TOTAL_CELLS,
      bonusFreeSpins: SLOT_BONUS_FREE_SPINS,
    };
  },
});

/**
 * Get player's daily slot stats
 */
export const getSlotDailyStats = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const profile = await getProfileByAddress(ctx, address);
    if (!profile) {
      return {
        freeSpinsUsed: 0,
        paidSpinsUsed: 0,
        totalSpins: 0,
        totalWon: 0,
        remainingFreeSpins: 10,
        totalSpentToday: 0,
        bonusSpinsAvailable: 0,
      };
    }

    const normalizedAddress = address.toLowerCase();
    const today = new Date().toISOString().split("T")[0];
    const stats = await ctx.db
      .query("slotDailyStats")
      .withIndex("by_player_date", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("date", today),
      )
      .first();

    const hasVibeFIDBadge = profile.hasVibeBadge === true;
    const freeSpinsPerDay = hasVibeFIDBadge ? 10 : 5;
    const bonusSpinsAvailable = profile.slotBonusSpins || 0;

    if (!stats) {
      return {
        freeSpinsUsed: 0,
        paidSpinsUsed: 0,
        totalSpins: 0,
        totalWon: 0,
        remainingFreeSpins: freeSpinsPerDay,
        totalSpentToday: 0,
        bonusSpinsAvailable,
      };
    }

    return {
      freeSpinsUsed: stats.freeSpinsUsed,
      paidSpinsUsed: stats.paidSpinsUsed,
      totalSpins: stats.totalSpins,
      totalWon: stats.totalWon,
      remainingFreeSpins: Math.max(0, freeSpinsPerDay - stats.freeSpinsUsed),
      totalSpentToday: stats.paidSpinsUsed * SLOT_SPIN_BASE_COST,
      bonusSpinsAvailable,
    };
  },
});

/**
 * Perform a slot spin using the shared combo/cascade engine.
 */
export const spinSlot = mutation({
  args: {
    address: v.string(),
    isFreeSpin: v.boolean(),
    bonusMultiplier: v.optional(v.number()),
    betMultiplier: v.optional(v.number()),
    isBonusMode: v.optional(v.boolean()),
    bonusState: v.optional(bonusStateValidator),
  },
  handler: async (
    ctx,
    {
      address,
      isFreeSpin,
      bonusMultiplier = 1,
      betMultiplier = 1,
      isBonusMode = false,
      bonusState,
    },
  ) => {
    const profile = await getProfileByAddress(ctx, address);
    if (!profile) {
      throw new Error("Profile not found");
    }

    if (!profile.address) {
      throw new Error("Please connect wallet first");
    }

    const normalizedAddress = address.toLowerCase();
    const { stats } = await getOrCreateDailyStats(ctx, normalizedAddress);
    const storedBonusSpins = profile.slotBonusSpins || 0;
    const hasVibeFIDBadge = profile.hasVibeBadge === true;
    const dailyFreeSpins = hasVibeFIDBadge ? 10 : 5;
    const isStoredBonusSpin = isFreeSpin && isBonusMode && storedBonusSpins > 0;
    const dailyFreeSpinsRemaining = Math.max(0, dailyFreeSpins - stats.freeSpinsUsed);

    if (isFreeSpin && !isStoredBonusSpin && dailyFreeSpinsRemaining <= 0) {
      throw new Error("No free spins remaining today");
    }

    const spinCost = isFreeSpin
      ? 0
      : Math.max(1, Math.floor(SLOT_SPIN_BASE_COST * betMultiplier));

    const currentCoins = profile.coins || 0;
    if (!isFreeSpin && currentCoins < spinCost) {
      throw new Error(`Not enough coins. Need ${spinCost} coins.`);
    }

    const resolution = resolveSlotSpin(
      isBonusMode,
      isBonusMode ? ((bonusState as SlotBonusState | undefined) ?? undefined) : undefined,
    );

    const comboSteps = resolution.comboSteps.map((step) => ({
      ...step,
      reward: Math.floor(step.reward * bonusMultiplier * betMultiplier),
    }));

    const finalWin = comboSteps.reduce((sum, step) => sum + step.reward, 0);
    const winAdded = finalWin > 0;

    let nextCoins = currentCoins;
    if (!isFreeSpin) {
      nextCoins -= spinCost;
    }
    if (finalWin > 0) {
      nextCoins += finalWin;
    }

    let nextBonusSpins = storedBonusSpins;
    if (isStoredBonusSpin) {
      nextBonusSpins = Math.max(0, nextBonusSpins - 1);
    }
    if (resolution.triggeredBonus) {
      nextBonusSpins += resolution.bonusSpinsAwarded;
    }

    const profileUpdates: Record<string, number> = {};
    if (!isFreeSpin || finalWin > 0) {
      profileUpdates.coins = nextCoins;
    }
    if (isStoredBonusSpin || resolution.triggeredBonus) {
      profileUpdates.slotBonusSpins = nextBonusSpins;
    }
    if (Object.keys(profileUpdates).length > 0) {
      await ctx.db.patch(profile._id, profileUpdates);
    }

    await ctx.db.patch(stats._id, {
      freeSpinsUsed: stats.freeSpinsUsed + (isFreeSpin && !isStoredBonusSpin ? 1 : 0),
      paidSpinsUsed: stats.paidSpinsUsed + (!isFreeSpin ? 1 : 0),
      totalSpins: stats.totalSpins + 1,
      totalWon: stats.totalWon + finalWin,
      lastSpinTime: Date.now(),
    });

    await ctx.db.insert("slotSpins", {
      playerAddress: normalizedAddress,
      spinType: isStoredBonusSpin ? "bonus" : isFreeSpin ? "free" : "paid",
      spinCount: 1,
      cost: spinCost,
      reels: resolution.initialGrid.map((card) => card.baccarat),
      winAmount: finalWin,
      multiplier: bonusMultiplier,
      timestamp: Date.now(),
      claimed: winAdded,
      foilCount: resolution.finalFoilCount,
      triggeredBonus: resolution.triggeredBonus,
    });

    return {
      initialGrid: resolution.initialGrid,
      comboSteps,
      finalGrid: resolution.finalGrid,
      winAmount: finalWin,
      maxWin: finalWin >= 50000,
      foilCount: resolution.finalFoilCount,
      triggeredBonus: resolution.triggeredBonus,
      bonusSpinsAwarded: resolution.bonusSpinsAwarded,
      bonusSpinsRemaining: nextBonusSpins,
      bonusState: resolution.bonusState,
    };
  },
});

/**
 * Get spin history
 */
export const getSlotHistory = query({
  args: { address: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { address, limit = 10 }) => {
    const normalizedAddress = address.toLowerCase();
    const spins = await ctx.db
      .query("slotSpins")
      .withIndex("by_player_time", (q) => q.eq("playerAddress", normalizedAddress))
      .order("desc")
      .take(limit);

    return spins.map((spin) => ({
      grid: spin.reels,
      winAmount: spin.winAmount,
      patterns: [],
      timestamp: spin.timestamp,
      spinType: spin.spinType,
    }));
  },
});

/**
 * Deposit VBMS tokens to get coins (1 VBMS = 10 coins)
 */
export const depositVBMS = mutation({
  args: { address: v.string(), amount: v.number() },
  handler: async (ctx, { address, amount }) => {
    const profile = await getProfileByAddress(ctx, address);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentCoins = profile.coins || 0;
    const coinAmount = amount * 10;

    await ctx.db.patch(profile._id, {
      coins: currentCoins + coinAmount,
      lifetimeEarned: (profile.lifetimeEarned || 0) + coinAmount,
    });

    return {
      success: true,
      coinsAdded: coinAmount,
      newBalance: currentCoins + coinAmount,
    };
  },
});

/**
 * Withdraw coins to mint VBMS tokens (10 coins = 1 VBMS)
 */
export const withdrawVBMS = mutation({
  args: { address: v.string(), amount: v.number() },
  handler: async (ctx, { address, amount }) => {
    const profile = await getProfileByAddress(ctx, address);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const coinCost = amount * 10;
    const currentCoins = profile.coins || 0;

    if (currentCoins < coinCost) {
      throw new Error(`Insufficient coins. Need ${coinCost} coins for ${amount} VBMS`);
    }

    await ctx.db.patch(profile._id, {
      coins: currentCoins - coinCost,
      lifetimeSpent: (profile.lifetimeSpent || 0) + coinCost,
    });

    return {
      success: true,
      vbmsMinted: amount,
      newBalance: currentCoins - coinCost,
    };
  },
});

/**
 * ADMIN: Reset daily slot stats for testing
 */
export const resetDailyStats = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();
    const today = new Date().toISOString().split("T")[0];

    const stats = await ctx.db
      .query("slotDailyStats")
      .withIndex("by_player_date", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("date", today),
      )
      .first();

    if (stats) {
      await ctx.db.delete(stats._id);
    }

    const profile = await getProfileByAddress(ctx, address);
    if (profile) {
      await ctx.db.patch(profile._id, {
        slotBonusSpins: 0,
      });
    }

    return { success: true, message: "Stats resetados" };
  },
});

/**
 * ADMIN: Add bonus spins to player (for testing/giveaways)
 */
export const adminAddBonusSpins = mutation({
  args: { address: v.string(), count: v.number() },
  handler: async (ctx, { address, count }) => {
    const profile = await getProfileByAddress(ctx, address);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentBonus = profile.slotBonusSpins || 0;
    await ctx.db.patch(profile._id, {
      slotBonusSpins: currentBonus + count,
    });

    return { success: true, newBonusSpins: currentBonus + count };
  },
});
