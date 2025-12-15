import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Cleanup old poker rooms (every 15 minutes)
crons.interval(
  "cleanup old poker rooms",
  { minutes: 15 },
  internal.pokerBattle.cleanupOldPokerRooms
);

// Daily login reminder (13:00 UTC)
crons.daily(
  "send daily login reminder",
  { hourUTC: 13, minuteUTC: 0 },
  internal.notifications.sendDailyLoginReminder
);

// Daily gaming tips (21:00 UTC)
crons.daily(
  "send periodic gaming tips",
  { hourUTC: 21, minuteUTC: 0 },
  internal.notifications.sendPeriodicTip
);

// Raid boss auto attacks (every 5 minutes)
crons.interval(
  "raid boss auto attacks",
  { minutes: 5 },
  internal.raidBoss.processAutoAttacks
);

// Raid boss defeat transition (every 1 minute)
// When boss HP=0, distribute rewards to COINS and spawn next boss
crons.interval(
  "raid boss defeat transition",
  { minutes: 1 },
  internal.raidBoss.defeatBossAndSpawnNext
);

// Low energy notifications (every hour at :30)
crons.hourly(
  "raid boss low energy notifications",
  { minuteUTC: 30 },
  internal.notifications.sendLowEnergyNotifications
);

// 🚀 Leaderboard cache update (every 5 minutes)
// Reduces bandwidth by ~95% for checkWeeklyRewardEligibility
crons.interval(
  "update leaderboard cache",
  { minutes: 5 },
  internal.quests.updateLeaderboardCache
);

export default crons;
