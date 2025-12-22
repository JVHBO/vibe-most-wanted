import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURED CAST AUCTIONS - Bid VBMS to have casts featured
// ═══════════════════════════════════════════════════════════════════════════════

// Configuration
const AUCTION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const FEATURE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours per position
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
 * Check if a cast URL is already being bid on (for pool feature)
 */
export const checkExistingCast = query({
  args: { castHash: v.string() },
  handler: async (ctx, { castHash }) => {
    const auctions = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) => q.eq(q.field("status"), "bidding"))
      .collect();

    const auction = auctions.find((a) => a.castHash === castHash);
    if (!auction) return null;

    const contributions = await ctx.db
      .query("castAuctionBids")
      .withIndex("by_auction")
      .filter((q) =>
        q.and(
          q.eq(q.field("auctionId"), auction._id),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    return {
      exists: true,
      auctionId: auction._id,
      slotNumber: auction.slotNumber,
      currentBid: auction.currentBid,
      totalPool: auction.currentBid,
      contributorCount: contributions.length,
      contributors: contributions.map((c) => ({
        address: c.bidderAddress,
        username: c.bidderUsername,
        amount: c.bidAmount,
      })),
      topBidder: auction.bidderUsername,
      auctionEndsAt: auction.auctionEndsAt,
      castAuthorUsername: auction.castAuthorUsername,
    };
  },
});


/**
 * Get all auctions currently accepting bids (sorted by pool size)
 */
export const getActiveAuctions = query({
  args: {},
  handler: async (ctx) => {
    const auctions = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) => q.eq(q.field("status"), "bidding"))
      .collect();

    // Sort by pool size (highest first) - cast-based ranking
    return auctions.sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0));
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
 * CAST-BASED: Sorted by pool size (highest first)
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
      // Sort by pool size (highest first) - cast-based ranking
      bidding: bidding.sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0)),
      active: active.sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0)),
    };
  },
});

/**
 * Get pending refunds for a user (outbid bids that need claiming)
 */
