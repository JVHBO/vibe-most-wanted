import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Poll Base chain every 2 minutes for TicketPurchased events
// Syncs entries to ARB contract automatically (no Alchemy needed)
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

export default crons;
