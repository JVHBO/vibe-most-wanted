import { mutation, query, action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createAuditLog } from "./coinAudit";

// Generate secure nonce for blockchain transactions
function generateNonce(): string {
  const uuid1 = crypto.randomUUID().replace(/-/g, '');
  const uuid2 = crypto.randomUUID().replace(/-/g, '');
  return `0x${uuid1}${uuid2}`.substring(0, 66);
}

// Prize tiers with probabilities (must sum to 100)
const PRIZES = [
  { amount: 1, probability: 45, label: "1 VBMS" },
  { amount: 10, probability: 30, label: "10 VBMS" },
  { amount: 100, probability: 15, label: "100 VBMS" },
  { amount: 1000, probability: 7, label: "1K VBMS" },
  { amount: 10000, probability: 2.5, label: "10K VBMS" },
  { amount: 50000, probability: 0.5, label: "50K VBMS" },
];

// Get today's date as string (YYYY-MM-DD)
function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Determine prize based on weighted probability
function determinePrize(): { amount: number; index: number } {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (let i = 0; i < PRIZES.length; i++) {
    cumulative += PRIZES[i].probability;
    if (random <= cumulative) {
      return { amount: PRIZES[i].amount, index: i };
    }
  }

  // Fallback to smallest prize
  return { amount: PRIZES[0].amount, index: 0 };
}

/**
 * Check if player can spin today
 */
export const canSpin = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const today = getTodayKey();
    const normalizedAddress = address.toLowerCase();

    // Check for test mode
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    const isTestMode = profile?.rouletteTestMode === true;

    // If test mode, always allow spin
    if (isTestMode) {
      return {
        canSpin: true,
        lastSpinDate: null,
        prizes: PRIZES.map((p, i) => ({ ...p, index: i })),
        testMode: true,
      };
    }

    // Check if user has VibeFID card
    const vibeFidCard = await ctx.db
      .query("farcasterCards")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    const isVibeFidHolder = !!vibeFidCard;
    const maxSpins = isVibeFidHolder ? 3 : 1;

    // Count today's spins
    const spins = await ctx.db
      .query("rouletteSpins")
      .withIndex("by_address_date", (q) =>
        q.eq("address", normalizedAddress).eq("date", today)
      )
      .collect();

    const spinsUsed = spins.length;
    const spinsRemaining = Math.max(0, maxSpins - spinsUsed);

    return {
      canSpin: spinsRemaining > 0,
      lastSpinDate: spins[spins.length - 1]?.date || null,
      prizes: PRIZES.map((p, i) => ({ ...p, index: i })),
      testMode: false,
      spinsRemaining,
      isVibeFidHolder,
      maxSpins,
    };
  },
});

/**
 * Spin the roulette
 */
export const spin = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const today = getTodayKey();
    const normalizedAddress = address.toLowerCase();

    // Check for test mode
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    const isTestMode = profile?.rouletteTestMode === true;

    // Check spin limit (VibeFID = 3, regular = 1)
    if (!isTestMode) {
      const vibeFidCard = await ctx.db
        .query("farcasterCards")
        .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
        .first();

      const isVibeFidHolder = !!vibeFidCard;
      const maxSpins = isVibeFidHolder ? 3 : 1;

      const existingSpins = await ctx.db
        .query("rouletteSpins")
        .withIndex("by_address_date", (q) =>
          q.eq("address", normalizedAddress).eq("date", today)
        )
        .collect();

      if (existingSpins.length >= maxSpins) {
        return {
          success: false,
          error: isVibeFidHolder ? "Voce usou seus 3 spins VibeFID hoje" : "Voce ja girou hoje",
          prize: null,
          prizeIndex: null,
        };
      }
    }

    // Determine prize
    const { amount, index } = determinePrize();

    // Profile already fetched above for test mode check
    if (!profile) {
      return {
        success: false,
        error: "Profile not found",
        prize: null,
        prizeIndex: null,
      };
    }

    // Record spin (NOT adding to inbox - user must claim)
    await ctx.db.insert("rouletteSpins", {
      address: normalizedAddress,
      date: today,
      prizeAmount: amount,
      prizeIndex: index,
      spunAt: Date.now(),
      claimed: false, // Track if claimed
    });

    console.log(`🎰 Roulette: ${normalizedAddress} won ${amount} VBMS (awaiting claim)`);

    return {
      success: true,
      error: null,
      prize: amount,
      prizeIndex: index,
    };
  },
});

/**
 * Get spin history for a player
 */
export const getSpinHistory = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    const spins = await ctx.db
      .query("rouletteSpins")
      .withIndex("by_address_date", (q) => q.eq("address", normalizedAddress))
      .order("desc")
      .take(10);

    return spins;
  },
});

/**
 * Admin: Reset spins for testing
 */
export const adminResetSpins = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    const spins = await ctx.db
      .query("rouletteSpins")
      .withIndex("by_address_date", (q) => q.eq("address", normalizedAddress))
      .collect();

    for (const spin of spins) {
      await ctx.db.delete(spin._id);
    }

    console.log(`🎰 Admin: Reset ${spins.length} spins for ${normalizedAddress}`);
    return { deleted: spins.length };
  },
});

