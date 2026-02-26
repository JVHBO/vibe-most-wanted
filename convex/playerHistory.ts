/**
 * PLAYER FULL HISTORY
 *
 * One-stop admin query to see everything about a player:
 * - All coins earned (missions, battles, roulette)
 * - All withdrawals (on-chain claims)
 * - Roulette spin history
 * - Mission claim history
 * - Multi-wallet detection
 *
 * Automatically resolves linked wallets to primary.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";

function formatAuditLabel(log: any): string {
  const type = log.type as string;
  const source = log.source as string;
  const meta = log.metadata || {};

  if (type === "earn") {
    if (meta.missionType) return `Mission: ${meta.missionType} (+${log.amount})`;
    if (source === "roulette_small_prize" || source === "roulette_claim") return `Roulette spin (+${log.amount})`;
    if (source === "awardPvE") return `PvE battle win (+${log.amount})`;
    if (source === "awardPvP") return `PvP battle win (+${log.amount})`;
    if (source === "claimMission") return `Mission claimed (+${log.amount})`;
    if (source === "recover") return `Balance recovered (+${log.amount})`;
    return `Earned: ${source} (+${log.amount})`;
  }
  if (type === "spend") return `Spent: ${source} (-${Math.abs(log.amount)})`;
  if (type === "convert") return `Convert to VBMS: ${source} (${log.amount} TESTVBMS)`;
  if (type === "claim") return `On-chain claim: ${source} (${log.amount} VBMS)`;
  if (type === "recover") return `Recovered: ${meta.reason || source} (+${log.amount})`;
  return `${type}: ${source} (${log.amount})`;
}

/**
 * Full player history in one query.
 * Pass any wallet address (primary or linked) - it always resolves to the primary profile.
 */
