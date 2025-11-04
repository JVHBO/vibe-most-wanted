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

// Backup de todos os achievements claims
export const getAllAchievementClaims = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("achievementClaims").collect();
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
    return await ctx.db.query("pvpRooms").collect();
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
      achievementClaims,
      questProgress,
      pvpRooms,
      weeklyRewards
    ] = await Promise.all([
      ctx.db.query("profiles").collect(),
      ctx.db.query("matches").collect(),
      ctx.db.query("achievementClaims").collect(),
      ctx.db.query("questProgress").collect(),
      ctx.db.query("pvpRooms").collect(),
      ctx.db.query("weeklyRewards").collect().catch(() => []),
    ]);

    return {
      timestamp: Date.now(),
      profiles,
      matches,
      achievementClaims,
      questProgress,
      pvpRooms,
      weeklyRewards,
      stats: {
        totalProfiles: profiles.length,
        totalMatches: matches.length,
        totalAchievementClaims: achievementClaims.length,
        totalQuestProgress: questProgress.length,
        totalPvPRooms: pvpRooms.length,
        totalWeeklyRewards: weeklyRewards.length,
      }
    };
  },
});
