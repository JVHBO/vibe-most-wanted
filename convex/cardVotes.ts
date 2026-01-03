import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { createAuditLog } from "./coinAudit";
import { internal } from "./_generated/api";

/**
 * VibeFID Card Voting System
 *
 * Features:
 * - 1 free vote per day per user
 * - Paid votes (unlimited) cost 100 coins each
 * - Daily prize pool distributed to top voted card
 * - Vote history tracking
 */

// Get votes for a specific card
export const getCardVotes = query({
  args: { fid: v.number() },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];

    const votes = await ctx.db
      .query("cardVotes")
      .filter((q) => q.and(
        q.eq(q.field("cardFid"), args.fid),
        q.eq(q.field("date"), today)
      ))
      .collect();

    return {
      totalVotes: votes.reduce((sum, v) => sum + v.voteCount, 0),
      voterCount: votes.length,
    };
  },
});

// Check if user has voted for a card today
export const hasUserVoted = query({
  args: {
    cardFid: v.number(),
    voterFid: v.number(),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];

    const vote = await ctx.db
      .query("cardVotes")
      .filter((q) => q.and(
        q.eq(q.field("cardFid"), args.cardFid),
        q.eq(q.field("voterFid"), args.voterFid),
        q.eq(q.field("date"), today)
      ))
      .first();

    return !!vote;
  },
});

// Get user's remaining free votes for today
export const getUserFreeVotesRemaining = query({
  args: { voterFid: v.number() },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];

    const votesToday = await ctx.db
      .query("cardVotes")
      .filter((q) => q.and(
        q.eq(q.field("voterFid"), args.voterFid),
        q.eq(q.field("date"), today),
        q.eq(q.field("isPaid"), false)
      ))
      .collect();

    const freeVotesUsed = votesToday.length;
    const maxFreeVotes = 1;

    return {
      remaining: Math.max(0, maxFreeVotes - freeVotesUsed),
      used: freeVotesUsed,
      max: maxFreeVotes,
    };
  },
});

// Vote for a card (free or paid) with optional VibeMail message
export const voteForCard = mutation({
  args: {
    cardFid: v.number(),
    voterFid: v.number(),
    voterAddress: v.string(),
    isPaid: v.boolean(),
    voteCount: v.optional(v.number()), // For paid votes, can vote multiple times
    // VibeMail - Anonymous message with vote
    message: v.optional(v.string()), // Optional text message (max 200 chars)
    audioId: v.optional(v.string()), // Optional meme sound ID
    imageId: v.optional(v.string()), // Optional meme image ID
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();
    const voteCount = args.voteCount || 1;

    // Cannot vote for your own card
    if (args.voterFid === args.cardFid) {
      return { success: false, error: "Cannot vote for your own card" };
    }

    // Check if already voted today (for free votes)
    if (!args.isPaid) {
      const existingVote = await ctx.db
        .query("cardVotes")
        .filter((q) => q.and(
          q.eq(q.field("cardFid"), args.cardFid),
          q.eq(q.field("voterFid"), args.voterFid),
          q.eq(q.field("date"), today)
        ))
        .first();

      if (existingVote) {
        return { success: false, error: "Already voted for this card today" };
      }

      // Check free votes remaining
      const votesToday = await ctx.db
        .query("cardVotes")
        .filter((q) => q.and(
          q.eq(q.field("voterFid"), args.voterFid),
          q.eq(q.field("date"), today),
          q.eq(q.field("isPaid"), false)
        ))
        .collect();

      if (votesToday.length >= 1) {
        return { success: false, error: "No free votes remaining today" };
      }
    }

    // For paid votes, deduct coins
    if (args.isPaid) {
      const costPerVote = 100;
      const totalCost = costPerVote * voteCount;

      // Find user profile by address
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", args.voterAddress.toLowerCase()))
        .first();

      if (!profile) {
        return { success: false, error: "Profile not found" };
      }

      const currentCoins = profile.coins || 0;
      if (currentCoins < totalCost) {
        return { success: false, error: `Not enough coins. Need ${totalCost}, have ${currentCoins}` };
      }

      // Deduct coins
      await ctx.db.patch(profile._id, {
        coins: currentCoins - totalCost,
      });
    }

    // Record the vote with optional VibeMail message
    const hasMessage = args.message && args.message.trim().length > 0;
    const hasContent = hasMessage || args.imageId; // Message or image counts as VibeMail
    await ctx.db.insert("cardVotes", {
      cardFid: args.cardFid,
      voterFid: args.voterFid,
      voterAddress: args.voterAddress.toLowerCase(),
      date: today,
      isPaid: args.isPaid,
      voteCount: voteCount,
      createdAt: now,
      // VibeMail fields
      message: hasMessage && args.message ? args.message.slice(0, 200) : undefined,
      audioId: hasContent ? args.audioId : undefined,
      imageId: args.imageId || undefined,
      isRead: hasContent ? false : undefined,
    });

    // Update daily leaderboard
    await updateDailyLeaderboard(ctx, args.cardFid, today, voteCount);

    // 💌 Send VibeMail notification if there's a message or image
    if (hasContent) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendVibemailNotification, {
        recipientFid: args.cardFid,
        hasAudio: !!args.audioId,
      });
    }

    // Update vibeRewards for card owner (100 VBMS per vote)
    const vbmsReward = voteCount * 100;
    const existingReward = await ctx.db
      .query("vibeRewards")
      .withIndex("by_fid", (q) => q.eq("fid", args.cardFid))
      .first();

    if (existingReward) {
      await ctx.db.patch(existingReward._id, {
        pendingVbms: existingReward.pendingVbms + vbmsReward,
        totalVotes: existingReward.totalVotes + voteCount,
        lastVoteAt: now,
      });
    } else {
      await ctx.db.insert("vibeRewards", {
        fid: args.cardFid,
        pendingVbms: vbmsReward,
        claimedVbms: 0,
        totalVotes: voteCount,
        lastVoteAt: now,
      });
    }

    return { success: true, voteCount };
  },
});

