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

export default crons;
