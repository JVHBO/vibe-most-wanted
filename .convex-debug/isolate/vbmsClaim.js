import {
  b as p
} from "./_deps/AWJMSRP7.js";
import {
  b as B,
  c as R
} from "./_deps/55EWY3YS.js";
import {
  a as T
} from "./_deps/HHLKWD3J.js";
import {
  h as b
} from "./_deps/QS6BMXBV.js";
import {
  a as h,
  b as M,
  c as v,
  d as y,
  e as A,
  f as S
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as i
} from "./_deps/34SVKERO.js";
import {
  a as d
} from "./_deps/5B5TEMMX.js";

// convex/vbmsClaim.ts
async function g(t, n) {
  let e = await t.db.query("profiles").withIndex("by_address", (o) => o.eq("address", n.toLowerCase())).first();
  if (!e)
    throw new Error(`Profile not found for address: ${n}`);
  return e;
}
d(g, "getProfile");
function D(t, n, e = 0) {
  let o = 0, r = [], a = n + e;
  if (a >= 1e3) {
    let u = Math.floor(a * 0.01);
    o += u, r.push(`+${u} VBMS (1% large claim bonus)`);
  }
  let s = t.lastClaimTimestamp || 0;
  if ((Date.now() - s) / (1440 * 60 * 1e3) >= 7) {
    let u = Math.floor(a * 0.05);
    o += u, r.push(`+${u} VBMS (5% weekly bonus)`);
  }
  let c = Math.floor(Date.now() / (1440 * 60 * 1e3)), m = Math.floor(s / (1440 * 60 * 1e3));
  return c > m && (o += 50, r.push("+50 VBMS (first claim today)")), {
    baseAmount: n,
    bonus: o,
    totalAmount: n + o,
    bonusReasons: r
  };
}
d(D, "calculateClaimBonus");
function _() {
  let t = crypto.randomUUID().replace(/-/g, ""), n = crypto.randomUUID().replace(/-/g, "");
  return `0x${t}${n}`.substring(0, 66);
}
d(_, "generateNonce");
var F = S({
  args: {
    address: i.string(),
    amount: i.number(),
    nonce: i.string()
  },
  handler: /* @__PURE__ */ d(async (t, n) => {
    let { address: e, amount: o, nonce: r } = n, a = "https://vibemostwanted.xyz";
    console.log(`[VBMS Sign Claim] Calling API at: ${a}/api/vbms/sign-claim`), console.log(`[VBMS Sign Claim] Request: address=${e}, amount=${o}, nonce=${r}`);
    try {
      let s = await fetch(`${a}/api/vbms/sign-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: e, amount: o, nonce: r })
      });
      if (console.log(`[VBMS Sign Claim] Response status: ${s.status} ${s.statusText}`), !s.ok) {
        let c = await s.text();
        console.error(`[VBMS Sign Claim] Error response body: ${c}`);
        let m;
        try {
          m = JSON.parse(c);
        } catch {
          m = { error: c || "Unknown error" };
        }
        throw new Error(`Failed to sign claim (${s.status}): ${m.error || s.statusText}`);
      }
      let l = await s.json();
      if (console.log(`[VBMS Signature] Address: ${e}, Amount: ${o} VBMS, Nonce: ${r}`), console.log(`[VBMS Signature] Signature received: ${l.signature?.slice(0, 20)}...`), !l.signature)
        throw new Error("No signature in response");
      return l.signature;
    } catch (s) {
      throw console.error(`[VBMS Signature Error] ${s.message}`, s), new Error(`Failed to sign claim message: ${s.message}`);
    }
  }, "handler")
}), L = "0x062b914668f3fD35c3Ae02e699cB82e1cF4bE18b", x = "https://mainnet.base.org", q = S({
  args: {
    nonce: i.string()
  },
  handler: /* @__PURE__ */ d(async (t, { nonce: n }) => {
    try {
      let r = `0xfeb61724${(n.startsWith("0x") ? n : `0x${n}`).slice(2).padStart(64, "0")}`, s = await (await fetch(x, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{
            to: L,
            data: r
          }, "latest"]
        })
      })).json();
      if (s.error)
        return console.error("[OnChain Check] RPC error:", s.error), !0;
      let l = s.result, c = l && l !== "0x0000000000000000000000000000000000000000000000000000000000000000";
      return console.log(`[OnChain Check] Nonce ${n.slice(0, 10)}... used: ${c}`), c;
    } catch (e) {
      return console.error("[OnChain Check] Error checking nonce:", e), !0;
    }
  }, "handler")
}), H = v({
  args: {
    address: i.string(),
    matchId: i.id("matches")
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, matchId: e }) => {
    let o = await g(t, n), r = await t.db.get(e);
    if (!r)
      throw new Error("Match not found");
    if (r.playerAddress.toLowerCase() !== n.toLowerCase())
      throw new Error("Unauthorized: Match does not belong to this player");
    if (r.rewardsClaimed)
      throw new Error("Rewards already claimed for this match");
    let a = r.coinsEarned || 0, s = (o.coins || 0) + a;
    return await t.db.patch(o._id, {
      coins: s,
      lifetimeEarned: (o.lifetimeEarned || 0) + a
    }), await t.db.insert("coinTransactions", {
      address: n.toLowerCase(),
      amount: a,
      type: "earn",
      source: "pve_match",
      description: "PvE match reward",
      timestamp: Date.now(),
      balanceBefore: o.coins || 0,
      balanceAfter: s
    }), await b(
      t,
      n,
      "earn",
      a,
      o.coins || 0,
      s,
      "sendToInbox",
      e,
      { reason: "PvE match reward added to balance" }
    ), await t.db.patch(e, {
      rewardsClaimed: !0,
      claimedAt: Date.now(),
      claimType: "inbox"
    }), await t.db.insert("claimAnalytics", {
      playerAddress: n.toLowerCase(),
      choice: "inbox",
      amount: a,
      inboxTotal: s,
      bonusAvailable: !1,
      timestamp: Date.now()
    }), {
      newInbox: s,
      amountAdded: a,
      gasUsed: 0,
      message: `\u{1F4B0} ${a} VBMS added to balance!`
    };
  }, "handler")
}), Y = A({
  args: {
    address: i.string()
  },
  handler: /* @__PURE__ */ d(async (t, { address: n }) => {
    let e = await t.runMutation(p.vbmsClaim.prepareInboxClaimInternal, { address: n }), o = _(), r = await t.runAction(p.vbmsClaim.signClaimMessage, {
      address: n,
      amount: e.totalAmount,
      nonce: o
    });
    return {
      amount: e.totalAmount,
      baseAmount: e.baseAmount,
      bonus: e.bonus,
      bonusReasons: e.bonusReasons,
      nonce: o,
      signature: r,
      message: `Collect ${e.totalAmount} VBMS from inbox`
    };
  }, "handler")
}), W = y({
  args: {
    address: i.string()
  },
  handler: /* @__PURE__ */ d(async (t, { address: n }) => {
    let e = await g(t, n), o = e.coinsInbox || 0;
    if (o < 100)
      throw new Error("Minimum claim amount is 100 VBMS. Current inbox: " + o);
    let r = D(e, o);
    return await t.db.patch(e._id, {
      coinsInbox: 0
    }), {
      totalAmount: r.totalAmount,
      baseAmount: r.baseAmount,
      bonus: r.bonus,
      bonusReasons: r.bonusReasons
    };
  }, "handler")
}), Q = v({
  args: {
    address: i.string(),
    amount: i.number(),
    txHash: i.string()
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, amount: e, txHash: o }) => {
    let r = await g(t, n);
    return await t.db.patch(r._id, {
      coinsInbox: 0,
      claimedTokens: (r.claimedTokens || 0) + e,
      lastClaimTimestamp: Date.now()
    }), await t.db.insert("claimHistory", {
      playerAddress: n.toLowerCase(),
      amount: e,
      txHash: o,
      timestamp: Date.now(),
      type: "inbox_collect"
    }), {
      success: !0,
      newClaimedTotal: (r.claimedTokens || 0) + e
    };
  }, "handler")
}), j = h({
  args: { address: i.string() },
  handler: /* @__PURE__ */ d(async (t, { address: n }) => {
    let e = await t.db.query("profiles").withIndex("by_address", (a) => a.eq("address", n.toLowerCase())).first();
    if (!e)
      return null;
    let o = e.pendingConversion || 0, r = Math.max(0, (e.coins || 0) - o);
    return {
      // Virtual balance (in-app spending) - TESTVBMS
      coins: e.coins || 0,
      availableCoins: r,
      // Coins available (excluding pending conversion)
      lifetimeEarned: e.lifetimeEarned || 0,
      lifetimeSpent: e.lifetimeSpent || 0,
      // Real VBMS token (inbox system)
      inbox: e.coinsInbox || 0,
      claimedTokens: e.claimedTokens || 0,
      poolDebt: e.poolDebt || 0,
      lastClaimTimestamp: e.lastClaimTimestamp || 0,
      // Pending conversion info
      pendingConversion: o,
      pendingConversionTimestamp: e.pendingConversionTimestamp || null,
      hasPendingConversion: o > 0,
      // Calculate claimable
      claimableBalance: Math.max(0, (e.coinsInbox || 0) - (e.poolDebt || 0))
    };
  }, "handler")
}), K = h({
  args: {
    address: i.string(),
    pendingAmount: i.number()
    // Amount from current battle
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, pendingAmount: e }) => {
    let o = await g(t, n), r = o.coinsInbox || 0, a = r + e, s = o.lastClaimTimestamp || 0, l = (Date.now() - s) / (1440 * 60 * 1e3), c = D(o, e, r), m = c.bonus > 0, u = "inbox", w = "Economize gas acumulando mais!", f = null;
    return a >= 1e3 ? (u = "claim_now", w = "Voc\xEA tem 1,000+ VBMS acumulado!", f = "\u{1F381} +1% Bonus") : l >= 7 ? (u = "claim_now", w = "Bonus semanal dispon\xEDvel!", f = "\u{1F389} +5% Weekly Bonus") : m && (u = "claim_now", w = "Bonus dispon\xEDvel agora!", f = `\u2728 +${c.bonus} VBMS`), {
      recommended: u,
      reason: w,
      badge: f,
      potentialBonus: c.bonus,
      totalWithBonus: c.totalAmount,
      inboxTotal: a
    };
  }, "handler")
}), z = h({
  args: {
    address: i.string(),
    limit: i.optional(i.number())
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, limit: e = 500 }) => await t.db.query("claimHistory").withIndex(
    "by_player",
    (r) => r.eq("playerAddress", n.toLowerCase())
  ).order("desc").take(e), "handler")
}), G = h({
  args: {
    address: i.string(),
    limit: i.optional(i.number())
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, limit: e = 500 }) => {
    let o = n.toLowerCase(), r = await t.db.query("claimHistory").withIndex("by_player", (c) => c.eq("playerAddress", o)).order("desc").take(e), a = await t.db.query("coinAuditLog").withIndex("by_player", (c) => c.eq("playerAddress", o)).order("desc").take(e), s = await t.db.query("claimAnalytics").withIndex("by_player", (c) => c.eq("playerAddress", o)).order("desc").take(e), l = [
      ...r.map((c) => ({
        source: "claimHistory",
        type: c.type,
        amount: c.amount,
        timestamp: c.timestamp,
        txHash: c.txHash,
        bonus: c.bonus
      })),
      ...a.map((c) => ({
        source: "auditLog",
        type: c.type,
        amount: c.amount,
        timestamp: c.timestamp,
        balanceBefore: c.balanceBefore,
        balanceAfter: c.balanceAfter,
        sourceFunction: c.source,
        metadata: c.metadata
      })),
      ...s.map((c) => ({
        source: "analytics",
        type: c.choice,
        amount: c.amount,
        timestamp: c.timestamp,
        inboxTotal: c.inboxTotal
      }))
    ].sort((c, m) => m.timestamp - c.timestamp);
    return {
      total: l.length,
      transactions: l.slice(0, e),
      summary: {
        claimHistoryCount: r.length,
        auditLogCount: a.length,
        analyticsCount: s.length
      }
    };
  }, "handler")
}), J = v({
  args: {
    address: i.string()
  },
  handler: /* @__PURE__ */ d(async (t, { address: n }) => {
    let e = await g(t, n), o = e.coinsInbox || 0;
    if (o < 1)
      throw new Error("Nada para coletar no inbox");
    let r = e.coins || 0, a = r + o;
    return await t.db.patch(e._id, {
      coins: a,
      coinsInbox: 0,
      // Clear inbox
      lifetimeEarned: (e.lifetimeEarned || 0) + o
    }), await t.db.insert("coinTransactions", {
      address: n.toLowerCase(),
      amount: o,
      type: "earn",
      source: "inbox_claim",
      description: "Claimed inbox as TESTVBMS",
      timestamp: Date.now(),
      balanceBefore: r,
      balanceAfter: a
    }), await b(
      t,
      n,
      "earn",
      o,
      r,
      a,
      "claimInboxAsTESTVBMS",
      void 0,
      { reason: "Inbox claimed as TESTVBMS (no blockchain)" }
    ), {
      success: !0,
      amount: o,
      newBalance: a,
      message: `\u{1F4B0} ${o} TESTVBMS added to your balance!`
    };
  }, "handler")
}), X = y({
  args: {
    address: i.string(),
    amount: i.number(),
    difficulty: i.optional(i.union(
      i.literal("gey"),
      i.literal("goofy"),
      i.literal("gooner"),
      i.literal("gangster"),
      i.literal("gigachad")
    ))
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, amount: e, difficulty: o }) => {
    let r = await g(t, n), a = r.coins || 0, s = a + e;
    await t.db.patch(r._id, {
      coins: s,
      lifetimeEarned: (r.lifetimeEarned || 0) + e,
      lastUpdated: Date.now()
    }), console.log(`\u{1F4B0} ${n} received ${e} TESTVBMS from PvE victory (difficulty: ${o || "N/A"}). Balance: ${a} \u2192 ${s}`), await t.db.insert("coinTransactions", {
      address: n.toLowerCase(),
      type: "earn",
      amount: e,
      source: "pve",
      description: `PvE victory (${o || "unknown"})`,
      balanceBefore: a,
      balanceAfter: s,
      timestamp: Date.now()
    }), await b(
      t,
      n,
      "earn",
      e,
      a,
      s,
      "sendPveRewardToInbox",
      void 0,
      { difficulty: o || void 0, reason: "PvE poker victory reward" }
    ), await t.db.insert("claimAnalytics", {
      playerAddress: n.toLowerCase(),
      choice: "pve",
      amount: e,
      inboxTotal: s,
      bonusAvailable: !1,
      timestamp: Date.now()
    });
    let l = `\u{1F4B0} ${e} TESTVBMS added to balance from PvE victory!`;
    return {
      newInbox: s,
      amountAdded: e,
      debtPaid: 0,
      hadDebt: !1,
      message: l
    };
  }, "handler")
}), Z = y({
  args: {
    address: i.string(),
    amount: i.number()
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, amount: e }) => {
    try {
      console.log(`[sendPvpRewardToInbox] START - address: ${n}, amount: ${e}`);
      let o = await g(t, n);
      console.log(`[sendPvpRewardToInbox] Profile found: ${o._id}`);
      let r = o.coins || 0, a = r + e;
      console.log("[sendPvpRewardToInbox] Updating profile..."), await t.db.patch(o._id, {
        coins: a,
        lifetimeEarned: (o.lifetimeEarned || 0) + e,
        lastUpdated: Date.now()
      }), console.log(`\u{1F4B0} ${n} received ${e} TESTVBMS from PvP victory. Balance: ${r} \u2192 ${a}`), await t.db.insert("coinTransactions", {
        address: n.toLowerCase(),
        type: "earn",
        amount: e,
        source: "pvp",
        description: "PvP victory reward",
        balanceBefore: r,
        balanceAfter: a,
        timestamp: Date.now()
      }), await b(
        t,
        n,
        "earn",
        e,
        r,
        a,
        "sendPvpRewardToInbox",
        void 0,
        { reason: "PvP poker victory reward" }
      ), console.log("[sendPvpRewardToInbox] Inserting analytics..."), await t.db.insert("claimAnalytics", {
        playerAddress: n.toLowerCase(),
        choice: "pvp",
        amount: e,
        inboxTotal: a,
        bonusAvailable: !1,
        timestamp: Date.now()
      });
      let s = `\u{1F4B0} ${e} TESTVBMS added to balance from PvP victory!`;
      return console.log("[sendPvpRewardToInbox] SUCCESS"), {
        newInbox: a,
        amountAdded: e,
        debtPaid: 0,
        hadDebt: !1,
        message: s
      };
    } catch (o) {
      throw console.error("[sendPvpRewardToInbox] ERROR:", o), console.error("[sendPvpRewardToInbox] Error details:", o.message, o.stack), new Error(`Failed to send PvP reward to inbox: ${o.message}`);
    }
  }, "handler")
}), ee = A({
  args: {
    address: i.string(),
    fid: i.number(),
    // 🔒 REQUIRED - Must provide valid FID
    amount: i.optional(i.number())
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, fid: e, amount: o }) => {
    if (console.log("[VBMS] \u{1F504} Conversion attempt:", {
      address: n,
      fid: e,
      requestedAmount: o,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), !e || e <= 0)
      throw console.log(`[VBMS] \u26D4 BLOCKED - No valid FID provided for ${n}`), new Error("[CLAIM_FID_REQUIRED]");
    let r = _(), a;
    try {
      a = await t.runMutation(p.vbmsClaim.convertTESTVBMSInternal, { address: n, fid: e, amount: o, nonce: r }), console.log("[VBMS] \u2705 Internal mutation success:", { claimAmount: a.claimAmount });
    } catch (l) {
      throw console.error("[VBMS] \u274C Internal mutation FAILED:", {
        address: n,
        fid: e,
        requestedAmount: o,
        error: l.message
      }), l;
    }
    let s;
    try {
      s = await t.runAction(p.vbmsClaim.signClaimMessage, {
        address: n,
        amount: a.claimAmount,
        nonce: r
      });
    } catch (l) {
      console.error(`[VBMS] \u274C Signature failed for ${n}, attempting restore of ${a.claimAmount} coins:`, l);
      try {
        throw await t.runAction(p.vbmsClaim.restoreCoinsOnSignFailure, {
          address: n,
          amount: a.claimAmount
        }), new Error(`[CLAIM_SIGNATURE_FAILED_RESTORED]${a.claimAmount}`);
      } catch (c) {
        throw console.error(`[VBMS] \u274C Auto-restore also failed for ${n}:`, c), new Error("[CLAIM_SIGNATURE_FAILED_MANUAL]");
      }
    }
    return console.log(`\u{1F4B1} ${n} (FID: ${e}) converting ${a.claimAmount} TESTVBMS \u2192 VBMS (nonce: ${r})`), {
      amount: a.claimAmount,
      nonce: r,
      signature: s,
      message: `Converting ${a.claimAmount} TESTVBMS to VBMS`
    };
  }, "handler")
}), $ = 180 * 1e3, E = 5e5, C = 100, ne = y({
  args: {
    address: i.string(),
    fid: i.number(),
    // 🔒 Required for FID verification
    amount: i.optional(i.number()),
    nonce: i.string()
    // 🔒 Store for on-chain verification (anti double-spend)
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, fid: e, amount: o, nonce: r }) => {
    if (console.log("[VBMS Internal] Processing conversion:", {
      address: n,
      fid: e,
      requestedAmount: o,
      maxAllowed: E,
      minRequired: C
    }), B(n)) {
      let I = R(n);
      throw console.log(`\u{1F6AB} [BLACKLIST] Blocked claim attempt from exploiter: ${n} (${I?.username})`), new Error("[CLAIM_BLACKLISTED]");
    }
    let a = await g(t, n);
    console.log("[VBMS Internal] Profile state:", {
      coins: a.coins || 0,
      farcasterFid: a.farcasterFid,
      profileFid: a.fid,
      lastClaimTimestamp: a.lastClaimTimestamp,
      pendingConversion: a.pendingConversion || 0
    });
    let s = a.farcasterFid || (a.fid ? Number(a.fid) : null);
    if (!s || s !== e)
      throw console.log(`\u{1F6AB} [SECURITY] FID mismatch! Provided: ${e}, Profile FID: ${s}, Address: ${n}`), new Error("[CLAIM_FID_MISMATCH]");
    console.log(`\u2705 [SECURITY] FID verified: ${e} for address ${n}`);
    let l = a.lastConversionAttempt || a.lastClaimTimestamp || 0, c = Date.now() - l;
    if (l > 0 && c < $) {
      let I = Math.ceil(($ - c) / 1e3);
      throw new Error(`[CLAIM_COOLDOWN]${I}`);
    }
    let m = a.coins || 0;
    if (m < C)
      throw new Error(`[CLAIM_MINIMUM_REQUIRED]${C}|${m}`);
    let u;
    if (o !== void 0) {
      if (o < C)
        throw new Error(`[CLAIM_MINIMUM_REQUIRED]${C}|${m}`);
      if (o > m)
        throw new Error(`[CLAIM_INSUFFICIENT_BALANCE]${m}|${o}`);
      u = Math.min(o, E);
    } else
      u = Math.min(m, E);
    let w = m - u;
    if (u < C)
      throw new Error(`[CLAIM_MINIMUM_REQUIRED]${C}|${m}`);
    let f = Date.now();
    return await t.db.patch(a._id, {
      coins: w,
      // Keep any amount over 100k
      pendingConversion: u,
      // Track pending conversion for recovery if needed
      pendingConversionTimestamp: f,
      pendingNonce: r,
      // 🔒 Store nonce to verify on-chain before allowing recovery
      lastConversionAttempt: f
      // 🔒 Track attempt time for cooldown (even if fails)
    }), await T(t, {
      address: n,
      type: "convert",
      amount: -u,
      source: "pending_conversion",
      description: `Converting ${u.toLocaleString()} TESTVBMS \u2192 VBMS (pending)`,
      balanceBefore: m,
      balanceAfter: w
    }), await b(
      t,
      n,
      "convert",
      u,
      m,
      w,
      "convertTESTVBMStoVBMS",
      void 0,
      { reason: `TESTVBMS to VBMS conversion initiated (max: ${E})` }
    ), await t.db.insert("claimAnalytics", {
      playerAddress: n.toLowerCase(),
      choice: "convert",
      amount: u,
      inboxTotal: a.coinsInbox || 0,
      bonusAvailable: !1,
      timestamp: Date.now()
    }), console.log(`\u{1F512} [SECURITY] ${n} converting ${u} TESTVBMS (remaining: ${w}, cooldown: 3min)`), { claimAmount: u };
  }, "handler")
}), oe = v({
  args: {
    address: i.string(),
    amount: i.number(),
    txHash: i.string()
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, amount: e, txHash: o }) => {
    if (await t.db.query("claimHistory").withIndex("by_txHash", (s) => s.eq("txHash", o)).first())
      throw console.log(`\u26A0\uFE0F [SECURITY] Duplicate txHash rejected: ${o} for ${n}`), new Error("[CLAIM_TX_RECORDED]");
    let a = await g(t, n);
    return await t.db.patch(a._id, {
      // coins is NOT touched here - already correctly set in convertTESTVBMSInternal
      pendingConversion: 0,
      // Clear pending
      pendingConversionTimestamp: void 0,
      pendingNonce: void 0,
      // 🔒 Clear nonce after successful claim
      claimedTokens: (a.claimedTokens || 0) + e,
      lastClaimTimestamp: Date.now()
    }), await t.db.insert("claimHistory", {
      playerAddress: n.toLowerCase(),
      amount: e,
      txHash: o,
      timestamp: Date.now(),
      type: "testvbms_conversion"
    }), await b(
      t,
      n,
      "claim",
      e,
      a.pendingConversion || e,
      0,
      "recordTESTVBMSConversion",
      o,
      { txHash: o, reason: "VBMS claimed on blockchain" }
    ), await T(t, {
      address: n,
      type: "convert",
      amount: e,
      source: "blockchain",
      description: `Converted ${e.toLocaleString()} TESTVBMS \u2192 VBMS`,
      balanceBefore: a.coins || 0,
      balanceAfter: 0,
      txHash: o
    }), console.log(`\u2705 ${n} converted ${e} TESTVBMS \u2192 VBMS (tx: ${o})`), {
      success: !0,
      newCoinsBalance: 0,
      newClaimedTotal: (a.claimedTokens || 0) + e
    };
  }, "handler")
}), te = A({
  args: {
    address: i.string()
  },
  handler: /* @__PURE__ */ d(async (t, { address: n }) => {
    let e = await t.runQuery(p.vbmsClaim.getRecoveryInfo, { address: n });
    if (e.pendingAmount === 0)
      throw new Error("[CLAIM_NO_PENDING]");
    let o = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (e.lastRecoveryDay === o && (e.dailyRecoveryCount || 0) >= 3)
      throw console.log(`\u{1F6AB} [SECURITY] Daily recovery limit reached for ${n}`), new Error("[CLAIM_DAILY_LIMIT]");
    let r = Date.now() - 30 * 1e3;
    if (e.pendingTimestamp > r) {
      let s = Math.ceil((e.pendingTimestamp - r) / 1e3);
      throw new Error(`[CLAIM_WAIT_RECOVER]${s}`);
    }
    if (e.pendingNonce && await t.runAction(p.vbmsClaim.checkNonceUsedOnChain, {
      nonce: e.pendingNonce
    }))
      throw console.error(`\u{1F6A8} [SECURITY] DOUBLE-SPEND BLOCKED! Address ${n} tried to recover after claiming on-chain. Nonce: ${e.pendingNonce}`), await t.runMutation(p.vbmsClaim.clearPendingWithoutRestore, { address: n }), new Error("[CLAIM_BLOCKED_ALREADY_CLAIMED]");
    let a = await t.runMutation(p.vbmsClaim.executeRecovery, {
      address: n,
      amount: e.pendingAmount,
      currentCoins: e.currentCoins,
      today: o,
      // 🔒 For daily recovery counter
      currentRecoveryCount: e.dailyRecoveryCount || 0
    });
    return console.log(`\u{1F504} ${n} recovered ${e.pendingAmount} TESTVBMS from failed conversion (on-chain verified)`), a;
  }, "handler")
}), ae = M({
  args: { address: i.string() },
  handler: /* @__PURE__ */ d(async (t, { address: n }) => {
    let e = await g(t, n);
    return {
      pendingAmount: e.pendingConversion || 0,
      pendingTimestamp: e.pendingConversionTimestamp || 0,
      pendingNonce: e.pendingNonce || null,
      currentCoins: e.coins || 0,
      // 🔒 Anti-exploit fields
      dailyRecoveryCount: e.dailyRecoveryCount || 0,
      lastRecoveryDay: e.lastRecoveryDay || null,
      lastConversionAttempt: e.lastConversionAttempt || 0
    };
  }, "handler")
}), re = A({
  args: { address: i.string() },
  handler: /* @__PURE__ */ d(async (t, { address: n }) => {
    let e = await t.runQuery(p.vbmsClaim.getRecoveryInfo, { address: n });
    if (e.pendingAmount === 0)
      return { amount: 0, timestamp: 0, canRecover: !1 };
    let o = Date.now() - 30 * 1e3, r = e.pendingTimestamp <= o;
    return {
      amount: e.pendingAmount,
      timestamp: e.pendingTimestamp,
      canRecover: r
    };
  }, "handler")
}), ie = y({
  args: {
    address: i.string(),
    amount: i.number(),
    currentCoins: i.number(),
    today: i.string(),
    // 🔒 For daily recovery tracking
    currentRecoveryCount: i.number()
    // 🔒 Current recovery count today
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, amount: e, currentCoins: o, today: r, currentRecoveryCount: a }) => {
    let s = await g(t, n), l = o + e;
    return await t.db.patch(s._id, {
      coins: l,
      pendingConversion: 0,
      pendingConversionTimestamp: void 0,
      pendingNonce: void 0,
      // 🔒 Track daily recovery count
      dailyRecoveryCount: a + 1,
      lastRecoveryDay: r
    }), await T(t, {
      address: n,
      type: "refund",
      amount: e,
      source: "conversion_recovery",
      description: `Recovered ${e.toLocaleString()} TESTVBMS from failed conversion`,
      balanceBefore: o,
      balanceAfter: l
    }), await b(
      t,
      n,
      "recover",
      e,
      0,
      l,
      "recoverFailedConversion",
      void 0,
      { reason: `Recovered failed TESTVBMS conversion (on-chain verified) [${a + 1}/3 today]` }
    ), {
      success: !0,
      recoveredAmount: e,
      newCoinsBalance: l
    };
  }, "handler")
}), se = y({
  args: { address: i.string() },
  handler: /* @__PURE__ */ d(async (t, { address: n }) => {
    let e = await g(t, n);
    await t.db.patch(e._id, {
      pendingConversion: 0,
      pendingConversionTimestamp: void 0,
      pendingNonce: void 0
    }), await b(
      t,
      n,
      "recover",
      // Using "recover" type - actual blocking logged in reason
      e.pendingConversion || 0,
      0,
      e.coins || 0,
      "clearPendingWithoutRestore",
      void 0,
      { reason: "\u{1F6A8} DOUBLE-SPEND BLOCKED - nonce already used on-chain, coins NOT restored" }
    );
  }, "handler")
}), ce = S({
  args: {
    address: i.string(),
    amount: i.number()
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, amount: e }) => {
    let o = await t.runQuery(p.vbmsClaim.getRecoveryInfo, { address: n });
    if (o.pendingNonce)
      try {
        if (await t.runAction(p.vbmsClaim.checkNonceUsedOnChain, {
          nonce: o.pendingNonce
        })) {
          console.error(`\u{1F6A8} [SECURITY] Blocked auto-restore for ${n} - nonce already used on-chain!`), await t.runMutation(p.vbmsClaim.clearPendingWithoutRestore, { address: n });
          return;
        }
      } catch {
        console.error(`\u{1F6A8} [SECURITY] On-chain check failed for ${n}, skipping auto-restore. User can try manual recovery.`);
        return;
      }
    let r = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (o.lastRecoveryDay === r && (o.dailyRecoveryCount || 0) >= 3) {
      console.error(`\u{1F6A8} [SECURITY] Daily recovery limit reached for ${n} - skipping auto-restore`);
      return;
    }
    await t.runMutation(p.vbmsClaim.executeAutoRestore, {
      address: n,
      amount: e,
      today: r,
      currentRecoveryCount: o.dailyRecoveryCount || 0
    }), console.log(`\u{1F504} [AUTO-RESTORE] ${n} - Restored ${e} coins (on-chain verified)`);
  }, "handler")
}), le = y({
  args: {
    address: i.string(),
    amount: i.number(),
    today: i.string(),
    currentRecoveryCount: i.number()
  },
  handler: /* @__PURE__ */ d(async (t, { address: n, amount: e, today: o, currentRecoveryCount: r }) => {
    let a = await g(t, n);
    await t.db.patch(a._id, {
      coins: (a.coins || 0) + e,
      pendingConversion: 0,
      pendingConversionTimestamp: void 0,
      pendingNonce: void 0,
      dailyRecoveryCount: r + 1,
      lastRecoveryDay: o
    }), await b(
      t,
      n,
      "recover",
      e,
      0,
      (a.coins || 0) + e,
      "restoreCoinsOnSignFailure",
      void 0,
      { reason: `Signature failed - coins restored (on-chain verified) [${r + 1}/3 today]` }
    );
  }, "handler")
}), me = h({
  handler: /* @__PURE__ */ d(async (t) => {
    let n = await t.db.query("claimAnalytics").order("desc").take(1e3), e = n.filter((m) => m.choice === "immediate").length, o = n.filter((m) => m.choice === "inbox").length, r = n.filter((m) => m.choice === "pve").length, a = n.filter((m) => m.choice === "pvp").length, s = n.filter((m) => m.choice === "convert").length, l = n.length, c = n.reduce((m, u) => m + u.amount, 0) / l || 0;
    return {
      totalClaims: l,
      immediateClaimRate: l > 0 ? e / l : 0,
      inboxRate: l > 0 ? o / l : 0,
      avgClaimAmount: c,
      immediate: e,
      inbox: o,
      pve: r,
      pvp: a,
      convert: s
    };
  }, "handler")
});
export {
  q as checkNonceUsedOnChain,
  J as claimInboxAsTESTVBMS,
  se as clearPendingWithoutRestore,
  ne as convertTESTVBMSInternal,
  ee as convertTESTVBMStoVBMS,
  le as executeAutoRestore,
  ie as executeRecovery,
  me as getClaimBehaviorAnalytics,
  z as getClaimHistory,
  K as getClaimRecommendation,
  G as getFullTransactionHistory,
  re as getPendingConversionInfo,
  j as getPlayerEconomy,
  ae as getRecoveryInfo,
  Y as prepareInboxClaim,
  W as prepareInboxClaimInternal,
  Q as recordInboxClaim,
  oe as recordTESTVBMSConversion,
  te as recoverFailedConversion,
  ce as restoreCoinsOnSignFailure,
  X as sendPveRewardToInbox,
  Z as sendPvpRewardToInbox,
  H as sendToInbox,
  F as signClaimMessage
};
//# sourceMappingURL=vbmsClaim.js.map
