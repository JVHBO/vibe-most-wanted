import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireInternalAdminKey } from "./adminAuth";

export const PRIZE_TIERS: Array<{ tickets: number; title: string; img: string }> = [];

const disabled = { disabled: true, error: "Raffle disabled" };
const emptyState = {
  active: false,
  ended: true,
  entries: [],
  totalEntries: 0,
  totalTickets: 0,
  winners: [],
  config: null,
  ...disabled,
};

function checkAdmin(adminKey?: string) {
  if (adminKey) requireInternalAdminKey(adminKey);
}

export const getRecentEntries = query({
  args: {},
  handler: async () => [],
});

export const getPlayerTicketInfo = query({
  args: { address: v.optional(v.string()) },
  handler: async () => ({ entries: [], count: 0, ...disabled }),
});

export const getRaffleConfig = query({
  args: {},
  handler: async () => null,
});

export const getRaffleBuyers = query({
  args: {},
  handler: async () => [],
});

export const getBonusTicketCount = query({
  args: { address: v.optional(v.string()) },
  handler: async () => 0,
});

export const getLiveRaffleState = action({
  args: {},
  handler: async () => emptyState,
});

export const getETHTicketPrice = action({
  args: {},
  handler: async () => ({ ethPrice: "0", usdPrice: 0, ...disabled }),
});

export const adminSetRaffleConfig = mutation({
  args: { adminKey: v.string() },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return { success: false, ...disabled };
  },
});

export const processBaseTicketPurchase = internalAction({
  args: {},
  handler: async () => disabled,
});

export const recordBaseEntry = internalMutation({
  args: {},
  handler: async () => false,
});

export const submitBaseEntriesToARB = internalAction({
  args: {},
  handler: async () => disabled,
});

export const markEntrySynced = internalMutation({
  args: {},
  handler: async () => ({ success: false, ...disabled }),
});

export const recordBaseEntryPublic = mutation({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return { success: false, ...disabled };
  },
});

export const pollBaseEvents = internalAction({
  args: {},
  handler: async () => ({ processed: 0, ...disabled }),
});

export const pollARBEvents = internalAction({
  args: {},
  handler: async () => ({ processed: 0, ...disabled }),
});

export const recordARBEntryInternal = internalMutation({
  args: {},
  handler: async () => ({ inserted: false, ...disabled }),
});

export const getUnsyncedEntries = internalQuery({
  args: {},
  handler: async () => [],
});

export const retryUnsyncedEntries = internalAction({
  args: {},
  handler: async () => ({ retried: 0, ...disabled }),
});

export const markDrawRequested = internalMutation({
  args: {},
  handler: async () => ({ success: false, ...disabled }),
});

export const autoCheckDraw = internalAction({
  args: {},
  handler: async () => disabled,
});

export const checkAndNotifyTier = internalAction({
  args: {},
  handler: async () => disabled,
});

export const updateNotifiedTier = internalMutation({
  args: {},
  handler: async () => ({ success: false, ...disabled }),
});

export const updatePollCheckpoint = internalMutation({
  args: {},
  handler: async () => ({ success: false, ...disabled }),
});

export const getLatestConfigInternal = internalQuery({
  args: {},
  handler: async () => null,
});

export const claimShareBonus = action({
  args: { address: v.optional(v.string()) },
  handler: async () => ({ success: false, bonusTickets: 0, ...disabled }),
});

export const insertShareBonus = internalMutation({
  args: {},
  handler: async () => ({ inserted: false, ...disabled }),
});

export const submitShareBonusOnChain = internalAction({
  args: {},
  handler: async () => disabled,
});

export const triggerDraw = action({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return { success: false, ...disabled };
  },
});

export const recordARBEntry = mutation({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return { success: false, ...disabled };
  },
});

export const setDrawTxHash = mutation({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return { success: false, ...disabled };
  },
});

export const getPrizeTiers = query({
  args: {},
  handler: async () => PRIZE_TIERS,
});

export const getAllRaffleResults = query({
  args: {},
  handler: async () => [],
});

export const getRaffleResult = query({
  args: { epoch: v.optional(v.number()) },
  handler: async () => null,
});

export const getRaffleResultInternal = internalQuery({
  args: { epoch: v.optional(v.number()) },
  handler: async () => null,
});

export const patchDrawResult = mutation({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return { success: false, ...disabled };
  },
});

export const adminFixWinners = mutation({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return { success: false, ...disabled };
  },
});

export const insertMissingEntry = mutation({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return { success: false, ...disabled };
  },
});

export const getEntriesForEpoch = internalQuery({
  args: { epoch: v.optional(v.number()) },
  handler: async () => [],
});

export const recordDrawResult = internalMutation({
  args: {},
  handler: async () => ({ success: false, ...disabled }),
});

export const checkAndRecordDraw = action({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return disabled;
  },
});

export const checkAndRecordDrawInternal = internalAction({
  args: {},
  handler: async () => disabled,
});

export const redeployARB = action({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return disabled;
  },
});

export const resetAndOpenNewRaffle = action({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return disabled;
  },
});

export const clearEpochData = internalMutation({
  args: { epoch: v.optional(v.number()) },
  handler: async () => ({ deleted: 0, ...disabled }),
});

export const restampStaleBaseEntries = mutation({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return { updated: 0, ...disabled };
  },
});

export const upsertRaffleConfig = internalMutation({
  args: {},
  handler: async () => ({ success: false, ...disabled }),
});

export const withdrawRaffleFunds = action({
  args: { adminKey: v.optional(v.string()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return disabled;
  },
});

export const purgeEpochEntries = mutation({
  args: { adminKey: v.optional(v.string()), epoch: v.optional(v.number()) },
  handler: async (_ctx, { adminKey }) => {
    checkAdmin(adminKey);
    return { deleted: 0, ...disabled };
  },
});
