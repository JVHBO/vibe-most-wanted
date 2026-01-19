import {
  b as Q
} from "./_deps/5GK4PSQG.js";
import {
  a as ye,
  b as W
} from "./_deps/AWJMSRP7.js";
import {
  a as le
} from "./_deps/HHLKWD3J.js";
import {
  b as de
} from "./_deps/IJFCN5IR.js";
import {
  h as U
} from "./_deps/QS6BMXBV.js";
import {
  a as ie,
  c as C,
  d as oe
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as s
} from "./_deps/34SVKERO.js";
import {
  a as _
} from "./_deps/5B5TEMMX.js";

// convex/economy.ts
var H = 1500, he = 30, me = 10, be = {
  gey: 2,
  // was 5
  goofy: 5,
  // was 15
  gooner: 10,
  // was 30
  gangster: 20,
  // was 60
  gigachad: 40
  // was 120
}, F = 100, fe = -20, X = 1.2;
var z = {
  // Win bonuses based on how many ranks higher the opponent is
  diff50Plus: 2,
  // Opponent 50+ ranks higher = 2.0x (100 → 200 coins)
  diff20to49: 1.5,
  // Opponent 20-49 ranks higher = 1.5x (100 → 150 coins)
  diff10to19: 1.3,
  // Opponent 10-19 ranks higher = 1.3x (100 → 130 coins)
  diff5to9: 1.15,
  // Opponent 5-9 ranks higher = 1.15x (100 → 115 coins)
  default: 1
  // Less than 5 ranks difference = no bonus
}, Y = {
  // Loss penalty reduction based on how many ranks higher the opponent is
  diff50Plus: 0.4,
  // Opponent 50+ ranks higher = 60% penalty reduction (-20 → -8)
  diff20to49: 0.5,
  // Opponent 20-49 ranks higher = 50% reduction (-20 → -10)
  diff10to19: 0.65,
  // Opponent 10-19 ranks higher = 35% reduction (-20 → -13)
  diff5to9: 0.8,
  // Opponent 5-9 ranks higher = 20% reduction (-20 → -16)
  default: 1
  // Less than 5 ranks difference = full penalty
}, ce = {
  attack: 0,
  // No entry fee for leaderboard attacks
  pvp: 20
  // Reduced from 40 to 20
}, O = {
  firstPve: 50,
  firstPvp: 100,
  login: 25,
  streak3: 150,
  streak5: 300,
  streak10: 750
}, Be = C({
  args: {
    address: s.string()
  },
  handler: /* @__PURE__ */ _(async (e, { address: t }) => {
    let o = await e.db.query("profiles").withIndex("by_address", (i) => i.eq("address", t.toLowerCase())).first();
    if (!o)
      throw new Error("Profile not found");
    if (o.coins !== void 0)
      return;
    let r = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    await e.db.patch(o._id, {
      coins: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      dailyLimits: {
        pveWins: 0,
        pvpMatches: 0,
        lastResetDate: r,
        firstPveBonus: !1,
        firstPvpBonus: !1,
        loginBonus: !1,
        streakBonus: !1
      },
      winStreak: 0,
      lastWinTimestamp: 0
    });
  }, "handler")
}), De = ie({
  args: {
    address: s.string()
  },
  handler: /* @__PURE__ */ _(async (e, { address: t }) => {
    let o = await e.db.query("profiles").withIndex("by_address", (l) => l.eq("address", t.toLowerCase())).first();
    if (!o)
      return null;
    if (o.coins === void 0)
      return {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          firstPveBonus: !1,
          firstPvpBonus: !1,
          loginBonus: !1,
          streakBonus: !1
        },
        winStreak: 0,
        dailyEarned: 0,
        canEarnMore: !0
      };
    let r = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], a = o.dailyLimits?.lastResetDate === r ? K(o) : 0, n = a < H;
    return {
      coins: o.coins,
      lifetimeEarned: o.lifetimeEarned || 0,
      lifetimeSpent: o.lifetimeSpent || 0,
      dailyLimits: o.dailyLimits,
      winStreak: o.winStreak || 0,
      dailyEarned: a,
      canEarnMore: n
    };
  }, "handler")
});
function K(e) {
  let t = e.dailyLimits;
  if (!t) return 0;
  let o = 0;
  return o += t.pveWins * 30, o += t.pvpMatches * 60, t.firstPveBonus && (o += O.firstPve), t.firstPvpBonus && (o += O.firstPvp), t.loginBonus && (o += O.login), t.streakBonus && (o += O.streak3), o;
}
_(K, "calculateDailyEarned");
var Ee = oe({
  args: { cursor: s.optional(s.number()) },
  handler: /* @__PURE__ */ _(async (e, t) => {
    let o = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], r = 200, i = 0, a = e.db.query("profiles").order("asc");
    if (t.cursor) {
      let l = t.cursor;
      a = a.filter((w) => w.gt(w.field("_creationTime"), l));
    }
    let n = await a.take(r);
    if (n.length === 0)
      return console.log("[ResetDailyLimits] \u2705 Complete! No more profiles to process."), { success: !0, resetsApplied: 0, done: !0 };
    for (let l of n)
      l.dailyLimits && l.dailyLimits.lastResetDate !== o && (await e.db.patch(l._id, {
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: o,
          firstPveBonus: !1,
          firstPvpBonus: !1,
          loginBonus: !1,
          streakBonus: !1
        }
      }), i++);
    if (n.length === r) {
      let l = n[n.length - 1];
      await e.scheduler.runAfter(100, W.economy.resetDailyLimits, {
        cursor: l._creationTime
      }), console.log(`[ResetDailyLimits] \u{1F4E6} Batch done: ${i} resets. Scheduling next batch...`);
    } else
      console.log(`[ResetDailyLimits] \u2705 Final batch: ${i} resets. All profiles processed!`);
    return { success: !0, resetsApplied: i, done: n.length < r };
  }, "handler")
});
function ee(e, t, o) {
  let r = t - e;
  return o ? r <= 0 ? z.default : r >= 500 ? z.diff50Plus : r >= 200 ? z.diff20to49 : r >= 100 ? z.diff10to19 : r >= 50 ? z.diff5to9 : z.default : r <= 0 ? Y.default : r >= 500 ? Y.diff50Plus : r >= 200 ? Y.diff20to49 : r >= 100 ? Y.diff10to19 : r >= 50 ? Y.diff5to9 : Y.default;
}
_(ee, "calculateAuraMultiplier");
async function te(e, t) {
  let o = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  return !t.dailyLimits || t.dailyLimits.lastResetDate !== o ? (await e.db.patch(t._id, {
    dailyLimits: {
      pveWins: 0,
      pvpMatches: 0,
      lastResetDate: o,
      firstPveBonus: !1,
      firstPvpBonus: !1,
      loginBonus: !1,
      streakBonus: !1
    },
    rematchesToday: 0
    // Reset revenge match count
  }), {
    pveWins: 0,
    pvpMatches: 0,
    lastResetDate: o,
    firstPveBonus: !1,
    firstPvpBonus: !1,
    loginBonus: !1,
    streakBonus: !1
  }) : t.dailyLimits;
}
_(te, "checkAndResetDailyLimits");
var Te = ie({
  args: {
    playerAddress: s.string(),
    opponentAddress: s.string()
  },
  handler: /* @__PURE__ */ _(async (e, { playerAddress: t, opponentAddress: o }) => {
    let r = await e.db.query("profiles").withIndex("by_address", (v) => v.eq("address", t.toLowerCase())).first();
    if (!r)
      throw new Error("Player profile not found");
    let i = await e.db.query("profiles").withIndex("by_address", (v) => v.eq("address", o.toLowerCase())).first();
    if (!i)
      throw new Error("Opponent profile not found");
    let a = r.stats?.aura ?? 500, n = i.stats?.aura ?? 500, l = ee(a, n, !0), w = ee(a, n, !1), m = F, b = Math.round(m * l), P = b - m, E = fe, u = Math.round(E * w), B = Math.abs(u - E), h = r.winStreak || 0, d = h + 1, p = 0, f = "";
    d === 3 ? (p = O.streak3, f = "3-Win Streak Bonus") : d === 5 ? (p = O.streak5, f = "5-Win Streak Bonus") : d === 10 && (p = O.streak10, f = "10-Win Streak Bonus");
    let L = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], y = r.dailyLimits || {
      lastResetDate: "",
      firstPvpBonus: !1,
      pveWins: 0,
      pvpMatches: 0
    }, k = y.lastResetDate === L && !y.firstPvpBonus ? O.firstPvp : 0, S = t.toLowerCase(), T = o.toLowerCase(), j = await e.db.query("matches").withIndex("by_player", (v) => v.eq("playerAddress", T)).filter(
      (v) => v.and(
        v.eq(v.field("opponentAddress"), S),
        v.eq(v.field("result"), "win")
      )
    ).order("desc").first() !== null, ae = 0, se = b;
    j && (ae = Math.round(b * (X - 1)), se = Math.round(b * X));
    let ne = se + p + k;
    return {
      // 🚀 OPTIMIZED: Return aura values instead of expensive rank calculations
      opponentAura: n,
      playerAura: a,
      auraDiff: n - a,
      // Positive = opponent stronger
      currentStreak: h,
      isRevenge: j,
      // Flag if this is a revenge match
      // Win scenario
      win: {
        baseReward: m,
        rankingBonus: P,
        rankingMultiplier: l,
        revengeBonus: ae,
        // +20% revenge bonus if applicable
        firstPvpBonus: k,
        streakBonus: p,
        streakMessage: f,
        totalReward: ne
      },
      // Loss scenario
      loss: {
        basePenalty: E,
        penaltyReduction: B,
        rankingMultiplier: w,
        totalPenalty: u
      },
      // Current player state
      playerCoins: r.coins || 0
    };
  }, "handler")
}), Le = C({
  args: {
    address: s.string(),
    difficulty: s.union(
      s.literal("gey"),
      s.literal("goofy"),
      s.literal("gooner"),
      s.literal("gangster"),
      s.literal("gigachad")
    ),
    won: s.boolean(),
    language: s.optional(s.union(
      s.literal("pt-BR"),
      s.literal("en"),
      s.literal("es"),
      s.literal("hi"),
      s.literal("ru"),
      s.literal("zh-CN"),
      s.literal("id"),
      s.literal("fr"),
      s.literal("ja"),
      s.literal("it")
    )),
    skipCoins: s.optional(s.boolean())
    // If true, only calculate reward without adding coins
  },
  handler: /* @__PURE__ */ _(async (e, { address: t, difficulty: o, won: r, language: i, skipCoins: a }) => {
    let n = await e.db.query("profiles").withIndex("by_address", (d) => d.eq("address", t.toLowerCase())).first();
    if (!n)
      throw new Error("Profile not found");
    if (n.coins === void 0) {
      let d = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await e.db.patch(n._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: d,
          firstPveBonus: !1,
          firstPvpBonus: !1,
          loginBonus: !1,
          streakBonus: !1
        },
        winStreak: 0,
        lastWinTimestamp: 0
      });
      let p = await e.db.get(n._id);
      if (!p) throw new Error("Failed to initialize economy");
      n = p;
    }
    let l = await te(e, n), w = Date.now(), m = n.lastPvEAward || 0, b = w - m, P = 1e4;
    if (b < P) {
      let d = Math.ceil((P - b) / 1e3);
      throw new Error(`Too fast! Please wait ${d}s before playing again`);
    }
    await e.db.patch(n._id, {
      lastPvEAward: w
    });
    try {
      await e.scheduler.runAfter(0, ye.quests.updatePveStreak, {
        address: t.toLowerCase(),
        won: r
      });
    } catch (d) {
      console.error("\u274C Failed to track PvE streak:", d);
    }
    if (!r)
      return { awarded: 0, reason: "Lost the battle" };
    if (l.pveWins >= he)
      return { awarded: 0, reason: "Daily PvE win limit reached" };
    let u = be[o], B = [];
    if (i && (u = Q(u, i)), !l.firstPveBonus) {
      let d = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await e.db.query("personalMissions").withIndex("by_player_date", (f) => f.eq("playerAddress", t.toLowerCase())).filter(
        (f) => f.and(
          f.eq(f.field("date"), d),
          f.eq(f.field("missionType"), "first_pve_win")
        )
      ).first() || await e.db.insert("personalMissions", {
        playerAddress: t.toLowerCase(),
        date: d,
        missionType: "first_pve_win",
        completed: !0,
        claimed: !1,
        reward: 50,
        // MISSION_REWARDS.first_pve_win
        completedAt: Date.now()
      }), l.firstPveBonus = !0;
    }
    let h = K(n);
    if (h + u > H) {
      let d = Math.max(0, H - h);
      if (d === 0)
        return { awarded: 0, reason: "Daily cap reached" };
      u = d;
    }
    if (!a) {
      let d = n.coins || 0, p = n.stats?.aura ?? 500, f = r ? 5 : 0;
      await e.db.patch(n._id, {
        coins: d + u,
        lifetimeEarned: (n.lifetimeEarned || 0) + u,
        stats: {
          ...n.stats,
          aura: p + f
          // Award aura for PvE win
        },
        dailyLimits: {
          ...l,
          pveWins: l.pveWins + 1
        }
        // lastPvEAward already updated immediately after rate limit check (line 491)
      }), await le(e, {
        address: t,
        type: "earn",
        amount: u,
        source: "pve",
        description: `Won PvE battle (${o})`,
        balanceBefore: d,
        balanceAfter: d + u
      }), await U(
        e,
        t,
        "earn",
        u,
        d,
        d + u,
        "pve_reward",
        o,
        { difficulty: o, reason: "PvE battle win" }
      ), console.log(`\u{1F4B0} PvE reward: ${u} TESTVBMS + ${f} aura for ${t}. Balance: ${d} \u2192 ${d + u}, Aura: ${p} \u2192 ${p + f}`);
    }
    try {
      await e.scheduler.runAfter(0, W.quests.updateWeeklyProgress, {
        address: t.toLowerCase(),
        questId: "weekly_total_matches",
        increment: 1
      }), console.log(`\u2705 Weekly quest tracked: PvE match for ${t.toLowerCase()}`);
    } catch (d) {
      console.error("\u274C Failed to track weekly quest:", d);
    }
    return {
      awarded: u,
      bonuses: B,
      dailyEarned: h + u,
      remaining: H - (h + u)
    };
  }, "handler")
}), Ie = C({
  args: {
    address: s.string(),
    won: s.boolean(),
    opponentAddress: s.optional(s.string()),
    // ✅ NEW: For ranking bonus calculation
    language: s.optional(s.union(
      s.literal("pt-BR"),
      s.literal("en"),
      s.literal("es"),
      s.literal("hi"),
      s.literal("ru"),
      s.literal("zh-CN"),
      s.literal("id"),
      s.literal("fr"),
      s.literal("ja"),
      s.literal("it")
    ))
  },
  handler: /* @__PURE__ */ _(async (e, { address: t, won: o, opponentAddress: r, language: i }) => {
    let a = await e.db.query("profiles").withIndex("by_address", (d) => d.eq("address", t.toLowerCase())).first();
    if (!a)
      throw new Error("Profile not found");
    if (a.coins === void 0) {
      let d = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await e.db.patch(a._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: d,
          firstPveBonus: !1,
          firstPvpBonus: !1,
          loginBonus: !1,
          streakBonus: !1
        },
        winStreak: 0,
        lastWinTimestamp: 0
      });
      let p = await e.db.get(a._id);
      if (!p) throw new Error("Failed to initialize economy");
      a = p;
    }
    let n = await te(e, a), l = Date.now(), w = a.lastPvPAward || 0, m = l - w, b = 15e3;
    if (m < b) {
      let d = Math.ceil((b - m) / 1e3);
      throw new Error(`Too fast! Please wait ${d}s before next match`);
    }
    if (await e.db.patch(a._id, {
      lastPvPAward: l
    }), n.pvpMatches >= me)
      return { awarded: 0, reason: "Daily PvP match limit reached" };
    let P = 1, E = 500;
    if (r) {
      let d = await e.db.query("profiles").withIndex("by_address", (f) => f.eq("address", r.toLowerCase())).first(), p = a.stats?.aura ?? 500;
      E = d?.stats?.aura ?? 500, P = ee(p, E, o);
    }
    let u = a.winStreak || 0, B = [], h = 0;
    if (o) {
      u++;
      let d = i ? Q(F, i) : F;
      if (h = Math.round(d * P), P > 1 && r) {
        let y = h - F;
        B.push(`Strong Opponent Bonus +${y} (${P.toFixed(1)}x)`);
      }
      if (!n.firstPvpBonus) {
        let y = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        await e.db.query("personalMissions").withIndex("by_player_date", (k) => k.eq("playerAddress", t.toLowerCase())).filter((k) => k.and(k.eq(k.field("date"), y), k.eq(k.field("missionType"), "first_pvp_match"))).first() || await e.db.insert("personalMissions", {
          playerAddress: t.toLowerCase(),
          date: y,
          missionType: "first_pvp_match",
          completed: !0,
          claimed: !1,
          reward: 100,
          completedAt: Date.now()
        }), n.firstPvpBonus = !0;
      }
      if (u === 3 || u === 5 || u === 10) {
        let y = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], $ = `streak_${u}`, k = { streak_3: 150, streak_5: 300, streak_10: 750 };
        await e.db.query("personalMissions").withIndex("by_player_date", (T) => T.eq("playerAddress", t.toLowerCase())).filter((T) => T.and(T.eq(T.field("date"), y), T.eq(T.field("missionType"), $))).first() || await e.db.insert("personalMissions", {
          playerAddress: t.toLowerCase(),
          date: y,
          missionType: $,
          completed: !0,
          claimed: !1,
          reward: k[$],
          completedAt: Date.now()
        }), u === 3 && (n.streakBonus = !0);
      }
      let p = a.coins || 0, f = a.stats?.aura ?? 500, L = 10;
      await e.db.patch(a._id, {
        coins: p + h,
        lifetimeEarned: (a.lifetimeEarned || 0) + h,
        stats: {
          ...a.stats,
          aura: f + L
          // Award aura for PvP win
        },
        winStreak: u,
        lastWinTimestamp: Date.now(),
        dailyLimits: {
          ...n,
          pvpMatches: n.pvpMatches + 1
        }
        // lastPvPAward already updated immediately after rate limit check (line 652)
      }), await le(e, {
        address: t,
        type: "earn",
        amount: h,
        source: "pvp",
        description: "Won PvP battle",
        balanceBefore: p,
        balanceAfter: p + h
      }), await U(
        e,
        t,
        "earn",
        h,
        p,
        p + h,
        "pvp_reward",
        `streak_${u}`,
        { reason: "PvP battle win" }
      ), console.log(`\u{1F4B0} PvP reward: ${h} TESTVBMS + ${L} aura for ${t}. Balance: ${p} \u2192 ${p + h}, Aura: ${f} \u2192 ${f + L}`);
      try {
        await e.scheduler.runAfter(0, W.quests.updateWeeklyProgress, {
          address: t.toLowerCase(),
          questId: "weekly_total_matches",
          increment: 1
        }), console.log(`\u2705 Weekly quest tracked: PvP match (WIN) for ${t.toLowerCase()}`);
      } catch (y) {
        console.error("\u274C Failed to track weekly quest:", y);
      }
      return {
        awarded: h,
        bonuses: B,
        winStreak: u,
        opponentAura: E,
        // ✅ Include opponent aura in response
        rankingMultiplier: P
        // ✅ Include multiplier in response
      };
    } else {
      u = 0;
      let d = fe, p = Math.round(d * P), f = a.coins || 0, L = Math.max(0, f + p), y = a.stats?.aura ?? 500, k = Math.max(0, y + -5);
      if (P < 1 && r) {
        let S = Math.abs(p - d);
        B.push(`Strong Opponent Penalty Reduced -${S} (${(P * 100).toFixed(0)}% penalty)`);
      }
      await e.db.patch(a._id, {
        coins: L,
        lifetimeSpent: (a.lifetimeSpent || 0) + Math.abs(p),
        stats: {
          ...a.stats,
          aura: k
          // Lose aura for PvP loss
        },
        winStreak: u,
        lastWinTimestamp: Date.now(),
        // lastPvPAward already updated immediately after rate limit check (line 652)
        dailyLimits: {
          ...n,
          pvpMatches: n.pvpMatches + 1
        }
      }), await e.db.insert("coinTransactions", {
        address: t.toLowerCase(),
        amount: p,
        // negative
        type: "spend",
        source: "pvp_loss",
        description: "PvP battle loss penalty",
        timestamp: Date.now(),
        balanceBefore: f,
        balanceAfter: L
      });
      try {
        await e.scheduler.runAfter(0, W.quests.updateWeeklyProgress, {
          address: t.toLowerCase(),
          questId: "weekly_total_matches",
          increment: 1
        }), console.log(`\u2705 Weekly quest tracked: PvP match (LOSS) for ${t.toLowerCase()}`);
      } catch (S) {
        console.error("\u274C Failed to track weekly quest:", S);
      }
      return {
        awarded: p,
        // Negative value (reduced if high-rank opponent)
        bonuses: B,
        // ✅ Now includes penalty reduction message
        winStreak: u,
        opponentAura: E,
        // ✅ Include opponent aura in response
        rankingMultiplier: P,
        // ✅ Include multiplier in response
        dailyEarned: K(a),
        remaining: H - K(a)
      };
    }
  }, "handler")
}), Me = C({
  args: {
    address: s.string(),
    mode: s.union(s.literal("attack"), s.literal("pvp"))
  },
  handler: /* @__PURE__ */ _(async (e, { address: t, mode: o }) => {
    let r = await e.db.query("profiles").withIndex("by_address", (l) => l.eq("address", t.toLowerCase())).first();
    if (!r)
      throw new Error("Profile not found");
    if (r.coins === void 0)
      return { success: !1, reason: "Economy not initialized" };
    let i = ce[o];
    if ((r.coins || 0) < i)
      return { success: !1, reason: "Insufficient balance", required: i, current: r.coins };
    let a = r.coins || 0, n = a - i;
    return await e.db.patch(r._id, {
      coins: n,
      lifetimeSpent: (r.lifetimeSpent || 0) + i
    }), await e.db.insert("coinTransactions", {
      address: t.toLowerCase(),
      type: "spend",
      amount: i,
      source: "battle",
      description: "Battle entry fee",
      balanceBefore: a,
      balanceAfter: n,
      timestamp: Date.now()
    }), { success: !0, charged: i, newBalance: n };
  }, "handler")
}), $e = C({
  args: {
    address: s.string()
  },
  handler: /* @__PURE__ */ _(async (e, { address: t }) => {
    let o = await e.db.query("profiles").withIndex("by_address", (n) => n.eq("address", t.toLowerCase())).first();
    if (!o)
      throw new Error("Profile not found");
    if (o.coins === void 0) {
      let n = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await e.db.patch(o._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: n,
          firstPveBonus: !1,
          firstPvpBonus: !1,
          loginBonus: !1,
          streakBonus: !1
        },
        winStreak: 0,
        lastWinTimestamp: 0
      });
      let l = await e.db.get(o._id);
      if (!l) throw new Error("Failed to initialize economy");
      o = l;
    }
    let r = await te(e, o);
    if (r.loginBonus)
      return { awarded: 0, reason: "Mission already created today" };
    let i = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    return await e.db.query("personalMissions").withIndex("by_player_date", (n) => n.eq("playerAddress", t.toLowerCase())).filter((n) => n.and(n.eq(n.field("date"), i), n.eq(n.field("missionType"), "daily_login"))).first() || await e.db.insert("personalMissions", {
      playerAddress: t.toLowerCase(),
      date: i,
      missionType: "daily_login",
      completed: !0,
      claimed: !1,
      reward: 25,
      completedAt: Date.now()
    }), await e.db.patch(o._id, {
      dailyLimits: {
        ...r,
        loginBonus: !0
      }
    }), { awarded: 0, reason: "Mission created - check Missions tab to claim!", newBalance: o.coins || 0 };
  }, "handler")
}), Ce = C({
  args: {
    address: s.string(),
    type: s.string()
    // "dailyShare"
  },
  handler: /* @__PURE__ */ _(async (e, { address: t, type: o }) => {
    let r = t.toLowerCase(), i = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], a = await e.db.query("profiles").withIndex("by_address", (b) => b.eq("address", r)).first();
    if (!a)
      return { success: !1, message: "Profile not found" };
    let n = a.lastShareDate === i && a.dailyShares || 0;
    if (n >= 1)
      return { success: !1, message: "You already claimed your daily share bonus! Come back tomorrow." };
    let l = 50, w = a.coins || 0, m = w + l;
    return await e.db.patch(a._id, {
      coins: m,
      lifetimeEarned: (a.lifetimeEarned || 0) + l,
      lastShareDate: i,
      dailyShares: n + 1,
      hasSharedProfile: !0
    }), await e.db.insert("coinTransactions", {
      address: t.toLowerCase(),
      amount: l,
      type: "earn",
      source: "daily_share",
      description: "Daily share bonus",
      timestamp: Date.now(),
      balanceBefore: w,
      balanceAfter: m
    }), await U(
      e,
      r,
      "earn",
      l,
      w,
      m,
      "daily_share",
      i,
      { reason: "Daily share bonus" }
    ), {
      success: !0,
      message: `+${l} coins for sharing! Share daily for more rewards!`,
      awarded: l,
      newBalance: m
    };
  }, "handler")
}), Re = C({
  args: {
    address: s.string(),
    mode: s.union(s.literal("pvp"), s.literal("attack"))
  },
  handler: /* @__PURE__ */ _(async (e, { address: t, mode: o }) => {
    let r = await e.db.query("profiles").withIndex("by_address", (n) => n.eq("address", t.toLowerCase())).first();
    if (!r)
      throw new Error("Profile not found");
    if (r.coins === void 0) {
      let n = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await e.db.patch(r._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: n,
          firstPveBonus: !1,
          firstPvpBonus: !1,
          loginBonus: !1,
          streakBonus: !1
        },
        winStreak: 0,
        lastWinTimestamp: 0
      });
      let l = await e.db.get(r._id);
      if (!l) throw new Error("Failed to initialize economy");
      r = l;
    }
    let i = o === "pvp" ? ce.pvp : ce.attack, a = r.coins || 0;
    if (a < i)
      throw new Error(`Insufficient funds. Need ${i} coins but only have ${a}`);
    return await e.db.patch(r._id, {
      coins: a - i,
      lifetimeSpent: (r.lifetimeSpent || 0) + i
    }), await e.db.insert("coinTransactions", {
      address: t.toLowerCase(),
      amount: -i,
      type: "spend",
      source: `${o}_entry`,
      description: `${o.toUpperCase()} entry fee`,
      timestamp: Date.now(),
      balanceBefore: a,
      balanceAfter: a - i
    }), console.log(`\u{1F4B8} Entry fee paid: ${i} $TESTVBMS for ${o} mode by ${t}`), {
      paid: i,
      newBalance: a - i
    };
  }, "handler")
}), qe = oe({
  args: {
    address: s.string(),
    amount: s.number(),
    reason: s.string()
  },
  handler: /* @__PURE__ */ _(async (e, { address: t, amount: o, reason: r }) => {
    let i = await e.db.query("profiles").withIndex("by_address", (l) => l.eq("address", t.toLowerCase())).first();
    if (!i)
      throw new Error("Profile not found");
    if (i.coins === void 0) {
      let l = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await e.db.patch(i._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: l,
          firstPveBonus: !1,
          firstPvpBonus: !1,
          loginBonus: !1,
          streakBonus: !1
        },
        winStreak: 0,
        lastWinTimestamp: 0
      });
      let w = await e.db.get(i._id);
      if (!w) throw new Error("Failed to initialize economy");
      i = w;
    }
    let a = i.coins || 0, n = a + o;
    return await e.db.patch(i._id, {
      coins: n,
      lifetimeEarned: (i.lifetimeEarned || 0) + o
    }), await U(
      e,
      t,
      "earn",
      o,
      a,
      n,
      "addCoins",
      void 0,
      { reason: r }
    ), await e.db.insert("coinTransactions", {
      address: t.toLowerCase(),
      amount: o,
      type: "bonus",
      source: "admin_add",
      description: r || "Admin added coins",
      timestamp: Date.now(),
      balanceBefore: a,
      balanceAfter: n
    }), console.log(`\u{1F4B0} Added ${o} coins to ${t}: ${r}`), {
      added: o,
      newBalance: n,
      reason: r
    };
  }, "handler")
}), We = C({
  args: {
    // Player info
    playerAddress: s.string(),
    playerPower: s.number(),
    playerCards: s.array(de),
    // 🔒 SECURITY
    playerUsername: s.string(),
    // Match result
    result: s.union(
      s.literal("win"),
      s.literal("loss"),
      s.literal("tie")
    ),
    // Opponent info
    opponentAddress: s.string(),
    opponentUsername: s.string(),
    opponentPower: s.number(),
    opponentCards: s.array(de),
    // 🔒 SECURITY
    // Economy
    entryFeePaid: s.optional(s.number()),
    language: s.optional(s.union(
      s.literal("pt-BR"),
      s.literal("en"),
      s.literal("es"),
      s.literal("hi"),
      s.literal("ru"),
      s.literal("zh-CN"),
      s.literal("id"),
      s.literal("fr"),
      s.literal("ja"),
      s.literal("it")
    )),
    skipCoins: s.optional(s.boolean())
    // If true, only calculate reward without adding coins (for wins only)
  },
  handler: /* @__PURE__ */ _(async (e, t) => {
    let o = /^0x[a-fA-F0-9]{40}$/;
    if (!o.test(t.playerAddress))
      throw new Error("Invalid player address format");
    if (!o.test(t.opponentAddress))
      throw new Error("Invalid opponent address format");
    let r = t.playerAddress.toLowerCase(), i = t.opponentAddress.toLowerCase(), a = await e.db.query("profiles").withIndex("by_address", (c) => c.eq("address", r)).first();
    if (!a)
      throw new Error("Player profile not found");
    if (a.coins === void 0) {
      let c = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await e.db.patch(a._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: c,
          firstPveBonus: !1,
          firstPvpBonus: !1,
          loginBonus: !1,
          streakBonus: !1
        },
        winStreak: 0,
        lastWinTimestamp: 0
      });
      let g = await e.db.get(a._id);
      if (!g) throw new Error("Failed to initialize economy");
      a = g;
    }
    let n = await te(e, a), l = Date.now(), w = a.lastPvPAward || 0, m = l - w, b = 15e3;
    if (m < b) {
      let c = Math.ceil((b - m) / 1e3);
      throw new Error(`Too fast! Please wait ${c}s before next attack`);
    }
    if (await e.db.patch(a._id, {
      lastPvPAward: l
    }), n.pvpMatches >= me)
      throw new Error("Daily PvP match limit reached");
    let P = await e.db.query("profiles").withIndex("by_address", (c) => c.eq("address", i)).first(), E = a.stats?.aura ?? 500, u = P?.stats?.aura ?? 500, B = t.result === "win", h = ee(E, u, B), p = await e.db.query("matches").withIndex("by_player", (c) => c.eq("playerAddress", i)).filter(
      (c) => c.and(
        c.eq(c.field("opponentAddress"), r),
        c.eq(c.field("result"), "win")
      )
    ).order("desc").first() !== null, f = a.winStreak || 0, L = [], y = 0, $ = a.coins || 0;
    if (B) {
      f++;
      let c = t.language ? Q(F, t.language) : F, g = Math.round(c * h);
      if (p) {
        let A = Math.round(g * (X - 1));
        y = Math.round(g * X), L.push(`\u2694\uFE0F Revenge Bonus +${A} (${((X - 1) * 100).toFixed(0)}%)`);
      } else
        y = g;
      if (h > 1) {
        let A = g - F;
        L.push(`Strong Opponent Bonus +${A} (${h.toFixed(1)}x)`);
      }
      if (!n.firstPvpBonus) {
        let A = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        await e.db.query("personalMissions").withIndex("by_player_date", (I) => I.eq("playerAddress", t.playerAddress.toLowerCase())).filter((I) => I.and(I.eq(I.field("date"), A), I.eq(I.field("missionType"), "first_pvp_match"))).first() || await e.db.insert("personalMissions", {
          playerAddress: t.playerAddress.toLowerCase(),
          date: A,
          missionType: "first_pvp_match",
          completed: !0,
          claimed: !1,
          reward: 100,
          completedAt: Date.now()
        }), n.firstPvpBonus = !0;
      }
      if (f === 3 || f === 5 || f === 10) {
        let A = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], D = `streak_${f}`, I = { streak_3: 150, streak_5: 300, streak_10: 750 };
        await e.db.query("personalMissions").withIndex("by_player_date", (R) => R.eq("playerAddress", t.playerAddress.toLowerCase())).filter((R) => R.and(R.eq(R.field("date"), A), R.eq(R.field("missionType"), D))).first() || await e.db.insert("personalMissions", {
          playerAddress: t.playerAddress.toLowerCase(),
          date: A,
          missionType: D,
          completed: !0,
          claimed: !1,
          reward: I[D],
          completedAt: Date.now()
        }), f === 3 && (n.streakBonus = !0);
      }
      console.log(`\u{1F4EC} Attack reward will be added to inbox: ${y} TESTVBMS for ${r}`), $ = a.coins || 0;
    } else if (t.result === "loss") {
      f = 0;
      let c = fe, g = Math.round(c * h);
      if (y = g, h < 1) {
        let M = Math.abs(g - c);
        L.push(`Strong Opponent Penalty Reduced -${M} (${(h * 100).toFixed(0)}% penalty)`);
      }
      let A = a.coins || 0, D = Math.abs(g), I = 0, N = 0;
      A >= D ? (I = D, $ = A - D) : (I = A, $ = 0, N = D - A);
      let R = Math.round(D * 0.05), G = D - R, q = await e.db.query("profiles").withIndex("by_address", (M) => M.eq("address", i)).first();
      if (q) {
        if (q.coins === void 0) {
          let M = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          await e.db.patch(q._id, {
            coins: 0,
            lifetimeEarned: 0,
            lifetimeSpent: 0,
            dailyLimits: {
              pveWins: 0,
              pvpMatches: 0,
              lastResetDate: M,
              firstPveBonus: !1,
              firstPvpBonus: !1,
              loginBonus: !1,
              streakBonus: !1
            }
          }), q = await e.db.get(q._id);
        }
        if (q) {
          let M = q.coinsInbox || 0, x = M + G;
          await e.db.patch(q._id, {
            coinsInbox: x,
            lifetimeEarned: (q.lifetimeEarned || 0) + G
          });
          try {
            await e.db.insert("coinTransactions", {
              address: i,
              type: "earn",
              amount: G,
              source: "defense_win",
              description: `Defense Win vs ${t.playerUsername} (+${G} TESTVBMS to inbox)`,
              balanceBefore: M,
              balanceAfter: x,
              timestamp: Date.now()
            });
          } catch (J) {
            console.error("\u26A0\uFE0F Failed to record defense transaction:", J);
          }
          console.log(`\u{1F4EC} Defense reward sent to inbox: ${G} TESTVBMS for ${i}. Inbox: ${M} \u2192 ${x}`);
        }
      }
      if (N > 0) {
        let M = a.coinsInbox || 0, x = a.poolDebt || 0, J = Math.min(M, N), pe = Math.max(0, M - N), ue = N - J, we = x + ue;
        await e.db.patch(a._id, {
          coinsInbox: pe,
          poolDebt: we
          // Track remaining debt separately
        }), console.log(`\u{1F4B8} Attacker ${r} penalty: ${D} (${I} from coins, ${J} from inbox, ${ue} pool debt). Inbox: ${M} \u2192 ${pe}, Debt: ${x} \u2192 ${we}`);
      } else
        console.log(`\u{1F4B8} Attacker ${r} penalty: ${D} (all from coins)`);
    }
    let k = await e.db.insert("matches", {
      playerAddress: r,
      type: "attack",
      result: t.result,
      playerPower: t.playerPower,
      opponentPower: t.opponentPower,
      opponentAddress: i,
      opponentUsername: t.opponentUsername,
      timestamp: Date.now(),
      playerCards: t.playerCards,
      opponentCards: t.opponentCards,
      coinsEarned: y,
      entryFeePaid: t.entryFeePaid
    }), S = { ...a.stats }, T = a.stats?.aura ?? 500, V = 0;
    if (t.result === "win") {
      S.attackWins = (S.attackWins || 0) + 1, S.pvpWins = (S.pvpWins || 0) + 1, V = 20, S.aura = T + V;
      let c = await e.db.query("profiles").withIndex("by_address", (g) => g.eq("address", i)).first();
      if (c) {
        let g = c.stats?.aura ?? 500, A = 20, D = Math.max(0, g - A);
        await e.db.patch(c._id, {
          stats: {
            ...c.stats,
            aura: D,
            defenseWins: c.stats?.defenseWins || 0,
            defenseLosses: (c.stats?.defenseLosses || 0) + 1
            // Track defense loss
          }
        }), console.log(`\u2694\uFE0F Aura transfer: Attacker ${r} +${V} (${T} \u2192 ${T + V}), Defender ${i} -${A} (${g} \u2192 ${D})`);
      }
    } else if (t.result === "loss") {
      S.attackLosses = (S.attackLosses || 0) + 1, S.pvpLosses = (S.pvpLosses || 0) + 1, V = 0, S.aura = T;
      let c = await e.db.query("profiles").withIndex("by_address", (g) => g.eq("address", i)).first();
      c && await e.db.patch(c._id, {
        stats: {
          ...c.stats,
          defenseWins: (c.stats?.defenseWins || 0) + 1,
          // Track defense win
          defenseLosses: c.stats?.defenseLosses || 0
        }
      });
    }
    let j = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], ne = (a.lastAttackDate || "") !== j ? 1 : (a.attacksToday || 0) + 1, v = {
      coins: $,
      lifetimeEarned: B ? (a.lifetimeEarned || 0) + y : a.lifetimeEarned,
      lifetimeSpent: !B && y < 0 ? (a.lifetimeSpent || 0) + Math.abs(y) : a.lifetimeSpent,
      winStreak: f,
      lastWinTimestamp: Date.now(),
      // lastPvPAward already updated immediately after rate limit check (line 1174)
      stats: S,
      dailyLimits: {
        ...n,
        pvpMatches: n.pvpMatches + 1
      },
      rematchesToday: p ? (a.rematchesToday || 0) + 1 : a.rematchesToday,
      lastUpdated: Date.now(),
      // Attack tracking
      attacksToday: ne,
      lastAttackDate: j
    };
    if (B && !t.skipCoins) {
      let c = a.coins || 0;
      v.coins = c + y, console.log(`\u{1F4B0} Attack reward added to balance: ${y} TESTVBMS. Balance: ${c} \u2192 ${v.coins}`);
      try {
        await e.db.insert("coinTransactions", {
          address: r,
          type: "earn",
          amount: y,
          source: "attack_win",
          description: `Attack Win vs ${t.opponentUsername} (+${y} TESTVBMS)`,
          balanceBefore: c,
          balanceAfter: v.coins,
          timestamp: Date.now()
        }), await U(
          e,
          r,
          "earn",
          y,
          c,
          v.coins,
          "attack_win",
          t.opponentAddress,
          { reason: `Attack win vs ${t.opponentUsername}` }
        );
      } catch (g) {
        console.error("\u26A0\uFE0F Failed to record attack transaction:", g);
      }
    }
    await e.db.patch(a._id, v);
    let Z = await e.db.get(a._id), re = Z && {
      ...Z,
      hasDefenseDeck: (Z.defenseDeck?.length || 0) === 5
    };
    try {
      await e.scheduler.runAfter(0, W.quests.updateWeeklyProgress, {
        address: r,
        questId: "weekly_total_matches",
        increment: 1
      }), B && await e.scheduler.runAfter(0, W.quests.updateWeeklyProgress, {
        address: r,
        questId: "weekly_attack_wins",
        increment: 1
      }), B || (await e.scheduler.runAfter(0, W.quests.updateWeeklyProgress, {
        address: i,
        questId: "weekly_defense_wins",
        increment: 1
      }), console.log(`\u{1F6E1}\uFE0F Weekly quest tracked: Defense win for ${i}`)), console.log(`\u2705 Weekly quests tracked: Attack ${t.result} for ${r}`);
    } catch (c) {
      console.error("\u274C Failed to track weekly quests:", c);
    }
    return console.log("\u269B\uFE0F ATOMIC: Attack result recorded successfully", {
      matchId: k,
      result: t.result,
      coinsAwarded: y,
      newBalance: $,
      newStreak: f
    }), {
      success: !0,
      matchId: k,
      coinsAwarded: y,
      bonuses: L,
      winStreak: f,
      opponentAura: u,
      rankingMultiplier: h,
      profile: re,
      // Return updated profile with hasDefenseDeck computed
      dailyEarned: K(re),
      remaining: H - K(re)
    };
  }, "handler")
}), Oe = C({
  args: {
    address: s.string(),
    type: s.union(s.literal("victory"), s.literal("profile"), s.literal("dailyShare"))
  },
  handler: /* @__PURE__ */ _(async (e, t) => {
    let { address: o, type: r } = t, i = await e.db.query("profiles").withIndex("by_address", (n) => n.eq("address", o.toLowerCase())).first();
    if (!i)
      throw new Error("Profile not found");
    let a = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    if (r === "profile") {
      if (i.hasSharedProfile)
        return {
          success: !1,
          message: "Profile share bonus already claimed",
          coinsAwarded: 0
        };
      let n = 250, l = i.coinsInbox || 0, w = l + n, m = (i.lifetimeEarned || 0) + n, b = (i.totalShareBonus || 0) + n;
      return await e.db.patch(i._id, {
        coinsInbox: w,
        lifetimeEarned: m,
        totalShareBonus: b,
        hasSharedProfile: !0,
        lastUpdated: Date.now()
      }), console.log(`\u{1F4EC} Profile share bonus sent to inbox: ${n} TESTVBMS for ${o}. Inbox: ${l} \u2192 ${w}`), {
        success: !0,
        message: "Profile share bonus claimed!",
        coinsAwarded: n,
        newBalance: w
      };
    }
    if (r === "dailyShare") {
      if (i.lastShareDate === a)
        return {
          success: !1,
          message: "Daily share bonus already claimed today",
          coinsAwarded: 0
        };
      let n = 50, l = i.coinsInbox || 0, w = l + n, m = (i.lifetimeEarned || 0) + n, b = (i.totalShareBonus || 0) + n;
      return await e.db.patch(i._id, {
        coinsInbox: w,
        lifetimeEarned: m,
        totalShareBonus: b,
        lastShareDate: a,
        dailyShares: (i.dailyShares || 0) + 1,
        lastUpdated: Date.now()
      }), console.log(`\u{1F4EC} Daily share bonus sent to inbox: ${n} TESTVBMS for ${o}. Inbox: ${l} \u2192 ${w}`), {
        success: !0,
        message: "Daily share bonus claimed! +50 coins",
        coinsAwarded: n,
        newBalance: w
      };
    }
    if (r === "victory") {
      let n = i.lastShareDate === a && i.dailyShares || 0;
      if (n >= 3)
        return {
          success: !1,
          message: "Daily share limit reached (3/3)",
          coinsAwarded: 0,
          remaining: 0
        };
      let l = 10, w = i.coinsInbox || 0, m = w + l, b = (i.lifetimeEarned || 0) + l, P = (i.totalShareBonus || 0) + l, E = n + 1;
      return await e.db.patch(i._id, {
        coinsInbox: m,
        lifetimeEarned: b,
        totalShareBonus: P,
        dailyShares: E,
        lastShareDate: a,
        lastUpdated: Date.now()
      }), console.log(`\u{1F4EC} Victory share bonus sent to inbox: ${l} TESTVBMS for ${o}. Inbox: ${w} \u2192 ${m}`), {
        success: !0,
        message: `Share bonus claimed! (+${l} coins)`,
        coinsAwarded: l,
        newBalance: m,
        remaining: 3 - E
      };
    }
    throw new Error("Invalid share type");
  }, "handler")
}), Fe = C({
  args: {
    address: s.string(),
    matchId: s.id("matches")
  },
  handler: /* @__PURE__ */ _(async (e, { address: t, matchId: o }) => {
    let r = await e.db.query("profiles").withIndex("by_address", (m) => m.eq("address", t.toLowerCase())).first();
    if (!r)
      throw new Error("Profile not found");
    let i = await e.db.get(o);
    if (!i)
      throw new Error("Match not found");
    if (i.playerAddress.toLowerCase() !== t.toLowerCase())
      throw new Error("Unauthorized: Match does not belong to this player");
    if (i.rewardsClaimed)
      throw new Error("Rewards already claimed for this match");
    let a = i.coinsEarned || 0;
    if (r.coins === void 0) {
      let m = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await e.db.patch(r._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: m,
          firstPveBonus: !1,
          firstPvpBonus: !1,
          loginBonus: !1,
          streakBonus: !1
        },
        winStreak: 0,
        lastWinTimestamp: 0
      });
      let b = await e.db.get(r._id);
      if (!b) throw new Error("Failed to initialize economy");
      r = b;
    }
    let n = r.coins || 0, l = n + a, w = (r.lifetimeEarned || 0) + a;
    return console.log("[awardPokerCoins] Adding coins:", {
      address: t.toLowerCase(),
      matchId: o,
      oldCoins: n,
      amount: a,
      newCoins: l
    }), await e.db.patch(r._id, {
      coins: l,
      lifetimeEarned: w,
      lastUpdated: Date.now()
    }), await e.db.patch(o, {
      rewardsClaimed: !0,
      claimedAt: Date.now(),
      claimType: "immediate"
    }), {
      success: !0,
      amount: a,
      newBalance: l
    };
  }, "handler")
});
export {
  qe as addCoins,
  Fe as awardPokerCoins,
  Le as awardPvECoins,
  Ie as awardPvPCoins,
  Oe as awardShareBonus,
  Me as chargeEntryFee,
  $e as claimLoginBonus,
  Ce as claimShareBonus,
  De as getPlayerEconomy,
  Be as initializeEconomy,
  Re as payEntryFee,
  Te as previewPvPRewards,
  We as recordAttackResult,
  Ee as resetDailyLimits
};
//# sourceMappingURL=economy.js.map