export const getPendingRefunds = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    const pendingRefunds = await ctx.db
      .query("castAuctionBids")
      .withIndex("by_bidder")
      .filter((q) =>
        q.and(
          q.eq(q.field("bidderAddress"), normalizedAddress),
          q.eq(q.field("status"), "pending_refund")
        )
      )
      .collect();

    const totalRefund = pendingRefunds.reduce((sum, bid) => sum + (bid.refundAmount || bid.bidAmount), 0);

    return {
      pendingRefunds,
      totalRefund,
      count: pendingRefunds.length,
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

    // 4. Validate bid amount (min 1000 VBMS, no outbid required - pool system)
    const currentBid = auction.currentBid || 0;
    const POOL_MINIMUM = 1000;
    if (args.bidAmount < POOL_MINIMUM) {
      throw new Error(
        `Minimum bid is ${POOL_MINIMUM.toLocaleString()} VBMS`
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

    console.log(`[PlaceBid DEBUG] Address: ${normalizedAddress}, Profile found: ${!!profile}, Username: ${profile?.username}`);

    if (!profile) {
      throw new Error(`Profile not found for address: ${normalizedAddress}`);
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
        // Refund to previous bidder's coins (TESTVBMS)
        const prevBidderProfile = await ctx.db
          .query("profiles")
          .withIndex("by_address")
          .filter((q) => q.eq(q.field("address"), previousBid.bidderAddress))
          .first();

        if (prevBidderProfile) {
          await ctx.db.patch(prevBidderProfile._id, {
            coins: (prevBidderProfile.coins || 0) + previousBid.bidAmount,
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
      bidderFid: profile.farcasterFid || (profile.fid ? Number(profile.fid) : undefined),
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
      bidderFid: profile.farcasterFid || (profile.fid ? Number(profile.fid) : undefined),
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
 * Place a bid using real VBMS tokens (verified on-chain transfer)
 * CAST-BASED: Each cast has its own pool, multiple casts compete
 * Called by /api/cast-auction/place-bid after verifying TX
 */
export const placeBidWithVBMS = mutation({
  args: {
    address: v.string(),
    slotNumber: v.optional(v.number()), // Deprecated, kept for compatibility
    bidAmount: v.number(),
    txHash: v.string(),
    castHash: v.string(),
    warpcastUrl: v.string(),
    castAuthorFid: v.optional(v.number()),
    castAuthorUsername: v.optional(v.string()),
    castAuthorPfp: v.optional(v.string()),
    castText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();
    const now = Date.now();

    // 1. Check TX hash not already used
    const existingTx = await ctx.db
      .query("castAuctionBids")
      .withIndex("by_txHash", (q) => q.eq("txHash", args.txHash))
      .first();
    if (existingTx) {
      throw new Error("Transaction already used for a bid");
    }

    // 2. Validate bid amount
    const POOL_MINIMUM = 1000;
    if (args.bidAmount < POOL_MINIMUM) {
      throw new Error(`Minimum bid is ${POOL_MINIMUM.toLocaleString()} VBMS`);
    }
    if (args.bidAmount > MAXIMUM_BID) {
      throw new Error(`Maximum bid is ${MAXIMUM_BID.toLocaleString()} VBMS`);
    }

    // 3. Get bidder profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address")
      .filter((q) => q.eq(q.field("address"), normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // 4. Check if this cast already has an active auction (by castHash)
    let auction = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "bidding"),
          q.eq(q.field("castHash"), args.castHash)
        )
      )
      .first();

    // 5. If cast doesn't have auction, create one
    if (!auction) {
      // Get global auction end time (all casts compete until same end time)
      // Find existing bidding auction to get the end time, or create new cycle
      const existingAuction = await ctx.db
        .query("castAuctions")
        .withIndex("by_status")
        .filter((q) => q.eq(q.field("status"), "bidding"))
        .first();

      const auctionEndsAt = existingAuction?.auctionEndsAt || (now + AUCTION_DURATION_MS);

      const auctionId = await ctx.db.insert("castAuctions", {
        slotNumber: 0, // Not used anymore, kept for schema compatibility
        auctionStartedAt: now,
        auctionEndsAt,
        currentBid: 0,
        status: "bidding",
        createdAt: now,
        castHash: args.castHash,
        warpcastUrl: args.warpcastUrl,
        castAuthorFid: args.castAuthorFid,
        castAuthorUsername: args.castAuthorUsername,
        castAuthorPfp: args.castAuthorPfp,
        castText: args.castText,
      });
      auction = await ctx.db.get(auctionId);
      if (!auction) throw new Error("Failed to create auction");

      console.log(`[CastAuction] New cast auction created for ${args.castHash}`);
    }

    // 6. Check auction hasn't ended
    if (auction.auctionEndsAt <= now) {
      throw new Error("Auction has ended");
    }

    // 6.5. Check if user already has an active bid on this auction - UPDATE instead of creating new
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

    if (existingBid) {
      // User already has a bid - UPDATE the existing bid by adding to it
      const newBidAmount = existingBid.bidAmount + args.bidAmount;

      await ctx.db.patch(existingBid._id, {
        bidAmount: newBidAmount,
        timestamp: now,
        txHash: args.txHash, // Update to latest tx
      });

      // Update auction pool total
      const newPoolTotal = (auction.currentBid || 0) + args.bidAmount;

      // Anti-snipe: Extend auction if bid is in last 5 minutes
      let newEndTime = auction.auctionEndsAt;
      if (auction.auctionEndsAt - now <= ANTI_SNIPE_WINDOW_MS) {
        newEndTime = now + ANTI_SNIPE_EXTENSION_MS;
      }

      await ctx.db.patch(auction._id, {
        currentBid: newPoolTotal,
        bidderAddress: normalizedAddress,
        bidderUsername: profile.username,
        bidderFid: profile.farcasterFid || (profile.fid ? Number(profile.fid) : undefined),
        auctionEndsAt: newEndTime,
        lastBidAt: now,
      });

      console.log(
        `[CastAuction] Pool contribution UPDATED: ${existingBid.bidAmount} + ${args.bidAmount} = ${newBidAmount} VBMS for cast ${args.castHash} by ${profile.username}`
      );

      return {
        success: true,
        bidAmount: args.bidAmount,
        totalUserBid: newBidAmount,
        poolTotal: newPoolTotal,
        auctionEndsAt: newEndTime,
        castHash: args.castHash,
        updated: true,
      };
    }

    // 7. Create NEW bid record (first contribution from this user)
    await ctx.db.insert("castAuctionBids", {
      auctionId: auction._id,
      slotNumber: 0,
      bidderAddress: normalizedAddress,
      bidderUsername: profile.username || normalizedAddress.slice(0, 8),
      bidderFid: profile.farcasterFid || (profile.fid ? Number(profile.fid) : undefined),
      castHash: args.castHash,
      warpcastUrl: args.warpcastUrl,
      castAuthorFid: args.castAuthorFid,
      castAuthorUsername: args.castAuthorUsername,
      bidAmount: args.bidAmount,
      previousHighBid: auction.currentBid,
      status: "active",
      timestamp: now,
      txHash: args.txHash,
      isPoolContribution: true,
    });

    // 8. Update auction pool total
    const newPoolTotal = (auction.currentBid || 0) + args.bidAmount;

    // Anti-snipe: Extend auction if bid is in last 5 minutes
    let newEndTime = auction.auctionEndsAt;
    if (auction.auctionEndsAt - now <= ANTI_SNIPE_WINDOW_MS) {
      newEndTime = now + ANTI_SNIPE_EXTENSION_MS;
    }

    await ctx.db.patch(auction._id, {
      currentBid: newPoolTotal,
      bidderAddress: normalizedAddress, // Last bidder
      bidderUsername: profile.username,
      bidderFid: profile.farcasterFid || (profile.fid ? Number(profile.fid) : undefined),
      auctionEndsAt: newEndTime,
      lastBidAt: now,
    });

    console.log(
      `[CastAuction] Pool contribution: +${args.bidAmount} VBMS to cast ${args.castHash} (total: ${newPoolTotal}) by ${profile.username}`
    );

    return {
      success: true,
      bidAmount: args.bidAmount,
      poolTotal: newPoolTotal,
      auctionEndsAt: newEndTime,
      castHash: args.castHash,
    };
  },
});



/**
 * Add VBMS to an existing cast's pool (when same cast URL is submitted)
 */
export const addToPool = mutation({
  args: {
    address: v.string(),
    auctionId: v.id("castAuctions"),
    bidAmount: v.number(),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedAddress = args.address.toLowerCase();
    const now = Date.now();

    // 1. Get the auction
    const auction = await ctx.db.get(args.auctionId);
    if (!auction) throw new Error("Auction not found");
    if (auction.status !== "bidding") throw new Error("Auction is not active");
    if (auction.auctionEndsAt <= now) throw new Error("Auction has ended");

    // 2. Validate bid amount (minimum 1000 VBMS for pool contributions)
    const POOL_MINIMUM = 1000;
    if (args.bidAmount < POOL_MINIMUM) {
      throw new Error(`Minimum pool contribution is ${POOL_MINIMUM.toLocaleString()} VBMS`);
    }

    // 3. Get bidder profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address")
      .filter((q) => q.eq(q.field("address"), normalizedAddress))
      .first();

    console.log(`[AddToPool DEBUG] Address: ${normalizedAddress}, Profile found: ${!!profile}, Username: ${profile?.username}`);

    if (!profile) throw new Error(`Profile not found for address: ${normalizedAddress}`);

    // 4. Check if TX hash already used (if provided)
    if (args.txHash) {
      const existingTx = await ctx.db
        .query("castAuctionBids")
        .withIndex("by_txHash", (q) => q.eq("txHash", args.txHash))
        .first();
      if (existingTx) throw new Error("Transaction already used");
    }

    // 4.5. Check if user already has an active bid on this auction - UPDATE instead of creating new
    const existingBid = await ctx.db
      .query("castAuctionBids")
      .withIndex("by_auction_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("auctionId"), args.auctionId),
          q.eq(q.field("status"), "active"),
          q.eq(q.field("bidderAddress"), normalizedAddress)
        )
      )
      .first();

    if (existingBid) {
      // User already has a bid - UPDATE the existing bid
      const newBidAmount = existingBid.bidAmount + args.bidAmount;

      await ctx.db.patch(existingBid._id, {
        bidAmount: newBidAmount,
        timestamp: now,
        txHash: args.txHash || existingBid.txHash,
      });

      // Update auction total
      const newTotal = (auction.currentBid || 0) + args.bidAmount;
      await ctx.db.patch(args.auctionId, {
        currentBid: newTotal,
        lastBidAt: now,
      });

      console.log(`[CastAuction] Pool contribution UPDATED: ${existingBid.bidAmount} + ${args.bidAmount} = ${newBidAmount} VBMS by ${profile.username}`);

      return {
        success: true,
        contribution: args.bidAmount,
        totalUserBid: newBidAmount,
        newTotal,
        slotNumber: auction.slotNumber,
        updated: true,
      };
    }

    // 5. Create NEW contribution record (first from this user)
    await ctx.db.insert("castAuctionBids", {
      auctionId: args.auctionId,
      slotNumber: auction.slotNumber,
      bidderAddress: normalizedAddress,
      bidderUsername: profile.username || normalizedAddress.slice(0, 8),
      bidderFid: profile.farcasterFid || (profile.fid ? Number(profile.fid) : undefined),
      castHash: auction.castHash || "",
      warpcastUrl: auction.warpcastUrl || "",
      castAuthorFid: auction.castAuthorFid,
      castAuthorUsername: auction.castAuthorUsername,
      bidAmount: args.bidAmount,
      previousHighBid: auction.currentBid,
      status: "active",
      timestamp: now,
      txHash: args.txHash,
      isPoolContribution: true,
    });

    // 6. Update auction total
    const newTotal = (auction.currentBid || 0) + args.bidAmount;
    await ctx.db.patch(args.auctionId, {
      currentBid: newTotal,
      lastBidAt: now,
    });

    console.log(`[CastAuction] Pool contribution: +${args.bidAmount} VBMS to slot ${auction.slotNumber} by ${profile.username} (total: ${newTotal})`);

    return {
      success: true,
      contribution: args.bidAmount,
      newTotal,
      slotNumber: auction.slotNumber,
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

/**
 * Claim refund for pending_refund bids
 * Credits coins directly to user profile
 */
export const requestRefund = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    const pendingRefunds = await ctx.db
      .query("castAuctionBids")
      .withIndex("by_bidder")
      .filter((q) =>
        q.and(
          q.eq(q.field("bidderAddress"), normalizedAddress),
          q.eq(q.field("status"), "pending_refund")
        )
      )
      .collect();

    if (pendingRefunds.length === 0) {
      throw new Error("No pending refunds to claim");
    }

    const totalRefund = pendingRefunds.reduce((sum, bid) => sum + (bid.refundAmount || bid.bidAmount), 0);
    const now = Date.now();

    // Get user profile and credit coins directly
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address")
      .filter((q) => q.eq(q.field("address"), normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Credit coins to user
    await ctx.db.patch(profile._id, {
      coins: (profile.coins || 0) + totalRefund,
      lastUpdated: now,
    });

    // Mark all as refunded
    for (const bid of pendingRefunds) {
      await ctx.db.patch(bid._id, {
        status: "refunded",
        refundedAt: now,
        refundAmount: bid.refundAmount || bid.bidAmount,
      });
    }

    console.log(`[CastAuction] Refund claimed: ${normalizedAddress} - ${totalRefund} coins (${pendingRefunds.length} bids)`);

    return {
      success: true,
      totalRefund,
      bidsCount: pendingRefunds.length,
    };
  },
});

/**
 * Merge duplicate bids from same user on same auction (Admin)
 * Consolidates two bids into one by summing amounts
 */
export const consolidateDuplicateBids = mutation({
  args: {
    auctionId: v.string(),
    bidderAddress: v.string(),
  },
  handler: async (ctx, { auctionId, bidderAddress }) => {
    const normalizedAddress = bidderAddress.toLowerCase();

    // Find all active bids from this user on this auction
    const userBids = await ctx.db
      .query("castAuctionBids")
      .withIndex("by_auction_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("auctionId"), auctionId as Id<"castAuctions">),
          q.eq(q.field("status"), "active"),
          q.eq(q.field("bidderAddress"), normalizedAddress)
        )
      )
      .collect();

    if (userBids.length < 2) {
      throw new Error(`No duplicates found. User has ${userBids.length} bid(s) on this auction.`);
    }

    // Sort by timestamp (oldest first)
    userBids.sort((a, b) => a.timestamp - b.timestamp);

    // Keep the first bid, merge others into it
    const keepBid = userBids[0];
    const bidsToMerge = userBids.slice(1);

    // Calculate total amount
    const totalAmount = userBids.reduce((sum, bid) => sum + bid.bidAmount, 0);

    // Update the kept bid with total amount
    await ctx.db.patch(keepBid._id, {
      bidAmount: totalAmount,
      timestamp: Date.now(),
    });

    // Delete the other bids
    for (const bid of bidsToMerge) {
      await ctx.db.delete(bid._id);
    }

    console.log(`[CastAuction] Merged ${userBids.length} bids into 1: ${totalAmount} VBMS for ${keepBid.bidderUsername}`);

    return {
      success: true,
      mergedCount: userBids.length,
      totalAmount,
      deletedBids: bidsToMerge.length,
    };
  },
});


/**
 * Get all pending refund requests (Admin)
 */
export const getAllRefundRequests = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db
      .query("castAuctionBids")
      .filter((q) => q.eq(q.field("status"), "refund_requested"))
      .collect();

    // Group by address
    const byAddress: Record<string, { total: number; bids: typeof requests }> = {};
    for (const req of requests) {
      const addr = req.bidderAddress;
      if (!byAddress[addr]) {
        byAddress[addr] = { total: 0, bids: [] };
      }
      byAddress[addr].total += req.refundAmount || req.bidAmount;
      byAddress[addr].bids.push(req);
    }

    return {
      requests,
      byAddress,
      totalPending: requests.reduce((sum, r) => sum + (r.refundAmount || r.bidAmount), 0),
    };
  },
});

/**
 * Process refund (Admin) - Mark as completed after manual transfer
 */
export const processRefund = mutation({
  args: { 
    bidId: v.id("castAuctionBids"),
    txHash: v.string(),
  },
  handler: async (ctx, { bidId, txHash }) => {
    const bid = await ctx.db.get(bidId);
    if (!bid) throw new Error("Bid not found");
    if (bid.status !== "refund_requested") {
      throw new Error("Bid is not in refund_requested status");
    }

    await ctx.db.patch(bidId, {
      status: "refunded",
      refundTxHash: txHash,
      refundedAt: Date.now(),
    });

    console.log(`[CastAuction] Refund processed: ${bid.bidderAddress} - ${bid.refundAmount || bid.bidAmount} VBMS (tx: ${txHash})`);

    return { success: true };
  },
});

/**
 * Process all refunds for an address (Admin)
 */
export const processRefundBatch = mutation({
  args: { 
    address: v.string(),
    txHash: v.string(),
  },
  handler: async (ctx, { address, txHash }) => {
    const normalizedAddress = address.toLowerCase();

    const requests = await ctx.db
      .query("castAuctionBids")
      .withIndex("by_bidder")
      .filter((q) =>
        q.and(
          q.eq(q.field("bidderAddress"), normalizedAddress),
          q.eq(q.field("status"), "refund_requested")
        )
      )
      .collect();

    if (requests.length === 0) {
      throw new Error("No refund requests for this address");
    }

    const total = requests.reduce((sum, r) => sum + (r.refundAmount || r.bidAmount), 0);
    const now = Date.now();

    for (const req of requests) {
      await ctx.db.patch(req._id, {
        status: "refunded",
        refundTxHash: txHash,
        refundedAt: now,
      });
    }

    console.log(`[CastAuction] Batch refund processed: ${normalizedAddress} - ${total} VBMS (${requests.length} bids, tx: ${txHash})`);

    return { 
      success: true,
      totalRefunded: total,
      bidsCount: requests.length,
    };
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
 * Also adds the cast to featuredCasts table so users can earn rewards for interactions
 *
 * ROTATING SLOTS: Uses slots 100, 101, 102 in rotation. When a new cast wins,
 * it takes the oldest slot (by addedAt timestamp).
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

    // 🔄 ROTATING SLOTS FIX: Get all 3 featured cast slots (100, 101, 102)
    // and replace the OLDEST one (by addedAt timestamp)
    const allFeaturedSlots = await ctx.db
      .query("featuredCasts")
      .withIndex("by_order")
      .filter((q) =>
        q.and(
          q.gte(q.field("order"), 100),
          q.lte(q.field("order"), 102)
        )
      )
      .collect();

    let targetOrder: number;
    let existingFeatured: typeof allFeaturedSlots[0] | null = null;

    if (allFeaturedSlots.length < 3) {
      // Not all 3 slots exist yet - use next available
      const usedOrders = allFeaturedSlots.map(s => s.order);
      targetOrder = [100, 101, 102].find(o => !usedOrders.includes(o)) || 100;
    } else {
      // All 3 slots exist - replace the OLDEST one
      allFeaturedSlots.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
      existingFeatured = allFeaturedSlots[0]; // Oldest
      targetOrder = existingFeatured.order;
    }

    if (existingFeatured) {
      // Update existing slot (oldest one)
      await ctx.db.patch(existingFeatured._id, {
        castHash: auction.castHash || "",
        warpcastUrl: auction.warpcastUrl || "",
        active: true,
        addedAt: now,
        auctionId: auctionId,
      });
      console.log(`[CastAuction] 🔄 Replaced slot ${targetOrder} (oldest) with new winner: ${auction.castHash}`);
    } else {
      // Create new featured cast entry
      await ctx.db.insert("featuredCasts", {
        castHash: auction.castHash || "",
        warpcastUrl: auction.warpcastUrl || "",
        order: targetOrder,
        active: true,
        addedAt: now,
        auctionId: auctionId,
      });
      console.log(`[CastAuction] ✨ Created new slot ${targetOrder} with winner: ${auction.castHash}`);
    }

    console.log(
      `[CastAuction] Cast now featured: Slot ${targetOrder} - ${auction.castHash} (added to featuredCasts)`
    );

    // 🔔 Send notification to all users about the new featured cast
    await ctx.scheduler.runAfter(0, internal.notifications.sendFeaturedCastNotification, {
      castAuthor: auction.castAuthorUsername || "unknown",
      warpcastUrl: auction.warpcastUrl || "https://www.vibemostwanted.xyz",
    });
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

    // Deactivate the featured cast from featuredCasts table
    const featuredOrder = 100 + auction.slotNumber;
    const featuredCast = await ctx.db
      .query("featuredCasts")
      .withIndex("by_order")
      .filter((q) => q.eq(q.field("order"), featuredOrder))
      .first();

    if (featuredCast) {
      await ctx.db.patch(featuredCast._id, { active: false });
    }

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
 * Mark an auction as lost and refund all bids
 */
export const markAuctionLost = internalMutation({
  args: { auctionId: v.id("castAuctions") },
  handler: async (ctx, { auctionId }) => {
    const auction = await ctx.db.get(auctionId);
    if (!auction || auction.status !== "bidding") return;

    const now = Date.now();

    // Mark auction as lost
    await ctx.db.patch(auctionId, {
      status: "completed",
    });

    // Refund all bids immediately (credit coins back to users)
    const bids = await ctx.db
      .query("castAuctionBids")
      .withIndex("by_auction")
      .filter((q) => q.eq(q.field("auctionId"), auctionId))
      .collect();

    let refundedCount = 0;
    for (const bid of bids) {
      if (bid.status === "active") {
        // Credit coins back to user immediately
        const bidderProfile = await ctx.db
          .query("profiles")
          .withIndex("by_address")
          .filter((q) => q.eq(q.field("address"), bid.bidderAddress.toLowerCase()))
          .first();

        if (bidderProfile) {
          await ctx.db.patch(bidderProfile._id, {
            coins: (bidderProfile.coins || 0) + bid.bidAmount,
          });
          refundedCount++;
        }

        await ctx.db.patch(bid._id, {
          status: "refunded",
          refundAmount: bid.bidAmount,
          refundedAt: now,
        });
      }
    }

    console.log(
      `[CastAuction] Auction LOST: ${auction.castHash} with ${auction.currentBid} VBMS - ${refundedCount} bids refunded automatically`
    );
  },
});

/**
 * Process all auction lifecycle transitions (called by cron every minute)
 * IMPORTANT: Only TOP 1 cast (highest pool) wins, others get refunded
 */
export const processAuctionLifecycle = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Get all ended auctions
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

    // 2. Separate auctions with bids from those without
    const auctionsWithBids = endedAuctions.filter(a => a.currentBid > 0);
    const auctionsWithoutBids = endedAuctions.filter(a => !a.currentBid || a.currentBid === 0);

    // 3. Sort by pool size (highest first) - TOP 1 WINS
    auctionsWithBids.sort((a, b) => (b.currentBid || 0) - (a.currentBid || 0));

    let winnerId: string | null = null;
    let losersRefunded = 0;

    // 4. Process auctions - only TOP 1 wins
    for (let i = 0; i < auctionsWithBids.length; i++) {
      const auction = auctionsWithBids[i];

      if (i === 0) {
        // TOP 1 - WINNER
        await ctx.runMutation(internal.castAuctions.finalizeAuction, {
          auctionId: auction._id,
        });
        winnerId = auction._id;
        console.log(`[CastAuction] 🏆 TOP 1 WINNER: ${auction.castHash} with ${auction.currentBid} VBMS`);
      } else {
        // LOSERS - Mark as lost and refund
        await ctx.runMutation(internal.castAuctions.markAuctionLost, {
          auctionId: auction._id,
        });
        losersRefunded++;
      }
    }

    // 5. Handle auctions without bids (just complete them)
    for (const auction of auctionsWithoutBids) {
      await ctx.runMutation(internal.castAuctions.finalizeAuction, {
        auctionId: auction._id,
      });
    }

    // 6. Activate pending features (pending_feature -> active)
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

    // 7. Complete expired features (active -> completed, start new auction)
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
      finalized: auctionsWithBids.length + auctionsWithoutBids.length,
      winner: winnerId,
      losersRefunded,
      activated: pendingFeatures.length,
      completed: expiredFeatures.length,
    };
  },
});

/**
 * TEST: Create a pending_refund bid for testing claim button
 */
export const testCreatePendingRefund = mutation({
  args: { address: v.string(), amount: v.number() },
  handler: async (ctx, { address, amount }) => {
    const normalizedAddress = address.toLowerCase();
    const now = Date.now();

    // Get or create a test auction
    let testAuction = await ctx.db
      .query("castAuctions")
      .withIndex("by_status")
      .filter((q) => q.eq(q.field("status"), "bidding"))
      .first();

    if (!testAuction) {
      const auctionId = await ctx.db.insert("castAuctions", {
        slotNumber: 99,
        auctionStartedAt: now,
        auctionEndsAt: now + 86400000,
        currentBid: 0,
        status: "bidding",
        createdAt: now,
      });
      testAuction = await ctx.db.get(auctionId);
    }

    if (!testAuction) throw new Error("Failed to create test auction");

    // Get profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address")
      .filter((q) => q.eq(q.field("address"), normalizedAddress))
      .first();

    // Create a pending_refund bid
    const bidId = await ctx.db.insert("castAuctionBids", {
      auctionId: testAuction._id,
      slotNumber: 99,
      bidderAddress: normalizedAddress,
      bidderUsername: profile?.username || "test",
      bidderFid: profile?.farcasterFid,
      castHash: "test-hash",
      warpcastUrl: "https://warpcast.com/test",
      bidAmount: amount,
      previousHighBid: 0,
      status: "pending_refund",
      timestamp: now,
      refundAmount: amount,
    });

    console.log(`[TEST] Created pending_refund bid for ${normalizedAddress}: ${amount} coins`);

    return { success: true, bidId };
  },
});

