import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Force end an auction by setting its end time to now
 * This will make the cron pick it up on next run
 */
export const forceEndAuction = internalMutation({
  args: { auctionId: v.string() },
  handler: async (ctx, { auctionId }) => {
    const auction = await ctx.db.get(auctionId as Id<"castAuctions">);
    if (!auction) throw new Error("Auction not found");
    if (auction.status !== "bidding") throw new Error("Auction is not in bidding status");

    const now = Date.now();
    await ctx.db.patch(auction._id, {
      auctionEndsAt: now - 1000, // Set to 1 second ago
    });

    console.log(`[ADMIN] Forced end auction ${auctionId} - will be processed by next cron`);
    return { success: true, auctionId, newEndTime: now - 1000 };
  },
});

/**
 * Manually add a cast to featuredCasts from an active auction
 */
export const addMissingFeaturedCast = internalMutation({
  args: { auctionId: v.string() },
  handler: async (ctx, { auctionId }) => {
    const auction = await ctx.db.get(auctionId as Id<"castAuctions">);
    if (!auction) throw new Error("Auction not found");
    if (auction.status !== "active") throw new Error("Auction is not active");
    if (!auction.castHash || !auction.warpcastUrl) throw new Error("Auction has no cast data");

    const now = Date.now();

    // Check if already in featuredCasts
    const existing = await ctx.db
      .query("featuredCasts")
      .filter((q) => q.eq(q.field("castHash"), auction.castHash))
      .first();

    if (existing) {
      // Update it
      await ctx.db.patch(existing._id, {
        active: true,
        addedAt: now,
        auctionId: auction._id,
        warpcastUrl: auction.warpcastUrl,
      });
      console.log(`[ADMIN] Updated existing featuredCast for ${auction.castHash}`);
      return { success: true, action: "updated", castHash: auction.castHash };
    }

    // Find available slot (100, 101) - always 2 slots max
    const allSlots = await ctx.db
      .query("featuredCasts")
      .filter((q) =>
        q.and(
          q.gte(q.field("order"), 100),
          q.lte(q.field("order"), 101)
        )
      )
      .collect();

    const usedOrders = allSlots.map(s => s.order);
    const targetOrder = [100, 101].find(o => !usedOrders.includes(o));

    if (targetOrder !== undefined) {
      // Create new slot
      await ctx.db.insert("featuredCasts", {
        castHash: auction.castHash,
        warpcastUrl: auction.warpcastUrl,
        order: targetOrder,
        active: true,
        addedAt: now,
        auctionId: auction._id,
      });
      console.log(`[ADMIN] Created new featuredCast at slot ${targetOrder} for ${auction.castHash}`);
      return { success: true, action: "created", slot: targetOrder, castHash: auction.castHash };
    }

    // All 2 slots exist - replace oldest
    allSlots.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
    const oldest = allSlots[0];

    await ctx.db.patch(oldest._id, {
      castHash: auction.castHash,
      warpcastUrl: auction.warpcastUrl,
      active: true,
      addedAt: now,
      auctionId: auction._id,
    });

    console.log(`[ADMIN] Replaced oldest slot ${oldest.order} with ${auction.castHash}`);
    return { success: true, action: "replaced", slot: oldest.order, castHash: auction.castHash };
  },
});

/**
 * Force process auction lifecycle NOW (for testing)
 */
export const forceProcessLifecycle = internalMutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.castAuctions.processAuctionLifecycle, {});
    return { success: true, message: "Scheduled processAuctionLifecycle to run immediately" };
  },
});

/**
 * Clean up empty bidding auctions and complete old active auctions
 */
export const cleanupAuctions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deletedEmpty = 0;
    let completedActive = 0;

    // 1. Delete empty bidding auctions (no bids, no cast data)
    const emptyAuctions = await ctx.db
      .query("castAuctions")
      .withIndex("by_status", (q) => q.eq("status", "bidding"))
      .filter((q) => q.eq(q.field("currentBid"), 0))
      .collect();

    for (const auction of emptyAuctions) {
      if (!auction.castHash && !auction.warpcastUrl) {
        await ctx.db.delete(auction._id);
        deletedEmpty++;
      }
    }

    // 2. Complete active auctions that have expired
    const expiredActive = await ctx.db
      .query("castAuctions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.lte(q.field("featureEndsAt"), now))
      .collect();

    for (const auction of expiredActive) {
      await ctx.db.patch(auction._id, { status: "completed" });
      completedActive++;
    }

    console.log(`[CLEANUP] Deleted ${deletedEmpty} empty auctions, completed ${completedActive} expired active auctions`);

    return {
      success: true,
      deletedEmpty,
      completedActive,
    };
  },
});

/**
 * Keep only the most recent N active auctions, complete the rest
 */
