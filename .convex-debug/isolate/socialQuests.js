import {
  a as m
} from "./_deps/LKY7FFHL.js";
import {
  h as _
} from "./_deps/QS6BMXBV.js";
import {
  a as b,
  c as g,
  d as h
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as i
} from "./_deps/34SVKERO.js";
import {
  a as c
} from "./_deps/5B5TEMMX.js";

// convex/socialQuests.ts
var y = {
  // SDK Actions (notifications & miniapp - 500 VBMS each)
  enable_notifications: 500,
  add_miniapp: 500,
  // Channels - 200 each
  join_vibe_most_wanted: 200,
  join_fidmfers: 200,
  // Follows - 100 each (only active collections)
  follow_jvhbo: 100,
  follow_betobutter: 100,
  follow_jayabs: 100,
  follow_smolemaru: 100,
  follow_denkurhq: 100,
  follow_zazza: 100,
  follow_bradenwolf: 100,
  follow_viberotbangers_creator: 100
};
async function I(r, n) {
  let e = await r.db.query("profiles").withIndex("by_address", (s) => s.eq("address", n)).first();
  return e ? e.hasVibeBadge ? { has2x: !0, reason: "VIBE Badge" } : e.ownedTokenIds?.some((s) => s.toLowerCase().startsWith("vibefid:")) ? { has2x: !0, reason: "VibeFID" } : { has2x: !1, reason: "" } : { has2x: !1, reason: "" };
}
c(I, "has2xBonus");
var $ = b({
  args: { address: i.string() },
  handler: /* @__PURE__ */ c(async (r, { address: n }) => {
    let e = m(n), s = await r.db.query("socialQuestProgress").withIndex("by_player", (t) => t.eq("playerAddress", e)).collect(), o = {};
    for (let t of s)
      o[t.questId] = {
        completed: t.completed,
        claimed: t.claimed,
        claimedAt: t.claimedAt
      };
    return o;
  }, "handler")
}), B = h({
  args: {
    address: i.string(),
    questId: i.string()
  },
  handler: /* @__PURE__ */ c(async (r, { address: n, questId: e }) => {
    let s = m(n);
    if (!y[e])
      throw new Error("Invalid quest ID");
    let o = await r.db.query("socialQuestProgress").withIndex(
      "by_player_quest",
      (t) => t.eq("playerAddress", s).eq("questId", e)
    ).first();
    return o ? (o.completed || await r.db.patch(o._id, {
      completed: !0,
      completedAt: Date.now()
    }), { success: !0, alreadyCompleted: o.completed }) : (await r.db.insert("socialQuestProgress", {
      playerAddress: s,
      questId: e,
      completed: !0,
      completedAt: Date.now(),
      claimed: !1
    }), { success: !0, alreadyCompleted: !1 });
  }, "handler")
}), C = g({
  args: {
    address: i.string(),
    questId: i.string()
  },
  handler: /* @__PURE__ */ c(async (r, { address: n, questId: e }) => {
    let s = m(n), o = y[e];
    if (!o)
      throw new Error("Invalid quest ID");
    let t = await r.db.query("socialQuestProgress").withIndex(
      "by_player_quest",
      (p) => p.eq("playerAddress", s).eq("questId", e)
    ).first();
    if (!t)
      throw new Error("Quest not completed yet");
    if (!t.completed)
      throw new Error("Quest not completed yet");
    if (t.claimed)
      throw new Error("Reward already claimed");
    let a = await r.db.query("profiles").withIndex("by_address", (p) => p.eq("address", s)).first();
    if (!a)
      throw new Error("Profile not found");
    let d = await I(r, s), q = d.has2x ? 2 : 1, l = o * q, w = d.has2x ? ` (2x ${d.reason})` : "", f = a.coins || 0, u = f + l, A = (a.lifetimeEarned || 0) + l;
    return await r.db.patch(a._id, {
      coins: u,
      lifetimeEarned: A,
      lastUpdated: Date.now()
    }), await r.db.insert("coinTransactions", {
      address: s,
      amount: l,
      type: "earn",
      source: "social_quest",
      description: `Social quest: ${e}${w}`,
      timestamp: Date.now(),
      balanceBefore: f,
      balanceAfter: u
    }), await _(
      r,
      s,
      "earn",
      l,
      f,
      u,
      "social_quest",
      e,
      { reason: `Social quest completed: ${e}${w}` }
    ), console.log(`\u{1F4B0} Social quest reward: ${l} coins for ${s}${w}. Balance: ${f} \u2192 ${u}`), await r.db.patch(t._id, {
      claimed: !0,
      claimedAt: Date.now()
    }), {
      success: !0,
      reward: l,
      newBalance: u,
      questId: e
    };
  }, "handler")
}), R = b({
  args: { address: i.string() },
  handler: /* @__PURE__ */ c(async (r, { address: n }) => {
    let e = m(n), s = await r.db.query("socialQuestProgress").withIndex("by_player", (a) => a.eq("playerAddress", e)).filter(
      (a) => a.and(
        a.eq(a.field("completed"), !0),
        a.eq(a.field("claimed"), !1)
      )
    ).collect(), o = 0, t = [];
    for (let a of s) {
      let d = y[a.questId];
      d && (o += d, t.push(a.questId));
    }
    return {
      totalClaimable: o,
      claimableQuests: t,
      count: t.length
    };
  }, "handler")
});
export {
  C as claimSocialQuestReward,
  R as getClaimableSocialRewards,
  $ as getSocialQuestProgress,
  B as markQuestCompleted
};
//# sourceMappingURL=socialQuests.js.map
