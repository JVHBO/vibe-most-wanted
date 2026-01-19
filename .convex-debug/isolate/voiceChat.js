import {
  a as p,
  c as d,
  d as g
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as n
} from "./_deps/34SVKERO.js";
import {
  a as s
} from "./_deps/5B5TEMMX.js";

// convex/voiceChat.ts
var m = d({
  args: {
    roomId: n.string(),
    sender: n.string(),
    recipient: n.string(),
    type: n.union(n.literal("offer"), n.literal("answer"), n.literal("ice-candidate")),
    data: n.any()
    // SDP or ICE candidate
  },
  handler: /* @__PURE__ */ s(async (o, { roomId: a, sender: r, recipient: e, type: t, data: i }) => {
    let c = r.toLowerCase(), l = e.toLowerCase();
    return await o.db.insert("voiceSignaling", {
      roomId: a,
      sender: c,
      recipient: l,
      type: t,
      data: i,
      timestamp: Date.now(),
      processed: !1
    }), console.log(`[VoiceChat] ${t} sent from ${c} to ${l} in room ${a}`), { success: !0 };
  }, "handler")
}), f = p({
  args: {
    recipient: n.string(),
    roomId: n.string()
  },
  handler: /* @__PURE__ */ s(async (o, { recipient: a, roomId: r }) => {
    let e = a.toLowerCase();
    return await o.db.query("voiceSignaling").withIndex(
      "by_recipient",
      (i) => i.eq("recipient", e).eq("processed", !1)
    ).filter((i) => i.eq(i.field("roomId"), r)).order("asc").collect();
  }, "handler")
}), y = d({
  args: {
    signalIds: n.array(n.id("voiceSignaling"))
  },
  handler: /* @__PURE__ */ s(async (o, { signalIds: a }) => {
    let r = 0;
    for (let e of a)
      try {
        await o.db.patch(e, { processed: !0 }), r++;
      } catch (t) {
        console.error(`[VoiceChat] Failed to mark signal ${e} as processed:`, t);
      }
    return console.log(`[VoiceChat] Marked ${r}/${a.length} signals as processed`), { success: !0, processed: r };
  }, "handler")
}), w = g({
  args: {},
  handler: /* @__PURE__ */ s(async (o) => {
    let a = Date.now() - 3e5, r = await o.db.query("voiceSignaling").filter((t) => t.lt(t.field("timestamp"), a)).collect(), e = 0;
    for (let t of r)
      try {
        await o.db.delete(t._id), e++;
      } catch (i) {
        console.error(`[VoiceChat] Failed to delete signal ${t._id}:`, i);
      }
    return console.log(`[VoiceChat] Cleaned up ${e}/${r.length} old signals`), { deleted: e };
  }, "handler")
}), C = d({
  args: {
    roomId: n.string(),
    address: n.string(),
    username: n.string()
  },
  handler: /* @__PURE__ */ s(async (o, { roomId: a, address: r, username: e }) => {
    let t = r.toLowerCase(), i = e.toLowerCase();
    if (t.startsWith("cpu_") || t.startsWith("mecha_") || i.startsWith("mecha ") || i.startsWith("cpu "))
      return console.log(`[VoiceChat] BLOCKED: CPU/Mecha ${e} cannot join voice`), { success: !1, blocked: !0, reason: "CPUs cannot join voice" };
    let c = await o.db.query("voiceParticipants").filter((l) => l.eq(l.field("address"), t)).collect();
    for (let l of c)
      await o.db.delete(l._id), console.log(`[VoiceChat] Cleaned stale entry for ${t} in room ${l.roomId}`);
    return await o.db.insert("voiceParticipants", {
      roomId: a,
      address: t,
      username: e,
      joinedAt: Date.now()
    }), console.log(`[VoiceChat] ${e} joined voice in room ${a}`), { success: !0 };
  }, "handler")
}), $ = d({
  args: {
    roomId: n.string(),
    address: n.string()
  },
  handler: /* @__PURE__ */ s(async (o, { roomId: a, address: r }) => {
    let e = r.toLowerCase(), t = await o.db.query("voiceParticipants").filter((c) => c.eq(c.field("address"), e)).collect(), i = 0;
    for (let c of t)
      await o.db.delete(c._id), i++;
    return i > 0 && console.log(`[VoiceChat] ${e} left voice (cleaned ${i} entries)`), { success: !0, deleted: i };
  }, "handler")
}), b = p({
  args: {
    roomId: n.string()
  },
  handler: /* @__PURE__ */ s(async (o, { roomId: a }) => (await o.db.query("voiceParticipants").withIndex("by_room", (e) => e.eq("roomId", a)).collect()).map((e) => ({
    address: e.address,
    username: e.username,
    joinedAt: e.joinedAt
  })), "handler")
}), v = d({
  args: {
    roomId: n.string()
  },
  handler: /* @__PURE__ */ s(async (o, { roomId: a }) => {
    let r = await o.db.query("voiceParticipants").withIndex("by_room", (t) => t.eq("roomId", a)).collect(), e = 0;
    for (let t of r)
      try {
        await o.db.delete(t._id), e++;
      } catch (i) {
        console.error(`[VoiceChat] Failed to delete participant ${t._id}:`, i);
      }
    return console.log(`[VoiceChat] Cleaned up ${e}/${r.length} voice participants for room ${a}`), { deleted: e };
  }, "handler")
}), V = d({
  args: {},
  handler: /* @__PURE__ */ s(async (o) => {
    let a = Date.now() - 18e5, r = await o.db.query("voiceParticipants").filter((t) => t.lt(t.field("joinedAt"), a)).collect(), e = 0;
    for (let t of r)
      try {
        await o.db.delete(t._id), e++;
      } catch (i) {
        console.error(`[VoiceChat] Failed to delete stale participant ${t._id}:`, i);
      }
    return console.log(`[VoiceChat] Cleaned up ${e}/${r.length} stale voice participants`), { deleted: e };
  }, "handler")
}), P = g({
  args: {},
  handler: /* @__PURE__ */ s(async (o) => {
    let a = await o.db.query("voiceParticipants").collect(), r = 0;
    for (let e of a)
      try {
        await o.db.delete(e._id), r++;
      } catch (t) {
        console.error(`[VoiceChat] Failed to delete participant ${e._id}:`, t);
      }
    return console.log(`[VoiceChat] Emergency cleanup: removed ${r}/${a.length} voice participants`), { deleted: r };
  }, "handler")
});
export {
  P as cleanupAllVoiceParticipants,
  w as cleanupOldSignals,
  v as cleanupRoomVoice,
  V as cleanupStaleVoiceParticipants,
  f as getSignals,
  b as getVoiceParticipants,
  C as joinVoiceChannel,
  $ as leaveVoiceChannel,
  y as markSignalsProcessed,
  m as sendSignal
};
//# sourceMappingURL=voiceChat.js.map
