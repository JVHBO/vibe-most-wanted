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
const SLOT_CARDS = [
  // Ultra rare (Mythic) - very low weight
  { baccarat: "jesse", rarity: "Mythic", weight: 1 },
  { baccarat: "anon", rarity: "Mythic", weight: 1 },
  { baccarat: "linda xied", rarity: "Mythic", weight: 1 },
  { baccarat: "vitalik jumpterin", rarity: "Mythic", weight: 1 },

  // Legendary
  { baccarat: "antonio", rarity: "Legendary", weight: 3 },
  { baccarat: "goofy romero", rarity: "Legendary", weight: 3 },
  { baccarat: "tukka", rarity: "Legendary", weight: 3 },
  { baccarat: "chilipepper", rarity: "Legendary", weight: 3 },
  { baccarat: "miguel", rarity: "Legendary", weight: 3 },
  { baccarat: "ye", rarity: "Legendary", weight: 3 },
  { baccarat: "nico", rarity: "Legendary", weight: 3 },

  // Epic
  { baccarat: "sartocrates", rarity: "Epic", weight: 6 },
  { baccarat: "0xdeployer", rarity: "Epic", weight: 6 },
  { baccarat: "lombra jr", rarity: "Epic", weight: 6 },
  { baccarat: "vibe intern", rarity: "Epic", weight: 6 },
  { baccarat: "jack the sniper", rarity: "Epic", weight: 6 },
  { baccarat: "beeper", rarity: "Epic", weight: 6 },
  { baccarat: "horsefarts", rarity: "Epic", weight: 6 },
  { baccarat: "jc denton", rarity: "Epic", weight: 6 },
  { baccarat: "zurkchad", rarity: "Epic", weight: 6 },
  { baccarat: "slaterg", rarity: "Epic", weight: 6 },
  { baccarat: "brian armstrong", rarity: "Epic", weight: 6 },
  { baccarat: "nftkid", rarity: "Epic", weight: 6 },

  // Rare
  { baccarat: "smolemaru", rarity: "Rare", weight: 10 },
  { baccarat: "ventra", rarity: "Rare", weight: 10 },
  { baccarat: "bradymck", rarity: "Rare", weight: 10 },
  { baccarat: "shills", rarity: "Rare", weight: 10 },
  { baccarat: "betobutter", rarity: "Rare", weight: 10 },
  { baccarat: "qrcodo", rarity: "Rare", weight: 10 },
  { baccarat: "loground", rarity: "Rare", weight: 10 },
  { baccarat: "melted", rarity: "Rare", weight: 10 },

  // Common - most frequent
  { baccarat: "rachel", rarity: "Common", weight: 20 },
  { baccarat: "claude", rarity: "Common", weight: 20 },
  { baccarat: "gozaru", rarity: "Common", weight: 20 },
  { baccarat: "ink", rarity: "Common", weight: 20 },
  { baccarat: "casa", rarity: "Common", weight: 20 },
  { baccarat: "groko", rarity: "Common", weight: 20 },
  { baccarat: "rizkybegitu", rarity: "Common", weight: 20 },
  { baccarat: "thosmur", rarity: "Common", weight: 20 },
  { baccarat: "brainpasta", rarity: "Common", weight: 20 },
  { baccarat: "gaypt", rarity: "Common", weight: 20 },
  { baccarat: "dan romero", rarity: "Common", weight: 20 },
  { baccarat: "morlacos", rarity: "Common", weight: 20 },
  { baccarat: "landmine", rarity: "Common", weight: 20 },
  { baccarat: "linux", rarity: "Common", weight: 20 },
  { baccarat: "joonx", rarity: "Common", weight: 20 },
  { baccarat: "don filthy", rarity: "Common", weight: 20 },
  { baccarat: "pooster", rarity: "Common", weight: 20 },
  { baccarat: "john porn", rarity: "Common", weight: 20 },
  { baccarat: "scum", rarity: "Common", weight: 20 },
  { baccarat: "vlady", rarity: "Common", weight: 20 },
];

