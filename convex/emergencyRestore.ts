/**
 * EMERGENCY: Restore VBMS balance
 * This is a one-time fix for the bug where convertVBMSInternal zeros balance before signature succeeds
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const restoreVBMS = mutation({
  args: {
    address: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, { address, amount }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const oldBalance = profile.coins || 0;

    await ctx.db.patch(profile._id, {
      coins: amount,
    });

    console.log(`✅ EMERGENCY RESTORE: ${address} VBMS: ${oldBalance} → ${amount}`);

    return {
      oldBalance,
      newBalance: amount,
      message: `Restored ${amount} VBMS`,
    };
  },
});
