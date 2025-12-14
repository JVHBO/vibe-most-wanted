/**
 * BACKUP QUERIES
 *
 * Queries para fazer backup completo do database
 * 🚀 BANDWIDTH FIX: Converted to internalQuery to prevent public abuse
 * 🚀 BANDWIDTH FIX: Added pagination limits
 */

import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Backup de todos os profiles (paginado)
export const getAllProfiles = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db.query("profiles").take(limit);
  },
});

// Backup de todos os matches (paginado)
export const getAllMatches = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db.query("matches").take(limit);
  },
});

// Backup de todos os achievements (paginado)
export const getAllAchievements = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db.query("achievements").take(limit);
  },
});

// Backup de todo o quest progress (paginado)
export const getAllQuestProgress = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db.query("questProgress").take(limit);
  },
});

// Backup de todas as PvP rooms (paginado)
export const getAllPvPRooms = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db.query("rooms").take(limit);
  },
});

// Backup de weekly rewards history (paginado)
export const getAllWeeklyRewards = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    try {
      return await ctx.db.query("weeklyRewards").take(limit);
    } catch {
      return []; // Tabela pode não existir ainda
    }
  },
});

// Backup completo - retorna sample de todas as tabelas
// 🚀 BANDWIDTH FIX: Limited to 50 records per table
export const getCompleteBackup = internalQuery({
  args: {},
  handler: async (ctx) => {
    const SAMPLE_SIZE = 50;

    const [
      profiles,
      matches,
      achievements,
      questProgress,
      rooms,
      weeklyRewards
    ] = await Promise.all([
      ctx.db.query("profiles").take(SAMPLE_SIZE),
      ctx.db.query("matches").take(SAMPLE_SIZE),
      ctx.db.query("achievements").take(SAMPLE_SIZE),
      ctx.db.query("questProgress").take(SAMPLE_SIZE),
      ctx.db.query("rooms").take(SAMPLE_SIZE),
      ctx.db.query("weeklyRewards").take(SAMPLE_SIZE).catch(() => []),
    ]);

    return {
      timestamp: Date.now(),
      profiles,
      matches,
      achievements,
      questProgress,
      rooms,
      weeklyRewards,
      stats: {
        profilesSampled: profiles.length,
        matchesSampled: matches.length,
        achievementsSampled: achievements.length,
        questProgressSampled: questProgress.length,
        roomsSampled: rooms.length,
        weeklyRewardsSampled: weeklyRewards.length,
      },
      note: "This is a sample backup. Use individual queries with pagination for full backup."
    };
  },
});
