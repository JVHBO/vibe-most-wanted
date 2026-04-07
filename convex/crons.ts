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
// DAILY NOTIFICATIONS — ATIVO (using direct Warpcast API - zero credits)
// ============================================================
// Executa diariamente às 15:00 UTC (12:00 horário Brasil)
// Notifica apenas usuários ativos dos últimos 7 dias
// Sistema gratuito: envia diretamente para Warpcast sem Neynar
crons.cron(
  "daily-gaming-tip",
  "0 15 * * *",
  internal.notifications.sendPeriodicTip,
);

export default crons;