export const getPlayerFullHistory = query({
  args: {
    playerAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { playerAddress, limit = 200 }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    // Resolve linked wallet to primary
    const link = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();
    const effectiveAddress = link?.primaryAddress || normalizedAddress;
    const isLinkedWallet = !!link;

    // 1. All coin transactions (missions, rewards, conversions)
    const auditLogs = await ctx.db
      .query("coinAuditLog")
      .withIndex("by_player", (q) => q.eq("playerAddress", effectiveAddress))
      .order("desc")
      .take(limit);

    // 2. All missions (claimed and unclaimed)
    const missions = await ctx.db
      .query("personalMissions")
      .withIndex("by_player_date", (q) => q.eq("playerAddress", effectiveAddress))
      .order("desc")
      .take(100);

    // 3. Roulette spin history
    const rouletteSpins = await ctx.db
      .query("rouletteSpins")
      .withIndex("by_address_date", (q) => q.eq("address", effectiveAddress))
      .order("desc")
      .take(30);

    // 4. On-chain VBMS withdrawals (claimHistory)
    const withdrawals = await ctx.db
      .query("claimHistory")
      .withIndex("by_player", (q) => q.eq("playerAddress", effectiveAddress))
      .order("desc")
      .take(50);

    // 5. Daily free pack claims
    const dailyFreeClaim = await ctx.db
      .query("dailyFreeClaims")
      .withIndex("by_address", (q) => q.eq("address", effectiveAddress))
      .first();

    // 6. Get profile for current balance
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", effectiveAddress))
      .first();

    // 7. Linked wallets (to spot multi-wallet patterns)
    const linkedWallets = await ctx.db
      .query("addressLinks")
      .withIndex("by_primary", (q) => q.eq("primaryAddress", effectiveAddress))
      .take(20);

    // ---- Summarize ----
    const totalEarned = auditLogs
      .filter(l => l.type === "earn" || l.type === "recover")
      .reduce((sum, l) => sum + l.amount, 0);
    const totalSpent = auditLogs
      .filter(l => l.type === "spend")
      .reduce((sum, l) => sum + Math.abs(l.amount), 0);
    const totalConverted = auditLogs
      .filter(l => l.type === "convert")
      .reduce((sum, l) => sum + l.amount, 0);

    const totalWithdrawnOnChain = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const rouletteTotal = rouletteSpins
      .filter(s => s.claimed)
      .reduce((sum, s) => sum + s.prizeAmount, 0);

    // Breakdown by source
    const earnsBySource: Record<string, { count: number; total: number }> = {};
    auditLogs.filter(l => l.type === "earn").forEach(l => {
      const key = (l.metadata as any)?.missionType || l.source;
      if (!earnsBySource[key]) earnsBySource[key] = { count: 0, total: 0 };
      earnsBySource[key].count++;
      earnsBySource[key].total += l.amount;
    });

    // Mission breakdown
    const missionsByType: Record<string, { claimed: number; unclaimed: number; totalEarned: number }> = {};
    missions.forEach(m => {
      if (!missionsByType[m.missionType]) {
        missionsByType[m.missionType] = { claimed: 0, unclaimed: 0, totalEarned: 0 };
      }
      if (m.claimed) {
        missionsByType[m.missionType].claimed++;
        missionsByType[m.missionType].totalEarned += m.reward || 0;
      } else {
        missionsByType[m.missionType].unclaimed++;
      }
    });

    // Format transactions for display
    const transactions = auditLogs.map(l => ({
      id: l._id,
      type: l.type,
      amount: l.amount,
      source: (l.metadata as any)?.missionType || l.source,
      balanceBefore: l.balanceBefore,
      balanceAfter: l.balanceAfter,
      date: new Date(l.timestamp).toISOString(),
      timestamp: l.timestamp,
      txHash: (l.metadata as any)?.txHash,
      label: formatAuditLabel(l),
    }));

    return {
      // Identity
      address: effectiveAddress,
      connectedAs: normalizedAddress,
      isLinkedWallet,
      linkedWallets: linkedWallets.map(l => l.address),
      username: profile?.username || null,
      fid: profile?.farcasterFid || null,
      accountCreated: profile ? new Date(profile._creationTime).toISOString() : null,

      // Current balances
      currentBalance: {
        testvbms: profile?.coins || 0,
        inbox: profile?.coinsInbox || 0,
        claimedOnChain: profile?.claimedTokens || 0,
      },

      // Summary totals
      summary: {
        totalEarned,
        totalSpent,
        totalConverted,
        totalWithdrawnOnChain,
        rouletteWinnings: rouletteTotal,
        transactionCount: auditLogs.length,
        missionsClaimed: missions.filter(m => m.claimed).length,
        missionsUnclaimed: missions.filter(m => !m.claimed).length,
        rouletteSpinsTotal: rouletteSpins.length,
        rouletteSpinsClaimed: rouletteSpins.filter(s => s.claimed).length,
        dailyFreeClaimsTotal: dailyFreeClaim?.totalClaims || 0,
        lastDailyFreeAt: dailyFreeClaim
          ? new Date(dailyFreeClaim.claimedAt).toISOString()
          : null,
      },

      // Breakdown by how coins were earned
      earnsBySource,
      missionsByType,

      // Raw transaction list (most recent first)
      transactions,

      // Roulette history
      roulette: rouletteSpins.map(s => ({
        date: s.date,
        amount: s.prizeAmount,
        claimed: s.claimed,
        isPaid: (s as any).isPaidSpin || false,
        claimedAt: s.claimedAt ? new Date(s.claimedAt).toISOString() : null,
        txHash: (s as any).txHash || (s as any).paidTxHash || null,
        spunAt: new Date(s.spunAt || 0).toISOString(),
      })),

      // On-chain withdrawal history
      onChainWithdrawals: withdrawals.map(w => ({
        amount: w.amount,
        txHash: w.txHash,
        type: w.type,
        date: new Date(w.timestamp).toISOString(),
        timestamp: w.timestamp,
      })),

      // First and last activity
      firstActivity: transactions.length > 0
        ? transactions[transactions.length - 1].date
        : null,
      lastActivity: transactions.length > 0
        ? transactions[0].date
        : null,
    };
  },
});
