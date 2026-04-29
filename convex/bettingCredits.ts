/**
 * BETTING CREDITS SYSTEM
 *
 * Players deposit VBMS to get betting credits
 * Credits are used for instant off-chain bets
 * Winnings can be withdrawn back to VBMS
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { isBlacklisted } from "./blacklist";

/**
 * ADD BETTING CREDITS
 * Called after player deposits VBMS to betting contract
 */
// Maximum entry limit for Mecha Arena
const MAX_BETTING_CREDITS = 10000;

const VBMS_TOKEN_BASE = "0xb03439567cd22f278b21e1ffcdfb8e1696763827";
const VBMS_POOL_TROLL = "0x062b914668f3fd35c3ae02e699cb82e1cf4be18b";
const BASE_RPC = "https://mainnet.base.org";
const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const RECEIPT_WAIT_ATTEMPTS = 45;
const RECEIPT_WAIT_MS = 2000;

function amountToWeiString(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid deposit amount.");
  const [whole, fraction = ""] = amount.toString().split(".");
  const normalizedFraction = (fraction + "0".repeat(18)).slice(0, 18);
  return (BigInt(whole) * 10n ** 18n + BigInt(normalizedFraction)).toString();
}

async function verifyBaseVBMSTransfer(
  txHash: string,
  expectedFrom: string,
  expectedAmountWei: string,
): Promise<void> {
  let receipt: any = null;
  for (let attempt = 0; attempt < RECEIPT_WAIT_ATTEMPTS; attempt++) {
    const receiptResp = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [txHash] }),
    });
    const payload = await receiptResp.json() as any;
    receipt = payload.result;
    if (receipt) break;
    await new Promise((resolve) => setTimeout(resolve, RECEIPT_WAIT_MS));
  }
  if (!receipt) throw new Error("Transaction receipt not found.");
  if (receipt.status !== "0x1") throw new Error("Transaction failed on-chain.");

  const expectedFromLower = expectedFrom.toLowerCase();
  const expectedToLower = VBMS_POOL_TROLL.toLowerCase();
  const expectedAmount = BigInt(expectedAmountWei);

  for (const log of receipt.logs || []) {
    if ((log.address || "").toLowerCase() !== VBMS_TOKEN_BASE) continue;
    if (log.topics?.[0] !== ERC20_TRANSFER_TOPIC) continue;
    const fromTopic = log.topics?.[1];
    const toTopic = log.topics?.[2];
    if (!fromTopic || !toTopic) continue;

    const actualFrom = ("0x" + fromTopic.slice(26)).toLowerCase();
    const actualTo = ("0x" + toTopic.slice(26)).toLowerCase();
    const actualAmount = BigInt(log.data);

    if (actualFrom === expectedFromLower && actualTo === expectedToLower && actualAmount >= expectedAmount) {
      return;
    }
  }

  throw new Error("No matching VBMS transfer to pool found in transaction logs.");
}

async function recordSecurityEvent(
  ctx: any,
  args: { address: string; status: "accepted" | "rejected"; reason?: string; txHash?: string; amount?: number },
) {
  await ctx.runMutation(internal.securityEvents.record, {
    address: args.address,
    feature: "bettingCredits",
    action: "addBettingCredits",
    status: args.status,
    reason: args.reason,
    txHash: args.txHash,
    amount: args.amount,
  });
}

