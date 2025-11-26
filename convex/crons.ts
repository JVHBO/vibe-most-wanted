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
 * Note: Poker Battle rooms don't need cleanup - they expire automatically
 */
// crons.hourly(
//   "cleanup old pvp rooms",
//   { minuteUTC: 0 },
//   internal.pokerBattle.cleanupOldPokerRooms
// );

/**
 * 🧹 Cleanup old Poker Battle rooms (every 15 minutes)
 * Removes expired, cancelled (>1 min old), and finished (>5 min old) rooms
 */
crons.interval(
  "cleanup old poker rooms",
  { minutes: 15 },
  internal.pokerBattle.cleanupOldPokerRooms
);

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

// ============================================================================
// DAILY NOTIFICATIONS
// ============================================================================

/**
 * 📬 Send daily login reminder to all users
 *
 * Schedule: Every day at 13:00 UTC (10:00 BRT)
 * Content: "💰 Daily Login Bonus! Claim your free coins!"
 * Target: All users with notification tokens enabled
 */
crons.daily(
  "send daily login reminder",
  { hourUTC: 13, minuteUTC: 0 },
  internal.notifications.sendDailyLoginReminder
);

/**
 * 💡 Send periodic gaming tips to all users
 *
 * Schedule: Every day at 21:00 UTC (18:00 BRT)
 * Content: Rotates through gaming tips array
 * Target: All users with notification tokens enabled
 */
crons.daily(
  "send periodic gaming tips",
  { hourUTC: 21, minuteUTC: 0 },
  internal.notifications.sendPeriodicTip
);

// ============================================================================
// RAID BOSS AUTO-ATTACKS
// ============================================================================

/**
 * ⚔️ Process automatic raid boss attacks
 *
 * Schedule: Every 5 minutes
 * Logic: All cards with energy attack the current boss automatically
 * Rewards: Distributed when boss is defeated (contribution-based)
 */
crons.interval(
  "raid boss auto attacks",
  { minutes: 5 },
  internal.raidBoss.processAutoAttacks
);

/**
 * ⚡ Send low energy notifications for raid boss cards
 *
 * Schedule: Every hour (at minute 30)
 * Logic: Check all players' raid decks for cards with <1 hour energy remaining
 * Target: Players with low/expired energy cards who have notifications enabled
 */
crons.hourly(
  "raid boss low energy notifications",
  { minuteUTC: 30 },
  internal.notifications.sendLowEnergyNotifications
);

export default crons;
