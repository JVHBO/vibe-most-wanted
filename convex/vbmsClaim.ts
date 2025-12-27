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
import { mutation, query, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { createAuditLog } from "./coinAudit";
import { isBlacklisted, getBlacklistInfo } from "./blacklist";
import { logTransaction } from "./coinsInbox";

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
  // 🔒 SECURITY FIX: Use crypto.randomUUID() instead of Math.random()
  // Math.random() is predictable and can enable replay attacks
  const uuid1 = crypto.randomUUID().replace(/-/g, ''); // 32 hex chars
  const uuid2 = crypto.randomUUID().replace(/-/g, ''); // 32 hex chars
  return `0x${uuid1}${uuid2}`.substring(0, 66); // 0x + 64 chars = bytes32
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
    const apiUrl = 'https://www.vibemostwanted.xyz';

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

// ========== INTERNAL ACTION: Check if nonce was used on-chain ==========
// 🔒 SECURITY: Prevents double-spend by verifying on-chain before allowing recovery

const VBMS_POOL_TROLL_ADDRESS = "0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b";
const BASE_RPC_URL = "https://mainnet.base.org";

export const checkNonceUsedOnChain = internalAction({
  args: {
    nonce: v.string(),
  },
  handler: async (ctx, { nonce }): Promise<boolean> => {
    try {
      // usedNonces(bytes32) function selector: 0xfeb61724
      // Encode the call data: function selector + nonce (already bytes32 format)
      const nonceHex = nonce.startsWith('0x') ? nonce : `0x${nonce}`;
      const paddedNonce = nonceHex.slice(2).padStart(64, '0');
      const callData = `0xfeb61724${paddedNonce}`;

      const response = await fetch(BASE_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{
            to: VBMS_POOL_TROLL_ADDRESS,
            data: callData,
          }, 'latest']
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error(`[OnChain Check] RPC error:`, data.error);
        // On error, be conservative - assume nonce WAS used (block recovery)
        return true;
      }

      // Result is 0x...0001 if true (used), 0x...0000 if false (not used)
      const result = data.result;
      const isUsed = result && result !== '0x0000000000000000000000000000000000000000000000000000000000000000';

      console.log(`[OnChain Check] Nonce ${nonce.slice(0, 10)}... used: ${isUsed}`);

      return isUsed;
    } catch (error: any) {
      console.error(`[OnChain Check] Error checking nonce:`, error);
      // On error, be conservative - assume nonce WAS used (block recovery)
      return true;
    }
  },
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

    // Add to balance
    const newBalance = (profile.coins || 0) + amount;

    await ctx.db.patch(profile._id, {
      coins: newBalance,
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
      choice: "immediate",
      amount,
      inboxTotal: newBalance,
      bonusAvailable: false,
      timestamp: Date.now(),
    });

    return {
      newInbox: newBalance,
      amountAdded: amount,
      gasUsed: 0,
      message: `💰 ${amount} VBMS added to balance!`,
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
  handler: async (ctx, { address, limit = 500 }) => {
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

// ========== QUERY: Get FULL Transaction History (Audit + Claims) ==========

export const getFullTransactionHistory = query({
  args: {
    address: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { address, limit = 500 }) => {
    const normalizedAddress = address.toLowerCase();

    // Get claim history (blockchain claims)
    const claimHistory = await ctx.db
      .query("claimHistory")
      .withIndex("by_player", (q: any) => q.eq("playerAddress", normalizedAddress))
      .collect();

    // Get audit log (all TESTVBMS transactions)
    const auditLog = await ctx.db
      .query("coinAuditLog")
      .withIndex("by_player", (q: any) => q.eq("playerAddress", normalizedAddress))
      .collect();

    // Get claim analytics
    const analytics = await ctx.db
      .query("claimAnalytics")
      .withIndex("by_player", (q: any) => q.eq("playerAddress", normalizedAddress))
      .collect();

    // Combine and sort by timestamp
    const allTransactions = [
      ...claimHistory.map(c => ({
        source: "claimHistory",
        type: c.type,
        amount: c.amount,
        timestamp: c.timestamp,
        txHash: c.txHash,
        bonus: c.bonus,
      })),
      ...auditLog.map(a => ({
        source: "auditLog",
        type: a.type,
        amount: a.amount,
        timestamp: a.timestamp,
        balanceBefore: a.balanceBefore,
        balanceAfter: a.balanceAfter,
        sourceFunction: a.source,
        metadata: a.metadata,
      })),
      ...analytics.map(a => ({
        source: "analytics",
        type: a.choice,
        amount: a.amount,
        timestamp: a.timestamp,
        inboxTotal: a.inboxTotal,
      })),
    ].sort((a, b) => b.timestamp - a.timestamp);

    return {
      total: allTransactions.length,
      transactions: allTransactions.slice(0, limit),
      summary: {
        claimHistoryCount: claimHistory.length,
        auditLogCount: auditLog.length,
        analyticsCount: analytics.length,
      },
    };
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

    const currentBalance = profile.coins || 0;
    const newBalance = currentBalance + amount;

    await ctx.db.patch(profile._id, {
      coins: newBalance,
      lifetimeEarned: (profile.lifetimeEarned || 0) + amount,
    });

    // Track analytics
    await ctx.db.insert("claimAnalytics", {
      playerAddress: address.toLowerCase(),
      choice: "immediate",
      amount,
      inboxTotal: newBalance,
      bonusAvailable: false,
      timestamp: Date.now(),
    });

    const message = `💰 ${amount} VBMS added to balance from achievement!`;

    return {
      newInbox: newBalance,
      amountAdded: amount,
      debtPaid: 0,
      hadDebt: false,
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

    const currentBalance = profile.coins || 0;
    const newBalance = currentBalance + amount;

    await ctx.db.patch(profile._id, {
      coins: newBalance,
      lifetimeEarned: (profile.lifetimeEarned || 0) + amount,
      lastUpdated: Date.now(),
    });

    console.log(`💰 ${address} received ${amount} TESTVBMS from PvE victory (difficulty: ${difficulty || 'N/A'}). Balance: ${currentBalance} → ${newBalance}`);

    // Track analytics
    await ctx.db.insert("claimAnalytics", {
      playerAddress: address.toLowerCase(),
      choice: "immediate",
      amount,
      inboxTotal: newBalance,
      bonusAvailable: false,
      timestamp: Date.now(),
    });

    const message = `💰 ${amount} TESTVBMS added to balance from PvE victory!`;

    return {
      newInbox: newBalance,
      amountAdded: amount,
      debtPaid: 0,
      hadDebt: false,
      message,
    };
  },
});

/**
 * Send PvP reward to inbox (poker battles PvP) - pays debt first if any
 */
export const sendPvpRewardToInbox = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, { address, amount }) => {
    try {
      console.log(`[sendPvpRewardToInbox] START - address: ${address}, amount: ${amount}`);

      const profile = await getProfile(ctx, address);
      console.log(`[sendPvpRewardToInbox] Profile found: ${profile._id}`);

      const currentBalance = profile.coins || 0;
      const newBalance = currentBalance + amount;

      console.log(`[sendPvpRewardToInbox] Updating profile...`);
      await ctx.db.patch(profile._id, {
        coins: newBalance,
        lifetimeEarned: (profile.lifetimeEarned || 0) + amount,
        lastUpdated: Date.now(),
      });

      console.log(`💰 ${address} received ${amount} TESTVBMS from PvP victory. Balance: ${currentBalance} → ${newBalance}`);

      // Track analytics
      console.log(`[sendPvpRewardToInbox] Inserting analytics...`);
      await ctx.db.insert("claimAnalytics", {
        playerAddress: address.toLowerCase(),
        choice: "immediate",
        amount,
        inboxTotal: newBalance,
        bonusAvailable: false,
        timestamp: Date.now(),
      });

      const message = `💰 ${amount} TESTVBMS added to balance from PvP victory!`;

      console.log(`[sendPvpRewardToInbox] SUCCESS`);
      return {
        newInbox: newBalance,
        amountAdded: amount,
        debtPaid: 0,
        hadDebt: false,
        message,
      };
    } catch (error: any) {
      console.error(`[sendPvpRewardToInbox] ERROR:`, error);
      console.error(`[sendPvpRewardToInbox] Error details:`, error.message, error.stack);
      throw new Error(`Failed to send PvP reward to inbox: ${error.message}`);
    }
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
 * Convert TESTVBMS coins to VBMS blockchain tokens
 * Prepares the signature for blockchain claim
 *
 * 🔒 SECURITY: Requires FID verification
 * - Only works if caller provides valid FID that matches the address in database
 * - Prevents direct API calls without proper Farcaster authentication
 *
 * @param address - Wallet address
 * @param fid - Farcaster FID (REQUIRED for security)
 * @param amount - Optional: specific amount to convert (default: all balance up to max)
 */
export const convertTESTVBMStoVBMS = action({
  args: {
    address: v.string(),
    fid: v.number(), // 🔒 REQUIRED - Must provide valid FID
    amount: v.optional(v.number()),
  },
  handler: async (ctx, { address, fid, amount }): Promise<{
    amount: number;
    nonce: string;
    signature: string;
    message: string;
  }> => {
    // 📊 Log conversion attempt
    console.log(`[VBMS] 🔄 Conversion attempt:`, {
      address,
      fid,
      requestedAmount: amount,
      timestamp: new Date().toISOString(),
    });

    // 🔒 SECURITY: FID is required
    if (!fid || fid <= 0) {
      console.log(`[VBMS] ⛔ BLOCKED - No valid FID provided for ${address}`);
      throw new Error("🔒 Farcaster authentication required. Please use the miniapp to claim.");
    }

    // 🔒 Generate nonce FIRST so we can store it for on-chain verification
    const nonce = generateNonce();

    // Get profile and validate via internal mutation (includes FID verification)
    // Pass nonce so it gets stored in pendingNonce for double-spend protection
    let result;
    try {
      result = await ctx.runMutation(internal.vbmsClaim.convertTESTVBMSInternal, { address, fid, amount, nonce });
      console.log(`[VBMS] ✅ Internal mutation success:`, { claimAmount: result.claimAmount });
    } catch (error: any) {
      console.error(`[VBMS] ❌ Internal mutation FAILED:`, {
        address,
        fid,
        requestedAmount: amount,
        error: error.message,
      });
      throw error;
    }

    // Generate signature for blockchain claim
    let signature: string;

    try {
      signature = await ctx.runAction(internal.vbmsClaim.signClaimMessage, {
        address,
        amount: result.claimAmount,
        nonce
      });
    } catch (signError: any) {
      // 🚨 CRITICAL: If signing fails, restore coins immediately!
      console.error(`[VBMS] ❌ Signature failed for ${address}, restoring ${result.claimAmount} coins:`, signError);
      await ctx.runMutation(internal.vbmsClaim.restoreCoinsOnSignFailure, {
        address,
        amount: result.claimAmount
      });
      throw new Error(`Signature generation failed. Your ${result.claimAmount} coins have been restored. Please try again.`);
    }

    console.log(`💱 ${address} (FID: ${fid}) converting ${result.claimAmount} TESTVBMS → VBMS (nonce: ${nonce})`);

    return {
      amount: result.claimAmount,
      nonce: nonce,
      signature: signature,
      message: `Converting ${result.claimAmount} TESTVBMS to VBMS`,
    };
  },
});

// Conversion cooldown (3 minutes)
const CONVERSION_COOLDOWN_MS = 3 * 60 * 1000;
// Claim limits - LOWER than contract to have buffer
// Contract dailyClaimLimit: 750k, but site uses 500k for safety margin
const MAX_CLAIM_AMOUNT = 500_000;
const MIN_CLAIM_AMOUNT = 100;

// Internal mutation to handle database operations
export const convertTESTVBMSInternal = internalMutation({
  args: {
    address: v.string(),
    fid: v.number(), // 🔒 Required for FID verification
    amount: v.optional(v.number()),
    nonce: v.string(), // 🔒 Store for on-chain verification (anti double-spend)
  },
  handler: async (ctx, { address, fid, amount, nonce }): Promise<{ claimAmount: number }> => {
    // 📊 Log internal conversion details
    console.log(`[VBMS Internal] Processing conversion:`, {
      address,
      fid,
      requestedAmount: amount,
      maxAllowed: MAX_CLAIM_AMOUNT,
      minRequired: MIN_CLAIM_AMOUNT,
    });

    // 🚫 BLACKLIST CHECK - Block exploiters from claiming
    if (isBlacklisted(address)) {
      const info = getBlacklistInfo(address);
      console.log(`🚫 [BLACKLIST] Blocked claim attempt from exploiter: ${address} (${info?.username})`);
      throw new Error(`🚫 Address blacklisted: You exploited ${info?.amountStolen?.toLocaleString()} VBMS in December 2025. Claims permanently disabled.`);
    }

    const profile = await getProfile(ctx, address);

    // 📊 Log profile state
    console.log(`[VBMS Internal] Profile state:`, {
      coins: profile.coins || 0,
      farcasterFid: profile.farcasterFid,
      profileFid: profile.fid,
      lastClaimTimestamp: profile.lastClaimTimestamp,
      pendingConversion: profile.pendingConversion || 0,
    });

    // 🔒 SECURITY: Verify FID matches the profile
    // This prevents direct API calls with fake/stolen FIDs
    // Support both old `fid` (string) and new `farcasterFid` (number) fields
    const profileFid = profile.farcasterFid || (profile.fid ? Number(profile.fid) : null);
    if (!profileFid || profileFid !== fid) {
      console.log(`🚫 [SECURITY] FID mismatch! Provided: ${fid}, Profile FID: ${profileFid}, Address: ${address}`);
      throw new Error("🔒 FID verification failed. Your Farcaster account does not match this wallet.");
    }

    console.log(`✅ [SECURITY] FID verified: ${fid} for address ${address}`);

    // ⏰ COOLDOWN CHECK - 3 minutes between conversions
    const lastConversion = profile.lastClaimTimestamp || 0;
    const timeSinceLastConversion = Date.now() - lastConversion;
    if (lastConversion > 0 && timeSinceLastConversion < CONVERSION_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((CONVERSION_COOLDOWN_MS - timeSinceLastConversion) / 1000);
      throw new Error(`⏰ Cooldown active. Wait ${remainingSeconds} seconds before converting again.`);
    }

    const testVBMSBalance = profile.coins || 0;

    if (testVBMSBalance < MIN_CLAIM_AMOUNT) {
      throw new Error(`Minimum ${MIN_CLAIM_AMOUNT} TESTVBMS required to convert. You have: ${testVBMSBalance}`);
    }

    // Use provided amount or default to max balance
    let claimAmount: number;
    if (amount !== undefined) {
      // Validate user-provided amount
      if (amount < MIN_CLAIM_AMOUNT) {
        throw new Error(`Minimum ${MIN_CLAIM_AMOUNT} TESTVBMS required to convert.`);
      }
      if (amount > testVBMSBalance) {
        throw new Error(`Insufficient balance. You have ${testVBMSBalance} TESTVBMS but tried to convert ${amount}.`);
      }
      claimAmount = Math.min(amount, MAX_CLAIM_AMOUNT);
    } else {
      // Default: convert all up to max
      claimAmount = Math.min(testVBMSBalance, MAX_CLAIM_AMOUNT);
    }

    const remainingBalance = testVBMSBalance - claimAmount;

    if (claimAmount < MIN_CLAIM_AMOUNT) {
      throw new Error(`Minimum ${MIN_CLAIM_AMOUNT} TESTVBMS required to convert. You have: ${testVBMSBalance}`);
    }

    // 🔒 SECURITY FIX: Deduct claim amount IMMEDIATELY to prevent multiple signature generation exploit
    // Keep remaining balance if user has more than max claim amount
    // Store nonce for on-chain verification during recovery (anti double-spend)
    await ctx.db.patch(profile._id, {
      coins: remainingBalance, // Keep any amount over 100k
      pendingConversion: claimAmount, // Track pending conversion for recovery if needed
      pendingConversionTimestamp: Date.now(),
      pendingNonce: nonce, // 🔒 Store nonce to verify on-chain before allowing recovery
    });

    // 🔒 AUDIT LOG - Track TESTVBMS → VBMS conversion initiation
    await createAuditLog(
      ctx,
      address,
      "convert",
      claimAmount,
      testVBMSBalance,
      remainingBalance,
      "convertTESTVBMStoVBMS",
      undefined,
      { reason: `TESTVBMS to VBMS conversion initiated (max: ${MAX_CLAIM_AMOUNT})` }
    );

    // Track analytics
    await ctx.db.insert("claimAnalytics", {
      playerAddress: address.toLowerCase(),
      choice: "immediate",
      amount: claimAmount,
      inboxTotal: profile.coinsInbox || 0,
      bonusAvailable: false,
      timestamp: Date.now(),
    });

    console.log(`🔒 [SECURITY] ${address} converting ${claimAmount} TESTVBMS (remaining: ${remainingBalance}, cooldown: 3min)`);

    return { claimAmount };
  },
});

/**
 * Record TESTVBMS → VBMS conversion (after blockchain confirmation)
 * Clears pendingConversion and updates claimedTokens
 */
export const recordTESTVBMSConversion = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
    txHash: v.string(),
  },
  handler: async (ctx, { address, amount, txHash }) => {
    // 🔒 SECURITY: Check if this txHash was already recorded (prevent double recording)
    // 🚀 BANDWIDTH FIX: Use index instead of .filter()
    const existingClaim = await ctx.db
      .query("claimHistory")
      .withIndex("by_txHash", (q) => q.eq("txHash", txHash))
      .first();

    if (existingClaim) {
      console.log(`⚠️ [SECURITY] Duplicate txHash rejected: ${txHash} for ${address}`);
      throw new Error("Transaction already recorded");
    }

    const profile = await getProfile(ctx, address);

    // Update profile - clear pending conversion, update claimed tokens
    // NOTE: Do NOT touch coins here - they were already deducted in convertTESTVBMSInternal
    await ctx.db.patch(profile._id, {
      // coins is NOT touched here - already correctly set in convertTESTVBMSInternal
      pendingConversion: 0, // Clear pending
      pendingConversionTimestamp: undefined,
      pendingNonce: undefined, // 🔒 Clear nonce after successful claim
      claimedTokens: (profile.claimedTokens || 0) + amount,
      lastClaimTimestamp: Date.now(),
    });

    // Save to claim history with txHash as unique identifier
    await ctx.db.insert("claimHistory", {
      playerAddress: address.toLowerCase(),
      amount,
      txHash,
      timestamp: Date.now(),
      type: "testvbms_conversion" as any,
    });

    // 🔒 AUDIT LOG - Track blockchain claim confirmation
    await createAuditLog(
      ctx,
      address,
      "claim",
      amount,
      profile.pendingConversion || amount,
      0,
      "recordTESTVBMSConversion",
      txHash,
      { txHash, reason: "VBMS claimed on blockchain" }
    );

    // 📊 LOG TRANSACTION - Track in transaction history
    await logTransaction(ctx, {
      address,
      type: 'convert',
      amount,
      source: 'blockchain',
      description: `Converted ${amount.toLocaleString()} TESTVBMS → VBMS`,
      balanceBefore: profile.coins || 0,
      balanceAfter: 0,
      txHash,
    });

    console.log(`✅ ${address} converted ${amount} TESTVBMS → VBMS (tx: ${txHash})`);

    return {
      success: true,
      newCoinsBalance: 0,
      newClaimedTotal: (profile.claimedTokens || 0) + amount,
    };
  },
});

/**
 * Recover failed TESTVBMS conversion
 * 🔒 SECURITY: Now verifies on-chain that nonce was NOT used before allowing recovery
 * This prevents double-spend attacks where attacker claims on-chain then recovers coins
 */
export const recoverFailedConversion = action({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }): Promise<{
    success: boolean;
    recoveredAmount: number;
    newCoinsBalance: number;
  }> => {
    // First, get profile info via query to check pending state
    const profileInfo = await ctx.runQuery(internal.vbmsClaim.getRecoveryInfo, { address });

    if (profileInfo.pendingAmount === 0) {
      throw new Error("No pending conversion to recover");
    }

    // Check time constraint (2 minutes)
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    if (profileInfo.pendingTimestamp > twoMinutesAgo) {
      const waitSeconds = Math.ceil((profileInfo.pendingTimestamp - twoMinutesAgo) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before recovering. This prevents abuse.`);
    }

    // 🔒 CRITICAL SECURITY CHECK: Verify nonce was NOT used on-chain
    if (profileInfo.pendingNonce) {
      const nonceUsedOnChain = await ctx.runAction(internal.vbmsClaim.checkNonceUsedOnChain, {
        nonce: profileInfo.pendingNonce
      });

      if (nonceUsedOnChain) {
        // 🚨 DOUBLE-SPEND ATTEMPT DETECTED!
        console.error(`🚨 [SECURITY] DOUBLE-SPEND BLOCKED! Address ${address} tried to recover after claiming on-chain. Nonce: ${profileInfo.pendingNonce}`);

        // Clear the pending state but DON'T restore coins (they already got VBMS)
        await ctx.runMutation(internal.vbmsClaim.clearPendingWithoutRestore, { address });

        throw new Error("🚫 Recovery blocked: This conversion was already claimed on the blockchain. Your VBMS tokens are in your wallet.");
      }
    }

    // Nonce was NOT used on-chain - safe to restore coins
    const result = await ctx.runMutation(internal.vbmsClaim.executeRecovery, {
      address,
      amount: profileInfo.pendingAmount,
      currentCoins: profileInfo.currentCoins,
    });

    console.log(`🔄 ${address} recovered ${profileInfo.pendingAmount} TESTVBMS from failed conversion (on-chain verified)`);

    return result;
  },
});

// Internal query to get recovery info
export const getRecoveryInfo = internalQuery({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const profile = await getProfile(ctx, address);
    return {
      pendingAmount: profile.pendingConversion || 0,
      pendingTimestamp: profile.pendingConversionTimestamp || 0,
      pendingNonce: profile.pendingNonce || null,
      currentCoins: profile.coins || 0,
    };
  },
});

// Public action to get pending conversion info (for UI)
export const getPendingConversionInfo = action({
  args: { address: v.string() },
  handler: async (ctx, { address }): Promise<{ amount: number; timestamp: number; canRecover: boolean }> => {
    const info = await ctx.runQuery(internal.vbmsClaim.getRecoveryInfo, { address });

    if (info.pendingAmount === 0) {
      return { amount: 0, timestamp: 0, canRecover: false };
    }

    // Can recover after 2 minutes
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const canRecover = info.pendingTimestamp <= twoMinutesAgo;

    return {
      amount: info.pendingAmount,
      timestamp: info.pendingTimestamp,
      canRecover,
    };
  },
});

// Internal mutation to execute the actual recovery
export const executeRecovery = internalMutation({
  args: {
    address: v.string(),
    amount: v.number(),
    currentCoins: v.number(),
  },
  handler: async (ctx, { address, amount, currentCoins }) => {
    const profile = await getProfile(ctx, address);

    const newBalance = currentCoins + amount;

    await ctx.db.patch(profile._id, {
      coins: newBalance,
      pendingConversion: 0,
      pendingConversionTimestamp: undefined,
      pendingNonce: undefined,
    });

    await createAuditLog(
      ctx,
      address,
      "recover",
      amount,
      0,
      newBalance,
      "recoverFailedConversion",
      undefined,
      { reason: "Recovered failed TESTVBMS conversion (on-chain verified)" }
    );

    return {
      success: true,
      recoveredAmount: amount,
      newCoinsBalance: newBalance,
    };
  },
});

// Internal mutation to clear pending without restoring (for blocked double-spend attempts)
export const clearPendingWithoutRestore = internalMutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const profile = await getProfile(ctx, address);

    await ctx.db.patch(profile._id, {
      pendingConversion: 0,
      pendingConversionTimestamp: undefined,
      pendingNonce: undefined,
    });

    await createAuditLog(
      ctx,
      address,
      "recover", // Using "recover" type - actual blocking logged in reason
      profile.pendingConversion || 0,
      0,
      profile.coins || 0,
      "clearPendingWithoutRestore",
      undefined,
      { reason: "🚨 DOUBLE-SPEND BLOCKED - nonce already used on-chain, coins NOT restored" }
    );
  },
});

/**
 * 🚨 INTERNAL: Restore coins when signature generation fails
 * Called automatically by convertTESTVBMStoVBMS if signClaimMessage throws
 */
export const restoreCoinsOnSignFailure = internalMutation({
  args: {
    address: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, { address, amount }) => {
    const profile = await getProfile(ctx, address);

    // Restore coins and clear pending (including nonce)
    await ctx.db.patch(profile._id, {
      coins: (profile.coins || 0) + amount,
      pendingConversion: 0,
      pendingConversionTimestamp: undefined,
      pendingNonce: undefined, // 🔒 Clear nonce
    });

    // Audit log
    await createAuditLog(
      ctx,
      address,
      "recover",
      amount,
      0,
      (profile.coins || 0) + amount,
      "restoreCoinsOnSignFailure",
      undefined,
      { reason: "Signature generation failed - coins auto-restored" }
    );

    console.log(`🔄 [AUTO-RESTORE] ${address} - Restored ${amount} coins after signature failure`);
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