export const addBettingCredits: any = action({
  args: {
    address: v.string(),
    amount: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx: any, args: { address: string; amount: number; txHash: string }): Promise<any> => {
    const { address, amount, txHash } = args;
    const normalizedAddress = address.toLowerCase();

    if (isBlacklisted(normalizedAddress)) {
      await recordSecurityEvent(ctx, { address, amount, txHash, status: "rejected", reason: "blacklisted_address" });
      throw new Error("Address is banned");
    }

    if (!TX_HASH_REGEX.test(txHash)) {
      await recordSecurityEvent(ctx, { address, amount, txHash, status: "rejected", reason: "invalid_tx_hash" });
      throw new Error("Invalid transaction hash");
    }

    if (amount > MAX_BETTING_CREDITS) {
      await recordSecurityEvent(ctx, { address, amount, txHash, status: "rejected", reason: "amount_above_limit" });
      throw new Error(`Maximum entry is ${MAX_BETTING_CREDITS} VBMS`);
    }

    try {
      await verifyBaseVBMSTransfer(txHash, address, amountToWeiString(amount));
    } catch (error: any) {
      await recordSecurityEvent(ctx, { address, amount, txHash, status: "rejected", reason: error?.message || "verification_failed" });
      throw error;
    }

    const result = await ctx.runMutation(internal.bettingCredits.creditVerifiedBettingCredits, args);
    await recordSecurityEvent(ctx, { address, amount, txHash, status: "accepted", reason: "onchain_transfer_verified" });
    return result;
  },
});

export const creditVerifiedBettingCredits = internalMutation({
  args: {
    address: v.string(),
    amount: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx: any, args: { address: string; amount: number; txHash: string }): Promise<any> => {
    const { address, amount, txHash } = args;
    const normalizedAddress = address.toLowerCase();

    if (isBlacklisted(normalizedAddress)) {
      throw new Error("Address is banned");
    }

    if (amount > MAX_BETTING_CREDITS) {
      throw new Error(`Maximum entry is ${MAX_BETTING_CREDITS} VBMS`);
    }

    const existingTx = await ctx.db
      .query("bettingTransactions")
      .withIndex("by_txHash", (q: any) => q.eq("txHash", txHash))
      .first();

    if (existingTx) {
      throw new Error("Transaction already processed");
    }

    let credits = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
      .first();

    const currentBalance = credits?.balance || 0;
    if (currentBalance + amount > MAX_BETTING_CREDITS) {
      throw new Error(`Maximum balance is ${MAX_BETTING_CREDITS} credits. You have ${currentBalance} credits.`);
    }

    if (credits) {
      await ctx.db.patch(credits._id, {
        balance: credits.balance + amount,
        totalDeposited: (credits.totalDeposited || 0) + amount,
        lastDeposit: Date.now(),
      });
    } else {
      await ctx.db.insert("bettingCredits", {
        address: normalizedAddress,
        balance: amount,
        totalDeposited: amount,
        totalWithdrawn: 0,
        lastDeposit: Date.now(),
        txHash,
      });
    }

    await ctx.db.insert("bettingTransactions", {
      address: normalizedAddress,
      type: "deposit",
      amount,
      txHash,
      timestamp: Date.now(),
    });

    return {
      success: true,
      newBalance: credits ? credits.balance + amount : amount,
    };
  },
});

/**
 * GET BETTING CREDITS BALANCE
 */
export const getBettingCredits = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    const credits = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    return {
      balance: credits?.balance || 0,
      totalDeposited: credits?.totalDeposited || 0,
      totalWithdrawn: credits?.totalWithdrawn || 0,
    };
  },
});

/**
 * PLACE BET USING CREDITS
 */
export const placeBetWithCredits = mutation({
  args: {
    address: v.string(),
    roomId: v.string(),
    betOn: v.string(), // Player address to bet on
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const { address, roomId, betOn, amount } = args;
    const normalizedAddress = address.toLowerCase();

    // Check balance
    const credits = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!credits || credits.balance < amount) {
      throw new Error("Insufficient betting credits");
    }

    // Deduct credits
    await ctx.db.patch(credits._id, {
      balance: credits.balance - amount,
    });

    // Get usernames from profiles
    const bettorProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();
    const betOnNormalized = betOn.toLowerCase();
    const betOnProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", betOnNormalized))
      .first();

    // Create bet record
    await ctx.db.insert("pokerBets", {
      roomId,
      bettor: normalizedAddress,
      bettorUsername: bettorProfile?.username || "",
      betOn: betOnNormalized,
      betOnUsername: betOnProfile?.username || "",
      amount,
      token: "VBMS",
      status: "active",
      timestamp: Date.now(),
    });

    // Log transaction
    await ctx.db.insert("bettingTransactions", {
      address: normalizedAddress,
      type: "bet",
      amount: -amount,
      roomId,
      timestamp: Date.now(),
    });

    return {
      success: true,
      newBalance: credits.balance - amount,
    };
  },
});

