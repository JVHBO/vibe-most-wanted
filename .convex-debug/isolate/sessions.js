import {
  a as l,
  c as a
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as r
} from "./_deps/34SVKERO.js";
import {
  a as d
} from "./_deps/5B5TEMMX.js";

// convex/sessions.ts
var c = 300 * 1e3, w = a({
  args: {
    profileAddress: r.string(),
    sessionId: r.string(),
    deviceInfo: r.optional(r.string())
  },
  handler: /* @__PURE__ */ d(async (s, e) => {
    let o = e.profileAddress.toLowerCase(), i = Date.now(), n = await s.db.query("activeSessions").withIndex("by_profile", (t) => t.eq("profileAddress", o)).first();
    return n && n.sessionId === e.sessionId ? (await s.db.patch(n._id, {
      lastHeartbeat: i,
      deviceInfo: e.deviceInfo
    }), { success: !0, isNewSession: !1 }) : (n && await s.db.delete(n._id), await s.db.insert("activeSessions", {
      profileAddress: o,
      sessionId: e.sessionId,
      deviceInfo: e.deviceInfo,
      connectedAt: i,
      lastHeartbeat: i
    }), { success: !0, isNewSession: !0 });
  }, "handler")
}), u = a({
  args: {
    profileAddress: r.string(),
    sessionId: r.string()
  },
  handler: /* @__PURE__ */ d(async (s, e) => {
    let o = e.profileAddress.toLowerCase(), i = Date.now(), n = await s.db.query("activeSessions").withIndex("by_profile", (t) => t.eq("profileAddress", o)).first();
    return n ? n.sessionId !== e.sessionId ? { valid: !1, reason: "session_invalidated" } : (await s.db.patch(n._id, {
      lastHeartbeat: i
    }), { valid: !0 }) : { valid: !1, reason: "no_session" };
  }, "handler")
}), I = l({
  args: {
    profileAddress: r.string(),
    sessionId: r.string()
  },
  handler: /* @__PURE__ */ d(async (s, e) => {
    let o = e.profileAddress.toLowerCase(), i = await s.db.query("activeSessions").withIndex("by_profile", (t) => t.eq("profileAddress", o)).first();
    return i ? i.sessionId !== e.sessionId ? { valid: !1, reason: "session_invalidated" } : Date.now() - i.lastHeartbeat > c ? { valid: !1, reason: "session_expired" } : { valid: !0 } : { valid: !1, reason: "no_session" };
  }, "handler")
}), b = a({
  args: {
    profileAddress: r.string(),
    sessionId: r.string()
  },
  handler: /* @__PURE__ */ d(async (s, e) => {
    let o = e.profileAddress.toLowerCase(), i = await s.db.query("activeSessions").withIndex("by_profile", (n) => n.eq("profileAddress", o)).first();
    return i && i.sessionId === e.sessionId ? (await s.db.delete(i._id), { success: !0 }) : { success: !1, reason: "not_your_session" };
  }, "handler")
}), v = a({
  args: {},
  handler: /* @__PURE__ */ d(async (s) => {
    let o = Date.now() - c, i = await s.db.query("activeSessions").collect(), n = 0;
    for (let t of i)
      t.lastHeartbeat < o && (await s.db.delete(t._id), n++);
    return { cleaned: n };
  }, "handler")
}), A = l({
  args: {
    profileAddress: r.string()
  },
  handler: /* @__PURE__ */ d(async (s, e) => {
    let o = e.profileAddress.toLowerCase();
    return await s.db.query("activeSessions").withIndex("by_profile", (i) => i.eq("profileAddress", o)).first();
  }, "handler")
});
export {
  I as checkSession,
  v as cleanupExpiredSessions,
  b as endSession,
  A as getActiveSession,
  u as heartbeat,
  w as registerSession
};
//# sourceMappingURL=sessions.js.map
