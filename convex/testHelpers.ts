
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const resetCardForTest = mutation({
  args: { fid: v.number() },
  handler: async (ctx, { fid }) => {
    const card = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", fid))
      .first();

    if (!card) return { error: "Card not found" };

    // Reset to Epic for testing
    await ctx.db.patch(card._id, {
      rarity: "Epic",
      power: 140, // Epic base power with Standard foil and Mint wear
      previousRarity: undefined,
      upgradedAt: undefined,
    });

    return { success: true, message: "Card reset to Epic for testing" };
  },
});
