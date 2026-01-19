import {
  b as e
} from "./_deps/AWJMSRP7.js";
import {
  h as a
} from "./_deps/6EQFL5ZL.js";
import "./_deps/34SVKERO.js";
import "./_deps/5B5TEMMX.js";

// convex/crons.ts
var o = a();
o.interval(
  "cleanup old poker rooms",
  { minutes: 15 },
  e.pokerBattle.cleanupOldPokerRooms
);
o.interval(
  "raid boss auto attacks",
  { minutes: 15 },
  e.raidBoss.processAutoAttacks
);
o.interval(
  "raid boss defeat transition",
  { minutes: 2 },
  e.raidBoss.defeatBossAndSpawnNext
);
o.hourly(
  "raid boss low energy notifications",
  { minuteUTC: 30 },
  e.notifications.sendLowEnergyNotifications
);
o.daily(
  "update leaderboard cache",
  { hourUTC: 0, minuteUTC: 0 },
  e.quests.updateLeaderboardCache
);
o.daily(
  "update full leaderboard cache",
  { hourUTC: 0, minuteUTC: 5 },
  e.profiles.updateLeaderboardFullCache
);
o.interval(
  "process cast auctions",
  { minutes: 5 },
  e.castAuctions.processAuctionLifecycle
);
var r = o;
export {
  r as default
};
//# sourceMappingURL=crons.js.map
