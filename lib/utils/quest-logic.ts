/**
 * Pure functions for quest progress calculation.
 * Extracted from convex/quests.ts for testability.
 */

export interface MatchRecord {
  type: 'pve' | 'pvp';
  result: 'win' | 'loss';
  difficulty?: string;
  playerPower?: number;
  timestamp: number;
}

export interface QuestRequirement {
  count: number;
  difficulty?: string;
  maxPower?: number;
}

export interface QuestProgressResult {
  currentProgress: number;
  completed: boolean;
}

/**
 * Calculate quest progress based on quest type and match history
 */
export function calculateQuestProgress(
  questType: string,
  requirement: QuestRequirement,
  matches: MatchRecord[]
): QuestProgressResult {
  let currentProgress = 0;
  let completed = false;

  switch (questType) {
    case 'win_pve_3':
    case 'win_pve_5':
      currentProgress = matches.filter(
        m => m.type === 'pve' && m.result === 'win'
      ).length;
      completed = currentProgress >= (requirement.count || 0);
      break;

    case 'defeat_gangster':
    case 'defeat_gigachad':
      currentProgress = matches.filter(
        m => m.type === 'pve' && m.result === 'win' && m.difficulty === requirement.difficulty
      ).length;
      completed = currentProgress >= (requirement.count || 0);
      break;

    case 'play_pvp_3':
      currentProgress = matches.filter(m => m.type === 'pvp').length;
      completed = currentProgress >= (requirement.count || 0);
      break;

    case 'win_pvp_3':
      currentProgress = matches.filter(
        m => m.type === 'pvp' && m.result === 'win'
      ).length;
      completed = currentProgress >= (requirement.count || 0);
      break;

    case 'win_streak_3': {
      let streak = 0;
      let maxStreak = 0;
      const sortedMatches = [...matches].sort((a, b) => a.timestamp - b.timestamp);
      for (const match of sortedMatches) {
        if (match.result === 'win') {
          streak++;
          maxStreak = Math.max(maxStreak, streak);
        } else {
          streak = 0;
        }
      }
      currentProgress = maxStreak;
      completed = maxStreak >= (requirement.count || 0);
      break;
    }

    case 'low_power_win':
      currentProgress = matches.filter(
        m => m.type === 'pve' && m.result === 'win' && (m.playerPower || 0) <= (requirement.maxPower || 0)
      ).length;
      completed = currentProgress >= (requirement.count || 0);
      break;

    case 'complete_5_battles':
      currentProgress = matches.length;
      completed = currentProgress >= (requirement.count || 0);
      break;

    case 'perfect_day': {
      const pveWins = matches.filter(
        m => m.type === 'pve' && m.result === 'win'
      ).length;
      const pvpWins = matches.filter(
        m => m.type === 'pvp' && m.result === 'win'
      ).length;
      const requiredCount = requirement.count || 2;
      currentProgress = Math.min(pveWins, pvpWins);
      completed = pveWins >= requiredCount && pvpWins >= requiredCount;
      break;
    }
  }

  return { currentProgress, completed };
}

/**
 * Calculate weekly leaderboard reward based on rank
 */
export const WEEKLY_LEADERBOARD_REWARDS = {
  rank1: 2000,
  rank2: 1500,
  rank3: 1000,
  rank4to10: 600,
} as const;

export function getLeaderboardReward(rank: number): number {
  if (rank === 1) return WEEKLY_LEADERBOARD_REWARDS.rank1;
  if (rank === 2) return WEEKLY_LEADERBOARD_REWARDS.rank2;
  if (rank === 3) return WEEKLY_LEADERBOARD_REWARDS.rank3;
  if (rank >= 4 && rank <= 10) return WEEKLY_LEADERBOARD_REWARDS.rank4to10;
  return 0;
}

/**
 * Calculate PvE win streak
 */
export function calculatePveStreak(
  results: boolean[], // true = win, false = loss, in chronological order
): { currentStreak: number; maxStreak: number } {
  let currentStreak = 0;
  let maxStreak = 0;

  for (const won of results) {
    if (won) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return { currentStreak, maxStreak };
}

/**
 * Calculate quest reward with Arbitrum bonus
 */
export function calculateQuestReward(baseReward: number, chain?: string): number {
  return chain === 'arbitrum' ? baseReward * 2 : baseReward;
}
