import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURED CAST AUCTIONS - Bid VBMS to have casts featured
// ═══════════════════════════════════════════════════════════════════════════════

// Configuration
const AUCTION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const FEATURE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MINIMUM_BID = 10000; // Minimum first bid: 10,000 VBMS
const MAXIMUM_BID = 120000; // Maximum bid: 120,000 VBMS
const BID_INCREMENT_PERCENT = 10; // Must bid at least 10% more than current
const MINIMUM_INCREMENT = 1000; // Minimum increment: 1,000 VBMS
const TOTAL_SLOTS = 3; // 3 featured cast positions
const ANTI_SNIPE_WINDOW_MS = 5 * 60 * 1000; // Last 5 minutes
const ANTI_SNIPE_EXTENSION_MS = 3 * 60 * 1000; // Add 3 minutes on late bids

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all auctions currently accepting bids
 */
export const getActiveAuctions = query({
  args: {},
  handler: async (ctx) => {
    const auctions = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) => q.eq(q.field("status"), "bidding"))
      .collect();

    return auctions.sort((a, b) => a.slotNumber - b.slotNumber);
  },
});

/**
 * Get current auction state for a specific slot
 */
export const getAuctionForSlot = query({
  args: { slotNumber: v.number() },
  handler: async (ctx, { slotNumber }) => {
    return await ctx.db
      .query("castAuctions")
      .withIndex("by_slot_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("slotNumber"), slotNumber),
          q.eq(q.field("status"), "bidding")
        )
      )
      .first();
  },
});

/**
 * Get currently featured casts (from winning auctions)
 */
export const getWinningCasts = query({
  args: {},
  handler: async (ctx) => {
    const activeCasts = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return activeCasts
      .filter((a) => a.castHash && a.warpcastUrl)
      .sort((a, b) => a.slotNumber - b.slotNumber);
  },
});

/**
 * Get auction history (completed auctions for history page)
 */
export const getAuctionHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const completed = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .take(limit);

    // Only return auctions that had winners
    return completed.filter((a) => a.winnerAddress && a.winningBid);
  },
});

/**
 * Get all bids placed by a user
 */
export const getMyBids = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    return await ctx.db
      .query("castAuctionBids")
      .withIndex("by_bidder")
      .filter((q) => q.eq(q.field("bidderAddress"), normalizedAddress))
      .order("desc")
      .take(50);
  },
});

/**
 * Get bid history for a specific auction
 */
export const getBidHistory = query({
  args: { auctionId: v.id("castAuctions") },
  handler: async (ctx, { auctionId }) => {
    return await ctx.db
      .query("castAuctionBids")
      .withIndex("by_auction")
      .filter((q) => q.eq(q.field("auctionId"), auctionId))
      .order("desc")
      .take(20);
  },
});

/**
 * Get all auction states (bidding + active) for display
 */
export const getAllAuctionStates = query({
  args: {},
  handler: async (ctx) => {
    const bidding = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) => q.eq(q.field("status"), "bidding"))
      .collect();

    const active = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return {
      bidding: bidding.sort((a, b) => a.slotNumber - b.slotNumber),
      active: active.sort((a, b) => a.slotNumber - b.slotNumber),
    };
  },
});

/**
 * Get all bidders for current auctions (for display)
 */