/**
 * RESOLVE BETS AND DISTRIBUTE WINNINGS
 * Called when poker battle ends
 *
 * POOL-BASED SYSTEM:
 * - Total pool = all bets placed
 * - House takes 5% fee
 * - Remaining 95% distributed to winners proportionally
 * - Winners get TESTVBMS sent to inbox
 */
export const resolveBets = mutation({
  args: {
    roomId: v.string(),
    winnerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const { roomId, winnerAddress } = args;
    const normalizedWinner = winnerAddress.toLowerCase();

    // Get all active bets for this room
    const bets = await ctx.db
      .query("pokerBets")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (bets.length === 0) {
      return {
        success: true,
        betsResolved: 0,
        totalPool: 0,
        totalPaidOut: 0,
        houseFee: 0,
      };
    }

    // Calculate pool
    const totalPool = bets.reduce((sum, bet) => sum + bet.amount, 0);
    const houseFee = totalPool * 0.05; // 5% house fee
    const prizePool = totalPool - houseFee;

    // Separate winners and losers
    const winningBets = bets.filter(b => b.betOn.toLowerCase() === normalizedWinner);
    const losingBets = bets.filter(b => b.betOn.toLowerCase() !== normalizedWinner);

    // Calculate total bet on winner
    const totalOnWinner = winningBets.reduce((sum, bet) => sum + bet.amount, 0);

    let totalPaidOut = 0;

    // Process winners - send TESTVBMS to inbox (winnings + unspent credits)
    for (const bet of winningBets) {
      // Calculate proportional payout from pool
      const payout = totalOnWinner > 0 ? (bet.amount / totalOnWinner) * prizePool : 0;
      totalPaidOut += payout;

      // Get bettor's remaining credits (not bet on this battle)
      const credits = await ctx.db
        .query("bettingCredits")
        .withIndex("by_address", (q) => q.eq("address", bet.bettor))
        .first();

      const remainingCredits = credits?.balance || 0;
      const totalToInbox = Math.floor(payout) + remainingCredits;

      // Update bet status
      await ctx.db.patch(bet._id, {
        status: "won",
        payout: Math.floor(payout),
        resolvedAt: Date.now(),
      });

      // Reset betting credits to 0 (all going to inbox)
      if (credits) {
        await ctx.db.patch(credits._id, {
          balance: 0,
        });
      }

      // Add TESTVBMS to profile coins (winnings + remaining credits)
      if (totalToInbox > 0) {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_address", (q) => q.eq("address", bet.bettor))
          .first();

        if (profile) {
          const currentBalance = profile.coins || 0;
          await ctx.db.patch(profile._id, {
            coins: currentBalance + totalToInbox,
            lifetimeEarned: (profile.lifetimeEarned || 0) + totalToInbox,
            lastUpdated: Date.now(),
          });

          // 📊 Log transaction
          await ctx.db.insert("coinTransactions", {
            address: bet.bettor,
            amount: totalToInbox,
            type: "earn",
            source: "betting_win",
            description: "Betting winnings",
            timestamp: Date.now(),
            balanceBefore: currentBalance,
            balanceAfter: currentBalance + totalToInbox,
          });
        }
      }

      // Log transaction
      await ctx.db.insert("bettingTransactions", {
        address: bet.bettor,
        type: "win",
        amount: totalToInbox,
        roomId,
        timestamp: Date.now(),
      });
    }

    // Process losers - return unspent credits to inbox
    for (const bet of losingBets) {
      // Get bettor's remaining credits (not bet on this battle)
      const credits = await ctx.db
        .query("bettingCredits")
        .withIndex("by_address", (q) => q.eq("address", bet.bettor))
        .first();

      const remainingCredits = credits?.balance || 0;

      // Update bet status
      await ctx.db.patch(bet._id, {
        status: "lost",
        resolvedAt: Date.now(),
      });

      // Reset betting credits to 0
      if (credits) {
        await ctx.db.patch(credits._id, {
          balance: 0,
        });
      }

      // Return remaining credits as TESTVBMS to profile coins (if any)
      if (remainingCredits > 0) {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_address", (q) => q.eq("address", bet.bettor))
          .first();

        if (profile) {
          const currentBalance = profile.coins || 0;
          await ctx.db.patch(profile._id, {
            coins: currentBalance + remainingCredits,
            lifetimeEarned: (profile.lifetimeEarned || 0) + remainingCredits,
            lastUpdated: Date.now(),
          });

          // 📊 Log transaction
          await ctx.db.insert("coinTransactions", {
            address: bet.bettor,
            amount: remainingCredits,
            type: "earn",
            source: "betting_refund",
            description: "Betting credits refund",
            timestamp: Date.now(),
            balanceBefore: currentBalance,
            balanceAfter: currentBalance + remainingCredits,
          });
        }
      }

      // Log transaction
      await ctx.db.insert("bettingTransactions", {
        address: bet.bettor,
        type: "loss",
        amount: -bet.amount,
        roomId,
        timestamp: Date.now(),
      });
    }

    console.log(`🎰 Bets resolved for room ${roomId}:`, {
      totalBets: bets.length,
      totalPool,
      houseFee,
      prizePool,
      winners: winningBets.length,
      totalPaidOut,
    });

    return {
      success: true,
      betsResolved: bets.length,
      totalPool,
      totalPaidOut: Math.floor(totalPaidOut),
      houseFee: Math.floor(houseFee),
    };
  },
});

