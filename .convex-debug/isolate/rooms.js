import {
  a as g,
  c,
  d as w
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as n
} from "./_deps/34SVKERO.js";
import {
  a as i
} from "./_deps/5B5TEMMX.js";

// convex/rooms.ts
var I = g({
  args: { code: n.string() },
  handler: /* @__PURE__ */ i(async (t, { code: r }) => await t.db.query("rooms").withIndex("by_room_id", (e) => e.eq("roomId", r)).first(), "handler")
}), k = g({
  args: { limit: n.optional(n.number()) },
  handler: /* @__PURE__ */ i(async (t, { limit: r = 20 }) => await t.db.query("rooms").withIndex("by_status", (e) => e.eq("status", "waiting")).order("desc").take(r), "handler")
}), C = g({
  args: { playerAddress: n.string() },
  handler: /* @__PURE__ */ i(async (t, { playerAddress: r }) => {
    let o = r.toLowerCase();
    return await t.db.query("matchmaking").withIndex("by_player", (s) => s.eq("playerAddress", o)).first();
  }, "handler")
}), R = g({
  args: { playerAddress: n.string() },
  handler: /* @__PURE__ */ i(async (t, { playerAddress: r }) => {
    let o = r.toLowerCase(), e = await t.db.query("rooms").filter((a) => a.eq(a.field("hostAddress"), o)).filter((a) => a.neq(a.field("status"), "finished")).first();
    return e || await t.db.query("rooms").filter((a) => a.eq(a.field("guestAddress"), o)).filter((a) => a.neq(a.field("status"), "finished")).first();
  }, "handler")
}), D = c({
  args: {
    hostAddress: n.string(),
    hostUsername: n.string(),
    mode: n.optional(n.union(n.literal("ranked"), n.literal("casual")))
  },
  handler: /* @__PURE__ */ i(async (t, { hostAddress: r, hostUsername: o, mode: e = "ranked" }) => {
    let s, a = 0, u = 10;
    for (; a < u; ) {
      if (s = crypto.randomUUID().replace(/-/g, "").substring(0, 6).toUpperCase(), !await t.db.query("rooms").withIndex("by_room_id", (m) => m.eq("roomId", s)).first()) {
        let m = Date.now(), h = await t.db.insert("rooms", {
          roomId: s,
          status: "waiting",
          mode: e,
          hostAddress: r.toLowerCase(),
          hostUsername: o,
          createdAt: m
        });
        return console.log(`\u2705 Room created in Convex: ${s} (${e})`), s;
      }
      a++;
    }
    throw new Error("Failed to generate unique room code after 10 attempts");
  }, "handler")
}), x = c({
  args: {
    code: n.string(),
    guestAddress: n.string(),
    guestUsername: n.string()
  },
  handler: /* @__PURE__ */ i(async (t, { code: r, guestAddress: o, guestUsername: e }) => {
    let s = await t.db.query("rooms").withIndex("by_room_id", (a) => a.eq("roomId", r)).first();
    if (!s)
      throw new Error("Sala n\xE3o encontrada");
    if (s.guestAddress)
      throw new Error("Sala j\xE1 est\xE1 cheia");
    if (s.hostAddress === o.toLowerCase())
      throw new Error("Voc\xEA n\xE3o pode entrar na pr\xF3pria sala");
    return await t.db.patch(s._id, {
      guestAddress: o.toLowerCase(),
      guestUsername: e,
      status: "ready"
    }), console.log("\u2705 Guest joined room:", r), !0;
  }, "handler")
}), U = c({
  args: {
    code: n.string(),
    playerAddress: n.string(),
    cards: n.array(n.any()),
    power: n.number()
  },
  handler: /* @__PURE__ */ i(async (t, { code: r, playerAddress: o, cards: e, power: s }) => {
    let a = await t.db.query("rooms").withIndex("by_room_id", (m) => m.eq("roomId", r)).first();
    if (!a)
      throw new Error("Sala n\xE3o encontrada");
    let u = o.toLowerCase();
    a.hostAddress === u ? await t.db.patch(a._id, {
      hostCards: e,
      hostPower: s
    }) : await t.db.patch(a._id, {
      guestCards: e,
      guestPower: s
    });
    let l = await t.db.get(a._id);
    l && l.hostCards && l.guestCards && l.status === "ready" && await t.db.patch(a._id, {
      status: "playing",
      startedAt: Date.now()
    }), console.log("\u2705 Cards updated for room:", r);
  }, "handler")
}), L = c({
  args: {
    code: n.string(),
    winnerId: n.string()
  },
  handler: /* @__PURE__ */ i(async (t, { code: r, winnerId: o }) => {
    let e = await t.db.query("rooms").withIndex("by_room_id", (s) => s.eq("roomId", r)).first();
    if (!e)
      throw new Error("Sala n\xE3o encontrada");
    await t.db.patch(e._id, {
      status: "finished",
      winnerId: o,
      finishedAt: Date.now()
    }), console.log("\u2705 Room finished:", r, "winner:", o);
  }, "handler")
}), M = c({
  args: {
    code: n.string(),
    playerAddress: n.string()
  },
  handler: /* @__PURE__ */ i(async (t, { code: r, playerAddress: o }) => {
    let e = await t.db.query("rooms").withIndex("by_room_id", (a) => a.eq("roomId", r)).first();
    if (!e)
      return;
    let s = o.toLowerCase();
    e.hostAddress === s ? (await t.db.delete(e._id), console.log("\u2705 Room deleted (host left):", r)) : e.guestAddress === s && (await t.db.patch(e._id, {
      guestAddress: void 0,
      guestUsername: void 0,
      guestCards: void 0,
      guestPower: void 0,
      status: "waiting"
    }), console.log("\u2705 Guest removed from room:", r));
  }, "handler")
}), E = w({
  args: {},
  handler: /* @__PURE__ */ i(async (t) => {
    let r = Date.now() - 3e5, o = await t.db.query("rooms").filter((s) => s.lt(s.field("createdAt"), r)).collect(), e = 0;
    for (let s of o)
      await t.db.delete(s._id), e++;
    return e > 0 && console.log(`\u2705 Cleaned up ${e} old rooms`), e;
  }, "handler")
}), z = c({
  args: {},
  handler: /* @__PURE__ */ i(async (t) => {
    let r = Date.now() - 3e5, o = await t.db.query("rooms").filter((s) => s.lt(s.field("createdAt"), r)).collect(), e = 0;
    for (let s of o)
      await t.db.delete(s._id), e++;
    return e > 0 && console.log(`\u2705 Cleaned up ${e} old rooms (public)`), e;
  }, "handler")
}), P = c({
  args: {
    playerAddress: n.string(),
    playerUsername: n.string()
  },
  handler: /* @__PURE__ */ i(async (t, { playerAddress: r, playerUsername: o }) => {
    let e = r.toLowerCase(), s = await t.db.query("matchmaking").withIndex("by_player", (a) => a.eq("playerAddress", e)).first();
    s ? await t.db.patch(s._id, {
      createdAt: Date.now(),
      status: "searching"
    }) : await t.db.insert("matchmaking", {
      playerAddress: e,
      playerUsername: o,
      status: "searching",
      createdAt: Date.now()
    }), console.log("\u2705 Added to matchmaking:", e);
  }, "handler")
}), v = c({
  args: {
    playerAddress: n.string(),
    playerUsername: n.string()
  },
  handler: /* @__PURE__ */ i(async (t, { playerAddress: r, playerUsername: o }) => {
    let e = r.toLowerCase(), s = Date.now() - 30 * 1e3, a = await t.db.query("matchmaking").withIndex("by_status", (d) => d.eq("status", "searching")).filter(
      (d) => d.and(
        d.neq(d.field("playerAddress"), e),
        d.gt(d.field("createdAt"), s)
      )
    ).take(1);
    if (a.length > 0) {
      let d = a[0], l = "", m = 0, h = 10;
      for (; m < h && (l = crypto.randomUUID().replace(/-/g, "").substring(0, 6).toUpperCase(), !!await t.db.query("rooms").withIndex("by_room_id", (b) => b.eq("roomId", l)).first()); )
        m++;
      if (m >= h)
        throw new Error("Failed to generate unique room code after 10 attempts");
      let y = Date.now();
      await t.db.insert("rooms", {
        roomId: l,
        status: "ready",
        mode: "ranked",
        // Auto-match is always ranked (costs coins, awards coins)
        hostAddress: e,
        hostUsername: o,
        guestAddress: d.playerAddress,
        guestUsername: d.playerUsername,
        createdAt: y
      }), await t.db.patch(d._id, {
        status: "matched",
        matchedWith: e
      });
      let p = await t.db.query("matchmaking").withIndex(
        "by_player",
        (f) => f.eq("playerAddress", e)
      ).first();
      return p ? await t.db.patch(p._id, {
        status: "matched",
        matchedWith: d.playerAddress
      }) : await t.db.insert("matchmaking", {
        playerAddress: e,
        playerUsername: o,
        status: "matched",
        matchedWith: d.playerAddress,
        createdAt: y
      }), console.log("\u2705 Match found! Room:", l), l;
    }
    let u = await t.db.query("matchmaking").withIndex("by_player", (d) => d.eq("playerAddress", e)).first();
    return u ? await t.db.patch(u._id, {
      createdAt: Date.now(),
      status: "searching"
    }) : await t.db.insert("matchmaking", {
      playerAddress: e,
      playerUsername: o,
      status: "searching",
      createdAt: Date.now()
    }), console.log("\u23F3 Added to matchmaking queue:", e), null;
  }, "handler")
}), S = c({
  args: {
    playerAddress: n.string()
  },
  handler: /* @__PURE__ */ i(async (t, { playerAddress: r }) => {
    let o = r.toLowerCase(), e = await t.db.query("matchmaking").withIndex("by_player", (s) => s.eq("playerAddress", o)).first();
    e && (await t.db.patch(e._id, {
      status: "cancelled"
    }), console.log("\u2705 Cancelled matchmaking:", o));
  }, "handler")
}), $ = w({
  args: {},
  handler: /* @__PURE__ */ i(async (t) => {
    let r = Date.now() - 6e4, o = await t.db.query("matchmaking").filter((s) => s.lt(s.field("createdAt"), r)).collect(), e = 0;
    for (let s of o)
      await t.db.delete(s._id), e++;
    return e > 0 && console.log(`\u2705 Cleaned up ${e} old matchmaking entries`), e;
  }, "handler")
});
export {
  P as addToMatchmaking,
  S as cancelMatchmaking,
  $ as cleanupMatchmaking,
  E as cleanupOldRooms,
  z as cleanupOldRoomsPublic,
  D as createRoom,
  v as findMatch,
  L as finishRoom,
  C as getMatchmakingStatus,
  I as getRoom,
  R as getRoomByPlayer,
  k as getWaitingRooms,
  x as joinRoom,
  M as leaveRoom,
  U as updateCards
};
//# sourceMappingURL=rooms.js.map
