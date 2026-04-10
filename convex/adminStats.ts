/**
 * Admin Stats Queries
 * Aggregated platform statistics for the /admin/stats page.
 * Queries are one-shot (not live) — client caches results for 24h.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Overview ────────────────────────────────────────────────────────────────

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const h24 = now - 86_400_000;
    const d7  = now - 7  * 86_400_000;
    const d30 = now - 30 * 86_400_000;

    // Users
    const profiles = await ctx.db.query("profiles").take(2000);
    const totalUsers  = profiles.length;
    const active24h   = profiles.filter(p => (p.lastActiveDate ?? 0) > h24).length;
    const active7d    = profiles.filter(p => (p.lastActiveDate ?? 0) > d7).length;
    const active30d   = profiles.filter(p => (p.lastActiveDate ?? 0) > d30).length;
    const totalCoins  = profiles.reduce((s, p) => s + (p.coins ?? 0), 0);
    const totalInbox  = profiles.reduce((s, p) => s + (p.coinsInbox ?? 0) + (p.inbox ?? 0), 0);
    const totalLifetime = profiles.reduce((s, p) => s + (p.lifetimeEarned ?? 0), 0);

    // Matches (PvP / PvE / Attack)
    const matches = await ctx.db.query("matches")
      .withIndex("by_timestamp")
      .order("desc")
      .take(5000);
    const totalMatches = matches.length;
    const pvpMatches   = matches.filter(m => m.type === "pvp" || m.type === "poker-pvp").length;
    const pveMatches   = matches.filter(m => m.type === "pve" || m.type === "poker-cpu").length;
    const attackMatches = matches.filter(m => m.type === "attack").length;
    const matches24h   = matches.filter(m => m.timestamp > h24).length;
    const matches7d    = matches.filter(m => m.timestamp > d7).length;

    // TCG History (finished matches)
    const tcgHistory = await ctx.db.query("tcgHistory")
      .withIndex("by_finished")
      .order("desc")
      .take(2000);
    const totalTcg  = tcgHistory.length;
    const tcg24h    = tcgHistory.filter(m => m.finishedAt > h24).length;

    // Slot Spins
    const slotSpins = await ctx.db.query("slotSpins")
      .withIndex("by_date")
      .order("desc")
      .take(5000);
    const totalSlots    = slotSpins.length;
    const slots24h      = slotSpins.filter(s => s.timestamp > h24).length;
    const totalSlotWon  = slotSpins.reduce((s, sp) => s + sp.winAmount, 0);
    const foilSpins     = slotSpins.filter(s => (s.foilCount ?? 0) > 0).length;

    // Baccarat
    const baccaratRounds = await ctx.db.query("baccaratHistory")
      .withIndex("by_finished")
      .order("desc")
      .take(2000);
    const totalBaccarat = baccaratRounds.length;
    const baccarat24h   = baccaratRounds.filter(r => r.finishedAt > h24).length;
    const baccaratPot   = baccaratRounds.reduce((s, r) => s + r.totalPot, 0);

    // Raid
    const raidParticipants = await ctx.db.query("raidAttacks").take(1000);
    const raidActive7d = raidParticipants.filter(r => r.lastUpdated > d7).length;
    const totalRaidDamage = raidParticipants.reduce((s, r) => s + r.totalDamageDealt, 0);

    // VBMS Claims
    const claimHistory = await ctx.db.query("claimHistory")
      .withIndex("by_timestamp")
      .order("desc")
      .take(2000);
    const totalVbmsClaimed = claimHistory.reduce((s, c) => s + c.amount, 0);
    const claims24h = claimHistory.filter(c => c.timestamp > h24).length;
    const claims7d  = claimHistory.filter(c => c.timestamp > d7).length;

    // VibeFID (per-chain)
    const vibefidCards = await ctx.db.query("farcasterCards").take(2000);
    const vibefidBase = vibefidCards.filter(c => !c.chain || c.chain === "base").length;
    const vibefidArb  = vibefidCards.filter(c => c.chain === "arbitrum").length;

    // Raffle
    const raffleEntries = await ctx.db.query("raffleEntries").take(2000);

    // Roulette
    const rouletteSpins = await ctx.db.query("rouletteSpins").take(2000);

    // Bug reports
    const bugReports = await ctx.db.query("bugReports").take(500);

    return {
      users: { total: totalUsers, active24h, active7d, active30d },
      economy: {
        totalCoins,
        totalInbox,
        totalLifetime,
        totalVbmsClaimed,
        claims24h,
        claims7d,
      },
      matches: {
        total: totalMatches,
        pvp: pvpMatches,
        pve: pveMatches,
        attack: attackMatches,
        last24h: matches24h,
        last7d: matches7d,
      },
      tcg:      { total: totalTcg, last24h: tcg24h },
      slots:    { total: totalSlots, last24h: slots24h, totalWon: totalSlotWon, foilSpins },
      baccarat: { total: totalBaccarat, last24h: baccarat24h, totalPot: baccaratPot },
      raid: {
        participants: raidParticipants.length,
        active7d: raidActive7d,
        totalDamage: totalRaidDamage,
      },
      vibefid:  { base: vibefidBase, arb: vibefidArb, total: vibefidBase + vibefidArb },
      raffle:   { entries: raffleEntries.length },
      roulette: { total: rouletteSpins.length },
      bugs:     { total: bugReports.length },
      fetchedAt: now,
    };
  },
});

// ─── All Neynar Users (ordered by score desc) ────────────────────────────────

export const getTopNeynarUsers = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("farcasterCards")
      .withIndex("by_score")
      .order("desc")
      .take(2000);
  },
});

// ─── API Stats (dev panel) ───────────────────────────────────────────────────

export const getApiStats = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db.query("apiStats").collect();
    return stats.sort((a, b) => b.lastUpdated - a.lastUpdated);
  },
});

const OWNER = "0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52";

export const resetApiStats = mutation({
  args: { callerAddress: v.string() },
  handler: async (ctx, args) => {
    if (args.callerAddress.toLowerCase() !== OWNER) {
      throw new Error("Unauthorized");
    }
    const stats = await ctx.db.query("apiStats").collect();
    for (const stat of stats) {
      await ctx.db.patch(stat._id, { value: 0, lastUpdated: Date.now() });
    }
    return { reset: stats.length };
  },
});
