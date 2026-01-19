import {
  a as u
} from "./3SBKGJDS.js";
import {
  h as d
} from "./34SVKERO.js";
import {
  a as o
} from "./5B5TEMMX.js";

// convex/auth.ts
function l(s, n, r) {
  try {
    if (!n.startsWith("0x") || n.length !== 132)
      return console.error("\u274C Invalid signature format"), !1;
    let e = s.toLowerCase();
    return !e.startsWith("0x") || e.length !== 42 ? (console.error("\u274C Invalid address format"), !1) : !r || r.length === 0 ? (console.error("\u274C Empty message"), !1) : !0;
  } catch (e) {
    return console.error("\u274C Signature validation error:", e), !1;
  }
}
o(l, "verifySignature");
function m(s) {
  try {
    let n = s.match(/at (\d+)/);
    if (!n)
      return console.error("\u274C No timestamp in message"), !1;
    let r = parseInt(n[1]);
    if (isNaN(r))
      return console.error("\u274C Invalid timestamp format (NaN)"), !1;
    let e = Date.now(), t = 300 * 1e3;
    return Math.abs(e - r) > t ? (console.error("\u274C Message expired (older than 5 minutes)"), !1) : !0;
  } catch (n) {
    return console.error("\u274C Timestamp verification error:", n), !1;
  }
}
o(m, "verifyTimestamp");
function g(s, n) {
  let r = s.toLowerCase();
  return n.toLowerCase().includes(r) ? !0 : (console.error("\u274C Address mismatch in message"), !1);
}
o(g, "verifyMessageAddress");
function y(s, n, r) {
  return g(s, r) ? m(r) ? l(s, n, r) ? { success: !0 } : { success: !1, error: "Invalid signature format" } : { success: !1, error: "Expired signature" } : { success: !1, error: "Address mismatch" };
}
o(y, "authenticateAction");
async function w(s, n, r, e) {
  let t = y(n, r, e);
  if (!t.success)
    return t;
  try {
    let i = await import("../cryptoActions.js"), a = await s.runAction(i.verifyEthereumSignature, {
      message: e,
      signature: r,
      expectedAddress: n
    });
    return a.success ? (console.log("\u2705 Backend signature verification passed"), { success: !0 }) : (console.error("\u274C Backend signature verification failed:", a.error), { success: !1, error: a.error });
  } catch (i) {
    return console.error("\u274C Backend verification error:", i), { success: !1, error: "Backend verification failed" };
  }
}
o(w, "authenticateActionWithBackend");
var x = u({
  args: { address: d.string() },
  handler: /* @__PURE__ */ o(async (s, { address: n }) => {
    let r = n.toLowerCase(), e = await s.db.query("nonces").withIndex("by_address", (t) => t.eq("address", r)).first();
    return e ? e.nonce : 0;
  }, "handler")
});
async function N(s, n) {
  let r = n.toLowerCase(), e = await s.db.query("nonces").withIndex("by_address", (t) => t.eq("address", r)).first();
  e ? await s.db.patch(e._id, {
    nonce: e.nonce + 1,
    lastUsed: Date.now()
  }) : await s.db.insert("nonces", {
    address: r,
    nonce: 1,
    lastUsed: Date.now()
  });
}
o(N, "incrementNonce");
async function b(s, n, r) {
  try {
    let e = r.match(/nonce:(\d+)/);
    if (!e)
      return console.error("\u274C No nonce in message"), !1;
    let t = parseInt(e[1]);
    if (isNaN(t))
      return console.error("\u274C Invalid nonce format (NaN)"), !1;
    let i = n.toLowerCase(), a = await s.db.query("nonces").withIndex("by_address", (f) => f.eq("address", i)).first(), c = a ? a.nonce : 0;
    return t !== c ? (console.error(
      `\u274C Nonce mismatch: expected ${c}, got ${t}`
    ), !1) : !0;
  } catch (e) {
    return console.error("\u274C Nonce verification error:", e), !1;
  }
}
o(b, "verifyNonce");

export {
  l as a,
  m as b,
  g as c,
  y as d,
  w as e,
  x as f,
  N as g,
  b as h
};
//# sourceMappingURL=KGOWE5FI.js.map
