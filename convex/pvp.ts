/**
 * PVP ENTRY FEE SYSTEM
 *
 * Players pay VBMS entry fee to VBMSPoolTroll
 * Winners receive TESTVBMS rewards in inbox
 * Losers' VBMS stays locked in pool
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { isValidTxHash } from "./blockchainVerify";

// VBMSPoolTroll address for verification
const VBMS_POOL_TROLL = '0x062b914668f3fd35c3ae02e699cb82e1cf4be18b';

/**
 * RECORD ENTRY FEE (ACTION)
 * Called after player deposits VBMS to VBMSPoolTroll contract
 * Now verifies the transaction on blockchain before recording
 */
export const recordEntryFee = action({
  args: {
    address: v.string(),
    amount: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const { address, amount, txHash } = args;
    const normalizedAddress = address.toLowerCase();

    // Validate txHash format
    if (!isValidTxHash(txHash)) {
      throw new Error("Invalid transaction hash format");
    }

    // Verify transaction on blockchain
    const verification = await ctx.runAction(internal.blockchainVerify.verifyTransaction, {
      txHash,
      expectedFrom: normalizedAddress,
      expectedTo: VBMS_POOL_TROLL,
      expectedAmountWei: (BigInt(amount) * BigInt(10 ** 18)).toString(),
      isERC20: true, // VBMS is an ERC20 token
    });

    if (!verification.isValid) {
      console.error(`[PvP] TX verification failed for ${txHash}: ${verification.error}`);
      throw new Error(`Transaction verification failed: ${verification.error}`);
    }

    // Record in database via internal mutation
    await ctx.runMutation(internal.pvp.recordEntryFeeInternal, {
      address: normalizedAddress,
      amount,
      txHash,
    });

    return { success: true };
  },
});

/**
 * Internal mutation to record entry fee after verification
 */
export const recordEntryFeeInternal = internalMutation({
  args: {
    address: v.string(),
    amount: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx, args) => {
    const { address, amount, txHash } = args;

    // Check if this txHash was already processed (double-check)
    const existingEntry = await ctx.db
      .query("pvpEntryFees")
      .withIndex("by_txHash", (q) => q.eq("txHash", txHash))
      .first();

    if (existingEntry) {
      throw new Error("Transaction already processed");
    }

    // Record entry fee payment
    await ctx.db.insert("pvpEntryFees", {
      address,
      amount,
      txHash,
      timestamp: Date.now(),
      used: false,
      verified: true, // Mark as blockchain-verified
    });

    console.log(`⚔️ PvP entry fee recorded (VERIFIED): ${amount} VBMS from ${address}`);

    return {
      success: true,
    };
  },
});

/**
 * USE ENTRY FEE
 * Mark entry fee as used when player enters a battle
 */
export const useEntryFee = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    // Find an unused entry fee for this address
    const entryFee = await ctx.db
      .query("pvpEntryFees")
      .withIndex("by_address_used", (q) =>
        q.eq("address", normalizedAddress).eq("used", false)
      )
      .order("desc") // Get most recent
      .first();

    if (!entryFee) {
      throw new Error("No valid entry fee found. Please pay entry fee first.");
    }

    // Mark as used
    await ctx.db.patch(entryFee._id, {
      used: true,
      usedAt: Date.now(),
    });

    console.log(`✅ Entry fee used for ${normalizedAddress}: ${entryFee.amount} VBMS`);

    return {
      success: true,
      amount: entryFee.amount,
    };
  },
});

/**
 * CHECK ENTRY FEE
 * Check if player has a valid unused entry fee
 */
export const checkEntryFee = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    const entryFee = await ctx.db
      .query("pvpEntryFees")
      .withIndex("by_address_used", (q) =>
        q.eq("address", normalizedAddress).eq("used", false)
      )
      .order("desc")
      .first();

    return {
      hasEntryFee: !!entryFee,
      amount: entryFee?.amount || 0,
    };
  },
});

/**
 * SEND PVP REWARD TO INBOX
 * Called when player wins a PvP battle
 * Sends TESTVBMS reward to player's inbox
 */
// 🔒 SECURITY FIX (2026-01-01): Changed from mutation to internalMutation
export const sendPvPRewardToInbox = internalMutation({
  args: {
    address: v.string(),
    rewardAmount: v.number(),
    roomCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { address, rewardAmount, roomCode } = args;
    const normalizedAddress = address.toLowerCase();

    // Send TESTVBMS to inbox
    await ctx.db.insert("vbmsInbox" as any, {
      address: normalizedAddress,
      amount: rewardAmount,
      source: "pvp_win",
      metadata: {
        roomCode,
      },
      claimedAt: undefined,
      timestamp: Date.now(),
    });

    console.log(`🏆 PvP reward sent to inbox: ${rewardAmount} TESTVBMS for ${address}`);

    return {
      success: true,
      rewardAmount,
    };
  },
});

/**
 * CLAIM PVP WIN REWARD (PUBLIC MUTATION)
 * Called by frontend when player wins a PvP battle
 * Validates that player has a valid unused entry fee before giving reward
 */
export const claimPvPWinReward = mutation({
  args: {
    address: v.string(),
    roomCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { address, roomCode } = args;
    const normalizedAddress = address.toLowerCase();

    // Check if player has a valid unused entry fee
    const entryFee = await ctx.db
      .query("pvpEntryFees")
      .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
      .filter((q: any) => q.eq(q.field("used"), false))
      .first();

    if (!entryFee) {
      return {
        success: false,
        error: "No valid entry fee found",
      };
    }

    // Mark entry fee as used
    await ctx.db.patch(entryFee._id, {
      used: true,
      usedAt: Date.now(),
    });

    // Fixed reward for PvP win
    const REWARD_AMOUNT = 40;

    // Get profile and add to coins
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
      .first();

    if (profile) {
      const currentBalance = profile.coins || 0;
      await ctx.db.patch(profile._id, {
        coins: currentBalance + REWARD_AMOUNT,
        lifetimeEarned: (profile.lifetimeEarned || 0) + REWARD_AMOUNT,
      });

      // Log transaction
      await ctx.db.insert("coinTransactions", {
        address: normalizedAddress,
        amount: REWARD_AMOUNT,
        type: "earn",
        source: "pvp_win",
        description: "PvP win reward",
        timestamp: Date.now(),
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + REWARD_AMOUNT,
      });
    }

    console.log(`🏆 PvP reward claimed: ${REWARD_AMOUNT} TESTVBMS for ${normalizedAddress}`);

    return {
      success: true,
      rewardAmount: REWARD_AMOUNT,
    };
  },
});
