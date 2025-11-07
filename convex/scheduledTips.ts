import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Send a gaming tip daily at 6 PM UTC (different from login reminder at 4:05 AM UTC)
// 6 PM UTC = 2 PM EST / 11 AM PST
crons.daily(
  "send-periodic-tip",
  { hourUTC: 18, minuteUTC: 0 },
  internal.notifications.sendPeriodicTip
);

export default crons;
