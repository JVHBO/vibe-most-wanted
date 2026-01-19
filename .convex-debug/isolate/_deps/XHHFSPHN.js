import {
  f as h
} from "./3SBKGJDS.js";
import {
  h as c
} from "./34SVKERO.js";
import {
  a as p
} from "./5B5TEMMX.js";

// convex/blockchainVerify.ts
var y = {
  VBMSToken: "0xb03439567cd22f278b21e1ffcdfb8e1696763827",
  VBMSPoolTroll: "0x062b914668f3fd35c3ae02e699cb82e1cf4be18b"
}, A = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", B = h({
  args: {
    txHash: c.string(),
    expectedFrom: c.string(),
    expectedTo: c.string(),
    expectedAmountWei: c.string(),
    // BigInt as string
    isERC20: c.optional(c.boolean())
  },
  handler: /* @__PURE__ */ p(async (n, m) => {
    let { txHash: l, expectedFrom: u, expectedTo: d, expectedAmountWei: i, isERC20: T } = m, a = process.env.BASESCAN_API_KEY;
    if (!a) {
      return console.error("[BlockchainVerify] BASESCAN_API_KEY not configured"), { isValid: !1, error: "Blockchain verification not configured" };
      return console.warn("[BlockchainVerify] Skipping verification in development"), { isValid: !0 };
    }
    try {
      let s = `https://api.basescan.org/api?module=proxy&action=eth_getTransactionByHash&txhash=${l}&apikey=${a}`, g = await (await fetch(s)).json();
      if (!g.result || g.result === null)
        return { isValid: !1, error: "Transaction not found" };
      let t = g.result;
      if (!t.blockNumber)
        return { isValid: !1, error: "Transaction not confirmed yet" };
      if (T)
        return await b(l, u, d, i, a);
      let r = t.from?.toLowerCase(), o = t.to?.toLowerCase(), e = BigInt(t.value || "0"), f = BigInt(i);
      return r !== u.toLowerCase() ? {
        isValid: !1,
        error: `From address mismatch: expected ${u}, got ${r}`,
        actualFrom: r,
        actualTo: o,
        actualAmount: e.toString()
      } : o !== d.toLowerCase() ? {
        isValid: !1,
        error: `To address mismatch: expected ${d}, got ${o}`,
        actualFrom: r,
        actualTo: o,
        actualAmount: e.toString()
      } : e < f ? {
        isValid: !1,
        error: `Amount mismatch: expected ${f}, got ${e}`,
        actualFrom: r,
        actualTo: o,
        actualAmount: e.toString()
      } : (console.log(`[BlockchainVerify] \u2705 TX ${l} verified: ${r} \u2192 ${o}, ${e} wei`), {
        isValid: !0,
        actualFrom: r,
        actualTo: o,
        actualAmount: e.toString()
      });
    } catch (s) {
      return console.error(`[BlockchainVerify] Error verifying TX ${l}:`, s), { isValid: !1, error: s.message };
    }
  }, "handler")
});
async function b(n, m, l, u, d) {
  try {
    let i = `https://api.basescan.org/api?module=proxy&action=eth_getTransactionReceipt&txhash=${n}&apikey=${d}`, a = await (await fetch(i)).json();
    if (!a.result || a.result === null)
      return { isValid: !1, error: "Transaction receipt not found" };
    let s = a.result;
    if (s.status !== "0x1")
      return { isValid: !1, error: "Transaction failed" };
    let V = s.logs || [], g = BigInt(u);
    for (let t of V) {
      if (t.address?.toLowerCase() !== y.VBMSToken.toLowerCase() || t.topics?.[0] !== A)
        continue;
      let r = t.topics?.[1], o = t.topics?.[2];
      if (!r || !o) continue;
      let e = "0x" + r.slice(26).toLowerCase(), f = "0x" + o.slice(26).toLowerCase(), x = BigInt(t.data);
      if (e === m.toLowerCase() && f === l.toLowerCase() && !(x < g))
        return console.log(`[BlockchainVerify] \u2705 ERC20 TX ${n} verified: ${e} \u2192 ${f}, ${x} VBMS`), {
          isValid: !0,
          actualFrom: e,
          actualTo: f,
          actualAmount: x.toString()
        };
    }
    return {
      isValid: !1,
      error: "No matching VBMS transfer found in transaction logs"
    };
  } catch (i) {
    return console.error(`[BlockchainVerify] Error verifying ERC20 TX ${n}:`, i), { isValid: !1, error: i.message };
  }
}
p(b, "verifyERC20Transfer");
function w(n) {
  return /^0x[a-fA-F0-9]{64}$/.test(n);
}
p(w, "isValidTxHash");
function R(n) {
  return n === "0x0000000000000000000000000000000000000000000000000000000000000000";
}
p(R, "isFreeOperationHash");

export {
  B as a,
  w as b,
  R as c
};
//# sourceMappingURL=XHHFSPHN.js.map
