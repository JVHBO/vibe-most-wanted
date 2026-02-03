import { describe, it, expect } from 'vitest';
import {
  calculateQuestProgress,
  getLeaderboardReward,
  calculatePveStreak,
  calculateQuestReward,
  WEEKLY_LEADERBOARD_REWARDS,
  type MatchRecord,
} from '../quest-logic';

function makeMatch(overrides: Partial<MatchRecord> = {}): MatchRecord {
  return {
    type: 'pve',
    result: 'win',
    timestamp: Date.now(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// calculateQuestProgress — win_pve quests
// ═══════════════════════════════════════════════════════════════
describe('calculateQuestProgress - PvE wins', () => {
  it('counts PvE wins for win_pve_3', () => {
    const matches = [
      makeMatch({ type: 'pve', result: 'win' }),
      makeMatch({ type: 'pve', result: 'win' }),
      makeMatch({ type: 'pve', result: 'loss' }),
    ];
    const result = calculateQuestProgress('win_pve_3', { count: 3 }, matches);
    expect(result.currentProgress).toBe(2);
    expect(result.completed).toBe(false);
  });

  it('completes with exactly 3 wins', () => {
    const matches = [
      makeMatch({ type: 'pve', result: 'win' }),
      makeMatch({ type: 'pve', result: 'win' }),
      makeMatch({ type: 'pve', result: 'win' }),
    ];
    const result = calculateQuestProgress('win_pve_3', { count: 3 }, matches);
    expect(result.completed).toBe(true);
  });

  it('ignores PvP wins for PvE quest', () => {
    const matches = [
      makeMatch({ type: 'pvp', result: 'win' }),
      makeMatch({ type: 'pvp', result: 'win' }),
      makeMatch({ type: 'pvp', result: 'win' }),
    ];
    const result = calculateQuestProgress('win_pve_3', { count: 3 }, matches);
    expect(result.currentProgress).toBe(0);
    expect(result.completed).toBe(false);
  });

  it('handles win_pve_5 needing 5 wins', () => {
    const matches = Array.from({ length: 5 }, () => makeMatch({ type: 'pve', result: 'win' }));
    const result = calculateQuestProgress('win_pve_5', { count: 5 }, matches);
    expect(result.completed).toBe(true);
    expect(result.currentProgress).toBe(5);
  });

  it('returns 0 progress for empty matches', () => {
    const result = calculateQuestProgress('win_pve_3', { count: 3 }, []);
    expect(result.currentProgress).toBe(0);
    expect(result.completed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateQuestProgress — difficulty quests
// ═══════════════════════════════════════════════════════════════
describe('calculateQuestProgress - difficulty', () => {
  it('counts only gangster wins for defeat_gangster', () => {
    const matches = [
      makeMatch({ type: 'pve', result: 'win', difficulty: 'gangster' }),
      makeMatch({ type: 'pve', result: 'win', difficulty: 'goofy' }),
      makeMatch({ type: 'pve', result: 'win', difficulty: 'gigachad' }),
    ];
    const result = calculateQuestProgress('defeat_gangster', { count: 1, difficulty: 'gangster' }, matches);
    expect(result.currentProgress).toBe(1);
    expect(result.completed).toBe(true);
  });

  it('counts only gigachad wins for defeat_gigachad', () => {
    const matches = [
      makeMatch({ type: 'pve', result: 'win', difficulty: 'gangster' }),
      makeMatch({ type: 'pve', result: 'loss', difficulty: 'gigachad' }),
    ];
    const result = calculateQuestProgress('defeat_gigachad', { count: 1, difficulty: 'gigachad' }, matches);
    expect(result.currentProgress).toBe(0);
    expect(result.completed).toBe(false);
  });

  it('ignores PvP for difficulty quests', () => {
    const matches = [
      makeMatch({ type: 'pvp', result: 'win', difficulty: 'gangster' }),
    ];
    const result = calculateQuestProgress('defeat_gangster', { count: 1, difficulty: 'gangster' }, matches);
    expect(result.currentProgress).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateQuestProgress — PvP quests
// ═══════════════════════════════════════════════════════════════
describe('calculateQuestProgress - PvP', () => {
  it('counts all PvP matches for play_pvp_3', () => {
    const matches = [
      makeMatch({ type: 'pvp', result: 'win' }),
      makeMatch({ type: 'pvp', result: 'loss' }),
      makeMatch({ type: 'pvp', result: 'loss' }),
    ];
    const result = calculateQuestProgress('play_pvp_3', { count: 3 }, matches);
    expect(result.currentProgress).toBe(3);
    expect(result.completed).toBe(true);
  });

  it('counts only PvP wins for win_pvp_3', () => {
    const matches = [
      makeMatch({ type: 'pvp', result: 'win' }),
      makeMatch({ type: 'pvp', result: 'loss' }),
      makeMatch({ type: 'pvp', result: 'win' }),
    ];
    const result = calculateQuestProgress('win_pvp_3', { count: 3 }, matches);
    expect(result.currentProgress).toBe(2);
    expect(result.completed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateQuestProgress — win streak
// ═══════════════════════════════════════════════════════════════
describe('calculateQuestProgress - win_streak_3', () => {
  it('tracks max consecutive wins', () => {
    const matches = [
      makeMatch({ result: 'win', timestamp: 1 }),
      makeMatch({ result: 'win', timestamp: 2 }),
      makeMatch({ result: 'win', timestamp: 3 }),
      makeMatch({ result: 'loss', timestamp: 4 }),
    ];
    const result = calculateQuestProgress('win_streak_3', { count: 3 }, matches);
    expect(result.currentProgress).toBe(3);
    expect(result.completed).toBe(true);
  });

  it('resets streak on loss', () => {
    const matches = [
      makeMatch({ result: 'win', timestamp: 1 }),
      makeMatch({ result: 'win', timestamp: 2 }),
      makeMatch({ result: 'loss', timestamp: 3 }),
      makeMatch({ result: 'win', timestamp: 4 }),
    ];
    const result = calculateQuestProgress('win_streak_3', { count: 3 }, matches);
    expect(result.currentProgress).toBe(2);
    expect(result.completed).toBe(false);
  });

  it('finds streak not at start', () => {
    const matches = [
      makeMatch({ result: 'loss', timestamp: 1 }),
      makeMatch({ result: 'win', timestamp: 2 }),
      makeMatch({ result: 'win', timestamp: 3 }),
      makeMatch({ result: 'win', timestamp: 4 }),
    ];
    const result = calculateQuestProgress('win_streak_3', { count: 3 }, matches);
    expect(result.currentProgress).toBe(3);
    expect(result.completed).toBe(true);
  });

  it('handles empty matches', () => {
    const result = calculateQuestProgress('win_streak_3', { count: 3 }, []);
    expect(result.currentProgress).toBe(0);
    expect(result.completed).toBe(false);
  });

  it('sorts by timestamp before calculating', () => {
    // Out of order timestamps — should still find streak
    const matches = [
      makeMatch({ result: 'win', timestamp: 3 }),
      makeMatch({ result: 'win', timestamp: 1 }),
      makeMatch({ result: 'loss', timestamp: 2 }),
    ];
    const result = calculateQuestProgress('win_streak_3', { count: 2 }, matches);
    // Sorted: win(1), loss(2), win(3) → max streak = 1
    expect(result.currentProgress).toBe(1);
    expect(result.completed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateQuestProgress — complete_5_battles
// ═══════════════════════════════════════════════════════════════
describe('calculateQuestProgress - complete_5_battles', () => {
  it('counts all matches regardless of type or result', () => {
    const matches = [
      makeMatch({ type: 'pve', result: 'loss' }),
      makeMatch({ type: 'pvp', result: 'win' }),
      makeMatch({ type: 'pve', result: 'win' }),
      makeMatch({ type: 'pvp', result: 'loss' }),
      makeMatch({ type: 'pve', result: 'win' }),
    ];
    const result = calculateQuestProgress('complete_5_battles', { count: 5 }, matches);
    expect(result.currentProgress).toBe(5);
    expect(result.completed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateQuestProgress — perfect_day
// ═══════════════════════════════════════════════════════════════
describe('calculateQuestProgress - perfect_day', () => {
  it('requires both PvE and PvP wins', () => {
    const matches = [
      makeMatch({ type: 'pve', result: 'win' }),
      makeMatch({ type: 'pve', result: 'win' }),
      makeMatch({ type: 'pvp', result: 'win' }),
      makeMatch({ type: 'pvp', result: 'win' }),
    ];
    const result = calculateQuestProgress('perfect_day', { count: 2 }, matches);
    expect(result.completed).toBe(true);
    expect(result.currentProgress).toBe(2); // min of pve(2) and pvp(2)
  });

  it('shows limiting factor as progress', () => {
    const matches = [
      makeMatch({ type: 'pve', result: 'win' }),
      makeMatch({ type: 'pve', result: 'win' }),
      makeMatch({ type: 'pve', result: 'win' }),
      makeMatch({ type: 'pvp', result: 'win' }),
    ];
    const result = calculateQuestProgress('perfect_day', { count: 2 }, matches);
    expect(result.currentProgress).toBe(1); // min(3, 1) = 1
    expect(result.completed).toBe(false);
  });

  it('fails when only PvE wins', () => {
    const matches = Array.from({ length: 5 }, () => makeMatch({ type: 'pve', result: 'win' }));
    const result = calculateQuestProgress('perfect_day', { count: 2 }, matches);
    expect(result.completed).toBe(false);
    expect(result.currentProgress).toBe(0); // min(5, 0) = 0
  });
});

// ═══════════════════════════════════════════════════════════════
// getLeaderboardReward
// ═══════════════════════════════════════════════════════════════
describe('getLeaderboardReward', () => {
  it('returns 2000 for rank 1', () => {
    expect(getLeaderboardReward(1)).toBe(WEEKLY_LEADERBOARD_REWARDS.rank1);
  });

  it('returns 1500 for rank 2', () => {
    expect(getLeaderboardReward(2)).toBe(WEEKLY_LEADERBOARD_REWARDS.rank2);
  });

  it('returns 1000 for rank 3', () => {
    expect(getLeaderboardReward(3)).toBe(WEEKLY_LEADERBOARD_REWARDS.rank3);
  });

  it('returns 600 for ranks 4-10', () => {
    for (let rank = 4; rank <= 10; rank++) {
      expect(getLeaderboardReward(rank)).toBe(WEEKLY_LEADERBOARD_REWARDS.rank4to10);
    }
  });

  it('returns 0 for rank > 10', () => {
    expect(getLeaderboardReward(11)).toBe(0);
    expect(getLeaderboardReward(100)).toBe(0);
  });

  it('returns 0 for rank 0', () => {
    expect(getLeaderboardReward(0)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculatePveStreak
// ═══════════════════════════════════════════════════════════════
describe('calculatePveStreak', () => {
  it('tracks current and max streak', () => {
    const results = [true, true, true, false, true, true];
    const streak = calculatePveStreak(results);
    expect(streak.maxStreak).toBe(3);
    expect(streak.currentStreak).toBe(2);
  });

  it('resets on loss', () => {
    const results = [true, true, false];
    const streak = calculatePveStreak(results);
    expect(streak.currentStreak).toBe(0);
    expect(streak.maxStreak).toBe(2);
  });

  it('handles empty results', () => {
    const streak = calculatePveStreak([]);
    expect(streak.currentStreak).toBe(0);
    expect(streak.maxStreak).toBe(0);
  });

  it('handles all wins', () => {
    const results = [true, true, true, true, true];
    const streak = calculatePveStreak(results);
    expect(streak.currentStreak).toBe(5);
    expect(streak.maxStreak).toBe(5);
  });

  it('handles all losses', () => {
    const results = [false, false, false];
    const streak = calculatePveStreak(results);
    expect(streak.currentStreak).toBe(0);
    expect(streak.maxStreak).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateQuestReward
// ═══════════════════════════════════════════════════════════════
describe('calculateQuestReward', () => {
  it('returns base reward on default chain', () => {
    expect(calculateQuestReward(100)).toBe(100);
  });

  it('returns base reward on non-arbitrum chain', () => {
    expect(calculateQuestReward(100, 'base')).toBe(100);
  });

  it('doubles reward on arbitrum', () => {
    expect(calculateQuestReward(100, 'arbitrum')).toBe(200);
  });

  it('doubles zero', () => {
    expect(calculateQuestReward(0, 'arbitrum')).toBe(0);
  });
});
