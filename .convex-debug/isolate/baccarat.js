import {
  h as $
} from "./_deps/QS6BMXBV.js";
import {
  a as A,
  c as _
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h
} from "./_deps/34SVKERO.js";
import {
  a as m
} from "./_deps/5B5TEMMX.js";

// convex/baccarat.ts
var S = 3e4, E = 10, T = 1e3, v = {
  PLAYER: 1.8,
  // 0.8:1 (was 1:1)
  BANKER: 1.7,
  // 0.7:1 (was 0.95:1)
  TIE: 5
  // 4:1 (was 8:1)
}, R = {
  A: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 0,
  J: 0,
  Q: 0,
  K: 0
}, O = ["hearts", "diamonds", "clubs", "spades"], L = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
function P() {
  let t = [];
  for (let s of O)
    for (let r of L)
      t.push({
        suit: s,
        rank: r,
        value: R[r]
      });
  for (let s = t.length - 1; s > 0; s--) {
    let r = Math.floor(Math.random() * (s + 1));
    [t[s], t[r]] = [t[r], t[s]];
  }
  return t;
}
m(P, "createDeck");
function y(t) {
  return t.reduce((r, d) => r + d.value, 0) % 10;
}
m(y, "calculateHandValue");
function C(t, s, r, d) {
  if (t >= 8 || s >= 8)
    return { playerDraws: !1, bankerDraws: !1 };
  let a = t <= 5, e = !1;
  if (!r)
    e = s <= 5;
  else if (d !== void 0)
    switch (s) {
      case 0:
      case 1:
      case 2:
        e = !0;
        break;
      case 3:
        e = d !== 8;
        break;
      case 4:
        e = [2, 3, 4, 5, 6, 7].includes(d);
        break;
      case 5:
        e = [4, 5, 6, 7].includes(d);
        break;
      case 6:
        e = [6, 7].includes(d);
        break;
      case 7:
        e = !1;
        break;
    }
  return { playerDraws: a, bankerDraws: e };
}
m(C, "shouldDrawThirdCard");
function M(t, s) {
  return t > s ? "player" : s > t ? "banker" : "tie";
}
m(M, "determineWinner");
function N() {
  return `bac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
m(N, "generateTableId");
var W = A({
  args: {},
  handler: /* @__PURE__ */ m(async (t) => {
    let s = await t.db.query("baccaratTables").withIndex("by_status", (r) => r.eq("status", "waiting")).first();
    if (s) {
      let r = await t.db.query("baccaratBets").withIndex("by_table", (d) => d.eq("tableId", s.tableId)).collect();
      return {
        ...s,
        bets: r,
        timeRemaining: Math.max(0, s.bettingEndsAt - Date.now())
      };
    }
    return null;
  }, "handler")
}), K = A({
  args: { tableId: h.string() },
  handler: /* @__PURE__ */ m(async (t, s) => {
    let r = await t.db.query("baccaratTables").withIndex("by_table_id", (a) => a.eq("tableId", s.tableId)).first();
    if (!r) return null;
    let d = await t.db.query("baccaratBets").withIndex("by_table", (a) => a.eq("tableId", s.tableId)).collect();
    return {
      ...r,
      bets: d,
      timeRemaining: r.status === "waiting" ? Math.max(0, r.bettingEndsAt - Date.now()) : 0
    };
  }, "handler")
}), G = A({
  args: { address: h.string() },
  handler: /* @__PURE__ */ m(async (t, s) => await t.db.query("baccaratBets").withIndex("by_player", (d) => d.eq("playerAddress", s.address.toLowerCase())).order("desc").take(50), "handler")
}), J = A({
  args: {},
  handler: /* @__PURE__ */ m(async (t) => await t.db.query("baccaratHistory").withIndex("by_finished").order("desc").take(20), "handler")
}), Q = A({
  args: { address: h.string() },
  handler: /* @__PURE__ */ m(async (t, s) => {
    let r = s.address.toLowerCase(), d = /* @__PURE__ */ new Date(), a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), o = (await t.db.query("bettingTransactions").withIndex("by_address", (n) => n.eq("address", r)).filter(
      (n) => n.and(
        n.gte(n.field("timestamp"), a),
        n.eq(n.field("type"), "bet")
      )
    ).collect()).filter((n) => n.roomId?.startsWith("pve_"));
    return {
      count: o.length,
      todayStart: a,
      lastPlayedAt: o.length > 0 ? o[0].timestamp : null
    };
  }, "handler")
}), j = _({
  args: {},
  handler: /* @__PURE__ */ m(async (t) => {
    let s = await t.db.query("baccaratTables").withIndex("by_status", (a) => a.eq("status", "waiting")).first();
    if (s)
      return s.tableId;
    let r = N(), d = Date.now();
    return await t.db.insert("baccaratTables", {
      tableId: r,
      status: "waiting",
      bettingEndsAt: d + S,
      totalPot: 0,
      totalBets: 0,
      playerBets: 0,
      bankerBets: 0,
      tieBets: 0,
      createdAt: d
    }), r;
  }, "handler")
}), F = _({
  args: {
    tableId: h.string(),
    address: h.string(),
    username: h.string(),
    betOn: h.union(h.literal("player"), h.literal("banker"), h.literal("tie")),
    amount: h.number()
  },
  handler: /* @__PURE__ */ m(async (t, s) => {
    let { tableId: r, address: d, username: a, betOn: e, amount: o } = s, n = d.toLowerCase(), c = Date.now();
    if (o < E)
      throw new Error(`Minimum bet is ${E} credits`);
    if (o > T)
      throw new Error(`Maximum bet is ${T} credits`);
    let b = await t.db.query("baccaratTables").withIndex("by_table_id", (u) => u.eq("tableId", r)).first();
    if (!b)
      throw new Error("Table not found");
    if (b.status !== "waiting")
      throw new Error("Betting is closed for this round");
    if (c > b.bettingEndsAt)
      throw new Error("Betting time has expired");
    if (await t.db.query("baccaratBets").withIndex(
      "by_table_player",
      (u) => u.eq("tableId", r).eq("playerAddress", n)
    ).first())
      throw new Error("You already placed a bet this round");
    let f = await t.db.query("bettingCredits").withIndex("by_address", (u) => u.eq("address", n)).first();
    if (!f)
      throw new Error("No betting credits. Deposit VBMS first!");
    if (f.balance < o)
      throw new Error(`Insufficient credits. You have ${f.balance} credits`);
    return await t.db.patch(f._id, {
      balance: f.balance - o
    }), await t.db.insert("baccaratBets", {
      tableId: r,
      playerAddress: n,
      playerUsername: a,
      betOn: e,
      amount: o,
      status: "pending",
      placedAt: c
    }), await t.db.patch(b._id, {
      totalPot: b.totalPot + o,
      totalBets: b.totalBets + 1,
      playerBets: e === "player" ? b.playerBets + o : b.playerBets,
      bankerBets: e === "banker" ? b.bankerBets + o : b.bankerBets,
      tieBets: e === "tie" ? b.tieBets + o : b.tieBets
    }), await t.db.insert("bettingTransactions", {
      address: n,
      type: "bet",
      amount: -o,
      roomId: r,
      timestamp: c
    }), { success: !0, newBalance: f.balance - o };
  }, "handler")
}), X = _({
  args: { tableId: h.string() },
  handler: /* @__PURE__ */ m(async (t, s) => {
    let { tableId: r } = s, d = Date.now(), a = await t.db.query("baccaratTables").withIndex("by_table_id", (i) => i.eq("tableId", r)).first();
    if (!a)
      throw new Error("Table not found");
    if (a.status === "finished")
      return console.log(`\u{1F3B4} Table ${r} already resolved, returning cached result`), {
        winner: a.winner,
        playerScore: a.playerScore,
        bankerScore: a.bankerScore,
        playerCards: a.playerCards,
        bankerCards: a.bankerCards,
        winnersCount: 0,
        totalPayout: 0,
        alreadyResolved: !0
      };
    if (a.status !== "waiting")
      throw new Error("Table is not in waiting state");
    let e = P(), o = 0, n = [e[o++], e[o++]], c = [e[o++], e[o++]], b = y(n), w = y(c), f = C(b, w, !1);
    if (f.playerDraws) {
      let i = e[o++];
      n.push(i), b = y(n), C(
        y(n.slice(0, 2)),
        w,
        !0,
        i.value
      ).bankerDraws && (c.push(e[o++]), w = y(c));
    } else f.bankerDraws && (c.push(e[o++]), w = y(c));
    let u = M(b, w);
    await t.db.patch(a._id, {
      status: "finished",
      playerCards: n,
      bankerCards: c,
      playerScore: b,
      bankerScore: w,
      winner: u,
      dealtAt: d,
      finishedAt: d
    });
    let B = await t.db.query("baccaratBets").withIndex("by_table", (i) => i.eq("tableId", r)).collect(), g = 0, k = 0;
    for (let i of B) {
      let p = "lost", l = 0;
      if (u === "tie" ? i.betOn === "tie" ? (p = "won", l = i.amount * 9, k++) : (p = "push", l = i.amount) : i.betOn === u && (p = "won", u === "banker" ? l = i.amount + Math.floor(i.amount * 0.95) : l = i.amount * 2, k++), await t.db.patch(i._id, {
        status: p,
        payout: l > 0 ? l : void 0,
        resolvedAt: d
      }), l > 0) {
        let I = await t.db.query("bettingCredits").withIndex("by_address", (D) => D.eq("address", i.playerAddress)).first();
        I ? await t.db.patch(I._id, {
          balance: I.balance + l
        }) : await t.db.insert("bettingCredits", {
          address: i.playerAddress,
          balance: l,
          totalDeposited: 0,
          totalWithdrawn: 0,
          lastDeposit: d
        }), await t.db.insert("bettingTransactions", {
          address: i.playerAddress,
          type: "win",
          amount: l,
          roomId: r,
          timestamp: d
        }), g += l;
      }
    }
    return await t.db.insert("baccaratHistory", {
      tableId: r,
      winner: u,
      playerScore: b,
      bankerScore: w,
      playerCards: n,
      bankerCards: c,
      totalPot: a.totalPot,
      totalBets: a.totalBets,
      winnersCount: k,
      totalPayout: g,
      finishedAt: d
    }), {
      winner: u,
      playerScore: b,
      bankerScore: w,
      playerCards: n,
      bankerCards: c,
      winnersCount: k,
      totalPayout: g
    };
  }, "handler")
}), z = _({
  args: {
    address: h.string()
  },
  handler: /* @__PURE__ */ m(async (t, s) => {
    let r = s.address.toLowerCase(), d = Date.now(), a = await t.db.query("bettingCredits").withIndex("by_address", (c) => c.eq("address", r)).first();
    if (!a || a.balance <= 0)
      throw new Error("No credits to cash out");
    let e = a.balance;
    await t.db.patch(a._id, {
      balance: 0,
      totalWithdrawn: (a.totalWithdrawn || 0) + e
    });
    let o = await t.db.query("profiles").withIndex("by_address", (c) => c.eq("address", r)).first();
    if (!o)
      throw new Error("Profile not found");
    let n = o.coins || 0;
    return await t.db.patch(o._id, {
      coins: n + e,
      lifetimeEarned: (o.lifetimeEarned || 0) + e,
      lastUpdated: d
    }), await t.db.insert("bettingTransactions", {
      address: r,
      type: "withdraw",
      amount: e,
      timestamp: d
    }), await t.db.insert("coinTransactions", {
      address: r,
      type: "earn",
      source: "baccarat_cashout",
      description: `Cashed out ${e} betting credits`,
      amount: e,
      balanceBefore: n,
      balanceAfter: n + e,
      timestamp: d
    }), await $(
      t,
      r,
      "earn",
      e,
      n,
      n + e,
      "baccarat_cashout",
      void 0,
      { reason: "Betting credits cashout" }
    ), console.log(`\u{1F4B0} Baccarat cashout: ${r} cashed out ${e} credits`), {
      success: !0,
      cashedOut: e,
      newBalance: n + e
    };
  }, "handler")
}), V = _({
  args: {},
  handler: /* @__PURE__ */ m(async (t) => {
    let s = Date.now(), r = await t.db.query("baccaratTables").withIndex("by_status", (a) => a.eq("status", "waiting")).filter((a) => a.lt(a.field("bettingEndsAt"), s)).take(10), d = [];
    for (let a of r)
      if (a.totalBets > 0) {
        let e = P(), o = 0, n = [e[o++], e[o++]], c = [e[o++], e[o++]], b = y(n), w = y(c), f = C(b, w, !1);
        if (f.playerDraws) {
          let i = e[o++];
          n.push(i), b = y(n), C(
            y(n.slice(0, 2)),
            w,
            !0,
            i.value
          ).bankerDraws && (c.push(e[o++]), w = y(c));
        } else f.bankerDraws && (c.push(e[o++]), w = y(c));
        let u = M(b, w);
        await t.db.patch(a._id, {
          status: "finished",
          playerCards: n,
          bankerCards: c,
          playerScore: b,
          bankerScore: w,
          winner: u,
          dealtAt: s,
          finishedAt: s
        });
        let B = await t.db.query("baccaratBets").withIndex("by_table", (i) => i.eq("tableId", a.tableId)).collect(), g = 0, k = 0;
        for (let i of B) {
          let p = "lost", l = 0;
          if (u === "tie" ? i.betOn === "tie" ? (p = "won", l = i.amount * 9, k++) : (p = "push", l = i.amount) : i.betOn === u && (p = "won", l = u === "banker" ? i.amount + Math.floor(i.amount * 0.95) : i.amount * 2, k++), await t.db.patch(i._id, {
            status: p,
            payout: l > 0 ? l : void 0,
            resolvedAt: s
          }), l > 0) {
            let I = await t.db.query("bettingCredits").withIndex("by_address", (D) => D.eq("address", i.playerAddress)).first();
            I ? await t.db.patch(I._id, {
              balance: I.balance + l
            }) : await t.db.insert("bettingCredits", {
              address: i.playerAddress,
              balance: l,
              totalDeposited: 0,
              totalWithdrawn: 0,
              lastDeposit: s
            }), await t.db.insert("bettingTransactions", {
              address: i.playerAddress,
              type: "win",
              amount: l,
              roomId: a.tableId,
              timestamp: s
            }), g += l;
          }
        }
        await t.db.insert("baccaratHistory", {
          tableId: a.tableId,
          winner: u,
          playerScore: b,
          bankerScore: w,
          playerCards: n,
          bankerCards: c,
          totalPot: a.totalPot,
          totalBets: a.totalBets,
          winnersCount: k,
          totalPayout: g,
          finishedAt: s
        }), d.push(a.tableId);
      } else
        await t.db.patch(a._id, {
          status: "finished",
          finishedAt: s
        }), d.push(a.tableId);
    return { resolved: d };
  }, "handler")
}), Z = _({
  args: {
    address: h.string(),
    username: h.string(),
    betOn: h.union(h.literal("player"), h.literal("banker"), h.literal("tie")),
    amount: h.number()
  },
  handler: /* @__PURE__ */ m(async (t, s) => {
    let { address: r, username: d, betOn: a, amount: e } = s, o = r.toLowerCase(), n = Date.now();
    if (e < E)
      throw new Error(`Minimum bet is ${E} credits`);
    if (e > T)
      throw new Error(`Maximum bet is ${T} credits`);
    let c = await t.db.query("bettingCredits").withIndex("by_address", (q) => q.eq("address", o)).first();
    if (!c)
      throw new Error("No betting credits. Deposit VBMS first!");
    if (c.balance < e)
      throw new Error(`Insufficient credits. You have ${c.balance} credits`);
    await t.db.patch(c._id, {
      balance: c.balance - e
    });
    let b = P(), w = 0, f = [b[w++], b[w++]], u = [b[w++], b[w++]], B = y(f), g = y(u), k = C(B, g, !1);
    if (k.playerDraws) {
      let q = b[w++];
      f.push(q), B = y(f), C(
        y(f.slice(0, 2)),
        g,
        !0,
        q.value
      ).bankerDraws && (u.push(b[w++]), g = y(u));
    } else k.bankerDraws && (u.push(b[w++]), g = y(u));
    let i = M(B, g), p = "lost", l = 0;
    i === "tie" ? a === "tie" ? (p = "won", l = Math.floor(e * v.TIE)) : (p = "push", l = e) : a === i && (p = "won", i === "banker" ? l = Math.floor(e * v.BANKER) : l = Math.floor(e * v.PLAYER)), l > 0 && await t.db.patch(c._id, {
      balance: c.balance - e + l
    });
    let I = `pve_${n}_${Math.random().toString(36).substr(2, 9)}`;
    await t.db.insert("baccaratHistory", {
      tableId: I,
      winner: i,
      playerScore: B,
      bankerScore: g,
      playerCards: f,
      bankerCards: u,
      totalPot: e,
      totalBets: 1,
      winnersCount: p === "won" ? 1 : 0,
      totalPayout: l,
      finishedAt: n
    }), await t.db.insert("bettingTransactions", {
      address: o,
      type: "bet",
      amount: -e,
      roomId: I,
      timestamp: n
    }), l > 0 && await t.db.insert("bettingTransactions", {
      address: o,
      type: p === "won" ? "win" : "refund",
      amount: l,
      roomId: I,
      timestamp: n
    });
    let D = c.balance - e + l;
    return console.log(`\u{1F3B4} PvE Baccarat: ${d} bet ${e} on ${a}, ${p}! Payout: ${l}`), {
      gameId: I,
      winner: i,
      playerScore: B,
      bankerScore: g,
      playerCards: f,
      bankerCards: u,
      betOn: a,
      betAmount: e,
      status: p,
      payout: l,
      newBalance: D
    };
  }, "handler")
});
export {
  z as cashOut,
  V as checkAndResolveExpiredTables,
  j as createOrGetTable,
  X as dealAndResolve,
  W as getCurrentTable,
  Q as getDailyPlays,
  G as getPlayerHistory,
  J as getRecentHistory,
  K as getTable,
  F as placeBet,
  Z as playPvE
};
//# sourceMappingURL=baccarat.js.map
