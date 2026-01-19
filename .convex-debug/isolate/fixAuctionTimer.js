import {
  b as w
} from "./_deps/AWJMSRP7.js";
import {
  d as i
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as u
} from "./_deps/34SVKERO.js";
import {
  a as d
} from "./_deps/5B5TEMMX.js";

// convex/fixAuctionTimer.ts
var g = i({
  args: { auctionId: u.string() },
  handler: /* @__PURE__ */ d(async (e, { auctionId: o }) => {
    let t = await e.db.get(o);
    if (!t) throw new Error("Auction not found");
    if (t.status !== "bidding") throw new Error("Auction is not in bidding status");
    let s = Date.now();
    return await e.db.patch(t._id, {
      auctionEndsAt: s - 1e3
      // Set to 1 second ago
    }), console.log(`[ADMIN] Forced end auction ${o} - will be processed by next cron`), { success: !0, auctionId: o, newEndTime: s - 1e3 };
  }, "handler")
}), m = i({
  args: { auctionId: u.string() },
  handler: /* @__PURE__ */ d(async (e, { auctionId: o }) => {
    let t = await e.db.get(o);
    if (!t) throw new Error("Auction not found");
    if (t.status !== "active") throw new Error("Auction is not active");
    if (!t.castHash || !t.warpcastUrl) throw new Error("Auction has no cast data");
    let s = Date.now(), r = await e.db.query("featuredCasts").filter((c) => c.eq(c.field("castHash"), t.castHash)).first();
    if (r)
      return await e.db.patch(r._id, {
        active: !0,
        addedAt: s,
        auctionId: t._id,
        warpcastUrl: t.warpcastUrl
      }), console.log(`[ADMIN] Updated existing featuredCast for ${t.castHash}`), { success: !0, action: "updated", castHash: t.castHash };
    let n = await e.db.query("featuredCasts").filter(
      (c) => c.and(
        c.gte(c.field("order"), 100),
        c.lte(c.field("order"), 101)
      )
    ).collect(), a = n.map((c) => c.order), l = [100, 101].find((c) => !a.includes(c));
    if (l !== void 0)
      return await e.db.insert("featuredCasts", {
        castHash: t.castHash,
        warpcastUrl: t.warpcastUrl,
        order: l,
        active: !0,
        addedAt: s,
        auctionId: t._id
      }), console.log(`[ADMIN] Created new featuredCast at slot ${l} for ${t.castHash}`), { success: !0, action: "created", slot: l, castHash: t.castHash };
    n.sort((c, A) => (c.addedAt || 0) - (A.addedAt || 0));
    let f = n[0];
    return await e.db.patch(f._id, {
      castHash: t.castHash,
      warpcastUrl: t.warpcastUrl,
      active: !0,
      addedAt: s,
      auctionId: t._id
    }), console.log(`[ADMIN] Replaced oldest slot ${f.order} with ${t.castHash}`), { success: !0, action: "replaced", slot: f.order, castHash: t.castHash };
  }, "handler")
}), y = i({
  args: {},
  handler: /* @__PURE__ */ d(async (e) => (await e.scheduler.runAfter(0, w.castAuctions.processAuctionLifecycle, {}), { success: !0, message: "Scheduled processAuctionLifecycle to run immediately" }), "handler")
}), I = i({
  args: {},
  handler: /* @__PURE__ */ d(async (e) => {
    let o = Date.now(), t = 0, s = 0, r = await e.db.query("castAuctions").withIndex("by_status", (a) => a.eq("status", "bidding")).filter((a) => a.eq(a.field("currentBid"), 0)).collect();
    for (let a of r)
      !a.castHash && !a.warpcastUrl && (await e.db.delete(a._id), t++);
    let n = await e.db.query("castAuctions").withIndex("by_status", (a) => a.eq("status", "active")).filter((a) => a.lte(a.field("featureEndsAt"), o)).collect();
    for (let a of n)
      await e.db.patch(a._id, { status: "completed" }), s++;
    return console.log(`[CLEANUP] Deleted ${t} empty auctions, completed ${s} expired active auctions`), {
      success: !0,
      deletedEmpty: t,
      completedActive: s
    };
  }, "handler")
}), _ = i({
  args: { keepCount: u.number() },
  handler: /* @__PURE__ */ d(async (e, { keepCount: o }) => {
    let t = await e.db.query("castAuctions").withIndex("by_status", (r) => r.eq("status", "active")).collect();
    t.sort((r, n) => (n.featureStartsAt || 0) - (r.featureStartsAt || 0));
    let s = 0;
    for (let r = o; r < t.length; r++)
      await e.db.patch(t[r]._id, { status: "completed" }), s++;
    return console.log(`[CLEANUP] Kept ${o} active auctions, completed ${s} older ones`), {
      success: !0,
      kept: Math.min(o, t.length),
      completed: s
    };
  }, "handler")
}), E = i({
  args: {
    completeAuctionId: u.string(),
    activateAuctionId: u.string()
  },
  handler: /* @__PURE__ */ d(async (e, { completeAuctionId: o, activateAuctionId: t }) => {
    let s = Date.now(), r = 1440 * 60 * 1e3, n = await e.db.get(o);
    n && (await e.db.patch(n._id, { status: "completed" }), console.log(`[SWAP] Completed auction ${o}`));
    let a = await e.db.get(t);
    return a && (await e.db.patch(a._id, {
      status: "active",
      featureStartsAt: s,
      featureEndsAt: s + r
    }), console.log(`[SWAP] Activated auction ${t}`)), { success: !0, completed: o, activated: t };
  }, "handler")
}), v = i({
  args: { auctionId: u.string() },
  handler: /* @__PURE__ */ d(async (e, { auctionId: o }) => {
    let t = Date.now(), s = 1440 * 60 * 1e3, r = await e.db.get(o);
    if (!r) throw new Error("Auction not found");
    return await e.db.patch(r._id, {
      status: "active",
      featureStartsAt: t,
      featureEndsAt: t + s
    }), console.log(`[ADMIN] Reactivated auction ${o}`), { success: !0 };
  }, "handler")
}), U = i({
  args: { auctionId: u.string() },
  handler: /* @__PURE__ */ d(async (e, { auctionId: o }) => {
    let t = Date.now(), s = await e.db.query("castAuctionBids").withIndex("by_auction", (a) => a.eq("auctionId", o)).collect(), r = 0, n = 0;
    for (let a of s)
      if (a.status === "active") {
        let l = await e.db.query("profiles").withIndex("by_address", (f) => f.eq("address", a.bidderAddress.toLowerCase())).first();
        l && (await e.db.patch(l._id, {
          coins: (l.coins || 0) + a.bidAmount
        }), r++, n += a.bidAmount), await e.db.patch(a._id, {
          status: "refunded",
          refundAmount: a.bidAmount,
          refundedAt: t
        });
      }
    return console.log(`[REFUND] Processed ${r} refunds totaling ${n} coins`), { success: !0, refundedCount: r, totalRefunded: n };
  }, "handler")
}), H = i({
  args: { bidId: u.string() },
  handler: /* @__PURE__ */ d(async (e, { bidId: o }) => {
    let t = Date.now(), s = await e.db.get(o);
    if (!s) throw new Error("Bid not found");
    if (s.status !== "active") return { success: !1, reason: "already refunded" };
    let r = await e.db.query("profiles").withIndex("by_address", (n) => n.eq("address", s.bidderAddress.toLowerCase())).first();
    return r && await e.db.patch(r._id, {
      coins: (r.coins || 0) + s.bidAmount
    }), await e.db.patch(s._id, {
      status: "refunded",
      refundAmount: s.bidAmount,
      refundedAt: t
    }), console.log(`[REFUND] ${s.bidderUsername}: ${s.bidAmount} coins`), { success: !0, username: s.bidderUsername, amount: s.bidAmount };
  }, "handler")
}), D = i({
  args: {},
  handler: /* @__PURE__ */ d(async (e) => {
    let o = Date.now(), t = await e.db.query("castAuctions").withIndex("by_status", (n) => n.eq("status", "active")).collect();
    t.sort((n, a) => (a.featureStartsAt || 0) - (n.featureStartsAt || 0));
    let s = t.slice(0, 2), r = await e.db.query("featuredCasts").filter((n) => n.gte(n.field("order"), 100)).collect();
    for (let n of r)
      await e.db.delete(n._id);
    for (let n = 0; n < s.length; n++) {
      let a = s[n];
      a.castHash && a.warpcastUrl && await e.db.insert("featuredCasts", {
        castHash: a.castHash,
        warpcastUrl: a.warpcastUrl,
        order: 100 + n,
        active: !0,
        addedAt: o,
        auctionId: a._id
      });
    }
    return console.log(`[SYNC] Synced ${s.length} featured casts`), { success: !0, synced: s.map((n) => n.castHash) };
  }, "handler")
}), $ = i({
  args: { auctionId: u.string() },
  handler: /* @__PURE__ */ d(async (e, { auctionId: o }) => {
    let t = await e.db.get(o);
    if (!t) throw new Error("Auction not found");
    return await e.db.patch(t._id, {
      winnerAddress: void 0,
      winnerUsername: void 0,
      winningBid: void 0,
      featureStartsAt: void 0,
      featureEndsAt: void 0
    }), console.log(`[ADMIN] Cleared loser data from ${o}`), { success: !0 };
  }, "handler")
});
export {
  m as addMissingFeaturedCast,
  I as cleanupAuctions,
  $ as clearLoserData,
  g as forceEndAuction,
  y as forceProcessLifecycle,
  _ as keepOnlyRecentActive,
  U as processRefundsForAuction,
  v as reactivateAuction,
  H as refundSingleBid,
  E as swapAuctionStatus,
  D as syncFeaturedCasts
};
//# sourceMappingURL=fixAuctionTimer.js.map
