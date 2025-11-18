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
import { mutation, query, action, internalMutation, internalAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

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
  // Generate bytes32 nonce (64 hex characters)
  const timestamp = Date.now().toString(16).padStart(16, '0');
  const random1 = Math.random().toString(16).substring(2).padStart(16, '0');
  const random2 = Math.random().toString(16).substring(2).padStart(16, '0');
  const random3 = Math.random().toString(16).substring(2).padStart(16, '0');
  return `0x${timestamp}${random1}${random2}${random3}`.substring(0, 66); // 0x + 64 chars
}

// ========== INTERNAL ACTION: Sign Message (ECDSA Real Signature) ==========
// Calls Next.js API route to sign the message (needs to be action because of fetch)

export const signClaimMessage = internalAction({
  args: {
    address: v.string(),
    amount: v.number(),
    nonce: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const { address, amount, nonce } = args;
    const apiUrl = 'https://vibe-most-wanted.vercel.app';

    console.log(`[VBMS Sign Claim] Calling API at: ${apiUrl}/api/vbms/sign-claim`);
    console.log(`[VBMS Sign Claim] Request: address=${address}, amount=${amount}, nonce=${nonce}`);

    try {
      const response = await fetch(`${apiUrl}/api/vbms/sign-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount, nonce }),
      });

      console.log(`[VBMS Sign Claim] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[VBMS Sign Claim] Error response body: ${errorText}`);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }

        throw new Error(`Failed to sign claim (${response.status}): ${errorData.error || response.statusText}`);
      }

      const data = await response.json();

      console.log(`[VBMS Signature] Address: ${address}, Amount: ${amount} VBMS, Nonce: ${nonce}`);
      console.log(`[VBMS Signature] Signature received: ${data.signature?.slice(0, 20)}...`);

      if (!data.signature) {
        throw new Error('No signature in response');
      }

      return data.signature;
    } catch (error: any) {
      console.error(`[VBMS Signature Error] ${error.message}`, error);
      throw new Error(`Failed to sign claim message: ${error.message}`);
    }
  }
});

// ========== ACTION: Claim Battle Rewards Now (Immediate) ==========

export const claimBattleRewardsNow = action({
  args: {
    address: v.string(),
    matchId: v.id("matches"),
  },
  handler: async (ctx, { address, matchId }): Promise<{
    amount: number;
    baseAmount: number;
    bonus: number;
    bonusReasons: string[];
    nonce: string;
    signature: string;
    message: string;
  }> => {
    // Get profile and match data, calculate bonus via internal mutation
    const result = await ctx.runMutation(internal.vbmsClaim.claimBattleRewardsNowInternal, {
      address,
      matchId
    });

    // Generate signature for blockchain claim
    const nonce = generateNonce();
    const signature = await ctx.runAction(internal.vbmsClaim.signClaimMessage, {
      address,
      amount: result.totalAmount,
      nonce
    });

    return {
      amount: result.totalAmount,
      baseAmount: result.baseAmount,
      bonus: result.bonus,
      bonusReasons: result.bonusReasons,
      nonce,
      signature,
      message: `Claim ${result.totalAmount} VBMS`,
    };
  },
});

export const claimBattleRewardsNowInternal = internalMutation({
  args: {
    address: v.string(),
    matchId: v.id("matches"),
  },
  handler: async (ctx, { address, matchId }): Promise<{
    totalAmount: number;
    baseAmount: number;
    bonus: number;
    bonusReasons: string[];
  }> => {
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
    const inboxAmount = profile.coinsInbox || 0;
    const bonusData = calculateClaimBonus(profile, amount, inboxAmount);

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
      totalAmount: bonusData.totalAmount,
      baseAmount: bonusData.baseAmount,
      bonus: bonusData.bonus,
      bonusReasons: bonusData.bonusReasons,
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
    const newInbox = (profile.coinsInbox || 0) + amount;

    await ctx.db.patch(profile._id, {
      coinsInbox: newInbox,
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

// ========== ACTION: Prepare Inbox Claim (Collect All) ==========

export const prepareInboxClaim = action({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }): Promise<{
    amount: number;
    baseAmount: number;
    bonus: number;
    bonusReasons: string[];
    nonce: string;
    signature: string;
    message: string;
  }> => {
    // Get profile, validate, and zero inbox via internal mutation
    const result = await ctx.runMutation(internal.vbmsClaim.prepareInboxClaimInternal, { address });

    // Generate signature for blockchain claim
    const nonce = generateNonce();
    const signature = await ctx.runAction(internal.vbmsClaim.signClaimMessage, {
      address,
      amount: result.totalAmount,
      nonce
    });

    return {
      amount: result.totalAmount,
      baseAmount: result.baseAmount,
      bonus: result.bonus,
      bonusReasons: result.bonusReasons,
      nonce,
      signature,
      message: `Collect ${result.totalAmount} VBMS from inbox`,
    };
  },
});

export const prepareInboxClaimInternal = internalMutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }): Promise<{
    totalAmount: number;
    baseAmount: number;
    bonus: number;
    bonusReasons: string[];
  }> => {
    const profile = await getProfile(ctx, address);

    const inboxAmount = profile.coinsInbox || 0;

    if (inboxAmount < 100) {
      throw new Error("Minimum claim amount is 100 VBMS. Current inbox: " + inboxAmount);
    }

    // Calculate bonus (inbox collection gets all bonuses)
    const bonusData = calculateClaimBonus(profile, inboxAmount);

    // 🔒 SECURITY: Zero inbox IMMEDIATELY to prevent multiple claims
    await ctx.db.patch(profile._id, {
      coinsInbox: 0,
    });

    return {
      totalAmount: bonusData.totalAmount,
      baseAmount: bonusData.baseAmount,
      bonus: bonusData.bonus,
      bonusReasons: bonusData.bonusReasons,
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
      coinsInbox: 0,
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
      // Virtual balance (in-app spending) - TESTVBMS
      coins: profile.coins || 0,
      lifetimeEarned: profile.lifetimeEarned || 0,
      lifetimeSpent: profile.lifetimeSpent || 0,

      // Real VBMS token (inbox system)
      inbox: profile.coinsInbox || 0,
      claimedTokens: profile.claimedTokens || 0,
      poolDebt: profile.poolDebt || 0,
      lastClaimTimestamp: profile.lastClaimTimestamp || 0,

      // Calculate claimable
      claimableBalance: Math.max(0, (profile.coinsInbox || 0) - (profile.poolDebt || 0)),
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

    const inboxAmount = profile.coinsInbox || 0;
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

// ========== MUTATION: Send Achievement to Inbox ==========

export const sendAchievementToInbox = mutation({
  args: {
    address: v.string(),
    achievementId: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, { address, achievementId, amount }) => {
    const profile = await getProfile(ctx, address);

    const currentInbox = profile.coinsInbox || 0;
    const newInbox = currentInbox + amount;

    // Check if paying off debt
    const hadDebt = currentInbox < 0;
    const debtPaid = hadDebt ? Math.min(Math.abs(currentInbox), amount) : 0;
    const netGain = amount - debtPaid;

    await ctx.db.patch(profile._id, {
      coinsInbox: newInbox,
      lifetimeEarned: (profile.lifetimeEarned || 0) + amount,
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

    let message = `📬 ${amount} VBMS sent to inbox from achievement!`;
    if (hadDebt && newInbox < 0) {
      message = `📬 ${amount} VBMS sent to inbox! Debt reduced from ${Math.abs(currentInbox)} to ${Math.abs(newInbox)}`;
    } else if (hadDebt && newInbox >= 0) {
      message = `📬 ${amount} VBMS sent to inbox! Debt cleared (${debtPaid} paid), +${netGain} added!`;
    }

    return {
      newInbox,
      amountAdded: amount,
      debtPaid,
      hadDebt,
      message,
    };
  },
});

// ========== DISABLED: Claim Achievement Now (Immediate) ==========
// TODO: Refactor to use action/internal mutation pattern (mutations cannot call ctx.runAction)
// Currently not used by frontend

/*
export const claimAchievementNow = mutation({
  args: {
    address: v.string(),
    achievementId: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, { address, achievementId, amount }) => {
    const profile = await getProfile(ctx, address);

    // 🔒 SECURITY: Verify achievement hasn't been claimed yet
    const achievement = await ctx.db
      .query("achievements")
      .withIndex("by_player_achievement", (q) =>
        q.eq("playerAddress", address.toLowerCase()).eq("achievementId", achievementId)
      )
      .first();

    if (!achievement) {
      throw new Error("Achievement not found");
    }

    if (!achievement.claimedAt) {
      throw new Error("Achievement reward not claimed yet - call claimAchievementReward first");
    }

    // Check if blockchain claim already done (prevent double claim)
    if ((achievement as any).blockchainClaimedAt) {
      throw new Error("Achievement VBMS already claimed on blockchain");
    }

    if (amount < 100) {
      throw new Error("Minimum claim amount is 100 VBMS");
    }

    // Calculate bonus
    const inboxAmount = profile.coinsInbox || 0;
    const bonusData = calculateClaimBonus(profile, amount, inboxAmount);

    // Generate signature for smart contract
    const nonce = generateNonce();
    const signature = await ctx.runAction(internal.vbmsClaim.signClaimMessage, { address, amount: bonusData.totalAmount, nonce });

    // 🔒 SECURITY: Mark blockchain claim to prevent reuse
    await ctx.db.patch(achievement._id, {
      blockchainClaimedAt: Date.now(),
    } as any);

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
      message: `Claim ${bonusData.totalAmount} VBMS from achievement`,
    };
  },
});
*/

// ========== MUTATION: Claim Inbox as TESTVBMS (Virtual Coins) ==========

export const claimInboxAsTESTVBMS = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const profile = await getProfile(ctx, address);

    const inboxAmount = profile.coinsInbox || 0;

    if (inboxAmount < 1) {
      throw new Error("Nada para coletar no inbox");
    }

    // Add to virtual coins balance
    const currentCoins = profile.coins || 0;
    const newCoins = currentCoins + inboxAmount;

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      coinsInbox: 0, // Clear inbox
      lifetimeEarned: (profile.lifetimeEarned || 0) + inboxAmount,
    });

    return {
      success: true,
      amount: inboxAmount,
      newBalance: newCoins,
      message: `💰 ${inboxAmount} TESTVBMS added to your balance!`,
    };
  },
});

// ========== PVE REWARD CLAIMS ==========

/**
 * Send PvE reward to inbox (CPU poker victories) - pays debt first if any
 */
export const sendPveRewardToInbox = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    difficulty: v.optional(v.union(
      v.literal("gey"),
      v.literal("goofy"),
      v.literal("gooner"),
      v.literal("gangster"),
      v.literal("gigachad")
    )),
  },
  handler: async (ctx, { address, amount, difficulty }) => {
    const profile = await getProfile(ctx, address);

    const currentInbox = profile.coinsInbox || 0;
    const newInbox = currentInbox + amount;

    // Check if paying off debt
    const hadDebt = currentInbox < 0;
    const debtPaid = hadDebt ? Math.min(Math.abs(currentInbox), amount) : 0;
    const netGain = amount - debtPaid;

    await ctx.db.patch(profile._id, {
      coinsInbox: newInbox,
      lifetimeEarned: (profile.lifetimeEarned || 0) + amount,
      lastUpdated: Date.now(),
    });

    console.log(`📬 ${address} sent ${amount} TESTVBMS to inbox from PvE victory (difficulty: ${difficulty || 'N/A'}). Inbox: ${currentInbox} → ${newInbox}`);

    // Track analytics
    await ctx.db.insert("claimAnalytics", {
      playerAddress: address.toLowerCase(),
      choice: "inbox",
      amount,
      inboxTotal: newInbox,
      bonusAvailable: false,
      timestamp: Date.now(),
    });

    let message = `📬 ${amount} TESTVBMS sent to inbox from PvE victory!`;
    if (hadDebt && newInbox < 0) {
      message = `📬 ${amount} TESTVBMS sent to inbox! Debt reduced from ${Math.abs(currentInbox)} to ${Math.abs(newInbox)}`;
    } else if (hadDebt && newInbox >= 0) {
      message = `📬 ${amount} TESTVBMS sent to inbox! Debt cleared (${debtPaid} paid), +${netGain} added!`;
    }

    return {
      newInbox,
      amountAdded: amount,
      debtPaid,
      hadDebt,
      message,
    };
  },
});

/**
 * Claim PvE reward now (prepare blockchain TX)
 */
export const claimPveRewardNow = action({
  args: {
    address: v.string(),
    amount: v.number(),
    difficulty: v.optional(v.union(
      v.literal("gey"),
      v.literal("goofy"),
      v.literal("gooner"),
      v.literal("gangster"),
      v.literal("gigachad")
    )),
  },
  handler: async (ctx, { address, amount, difficulty }): Promise<{
    amount: number;
    baseAmount: number;
    bonus: number;
    bonusReasons: string[];
    nonce: string;
    signature: string;
    message: string;
  }> => {
    // Get profile, validate, calculate bonus via internal mutation
    const result = await ctx.runMutation(internal.vbmsClaim.claimPveRewardNowInternal, {
      address,
      amount,
      difficulty
    });

    // Generate signature for blockchain claim
    const nonce = generateNonce();
    const signature = await ctx.runAction(internal.vbmsClaim.signClaimMessage, {
      address,
      amount: result.totalAmount,
      nonce
    });

    return {
      amount: result.totalAmount,
      baseAmount: result.baseAmount,
      bonus: result.bonus,
      bonusReasons: result.bonusReasons,
      nonce,
      signature,
      message: `Claim ${result.totalAmount} VBMS from PvE victory`,
    };
  },
});

export const claimPveRewardNowInternal = internalMutation({
  args: {
    address: v.string(),
    amount: v.number(),
    difficulty: v.optional(v.union(
      v.literal("gey"),
      v.literal("goofy"),
      v.literal("gooner"),
      v.literal("gangster"),
      v.literal("gigachad")
    )),
  },
  handler: async (ctx, { address, amount, difficulty }): Promise<{
    totalAmount: number;
    baseAmount: number;
    bonus: number;
    bonusReasons: string[];
  }> => {
    const profile = await getProfile(ctx, address);

    if (amount < 100) {
      throw new Error("Minimum claim amount is 100 VBMS");
    }

    // Calculate bonus
    const inboxAmount = profile.coinsInbox || 0;
    const bonusData = calculateClaimBonus(profile, amount, inboxAmount);

    console.log(`💰 ${address} claiming ${bonusData.totalAmount} VBMS now from PvE victory (difficulty: ${difficulty || 'N/A'}, base: ${amount}, bonus: ${bonusData.bonus})`);

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
      totalAmount: bonusData.totalAmount,
      baseAmount: bonusData.baseAmount,
      bonus: bonusData.bonus,
      bonusReasons: bonusData.bonusReasons,
    };
  },
});

// ========== MUTATION: Convert TESTVBMS to VBMS ==========

/**
 * Convert all TESTVBMS coins to VBMS blockchain tokens
 * Prepares the signature for blockchain claim
 */
export const convertTESTVBMStoVBMS = action({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }): Promise<{
    amount: number;
    nonce: string;
    signature: string;
    message: string;
  }> => {
    // Get profile and validate via internal mutation
    const result = await ctx.runMutation(internal.vbmsClaim.convertTESTVBMSInternal, { address });

    // Generate signature for blockchain claim
    const nonce = generateNonce();
    const signature = await ctx.runAction(internal.vbmsClaim.signClaimMessage, {
      address,
      amount: result.testVBMSBalance,
      nonce
    });

    console.log(`💱 ${address} converting ${result.testVBMSBalance} TESTVBMS → VBMS (nonce: ${nonce})`);

    return {
      amount: result.testVBMSBalance,
      nonce: nonce,
      signature: signature,
      message: `Converting ${result.testVBMSBalance} TESTVBMS to VBMS`,
    };
  },
});

// Internal mutation to handle database operations
export const convertTESTVBMSInternal = internalMutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }): Promise<{ testVBMSBalance: number }> => {
    const profile = await getProfile(ctx, address);

    const testVBMSBalance = profile.coins || 0;

    if (testVBMSBalance < 100) {
      throw new Error(`Minimum 100 TESTVBMS required to convert. You have: ${testVBMSBalance}`);
    }

    // NOTE: Balance will be zeroed by recordTESTVBMSConversion AFTER blockchain TX succeeds
    // DO NOT zero here - if signature fails, user loses their TESTVBMS!

    // Track analytics
    await ctx.db.insert("claimAnalytics", {
      playerAddress: address.toLowerCase(),
      choice: "immediate",
      amount: testVBMSBalance,
      inboxTotal: profile.coinsInbox || 0,
      bonusAvailable: false,
      timestamp: Date.now(),
    });

    return { testVBMSBalance };
  },
});

/**
 * Record TESTVBMS → VBMS conversion (after blockchain confirmation)
 * Zeros the TESTVBMS balance
 */
export const recordTESTVBMSConversion = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx, { address, amount, txHash }) => {
    const profile = await getProfile(ctx, address);

    // Zero TESTVBMS coins
    await ctx.db.patch(profile._id, {
      coins: 0,
      claimedTokens: (profile.claimedTokens || 0) + amount,
      lastClaimTimestamp: Date.now(),
    });

    // Save to claim history
    await ctx.db.insert("claimHistory", {
      playerAddress: address.toLowerCase(),
      amount,
      txHash,
      timestamp: Date.now(),
      type: "testvbms_conversion" as any,
    });

    console.log(`✅ ${address} converted ${amount} TESTVBMS → VBMS, zeroed coins`);

    return {
      success: true,
      newCoinsBalance: 0,
      newClaimedTotal: (profile.claimedTokens || 0) + amount,
    };
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
