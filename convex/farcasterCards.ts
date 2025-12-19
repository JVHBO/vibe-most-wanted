import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

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

    // Generated image URLs
    imageUrl: v.string(), // Video (MP4)
    cardImageUrl: v.optional(v.string()), // Static PNG for sharing
    shareImageUrl: v.optional(v.string()), // Share image with card + criminal text

    // Contract
    contractAddress: v.optional(v.string()), // NFT contract address
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    // CRITICAL FIX: Check if FID already exists to prevent orphan duplicates
    const existingCards = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", args.fid))
      .collect();

    if (existingCards.length > 0) {
      console.error(`❌ DUPLICATE PREVENTION: FID ${args.fid} already exists in database!`);
      console.error(`   Existing cards: ${existingCards.length}`);
      existingCards.forEach((card, idx) => {
        console.error(`   ${idx + 1}. ${card.rank}${card.suitSymbol} (${card.rarity}) - ID: ${card._id}`);
      });

      throw new Error(
        `FID ${args.fid} already minted! Each FID can only be minted once. ` +
        `If you believe this is an error, please contact support.`
      );
    }

    // Generate unique card ID with timestamp
    const timestamp = Date.now();
    const cardId = `farcaster_${args.fid}_${timestamp}`;

    // Smart contract ensures 1 mint per FID on-chain
    // This check prevents orphan database entries from bugs/race conditions

    // Insert card (now protected against duplicates)
    const cardDocId = await ctx.db.insert("farcasterCards", {
      // Farcaster Data
      fid: args.fid,
      username: args.username,
      displayName: args.displayName,
      pfpUrl: args.pfpUrl,
      bio: args.bio.slice(0, 200), // Truncate bio

      // Owner
      address: normalizedAddress,

      // Contract
      contractAddress: args.contractAddress,

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

      // Generated Images
      imageUrl: args.imageUrl, // Video (MP4)
      cardImageUrl: args.cardImageUrl, // Static PNG for sharing
      shareImageUrl: args.shareImageUrl, // Share image with card + criminal text

      // Game State
      equipped: false,

      // Metadata
      mintedAt: Date.now(),
    });

    console.log(`✅ Farcaster card minted: FID ${args.fid} (${args.rarity}) by ${normalizedAddress}`);

    // Mark VibeFID minted mission as completed (one-time reward)
    try {
      await ctx.scheduler.runAfter(0, internal.missions.markVibeFIDMinted, {
        playerAddress: normalizedAddress,
      });
    } catch (error) {
      console.error("Failed to mark VibeFID mission:", error);
    }

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

    // Sort by creation time (most recent first) - show all cards
    return allCards.sort((a, b) => b._creationTime - a._creationTime);
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
 * Delete all old VibeFID cards from previous contracts
 * (cards without contractAddress or with old contract addresses)
 */
export const deleteAllOldVibeFIDCards = mutation({
  args: {},
  handler: async (ctx) => {
    const VIBEFID_CURRENT_CONTRACT = "0x60274A138d026E3cB337B40567100FdEC3127565";

    // Get all cards
    const allCards = await ctx.db
      .query("farcasterCards")
      .collect();

    let deletedCount = 0;

    // Delete cards that are NOT from the current VibeFID contract
    for (const card of allCards) {
      const isCurrentContract = card.contractAddress?.toLowerCase() === VIBEFID_CURRENT_CONTRACT.toLowerCase();

      if (!isCurrentContract) {
        await ctx.db.delete(card._id);
        deletedCount++;
      }
    }

    console.log(`🗑️ Deleted ${deletedCount} old VibeFID cards from previous contracts`);

    return {
      success: true,
      deletedCount,
    };
  },
});

/**
 * Delete specific orphan cards by Doc ID (for cleanup)
 * SAFE: Only deletes cards you explicitly specify
 */
export const deleteOrphanCardById = mutation({
  args: {
    docId: v.id("farcasterCards"),
  },
  handler: async (ctx, args) => {
    // Get the card to verify it exists
    const card = await ctx.db.get(args.docId);

    if (!card) {
      throw new Error(`Card with ID ${args.docId} not found`);
    }

    console.log(`🗑️  Deleting orphan card: FID ${card.fid} (@${card.username}) - ${card.rank}${card.suitSymbol}`);

    // Delete the card
    await ctx.db.delete(args.docId);

    return {
      success: true,
      deleted: {
        fid: card.fid,
        username: card.username,
        rank: card.rank,
        suit: card.suitSymbol,
      },
    };
  },
});

/**
 * Get recent Farcaster cards (latest 20)
 * Shows all cards until old cards from previous contracts are manually deleted
 */
export const getRecentFarcasterCards = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Get all cards (mixed contracts)
    // After running deleteAllOldVibeFIDCards, only current contract cards will remain
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
