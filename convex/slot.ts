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
import { mutation, query, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
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
    sessionId: v.optional(v.string()),
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
      sessionId,
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

    // Combo boost: higher chance on first spins of the day, decays as player spins more
    // Spin 1-3: 60% | Spin 4-6: 40% | Spin 7-10: 25% | Spin 11-20: 15% | Spin 21+: 8%
    const totalSpinsToday = stats.totalSpins ?? 0;
    const comboBoostChance = isBonusMode ? 0 : (
      totalSpinsToday < 3  ? 0.60 :
      totalSpinsToday < 6  ? 0.40 :
      totalSpinsToday < 10 ? 0.25 :
      totalSpinsToday < 20 ? 0.15 : 0.08
    );

    const resolution = resolveSlotSpin(
      isBonusMode,
      isBonusMode ? ((bonusState as SlotBonusState | undefined) ?? undefined) : undefined,
      buyBonusEntry ? SLOT_BONUS_FOIL_COUNT : 0,
      comboBoostChance,
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
      sessionId: sessionId ?? undefined,
      finalGrid: resolution.finalGrid.map((c) => c.baccarat + (c.hasFoil ? ":f" : "")),
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
      finalGrid: spin.finalGrid ?? [],
      winAmount: spin.winAmount,
      foilCount: spin.foilCount ?? 0,
      triggeredBonus: spin.triggeredBonus ?? false,
      timestamp: spin.timestamp,
      spinType: spin.spinType,
      sessionId: spin.sessionId ?? null,
    };
  },
});

/**
 * Get all spins for a session (trigger + bonus spins) — public, for share replay
 */
export const getSpinsBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const spins = await ctx.db
      .query("slotSpins")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("asc")
      .take(20);
    return spins.map((spin) => ({
      spinId: spin._id,
      spinType: spin.spinType,
      finalGrid: spin.finalGrid ?? [],
      winAmount: spin.winAmount,
      foilCount: spin.foilCount ?? 0,
      triggeredBonus: spin.triggeredBonus ?? false,
      timestamp: spin.timestamp,
    }));
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
 * Deposit VBMS tokens to get coins (1 VBMS = 1 coin)
 */
export const depositVBMS = mutation({
  args: { address: v.string(), amount: v.number(), txHash: v.optional(v.string()) },
  handler: async (ctx, { address, amount, txHash }) => {
    const profile = await getProfileByAddress(ctx, address);
    if (!profile) {
      throw new Error("Profile not found");
    }

    // Idempotency: don't double-credit the same tx
    if (txHash) {
      const existing = await ctx.db.query("coinTransactions")
        .withIndex("by_txHash", (q) => q.eq("txHash", txHash))
        .first();
      if (existing) return { success: true, coinsAdded: 0, newBalance: profile.coins || 0, duplicate: true };
    }

    const currentCoins = profile.coins || 0;
    const coinAmount = amount; // 1:1

    await ctx.db.patch(profile._id, {
      coins: currentCoins + coinAmount,
      lifetimeEarned: (profile.lifetimeEarned || 0) + coinAmount,
    });

    await ctx.db.insert("coinTransactions", {
      address,
      type: "earn",
      amount: coinAmount,
      source: "vbms_deposit",
      description: `Depositou ${amount} VBMS → ${coinAmount} coins`,
      balanceBefore: currentCoins,
      balanceAfter: currentCoins + coinAmount,
      timestamp: Date.now(),
      ...(txHash ? { txHash } : {}),
    });

    return {
      success: true,
      coinsAdded: coinAmount,
      newBalance: currentCoins + coinAmount,
    };
  },
});

/**
 * Withdraw coins to get VBMS tokens back (1 coin = 1 VBMS)
 */
export const withdrawVBMS = mutation({
  args: { address: v.string(), amount: v.number() },
  handler: async (ctx, { address, amount }) => {
    const profile = await getProfileByAddress(ctx, address);
    if (!profile) {
      throw new Error("Profile not found");
    }

    const coinCost = amount; // 1:1
    const currentCoins = profile.coins || 0;

    if (currentCoins < coinCost) {
      throw new Error(`Insufficient coins. Need ${coinCost} coins for ${amount} VBMS`);
    }

    await ctx.db.patch(profile._id, {
      coins: currentCoins - coinCost,
      lifetimeSpent: (profile.lifetimeSpent || 0) + coinCost,
    });

    await ctx.db.insert("coinTransactions", {
      address,
      type: "convert",
      amount: coinCost,
      source: "vbms_withdraw",
      description: `Sacou ${amount} VBMS (${coinCost} coins)`,
      balanceBefore: currentCoins,
      balanceAfter: currentCoins - coinCost,
      timestamp: Date.now(),
    });

    return {
      success: true,
      vbmsMinted: amount,
      newBalance: currentCoins - coinCost,
    };
  },
});

// ─── Slot Withdraw: deduct coins + sign VBMS claim ─────────────────────────

