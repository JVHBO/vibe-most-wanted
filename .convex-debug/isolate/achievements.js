import {
  f as y
} from "./_deps/5IIR4IPG.js";
import {
  a as b,
  c as v
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h
} from "./_deps/34SVKERO.js";
import {
  a as f
} from "./_deps/5B5TEMMX.js";

// convex/achievements.ts
var x = b({
  args: {
    playerAddress: h.string()
  },
  handler: /* @__PURE__ */ f(async (o, p) => {
    let { playerAddress: c } = p, r = c.toLowerCase(), a = await o.db.query("achievements").withIndex("by_player", (t) => t.eq("playerAddress", r)).collect(), s = new Map(
      a.map((t) => [t.achievementId, t])
    );
    return y.map((t) => {
      let l = s.get(t.id);
      return {
        ...t,
        progress: l?.progress || 0,
        completed: l?.completed || !1,
        claimedAt: l?.claimedAt,
        completedAt: l?.completedAt,
        _id: l?._id
      };
    });
  }, "handler")
}), F = v({
  args: {
    playerAddress: h.string(),
    nfts: h.array(h.any())
    // Player's NFT collection
  },
  handler: /* @__PURE__ */ f(async (o, p) => {
    let { playerAddress: c, nfts: r } = p, a = c.toLowerCase(), s = [], i = /* @__PURE__ */ f((n) => !(!(n.collection === "vibe" || n.collection === "Vibe Most Wanted" || n.collection === "vbms" || n.collection === "VBMS" || !n.collection) || n.collection === "feature" || n.collection === "Feature Collection" || n.free === !0 || n.isFree === !0), "isVibeCard"), t = /* @__PURE__ */ f((n) => r.filter((e) => i(e) && e.rarity === n).length, "countByRarity"), l = /* @__PURE__ */ f((n) => r.filter((e) => i(e) && e.wear === n).length, "countByWear"), m = /* @__PURE__ */ f((n) => r.filter((e) => i(e) && e.foil === n).length, "countByFoil");
    for (let n of y) {
      let { id: e, requirement: d } = n, g = 0;
      d.type === "have_rarity" ? g = t(d.rarity) : d.type === "have_wear" ? g = l(d.wear) : d.type === "have_foil" ? g = m(d.foil) : d.type === "collect_count" && (d.rarity ? g = t(d.rarity) : d.wear ? g = l(d.wear) : d.foil && (g = m(d.foil)));
      let u = g >= d.count, w = await o.db.query("achievements").withIndex(
        "by_player_achievement",
        (A) => A.eq("playerAddress", a).eq("achievementId", e)
      ).first();
      if (w) {
        let A = w.completed;
        await o.db.patch(w._id, {
          progress: g,
          completed: u,
          completedAt: u && !A ? Date.now() : w.completedAt
        }), u && !A && s.push(e);
      } else
        await o.db.insert("achievements", {
          playerAddress: a,
          achievementId: e,
          category: n.category,
          completed: u,
          progress: g,
          target: d.count,
          completedAt: u ? Date.now() : void 0
        }), u && s.push(e);
    }
    return {
      success: !0,
      newlyCompleted: s,
      newlyCompletedCount: s.length
    };
  }, "handler")
}), $ = v({
  args: {
    playerAddress: h.string(),
    achievementId: h.string()
  },
  handler: /* @__PURE__ */ f(async (o, p) => {
    let { playerAddress: c, achievementId: r } = p, a = c.toLowerCase(), s = y.find((e) => e.id === r);
    if (!s)
      throw new Error(`Achievement ${r} not found in definitions`);
    let i = await o.db.query("achievements").withIndex(
      "by_player_achievement",
      (e) => e.eq("playerAddress", a).eq("achievementId", r)
    ).first();
    if (!i)
      throw new Error("Achievement not unlocked yet");
    if (!i.completed)
      throw new Error("Achievement not completed yet");
    if (i.claimedAt)
      throw new Error("Achievement reward already claimed");
    let t = await o.db.query("profiles").withIndex("by_address", (e) => e.eq("address", a)).first();
    if (!t && c !== a && (t = await o.db.query("profiles").withIndex("by_address", (e) => e.eq("address", c)).first()), !t)
      throw new Error("Profile not found");
    await o.db.patch(i._id, {
      claimedAt: Date.now()
    });
    let l = t.coins || 0, m = l + s.reward, n = (t.lifetimeEarned || 0) + s.reward;
    return console.log("[claimAchievementReward] Adding coins:", {
      address: a,
      achievementId: r,
      oldCoins: l,
      reward: s.reward,
      newCoins: m
    }), await o.db.patch(t._id, {
      coins: m,
      lifetimeEarned: n,
      lastUpdated: Date.now()
    }), {
      success: !0,
      reward: s.reward,
      newBalance: m,
      achievementName: s.name,
      achievementId: s.id
    };
  }, "handler")
}), S = b({
  args: {
    playerAddress: h.string()
  },
  handler: /* @__PURE__ */ f(async (o, p) => {
    let { playerAddress: c } = p, r = c.toLowerCase(), a = await o.db.query("achievements").withIndex("by_player", (e) => e.eq("playerAddress", r)).collect(), s = y.length, i = a.filter((e) => e.completed).length, t = a.filter((e) => e.claimedAt).length, l = i - t, m = a.filter((e) => e.completed && !e.claimedAt).reduce((e, d) => {
      let g = y.find((u) => u.id === d.achievementId);
      return e + (g?.reward || 0);
    }, 0), n = {
      rarity: a.filter((e) => e.category === "rarity"),
      wear: a.filter((e) => e.category === "wear"),
      foil: a.filter((e) => e.category === "foil"),
      progressive: a.filter((e) => e.category === "progressive"),
      social: a.filter((e) => e.category === "social")
    };
    return {
      totalAchievements: s,
      completedCount: i,
      claimedCount: t,
      unclaimedCount: l,
      unclaimedRewards: m,
      completionPercentage: Math.round(i / s * 100),
      byCategory: {
        rarity: {
          total: y.filter((e) => e.category === "rarity").length,
          completed: n.rarity.filter((e) => e.completed).length
        },
        wear: {
          total: y.filter((e) => e.category === "wear").length,
          completed: n.wear.filter((e) => e.completed).length
        },
        foil: {
          total: y.filter((e) => e.category === "foil").length,
          completed: n.foil.filter((e) => e.completed).length
        },
        progressive: {
          total: y.filter((e) => e.category === "progressive").length,
          completed: n.progressive.filter((e) => e.completed).length
        },
        social: {
          total: y.filter((e) => e.category === "social").length,
          completed: n.social.filter((e) => e.completed).length
        }
      }
    };
  }, "handler")
}), B = v({
  args: {
    playerAddress: h.string(),
    achievementId: h.string()
    // "enable_notifications" or "add_miniapp"
  },
  handler: /* @__PURE__ */ f(async (o, p) => {
    let { playerAddress: c, achievementId: r } = p, a = c.toLowerCase();
    if (!y.find(
      (t) => t.id === r && t.category === "social"
    ))
      return console.log(`[grantSocialAchievement] Invalid social achievement: ${r}`), { success: !1, reason: "invalid_achievement" };
    let i = await o.db.query("achievements").withIndex(
      "by_player_achievement",
      (t) => t.eq("playerAddress", a).eq("achievementId", r)
    ).first();
    return i ? (console.log(`[grantSocialAchievement] Achievement ${r} already exists for ${a}`), { success: !0, alreadyGranted: !0, completed: i.completed }) : (await o.db.insert("achievements", {
      playerAddress: a,
      achievementId: r,
      category: "social",
      completed: !0,
      progress: 1,
      target: 1,
      completedAt: Date.now()
    }), console.log(`[grantSocialAchievement] \u2705 Granted ${r} to ${a}`), { success: !0, alreadyGranted: !1, completed: !0 });
  }, "handler")
}), D = v({
  args: {
    fid: h.string(),
    achievementId: h.string()
    // "enable_notifications" or "add_miniapp"
  },
  handler: /* @__PURE__ */ f(async (o, p) => {
    let { fid: c, achievementId: r } = p;
    if (!y.find(
      (m) => m.id === r && m.category === "social"
    ))
      return console.log(`[grantSocialAchievementByFid] Invalid social achievement: ${r}`), { success: !1, reason: "invalid_achievement" };
    let s = parseInt(c, 10);
    if (isNaN(s))
      return console.log(`[grantSocialAchievementByFid] Invalid FID format: ${c}`), { success: !1, reason: "invalid_fid" };
    let i = await o.db.query("profiles").withIndex("by_fid", (m) => m.eq("farcasterFid", s)).first();
    if (!i)
      return console.log(`[grantSocialAchievementByFid] No profile found for FID ${c}`), { success: !1, reason: "profile_not_found" };
    let t = i.address.toLowerCase(), l = await o.db.query("achievements").withIndex(
      "by_player_achievement",
      (m) => m.eq("playerAddress", t).eq("achievementId", r)
    ).first();
    return l ? (console.log(`[grantSocialAchievementByFid] Achievement ${r} already exists for FID ${c}`), { success: !0, alreadyGranted: !0, completed: l.completed }) : (await o.db.insert("achievements", {
      playerAddress: t,
      achievementId: r,
      category: "social",
      completed: !0,
      progress: 1,
      target: 1,
      completedAt: Date.now()
    }), console.log(`[grantSocialAchievementByFid] \u2705 Granted ${r} to FID ${c} (${t})`), { success: !0, alreadyGranted: !1, completed: !0 });
  }, "handler")
}), E = b({
  args: {
    playerAddress: h.string()
  },
  handler: /* @__PURE__ */ f(async (o, p) => {
    let { playerAddress: c } = p, r = c.toLowerCase();
    return (await o.db.query("achievements").withIndex("by_player", (i) => i.eq("playerAddress", r)).collect()).filter((i) => i.completed && !i.claimedAt).map((i) => {
      let t = y.find((l) => l.id === i.achievementId);
      return {
        ...i,
        ...t
      };
    });
  }, "handler")
});
export {
  F as checkAndUpdateAchievements,
  $ as claimAchievementReward,
  S as getAchievementStats,
  x as getPlayerAchievements,
  E as getUnclaimedAchievements,
  B as grantSocialAchievement,
  D as grantSocialAchievementByFid
};
//# sourceMappingURL=achievements.js.map
