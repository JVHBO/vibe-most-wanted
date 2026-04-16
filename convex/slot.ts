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
import { createAuditLog } from "./coinAudit";
import {
  SLOT_SPIN_BASE_COST,
  SLOT_BONUS_COST_MULT,
  SLOT_TOTAL_CELLS,
  SLOT_BONUS_FOIL_COUNT,
  SLOT_BONUS_FREE_SPINS,
  SLOT_DEV_ALLOWED_ADDRESSES,
  SLOT_FREE_SPINS_PER_DAY,
} from "../lib/slot/config";

const bonusStateValidator = v.object({
  persistentWildcards: v.array(
    v.object({
      index: v.number(),
      growthLevel: v.number(),
    }),
  ),
  spinsRemaining: v.number(),
  spinsSinceLastDragukka: v.optional(v.number()),
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
        remainingFreeSpins: SLOT_FREE_SPINS_PER_DAY,
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

    const bonusSpinsAvailable = profile.slotBonusSpins ?? 0;

    if (!stats) {
      return {
        freeSpinsUsed: 0,
        paidSpinsUsed: 0,
        totalSpins: 0,
        totalWon: 0,
        remainingFreeSpins: SLOT_FREE_SPINS_PER_DAY,
        totalSpentToday: 0,
        bonusSpinsAvailable,
      };
    }

    return {
      freeSpinsUsed: stats.freeSpinsUsed,
      paidSpinsUsed: stats.paidSpinsUsed,
      totalSpins: stats.totalSpins,
      totalWon: stats.totalWon,
      remainingFreeSpins: Math.max(0, SLOT_FREE_SPINS_PER_DAY - stats.freeSpinsUsed),
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
    buyBonusEntry: v.optional(v.boolean()),
    betMultiplier: v.optional(v.number()),
    isBonusMode: v.optional(v.boolean()),
    bonusState: v.optional(bonusStateValidator),
  },
  handler: async (
    ctx,
    {
      address,
      isFreeSpin,
      buyBonusEntry = false,
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

    // Only dev wallets can spin — all spins are free
    if (!SLOT_DEV_ALLOWED_ADDRESSES.includes(normalizedAddress as typeof SLOT_DEV_ALLOWED_ADDRESSES[number])) {
      throw new Error("Access denied: slot restricted to developer wallets");
    }

    // BUY BONUS entry: spin normal com 4 foils forçados, cobra 20× a aposta
    // Bonus spin (isBonusMode): free — já foi pago na entry
    // Free daily spin: free
    // Normal spin: cobra betMultiplier
    let spinCost = betMultiplier;
    if (buyBonusEntry) {
      // Entry do Buy Bonus — cobra 20× independente de isBonusMode
      spinCost = Math.round(betMultiplier * SLOT_BONUS_COST_MULT);
    } else if (isBonusMode) {
      spinCost = 0; // bonus spins são free após a entry
    } else if (isFreeSpin) {
      spinCost = 0; // free daily spin
    }

    const currentCoins = profile.coins || 0;

    if (currentCoins < spinCost) {
      throw new Error(`Insufficient coins. Need ${spinCost} coins to spin.`);
    }

    const resolution = resolveSlotSpin(
      isBonusMode,
      isBonusMode ? ((bonusState as SlotBonusState | undefined) ?? undefined) : undefined,
      buyBonusEntry ? SLOT_BONUS_FOIL_COUNT : 0, // BUY BONUS: força 4 foils para garantir trigger do bonus
    );

    // Flat payout — no bonus multiplier, no cascade multiplier
    const comboSteps = resolution.comboSteps.map((step) => ({
      ...step,
      // Minimum 1× bet per combo so small ranks always pay something
      reward: Math.max(betMultiplier, Math.floor(step.reward * betMultiplier / 100)),
    }));

    let finalWin = comboSteps.reduce((sum, step) => sum + step.reward, 0);

    // Max win cap: 100x betMultiplier
    const maxWin = betMultiplier * 100;
    if (finalWin > maxWin) {
      finalWin = maxWin;
    }

    let nextCoins = currentCoins;
    if (spinCost > 0) {
      nextCoins -= spinCost;
    }
    if (finalWin > 0) {
      nextCoins += finalWin;
    }

    const profileUpdates: Record<string, number> = {};
    if (nextCoins !== currentCoins) {
      profileUpdates.coins = nextCoins;
    }
    if (Object.keys(profileUpdates).length > 0) {
      await ctx.db.patch(profile._id, profileUpdates);
    }

    // Audit log + transaction history
    if (spinCost > 0) {
      await createAuditLog(ctx, normalizedAddress, "spend", spinCost, currentCoins, nextCoins - finalWin, "slot_spin");
      await ctx.db.insert("coinTransactions", {
        address: normalizedAddress,
        type: "spend",
        amount: spinCost,
        source: "slot",
        description: `Slot spin -${spinCost}`,
        balanceBefore: currentCoins,
        balanceAfter: nextCoins - finalWin,
        timestamp: Date.now(),
      });
    }
    if (finalWin > 0) {
      await createAuditLog(ctx, normalizedAddress, "earn", finalWin, nextCoins - finalWin, nextCoins, "slot_win");
      await ctx.db.insert("coinTransactions", {
        address: normalizedAddress,
        type: "earn",
        amount: finalWin,
        source: "slot",
        description: `Slot win +${finalWin}`,
        balanceBefore: nextCoins - finalWin,
        balanceAfter: nextCoins,
        timestamp: Date.now(),
      });
    }

    // Track stats: free daily spins vs paid spins vs bonus spins
    if (isFreeSpin && !isBonusMode) {
      // Daily free spin
      await ctx.db.patch(stats._id, {
        freeSpinsUsed: stats.freeSpinsUsed + 1,
        paidSpinsUsed: stats.paidSpinsUsed,
        totalSpins: stats.totalSpins + 1,
        totalWon: stats.totalWon + finalWin,
        lastSpinTime: Date.now(),
      });
    } else if (spinCost === 0 && isBonusMode) {
      // Bonus spin (already paid for via BUY BONUS entry)
      await ctx.db.patch(stats._id, {
        freeSpinsUsed: stats.freeSpinsUsed,
        paidSpinsUsed: stats.paidSpinsUsed,
        totalSpins: stats.totalSpins + 1,
        totalWon: stats.totalWon + finalWin,
        lastSpinTime: Date.now(),
      });
    } else {
      // Paid spin (normal or BUY BONUS entry)
      await ctx.db.patch(stats._id, {
        freeSpinsUsed: stats.freeSpinsUsed,
        paidSpinsUsed: stats.paidSpinsUsed + 1,
        totalSpins: stats.totalSpins + 1,
        totalWon: stats.totalWon + finalWin,
        lastSpinTime: Date.now(),
      });
    }

    const spinType = spinCost === 0 ? "free" : "paid";

    const spinId = await ctx.db.insert("slotSpins", {
      playerAddress: normalizedAddress,
      spinType,
      spinCount: 1,
      cost: spinCost,
      reels: resolution.initialGrid.map((card) => card.baccarat),
      winAmount: finalWin,
      multiplier: 1,
      timestamp: Date.now(),
      claimed: finalWin > 0,
      foilCount: resolution.finalFoilCount,
      triggeredBonus: resolution.triggeredBonus,
    });

    return {
      spinId,
      initialGrid: resolution.initialGrid,
      comboSteps,
      finalGrid: resolution.finalGrid,
      winAmount: finalWin,
      maxWin: finalWin >= 50000,
      foilCount: resolution.finalFoilCount,
      triggeredBonus: resolution.triggeredBonus,
      bonusSpinsAwarded: resolution.bonusSpinsAwarded,
      bonusSpinsRemaining: resolution.bonusSpinsRemaining,
      bonusState: resolution.bonusState,
    };
  },
});

/**
 * Get a single spin result by ID (for spin recovery after page reload)
 */
export const getSpinById = query({
  args: { spinId: v.id("slotSpins") },
  handler: async (ctx, { spinId }) => {
    const spin = await ctx.db.get(spinId);
    if (!spin) return null;
    return {
      spinId: spin._id,
      reels: spin.reels,
      winAmount: spin.winAmount,
      foilCount: spin.foilCount ?? 0,
      triggeredBonus: spin.triggeredBonus ?? false,
      timestamp: spin.timestamp,
      spinType: spin.spinType,
    };
  },
});

/**
 * Get last spin result for a player (for recovery on page reload)
 * Returns spins from the last 2 minutes only
 */
export const getLastSpinResult = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();
    const cutoff = Date.now() - 2 * 60 * 1000; // 2 minutes
    const spin = await ctx.db
      .query("slotSpins")
      .withIndex("by_player_time", (q) => q.eq("playerAddress", normalizedAddress))
      .order("desc")
      .first();
    if (!spin || spin.timestamp < cutoff) return null;
    return {
      spinId: spin._id,
      reels: spin.reels,
      winAmount: spin.winAmount,
      foilCount: spin.foilCount ?? 0,
      triggeredBonus: spin.triggeredBonus ?? false,
      timestamp: spin.timestamp,
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
