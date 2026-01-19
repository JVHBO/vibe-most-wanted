import {
  a as s
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as e
} from "./_deps/34SVKERO.js";
import {
  a as r
} from "./_deps/5B5TEMMX.js";

// convex/txHistory.ts
var c = s({
  args: { address: e.string() },
  handler: /* @__PURE__ */ r(async (d, { address: a }) => {
    let t = a.toLowerCase();
    return await d.db.query("coinTransactions").withIndex("by_address", (o) => o.eq("address", t)).order("desc").take(500);
  }, "handler")
});
export {
  c as getByAddress
};
//# sourceMappingURL=txHistory.js.map
