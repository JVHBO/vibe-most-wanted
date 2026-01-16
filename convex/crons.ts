import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Cleanup old poker rooms (every 15 minutes)
crons.interval(
  "cleanup old poker rooms",
  { minutes: 15 },
  internal.pokerBattle.cleanupOldPokerRooms
);

// Daily gaming tips DISABLED - user requested removal
// crons.daily(
//   "send periodic gaming tips",
//   { hourUTC: 21, minuteUTC: 0 },
//   internal.notifications.sendPeriodicTip
// );

// Raid boss auto attacks (every 7 minutes) - optimized from 5 min
crons.interval(
  "raid boss auto attacks",
  { minutes: 15 },
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

// 🚀 Top 10 Leaderboard cache update (1x per day at 00:00 UTC)
// 🚀 BANDWIDTH FIX v3: Changed from 60min to daily (saves ~12MB/day)
crons.daily(
  "update leaderboard cache",
  { hourUTC: 0, minuteUTC: 0 },
  internal.quests.updateLeaderboardCache
);

// 🚀 FULL Leaderboard cache update (1x per day at 00:05 UTC)
// 🚀 BANDWIDTH FIX v3: Changed from 60min to daily (saves ~39MB/day)
crons.daily(
  "update full leaderboard cache",
  { hourUTC: 0, minuteUTC: 5 },
  internal.profiles.updateLeaderboardFullCache
);

// 🎯 Cast Auction lifecycle (every 5 minutes) - was 2 minutes
// Processes: bidding -> pending_feature -> active -> completed
crons.interval(
  "process cast auctions",
  { minutes: 5 },
  internal.castAuctions.processAuctionLifecycle
);

export default crons;
