import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * NFT Gift System
 *
 * Allows users to gift NFTs from LTC collections via VibeMail.
 * The on-chain transfer is done by the frontend (user signs the TX),
 * and then this mutation records the gift in Convex.
 */

// Record a new NFT gift (called after on-chain transfer)
export const recordNFTGift = mutation({
  args: {
    senderFid: v.number(),
    senderAddress: v.string(),
    recipientFid: v.number(),
    recipientAddress: v.string(),
    contractAddress: v.string(),
    collectionId: v.string(),
    collectionName: v.string(),
    tokenId: v.string(),
    nftName: v.optional(v.string()),
    nftImageUrl: v.optional(v.string()),
    txHash: v.string(),
    messageId: v.optional(v.id("cardVotes")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if gift with this txHash already exists (prevent duplicates)
    const existing = await ctx.db
      .query("nftGifts")
      .withIndex("by_txHash", (q) => q.eq("txHash", args.txHash))
      .first();

    if (existing) {
      return { success: false, error: "Gift already recorded", giftId: existing._id };
    }

    // Insert the gift record
    const giftId = await ctx.db.insert("nftGifts", {
      senderFid: args.senderFid,
      senderAddress: args.senderAddress.toLowerCase(),
      recipientFid: args.recipientFid,
      recipientAddress: args.recipientAddress.toLowerCase(),
      contractAddress: args.contractAddress.toLowerCase(),
      collectionId: args.collectionId,
      collectionName: args.collectionName,
      tokenId: args.tokenId,
      nftName: args.nftName,
      nftImageUrl: args.nftImageUrl,
      txHash: args.txHash,
      messageId: args.messageId,
      status: "confirmed", // Assume confirmed since we're called after TX success
      createdAt: now,
      confirmedAt: now,
    });

    return { success: true, giftId };
  },
});

// Get gifts sent by a user
export const getSentGifts = query({
  args: {
    senderFid: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const gifts = await ctx.db
      .query("nftGifts")
      .withIndex("by_sender", (q) => q.eq("senderFid", args.senderFid))
      .order("desc")
      .take(limit);

    // Enrich with recipient info
    const enriched = await Promise.all(
      gifts.map(async (gift) => {
        const recipientCard = await ctx.db
          .query("farcasterCards")
          .withIndex("by_fid", (q) => q.eq("fid", gift.recipientFid))
          .first();

        return {
          ...gift,
          recipientUsername: recipientCard?.username || `FID ${gift.recipientFid}`,
          recipientPfpUrl: recipientCard?.pfpUrl || "",
        };
      })
    );

    return enriched;
  },
});

// Get gifts received by a user
export const getReceivedGifts = query({
  args: {
    recipientFid: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const gifts = await ctx.db
      .query("nftGifts")
      .withIndex("by_recipient", (q) => q.eq("recipientFid", args.recipientFid))
      .order("desc")
      .take(limit);

    // Enrich with sender info
    const enriched = await Promise.all(
      gifts.map(async (gift) => {
        const senderCard = await ctx.db
          .query("farcasterCards")
          .withIndex("by_fid", (q) => q.eq("fid", gift.senderFid))
          .first();

        return {
          ...gift,
          senderUsername: senderCard?.username || `FID ${gift.senderFid}`,
          senderPfpUrl: senderCard?.pfpUrl || "",
        };
      })
    );

    return enriched;
  },
});

// Get unread gift count for a user
export const getUnreadGiftCount = query({
  args: { recipientFid: v.number() },
  handler: async (ctx, args) => {
    // Count gifts that might be "unread" (recent ones from last 7 days)
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const recentGifts = await ctx.db
      .query("nftGifts")
      .withIndex("by_recipient", (q) => q.eq("recipientFid", args.recipientFid))
      .filter((q) => q.gt(q.field("createdAt"), oneWeekAgo))
      .collect();

    return recentGifts.length;
  },
});
