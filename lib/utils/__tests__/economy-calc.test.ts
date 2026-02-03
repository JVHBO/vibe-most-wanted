import { describe, it, expect } from 'vitest';
import {
  DAILY_CAP,
  PVE_REWARDS,
  PVP_WIN_REWARD,
  PVP_LOSS_PENALTY,
  REVENGE_BONUS,
  RANKING_BONUS_BY_DIFF,
  PENALTY_REDUCTION_BY_DIFF,
  BONUSES,
  ENTRY_FEES,
  calculateAuraMultiplier,
  calculateRankingMultiplier,
  calculateDailyEarned,
  calculatePvPWinReward,
  calculatePvPLossPenalty,
  getStreakBonus,
  clampToDailyCap,
} from '../economy-calc';

// ═══════════════════════════════════════════════════════════════
// Constants sanity checks
// ═══════════════════════════════════════════════════════════════
describe('economy constants', () => {
  it('DAILY_CAP is positive', () => {
    expect(DAILY_CAP).toBeGreaterThan(0);
  });

  it('PVE_REWARDS has all difficulties', () => {
    expect(PVE_REWARDS.gey).toBeDefined();
    expect(PVE_REWARDS.goofy).toBeDefined();
    expect(PVE_REWARDS.gooner).toBeDefined();
    expect(PVE_REWARDS.gangster).toBeDefined();
    expect(PVE_REWARDS.gigachad).toBeDefined();
  });

  it('PVE rewards scale with difficulty', () => {
    expect(PVE_REWARDS.gey).toBeLessThan(PVE_REWARDS.goofy);
    expect(PVE_REWARDS.goofy).toBeLessThan(PVE_REWARDS.gooner);
    expect(PVE_REWARDS.gooner).toBeLessThan(PVE_REWARDS.gangster);
    expect(PVE_REWARDS.gangster).toBeLessThan(PVE_REWARDS.gigachad);
  });

  it('PVP_LOSS_PENALTY is negative', () => {
    expect(PVP_LOSS_PENALTY).toBeLessThan(0);
  });

  it('REVENGE_BONUS is > 1', () => {
    expect(REVENGE_BONUS).toBeGreaterThan(1);
  });

  it('streak bonuses scale up', () => {
    expect(BONUSES.streak3).toBeLessThan(BONUSES.streak5);
    expect(BONUSES.streak5).toBeLessThan(BONUSES.streak10);
  });

  it('attack mode has no entry fee', () => {
    expect(ENTRY_FEES.attack).toBe(0);
  });

  it('pvp mode has a positive entry fee', () => {
    expect(ENTRY_FEES.pvp).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateAuraMultiplier
// ═══════════════════════════════════════════════════════════════
describe('calculateAuraMultiplier', () => {
  describe('on win', () => {
    it('returns 1.0 when beating weaker opponent (opponent has lower aura)', () => {
      expect(calculateAuraMultiplier(1000, 500, true)).toBe(1.0);
    });

    it('returns 1.0 when beating same-aura opponent', () => {
      expect(calculateAuraMultiplier(500, 500, true)).toBe(1.0);
    });

    it('returns 1.0 for small aura diff < 50', () => {
      expect(calculateAuraMultiplier(500, 540, true)).toBe(1.0);
    });

    it('returns 1.15 for diff 50-99', () => {
      expect(calculateAuraMultiplier(500, 550, true)).toBe(RANKING_BONUS_BY_DIFF.diff5to9);
      expect(calculateAuraMultiplier(500, 599, true)).toBe(RANKING_BONUS_BY_DIFF.diff5to9);
    });

    it('returns 1.3 for diff 100-199', () => {
      expect(calculateAuraMultiplier(500, 600, true)).toBe(RANKING_BONUS_BY_DIFF.diff10to19);
      expect(calculateAuraMultiplier(500, 699, true)).toBe(RANKING_BONUS_BY_DIFF.diff10to19);
    });

    it('returns 1.5 for diff 200-499', () => {
      expect(calculateAuraMultiplier(500, 700, true)).toBe(RANKING_BONUS_BY_DIFF.diff20to49);
      expect(calculateAuraMultiplier(500, 999, true)).toBe(RANKING_BONUS_BY_DIFF.diff20to49);
    });

    it('returns 2.0 for diff >= 500', () => {
      expect(calculateAuraMultiplier(500, 1000, true)).toBe(RANKING_BONUS_BY_DIFF.diff50Plus);
      expect(calculateAuraMultiplier(0, 5000, true)).toBe(RANKING_BONUS_BY_DIFF.diff50Plus);
    });
  });

  describe('on loss', () => {
    it('returns 1.0 (full penalty) when losing to weaker opponent', () => {
      expect(calculateAuraMultiplier(1000, 500, false)).toBe(1.0);
    });

    it('returns 1.0 for same aura', () => {
      expect(calculateAuraMultiplier(500, 500, false)).toBe(1.0);
    });

    it('returns 1.0 for small aura diff < 50', () => {
      expect(calculateAuraMultiplier(500, 540, false)).toBe(1.0);
    });

    it('returns 0.8 for diff 50-99 (20% reduction)', () => {
      expect(calculateAuraMultiplier(500, 550, false)).toBe(PENALTY_REDUCTION_BY_DIFF.diff5to9);
    });

    it('returns 0.65 for diff 100-199 (35% reduction)', () => {
      expect(calculateAuraMultiplier(500, 600, false)).toBe(PENALTY_REDUCTION_BY_DIFF.diff10to19);
    });

    it('returns 0.5 for diff 200-499 (50% reduction)', () => {
      expect(calculateAuraMultiplier(500, 700, false)).toBe(PENALTY_REDUCTION_BY_DIFF.diff20to49);
    });

    it('returns 0.4 for diff >= 500 (60% reduction)', () => {
      expect(calculateAuraMultiplier(500, 1000, false)).toBe(PENALTY_REDUCTION_BY_DIFF.diff50Plus);
    });
  });

  describe('boundary values', () => {
    it('exactly 50 diff gives diff5to9 tier', () => {
      expect(calculateAuraMultiplier(500, 550, true)).toBe(RANKING_BONUS_BY_DIFF.diff5to9);
    });

    it('exactly 100 diff gives diff10to19 tier', () => {
      expect(calculateAuraMultiplier(500, 600, true)).toBe(RANKING_BONUS_BY_DIFF.diff10to19);
    });

    it('exactly 200 diff gives diff20to49 tier', () => {
      expect(calculateAuraMultiplier(500, 700, true)).toBe(RANKING_BONUS_BY_DIFF.diff20to49);
    });

    it('exactly 500 diff gives diff50Plus tier', () => {
      expect(calculateAuraMultiplier(500, 1000, true)).toBe(RANKING_BONUS_BY_DIFF.diff50Plus);
    });

    it('49 diff stays in default tier', () => {
      expect(calculateAuraMultiplier(500, 549, true)).toBe(RANKING_BONUS_BY_DIFF.default);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateRankingMultiplier (legacy rank-based)
// ═══════════════════════════════════════════════════════════════
describe('calculateRankingMultiplier', () => {
  it('returns 1.0 when player rank is better (lower number) than opponent', () => {
    // playerRank=5, opponentRank=10 → rankDiff = 5-10 = -5 → no bonus
    expect(calculateRankingMultiplier(5, 10, true)).toBe(1.0);
  });

  it('returns 2.0 when player is ranked 50+ positions lower', () => {
    // playerRank=100, opponentRank=1 → rankDiff = 100-1 = 99 → diff50Plus
    expect(calculateRankingMultiplier(100, 1, true)).toBe(2.0);
  });

  it('returns full penalty for losing to a lower-ranked opponent', () => {
    expect(calculateRankingMultiplier(5, 10, false)).toBe(1.0);
  });

  it('returns reduced penalty for losing to a much higher-ranked opponent', () => {
    expect(calculateRankingMultiplier(100, 1, false)).toBe(0.4);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateDailyEarned
// ═══════════════════════════════════════════════════════════════
describe('calculateDailyEarned', () => {
  it('returns 0 for null/undefined limits', () => {
    expect(calculateDailyEarned(null)).toBe(0);
    expect(calculateDailyEarned(undefined)).toBe(0);
  });

  it('returns 0 for empty limits', () => {
    expect(calculateDailyEarned({})).toBe(0);
  });

  it('estimates PvE earnings (pveWins * 30)', () => {
    expect(calculateDailyEarned({ pveWins: 5 })).toBe(150);
  });

  it('estimates PvP earnings (pvpMatches * 60)', () => {
    expect(calculateDailyEarned({ pvpMatches: 3 })).toBe(180);
  });

  it('includes first PvE bonus', () => {
    expect(calculateDailyEarned({ firstPveBonus: true })).toBe(BONUSES.firstPve);
  });

  it('includes first PvP bonus', () => {
    expect(calculateDailyEarned({ firstPvpBonus: true })).toBe(BONUSES.firstPvp);
  });

  it('includes login bonus', () => {
    expect(calculateDailyEarned({ loginBonus: true })).toBe(BONUSES.login);
  });

  it('includes streak bonus (minimum streak3)', () => {
    expect(calculateDailyEarned({ streakBonus: true })).toBe(BONUSES.streak3);
  });

  it('sums all components', () => {
    const total = calculateDailyEarned({
      pveWins: 2,       // 60
      pvpMatches: 1,    // 60
      firstPveBonus: true,  // 50
      firstPvpBonus: true,  // 100
      loginBonus: true,     // 25
      streakBonus: true,    // 150
    });
    expect(total).toBe(60 + 60 + 50 + 100 + 25 + 150);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculatePvPWinReward
// ═══════════════════════════════════════════════════════════════
describe('calculatePvPWinReward', () => {
  it('returns base reward with 1.0 multiplier and no revenge', () => {
    expect(calculatePvPWinReward(1.0, false)).toBe(PVP_WIN_REWARD);
  });

  it('applies ranking multiplier', () => {
    expect(calculatePvPWinReward(2.0, false)).toBe(Math.round(PVP_WIN_REWARD * 2.0));
  });

  it('applies revenge bonus on top of multiplier', () => {
    const withMultiplier = Math.round(PVP_WIN_REWARD * 1.5);
    const withRevenge = Math.round(withMultiplier * REVENGE_BONUS);
    expect(calculatePvPWinReward(1.5, true)).toBe(withRevenge);
  });

  it('revenge bonus adds 20% to base reward', () => {
    const base = PVP_WIN_REWARD; // 50
    const withRevenge = Math.round(base * REVENGE_BONUS); // 50 * 1.2 = 60
    expect(calculatePvPWinReward(1.0, true)).toBe(withRevenge);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculatePvPLossPenalty
// ═══════════════════════════════════════════════════════════════
describe('calculatePvPLossPenalty', () => {
  it('returns full penalty with 1.0 multiplier', () => {
    expect(calculatePvPLossPenalty(1.0)).toBe(PVP_LOSS_PENALTY);
  });

  it('reduces penalty with lower multiplier', () => {
    // 0.4 multiplier → -10 * 0.4 = -4
    expect(calculatePvPLossPenalty(0.4)).toBe(Math.round(PVP_LOSS_PENALTY * 0.4));
  });

  it('penalty is always negative or zero', () => {
    expect(calculatePvPLossPenalty(1.0)).toBeLessThanOrEqual(0);
    expect(calculatePvPLossPenalty(0.4)).toBeLessThanOrEqual(0);
    expect(calculatePvPLossPenalty(0.0)).toBe(-0); // edge: 0 multiplier → Math.round(-10 * 0) = -0
  });
});

// ═══════════════════════════════════════════════════════════════
// getStreakBonus
// ═══════════════════════════════════════════════════════════════
describe('getStreakBonus', () => {
  it('returns 0 for non-bonus streaks', () => {
    expect(getStreakBonus(0)).toBe(0);
    expect(getStreakBonus(1)).toBe(0);
    expect(getStreakBonus(2)).toBe(0);
    expect(getStreakBonus(4)).toBe(0);
    expect(getStreakBonus(7)).toBe(0);
    expect(getStreakBonus(15)).toBe(0);
  });

  it('returns 150 for 3-win streak', () => {
    expect(getStreakBonus(3)).toBe(BONUSES.streak3);
  });

  it('returns 300 for 5-win streak', () => {
    expect(getStreakBonus(5)).toBe(BONUSES.streak5);
  });

  it('returns 750 for 10-win streak', () => {
    expect(getStreakBonus(10)).toBe(BONUSES.streak10);
  });
});

// ═══════════════════════════════════════════════════════════════
// clampToDailyCap
// ═══════════════════════════════════════════════════════════════
describe('clampToDailyCap', () => {
  it('returns full reward when under cap', () => {
    expect(clampToDailyCap(100, 0)).toBe(100);
    expect(clampToDailyCap(100, 1000)).toBe(100);
  });

  it('clamps reward when it would exceed cap', () => {
    // cap=1500, earned=1450, reward=100 → can only get 50
    expect(clampToDailyCap(100, 1450)).toBe(50);
  });

  it('returns 0 when already at cap', () => {
    expect(clampToDailyCap(100, DAILY_CAP)).toBe(0);
  });

  it('returns 0 when already over cap', () => {
    expect(clampToDailyCap(100, DAILY_CAP + 500)).toBe(0);
  });

  it('returns exact remaining when reward exactly fills cap', () => {
    expect(clampToDailyCap(500, DAILY_CAP - 500)).toBe(500);
  });
});
