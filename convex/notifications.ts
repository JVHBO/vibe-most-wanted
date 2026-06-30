import { v } from "convex/values";
import { action, internalAction, internalQuery, mutation, query } from "./_generated/server";
import { requireInternalAdminKey } from "./adminAuth";

const DISABLED_RESULT = {
  notificationsDisabled: true,
  sent: 0,
  failed: 0,
  success_count: 0,
  failure_count: 0,
};

export const getTokenByFid = query({
  args: { fid: v.string(), adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    if (adminKey !== undefined) requireInternalAdminKey(adminKey);
    return null;
  },
});

export const getAllTokensByFidInternal = internalQuery({
  args: { fid: v.string() },
  handler: async () => [],
});

export const getUniqueTokens = query({
  args: {},
  handler: async () => [],
});

export const saveToken = mutation({
  args: {
    adminKey: v.optional(v.string()),
    fid: v.string(),
    token: v.string(),
    url: v.string(),
    app: v.optional(v.string()),
  },
  handler: async (_ctx, { adminKey }) => {
    if (adminKey !== undefined) requireInternalAdminKey(adminKey);
    return null;
  },
});

export const removeToken = mutation({
  args: { fid: v.string(), adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    if (adminKey !== undefined) requireInternalAdminKey(adminKey);
    return false;
  },
});

export const sendDailyTip = internalAction({
  args: {},
  handler: async () => DISABLED_RESULT,
});

export const sendPeriodicTip = internalAction({
  args: {},
  handler: async () => DISABLED_RESULT,
});

export const sendDefenseAttackedNotification = internalAction({
  args: {
    defenderAddress: v.string(),
    defenderFid: v.optional(v.number()),
    attackerUsername: v.string(),
    result: v.union(v.literal("win"), v.literal("lose")),
    defenderUsername: v.string(),
  },
  handler: async () => DISABLED_RESULT,
});

export const sendVibemailNotification = internalAction({
  args: { recipientFid: v.number(), hasAudio: v.boolean() },
  handler: async () => ({ sent: false, notificationsDisabled: true }),
});

export const sendWinnerNotification = internalAction({
  args: {
    winnerFid: v.number(),
    winnerUsername: v.string(),
    bidAmount: v.number(),
    castAuthor: v.string(),
  },
  handler: async () => ({ sent: false, notificationsDisabled: true }),
});

export const sendFeaturedCastNotification = internalAction({
  args: {
    castAuthor: v.string(),
    warpcastUrl: v.string(),
    winnerUsername: v.optional(v.string()),
  },
  handler: async () => DISABLED_RESULT,
});

export const sendBossDefeatedNotifications = internalAction({
  args: {
    bossName: v.string(),
    bossRarity: v.string(),
    totalContributors: v.number(),
    contributorAddresses: v.array(v.string()),
  },
  handler: async () => DISABLED_RESULT,
});

export const sendLowEnergyNotifications = internalAction({
  args: {},
  handler: async () => ({ sent: 0, failed: 0, skipped: 0, notificationsDisabled: true }),
});

export const getAllRaidDecks = internalQuery({
  args: {},
  handler: async () => [],
});

export const getProfileByAddress = internalQuery({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    return ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();
  },
});

export const getProfilesByAddresses = internalQuery({
  args: { addresses: v.array(v.string()) },
  handler: async (ctx, { addresses }) => {
    const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
    const profiles = await Promise.all(
      unique.map((addr) =>
        ctx.db.query("profiles").withIndex("by_address", (q) => q.eq("address", addr)).first(),
      ),
    );
    const result: Record<string, { fid: string | undefined; farcasterFid: number | undefined }> = {};
    for (const p of profiles) {
      if (p) result[p.address] = { fid: p.fid, farcasterFid: p.farcasterFid };
    }
    return result;
  },
});

export const triggerDailyTip = mutation({
  args: { adminKey: v.string() },
  handler: async (_ctx, { adminKey }) => {
    requireInternalAdminKey(adminKey);
    return { scheduled: false, notificationsDisabled: true };
  },
});

export const triggerPeriodicTip = mutation({
  args: { adminKey: v.string() },
  handler: async (_ctx, { adminKey }) => {
    requireInternalAdminKey(adminKey);
    return { scheduled: false, notificationsDisabled: true };
  },
});

export const triggerDailyLoginReminder = mutation({
  args: { adminKey: v.string() },
  handler: async (_ctx, { adminKey }) => {
    requireInternalAdminKey(adminKey);
    return { scheduled: false, notificationsDisabled: true };
  },
});

export const triggerTestFarcasterNotification = mutation({
  args: {
    adminKey: v.string(),
    fid: v.number(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (_ctx, { adminKey, fid }) => {
    requireInternalAdminKey(adminKey);
    return { scheduled: false, fid, notificationsDisabled: true };
  },
});

export const triggerTestDirectNotification = mutation({
  args: {
    adminKey: v.string(),
    fid: v.number(),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (_ctx, { adminKey, fid }) => {
    requireInternalAdminKey(adminKey);
    return { scheduled: false, fid, notificationsDisabled: true };
  },
});

export const testFarcasterNotification = internalAction({
  args: { fid: v.number(), title: v.string(), body: v.string() },
  handler: async () => DISABLED_RESULT,
});

export const sendCustomNotification = action({
  args: { adminKey: v.string(), title: v.string(), body: v.string() },
  handler: async (_ctx, { adminKey }) => {
    requireInternalAdminKey(adminKey);
    return { farcaster: DISABLED_RESULT, base: DISABLED_RESULT, notificationsDisabled: true };
  },
});

export const sendFarcasterNotification = mutation({
  args: { adminKey: v.string(), title: v.string(), body: v.string(), targetUrl: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    requireInternalAdminKey(adminKey);
    return { scheduled: false, notificationsDisabled: true };
  },
});

export const sendFarcasterNotificationInternal = internalAction({
  args: { title: v.string(), body: v.string(), targetUrl: v.optional(v.string()) },
  handler: async () => DISABLED_RESULT,
});

export const getAllTokens = internalQuery({
  args: {},
  handler: async () => [],
});

export const sendWeeklyLeaderboardNotification = internalAction({
  args: {},
  handler: async () => ({ farcasterSent: 0, baseSent: 0, playersNotified: 0, notificationsDisabled: true }),
});

export const getTopLeaderboardProfiles = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async () => [],
});

export const getActiveUserFids = internalQuery({
  args: { daysAgo: v.optional(v.number()) },
  handler: async () => [],
});
