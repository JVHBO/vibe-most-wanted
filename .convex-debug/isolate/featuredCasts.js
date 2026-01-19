import {
  a as y,
  c as h,
  d as u
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as s
} from "./_deps/34SVKERO.js";
import {
  a as o
} from "./_deps/5B5TEMMX.js";

// convex/featuredCasts.ts
var A = y({
  args: {},
  handler: /* @__PURE__ */ o(async (e) => (await e.db.query("featuredCasts").withIndex("by_active", (t) => t.eq("active", !0)).collect()).sort((t, r) => t.order - r.order), "handler")
}), q = u({
  args: {
    castHash: s.string(),
    warpcastUrl: s.string(),
    order: s.number()
  },
  handler: /* @__PURE__ */ o(async (e, a) => {
    let t = await e.db.query("featuredCasts").withIndex("by_order", (r) => r.eq("order", a.order)).first();
    return t ? (await e.db.patch(t._id, {
      castHash: a.castHash,
      warpcastUrl: a.warpcastUrl,
      active: !0,
      addedAt: Date.now()
    }), t._id) : await e.db.insert("featuredCasts", {
      castHash: a.castHash,
      warpcastUrl: a.warpcastUrl,
      order: a.order,
      active: !0,
      addedAt: Date.now()
    });
  }, "handler")
}), C = u({
  args: {
    order: s.number()
  },
  handler: /* @__PURE__ */ o(async (e, a) => {
    let t = await e.db.query("featuredCasts").withIndex("by_order", (r) => r.eq("order", a.order)).first();
    t && await e.db.patch(t._id, { active: !1 });
  }, "handler")
}), g = 300, b = 2, E = y({
  args: { address: s.string(), castHash: s.string() },
  handler: /* @__PURE__ */ o(async (e, { address: a, castHash: t }) => {
    let r = a.toLowerCase(), n = await e.db.query("castInteractions").withIndex(
      "by_player_cast",
      (i) => i.eq("playerAddress", r).eq("castHash", t)
    ).collect();
    return {
      liked: n.some((i) => i.interactionType === "like" && i.claimed),
      recasted: n.some((i) => i.interactionType === "recast" && i.claimed),
      replied: n.some((i) => i.interactionType === "reply" && i.claimed)
    };
  }, "handler")
}), x = h({
  args: {
    address: s.string(),
    castHash: s.string(),
    interactionType: s.union(s.literal("like"), s.literal("recast"), s.literal("reply"))
  },
  handler: /* @__PURE__ */ o(async (e, { address: a, castHash: t, interactionType: r }) => {
    let n = a.toLowerCase();
    if (await e.db.query("castInteractions").withIndex(
      "by_player_cast",
      (c) => c.eq("playerAddress", n).eq("castHash", t)
    ).filter((c) => c.eq(c.field("interactionType"), r)).first())
      throw new Error("Already claimed this reward");
    let l = await e.db.query("profiles").withIndex("by_address", (c) => c.eq("address", n)).first();
    if (!l)
      throw new Error("Profile not found");
    let d = g, w = l.hasVibeBadge === !0;
    w && (d = d * b);
    let f = l.coins || 0, p = f + d, m = (l.lifetimeEarned || 0) + d;
    return await e.db.patch(l._id, {
      coins: p,
      lifetimeEarned: m,
      lastUpdated: Date.now()
    }), await e.db.insert("coinTransactions", {
      address: n,
      amount: d,
      type: "earn",
      source: "featured_cast",
      description: `Featured cast ${r}`,
      timestamp: Date.now(),
      balanceBefore: f,
      balanceAfter: p
    }), await e.db.insert("castInteractions", {
      playerAddress: n,
      castHash: t,
      interactionType: r,
      claimed: !0,
      claimedAt: Date.now()
    }), console.log(`\u{1F3AC} Cast ${r} reward: ${d} TESTVBMS for ${n}${w ? " (2x VIBE bonus)" : ""}`), {
      success: !0,
      reward: d,
      newBalance: p,
      interactionType: r,
      hasVibeBadge: w,
      bonusApplied: w ? b : 1
    };
  }, "handler")
}), B = u({
  args: { address: s.string() },
  handler: /* @__PURE__ */ o(async (e, { address: a }) => {
    let t = a.toLowerCase(), r = await e.db.query("castInteractions").withIndex("by_player", (n) => n.eq("playerAddress", t)).collect();
    for (let n of r)
      await e.db.delete(n._id);
    return console.log(`\u{1F504} Reset ${r.length} cast interactions for ${t}`), {
      success: !0,
      deleted: r.length
    };
  }, "handler")
});
export {
  x as claimCastInteractionReward,
  A as getActiveCasts,
  E as getCastInteractionProgress,
  C as removeFeaturedCast,
  B as resetCastInteractions,
  q as setFeaturedCast
};
//# sourceMappingURL=featuredCasts.js.map
