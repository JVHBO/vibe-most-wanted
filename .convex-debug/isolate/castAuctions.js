import {
  b as y
} from "./_deps/AWJMSRP7.js";
import {
  a as m,
  b as E,
  c as g,
  d as h
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as c
} from "./_deps/34SVKERO.js";
import {
  a as b
} from "./_deps/5B5TEMMX.js";

// convex/castAuctions.ts
async function U(s, t) {
  let e = t.toLowerCase(), n = await s.db.query("addressLinks").withIndex("by_address", (i) => i.eq("address", e)).first();
  return n ? n.primaryAddress : e;
}
b(U, "resolvePrimaryAddress");
var H = 20, N = 1440 * 60 * 1e3;
function _(s = Date.now()) {
  let t = new Date(s);
  return t.setUTCHours(H, 0, 0, 0), t.getTime() <= s && t.setUTCDate(t.getUTCDate() + 1), t.getTime();
}
b(_, "getNextResetTime");
var B = 1e7;
var I = 2, C = 300 * 1e3, $ = 180 * 1e3, F = m({
  args: { castHash: c.string() },
  handler: /* @__PURE__ */ b(async (s, { castHash: t }) => {
    let e = await s.db.query("castAuctions").withIndex("by_castHash", (i) => i.eq("castHash", t)).filter((i) => i.eq(i.field("status"), "bidding")).first();
    if (!e) return null;
    let n = await s.db.query("castAuctionBids").withIndex(
      "by_auction_status",
      (i) => i.eq("auctionId", e._id).eq("status", "active")
    ).take(100);
    return {
      exists: !0,
      auctionId: e._id,
      slotNumber: e.slotNumber,
      currentBid: e.currentBid,
      totalPool: e.currentBid,
      contributorCount: n.length,
      contributors: n.map((i) => ({
        address: i.bidderAddress,
        username: i.bidderUsername,
        amount: i.bidAmount
      })),
      topBidder: e.bidderUsername,
      auctionEndsAt: e.auctionEndsAt,
      castAuthorUsername: e.castAuthorUsername
    };
  }, "handler")
}), P = m({
  args: {},
  handler: /* @__PURE__ */ b(async (s) => (await s.db.query("castAuctions").withIndex("by_status", (e) => e.eq("status", "bidding")).take(50)).sort((e, n) => (n.currentBid || 0) - (e.currentBid || 0)), "handler")
}), D = m({
  args: { slotNumber: c.number() },
  handler: /* @__PURE__ */ b(async (s, { slotNumber: t }) => await s.db.query("castAuctions").withIndex("by_slot_status").filter(
    (e) => e.and(
      e.eq(e.field("slotNumber"), t),
      e.eq(e.field("status"), "bidding")
    )
  ).first(), "handler")
}), R = m({
  args: {},
  handler: /* @__PURE__ */ b(async (s) => (await s.db.query("castAuctions").withIndex("by_status", (e) => e.eq("status", "active")).take(10)).filter((e) => e.castHash && e.warpcastUrl).sort((e, n) => e.slotNumber - n.slotNumber), "handler")
}), L = m({
  args: { limit: c.optional(c.number()) },
  handler: /* @__PURE__ */ b(async (s, { limit: t = 50 }) => {
    let e = await s.db.query("castAuctions").withIndex("by_status", (r) => r.eq("status", "completed")).order("desc").take(t);
    return [...await s.db.query("castAuctions").withIndex("by_status", (r) => r.eq("status", "active")).order("desc").take(t), ...e].filter((r) => r.winnerAddress && r.winningBid).sort((r, d) => (d.featureStartsAt || d._creationTime) - (r.featureStartsAt || r._creationTime)).slice(0, t);
  }, "handler")
}), k = m({
  args: { address: c.string() },
  handler: /* @__PURE__ */ b(async (s, { address: t }) => {
    let e = t.toLowerCase();
    return await s.db.query("castAuctionBids").withIndex("by_bidder", (n) => n.eq("bidderAddress", e)).order("desc").take(50);
  }, "handler")
}), O = m({
  args: { auctionId: c.id("castAuctions") },
  handler: /* @__PURE__ */ b(async (s, { auctionId: t }) => await s.db.query("castAuctionBids").withIndex("by_auction", (e) => e.eq("auctionId", t)).order("desc").take(20), "handler")
}), z = m({
  args: {},
  handler: /* @__PURE__ */ b(async (s) => {
    let t = await s.db.query("castAuctions").withIndex("by_status", (n) => n.eq("status", "bidding")).take(50), e = await s.db.query("castAuctions").withIndex("by_status", (n) => n.eq("status", "active")).take(10);
    return {
      // Sort by pool size (highest first) - cast-based ranking
      bidding: t.sort((n, i) => (i.currentBid || 0) - (n.currentBid || 0)),
      active: e.sort((n, i) => (i.currentBid || 0) - (n.currentBid || 0))
    };
  }, "handler")
}), V = m({
  args: { address: c.string() },
  handler: /* @__PURE__ */ b(async (s, { address: t }) => {
    let e = t.toLowerCase(), n = await s.db.query("castAuctionBids").withIndex("by_bidder", (r) => r.eq("bidderAddress", e)).filter((r) => r.eq(r.field("status"), "pending_refund")).take(100), i = n.reduce((r, d) => r + (d.refundAmount || d.bidAmount), 0);
    return {
      pendingRefunds: n,
      totalRefund: i,
      count: n.length
    };
  }, "handler")
}), W = m({
  args: { address: c.string() },
  handler: /* @__PURE__ */ b(async (s, { address: t }) => {
    let e = t.toLowerCase(), n = Date.now() - 1440 * 60 * 1e3, i = await s.db.query("castAuctionBids").withIndex("by_bidder", (d) => d.eq("bidderAddress", e)).filter(
      (d) => d.and(
        d.eq(d.field("status"), "refunded"),
        d.gte(d.field("refundedAt"), n)
      )
    ).take(50), r = i.reduce((d, o) => d + (o.refundAmount || o.bidAmount), 0);
    return {
      recentRefunds: i,
      totalRefunded: r,
      count: i.length
    };
  }, "handler")
}), G = m({
  args: { slotNumber: c.optional(c.number()) },
  handler: /* @__PURE__ */ b(async (s, { slotNumber: t }) => {
    let e;
    if (t !== void 0) {
      let u = await s.db.query("castAuctions").withIndex("by_slot_status").filter(
        (a) => a.and(
          a.eq(a.field("slotNumber"), t),
          a.eq(a.field("status"), "bidding")
        )
      ).first();
      e = u ? [u] : [];
    } else
      e = await s.db.query("castAuctions").withIndex("by_status", (u) => u.eq("status", "bidding")).take(50);
    let n = new Set(e.map((u) => u._id)), i = new Map(e.map((u) => [u._id, u])), r = e.map(
      (u) => s.db.query("castAuctionBids").withIndex("by_auction", (a) => a.eq("auctionId", u._id)).order("desc").take(10)
    );
    return (await Promise.all(r)).flatMap((u, a) => {
      let A = e[a];
      return u.map((l) => ({
        ...l,
        isWinning: l.status === "active" && l.bidAmount === A.currentBid
      }));
    }).sort((u, a) => a.bidAmount - u.bidAmount);
  }, "handler")
}), Q = g({
  args: {
    address: c.string(),
    slotNumber: c.number(),
    bidAmount: c.number(),
    castHash: c.string(),
    warpcastUrl: c.string(),
    castAuthorFid: c.optional(c.number()),
    castAuthorUsername: c.optional(c.string()),
    castAuthorPfp: c.optional(c.string()),
    castText: c.optional(c.string())
  },
  handler: /* @__PURE__ */ b(async (s, t) => {
    let e = await U(s, t.address);
    if (t.slotNumber < 0 || t.slotNumber >= I)
      throw new Error("Invalid slot number");
    let n = await s.db.query("castAuctions").withIndex("by_slot_status").filter(
      (f) => f.and(
        f.eq(f.field("slotNumber"), t.slotNumber),
        f.eq(f.field("status"), "bidding")
      )
    ).first(), i = Date.now();
    if (!n) {
      let f = await s.db.insert("castAuctions", {
        slotNumber: t.slotNumber,
        auctionStartedAt: i,
        auctionEndsAt: _(i),
        currentBid: 0,
        status: "bidding",
        createdAt: i
      });
      if (n = await s.db.get(f), !n) throw new Error("Failed to create auction");
    }
    if (n.auctionEndsAt <= i)
      throw new Error("Auction has ended");
    let r = n.currentBid || 0, d = 1e3;
    if (t.bidAmount < d)
      throw new Error(
        `Minimum bid is ${d.toLocaleString()} VBMS`
      );
    if (t.bidAmount > B)
      throw new Error(
        `Maximum bid is ${B.toLocaleString()} VBMS`
      );
    let o = await s.db.query("profiles").withIndex("by_address", (f) => f.eq("address", e)).first();
    if (console.log(`[PlaceBid DEBUG] Address: ${e}, Profile found: ${!!o}, Username: ${o?.username}`), !o)
      throw new Error(`Profile not found for address: ${e}`);
    let u = o.coins || 0;
    if (u < t.bidAmount)
      throw new Error(
        `Insufficient balance. Need ${t.bidAmount.toLocaleString()} VBMS, have ${u.toLocaleString()}`
      );
    let a = await s.db.query("castAuctionBids").withIndex("by_auction_status").filter(
      (f) => f.and(
        f.eq(f.field("auctionId"), n._id),
        f.eq(f.field("status"), "active"),
        f.eq(f.field("bidderAddress"), e)
      )
    ).first(), A = 0;
    if (a && (A = a.bidAmount, await s.db.patch(a._id, {
      status: "outbid",
      refundedAt: i,
      refundAmount: A
    })), n.bidderAddress && n.bidderAddress !== e) {
      let f = await s.db.query("castAuctionBids").withIndex("by_auction_status").filter(
        (p) => p.and(
          p.eq(p.field("auctionId"), n._id),
          p.eq(p.field("status"), "active")
        )
      ).first();
      if (f) {
        let p = await s.db.query("profiles").withIndex("by_address", (q) => q.eq("address", f.bidderAddress)).first();
        p && await s.db.patch(p._id, {
          coins: (p.coins || 0) + f.bidAmount,
          lastUpdated: i
        }), await s.db.patch(f._id, {
          status: "refunded",
          refundedAt: i,
          refundAmount: f.bidAmount
        });
      }
    }
    let l = t.bidAmount - A;
    await s.db.patch(o._id, {
      coins: u - l,
      lifetimeSpent: (o.lifetimeSpent || 0) + l,
      lastUpdated: i
    }), await s.db.insert("coinTransactions", {
      address: e,
      amount: -l,
      type: "spend",
      source: "auction_bid",
      description: `Auction bid on slot ${t.slotNumber}`,
      timestamp: i,
      balanceBefore: u,
      balanceAfter: u - l
    }), await s.db.insert("castAuctionBids", {
      auctionId: n._id,
      slotNumber: t.slotNumber,
      bidderAddress: e,
      bidderUsername: o.username,
      bidderFid: o.farcasterFid || (o.fid ? Number(o.fid) : void 0),
      castHash: t.castHash,
      warpcastUrl: t.warpcastUrl,
      castAuthorFid: t.castAuthorFid,
      castAuthorUsername: t.castAuthorUsername,
      bidAmount: t.bidAmount,
      previousHighBid: r,
      status: "active",
      timestamp: i
    });
    let w = n.auctionEndsAt;
    return n.auctionEndsAt - i <= C && (w = i + $), await s.db.patch(n._id, {
      currentBid: t.bidAmount,
      bidderAddress: e,
      bidderUsername: o.username,
      bidderFid: o.farcasterFid || (o.fid ? Number(o.fid) : void 0),
      castHash: t.castHash,
      warpcastUrl: t.warpcastUrl,
      castAuthorFid: t.castAuthorFid,
      castAuthorUsername: t.castAuthorUsername,
      castAuthorPfp: t.castAuthorPfp,
      castText: t.castText,
      auctionEndsAt: w,
      lastBidAt: i
    }), console.log(
      `[CastAuction] Bid placed: ${t.bidAmount} VBMS on slot ${t.slotNumber} by ${o.username}`
    ), {
      success: !0,
      bidAmount: t.bidAmount,
      newBalance: u - l,
      auctionEndsAt: w,
      slotNumber: t.slotNumber
    };
  }, "handler")
}), X = g({
  args: {
    address: c.string(),
    slotNumber: c.optional(c.number()),
    // Deprecated, kept for compatibility
    bidAmount: c.number(),
    txHash: c.string(),
    castHash: c.string(),
    warpcastUrl: c.string(),
    castAuthorFid: c.optional(c.number()),
    castAuthorUsername: c.optional(c.string()),
    castAuthorPfp: c.optional(c.string()),
    castText: c.optional(c.string())
  },
  handler: /* @__PURE__ */ b(async (s, t) => {
    let e = await U(s, t.address), n = Date.now();
    if (await s.db.query("castAuctionBids").withIndex("by_txHash", (l) => l.eq("txHash", t.txHash)).first())
      throw new Error("Transaction already used for a bid");
    let r = 1e3;
    if (t.bidAmount < r)
      throw new Error(`Minimum bid is ${r.toLocaleString()} VBMS`);
    if (t.bidAmount > B)
      throw new Error(`Maximum bid is ${B.toLocaleString()} VBMS`);
    let d = await s.db.query("profiles").withIndex("by_address", (l) => l.eq("address", e)).first();
    if (!d)
      throw new Error("Profile not found");
    let o = await s.db.query("castAuctions").withIndex("by_status").filter(
      (l) => l.and(
        l.eq(l.field("status"), "bidding"),
        l.eq(l.field("castHash"), t.castHash)
      )
    ).first();
    if (!o) {
      let w = (await s.db.query("castAuctions").withIndex("by_status", (p) => p.eq("status", "bidding")).first())?.auctionEndsAt || _(n), f = await s.db.insert("castAuctions", {
        slotNumber: 0,
        // Not used anymore, kept for schema compatibility
        auctionStartedAt: n,
        auctionEndsAt: w,
        currentBid: 0,
        status: "bidding",
        createdAt: n,
        castHash: t.castHash,
        warpcastUrl: t.warpcastUrl,
        castAuthorFid: t.castAuthorFid,
        castAuthorUsername: t.castAuthorUsername,
        castAuthorPfp: t.castAuthorPfp,
        castText: t.castText
      });
      if (o = await s.db.get(f), !o) throw new Error("Failed to create auction");
      console.log(`[CastAuction] New cast auction created for ${t.castHash}`);
    }
    if (o.auctionEndsAt <= n)
      throw new Error("Auction has ended");
    let u = await s.db.query("castAuctionBids").withIndex("by_auction_status").filter(
      (l) => l.and(
        l.eq(l.field("auctionId"), o._id),
        l.eq(l.field("status"), "active"),
        l.eq(l.field("bidderAddress"), e)
      )
    ).first();
    if (u) {
      let l = u.bidAmount + t.bidAmount;
      await s.db.patch(u._id, {
        bidAmount: l,
        timestamp: n,
        txHash: t.txHash
        // Update to latest tx
      });
      let w = (o.currentBid || 0) + t.bidAmount, f = o.auctionEndsAt;
      return o.auctionEndsAt - n <= C && (f = n + $), await s.db.patch(o._id, {
        currentBid: w,
        bidderAddress: e,
        bidderUsername: d.username,
        bidderFid: d.farcasterFid || (d.fid ? Number(d.fid) : void 0),
        auctionEndsAt: f,
        lastBidAt: n
      }), console.log(
        `[CastAuction] Pool contribution UPDATED: ${u.bidAmount} + ${t.bidAmount} = ${l} VBMS for cast ${t.castHash} by ${d.username}`
      ), {
        success: !0,
        bidAmount: t.bidAmount,
        totalUserBid: l,
        poolTotal: w,
        auctionEndsAt: f,
        castHash: t.castHash,
        updated: !0
      };
    }
    await s.db.insert("castAuctionBids", {
      auctionId: o._id,
      slotNumber: 0,
      bidderAddress: e,
      bidderUsername: d.username || e.slice(0, 8),
      bidderFid: d.farcasterFid || (d.fid ? Number(d.fid) : void 0),
      castHash: t.castHash,
      warpcastUrl: t.warpcastUrl,
      castAuthorFid: t.castAuthorFid,
      castAuthorUsername: t.castAuthorUsername,
      bidAmount: t.bidAmount,
      previousHighBid: o.currentBid,
      status: "active",
      timestamp: n,
      txHash: t.txHash,
      isPoolContribution: !0
    });
    let a = (o.currentBid || 0) + t.bidAmount, A = o.auctionEndsAt;
    return o.auctionEndsAt - n <= C && (A = n + $), await s.db.patch(o._id, {
      currentBid: a,
      bidderAddress: e,
      // Last bidder
      bidderUsername: d.username,
      bidderFid: d.farcasterFid || (d.fid ? Number(d.fid) : void 0),
      auctionEndsAt: A,
      lastBidAt: n
    }), console.log(
      `[CastAuction] Pool contribution: +${t.bidAmount} VBMS to cast ${t.castHash} (total: ${a}) by ${d.username}`
    ), {
      success: !0,
      bidAmount: t.bidAmount,
      poolTotal: a,
      auctionEndsAt: A,
      castHash: t.castHash
    };
  }, "handler")
}), j = g({
  args: {
    address: c.string(),
    auctionId: c.id("castAuctions"),
    bidAmount: c.number(),
    txHash: c.optional(c.string())
  },
  handler: /* @__PURE__ */ b(async (s, t) => {
    let e = await U(s, t.address), n = Date.now(), i = await s.db.get(t.auctionId);
    if (!i) throw new Error("Auction not found");
    if (i.status !== "bidding") throw new Error("Auction is not active");
    if (i.auctionEndsAt <= n) throw new Error("Auction has ended");
    let r = 1e3;
    if (t.bidAmount < r)
      throw new Error(`Minimum pool contribution is ${r.toLocaleString()} VBMS`);
    let d = await s.db.query("profiles").withIndex("by_address", (a) => a.eq("address", e)).first();
    if (console.log(`[AddToPool DEBUG] Address: ${e}, Profile found: ${!!d}, Username: ${d?.username}`), !d) throw new Error(`Profile not found for address: ${e}`);
    if (t.txHash && await s.db.query("castAuctionBids").withIndex("by_txHash", (A) => A.eq("txHash", t.txHash)).first())
      throw new Error("Transaction already used");
    let o = await s.db.query("castAuctionBids").withIndex("by_auction_status").filter(
      (a) => a.and(
        a.eq(a.field("auctionId"), t.auctionId),
        a.eq(a.field("status"), "active"),
        a.eq(a.field("bidderAddress"), e)
      )
    ).first();
    if (o) {
      let a = o.bidAmount + t.bidAmount;
      await s.db.patch(o._id, {
        bidAmount: a,
        timestamp: n,
        txHash: t.txHash || o.txHash
      });
      let A = (i.currentBid || 0) + t.bidAmount;
      return await s.db.patch(t.auctionId, {
        currentBid: A,
        lastBidAt: n
      }), console.log(`[CastAuction] Pool contribution UPDATED: ${o.bidAmount} + ${t.bidAmount} = ${a} VBMS by ${d.username}`), {
        success: !0,
        contribution: t.bidAmount,
        totalUserBid: a,
        newTotal: A,
        slotNumber: i.slotNumber,
        updated: !0
      };
    }
    await s.db.insert("castAuctionBids", {
      auctionId: t.auctionId,
      slotNumber: i.slotNumber,
      bidderAddress: e,
      bidderUsername: d.username || e.slice(0, 8),
      bidderFid: d.farcasterFid || (d.fid ? Number(d.fid) : void 0),
      castHash: i.castHash || "",
      warpcastUrl: i.warpcastUrl || "",
      castAuthorFid: i.castAuthorFid,
      castAuthorUsername: i.castAuthorUsername,
      bidAmount: t.bidAmount,
      previousHighBid: i.currentBid,
      status: "active",
      timestamp: n,
      txHash: t.txHash,
      isPoolContribution: !0
    });
    let u = (i.currentBid || 0) + t.bidAmount;
    return await s.db.patch(t.auctionId, {
      currentBid: u,
      lastBidAt: n
    }), console.log(`[CastAuction] Pool contribution: +${t.bidAmount} VBMS to slot ${i.slotNumber} by ${d.username} (total: ${u})`), {
      success: !0,
      contribution: t.bidAmount,
      newTotal: u,
      slotNumber: i.slotNumber
    };
  }, "handler")
}), J = h({
  args: {},
  handler: /* @__PURE__ */ b(async (s) => {
    let t = Date.now();
    for (let e = 0; e < I; e++)
      await s.db.query("castAuctions").withIndex("by_slot_status").filter(
        (i) => i.and(
          i.eq(i.field("slotNumber"), e),
          i.eq(i.field("status"), "bidding")
        )
      ).first() || (await s.db.insert("castAuctions", {
        slotNumber: e,
        auctionStartedAt: t,
        auctionEndsAt: _(t),
        currentBid: 0,
        status: "bidding",
        createdAt: t
      }), console.log(`[CastAuction] Initialized auction for slot ${e}`));
    return { success: !0, slotsInitialized: I };
  }, "handler")
}), K = g({
  args: { address: c.string() },
  handler: /* @__PURE__ */ b(async (s, { address: t }) => {
    let e = t.toLowerCase(), n = await s.db.query("castAuctionBids").withIndex("by_bidder", (o) => o.eq("bidderAddress", e)).filter((o) => o.eq(o.field("status"), "pending_refund")).collect();
    if (n.length === 0)
      throw new Error("No pending refunds to claim");
    let i = n.reduce((o, u) => o + (u.refundAmount || u.bidAmount), 0), r = Date.now(), d = await s.db.query("profiles").withIndex("by_address", (o) => o.eq("address", e)).first();
    if (!d)
      throw new Error("Profile not found");
    await s.db.patch(d._id, {
      coins: (d.coins || 0) + i,
      lastUpdated: r
    });
    for (let o of n)
      await s.db.patch(o._id, {
        status: "refunded",
        refundedAt: r,
        refundAmount: o.refundAmount || o.bidAmount
      });
    return console.log(`[CastAuction] Refund claimed: ${e} - ${i} coins (${n.length} bids)`), {
      success: !0,
      totalRefund: i,
      bidsCount: n.length
    };
  }, "handler")
}), Y = g({
  args: {
    auctionId: c.string(),
    bidderAddress: c.string()
  },
  handler: /* @__PURE__ */ b(async (s, { auctionId: t, bidderAddress: e }) => {
    let n = e.toLowerCase(), i = await s.db.query("castAuctionBids").withIndex("by_auction_status").filter(
      (u) => u.and(
        u.eq(u.field("auctionId"), t),
        u.eq(u.field("status"), "active"),
        u.eq(u.field("bidderAddress"), n)
      )
    ).collect();
    if (i.length < 2)
      throw new Error(`No duplicates found. User has ${i.length} bid(s) on this auction.`);
    i.sort((u, a) => u.timestamp - a.timestamp);
    let r = i[0], d = i.slice(1), o = i.reduce((u, a) => u + a.bidAmount, 0);
    await s.db.patch(r._id, {
      bidAmount: o,
      timestamp: Date.now()
    });
    for (let u of d)
      await s.db.delete(u._id);
    return console.log(`[CastAuction] Merged ${i.length} bids into 1: ${o} VBMS for ${r.bidderUsername}`), {
      success: !0,
      mergedCount: i.length,
      totalAmount: o,
      deletedBids: d.length
    };
  }, "handler")
}), Z = E({
  args: {},
  handler: /* @__PURE__ */ b(async (s) => {
    let t = await s.db.query("castAuctionBids").filter((n) => n.eq(n.field("status"), "refund_requested")).take(200), e = {};
    for (let n of t) {
      let i = n.bidderAddress;
      e[i] || (e[i] = { total: 0, bids: [] }), e[i].total += n.refundAmount || n.bidAmount, e[i].bids.push(n);
    }
    return {
      requests: t,
      byAddress: e,
      totalPending: t.reduce((n, i) => n + (i.refundAmount || i.bidAmount), 0)
    };
  }, "handler")
}), tt = g({
  args: {
    bidId: c.id("castAuctionBids"),
    txHash: c.string()
  },
  handler: /* @__PURE__ */ b(async (s, { bidId: t, txHash: e }) => {
    let n = await s.db.get(t);
    if (!n) throw new Error("Bid not found");
    if (n.status !== "refund_requested")
      throw new Error("Bid is not in refund_requested status");
    return await s.db.patch(t, {
      status: "refunded",
      refundTxHash: e,
      refundedAt: Date.now()
    }), console.log(`[CastAuction] Refund processed: ${n.bidderAddress} - ${n.refundAmount || n.bidAmount} VBMS (tx: ${e})`), { success: !0 };
  }, "handler")
}), et = g({
  args: {
    address: c.string(),
    txHash: c.string()
  },
  handler: /* @__PURE__ */ b(async (s, { address: t, txHash: e }) => {
    let n = t.toLowerCase(), i = await s.db.query("castAuctionBids").withIndex("by_bidder", (o) => o.eq("bidderAddress", n)).filter((o) => o.eq(o.field("status"), "refund_requested")).collect();
    if (i.length === 0)
      throw new Error("No refund requests for this address");
    let r = i.reduce((o, u) => o + (u.refundAmount || u.bidAmount), 0), d = Date.now();
    for (let o of i)
      await s.db.patch(o._id, {
        status: "refunded",
        refundTxHash: e,
        refundedAt: d
      });
    return console.log(`[CastAuction] Batch refund processed: ${n} - ${r} VBMS (${i.length} bids, tx: ${e})`), {
      success: !0,
      totalRefunded: r,
      bidsCount: i.length
    };
  }, "handler")
}), st = h({
  args: { auctionId: c.id("castAuctions") },
  handler: /* @__PURE__ */ b(async (s, { auctionId: t }) => {
    let e = await s.db.get(t);
    if (!e || e.status !== "bidding") return;
    let n = Date.now();
    if (e.auctionEndsAt > n) return;
    if (!e.bidderAddress || e.currentBid === 0) {
      await s.db.patch(t, {
        status: "completed"
      }), await s.db.insert("castAuctions", {
        slotNumber: e.slotNumber,
        auctionStartedAt: n,
        auctionEndsAt: _(n),
        currentBid: 0,
        status: "bidding",
        createdAt: n
      }), console.log(
        `[CastAuction] No bids on slot ${e.slotNumber}, starting new auction`
      );
      return;
    }
    let i = await s.db.query("castAuctionBids").withIndex("by_auction_status").filter(
      (r) => r.and(
        r.eq(r.field("auctionId"), t),
        r.eq(r.field("status"), "active")
      )
    ).first();
    i && await s.db.patch(i._id, { status: "won" }), await s.db.patch(t, {
      status: "pending_feature",
      winnerAddress: e.bidderAddress,
      winnerUsername: e.bidderUsername,
      winningBid: e.currentBid
    }), console.log(
      `[CastAuction] Auction finalized: Slot ${e.slotNumber}, Winner: ${e.bidderUsername}, Bid: ${e.currentBid} VBMS`
    );
  }, "handler")
}), nt = h({
  args: { auctionId: c.id("castAuctions") },
  handler: /* @__PURE__ */ b(async (s, { auctionId: t }) => {
    let e = await s.db.get(t);
    if (!e || e.status !== "pending_feature") return;
    let n = Date.now();
    if (!e.castHash || !e.warpcastUrl) {
      console.error(`[CastAuction] \u274C Auction ${t} has no cast data! Skipping featuredCasts addition.`), await s.db.patch(t, {
        status: "active",
        featureStartsAt: n,
        featureEndsAt: n + N
      });
      return;
    }
    let i = await s.db.query("featuredCasts").withIndex("by_active").filter(
      (a) => a.and(
        a.eq(a.field("active"), !0),
        a.gte(a.field("order"), 100),
        a.lte(a.field("order"), 101)
      )
    ).collect();
    console.log(`[CastAuction] \u{1F4CA} Found ${i.length} active featured slots`);
    let r, d = null, o = 2, u = [100, 101];
    if (i.length < o) {
      let a = i.map((A) => A.order);
      r = u.find((A) => !a.includes(A)) || 100, console.log(`[CastAuction] \u{1F4CD} Using new slot ${r} (${i.length}/${o} slots used)`);
    } else
      i.sort((a, A) => (a.addedAt || 0) - (A.addedAt || 0)), d = i[0], r = d.order, console.log(`[CastAuction] \u{1F504} Replacing oldest slot ${r} (addedAt: ${d.addedAt})`);
    if (d) {
      if (d.auctionId) {
        let a = await s.db.get(d.auctionId);
        a && a.status === "active" && (await s.db.patch(d.auctionId, {
          status: "completed"
        }), console.log(`[CastAuction] \u{1F504} Marked old auction ${d.auctionId} as completed`));
      }
      await s.db.patch(d._id, {
        castHash: e.castHash,
        warpcastUrl: e.warpcastUrl,
        active: !0,
        addedAt: n,
        auctionId: t
      }), console.log(`[CastAuction] \u2705 Replaced slot ${r} (oldest) with new winner: ${e.castHash}`);
    } else
      await s.db.insert("featuredCasts", {
        castHash: e.castHash,
        warpcastUrl: e.warpcastUrl,
        order: r,
        active: !0,
        addedAt: n,
        auctionId: t
      }), console.log(`[CastAuction] \u2705 Created new slot ${r} with winner: ${e.castHash}`);
    await s.db.patch(t, {
      status: "active",
      featureStartsAt: n,
      featureEndsAt: n + N
    }), console.log(
      `[CastAuction] \u{1F389} Cast now featured: Slot ${r} - ${e.castHash} by @${e.castAuthorUsername}`
    );
    try {
      await s.scheduler.runAfter(0, y.notifications.sendFeaturedCastNotification, {
        castAuthor: e.castAuthorUsername || "unknown",
        warpcastUrl: e.warpcastUrl || "https://vibemostwanted.xyz",
        winnerUsername: e.bidderUsername
      });
    } catch (a) {
      console.error("[CastAuction] \u26A0\uFE0F Failed to schedule notification:", a);
    }
    if (e.bidderFid)
      try {
        await s.scheduler.runAfter(500, y.notifications.sendWinnerNotification, {
          winnerFid: e.bidderFid,
          winnerUsername: e.bidderUsername || "winner",
          bidAmount: e.currentBid || 0,
          castAuthor: e.castAuthorUsername || "unknown"
        });
      } catch (a) {
        console.error("[CastAuction] \u26A0\uFE0F Failed to send winner notification:", a);
      }
  }, "handler")
}), it = h({
  args: { auctionId: c.id("castAuctions") },
  handler: /* @__PURE__ */ b(async (s, { auctionId: t }) => {
    let e = await s.db.get(t);
    if (!e || e.status !== "active") return;
    await s.db.patch(t, {
      status: "completed"
    });
    let n = Date.now();
    await s.db.insert("castAuctions", {
      slotNumber: e.slotNumber,
      auctionStartedAt: n,
      auctionEndsAt: _(n),
      currentBid: 0,
      status: "bidding",
      createdAt: n
    }), console.log(
      `[CastAuction] Feature ended, new auction started for slot ${e.slotNumber}`
    );
  }, "handler")
}), at = h({
  args: { auctionId: c.id("castAuctions") },
  handler: /* @__PURE__ */ b(async (s, { auctionId: t }) => {
    let e = await s.db.get(t);
    if (!e || e.status !== "bidding") return;
    let n = Date.now();
    await s.db.patch(t, {
      status: "completed"
    });
    let r = (await s.db.query("castAuctionBids").withIndex("by_auction", (l) => l.eq("auctionId", t)).collect()).filter((l) => l.status === "active"), o = [...new Set(r.map((l) => l.bidderAddress.toLowerCase()))].map(
      (l) => s.db.query("profiles").withIndex("by_address", (w) => w.eq("address", l)).first()
    ), u = await Promise.all(o), a = new Map(
      u.filter(Boolean).map((l) => [l.address.toLowerCase(), l])
    ), A = 0;
    for (let l of r) {
      let w = a.get(l.bidderAddress.toLowerCase());
      w && (await s.db.patch(w._id, {
        coins: (w.coins || 0) + l.bidAmount
      }), A++), await s.db.patch(l._id, {
        status: "refunded",
        refundAmount: l.bidAmount,
        refundedAt: n
      });
    }
    console.log(
      `[CastAuction] Auction LOST: ${e.castHash} with ${e.currentBid} VBMS - ${A} bids refunded automatically`
    );
  }, "handler")
}), dt = h({
  args: {},
  handler: /* @__PURE__ */ b(async (s) => {
    let t = Date.now(), e = await s.db.query("castAuctions").withIndex("by_status", (a) => a.eq("status", "bidding")).filter((a) => a.lte(a.field("auctionEndsAt"), t)).collect(), n = e.filter((a) => a.currentBid > 0), i = e.filter((a) => !a.currentBid || a.currentBid === 0);
    n.sort((a, A) => (A.currentBid || 0) - (a.currentBid || 0));
    let r = null, d = 0;
    for (let a = 0; a < n.length; a++) {
      let A = n[a];
      a === 0 ? (await s.scheduler.runAfter(0, y.castAuctions.finalizeAuction, {
        auctionId: A._id
      }), r = A._id, console.log(`[CastAuction] \u{1F3C6} TOP 1 WINNER: ${A.castHash} with ${A.currentBid} VBMS`)) : (await s.scheduler.runAfter(1e3, y.castAuctions.markAuctionLostSafe, {
        auctionId: A._id
      }), d++);
    }
    for (let a of i)
      await s.scheduler.runAfter(0, y.castAuctions.finalizeAuction, {
        auctionId: a._id
      });
    let o = await s.db.query("castAuctions").withIndex("by_status", (a) => a.eq("status", "pending_feature")).collect();
    for (let a of o)
      await s.scheduler.runAfter(0, y.castAuctions.activateFeaturedCast, {
        auctionId: a._id
      });
    let u = await s.db.query("castAuctions").withIndex("by_status", (a) => a.eq("status", "active")).filter((a) => a.lte(a.field("featureEndsAt"), t)).collect();
    for (let a of u)
      await s.scheduler.runAfter(0, y.castAuctions.completeFeaturedCast, {
        auctionId: a._id
      });
    return {
      finalized: n.length + i.length,
      winner: r,
      losersRefunded: d,
      activated: o.length,
      completed: u.length
    };
  }, "handler")
}), ot = h({
  args: { address: c.string(), amount: c.number() },
  handler: /* @__PURE__ */ b(async (s, { address: t, amount: e }) => {
    let n = t.toLowerCase(), i = Date.now(), r = await s.db.query("castAuctions").withIndex("by_status", (u) => u.eq("status", "bidding")).first();
    if (!r) {
      let u = await s.db.insert("castAuctions", {
        slotNumber: 99,
        auctionStartedAt: i,
        auctionEndsAt: i + 864e5,
        currentBid: 0,
        status: "bidding",
        createdAt: i
      });
      r = await s.db.get(u);
    }
    if (!r) throw new Error("Failed to create test auction");
    let d = await s.db.query("profiles").withIndex("by_address", (u) => u.eq("address", n)).first(), o = await s.db.insert("castAuctionBids", {
      auctionId: r._id,
      slotNumber: 99,
      bidderAddress: n,
      bidderUsername: d?.username || "test",
      bidderFid: d?.farcasterFid,
      castHash: "test-hash",
      warpcastUrl: "https://warpcast.com/test",
      bidAmount: e,
      previousHighBid: 0,
      status: "pending_refund",
      timestamp: i,
      refundAmount: e
    });
    return console.log(`[TEST] Created pending_refund bid for ${n}: ${e} coins`), { success: !0, bidId: o };
  }, "handler")
}), rt = h({
  args: {},
  handler: /* @__PURE__ */ b(async (s) => {
    let t = await s.db.query("castAuctions").withIndex("by_status", (d) => d.eq("status", "active")).collect(), e = await s.db.query("featuredCasts").withIndex("by_active", (d) => d.eq("active", !0)).collect(), n = e.map((d) => d.auctionId).filter(Boolean), i = t.filter((d) => !n.includes(d._id)), r = 0;
    for (let d of i)
      await s.db.patch(d._id, { status: "completed" }), console.log(`[Cleanup] Marked orphan auction ${d._id} (@${d.castAuthorUsername}) as completed`), r++;
    return {
      activeCount: t.length,
      featuredCount: e.length,
      orphansFixed: r
    };
  }, "handler")
}), ut = h({
  args: {},
  handler: /* @__PURE__ */ b(async (s) => {
    let t = _(), e = await s.db.query("castAuctions").withIndex("by_status", (i) => i.eq("status", "bidding")).collect(), n = 0;
    for (let i of e)
      await s.db.patch(i._id, { auctionEndsAt: t }), n++;
    return console.log(), { updated: n, nextReset: t, nextResetISO: new Date(t).toISOString() };
  }, "handler")
}), ct = h({
  args: {},
  handler: /* @__PURE__ */ b(async (s) => {
    let t = "0x01968929bb4411542a4075916604cf8802cba49b", n = (await s.db.query("castAuctions").withIndex("by_status", (r) => r.eq("status", "completed")).collect()).filter((r) => r.castHash === t), i = 0;
    for (let r of n)
      await s.db.delete(r._id), i++;
    return { deleted: i, total: n.length };
  }, "handler")
}), lt = h({
  args: { bidId: c.id("castAuctionBids") },
  handler: /* @__PURE__ */ b(async (s, { bidId: t }) => {
    let e = Date.now(), n = await s.db.get(t);
    if (!n || n.status !== "active") return;
    let i = await s.db.query("profiles").withIndex("by_address", (r) => r.eq("address", n.bidderAddress.toLowerCase())).first();
    i && await s.db.patch(i._id, {
      coins: (i.coins || 0) + n.bidAmount
    }), await s.db.patch(n._id, {
      status: "refunded",
      refundAmount: n.bidAmount,
      refundedAt: e
    }), console.log(`[CastAuction] Refunded ${n.bidderUsername}: ${n.bidAmount} coins`);
  }, "handler")
}), bt = h({
  args: { auctionId: c.id("castAuctions") },
  handler: /* @__PURE__ */ b(async (s, { auctionId: t }) => {
    let e = await s.db.get(t);
    if (!e || e.status !== "bidding") return;
    await s.db.patch(t, {
      status: "completed"
    });
    let n = await s.db.query("castAuctionBids").withIndex("by_auction", (i) => i.eq("auctionId", t)).take(50);
    for (let i = 0; i < n.length; i++)
      n[i].status === "active" && await s.scheduler.runAfter(i * 200, y.castAuctions.refundBid, {
        bidId: n[i]._id
      });
    console.log(`[CastAuction] Auction LOST: ${e.castHash} - scheduled ${n.length} refunds`);
  }, "handler")
});
export {
  nt as activateFeaturedCast,
  j as addToPool,
  F as checkExistingCast,
  ct as cleanDuplicateHistory,
  rt as cleanupOrphanAuctions,
  it as completeFeaturedCast,
  Y as consolidateDuplicateBids,
  st as finalizeAuction,
  P as getActiveAuctions,
  z as getAllAuctionStates,
  Z as getAllRefundRequests,
  D as getAuctionForSlot,
  L as getAuctionHistory,
  O as getBidHistory,
  G as getCurrentBidders,
  k as getMyBids,
  V as getPendingRefunds,
  W as getRecentRefunds,
  R as getWinningCasts,
  J as initializeAuctions,
  at as markAuctionLost,
  bt as markAuctionLostSafe,
  Q as placeBid,
  X as placeBidWithVBMS,
  dt as processAuctionLifecycle,
  tt as processRefund,
  et as processRefundBatch,
  lt as refundBid,
  K as requestRefund,
  ot as testCreatePendingRefund,
  ut as updateAuctionsToFixedTime
};
//# sourceMappingURL=castAuctions.js.map
