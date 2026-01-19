import {
  b as I
} from "./_deps/AWJMSRP7.js";
import {
  h as A
} from "./_deps/QS6BMXBV.js";
import {
  a as h,
  b as z,
  c as _,
  d as b,
  e as x
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as l
} from "./_deps/34SVKERO.js";
import {
  a as d
} from "./_deps/5B5TEMMX.js";

// convex/roulette.ts
function T() {
  let s = crypto.randomUUID().replace(/-/g, ""), n = crypto.randomUUID().replace(/-/g, "");
  return `0x${s}${n}`.substring(0, 66);
}
d(T, "generateNonce");
var g = [
  { amount: 100, probability: 88, label: "100 VBMS" },
  { amount: 500, probability: 8, label: "500 VBMS" },
  { amount: 1e3, probability: 2.5, label: "1K VBMS" },
  { amount: 1e4, probability: 1, label: "10K VBMS" },
  { amount: 5e4, probability: 0.5, label: "50K VBMS" }
];
function y() {
  let s = /* @__PURE__ */ new Date();
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
}
d(y, "getTodayKey");
function M() {
  let s = Math.random() * 100, n = 0;
  for (let e = 0; e < g.length; e++)
    if (n += g[e].probability, s <= n)
      return { amount: g[e].amount, index: e };
  return { amount: g[0].amount, index: 0 };
}
d(M, "determinePrize");
async function q(s, n) {
  let e = await s.db.query("profiles").withIndex("by_address", (r) => r.eq("address", n)).first();
  if (e) return e;
  let t = await s.db.query("addressLinks").withIndex("by_address", (r) => r.eq("address", n)).first();
  return t && (e = await s.db.query("profiles").withIndex("by_address", (r) => r.eq("address", t.primaryAddress)).first()), e;
}
d(q, "findProfileByAddress");
async function P(s, n) {
  let e = await s.db.query("farcasterCards").withIndex("by_address", (t) => t.eq("address", n)).first();
  if (!e) {
    let t = await q(s, n);
    if (t) {
      let r = [t.address, ...t.linkedAddresses || []];
      for (let a of r)
        if (e = await s.db.query("farcasterCards").withIndex("by_address", (i) => i.eq("address", a.toLowerCase())).first(), e) break;
    }
  }
  return e;
}
d(P, "findVibeFidByAddress");
var L = h({
  args: { address: l.string() },
  handler: /* @__PURE__ */ d(async (s, { address: n }) => {
    let e = y(), t = n.toLowerCase();
    if ((await q(s, t))?.rouletteTestMode === !0)
      return {
        canSpin: !0,
        lastSpinDate: null,
        prizes: g.map((m, f) => ({ ...m, index: f })),
        testMode: !0
      };
    let c = !!await P(s, t), p = c ? 3 : 1, u = await s.db.query("rouletteSpins").withIndex(
      "by_address_date",
      (m) => m.eq("address", t).eq("date", e)
    ).collect(), o = u.length, w = Math.max(0, p - o);
    return {
      canSpin: w > 0,
      lastSpinDate: u[u.length - 1]?.date || null,
      prizes: g.map((m, f) => ({ ...m, index: f })),
      testMode: !1,
      spinsRemaining: w,
      isVibeFidHolder: c,
      maxSpins: p
    };
  }, "handler")
}), R = _({
  args: { address: l.string() },
  handler: /* @__PURE__ */ d(async (s, { address: n }) => {
    let e = y(), t = n.toLowerCase(), r = await q(s, t);
    if (!(r?.rouletteTestMode === !0)) {
      let u = !!await P(s, t), o = u ? 3 : 1;
      if ((await s.db.query("rouletteSpins").withIndex(
        "by_address_date",
        (m) => m.eq("address", t).eq("date", e)
      ).collect()).length >= o)
        return {
          success: !1,
          error: u ? "Voce usou seus 3 spins VibeFID hoje" : "Voce ja girou hoje",
          prize: null,
          prizeIndex: null
        };
    }
    let { amount: i, index: c } = M();
    return r ? (await s.db.insert("rouletteSpins", {
      address: t,
      date: e,
      prizeAmount: i,
      prizeIndex: c,
      spunAt: Date.now(),
      claimed: !1
      // Track if claimed
    }), console.log(`\u{1F3B0} Roulette: ${t} won ${i} VBMS (awaiting claim)`), {
      success: !0,
      error: null,
      prize: i,
      prizeIndex: c
    }) : {
      success: !1,
      error: "Profile not found",
      prize: null,
      prizeIndex: null
    };
  }, "handler")
}), v = h({
  args: { address: l.string() },
  handler: /* @__PURE__ */ d(async (s, { address: n }) => {
    let e = n.toLowerCase();
    return await s.db.query("rouletteSpins").withIndex("by_address_date", (r) => r.eq("address", e)).order("desc").take(10);
  }, "handler")
}), F = b({
  args: { address: l.string() },
  handler: /* @__PURE__ */ d(async (s, { address: n }) => {
    let e = n.toLowerCase(), t = await s.db.query("rouletteSpins").withIndex("by_address_date", (r) => r.eq("address", e)).collect();
    for (let r of t)
      await s.db.delete(r._id);
    return console.log(`\u{1F3B0} Admin: Reset ${t.length} spins for ${e}`), { deleted: t.length };
  }, "handler")
}), U = b({
  args: { address: l.string(), enabled: l.boolean() },
  handler: /* @__PURE__ */ d(async (s, { address: n, enabled: e }) => {
    let t = n.toLowerCase(), r = await s.db.query("profiles").withIndex("by_address", (a) => a.eq("address", t)).first();
    return r ? (await s.db.patch(r._id, {
      rouletteTestMode: e
    }), console.log(`\u{1F3B0} Admin: Test mode ${e ? "enabled" : "disabled"} for ${t}`), { success: !0 }) : { success: !1, error: "Profile not found" };
  }, "handler")
}), E = x({
  args: { address: l.string() },
  handler: /* @__PURE__ */ d(async (s, { address: n }) => {
    let e = n.toLowerCase(), t = await s.runQuery(I.roulette.getUnclaimedSpin, { address: e });
    if (!t)
      throw new Error("No unclaimed spin found");
    await s.runMutation(I.roulette.markSpinAsPending, { spinId: t._id });
    let r = T(), i = await fetch("https://vibemostwanted.xyz/api/vbms/sign-roulette", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: e,
        amount: t.prizeAmount,
        nonce: r
      })
    });
    if (!i.ok) {
      let p = await i.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`Failed to sign: ${p.error}`);
    }
    let { signature: c } = await i.json();
    return console.log(`\u{1F3B0} Roulette claim prepared: ${e} claiming ${t.prizeAmount} VBMS`), {
      amount: t.prizeAmount,
      nonce: r,
      signature: c,
      spinId: t._id
    };
  }, "handler")
}), N = _({
  args: { address: l.string() },
  handler: /* @__PURE__ */ d(async (s, { address: n }) => {
    let e = n.toLowerCase(), t = y(), r = await s.db.query("rouletteSpins").withIndex(
      "by_address_date",
      (i) => i.eq("address", e).eq("date", t)
    ).first();
    if (!r || r.claimed)
      throw new Error("No unclaimed spin found");
    if (r.prizeAmount >= 100)
      throw new Error("Use blockchain claim for prizes >= 100");
    let a = await s.db.query("profiles").withIndex("by_address", (i) => i.eq("address", e)).first();
    if (!a)
      throw new Error("Profile not found");
    return await s.db.patch(a._id, {
      coinsInbox: (a.coinsInbox || 0) + r.prizeAmount
    }), await s.db.patch(r._id, {
      claimed: !0,
      claimedAt: Date.now(),
      txHash: "inbox"
      // Mark as inbox claim
    }), await A(
      s,
      e,
      "earn",
      r.prizeAmount,
      a.coinsInbox || 0,
      (a.coinsInbox || 0) + r.prizeAmount,
      "roulette_small_prize",
      "inbox",
      { spinId: r._id, prizeIndex: r.prizeIndex }
    ), console.log(`\u{1F3B0} Roulette small prize: ${e} received ${r.prizeAmount} VBMS to inbox`), {
      success: !0,
      amount: r.prizeAmount,
      method: "inbox"
    };
  }, "handler")
}), j = z({
  args: { address: l.string() },
  handler: /* @__PURE__ */ d(async (s, { address: n }) => {
    let e = n.toLowerCase(), t = y(), a = (await s.db.query("rouletteSpins").withIndex(
      "by_address_date",
      (i) => i.eq("address", e).eq("date", t)
    ).collect()).filter((i) => !i.claimed && !i.claimPending);
    return a.length === 0 ? null : (a.sort((i, c) => (c.spunAt || 0) - (i.spunAt || 0)), a[0]);
  }, "handler")
}), K = b({
  args: { spinId: l.string() },
  handler: /* @__PURE__ */ d(async (s, { spinId: n }) => {
    let e = await s.db.get(n);
    if (!e)
      throw new Error("Spin not found");
    if (e.claimed)
      throw new Error("Spin already claimed");
    if (e.claimPending)
      throw new Error("Claim already in progress");
    return await s.db.patch(e._id, {
      claimPending: !0,
      claimPendingAt: Date.now()
    }), { success: !0 };
  }, "handler")
}), O = _({
  args: {
    address: l.string(),
    amount: l.number(),
    txHash: l.string()
  },
  handler: /* @__PURE__ */ d(async (s, { address: n, amount: e, txHash: t }) => {
    let r = n.toLowerCase(), a = y(), i = await s.db.query("rouletteSpins").withIndex(
      "by_address_date",
      (o) => o.eq("address", r).eq("date", a)
    ).collect(), p = i.filter((o) => !o.claimed && o.prizeAmount === e).sort((o, w) => (w.spunAt || 0) - (o.spunAt || 0))[0];
    if (!p) {
      let o = i.filter((f) => !f.claimed);
      if (o.length === 0)
        throw new Error("No unclaimed spins found");
      let w = o.sort((f, C) => (C.spunAt || 0) - (f.spunAt || 0))[0];
      await s.db.patch(w._id, {
        claimed: !0,
        claimedAt: Date.now(),
        txHash: t
      }), console.log(`\u{1F3B0} Roulette claimed (fallback): ${r} received ${e} VBMS (tx: ${t})`), await s.db.insert("claimHistory", {
        playerAddress: r,
        amount: e,
        txHash: t,
        timestamp: Date.now(),
        type: "roulette"
      });
      let m = await s.db.query("profiles").withIndex("by_address", (f) => f.eq("address", r)).first();
      return m && await A(
        s,
        r,
        "earn",
        e,
        m.coins || 0,
        (m.coins || 0) + e,
        "roulette_claim_fallback",
        t,
        { spinId: w._id }
      ), { success: !0, amount: e, txHash: t };
    }
    await s.db.patch(p._id, {
      claimed: !0,
      claimedAt: Date.now(),
      txHash: t
    }), await s.db.insert("claimHistory", {
      playerAddress: r,
      amount: e,
      txHash: t,
      timestamp: Date.now(),
      type: "roulette"
    });
    let u = await s.db.query("profiles").withIndex("by_address", (o) => o.eq("address", r)).first();
    return u && await A(
      s,
      r,
      "earn",
      e,
      u.coins || 0,
      (u.coins || 0) + e,
      "roulette_claim",
      t,
      { spinId: p._id, prizeIndex: p.prizeIndex }
    ), console.log(`\u{1F3B0} Roulette claimed: ${r} received ${e} VBMS (tx: ${t})`), {
      success: !0,
      amount: e,
      txHash: t
    };
  }, "handler")
}), Q = b({
  args: {},
  handler: /* @__PURE__ */ d(async (s) => {
    let n = await s.db.query("profiles").collect(), e = 0;
    for (let t of n)
      t.rouletteTestMode === !0 && (await s.db.patch(t._id, {
        rouletteTestMode: !1
      }), e++);
    return console.log(`\u{1F3B0} Disabled test mode for ${e} profiles`), { disabled: e };
  }, "handler")
}), X = b({
  args: {},
  handler: /* @__PURE__ */ d(async (s) => {
    let n = await s.db.query("rouletteSpins").collect(), e = 0;
    for (let t of n)
      await s.db.delete(t._id), e++;
    return console.log(`\u{1F3B0} Admin: Reset ${e} spins for all users`), { deleted: e };
  }, "handler")
}), $ = 500, S = 20, Y = h({
  args: { address: l.string() },
  handler: /* @__PURE__ */ d(async (s, { address: n }) => {
    let e = n.toLowerCase(), t = y(), a = (await s.db.query("rouletteSpins").withIndex(
      "by_address_date",
      (c) => c.eq("address", e).eq("date", t)
    ).collect()).filter((c) => c.isPaidSpin === !0).length;
    return {
      canBuy: a < S,
      paidSpinsToday: a,
      maxPaidSpins: S,
      remaining: S - a,
      cost: $
    };
  }, "handler")
}), J = _({
  args: {
    address: l.string(),
    txHash: l.string()
  },
  handler: /* @__PURE__ */ d(async (s, { address: n, txHash: e }) => {
    let t = n.toLowerCase(), r = y();
    if ((await s.db.query("rouletteSpins").withIndex(
      "by_address_date",
      (o) => o.eq("address", t).eq("date", r)
    ).collect()).filter((o) => o.isPaidSpin === !0).length >= S)
      return {
        success: !1,
        error: `Daily limit reached (${S} paid spins)`
      };
    if (await s.db.query("rouletteSpins").filter((o) => o.eq(o.field("paidTxHash"), e)).first())
      return {
        success: !1,
        error: "Transaction already used"
      };
    let { amount: p, index: u } = M();
    return await s.db.insert("rouletteSpins", {
      address: t,
      date: r,
      prizeAmount: p,
      prizeIndex: u,
      spunAt: Date.now(),
      claimed: !1,
      isPaidSpin: !0,
      paidTxHash: e
    }), console.log(`\u{1F3B0} Paid Spin (TX): ${t} paid 500 VBMS, won ${p} VBMS (tx: ${e})`), {
      success: !0,
      prize: p,
      prizeIndex: u
    };
  }, "handler")
}), Z = h({
  args: {},
  handler: /* @__PURE__ */ d(async () => ({
    cost: $,
    maxPerDay: S
  }), "handler")
});
export {
  X as adminResetAllSpins,
  F as adminResetSpins,
  U as adminSetTestMode,
  Y as canBuyPaidSpin,
  L as canSpin,
  N as claimSmallPrize,
  Q as disableAllTestMode,
  Z as getPaidSpinCost,
  v as getSpinHistory,
  j as getUnclaimedSpin,
  K as markSpinAsPending,
  E as prepareRouletteClaim,
  J as recordPaidSpin,
  O as recordRouletteClaim,
  R as spin
};
//# sourceMappingURL=roulette.js.map
