import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * VibeMail Notification for VBMS
 *
 * This file only contains the query needed for the red dot notification
 * on the VibeFID button. All other VibeMail/voting functionality has been
 * moved to VibeFID's own Convex deployment.
 *
 * The cardVotes table still exists and is written to by VibeFID,
 * VBMS just reads the unread count for the notification indicator.
 */

// Get unread message count for a card (used for red dot on VibeFID button)
export const getUnreadMessageCount = query({
  args: { cardFid: v.number() },
  handler: async (ctx, args) => {
    // Use index to get only unread for this card
    const unread = await ctx.db
      .query("cardVotes")
      .withIndex("by_card_unread", (q) =>
        q.eq("cardFid", args.cardFid).eq("isRead", false)
      )
      .filter((q) => q.neq(q.field("message"), undefined))
      .collect();

    return unread.length;
  },
});