// Helper to update daily leaderboard
async function updateDailyLeaderboard(ctx: any, cardFid: number, date: string, voteCount: number) {
  const existing = await ctx.db
    .query("dailyVoteLeaderboard")
    .filter((q: any) => q.and(
      q.eq(q.field("cardFid"), cardFid),
      q.eq(q.field("date"), date)
    ))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      totalVotes: existing.totalVotes + voteCount,
      lastUpdated: Date.now(),
    });
  } else {
    // Get card info
    const card = await ctx.db
      .query("farcasterCards")
      .filter((q: any) => q.eq(q.field("fid"), cardFid))
      .first();

    await ctx.db.insert("dailyVoteLeaderboard", {
      cardFid,
      username: card?.username || `FID ${cardFid}`,
      displayName: card?.displayName || "",
      pfpUrl: card?.pfpUrl || "",
      totalVotes: voteCount,
      date,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });
  }
}

// Get today's vote leaderboard
export const getDailyLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];
    const limit = args.limit || 10;

    const leaders = await ctx.db
      .query("dailyVoteLeaderboard")
      .filter((q) => q.eq(q.field("date"), today))
      .collect();

    // Sort by votes and take top N
    return leaders
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, limit);
  },
});

// Get daily prize pool info
export const getDailyPrizeInfo = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];

    // Count paid votes today (each paid vote adds to prize pool)
    const paidVotes = await ctx.db
      .query("cardVotes")
      .filter((q) => q.and(
        q.eq(q.field("date"), today),
        q.eq(q.field("isPaid"), true)
      ))
      .collect();

    const totalPaidVotes = paidVotes.reduce((sum, v) => sum + v.voteCount, 0);
    const prizePool = totalPaidVotes * 50; // 50% of vote cost goes to prize pool

    // Get current leader
    const leaders = await ctx.db
      .query("dailyVoteLeaderboard")
      .filter((q) => q.eq(q.field("date"), today))
      .collect();

    const topLeader = leaders.sort((a, b) => b.totalVotes - a.totalVotes)[0];

    return {
      prizePool,
      totalPaidVotes,
      currentLeader: topLeader || null,
      endsAt: getEndOfDayTimestamp(),
    };
  },
});

// Get past winners
export const getPastWinners = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 7;

    const winners = await ctx.db
      .query("dailyPrizeWinners")
      .order("desc")
      .take(limit);

    return winners;
  },
});

// Helper to get end of day timestamp
function getEndOfDayTimestamp(): number {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return endOfDay.getTime();
}

