import {
  c as d
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as a
} from "./_deps/34SVKERO.js";
import {
  a as t
} from "./_deps/5B5TEMMX.js";

// convex/testHelpers.ts
var f = d({
  args: { fid: a.number() },
  handler: /* @__PURE__ */ t(async (r, { fid: i }) => {
    let e = await r.db.query("farcasterCards").withIndex("by_fid", (s) => s.eq("fid", i)).first();
    return e ? (await r.db.patch(e._id, {
      rarity: "Epic",
      power: 140,
      // Epic base power with Standard foil and Mint wear
      previousRarity: void 0,
      upgradedAt: void 0
    }), { success: !0, message: "Card reset to Epic for testing" }) : { error: "Card not found" };
  }, "handler")
});
export {
  f as resetCardForTest
};
//# sourceMappingURL=testHelpers.js.map
