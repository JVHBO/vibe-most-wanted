import {
  b as m
} from "./_deps/AWJMSRP7.js";
import {
  b as p
} from "./_deps/XHHFSPHN.js";
import {
  a as w,
  c as f,
  d as l,
  e as y
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as t
} from "./_deps/34SVKERO.js";
import {
  a as c
} from "./_deps/5B5TEMMX.js";

// convex/pvp.ts
var b = "0x062b914668f3fd35c3ae02e699cb82e1cf4be18b", x = y({
  args: {
    address: t.string(),
    amount: t.number(),
    txHash: t.string()
  },
  handler: /* @__PURE__ */ c(async (e, o) => {
    let { address: n, amount: r, txHash: s } = o, i = n.toLowerCase();
    if (!p(s))
      throw new Error("Invalid transaction hash format");
    let a = await e.runAction(m.blockchainVerify.verifyTransaction, {
      txHash: s,
      expectedFrom: i,
      expectedTo: b,
      expectedAmountWei: (BigInt(r) * BigInt(10 ** 18)).toString(),
      isERC20: !0
      // VBMS is an ERC20 token
    });
    if (!a.isValid)
      throw console.error(`[PvP] TX verification failed for ${s}: ${a.error}`), new Error(`Transaction verification failed: ${a.error}`);
    return await e.runMutation(m.pvp.recordEntryFeeInternal, {
      address: i,
      amount: r,
      txHash: s
    }), { success: !0 };
  }, "handler")
}), P = l({
  args: {
    address: t.string(),
    amount: t.number(),
    txHash: t.string()
  },
  handler: /* @__PURE__ */ c(async (e, o) => {
    let { address: n, amount: r, txHash: s } = o;
    if (await e.db.query("pvpEntryFees").withIndex("by_txHash", (a) => a.eq("txHash", s)).first())
      throw new Error("Transaction already processed");
    return await e.db.insert("pvpEntryFees", {
      address: n,
      amount: r,
      txHash: s,
      timestamp: Date.now(),
      used: !1,
      verified: !0
      // Mark as blockchain-verified
    }), console.log(`\u2694\uFE0F PvP entry fee recorded (VERIFIED): ${r} VBMS from ${n}`), {
      success: !0
    };
  }, "handler")
}), A = f({
  args: {
    address: t.string()
  },
  handler: /* @__PURE__ */ c(async (e, o) => {
    let n = o.address.toLowerCase(), r = await e.db.query("pvpEntryFees").withIndex(
      "by_address_used",
      (s) => s.eq("address", n).eq("used", !1)
    ).order("desc").first();
    if (!r)
      throw new Error("No valid entry fee found. Please pay entry fee first.");
    return await e.db.patch(r._id, {
      used: !0,
      usedAt: Date.now()
    }), console.log(`\u2705 Entry fee used for ${n}: ${r.amount} VBMS`), {
      success: !0,
      amount: r.amount
    };
  }, "handler")
}), F = w({
  args: {
    address: t.string()
  },
  handler: /* @__PURE__ */ c(async (e, o) => {
    let n = o.address.toLowerCase(), r = await e.db.query("pvpEntryFees").withIndex(
      "by_address_used",
      (s) => s.eq("address", n).eq("used", !1)
    ).order("desc").first();
    return {
      hasEntryFee: !!r,
      amount: r?.amount || 0
    };
  }, "handler")
}), _ = l({
  args: {
    address: t.string(),
    rewardAmount: t.number(),
    roomCode: t.optional(t.string())
  },
  handler: /* @__PURE__ */ c(async (e, o) => {
    let { address: n, rewardAmount: r, roomCode: s } = o, i = n.toLowerCase();
    return await e.db.insert("vbmsInbox", {
      address: i,
      amount: r,
      source: "pvp_win",
      metadata: {
        roomCode: s
      },
      claimedAt: void 0,
      timestamp: Date.now()
    }), console.log(`\u{1F3C6} PvP reward sent to inbox: ${r} TESTVBMS for ${n}`), {
      success: !0,
      rewardAmount: r
    };
  }, "handler")
}), I = f({
  args: {
    address: t.string(),
    roomCode: t.optional(t.string())
  },
  handler: /* @__PURE__ */ c(async (e, o) => {
    let { address: n, roomCode: r } = o, s = n.toLowerCase(), i = await e.db.query("pvpEntryFees").withIndex("by_address", (d) => d.eq("address", s)).filter((d) => d.eq(d.field("used"), !1)).first();
    if (!i)
      return {
        success: !1,
        error: "No valid entry fee found"
      };
    await e.db.patch(i._id, {
      used: !0,
      usedAt: Date.now()
    });
    let a = 40, u = await e.db.query("profiles").withIndex("by_address", (d) => d.eq("address", s)).first();
    if (u) {
      let d = u.coins || 0;
      await e.db.patch(u._id, {
        coins: d + a,
        lifetimeEarned: (u.lifetimeEarned || 0) + a
      }), await e.db.insert("coinTransactions", {
        address: s,
        amount: a,
        type: "earn",
        source: "pvp_win",
        description: "PvP win reward",
        timestamp: Date.now(),
        balanceBefore: d,
        balanceAfter: d + a
      });
    }
    return console.log(`\u{1F3C6} PvP reward claimed: ${a} TESTVBMS for ${s}`), {
      success: !0,
      rewardAmount: a
    };
  }, "handler")
});
export {
  F as checkEntryFee,
  I as claimPvPWinReward,
  x as recordEntryFee,
  P as recordEntryFeeInternal,
  _ as sendPvPRewardToInbox,
  A as useEntryFee
};
//# sourceMappingURL=pvp.js.map
