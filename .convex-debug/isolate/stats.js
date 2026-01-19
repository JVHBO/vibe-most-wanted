import {
  b as s
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import "./_deps/34SVKERO.js";
import {
  a as n
} from "./_deps/5B5TEMMX.js";

// convex/stats.ts
var i = s({
  args: {},
  handler: /* @__PURE__ */ n(async (r) => (await r.db.query("profiles").take(200)).map((e) => ({
    username: e.username,
    address: e.address,
    coins: e.coins || 0,
    coinsInbox: e.inbox || 0,
    // Using inbox field now
    lifetimeEarned: e.lifetimeEarned || 0,
    lifetimeSpent: e.lifetimeSpent || 0
  })), "handler")
});
export {
  i as getAllProfiles
};
//# sourceMappingURL=stats.js.map
