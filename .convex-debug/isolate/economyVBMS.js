import {
  a as f,
  c as l
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as i
} from "./_deps/34SVKERO.js";
import {
  a as d
} from "./_deps/5B5TEMMX.js";

// convex/economyVBMS.ts
var p = {
  pvp: 20
  // 20 VBMS per PvP match
}, u = 100, w = -20, x = l({
  args: {
    address: i.string()
  },
  handler: /* @__PURE__ */ d(async (s, { address: t }) => {
    let e = await s.db.query("profiles").withIndex("by_address", (r) => r.eq("address", t.toLowerCase())).first();
    if (!e)
      throw new Error("Profile not found");
    let o = p.pvp, n = e.coinsInbox || 0;
    if (n < o)
      return {
        success: !1,
        reason: "Insufficient VBMS",
        required: o,
        current: n
      };
    let a = n - o;
    return await s.db.patch(e._id, {
      coinsInbox: a
    }), console.log(`\u{1F4B8} ${t} paid ${o} VBMS entry fee. Inbox: ${n} \u2192 ${a}`), {
      success: !0,
      charged: o,
      newInbox: a
    };
  }, "handler")
}), I = l({
  args: {
    address: i.string(),
    won: i.boolean(),
    opponentAddress: i.optional(i.string())
  },
  handler: /* @__PURE__ */ d(async (s, { address: t, won: e, opponentAddress: o }) => {
    let n = await s.db.query("profiles").withIndex("by_address", (b) => b.eq("address", t.toLowerCase())).first();
    if (!n)
      throw new Error("Profile not found");
    let a = n.coinsInbox || 0, r = 0;
    e ? r = u + p.pvp : r = w;
    let c = a + r;
    return await s.db.patch(n._id, {
      coinsInbox: c,
      lifetimeEarned: (n.lifetimeEarned || 0) + Math.max(0, r)
    }), r > 0 && await s.db.insert("coinTransactions", {
      address: t.toLowerCase(),
      amount: r,
      type: "earn",
      source: "pvp_vbms",
      description: `PvP VBMS reward (${e ? "win" : "draw"})`,
      timestamp: Date.now(),
      balanceBefore: n.coinsInbox || 0,
      balanceAfter: c
    }), console.log(`${e ? "\u{1F3C6}" : "\u{1F480}"} ${t} ${e ? "won" : "lost"} PvP: ${r > 0 ? "+" : ""}${r} VBMS. Inbox: ${a} \u2192 ${c}`), {
      success: !0,
      reward: r,
      newInbox: c,
      won: e
    };
  }, "handler")
}), y = f({
  args: {
    address: i.string()
  },
  handler: /* @__PURE__ */ d(async (s, { address: t }) => {
    let e = await s.db.query("profiles").withIndex("by_address", (a) => a.eq("address", t.toLowerCase())).first();
    if (!e)
      return {
        inbox: 0,
        claimedTokens: 0,
        canPlayPvP: !1
      };
    let o = e.coinsInbox || 0, n = o >= p.pvp;
    return {
      inbox: o,
      claimedTokens: e.claimedTokens || 0,
      canPlayPvP: n,
      minimumRequired: p.pvp
    };
  }, "handler")
});
export {
  I as awardPvPVBMS,
  x as chargeVBMSEntryFee,
  y as getVBMSBalance
};
//# sourceMappingURL=economyVBMS.js.map
