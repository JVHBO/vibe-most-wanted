/**
 * Análise detalhada dos top claimers
 */
import { query } from "./_generated/server";

export const analyzeTopClaimers = query({
  handler: async (ctx) => {
    const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);

    // Pegar claims recentes
    const recentClaims = await ctx.db
      .query("claimHistory")
      .order("desc")
      .take(500);

    const last48h = recentClaims.filter(c => c.timestamp > twoDaysAgo);

    // Agrupar por endereço
    const byAddress: Record<string, { total: number; claims: number; firstClaim: number; lastClaim: number }> = {};
    for (const c of last48h) {
      if (!byAddress[c.playerAddress]) {
        byAddress[c.playerAddress] = { total: 0, claims: 0, firstClaim: c.timestamp, lastClaim: c.timestamp };
      }
      byAddress[c.playerAddress].total += c.amount;
      byAddress[c.playerAddress].claims += 1;
      if (c.timestamp < byAddress[c.playerAddress].firstClaim) {
        byAddress[c.playerAddress].firstClaim = c.timestamp;
      }
      if (c.timestamp > byAddress[c.playerAddress].lastClaim) {
        byAddress[c.playerAddress].lastClaim = c.timestamp;
      }
    }

    // Top 10
    const top10 = Object.entries(byAddress)
      .map(([addr, data]) => ({ address: addr, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Buscar perfis dos top 10
    const results = [];
    for (const claimer of top10) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", claimer.address))
        .first();

      // Buscar transações de coin (como ganhou)
      const coinTxs = await ctx.db
        .query("coinTransactions")
        .withIndex("by_address", (q) => q.eq("address", claimer.address))
        .order("desc")
        .take(50);

      // Agrupar por source
      const sourceBreakdown: Record<string, number> = {};
      for (const tx of coinTxs) {
        const source = tx.source || "unknown";
        sourceBreakdown[source] = (sourceBreakdown[source] || 0) + tx.amount;
      }

      results.push({
        address: claimer.address,
        totalClaimed48h: claimer.total,
        claimsCount: claimer.claims,
        // Profile info
        username: profile?.username || "NO_PROFILE",
        fid: profile?.farcasterFid || null,
        createdAt: profile?.createdAt ? new Date(profile.createdAt).toISOString() : null,
        lifetimeEarned: profile?.lifetimeEarned || 0,
        currentCoins: profile?.coins || 0,
        pveWins: profile?.stats?.pveWins || 0,
        pvpWins: profile?.stats?.pvpWins || 0,
        totalCards: profile?.stats?.totalCards || 0,
        // Como ganhou (top sources)
        sourceBreakdown,
        // Tempo entre claims
        timeBetweenClaims: claimer.claims > 1 
          ? Math.round((claimer.lastClaim - claimer.firstClaim) / (claimer.claims - 1) / 60000) + " min avg"
          : "single claim",
      });
    }

    return results;
  },
});
