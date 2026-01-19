import {
  d as i
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import "./_deps/34SVKERO.js";
import {
  a as r
} from "./_deps/5B5TEMMX.js";

// convex/shopAnnouncement.ts
var l = i({
  args: {},
  handler: /* @__PURE__ */ r(async (s) => {
    let c = await s.db.query("profiles").take(100), t = 0, a = 0;
    for (let n of c) {
      let o = n.coins || 0, e = 100;
      await s.db.patch(n._id, {
        coins: o + e,
        lifetimeEarned: (n.lifetimeEarned || 0) + e
      }), await s.db.insert("coinTransactions", {
        address: n.address.toLowerCase(),
        amount: e,
        type: "bonus",
        source: "shop_announcement",
        description: "Shop announcement bonus",
        timestamp: Date.now(),
        balanceBefore: o,
        balanceAfter: o + e
      }), console.log(`\u{1F4B0} Shop bonus added to balance: ${e} TESTVBMS for ${n.address}. Balance: ${o} \u2192 ${o + e}`), t++, a += e;
    }
    return {
      success: !0,
      notificationsSent: t,
      totalCoinsDistributed: a,
      message: "Shop announcement sent! All users received 100 coins bonus."
    };
  }, "handler")
});
export {
  l as sendShopAnnouncement
};
//# sourceMappingURL=shopAnnouncement.js.map
