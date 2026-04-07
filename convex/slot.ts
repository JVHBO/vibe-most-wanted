/**
 * SLOT MACHINE SYSTEM - 4x4 GRID
 *
 * Uses TCG cards from baccarat as slot symbols
 * - 4x4 grid (16 positions) - spin all at once
 * - Winning patterns: rows, columns, diagonals
 * - Free spins: 10 daily for VibeFID holders
 * - Paid spins: 1 coin each (low values)
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

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

// Card symbols with weights
// Total pool weight: ~1000 → approximate rarity %:
//   Mythic    4×1  =   4  → ~0.4% each card, ~1.6% total
//   Legendary 7×4  =  28  → ~0.4%/card per draw, ~2.8% total
//   Epic      12×10= 120  → ~1.2% each, ~14.4% total
//   Rare      8×20 = 160  → ~2% each, ~16% total
//   Common    20×35= 700  → ~3.5% each, ~70% total
const SLOT_CARDS = [
  // VBMS Special (scatter) — bonus if 2/3/4 appear anywhere on grid
  { baccarat: "vbms_special",    rarity: "Special",   weight: 5 },

  // Mythic — ultra-rare, jackpot symbols
  { baccarat: "jesse",           rarity: "Mythic",    weight: 1 },
  { baccarat: "anon",            rarity: "Mythic",    weight: 1 },
  { baccarat: "linda xied",      rarity: "Mythic",    weight: 1 },
  { baccarat: "vitalik jumpterin",rarity: "Mythic",   weight: 1 },

  // Legendary
  { baccarat: "antonio",         rarity: "Legendary", weight: 4 },
  { baccarat: "goofy romero",    rarity: "Legendary", weight: 4 },
  { baccarat: "tukka",           rarity: "Legendary", weight: 4 },
  { baccarat: "chilipepper",     rarity: "Legendary", weight: 4 },
  { baccarat: "miguel",          rarity: "Legendary", weight: 4 },
  { baccarat: "ye",              rarity: "Legendary", weight: 4 },
  { baccarat: "nico",            rarity: "Legendary", weight: 4 },

  // Epic
  { baccarat: "sartocrates",     rarity: "Epic",      weight: 10 },
  { baccarat: "0xdeployer",      rarity: "Epic",      weight: 10 },
  { baccarat: "lombra jr",       rarity: "Epic",      weight: 10 },
  { baccarat: "vibe intern",     rarity: "Epic",      weight: 10 },
  { baccarat: "jack the sniper", rarity: "Epic",      weight: 10 },
  { baccarat: "beeper",          rarity: "Epic",      weight: 10 },
  { baccarat: "horsefarts",      rarity: "Epic",      weight: 10 },
  { baccarat: "jc denton",       rarity: "Epic",      weight: 10 },
  { baccarat: "zurkchad",        rarity: "Epic",      weight: 10 },
  { baccarat: "slaterg",         rarity: "Epic",      weight: 10 },
  { baccarat: "brian armstrong", rarity: "Epic",      weight: 10 },
  { baccarat: "nftkid",          rarity: "Epic",      weight: 10 },

  // Rare
  { baccarat: "smolemaru",       rarity: "Rare",      weight: 20 },
  { baccarat: "ventra",          rarity: "Rare",      weight: 20 },
  { baccarat: "bradymck",        rarity: "Rare",      weight: 20 },
  { baccarat: "shills",          rarity: "Rare",      weight: 20 },
  { baccarat: "betobutter",      rarity: "Rare",      weight: 20 },
  { baccarat: "qrcodo",          rarity: "Rare",      weight: 20 },
  { baccarat: "loground",        rarity: "Rare",      weight: 20 },
  { baccarat: "melted",          rarity: "Rare",      weight: 20 },

  // Common — most frequent
  { baccarat: "rachel",          rarity: "Common",    weight: 35 },
  { baccarat: "claude",          rarity: "Common",    weight: 35 },
  { baccarat: "gozaru",          rarity: "Common",    weight: 35 },
  { baccarat: "ink",             rarity: "Common",    weight: 35 },
  { baccarat: "casa",            rarity: "Common",    weight: 35 },
  { baccarat: "groko",           rarity: "Common",    weight: 35 },
  { baccarat: "rizkybegitu",     rarity: "Common",    weight: 35 },
  { baccarat: "thosmur",         rarity: "Common",    weight: 35 },
  { baccarat: "brainpasta",      rarity: "Common",    weight: 35 },
  { baccarat: "gaypt",           rarity: "Common",    weight: 35 },
  { baccarat: "dan romero",      rarity: "Common",    weight: 35 },
  { baccarat: "morlacos",        rarity: "Common",    weight: 35 },
  { baccarat: "landmine",        rarity: "Common",    weight: 35 },
  { baccarat: "linux",           rarity: "Common",    weight: 35 },
  { baccarat: "joonx",           rarity: "Common",    weight: 35 },
  { baccarat: "don filthy",      rarity: "Common",    weight: 35 },
  { baccarat: "pooster",         rarity: "Common",    weight: 35 },
  { baccarat: "john porn",       rarity: "Common",    weight: 35 },
  { baccarat: "scum",            rarity: "Common",    weight: 35 },
  { baccarat: "vlady",           rarity: "Common",    weight: 35 },
];

// Payouts for winning patterns (4 in a row/col/diag)
// Higher rarity = much harder to hit (lower weight), but much bigger reward.
// Expected value per spin ≈ 0.7–0.9 coins (house edge ~10–30%)
const PAYOUTS = {
  // 4 matching rarities — grand combos
  "4xmythic":    50000,  // Ultra jackpot (~1.6% × 4 draws chance)
  "4xlegendary": 5000,
  "4xepic":      800,
  "4xrare":      120,
  "4xcommon":    12,

  // 3 matching — good win
  "3xmythic":    2000,
  "3xlegendary": 300,
  "3xepic":      80,
  "3xrare":      20,
  "3xcommon":    4,

  // 2 matching — small consolation
  "2xmythic":    100,
  "2xlegendary": 20,
  "2xepic":      6,
  "2xrare":      2,
  "2xcommon":    1,
};

const SPIN_COST = 1;
const GRID_SIZE = 4;

/**
 * Get weighted random card
 */
