import {
  a as d
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as a
} from "./_deps/34SVKERO.js";
import {
  a as r
} from "./_deps/5B5TEMMX.js";

// convex/cardVotes.ts
var u = d({
  args: { cardFid: a.number() },
  handler: /* @__PURE__ */ r(async (n, t) => (await n.db.query("cardVotes").withIndex(
    "by_card_unread",
    (e) => e.eq("cardFid", t.cardFid).eq("isRead", !1)
  ).filter((e) => e.neq(e.field("message"), void 0)).take(100)).length, "handler")
});
export {
  u as getUnreadMessageCount
};
//# sourceMappingURL=cardVotes.js.map
