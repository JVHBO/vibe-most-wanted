import {
  h as y
} from "./_deps/QS6BMXBV.js";
import {
  b,
  c as g,
  d as f
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as c
} from "./_deps/34SVKERO.js";
import {
  a as l
} from "./_deps/5B5TEMMX.js";

// convex/admin.ts
var _ = f({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    console.log("\u{1F6A8} STEP 1: Resetting profiles...");
    let a = await n.db.query("profiles").take(100);
    console.log(`\u{1F4CA} Found ${a.length} profiles to reset`);
    let o = 0, e = 0;
    for (let s of a)
      try {
        let t = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        await n.db.patch(s._id, {
          coins: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
          stats: {
            totalPower: 0,
            totalCards: 0,
            openedCards: 0,
            unopenedCards: 0,
            pveWins: 0,
            pveLosses: 0,
            pvpWins: 0,
            pvpLosses: 0,
            attackWins: 0,
            attackLosses: 0,
            defenseWins: 0,
            defenseLosses: 0
          },
          dailyLimits: {
            pveWins: 0,
            pvpMatches: 0,
            lastResetDate: t,
            firstPveBonus: !1,
            firstPvpBonus: !1,
            loginBonus: !1,
            streakBonus: !1
          },
          winStreak: 0,
          lastWinTimestamp: 0,
          attacksToday: 0,
          rematchesToday: 0,
          lastUpdated: Date.now()
        }), o++;
      } catch (t) {
        console.error(`Failed to reset profile ${s.address}:`, t), e++;
      }
    return console.log(`\u2705 Reset ${o} profiles`), { profilesReset: o };
  }, "handler")
}), I = f({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    let a = await n.db.query("matches").take(100);
    if (a.length === 0)
      return console.log("\u2705 No more matches to delete"), { deleted: 0, remaining: 0 };
    for (let e of a)
      try {
        await n.db.delete(e._id);
      } catch (s) {
        console.error(`Failed to delete match ${e._id}:`, s);
      }
    let o = await n.db.query("matches").take(1);
    return console.log(`\u{1F5D1}\uFE0F Deleted ${a.length} matches`), {
      deleted: a.length,
      hasMore: o.length > 0
    };
  }, "handler")
}), q = f({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    let a = await n.db.query("questProgress").take(100);
    for (let o of a)
      try {
        await n.db.delete(o._id);
      } catch (e) {
        console.error(`Failed to delete quest progress ${o._id}:`, e);
      }
    return console.log(`\u2705 Deleted ${a.length} quest progress records`), { deleted: a.length };
  }, "handler")
}), S = f({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    console.log("\u{1F504} Starting username normalization migration...");
    let a = await n.db.query("profiles").take(100), o = 0, e = 0, s = [];
    for (let t of a) {
      let r = t.username, d = r.toLowerCase();
      if (r !== d) {
        let i = await n.db.query("profiles").withIndex(
          "by_username",
          (u) => u.eq("username", d)
        ).first();
        if (i && i._id !== t._id) {
          console.warn(
            `\u26A0\uFE0F CONFLICT: Cannot normalize "${r}" - already exists`
          ), e++;
          continue;
        }
        await n.db.patch(t._id, {
          username: d
        }), s.push(
          `\u2705 ${r} \u2192 ${d}`
        ), o++;
      } else
        e++;
    }
    return console.log(`\u{1F4CA} Total: ${a.length}, Updated: ${o}, Skipped: ${e}`), {
      success: !0,
      totalProfiles: a.length,
      updated: o,
      skipped: e,
      changes: s
    };
  }, "handler")
}), x = f({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    console.log("\u{1F6A8} Resetting all FREE cards...");
    let a = await n.db.query("cardInventory").take(100);
    console.log(`\u{1F4CA} Found ${a.length} FREE cards`);
    let o = new Set(a.map((t) => t.address));
    console.log(`\u{1F465} From ${o.size} players`);
    let e = 0;
    for (let t of a)
      try {
        await n.db.delete(t._id), e++;
      } catch (r) {
        console.error(`Failed to delete card ${t._id}:`, r);
      }
    console.log(`\u{1F5D1}\uFE0F Deleted ${e} cards`);
    let s = 0;
    for (let t of o)
      try {
        let r = await n.db.query("cardPacks").withIndex("by_address_packType", (d) => d.eq("address", t).eq("packType", "basic")).first();
        r ? await n.db.patch(r._id, {
          unopened: r.unopened + 1
        }) : await n.db.insert("cardPacks", {
          address: t,
          packType: "basic",
          unopened: 1,
          sourceId: "reset_compensation",
          earnedAt: Date.now()
        }), s++;
      } catch (r) {
        console.error(`Failed to give pack to ${t}:`, r);
      }
    return console.log(`\u{1F381} Gave ${s} compensation packs`), {
      success: !0,
      cardsDeleted: e,
      playersAffected: o.size,
      packsGiven: s
    };
  }, "handler")
}), C = f({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    let a = await n.db.query("cardInventory").take(100);
    return console.log("\u{1F4CA} Total cards in cardInventory:", a.length), a.length > 0 && console.log("\u{1F3B4} Sample card:", a[0]), {
      totalCards: a.length,
      sampleCard: a[0] || null
    };
  }, "handler")
}), F = f({
  args: { username: c.string() },
  handler: /* @__PURE__ */ l(async (n, { username: a }) => {
    let o = await n.db.query("profiles").withIndex("by_username", (d) => d.eq("username", a.toLowerCase())).first();
    if (!o)
      return {
        success: !1,
        error: `Profile not found for username: ${a}`
      };
    let e = o.address;
    console.log("\u{1F50D} Found profile:", { username: a, address: e });
    let s = await n.db.query("cardInventory").withIndex("by_address", (d) => d.eq("address", e)).take(1e3);
    console.log("\u{1F3B4} User has", s.length, "cards");
    let t = 0;
    for (let d of s)
      await n.db.delete(d._id), t++;
    console.log("\u{1F5D1}\uFE0F Deleted", t, "cards");
    let r = await n.db.query("cardPacks").withIndex("by_address", (d) => d.eq("address", e)).filter((d) => d.eq(d.field("packType"), "basic")).first();
    return r ? (await n.db.patch(r._id, {
      unopened: r.unopened + 1
    }), console.log("\u{1F381} Added 1 pack to existing pack (total:", r.unopened + 1, ")")) : (await n.db.insert("cardPacks", {
      address: e,
      packType: "basic",
      unopened: 1,
      sourceId: "reset_compensation",
      earnedAt: Date.now()
    }), console.log("\u{1F381} Created new pack with 1 unopened")), {
      success: !0,
      username: a,
      address: e,
      cardsDeleted: t,
      packGiven: !0
    };
  }, "handler")
}), v = f({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    let a = await n.db.query("cardInventory").take(100);
    console.log("\u{1F50D} Found cards to delete:", a.length);
    let o = new Set(a.map((t) => t.address));
    console.log("\u{1F465} Unique addresses:", o.size);
    let e = 0;
    for (let t of a)
      await n.db.delete(t._id), e++;
    console.log("\u{1F5D1}\uFE0F Deleted cards:", e);
    let s = 0;
    for (let t of o) {
      let r = await n.db.query("cardPacks").withIndex("by_address", (d) => d.eq("address", t)).filter((d) => d.eq(d.field("packType"), "basic")).first();
      r ? await n.db.patch(r._id, {
        unopened: r.unopened + 1
      }) : await n.db.insert("cardPacks", {
        address: t,
        packType: "basic",
        unopened: 1,
        sourceId: "reset_compensation",
        earnedAt: Date.now()
      }), s++;
    }
    return console.log("\u{1F381} Packs given:", s), {
      success: !0,
      cardsDeleted: e,
      playersAffected: o.size,
      packsGiven: s
    };
  }, "handler")
}), P = f({
  handler: /* @__PURE__ */ l(async (n) => {
    let a = await n.db.query("profiles").take(100), o = 0, e = [];
    for (let s of a) {
      let t = s.coinsInbox || 0;
      if (t > 0) {
        let r = s.coins || 0, d = r + t;
        await n.db.patch(s._id, {
          coins: d,
          coinsInbox: 0,
          // 🔒 SECURITY FIX (2026-01-01): Track lifetimeEarned
          lifetimeEarned: (s.lifetimeEarned || 0) + t
        }), await y(n, s.address, "earn", t, r, d, "admin:claimAllCoinsInboxForAll"), await n.db.insert("coinTransactions", {
          address: s.address.toLowerCase(),
          amount: t,
          type: "earn",
          source: "admin_inbox_claim",
          description: "Admin batch inbox claim",
          timestamp: Date.now(),
          balanceBefore: r,
          balanceAfter: d
        }), o += t, e.push({ address: s.address, moved: t });
      }
    }
    return console.log("Moved " + o + " coins from coinsInbox to coins for " + e.length + " profiles"), {
      success: !0,
      totalMoved: o,
      profilesUpdated: e.length,
      updates: e
    };
  }, "handler")
}), L = f({
  handler: /* @__PURE__ */ l(async (n) => {
    let a = await n.db.query("profiles").take(100), o = 0, e = [];
    for (let s of a) {
      let t = s.inbox || 0;
      if (t > 0) {
        let r = s.coins || 0, d = r + t;
        await n.db.patch(s._id, {
          coins: d,
          inbox: 0,
          lifetimeEarned: (s.lifetimeEarned || 0) + t
        }), await y(n, s.address, "earn", t, r, d, "admin:moveInboxToCoinsForAll"), await n.db.insert("coinTransactions", {
          address: s.address.toLowerCase(),
          amount: t,
          type: "earn",
          source: "admin_inbox_move",
          description: "Admin moved inbox to coins",
          timestamp: Date.now(),
          balanceBefore: r,
          balanceAfter: d
        }), o += t, e.push({ address: s.address, moved: t });
      }
    }
    return console.log("Moved " + o + " from inbox to coins for " + e.length + " profiles"), {
      success: !0,
      totalMoved: o,
      profilesUpdated: e.length,
      updates: e
    };
  }, "handler")
}), U = f({
  args: { address: c.string() },
  handler: /* @__PURE__ */ l(async (n, { address: a }) => {
    let o = a.toLowerCase(), e = await n.db.query("socialQuestProgress").withIndex("by_player", (s) => s.eq("playerAddress", o)).take(100);
    for (let s of e)
      await n.db.delete(s._id);
    return console.log(`Reset ${e.length} social quest progress entries for ${o}`), {
      success: !0,
      resetCount: e.length
    };
  }, "handler")
}), R = f({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    let a = await n.db.query("dailyFreeClaims").take(5e3);
    for (let o of a)
      await n.db.delete(o._id);
    return console.log(`Deleted ${a.length} daily free claims`), { deleted: a.length };
  }, "handler")
}), h = {
  "0x0395df57f73ae2029fc27a152cd87070bcfbd4a4": { username: "faqih", fid: 1063904, amountStolen: 1283500 },
  "0xbb367d00000f5e37ac702aab769725c299be2fc3": { username: "aliselalujp", fid: 272115, amountStolen: 1096804 },
  "0x0e14598940443b91d097b5fd6a89b5808fe35a6b": { username: "fvgf", fid: 1328239, amountStolen: 1094400 },
  "0x0230cf1cf5bf2537eb385772ff72edd5db45320d": { username: "ndmcm", fid: 1129881, amountStolen: 1094400 },
  "0x9ab292251cfb32b8f405ae43a9851aba61696ded": { username: "ral", fid: 1276961, amountStolen: 1094400 },
  "0xd4c3afc6adce7622400759d5194e5497b162e39d": { username: "fransiska", fid: 1156056, amountStolen: 1090100 },
  "0xa43ae3956ecb0ce00c69576153a34db42d265cc6": { username: "jessica", fid: 520832, amountStolen: 993303 },
  "0x04c6d801f529b8d4f118edb2722d5986d25a6ebf": { username: "khajoel", fid: 528311, amountStolen: 991800 },
  "0xff793f745cb0f1131f0614bf54f4c4310f33f0ce": { username: "azwar", fid: 544479, amountStolen: 991800 },
  "0x4ab24dac98c86778e2c837e5fa37ec5a2fdbffc0": { username: "uenxnx", fid: 1322032, amountStolen: 803900 },
  "0xf73e59d03d45a227e5a37aace702599c15d7e64d": { username: "rapoer", fid: 1168341, amountStolen: 455900 },
  "0xc85a10e41fdea999556f8779ea83e6cd1c5d0ded": { username: "desri", fid: 518884, amountStolen: 303400 },
  "0x0f6cfb4f54fec1deca1f43f9c0294ff945b16eb9": { username: "venombaseeth", fid: 308907, amountStolen: 270700 },
  "0x8cc9746c2bb68bd8f51e30ad96f67596b25b141b": { username: "hdhxhx", fid: 1483990, amountStolen: 98400 },
  "0xdeb2f2f02d2d5a2be558868ca8f31440c73d3091": { username: "jxjsjsjxj", fid: 1439850, amountStolen: 98400 },
  "0x2cb84569b69265eea55a8ceb361549548ca99749": { username: "aaggwgxgch", fid: 1420345, amountStolen: 98400 },
  "0xcd890b0f59d7d1a98ffdf133d6b99458324e6621": { username: "nxnckck", fid: 1328839, amountStolen: 98400 },
  "0xcda1b44a39cd827156334c69552d8ecdc697646f": { username: "hshdjxjck", fid: 1328834, amountStolen: 98400 },
  "0x32c3446427e4481096dd96e6573aaf1fbbb9cff8": { username: "jsjxjxjd", fid: 1328624, amountStolen: 98400 },
  "0xce1899674ac0b4137a5bb819e3849794a768eaf0": { username: "9", fid: 1249352, amountStolen: 98400 },
  "0x0d2450ada31e8dfd414e744bc3d250280dca202e": { username: "komeng", fid: 1031800, amountStolen: 95700 },
  "0x1915a871dea94e538a3c9ec671574ffdee6e7c45": { username: "miya", fid: 252536, amountStolen: 95700 },
  "0x705d7d414c6d94a8d1a06aeffc7cd92882480bd9": { username: "wow", fid: 443434, amountStolen: 60900 }
}, E = f({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    let a = 0, o = [];
    for (let e of Object.keys(h)) {
      let s = await n.db.query("profiles").withIndex("by_address", (t) => t.eq("address", e)).first();
      if (s && s.defenseDeck && s.defenseDeck.length > 0) {
        let t = s.defenseDeck.length;
        await n.db.patch(s._id, {
          defenseDeck: [],
          hasFullDefenseDeck: !1
          // 🚀 BANDWIDTH FIX
        }), a++, o.push({
          address: e,
          username: h[e].username,
          deckSize: t
        }), console.log(`Removed defense deck from exploiter: ${e} (${h[e].username}) - had ${t} cards`);
      }
    }
    return { removedCount: a, removed: o };
  }, "handler")
}), M = f({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    let a = await n.db.query("voiceParticipants").collect();
    for (let o of a)
      await n.db.delete(o._id);
    return console.log(`[Admin] Voice cleanup: removed ${a.length} voice participants`), { deleted: a.length };
  }, "handler")
}), z = f({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    console.log("\u{1F680} Starting hasFullDefenseDeck backfill migration...");
    let a = await n.db.query("profiles").take(5e3), o = 0, e = 0, s = 0;
    for (let t of a) {
      let r = (t.defenseDeck?.length || 0) === 5;
      if (t.hasFullDefenseDeck === r) {
        s++;
        continue;
      }
      await n.db.patch(t._id, {
        hasFullDefenseDeck: r
      }), r ? o++ : e++;
    }
    return console.log("\u2705 Migration complete!"), console.log(`   \u{1F4CA} Total profiles: ${a.length}`), console.log(`   \u2705 Updated WITH full deck: ${o}`), console.log(`   \u274C Updated WITHOUT full deck: ${e}`), console.log(`   \u23ED\uFE0F Skipped (already correct): ${s}`), {
      total: a.length,
      updatedWithDeck: o,
      updatedWithoutDeck: e,
      skipped: s
    };
  }, "handler")
}), O = f({
  args: {
    daysOld: c.optional(c.number())
  },
  handler: /* @__PURE__ */ l(async (n, { daysOld: a = 30 }) => {
    let o = Date.now() - a * 24 * 60 * 60 * 1e3, e = {}, s = 100, t = await n.db.query("matches").filter((i) => i.lt(i.field("timestamp"), o)).take(100);
    e.matches = t.length >= s ? s + "+" : String(t.length);
    let r = await n.db.query("raidAttacks").filter((i) => i.lt(i.field("createdAt"), o)).take(100);
    e.raidAttacks = r.length >= s ? s + "+" : String(r.length);
    let d = await n.db.query("coinTransactions").filter((i) => i.lt(i.field("timestamp"), o)).take(100);
    return e.coinTransactions = d.length >= s ? s + "+" : String(d.length), console.log("Records older than " + a + " days:", e), {
      daysOld: a,
      cutoffDate: new Date(o).toISOString(),
      counts: e
    };
  }, "handler")
}), j = f({
  args: { daysOld: c.optional(c.number()) },
  handler: /* @__PURE__ */ l(async (n, { daysOld: a = 30 }) => {
    let o = Date.now() - a * 24 * 60 * 60 * 1e3, e = await n.db.query("matches").filter((s) => s.lt(s.field("timestamp"), o)).take(100);
    if (e.length === 0)
      return { deleted: 0, hasMore: !1 };
    for (let s of e)
      await n.db.delete(s._id);
    return console.log("Deleted " + e.length + " old matches"), { deleted: e.length, hasMore: e.length === 100 };
  }, "handler")
}), B = f({
  args: { daysOld: c.optional(c.number()) },
  handler: /* @__PURE__ */ l(async (n, { daysOld: a = 30 }) => {
    let o = Date.now() - a * 24 * 60 * 60 * 1e3, e = await n.db.query("raidAttacks").filter((s) => s.lt(s.field("createdAt"), o)).take(100);
    if (e.length === 0)
      return { deleted: 0, hasMore: !1 };
    for (let s of e)
      await n.db.delete(s._id);
    return console.log("Deleted " + e.length + " old raid attacks"), { deleted: e.length, hasMore: e.length === 100 };
  }, "handler")
}), W = f({
  args: { daysOld: c.optional(c.number()) },
  handler: /* @__PURE__ */ l(async (n, { daysOld: a = 60 }) => {
    let o = Date.now() - a * 24 * 60 * 60 * 1e3, e = await n.db.query("coinTransactions").filter((s) => s.lt(s.field("timestamp"), o)).take(100);
    if (e.length === 0)
      return { deleted: 0, hasMore: !1 };
    for (let s of e)
      await n.db.delete(s._id);
    return console.log("Deleted " + e.length + " old coin transactions"), { deleted: e.length, hasMore: e.length === 100 };
  }, "handler")
}), N = f({
  args: {
    address: c.string()
  },
  handler: /* @__PURE__ */ l(async (n, a) => {
    let o = a.address.toLowerCase(), e = await n.db.query("profiles").withIndex("by_address", (r) => r.eq("address", o)).first();
    if (!e)
      return console.log(`\u274C Profile not found for address: ${o}`), { success: !1, error: "Profile not found" };
    let s = e.farcasterFid, t = e.username;
    return await n.db.patch(e._id, {
      farcasterFid: void 0,
      fid: void 0
    }), console.log(`\u2705 Unlinked FID ${s} from @${t} (${o})`), {
      success: !0,
      unlinkedFid: s,
      username: t,
      address: o
    };
  }, "handler")
}), V = f({
  args: {
    primaryAddress: c.string(),
    secondaryAddress: c.string()
  },
  handler: /* @__PURE__ */ l(async (n, a) => {
    let o = a.primaryAddress.toLowerCase(), e = a.secondaryAddress.toLowerCase(), s = await n.db.query("profiles").withIndex("by_address", (u) => u.eq("address", o)).first();
    if (!s)
      return console.log(`\u274C Primary profile not found: ${o}`), { success: !1, error: "Primary profile not found" };
    let t = await n.db.query("profiles").withIndex("by_address", (u) => u.eq("address", e)).first();
    if (!t)
      return console.log(`\u274C Secondary profile not found: ${e}`), { success: !1, error: "Secondary profile not found" };
    let r = Date.now(), d = await n.db.query("addressLinks").withIndex("by_address", (u) => u.eq("address", e)).first();
    d ? console.log(`\u26A0\uFE0F Link already exists: ${e} \u2192 ${d.primaryAddress}`) : (await n.db.insert("addressLinks", {
      address: e,
      primaryAddress: o,
      linkedAt: r
    }), console.log(`\u{1F517} Created addressLink: ${e} \u2192 ${o}`));
    let i = s.linkedAddresses || [];
    return i.includes(e) || (await n.db.patch(s._id, {
      linkedAddresses: [...i, e],
      lastUpdated: r
    }), console.log(`\u{1F4DD} Added ${e} to @${s.username}'s linkedAddresses`)), t.farcasterFid && (await n.db.patch(t._id, {
      farcasterFid: void 0,
      fid: void 0
    }), console.log(`\u{1F513} Removed FID from @${t.username}`)), console.log(`\u2705 Linked @${t.username} (${e}) to @${s.username} (${o})`), {
      success: !0,
      primaryUsername: s.username,
      secondaryUsername: t.username,
      primaryAddress: o,
      secondaryAddress: e
    };
  }, "handler")
}), G = f({
  args: {
    primaryAddress: c.string(),
    secondaryAddress: c.string()
  },
  handler: /* @__PURE__ */ l(async (n, a) => {
    let o = a.primaryAddress.toLowerCase(), e = a.secondaryAddress.toLowerCase(), s = await n.db.query("profiles").withIndex("by_address", (m) => m.eq("address", o)).first();
    if (!s)
      return console.log(`\u274C Primary profile not found: ${o}`), { success: !1, error: "Primary profile not found" };
    let t = await n.db.query("profiles").withIndex("by_address", (m) => m.eq("address", e)).first();
    if (!t)
      return console.log(`\u274C Secondary profile not found: ${e}`), { success: !1, error: "Secondary profile not found" };
    let r = Date.now(), d = 0, i = t.coins || 0;
    if (i > 0) {
      let m = s.coins || 0;
      await n.db.patch(s._id, {
        coins: m + i,
        lastUpdated: r
      }), d = i, console.log(`\u{1F4B0} Transferred ${i} coins to @${s.username}`);
    }
    await n.db.query("addressLinks").withIndex("by_address", (m) => m.eq("address", e)).first() || (await n.db.insert("addressLinks", {
      address: e,
      primaryAddress: o,
      linkedAt: r
    }), console.log(`\u{1F517} Created addressLink: ${e} \u2192 ${o}`));
    let p = s.linkedAddresses || [];
    return p.includes(e) || (await n.db.patch(s._id, {
      linkedAddresses: [...p, e]
    }), console.log(`\u{1F4DD} Added ${e} to @${s.username}'s linkedAddresses`)), await n.db.patch(t._id, {
      farcasterFid: void 0,
      fid: void 0,
      coins: 0
    }), console.log(`\u{1F513} Removed FID and reset balances from @${t.username}`), console.log(`\u2705 Merged @${t.username} into @${s.username}`), {
      success: !0,
      primaryUsername: s.username,
      secondaryUsername: t.username,
      coinsTransferred: d
    };
  }, "handler")
}), Q = f({
  args: {
    fid: c.number(),
    amount: c.number(),
    reason: c.optional(c.string())
  },
  handler: /* @__PURE__ */ l(async (n, a) => {
    let o = await n.db.query("profiles").withIndex("by_fid", (t) => t.eq("farcasterFid", a.fid)).first();
    if (!o)
      return console.log(`\u274C Profile not found for FID: ${a.fid}`), { success: !1, error: "Profile not found" };
    let e = o.coins || 0, s = e + a.amount;
    return await n.db.patch(o._id, {
      coins: s,
      lifetimeEarned: (o.lifetimeEarned || 0) + a.amount,
      lastUpdated: Date.now()
    }), await y(
      n,
      o.address,
      "earn",
      a.amount,
      e,
      s,
      "admin:giveCoins",
      void 0,
      { reason: a.reason || "Admin grant" }
    ), await n.db.insert("coinTransactions", {
      address: o.address.toLowerCase(),
      amount: a.amount,
      type: "earn",
      source: "admin_grant",
      description: a.reason || "Admin granted coins",
      timestamp: Date.now(),
      balanceBefore: e,
      balanceAfter: s
    }), console.log(`\u2705 Gave ${a.amount.toLocaleString()} coins to @${o.username} (FID ${a.fid})`), console.log(`   Balance: ${e.toLocaleString()} \u2192 ${s.toLocaleString()}`), {
      success: !0,
      username: o.username,
      fid: a.fid,
      amount: a.amount,
      balanceBefore: e,
      balanceAfter: s
    };
  }, "handler")
}), H = f({
  args: {
    batchSize: c.optional(c.number())
  },
  handler: /* @__PURE__ */ l(async (n, a) => {
    let o = a.batchSize || 100;
    console.log("=== BACKFILL: Burn earnings to lifetimeEarned ===");
    let e = await n.db.query("coinTransactions").filter(
      (i) => i.or(
        i.eq(i.field("source"), "burn_card"),
        i.eq(i.field("source"), "burn_cards")
      )
    ).take(1e4);
    console.log(`Found ${e.length} burn transactions`);
    let s = {};
    for (let i of e) {
      let u = i.address.toLowerCase();
      s[u] = (s[u] || 0) + i.amount;
    }
    let t = Object.keys(s);
    console.log(`Found ${t.length} unique addresses with burns`);
    let r = 0, d = 0;
    for (let i of t.slice(0, o)) {
      let u = s[i], p = await n.db.query("profiles").withIndex("by_address", (k) => k.eq("address", i)).first();
      if (!p) {
        d++;
        continue;
      }
      let w = (p.lifetimeEarned || 0) + u;
      await n.db.patch(p._id, {
        lifetimeEarned: w
      }), console.log(`\u2705 ${p.username || i.slice(0, 10)}: +${u.toLocaleString()} \u2192 ${w.toLocaleString()}`), r++;
    }
    return console.log(`
=== DONE: Updated ${r}, Skipped ${d} ===`), { updated: r, skipped: d, total: t.length };
  }, "handler")
}), K = b({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    let a = await n.db.query("notificationTokens").collect(), o = {
      total: a.length,
      byPlatform: {},
      byApp: {},
      withUrl: 0,
      withoutUrl: 0
    };
    for (let e of a) {
      let s = e.platform || "unknown";
      o.byPlatform[s] = (o.byPlatform[s] || 0) + 1;
      let t = e.app || "vbms";
      o.byApp[t] = (o.byApp[t] || 0) + 1, e.url ? o.withUrl++ : o.withoutUrl++;
    }
    return o;
  }, "handler")
}), X = b({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => {
    let a = await n.db.query("notificationTokens").collect(), o = Date.now(), e = 10080 * 60 * 1e3, s = 720 * 60 * 60 * 1e3, t = {
      total: a.length,
      last7Days: 0,
      last30Days: 0,
      byDay: {},
      byPlatform: {},
      byApp: {}
    };
    for (let r of a) {
      let d = o - r._creationTime;
      if (d < e) {
        t.last7Days++;
        let p = new Date(r._creationTime).toISOString().split("T")[0];
        t.byDay[p] = (t.byDay[p] || 0) + 1;
      }
      d < s && t.last30Days++;
      let i = r.platform || "unknown";
      t.byPlatform[i] = (t.byPlatform[i] || 0) + 1;
      let u = r.app || "vbms";
      t.byApp[u] = (t.byApp[u] || 0) + 1;
    }
    return t;
  }, "handler")
}), J = b({
  args: {},
  handler: /* @__PURE__ */ l(async (n) => (await n.db.query("notificationTokens").order("desc").take(50)).map((o) => ({
    fid: o.fid,
    platform: o.platform || "unknown",
    app: o.app || "vbms",
    url: o.url ? o.url.includes("neynar") ? "neynar" : "warpcast" : "no-url",
    created: new Date(o._creationTime).toISOString().split("T")[0]
  })), "handler")
}), Y = g({
  args: { address: c.string() },
  handler: /* @__PURE__ */ l(async (n, { address: a }) => {
    let o = a.toLowerCase(), e = await n.db.query("profiles").withIndex("by_address", (i) => i.eq("address", o)).first();
    if (!e)
      throw new Error("Profile not found");
    let s = await n.db.query("farcasterCards").withIndex("by_address", (i) => i.eq("address", o)).collect();
    if (s.length === 0)
      return { added: 0, message: "No VibeFID cards found" };
    let t = e.ownedTokenIds || [], r = s.map((i) => i.fid.toString()).filter((i) => !t.includes(i));
    if (r.length === 0)
      return { added: 0, message: "All VibeFID tokens already in ownedTokenIds" };
    let d = [...t, ...r];
    return await n.db.patch(e._id, { ownedTokenIds: d }), {
      added: r.length,
      tokens: r,
      message: `Added ${r.length} VibeFID token(s)`
    };
  }, "handler")
}), Z = g({
  args: {
    address: c.string(),
    tokenIds: c.array(c.string())
  },
  handler: /* @__PURE__ */ l(async (n, { address: a, tokenIds: o }) => {
    let e = a.toLowerCase(), s = await n.db.query("profiles").withIndex("by_address", (i) => i.eq("address", e)).first();
    if (!s)
      throw new Error("Profile not found");
    let t = s.ownedTokenIds || [], r = o.filter((i) => !t.includes(i));
    if (r.length === 0)
      return { added: 0, message: "All tokens already in ownedTokenIds" };
    let d = [...t, ...r];
    return await n.db.patch(s._id, { ownedTokenIds: d }), {
      added: r.length,
      tokens: r,
      message: `Added ${r.length} token(s)`
    };
  }, "handler")
}), ee = g({
  args: { address: c.string() },
  handler: /* @__PURE__ */ l(async (n, { address: a }) => {
    let o = a.toLowerCase(), e = await n.db.query("profiles").withIndex("by_address", (u) => u.eq("address", o)).first();
    if (!e)
      throw new Error("Profile not found");
    let s = e.defenseDeck || [];
    if (s.length === 0)
      return { added: 0, message: "No defense deck" };
    let t = e.ownedTokenIds || [], d = s.map((u) => u.tokenId).filter((u) => !t.includes(u));
    if (d.length === 0)
      return { added: 0, message: "All defense deck tokens already in ownedTokenIds" };
    let i = [...t, ...d];
    return await n.db.patch(e._id, { ownedTokenIds: i }), {
      added: d.length,
      tokens: d,
      message: `Added ${d.length} defense deck token(s)`
    };
  }, "handler")
});
export {
  Z as addTokensToProfile,
  Y as addVibeFIDToOwnedTokens,
  H as backfillBurnEarnings,
  z as backfillHasFullDefenseDeck,
  P as claimAllCoinsInboxForAll,
  M as cleanupAllVoice,
  W as cleanupOldCoinTransactions,
  j as cleanupOldMatches,
  B as cleanupOldRaidAttacks,
  K as countNotificationTokens,
  O as countOldRecordsForCleanup,
  C as debugCountFreeCards,
  I as deleteMatchesBatch,
  q as deleteQuestProgress,
  v as executeResetFreeCards,
  X as getAppStats,
  J as getRecentTokens,
  Q as giveCoinsToPlayer,
  V as linkDuplicateProfile,
  G as mergeDuplicateProfile,
  L as moveInboxToCoinsForAll,
  S as normalizeUsernames,
  E as removeBlacklistedDefenseDecks,
  R as resetDailyFreeClaims,
  x as resetFreeCards,
  _ as resetProfiles,
  U as resetSocialQuestProgress,
  F as resetUserFreeCards,
  ee as syncDefenseDeckToOwned,
  N as unlinkFidFromProfile
};
//# sourceMappingURL=admin.js.map
