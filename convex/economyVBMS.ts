/**
 * VBMS-BASED PVP ECONOMY
 *
 * PvP system using real VBMS tokens instead of TESTVBMS
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Entry Fees in VBMS
const VBMS_ENTRY_FEES = {
  pvp: 20, // 20 VBMS per PvP match
};

// PvP Rewards in VBMS
const VBMS_PVP_WIN_REWARD = 100;
const VBMS_PVP_LOSS_PENALTY = -20;

/**
 * Charge PvP entry fee from VBMS inbox
 */
export const chargeVBMSEntryFee = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const fee = VBMS_ENTRY_FEES.pvp;
    const currentInbox = profile.coinsInbox || 0;

    // Check if player has enough VBMS
    if (currentInbox < fee) {
      return {
        success: false,
        reason: "Insufficient VBMS",
        required: fee,
        current: currentInbox,
      };
    }

    // Deduct fee from inbox
    const newInbox = currentInbox - fee;

    await ctx.db.patch(profile._id, {
      coinsInbox: newInbox,
    });

    console.log(`💸 ${address} paid ${fee} VBMS entry fee. Inbox: ${currentInbox} → ${newInbox}`);

    return {
      success: true,
      charged: fee,
      newInbox,
    };
  },
});

/**
 * Award VBMS after PvP battle
 */
export const awardPvPVBMS = mutation({
  args: {
    address: v.string(),
    won: v.boolean(),
    opponentAddress: v.optional(v.string()),
  },
  handler: async (ctx, { address, won, opponentAddress }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentInbox = profile.coinsInbox || 0;
    let reward = 0;

    if (won) {
      // Winner: award VBMS + return entry fee
      reward = VBMS_PVP_WIN_REWARD + VBMS_ENTRY_FEES.pvp; // 100 + 20 = 120 VBMS
    } else {
      // Loser: lose entry fee (already deducted), apply penalty
      reward = VBMS_PVP_LOSS_PENALTY; // -20 VBMS
    }

    const newInbox = currentInbox + reward;

    await ctx.db.patch(profile._id, {
      coinsInbox: newInbox,
      lifetimeEarned: (profile.lifetimeEarned || 0) + Math.max(0, reward),
    });

    console.log(`${won ? '🏆' : '💀'} ${address} ${won ? 'won' : 'lost'} PvP: ${reward > 0 ? '+' : ''}${reward} VBMS. Inbox: ${currentInbox} → ${newInbox}`);

    return {
      success: true,
      reward,
      newInbox,
      won,
    };
  },
});

/**
 * Get player's VBMS balance for PvP
 */
export const getVBMSBalance = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      return {
        inbox: 0,
        claimedTokens: 0,
        canPlayPvP: false,
      };
    }

    const inbox = profile.coinsInbox || 0;
    const canPlayPvP = inbox >= VBMS_ENTRY_FEES.pvp;

    return {
      inbox,
      claimedTokens: profile.claimedTokens || 0,
      canPlayPvP,
      minimumRequired: VBMS_ENTRY_FEES.pvp,
    };
  },
});
