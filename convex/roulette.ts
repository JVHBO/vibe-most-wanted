import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";

const disabled = { disabled: true, error: "Roulette disabled" };

export const canSpin = query({
  args: { address: v.string(), isArb: v.optional(v.boolean()) },
  handler: async () => ({
    ...disabled,
    canSpin: false,
    lastSpinDate: null,
    prizeOptions: [],
    pendingPrize: null,
    isVibeFidHolder: false,
    maxSpins: 0,
    spinsUsed: 0,
    spinsRemaining: 0,
  }),
});

export const spin = mutation({
  args: {
    address: v.string(),
    isArb: v.optional(v.boolean()),
    connectedAddress: v.optional(v.string()),
  },
  handler: async () => ({ success: false, prize: null, prizeIndex: null, ...disabled }),
});

export const getSpinHistory = query({
  args: { address: v.string() },
  handler: async () => [],
});

export const adminClearPendingSpin = mutation({
  args: { adminKey: v.string(), address: v.string() },
  handler: async () => ({ success: false, ...disabled }),
});

export const adminResetSpins = internalMutation({
  args: { address: v.string() },
  handler: async () => ({ deleted: 0, ...disabled }),
});

export const prepareRouletteClaim = action({
  args: { address: v.string() },
  handler: async () => {
    throw new Error("Roulette disabled");
  },
});

export const claimSmallPrize = mutation({
  args: { address: v.string() },
  handler: async () => {
    throw new Error("Roulette disabled");
  },
});

export const getUnclaimedSpin = internalQuery({
  args: { address: v.string() },
  handler: async () => null,
});

export const markSpinAsPending = internalMutation({
  args: { spinId: v.id("rouletteSpins") },
  handler: async () => ({ success: false, ...disabled }),
});

export const recordRouletteClaim = mutation({
  args: {
    address: v.string(),
    spinId: v.id("rouletteSpins"),
    txHash: v.string(),
  },
  handler: async () => {
    throw new Error("Roulette disabled");
  },
});

export const releaseRouletteClaimLock = mutation({
  args: {
    address: v.string(),
    spinId: v.id("rouletteSpins"),
  },
  handler: async () => ({ success: true, released: false, ...disabled }),
});

export const adminResetAllSpins = internalMutation({
  args: {},
  handler: async () => ({ deleted: 0, ...disabled }),
});

export const canBuyPaidSpin = query({
  args: { address: v.string() },
  handler: async () => ({
    canBuy: false,
    paidSpinsToday: 0,
    maxPaidSpins: 0,
    remaining: 0,
    cost: 0,
    ...disabled,
  }),
});

export const recordPaidSpin = action({
  args: { address: v.string(), txHash: v.string() },
  handler: async () => {
    throw new Error("Roulette disabled");
  },
});

export const recordPaidSpinInternal = internalMutation({
  args: { address: v.string(), txHash: v.string() },
  handler: async () => ({ success: false, ...disabled }),
});

export const getPaidSpinCost = query({
  args: {},
  handler: async () => ({ cost: 0, maxPerDay: 0, ...disabled }),
});
