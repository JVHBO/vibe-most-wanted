import {
  a as k,
  c as C
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as l
} from "./_deps/34SVKERO.js";
import {
  a as u
} from "./_deps/5B5TEMMX.js";

// convex/neynarScore.ts
var _ = C({
  args: {
    fid: l.number(),
    username: l.string(),
    score: l.number(),
    rarity: l.string()
  },
  handler: /* @__PURE__ */ u(async (o, { fid: n, username: r, score: c, rarity: t }) => {
    let e = await o.db.query("neynarScoreHistory").withIndex("by_fid", (d) => d.eq("fid", n)).order("desc").first();
    if (e && Math.abs(e.score - c) < 1e-4)
      return console.log("Score unchanged for FID " + n + ": " + c), { success: !0, saved: !1, reason: "score_unchanged" };
    await o.db.insert("neynarScoreHistory", {
      fid: n,
      username: r,
      score: c,
      rarity: t,
      checkedAt: Date.now()
    });
    let a = e ? e.score : "N/A";
    return console.log("Score saved for FID " + n + ": " + a + " -> " + c), { success: !0, saved: !0 };
  }, "handler")
}), I = k({
  args: {},
  handler: /* @__PURE__ */ u(async (o) => await o.db.query("neynarScoreHistory").order("desc").take(20), "handler")
}), x = k({
  args: { fid: l.number() },
  handler: /* @__PURE__ */ u(async (o, { fid: n }) => {
    let r = await o.db.query("farcasterCards").withIndex("by_fid", (f) => f.eq("fid", n)).first(), c = await o.db.query("neynarScoreHistory").withIndex("by_fid", (f) => f.eq("fid", n)).order("desc").take(50);
    if (!r || !r.neynarScore) {
      if (c.length === 0) return null;
      let f = [...c].sort((w, H) => w.checkedAt - H.checkedAt), h = f[0], g = f[f.length - 1], S = g.score - h.score, A = h.score > 0 ? (S / h.score * 100).toFixed(1) : "0";
      return {
        firstCheck: { score: h.score, rarity: h.rarity, checkedAt: h.checkedAt },
        latestCheck: { score: g.score, rarity: g.rarity, checkedAt: g.checkedAt },
        totalChecks: c.length,
        scoreDiff: S,
        percentChange: A,
        history: c.slice(0, 10)
      };
    }
    let t = {
      _id: "mint",
      fid: r.fid,
      username: r.username,
      score: r.neynarScore,
      rarity: r.rarity,
      checkedAt: r.mintedAt || r._creationTime
    };
    if (c.length === 0)
      return {
        firstCheck: { score: r.neynarScore, rarity: r.rarity, checkedAt: t.checkedAt },
        latestCheck: { score: r.neynarScore, rarity: r.rarity, checkedAt: t.checkedAt },
        totalChecks: 1,
        scoreDiff: 0,
        percentChange: "0",
        history: [t],
        isMintTimeOnly: !0,
        mintRarity: r.rarity
        // Original mint rarity
      };
    let e = [...c, t].sort((f, h) => f.checkedAt - h.checkedAt), s = [...c].sort((f, h) => f.checkedAt - h.checkedAt)[0]?.rarity || r.rarity, i = t, y = e[e.length - 1], m = y.score - i.score, p = i.score > 0 ? (m / i.score * 100).toFixed(1) : "0", b = e.slice(-10).reverse();
    return {
      firstCheck: { score: i.score, rarity: s, checkedAt: i.checkedAt },
      latestCheck: { score: y.score, rarity: y.rarity, checkedAt: y.checkedAt },
      totalChecks: e.length,
      scoreDiff: m,
      percentChange: p,
      history: b,
      mintTimeScore: r.neynarScore,
      mintRarity: s
      // Original mint rarity from oldest history entry
    };
  }, "handler")
}), v = C({
  args: {},
  handler: /* @__PURE__ */ u(async (o) => {
    let n = await o.db.query("farcasterCards").collect(), r = 0, c = 0;
    for (let t of n) {
      if (await o.db.query("neynarScoreHistory").withIndex("by_fid", (a) => a.eq("fid", t.fid)).first()) {
        c++;
        continue;
      }
      await o.db.insert("neynarScoreHistory", {
        fid: t.fid,
        username: t.username,
        score: t.neynarScore,
        rarity: t.rarity,
        checkedAt: t.mintedAt || t._creationTime
      }), r++;
    }
    return { success: !0, backfilledCount: r, skippedCount: c };
  }, "handler")
}), M = C({
  args: {},
  handler: /* @__PURE__ */ u(async (o) => {
    let n = await o.db.query("neynarScoreHistory").collect(), r = /* @__PURE__ */ new Map();
    for (let t of n) {
      let e = r.get(t.fid) || [];
      e.push(t), r.set(t.fid, e);
    }
    let c = 0;
    for (let [t, e] of r) {
      let a = e.sort((s, i) => s.checkedAt - i.checkedAt), d = null;
      for (let s of a)
        d !== null && Math.abs(s.score - d) < 1e-4 ? (await o.db.delete(s._id), c++) : d = s.score;
    }
    return console.log("Cleanup complete: " + c + " duplicates deleted"), { success: !0, deletedCount: c };
  }, "handler")
}), U = k({
  args: { limit: l.optional(l.number()) },
  handler: /* @__PURE__ */ u(async (o, n) => {
    let r = n.limit || 10, c = await o.db.query("farcasterCards").collect(), t = [];
    for (let e of c) {
      let a = await o.db.query("neynarScoreHistory").withIndex("by_fid", (y) => y.eq("fid", e.fid)).order("desc").first();
      if (!a) continue;
      let d = e.neynarScore, s = a.score, i = s - d;
      i > 0 && t.push({
        fid: e.fid,
        username: e.username,
        displayName: e.displayName,
        pfpUrl: e.pfpUrl,
        cardImageUrl: e.cardImageUrl,
        mintScore: d,
        currentScore: s,
        scoreDiff: i,
        percentChange: (i / d * 100).toFixed(1),
        rarity: e.rarity,
        currentRarity: a.rarity,
        lastChecked: a.checkedAt
      });
    }
    return t.sort((e, a) => a.scoreDiff - e.scoreDiff), t.slice(0, r);
  }, "handler")
}), F = k({
  args: {
    limit: l.optional(l.number()),
    offset: l.optional(l.number())
  },
  handler: /* @__PURE__ */ u(async (o, n) => {
    let r = Math.min(n.limit || 12, 50), c = n.offset || 0, t = await o.db.query("farcasterCards").order("desc").collect(), e = [];
    for (let s of t) {
      let i = await o.db.query("neynarScoreHistory").withIndex("by_fid", (b) => b.eq("fid", s.fid)).order("desc").first(), y = s.neynarScore, m = i?.score || y, p = m - y;
      e.push({
        _id: s._id,
        fid: s.fid,
        username: s.username,
        displayName: s.displayName,
        pfpUrl: s.pfpUrl,
        cardImageUrl: s.cardImageUrl,
        rarity: s.rarity,
        mintScore: y,
        currentScore: m,
        scoreDiff: p,
        percentChange: y > 0 ? p / y * 100 : 0,
        hasScoreHistory: !!i
      });
    }
    e.sort((s, i) => i.scoreDiff - s.scoreDiff);
    let a = e.slice(c, c + r), d = e.length;
    return {
      cards: a,
      totalCount: d,
      hasMore: c + r < d
    };
  }, "handler")
});
export {
  v as backfillScoreHistory,
  M as cleanupDuplicateScores,
  I as getAllScoreHistory,
  F as getMostWantedRanking,
  U as getMostWantedRising,
  x as getScoreHistory,
  _ as saveScoreCheck
};
//# sourceMappingURL=neynarScore.js.map
