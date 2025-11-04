import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * 🕐 SCHEDULED JOBS - Vibe Most Wanted
 *
 * Automated tasks that run on schedule:
 * - Weekly rewards distribution (Sundays 00:00 UTC)
 */

const crons = cronJobs();

// ============================================================================
// WEEKLY REWARDS DISTRIBUTION
// ============================================================================

/**
 * 🏆 Distribute weekly leaderboard rewards
 *
 * ⚠️ DISABLED: Now using manual claim system (claimWeeklyLeaderboardReward)
 * Players must claim rewards via the leaderboard UI
 *
 * Old schedule: Every Sunday at 00:00 UTC
 * Rewards: Top 10 players on leaderboard
 * - Rank #1: 1000 coins
 * - Rank #2: 750 coins
 * - Rank #3: 500 coins
 * - Rank #4-10: 300 coins each
 */
// crons.weekly(
//   "distribute weekly rewards",
//   { dayOfWeek: "sunday", hourUTC: 0, minuteUTC: 0 },
//   internal.quests.distributeWeeklyRewards
// );

// ============================================================================
// FUTURE SCHEDULED TASKS (Commented - ready to enable)
// ============================================================================

/**
 * 🧹 Cleanup old PvP rooms (every hour)
 *
 * Uncomment when needed:
 *
 * crons.hourly(
 *   "cleanup old pvp rooms",
 *   { minuteUTC: 0 },
 *   internal.rooms.cleanupOldRooms
 * );
 */

/**
 * 📊 Generate daily quest rotation (every day at 00:00 UTC)
 *
 * Uncomment when needed:
 *
 * crons.daily(
 *   "rotate daily quests",
 *   { hourUTC: 0, minuteUTC: 0 },
 *   internal.quests.generateDailyQuest
 * );
 */

/**
 * 🎁 Reset daily mission claimability (every day at 00:00 UTC)
 *
 * Currently handled per-player when they check missions.
 * Could be centralized here if we want to pre-reset all players.
 */

export default crons;
