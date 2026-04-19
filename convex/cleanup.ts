import { internalMutation } from "./_generated/server";

const BATCH = 500;

// Delete one batch without index (for tables without timestamp index)
async function wipeBatch(ctx: any, tableName: string): Promise<number> {
  const docs = await (ctx.db.query(tableName) as any).take(BATCH);
  for (const doc of docs) await ctx.db.delete(doc._id);
  return docs.length;
}

// Delete one batch using timestamp index (faster, avoids full scan)
async function deleteBatchByTimestamp(ctx: any, tableName: string, cutoffMs: number, field = "timestamp"): Promise<number> {
  const docs = await (ctx.db.query(tableName) as any)
    .withIndex("by_timestamp", (q: any) => q.lt(field, cutoffMs))
    .take(BATCH);
  for (const doc of docs) await ctx.db.delete(doc._id);
  return docs.length;
}

// Delete one batch using _creationTime (no index needed, small batch)
async function deleteBatchByCreation(ctx: any, tableName: string, cutoffMs: number): Promise<number> {
  const docs = await (ctx.db.query(tableName) as any)
    .filter((q: any) => q.lt(q.field("_creationTime"), cutoffMs))
    .take(BATCH);
  for (const doc of docs) await ctx.db.delete(doc._id);
  return docs.length;
}

/** ONE BATCH: wipe accessDebugLogs (call multiple times until 0) */
export const wipeAccessDebugLogsBatch = internalMutation({
  args: {},
  handler: async (ctx) => wipeBatch(ctx, "accessDebugLogs"),
});

/** ONE BATCH: wipe leaderboardCache */
export const wipeLeaderboardCacheBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const a = await wipeBatch(ctx, "leaderboardCache");
    const b = await wipeBatch(ctx, "leaderboardFullCache");
    return { leaderboardCache: a, leaderboardFullCache: b };
  },
});

/** ONE BATCH: delete coinAuditLog > 90 days (uses by_timestamp index) */
export const cleanCoinAuditLogBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return deleteBatchByTimestamp(ctx, "coinAuditLog", cutoff);
  },
});

/** ONE BATCH: delete slotSpins > 30 days */
export const cleanOldSlotSpinsBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return deleteBatchByCreation(ctx, "slotSpins", cutoff);
  },
});

/** ONE BATCH: delete matches > 60 days */
export const cleanOldMatchesBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
    return deleteBatchByCreation(ctx, "matches", cutoff);
  },
});

/** ONE BATCH: delete matches > 30 days */
export const cleanOldMatchesBatch30 = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return deleteBatchByCreation(ctx, "matches", cutoff);
  },
});

/** ONE BATCH: wipe accessAnalytics, accessVisits, accessDebugLogs */
export const wipeAccessTablesBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const a = await wipeBatch(ctx, "accessAnalytics");
    const b = await wipeBatch(ctx, "accessVisits");
    const c = await wipeBatch(ctx, "accessDebugLogs");
    return { accessAnalytics: a, accessVisits: b, accessDebugLogs: c };
  },
});

/** ONE BATCH: delete neynarScoreHistory > 30 days */
export const cleanNeynarHistoryBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return deleteBatchByCreation(ctx, "neynarScoreHistory", cutoff);
  },
});

/** ONE BATCH: delete rouletteSpins > 30 days */
export const cleanRouletteSpinsBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return deleteBatchByCreation(ctx, "rouletteSpins", cutoff);
  },
});

/** ONE BATCH: delete tcgHistory > 30 days */
export const cleanTcgHistoryBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return deleteBatchByCreation(ctx, "tcgHistory", cutoff);
  },
});

/** ONE BATCH: wipe shameClicks */
export const wipeShameClicksBatch = internalMutation({
  args: {},
  handler: async (ctx) => wipeBatch(ctx, "shameClicks"),
});

/** ONE BATCH: delete apiStats > 30 days */
export const cleanApiStatsBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return deleteBatchByCreation(ctx, "apiStats", cutoff);
  },
});

/** Already done — kept for re-run safety */
export const wipeInactiveTables = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = ["tcgMatches", "pokerChatMessages", "rooms", "matchmaking", "tcgMatchmaking", "voiceSignaling", "voiceParticipants"];
    const results: Record<string, number> = {};
    for (const t of tables) {
      try { results[t] = await wipeBatch(ctx, t); } catch { results[t] = 0; }
    }
    return results;
  },
});