export const keepOnlyRecentActive = internalMutation({
  args: { keepCount: v.number() },
  handler: async (ctx, { keepCount }) => {
    const activeAuctions = await ctx.db
      .query("castAuctions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Sort by featureStartsAt descending (most recent first)
    activeAuctions.sort((a, b) => (b.featureStartsAt || 0) - (a.featureStartsAt || 0));

    let completed = 0;
    for (let i = keepCount; i < activeAuctions.length; i++) {
      await ctx.db.patch(activeAuctions[i]._id, { status: "completed" });
      completed++;
    }

    console.log(`[CLEANUP] Kept ${keepCount} active auctions, completed ${completed} older ones`);

    return {
      success: true,
      kept: Math.min(keepCount, activeAuctions.length),
      completed,
    };
  },
});

/**
 * Swap auction statuses - complete one auction and reactivate another
 */
export const swapAuctionStatus = internalMutation({
  args: {
    completeAuctionId: v.string(),
    activateAuctionId: v.string()
  },
  handler: async (ctx, { completeAuctionId, activateAuctionId }) => {
    const now = Date.now();
    const FEATURE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    // Complete the wrong winner
    const wrongAuction = await ctx.db.get(completeAuctionId as Id<"castAuctions">);
    if (wrongAuction) {
      await ctx.db.patch(wrongAuction._id, { status: "completed" });
      console.log(`[SWAP] Completed auction ${completeAuctionId}`);
    }

    // Reactivate the correct winner
    const correctAuction = await ctx.db.get(activateAuctionId as Id<"castAuctions">);
    if (correctAuction) {
      await ctx.db.patch(correctAuction._id, {
        status: "active",
        featureStartsAt: now,
        featureEndsAt: now + FEATURE_DURATION
      });
      console.log(`[SWAP] Activated auction ${activateAuctionId}`);
    }

    return { success: true, completed: completeAuctionId, activated: activateAuctionId };
  },
});

/**
 * Reactivate a single auction
 */
export const reactivateAuction = internalMutation({
  args: { auctionId: v.string() },
  handler: async (ctx, { auctionId }) => {
    const now = Date.now();
    const FEATURE_DURATION = 24 * 60 * 60 * 1000;
    
    const auction = await ctx.db.get(auctionId as Id<"castAuctions">);
    if (!auction) throw new Error("Auction not found");
    
    await ctx.db.patch(auction._id, {
      status: "active",
      featureStartsAt: now,
      featureEndsAt: now + FEATURE_DURATION
    });
    
    console.log(`[ADMIN] Reactivated auction ${auctionId}`);
    return { success: true };
  },
});

/**
 * Process refunds for a completed/lost auction
 */
export const processRefundsForAuction = internalMutation({
  args: { auctionId: v.string() },
  handler: async (ctx, { auctionId }) => {
    const now = Date.now();
    
    const bids = await ctx.db
      .query("castAuctionBids")
      .withIndex("by_auction", (q) => q.eq("auctionId", auctionId as Id<"castAuctions">))
      .collect();
    
    let refundedCount = 0;
    let totalRefunded = 0;
    
    for (const bid of bids) {
      if (bid.status === "active") {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_address", (q) => q.eq("address", bid.bidderAddress.toLowerCase()))
          .first();
        
        if (profile) {
          await ctx.db.patch(profile._id, {
            coins: (profile.coins || 0) + bid.bidAmount,
          });
          refundedCount++;
          totalRefunded += bid.bidAmount;
        }
        
        await ctx.db.patch(bid._id, {
          status: "refunded",
          refundAmount: bid.bidAmount,
          refundedAt: now,
        });
      }
    }
    
    console.log(`[REFUND] Processed ${refundedCount} refunds totaling ${totalRefunded} coins`);
    return { success: true, refundedCount, totalRefunded };
  },
});

/**
 * Refund a single bid by ID
 */
export const refundSingleBid = internalMutation({
  args: { bidId: v.string() },
  handler: async (ctx, { bidId }) => {
    const now = Date.now();
    const bid = await ctx.db.get(bidId as Id<"castAuctionBids">);
    if (!bid) throw new Error("Bid not found");
    if (bid.status !== "active") return { success: false, reason: "already refunded" };
    
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", bid.bidderAddress.toLowerCase()))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        coins: (profile.coins || 0) + bid.bidAmount,
      });
    }

    await ctx.db.patch(bid._id, {
      status: "refunded",
      refundAmount: bid.bidAmount,
      refundedAt: now,
    });

    console.log(`[REFUND] ${bid.bidderUsername}: ${bid.bidAmount} coins`);
    return { success: true, username: bid.bidderUsername, amount: bid.bidAmount };
  },
});

/**
 * Reset featuredCasts to match current winners
 */
export const syncFeaturedCasts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get current active winners
    const winners = await ctx.db
      .query("castAuctions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    // Sort by featureStartsAt (newest first)
    winners.sort((a, b) => (b.featureStartsAt || 0) - (a.featureStartsAt || 0));
    
    // Take only top 2
    const top2 = winners.slice(0, 2);
    
    // Delete all existing featuredCasts with order >= 100
    const existingSlots = await ctx.db
      .query("featuredCasts")
      .filter((q) => q.gte(q.field("order"), 100))
      .collect();
    
    for (const slot of existingSlots) {
      await ctx.db.delete(slot._id);
    }
    
    // Add top 2 winners
    for (let i = 0; i < top2.length; i++) {
      const auction = top2[i];
      if (auction.castHash && auction.warpcastUrl) {
        await ctx.db.insert("featuredCasts", {
          castHash: auction.castHash,
          warpcastUrl: auction.warpcastUrl,
          order: 100 + i,
          active: true,
          addedAt: now,
          auctionId: auction._id,
        });
      }
    }
    
    console.log(`[SYNC] Synced ${top2.length} featured casts`);
    return { success: true, synced: top2.map(a => a.castHash) };
  },
});

/**
 * Clear winner data from a lost auction
 */
export const clearLoserData = internalMutation({
  args: { auctionId: v.string() },
  handler: async (ctx, { auctionId }) => {
    const auction = await ctx.db.get(auctionId as Id<"castAuctions">);
    if (!auction) throw new Error("Auction not found");
    
    await ctx.db.patch(auction._id, {
      winnerAddress: undefined,
      winnerUsername: undefined,
      winningBid: undefined,
      featureStartsAt: undefined,
      featureEndsAt: undefined,
    });
    
    console.log(`[ADMIN] Cleared loser data from ${auctionId}`);
    return { success: true };
  },
});
