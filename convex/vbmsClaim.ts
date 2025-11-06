/**
 * VBMS Token Claim System
 *
 * Two-option claim system:
 * 1. Immediate Claim: Player claims VBMS directly to wallet (pays gas)
 * 2. Send to Inbox: VBMS goes to inbox, player collects later (0 gas now)
 *
 * Includes bonus system to incentivize batch claims
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ========== HELPER: Get Profile ==========

async function getProfile(ctx: any, address: string) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_address", (q: any) => q.eq("address", address.toLowerCase()))
    .first();

  if (!profile) {
    throw new Error(`Profile not found for address: ${address}`);
  }

  return profile;
}

// ========== HELPER: Calculate Bonus ==========

interface BonusResult {
  baseAmount: number;
  bonus: number;
  totalAmount: number;
  bonusReasons: string[];
}

function calculateClaimBonus(
  profile: any,
  amount: number,
  inboxAmount: number = 0
): BonusResult {
  let bonus = 0;
  const bonusReasons: string[] = [];

  const totalClaimAmount = amount + inboxAmount;

  // Bonus 1: Large claim (1,000+ VBMS) = +1%
  if (totalClaimAmount >= 1000) {
    const largeBon = Math.floor(totalClaimAmount * 0.01);
    bonus += largeBon;
    bonusReasons.push(`+${largeBon} VBMS (1% large claim bonus)`);
  }

  // Bonus 2: Weekly claim (7+ days since last) = +5%
  const lastClaim = profile.lastClaimTimestamp || 0;
  const daysSinceLastClaim = (Date.now() - lastClaim) / (24 * 60 * 60 * 1000);

  if (daysSinceLastClaim >= 7) {
    const weeklyBon = Math.floor(totalClaimAmount * 0.05);
    bonus += weeklyBon;
    bonusReasons.push(`+${weeklyBon} VBMS (5% weekly bonus)`);
  }

  // Bonus 3: First claim of the day = +50 flat
  const today = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const lastClaimDay = Math.floor(lastClaim / (24 * 60 * 60 * 1000));

  if (today > lastClaimDay) {
    bonus += 50;
    bonusReasons.push("+50 VBMS (first claim today)");
  }

  return {
    baseAmount: amount,
    bonus,
    totalAmount: amount + bonus,
    bonusReasons,
  };
}

// ========== HELPER: Generate Nonce ==========

function generateNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ========== HELPER: Sign Message (Placeholder) ==========

async function signClaimMessage(
  address: string,
  amount: number,
  nonce: string
): Promise<string> {
  // TODO: Implement actual backend signing with private key
  // For now, return placeholder
  // This should use ethers.js to sign: keccak256(abi.encodePacked(address, amount, nonce))
  return `0x${"0".repeat(130)}`; // Placeholder signature
}

// ========== MUTATION: Claim Battle Rewards Now (Immediate) ==========

export const claimBattleRewardsNow = mutation({
  args: {
    address: v.string(),
    matchId: v.id("matches"),
  },
  handler: async (ctx, { address, matchId }) => {
    const profile = await getProfile(ctx, address);

    // Get match data
    const match = await ctx.db.get(matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Verify match belongs to this player
    if (match.playerAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Unauthorized: Match does not belong to this player");
    }

    // Check if rewards already claimed
    if (match.rewardsClaimed) {
      throw new Error("Rewards already claimed for this match");
    }

    const amount = match.coinsEarned || 0;

    if (amount < 100) {
      throw new Error("Minimum claim amount is 100 VBMS");
    }

    // Calculate bonus
    const inboxAmount = profile.inbox || 0;
    const bonusData = calculateClaimBonus(profile, amount, inboxAmount);

    // Generate signature for smart contract
    const nonce = generateNonce();
    const signature = await signClaimMessage(address, bonusData.totalAmount, nonce);

    // Mark match as claimed (will be finalized after blockchain confirmation)
    await ctx.db.patch(matchId, {
      rewardsClaimed: true,
      claimedAt: Date.now(),
      claimType: "immediate",
    });

    // Track analytics
    await ctx.db.insert("claimAnalytics", {
      playerAddress: address.toLowerCase(),
      choice: "immediate",
      amount,
      inboxTotal: inboxAmount,
      bonusAvailable: bonusData.bonus > 0,
      timestamp: Date.now(),
    });

    return {
      amount: bonusData.totalAmount,
      baseAmount: bonusData.baseAmount,
      bonus: bonusData.bonus,
      bonusReasons: bonusData.bonusReasons,
      nonce,
      signature,
      message: `Claim ${bonusData.totalAmount} VBMS`,
    };
  },
});

// ========== MUTATION: Send to Inbox (Deferred) ==========

export const sendToInbox = mutation({
  args: {
    address: v.string(),
    matchId: v.id("matches"),
  },
  handler: async (ctx, { address, matchId }) => {
    const profile = await getProfile(ctx, address);

    // Get match data
    const match = await ctx.db.get(matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Verify match belongs to this player
    if (match.playerAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Unauthorized: Match does not belong to this player");
    }

    // Check if rewards already claimed
    if (match.rewardsClaimed) {
      throw new Error("Rewards already claimed for this match");
    }

    const amount = match.coinsEarned || 0;

    // Add to inbox
    const newInbox = (profile.inbox || 0) + amount;

    await ctx.db.patch(profile._id, {
      inbox: newInbox,
      lifetimeEarned: (profile.lifetimeEarned || 0) + amount,
    });

    // Mark match as claimed
    await ctx.db.patch(matchId, {
      rewardsClaimed: true,
      claimedAt: Date.now(),
      claimType: "inbox",
    });

    // Track analytics
    await ctx.db.insert("claimAnalytics", {
      playerAddress: address.toLowerCase(),
      choice: "inbox",
      amount,
      inboxTotal: newInbox,
      bonusAvailable: false,
      timestamp: Date.now(),
    });

    return {
      newInbox,
      amountAdded: amount,
      gasUsed: 0,
      message: `📬 ${amount} VBMS sent to inbox!`,
    };
  },
});

// ========== MUTATION: Prepare Inbox Claim (Collect All) ==========

export const prepareInboxClaim = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const profile = await getProfile(ctx, address);

    const inboxAmount = profile.inbox || 0;

    if (inboxAmount < 100) {
      throw new Error("Minimum claim amount is 100 VBMS. Current inbox: " + inboxAmount);
    }

    // Calculate bonus (inbox collection gets all bonuses)
    const bonusData = calculateClaimBonus(profile, inboxAmount);

    // Generate signature
    const nonce = generateNonce();
    const signature = await signClaimMessage(address, bonusData.totalAmount, nonce);

    return {
      amount: bonusData.totalAmount,
      baseAmount: bonusData.baseAmount,
      bonus: bonusData.bonus,
      bonusReasons: bonusData.bonusReasons,
      nonce,
      signature,
      message: `Collect ${bonusData.totalAmount} VBMS from inbox`,
    };
  },
});

// ========== MUTATION: Record Inbox Claim (After Blockchain Confirmation) ==========

export const recordInboxClaim = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx, { address, amount, txHash }) => {
    const profile = await getProfile(ctx, address);

    // Clear inbox
    await ctx.db.patch(profile._id, {
      inbox: 0,
      claimedTokens: (profile.claimedTokens || 0) + amount,
      lastClaimTimestamp: Date.now(),
    });

    // Save to claim history
    await ctx.db.insert("claimHistory", {
      playerAddress: address.toLowerCase(),
      amount,
      txHash,
      timestamp: Date.now(),
      type: "inbox_collect",
    });

    return {
      success: true,
      newClaimedTotal: (profile.claimedTokens || 0) + amount,
    };
  },
});

// ========== MUTATION: Record Immediate Claim (After Blockchain Confirmation) ==========

export const recordImmediateClaim = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    bonus: v.number(),
    bonusReasons: v.array(v.string()),
    txHash: v.string(),
  },
  handler: async (ctx, { address, amount, bonus, bonusReasons, txHash }) => {
    const profile = await getProfile(ctx, address);

    // Update claimed tokens and timestamp
    await ctx.db.patch(profile._id, {
      claimedTokens: (profile.claimedTokens || 0) + amount,
      lastClaimTimestamp: Date.now(),
    });

    // Save to claim history
    await ctx.db.insert("claimHistory", {
      playerAddress: address.toLowerCase(),
      amount,
      bonus,
      bonusReasons,
      txHash,
      timestamp: Date.now(),
      type: "immediate",
    });

    return {
      success: true,
      newClaimedTotal: (profile.claimedTokens || 0) + amount,
    };
  },
});

// ========== QUERY: Get Player Economy (with Inbox) ==========

export const getPlayerEconomy = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    // Try to get profile, return null if doesn't exist
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      return null;
    }

    return {
      // Virtual balance (in-app spending)
      coins: profile.coins || 0,
      lifetimeEarned: profile.lifetimeEarned || 0,
      lifetimeSpent: profile.lifetimeSpent || 0,

      // Real VBMS token
      inbox: profile.inbox || 0,
      claimedTokens: profile.claimedTokens || 0,
      poolDebt: profile.poolDebt || 0,
      lastClaimTimestamp: profile.lastClaimTimestamp || 0,

      // Calculate claimable
      claimableBalance: Math.max(0, (profile.inbox || 0) - (profile.poolDebt || 0)),
    };
  },
});

// ========== QUERY: Get Recommendation ==========

export const getClaimRecommendation = query({
  args: {
    address: v.string(),
    pendingAmount: v.number(), // Amount from current battle
  },
  handler: async (ctx, { address, pendingAmount }) => {
    const profile = await getProfile(ctx, address);

    const inboxAmount = profile.inbox || 0;
    const totalAfterClaim = inboxAmount + pendingAmount;
    const lastClaim = profile.lastClaimTimestamp || 0;
    const daysSinceLastClaim = (Date.now() - lastClaim) / (24 * 60 * 60 * 1000);

    // Calculate potential bonus
    const bonusData = calculateClaimBonus(profile, pendingAmount, inboxAmount);
    const hasBonus = bonusData.bonus > 0;

    // Recommendation logic
    let recommended: "claim_now" | "inbox" = "inbox";
    let reason = "Economize gas acumulando mais!";
    let badge: string | null = null;

    if (totalAfterClaim >= 1000) {
      recommended = "claim_now";
      reason = "Você tem 1,000+ VBMS acumulado!";
      badge = "🎁 +1% Bonus";
    } else if (daysSinceLastClaim >= 7) {
      recommended = "claim_now";
      reason = "Bonus semanal disponível!";
      badge = "🎉 +5% Weekly Bonus";
    } else if (hasBonus) {
      recommended = "claim_now";
      reason = "Bonus disponível agora!";
      badge = `✨ +${bonusData.bonus} VBMS`;
    }

    return {
      recommended,
      reason,
      badge,
      potentialBonus: bonusData.bonus,
      totalWithBonus: bonusData.totalAmount,
      inboxTotal: totalAfterClaim,
    };
  },
});

// ========== QUERY: Get Claim History ==========

export const getClaimHistory = query({
  args: {
    address: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { address, limit = 20 }) => {
    const history = await ctx.db
      .query("claimHistory")
      .withIndex("by_player", (q: any) =>
        q.eq("playerAddress", address.toLowerCase())
      )
      .order("desc")
      .take(limit);

    return history;
  },
});

// ========== QUERY: Get Claim Analytics (Admin) ==========

export const getClaimBehaviorAnalytics = query({
  handler: async (ctx) => {
    const analytics = await ctx.db
      .query("claimAnalytics")
      .order("desc")
      .take(1000);

    const immediate = analytics.filter((a) => a.choice === "immediate").length;
    const inbox = analytics.filter((a) => a.choice === "inbox").length;
    const total = immediate + inbox;

    const avgClaimAmount =
      analytics.reduce((sum, a) => sum + a.amount, 0) / total || 0;

    return {
      totalClaims: total,
      immediateClaimRate: total > 0 ? immediate / total : 0,
      inboxRate: total > 0 ? inbox / total : 0,
      avgClaimAmount,
      immediate,
      inbox,
    };
  },
});
