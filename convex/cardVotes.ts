import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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
    // Use index to get only unread for this card
    // 🚀 BANDWIDTH FIX: Added .take() limit - most users have <10 unread
    const unread = await ctx.db
      .query("cardVotes")
      .withIndex("by_card_unread", (q) =>
        q.eq("cardFid", args.cardFid).eq("isRead", false)
      )
      .filter((q) => q.neq(q.field("message"), undefined))
      .take(100); // Cap at 100 for notification badge

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

// Claim a quest mail item reward (200 VBMS per item, on-chain TX done client-side)
export const claimQuestMailReward = mutation({
  args: {
    messageId: v.id("cardVotes"),
    claimerFid: v.number(),
    claimerAddress: v.string(),
    questIndex: v.number(),
  },
  handler: async (ctx, args) => {
    // Idempotency check
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

    // Award 200 VBMS (on-chain ARB TX is done client-side via validateOnArb)
    await ctx.scheduler.runAfter(0, internal.economy.addCoins, {
      address: args.claimerAddress,
      amount: 200,
      reason: `Quest VibeMail reward (item #${args.questIndex})`,
    });
  },
});
