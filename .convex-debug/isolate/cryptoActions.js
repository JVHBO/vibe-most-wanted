import {
  e as n
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as o
} from "./_deps/34SVKERO.js";
import {
  a as c
} from "./_deps/5B5TEMMX.js";

// convex/cryptoActions.ts
var f = n({
  args: {
    message: o.string(),
    signature: o.string(),
    expectedAddress: o.string()
  },
  handler: /* @__PURE__ */ c(async (d, { message: t, signature: a, expectedAddress: i }) => {
    try {
      let { verifyMessage: s } = await import("./_deps/GNMXU3CQ.js");
      if (!a.startsWith("0x") || a.length !== 132)
        return console.error("\u274C Invalid signature format"), {
          success: !1,
          error: "Invalid signature format"
        };
      let e = i.toLowerCase();
      if (!e.startsWith("0x") || e.length !== 42)
        return console.error("\u274C Invalid address format"), {
          success: !1,
          error: "Invalid address format"
        };
      if (!t || t.length === 0)
        return console.error("\u274C Empty message"), {
          success: !1,
          error: "Empty message"
        };
      let r = s(t, a);
      return console.log("\u{1F510} Signature verification:", {
        expected: e,
        recovered: r.toLowerCase(),
        match: r.toLowerCase() === e
      }), r.toLowerCase() !== e ? (console.error("\u274C Address mismatch"), {
        success: !1,
        error: "Signature does not match expected address",
        recoveredAddress: r.toLowerCase()
      }) : (console.log("\u2705 Signature verified successfully"), {
        success: !0,
        recoveredAddress: r.toLowerCase()
      });
    } catch (s) {
      return console.error("\u274C Signature verification error:", s), {
        success: !1,
        error: s.message || "Failed to verify signature"
      };
    }
  }, "handler")
});
export {
  f as verifyEthereumSignature
};
//# sourceMappingURL=cryptoActions.js.map
