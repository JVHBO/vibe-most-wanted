/**
 * SLOT MACHINE SYSTEM - 5x2 GRID (casino style)
 *
 * Uses TCG cards from baccarat as slot symbols
 * - 5x2 grid (10 positions) - casino slot layout
 * - VBMS Special card: occupies 2 columns (full width) with animated GIF
 * - Foil mechanic: cards can have foil effect (shimmer)
 * - Bonus: 4+ foil cards in a spin → 10 free spins + increased rare card chance during bonus
 * - Winning patterns: rows (2 rows), columns (5 cols), special combinations
 * - Free spins: 10 daily for VibeFID holders + bonus spins
 * - Paid spins: cost scales with bet multiplier
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

// 5 paylines: 3 horizontal rows + 2 zigzag diagonals
// Grid indices: row * 5 + col (row 0 = top, row 2 = bottom)
const PAYLINES = [
  { name: "Row 1",      cells: [0, 1, 2, 3, 4]    },
  { name: "Row 2",      cells: [5, 6, 7, 8, 9]    },
  { name: "Row 3",      cells: [10, 11, 12, 13, 14] },
  { name: "Diagonal V", cells: [0, 6, 12, 8, 4]   }, // V-shape: top→mid→bot→mid→top
  { name: "Diagonal N", cells: [10, 6, 2, 8, 14]  }, // N-shape: bot→mid→top→mid→bot
];

// Payouts by count × rarity (consecutive from left in a payline)
const PAYOUTS = {
  // 5 in a row (jackpot)
  "5xmythic":    200000,
  "5xlegendary": 25000,
  "5xepic":      4000,
  "5xrare":      600,
  "5xcommon":    60,
  // 4 in a row
  "4xmythic":    50000,
  "4xlegendary": 5000,
  "4xepic":      800,
  "4xrare":      120,
  "4xcommon":    12,
  // 3 in a row (minimum win)
  "3xmythic":    2000,
  "3xlegendary": 300,
  "3xepic":      80,
  "3xrare":      20,
  "3xcommon":    4,
};

// Bonus free spins for hitting foil combo
const FOIL_BONUS_SPINS = 10;

const SPIN_COST = 1;
const COLS = 5;
const ROWS = 3;
const GRID_SIZE = COLS * ROWS; // 5x3 grid = 15 cards
const BONUS_FOIL_COUNT = 2; // 2+ foil cards triggers bonus (TESTING: easier to trigger)
const BONUS_FREE_SPINS = 10;
const WILDCARD_CARDS = ["gen4_turbo", "idle_breathing"]; // Special animated cards that act as wild
const WILDCARD_BACCARAT = "gen4_turbo"; // Special animated card that acts as wild

/**
 * Get weighted random card with optional bonus weight boost
 */
function getRandomCard(bonusWeightMultiplier = 1): typeof SLOT_CARDS[0] {
  // Apply weight boost for higher rarity during bonus mode
  const adjustedPool = SLOT_CARDS.map(card => ({
    ...card,
    adjustedWeight: card.rarity === "Mythic" || card.rarity === "Legendary"
      ? card.weight * bonusWeightMultiplier * 2
      : card.rarity === "Epic"
      ? card.weight * bonusWeightMultiplier * 1.5
      : card.weight
  }));

  const totalWeight = adjustedPool.reduce((sum, c) => sum + c.adjustedWeight, 0);
  let random = Math.random() * totalWeight;

  for (const card of adjustedPool) {
    random -= card.adjustedWeight;
    if (random <= 0) return card;
  }
  return adjustedPool[0];
}

type GridCard = { baccarat: string; rarity: string; hasFoil?: boolean; weight?: number };

/**
 * Count consecutive matching symbols from LEFT of a payline.
 * Wildcards (gen4_turbo) match anything.
 */
function countConsecutive(lineCards: GridCard[]): { count: number; char: string; rarity: string } {
  const isWild = (baccarat: string) => WILDCARD_CARDS.includes(baccarat);
  let baseChar = "", baseRarity = "common";
  for (const card of lineCards) {
    if (!isWild(card.baccarat)) { baseChar = card.baccarat; baseRarity = card.rarity.toLowerCase(); break; }
  }
  if (!baseChar) return { count: lineCards.length, char: "wildcard_combo", rarity: "mythic" };
  let count = 0;
  for (const card of lineCards) {
    if (card.baccarat === baseChar || isWild(card.baccarat)) count++;
    else break;
  }
  return { count, char: baseChar, rarity: baseRarity };
}

