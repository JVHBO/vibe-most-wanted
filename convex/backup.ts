/**
 * BACKUP QUERIES
 *
 * Queries para fazer backup completo do database
 */

import { query } from "./_generated/server";

// Backup de todos os profiles
export const getAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("profiles").collect();
  },
});

// Backup de todos os matches
export const getAllMatches = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("matches").collect();
  },
});

// Backup de todos os achievements
export const getAllAchievements = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("achievements").collect();
  },
});

// Backup de todo o quest progress
export const getAllQuestProgress = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("questProgress").collect();
  },
});

// Backup de todas as PvP rooms
export const getAllPvPRooms = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("rooms").collect();
  },
});

// Backup de weekly rewards history
export const getAllWeeklyRewards = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await ctx.db.query("weeklyRewards").collect();
    } catch {
      return []; // Tabela pode não existir ainda
    }
  },
});

// Backup completo - retorna todas as tabelas
export const getCompleteBackup = query({
  args: {},
  handler: async (ctx) => {
    const [
      profiles,
      matches,
      achievements,
      questProgress,
      rooms,
      weeklyRewards
    ] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("matches").collect(),
      ctx.db.query("achievements").collect(),
      ctx.db.query("questProgress").collect(),
      ctx.db.query("rooms").collect(),
      ctx.db.query("weeklyRewards").collect().catch(() => []),
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
        totalProfiles: profiles.length,
        totalMatches: matches.length,
        totalAchievements: achievements.length,
        totalQuestProgress: questProgress.length,
        totalRooms: rooms.length,
        totalWeeklyRewards: weeklyRewards.length,
      }
    };
  },
});
