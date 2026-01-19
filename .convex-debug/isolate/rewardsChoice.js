import {
  Fc as w
} from "./_deps/OXIBDITK.js";
import {
  c as g
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as r
} from "./_deps/34SVKERO.js";
import {
  a as c
} from "./_deps/5B5TEMMX.js";

// convex/rewardsChoice.ts
function m() {
  let s = crypto.randomUUID().replace(/-/g, ""), o = crypto.randomUUID().replace(/-/g, "");
  return `0x${s}${o}`.substring(0, 66);
}
c(m, "generateNonce");
async function p(s, o, e) {
  let a = process.env.VBMS_SIGNER_PRIVATE_KEY;
  if (!a)
    throw new Error("VBMS_SIGNER_PRIVATE_KEY not configured in environment variables");
  let t = new w.Wallet(a), n = w.parseEther(o.toString()), i = w.solidityPackedKeccak256(
    ["address", "uint256", "bytes32"],
    [s, n, e]
  ), l = await t.signMessage(w.getBytes(i));
  return console.log(`[Rewards Signature] Address: ${s}, Amount: ${o} VBMS (${n} wei), Nonce: ${e}`), console.log(`[Rewards Signature] Message Hash: ${i}`), console.log(`[Rewards Signature] Signature: ${l}`), console.log(`[Rewards Signature] Signer Address: ${t.address}`), l;
}
c(p, "signClaimMessage");
var E = g({
  args: {
    address: r.string(),
    amount: r.number(),
    choice: r.union(r.literal("claim_now"), r.literal("claim_later")),
    source: r.union(
      r.literal("pve"),
      r.literal("pvp"),
      r.literal("attack"),
      r.literal("defense"),
      r.literal("leaderboard")
    )
  },
  handler: /* @__PURE__ */ c(async (s, { address: o, amount: e, choice: a, source: t }) => {
    console.log("[processRewardChoice] Called with:", { address: o, amount: e, choice: a, source: t });
    let n = await s.db.query("profiles").withIndex("by_address", (i) => i.eq("address", o.toLowerCase())).first();
    if (!n)
      throw console.error("[processRewardChoice] Profile not found for address:", o), new Error("Profile not found");
    if (console.log("[processRewardChoice] Profile found:", {
      coins: n.coins,
      inbox: n.coinsInbox
    }), a === "claim_now") {
      let i = n.coins || 0;
      if (console.log("[processRewardChoice] Checking balance:", { currentCoins: i, amount: e }), i < e) {
        let d = `Saldo insuficiente. Voc\xEA tem ${i} coins, precisa de ${e}`;
        throw console.error("[processRewardChoice]", d), new Error(d);
      }
      let l = i - e;
      console.log("[processRewardChoice] Generating signature...");
      let u = m(), h;
      try {
        h = await p(o, e, u), console.log("[processRewardChoice] Signature generated successfully");
      } catch (d) {
        throw console.error("[processRewardChoice] Signature generation failed:", d), new Error(`Failed to generate signature: ${d.message}`);
      }
      return await s.db.patch(n._id, {
        coins: l,
        lastUpdated: Date.now()
      }), await s.db.insert("claimAnalytics", {
        playerAddress: o.toLowerCase(),
        choice: "immediate",
        amount: e,
        inboxTotal: n.coinsInbox || 0,
        bonusAvailable: !1,
        timestamp: Date.now()
      }), {
        success: !0,
        choice: "claim_now",
        amount: e,
        nonce: u,
        signature: h,
        newCoinsBalance: l,
        message: `\u{1F4B3} ${e} coins convertidos para VBMS! Assine a transa\xE7\xE3o.`
      };
    } else
      return {
        success: !0,
        choice: "claim_later",
        amount: e,
        coinsBalance: n.coins || 0,
        message: `\u{1F4E5} ${e} coins guardados! Converta depois quando quiser.`
      };
  }, "handler")
}), b = g({
  args: {
    address: r.string(),
    matchId: r.id("matches")
  },
  handler: /* @__PURE__ */ c(async (s, { address: o, matchId: e }) => {
    let a = await s.db.get(e);
    if (!a)
      throw new Error("Match not found");
    if (a.playerAddress.toLowerCase() !== o.toLowerCase())
      throw new Error("Unauthorized: Not your match");
    if (a.rewardsClaimed)
      throw new Error("Rewards already claimed");
    let t = a.coinsEarned || 0;
    return {
      matchId: e,
      coinsEarned: t,
      matchType: a.type,
      result: a.result,
      canClaim: t > 0
    };
  }, "handler")
}), R = g({
  args: {
    matchId: r.id("matches"),
    claimType: r.union(r.literal("immediate"), r.literal("inbox"))
  },
  handler: /* @__PURE__ */ c(async (s, { matchId: o, claimType: e }) => {
    let a = await s.db.get(o);
    if (!a)
      throw new Error("Match not found");
    if (a.rewardsClaimed)
      throw new Error("Match already marked as claimed");
    return await s.db.patch(o, {
      rewardsClaimed: !0,
      claimedAt: Date.now(),
      claimType: e
    }), {
      success: !0,
      matchId: o,
      claimType: e
    };
  }, "handler")
});
export {
  b as getPendingReward,
  R as markMatchAsClaimed,
  E as processRewardChoice
};
//# sourceMappingURL=rewardsChoice.js.map
