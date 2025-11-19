import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * ADMIN: Manually add metadata for an already-minted NFT
 * Use this when NFT was minted on-chain but Convex save failed
 */
export const addMintedCardMetadata = mutation({
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
