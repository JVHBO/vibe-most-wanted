import {
  a as E,
  b as M,
  d as R
} from "./3SBKGJDS.js";
import {
  h as n
} from "./34SVKERO.js";
import {
  a as A
} from "./5B5TEMMX.js";

// convex/coinAudit.ts
var $ = R({
  args: {
    playerAddress: n.string(),
    type: n.union(
      n.literal("earn"),
      n.literal("spend"),
      n.literal("convert"),
      n.literal("claim")
    ),
    amount: n.number(),
    balanceBefore: n.number(),
    balanceAfter: n.number(),
    source: n.string(),
    sourceId: n.optional(n.string()),
    metadata: n.optional(n.object({
      missionType: n.optional(n.string()),
      difficulty: n.optional(n.string()),
      txHash: n.optional(n.string()),
      nonce: n.optional(n.string()),
      reason: n.optional(n.string()),
      prizeIndex: n.optional(n.number()),
      spinId: n.optional(n.string())
    }))
  },
  handler: /* @__PURE__ */ A(async (p, r) => {
    let u = await p.db.insert("coinAuditLog", {
      playerAddress: r.playerAddress.toLowerCase(),
      type: r.type,
      amount: r.amount,
      balanceBefore: r.balanceBefore,
      balanceAfter: r.balanceAfter,
      source: r.source,
      sourceId: r.sourceId,
      metadata: r.metadata,
      timestamp: Date.now()
    });
    return console.log(`\u{1F512} [AUDIT] ${r.type.toUpperCase()} | ${r.playerAddress} | ${r.amount} coins | ${r.source} | balance: ${r.balanceBefore} \u2192 ${r.balanceAfter}`), u;
  }, "handler")
}), O = E({
  args: {
    playerAddress: n.string(),
    limit: n.optional(n.number()),
    type: n.optional(n.union(
      n.literal("earn"),
      n.literal("spend"),
      n.literal("convert"),
      n.literal("claim")
    ))
  },
  handler: /* @__PURE__ */ A(async (p, { playerAddress: r, limit: u = 100, type: s }) => {
    let g = r.toLowerCase(), c = await p.db.query("coinAuditLog").withIndex("by_player", (a) => a.eq("playerAddress", g)).order("desc").take(u);
    return s ? c.filter((a) => a.type === s) : c;
  }, "handler")
}), H = E({
  args: {
    playerAddress: n.string()
  },
  handler: /* @__PURE__ */ A(async (p, { playerAddress: r }) => {
    let u = r.toLowerCase(), s = await p.db.query("coinAuditLog").withIndex("by_player", (t) => t.eq("playerAddress", u)).order("desc").take(5e3), g = s.filter((t) => t.type === "earn").reduce((t, o) => t + o.amount, 0), h = s.filter((t) => t.type === "spend").reduce((t, o) => t + Math.abs(o.amount), 0), c = s.filter((t) => t.type === "convert").reduce((t, o) => t + o.amount, 0), a = s.filter((t) => t.type === "claim").reduce((t, o) => t + o.amount, 0), m = {};
    s.forEach((t) => {
      m[t.source] || (m[t.source] = { count: 0, total: 0 }), m[t.source].count++, m[t.source].total += t.amount;
    });
    let e = [], i = [...s].sort((t, o) => t.timestamp - o.timestamp);
    for (let t = 0; t < i.length - 10; t++) {
      let o = i[t + 10].timestamp - i[t].timestamp;
      if (o < 6e4) {
        e.push(`Rapid transactions: 11 transactions in ${(o / 1e3).toFixed(1)}s at ${new Date(i[t].timestamp).toISOString()}`);
        break;
      }
    }
    let d = {};
    return s.forEach((t) => {
      d[t.source] || (d[t.source] = []), d[t.source].push(t.timestamp);
    }), Object.entries(d).forEach(([t, o]) => {
      if (o.length > 5) {
        let f = [...o].sort((S, _) => S - _), I = f[4] - f[0];
        I < 3e4 && e.push(`Suspicious spam: ${t} called ${o.length} times, first 5 in ${(I / 1e3).toFixed(1)}s`);
      }
    }), {
      totalTransactions: s.length,
      totalEarned: g,
      totalSpent: h,
      totalConverted: c,
      totalClaimed: a,
      netBalance: g - h,
      bySource: m,
      suspicious: e,
      firstTransaction: s.length > 0 ? new Date(Math.min(...s.map((t) => t.timestamp))).toISOString() : null,
      lastTransaction: s.length > 0 ? new Date(Math.max(...s.map((t) => t.timestamp))).toISOString() : null
    };
  }, "handler")
}), N = E({
  args: {
    hours: n.optional(n.number()),
    minAmount: n.optional(n.number())
  },
  handler: /* @__PURE__ */ A(async (p, { hours: r = 24, minAmount: u = 5e3 }) => {
    let s = Date.now() - r * 60 * 60 * 1e3, g = await p.db.query("coinAuditLog").withIndex("by_timestamp").filter((a) => a.gte(a.field("timestamp"), s)).take(5e3), h = {};
    g.forEach((a) => {
      h[a.playerAddress] || (h[a.playerAddress] = []), h[a.playerAddress].push(a);
    });
    let c = [];
    return Object.entries(h).forEach(([a, m]) => {
      let e = m.filter((i) => i.type === "earn").reduce((i, d) => i + d.amount, 0);
      if (e >= u) {
        let i = m.map((o) => o.timestamp), d = Math.max(...i) - Math.min(...i), t = [];
        e >= 5e3 && d < 6e5 && t.push(`High earnings in short time: ${e} TESTVBMS in ${(d / 6e4).toFixed(1)} min`), m.length > 20 && d < 3e5 && t.push(`High transaction volume: ${m.length} transactions in ${(d / 6e4).toFixed(1)} min`), t.length > 0 && c.push({
          address: a,
          totalEarned: e,
          transactionCount: m.length,
          timeSpan: d,
          reasons: t
        });
      }
    }), c.sort((a, m) => m.totalEarned - a.totalEarned);
  }, "handler")
}), U = M({
  args: {
    limit: n.optional(n.number())
  },
  handler: /* @__PURE__ */ A(async (p, { limit: r = 100 }) => {
    let u = await p.db.query("coinAuditLog").order("desc").take(r);
    return {
      total: u.length,
      logs: u
    };
  }, "handler")
}), y = {
  // Rapid claims detection
  MAX_CLAIMS_PER_MINUTE: 3,
  MAX_CLAIMS_PER_HOUR: 10,
  // High volume detection
  HIGH_AMOUNT_SINGLE_CLAIM: 1e5,
  // 100k VBMS in one claim
  HIGH_AMOUNT_PER_HOUR: 5e5,
  // 500k VBMS per hour
  // Rapid transactions detection
  MAX_TRANSACTIONS_PER_MINUTE: 15,
  SUSPICIOUS_EARN_RATE: 1e4
  // 10k+ in 5 minutes
}, x = M({
  args: {},
  handler: /* @__PURE__ */ A(async (p) => {
    let r = Date.now(), u = r - 3600 * 1e3, s = r - 300 * 1e3, g = r - 60 * 1e3, h = await p.db.query("coinAuditLog").withIndex("by_timestamp").filter((e) => e.gte(e.field("timestamp"), u)).take(3e3), c = [], a = {};
    h.forEach((e) => {
      a[e.playerAddress] || (a[e.playerAddress] = []), a[e.playerAddress].push(e);
    }), Object.entries(a).forEach(([e, i]) => {
      let d = i.filter((l) => l.type === "convert" || l.type === "claim"), t = d.filter((l) => l.timestamp > g), o = d.filter((l) => l.timestamp > u);
      t.length >= y.MAX_CLAIMS_PER_MINUTE && c.push({
        severity: "critical",
        type: "RAPID_CLAIMS",
        address: e,
        details: `${t.length} claims in last minute (threshold: ${y.MAX_CLAIMS_PER_MINUTE})`,
        timestamp: r
      }), o.length >= y.MAX_CLAIMS_PER_HOUR && c.push({
        severity: "warning",
        type: "HIGH_CLAIM_VOLUME",
        address: e,
        details: `${o.length} claims in last hour (threshold: ${y.MAX_CLAIMS_PER_HOUR})`,
        timestamp: r
      });
      let f = d.filter((l) => l.timestamp > u).reduce((l, L) => l + L.amount, 0);
      f >= y.HIGH_AMOUNT_PER_HOUR && c.push({
        severity: "critical",
        type: "HIGH_VOLUME_CLAIMS",
        address: e,
        details: `${f.toLocaleString()} VBMS claimed in last hour (threshold: ${y.HIGH_AMOUNT_PER_HOUR.toLocaleString()})`,
        timestamp: r
      }), d.filter((l) => l.amount >= y.HIGH_AMOUNT_SINGLE_CLAIM).forEach((l) => {
        c.push({
          severity: "warning",
          type: "LARGE_SINGLE_CLAIM",
          address: e,
          details: `Single claim of ${l.amount.toLocaleString()} VBMS (threshold: ${y.HIGH_AMOUNT_SINGLE_CLAIM.toLocaleString()})`,
          timestamp: l.timestamp
        });
      });
      let _ = i.filter((l) => l.type === "earn" && l.timestamp > s).reduce((l, L) => l + L.amount, 0);
      _ >= y.SUSPICIOUS_EARN_RATE && c.push({
        severity: "warning",
        type: "RAPID_EARNING",
        address: e,
        details: `${_.toLocaleString()} TESTVBMS earned in 5 minutes (threshold: ${y.SUSPICIOUS_EARN_RATE.toLocaleString()})`,
        timestamp: r
      });
      let b = i.filter((l) => l.timestamp > g);
      b.length >= y.MAX_TRANSACTIONS_PER_MINUTE && c.push({
        severity: "critical",
        type: "RAPID_TRANSACTIONS",
        address: e,
        details: `${b.length} transactions in last minute (threshold: ${y.MAX_TRANSACTIONS_PER_MINUTE})`,
        timestamp: r
      });
    });
    let m = { critical: 0, warning: 1, info: 2 };
    return c.sort((e, i) => m[e.severity] !== m[i.severity] ? m[e.severity] - m[i.severity] : i.timestamp - e.timestamp), {
      totalAlerts: c.length,
      critical: c.filter((e) => e.severity === "critical").length,
      warning: c.filter((e) => e.severity === "warning").length,
      alerts: c.slice(0, 50),
      // Top 50 alerts
      thresholds: y,
      analyzedPlayers: Object.keys(a).length,
      analyzedTransactions: h.length
    };
  }, "handler")
}), P = M({
  args: {},
  handler: /* @__PURE__ */ A(async (p) => {
    let r = Date.now() - 6048e5, u = await p.db.query("coinAuditLog").withIndex("by_timestamp").filter((e) => e.gte(e.field("timestamp"), r)).take(1e4), s = {};
    u.forEach((e) => {
      s[e.playerAddress] || (s[e.playerAddress] = []), s[e.playerAddress].push(e);
    });
    let g = Object.keys(s), h = g.map(
      (e) => p.db.query("profiles").withIndex("by_address", (i) => i.eq("address", e)).first()
    ), c = await Promise.all(h), a = {};
    g.forEach((e, i) => {
      c[i] && (a[e] = c[i]);
    });
    let m = [];
    for (let e of g) {
      let i = s[e], d = a[e];
      if (!d) continue;
      let t = 0, o = [], f = d.claimedTokens || 0, I = d.lifetimeEarned || 0, S = I > 0 ? f / I : f > 0 ? 999 : 0, _ = i.filter((l) => l.source === "clearPendingWithoutRestore"), b = i.filter((l) => l.type === "claim" && l.source === "recordTESTVBMSConversion");
      _.length > 0 && (t += 100, o.push(`\u{1F6A8} DOUBLE-SPEND: ${_.length}x`), S > 5 && f > 1e5 && (t += 50, o.push(`\u26A0\uFE0F RATIO: ${S.toFixed(1)}x`))), _.length === 0 && S > 100 && f > 5e5 && (t += 40, o.push(`\u26A0\uFE0F Very high ratio: ${S.toFixed(1)}x (might be burns)`)), b.length > 20 && (t += 20, o.push(`High claims this week: ${b.length}`)), t >= 50 && m.push({
        address: e,
        username: d.username || d.farcasterDisplayName || "unknown",
        riskScore: t,
        totalClaimedOnChain: f,
        lifetimeEarned: I,
        ratio: Math.round(S * 10) / 10,
        claimCount: b.length,
        flags: o
      });
    }
    return m.sort((e, i) => i.riskScore - e.riskScore);
  }, "handler")
});
async function v(p, r, u, s, g, h, c, a, m) {
  await p.db.insert("coinAuditLog", {
    playerAddress: r.toLowerCase(),
    type: u,
    amount: s,
    balanceBefore: g,
    balanceAfter: h,
    source: c,
    sourceId: a,
    metadata: m,
    timestamp: Date.now()
  }), console.log(`\u{1F512} [AUDIT] ${u.toUpperCase()} | ${r} | ${s} coins | ${c} | balance: ${g} \u2192 ${h}`);
}
A(v, "createAuditLog");

export {
  $ as a,
  O as b,
  H as c,
  N as d,
  U as e,
  x as f,
  P as g,
  v as h
};
//# sourceMappingURL=QS6BMXBV.js.map
