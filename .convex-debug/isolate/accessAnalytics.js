import {
  a as g,
  c as f
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as e
} from "./_deps/34SVKERO.js";
import {
  a as d
} from "./_deps/5B5TEMMX.js";

// convex/accessAnalytics.ts
function p() {
  let n = /* @__PURE__ */ new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}
d(p, "getTodayKey");
var A = f({
  args: {
    address: e.string(),
    source: e.union(
      e.literal("miniapp"),
      e.literal("farcaster_web"),
      e.literal("web"),
      e.literal("frame")
    )
  },
  handler: /* @__PURE__ */ d(async (n, { address: r, source: i }) => {
    let a = p(), o = r.toLowerCase(), t = await n.db.query("accessAnalytics").withIndex(
      "by_date_source",
      (c) => c.eq("date", a).eq("source", i)
    ).first();
    t ? t.addresses.includes(o) ? await n.db.patch(t._id, {
      sessions: t.sessions + 1
    }) : await n.db.patch(t._id, {
      uniqueUsers: t.uniqueUsers + 1,
      sessions: t.sessions + 1,
      addresses: [...t.addresses, o]
    }) : await n.db.insert("accessAnalytics", {
      date: a,
      source: i,
      uniqueUsers: 1,
      sessions: 1,
      addresses: [o]
    }), console.log(`\u{1F4CA} Access logged: ${i} - ${o}`);
  }, "handler")
}), _ = g({
  args: {
    startDate: e.optional(e.string()),
    // YYYY-MM-DD, defaults to 7 days ago
    endDate: e.optional(e.string())
    // YYYY-MM-DD, defaults to today
  },
  handler: /* @__PURE__ */ d(async (n, { startDate: r, endDate: i }) => {
    let a = p(), o = i || a, t = r || (() => {
      let s = /* @__PURE__ */ new Date();
      return s.setDate(s.getDate() - 7), `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
    })(), c = await n.db.query("accessAnalytics").withIndex("by_date").filter(
      (s) => s.and(
        s.gte(s.field("date"), t),
        s.lte(s.field("date"), o)
      )
    ).take(1500), u = {
      miniapp: { uniqueUsers: 0, sessions: 0 },
      farcaster_web: { uniqueUsers: 0, sessions: 0 },
      web: { uniqueUsers: 0, sessions: 0 },
      frame: { uniqueUsers: 0, sessions: 0 }
    }, b = {};
    for (let s of c)
      u[s.source] || (u[s.source] = { uniqueUsers: 0, sessions: 0 }), u[s.source].uniqueUsers += s.uniqueUsers, u[s.source].sessions += s.sessions, b[s.date] || (b[s.date] = {
        miniapp: { uniqueUsers: 0, sessions: 0 },
        farcaster_web: { uniqueUsers: 0, sessions: 0 },
        web: { uniqueUsers: 0, sessions: 0 },
        frame: { uniqueUsers: 0, sessions: 0 }
      }), b[s.date][s.source] = {
        uniqueUsers: s.uniqueUsers,
        sessions: s.sessions
      };
    let q = u.miniapp.uniqueUsers + u.farcaster_web.uniqueUsers, l = q + u.web.uniqueUsers + u.frame.uniqueUsers, U = l > 0 ? Math.round(u.miniapp.uniqueUsers / l * 100) : 0, w = l > 0 ? Math.round(u.farcaster_web.uniqueUsers / l * 100) : 0, y = l > 0 ? Math.round(u.web.uniqueUsers / l * 100) : 0;
    return {
      totals: u,
      byDate: b,
      summary: {
        totalUniqueUsers: l,
        farcasterTotal: q,
        miniappPercent: U,
        farcasterWebPercent: w,
        webPercent: y,
        dateRange: { start: t, end: o }
      }
    };
  }, "handler")
}), D = g({
  args: {
    date: e.optional(e.string()),
    source: e.union(e.literal("miniapp"), e.literal("farcaster_web"), e.literal("web"), e.literal("frame"))
  },
  handler: /* @__PURE__ */ d(async (n, { date: r, source: i }) => {
    let a = r || p(), o = await n.db.query("accessAnalytics").withIndex(
      "by_date_source",
      (t) => t.eq("date", a).eq("source", i)
    ).first();
    return {
      date: a,
      source: i,
      addresses: o?.addresses || [],
      count: o?.addresses.length || 0
    };
  }, "handler")
}), x = g({
  args: {},
  handler: /* @__PURE__ */ d(async (n) => {
    let r = p(), i = await n.db.query("accessAnalytics").withIndex("by_date", (c) => c.eq("date", r)).take(10), a = {
      miniapp: { uniqueUsers: 0, sessions: 0 },
      farcaster_web: { uniqueUsers: 0, sessions: 0 },
      web: { uniqueUsers: 0, sessions: 0 },
      frame: { uniqueUsers: 0, sessions: 0 }
    };
    for (let c of i)
      c.source in a && (a[c.source] = {
        uniqueUsers: c.uniqueUsers,
        sessions: c.sessions
      });
    let o = a.miniapp.uniqueUsers + a.farcaster_web.uniqueUsers, t = o + a.web.uniqueUsers + a.frame.uniqueUsers;
    return {
      date: r,
      ...a,
      total: t,
      farcasterTotal: o,
      // miniapp + farcaster_web (all Farcaster traffic)
      miniappPercent: t > 0 ? Math.round(a.miniapp.uniqueUsers / t * 100) : 0,
      farcasterWebPercent: t > 0 ? Math.round(a.farcaster_web.uniqueUsers / t * 100) : 0,
      farcasterTotalPercent: t > 0 ? Math.round(o / t * 100) : 0
    };
  }, "handler")
}), $ = f({
  args: {
    address: e.string(),
    source: e.string(),
    userAgent: e.optional(e.string()),
    referrer: e.optional(e.string()),
    currentUrl: e.optional(e.string()),
    isIframe: e.optional(e.boolean()),
    sdkAvailable: e.optional(e.boolean())
  },
  handler: /* @__PURE__ */ d(async (n, r) => {
    await n.db.insert("accessDebugLogs", {
      address: r.address.toLowerCase(),
      source: r.source,
      userAgent: r.userAgent,
      referrer: r.referrer,
      currentUrl: r.currentUrl,
      isIframe: r.isIframe,
      sdkAvailable: r.sdkAvailable,
      timestamp: Date.now()
    }), console.log(`\u{1F50D} Access debug logged: ${r.source} - ${r.address}`);
  }, "handler")
}), I = g({
  args: {
    limit: e.optional(e.number())
  },
  handler: /* @__PURE__ */ d(async (n, { limit: r = 50 }) => await n.db.query("accessDebugLogs").withIndex("by_timestamp").order("desc").take(r), "handler")
}), S = g({
  args: {
    address: e.string()
  },
  handler: /* @__PURE__ */ d(async (n, { address: r }) => await n.db.query("accessDebugLogs").withIndex("by_address", (a) => a.eq("address", r.toLowerCase())).take(500), "handler")
});
export {
  S as getAccessDebugByAddress,
  I as getAccessDebugLogs,
  D as getAddressesBySource,
  _ as getAnalytics,
  x as getTodayAnalytics,
  A as logAccess,
  $ as logAccessDebug
};
//# sourceMappingURL=accessAnalytics.js.map