// Reset all votes (admin/dev only)
export const resetAllVotes = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all cardVotes
    const votes = await ctx.db.query("cardVotes").collect();
    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Delete all daily leaderboard entries
    const leaderboard = await ctx.db.query("dailyVoteLeaderboard").collect();
    for (const entry of leaderboard) {
      await ctx.db.delete(entry._id);
    }

    return {
      success: true,
      deletedVotes: votes.length,
      deletedLeaderboard: leaderboard.length,
    };
  },
});

// Distribute daily prize (called by cron job)
export const distributeDailyPrize = mutation({
  args: {},
  handler: async (ctx) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().split('T')[0];

    // Check if already distributed
    const existingWinner = await ctx.db
      .query("dailyPrizeWinners")
      .filter((q) => q.eq(q.field("date"), date))
      .first();

    if (existingWinner) {
      return { success: false, error: "Prize already distributed for this date" };
    }

    // Get top voted card for yesterday
    const leaders = await ctx.db
      .query("dailyVoteLeaderboard")
      .filter((q) => q.eq(q.field("date"), date))
      .collect();

    if (leaders.length === 0) {
      return { success: false, error: "No votes recorded for this date" };
    }

    const winner = leaders.sort((a, b) => b.totalVotes - a.totalVotes)[0];

    // Calculate prize pool
    const paidVotes = await ctx.db
      .query("cardVotes")
      .filter((q) => q.and(
        q.eq(q.field("date"), date),
        q.eq(q.field("isPaid"), true)
      ))
      .collect();

    const totalPaidVotes = paidVotes.reduce((sum, v) => sum + v.voteCount, 0);
    const prizePool = totalPaidVotes * 50;

    // Find winner's card to get their address
    const winnerCard = await ctx.db
      .query("farcasterCards")
      .filter((q) => q.eq(q.field("fid"), winner.cardFid))
      .first();

    if (winnerCard && prizePool > 0) {
      // Add prize to winner's coins
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", winnerCard.address.toLowerCase()))
        .first();

      if (profile) {
        const balanceBefore = profile.coins || 0;
        const balanceAfter = balanceBefore + prizePool;
        await ctx.db.patch(profile._id, {
          coins: balanceAfter,
          // 🔒 SECURITY FIX (2026-01-01): Track lifetimeEarned
          lifetimeEarned: (profile.lifetimeEarned || 0) + prizePool,
        });
        // 🔒 AUDIT LOG
        await createAuditLog(ctx, profile.address, "earn", prizePool, balanceBefore, balanceAfter, "cardVotes:distributeDailyPrize");
        // 📊 Log transaction for history
        await ctx.db.insert("coinTransactions", {
          address: profile.address.toLowerCase(),
          type: "earn",
          amount: prizePool,
          source: "leaderboard",
          description: "Card voting prize - Top voter reward",
          balanceBefore,
          balanceAfter,
          timestamp: Date.now(),
        });
      }
    }

    // Record winner
    await ctx.db.insert("dailyPrizeWinners", {
      date,
      cardFid: winner.cardFid,
      username: winner.username,
      displayName: winner.displayName,
      pfpUrl: winner.pfpUrl,
      totalVotes: winner.totalVotes,
      prizeAmount: prizePool,
      createdAt: Date.now(),
    });

    return {
      success: true,
      winner: winner.username,
      prize: prizePool,
      votes: winner.totalVotes,
    };
  },
});

// ============================================================================
// VIBEMAIL - Anonymous messages with votes
// ============================================================================

// Get all messages for a card (inbox)
export const getMessagesForCard = query({
  args: {
    cardFid: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get all votes with messages for this card
    const allVotes = await ctx.db
      .query("cardVotes")
      .filter((q) => q.eq(q.field("cardFid"), args.cardFid))
      .order("desc")
      .collect();

    // Filter to only votes with messages
    const messages = allVotes
      .filter(v => v.message !== undefined)
      .slice(0, limit);

    return messages.map(m => ({
      _id: m._id,
      message: m.message,
      audioId: m.audioId,
      isRead: m.isRead ?? false,
      createdAt: m.createdAt,
      voteCount: m.voteCount,
      isPaid: m.isPaid,
    }));
  },
});

// Mark a message as read
export const markMessageAsRead = mutation({
  args: { messageId: v.id("cardVotes") },
  handler: async (ctx, args) => {
    const vote = await ctx.db.get(args.messageId);
    if (!vote || !vote.message) {
      return { success: false, error: "Message not found" };
    }

    await ctx.db.patch(args.messageId, { isRead: true });
    return { success: true };
  },
});

