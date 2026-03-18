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
import { ConvexError } from "convex/values";
import { mutation, query, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { ethers } from "ethers";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { createAuditLog } from "./coinAudit";
import { isBlacklisted, getBlacklistInfo } from "./blacklist";
import { logTransaction } from "./coinsInbox";

// ========== HELPER: Get Profile (supports multi-wallet via addressLinks) ==========

async function getProfile(ctx: any, address: string) {
  const normalizedAddress = address.toLowerCase();

  // Check addressLinks first (multi-wallet support, e.g. Base App wallet)
  const addressLink = await ctx.db
    .query("addressLinks")
    .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
    .first();

  let profile;
  if (addressLink) {
    profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", addressLink.primaryAddress))
      .first();
  } else {
    profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
      .first();
  }

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

    const privateKey = process.env.VBMS_SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('VBMS_SIGNER_PRIVATE_KEY not configured in Convex environment');
    }

    const wallet = new ethers.Wallet(privateKey);
    const amountInWei = ethers.parseEther(amount.toString());
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'bytes32'],
      [address, amountInWei, nonce]
    );
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    console.log(`[VBMS Signature] Address: ${address}, Amount: ${amount} VBMS signed`);
    return signature;
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

    // 📊 Log transaction
    await ctx.db.insert("coinTransactions", {
      address: address.toLowerCase(),
      amount,
      type: "earn",
      source: "pve_match",
      description: "PvE match reward",
      timestamp: Date.now(),
      balanceBefore: profile.coins || 0,
      balanceAfter: newBalance,
    });

    // 🔒 Security audit log
    await createAuditLog(
      ctx,
      address,
      "earn",
      amount,
      profile.coins || 0,
      newBalance,
      "sendToInbox",
      matchId,
      { reason: "PvE match reward added to balance" }
    );

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
    // 🚫 BLACKLIST CHECK (hardcoded + dynamic DB)
    if (isBlacklisted(address)) {
      throw new Error("[CLAIM_BLACKLISTED]");
    }
    const lower = address.toLowerCase();
    const dynBan = await ctx.db
      .query("dynamicBlacklist")
      .withIndex("by_address", (q: any) => q.eq("address", lower))
      .first();
    if (dynBan) {
      throw new Error("[CLAIM_BLACKLISTED]");
    }

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

    // Calculate available balance (coins minus any pending conversion)
    const pendingAmount = profile.pendingConversion || 0;
    const availableCoins = Math.max(0, (profile.coins || 0) - pendingAmount);

    return {
      // Virtual balance (in-app spending) - TESTVBMS
      coins: profile.coins || 0,
      availableCoins, // Coins available (excluding pending conversion)
      lifetimeEarned: profile.lifetimeEarned || 0,
      lifetimeSpent: profile.lifetimeSpent || 0,

      // Real VBMS token (inbox system)
      inbox: profile.coinsInbox || 0,
      claimedTokens: profile.claimedTokens || 0,
      poolDebt: profile.poolDebt || 0,
      lastClaimTimestamp: profile.lastClaimTimestamp || 0,

      // Pending conversion info
      pendingConversion: pendingAmount,
      pendingConversionTimestamp: profile.pendingConversionTimestamp || null,
      hasPendingConversion: pendingAmount > 0,

      // Calculate claimable
      claimableBalance: Math.max(0, (profile.coinsInbox || 0) - (profile.poolDebt || 0)),

      // Daily convert limit
      dailyConvertLimit: DAILY_CONVERT_LIMIT,
      dailyConvertRemaining: (() => {
        const today = new Date().toISOString().slice(0, 10);
        const used = profile.dailyConvertDate === today ? (profile.dailyConvertedVBMS || 0) : 0;
        return Math.max(0, DAILY_CONVERT_LIMIT - used);
      })(),
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

    // 🚀 BANDWIDTH FIX: Use .take(limit) instead of .collect() to avoid loading entire tables
    // Get claim history (blockchain claims)
    const claimHistory = await ctx.db
      .query("claimHistory")
      .withIndex("by_player", (q: any) => q.eq("playerAddress", normalizedAddress))
      .order("desc")
      .take(limit);

    // Get audit log (all TESTVBMS transactions)
    const auditLog = await ctx.db
      .query("coinAuditLog")
      .withIndex("by_player", (q: any) => q.eq("playerAddress", normalizedAddress))
      .order("desc")
      .take(limit);

    // Get claim analytics
    const analytics = await ctx.db
      .query("claimAnalytics")
      .withIndex("by_player", (q: any) => q.eq("playerAddress", normalizedAddress))
      .order("desc")
      .take(limit);

    // Get coin transactions (pack purchases, shop activity)
    const coinTxs = await ctx.db
      .query("coinTransactions")
      .withIndex("by_address", (q: any) => q.eq("address", normalizedAddress))
      .order("desc")
      .take(limit);

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
      ...coinTxs.map(t => ({
        source: "coinTransactions",
        type: t.type,
        amount: t.amount,
        timestamp: t.timestamp,
        description: t.description,
        txHash: t.txHash,
        sourceFunction: t.source,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
      })),
    ].sort((a, b) => b.timestamp - a.timestamp);

    return {
      total: allTransactions.length,
      transactions: allTransactions.slice(0, limit),
      summary: {
        claimHistoryCount: claimHistory.length,
        auditLogCount: auditLog.length,
        analyticsCount: analytics.length,
        coinTransactionsCount: coinTxs.length,
      },
    };
  },
});

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

    // 📊 Log transaction
    await ctx.db.insert("coinTransactions", {
      address: address.toLowerCase(),
      amount: inboxAmount,
      type: "earn",
      source: "inbox_claim",
      description: "Claimed inbox as TESTVBMS",
      timestamp: Date.now(),
      balanceBefore: currentCoins,
      balanceAfter: newCoins,
    });

    // 🔒 Security audit log
    await createAuditLog(
      ctx,
      address,
      "earn",
      inboxAmount,
      currentCoins,
      newCoins,
      "claimInboxAsTESTVBMS",
      undefined,
      { reason: "Inbox claimed as TESTVBMS (no blockchain)" }
    );

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
// 🔒 SECURITY FIX (2026-01-01): Changed from mutation to internalMutation
export const sendPveRewardToInbox = internalMutation({
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
    // 📊 Log transaction for history
    await ctx.db.insert("coinTransactions", {
      address: address.toLowerCase(),
      type: "earn",
      amount,
      source: "pve",
      description: `PvE victory (${difficulty || 'unknown'})`,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      timestamp: Date.now(),
    });

    // 🔒 Security audit log
    await createAuditLog(
      ctx,
      address,
      "earn",
      amount,
      currentBalance,
      newBalance,
      "sendPveRewardToInbox",
      undefined,
      { difficulty: difficulty || undefined, reason: "PvE poker victory reward" }
    );

    // Track analytics
    await ctx.db.insert("claimAnalytics", {
      playerAddress: address.toLowerCase(),
      choice: "pve",
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
// 🔒 SECURITY FIX (2026-01-01): Changed from mutation to internalMutation
export const sendPvpRewardToInbox = internalMutation({
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
    // 📊 Log transaction for history
    await ctx.db.insert("coinTransactions", {
      address: address.toLowerCase(),
      type: "earn",
      amount,
      source: "pvp",
      description: "PvP victory reward",
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      timestamp: Date.now(),
    });

      // 🔒 Security audit log
      await createAuditLog(
        ctx,
        address,
        "earn",
        amount,
        currentBalance,
        newBalance,
        "sendPvpRewardToInbox",
        undefined,
        { reason: "PvP poker victory reward" }
      );

      // Track analytics
      console.log(`[sendPvpRewardToInbox] Inserting analytics...`);
      await ctx.db.insert("claimAnalytics", {
        playerAddress: address.toLowerCase(),
        choice: "pvp",
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
      throw new Error("[CLAIM_FID_REQUIRED]");
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
      // Signing failed - restore coins immediately (nonce was never sent to chain)
      console.error(`[VBMS] ❌ Signature failed for ${address}, restoring ${result.claimAmount} coins:`, signError);
      try {
        await ctx.runMutation(internal.vbmsClaim.restoreOnSignFailure, { address, amount: result.claimAmount });
      } catch (restoreError: any) {
        console.error(`[VBMS] ❌ Failed to restore coins for ${address}:`, restoreError);
      }
      // Use ConvexError so actual error message is visible to client (for debugging)
      throw new ConvexError(`[CLAIM_SIGNATURE_FAILED] ${signError.message}`);
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
// Claim limits
const MAX_CLAIM_AMOUNT = 200_000;   // Per conversion max
const DAILY_CONVERT_LIMIT = 200_000; // Per day total max
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
      throw new Error("[CLAIM_BLACKLISTED]");
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
    if (profileFid && profileFid !== fid) {
      // Profile has a FID but it doesn't match - block
      console.log(`🚫 [SECURITY] FID mismatch! Provided: ${fid}, Profile FID: ${profileFid}, Address: ${address}`);
      throw new Error("[CLAIM_FID_MISMATCH]");
    }

    // Auto-link FID if profile has none (e.g. created via wallet connect before Farcaster)
    if (!profileFid) {
      console.log(`🔗 [AUTO-LINK] Setting farcasterFid=${fid} on profile ${address} (was null)`);
      await ctx.db.patch(profile._id, { farcasterFid: fid });
    }

    console.log(`✅ [SECURITY] FID verified: ${fid} for address ${address}`);

    // ⏰ COOLDOWN CHECK - 3 minutes between conversions (ATTEMPTS, not just successes)
    // 🔒 SECURITY: Use lastConversionAttempt to track ALL attempts, not just successful claims
    const lastAttempt = profile.lastConversionAttempt || profile.lastClaimTimestamp || 0;
    const timeSinceLastAttempt = Date.now() - lastAttempt;
    if (lastAttempt > 0 && timeSinceLastAttempt < CONVERSION_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((CONVERSION_COOLDOWN_MS - timeSinceLastAttempt) / 1000);
      throw new Error(`[CLAIM_COOLDOWN]${remainingSeconds}`);
    }

    // 🔒 DAILY LIMIT CHECK - 200k max per day
    const today = new Date().toISOString().slice(0, 10);
    const dailyConverted = profile.dailyConvertDate === today ? (profile.dailyConvertedVBMS || 0) : 0;
    const dailyRemaining = DAILY_CONVERT_LIMIT - dailyConverted;
    if (dailyRemaining <= 0) {
      throw new Error(`[CLAIM_DAILY_LIMIT]`);
    }

    const testVBMSBalance = profile.coins || 0;

    if (testVBMSBalance < MIN_CLAIM_AMOUNT) {
      throw new Error(`[CLAIM_MINIMUM_REQUIRED]${MIN_CLAIM_AMOUNT}|${testVBMSBalance}`);
    }

    // Use provided amount or default to max balance
    let claimAmount: number;
    if (amount !== undefined) {
      // Validate user-provided amount
      if (amount < MIN_CLAIM_AMOUNT) {
        throw new Error(`[CLAIM_MINIMUM_REQUIRED]${MIN_CLAIM_AMOUNT}|${testVBMSBalance}`);
      }
      if (amount > testVBMSBalance) {
        throw new Error(`[CLAIM_INSUFFICIENT_BALANCE]${testVBMSBalance}|${amount}`);
      }
      claimAmount = Math.min(amount, MAX_CLAIM_AMOUNT, dailyRemaining);
    } else {
      // Default: convert all up to max
      claimAmount = Math.min(testVBMSBalance, MAX_CLAIM_AMOUNT, dailyRemaining);
    }

    const remainingBalance = testVBMSBalance - claimAmount;

    if (claimAmount < MIN_CLAIM_AMOUNT) {
      throw new Error(`[CLAIM_MINIMUM_REQUIRED]${MIN_CLAIM_AMOUNT}|${testVBMSBalance}`);
    }

    // 🔒 SECURITY FIX: Deduct claim amount IMMEDIATELY to prevent multiple signature generation exploit
    // Keep remaining balance if user has more than max claim amount
    // Store nonce for on-chain verification during recovery (anti double-spend)
    const now = Date.now();
    await ctx.db.patch(profile._id, {
      coins: remainingBalance,
      pendingConversion: claimAmount,
      pendingConversionTimestamp: now,
      pendingNonce: nonce,
      lastConversionAttempt: now,
      dailyConvertedVBMS: dailyConverted + claimAmount,
      dailyConvertDate: today,
    });

    // 📊 Log pending conversion to transaction history
    await logTransaction(ctx, {
      address,
      type: 'convert',
      amount: -claimAmount,
      source: 'pending_conversion',
      description: `Converting ${claimAmount.toLocaleString()} TESTVBMS → VBMS (pending)`,
      balanceBefore: testVBMSBalance,
      balanceAfter: remainingBalance,
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
      choice: "convert",
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
      throw new Error("[CLAIM_TX_RECORDED]");
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

// Internal mutation to restore coins when signature generation fails
// Safe to do directly since signing failure means the nonce was never exposed to chain
export const restoreOnSignFailure = internalMutation({
  args: { address: v.string(), amount: v.number() },
  handler: async (ctx, { address, amount }) => {
    const profile = await getProfile(ctx, address);
    const newBalance = (profile.coins || 0) + amount;
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
      profile.coins || 0,
      newBalance,
      "restoreOnSignFailure",
      undefined,
      { reason: "Signature failed - coins restored automatically" }
    );
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
    const pve = analytics.filter((a) => a.choice === "pve").length;
    const pvp = analytics.filter((a) => a.choice === "pvp").length;
    const convert = analytics.filter((a) => a.choice === "convert").length;
    const total = analytics.length;

    const avgClaimAmount =
      analytics.reduce((sum, a) => sum + a.amount, 0) / total || 0;

    return {
      totalClaims: total,
      immediateClaimRate: total > 0 ? immediate / total : 0,
      inboxRate: total > 0 ? inbox / total : 0,
      avgClaimAmount,
      immediate,
      inbox,
      pve,
      pvp,
      convert,
    };
  },
});

// ========== QUERY: Check ARB Sign Eligibility ==========
// Called by the /api/arb/sign-validation route before signing
export const checkArbSignEligibility = query({
  args: { address: v.string(), amount: v.number() },
  handler: async (ctx, { address, amount }): Promise<{ eligible: boolean; reason?: string }> => {
    if (isBlacklisted(address)) {
      return { eligible: false, reason: "BLACKLISTED" };
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();
    if (!profile || !profile.fid) {
      return { eligible: false, reason: "NO_PROFILE" };
    }
    const coins = profile.coins ?? 0;
    if (coins < amount) {
      return { eligible: false, reason: `INSUFFICIENT_COINS:${coins}` };
    }
    return { eligible: true };
  },
});

// ========== ACTION: Sign ARB Validation ==========
// Called from client via Convex. Signs directly — no HTTP round-trip.
export const signArbValidation = action({
  args: {
    address: v.string(),
    amount: v.number(),
    nonce: v.string(),
  },
  handler: async (ctx, { address, amount, nonce }): Promise<{ signature: string }> => {
    const MAX_AMOUNT = 12000;
    if (amount < 0 || amount > MAX_AMOUNT) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    // 🚫 BLACKLIST CHECK
    if (isBlacklisted(address)) {
      throw new Error("[CLAIM_BLACKLISTED]");
    }

    // 🔒 PROFILE CHECK: must have a registered account with FID and enough coins
    const profile = await ctx.runQuery(internal.notifications.getProfileByAddress, {
      address: address.toLowerCase(),
    });
    if (!profile || !profile.fid) {
      throw new Error("[NO_PROFILE] Address has no registered account");
    }
    const coins = profile.coins ?? 0;
    if (coins < amount) {
      throw new Error(`[INSUFFICIENT_COINS] Balance ${coins} < requested ${amount}`);
    }

    const privateKey = process.env.VBMS_SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('VBMS_SIGNER_PRIVATE_KEY not configured');
    }

    const wallet = new ethers.Wallet(privateKey);
    const amountInWei = ethers.parseEther(amount.toString());
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'bytes32'],
      [address, amountInWei, nonce]
    );
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    return { signature };
  },
});

// ========== Quest VibeMail VBMS Claim ==========
// Receiver claims VBMS per quest item directly from pool (sender already paid)
// NOTE: cardVotes docs live in VibeFID Convex — amount comes from frontend with server-side cap

const MAX_QUEST_ITEM_REWARD = 1000;

export const claimQuestMailVBMS = action({
  args: {
    messageId: v.id("cardVotes"),
    claimerFid: v.number(),
    claimerAddress: v.string(),
    questIndex: v.number(),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ amount: number; nonce: string; signature: string }> => {
    const { messageId, claimerFid, claimerAddress, questIndex } = args;

    if (!claimerAddress || claimerFid <= 0) throw new Error("Invalid claimer");

    // 🔒 SECURITY: Sender cannot claim their own quest mail
    const message = await ctx.runQuery(internal.cardVotes.getMessageForClaim, { messageId });
    if (!message) throw new Error("Message not found");
    if (message.senderFid === claimerFid) throw new Error("Cannot claim your own sent mail");

    // Amount from frontend (parsed by client from [VQUEST:{...}]), capped server-side
    const amount = Math.min(Math.max(args.amount ?? 200, 1), MAX_QUEST_ITEM_REWARD);

    // Check + record claim atomically via internal mutation (idempotency check inside)
    await ctx.runMutation(internal.cardVotes.recordQuestMailClaim, {
      messageId,
      claimerFid,
      claimerAddress,
      questIndex,
    });

    const nonce = generateNonce();
    const signature = await ctx.runAction(internal.vbmsClaim.signClaimMessage, {
      address: claimerAddress,
      amount,
      nonce,
    });

    return { amount, nonce, signature };
  },
});

// ========== Quest VibeMail RECEIPT Claim ==========
// Claim VBMS reward for receiving a quest VibeMail (baseReward from questData)
// NOTE: amount comes from frontend with server-side cap

export const claimQuestReceiptVBMS = action({
  args: {
    messageId: v.id("cardVotes"),
    claimerAddress: v.string(),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ amount: number; nonce: string; signature: string }> => {
    const { messageId, claimerAddress } = args;

    if (!claimerAddress) throw new Error("Invalid claimer");

    // Amount from frontend, capped server-side
    const amount = Math.min(Math.max(args.amount ?? 100, 1), MAX_QUEST_ITEM_REWARD);

    // Record via vibeMailQuestClaims (idempotency handled server-side)
    await ctx.runMutation(internal.cardVotes.recordReceiptClaim, {
      messageId: String(messageId),
      claimerAddress,
    });

    const nonce = generateNonce();
    const signature = await ctx.runAction(internal.vbmsClaim.signClaimMessage, {
      address: claimerAddress,
      amount,
      nonce,
    });

    return { amount, nonce, signature };
  },
});

// ========== ACTION: Admin Clear All Stuck Pending Conversions ==========
export const adminClearAllPendingConversions = action({
  args: {},
  handler: async (ctx): Promise<{ cleared: number; restored: number; skipped: number }> => {
    const profiles = await ctx.runQuery(internal.vbmsClaim.getPendingConversionProfiles);
    console.log(`[adminClearAll] Found ${profiles.length} profiles with pending conversions`);
    let cleared = 0, restored = 0, skipped = 0;
    for (const profile of profiles) {
      try {
        const nonce = profile.pendingNonce;
        if (nonce) {
          const isUsed = await ctx.runAction(internal.vbmsClaim.checkNonceUsedOnChain, { nonce });
          if (isUsed) {
            await ctx.runMutation(internal.vbmsClaim.clearPendingOnly, { address: profile.address });
            console.log(`[adminClearAll] ${profile.address}: nonce used on-chain, cleared`);
            cleared++;
          } else {
            await ctx.runMutation(internal.vbmsClaim.restoreOnSignFailure, { address: profile.address, amount: profile.pendingConversion });
            console.log(`[adminClearAll] ${profile.address}: restored ${profile.pendingConversion} coins`);
            restored++;
          }
        } else {
          await ctx.runMutation(internal.vbmsClaim.restoreOnSignFailure, { address: profile.address, amount: profile.pendingConversion });
          console.log(`[adminClearAll] ${profile.address}: no nonce, restored ${profile.pendingConversion} coins`);
          restored++;
        }
      } catch (e) {
        console.error(`[adminClearAll] Error processing ${profile.address}:`, e);
        skipped++;
      }
    }
    return { cleared, restored, skipped };
  },
});

export const getPendingConversionProfiles = internalQuery({
  args: {},
  handler: async (ctx): Promise<Array<{ address: string; pendingConversion: number; pendingNonce: string | undefined }>> => {
    const profiles = await ctx.db.query("profiles").collect();
    return profiles
      .filter((p) => (p.pendingConversion || 0) > 0)
      .map((p) => ({ address: p.address, pendingConversion: p.pendingConversion || 0, pendingNonce: p.pendingNonce }));
  },
});

export const clearPendingOnly = internalMutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();
    if (!profile) return;
    await ctx.db.patch(profile._id, { pendingConversion: 0, pendingConversionTimestamp: undefined, pendingNonce: undefined });
  },
});
