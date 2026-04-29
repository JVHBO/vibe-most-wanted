import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const ADMIN_SECRET_NAMES = ["ADMIN_SECRET", "CONVEX_ADMIN_SECRET"];

function hasAdminAccess(secret?: string): boolean {
  if (!secret) return false;
  return ADMIN_SECRET_NAMES.some((name) => process.env[name] === secret);
}

export const record = internalMutation({
  args: {
    address: v.string(),
    feature: v.string(),
    action: v.string(),
    status: v.union(v.literal("accepted"), v.literal("rejected")),
    reason: v.optional(v.string()),
    txHash: v.optional(v.string()),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("securityEvents", {
      address: args.address.toLowerCase(),
      feature: args.feature,
      action: args.action,
      status: args.status,
      reason: args.reason,
      txHash: args.txHash,
      amount: args.amount,
      timestamp: Date.now(),
    });
  },
});

export const listByAddress = query({
  args: {
    adminSecret: v.string(),
    address: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { adminSecret, address, limit = 100 }) => {
    if (!hasAdminAccess(adminSecret)) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("securityEvents")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .order("desc")
      .take(Math.min(limit, 500));
  },
});