/**
 * Admin: Set unlimited spins for testing (bypass daily limit)
 */
export const adminSetTestMode = mutation({
  args: { address: v.string(), enabled: v.boolean() },
  handler: async (ctx, { address, enabled }) => {
    const normalizedAddress = address.toLowerCase();

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        rouletteTestMode: enabled,
      });
      console.log(`🎰 Admin: Test mode ${enabled ? 'enabled' : 'disabled'} for ${normalizedAddress}`);
      return { success: true };
    }

    return { success: false, error: "Profile not found" };
  },
});

/**
 * Prepare roulette claim - generates nonce and signature for blockchain TX
 * Uses dedicated roulette signing endpoint (no minimum amount)
 */
export const prepareRouletteClaim = action({
  args: { address: v.string() },
  handler: async (ctx, { address }): Promise<{
    amount: number;
    nonce: string;
    signature: string;
    spinId: string;
  }> => {
    const normalizedAddress = address.toLowerCase();

    // Find unclaimed spin
    const unclaimed = await ctx.runQuery(internal.roulette.getUnclaimedSpin, { address: normalizedAddress });

    if (!unclaimed) {
      throw new Error("No unclaimed spin found");
    }

    // Generate nonce for blockchain TX
    const nonce = generateNonce();

    // Get signature from roulette-specific signing endpoint (no minimum)
    // TODO: Change back to 'https://www.vibemostwanted.xyz' for production
    const apiUrl = 'https://nano-spanking-kodak-supplied.trycloudflare.com';
    const response = await fetch(`${apiUrl}/api/vbms/sign-roulette`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: normalizedAddress,
        amount: unclaimed.prizeAmount,
        nonce
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to sign: ${errorData.error}`);
    }

    const { signature } = await response.json();

    console.log(`🎰 Roulette claim prepared: ${normalizedAddress} claiming ${unclaimed.prizeAmount} VBMS`);

    return {
      amount: unclaimed.prizeAmount,
      nonce,
      signature,
      spinId: unclaimed._id,
    };
  },
});

/**
 * Claim small roulette prizes (< 100 VBMS) directly to inbox
 */
export const claimSmallPrize = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();
    const today = getTodayKey();

    // Find unclaimed spin
    const spin = await ctx.db
      .query("rouletteSpins")
      .withIndex("by_address_date", (q) =>
        q.eq("address", normalizedAddress).eq("date", today)
      )
      .first();

    if (!spin || spin.claimed) {
      throw new Error("No unclaimed spin found");
    }

    if (spin.prizeAmount >= 100) {
      throw new Error("Use blockchain claim for prizes >= 100");
    }

    // Get profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Add to inbox
    await ctx.db.patch(profile._id, {
      coinsInbox: (profile.coinsInbox || 0) + spin.prizeAmount,
    });

    // Mark spin as claimed
    await ctx.db.patch(spin._id, {
      claimed: true,
      claimedAt: Date.now(),
      txHash: "inbox", // Mark as inbox claim
    });

    console.log(`🎰 Roulette small prize: ${normalizedAddress} received ${spin.prizeAmount} VBMS to inbox`);

    return {
      success: true,
      amount: spin.prizeAmount,
      method: "inbox",
    };
  },
});

/**
 * Internal query to get unclaimed spin
 */
export const getUnclaimedSpin = internalQuery({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();
    const today = getTodayKey();

    const spin = await ctx.db
      .query("rouletteSpins")
      .withIndex("by_address_date", (q) =>
        q.eq("address", normalizedAddress).eq("date", today)
      )
      .first();

    if (!spin || spin.claimed) {
      return null;
    }

    return spin;
  },
});

/**
 * Record roulette claim after blockchain TX
 */
export const recordRouletteClaim = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx, { address, amount, txHash }) => {
    const normalizedAddress = address.toLowerCase();
    const today = getTodayKey();

    // Find the spin
    const spin = await ctx.db
      .query("rouletteSpins")
      .withIndex("by_address_date", (q) =>
        q.eq("address", normalizedAddress).eq("date", today)
      )
      .first();

    if (!spin) {
      throw new Error("Spin not found");
    }

    if (spin.claimed) {
      throw new Error("Already claimed");
    }

    // Mark as claimed
    await ctx.db.patch(spin._id, {
      claimed: true,
      claimedAt: Date.now(),
      txHash,
    });

    // Save to claim history
    await ctx.db.insert("claimHistory", {
      playerAddress: normalizedAddress,
      amount,
      txHash,
      timestamp: Date.now(),
      type: "roulette",
    });

    console.log(`🎰 Roulette claimed: ${normalizedAddress} received ${amount} VBMS (tx: ${txHash})`);

    return {
      success: true,
      amount,
      txHash,
    };
  },
});

/**
 * Admin: Disable test mode for ALL accounts
 */
export const disableAllTestMode = mutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("profiles")
      .collect();
    
    let count = 0;
    for (const profile of profiles) {
      if (profile.rouletteTestMode === true) {
        await ctx.db.patch(profile._id, {
          rouletteTestMode: false,
        });
        count++;
      }
    }
    
    console.log(`🎰 Disabled test mode for ${count} profiles`);
    return { disabled: count };
  },
});
