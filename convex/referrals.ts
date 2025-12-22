/**
 * REFERRAL SYSTEM
 *
 * Invite friends, earn VBMS and packs!
 * Share your unique referral link and get rewards when players join.
 *
 * Rewards are x10 (multiplied by 10):
 * - Tiers 1-100: Granular rewards (VBMS and packs)
 * - Tier 100: Special REFERRER BADGE + 100,000 VBMS
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRAL REWARD TIERS (x10 rewards)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReferralTier {
  tier: number;
  type: "vbms" | "pack" | "badge";
  amount: number;
  packType?: string;
  description: string;
  isMilestone?: boolean;
}

// Generate granular tiers from 1-100, then milestones
export const REFERRAL_TIERS: ReferralTier[] = [
  // === TIERS 1-10 (Early rewards to encourage sharing) === (5x VBMS rewards)
  { tier: 1, type: "vbms", amount: 5000, description: "First friend joined!" },
  { tier: 2, type: "vbms", amount: 7500, description: "2 friends" },
  { tier: 3, type: "pack", amount: 1, packType: "basic", description: "3 friends - 1 Basic Pack" },
  { tier: 4, type: "vbms", amount: 10000, description: "4 friends" },
  { tier: 5, type: "vbms", amount: 12500, description: "5 friends" },
  { tier: 6, type: "pack", amount: 1, packType: "basic", description: "6 friends - 1 Basic Pack" },
  { tier: 7, type: "vbms", amount: 15000, description: "7 friends" },
  { tier: 8, type: "vbms", amount: 17500, description: "8 friends" },
  { tier: 9, type: "pack", amount: 1, packType: "basic", description: "9 friends - 1 Basic Pack" },
  { tier: 10, type: "vbms", amount: 25000, description: "10 friends", isMilestone: true },

  // === TIERS 11-20 ===
  { tier: 11, type: "vbms", amount: 15000, description: "11 friends" },
  { tier: 12, type: "pack", amount: 1, packType: "basic", description: "12 friends - 1 Basic Pack" },
  { tier: 13, type: "vbms", amount: 17500, description: "13 friends" },
  { tier: 14, type: "vbms", amount: 20000, description: "14 friends" },
  { tier: 15, type: "pack", amount: 1, packType: "premium", description: "15 friends - 1 Premium Pack" },
  { tier: 16, type: "vbms", amount: 22500, description: "16 friends" },
  { tier: 17, type: "vbms", amount: 25000, description: "17 friends" },
  { tier: 18, type: "pack", amount: 1, packType: "basic", description: "18 friends - 1 Basic Pack" },
  { tier: 19, type: "vbms", amount: 27500, description: "19 friends" },
  { tier: 20, type: "vbms", amount: 50000, description: "20 friends", isMilestone: true },

  // === TIERS 21-30 ===
  { tier: 21, type: "pack", amount: 1, packType: "basic", description: "21 friends - 1 Basic Pack" },
  { tier: 22, type: "vbms", amount: 25000, description: "22 friends" },
  { tier: 23, type: "vbms", amount: 27500, description: "23 friends" },
  { tier: 24, type: "pack", amount: 1, packType: "basic", description: "24 friends - 1 Basic Pack" },
  { tier: 25, type: "vbms", amount: 37500, description: "25 friends", isMilestone: true },
  { tier: 26, type: "vbms", amount: 30000, description: "26 friends" },
  { tier: 27, type: "pack", amount: 1, packType: "basic", description: "27 friends - 1 Basic Pack" },
  { tier: 28, type: "vbms", amount: 32500, description: "28 friends" },
  { tier: 29, type: "vbms", amount: 35000, description: "29 friends" },
  { tier: 30, type: "pack", amount: 1, packType: "premium", description: "30 friends - 1 Premium Pack" },

  // === TIERS 31-40 ===
  { tier: 31, type: "vbms", amount: 30000, description: "31 friends" },
  { tier: 32, type: "vbms", amount: 32500, description: "32 friends" },
  { tier: 33, type: "pack", amount: 1, packType: "basic", description: "33 friends - 1 Basic Pack" },
  { tier: 34, type: "vbms", amount: 35000, description: "34 friends" },
  { tier: 35, type: "vbms", amount: 37500, description: "35 friends" },
  { tier: 36, type: "pack", amount: 1, packType: "basic", description: "36 friends - 1 Basic Pack" },
  { tier: 37, type: "vbms", amount: 40000, description: "37 friends" },
  { tier: 38, type: "vbms", amount: 42500, description: "38 friends" },
  { tier: 39, type: "pack", amount: 1, packType: "basic", description: "39 friends - 1 Basic Pack" },
  { tier: 40, type: "vbms", amount: 75000, description: "40 friends", isMilestone: true },

  // === TIERS 41-50 ===
  { tier: 41, type: "vbms", amount: 40000, description: "41 friends" },
  { tier: 42, type: "pack", amount: 1, packType: "basic", description: "42 friends - 1 Basic Pack" },
  { tier: 43, type: "vbms", amount: 42500, description: "43 friends" },
  { tier: 44, type: "vbms", amount: 45000, description: "44 friends" },
  { tier: 45, type: "pack", amount: 1, packType: "premium", description: "45 friends - 1 Premium Pack" },
  { tier: 46, type: "vbms", amount: 47500, description: "46 friends" },
  { tier: 47, type: "vbms", amount: 50000, description: "47 friends" },
  { tier: 48, type: "pack", amount: 1, packType: "basic", description: "48 friends - 1 Basic Pack" },
  { tier: 49, type: "vbms", amount: 52500, description: "49 friends" },
  { tier: 50, type: "vbms", amount: 125000, description: "50 friends", isMilestone: true },

  // === TIERS 51-60 ===
  { tier: 51, type: "pack", amount: 1, packType: "basic", description: "51 friends - 1 Basic Pack" },
  { tier: 52, type: "vbms", amount: 50000, description: "52 friends" },
  { tier: 53, type: "vbms", amount: 52500, description: "53 friends" },
  { tier: 54, type: "pack", amount: 1, packType: "basic", description: "54 friends - 1 Basic Pack" },
  { tier: 55, type: "vbms", amount: 62500, description: "55 friends" },
  { tier: 56, type: "vbms", amount: 55000, description: "56 friends" },
  { tier: 57, type: "pack", amount: 1, packType: "basic", description: "57 friends - 1 Basic Pack" },
  { tier: 58, type: "vbms", amount: 57500, description: "58 friends" },
  { tier: 59, type: "vbms", amount: 60000, description: "59 friends" },
  { tier: 60, type: "pack", amount: 1, packType: "premium", description: "60 friends - 1 Premium Pack" },

  // === TIERS 61-70 ===
  { tier: 61, type: "vbms", amount: 55000, description: "61 friends" },
  { tier: 62, type: "vbms", amount: 57500, description: "62 friends" },
  { tier: 63, type: "pack", amount: 1, packType: "basic", description: "63 friends - 1 Basic Pack" },
  { tier: 64, type: "vbms", amount: 60000, description: "64 friends" },
  { tier: 65, type: "vbms", amount: 62500, description: "65 friends" },
  { tier: 66, type: "pack", amount: 1, packType: "basic", description: "66 friends - 1 Basic Pack" },
  { tier: 67, type: "vbms", amount: 65000, description: "67 friends" },
  { tier: 68, type: "vbms", amount: 67500, description: "68 friends" },
  { tier: 69, type: "pack", amount: 1, packType: "basic", description: "69 friends - 1 Basic Pack" },
  { tier: 70, type: "vbms", amount: 150000, description: "70 friends", isMilestone: true },

  // === TIERS 71-80 ===
  { tier: 71, type: "vbms", amount: 65000, description: "71 friends" },
  { tier: 72, type: "pack", amount: 1, packType: "basic", description: "72 friends - 1 Basic Pack" },
  { tier: 73, type: "vbms", amount: 67500, description: "73 friends" },
  { tier: 74, type: "vbms", amount: 70000, description: "74 friends" },
  { tier: 75, type: "pack", amount: 1, packType: "premium", description: "75 friends - 1 Premium Pack" },
  { tier: 76, type: "vbms", amount: 72500, description: "76 friends" },
  { tier: 77, type: "vbms", amount: 75000, description: "77 friends" },
  { tier: 78, type: "pack", amount: 1, packType: "basic", description: "78 friends - 1 Basic Pack" },
  { tier: 79, type: "vbms", amount: 77500, description: "79 friends" },
  { tier: 80, type: "vbms", amount: 175000, description: "80 friends", isMilestone: true },

  // === TIERS 81-90 ===
  { tier: 81, type: "pack", amount: 1, packType: "basic", description: "81 friends - 1 Basic Pack" },
  { tier: 82, type: "vbms", amount: 75000, description: "82 friends" },
  { tier: 83, type: "vbms", amount: 77500, description: "83 friends" },
  { tier: 84, type: "pack", amount: 1, packType: "basic", description: "84 friends - 1 Basic Pack" },
  { tier: 85, type: "vbms", amount: 87500, description: "85 friends" },
  { tier: 86, type: "vbms", amount: 80000, description: "86 friends" },
  { tier: 87, type: "pack", amount: 1, packType: "basic", description: "87 friends - 1 Basic Pack" },
  { tier: 88, type: "vbms", amount: 82500, description: "88 friends" },
  { tier: 89, type: "vbms", amount: 85000, description: "89 friends" },
  { tier: 90, type: "pack", amount: 1, packType: "premium", description: "90 friends - 1 Premium Pack" },

  // === TIERS 91-100 (Final stretch to badge!) ===
  { tier: 91, type: "vbms", amount: 80000, description: "91 friends" },
  { tier: 92, type: "vbms", amount: 82500, description: "92 friends" },
  { tier: 93, type: "pack", amount: 1, packType: "basic", description: "93 friends - 1 Basic Pack" },
  { tier: 94, type: "vbms", amount: 85000, description: "94 friends" },
  { tier: 95, type: "vbms", amount: 87500, description: "95 friends" },
  { tier: 96, type: "pack", amount: 1, packType: "basic", description: "96 friends - 1 Basic Pack" },
  { tier: 97, type: "vbms", amount: 90000, description: "97 friends" },
  { tier: 98, type: "vbms", amount: 92500, description: "98 friends" },
  { tier: 99, type: "pack", amount: 1, packType: "elite", description: "99 friends - 1 Elite Pack" },
  { tier: 100, type: "badge", amount: 500000, description: "REFERRER BADGE + 500,000 VBMS", isMilestone: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get my referral stats
 */