// Get unread message count for a card
export const getUnreadMessageCount = query({
  args: { cardFid: v.number() },
  handler: async (ctx, args) => {
    // Get all votes for this card
    const allVotes = await ctx.db
      .query("cardVotes")
      .filter((q) => q.eq(q.field("cardFid"), args.cardFid))
      .collect();

    // Count unread messages
    const unread = allVotes.filter(v =>
      v.message !== undefined && v.isRead === false
    );

    return unread.length;
  },
});


// ============================================================================
// ADMIN: Broadcast VibeMail to multiple FIDs
// ============================================================================

export const broadcastVibeMail = mutation({
  args: {
    recipientFids: v.array(v.number()), // List of FIDs to send to
    message: v.string(),
    audioId: v.optional(v.string()),
    senderFid: v.optional(v.number()), // Admin sender FID (default: 0 for system)
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const senderFid = args.senderFid || 0; // 0 = system message

    const results = [];

    for (const recipientFid of args.recipientFids) {
      try {
        // Insert VibeMail directly (no vote restrictions)
        await ctx.db.insert("cardVotes", {
          cardFid: recipientFid,
          voterFid: senderFid,
          voterAddress: "0x0000000000000000000000000000000000000000", // System address
          date: today,
          createdAt: now,
          voteCount: 0, // No vote, just message
          isPaid: false,
          message: args.message.slice(0, 1000), // Increased limit for system messages
          audioId: args.audioId,
          isRead: false,
        });

        // Send notification
        await ctx.scheduler.runAfter(0, internal.notifications.sendVibemailNotification, {
          recipientFid,
          hasAudio: !!args.audioId,
        });

        results.push({ fid: recipientFid, success: true });
      } catch (error: any) {
        results.push({ fid: recipientFid, success: false, error: error.message });
      }
    }

    return {
      success: true,
      total: args.recipientFids.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  },
});

// Get recent VibeMail messages for background display (for specific user)
export const getRecentVibeMails = query({
  args: {
    cardFid: v.optional(v.number()), // Filter by recipient FID
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 6;

    // If cardFid provided, get messages for that user only
    if (args.cardFid) {
      const cardFid = args.cardFid;
      const messages = await ctx.db
        .query("cardVotes")
        .withIndex("by_card_date", (q) => q.eq("cardFid", cardFid))
        .filter((q) => q.neq(q.field("message"), undefined))
        .collect();

      const sorted = messages
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, limit);

      return sorted.map(m => ({
        _id: m._id,
        message: m.message?.slice(0, 50),
        cardFid: m.cardFid,
        voterFid: m.voterFid,
        createdAt: m.createdAt,
      }));
    }

    // Fallback: get all recent messages
    const allMessages = await ctx.db
      .query("cardVotes")
      .filter((q) => q.neq(q.field("message"), undefined))
      .collect();

    const sorted = allMessages
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);

    return sorted.map(m => ({
      _id: m._id,
      message: m.message?.slice(0, 50),
      cardFid: m.cardFid,
      voterFid: m.voterFid,
      createdAt: m.createdAt,
    }));
  },
});

// Get sent messages by a user (voterFid)
export const getSentMessages = query({
  args: {
    voterFid: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    // Get all votes sent by this user that have messages
    const allVotes = await ctx.db
      .query("cardVotes")
      .withIndex("by_voter_date", (q) => q.eq("voterFid", args.voterFid))
      .collect();

    // Filter to only votes with messages and sort by creation time
    const messages = allVotes
      .filter(v => v.message !== undefined && v.isSent !== false)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);

    // Get recipient info for each message
    const messagesWithRecipients = await Promise.all(
      messages.map(async (m) => {
        // Get recipient card info
        const recipientCard = await ctx.db
          .query("farcasterCards")
          .withIndex("by_fid", (q) => q.eq("fid", m.cardFid))
          .first();

        return {
          _id: m._id,
          message: m.message,
          audioId: m.audioId,
          imageId: m.imageId,
          recipientFid: m.cardFid,
          recipientUsername: recipientCard?.username || m.recipientUsername || `FID ${m.cardFid}`,
          recipientPfpUrl: recipientCard?.pfpUrl || "",
          createdAt: m.createdAt,
          voteCount: m.voteCount,
          isPaid: m.isPaid,
        };
      })
    );

    return messagesWithRecipients;
  },
});

