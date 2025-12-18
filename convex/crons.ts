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

// Raid boss auto attacks (every 7 minutes) - optimized from 5 min
crons.interval(
  "raid boss auto attacks",
  { minutes: 7 },
  internal.raidBoss.processAutoAttacks
);

// Raid boss defeat transition (every 2 minutes) - optimized from 1 min
// When boss HP=0, distribute rewards to COINS and spawn next boss
crons.interval(
  "raid boss defeat transition",
  { minutes: 2 },
  internal.raidBoss.defeatBossAndSpawnNext
);

// Low energy notifications (every hour at :30)
crons.hourly(
  "raid boss low energy notifications",
  { minuteUTC: 30 },
  internal.notifications.sendLowEnergyNotifications
);

// 🚀 Top 10 Leaderboard cache update (every 10 minutes) - was 5 minutes
// Reduces bandwidth by ~95% for checkWeeklyRewardEligibility
crons.interval(
  "update leaderboard cache",
  { minutes: 10 },
  internal.quests.updateLeaderboardCache
);

// 🚀 FULL Leaderboard cache update (every 3 minutes)
// Reduces bandwidth by ~99% for getLeaderboardLite (saves ~1.4GB/month)
crons.interval(
  "update full leaderboard cache",
  { minutes: 3 },
  internal.profiles.updateLeaderboardFullCache
);

// 🎯 Cast Auction lifecycle (every 2 minutes) - optimized from 1 min
// Processes: bidding -> pending_feature -> active -> completed
crons.interval(
  "process cast auctions",
  { minutes: 2 },
  internal.castAuctions.processAuctionLifecycle
);

export default crons;
