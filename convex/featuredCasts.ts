import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all active featured casts
export const getActiveCasts = query({
  args: {},
  handler: async (ctx) => {
    const casts = await ctx.db
      .query("featuredCasts")
      .withIndex("by_active")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
    
    // Sort by order
    return casts.sort((a, b) => a.order - b.order);
  },
});

// Set a featured cast (admin only - add check later)
export const setFeaturedCast = mutation({
  args: {
    castHash: v.string(),
    warpcastUrl: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if there's already a cast at this order
    const existing = await ctx.db
      .query("featuredCasts")
      .withIndex("by_order")
      .filter((q) => q.eq(q.field("order"), args.order))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        castHash: args.castHash,
        warpcastUrl: args.warpcastUrl,
        active: true,
        addedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new
    return await ctx.db.insert("featuredCasts", {
      castHash: args.castHash,
      warpcastUrl: args.warpcastUrl,
      order: args.order,
      active: true,
      addedAt: Date.now(),
    });
  },
});

// Remove a featured cast
export const removeFeaturedCast = mutation({
  args: {
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const cast = await ctx.db
      .query("featuredCasts")
      .withIndex("by_order")
      .filter((q) => q.eq(q.field("order"), args.order))
      .first();

    if (cast) {
      await ctx.db.patch(cast._id, { active: false });
    }
  },
});