// Search cards for VibeMail recipient
export const searchCardsForVibeMail = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;
    const searchLower = args.searchTerm.toLowerCase();

    // Search by username
    const allCards = await ctx.db
      .query("farcasterCards")
      .collect();

    const matches = allCards
      .filter(card =>
        card.username.toLowerCase().includes(searchLower) ||
        card.fid.toString() === args.searchTerm
      )
      .slice(0, limit)
      .map(card => ({
        fid: card.fid,
        username: card.username,
        pfpUrl: card.pfpUrl,
      }));

    return matches;
  },
});

// Send direct VibeMail to a card
export const sendDirectVibeMail = mutation({
  args: {
    recipientFid: v.number(),
    senderFid: v.number(),
    senderAddress: v.string(),
    message: v.string(),
    audioId: v.optional(v.string()),
    imageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Cannot send to yourself
    if (args.senderFid === args.recipientFid) {
      throw new Error("Cannot send VibeMail to yourself");
    }

    // Get recipient card info
    const recipientCard = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", args.recipientFid))
      .first();

    if (!recipientCard) {
      throw new Error("Recipient card not found");
    }

    // Insert as a vote with message (free vote with VibeMail)
    await ctx.db.insert("cardVotes", {
      cardFid: args.recipientFid,
      voterFid: args.senderFid,
      voterAddress: args.senderAddress.toLowerCase(),
      date: today,
      isPaid: false,
      voteCount: 1,
      createdAt: now,
      message: args.message.slice(0, 200),
      audioId: args.audioId,
      imageId: args.imageId,
      isRead: false,
      isSent: true,
      recipientFid: args.recipientFid,
      recipientUsername: recipientCard.username,
    });

    // Give 100 VBMS to recipient
    const existingReward = await ctx.db
      .query("vibeRewards")
      .withIndex("by_fid", (q) => q.eq("fid", args.recipientFid))
      .first();

    if (existingReward) {
      await ctx.db.patch(existingReward._id, {
        pendingVbms: existingReward.pendingVbms + 100,
        totalVotes: existingReward.totalVotes + 1,
        lastVoteAt: now,
      });
    } else {
      await ctx.db.insert("vibeRewards", {
        fid: args.recipientFid,
        pendingVbms: 100,
        claimedVbms: 0,
        totalVotes: 1,
        lastVoteAt: now,
      });
    }

    return { success: true };
  },
});

// Reply to a VibeMail message
export const replyToMessage = mutation({
  args: {
    originalMessageId: v.id("cardVotes"),
    senderFid: v.number(),
    senderAddress: v.string(),
    message: v.string(),
    audioId: v.optional(v.string()),
    imageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // Get original message
    const originalMessage = await ctx.db.get(args.originalMessageId);
    if (!originalMessage) {
      throw new Error("Original message not found");
    }

    // Reply goes to the original sender (voterFid)
    const recipientFid = originalMessage.voterFid;

    // Cannot reply to yourself
    if (args.senderFid === recipientFid) {
      throw new Error("Cannot reply to yourself");
    }

    // Get recipient card info
    const recipientCard = await ctx.db
      .query("farcasterCards")
      .withIndex("by_fid", (q) => q.eq("fid", recipientFid))
      .first();

    // Insert reply as a new vote/message
    await ctx.db.insert("cardVotes", {
      cardFid: recipientFid,
      voterFid: args.senderFid,
      voterAddress: args.senderAddress.toLowerCase(),
      date: today,
      isPaid: false,
      voteCount: 1,
      createdAt: now,
      message: args.message.slice(0, 200),
      audioId: args.audioId,
      imageId: args.imageId,
      isRead: false,
      isSent: true,
      recipientFid: recipientFid,
      recipientUsername: recipientCard?.username || `FID ${recipientFid}`,
    });

    // Give 100 VBMS to recipient
    const existingReward = await ctx.db
      .query("vibeRewards")
      .withIndex("by_fid", (q) => q.eq("fid", recipientFid))
      .first();

    if (existingReward) {
      await ctx.db.patch(existingReward._id, {
        pendingVbms: existingReward.pendingVbms + 100,
        totalVotes: existingReward.totalVotes + 1,
        lastVoteAt: now,
      });
    } else {
      await ctx.db.insert("vibeRewards", {
        fid: recipientFid,
        pendingVbms: 100,
        claimedVbms: 0,
        totalVotes: 1,
        lastVoteAt: now,
      });
    }

    return { success: true };
  },
});