export const prepareWithdraw = action({
  args: { address: v.string(), amount: v.number() },
  handler: async (ctx, { address, amount }): Promise<{
    amount: number;
    nonce: string;
    signature: string;
  }> => {
    // 1. Deduct coins from DB (reuse existing mutation)
    await ctx.runMutation(internal.slot.withdrawVBMSInternal, { address, amount });

    // 2. Generate nonce + sign
    const nonce = '0x' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const signature = await ctx.runAction(internal.vbmsClaim.signClaimMessage, {
      address,
      amount,
      nonce,
    });

    return { amount, nonce, signature };
  },
});

// Internal version of withdrawVBMS for use by prepareWithdraw action
export const withdrawVBMSInternal = internalMutation({
  args: { address: v.string(), amount: v.number() },
  handler: async (ctx, { address, amount }) => {
    const profile = await getProfileByAddress(ctx, address);
    if (!profile) throw new Error("Profile not found");
    const coinCost = amount;
    const currentCoins = profile.coins || 0;
    if (currentCoins < coinCost) throw new Error(`Insufficient coins. Need ${coinCost} coins for ${amount} VBMS`);

    await ctx.db.patch(profile._id, {
      coins: currentCoins - coinCost,
      lifetimeSpent: (profile.lifetimeSpent || 0) + coinCost,
    });
    await ctx.db.insert("coinTransactions", {
      address,
      type: "convert",
      amount: coinCost,
      source: "vbms_withdraw",
      description: `Sacou ${amount} VBMS (${coinCost} coins)`,
      balanceBefore: currentCoins,
      balanceAfter: currentCoins - coinCost,
      timestamp: Date.now(),
    });
    return { success: true };
  },
});

// ─── SlotCoinShop Event Polling ────────────────────────────────────────────

const SLOT_SHOP_BASE = "0x9d7e843f2c096434747b453381105f85d1cf2e9e";
const SLOT_SHOP_ARB  = "0x3736a48bd8ce9bee0602052b48254fc44ffc0daa";
const BASE_RPC = "https://mainnet.base.org";
const ARB_RPC  = "https://arb1.arbitrum.io/rpc";
const MAX_LOOKBACK_BASE = 3600;  // ~2h on Base @2s/block
const MAX_LOOKBACK_ARB  = 30000; // ~2h on ARB @0.25s/block

// CoinsPurchased(address indexed buyer, uint256 coinAmount, uint256 amountPaid, address indexed token)
const COINS_PURCHASED_TOPIC = "0x5842507407eb471873bd7ff006130a225e67e34dbb1249d9f15f80d797da0238";

/**
 * Internal mutation: credit coins for a SlotCoinShop purchase (idempotent via txHash)
 */
export const creditSlotPurchase = internalMutation({
  args: {
    buyer:      v.string(),
    coinAmount: v.number(),
    txHash:     v.string(),
    chain:      v.string(), // "base" | "arb"
    token:      v.string(), // "ETH" | "USDC" | "USDN"
    amountPaid: v.string(), // hex string of wei/units paid
  },
  handler: async (ctx, args) => {
    // Idempotency: skip if already processed
    const existing = await ctx.db
      .query("coinTransactions")
      .withIndex("by_txHash", q => q.eq("txHash", args.txHash))
      .first();
    if (existing) return { alreadyProcessed: true };

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", q => q.eq("address", args.buyer))
      .first();
    if (!profile) {
      console.warn(`[slotShop] No profile for buyer ${args.buyer}`);
      return { noProfile: true };
    }

    const currentCoins = profile.coins || 0;
    const newCoins = currentCoins + args.coinAmount;

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      lifetimeEarned: (profile.lifetimeEarned || 0) + args.coinAmount,
    });

    const chainLabel = args.chain === "base" ? "Base" : "ARB";
    await ctx.db.insert("coinTransactions", {
      address:      args.buyer,
      type:         "earn",
      amount:       args.coinAmount,
      source:       "slot_shop",
      description:  `Comprou ${args.coinAmount.toLocaleString()} coins com ${args.token} (${chainLabel})`,
      balanceBefore: currentCoins,
      balanceAfter:  newCoins,
      timestamp:    Date.now(),
      txHash:       args.txHash,
    });

    console.log(`[slotShop] Credited ${args.coinAmount} coins to ${args.buyer} (${args.chain} tx=${args.txHash})`);
    return { success: true, coinsAdded: args.coinAmount };
  },
});

/**
 * Internal mutation: save poller checkpoint
 */
export const saveSlotPollerState = internalMutation({
  args: { lastBaseBlock: v.optional(v.number()), lastArbBlock: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("slotShopPollerState").first();
    if (existing) {
      const patch: Record<string, number> = {};
      if (args.lastBaseBlock !== undefined) patch.lastBaseBlock = args.lastBaseBlock;
      if (args.lastArbBlock  !== undefined) patch.lastArbBlock  = args.lastArbBlock;
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("slotShopPollerState", {
        lastBaseBlock: args.lastBaseBlock,
        lastArbBlock:  args.lastArbBlock,
      });
    }
  },
});

