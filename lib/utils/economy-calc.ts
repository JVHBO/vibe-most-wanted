/**
 * Economy Calculation Functions (pure, extracted from convex/economy.ts)
 *
 * All pure math functions for the TESTVBMS economy system.
 * No database calls, no side effects - just calculations.
 */

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

export const DAILY_CAP = 1500;
export const PVE_WIN_LIMIT = 30;
export const PVP_MATCH_LIMIT = 10;

export const PVE_REWARDS: Record<string, number> = {
  gey: 1,
  goofy: 2,
  gooner: 5,
  gangster: 10,
  gigachad: 20,
};

export const PVP_WIN_REWARD = 50;
export const PVP_LOSS_PENALTY = -10;
export const REVENGE_BONUS = 1.2;
export const MAX_REMATCHES_PER_DAY = 5;

export const RANKING_BONUS_BY_DIFF = {
  diff50Plus: 2.0,
  diff20to49: 1.5,
  diff10to19: 1.3,
  diff5to9: 1.15,
  default: 1.0,
};

export const PENALTY_REDUCTION_BY_DIFF = {
  diff50Plus: 0.4,
  diff20to49: 0.5,
  diff10to19: 0.65,
  diff5to9: 0.8,
  default: 1.0,
};

export const ENTRY_FEES = {
  attack: 0,
  pvp: 20,
};

export const BONUSES = {
  firstPve: 50,
  firstPvp: 100,
  login: 25,
  streak3: 150,
  streak5: 300,
  streak10: 750,
};

// ═══════════════════════════════════════════════════════════════
// Pure calculation functions
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate multiplier based on AURA DIFFERENCE between player and opponent.
 *
 * For wins: bonus multiplier when beating a stronger opponent.
 * For losses: penalty reduction when losing to a stronger opponent.
 */
export function calculateAuraMultiplier(playerAura: number, opponentAura: number, isWin: boolean): number {
  const auraDiff = opponentAura - playerAura;

  if (isWin) {
    if (auraDiff <= 0) return RANKING_BONUS_BY_DIFF.default;
    if (auraDiff >= 500) return RANKING_BONUS_BY_DIFF.diff50Plus;
    if (auraDiff >= 200) return RANKING_BONUS_BY_DIFF.diff20to49;
    if (auraDiff >= 100) return RANKING_BONUS_BY_DIFF.diff10to19;
    if (auraDiff >= 50) return RANKING_BONUS_BY_DIFF.diff5to9;
    return RANKING_BONUS_BY_DIFF.default;
  } else {
    if (auraDiff <= 0) return PENALTY_REDUCTION_BY_DIFF.default;
    if (auraDiff >= 500) return PENALTY_REDUCTION_BY_DIFF.diff50Plus;
    if (auraDiff >= 200) return PENALTY_REDUCTION_BY_DIFF.diff20to49;
    if (auraDiff >= 100) return PENALTY_REDUCTION_BY_DIFF.diff10to19;
    if (auraDiff >= 50) return PENALTY_REDUCTION_BY_DIFF.diff5to9;
    return PENALTY_REDUCTION_BY_DIFF.default;
  }
}

/**
 * Legacy rank-based multiplier (same thresholds, uses rank diff instead of aura diff).
 */
export function calculateRankingMultiplier(playerRank: number, opponentRank: number, isWin: boolean): number {
  const rankDiff = playerRank - opponentRank;

  if (isWin) {
    if (rankDiff <= 0) return RANKING_BONUS_BY_DIFF.default;
    if (rankDiff >= 50) return RANKING_BONUS_BY_DIFF.diff50Plus;
    if (rankDiff >= 20) return RANKING_BONUS_BY_DIFF.diff20to49;
    if (rankDiff >= 10) return RANKING_BONUS_BY_DIFF.diff10to19;
    if (rankDiff >= 5) return RANKING_BONUS_BY_DIFF.diff5to9;
    return RANKING_BONUS_BY_DIFF.default;
  } else {
    if (rankDiff <= 0) return PENALTY_REDUCTION_BY_DIFF.default;
    if (rankDiff >= 50) return PENALTY_REDUCTION_BY_DIFF.diff50Plus;
    if (rankDiff >= 20) return PENALTY_REDUCTION_BY_DIFF.diff20to49;
    if (rankDiff >= 10) return PENALTY_REDUCTION_BY_DIFF.diff10to19;
    if (rankDiff >= 5) return PENALTY_REDUCTION_BY_DIFF.diff5to9;
    return PENALTY_REDUCTION_BY_DIFF.default;
  }
}

/**
 * Estimate daily earnings from a player's daily limits.
 */
export function calculateDailyEarned(dailyLimits: {
  pveWins?: number;
  pvpMatches?: number;
  firstPveBonus?: boolean;
  firstPvpBonus?: boolean;
  loginBonus?: boolean;
  streakBonus?: boolean;
} | null | undefined): number {
  if (!dailyLimits) return 0;

  let total = 0;
  total += (dailyLimits.pveWins || 0) * 30;
  total += (dailyLimits.pvpMatches || 0) * 60;
  if (dailyLimits.firstPveBonus) total += BONUSES.firstPve;
  if (dailyLimits.firstPvpBonus) total += BONUSES.firstPvp;
  if (dailyLimits.loginBonus) total += BONUSES.login;
  if (dailyLimits.streakBonus) total += BONUSES.streak3;

  return total;
}

/**
 * Calculate PvP win reward with aura multiplier and optional revenge bonus.
 */
export function calculatePvPWinReward(rankingMultiplier: number, isRevenge: boolean): number {
  const base = Math.round(PVP_WIN_REWARD * rankingMultiplier);
  return isRevenge ? Math.round(base * REVENGE_BONUS) : base;
}

/**
 * Calculate PvP loss penalty with aura multiplier.
 */
export function calculatePvPLossPenalty(rankingMultiplier: number): number {
  return Math.round(PVP_LOSS_PENALTY * rankingMultiplier);
}

/**
 * Get streak bonus amount for a given streak count.
 * Returns 0 if the streak doesn't trigger a bonus.
 */
export function getStreakBonus(streak: number): number {
  if (streak === 3) return BONUSES.streak3;
  if (streak === 5) return BONUSES.streak5;
  if (streak === 10) return BONUSES.streak10;
  return 0;
}

/**
 * Check if daily cap would be exceeded and clamp reward.
 */
export function clampToDailyCap(reward: number, dailyEarned: number): number {
  if (dailyEarned + reward > DAILY_CAP) {
    return Math.max(0, DAILY_CAP - dailyEarned);
  }
  return reward;
}
