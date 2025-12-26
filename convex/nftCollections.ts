import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

export const getActiveCollections = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("nftCollections")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
  },
});

export const getAllCollections = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("nftCollections").collect();
  },
});

export const addCollection = internalMutation({
  args: {
    collectionId: v.string(),
    name: v.string(),
    shortName: v.string(),
    contractAddress: v.string(),
    chain: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("nftCollections")
      .withIndex("by_collection_id", (q) => q.eq("collectionId", args.collectionId))
      .first();

    if (existing) {
      throw new Error(`Collection with ID "${args.collectionId}" already exists`);
    }

    const id = await ctx.db.insert("nftCollections", {
      ...args,
      active: true,
      createdAt: Date.now(),
    });

    return { success: true, id };
  },
});

export const removeCollection = internalMutation({
  args: {
    collectionId: v.string(),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db
      .query("nftCollections")
      .withIndex("by_collection_id", (q) => q.eq("collectionId", args.collectionId))
      .first();

    if (!collection) {
      throw new Error(`Collection "${args.collectionId}" not found`);
    }

    await ctx.db.delete(collection._id);
    return { success: true };
  },
});

export const toggleCollection = internalMutation({
  args: {
    collectionId: v.string(),
  },
  handler: async (ctx, args) => {
    const collection = await ctx.db
      .query("nftCollections")
      .withIndex("by_collection_id", (q) => q.eq("collectionId", args.collectionId))
      .first();

    if (!collection) {
      throw new Error(`Collection "${args.collectionId}" not found`);
    }

    await ctx.db.patch(collection._id, {
      active: !collection.active,
    });

    return { success: true, active: !collection.active };
  },
});

export const initializeCollections = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("nftCollections").first();
    if (existing) {
      return { success: false, message: "Collections already initialized" };
    }

    await ctx.db.insert("nftCollections", {
      collectionId: "vbms",
      name: "Vibe Most Wanted",
      shortName: "VBMS",
      contractAddress: "0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728",
      chain: "base",
      active: true,
      createdAt: Date.now(),
    });

    return { success: true, message: "Initialized with VBMS collection" };
  },
});
