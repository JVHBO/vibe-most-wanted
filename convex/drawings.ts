import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate upload URL for client-side upload
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save drawing metadata after upload
export const saveDrawing = mutation({
  args: {
    storageId: v.id("_storage"),
    authorAddress: v.string(),
    authorUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Insert new drawing
    await ctx.db.insert("drawings", {
      storageId: args.storageId,
      authorAddress: args.authorAddress,
      authorUsername: args.authorUsername,
      createdAt: now,
    });

    // Keep only last 20 drawings — delete oldest beyond that
    const all = await ctx.db
      .query("drawings")
      .withIndex("by_created")
      .order("desc")
      .take(30);

    if (all.length > 20) {
      for (const old of all.slice(20)) {
        await ctx.storage.delete(old.storageId);
        await ctx.db.delete(old._id);
      }
    }
  },
});

// Delete all drawings (admin cleanup)
export const clearAllDrawings = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("drawings").collect();
    for (const d of all) {
      try { await ctx.storage.delete(d.storageId); } catch {}
      await ctx.db.delete(d._id);
    }
    return { deleted: all.length };
  },
});

// Get recent drawings with signed URLs
export const getRecentDrawings = query({
  args: {},
  handler: async (ctx) => {
    const drawings = await ctx.db
      .query("drawings")
      .withIndex("by_created")
      .order("desc")
      .take(8);

    // Filter out drawings older than 48h
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const fresh = drawings.filter((d) => d.createdAt > cutoff);

    return await Promise.all(
      fresh.map(async (d) => ({
        _id: d._id,
        authorUsername: d.authorUsername,
        url: await ctx.storage.getUrl(d.storageId),
        createdAt: d.createdAt,
      }))
    );
  },
});