export const getMyReferralStats = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const stats = await ctx.db
      .query("referralStats")
      .withIndex("by_address", q => q.eq("address", address.toLowerCase()))
      .first();

    if (!stats) {
      return {
        totalReferrals: 0,
        qualifiedReferrals: 0,
        pendingReferrals: 0,
        claimedTiers: [],
        totalVbmsEarned: 0,
        totalPacksEarned: 0,
        hasBadge: false,
        availableTiers: getAvailableTiers(0, []),
      };
    }

    return {
      ...stats,
      availableTiers: getAvailableTiers(stats.totalReferrals, stats.claimedTiers),
    };
  },
});

/**
 * Get referral tiers list (for UI display)
 */
export const getReferralTiers = query({
  args: {},
  handler: async () => {
    return REFERRAL_TIERS;
  },
});

/**
 * Get my referral list (people I referred)
 */
export const getMyReferrals = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrer", q => q.eq("referrerAddress", address.toLowerCase()))
      .collect();

    return referrals.map(r => ({
      username: r.referredUsername,
      status: r.status,
      completedAt: r.completedAt,
    }));
  },
});

/**
 * Get referral leaderboard (top referrers)
 */
export const getReferralLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db
      .query("referralStats")
      .withIndex("by_total_referrals")
      .order("desc")
      .take(20);

    return stats.map((s, i) => ({
      rank: i + 1,
      username: s.username,
      totalReferrals: s.totalReferrals,
      hasBadge: s.hasBadge,
    }));
  },
});

