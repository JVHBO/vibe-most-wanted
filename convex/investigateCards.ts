/**
 * Investigar cards de um jogador
 */
import { query } from "./_generated/server";
import { v } from "convex/values";

export const investigatePlayer = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    // Pegar profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    // Pegar cards atuais
    const currentCards = await ctx.db
      .query("cardInventory")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .collect();

    // Pegar packs
    const packs = await ctx.db
      .query("cardPacks")
      .withIndex("by_owner", (q) => q.eq("ownerAddress", normalizedAddress))
      .collect();

    // Pegar audit logs
    const auditLogs = await ctx.db
      .query("coinAuditLog")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .order("desc")
      .take(50);

    // Pegar transações com "burn" no source
    const burnTxs = await ctx.db
      .query("coinTransactions")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .order("desc")
      .take(100);

    const burnOnly = burnTxs.filter(tx => tx.source?.includes("burn"));

    return {
      profile: profile ? {
        username: profile.username,
        fid: profile.farcasterFid,
        createdAt: new Date(profile.createdAt).toISOString(),
        coins: profile.coins,
        lifetimeEarned: profile.lifetimeEarned,
        ownedTokenIds: profile.ownedTokenIds?.length || 0,
      } : null,
      currentCards: currentCards.map(c => ({
        rarity: c.rarity,
        foil: c.foil,
        sourcePackType: c.sourcePackType,
        quantity: c.quantity,
      })),
      packs: packs.map(p => ({
        packType: p.packType,
        opened: p.opened,
        createdAt: new Date(p.createdAt).toISOString(),
      })),
      burnTransactions: burnOnly.map(tx => ({
        amount: tx.amount,
        description: tx.description,
        timestamp: new Date(tx.timestamp).toISOString(),
      })),
      auditLogs: auditLogs.slice(0, 20).map(log => ({
        type: log.type,
        amount: log.amount,
        sourceFunction: log.sourceFunction,
        metadata: log.metadata,
        timestamp: new Date(log.timestamp).toISOString(),
      })),
    };
  },
});
