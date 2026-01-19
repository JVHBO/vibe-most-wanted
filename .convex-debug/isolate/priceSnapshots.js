import {
  a as c,
  c as p,
  d as h
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as t
} from "./_deps/34SVKERO.js";
import {
  a as d
} from "./_deps/5B5TEMMX.js";

// convex/priceSnapshots.ts
var b = p({
  args: {
    prices: t.array(t.object({
      collectionId: t.string(),
      priceEth: t.number(),
      priceUsd: t.number()
    })),
    ethUsdPrice: t.number()
  },
  handler: /* @__PURE__ */ d(async (r, e) => {
    let s = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], i = await r.db.query("priceSnapshots").withIndex("by_date", (a) => a.eq("date", s)).first();
    return i ? (await r.db.patch(i._id, {
      prices: e.prices,
      ethUsdPrice: e.ethUsdPrice,
      timestamp: Date.now()
    }), { updated: !0, date: s }) : (await r.db.insert("priceSnapshots", {
      date: s,
      prices: e.prices,
      ethUsdPrice: e.ethUsdPrice,
      timestamp: Date.now()
    }), { created: !0, date: s });
  }, "handler")
}), S = c({
  args: {},
  handler: /* @__PURE__ */ d(async (r) => {
    let e = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], s = /* @__PURE__ */ new Date();
    s.setDate(s.getDate() - 1);
    let i = s.toISOString().split("T")[0], a = await r.db.query("priceSnapshots").withIndex("by_date", (n) => n.eq("date", i)).first();
    if (a || (a = (await r.db.query("priceSnapshots").order("desc").take(5)).find((u) => u.date !== e) || null), !a)
      return null;
    let o = {};
    for (let n of a.prices)
      o[n.collectionId] = { priceEth: n.priceEth, priceUsd: n.priceUsd };
    return {
      date: a.date,
      prices: o,
      ethUsdPrice: a.ethUsdPrice
    };
  }, "handler")
}), m = c({
  args: {},
  handler: /* @__PURE__ */ d(async (r) => await r.db.query("priceSnapshots").order("desc").take(7), "handler")
}), w = h({
  args: {
    date: t.string(),
    prices: t.array(t.object({
      collectionId: t.string(),
      priceEth: t.number(),
      priceUsd: t.number()
    })),
    ethUsdPrice: t.number()
  },
  handler: /* @__PURE__ */ d(async (r, e) => await r.db.query("priceSnapshots").withIndex("by_date", (i) => i.eq("date", e.date)).first() ? { error: "Snapshot already exists for this date", date: e.date } : (await r.db.insert("priceSnapshots", {
    date: e.date,
    prices: e.prices,
    ethUsdPrice: e.ethUsdPrice,
    timestamp: Date.now()
  }), { created: !0, date: e.date }), "handler")
});
export {
  m as getRecentSnapshots,
  S as getYesterdayPrices,
  w as insertHistoricalSnapshot,
  b as savePriceSnapshot
};
//# sourceMappingURL=priceSnapshots.js.map
