import {
  b as w
} from "./_deps/AWJMSRP7.js";
import {
  a as $,
  b,
  c as k,
  e as x,
  f as h
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as i
} from "./_deps/34SVKERO.js";
import {
  a as c
} from "./_deps/5B5TEMMX.js";

// convex/notifications.ts
var M = $({
  args: { fid: i.string() },
  handler: /* @__PURE__ */ c(async (e, { fid: n }) => await e.db.query("notificationTokens").withIndex("by_fid", (t) => t.eq("fid", n)).first(), "handler")
}), U = b({
  args: { fid: i.string() },
  handler: /* @__PURE__ */ c(async (e, { fid: n }) => await e.db.query("notificationTokens").withIndex("by_fid", (t) => t.eq("fid", n)).first(), "handler")
}), q = b({
  args: { fid: i.string() },
  handler: /* @__PURE__ */ c(async (e, { fid: n }) => await e.db.query("notificationTokens").withIndex("by_fid", (t) => t.eq("fid", n)).take(10), "handler")
}), O = b({
  args: {},
  handler: /* @__PURE__ */ c(async (e) => await e.db.query("notificationTokens").take(5e4), "handler")
});
function F(e) {
  return e.includes("neynar") ? "neynar" : "warpcast";
}
c(F, "getPlatformFromUrl");
var V = k({
  args: {
    fid: i.string(),
    token: i.string(),
    url: i.string(),
    app: i.optional(i.string())
    // "vbms" or "vibefid"
  },
  handler: /* @__PURE__ */ c(async (e, { fid: n, token: o, url: t, app: s }) => {
    let a = Date.now(), r = F(t), d = s || "vbms", u = await e.db.query("notificationTokens").withIndex("by_fid", (l) => l.eq("fid", n)).take(10), f = u.find((l) => l.platform === r && l.app === d);
    if (f)
      return await e.db.patch(f._id, {
        token: o,
        url: t,
        platform: r,
        app: d,
        lastUpdated: a
      }), console.log(`\u2705 Updated ${r}/${d} notification token for FID ${n}`), f._id;
    {
      let l = u.find((g) => g.platform === r && !g.app);
      if (l)
        return await e.db.patch(l._id, {
          app: d,
          token: o,
          url: t,
          platform: r,
          lastUpdated: a
        }), console.log(`\u{1F504} Migrated legacy token for FID ${n} to ${r}/${d}`), l._id;
      let y = await e.db.insert("notificationTokens", {
        fid: n,
        token: o,
        url: t,
        platform: r,
        app: d,
        createdAt: a,
        lastUpdated: a
      });
      return console.log(`\u2705 Created ${r}/${d} notification token for FID ${n}`), y;
    }
  }, "handler")
}), j = k({
  args: { fid: i.string() },
  handler: /* @__PURE__ */ c(async (e, { fid: n }) => {
    let o = await e.db.query("notificationTokens").withIndex("by_fid", (t) => t.eq("fid", n)).first();
    return o ? (await e.db.delete(o._id), console.log(`\u274C Removed notification token for FID ${n}`), !0) : (console.log(`\u26A0\uFE0F No token found for FID ${n}`), !1);
  }, "handler")
}), z = k({
  args: {
    tokens: i.array(
      i.object({
        fid: i.string(),
        token: i.string(),
        url: i.string(),
        createdAt: i.optional(i.number())
      })
    )
  },
  handler: /* @__PURE__ */ c(async (e, { tokens: n }) => {
    let o = 0, t = 0;
    for (let s of n) {
      let a = Date.now(), r = await e.db.query("notificationTokens").withIndex("by_fid", (d) => d.eq("fid", s.fid)).first();
      r ? (await e.db.patch(r._id, {
        token: s.token,
        url: s.url,
        lastUpdated: a
      }), t++) : (await e.db.insert("notificationTokens", {
        fid: s.fid,
        token: s.token,
        url: s.url,
        createdAt: s.createdAt || a,
        lastUpdated: a
      }), o++);
    }
    return console.log(`\u2705 Imported ${o} tokens, updated ${t} tokens`), { imported: o, updated: t };
  }, "handler")
});
async function _(e, n, o, t = "https://vibemostwanted.xyz") {
  let s = process.env.NEYNAR_API_KEY;
  if (!s)
    return console.error("\u274C NEYNAR_API_KEY not configured"), { success_count: 0, failure_count: e.length || 0, not_attempted_count: 0 };
  try {
    let a = {
      target_fids: e,
      notification: {
        title: n.slice(0, 32),
        body: o.slice(0, 128),
        target_url: t,
        uuid: crypto.randomUUID()
      }
    }, r = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": s
      },
      body: JSON.stringify(a)
    });
    if (!r.ok) {
      let u = await r.text();
      return console.error(`\u274C Neynar API error: ${r.status} - ${u}`), { success_count: 0, failure_count: e.length || 0, not_attempted_count: 0 };
    }
    let d = await r.json();
    return {
      success_count: d.success_count || 0,
      failure_count: d.failure_count || 0,
      not_attempted_count: d.not_attempted_count || 0
    };
  } catch (a) {
    return console.error(`\u274C Neynar fetch error: ${a.message}`), { success_count: 0, failure_count: e.length || 0, not_attempted_count: 0 };
  }
}
c(_, "sendViaNeynar");
var K = {
  common: 720 * 60 * 1e3,
  // 12 hours
  rare: 1440 * 60 * 1e3,
  // 1 day
  epic: 2880 * 60 * 1e3,
  // 2 days
  legendary: 5760 * 60 * 1e3,
  // 4 days
  mythic: 7200 * 60 * 1e3,
  // 5 days
  vibefid: 0
  // Infinite
}, T = 3600 * 1e3, E = 360 * 60 * 1e3, W = h({
  args: {},
  // @ts-ignore
  handler: /* @__PURE__ */ c(async (e) => {
    let { api: n } = await import("./_deps/4SZP7OOE.js");
    try {
      console.log("\u26A1 Checking for low energy raid decks...");
      let o = await e.runQuery(w.notifications.getAllRaidDecks);
      (!o || o.length === 0) && console.log("\u26A0\uFE0F No raid decks found"), console.log(`\u{1F4CA} Found ${o.length} raid decks to check`);
      let t = Date.now(), s = 0, a = 0, r = 0, d = 100;
      for (let u = 0; u < o.length; u++) {
        let f = o[u], l = 0, y = 0;
        for (let g of f.cardEnergy) {
          if (g.energyExpiresAt === 0) continue;
          let p = g.energyExpiresAt - t;
          p <= 0 ? y++ : p <= T && l++;
        }
        if (!(l === 0 && y === 0)) {
          try {
            let g = await e.runQuery(
              w.notificationsHelpers.getLastLowEnergyNotification,
              { address: f.address }
            );
            if (g && t - g.lastNotifiedAt < E) {
              let v = Math.round((E - (t - g.lastNotifiedAt)) / 36e5);
              console.log(`\u23ED\uFE0F Skipping ${f.address} - notified ${v}h ago (cooldown: 6h)`), r++;
              continue;
            }
            let p = await e.runQuery(w.notifications.getProfileByAddress, {
              address: f.address
            });
            if (!p) {
              console.log(`\u26A0\uFE0F No profile found for ${f.address}`);
              continue;
            }
            let m = p.fid || (p.farcasterFid ? p.farcasterFid.toString() : null);
            if (!m) {
              console.log(`\u26A0\uFE0F No FID found for ${f.address}`);
              continue;
            }
            let I = parseInt(m);
            if (isNaN(I)) {
              console.log(`\u26A0\uFE0F Invalid FID for ${f.address}: ${m}`);
              continue;
            }
            if (y > 0) {
              console.log(`\u23ED\uFE0F Skipping expired cards notification for ${f.address} - using UI indicator instead`);
              continue;
            }
            let A = "\u26A1 Low Energy Warning!", D = Math.round(T / 6e4), S = `${l} card${l > 1 ? "s" : ""} will run out of energy in less than ${D} minutes!`;
            (await _([I], A, S, "https://vibemostwanted.xyz")).success_count > 0 ? (s++, await e.runMutation(w.notificationsHelpers.updateLowEnergyNotification, {
              address: f.address,
              lowEnergyCount: l,
              expiredCount: y
            }), console.log(`\u2705 Sent low energy notification to FID ${m}`)) : (a++, console.log(`\u274C Failed for FID ${m}`));
          } catch (g) {
            console.error(`\u274C Exception for ${f.address}:`, g), a++;
          }
          u < o.length - 1 && await P(d);
        }
      }
      return console.log(`\u{1F4CA} Low energy notifications: ${s} sent, ${a} failed, ${r} skipped (cooldown), ${o.length} total`), { sent: s, failed: a, skipped: r, total: o.length };
    } catch (o) {
      throw console.error("\u274C Error in sendLowEnergyNotifications:", o), o;
    }
  }, "handler")
}), H = b({
  args: {},
  handler: /* @__PURE__ */ c(async (e) => await e.db.query("raidAttacks").take(200), "handler")
}), Q = b({
  args: { address: i.string() },
  handler: /* @__PURE__ */ c(async (e, { address: n }) => await e.db.query("profiles").withIndex("by_address", (t) => t.eq("address", n.toLowerCase())).first(), "handler")
}), J = h({
  args: {},
  // @ts-ignore
  handler: /* @__PURE__ */ c(async (e) => {
    try {
      console.log("\u{1F4EC} Sending daily login reminder via Neynar...");
      let t = await _([], "\u{1F4B0} Daily Login Bonus!", "Claim your free coins! Don't miss today's reward \u{1F381}", "https://vibemostwanted.xyz");
      return console.log(`\u{1F4CA} Daily login: ${t.success_count} sent, ${t.failure_count} failed`), { sent: t.success_count, failed: t.failure_count, total: t.success_count + t.failure_count + t.not_attempted_count };
    } catch (n) {
      throw console.error("\u274C Error in sendDailyLoginReminder:", n), n;
    }
  }, "handler")
}), G = h({
  args: {
    castAuthor: i.string(),
    warpcastUrl: i.string(),
    winnerUsername: i.optional(i.string())
  },
  // @ts-ignore
  handler: /* @__PURE__ */ c(async (e, { castAuthor: n, warpcastUrl: o, winnerUsername: t }) => {
    try {
      console.log("\u{1F3AC} Sending featured cast notification via Neynar...");
      let s = "\u{1F3AF} New Wanted Cast!", a = t ? `@${t} won the auction! @${n} is now WANTED! Interact to earn VBMS \u{1F4B0}` : `@${n} is now WANTED! Interact to earn VBMS tokens! \u{1F4B0}`, r = await _([], s, a, "https://vibemostwanted.xyz");
      return console.log(`\u{1F4CA} Featured cast notification: ${r.success_count} sent, ${r.failure_count} failed`), { sent: r.success_count, failed: r.failure_count, total: r.success_count + r.failure_count + r.not_attempted_count };
    } catch (s) {
      throw console.error("\u274C Error in sendFeaturedCastNotification:", s), s;
    }
  }, "handler")
}), X = h({
  args: {
    winnerFid: i.number(),
    winnerUsername: i.string(),
    bidAmount: i.number(),
    castAuthor: i.string()
  },
  handler: /* @__PURE__ */ c(async (e, { winnerFid: n, winnerUsername: o, bidAmount: t, castAuthor: s }) => {
    let a = "\u{1F3C6} Your Cast Won!", r = `Congrats @${o}! Your bid of ${t.toLocaleString()} VBMS won! @${s} is now WANTED!`;
    console.log(`\u{1F3C6} Sending winner notification to FID ${n} (@${o})...`);
    let u = (await _([n], a, r, "https://vibemostwanted.xyz")).success_count > 0;
    return console.log(`\u{1F3C6} Winner notification: ${u ? "sent" : "failed"}`), { sent: u, neynarSent: u, warpcastSent: !1 };
  }, "handler")
}), Z = h({
  args: {
    fid: i.number(),
    title: i.string(),
    body: i.string()
  },
  handler: /* @__PURE__ */ c(async (e, { fid: n, title: o, body: t }) => {
    if (!process.env.NEYNAR_API_KEY)
      return { error: "NEYNAR_API_KEY not set" };
    let s = crypto.randomUUID(), a = {
      target_fids: [n],
      notification: {
        title: o,
        body: t,
        target_url: "https://vibemostwanted.xyz",
        uuid: s
      }
    };
    console.log(`\u{1F9EA} TEST: Sending to FID ${n} via Neynar...`), console.log("\u{1F9EA} Payload:", JSON.stringify(a));
    try {
      let r = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEYNAR_API_KEY
        },
        body: JSON.stringify(a)
      }), d = await r.json();
      return console.log(`\u{1F9EA} Response (${r.status}):`, JSON.stringify(d)), { status: r.status, result: d };
    } catch (r) {
      return console.log("\u{1F9EA} Error:", r?.message || r), { error: r?.message || "Unknown error" };
    }
  }, "handler")
});
function P(e) {
  return new Promise((n) => setTimeout(n, e));
}
c(P, "sleep");
var N = [
  {
    title: "\u{1F3AF} Pro Tip",
    body: "Attack players from the leaderboard to steal their coins! The higher their rank, the bigger the reward! \u{1F451}"
  },
  {
    title: "\u{1F6E1}\uFE0F Defense Strategy",
    body: "Set up your Defense Deck to protect your coins when offline! Choose your 5 best cards wisely! \u{1F0CF}"
  },
  {
    title: "\u26A1 Power Boost Tip",
    body: "Open more packs to get stronger cards! Higher power = more wins = more coins! \u{1F4B0}"
  },
  {
    title: "\u{1F916} Mecha Arena Tip",
    body: "Build your Mecha and battle in the Arena! Bet $VBMS and crush your opponents with powerful combos! \u2694\uFE0F"
  },
  {
    title: "\u{1F381} Daily Free Card!",
    body: "Visit the Shop to claim your FREE card every day! No VBMS needed - just tap and collect! \u{1F0CF}"
  }
], tt = h({
  args: {},
  // @ts-ignore
  handler: /* @__PURE__ */ c(async (e) => {
    let { api: n } = await import("./_deps/4SZP7OOE.js");
    try {
      console.log("\u{1F4A1} Starting periodic tip notification via Neynar...");
      let o = await e.runQuery(w.notificationsHelpers.getTipState);
      if (!o._id) {
        let r = await e.runMutation(n.notificationsHelpers.initTipState);
        o = { currentTipIndex: 0, lastSentAt: Date.now(), _id: r };
      }
      let t = N[o.currentTipIndex % N.length], s = await _([], t.title, t.body, "https://vibemostwanted.xyz"), a = (o.currentTipIndex + 1) % N.length;
      return await e.runMutation(n.notificationsHelpers.updateTipState, {
        tipStateId: o._id,
        currentTipIndex: a
      }), console.log(`\u{1F4CA} Periodic tip: ${s.success_count} sent, ${s.failure_count} failed`), console.log(`\u{1F4DD} Sent tip ${o.currentTipIndex + 1}/${N.length}: "${t.title}"`), { sent: s.success_count, failed: s.failure_count, total: s.success_count + s.failure_count + s.not_attempted_count, tipIndex: o.currentTipIndex };
    } catch (o) {
      throw console.error("\u274C Error in sendPeriodicTip:", o), o;
    }
  }, "handler")
}), et = k({
  args: {},
  handler: /* @__PURE__ */ c(async (e) => (console.log("\u{1F4A1} Scheduling periodic tip notification..."), await e.scheduler.runAfter(0, w.notifications.sendPeriodicTip, {}), { scheduled: !0 }), "handler")
}), ot = k({
  args: {},
  handler: /* @__PURE__ */ c(async (e) => (console.log("\u{1F4B0} Scheduling daily login reminder..."), await e.scheduler.runAfter(0, w.notifications.sendDailyLoginReminder, {}), { scheduled: !0 }), "handler")
}), nt = x({
  args: {
    title: i.string(),
    body: i.string()
  },
  handler: /* @__PURE__ */ c(async (e, { title: n, body: o }) => {
    try {
      console.log(`\u{1F4EC} Sending custom notification via Neynar: "${n}"`);
      let t = await _([], n, o, "https://vibemostwanted.xyz");
      return console.log(`\u{1F4CA} Custom notification: ${t.success_count} sent, ${t.failure_count} failed`), { sent: t.success_count, failed: t.failure_count, total: t.success_count + t.failure_count + t.not_attempted_count };
    } catch (t) {
      throw console.error("\u274C Error in sendCustomNotification:", t), t;
    }
  }, "handler")
}), rt = h({
  args: {
    bossName: i.string(),
    bossRarity: i.string(),
    totalContributors: i.number(),
    contributorAddresses: i.array(i.string())
  },
  // @ts-ignore
  handler: /* @__PURE__ */ c(async (e, { bossName: n, bossRarity: o, totalContributors: t, contributorAddresses: s }) => {
    try {
      console.log("\u{1F409} Sending boss defeated notifications for: " + n);
      let a = [];
      for (let y of s)
        try {
          let g = await e.runQuery(w.notifications.getProfileByAddress, { address: y });
          if (!g) continue;
          let p = g.fid || (g.farcasterFid ? g.farcasterFid.toString() : null);
          if (!p) continue;
          let m = parseInt(p);
          isNaN(m) || a.push(m);
        } catch (g) {
          console.error("\u274C Error getting FID for " + y + ":", g);
        }
      if (a.length === 0)
        return console.log("\u26A0\uFE0F No contributor FIDs found"), { sent: 0, failed: 0, total: t };
      let d = {
        common: "\u26AA",
        rare: "\u{1F535}",
        epic: "\u{1F7E3}",
        legendary: "\u{1F7E1}",
        mythic: "\u{1F534}"
      }[o.toLowerCase()] || "\u26AB", u = "\u{1F389} Boss Defeated!", f = d + " " + n + " was slain! Claim your reward now! \u{1F4B0}", l = await _(a, u, f, "https://vibemostwanted.xyz");
      return console.log("\u{1F4CA} Boss defeated notifications: " + l.success_count + " sent, " + l.failure_count + " failed out of " + t + " contributors"), { sent: l.success_count, failed: l.failure_count, total: t };
    } catch (a) {
      throw console.error("\u274C Error in sendBossDefeatedNotifications:", a), a;
    }
  }, "handler")
}), it = h({
  args: {
    recipientFid: i.number(),
    hasAudio: i.boolean()
  },
  handler: /* @__PURE__ */ c(async (e, { recipientFid: n, hasAudio: o }) => {
    let t = "\u{1F48C} New VibeMail!", s = o ? "Someone sent you a message with a sound! \u{1F3B5} Check your inbox" : "Someone sent you an anonymous message! Check your inbox", a = process.env.NEYNAR_API_KEY_VIBEFID || process.env.NEYNAR_API_KEY;
    if (!a)
      return console.log("\u{1F4F1} No NEYNAR_API_KEY_VIBEFID configured"), { sent: !1 };
    try {
      let r = crypto.randomUUID(), u = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": a
        },
        body: JSON.stringify({
          target_fids: [n],
          notification: { title: t, body: s, target_url: "https://vibefid.xyz", uuid: r }
        })
      });
      if (u.ok)
        return console.log(`\u2705 VibeMail notification sent to FID ${n}`), { sent: !0 };
      {
        let f = await u.text();
        return console.log(`\u274C VibeMail notification failed: ${f}`), { sent: !1 };
      }
    } catch (r) {
      return console.log(`\u274C VibeMail notification error: ${r.message}`), { sent: !1 };
    }
  }, "handler")
});
export {
  H as getAllRaidDecks,
  O as getAllTokens,
  q as getAllTokensByFidInternal,
  Q as getProfileByAddress,
  M as getTokenByFid,
  U as getTokenByFidInternal,
  z as importTokens,
  j as removeToken,
  V as saveToken,
  rt as sendBossDefeatedNotifications,
  nt as sendCustomNotification,
  J as sendDailyLoginReminder,
  G as sendFeaturedCastNotification,
  W as sendLowEnergyNotifications,
  tt as sendPeriodicTip,
  it as sendVibemailNotification,
  X as sendWinnerNotification,
  Z as testNeynarNotification,
  ot as triggerDailyLoginReminder,
  et as triggerPeriodicTip
};
//# sourceMappingURL=notifications.js.map