// Payouts for winning patterns (4 in a row/col/diag)
const PAYOUTS = {
  // 4 matching rarities
  "4xmythic": 10000,     // Jackpot!
  "4xlegendary": 1000,
  "4xepic": 200,
  "4xrare": 50,
  "4xcommon": 10,

  // 3 matching (partial win)
  "3xmythic": 500,
  "3xlegendary": 100,
  "3xepic": 50,
  "3xrare": 15,
  "3xcommon": 5,

  // 2 matching
  "2xmythic": 25,
  "2xlegendary": 10,
  "2xepic": 5,
  "2xrare": 2,
  "2xcommon": 1,
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
 * Check winning patterns in 4x4 grid
 * Returns: { winAmount: number, patterns: string[], description: string }
 */
function checkWins(grid: typeof SLOT_CARDS): { winAmount: number; patterns: string[]; description: string; maxWin: boolean } {
  const rarities = grid.map(c => c.rarity.toLowerCase());
  let totalWin = 0;
  const patternsFound: string[] = [];
  let maxWin = false;

  // Helper to count matching rarities in a line
  const countLine = (indices: number[]): { rarity: string; count: number } => {
    const lineRarities = indices.map(i => rarities[i]);
    const counts: Record<string, number> = {};
    lineRarities.forEach(r => counts[r] = (counts[r] || 0) + 1);
    const maxCount = Math.max(...Object.values(counts));
    const maxRarity = Object.keys(counts).find(r => counts[r] === maxCount);
    return { rarity: maxRarity || "", count: maxCount };
  };

  // Check all 4 rows
  for (let row = 0; row < 4; row++) {
    const indices = [row * 4, row * 4 + 1, row * 4 + 2, row * 4 + 3];
    const { rarity, count } = countLine(indices);
    if (count >= 2) {
      const key = `${count}x${rarity}`;
      if (PAYOUTS[key]) {
        totalWin += PAYOUTS[key];
        patternsFound.push(`Row ${row + 1}: ${count}x ${rarity}`);
        if (key === "4xmythic") maxWin = true;
      }
    }
  }

  // Check all 4 columns
  for (let col = 0; col < 4; col++) {
    const indices = [col, col + 4, col + 8, col + 12];
    const { rarity, count } = countLine(indices);
    if (count >= 2) {
      const key = `${count}x${rarity}`;
      if (PAYOUTS[key]) {
        totalWin += PAYOUTS[key];
        patternsFound.push(`Col ${col + 1}: ${count}x ${rarity}`);
        if (key === "4xmythic") maxWin = true;
      }
    }
  }

  // Check diagonals
  const diag1 = [0, 5, 10, 15]; // top-left to bottom-right
  const { rarity: r1, count: c1 } = countLine(diag1);
  if (c1 >= 2) {
    const key = `${c1}x${r1}`;
    if (PAYOUTS[key]) {
      totalWin += PAYOUTS[key];
      patternsFound.push(`Diagonal \\: ${c1}x ${r1}`);
      if (key === "4xmythic") maxWin = true;
    }
  }

  const diag2 = [3, 6, 9, 12]; // top-right to bottom-left
  const { rarity: r2, count: c2 } = countLine(diag2);
  if (c2 >= 2) {
    const key = `${c2}x${r2}`;
    if (PAYOUTS[key]) {
      totalWin += PAYOUTS[key];
      patternsFound.push(`Diagonal /: ${c2}x ${r2}`);
      if (key === "4xmythic") maxWin = true;
    }
  }

  // Bonus: if any 3 mythics appear anywhere, add extra 100
  const mythicCount = rarities.filter(r => r === "mythic").length;
  if (mythicCount >= 3) {
    totalWin += 100;
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
  },
  handler: async (ctx, { address, isFreeSpin, bonusMultiplier = 1 }) => {
    const profile = await getProfileByAddress(ctx, address);
    if (!profile) {
      throw new Error("Profile not found");
    }

    if (!profile.address) {
      throw new Error("Please connect wallet first");
    }

    const today = new Date().toISOString().split('T')[0];
    let stats = await ctx.db
      .query("slotDailyStats")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", address).eq("date", today))
      .first();

    if (!stats) {
      stats = await ctx.db.insert("slotDailyStats", {
        playerAddress: address,
        date: today,
        freeSpinsUsed: 0,
        paidSpinsUsed: 0,
        totalSpins: 0,
        totalWon: 0,
        lastSpinTime: Date.now(),
      });
    }

    // Validate spins
    if (isFreeSpin) {
      const hasVibeFIDBadge = profile.hasVibeBadge === true;
      const freeSpinsPerDay = hasVibeFIDBadge ? 10 : 5;
      if (stats.freeSpinsUsed >= freeSpinsPerDay) {
        throw new Error("No free spins remaining today");
      }
      await ctx.db.patch(stats._id, {
        freeSpinsUsed: stats.freeSpinsUsed + 1,
        totalSpins: stats.totalSpins + 1,
        lastSpinTime: Date.now(),
      });
      // Re-fetch updated stats for return
      const updatedStats = await ctx.db
        .query("slotDailyStats")
        .withIndex("by_player_date", (q) => q.eq("playerAddress", address).eq("date", today))
        .first();
    } else {
      const currentCoins = profile.coins || 0;
      if (currentCoins < SPIN_COST) {
        throw new Error(`Not enough coins. Need ${SPIN_COST} coins.`);
      }
      await ctx.db.patch(profile._id, {
        coins: currentCoins - SPIN_COST,
      });
      await ctx.db.patch(stats._id, {
        paidSpinsUsed: stats.paidSpinsUsed + 1,
        totalSpins: stats.totalSpins + 1,
        lastSpinTime: Date.now(),
      });
      // Re-fetch updated stats for return
      const updatedStats = await ctx.db
        .query("slotDailyStats")
        .withIndex("by_player_date", (q) => q.eq("playerAddress", address).eq("date", today))
        .first();
    }

    // Generate 4x4 grid (16 cards)
    const grid = Array.from({ length: 16 }, () => getRandomCard());
    const { winAmount, patterns, maxWin } = checkWins(grid);

    // Apply bonus multiplier
    const finalWin = Math.floor(winAmount * bonusMultiplier);

    // Add winnings if any
    let winAdded = false;
    if (finalWin > 0) {
      const newBalance = (profile.coins || 0) + finalWin;
      await ctx.db.patch(profile._id, {
        coins: newBalance,
      });
      await ctx.db.patch(stats._id, {
        totalWon: stats.totalWon + finalWin,
      });
      winAdded = true;
    }

    // Record spin history
    await ctx.db.insert("slotSpins", {
      playerAddress: address,
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
