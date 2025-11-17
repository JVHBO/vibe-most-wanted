/**
 * PVP ENTRY FEE SYSTEM
 *
 * Players pay VBMS entry fee to VBMSPoolTroll
 * Winners receive VBMS rewards in inbox
 * Losers' VBMS stays locked in pool
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * RECORD ENTRY FEE
 * Called after player deposits VBMS to VBMSPoolTroll contract
 */
export const recordEntryFee = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx, args) => {
    const { address, amount, txHash } = args;
    const normalizedAddress = address.toLowerCase();

    // Check if this txHash was already processed
    const existingEntry = await ctx.db
      .query("pvpEntryFees")
      .withIndex("by_txHash", (q) => q.eq("txHash", txHash))
      .first();

    if (existingEntry) {
      throw new Error("Transaction already processed");
    }

    // Record entry fee payment
    await ctx.db.insert("pvpEntryFees", {
      address: normalizedAddress,
      amount,
      txHash,
      timestamp: Date.now(),
      used: false, // Mark as not used yet
    });

    console.log(`⚔️ PvP entry fee recorded: ${amount} VBMS from ${address}`);

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
 * Sends VBMS reward to player's inbox
 */
export const sendPvPRewardToInbox = mutation({
  args: {
    address: v.string(),
    rewardAmount: v.number(),
    roomCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { address, rewardAmount, roomCode } = args;
    const normalizedAddress = address.toLowerCase();

    // Send VBMS to inbox
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

    console.log(`🏆 PvP reward sent to inbox: ${rewardAmount} VBMS for ${address}`);

    return {
      success: true,
      rewardAmount,
    };
  },
});