function getRandomCard(): typeof SLOT_CARDS[0] {
  const totalWeight = SLOT_CARDS.reduce((sum, card) => sum + card.weight, 0);
  let random = Math.random() * totalWeight;

  for (const card of SLOT_CARDS) {
    random -= card.weight;
    if (random <= 0) return card;
  }
  return SLOT_CARDS[0];
}

/**
 * Check winning patterns in 4x4 grid — combos matched by CHARACTER NAME.
 * Same character in a line = win. Payout determined by that character's rarity.
 */
function checkWins(grid: typeof SLOT_CARDS): { winAmount: number; patterns: string[]; description: string; maxWin: boolean } {
  let totalWin = 0;
  const patternsFound: string[] = [];
  let maxWin = false;

  // Count matching CHARACTER NAMES in a line; return the most frequent char + its rarity
  const countLine = (indices: number[]): { rarity: string; count: number; char: string } => {
    const lineCards = indices.map(i => grid[i]);
    const counts: Record<string, number> = {};
    lineCards.forEach(c => { counts[c.baccarat] = (counts[c.baccarat] || 0) + 1; });
    const maxCount = Math.max(...Object.values(counts));
    const maxChar = Object.keys(counts).find(n => counts[n] === maxCount) ?? "";
    const rarity = lineCards.find(c => c.baccarat === maxChar)?.rarity?.toLowerCase() ?? "common";
    return { rarity, count: maxCount, char: maxChar };
  };

  const applyLine = (indices: number[], label: string) => {
    const { rarity, count, char } = countLine(indices);
    if (count >= 2 && char !== "") {
      const key = `${count}x${rarity}` as keyof typeof PAYOUTS;
      if (PAYOUTS[key]) {
        totalWin += PAYOUTS[key];
        patternsFound.push(`${label}: ${count}x ${char}`);
        if (key === "4xmythic" || key === "4xspecial") maxWin = true;
      }
    }
  };

  // Check all 4 rows
  for (let row = 0; row < 4; row++) {
    applyLine([row * 4, row * 4 + 1, row * 4 + 2, row * 4 + 3], `Row ${row + 1}`);
  }

  // Check all 4 columns
  for (let col = 0; col < 4; col++) {
    applyLine([col, col + 4, col + 8, col + 12], `Col ${col + 1}`);
  }

  // Check diagonals
  applyLine([0, 5, 10, 15], `Diagonal \\`);
  applyLine([3, 6, 9, 12], `Diagonal /`);

  // VBMS Special scatter bonus — counts anywhere on the 4×4 grid
  const specialCount = grid.filter(c => c.baccarat === "vbms_special").length;
  if (specialCount >= 2) {
    const specialPayouts: Record<number, number> = { 2: 100, 3: 1500, 4: 30000 };
    const specialPayout = specialPayouts[Math.min(specialCount, 4)] ?? 0;
    totalWin += specialPayout;
    patternsFound.push(`VBMS Special x${specialCount}!`);
    if (specialCount >= 4) maxWin = true;
  }

  // Bonus: scattered mythics anywhere on the board
  const mythicCount = rarities.filter(r => r === "mythic").length;
  if (mythicCount >= 3) {
    totalWin += 500;
    patternsFound.push(`${mythicCount} mythics scattered!`);
  }

  const description = patternsFound.length > 0 ? patternsFound.join(" | ") : "No win";

  return { winAmount: totalWin, patterns: patternsFound, description, maxWin };
}