/**
 * Check if player was referred by someone
 */
export const checkIfReferred = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_referred", q => q.eq("referredAddress", address.toLowerCase()))
      .first();

    return referral;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Track a new referral (called when someone joins via referral link)
 */
export const trackReferral = mutation({
  args: {
    referrerUsername: v.string(),
    referredAddress: v.string(),
    referredUsername: v.string(),
    referredFid: v.optional(v.number()),
  },
  handler: async (ctx, { referrerUsername, referredAddress, referredUsername, referredFid }) => {
    // Find the referrer by username
    const referrer = await ctx.db
      .query("profiles")
      .withIndex("by_username", q => q.eq("username", referrerUsername))
      .first();

    if (!referrer) {
      console.log(`[Referral] Referrer not found: ${referrerUsername}`);
      return { success: false, error: "Referrer not found" };
    }

    // Check if this user was already referred
    const existingReferral = await ctx.db
      .query("referrals")
      .withIndex("by_referred", q => q.eq("referredAddress", referredAddress.toLowerCase()))
      .first();

    if (existingReferral) {
      console.log(`[Referral] User already referred: ${referredAddress}`);
      return { success: false, error: "Already referred" };
    }

    // Can't refer yourself
    if (referrer.address.toLowerCase() === referredAddress.toLowerCase()) {
      console.log(`[Referral] Self-referral attempt: ${referredAddress}`);
      return { success: false, error: "Cannot refer yourself" };
    }

    const now = Date.now();

    // Create the referral record
    await ctx.db.insert("referrals", {
      referrerAddress: referrer.address.toLowerCase(),
      referrerUsername: referrer.username,
      referrerFid: referrer.farcasterFid || (referrer.fid ? Number(referrer.fid) : undefined),
      referredAddress: referredAddress.toLowerCase(),
      referredUsername,
      referredFid,
      status: "completed", // Immediately completed when account is created
      clickedAt: now,
      completedAt: now,
    });

    // Update or create referrer stats
    const stats = await ctx.db
      .query("referralStats")
      .withIndex("by_address", q => q.eq("address", referrer.address.toLowerCase()))
      .first();

    if (stats) {
      await ctx.db.patch(stats._id, {
        totalReferrals: stats.totalReferrals + 1,
        lastReferralAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("referralStats", {
        address: referrer.address.toLowerCase(),
        username: referrer.username,
        totalReferrals: 1,
        qualifiedReferrals: 0,
        pendingReferrals: 0,
        claimedTiers: [],
        totalVbmsEarned: 0,
        totalPacksEarned: 0,
        hasBadge: false,
        lastReferralAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(`[Referral] Tracked: ${referrerUsername} referred ${referredUsername}`);
    return { success: true };
  },
});

/**
 * Claim a referral tier reward
 */
export const claimReferralReward = mutation({
  args: {
    address: v.string(),
    tier: v.number(),
  },
  handler: async (ctx, { address, tier }) => {
    const normalizedAddress = address.toLowerCase();

    // Get referral stats
    const stats = await ctx.db
      .query("referralStats")
      .withIndex("by_address", q => q.eq("address", normalizedAddress))
      .first();

    if (!stats) {
      return { success: false, error: "No referral stats found" };
    }

    // Check if tier is already claimed
    if (stats.claimedTiers.includes(tier)) {
      return { success: false, error: "Tier already claimed" };
    }

    // Check if player has enough referrals for this tier
    if (stats.totalReferrals < tier) {
      return { success: false, error: "Not enough referrals for this tier" };
    }

    // Find the tier reward
    const tierReward = REFERRAL_TIERS.find(t => t.tier === tier);
    if (!tierReward) {
      return { success: false, error: "Invalid tier" };
    }

    const now = Date.now();

    // Get player profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", q => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    // Apply the reward based on type
    if (tierReward.type === "vbms") {
      // Add VBMS to player's coins
      const newCoins = (profile.coins || 0) + tierReward.amount;
      await ctx.db.patch(profile._id, {
        coins: newCoins,
        lifetimeEarned: (profile.lifetimeEarned || 0) + tierReward.amount,
      });

      // Update stats
      await ctx.db.patch(stats._id, {
        claimedTiers: [...stats.claimedTiers, tier],
        totalVbmsEarned: stats.totalVbmsEarned + tierReward.amount,
        updatedAt: now,
      });

      // Record the claim
      await ctx.db.insert("referralClaims", {
        address: normalizedAddress,
        tier,
        rewardType: "vbms",
        amount: tierReward.amount,
        claimedAt: now,
      });

      console.log(`[Referral] Claimed tier ${tier}: ${tierReward.amount} VBMS for ${normalizedAddress}`);
      return { success: true, rewardType: "vbms", amount: tierReward.amount };

    } else if (tierReward.type === "pack") {
      // Give pack to player
      const packType = tierReward.packType || "basic";

      // Check if player has existing packs of this type
      const existingPack = await ctx.db
        .query("cardPacks")
        .withIndex("by_address", q => q.eq("address", normalizedAddress))
        .filter(q => q.eq(q.field("packType"), packType))
        .first();

      if (existingPack) {
        await ctx.db.patch(existingPack._id, {
          unopened: existingPack.unopened + tierReward.amount,
        });
      } else {
        await ctx.db.insert("cardPacks", {
          address: normalizedAddress,
          packType,
          unopened: tierReward.amount,
          sourceId: `referral_tier_${tier}`,
          earnedAt: now,
        });
      }

      // Update stats
      await ctx.db.patch(stats._id, {
        claimedTiers: [...stats.claimedTiers, tier],
        totalPacksEarned: stats.totalPacksEarned + tierReward.amount,
        updatedAt: now,
      });

      // Record the claim
      await ctx.db.insert("referralClaims", {
        address: normalizedAddress,
        tier,
        rewardType: "pack",
        amount: tierReward.amount,
        packType,
        claimedAt: now,
      });

      console.log(`[Referral] Claimed tier ${tier}: ${tierReward.amount} ${packType} pack(s) for ${normalizedAddress}`);
      return { success: true, rewardType: "pack", amount: tierReward.amount, packType };

    } else if (tierReward.type === "badge") {
      // Give badge + VBMS
      const newCoins = (profile.coins || 0) + tierReward.amount;
      await ctx.db.patch(profile._id, {
        coins: newCoins,
        lifetimeEarned: (profile.lifetimeEarned || 0) + tierReward.amount,
      });

      // Update stats with badge
      await ctx.db.patch(stats._id, {
        claimedTiers: [...stats.claimedTiers, tier],
        totalVbmsEarned: stats.totalVbmsEarned + tierReward.amount,
        hasBadge: true,
        updatedAt: now,
      });

      // Record the claim
      await ctx.db.insert("referralClaims", {
        address: normalizedAddress,
        tier,
        rewardType: "badge",
        amount: tierReward.amount,
        claimedAt: now,
      });

      console.log(`[Referral] Claimed tier ${tier}: BADGE + ${tierReward.amount} VBMS for ${normalizedAddress}`);
      return { success: true, rewardType: "badge", amount: tierReward.amount };
    }

    return { success: false, error: "Unknown reward type" };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get available (unclaimed) tiers for a player
 */
function getAvailableTiers(totalReferrals: number, claimedTiers: number[]): ReferralTier[] {
  return REFERRAL_TIERS.filter(tier =>
    tier.tier <= totalReferrals && !claimedTiers.includes(tier.tier)
  );
}
