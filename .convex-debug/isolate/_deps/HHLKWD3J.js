import {
  a as p,
  c as f,
  d as w
} from "./3SBKGJDS.js";
import {
  h as t
} from "./34SVKERO.js";
import {
  a as l
} from "./5B5TEMMX.js";

// convex/coinsInbox.ts
async function g(s, e) {
  await s.db.insert("coinTransactions", {
    address: e.address.toLowerCase(),
    type: e.type,
    amount: e.amount,
    source: e.source,
    description: e.description,
    balanceBefore: e.balanceBefore,
    balanceAfter: e.balanceAfter,
    timestamp: Date.now(),
    txHash: e.txHash
  });
}
l(g, "logTransaction");
var C = w({
  args: {
    address: t.string(),
    amount: t.number(),
    source: t.string()
    // "pve", "pvp", "attack", "leaderboard"
  },
  handler: /* @__PURE__ */ l(async (s, { address: e, amount: n, source: a }) => {
    let o = e.toLowerCase(), i = await s.db.query("profiles").withIndex("by_address", (r) => r.eq("address", o)).first();
    if (!i)
      throw new Error("Profile not found");
    let d = i.coinsInbox || 0, b = d + n;
    return await s.db.patch(i._id, {
      coinsInbox: b,
      lastUpdated: Date.now()
    }), await s.db.insert("coinTransactions", {
      address: o,
      type: "earn",
      amount: n,
      source: a,
      description: `Earned ${n} coins from ${a}`,
      balanceBefore: d,
      balanceAfter: b,
      timestamp: Date.now()
    }), {
      success: !0,
      newInboxBalance: b,
      amountAdded: n
    };
  }, "handler")
}), A = f({
  args: {
    address: t.string()
  },
  handler: /* @__PURE__ */ l(async (s, { address: e }) => {
    let n = e.toLowerCase(), a = await s.db.query("profiles").withIndex("by_address", (b) => b.eq("address", n)).first();
    if (!a)
      throw new Error("Profile not found");
    let o = a.coinsInbox || 0;
    if (o === 0)
      throw new Error("No coins in inbox to claim");
    let i = a.coins || 0, d = i + o;
    return await s.db.patch(a._id, {
      coins: d,
      coinsInbox: 0,
      lifetimeEarned: (a.lifetimeEarned || 0) + o,
      lastUpdated: Date.now()
    }), await s.db.insert("coinTransactions", {
      address: n,
      type: "claim",
      amount: o,
      source: "inbox",
      description: `Claimed ${o} coins from inbox to balance`,
      balanceBefore: i,
      balanceAfter: d,
      timestamp: Date.now()
    }), {
      success: !0,
      claimedAmount: o,
      newCoinsBalance: d
    };
  }, "handler")
}), I = p({
  args: {
    address: t.string()
  },
  handler: /* @__PURE__ */ l(async (s, { address: e }) => {
    let n = await s.db.query("profiles").withIndex("by_address", (b) => b.eq("address", e.toLowerCase())).first();
    if (!n)
      return null;
    let a = 180 * 1e3, o = n.lastConversionAttempt || n.pendingConversionTimestamp || 0, i = Date.now() - o, d = o > 0 && i < a ? Math.ceil((a - i) / 1e3) : 0;
    return {
      coinsInbox: n.coinsInbox || 0,
      // For backward compatibility
      coins: n.coins || 0,
      inbox: n.coinsInbox || 0,
      // TESTVBMS inbox (rewards accumulate here)
      lifetimeEarned: n.lifetimeEarned || 0,
      cooldownRemaining: d
      // Seconds until next conversion allowed (0 = ready)
    };
  }, "handler")
}), T = p({
  args: {
    address: t.string()
  },
  handler: /* @__PURE__ */ l(async (s, { address: e }) => {
    let n = await s.db.query("profiles").withIndex("by_address", (a) => a.eq("address", e.toLowerCase())).first();
    return n ? (n.coinsInbox || 0) > 0 : !1;
  }, "handler")
}), B = p({
  args: {
    address: t.string(),
    limit: t.optional(t.number())
  },
  handler: /* @__PURE__ */ l(async (s, { address: e, limit: n = 50 }) => {
    let a = e.toLowerCase(), o = await s.db.query("coinTransactions").withIndex("by_address", (r) => r.eq("address", a)).order("desc").take(n), d = (await s.db.query("bettingTransactions").withIndex("by_address", (r) => r.eq("address", a)).order("desc").take(n)).map((r) => {
      let c, m, u = r.amount;
      switch (r.type) {
        case "win":
          c = "earn", m = `Won ${Math.abs(u)} credits betting (Mecha Arena)`;
          break;
        case "loss":
          c = "spend", m = `Lost ${Math.abs(u)} credits betting (Mecha Arena)`;
          break;
        case "deposit":
          c = "convert", m = `Deposited ${Math.abs(u)} coins for betting credits`;
          break;
        case "withdraw":
          c = "earn", m = `Converted ${Math.abs(u)} betting credits to coins`;
          break;
        case "refund":
          c = "refund", m = `Refunded ${Math.abs(u)} credits (tie round)`;
          break;
        default:
          c = "spend", m = `Bet ${Math.abs(u)} credits`;
      }
      return {
        _id: r._id,
        _creationTime: r._creationTime,
        address: r.address,
        type: c,
        amount: Math.abs(u),
        source: "mecha_arena",
        description: m,
        balanceBefore: 0,
        // Not tracked for betting
        balanceAfter: 0,
        // Not tracked for betting
        timestamp: r.timestamp,
        txHash: r.txHash
      };
    });
    return [...o, ...d].sort((r, c) => c.timestamp - r.timestamp).slice(0, n);
  }, "handler")
}), M = f({
  args: {
    address: t.string(),
    type: t.string(),
    // 'earn' | 'claim' | 'convert' | 'spend' | 'bonus' | 'refund'
    amount: t.number(),
    source: t.string(),
    // 'pve', 'pvp', 'attack', 'boss', 'mission', 'quest', 'shame', 'leaderboard', 'convert', etc
    description: t.string(),
    balanceBefore: t.number(),
    balanceAfter: t.number(),
    txHash: t.optional(t.string())
  },
  handler: /* @__PURE__ */ l(async (s, e) => {
    let n = e.address.toLowerCase();
    return await s.db.insert("coinTransactions", {
      address: n,
      type: e.type,
      amount: e.amount,
      source: e.source,
      description: e.description,
      balanceBefore: e.balanceBefore,
      balanceAfter: e.balanceAfter,
      timestamp: Date.now(),
      txHash: e.txHash
    }), { success: !0 };
  }, "handler")
});

export {
  g as a,
  C as b,
  A as c,
  I as d,
  T as e,
  B as f,
  M as g
};
//# sourceMappingURL=HHLKWD3J.js.map