/**
 * GET ACTIVE BETS FOR A ROOM
 */
export const getRoomBets = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const bets = await ctx.db
      .query("pokerBets")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    return bets;
  },
});

/**
 * GET PLAYER'S BET HISTORY
 */
export const getMyBets = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    const bets = await ctx.db
      .query("pokerBets")
      .withIndex("by_bettor", (q) => q.eq("bettor", normalizedAddress))
      .order("desc")
      .take(50); // Last 50 bets

    return bets;
  },
});

/**
 * GET BETTING STATS
 */
export const getBettingStats = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    const bets = await ctx.db
      .query("pokerBets")
      .withIndex("by_bettor", (q) => q.eq("bettor", normalizedAddress))
      .collect();

    const wonBets = bets.filter((b) => b.status === "won");
    const lostBets = bets.filter((b) => b.status === "lost");
    const activeBets = bets.filter((b) => b.status === "active");

    const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);
    const totalWinnings = wonBets.reduce((sum, b) => sum + (b.payout || 0), 0);
    const totalLosses = lostBets.reduce((sum, b) => sum + b.amount, 0);

    return {
      totalBets: bets.length,
      wonBets: wonBets.length,
      lostBets: lostBets.length,
      activeBets: activeBets.length,
      totalWagered,
      totalWinnings,
      totalLosses,
      netProfit: totalWinnings - totalLosses - totalWagered,
      winRate: bets.length > 0 ? (wonBets.length / (wonBets.length + lostBets.length)) * 100 : 0,
    };
  },
});

/**
 * CLAIM FREE STARTER CREDITS
 * New users get 100 free betting credits to start
 */
export const claimStarterCredits = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    // Check if user already has betting credits
    const existing = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (existing) {
      return {
        success: false,
        message: "You already have betting credits",
        balance: existing.balance,
      };
    }

    // Create new balance with 100 free credits
    await ctx.db.insert("bettingCredits", {
      address: normalizedAddress,
      balance: 100,
      totalDeposited: 0,
      totalWithdrawn: 0,
      lastDeposit: Date.now(),
    });

    // Log the free credits
    await ctx.db.insert("bettingTransactions", {
      address: normalizedAddress,
      type: "deposit",
      amount: 100,
      timestamp: Date.now(),
    });

    console.log(`🎁 Free starter credits claimed: ${normalizedAddress}`);

    return {
      success: true,
      message: "100 free betting credits claimed!",
      balance: 100,
    };
  },
});
