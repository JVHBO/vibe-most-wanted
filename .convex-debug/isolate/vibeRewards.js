import {
  b as m
} from "./_deps/AWJMSRP7.js";
import {
  a as u,
  c as l,
  d as c,
  e as g
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as i
} from "./_deps/34SVKERO.js";
import {
  a as d
} from "./_deps/5B5TEMMX.js";

// convex/vibeRewards.ts
var b = 100, h = l({
  args: {
    cardFid: i.number(),
    voterFid: i.number()
  },
  handler: /* @__PURE__ */ d(async (s, { cardFid: r, voterFid: a }) => {
    let e = await s.db.query("vibeRewards").withIndex("by_fid", (n) => n.eq("fid", r)).first();
    return e ? await s.db.patch(e._id, {
      pendingVbms: e.pendingVbms + b,
      totalVotes: e.totalVotes + 1,
      lastVoteAt: Date.now()
    }) : await s.db.insert("vibeRewards", {
      fid: r,
      pendingVbms: b,
      claimedVbms: 0,
      totalVotes: 1,
      lastVoteAt: Date.now(),
      lastClaimAt: void 0
    }), { success: !0, vbmsAdded: b };
  }, "handler")
}), A = u({
  args: { fid: i.number() },
  handler: /* @__PURE__ */ d(async (s, { fid: r }) => await s.db.query("vibeRewards").withIndex("by_fid", (e) => e.eq("fid", r)).first() || {
    fid: r,
    pendingVbms: 0,
    claimedVbms: 0,
    totalVotes: 0
  }, "handler")
}), v = l({
  args: {
    fid: i.number(),
    claimerAddress: i.string()
  },
  handler: /* @__PURE__ */ d(async (s, { fid: r, claimerAddress: a }) => {
    let e = await s.db.query("vibeRewards").withIndex("by_fid", (o) => o.eq("fid", r)).first();
    if (!e || e.pendingVbms === 0)
      return { success: !1, error: "No pending rewards" };
    let n = e.pendingVbms;
    return await s.db.patch(e._id, {
      pendingVbms: 0,
      claimedVbms: e.claimedVbms + n,
      lastClaimAt: Date.now()
    }), {
      success: !0,
      claimAmount: n,
      claimerAddress: a,
      fid: r
    };
  }, "handler")
}), q = u({
  args: {},
  handler: /* @__PURE__ */ d(async (s) => {
    let r = await s.db.query("vibeRewards").collect(), a = r.reduce((o, t) => o + t.claimedVbms + t.pendingVbms, 0), e = r.reduce((o, t) => o + t.pendingVbms, 0), n = r.reduce((o, t) => o + t.claimedVbms, 0);
    return { total: a, pending: e, claimed: n };
  }, "handler")
});
function V() {
  let s = crypto.randomUUID().replace(/-/g, ""), r = crypto.randomUUID().replace(/-/g, "");
  return `0x${s}${r}`.substring(0, 66);
}
d(V, "generateNonce");
var x = g({
  args: {
    fid: i.number(),
    claimerAddress: i.string()
  },
  handler: /* @__PURE__ */ d(async (s, { fid: r, claimerAddress: a }) => {
    let e = await s.runMutation(m.vibeRewards.prepareClaimInternal, {
      fid: r,
      claimerAddress: a
    });
    if (!e.success)
      return { success: !1, error: e.error };
    let n = V(), o = "https://vibemostwanted.xyz";
    console.log(`[VibeRewards] Signing claim: ${a}, amount: ${e.claimAmount}, nonce: ${n}`);
    try {
      let t = await fetch(`${o}/api/vbms/sign-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: a,
          amount: e.claimAmount,
          nonce: n
        })
      });
      if (!t.ok) {
        let p = await t.text();
        return console.error(`[VibeRewards] Sign API error: ${p}`), await s.runMutation(m.vibeRewards.restoreRewardsOnFailure, {
          fid: r,
          amount: e.claimAmount
        }), { success: !1, error: `Sign failed: ${t.status}` };
      }
      let w = await t.json();
      return console.log(`[VibeRewards] Got signature: ${w.signature?.slice(0, 20)}...`), {
        success: !0,
        amount: e.claimAmount,
        nonce: n,
        signature: w.signature
      };
    } catch (t) {
      return console.error("[VibeRewards] Error:", t), await s.runMutation(m.vibeRewards.restoreRewardsOnFailure, {
        fid: r,
        amount: e.claimAmount
      }), { success: !1, error: t.message };
    }
  }, "handler")
}), I = c({
  args: {
    fid: i.number(),
    claimerAddress: i.string()
  },
  handler: /* @__PURE__ */ d(async (s, { fid: r, claimerAddress: a }) => {
    let e = await s.db.query("vibeRewards").withIndex("by_fid", (o) => o.eq("fid", r)).first();
    if (!e || e.pendingVbms === 0)
      return { success: !1, error: "No pending rewards", claimAmount: 0 };
    let n = e.pendingVbms;
    return await s.db.patch(e._id, {
      pendingVbms: 0,
      claimedVbms: e.claimedVbms + n,
      lastClaimAt: Date.now()
    }), { success: !0, claimAmount: n };
  }, "handler")
}), _ = c({
  args: {
    fid: i.number(),
    amount: i.number()
  },
  handler: /* @__PURE__ */ d(async (s, { fid: r, amount: a }) => {
    let e = await s.db.query("vibeRewards").withIndex("by_fid", (n) => n.eq("fid", r)).first();
    e && (await s.db.patch(e._id, {
      pendingVbms: e.pendingVbms + a,
      claimedVbms: Math.max(0, e.claimedVbms - a)
    }), console.log(`[VibeRewards] Restored ${a} VBMS to FID ${r}`));
  }, "handler")
}), $ = c({
  args: {
    fid: i.number(),
    amount: i.number()
  },
  handler: /* @__PURE__ */ d(async (s, { fid: r, amount: a }) => {
    let e = await s.db.query("vibeRewards").withIndex("by_fid", (n) => n.eq("fid", r)).first();
    return e ? (await s.db.patch(e._id, {
      pendingVbms: e.pendingVbms + a,
      claimedVbms: Math.max(0, e.claimedVbms - a)
    }), console.log(`[VibeRewards] TX cancelled - Restored ${a} VBMS to FID ${r}`), { success: !0, restoredAmount: a }) : { success: !1, error: "No rewards record found" };
  }, "handler")
});
export {
  v as claimRewards,
  A as getRewards,
  q as getTotalDistributed,
  I as prepareClaimInternal,
  x as prepareVibeRewardsClaim,
  h as recordVote,
  $ as restoreClaimOnTxFailure,
  _ as restoreRewardsOnFailure
};
//# sourceMappingURL=vibeRewards.js.map
