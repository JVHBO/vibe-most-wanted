import {
  a as f,
  c as m,
  d as y
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as n
} from "./_deps/34SVKERO.js";
import {
  a as p
} from "./_deps/5B5TEMMX.js";

// convex/pokerCpu.ts
var a = 5, d = 10;
function u() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
p(u, "getTodayDate");
var h = f({
  args: {
    address: n.string()
  },
  handler: /* @__PURE__ */ p(async (o, t) => {
    let s = await o.db.query("profiles").withIndex("by_address", (c) => c.eq("address", t.address.toLowerCase())).first();
    if (!s)
      return { remaining: a, total: a };
    let r = u(), e = s.dailyLimits;
    if (!e || e.lastResetDate !== r)
      return { remaining: a, total: a };
    let i = e.pokerCpuAttempts || 0;
    return { remaining: Math.max(0, a - i), total: a };
  }, "handler")
}), P = f({
  args: {
    address: n.string()
  },
  handler: /* @__PURE__ */ p(async (o, t) => {
    let s = await o.db.query("profiles").withIndex("by_address", (c) => c.eq("address", t.address.toLowerCase())).first();
    if (!s)
      return { remaining: d, total: d };
    let r = u(), e = s.dailyLimits;
    if (!e || e.lastResetDate !== r)
      return { remaining: d, total: d };
    let i = e.pveWins || 0;
    return { remaining: Math.max(0, d - i), total: d };
  }, "handler")
}), b = m({
  args: {
    address: n.string()
  },
  handler: /* @__PURE__ */ p(async (o, t) => {
    let s = await o.db.query("profiles").withIndex("by_address", (c) => c.eq("address", t.address.toLowerCase())).first();
    if (!s)
      throw new Error("Profile not found");
    let r = u(), e = s.dailyLimits;
    (!e || e.lastResetDate !== r) && (e = {
      pveWins: 0,
      pvpMatches: 0,
      pokerCpuAttempts: 0,
      lastResetDate: r,
      firstPveBonus: !1,
      firstPvpBonus: !1,
      loginBonus: !1,
      streakBonus: !1
    });
    let i = e.pokerCpuAttempts || 0;
    if (i >= a)
      throw new Error(`Daily limit reached. You can play ${a} CPU poker games per day. Come back tomorrow!`);
    e.pokerCpuAttempts = i + 1, await o.db.patch(s._id, {
      dailyLimits: e
    });
    let l = a - e.pokerCpuAttempts;
    return console.log(`\u{1F3AE} ${t.address} consumed poker CPU attempt. Remaining: ${l}/${a}`), {
      success: !0,
      remaining: l,
      total: a
    };
  }, "handler")
}), C = m({
  args: {
    address: n.string()
  },
  handler: /* @__PURE__ */ p(async (o, t) => {
    let s = await o.db.query("profiles").withIndex("by_address", (c) => c.eq("address", t.address.toLowerCase())).first();
    if (!s)
      throw new Error("Profile not found");
    let r = u(), e = s.dailyLimits;
    (!e || e.lastResetDate !== r) && (e = {
      pveWins: 0,
      pvpMatches: 0,
      pokerCpuAttempts: 0,
      lastResetDate: r,
      firstPveBonus: !1,
      firstPvpBonus: !1,
      loginBonus: !1,
      streakBonus: !1
    });
    let i = e.pveWins || 0;
    if (i >= d)
      throw new Error(`Daily limit reached. You can play ${d} PvE battles per day. Come back tomorrow!`);
    e.pveWins = i + 1, await o.db.patch(s._id, {
      dailyLimits: e
    });
    let l = d - e.pveWins;
    return console.log(`\u2694\uFE0F ${t.address} consumed PvE attempt. Remaining: ${l}/${d}`), {
      success: !0,
      remaining: l,
      total: d
    };
  }, "handler")
}), v = y({
  args: {
    address: n.string(),
    difficulty: n.union(
      n.literal("gey"),
      n.literal("goofy"),
      n.literal("gooner"),
      n.literal("gangster"),
      n.literal("gigachad")
    ),
    coinsWon: n.number()
  },
  handler: /* @__PURE__ */ p(async (o, t) => {
    let s = await o.db.query("profiles").withIndex("by_address", (i) => i.eq("address", t.address.toLowerCase())).first();
    if (!s)
      throw new Error("Profile not found");
    let r = s.coins || 0, e = r + t.coinsWon;
    return await o.db.patch(s._id, {
      coins: e,
      lifetimeEarned: (s.lifetimeEarned || 0) + t.coinsWon
    }), console.log(`\u{1F4B0} ${t.address} won ${t.coinsWon} coins on ${t.difficulty} difficulty (total: ${e})`), await o.db.insert("coinTransactions", {
      address: t.address.toLowerCase(),
      type: "earn",
      amount: t.coinsWon,
      source: "pve",
      description: `Poker CPU victory (${t.difficulty})`,
      balanceBefore: r,
      balanceAfter: e,
      timestamp: Date.now()
    }), {
      success: !0,
      coinsWon: t.coinsWon,
      newBalance: e
    };
  }, "handler")
});
export {
  v as awardPokerWin,
  b as consumePokerAttempt,
  C as consumePveAttempt,
  h as getRemainingPokerAttempts,
  P as getRemainingPveAttempts
};
//# sourceMappingURL=pokerCpu.js.map
