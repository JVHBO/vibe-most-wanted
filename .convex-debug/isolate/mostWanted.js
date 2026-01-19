import {
  a as y,
  c as p
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as t
} from "./_deps/34SVKERO.js";
import {
  a as f
} from "./_deps/5B5TEMMX.js";

// convex/mostWanted.ts
var S = y({
  args: {
    limit: t.optional(t.number()),
    offset: t.optional(t.number())
  },
  handler: /* @__PURE__ */ f(async (r, n) => {
    let a = Math.min(n.limit || 12, 2e4), o = n.offset || 0, c = await r.db.query("farcasterCards").take(1e4), u = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], s = await r.db.query("cardVotes").withIndex("by_date", (e) => e.eq("date", u)).take(5e4), i = /* @__PURE__ */ new Map();
    for (let e of s) {
      let l = i.get(e.cardFid) || 0;
      i.set(e.cardFid, l + e.voteCount);
    }
    let d = c.filter((e) => e.contractAddress).map((e) => ({
      _id: e._id,
      fid: e.fid,
      username: e.username,
      displayName: e.displayName,
      pfpUrl: e.pfpUrl,
      cardImageUrl: e.cardImageUrl,
      rarity: e.rarity,
      mintScore: e.neynarScore,
      currentScore: e.latestNeynarScore ?? e.neynarScore,
      scoreDiff: (e.latestNeynarScore ?? e.neynarScore) - e.neynarScore,
      votes: i.get(e.fid) || 0
    })).sort((e, l) => l.scoreDiff - e.scoreDiff);
    return {
      cards: d.slice(o, o + a),
      totalCount: d.length,
      hasMore: o + a < d.length
    };
  }, "handler")
}), h = p({
  args: {
    fid: t.number(),
    score: t.number()
  },
  handler: /* @__PURE__ */ f(async (r, { fid: n, score: a }) => {
    let o = await r.db.query("farcasterCards").withIndex("by_fid", (c) => c.eq("fid", n)).first();
    return o ? (await r.db.patch(o._id, {
      latestNeynarScore: a,
      latestScoreCheckedAt: Date.now()
    }), { success: !0 }) : { success: !1, error: "Card not found" };
  }, "handler")
}), w = p({
  args: {
    updates: t.array(t.object({
      fid: t.number(),
      score: t.number()
    }))
  },
  handler: /* @__PURE__ */ f(async (r, { updates: n }) => {
    let a = 0, o = 0;
    for (let { fid: c, score: u } of n) {
      let s = await r.db.query("farcasterCards").withIndex("by_fid", (d) => d.eq("fid", c)).first();
      if (!s) continue;
      let i = s.latestNeynarScore ?? s.neynarScore;
      if (Math.abs(i - u) < 1e-4) {
        o++;
        continue;
      }
      await r.db.patch(s._id, {
        latestNeynarScore: u,
        latestScoreCheckedAt: Date.now()
      }), a++;
    }
    return { success: !0, updatedCount: a, skippedCount: o };
  }, "handler")
}), g = y({
  args: {},
  handler: /* @__PURE__ */ f(async (r) => (await r.db.query("farcasterCards").take(1e4)).map((a) => a.fid), "handler")
});
export {
  w as batchUpdateScores,
  g as getFidsForScoreUpdate,
  S as getRanking,
  h as updateLatestScore
};
//# sourceMappingURL=mostWanted.js.map
