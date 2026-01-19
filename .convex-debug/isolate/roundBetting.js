import {
  b as q
} from "./_deps/AWJMSRP7.js";
import {
  a as p,
  c as I
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as s
} from "./_deps/34SVKERO.js";
import {
  a as c
} from "./_deps/5B5TEMMX.js";

// convex/roundBetting.ts
var y = {
  rounds1to3: 1.5,
  // Early rounds: 1.5x
  rounds4to5: 1.8,
  // Mid rounds: 1.8x
  rounds6to7: 2,
  // Final rounds: 2.0x
  allInRound7: 3,
  // ALL IN on final round: 3.0x (high risk, high reward!)
  tie: 3.5
  // Tie bet: 3.5x (higher since it's harder to predict)
}, _ = [
  "gmvbrs",
  "vibe",
  "viberuto",
  "meowverse",
  "poorlydrawnpepes",
  "teampothead",
  "tarot",
  "vibefid",
  "baseballcabal",
  "vibefx",
  "historyofcomputer"
], $ = 0.5;
function N() {
  let e = /* @__PURE__ */ new Date(), a = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
  return Math.floor(a / (1e3 * 60 * 60 * 24));
}
c(N, "getUTCDayNumber");
function R() {
  let a = N() % _.length;
  return _[a];
}
c(R, "getDailyBuffedCollection");
function v(e) {
  return e.toLowerCase() === R().toLowerCase();
}
c(v, "isCollectionBuffed");
function O(e, a = !1, n, r = !1) {
  let t;
  return e === 7 && r ? t = y.allInRound7 : a ? t = y.tie : e <= 3 ? t = y.rounds1to3 : e <= 5 ? t = y.rounds4to5 : t = y.rounds6to7, n && v(n) && (t += $), t;
}
c(O, "getOddsForRound");
var M = p({
  args: {
    roomId: s.string(),
    roundNumber: s.number(),
    bettor: s.string()
  },
  handler: /* @__PURE__ */ c(async (e, a) => {
    let { roomId: n, roundNumber: r, bettor: t } = a, u = t.toLowerCase();
    return await e.db.query("roundBets").withIndex(
      "by_room_round",
      (i) => i.eq("roomId", n).eq("roundNumber", r)
    ).filter((i) => i.eq(i.field("bettor"), u)).first();
  }, "handler")
}), U = p({
  args: {
    roomId: s.string(),
    spectatorAddress: s.string()
  },
  handler: /* @__PURE__ */ c(async (e, a) => {
    let { roomId: n, spectatorAddress: r } = a, t = r.toLowerCase();
    return await e.db.query("roundBets").withIndex("by_room_round", (d) => d.eq("roomId", n)).filter((d) => d.eq(d.field("bettor"), t)).collect();
  }, "handler")
}), x = I({
  args: {
    address: s.string(),
    roomId: s.string(),
    roundNumber: s.number(),
    betOn: s.string(),
    // Address of player to bet on OR "tie" for draw bet
    amount: s.number(),
    isAllIn: s.optional(s.boolean())
    // ALL IN on final round for 3x odds!
  },
  handler: /* @__PURE__ */ c(async (e, a) => {
    let { address: n, roomId: r, roundNumber: t, betOn: u, amount: d, isAllIn: i = !1 } = a, m = n.toLowerCase(), w = u.toLowerCase();
    if (t < 1 || t > 7)
      throw new Error("Invalid round number (must be 1-7)");
    if (await e.db.query("roundBets").withIndex(
      "by_room_round",
      (l) => l.eq("roomId", r).eq("roundNumber", t)
    ).filter((l) => l.eq(l.field("bettor"), m)).first())
      throw new Error("You already bet on this round");
    let f = await e.db.query("bettingCredits").withIndex("by_address", (l) => l.eq("address", m)).first();
    if (!f || f.balance < d)
      throw new Error("Insufficient betting credits");
    await e.db.patch(f._id, {
      balance: f.balance - d
    });
    let B = w === "tie", C = await e.db.query("pokerRooms").withIndex("by_room_id", (l) => l.eq("roomId", r)).first(), g = C?.cpuCollection || void 0, b = O(t, B, g, i), h = g ? v(g) : !1;
    return await e.db.insert("roundBets", {
      roomId: r,
      roundNumber: t,
      bettor: m,
      betOn: w,
      amount: d,
      odds: b,
      status: "active",
      timestamp: Date.now()
    }), console.log(`\u{1F3B0} Round bet placed: ${m} bet ${d} credits on round ${t} at ${b}x odds [roomId: ${r}]`), C?.isCpuVsCpu && await e.runMutation(q.pokerBattle.shortenBettingWindow, { roomId: r }), {
      success: !0,
      newBalance: f.balance - d,
      odds: b,
      potentialWin: Math.floor(d * b)
    };
  }, "handler")
}), E = I({
  args: {
    roomId: s.string(),
    roundNumber: s.number(),
    winnerAddress: s.string()
  },
  handler: /* @__PURE__ */ c(async (e, a) => {
    let { roomId: n, roundNumber: r, winnerAddress: t } = a, u = t.toLowerCase();
    console.log(`\u{1F3B2} Resolving round ${r} bets for room ${n}, winner: ${u}`);
    let d = await e.db.query("roundBets").withIndex(
      "by_room_round",
      (o) => o.eq("roomId", n).eq("roundNumber", r)
    ).filter((o) => o.eq(o.field("status"), "active")).collect();
    if (d.length === 0)
      return console.log(`No active bets for round ${r} (may be already resolved)`), {
        success: !0,
        betsResolved: 0,
        winners: 0,
        losers: 0,
        alreadyResolved: !0
      };
    let i = 0, m = 0, w = !u || u === "tie";
    for (let o of d) {
      let f = o.betOn.toLowerCase() === "tie", B = w ? f : o.betOn.toLowerCase() === u, g = (await e.db.query("profiles").withIndex("by_address", (b) => b.eq("address", o.bettor)).first())?.username || "Spectator";
      if (B) {
        let b = Math.floor(o.amount * o.odds);
        i++;
        let h = await e.db.query("bettingCredits").withIndex("by_address", (l) => l.eq("address", o.bettor)).first();
        h && (await e.db.patch(h._id, {
          balance: h.balance + b
        }), console.log(`\u2705 Winner: ${o.bettor} won ${b} credits (${o.amount} \xD7 ${o.odds})`)), await e.db.patch(o._id, {
          status: "won",
          payout: b,
          resolvedAt: Date.now()
        }), await e.db.insert("bettingTransactions", {
          address: o.bettor,
          type: "win",
          amount: b,
          roomId: n,
          timestamp: Date.now()
        }), await e.db.insert("pokerChatMessages", {
          roomId: n,
          sender: o.bettor,
          senderUsername: g,
          message: `\u{1F389} Won ${b} credits! (${o.amount} \xD7 ${o.odds}x)`,
          timestamp: Date.now(),
          type: "text"
        });
      } else
        m++, await e.db.patch(o._id, {
          status: "lost",
          resolvedAt: Date.now()
        }), console.log(`\u274C Loser: ${o.bettor} lost ${o.amount} credits`), await e.db.insert("bettingTransactions", {
          address: o.bettor,
          type: "loss",
          amount: -o.amount,
          roomId: n,
          timestamp: Date.now()
        }), await e.db.insert("pokerChatMessages", {
          roomId: n,
          sender: o.bettor,
          senderUsername: g,
          message: `\u{1F494} Lost ${o.amount} credits on Round ${r}`,
          timestamp: Date.now(),
          type: "text"
        });
    }
    return console.log(`\u{1F3B0} Round ${r} resolved: ${i} winners, ${m} losers`), {
      success: !0,
      betsResolved: d.length,
      winners: i,
      losers: m
    };
  }, "handler")
}), S = I({
  args: {
    address: s.string(),
    roomId: s.optional(s.string())
    // Optional for tracking
  },
  handler: /* @__PURE__ */ c(async (e, a) => {
    let { address: n, roomId: r } = a, t = n.toLowerCase(), u = await e.db.query("bettingCredits").withIndex("by_address", (o) => o.eq("address", t)).first();
    if (!u || u.balance === 0)
      return {
        success: !0,
        converted: 0,
        message: "No credits to convert"
      };
    let d = u.balance, i = await e.db.query("profiles").withIndex("by_address", (o) => o.eq("address", t)).first();
    if (!i)
      throw new Error("Profile not found");
    let w = (i.coins || 0) + d;
    return await e.db.patch(i._id, {
      coins: w,
      lifetimeEarned: (i.lifetimeEarned || 0) + d,
      lastUpdated: Date.now()
    }), await e.db.insert("coinTransactions", {
      address: n.toLowerCase(),
      amount: d,
      type: "earn",
      source: "betting_convert",
      description: "Converted betting credits to coins",
      timestamp: Date.now(),
      balanceBefore: i.coins || 0,
      balanceAfter: w
    }), await e.db.patch(u._id, {
      balance: 0
    }), await e.db.insert("bettingTransactions", {
      address: t,
      type: "withdraw",
      amount: d,
      roomId: r,
      timestamp: Date.now()
    }), console.log(`\u{1F4B0} Converted ${d} credits to TESTVBMS for ${t}`), {
      success: !0,
      converted: d,
      newCoinsBalance: w,
      message: `${d} credits converted to TESTVBMS!`
    };
  }, "handler")
}), z = p({
  args: {
    roomId: s.string(),
    roundNumber: s.number()
  },
  handler: /* @__PURE__ */ c(async (e, a) => await e.db.query("roundBets").withIndex(
    "by_room_round",
    (r) => r.eq("roomId", a.roomId).eq("roundNumber", a.roundNumber)
  ).collect(), "handler")
}), F = p({
  args: {
    address: s.string(),
    roomId: s.string()
  },
  handler: /* @__PURE__ */ c(async (e, a) => {
    let n = a.address.toLowerCase();
    return await e.db.query("roundBets").withIndex("by_bettor", (t) => t.eq("bettor", n)).filter((t) => t.eq(t.field("roomId"), a.roomId)).collect();
  }, "handler")
}), W = p({
  args: {
    roomId: s.string(),
    roundNumber: s.number()
  },
  handler: /* @__PURE__ */ c(async (e, a) => {
    let n = await e.db.query("roundBets").withIndex(
      "by_room_round",
      (t) => t.eq("roomId", a.roomId).eq("roundNumber", a.roundNumber)
    ).collect(), r = {};
    for (let t of n)
      r[t.betOn] || (r[t.betOn] = { total: 0, count: 0 }), r[t.betOn].total += t.amount, r[t.betOn].count += 1;
    return {
      bets: n,
      stats: r,
      totalBets: n.length
    };
  }, "handler")
});
export {
  S as convertCreditsToCoins,
  F as getMyRoomBets,
  W as getRoomBettingStats,
  M as getRoundBet,
  z as getRoundBets,
  U as getSpectatorBetsForRoom,
  x as placeBetOnRound,
  E as resolveRoundBets
};
//# sourceMappingURL=roundBetting.js.map