/**
 * Get slot configuration
 */
export const getSlotConfig = query({
  args: {},
  handler: async () => {
    return {
      spinCost: SPIN_COST,
      freeSpinsPerDay: 10,
      gridSize: GRID_SIZE,
      payouts: PAYOUTS,
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
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const normalizedAddress = address.toLowerCase();
    const stats = await ctx.db
      .query("slotDailyStats")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", normalizedAddress).eq("date", today))
      .first();

    if (!stats) {
      return {
        freeSpinsUsed: 0,
        paidSpinsUsed: 0,
        totalSpins: 0,
        totalWon: 0,
        remainingFreeSpins: 10,
        totalSpentToday: 0,
      };
    }

    const hasVibeFIDBadge = profile.hasVibeBadge === true;
    const freeSpinsPerDay = hasVibeFIDBadge ? 10 : 5;

    return {
      freeSpinsUsed: stats.freeSpinsUsed,
      paidSpinsUsed: stats.paidSpinsUsed,
      totalSpins: stats.totalSpins,
      totalWon: stats.totalWon,
      remainingFreeSpins: Math.max(0, freeSpinsPerDay - stats.freeSpinsUsed),
      totalSpentToday: stats.paidSpinsUsed * SPIN_COST,
    };
  },
});

/**
 * Perform a slot spin (4x4 grid)
 */
export const spinSlot = mutation({
  args: {
    address: v.string(),
    isFreeSpin: v.boolean(),
    bonusMultiplier: v.optional(v.number()),
    betMultiplier: v.optional(v.number()), // 1, 2, 5, 10 — scales cost AND win
  },
  handler: async (ctx, { address, isFreeSpin, bonusMultiplier = 1, betMultiplier = 1 }) => {
    const profile = await getProfileByAddress(ctx, address);
    if (!profile) {
      throw new Error("Profile not found");
    }

    if (!profile.address) {
      throw new Error("Please connect wallet first");
    }

    const today = new Date().toISOString().split('T')[0];
    const normalizedAddress = address.toLowerCase();
    let stats = await ctx.db
      .query("slotDailyStats")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", normalizedAddress).eq("date", today))
      .first();

    if (!stats) {
      const newStatsId = await ctx.db.insert("slotDailyStats", {
        playerAddress: normalizedAddress,
        date: today,
        freeSpinsUsed: 0,
        paidSpinsUsed: 0,
        totalSpins: 0,
        totalWon: 0,
        lastSpinTime: Date.now(),
      });
      if (!newStatsId) {
        throw new Error("Failed to create slot stats record");
      }
      const insertedStats = await ctx.db.get(newStatsId);
      if (!insertedStats) {
        throw new Error("Failed to fetch inserted slot stats");
      }
      stats = insertedStats;
    }

    // Validate spins
    if (isFreeSpin) {
      const hasVibeFIDBadge = profile.hasVibeBadge === true;
      const freeSpinsPerDay = hasVibeFIDBadge ? 10 : 5;
      if (stats!.freeSpinsUsed >= freeSpinsPerDay) {
        throw new Error("No free spins remaining today");
      }
      await ctx.db.patch(stats!._id, {
        freeSpinsUsed: stats!.freeSpinsUsed + 1,
        totalSpins: stats!.totalSpins + 1,
        lastSpinTime: Date.now(),
      });
    } else {
      const totalCost = Math.max(1, Math.floor(SPIN_COST * betMultiplier));
      const currentCoins = profile.coins || 0;
      if (currentCoins < totalCost) {
        throw new Error(`Not enough coins. Need ${totalCost} coins.`);
      }
      await ctx.db.patch(profile._id, {
        coins: currentCoins - totalCost,
      });
      await ctx.db.patch(stats!._id, {
        paidSpinsUsed: stats!.paidSpinsUsed + 1,
        totalSpins: stats!.totalSpins + 1,
        lastSpinTime: Date.now(),
      });
    }

    // Generate 4x4 grid (16 cards)
    const grid = Array.from({ length: 16 }, () => getRandomCard());
    const { winAmount, patterns, maxWin } = checkWins(grid);

    // Apply bonus + bet multipliers
    const finalWin = Math.floor(winAmount * bonusMultiplier * betMultiplier);

    // Add winnings if any
    let winAdded = false;
    if (finalWin > 0) {
      const newBalance = (profile.coins || 0) + finalWin;
      await ctx.db.patch(profile._id, {
        coins: newBalance,
      });
      await ctx.db.patch(stats!._id, {
        totalWon: stats!.totalWon + finalWin,
      });
      winAdded = true;
    }

    // Record spin history
    await ctx.db.insert("slotSpins", {
      playerAddress: normalizedAddress,
      spinType: isFreeSpin ? "free" : "paid",
      spinCount: 1,
      cost: isFreeSpin ? 0 : SPIN_COST,
      reels: grid.map(c => c.baccarat), // 16 cards
      winAmount: finalWin,
      multiplier: bonusMultiplier,
      timestamp: Date.now(),
      claimed: winAdded,
    });

    return {
      grid,
      winAmount: finalWin,
      patterns,
      maxWin,
      newCoinsBalance: profile.coins && winAdded ? (profile.coins + finalWin) : profile.coins,
      isFreeSpin,
      bonusMultiplier,
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

    return spins.map(spin => ({
      grid: spin.reels,
      winAmount: spin.winAmount,
      patterns: [], // TODO: Store patterns in DB for history
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

    // TODO: Implement actual VBMS transfer validation
    // For now, just add coins
    const coinAmount = amount * 10; // 1 VBMS = 10 coins
    await ctx.db.patch(profile._id, {
      coins: (profile.coins || 0) + coinAmount,
      lifetimeEarned: (profile.lifetimeEarned || 0) + coinAmount,
    });

    return { success: true, coinsAdded: coinAmount, newBalance: profile.coins + coinAmount };
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

    const coinCost = amount * 10; // 10 coins per VBMS
    const currentCoins = profile.coins || 0;

    if (currentCoins < coinCost) {
      throw new Error(`Insufficient coins. Need ${coinCost} coins for ${amount} VBMS`);
    }

    // Deduct coins
    await ctx.db.patch(profile._id, {
      coins: currentCoins - coinCost,
      lifetimeSpent: (profile.lifetimeSpent || 0) + coinCost,
    });

    // TODO: Implement actual VBMS minting to user wallet
    // For now, return success
    return { success: true, vbmsMinted: amount, newBalance: profile.coins - coinCost };
  },
});
