import {
  a as c,
  b as s,
  c as d,
  d as f
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as r
} from "./_deps/34SVKERO.js";
import {
  a as o
} from "./_deps/5B5TEMMX.js";

// convex/notificationsHelpers.ts
var y = s({
  args: {},
  handler: /* @__PURE__ */ o(async (t) => await t.db.query("notificationTokens").take(5e4), "handler")
}), g = s({
  args: {},
  handler: /* @__PURE__ */ o(async (t) => await t.db.query("notificationTokens").take(5e4), "handler")
}), k = s({
  args: {
    limit: r.optional(r.number())
  },
  handler: /* @__PURE__ */ o(async (t, e) => {
    let n = e.limit || 500, a = await t.db.query("notificationTokens").take(n);
    return {
      tokens: a,
      count: a.length,
      hasMore: a.length === n
    };
  }, "handler")
}), b = s({
  args: {},
  handler: /* @__PURE__ */ o(async (t) => {
    let e = await t.db.query("tipRotationState").first();
    return e || { currentTipIndex: 0, lastSentAt: Date.now(), _id: null };
  }, "handler")
}), m = d({
  args: {},
  handler: /* @__PURE__ */ o(async (t) => {
    let e = await t.db.query("tipRotationState").first();
    return e ? e._id : await t.db.insert("tipRotationState", {
      currentTipIndex: 0,
      lastSentAt: Date.now()
    });
  }, "handler")
}), h = d({
  args: {
    tipStateId: r.id("tipRotationState"),
    currentTipIndex: r.number()
  },
  handler: /* @__PURE__ */ o(async (t, { tipStateId: e, currentTipIndex: n }) => {
    await t.db.patch(e, {
      currentTipIndex: n,
      lastSentAt: Date.now()
    });
  }, "handler")
}), T = 360 * 60 * 1e3, I = s({
  args: { address: r.string() },
  handler: /* @__PURE__ */ o(async (t, { address: e }) => await t.db.query("lowEnergyNotifications").withIndex("by_address", (a) => a.eq("address", e.toLowerCase())).first(), "handler")
}), S = f({
  args: {
    address: r.string(),
    lowEnergyCount: r.number(),
    expiredCount: r.number()
  },
  handler: /* @__PURE__ */ o(async (t, { address: e, lowEnergyCount: n, expiredCount: a }) => {
    let i = await t.db.query("lowEnergyNotifications").withIndex("by_address", (u) => u.eq("address", e.toLowerCase())).first(), l = Date.now();
    i ? await t.db.patch(i._id, {
      lastNotifiedAt: l,
      lowEnergyCount: n,
      expiredCount: a
    }) : await t.db.insert("lowEnergyNotifications", {
      address: e.toLowerCase(),
      lastNotifiedAt: l,
      lowEnergyCount: n,
      expiredCount: a
    });
  }, "handler")
}), q = d({
  args: {},
  handler: /* @__PURE__ */ o(async (t) => {
    let e = await t.db.query("notificationTokens").take(5e3), n = 0, a = 0;
    for (let i of e)
      i.url.includes("/v1/notify") ? (await t.db.delete(i._id), n++, console.log(`\u{1F5D1}\uFE0F Deleted stale token for FID ${i.fid} (old URL)`)) : i.token && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.token) && (await t.db.delete(i._id), a++, console.log(`\u{1F5D1}\uFE0F Deleted invalid token for FID ${i.fid} (bad format)`));
    return console.log(`\u{1F9F9} Cleanup complete: ${n} old URL tokens, ${a} invalid format tokens deleted`), { deletedOldUrl: n, deletedInvalidFormat: a, total: n + a };
  }, "handler")
}), x = c({
  args: {},
  handler: /* @__PURE__ */ o(async (t) => {
    let e = await t.db.query("notificationTokens").take(1e4), n = {
      total: e.length,
      neynar: 0,
      warpcastNew: 0,
      warpcastOld: 0,
      invalidFormat: 0
    };
    for (let a of e)
      a.url.includes("neynar") ? n.neynar++ : a.url.includes("/v1/frame-notifications") ? n.warpcastNew++ : a.url.includes("/v1/notify") && n.warpcastOld++, a.token && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.token) && n.invalidFormat++;
    return n;
  }, "handler")
});
export {
  q as cleanupStaleTokens,
  y as getAllTokens,
  k as getAllTokensPaginated,
  g as getAllTokensPublic,
  I as getLastLowEnergyNotification,
  b as getTipState,
  x as getTokenStats,
  m as initTipState,
  S as updateLowEnergyNotification,
  h as updateTipState
};
//# sourceMappingURL=notificationsHelpers.js.map
