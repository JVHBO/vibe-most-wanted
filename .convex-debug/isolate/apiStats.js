import {
  a as i,
  c as r
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as o
} from "./_deps/34SVKERO.js";
import {
  a as s
} from "./_deps/5B5TEMMX.js";

// convex/apiStats.ts
var d = r({
  args: {
    key: o.string(),
    // e.g., "gift_nfts_total", "gift_nfts_cache_hit", "rpc_failed"
    amount: o.optional(o.number())
  },
  handler: /* @__PURE__ */ s(async (t, a) => {
    let e = a.amount || 1, n = await t.db.query("apiStats").withIndex("by_key", (l) => l.eq("key", a.key)).first();
    n ? await t.db.patch(n._id, {
      value: n.value + e,
      lastUpdated: Date.now()
    }) : await t.db.insert("apiStats", {
      key: a.key,
      value: e,
      lastUpdated: Date.now()
    });
  }, "handler")
}), p = i({
  args: {},
  handler: /* @__PURE__ */ s(async (t) => {
    let a = await t.db.query("apiStats").collect(), e = {};
    for (let n of a)
      e[n.key] = n.value;
    return e;
  }, "handler")
}), y = r({
  args: {},
  handler: /* @__PURE__ */ s(async (t) => {
    let a = await t.db.query("apiStats").collect();
    for (let e of a)
      await t.db.patch(e._id, { value: 0, lastUpdated: Date.now() });
    return { reset: !0, count: a.length };
  }, "handler")
});
export {
  p as getAll,
  d as increment,
  y as resetAll
};
//# sourceMappingURL=apiStats.js.map