/**
 * Internal action: polls Base for CoinsPurchased events
 */
export const pollSlotShopBase = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    try {
      const state = await ctx.runQuery(internal.slot.getSlotPollerStateQuery, {});
      const savedBlock: number | undefined = (state as any)?.lastBaseBlock;

      const blockResp = await fetch(BASE_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      });
      const { result: latestHex } = await blockResp.json() as any;
      const latest = parseInt(latestHex, 16);

      const fromBlockNum = savedBlock
        ? Math.max(savedBlock + 1, latest - MAX_LOOKBACK_BASE)
        : latest - MAX_LOOKBACK_BASE;
      if (fromBlockNum > latest) return;

      const fromBlock = "0x" + fromBlockNum.toString(16);

      const logsResp = await fetch(BASE_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 2,
          method: "eth_getLogs",
          params: [{ address: SLOT_SHOP_BASE, topics: [COINS_PURCHASED_TOPIC], fromBlock, toBlock: latestHex }],
        }),
      });
      const { result: logs } = await logsResp.json() as any;

      if (Array.isArray(logs)) {
        for (const log of logs) {
          const txHash = log.transactionHash as string;
          if (!txHash) continue;
          // topics[1]=buyer (indexed), topics[2]=token (indexed)
          // data = coinAmount (uint256) + amountPaid (uint256)
          const buyer = ("0x" + (log.topics[1] as string).slice(26)).toLowerCase();
          const tokenAddr = ("0x" + (log.topics[2] as string).slice(26)).toLowerCase();
          const data = (log.data as string).startsWith("0x") ? (log.data as string).slice(2) : (log.data as string);
          const coinAmount = parseInt(data.slice(0, 64), 16);
          const amountPaid = data.slice(64, 128);
          const token = tokenAddr === "0x0000000000000000000000000000000000000000" ? "ETH" : "USDC";
          if (!buyer || !coinAmount) continue;
          await ctx.runMutation(internal.slot.creditSlotPurchase, { buyer, coinAmount, txHash, chain: "base", token, amountPaid });
        }
      }

      await ctx.runMutation(internal.slot.saveSlotPollerState, { lastBaseBlock: latest });
    } catch (e) {
      console.error("[slotShop/pollBase] Error:", e);
    }
  },
});

/**
 * Internal action: polls ARB for CoinsPurchased events
 */
export const pollSlotShopArb = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    try {
      const state = await ctx.runQuery(internal.slot.getSlotPollerStateQuery, {});
      const savedBlock: number | undefined = (state as any)?.lastArbBlock;

      const blockResp = await fetch(ARB_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      });
      const { result: latestHex } = await blockResp.json() as any;
      const latest = parseInt(latestHex, 16);

      const fromBlockNum = savedBlock
        ? Math.max(savedBlock + 1, latest - MAX_LOOKBACK_ARB)
        : latest - MAX_LOOKBACK_ARB;
      if (fromBlockNum > latest) return;

      const fromBlock = "0x" + fromBlockNum.toString(16);

      const logsResp = await fetch(ARB_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 2,
          method: "eth_getLogs",
          params: [{ address: SLOT_SHOP_ARB, topics: [COINS_PURCHASED_TOPIC], fromBlock, toBlock: latestHex }],
        }),
      });
      const { result: logs } = await logsResp.json() as any;

      if (Array.isArray(logs)) {
        for (const log of logs) {
          const txHash = log.transactionHash as string;
          if (!txHash) continue;
          const buyer = ("0x" + (log.topics[1] as string).slice(26)).toLowerCase();
          const tokenAddr = ("0x" + (log.topics[2] as string).slice(26)).toLowerCase();
          const data = (log.data as string).startsWith("0x") ? (log.data as string).slice(2) : (log.data as string);
          const coinAmount = parseInt(data.slice(0, 64), 16);
          const amountPaid = data.slice(64, 128);
          const token = tokenAddr === "0x0000000000000000000000000000000000000000" ? "ETH" : "USDN";
          if (!buyer || !coinAmount) continue;
          await ctx.runMutation(internal.slot.creditSlotPurchase, { buyer, coinAmount, txHash, chain: "arb", token, amountPaid });
        }
      }

      await ctx.runMutation(internal.slot.saveSlotPollerState, { lastArbBlock: latest });
    } catch (e) {
      console.error("[slotShop/pollArb] Error:", e);
    }
  },
});

/**
 * Internal action: call Vercel endpoint to update slot pack prices on-chain
 */
export const updateSlotPricesAction = internalAction({
  args: {},
  handler: async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vibemostwanted.xyz";
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) throw new Error("CRON_SECRET not set");
    const res = await fetch(`${appUrl}/api/cron/update-slot-prices`, {
      headers: { authorization: `Bearer ${cronSecret}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`update-slot-prices failed: ${res.status} ${text}`);
    }
  },
});

/**
 * Internal query: get poller state
 */
export const getSlotPollerStateQuery = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("slotShopPollerState").first();
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
