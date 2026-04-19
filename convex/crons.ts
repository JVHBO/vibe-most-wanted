import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ============================================================
// RAFFLE POLLING
// ============================================================

// Poll Base chain every 2 minutes for TicketPurchased events
crons.interval(
  "poll-base-raffle-events",
  { minutes: 2 },
  internal.raffle.pollBaseEvents,
);

// Poll ARB chain every 2 minutes for TicketBoughtUSDN / TicketBoughtETH events
crons.interval(
  "poll-arb-raffle-events",
  { minutes: 2 },
  internal.raffle.pollARBEvents,
);

// ============================================================
// SLOT SHOP POLLING
// ============================================================

crons.interval(
  "poll-slot-shop-base",
  { minutes: 2 },
  internal.slot.pollSlotShopBase,
);

crons.interval(
  "poll-slot-shop-arb",
  { minutes: 2 },
  internal.slot.pollSlotShopArb,
);

// ============================================================
// DAILY NOTIFICATION — Farcaster (Hypersnap) + Base App
// ============================================================
// 15:00 UTC = 12:00 horário Brasil
crons.cron(
  "daily-gaming-tip",
  "0 15 * * *",
  internal.notifications.sendDailyTip,
);

// ============================================================
// WEEKLY — Domingo 23:50 UTC: notifica top 10, depois reseta aura
// ============================================================
crons.cron(
  "weekly-leaderboard-notification",
  "50 23 * * 0", // Sunday 23:50 UTC (10 min before reset)
  internal.notifications.sendWeeklyLeaderboardNotification,
);

crons.cron(
  "weekly-aura-reset",
  "0 0 * * 1", // Monday 00:00 UTC
  internal.profiles.resetWeeklyAura,
);

// ============================================================
// SLOT PRICE UPDATE — every 4h via internal action → Vercel endpoint
// ============================================================
crons.cron(
  "update-slot-prices",
  "0 */4 * * *",
  internal.slot.updateSlotPricesAction,
);

// ============================================================
// CLEANUP — dados antigos e tabelas inúteis (diário 03:00 UTC)
// ============================================================
crons.cron(
  "clean-old-slot-spins",
  "0 3 * * *",
  internal.cleanup.cleanOldSlotSpinsBatch,
);

crons.cron(
  "clean-old-matches",
  "0 3 * * *",
  internal.cleanup.cleanOldMatchesBatch30,
);

crons.cron(
  "clean-access-tables",
  "0 4 * * *",
  internal.cleanup.wipeAccessTablesBatch,
);

crons.cron(
  "clean-neynar-history",
  "0 4 * * *",
  internal.cleanup.cleanNeynarHistoryBatch,
);

crons.cron(
  "clean-roulette-spins",
  "0 4 * * *",
  internal.cleanup.cleanRouletteSpinsBatch,
);

crons.cron(
  "clean-tcg-history",
  "0 4 * * *",
  internal.cleanup.cleanTcgHistoryBatch,
);

crons.cron(
  "clean-api-stats",
  "0 4 * * *",
  internal.cleanup.cleanApiStatsBatch,
);

crons.cron(
  "clean-shame-clicks",
  "0 0 * * 1",
  internal.cleanup.wipeShameClicksBatch,
);

export default crons;