/**
 * Check all 5 paylines + VBMS scatter. Returns winning cell indices + payout.
 */
function checkWinningPaylines(grid: GridCard[]): {
  winningIndices: number[];
  winAmount: number;
  patterns: string[];
  maxWin: boolean;
} {
  const winSet = new Set<number>();
  let totalWin = 0;
  const patterns: string[] = [];
  let maxWin = false;

  for (const payline of PAYLINES) {
    const lineCards = payline.cells.map(i => grid[i]);
    const { count, char, rarity } = countConsecutive(lineCards);
    if (count >= 3) {
      const key = `${Math.min(count, 5)}x${rarity}` as keyof typeof PAYOUTS;
      if (PAYOUTS[key]) {
        totalWin += PAYOUTS[key];
        patterns.push(`${payline.name}: ${count}x ${char}`);
        payline.cells.slice(0, count).forEach(idx => winSet.add(idx));
        if (PAYOUTS[key] >= 50000) maxWin = true;
      }
    }
  }

  // VBMS Special scatter: 2+ anywhere = bonus payout
  const specials = grid.reduce<number[]>((a, c, i) => { if (c.baccarat === "vbms_special") a.push(i); return a; }, []);
  if (specials.length >= 2) {
    const spPay: Record<number, number> = { 2: 100, 3: 1500, 4: 30000, 5: 100000 };
    totalWin += spPay[Math.min(specials.length, 5)] ?? 0;
    patterns.push(`VBMS Special x${specials.length}!`);
    specials.forEach(i => winSet.add(i));
    if (specials.length >= 4) maxWin = true;
  }

  return { winningIndices: Array.from(winSet), winAmount: totalWin, patterns, maxWin };
}

/**
 * Remove winning cells from each column and fill top with new random cards (cascade).
 */
