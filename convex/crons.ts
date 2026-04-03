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
// DAILY NOTIFICATIONS
// ============================================================

// Daily login reminder — 12:00 UTC (9am Brazil)
crons.cron(
  "daily-login-reminder",
  "0 12 * * *",
  internal.notifications.sendDailyLoginReminder,
);

// Rotating tip (VibeMail, Roulette, Arena, etc.) — 18:00 UTC (3pm Brazil)
crons.cron(
  "daily-gaming-tip",
  "0 18 * * *",
  internal.notifications.sendPeriodicTip,
);

export default crons;
