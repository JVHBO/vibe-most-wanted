/**
 * COIN AUDIT LOG SYSTEM
 *
 * Security audit logging for all TESTVBMS transactions.
 * Added after exploit investigation on 2025-12-12.
 *
 * Tracks:
 * - All coin earnings (missions, rewards, bonuses)
 * - All coin spending (entry fees, purchases)
 * - All TESTVBMS → VBMS conversions
 * - All blockchain claims
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ========== INTERNAL: Log Transaction ==========

export const logTransaction = internalMutation({
  args: {
    playerAddress: v.string(),
    type: v.union(
      v.literal("earn"),
      v.literal("spend"),
      v.literal("convert"),
      v.literal("claim")
    ),
    amount: v.number(),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    source: v.string(),
    sourceId: v.optional(v.string()),
    metadata: v.optional(v.object({
      missionType: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      txHash: v.optional(v.string()),
      nonce: v.optional(v.string()),
      reason: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("coinAuditLog", {
      playerAddress: args.playerAddress.toLowerCase(),
      type: args.type,
      amount: args.amount,
      balanceBefore: args.balanceBefore,
      balanceAfter: args.balanceAfter,
      source: args.source,
      sourceId: args.sourceId,
      metadata: args.metadata,
      timestamp: Date.now(),
    });

    console.log(`🔒 [AUDIT] ${args.type.toUpperCase()} | ${args.playerAddress} | ${args.amount} coins | ${args.source} | balance: ${args.balanceBefore} → ${args.balanceAfter}`);

    return logId;
  },
});

// ========== QUERY: Get Player Audit Trail ==========

export const getPlayerAuditTrail = query({
  args: {
    playerAddress: v.string(),
    limit: v.optional(v.number()),
    type: v.optional(v.union(
      v.literal("earn"),
      v.literal("spend"),
      v.literal("convert"),
      v.literal("claim")
    )),
  },
  handler: async (ctx, { playerAddress, limit = 100, type }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    let queryBuilder = ctx.db
      .query("coinAuditLog")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress));

    const logs = await queryBuilder.order("desc").take(limit);

    // Filter by type if specified
    if (type) {
      return logs.filter(log => log.type === type);
    }

    return logs;
  },
});

// ========== QUERY: Get Player Audit Summary ==========

export const getPlayerAuditSummary = query({
  args: {
    playerAddress: v.string(),
  },
  handler: async (ctx, { playerAddress }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    const logs = await ctx.db
      .query("coinAuditLog")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .collect();

    // Calculate totals
    const totalEarned = logs
      .filter(l => l.type === "earn")
      .reduce((sum, l) => sum + l.amount, 0);

    const totalSpent = logs
      .filter(l => l.type === "spend")
      .reduce((sum, l) => sum + Math.abs(l.amount), 0);

    const totalConverted = logs
      .filter(l => l.type === "convert")
      .reduce((sum, l) => sum + l.amount, 0);

    const totalClaimed = logs
      .filter(l => l.type === "claim")
      .reduce((sum, l) => sum + l.amount, 0);

    // Group by source
    const bySource: Record<string, { count: number; total: number }> = {};
    logs.forEach(log => {
      if (!bySource[log.source]) {
        bySource[log.source] = { count: 0, total: 0 };
      }
      bySource[log.source].count++;
      bySource[log.source].total += log.amount;
    });

    // Find suspicious patterns
    const suspicious: string[] = [];

    // Check for rapid transactions (more than 10 in 1 minute)
    const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < sortedLogs.length - 10; i++) {
      const timeWindow = sortedLogs[i + 10].timestamp - sortedLogs[i].timestamp;
      if (timeWindow < 60000) { // 1 minute
        suspicious.push(`Rapid transactions: ${11} transactions in ${(timeWindow / 1000).toFixed(1)}s at ${new Date(sortedLogs[i].timestamp).toISOString()}`);
        break;
      }
    }

    // Check for duplicate sources in short time
    const sourceTimestamps: Record<string, number[]> = {};
    logs.forEach(log => {
      if (!sourceTimestamps[log.source]) {
        sourceTimestamps[log.source] = [];
      }
      sourceTimestamps[log.source].push(log.timestamp);
    });

    Object.entries(sourceTimestamps).forEach(([source, timestamps]) => {
      if (timestamps.length > 5) {
        const sortedTs = [...timestamps].sort((a, b) => a - b);
        const firstFiveSpan = sortedTs[4] - sortedTs[0];
        if (firstFiveSpan < 30000) { // 5 same-source transactions in 30 seconds
          suspicious.push(`Suspicious spam: ${source} called ${timestamps.length} times, first 5 in ${(firstFiveSpan / 1000).toFixed(1)}s`);
        }
      }
    });

    return {
      totalTransactions: logs.length,
      totalEarned,
      totalSpent,
      totalConverted,
      totalClaimed,
      netBalance: totalEarned - totalSpent,
      bySource,
      suspicious,
      firstTransaction: logs.length > 0 ? new Date(Math.min(...logs.map(l => l.timestamp))).toISOString() : null,
      lastTransaction: logs.length > 0 ? new Date(Math.max(...logs.map(l => l.timestamp))).toISOString() : null,
    };
  },
});

// ========== QUERY: Get Recent Suspicious Activity ==========

export const getRecentSuspiciousActivity = query({
  args: {
    hours: v.optional(v.number()),
    minAmount: v.optional(v.number()),
  },
  handler: async (ctx, { hours = 24, minAmount = 5000 }) => {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);

    const logs = await ctx.db
      .query("coinAuditLog")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), cutoff))
      .collect();

    // Group by player
    const byPlayer: Record<string, typeof logs> = {};
    logs.forEach(log => {
      if (!byPlayer[log.playerAddress]) {
        byPlayer[log.playerAddress] = [];
      }
      byPlayer[log.playerAddress].push(log);
    });

    // Find suspicious players
    const suspicious: Array<{
      address: string;
      totalEarned: number;
      transactionCount: number;
      timeSpan: number;
      reasons: string[];
    }> = [];

    Object.entries(byPlayer).forEach(([address, playerLogs]) => {
      const totalEarned = playerLogs
        .filter(l => l.type === "earn")
        .reduce((sum, l) => sum + l.amount, 0);

      if (totalEarned >= minAmount) {
        const timestamps = playerLogs.map(l => l.timestamp);
        const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
        const reasons: string[] = [];

        if (totalEarned >= 5000 && timeSpan < 600000) { // 5000+ in 10 mins
          reasons.push(`High earnings in short time: ${totalEarned} TESTVBMS in ${(timeSpan / 60000).toFixed(1)} min`);
        }

        if (playerLogs.length > 20 && timeSpan < 300000) { // 20+ transactions in 5 mins
          reasons.push(`High transaction volume: ${playerLogs.length} transactions in ${(timeSpan / 60000).toFixed(1)} min`);
        }

        if (reasons.length > 0) {
          suspicious.push({
            address,
            totalEarned,
            transactionCount: playerLogs.length,
            timeSpan,
            reasons,
          });
        }
      }
    });

    return suspicious.sort((a, b) => b.totalEarned - a.totalEarned);
  },
});

// ========== QUERY: Get All Audit Logs (Admin) ==========

export const getAllAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 100, offset = 0 }) => {
    const logs = await ctx.db
      .query("coinAuditLog")
      .order("desc")
      .collect();

    return {
      total: logs.length,
      logs: logs.slice(offset, offset + limit),
    };
  },
});

// ========== HELPER: Create audit log entry (for use in other modules) ==========
// This is exported so other modules can call it directly within their mutations

export async function createAuditLog(
  ctx: any,
  playerAddress: string,
  type: "earn" | "spend" | "convert" | "claim",
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  source: string,
  sourceId?: string,
  metadata?: {
    missionType?: string;
    difficulty?: string;
    txHash?: string;
    nonce?: string;
    reason?: string;
  }
) {
  await ctx.db.insert("coinAuditLog", {
    playerAddress: playerAddress.toLowerCase(),
    type,
    amount,
    balanceBefore,
    balanceAfter,
    source,
    sourceId,
    metadata,
    timestamp: Date.now(),
  });

  console.log(`🔒 [AUDIT] ${type.toUpperCase()} | ${playerAddress} | ${amount} coins | ${source} | balance: ${balanceBefore} → ${balanceAfter}`);
}