function cascadeGrid(grid: GridCard[], winningIndices: number[], isBonusMode: boolean): GridCard[] {
  const newGrid = [...grid];
  const winSet = new Set(winningIndices);
  for (let col = 0; col < COLS; col++) {
    const survivors: GridCard[] = [];
    for (let row = 0; row < ROWS; row++) {
      const idx = row * COLS + col;
      if (!winSet.has(idx)) survivors.push(grid[idx]);
    }
    const newCount = ROWS - survivors.length;
    const newCards: GridCard[] = Array.from({ length: newCount }, () => {
      if (isBonusMode && Math.random() < 0.35) {
        return { baccarat: "gen4_turbo", rarity: "Mythic", hasFoil: true, weight: 0 };
      }
      const card = getRandomCard(isBonusMode ? 5 : 1);
      return { ...card, hasFoil: isBonusMode ? Math.random() < 0.5 : Math.random() < 0.15 };
    });
    // New cards fall from top, survivors stay at bottom
    [...newCards, ...survivors].forEach((card, row) => { newGrid[row * COLS + col] = card; });
  }
  return newGrid;
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
    const bonusSpinsAvailable = profile.slotBonusSpins || 0;
    const totalBonusSpins = bonusSpinsAvailable; // Already accumulated

    return {
      freeSpinsUsed: stats.freeSpinsUsed,
      paidSpinsUsed: stats.paidSpinsUsed,
      totalSpins: stats.totalSpins,
      totalWon: stats.totalWon,
      remainingFreeSpins: Math.max(0, freeSpinsPerDay - stats.freeSpinsUsed),
      totalSpentToday: stats.paidSpinsUsed * SPIN_COST,
      bonusSpinsAvailable: totalBonusSpins,
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
    isBonusMode: v.optional(v.boolean()), // true when triggered from 4+ foil combo
  },
  handler: async (ctx, { address, isFreeSpin, bonusMultiplier = 1, betMultiplier = 1, isBonusMode = false }) => {
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

    // Check bonus free spins from foil combo
    const bonusSpinsAvailable = profile.slotBonusSpins || 0;
    const isBonusSpin = isBonusMode || (bonusSpinsAvailable > 0 && isFreeSpin);

    // Deduct bonus spins if used
    if (isBonusSpin && bonusSpinsAvailable > 0) {
      await ctx.db.patch(profile._id, {
        slotBonusSpins: Math.max(0, bonusSpinsAvailable - 1),
      });
    }

    // Calculate total free spins available (daily + bonus)
    const hasVibeFIDBadge = profile.hasVibeBadge === true;
    const dailyFreeSpins = hasVibeFIDBadge ? 10 : 5;
    const totalFreeSpinsAvailable = dailyFreeSpins - stats.freeSpinsUsed + (isBonusSpin ? 0 : (bonusSpinsAvailable));

    // Validate spins
    if (isFreeSpin) {
      if (totalFreeSpinsAvailable <= 0) {
        throw new Error("No free spins remaining today");
      }
      await ctx.db.patch(stats!._id, {
        freeSpinsUsed: stats!.freeSpinsUsed + (isBonusSpin ? 0 : 1), // Don't count bonus spins against daily limit
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

    // Determine weight multiplier for bonus mode (increases chance of rare cards)
    const weightMultiplier = isBonusMode ? 5 : 1; // 5x weight for Mythic/Legendary during bonus (TEST)

    // Generate initial 5x3 grid (15 cells)
    const initialGrid: GridCard[] = Array.from({ length: GRID_SIZE }, () => {
      if (isBonusMode && Math.random() < 0.3) {
        return { baccarat: "gen4_turbo", rarity: "Mythic", hasFoil: true, weight: 0 };
      }
      const card = getRandomCard(weightMultiplier);
      const foilChance = isBonusMode ? 0.55 : 0.15;
      return { ...card, hasFoil: Math.random() < foilChance };
    });

    // Count foil in initial grid (for bonus trigger)
    const foilCount = initialGrid.filter(c => c.hasFoil).length;
    const triggeredBonus = !isBonusMode && foilCount >= BONUS_FOIL_COUNT;

    // Run cascade: find wins → remove → fill → repeat until no more wins
    interface CascStep {
      grid: GridCard[];
      winningIndices: number[];
      winAmount: number;
      patterns: string[];
    }
    const cascadeSteps: CascStep[] = [];
    let currentGrid = [...initialGrid];
    let totalBaseWin = 0;
    let maxWin = false;

    for (let iter = 0; iter < 10; iter++) {
      const { winningIndices, winAmount, patterns, maxWin: mw } = checkWinningPaylines(currentGrid);
      if (winAmount === 0) break;
      cascadeSteps.push({ grid: [...currentGrid], winningIndices, winAmount, patterns });
      totalBaseWin += winAmount;
      if (mw) maxWin = true;
      currentGrid = cascadeGrid(currentGrid, winningIndices, isBonusMode);
    }

    const finalWin = Math.floor(totalBaseWin * bonusMultiplier * betMultiplier);

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

    // Grant bonus free spins if foil bonus triggered
    if (triggeredBonus) {
      const currentBonusSpins = profile.slotBonusSpins || 0;
      await ctx.db.patch(profile._id, {
        slotBonusSpins: currentBonusSpins + BONUS_FREE_SPINS,
      });
    }

    // Record spin history
    await ctx.db.insert("slotSpins", {
      playerAddress: normalizedAddress,
      spinType: isFreeSpin ? (isBonusSpin ? "bonus" : "free") : "paid",
      spinCount: 1,
      cost: isFreeSpin ? 0 : SPIN_COST,
      reels: initialGrid.map(c => c.baccarat),
      winAmount: finalWin,
      multiplier: bonusMultiplier,
      timestamp: Date.now(),
      claimed: winAdded,
      foilCount,
      triggeredBonus,
    });

    return {
      // Initial grid shown during spin (before cascade)
      initialGrid,
      // Each cascade step: grid before cascade, winning indices, payout, patterns
      cascadeSteps: cascadeSteps.map(s => ({
        grid: s.grid,
        winningIndices: s.winningIndices,
        winAmount: Math.floor(s.winAmount * bonusMultiplier * betMultiplier),
        patterns: s.patterns,
      })),
      // Final grid after all cascades (no more wins)
      finalGrid: currentGrid,
      winAmount: finalWin,
      patterns: cascadeSteps.flatMap(s => s.patterns),
      maxWin,
      foilCount,
      triggeredBonus,
      bonusSpinsRemaining: profile.slotBonusSpins || 0,
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

/**
 * ADMIN: Reset daily slot stats for testing
 */
export const resetDailyStats = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    // Find and delete today's stats
    const stats = await ctx.db
      .query("slotDailyStats")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", normalizedAddress).eq("date", today))
      .first();

    if (stats) {
      await ctx.db.delete(stats._id);
    }

    // Reset bonus spins on profile
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
