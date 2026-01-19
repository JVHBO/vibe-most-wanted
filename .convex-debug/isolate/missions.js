import {
  b as A
} from "./_deps/5GK4PSQG.js";
import {
  a as I
} from "./_deps/HHLKWD3J.js";
import {
  h
} from "./_deps/QS6BMXBV.js";
import {
  a as _,
  c as m
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as i
} from "./_deps/34SVKERO.js";
import {
  a as p
} from "./_deps/5B5TEMMX.js";

// convex/missions.ts
var b = {
  daily_login: { type: "coins", amount: 100 },
  first_pve_win: { type: "coins", amount: 50 },
  first_pvp_match: { type: "coins", amount: 100 },
  play_3_games: { type: "coins", amount: 100 },
  win_5_games: { type: "coins", amount: 200 },
  streak_3: { type: "coins", amount: 150 },
  streak_5: { type: "coins", amount: 300 },
  streak_10: { type: "coins", amount: 750 },
  vibefid_minted: { type: "coins", amount: 5e3 },
  welcome_gift: { type: "coins", amount: 500 },
  claim_vibe_badge: { type: "badge", amount: 0 }
  // VIBE badge - +20% bonus coins in Wanted Cast
}, B = _({
  args: { playerAddress: i.string() },
  handler: /* @__PURE__ */ p(async (s, { playerAddress: d }) => {
    let a = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], t = d.toLowerCase();
    return await s.db.query("personalMissions").withIndex("by_player_date", (e) => e.eq("playerAddress", t)).filter(
      (e) => e.or(
        e.eq(e.field("date"), a),
        e.eq(e.field("date"), "once")
      )
    ).collect();
  }, "handler")
}), S = m({
  args: { playerAddress: i.string() },
  handler: /* @__PURE__ */ p(async (s, { playerAddress: d }) => {
    let a = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], t = d.toLowerCase();
    return await s.db.query("personalMissions").withIndex("by_player_date", (e) => e.eq("playerAddress", t)).filter(
      (e) => e.and(
        e.eq(e.field("date"), a),
        e.eq(e.field("missionType"), "daily_login")
      )
    ).first() ? { success: !0, alreadyExists: !0 } : (await s.db.insert("personalMissions", {
      playerAddress: t,
      date: a,
      missionType: "daily_login",
      completed: !0,
      claimed: !1,
      reward: b.daily_login.amount,
      completedAt: Date.now()
    }), { success: !0, created: !0 });
  }, "handler")
}), $ = m({
  args: { playerAddress: i.string() },
  handler: /* @__PURE__ */ p(async (s, { playerAddress: d }) => {
    let a = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], t = d.toLowerCase();
    await s.db.query("personalMissions").withIndex("by_player_date", (e) => e.eq("playerAddress", t)).filter(
      (e) => e.and(
        e.eq(e.field("date"), a),
        e.eq(e.field("missionType"), "first_pve_win")
      )
    ).first() || await s.db.insert("personalMissions", {
      playerAddress: t,
      date: a,
      missionType: "first_pve_win",
      completed: !0,
      claimed: !1,
      reward: b.first_pve_win.amount,
      completedAt: Date.now()
    });
  }, "handler")
}), x = m({
  args: { playerAddress: i.string() },
  handler: /* @__PURE__ */ p(async (s, { playerAddress: d }) => {
    let a = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], t = d.toLowerCase();
    await s.db.query("personalMissions").withIndex("by_player_date", (e) => e.eq("playerAddress", t)).filter(
      (e) => e.and(
        e.eq(e.field("date"), a),
        e.eq(e.field("missionType"), "first_pvp_match")
      )
    ).first() || await s.db.insert("personalMissions", {
      playerAddress: t,
      date: a,
      missionType: "first_pvp_match",
      completed: !0,
      claimed: !1,
      reward: b.first_pvp_match.amount,
      completedAt: Date.now()
    });
  }, "handler")
}), k = m({
  args: {
    playerAddress: i.string(),
    streak: i.union(i.literal(3), i.literal(5), i.literal(10))
  },
  handler: /* @__PURE__ */ p(async (s, { playerAddress: d, streak: a }) => {
    let t = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], l = d.toLowerCase(), e = `streak_${a}`;
    await s.db.query("personalMissions").withIndex("by_player_date", (n) => n.eq("playerAddress", l)).filter(
      (n) => n.and(
        n.eq(n.field("date"), t),
        n.eq(n.field("missionType"), e)
      )
    ).first() || await s.db.insert("personalMissions", {
      playerAddress: l,
      date: t,
      missionType: e,
      completed: !0,
      claimed: !1,
      reward: b[e].amount,
      completedAt: Date.now()
    });
  }, "handler")
}), L = m({
  args: { playerAddress: i.string() },
  handler: /* @__PURE__ */ p(async (s, { playerAddress: d }) => {
    let a = d.toLowerCase();
    await s.db.query("personalMissions").withIndex("by_player_date", (l) => l.eq("playerAddress", a)).filter(
      (l) => l.and(
        l.eq(l.field("date"), "once"),
        l.eq(l.field("missionType"), "vibefid_minted")
      )
    ).first() || (await s.db.insert("personalMissions", {
      playerAddress: a,
      date: "once",
      // One-time mission
      missionType: "vibefid_minted",
      completed: !0,
      claimed: !1,
      reward: b.vibefid_minted.amount,
      completedAt: Date.now()
    }), console.log("\u{1F3B4} VibeFID mint mission created for", a));
  }, "handler")
}), V = m({
  args: {
    playerAddress: i.string(),
    missionId: i.id("personalMissions"),
    language: i.optional(i.union(
      i.literal("pt-BR"),
      i.literal("en"),
      i.literal("es"),
      i.literal("hi"),
      i.literal("ru"),
      i.literal("zh-CN"),
      i.literal("id"),
      i.literal("fr"),
      i.literal("ja"),
      i.literal("it")
    )),
    skipCoins: i.optional(i.boolean())
    // If true, only calculate reward without adding coins
  },
  handler: /* @__PURE__ */ p(async (s, { playerAddress: d, missionId: a, language: t, skipCoins: l }) => {
    let e = d.toLowerCase(), r = await s.db.get(a);
    if (!r)
      throw new Error("Mission not found");
    if (r.playerAddress !== e)
      throw new Error("Mission does not belong to this player");
    if (r.claimed)
      throw new Error("Mission already claimed");
    if (!r.completed)
      throw new Error("Mission not completed yet");
    let n = await s.db.query("profiles").withIndex("by_address", (w) => w.eq("address", e)).first();
    if (!n)
      throw new Error("Profile not found");
    let y = b[r.missionType];
    if (!y)
      throw new Error(`Unknown mission type: ${r.missionType}`);
    let c = t ? A(y.amount, t) : y.amount, f = n.coins || 0;
    if (!l) {
      let w = n.coins || 0;
      f = w + c;
      let g = (n.lifetimeEarned || 0) + c, o = n.stats?.aura ?? 500, u = 3;
      await s.db.patch(n._id, {
        coins: f,
        lifetimeEarned: g,
        stats: {
          ...n.stats,
          aura: o + u
          // Award aura for mission completion
        }
      }), await h(
        s,
        e,
        "earn",
        c,
        w,
        f,
        "claimMission",
        String(a),
        // Convert Convex ID to string
        { missionType: r.missionType }
      ), await I(s, {
        address: e,
        type: "earn",
        amount: c,
        source: "mission",
        description: `Claimed mission: ${r.missionType}`,
        balanceBefore: w,
        balanceAfter: f
      }), console.log(`\u{1F4B0} Mission reward: ${c} TESTVBMS + ${u} aura for ${e}. Balance: ${w} \u2192 ${f}, Aura: ${o} \u2192 ${o + u}`);
    }
    return await s.db.patch(a, {
      claimed: !0,
      claimedAt: Date.now()
    }), {
      success: !0,
      reward: c,
      newBalance: f,
      missionType: r.missionType
    };
  }, "handler")
}), z = m({
  args: {
    playerAddress: i.string(),
    language: i.optional(i.union(
      i.literal("pt-BR"),
      i.literal("en"),
      i.literal("es"),
      i.literal("hi"),
      i.literal("ru"),
      i.literal("zh-CN"),
      i.literal("id"),
      i.literal("fr"),
      i.literal("ja"),
      i.literal("it")
    ))
  },
  handler: /* @__PURE__ */ p(async (s, { playerAddress: d, language: a }) => {
    let t = d.toLowerCase(), l = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], e = await s.db.query("personalMissions").withIndex("by_player_date", (o) => o.eq("playerAddress", t)).filter(
      (o) => o.and(
        o.eq(o.field("completed"), !0),
        o.eq(o.field("claimed"), !1),
        o.or(
          o.eq(o.field("date"), l),
          o.eq(o.field("date"), "once")
        )
      )
    ).collect();
    if (e.length === 0)
      return {
        success: !0,
        claimed: 0,
        totalReward: 0
      };
    let r = await s.db.query("profiles").withIndex("by_address", (o) => o.eq("address", t)).first();
    if (!r)
      throw new Error("Profile not found");
    let n = e.reduce((o, u) => {
      let T = a ? A(u.reward, a) : u.reward;
      return o + T;
    }, 0), y = r.coins || 0, c = y + n, f = (r.lifetimeEarned || 0) + n;
    await s.db.patch(r._id, {
      coins: c,
      lifetimeEarned: f
    }), await s.db.insert("coinTransactions", {
      address: t,
      amount: n,
      type: "earn",
      source: "mission_batch",
      description: `Claimed ${e.length} missions`,
      timestamp: Date.now(),
      balanceBefore: y,
      balanceAfter: c
    });
    let w = e.map((o) => o.missionType).join(", ");
    await h(
      s,
      t,
      "earn",
      n,
      y,
      c,
      "mission_batch",
      `${e.length}_missions`,
      { reason: `Claimed ${e.length} missions: ${w}` }
    ), console.log(`\u{1F4B0} Mission rewards added to balance: ${n} TESTVBMS for ${t}. Balance: ${y} \u2192 ${c}`);
    let g = Date.now();
    for (let o of e)
      await s.db.patch(o._id, {
        claimed: !0,
        claimedAt: g
      });
    return {
      success: !0,
      claimed: e.length,
      totalReward: n,
      newBalance: c
    };
  }, "handler")
}), R = m({
  args: { playerAddress: i.string() },
  handler: /* @__PURE__ */ p(async (s, { playerAddress: d }) => {
    let a = d.toLowerCase(), t = await s.db.query("profiles").withIndex("by_address", (e) => e.eq("address", a)).first();
    return t ? t.hasReceivedWelcomeGift ? { created: !1 } : (await s.db.patch(t._id, {
      hasReceivedWelcomeGift: !0
    }), await s.db.query("personalMissions").withIndex("by_player_date", (e) => e.eq("playerAddress", a)).filter(
      (e) => e.and(
        e.eq(e.field("date"), "once"),
        e.eq(e.field("missionType"), "welcome_gift")
      )
    ).first() ? { created: !1 } : (await s.db.insert("personalMissions", {
      playerAddress: a,
      date: "once",
      missionType: "welcome_gift",
      completed: !0,
      // Auto-completed
      claimed: !1,
      // Not claimed yet
      reward: 500,
      completedAt: Date.now()
    }), console.log(`\u{1F381} Created welcome_gift mission for ${a}`), { created: !0 })) : { created: !1 };
  }, "handler")
}), q = _({
  args: { playerAddress: i.string() },
  handler: /* @__PURE__ */ p(async (s, { playerAddress: d }) => {
    let a = d.toLowerCase(), t = await s.db.query("farcasterCards").withIndex("by_address", (n) => n.eq("address", a)).collect(), e = (await s.db.query("profiles").withIndex("by_address", (n) => n.eq("address", a)).first())?.hasVibeBadge === !0, r = t.length > 0;
    return {
      eligible: r && !e,
      hasVibeFIDCards: r,
      hasBadge: e,
      vibeFIDCount: t.length
    };
  }, "handler")
}), F = m({
  args: { playerAddress: i.string() },
  handler: /* @__PURE__ */ p(async (s, { playerAddress: d }) => {
    let a = d.toLowerCase(), t = await s.db.query("profiles").withIndex("by_address", (r) => r.eq("address", a)).first();
    if (!t)
      throw new Error("Profile not found");
    if (t.hasVibeBadge === !0)
      throw new Error("VIBE badge already claimed");
    if ((await s.db.query("farcasterCards").withIndex("by_address", (r) => r.eq("address", a)).collect()).length === 0)
      throw new Error("No VibeFID cards found. Mint a VibeFID first to claim the VIBE badge!");
    return await s.db.patch(t._id, {
      hasVibeBadge: !0
    }), await s.db.query("personalMissions").withIndex("by_player_date", (r) => r.eq("playerAddress", a)).filter(
      (r) => r.and(
        r.eq(r.field("date"), "once"),
        r.eq(r.field("missionType"), "claim_vibe_badge")
      )
    ).first() || await s.db.insert("personalMissions", {
      playerAddress: a,
      date: "once",
      missionType: "claim_vibe_badge",
      completed: !0,
      claimed: !0,
      reward: 0,
      // Badge reward, not coins
      completedAt: Date.now(),
      claimedAt: Date.now()
    }), console.log(`\u2728 VIBE badge claimed by ${a} (+20% Wanted Cast bonus)`), {
      success: !0,
      message: "VIBE badge claimed! You now receive +20% bonus coins in Wanted Cast."
    };
  }, "handler")
});
export {
  q as checkVibeBadgeEligibility,
  z as claimAllMissions,
  V as claimMission,
  F as claimVibeBadge,
  R as ensureWelcomeGift,
  B as getPlayerMissions,
  S as markDailyLogin,
  $ as markFirstPveWin,
  x as markFirstPvpMatch,
  L as markVibeFIDMinted,
  k as markWinStreak
};
//# sourceMappingURL=missions.js.map
