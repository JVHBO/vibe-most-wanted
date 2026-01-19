import {
  a as q,
  c as C
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as c
} from "./_deps/34SVKERO.js";
import {
  a as h
} from "./_deps/5B5TEMMX.js";

// convex/bettingCredits.ts
var I = 1e4, A = C({
  args: {
    address: c.string(),
    amount: c.number(),
    txHash: c.string()
  },
  handler: /* @__PURE__ */ h(async (t, d) => {
    let { address: a, amount: e, txHash: n } = d, r = a.toLowerCase();
    if (e > I)
      throw new Error(`Maximum entry is ${I} VBMS`);
    if (await t.db.query("bettingCredits").withIndex("by_txHash", (b) => b.eq("txHash", n)).first())
      throw new Error("Transaction already processed");
    let o = await t.db.query("bettingCredits").withIndex("by_address", (b) => b.eq("address", r)).first(), g = o?.balance || 0;
    if (g + e > I)
      throw new Error(`Maximum balance is ${I} credits. You have ${g} credits.`);
    return o ? await t.db.patch(o._id, {
      balance: o.balance + e,
      lastDeposit: Date.now()
    }) : await t.db.insert("bettingCredits", {
      address: r,
      balance: e,
      totalDeposited: e,
      totalWithdrawn: 0,
      lastDeposit: Date.now(),
      txHash: n
      // Store this tx
    }), await t.db.insert("bettingTransactions", {
      address: r,
      type: "deposit",
      amount: e,
      txHash: n,
      timestamp: Date.now()
    }), {
      success: !0,
      newBalance: o ? o.balance + e : e
    };
  }, "handler")
}), O = q({
  args: {
    address: c.string()
  },
  handler: /* @__PURE__ */ h(async (t, d) => {
    let a = d.address.toLowerCase(), e = await t.db.query("bettingCredits").withIndex("by_address", (n) => n.eq("address", a)).first();
    return {
      balance: e?.balance || 0,
      totalDeposited: e?.totalDeposited || 0,
      totalWithdrawn: e?.totalWithdrawn || 0
    };
  }, "handler")
}), T = C({
  args: {
    address: c.string(),
    roomId: c.string(),
    betOn: c.string(),
    // Player address to bet on
    amount: c.number()
  },
  handler: /* @__PURE__ */ h(async (t, d) => {
    let { address: a, roomId: e, betOn: n, amount: r } = d, w = a.toLowerCase(), o = await t.db.query("bettingCredits").withIndex("by_address", (l) => l.eq("address", w)).first();
    if (!o || o.balance < r)
      throw new Error("Insufficient betting credits");
    await t.db.patch(o._id, {
      balance: o.balance - r
    });
    let g = await t.db.query("profiles").withIndex("by_address", (l) => l.eq("address", w)).first(), b = n.toLowerCase(), i = await t.db.query("profiles").withIndex("by_address", (l) => l.eq("address", b)).first();
    return await t.db.insert("pokerBets", {
      roomId: e,
      bettor: w,
      bettorUsername: g?.username || "",
      betOn: b,
      betOnUsername: i?.username || "",
      amount: r,
      token: "VBMS",
      status: "active",
      timestamp: Date.now()
    }), await t.db.insert("bettingTransactions", {
      address: w,
      type: "bet",
      amount: -r,
      roomId: e,
      timestamp: Date.now()
    }), {
      success: !0,
      newBalance: o.balance - r
    };
  }, "handler")
}), L = C({
  args: {
    roomId: c.string(),
    winnerAddress: c.string()
  },
  handler: /* @__PURE__ */ h(async (t, d) => {
    let { roomId: a, winnerAddress: e } = d, n = e.toLowerCase(), r = await t.db.query("pokerBets").withIndex("by_room", (s) => s.eq("roomId", a)).filter((s) => s.eq(s.field("status"), "active")).collect();
    if (r.length === 0)
      return {
        success: !0,
        betsResolved: 0,
        totalPool: 0,
        totalPaidOut: 0,
        houseFee: 0
      };
    let w = r.reduce((s, m) => s + m.amount, 0), o = w * 0.05, g = w - o, b = r.filter((s) => s.betOn.toLowerCase() === n), i = r.filter((s) => s.betOn.toLowerCase() !== n), l = b.reduce((s, m) => s + m.amount, 0), _ = 0;
    for (let s of b) {
      let m = l > 0 ? s.amount / l * g : 0;
      _ += m;
      let f = await t.db.query("bettingCredits").withIndex("by_address", (y) => y.eq("address", s.bettor)).first(), p = f?.balance || 0, u = Math.floor(m) + p;
      if (await t.db.patch(s._id, {
        status: "won",
        payout: Math.floor(m),
        resolvedAt: Date.now()
      }), f && await t.db.patch(f._id, {
        balance: 0
      }), u > 0) {
        let y = await t.db.query("profiles").withIndex("by_address", (B) => B.eq("address", s.bettor)).first();
        if (y) {
          let B = y.coins || 0;
          await t.db.patch(y._id, {
            coins: B + u,
            lifetimeEarned: (y.lifetimeEarned || 0) + u,
            lastUpdated: Date.now()
          }), await t.db.insert("coinTransactions", {
            address: s.bettor,
            amount: u,
            type: "earn",
            source: "betting_win",
            description: "Betting winnings",
            timestamp: Date.now(),
            balanceBefore: B,
            balanceAfter: B + u
          });
        }
      }
      await t.db.insert("bettingTransactions", {
        address: s.bettor,
        type: "win",
        amount: u,
        roomId: a,
        timestamp: Date.now()
      });
    }
    for (let s of i) {
      let m = await t.db.query("bettingCredits").withIndex("by_address", (p) => p.eq("address", s.bettor)).first(), f = m?.balance || 0;
      if (await t.db.patch(s._id, {
        status: "lost",
        resolvedAt: Date.now()
      }), m && await t.db.patch(m._id, {
        balance: 0
      }), f > 0) {
        let p = await t.db.query("profiles").withIndex("by_address", (u) => u.eq("address", s.bettor)).first();
        if (p) {
          let u = p.coins || 0;
          await t.db.patch(p._id, {
            coins: u + f,
            lifetimeEarned: (p.lifetimeEarned || 0) + f,
            lastUpdated: Date.now()
          }), await t.db.insert("coinTransactions", {
            address: s.bettor,
            amount: f,
            type: "earn",
            source: "betting_refund",
            description: "Betting credits refund",
            timestamp: Date.now(),
            balanceBefore: u,
            balanceAfter: u + f
          });
        }
      }
      await t.db.insert("bettingTransactions", {
        address: s.bettor,
        type: "loss",
        amount: -s.amount,
        roomId: a,
        timestamp: Date.now()
      });
    }
    return console.log(`\u{1F3B0} Bets resolved for room ${a}:`, {
      totalBets: r.length,
      totalPool: w,
      houseFee: o,
      prizePool: g,
      winners: b.length,
      totalPaidOut: _
    }), {
      success: !0,
      betsResolved: r.length,
      totalPool: w,
      totalPaidOut: Math.floor(_),
      houseFee: Math.floor(o)
    };
  }, "handler")
}), E = q({
  args: {
    roomId: c.string()
  },
  handler: /* @__PURE__ */ h(async (t, d) => await t.db.query("pokerBets").withIndex("by_room", (e) => e.eq("roomId", d.roomId)).collect(), "handler")
}), M = q({
  args: {
    address: c.string()
  },
  handler: /* @__PURE__ */ h(async (t, d) => {
    let a = d.address.toLowerCase();
    return await t.db.query("pokerBets").withIndex("by_bettor", (n) => n.eq("bettor", a)).order("desc").take(50);
  }, "handler")
}), z = q({
  args: {
    address: c.string()
  },
  handler: /* @__PURE__ */ h(async (t, d) => {
    let a = d.address.toLowerCase(), e = await t.db.query("pokerBets").withIndex("by_bettor", (i) => i.eq("bettor", a)).collect(), n = e.filter((i) => i.status === "won"), r = e.filter((i) => i.status === "lost"), w = e.filter((i) => i.status === "active"), o = e.reduce((i, l) => i + l.amount, 0), g = n.reduce((i, l) => i + (l.payout || 0), 0), b = r.reduce((i, l) => i + l.amount, 0);
    return {
      totalBets: e.length,
      wonBets: n.length,
      lostBets: r.length,
      activeBets: w.length,
      totalWagered: o,
      totalWinnings: g,
      totalLosses: b,
      netProfit: g - b - o,
      winRate: e.length > 0 ? n.length / (n.length + r.length) * 100 : 0
    };
  }, "handler")
}), P = C({
  args: {
    address: c.string()
  },
  handler: /* @__PURE__ */ h(async (t, d) => {
    let a = d.address.toLowerCase(), e = await t.db.query("bettingCredits").withIndex("by_address", (n) => n.eq("address", a)).first();
    return e ? {
      success: !1,
      message: "You already have betting credits",
      balance: e.balance
    } : (await t.db.insert("bettingCredits", {
      address: a,
      balance: 100,
      totalDeposited: 0,
      totalWithdrawn: 0,
      lastDeposit: Date.now()
    }), await t.db.insert("bettingTransactions", {
      address: a,
      type: "deposit",
      amount: 100,
      timestamp: Date.now()
    }), console.log(`\u{1F381} Free starter credits claimed: ${a}`), {
      success: !0,
      message: "100 free betting credits claimed!",
      balance: 100
    });
  }, "handler")
});
export {
  A as addBettingCredits,
  P as claimStarterCredits,
  O as getBettingCredits,
  z as getBettingStats,
  M as getMyBets,
  E as getRoomBets,
  T as placeBetWithCredits,
  L as resolveBets
};
//# sourceMappingURL=bettingCredits.js.map
