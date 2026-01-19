import {
  a as g
} from "./_deps/LKY7FFHL.js";
import {
  a as x
} from "./_deps/HHLKWD3J.js";
import {
  a as D,
  c as _,
  d as A
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as m
} from "./_deps/34SVKERO.js";
import {
  a as y
} from "./_deps/5B5TEMMX.js";

// convex/quests.ts
function W(t) {
  let o = new Uint32Array(1);
  return crypto.getRandomValues(o), o[0] % t;
}
y(W, "cryptoRandomInt");
var E = [
  {
    type: "win_pve_3",
    description: "Win 3 PvE battles",
    requirement: { count: 3 },
    reward: 150,
    difficulty: "easy"
  },
  {
    type: "win_pve_5",
    description: "Win 5 PvE battles",
    requirement: { count: 5 },
    reward: 300,
    difficulty: "medium"
  },
  {
    type: "defeat_gangster",
    description: "Defeat Gangster difficulty AI",
    requirement: { count: 1, difficulty: "gangster" },
    reward: 250,
    difficulty: "medium"
  },
  {
    type: "defeat_gigachad",
    description: "Defeat Gigachad difficulty AI",
    requirement: { count: 1, difficulty: "gigachad" },
    reward: 500,
    difficulty: "hard"
  },
  {
    type: "play_pvp_3",
    description: "Play 3 PvP matches (win or lose)",
    requirement: { count: 3 },
    reward: 200,
    difficulty: "medium"
  },
  {
    type: "win_pvp_3",
    description: "Win 3 PvP matches",
    requirement: { count: 3 },
    reward: 400,
    difficulty: "hard"
  },
  {
    type: "win_streak_3",
    description: "Win 3 battles in a row",
    requirement: { count: 3 },
    reward: 350,
    difficulty: "hard"
  },
  {
    type: "complete_5_battles",
    description: "Complete 5 battles (any mode)",
    requirement: { count: 5 },
    reward: 250,
    difficulty: "easy"
  },
  {
    type: "perfect_day",
    description: "Win 2 PvE and 2 PvP battles",
    requirement: { count: 2 },
    // 2 of each
    reward: 600,
    difficulty: "hard"
  }
], M = D({
  args: {},
  handler: /* @__PURE__ */ y(async (t) => {
    let o = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], a = await t.db.query("dailyQuests").withIndex("by_date", (d) => d.eq("date", o)).first();
    return a || null;
  }, "handler")
}), U = _({
  args: {},
  handler: /* @__PURE__ */ y(async (t) => {
    let o = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], a = await t.db.query("dailyQuests").withIndex("by_date", (s) => s.eq("date", o)).first();
    if (a)
      return a;
    let d = W(E.length), e = E[d], n = await t.db.insert("dailyQuests", {
      date: o,
      type: e.type,
      description: e.description,
      requirement: e.requirement,
      reward: e.reward,
      difficulty: e.difficulty,
      createdAt: Date.now()
    }), r = await t.db.get(n);
    return console.log("\u2705 Generated daily quest:", e.type, "for", o), r;
  }, "handler")
}), L = A({
  args: {},
  handler: /* @__PURE__ */ y(async (t) => {
    let o = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], a = await t.db.query("dailyQuests").withIndex("by_date", (r) => r.eq("date", o)).first();
    if (a)
      return a._id;
    let d = W(E.length), e = E[d];
    return await t.db.insert("dailyQuests", {
      date: o,
      type: e.type,
      description: e.description,
      requirement: e.requirement,
      reward: e.reward,
      difficulty: e.difficulty,
      createdAt: Date.now()
    });
  }, "handler")
}), z = D({
  args: { address: m.string() },
  handler: /* @__PURE__ */ y(async (t, { address: o }) => {
    let a = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], d = g(o), e = await t.db.query("dailyQuests").withIndex("by_date", (l) => l.eq("date", a)).first();
    if (!e)
      return null;
    let n = await t.db.query("questProgress").withIndex(
      "by_player_date",
      (l) => l.eq("playerAddress", d).eq("questDate", a)
    ).first();
    if (n)
      return {
        quest: e,
        progress: n.completed ? e.requirement.count || 1 : 0,
        completed: n.completed,
        claimed: n.claimed
      };
    let r = [], s = 0, i = !1;
    switch (e.type) {
      case "win_pve_3":
      case "win_pve_5":
        s = r.filter(
          (u) => u.type === "pve" && u.result === "win"
        ).length, i = s >= (e.requirement.count || 0);
        break;
      case "defeat_gangster":
      case "defeat_gigachad":
        s = r.filter(
          (u) => u.type === "pve" && u.result === "win" && u.difficulty === e.requirement.difficulty
        ).length, i = s >= (e.requirement.count || 0);
        break;
      case "play_pvp_3":
        s = r.filter((u) => u.type === "pvp").length, i = s >= (e.requirement.count || 0);
        break;
      case "win_pvp_3":
        s = r.filter(
          (u) => u.type === "pvp" && u.result === "win"
        ).length, i = s >= (e.requirement.count || 0);
        break;
      case "win_streak_3":
        let l = 0, c = 0, f = r.sort((u, v) => u.timestamp - v.timestamp);
        for (let u of f)
          u.result === "win" ? (l++, c = Math.max(c, l)) : l = 0;
        s = c, i = c >= (e.requirement.count || 0);
        break;
      case "low_power_win":
        s = r.filter(
          (u) => u.type === "pve" && u.result === "win" && u.playerPower <= (e.requirement.maxPower || 0)
        ).length, i = s >= (e.requirement.count || 0);
        break;
      case "complete_5_battles":
        s = r.length, i = s >= (e.requirement.count || 0);
        break;
      case "perfect_day":
        let k = r.filter(
          (u) => u.type === "pve" && u.result === "win"
        ).length, h = r.filter(
          (u) => u.type === "pvp" && u.result === "win"
        ).length, p = e.requirement.count || 2;
        s = Math.min(k, h), i = k >= p && h >= p;
        break;
    }
    return {
      quest: e,
      progress: s,
      completed: i,
      claimed: !1
    };
  }, "handler")
}), N = _({
  args: { address: m.string() },
  handler: /* @__PURE__ */ y(async (t, { address: o }) => {
    let a = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], d = g(o), e = await t.db.query("dailyQuests").withIndex("by_date", (p) => p.eq("date", a)).first();
    if (!e)
      throw new Error("No daily quest available");
    let n = await t.db.query("profiles").withIndex("by_address", (p) => p.eq("address", d)).first();
    if (!n)
      throw new Error("Profile not found");
    let r = await t.db.query("questProgress").withIndex(
      "by_player_date",
      (p) => p.eq("playerAddress", d).eq("questDate", a)
    ).first();
    if (r && r.claimed)
      throw new Error("Quest reward already claimed");
    let s = new Date(a).getTime(), i = s + 1440 * 60 * 1e3, l = await t.db.query("matches").withIndex("by_player", (p) => p.eq("playerAddress", d)).filter(
      (p) => p.and(
        p.gte(p.field("timestamp"), s),
        p.lt(p.field("timestamp"), i)
      )
    ).take(100), c = !1;
    switch (e.type) {
      case "win_pve_3":
      case "win_pve_5":
        c = l.filter((w) => w.type === "pve" && w.result === "win").length >= (e.requirement.count || 0);
        break;
      case "defeat_gangster":
      case "defeat_gigachad":
        c = l.filter(
          (w) => w.type === "pve" && w.result === "win" && w.difficulty === e.requirement.difficulty
        ).length >= (e.requirement.count || 0);
        break;
      case "play_pvp_3":
        c = l.filter((w) => w.type === "pvp").length >= (e.requirement.count || 0);
        break;
      case "win_pvp_3":
        c = l.filter((w) => w.type === "pvp" && w.result === "win").length >= (e.requirement.count || 0);
        break;
      case "low_power_win":
        c = l.filter(
          (w) => w.type === "pve" && w.result === "win" && w.playerPower <= (e.requirement.maxPower || 0)
        ).length >= (e.requirement.count || 0);
        break;
      case "complete_5_battles":
        c = l.length >= (e.requirement.count || 0);
        break;
      case "perfect_day":
        let p = l.filter(
          (w) => w.type === "pve" && w.result === "win"
        ).length, u = l.filter(
          (w) => w.type === "pvp" && w.result === "win"
        ).length;
        c = p >= (e.requirement.count || 2) && u >= (e.requirement.count || 2);
        break;
      case "win_streak_3":
        let v = 0, I = 0, C = l.sort((w, B) => w.timestamp - B.timestamp);
        for (let w of C)
          w.result === "win" ? (v++, I = Math.max(I, v)) : v = 0;
        c = I >= (e.requirement.count || 0);
        break;
    }
    if (!c)
      throw new Error("Quest not completed yet");
    let f = n.coins || 0, k = f + e.reward, h = (n.lifetimeEarned || 0) + e.reward;
    return await t.db.patch(n._id, {
      coins: k,
      lifetimeEarned: h,
      lastUpdated: Date.now()
    }), await x(t, {
      address: d,
      type: "earn",
      amount: e.reward,
      source: "daily_quest",
      description: `Completed daily quest: ${e.type}`,
      balanceBefore: f,
      balanceAfter: k
    }), console.log(`\u{1F4B0} Daily quest reward added to balance: ${e.reward} TESTVBMS for ${d}. Balance: ${f} \u2192 ${k}`), r ? await t.db.patch(r._id, {
      claimed: !0,
      claimedAt: Date.now()
    }) : await t.db.insert("questProgress", {
      playerAddress: d,
      questDate: a,
      completed: !0,
      claimed: !0,
      claimedAt: Date.now()
    }), {
      success: !0,
      reward: e.reward,
      newBalance: k,
      questName: e.description
    };
  }, "handler")
}), T = {
  attackWins: {
    id: "weekly_attack_wins",
    name: "Attack Master",
    description: "Win 20 attacks",
    target: 20,
    reward: 300,
    // Weekly attack wins reward
    icon: "\u{1F3C6}"
  },
  totalMatches: {
    id: "weekly_total_matches",
    name: "Active Player",
    description: "Play 30 matches (any mode)",
    target: 30,
    reward: 200,
    icon: "\u{1F3B2}"
  },
  defenseWins: {
    id: "weekly_defense_wins",
    name: "Fortress",
    description: "Defend successfully 10 times",
    target: 10,
    reward: 400,
    icon: "\u{1F6E1}\uFE0F"
  },
  pveStreak: {
    id: "weekly_pve_streak",
    name: "Unbeatable",
    description: "Win 10 PvE battles in a row",
    target: 10,
    reward: 500,
    icon: "\u{1F525}"
  }
}, b = {
  rank1: 1e3,
  // 1st place
  rank2: 750,
  // 2nd place
  rank3: 500,
  // 3rd place
  rank4to10: 300
  // 4th-10th place
  // SEM top20 ou top50 - APENAS TOP 10!
}, V = D({
  args: { address: m.string() },
  handler: /* @__PURE__ */ y(async (t, { address: o }) => {
    let a = g(o), d = S(), e = await t.db.query("weeklyProgress").withIndex(
      "by_player_week",
      (n) => n.eq("playerAddress", a).eq("weekStart", d)
    ).first();
    return e ? {
      weekStart: d,
      weekEnd: q(),
      quests: e.quests || P()
    } : {
      weekStart: d,
      weekEnd: q(),
      quests: P()
    };
  }, "handler")
}), j = A({
  args: {
    address: m.string(),
    questId: m.string(),
    increment: m.optional(m.number())
  },
  handler: /* @__PURE__ */ y(async (t, { address: o, questId: a, increment: d = 1 }) => {
    let e = g(o), n = S(), r = await t.db.query("weeklyProgress").withIndex(
      "by_player_week",
      (i) => i.eq("playerAddress", e).eq("weekStart", n)
    ).first();
    if (!r) {
      let i = await t.db.insert("weeklyProgress", {
        playerAddress: e,
        weekStart: n,
        quests: P()
      });
      if (r = await t.db.get(i), !r) throw new Error("Failed to create weekly progress");
    }
    let s = { ...r.quests };
    return s[a] && (s[a].current = Math.min(
      (s[a].current || 0) + d,
      s[a].target
    ), s[a].completed = s[a].current >= s[a].target), await t.db.patch(r._id, { quests: s }), { success: !0, progress: s[a] };
  }, "handler")
}), F = _({
  args: {
    address: m.string(),
    won: m.boolean()
  },
  handler: /* @__PURE__ */ y(async (t, { address: o, won: a }) => {
    let d = g(o), e = S(), n = await t.db.query("weeklyProgress").withIndex(
      "by_player_week",
      (l) => l.eq("playerAddress", d).eq("weekStart", e)
    ).first();
    if (!n) {
      let l = await t.db.insert("weeklyProgress", {
        playerAddress: d,
        weekStart: e,
        quests: P(),
        pveStreakCurrent: 0
      });
      if (n = await t.db.get(l), !n) throw new Error("Failed to create weekly progress");
    }
    let r = { ...n.quests }, s = "weekly_pve_streak", i = n.pveStreakCurrent || 0;
    return a ? (i += 1, r[s] && (r[s].current = Math.max(
      r[s].current || 0,
      i
    ), r[s].completed = r[s].current >= r[s].target)) : i = 0, await t.db.patch(n._id, {
      quests: r,
      pveStreakCurrent: i
    }), {
      success: !0,
      currentStreak: i,
      maxStreak: r[s]?.current || 0
    };
  }, "handler")
}), G = _({
  args: {
    address: m.string(),
    questId: m.string()
  },
  handler: /* @__PURE__ */ y(async (t, { address: o, questId: a }) => {
    let d = g(o), e = S(), n = await t.db.query("weeklyProgress").withIndex(
      "by_player_week",
      (p) => p.eq("playerAddress", d).eq("weekStart", e)
    ).first();
    if (!n || !n.quests[a])
      throw new Error("Quest not found");
    let r = n.quests[a];
    if (!r.completed)
      throw new Error("Quest not completed yet");
    if (r.claimed)
      throw new Error("Reward already claimed");
    let s = Object.values(T).find((p) => p.id === a);
    if (!s)
      throw new Error("Quest definition not found");
    let i = await t.db.query("profiles").withIndex("by_address", (p) => p.eq("address", d)).first();
    if (!i)
      throw new Error("Profile not found");
    let l = s.reward, c = i.coins || 0, f = c + l, k = (i.lifetimeEarned || 0) + l;
    await t.db.patch(i._id, {
      coins: f,
      lifetimeEarned: k,
      lastUpdated: Date.now()
    }), await x(t, {
      address: d,
      type: "earn",
      amount: l,
      source: "weekly_quest",
      description: `Completed weekly quest: ${s.name}`,
      balanceBefore: c,
      balanceAfter: f
    }), console.log(`\u{1F4B0} Weekly quest reward added to balance: ${l} TESTVBMS for ${d}. Balance: ${c} \u2192 ${f}`);
    let h = { ...n.quests };
    return h[a].claimed = !0, await t.db.patch(n._id, { quests: h }), {
      success: !0,
      reward: l,
      newBalance: f,
      questName: s.description
    };
  }, "handler")
}), H = A({
  args: {},
  handler: /* @__PURE__ */ y(async (t) => {
    let o = await t.db.query("profiles").withIndex("by_total_power").order("desc").take(10);
    if (o.length === 0)
      return { distributed: 0, rewards: [] };
    let a = [];
    for (let d = 0; d < o.length; d++) {
      let e = d + 1, n = o[d], r = 0;
      if (e === 1 ? r = b.rank1 : e === 2 ? r = b.rank2 : e === 3 ? r = b.rank3 : e <= 10 && (r = b.rank4to10), r > 0) {
        let s = n.coins || 0;
        await t.db.patch(n._id, {
          coins: s + r,
          lifetimeEarned: (n.lifetimeEarned || 0) + r
        }), await t.db.insert("coinTransactions", {
          address: n.address.toLowerCase(),
          amount: r,
          type: "earn",
          source: "weekly_quest",
          description: `Weekly quest reward (rank ${e})`,
          timestamp: Date.now(),
          balanceBefore: n.coins || 0,
          balanceAfter: (n.coins || 0) + r
        }), console.log(`\u{1F4B0} Weekly leaderboard reward added to balance: ${r} TESTVBMS for ${n.address}. Balance: ${s} \u2192 ${s + r}`), a.push({
          rank: e,
          username: n.username,
          address: n.address,
          reward: r
        });
      }
    }
    return {
      distributed: a.length,
      rewards: a,
      timestamp: Date.now()
    };
  }, "handler")
}), K = D({
  args: { address: m.string() },
  handler: /* @__PURE__ */ y(async (t, { address: o }) => {
    let a = g(o), d = S(), e = await t.db.query("weeklyRewards").withIndex(
      "by_player_week",
      (c) => c.eq("playerAddress", a).eq("weekStart", d)
    ).first();
    if (e)
      return {
        eligible: !1,
        reason: "already_claimed",
        rank: e.rank,
        reward: e.reward,
        claimed: !0,
        claimedAt: e.claimedAt,
        nextResetDate: q()
      };
    let n = await t.db.query("leaderboardCache").withIndex("by_type", (c) => c.eq("type", "top10_power")).first(), r;
    n && n.addresses.length > 0 ? r = n.addresses : r = (await t.db.query("profiles").withIndex("by_total_power").order("desc").take(10)).map((f) => g(f.address));
    let s = r.indexOf(a);
    if (s === -1)
      return {
        eligible: !1,
        reason: "not_top_10",
        rank: null,
        reward: 0,
        claimed: !1,
        nextResetDate: q()
      };
    let i = s + 1, l = 0;
    return i === 1 ? l = b.rank1 : i === 2 ? l = b.rank2 : i === 3 ? l = b.rank3 : i <= 10 && (l = b.rank4to10), {
      eligible: !0,
      reason: "can_claim",
      rank: i,
      reward: l,
      claimed: !1,
      nextResetDate: q()
    };
  }, "handler")
}), Y = _({
  args: { address: m.string() },
  handler: /* @__PURE__ */ y(async (t, { address: o }) => {
    let a = g(o), d = S(), e = await t.db.query("profiles").withIndex("by_total_power").order("desc").take(10), n = e.findIndex(
      (h) => g(h.address) === a
    );
    if (n === -1)
      throw new Error("Not eligible: Must be in TOP 10 leaderboard");
    let r = n + 1, s = e[n], i = 0;
    if (r === 1 ? i = b.rank1 : r === 2 ? i = b.rank2 : r === 3 ? i = b.rank3 : r <= 10 && (i = b.rank4to10), await t.db.query("weeklyRewards").withIndex(
      "by_player_week",
      (h) => h.eq("playerAddress", a).eq("weekStart", d)
    ).first())
      throw new Error("Already claimed reward for this week");
    let c = s.coins || 0, f = c + i, k = (s.lifetimeEarned || 0) + i;
    return console.log("[claimWeeklyLeaderboardReward] Adding to coins:", {
      address: a,
      currentBalance: c,
      reward: i,
      newBalance: f
    }), await t.db.patch(s._id, {
      coins: f,
      lifetimeEarned: k,
      lastUpdated: Date.now()
    }), console.log(`\u{1F4B0} Weekly leaderboard reward added to balance: ${i} TESTVBMS for ${a}. Balance: ${c} \u2192 ${f}`), await t.db.insert("weeklyRewards", {
      playerAddress: a,
      username: s.username,
      weekStart: d,
      rank: r,
      reward: i,
      claimedAt: Date.now(),
      method: "manual_claim"
      // vs "auto_distribution"
    }), {
      success: !0,
      rank: r,
      reward: i,
      newBalance: f,
      rewardName: `Leaderboard Rank #${r}`,
      nextResetDate: q()
    };
  }, "handler")
});
function P() {
  return Object.fromEntries(
    Object.values(T).map((t) => [
      t.id,
      {
        current: 0,
        target: t.target,
        completed: !1,
        claimed: !1
      }
    ])
  );
}
y(P, "initializeWeeklyQuests");
function S() {
  let t = /* @__PURE__ */ new Date(), o = t.getUTCDay(), a = new Date(t);
  return a.setUTCDate(t.getUTCDate() - o), a.setUTCHours(0, 0, 0, 0), a.toISOString().split("T")[0];
}
y(S, "getLastSunday");
function q() {
  let t = /* @__PURE__ */ new Date(), o = t.getUTCDay(), a = new Date(t);
  return a.setUTCDate(t.getUTCDate() + (7 - o)), a.setUTCHours(0, 0, 0, 0), a.toISOString().split("T")[0];
}
y(q, "getNextSunday");
var J = A({
  args: {},
  handler: /* @__PURE__ */ y(async (t) => {
    let a = (await t.db.query("profiles").withIndex("by_total_power").order("desc").take(10)).map((e) => g(e.address)), d = await t.db.query("leaderboardCache").withIndex("by_type", (e) => e.eq("type", "top10_power")).first();
    return d ? await t.db.patch(d._id, {
      addresses: a,
      updatedAt: Date.now()
    }) : await t.db.insert("leaderboardCache", {
      type: "top10_power",
      addresses: a,
      updatedAt: Date.now()
    }), { updated: !0, count: a.length };
  }, "handler")
});
export {
  b as WEEKLY_LEADERBOARD_REWARDS,
  K as checkWeeklyRewardEligibility,
  N as claimQuestReward,
  Y as claimWeeklyLeaderboardReward,
  G as claimWeeklyReward,
  H as distributeWeeklyRewards,
  U as ensureDailyQuest,
  L as generateDailyQuest,
  M as getDailyQuest,
  z as getQuestProgress,
  V as getWeeklyProgress,
  J as updateLeaderboardCache,
  F as updatePveStreak,
  j as updateWeeklyProgress
};
//# sourceMappingURL=quests.js.map
