import { v } from "convex/values";
import { internalMutation, query, internalQuery } from "./_generated/server";

/**
 * ADMIN: Manually add metadata for an already-minted NFT
 * Use this when NFT was minted on-chain but Convex save failed
 */
export const addMintedCardMetadata = internalMutation({
  args: {
    // Farcaster Data
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

    // Card traits
    rarity: v.string(),
    foil: v.string(),
    wear: v.string(),
    power: v.number(),

    // Playing card properties
    suit: v.string(),
    rank: v.string(),
    suitSymbol: v.string(),
    color: v.string(),

    // IPFS URL from the on-chain NFT
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    // Check if already exists
    const existing = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", args.fid))
      .first();

    if (existing) {
      throw new Error(`Card for FID ${args.fid} already exists in Convex`);
    }

    // Generate card ID
    const timestamp = Date.now();
    const cardId = `farcaster_${args.fid}_${timestamp}`;

    // Insert card metadata
    await ctx.db.insert("farcasterCards", {
      fid: args.fid,
      username: args.username,
      displayName: args.displayName,
      pfpUrl: args.pfpUrl,
      bio: args.bio.slice(0, 200),
      address: normalizedAddress,
      cardId,
      rarity: args.rarity,
      foil: args.foil,
      wear: args.wear,
      status: "Rarity Assigned",
      power: args.power,
      suit: args.suit,
      rank: args.rank,
      suitSymbol: args.suitSymbol,
      color: args.color,
      neynarScore: args.neynarScore,
      followerCount: args.followerCount,
      followingCount: args.followingCount,
      powerBadge: args.powerBadge,
      imageUrl: args.imageUrl,
      equipped: false,
      mintedAt: timestamp,
    });

    console.log(`✅ Added metadata for already-minted FID ${args.fid}`);

    return {
      success: true,
      message: `Metadata added for FID ${args.fid}`,
    };
  },
});

/**
 * ADMIN: Update card traits and images for existing card
 */
export const updateCardTraits = internalMutation({
  args: {
    fid: v.number(),
    foil: v.optional(v.string()),
    wear: v.optional(v.string()),
    power: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    cardImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", args.fid))
      .collect();

    if (cards.length === 0) {
      throw new Error(`No card found for FID ${args.fid}`);
    }

    const card = cards.sort((a, b) => b._creationTime - a._creationTime)[0];

    const updates: Record<string, any> = {};
    if (args.foil !== undefined) updates.foil = args.foil;
    if (args.wear !== undefined) updates.wear = args.wear;
    if (args.power !== undefined) updates.power = args.power;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.cardImageUrl !== undefined) updates.cardImageUrl = args.cardImageUrl;

    await ctx.db.patch(card._id, updates);

    console.log(`Updated FID ${args.fid}:`, updates);

    return { success: true, fid: args.fid, updates };
  },
});

/**
 * ADMIN: List ALL minted cards (no limit)
 * Used for cleanup scripts to compare against IPFS bucket
 */
/**
 * 🚀 BANDWIDTH FIX: Converted to internalQuery (not public)
 * Use via: npx convex run farcasterCardsAdmin:listAllMintedCards --env-file .env.prod
 */
export const listAllMintedCards = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cards = await ctx.db
      .query("farcasterCards")
      .collect();

    // Return only the fields needed for IPFS comparison
    return cards.map(card => ({
      fid: card.fid,
      imageUrl: card.imageUrl,
      cardImageUrl: card.cardImageUrl,
      shareImageUrl: card.shareImageUrl,
    }));
  },
});
