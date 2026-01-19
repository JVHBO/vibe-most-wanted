import {
  d as i
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as o
} from "./_deps/34SVKERO.js";
import {
  a
} from "./_deps/5B5TEMMX.js";

// convex/emergencyRestore.ts
var E = i({
  args: {
    address: o.string(),
    amount: o.number()
  },
  handler: /* @__PURE__ */ a(async (s, { address: n, amount: r }) => {
    let e = await s.db.query("profiles").withIndex("by_address", (d) => d.eq("address", n.toLowerCase())).first();
    if (!e)
      throw new Error("Profile not found");
    let t = e.coins || 0;
    return await s.db.patch(e._id, {
      coins: r
    }), console.log(`\u2705 EMERGENCY RESTORE: ${n} TESTVBMS: ${t} \u2192 ${r}`), {
      oldBalance: t,
      newBalance: r,
      message: `Restored ${r} TESTVBMS`
    };
  }, "handler")
});
export {
  E as restoreTESTVBMS
};
//# sourceMappingURL=emergencyRestore.js.map
