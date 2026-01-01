/**
 * Vibe Rewards System
 * Each vote = 100 VBMS for the card owner
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const VBMS_PER_VOTE = 100;

/**
 * Record a vote and add VBMS reward to card owner
 */
export const recordVote = mutation({
  args: {
    cardFid: v.number(),
    voterFid: v.number(),
  },
  handler: async (ctx, { cardFid, voterFid }) => {
    // Get or create reward record for card owner
    const existing = await ctx.db
      .query("vibeRewards")
      .withIndex("by_fid", (q) => q.eq("fid", cardFid))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pendingVbms: existing.pendingVbms + VBMS_PER_VOTE,
        totalVotes: existing.totalVotes + 1,
        lastVoteAt: Date.now(),
      });
    } else {
      await ctx.db.insert("vibeRewards", {
        fid: cardFid,
        pendingVbms: VBMS_PER_VOTE,
        claimedVbms: 0,
        totalVotes: 1,
        lastVoteAt: Date.now(),
        lastClaimAt: undefined,
      });
    }

    return { success: true, vbmsAdded: VBMS_PER_VOTE };
  },
});

/**
 * Get pending rewards for a card
 */
export const getRewards = query({
  args: { fid: v.number() },
  handler: async (ctx, { fid }) => {
    const rewards = await ctx.db
      .query("vibeRewards")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .first();

    return rewards || { 
      fid, 
      pendingVbms: 0, 
      claimedVbms: 0, 
      totalVotes: 0 
    };
  },
});

/**
 * Claim pending VBMS rewards
 * Returns the claim details for blockchain tx
 */
export const claimRewards = mutation({
  args: {
    fid: v.number(),
    claimerAddress: v.string(),
  },
  handler: async (ctx, { fid, claimerAddress }) => {
    const rewards = await ctx.db
      .query("vibeRewards")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .first();

    if (!rewards || rewards.pendingVbms === 0) {
      return { success: false, error: "No pending rewards" };
    }

    const claimAmount = rewards.pendingVbms;

    // Update rewards record
    await ctx.db.patch(rewards._id, {
      pendingVbms: 0,
      claimedVbms: rewards.claimedVbms + claimAmount,
      lastClaimAt: Date.now(),
    });

    return { 
      success: true, 
      claimAmount,
      claimerAddress,
      fid,
    };
  },
});

/**
 * Get total VBMS distributed via votes
 */
export const getTotalDistributed = query({
  args: {},
  handler: async (ctx) => {
    const allRewards = await ctx.db.query("vibeRewards").collect();

    const total = allRewards.reduce((sum, r) => sum + r.claimedVbms + r.pendingVbms, 0);
    const pending = allRewards.reduce((sum, r) => sum + r.pendingVbms, 0);
    const claimed = allRewards.reduce((sum, r) => sum + r.claimedVbms, 0);

    return { total, pending, claimed };
  },
});

// ========== HELPER: Generate Nonce ==========
function generateNonce(): string {
  const uuid1 = crypto.randomUUID().replace(/-/g, '');
  const uuid2 = crypto.randomUUID().replace(/-/g, '');
  return `0x${uuid1}${uuid2}`.substring(0, 66);
}

/**
 * Prepare Vibe Rewards claim - generates nonce and signature for blockchain TX
 */
export const prepareVibeRewardsClaim = action({
  args: {
    fid: v.number(),
    claimerAddress: v.string(),
  },
  handler: async (ctx, { fid, claimerAddress }): Promise<{
    success: boolean;
    amount?: number;
    nonce?: string;
    signature?: string;
    error?: string;
  }> => {
    // Get and zero pending rewards
    const result = await ctx.runMutation(internal.vibeRewards.prepareClaimInternal, {
      fid,
      claimerAddress,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Generate nonce
    const nonce = generateNonce();

    // Get signature from API
    const apiUrl = 'https://www.vibemostwanted.xyz';
    console.log(`[VibeRewards] Signing claim: ${claimerAddress}, amount: ${result.claimAmount}, nonce: ${nonce}`);

    try {
      const response = await fetch(`${apiUrl}/api/vbms/sign-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: claimerAddress,
          amount: result.claimAmount,
          nonce: nonce,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[VibeRewards] Sign API error: ${errorText}`);
        // Restore rewards on failure
        await ctx.runMutation(internal.vibeRewards.restoreRewardsOnFailure, {
          fid,
          amount: result.claimAmount,
        });
        return { success: false, error: `Sign failed: ${response.status}` };
      }

      const data = await response.json();
      console.log(`[VibeRewards] Got signature: ${data.signature?.slice(0, 20)}...`);

      return {
        success: true,
        amount: result.claimAmount,
        nonce,
        signature: data.signature,
      };
    } catch (error: any) {
      console.error(`[VibeRewards] Error:`, error);
      // Restore rewards on failure
      await ctx.runMutation(internal.vibeRewards.restoreRewardsOnFailure, {
        fid,
        amount: result.claimAmount,
      });
      return { success: false, error: error.message };
    }
  },
});

/**
 * Internal mutation to prepare claim (zero pending BEFORE getting signature)
 */
export const prepareClaimInternal = internalMutation({
  args: {
    fid: v.number(),
    claimerAddress: v.string(),
  },
  handler: async (ctx, { fid, claimerAddress }) => {
    const rewards = await ctx.db
      .query("vibeRewards")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .first();

    if (!rewards || rewards.pendingVbms === 0) {
      return { success: false, error: "No pending rewards", claimAmount: 0 };
    }

    const claimAmount = rewards.pendingVbms;

    // Zero pending IMMEDIATELY to prevent double claims
    await ctx.db.patch(rewards._id, {
      pendingVbms: 0,
      claimedVbms: rewards.claimedVbms + claimAmount,
      lastClaimAt: Date.now(),
    });

    return { success: true, claimAmount };
  },
});

/**
 * Restore rewards if signing/TX fails (internal)
 */
export const restoreRewardsOnFailure = internalMutation({
  args: {
    fid: v.number(),
    amount: v.number(),
  },
  handler: async (ctx, { fid, amount }) => {
    const rewards = await ctx.db
      .query("vibeRewards")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .first();

    if (rewards) {
      await ctx.db.patch(rewards._id, {
        pendingVbms: rewards.pendingVbms + amount,
        claimedVbms: Math.max(0, rewards.claimedVbms - amount),
      });
      console.log(`[VibeRewards] Restored ${amount} VBMS to FID ${fid}`);
    }
  },
});

/**
 * Public mutation to restore rewards when TX is cancelled/fails
 * Called from frontend when user cancels or TX fails
 */
// 🔒 SECURITY FIX (2026-01-01): Changed from mutation to internalMutation
export const restoreClaimOnTxFailure = internalMutation({
  args: {
    fid: v.number(),
    amount: v.number(),
  },
  handler: async (ctx, { fid, amount }) => {
    const rewards = await ctx.db
      .query("vibeRewards")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .first();

    if (!rewards) {
      return { success: false, error: "No rewards record found" };
    }

    await ctx.db.patch(rewards._id, {
      pendingVbms: rewards.pendingVbms + amount,
      claimedVbms: Math.max(0, rewards.claimedVbms - amount),
    });

    console.log(`[VibeRewards] TX cancelled - Restored ${amount} VBMS to FID ${fid}`);
    return { success: true, restoredAmount: amount };
  },
});
