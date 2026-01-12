import { mutation, query, action, internalQuery, internalMutation } from "./_generated/server";
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
// Minimum 100 VBMS to allow on-chain claims
const PRIZES = [
  { amount: 100, probability: 75, label: "100 VBMS" },
  { amount: 500, probability: 15, label: "500 VBMS" },
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
// Helper to find profile by address (including linked addresses)
async function findProfileByAddress(ctx: any, normalizedAddress: string) {
  let profile = await ctx.db.query("profiles").withIndex("by_address", (q: any) => q.eq("address", normalizedAddress)).first();
  if (!profile) {
    const allProfiles = await ctx.db.query("profiles").collect();
    profile = allProfiles.find((p: any) => p.linkedAddresses?.some((linked: string) => linked.toLowerCase() === normalizedAddress)) || null;
  }
  return profile;
}

// Helper to find VibeFID card by address (including linked addresses)
async function findVibeFidByAddress(ctx: any, normalizedAddress: string) {
  let vibeFidCard = await ctx.db.query("farcasterCards").withIndex("by_address", (q: any) => q.eq("address", normalizedAddress)).first();
  if (!vibeFidCard) {
    const profile = await findProfileByAddress(ctx, normalizedAddress);
    if (profile) {
      const addressesToCheck = [profile.address, ...(profile.linkedAddresses || [])];
      for (const addr of addressesToCheck) {
        vibeFidCard = await ctx.db.query("farcasterCards").withIndex("by_address", (q: any) => q.eq("address", addr.toLowerCase())).first();
        if (vibeFidCard) break;
      }
    }
  }
  return vibeFidCard;
}


/**
 * Check if player can spin today
 */
export const canSpin = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const today = getTodayKey();
    const normalizedAddress = address.toLowerCase();

    // Check for profile (including linked addresses)
    const profile = await findProfileByAddress(ctx, normalizedAddress);

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

    // Check if user has VibeFID card (including linked addresses)
    const vibeFidCard = await findVibeFidByAddress(ctx, normalizedAddress);

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

    // Check for profile (including linked addresses)
    const profile = await findProfileByAddress(ctx, normalizedAddress);

    const isTestMode = profile?.rouletteTestMode === true;

    // Check spin limit (VibeFID = 3, regular = 1)
    if (!isTestMode) {
      // Check VibeFID (including linked addresses)
      const vibeFidCard = await findVibeFidByAddress(ctx, normalizedAddress);

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
 * 🔒 SECURITY FIX: Changed from mutation to internalMutation
 */
export const adminResetSpins = internalMutation({
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
 * 🔒 SECURITY FIX: Changed from mutation to internalMutation
 */
export const adminSetTestMode = internalMutation({
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
    const apiUrl = 'https://www.vibemostwanted.xyz';
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
 * Internal query to get unclaimed spin (most recent)
 */
export const getUnclaimedSpin = internalQuery({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();
    const today = getTodayKey();

    // Get ALL spins for today and find the most recent unclaimed one
    const spins = await ctx.db
      .query("rouletteSpins")
      .withIndex("by_address_date", (q) =>
        q.eq("address", normalizedAddress).eq("date", today)
      )
      .collect();

    // Find most recent unclaimed spin (highest spunAt)
    const unclaimedSpins = spins.filter(s => !s.claimed);
    if (unclaimedSpins.length === 0) {
      return null;
    }

    // Sort by spunAt descending and get the most recent
    unclaimedSpins.sort((a, b) => (b.spunAt || 0) - (a.spunAt || 0));
    return unclaimedSpins[0];
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

    // Find all spins for today
    const spins = await ctx.db
      .query("rouletteSpins")
      .withIndex("by_address_date", (q) =>
        q.eq("address", normalizedAddress).eq("date", today)
      )
      .collect();

    // Find unclaimed spin matching the amount (most recent first)
    const unclaimedSpins = spins
      .filter(s => !s.claimed && s.prizeAmount === amount)
      .sort((a, b) => (b.spunAt || 0) - (a.spunAt || 0));

    const spin = unclaimedSpins[0];

    if (!spin) {
      // Fallback: find any unclaimed spin with this amount
      const anyUnclaimed = spins.filter(s => !s.claimed);
      if (anyUnclaimed.length === 0) {
        throw new Error("No unclaimed spins found");
      }
      // Mark the most recent as claimed
      const fallbackSpin = anyUnclaimed.sort((a, b) => (b.spunAt || 0) - (a.spunAt || 0))[0];
      await ctx.db.patch(fallbackSpin._id, {
        claimed: true,
        claimedAt: Date.now(),
        txHash,
      });
      console.log(`🎰 Roulette claimed (fallback): ${normalizedAddress} received ${amount} VBMS (tx: ${txHash})`);
      await ctx.db.insert("claimHistory", {
        playerAddress: normalizedAddress,
        amount,
        txHash,
        timestamp: Date.now(),
        type: "roulette",
      });
      return { success: true, amount, txHash };
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
 * 🔒 SECURITY FIX: Changed from mutation to internalMutation
 */
export const disableAllTestMode = internalMutation({
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

/**
 * Admin: Reset ALL spins for everyone
 * 🔒 SECURITY FIX: Changed from mutation to internalMutation
 */
export const adminResetAllSpins = internalMutation({
  args: {},
  handler: async (ctx) => {
    const spins = await ctx.db
      .query("rouletteSpins")
      .collect();

    let count = 0;
    for (const spin of spins) {
      await ctx.db.delete(spin._id);
      count++;
    }

    console.log(`🎰 Admin: Reset ${count} spins for all users`);
    return { deleted: count };
  },
});


// Cost for paid spin (in VBMS coins - not tokens)
const PAID_SPIN_COST = 500;

/**
 * Buy a paid spin using VBMS coins
 * Deducts coins and allows an extra spin
 */
export const buyPaidSpin = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    // Get profile
    const profile = await findProfileByAddress(ctx, normalizedAddress);
    if (!profile) {
      return {
        success: false,
        error: "Profile not found",
      };
    }

    // Check if user has enough coins
    const currentCoins = profile.coins || 0;
    if (currentCoins < PAID_SPIN_COST) {
      return {
        success: false,
        error: `Not enough coins. Need ${PAID_SPIN_COST}, have ${currentCoins}`,
        required: PAID_SPIN_COST,
        current: currentCoins,
      };
    }

    // Deduct coins
    const balanceBefore = currentCoins;
    const balanceAfter = currentCoins - PAID_SPIN_COST;

    await ctx.db.patch(profile._id, {
      coins: balanceAfter,
    });

    // Create audit log
    await createAuditLog(
      ctx,
      normalizedAddress,
      "spend",
      PAID_SPIN_COST,
      balanceBefore,
      balanceAfter,
      "paid_spin",
      undefined,
      { reason: "Purchased paid roulette spin" }
    );

    // Determine prize
    const { amount, index } = determinePrize();

    // Record paid spin
    await ctx.db.insert("rouletteSpins", {
      address: normalizedAddress,
      date: getTodayKey(),
      prizeAmount: amount,
      prizeIndex: index,
      spunAt: Date.now(),
      claimed: false,
      isPaidSpin: true, // Mark as paid spin
    });

    console.log(`🎰 Paid Spin: ${normalizedAddress} paid ${PAID_SPIN_COST} coins, won ${amount} VBMS`);

    return {
      success: true,
      prize: amount,
      prizeIndex: index,
      coinsDeducted: PAID_SPIN_COST,
      newBalance: balanceAfter,
    };
  },
});

/**
 * Get paid spin cost
 */
export const getPaidSpinCost = query({
  args: {},
  handler: async () => {
    return { cost: PAID_SPIN_COST };
  },
});
