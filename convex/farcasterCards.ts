import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Mint a Farcaster Card
 *
 * Takes Farcaster user data from Neynar API and creates a playable card
 */
export const mintFarcasterCard = mutation({
  args: {
    // Farcaster Data (from Neynar API)
    fid: v.number(),
    username: v.string(),
    displayName: v.string(),
    pfpUrl: v.string(),
    bio: v.string(),
    neynarScore: v.number(),
    followerCount: v.number(),
    followingCount: v.number(),
    powerBadge: v.boolean(),

    // Owner
    address: v.string(),

    // Card traits (calculated on frontend)
    rarity: v.string(),
    foil: v.string(),
    wear: v.string(),
    power: v.number(),

    // Generated image URL (from Nanobanana IA)
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    // Check if user already minted this FID
    const existing = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", args.fid))
      .first();

    if (existing) {
      // User can only mint once per FID globally
      throw new Error(`Card for FID ${args.fid} has already been minted`);
    }

    // Create card ID
    const cardId = `farcaster_${args.fid}`;

    // Insert card
    const cardDocId = await ctx.db.insert("farcasterCards", {
      // Farcaster Data
      fid: args.fid,
      username: args.username,
      displayName: args.displayName,
      pfpUrl: args.pfpUrl,
      bio: args.bio.slice(0, 200), // Truncate bio

      // Owner
      address: normalizedAddress,

      // Card Properties
      cardId,
      rarity: args.rarity,
      foil: args.foil,
      wear: args.wear,
      power: args.power,

      // Farcaster Stats
      neynarScore: args.neynarScore,
      followerCount: args.followerCount,
      followingCount: args.followingCount,
      powerBadge: args.powerBadge,

      // Generated Image
      imageUrl: args.imageUrl,

      // Game State
      equipped: false,

      // Metadata
      mintedAt: Date.now(),
    });

    console.log(`✅ Farcaster card minted: FID ${args.fid} (${args.rarity}) by ${normalizedAddress}`);

    return {
      success: true,
      cardId,
      rarity: args.rarity,
      power: args.power,
      message: `Successfully minted ${args.rarity} card for ${args.username}!`,
    };
  },
});

/**
 * Get Farcaster cards owned by an address
 */
export const getFarcasterCardsByAddress = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    const cards = await ctx.db
      .query("farcasterCards")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .collect();

    return cards;
  },
});

/**
 * Get a specific Farcaster card by FID
 */
export const getFarcasterCardByFid = query({
  args: {
    fid: v.number(),
  },
  handler: async (ctx, args) => {
    const card = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", args.fid))
      .first();

    return card;
  },
});

/**
 * Equip/unequip a Farcaster card
 */
export const toggleEquipFarcasterCard = mutation({
  args: {
    address: v.string(),
    cardId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    // Find the card
    const card = await ctx.db
      .query("farcasterCards")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .filter((q) => q.eq(q.field("cardId"), args.cardId))
      .first();

    if (!card) {
      throw new Error("Card not found or not owned by you");
    }

    // Toggle equipped status
    await ctx.db.patch(card._id, {
      equipped: !card.equipped,
      lastUsed: Date.now(),
    });

    return {
      success: true,
      equipped: !card.equipped,
    };
  },
});

/**
 * Get all Farcaster cards (leaderboard)
 */
export const getAllFarcasterCards = query({
  args: {},
  handler: async (ctx) => {
    const cards = await ctx.db
      .query("farcasterCards")
      .order("desc")
      .take(100); // Top 100

    return cards;
  },
});

/**
 * Get Farcaster cards by rarity
 */
export const getFarcasterCardsByRarity = query({
  args: {
    rarity: v.string(),
  },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("farcasterCards")
      .withIndex("by_rarity", (q) => q.eq("rarity", args.rarity))
      .collect();

    return cards;
  },
});
