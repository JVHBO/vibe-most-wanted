import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * VibeMail Notification for VBMS
 *
 * The cardVotes table still exists and is written to by VibeFID,
 * VBMS just reads the unread count for the notification indicator.
 * Quest VibeMail claim mutations also live here.
 */

// Get unread message count for a card (used for red dot on VibeFID button)
export const getUnreadMessageCount = query({
  args: { cardFid: v.number() },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("cardVotes")
      .withIndex("by_card_unread", (q) =>
        q.eq("cardFid", args.cardFid).eq("isRead", false)
      )
      .filter((q) => q.neq(q.field("message"), undefined))
      .take(100);

    return unread.length;
  },
});

// Get quest mail item claims for a message+claimer (for UI state)
export const getQuestMailClaims = query({
  args: {
    messageId: v.id("cardVotes"),
    claimerFid: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("questMailItemClaims")
      .withIndex("by_message_claimer", (q) =>
        q.eq("messageId", args.messageId).eq("claimerFid", args.claimerFid)
      )
      .collect();
  },
});

// Internal: get message for claim validation (used by vbmsClaim actions)
export const getMessageForClaim = internalQuery({
  args: { messageId: v.id("cardVotes") },
  handler: async (ctx, { messageId }) => {
    return await ctx.db.get(messageId);
  },
});

// Internal: record claim (called by claimQuestMailVBMS action in vbmsClaim.ts)
export const recordQuestMailClaim = internalMutation({
  args: {
    messageId: v.id("cardVotes"),
    claimerFid: v.number(),
    claimerAddress: v.string(),
    questIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("questMailItemClaims")
      .withIndex("by_message_claimer", (q) =>
        q.eq("messageId", args.messageId).eq("claimerFid", args.claimerFid)
      )
      .filter((q) => q.eq(q.field("questIndex"), args.questIndex))
      .first();

    if (existing) throw new Error("Already claimed");

    await ctx.db.insert("questMailItemClaims", {
      messageId: args.messageId,
      claimerFid: args.claimerFid,
      claimerAddress: args.claimerAddress,
      questIndex: args.questIndex,
      claimedAt: Date.now(),
    });
  },
});

// Internal: record receipt claim in vibeMailQuestClaims
export const recordReceiptClaim = internalMutation({
  args: { messageId: v.string(), claimerAddress: v.string() },
  handler: async (ctx, { messageId, claimerAddress }) => {
    const existing = await ctx.db
      .query("vibeMailQuestClaims")
      .withIndex("by_address_mailid", (q) =>
        q.eq("address", claimerAddress.toLowerCase()).eq("vibemailId", messageId)
      )
      .first();
    if (existing) throw new Error("Already claimed");
    await ctx.db.insert("vibeMailQuestClaims", {
      address: claimerAddress.toLowerCase(),
      vibemailId: messageId,
      claimedAt: Date.now(),
    });
  },
});