export const getCurrentBidders = query({
  args: { slotNumber: v.optional(v.number()) },
  handler: async (ctx, { slotNumber }) => {
    // Get bidding auction(s)
    let auctions;
    if (slotNumber !== undefined) {
      const auction = await ctx.db
        .query("castAuctions")
        .withIndex("by_slot_status")
        .filter((q) =>
          q.and(
            q.eq(q.field("slotNumber"), slotNumber),
            q.eq(q.field("status"), "bidding")
          )
        )
        .first();
      auctions = auction ? [auction] : [];
    } else {
      auctions = await ctx.db
        .query("castAuctions")
        .withIndex("by_status")
        .filter((q) => q.eq(q.field("status"), "bidding"))
        .collect();
    }

    // Get all bids for these auctions
    const allBids = [];
    for (const auction of auctions) {
      const bids = await ctx.db
        .query("castAuctionBids")
        .withIndex("by_auction")
        .filter((q) => q.eq(q.field("auctionId"), auction._id))
        .order("desc")
        .take(10);

      allBids.push(...bids.map(bid => ({
        ...bid,
        isWinning: bid.status === "active" && bid.bidAmount === auction.currentBid,
      })));
    }

    return allBids.sort((a, b) => b.bidAmount - a.bidAmount);
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Place a bid on a featured cast slot
 */
export const placeBid = mutation({
  args: {
    address: v.string(),
    slotNumber: v.number(),
    bidAmount: v.number(),
    castHash: v.string(),
    warpcastUrl: v.string(),
    castAuthorFid: v.optional(v.number()),
    castAuthorUsername: v.optional(v.string()),
    castAuthorPfp: v.optional(v.string()),
    castText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();

    // 1. Validate slot number
    if (args.slotNumber < 0 || args.slotNumber >= TOTAL_SLOTS) {
      throw new Error("Invalid slot number");
    }

    // 2. Get or create auction for this slot
    let auction = await ctx.db
      .query("castAuctions")
      .withIndex("by_slot_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("slotNumber"), args.slotNumber),
          q.eq(q.field("status"), "bidding")
        )
      )
      .first();

    const now = Date.now();

    // Create new auction if none exists
    if (!auction) {
      const auctionId = await ctx.db.insert("castAuctions", {
        slotNumber: args.slotNumber,
        auctionStartedAt: now,
        auctionEndsAt: now + AUCTION_DURATION_MS,
        currentBid: 0,
        status: "bidding",
        createdAt: now,
      });
      auction = await ctx.db.get(auctionId);
      if (!auction) throw new Error("Failed to create auction");
    }

    // 3. Check auction hasn't ended
    if (auction.auctionEndsAt <= now) {
      throw new Error("Auction has ended");
    }

    // 4. Validate bid amount
    const currentBid = auction.currentBid || 0;
    const minimumRequired =
      currentBid === 0
        ? MINIMUM_BID
        : Math.max(
            currentBid + MINIMUM_INCREMENT,
            Math.ceil(currentBid * (1 + BID_INCREMENT_PERCENT / 100))
          );

    if (args.bidAmount < minimumRequired) {
      throw new Error(
        `Minimum bid is ${minimumRequired.toLocaleString()} VBMS`
      );
    }

    // Check maximum bid
    if (args.bidAmount > MAXIMUM_BID) {
      throw new Error(
        `Maximum bid is ${MAXIMUM_BID.toLocaleString()} VBMS`
      );
    }

    // 5. Get bidder profile and check balance
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address")
      .filter((q) => q.eq(q.field("address"), normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentCoins = profile.coins || 0;
    if (currentCoins < args.bidAmount) {
      throw new Error(
        `Insufficient balance. Need ${args.bidAmount.toLocaleString()} VBMS, have ${currentCoins.toLocaleString()}`
      );
    }

    // 6. Check if bidder has an existing active bid on this auction (self-outbid)
    const existingBid = await ctx.db
      .query("castAuctionBids")
      .withIndex("by_auction_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("auctionId"), auction!._id),
          q.eq(q.field("status"), "active"),
          q.eq(q.field("bidderAddress"), normalizedAddress)
        )
      )
      .first();

    let refundAmount = 0;
    if (existingBid) {
      // Self-outbid: refund the previous bid
      refundAmount = existingBid.bidAmount;
      await ctx.db.patch(existingBid._id, {
        status: "outbid",
        refundedAt: now,
        refundAmount: refundAmount,
      });
    }

    // 7. Refund previous highest bidder (if different from current bidder)
    if (auction.bidderAddress && auction.bidderAddress !== normalizedAddress) {
      const previousBid = await ctx.db
        .query("castAuctionBids")
        .withIndex("by_auction_status")
        .filter((q) =>
          q.and(
            q.eq(q.field("auctionId"), auction!._id),
            q.eq(q.field("status"), "active")
          )
        )
        .first();

      if (previousBid) {
        // Refund to previous bidder's testVbmsBalance (not real VBMS)
        const prevBidderProfile = await ctx.db
          .query("profiles")
          .withIndex("by_address")
          .filter((q) => q.eq(q.field("address"), previousBid.bidderAddress))
          .first();

        if (prevBidderProfile) {
          await ctx.db.patch(prevBidderProfile._id, {
            testVbmsBalance: (prevBidderProfile.testVbmsBalance || 0) + previousBid.bidAmount,
            lastUpdated: now,
          });
        }

        // Mark previous bid as outbid and refunded
        await ctx.db.patch(previousBid._id, {
          status: "refunded",
          refundedAt: now,
          refundAmount: previousBid.bidAmount,
        });
      }
    }

    // 8. Deduct bid amount from bidder (accounting for any self-refund)
    const netDeduction = args.bidAmount - refundAmount;
    await ctx.db.patch(profile._id, {
      coins: currentCoins - netDeduction,
      lifetimeSpent: (profile.lifetimeSpent || 0) + netDeduction,
      lastUpdated: now,
    });

    // 9. Create bid record
    await ctx.db.insert("castAuctionBids", {
      auctionId: auction._id,
      slotNumber: args.slotNumber,
      bidderAddress: normalizedAddress,
      bidderUsername: profile.username,
      bidderFid: profile.farcasterFid,
      castHash: args.castHash,
      warpcastUrl: args.warpcastUrl,
      castAuthorFid: args.castAuthorFid,
      castAuthorUsername: args.castAuthorUsername,
      bidAmount: args.bidAmount,
      previousHighBid: currentBid,
      status: "active",
      timestamp: now,
    });

    // 10. Anti-snipe: Extend auction if bid is in last 5 minutes
    let newEndTime = auction.auctionEndsAt;
    if (auction.auctionEndsAt - now <= ANTI_SNIPE_WINDOW_MS) {
      newEndTime = now + ANTI_SNIPE_EXTENSION_MS;
    }

    // 11. Update auction with new high bid
    await ctx.db.patch(auction._id, {
      currentBid: args.bidAmount,
      bidderAddress: normalizedAddress,
      bidderUsername: profile.username,
      bidderFid: profile.farcasterFid,
      castHash: args.castHash,
      warpcastUrl: args.warpcastUrl,
      castAuthorFid: args.castAuthorFid,
      castAuthorUsername: args.castAuthorUsername,
      castAuthorPfp: args.castAuthorPfp,
      castText: args.castText,
      auctionEndsAt: newEndTime,
      lastBidAt: now,
    });

    console.log(
      `[CastAuction] Bid placed: ${args.bidAmount} VBMS on slot ${args.slotNumber} by ${profile.username}`
    );

    return {
      success: true,
      bidAmount: args.bidAmount,
      newBalance: currentCoins - netDeduction,
      auctionEndsAt: newEndTime,
      slotNumber: args.slotNumber,
    };
  },
});

/**
 * Initialize auctions for all 3 slots (run once on deployment)
 */
export const initializeAuctions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    for (let slot = 0; slot < TOTAL_SLOTS; slot++) {
      const existing = await ctx.db
        .query("castAuctions")
        .withIndex("by_slot_status")
        .filter((q) =>
          q.and(
            q.eq(q.field("slotNumber"), slot),
            q.eq(q.field("status"), "bidding")
          )
        )
        .first();

      if (!existing) {
        await ctx.db.insert("castAuctions", {
          slotNumber: slot,
          auctionStartedAt: now,
          auctionEndsAt: now + AUCTION_DURATION_MS,
          currentBid: 0,
          status: "bidding",
          createdAt: now,
        });
        console.log(`[CastAuction] Initialized auction for slot ${slot}`);
      }
    }

    return { success: true, slotsInitialized: TOTAL_SLOTS };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL MUTATIONS (Called by cron)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Finalize an ended auction
 */
export const finalizeAuction = internalMutation({
  args: { auctionId: v.id("castAuctions") },
  handler: async (ctx, { auctionId }) => {
    const auction = await ctx.db.get(auctionId);
    if (!auction || auction.status !== "bidding") return;

    const now = Date.now();
    if (auction.auctionEndsAt > now) return; // Not ended yet

    // No bids - reset for next auction cycle
    if (!auction.bidderAddress || auction.currentBid === 0) {
      await ctx.db.patch(auctionId, {
        status: "completed",
      });

      // Start new auction for this slot
      await ctx.db.insert("castAuctions", {
        slotNumber: auction.slotNumber,
        auctionStartedAt: now,
        auctionEndsAt: now + AUCTION_DURATION_MS,
        currentBid: 0,
        status: "bidding",
        createdAt: now,
      });

      console.log(
        `[CastAuction] No bids on slot ${auction.slotNumber}, starting new auction`
      );
      return;
    }

    // Finalize winner
    const winningBid = await ctx.db
      .query("castAuctionBids")
      .withIndex("by_auction_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("auctionId"), auctionId),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (winningBid) {
      await ctx.db.patch(winningBid._id, { status: "won" });
    }

    // Update auction to pending feature state
    await ctx.db.patch(auctionId, {
      status: "pending_feature",
      winnerAddress: auction.bidderAddress,
      winnerUsername: auction.bidderUsername,
      winningBid: auction.currentBid,
    });

    console.log(
      `[CastAuction] Auction finalized: Slot ${auction.slotNumber}, Winner: ${auction.bidderUsername}, Bid: ${auction.currentBid} VBMS`
    );
  },
});

/**
 * Activate a featured cast (pending_feature -> active)
 */
export const activateFeaturedCast = internalMutation({
  args: { auctionId: v.id("castAuctions") },
  handler: async (ctx, { auctionId }) => {
    const auction = await ctx.db.get(auctionId);
    if (!auction || auction.status !== "pending_feature") return;

    const now = Date.now();

    await ctx.db.patch(auctionId, {
      status: "active",
      featureStartsAt: now,
      featureEndsAt: now + FEATURE_DURATION_MS,
    });

    console.log(
      `[CastAuction] Cast now featured: Slot ${auction.slotNumber} - ${auction.castHash}`
    );
  },
});

/**
 * Complete a featured cast period and start new auction
 */
export const completeFeaturedCast = internalMutation({
  args: { auctionId: v.id("castAuctions") },
  handler: async (ctx, { auctionId }) => {
    const auction = await ctx.db.get(auctionId);
    if (!auction || auction.status !== "active") return;

    await ctx.db.patch(auctionId, {
      status: "completed",
    });

    // Start new auction for this slot
    const now = Date.now();
    await ctx.db.insert("castAuctions", {
      slotNumber: auction.slotNumber,
      auctionStartedAt: now,
      auctionEndsAt: now + AUCTION_DURATION_MS,
      currentBid: 0,
      status: "bidding",
      createdAt: now,
    });

    console.log(
      `[CastAuction] Feature ended, new auction started for slot ${auction.slotNumber}`
    );
  },
});

/**
 * Process all auction lifecycle transitions (called by cron every minute)
 */
export const processAuctionLifecycle = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Finalize ended auctions (bidding -> pending_feature)
    const endedAuctions = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "bidding"),
          q.lte(q.field("auctionEndsAt"), now)
        )
      )
      .collect();

    for (const auction of endedAuctions) {
      await ctx.runMutation(internal.castAuctions.finalizeAuction, {
        auctionId: auction._id,
      });
    }

    // 2. Activate pending features (pending_feature -> active)
    const pendingFeatures = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) => q.eq(q.field("status"), "pending_feature"))
      .collect();

    for (const auction of pendingFeatures) {
      await ctx.runMutation(internal.castAuctions.activateFeaturedCast, {
        auctionId: auction._id,
      });
    }

    // 3. Complete expired features (active -> completed, start new auction)
    const expiredFeatures = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lte(q.field("featureEndsAt"), now)
        )
      )
      .collect();

    for (const auction of expiredFeatures) {
      await ctx.runMutation(internal.castAuctions.completeFeaturedCast, {
        auctionId: auction._id,
      });
    }

    return {
      finalized: endedAuctions.length,
      activated: pendingFeatures.length,
      completed: expiredFeatures.length,
    };
  },
});
