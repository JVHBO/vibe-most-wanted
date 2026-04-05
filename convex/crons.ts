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

// Single daily notification — 15:00 UTC (noon Brazil)
// Rotates through tips (Login Bonus, Roulette, Arena, VibeMail, etc.)
crons.cron(
  "daily-gaming-tip",
  "0 15 * * *",
  internal.notifications.sendPeriodicTip,
);

export default crons;
