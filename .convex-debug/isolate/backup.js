import {
  b as i
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as r
} from "./_deps/34SVKERO.js";
import {
  a as s
} from "./_deps/5B5TEMMX.js";

// convex/backup.ts
var p = i({
  args: { limit: r.optional(r.number()) },
  handler: /* @__PURE__ */ s(async (e, a) => {
    let t = a.limit || 100;
    return await e.db.query("profiles").take(t);
  }, "handler")
}), h = i({
  args: { limit: r.optional(r.number()) },
  handler: /* @__PURE__ */ s(async (e, a) => {
    let t = a.limit || 100;
    return await e.db.query("matches").take(t);
  }, "handler")
}), g = i({
  args: { limit: r.optional(r.number()) },
  handler: /* @__PURE__ */ s(async (e, a) => {
    let t = a.limit || 100;
    return await e.db.query("achievements").take(t);
  }, "handler")
}), y = i({
  args: { limit: r.optional(r.number()) },
  handler: /* @__PURE__ */ s(async (e, a) => {
    let t = a.limit || 100;
    return await e.db.query("questProgress").take(t);
  }, "handler")
}), b = i({
  args: { limit: r.optional(r.number()) },
  handler: /* @__PURE__ */ s(async (e, a) => {
    let t = a.limit || 50;
    return await e.db.query("rooms").take(t);
  }, "handler")
}), k = i({
  args: { limit: r.optional(r.number()) },
  handler: /* @__PURE__ */ s(async (e, a) => {
    let t = a.limit || 100;
    try {
      return await e.db.query("weeklyRewards").take(t);
    } catch {
      return [];
    }
  }, "handler")
}), S = i({
  args: {},
  handler: /* @__PURE__ */ s(async (e) => {
    let [
      t,
      l,
      n,
      o,
      m,
      u
    ] = await Promise.all([
      e.db.query("profiles").take(50),
      e.db.query("matches").take(50),
      e.db.query("achievements").take(50),
      e.db.query("questProgress").take(50),
      e.db.query("rooms").take(50),
      e.db.query("weeklyRewards").take(50).catch(() => [])
    ]);
    return {
      timestamp: Date.now(),
      profiles: t,
      matches: l,
      achievements: n,
      questProgress: o,
      rooms: m,
      weeklyRewards: u,
      stats: {
        profilesSampled: t.length,
        matchesSampled: l.length,
        achievementsSampled: n.length,
        questProgressSampled: o.length,
        roomsSampled: m.length,
        weeklyRewardsSampled: u.length
      },
      note: "This is a sample backup. Use individual queries with pagination for full backup."
    };
  }, "handler")
});
export {
  g as getAllAchievements,
  h as getAllMatches,
  p as getAllProfiles,
  b as getAllPvPRooms,
  y as getAllQuestProgress,
  k as getAllWeeklyRewards,
  S as getCompleteBackup
};
//# sourceMappingURL=backup.js.map
