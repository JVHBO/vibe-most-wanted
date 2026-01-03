import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByAddress = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const addr = address.toLowerCase();
    return await ctx.db
      .query("coinTransactions")
      .withIndex("by_address", (q) => q.eq("address", addr))
      .order("desc")
      .take(500);
  },
});
