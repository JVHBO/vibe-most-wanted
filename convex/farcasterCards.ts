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

    // Playing card properties
    suit: v.string(), // "hearts", "diamonds", "spades", "clubs"
    rank: v.string(), // "2"-"10", "J", "Q", "K", "A"
    suitSymbol: v.string(), // "♥", "♦", "♠", "♣"
    color: v.string(), // "red" or "black"

    // Generated image URL (from Nanobanana IA)
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    // Generate unique card ID with timestamp to allow multiple mints of same FID
    const timestamp = Date.now();
    const cardId = `farcaster_${args.fid}_${timestamp}`;

    // NOTE: Multiple mints of same FID are allowed
    // The smart contract handles uniqueness on-chain, Convex just stores metadata

    // Insert card (no uniqueness check - multiple mints allowed)
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
      status: "Rarity Assigned", // All Farcaster cards have rarity from Neynar score
      power: args.power,

      // Playing Card Properties
      suit: args.suit,
      rank: args.rank,
      suitSymbol: args.suitSymbol,
      color: args.color,

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
 * Get a specific Farcaster card by FID (first mint only)
 */
export const getFarcasterCardByFid = query({
  args: {
    fid: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all cards for this FID and return the most recent one
    const cards = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", args.fid))
      .collect();

    // Sort by creation time (most recent first) and return the first one
    const sortedCards = cards.sort((a, b) => b._creationTime - a._creationTime);
    return sortedCards[0] || null;
  },
});

/**
 * Get ALL Farcaster cards for a specific FID (all mints)
 */
export const getFarcasterCardsByFid = query({
  args: {
    fid: v.number(),
  },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", args.fid))
      .collect();

    // Sort manually by creation time (most recent first)
    return cards.sort((a, b) => b._creationTime - a._creationTime);
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
    // Get all cards and sort manually by creation time
    const allCards = await ctx.db
      .query("farcasterCards")
      .collect();

    // Sort by creation time (most recent first) and limit to 100
    return allCards
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 100);
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

/**
 * Get recent Farcaster cards (latest 20)
 */
export const getRecentFarcasterCards = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Get all cards and sort by creation time (most recent first)
    const allCards = await ctx.db
      .query("farcasterCards")
      .collect();

    // Sort by _creationTime in descending order (newest first)
    const sortedCards = allCards
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, limit);

    return sortedCards;
  },
});
