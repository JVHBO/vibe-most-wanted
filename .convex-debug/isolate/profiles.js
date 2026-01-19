import {
  a as w,
  b as h
} from "./_deps/LKY7FFHL.js";
import {
  b as A
} from "./_deps/AWJMSRP7.js";
import {
  b as L,
  c as E
} from "./_deps/55EWY3YS.js";
import "./_deps/HHLKWD3J.js";
import {
  e as C,
  g as _,
  h as P
} from "./_deps/KGOWE5FI.js";
import {
  a as b,
  b as $,
  c as m,
  d as D
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as e
} from "./_deps/34SVKERO.js";
import {
  a as u
} from "./_deps/5B5TEMMX.js";

// convex/profiles.ts
async function q(r, t) {
  let a = w(t), i = await r.db.query("addressLinks").withIndex("by_address", (s) => s.eq("address", a)).first();
  return i ? i.primaryAddress : a;
}
u(q, "resolvePrimaryAddress");
var R = b({
  args: { address: e.string() },
  handler: /* @__PURE__ */ u(async (r, { address: t }) => {
    if (!t || t.length === 0 || !h(t))
      return null;
    let a = w(t), i = await r.db.query("addressLinks").withIndex("by_address", (n) => n.eq("address", a)).first(), s;
    return i ? s = await r.db.query("profiles").withIndex("by_address", (n) => n.eq("address", i.primaryAddress)).first() : s = await r.db.query("profiles").withIndex("by_address", (n) => n.eq("address", a)).first(), s ? {
      ...s,
      hasDefenseDeck: (s.defenseDeck?.length || 0) === 5
    } : null;
  }, "handler")
}), O = b({
  args: { address: e.string() },
  handler: /* @__PURE__ */ u(async (r, { address: t }) => {
    if (!t || t.length === 0 || !h(t))
      return null;
    let a = w(t), i = await r.db.query("addressLinks").withIndex("by_address", (n) => n.eq("address", a)).first(), s;
    return i ? s = await r.db.query("profiles").withIndex("by_address", (n) => n.eq("address", i.primaryAddress)).first() : s = await r.db.query("profiles").withIndex("by_address", (n) => n.eq("address", a)).first(), s ? {
      _id: s._id,
      address: s.address,
      username: s.username,
      stats: s.stats,
      coins: s.coins || 0,
      coinsInbox: s.coinsInbox || 0,
      inbox: s.inbox || 0,
      dailyLimits: s.dailyLimits,
      attacksToday: s.attacksToday || 0,
      rematchesToday: s.rematchesToday || 0,
      winStreak: s.winStreak || 0,
      fid: s.fid,
      farcasterFid: s.farcasterFid,
      farcasterPfpUrl: s.farcasterPfpUrl,
      twitter: s.twitter,
      twitterHandle: s.twitterHandle,
      twitterProfileImageUrl: s.twitterProfileImageUrl,
      hasDefenseDeck: (s.defenseDeck?.length || 0) === 5,
      preferredCollection: s.preferredCollection,
      createdAt: s.createdAt,
      lastUpdated: s.lastUpdated,
      // 🚀 BANDWIDTH FIX: Include linked addresses (small array, saves separate query)
      linkedAddresses: s.linkedAddresses || []
    } : null;
  }, "handler")
}), K = b({
  args: { address: e.string() },
  handler: /* @__PURE__ */ u(async (r, { address: t }) => {
    if (!t || t.length === 0 || !h(t))
      return null;
    let a = w(t), i = await r.db.query("addressLinks").withIndex("by_address", (d) => d.eq("address", a)).first(), s = i ? i.primaryAddress : a, n = await r.db.query("profiles").withIndex("by_address", (d) => d.eq("address", s)).first();
    return n ? {
      address: n.address,
      username: n.username,
      defenseDeck: n.defenseDeck || [],
      hasDefenseDeck: (n.defenseDeck?.length || 0) === 5,
      stats: {
        totalPower: n.stats?.totalPower || 0,
        aura: n.stats?.aura ?? 500
      }
    } : null;
  }, "handler")
}), H = b({
  args: { address: e.string() },
  handler: /* @__PURE__ */ u(async (r, { address: t }) => {
    if (!t || t.length === 0 || !h(t))
      return null;
    let a = await q(r, t), i = a !== w(t), s = await r.db.query("profiles").withIndex("by_address", (I) => I.eq("address", a)).first();
    if (!s) return null;
    let n = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], d = s.dailyLimits, l = d?.lastResetDate === n, o = 10, c = l && d?.pveWins || 0, f = Math.max(0, o - c), p = 180 * 1e3, y = s.lastConversionAttempt || s.pendingConversionTimestamp || 0, g = Date.now() - y, k = y > 0 && g < p ? Math.ceil((p - g) / 1e3) : 0, U = (l && s.lifetimeEarned || 0) < 1e5, v = [];
    if (s.defenseDeck && s.defenseDeck.length > 0)
      for (let I of s.defenseDeck)
        if (typeof I == "object" && I !== null && "tokenId" in I) {
          if (I.collection === "vibefid") continue;
          let x = `${I.collection || "default"}:${I.tokenId}`;
          v.push(x);
        } else typeof I == "string" && v.push(`default:${I}`);
    return {
      // Core profile
      _id: s._id,
      address: s.address,
      username: s.username,
      stats: s.stats,
      hasDefenseDeck: (s.defenseDeck?.length || 0) === 5,
      // Economy (replaces getPlayerEconomy)
      coins: s.coins || 0,
      lifetimeEarned: s.lifetimeEarned || 0,
      lifetimeSpent: s.lifetimeSpent || 0,
      dailyLimits: s.dailyLimits,
      winStreak: s.winStreak || 0,
      canEarnMore: U,
      // VBMS (replaces getVBMSBalance)
      inbox: s.coinsInbox || 0,
      claimedTokens: s.claimedTokens || 0,
      // Inbox status (replaces getInboxStatus)
      coinsInbox: s.coinsInbox || 0,
      cooldownRemaining: k,
      // PvE attempts (replaces getRemainingPveAttempts)
      pveRemaining: f,
      pveTotal: o,
      // Welcome pack (replaces hasReceivedWelcomePack)
      hasReceivedWelcomePack: s.hasReceivedWelcomePack || !1,
      // Extras needed by UI
      fid: s.fid,
      farcasterFid: s.farcasterFid,
      farcasterPfpUrl: s.farcasterPfpUrl,
      twitterProfileImageUrl: s.twitterProfileImageUrl,
      // 🚀 For PokerBattleTable avatars
      hasVibeBadge: s.hasVibeBadge || !1,
      // 🚀 BANDWIDTH FIX: Locked cards for attack/pvp modes
      // Replaces getAvailableCards queries
      lockedTokenIds: v,
      // 🚀 BANDWIDTH FIX: Linked addresses info
      // Replaces getLinkedAddresses query for pages using dashboard
      primaryAddress: s.address,
      linkedAddresses: s.linkedAddresses || [],
      isLinkedWallet: i
    };
  }, "handler")
}), Q = b({
  args: { limit: e.optional(e.number()) },
  handler: /* @__PURE__ */ u(async (r, { limit: t = 200 }) => {
    try {
      let a = await r.db.query("leaderboardFullCache").withIndex("by_type", (o) => o.eq("type", "full_leaderboard")).first();
      if (a && a.data && a.data.length > 0) {
        let o = Date.now() - a.updatedAt, c = 2100 * 1e3;
        if (o < c)
          return a.data.slice(0, t).map((f) => ({
            address: f.address,
            username: f.username,
            twitterProfileImageUrl: f.twitterProfileImageUrl,
            farcasterPfpUrl: f.farcasterPfpUrl,
            stats: {
              aura: f.aura,
              totalPower: f.totalPower
            },
            hasDefenseDeck: f.hasDefenseDeck,
            userIndex: f.userIndex,
            isBlacklisted: f.isBlacklisted,
            hasVibeBadge: f.hasVibeBadge
            // 🐛 FIX: Was missing!
          }));
      }
      console.log("\u26A0\uFE0F Leaderboard cache miss - fetching from profiles");
      let i = await r.db.query("profiles").withIndex("by_defense_aura", (o) => o.eq("hasFullDefenseDeck", !0)).order("desc").take(t + 100), s = await r.db.query("addressLinks").take(1e3), n = new Set(s.map((o) => o.address.toLowerCase())), d = [];
      for (let o of i)
        if (o.address && !n.has(o.address.toLowerCase()) && (d.push(o), d.length >= t))
          break;
      return d.map((o) => {
        let c = o.address || "unknown", f = L(c), p = f ? E(c) : null, y = p ? Math.floor(p.amountStolen / 100) : 0;
        return {
          address: c,
          username: o.username || "unknown",
          twitterProfileImageUrl: o.twitterProfileImageUrl,
          farcasterPfpUrl: o.farcasterPfpUrl,
          stats: {
            aura: f ? -y : o.stats?.aura ?? 500,
            totalPower: f ? -y : o.stats?.totalPower || 0
          },
          hasDefenseDeck: o.hasFullDefenseDeck === !0 || (o.defenseDeck?.length || 0) === 5,
          userIndex: o.userIndex || 0,
          isBlacklisted: f,
          hasVibeBadge: o.hasVibeBadge || !1
        };
      });
    } catch (a) {
      return console.error("\u274C getLeaderboardLite error:", a), [];
    }
  }, "handler")
}), Y = D({
  args: {},
  handler: /* @__PURE__ */ u(async (r) => {
    try {
      let t = await r.db.query("profiles").withIndex("by_defense_aura", (l) => l.eq("hasFullDefenseDeck", !0)).order("desc").take(250), a = await r.db.query("addressLinks").take(1e3), i = new Set(a.map((l) => l.address.toLowerCase())), s = [];
      for (let l of t)
        if (l.address && !i.has(l.address.toLowerCase()) && (s.push(l), s.length >= 200))
          break;
      let n = s.map((l) => {
        let o = l.address || "unknown", c = L(o), f = c ? E(o) : null, p = f ? Math.floor(f.amountStolen / 100) : 0;
        return {
          address: o,
          username: l.username || "unknown",
          twitterProfileImageUrl: l.twitterProfileImageUrl,
          farcasterPfpUrl: l.farcasterPfpUrl,
          aura: c ? -p : l.stats?.aura ?? 500,
          totalPower: c ? -p : l.stats?.totalPower || 0,
          hasDefenseDeck: !0,
          userIndex: l.userIndex || 0,
          isBlacklisted: c,
          hasVibeBadge: l.hasVibeBadge || !1
          // 🐛 FIX: Was missing from cache!
        };
      }), d = await r.db.query("leaderboardFullCache").withIndex("by_type", (l) => l.eq("type", "full_leaderboard")).first();
      return d ? await r.db.patch(d._id, {
        data: n,
        updatedAt: Date.now()
      }) : await r.db.insert("leaderboardFullCache", {
        type: "full_leaderboard",
        data: n,
        updatedAt: Date.now()
      }), console.log(`\u2705 Leaderboard cache updated: ${n.length} players`), { success: !0, count: n.length };
    } catch (t) {
      return console.error("\u274C updateLeaderboardFullCache error:", t), { success: !1, error: String(t) };
    }
  }, "handler")
}), G = b({
  args: { username: e.string() },
  handler: /* @__PURE__ */ u(async (r, { username: t }) => !await r.db.query("profiles").withIndex(
    "by_username",
    (i) => i.eq("username", t.toLowerCase())
  ).first(), "handler")
}), X = b({
  args: { username: e.string() },
  handler: /* @__PURE__ */ u(async (r, { username: t }) => await r.db.query("profiles").withIndex(
    "by_username",
    (i) => i.eq("username", t.toLowerCase())
  ).first(), "handler")
}), J = m({
  args: {
    address: e.string(),
    fid: e.number(),
    // 🔒 REQUIRED - Must be valid Farcaster FID
    username: e.string(),
    // From Farcaster SDK, not user input
    displayName: e.optional(e.string()),
    pfpUrl: e.optional(e.string())
  },
  handler: /* @__PURE__ */ u(async (r, t) => {
    if (!t.fid || t.fid <= 0)
      throw new Error("\u{1F512} Valid Farcaster FID required to create account");
    if (!h(t.address))
      throw new Error("Invalid Ethereum address format");
    let a = w(t.address), i = t.username.toLowerCase(), s = Date.now(), n = await r.db.query("profiles").withIndex("by_fid", (o) => o.eq("farcasterFid", t.fid)).first();
    if (n && n.address !== a) {
      if (!await r.db.query("addressLinks").withIndex("by_address", (c) => c.eq("address", a)).first()) {
        await r.db.insert("addressLinks", {
          address: a,
          primaryAddress: n.address,
          linkedAt: s
        });
        let c = n.linkedAddresses || [];
        c.includes(a) || await r.db.patch(n._id, {
          linkedAddresses: [...c, a],
          lastUpdated: s
        }), console.log(`\u{1F517} MULTI-WALLET: Linked ${a} to existing profile @${n.username} (FID ${t.fid})`);
      }
      return n._id;
    }
    let d = await r.db.query("profiles").withIndex("by_address", (o) => o.eq("address", a)).first();
    if (d) {
      let o = {};
      return d.farcasterFid !== t.fid && (o.farcasterFid = t.fid), d.username !== i && (o.username = i), d.farcasterDisplayName !== t.displayName && (o.farcasterDisplayName = t.displayName), d.farcasterPfpUrl !== t.pfpUrl && (o.farcasterPfpUrl = t.pfpUrl), Object.keys(o).length > 0 && (o.lastUpdated = s, await r.db.patch(d._id, o), console.log(`\u2705 Profile updated for FID ${t.fid} (@${i}):`, Object.keys(o))), d._id;
    }
    let l = await r.db.insert("profiles", {
      address: a,
      farcasterFid: t.fid,
      // Use farcasterFid (number)
      username: i,
      farcasterDisplayName: t.displayName,
      farcasterPfpUrl: t.pfpUrl,
      stats: {
        totalPower: 0,
        totalCards: 0,
        openedCards: 0,
        unopenedCards: 0,
        aura: 500,
        // Initial aura for new players
        pveWins: 0,
        pveLosses: 0,
        pvpWins: 0,
        pvpLosses: 0,
        attackWins: 0,
        attackLosses: 0,
        defenseWins: 0,
        defenseLosses: 0
      },
      attacksToday: 0,
      rematchesToday: 0,
      createdAt: s,
      lastUpdated: s
    });
    return await r.scheduler.runAfter(0, A.economy.addCoins, {
      address: a,
      amount: 100,
      reason: "Welcome bonus"
    }), await r.db.insert("personalMissions", {
      playerAddress: a,
      date: "once",
      // One-time mission
      missionType: "welcome_gift",
      completed: !0,
      // Auto-completed for new users
      claimed: !1,
      // Not claimed yet - player needs to claim
      reward: 500,
      completedAt: s
    }), await r.db.insert("cardPacks", {
      address: a,
      packType: "basic",
      unopened: 1,
      sourceId: "welcome_pack_auto",
      earnedAt: s
    }), await r.db.patch(l, {
      hasReceivedWelcomePack: !0,
      hasReceivedWelcomeGift: !0
    }), console.log(`\u{1F195} New profile created for FID ${t.fid} (@${i}) at ${a} - Welcome pack given!`), l;
  }, "handler")
}), Z = m({
  args: {
    primaryAddress: e.string(),
    newAddress: e.string(),
    fid: e.number()
  },
  handler: /* @__PURE__ */ u(async (r, t) => {
    if (!t.fid || t.fid <= 0)
      throw new Error("\u{1F512} Valid Farcaster FID required");
    if (!h(t.primaryAddress) || !h(t.newAddress))
      throw new Error("Invalid address format");
    let a = w(t.primaryAddress), i = w(t.newAddress), s = Date.now();
    if (a === i)
      throw new Error("Cannot link wallet to itself");
    let n = await r.db.query("profiles").withIndex("by_address", (c) => c.eq("address", a)).first();
    if (!n)
      throw new Error("Profile not found");
    if (n.farcasterFid !== t.fid)
      throw new Error("\u{1F512} FID mismatch - unauthorized");
    let d = await r.db.query("profiles").withIndex("by_address", (c) => c.eq("address", i)).first();
    if (d && d._id !== n._id)
      throw d.farcasterFid && d.farcasterFid !== t.fid ? new Error("N\xE3o \xE9 poss\xEDvel linkar wallets com FIDs diferentes. Use 'Merge Account' se quiser unir contas.") : new Error("This wallet already has a profile. Cannot link.");
    let l = await r.db.query("addressLinks").withIndex("by_address", (c) => c.eq("address", i)).first();
    if (l) {
      if (l.primaryAddress === a)
        return { success: !0, message: "Wallet already linked" };
      throw new Error("This wallet is already linked to another profile");
    }
    await r.db.insert("addressLinks", {
      address: i,
      primaryAddress: a,
      linkedAt: s
    });
    let o = n.linkedAddresses || [];
    return o.includes(i) || await r.db.patch(n._id, {
      linkedAddresses: [...o, i],
      lastUpdated: s
    }), console.log(`\u{1F517} MANUAL LINK: ${i} linked to @${n.username} (FID ${t.fid})`), { success: !0, message: "Wallet linked successfully" };
  }, "handler")
}), ee = b({
  args: { address: e.string() },
  handler: /* @__PURE__ */ u(async (r, { address: t }) => {
    if (!t || !h(t))
      return { primary: null, linked: [] };
    let a = w(t), i = await r.db.query("addressLinks").withIndex("by_address", (n) => n.eq("address", a)).first();
    if (i) {
      let n = await r.db.query("profiles").withIndex("by_address", (d) => d.eq("address", i.primaryAddress)).first();
      if (n)
        return {
          primary: n.address,
          linked: n.linkedAddresses || []
        };
    }
    let s = await r.db.query("profiles").withIndex("by_address", (n) => n.eq("address", a)).first();
    return s ? {
      primary: s.address,
      linked: s.linkedAddresses || []
    } : { primary: null, linked: [] };
  }, "handler")
}), re = b({
  args: { address1: e.string(), address2: e.string() },
  handler: /* @__PURE__ */ u(async (r, { address1: t, address2: a }) => {
    if (!t || !a) return !1;
    let i = w(t), s = w(a);
    if (i === s) return !0;
    let n = await q(r, i), d = await q(r, s);
    return n === d;
  }, "handler")
}), se = m({
  args: { walletAddress: e.string() },
  handler: /* @__PURE__ */ u(async (r, { walletAddress: t }) => {
    if (!h(t))
      throw new Error("Endere\xE7o inv\xE1lido");
    let a = w(t);
    if (await r.db.query("addressLinks").withIndex("by_address", (c) => c.eq("address", a)).first())
      throw new Error("Esta wallet j\xE1 est\xE1 linkada a um perfil");
    if (await r.db.query("profiles").withIndex("by_address", (c) => c.eq("address", a)).first())
      throw new Error("Esta wallet j\xE1 tem um perfil");
    let n = await r.db.query("walletLinkCodes").withIndex("by_profile", (c) => c.eq("profileAddress", a)).take(50);
    for (let c of n)
      await r.db.delete(c._id);
    let d = Math.floor(1e5 + Math.random() * 9e5).toString(), l = Date.now(), o = l + 30 * 1e3;
    return await r.db.insert("walletLinkCodes", {
      code: d,
      profileAddress: a,
      // This is the wallet that wants to be linked
      createdAt: l,
      expiresAt: o,
      used: !1
    }), { code: d, expiresAt: o };
  }, "handler")
}), te = m({
  args: {
    code: e.string(),
    fidOwnerAddress: e.string()
    // The wallet of the FID owner (has profile)
  },
  handler: /* @__PURE__ */ u(async (r, { code: t, fidOwnerAddress: a }) => {
    if (!h(a))
      throw new Error("Endere\xE7o inv\xE1lido");
    let i = w(a), n = (await r.db.query("addressLinks").withIndex("by_address", (p) => p.eq("address", i)).first())?.primaryAddress || i, d = await r.db.query("profiles").withIndex("by_address", (p) => p.eq("address", n)).first();
    if (!d)
      throw new Error("Voc\xEA precisa ter um perfil para linkar wallets");
    let l = await r.db.query("walletLinkCodes").withIndex("by_code", (p) => p.eq("code", t)).first();
    if (!l)
      throw new Error("C\xF3digo inv\xE1lido");
    if (l.used)
      throw new Error("C\xF3digo j\xE1 foi usado");
    if (Date.now() > l.expiresAt)
      throw await r.db.delete(l._id), new Error("C\xF3digo expirado");
    let o = l.profileAddress;
    if (n === o)
      throw new Error("N\xE3o pode linkar a mesma wallet");
    let c = await r.db.query("addressLinks").withIndex("by_address", (p) => p.eq("address", o)).first();
    if (c) {
      if (await r.db.patch(l._id, { used: !0 }), c.primaryAddress === n)
        return { success: !0, message: "Wallet j\xE1 est\xE1 linkada ao seu perfil" };
      throw new Error("Esta wallet j\xE1 est\xE1 linkada a outro perfil");
    }
    await r.db.insert("addressLinks", {
      address: o,
      primaryAddress: n,
      linkedAt: Date.now()
    });
    let f = d.linkedAddresses || [];
    return f.includes(o) || await r.db.patch(d._id, {
      linkedAddresses: [...f, o]
    }), await r.scheduler.runAfter(0, A.raidBoss.cleanupLinkedWalletRaidData, {
      linkedAddress: o
    }), await r.db.patch(l._id, { used: !0 }), console.log(`\u{1F517} Wallet linked: ${o} \u2192 ${n} (cleanup scheduled)`), {
      success: !0,
      message: "Wallet linkada com sucesso!",
      profileUsername: d.username,
      linkedWallet: o
    };
  }, "handler")
}), ne = m({
  args: { fidOwnerAddress: e.string() },
  handler: /* @__PURE__ */ u(async (r, { fidOwnerAddress: t }) => {
    if (!h(t))
      throw new Error("Endere\xE7o inv\xE1lido");
    let a = w(t), s = (await r.db.query("addressLinks").withIndex("by_address", (f) => f.eq("address", a)).first())?.primaryAddress || a, n = await r.db.query("profiles").withIndex("by_address", (f) => f.eq("address", s)).first();
    if (!n)
      throw new Error("Voc\xEA precisa ter um perfil para gerar c\xF3digo");
    let d = await r.db.query("walletLinkCodes").withIndex("by_profile", (f) => f.eq("profileAddress", s)).take(50);
    for (let f of d)
      await r.db.delete(f._id);
    let l = Math.floor(1e5 + Math.random() * 9e5).toString(), o = Date.now(), c = o + 60 * 1e3;
    return await r.db.insert("walletLinkCodes", {
      code: l,
      profileAddress: s,
      // The FID profile that will receive the linked wallet
      createdAt: o,
      expiresAt: c,
      used: !1,
      isFidCode: !0
      // Mark as FID-generated code
    }), console.log(`\u{1F517} FID link code generated: ${l} for profile ${n.username}`), { code: l, expiresAt: c };
  }, "handler")
}), ae = m({
  args: {
    code: e.string(),
    walletToLink: e.string()
    // The new wallet that wants to be linked
  },
  handler: /* @__PURE__ */ u(async (r, { code: t, walletToLink: a }) => {
    if (!h(a))
      throw new Error("Endere\xE7o inv\xE1lido");
    let i = w(a);
    if (await r.db.query("profiles").withIndex("by_address", (c) => c.eq("address", i)).first())
      throw new Error("Esta wallet j\xE1 tem um perfil. Use 'Merge Account' para transferir.");
    if (await r.db.query("addressLinks").withIndex("by_address", (c) => c.eq("address", i)).first())
      throw new Error("Esta wallet j\xE1 est\xE1 linkada a outro perfil");
    let d = await r.db.query("walletLinkCodes").withIndex("by_code", (c) => c.eq("code", t)).first();
    if (!d)
      throw new Error("C\xF3digo inv\xE1lido");
    if (d.used)
      throw new Error("C\xF3digo j\xE1 foi usado");
    if (Date.now() > d.expiresAt)
      throw await r.db.delete(d._id), new Error("C\xF3digo expirado");
    let l = d.profileAddress, o = await r.db.query("profiles").withIndex("by_address", (c) => c.eq("address", l)).first();
    if (!o)
      throw new Error("Perfil do c\xF3digo n\xE3o encontrado");
    if (l === i)
      throw new Error("N\xE3o pode linkar a mesma wallet");
    return await r.db.insert("addressLinks", {
      address: i,
      primaryAddress: l,
      linkedAt: Date.now()
    }), await r.scheduler.runAfter(0, A.raidBoss.cleanupLinkedWalletRaidData, {
      linkedAddress: i
    }), await r.db.patch(d._id, { used: !0 }), console.log(`\u{1F517} Wallet linked via FID code: ${i} \u2192 ${l}`), {
      success: !0,
      message: "Wallet linkada com sucesso!",
      profileUsername: o.username,
      linkedWallet: i
    };
  }, "handler")
}), ie = m({
  args: {
    primaryAddress: e.string(),
    // The wallet making the request (must be primary)
    addressToUnlink: e.string()
    // The wallet to remove
  },
  handler: /* @__PURE__ */ u(async (r, { primaryAddress: t, addressToUnlink: a }) => {
    if (!h(t) || !h(a))
      throw new Error("Endere\xE7o inv\xE1lido");
    let i = w(t), s = w(a);
    if (i === s)
      throw new Error("N\xE3o pode deslinkar a wallet principal");
    let n = await r.db.query("profiles").withIndex("by_address", (c) => c.eq("address", i)).first();
    if (!n)
      throw new Error("Perfil n\xE3o encontrado");
    let d = n.linkedAddresses || [];
    if (!d.includes(s))
      throw new Error("Esta wallet n\xE3o est\xE1 linkada ao perfil");
    let l = await r.db.query("addressLinks").withIndex("by_address", (c) => c.eq("address", s)).first();
    l && await r.db.delete(l._id);
    let o = d.filter((c) => c !== s);
    return await r.db.patch(n._id, {
      linkedAddresses: o
    }), {
      success: !0,
      message: "Wallet deslinkada com sucesso!",
      unlinkedAddress: s
    };
  }, "handler")
}), de = m({
  args: { walletAddress: e.string() },
  handler: /* @__PURE__ */ u(async (r, { walletAddress: t }) => {
    if (!h(t))
      throw new Error("Endere\xE7o inv\xE1lido");
    let a = w(t), i = await r.db.query("profiles").withIndex("by_address", (o) => o.eq("address", a)).first();
    if (!i)
      throw new Error("Esta wallet n\xE3o tem um perfil para mergear");
    if (i.farcasterFid)
      throw new Error("Este perfil j\xE1 tem FID. Use 'Linkar Wallet' ao inv\xE9s de merge.");
    let s = await r.db.query("walletLinkCodes").withIndex("by_profile", (o) => o.eq("profileAddress", a)).take(50);
    for (let o of s)
      await r.db.delete(o._id);
    let n = Math.floor(1e5 + Math.random() * 9e5).toString(), d = Date.now(), l = d + 60 * 1e3;
    return await r.db.insert("walletLinkCodes", {
      code: n,
      profileAddress: a,
      createdAt: d,
      expiresAt: l,
      used: !1
    }), {
      code: n,
      expiresAt: l,
      profileToMerge: i.username
    };
  }, "handler")
}), oe = m({
  args: {
    code: e.string(),
    fidOwnerAddress: e.string()
  },
  handler: /* @__PURE__ */ u(async (r, { code: t, fidOwnerAddress: a }) => {
    if (!h(a))
      throw new Error("Endere\xE7o inv\xE1lido");
    let i = w(a), n = (await r.db.query("addressLinks").withIndex("by_address", (g) => g.eq("address", i)).first())?.primaryAddress || i, d = await r.db.query("profiles").withIndex("by_address", (g) => g.eq("address", n)).first();
    if (!d)
      throw new Error("Voc\xEA precisa ter um perfil para fazer merge");
    if (!d.farcasterFid)
      throw new Error("Seu perfil precisa ter FID para absorver outra conta");
    let l = await r.db.query("walletLinkCodes").withIndex("by_code", (g) => g.eq("code", t)).first();
    if (!l)
      throw new Error("C\xF3digo inv\xE1lido");
    if (l.used)
      throw new Error("C\xF3digo j\xE1 foi usado");
    if (Date.now() > l.expiresAt)
      throw await r.db.delete(l._id), new Error("C\xF3digo expirado");
    let o = l.profileAddress;
    if (n === o)
      throw new Error("N\xE3o pode mergear consigo mesmo");
    let c = await r.db.query("profiles").withIndex("by_address", (g) => g.eq("address", o)).first();
    if (!c)
      throw new Error("Perfil antigo n\xE3o encontrado");
    if (c.farcasterFid && c.farcasterFid !== d.farcasterFid)
      throw new Error("N\xE3o \xE9 poss\xEDvel mergear contas com FIDs diferentes. Ambas as contas t\xEAm FIDs distintos.");
    let f = await r.db.query("addressLinks").withIndex("by_address", (g) => g.eq("address", o)).first();
    if (f && f.primaryAddress !== n)
      throw new Error("Esta wallet j\xE1 est\xE1 linkada a outro perfil");
    f || await r.db.insert("addressLinks", {
      address: o,
      primaryAddress: n,
      linkedAt: Date.now()
    });
    let p = d.linkedAddresses || [];
    p.includes(o) || await r.db.patch(d._id, {
      linkedAddresses: [...p, o]
    }), await r.scheduler.runAfter(0, A.raidBoss.cleanupLinkedWalletRaidData, {
      linkedAddress: o
    });
    let y = c.username;
    return await r.db.delete(c._id), await r.db.patch(l._id, { used: !0 }), console.log(`\u{1F500} Account merged: @${y} (${o}) \u2192 @${d.username} (${n})`), {
      success: !0,
      message: `Conta @${y} foi mergeada com sucesso!`,
      mergedUsername: y,
      mergedWallet: o,
      newProfile: d.username
    };
  }, "handler")
}), le = m({
  args: {
    code: e.string(),
    fidOwnerAddress: e.string()
  },
  handler: /* @__PURE__ */ u(async (r, { code: t, fidOwnerAddress: a }) => {
    if (!h(a))
      throw new Error("Endere\xE7o inv\xE1lido");
    let i = w(a), n = (await r.db.query("addressLinks").withIndex("by_address", (k) => k.eq("address", i)).first())?.primaryAddress || i, d = await r.db.query("profiles").withIndex("by_address", (k) => k.eq("address", n)).first();
    if (!d)
      throw new Error("Voc\xEA precisa ter um perfil para usar c\xF3digos");
    if (!d.farcasterFid)
      throw new Error("Seu perfil precisa ter FID para linkar/mergear wallets");
    let l = await r.db.query("walletLinkCodes").withIndex("by_code", (k) => k.eq("code", t)).first();
    if (!l)
      throw new Error("C\xF3digo inv\xE1lido");
    if (l.used)
      throw new Error("C\xF3digo j\xE1 foi usado");
    if (Date.now() > l.expiresAt)
      throw await r.db.delete(l._id), new Error("C\xF3digo expirado");
    let o = l.profileAddress;
    if (n === o)
      throw new Error("N\xE3o pode linkar/mergear consigo mesmo");
    let c = await r.db.query("addressLinks").withIndex("by_address", (k) => k.eq("address", o)).first();
    if (c) {
      if (await r.db.patch(l._id, { used: !0 }), c.primaryAddress === n)
        return { success: !0, message: "Wallet j\xE1 est\xE1 linkada ao seu perfil", type: "already_linked" };
      throw new Error("Esta wallet j\xE1 est\xE1 linkada a outro perfil");
    }
    let f = await r.db.query("profiles").withIndex("by_address", (k) => k.eq("address", o)).first(), p = "link", y;
    f && (p = "merge", y = f.username, await r.db.delete(f._id), console.log(`\u{1F500} Merged profile @${y} (${o}) into @${d.username}`)), await r.db.insert("addressLinks", {
      address: o,
      primaryAddress: n,
      linkedAt: Date.now()
    });
    let g = d.linkedAddresses || [];
    return g.includes(o) || await r.db.patch(d._id, {
      linkedAddresses: [...g, o]
    }), await r.scheduler.runAfter(0, A.raidBoss.cleanupLinkedWalletRaidData, {
      linkedAddress: o
    }), await r.db.patch(l._id, { used: !0 }), p === "merge" ? (console.log(`\u{1F500} Account merged: @${y} (${o}) \u2192 @${d.username} (${n})`), {
      success: !0,
      type: "merge",
      message: `Conta @${y} mergeada com sucesso!`,
      mergedUsername: y,
      linkedWallet: o
    }) : (console.log(`\u{1F517} Wallet linked: ${o} \u2192 @${d.username} (${n})`), {
      success: !0,
      type: "link",
      message: "Wallet linkada com sucesso!",
      linkedWallet: o
    });
  }, "handler")
}), ce = b({
  args: { address: e.string() },
  handler: /* @__PURE__ */ u(async (r, { address: t }) => {
    if (!h(t))
      return null;
    let a = w(t), s = (await r.db.query("addressLinks").withIndex("by_address", (d) => d.eq("address", a)).first())?.primaryAddress || a, n = await r.db.query("walletLinkCodes").withIndex("by_profile", (d) => d.eq("profileAddress", s)).first();
    return !n || n.used || Date.now() > n.expiresAt ? null : {
      code: n.code,
      expiresAt: n.expiresAt
    };
  }, "handler")
}), fe = m({
  args: {
    address: e.string(),
    username: e.string(),
    stats: e.optional(
      e.object({
        totalPower: e.number(),
        totalCards: e.number(),
        openedCards: e.number(),
        unopenedCards: e.number(),
        pveWins: e.number(),
        pveLosses: e.number(),
        pvpWins: e.number(),
        pvpLosses: e.number(),
        attackWins: e.number(),
        attackLosses: e.number(),
        defenseWins: e.number(),
        defenseLosses: e.number()
      })
    ),
    defenseDeck: e.optional(e.array(
      e.object({
        tokenId: e.string(),
        power: e.number(),
        imageUrl: e.string(),
        name: e.string(),
        rarity: e.string(),
        foil: e.optional(e.string()),
        collection: e.optional(e.string())
        // FIX: Add collection to type
      })
    )),
    twitter: e.optional(e.string()),
    twitterHandle: e.optional(e.string()),
    twitterProfileImageUrl: e.optional(e.string()),
    fid: e.optional(e.string())
  },
  handler: /* @__PURE__ */ u(async (r, t) => {
    if (!h(t.address))
      throw new Error("Invalid Ethereum address format");
    let a = w(t.address), i = t.username.toLowerCase(), s = await r.db.query("profiles").withIndex("by_address", (d) => d.eq("address", a)).first(), n = Date.now();
    if (s)
      return await r.db.patch(s._id, {
        ...t,
        address: a,
        username: i,
        lastUpdated: n
      }), s._id;
    throw console.log(`\u{1F6AB} [SECURITY] Blocked legacy account creation for ${a} - must use Farcaster`), new Error("\u{1F512} Account creation requires Farcaster authentication. Please use the miniapp.");
  }, "handler")
}), ue = m({
  args: {
    address: e.string(),
    farcasterPfpUrl: e.string()
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, farcasterPfpUrl: a }) => {
    let i = w(t), s = await r.db.query("profiles").withIndex("by_address", (n) => n.eq("address", i)).first();
    if (!s)
      throw new Error("Profile not found");
    return await r.db.patch(s._id, { farcasterPfpUrl: a }), { success: !0 };
  }, "handler")
}), we = m({
  args: {
    address: e.string(),
    totalCards: e.number(),
    openedCards: e.number(),
    unopenedCards: e.number(),
    totalPower: e.number(),
    vibePower: e.optional(e.number()),
    vbrsPower: e.optional(e.number()),
    vibefidPower: e.optional(e.number()),
    afclPower: e.optional(e.number()),
    tokenIds: e.optional(e.array(e.string()))
  },
  handler: /* @__PURE__ */ u(async (r, t) => {
    let a = await r.db.query("profiles").withIndex("by_address", (n) => n.eq("address", w(t.address))).first();
    if (!a)
      throw new Error(`Profile not found: ${t.address}`);
    let s = {
      stats: {
        ...a.stats,
        totalCards: t.totalCards,
        openedCards: t.openedCards,
        unopenedCards: t.unopenedCards,
        totalPower: t.totalPower,
        ...t.vibePower !== void 0 && { vibePower: t.vibePower },
        ...t.vbrsPower !== void 0 && { vbrsPower: t.vbrsPower },
        ...t.vibefidPower !== void 0 && { vibefidPower: t.vibefidPower },
        ...t.afclPower !== void 0 && { afclPower: t.afclPower }
      },
      lastUpdated: Date.now()
    };
    t.tokenIds && (s.ownedTokenIds = t.tokenIds), await r.db.patch(a._id, s);
  }, "handler")
}), pe = m({
  args: {
    address: e.string(),
    stats: e.object({
      totalPower: e.number(),
      totalCards: e.number(),
      openedCards: e.number(),
      unopenedCards: e.number(),
      aura: e.optional(e.number()),
      honor: e.optional(e.number()),
      // legacy
      vibePower: e.optional(e.number()),
      vbrsPower: e.optional(e.number()),
      vibefidPower: e.optional(e.number()),
      afclPower: e.optional(e.number()),
      coqPower: e.optional(e.number()),
      // DEPRECATED: kept for backward compatibility
      pveWins: e.number(),
      pveLosses: e.number(),
      pvpWins: e.number(),
      pvpLosses: e.number(),
      attackWins: e.number(),
      attackLosses: e.number(),
      defenseWins: e.number(),
      defenseLosses: e.number()
    }),
    tokenIds: e.optional(e.array(e.string()))
    // Array of owned tokenIds for validation
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, stats: a, tokenIds: i }) => {
    let s = await r.db.query("profiles").withIndex("by_address", (d) => d.eq("address", w(t))).first();
    if (!s)
      throw new Error(`Profile not found: ${t}`);
    let n = {
      stats: a,
      lastUpdated: Date.now()
    };
    i && (n.ownedTokenIds = i), await r.db.patch(s._id, n);
  }, "handler")
}), me = m({
  args: {
    address: e.string(),
    defenseDeck: e.array(
      e.object({
        tokenId: e.string(),
        power: e.number(),
        imageUrl: e.string(),
        name: e.string(),
        rarity: e.string(),
        foil: e.optional(e.string()),
        collection: e.optional(e.string())
        // FIX: Add collection to type
      })
    )
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, defenseDeck: a }) => {
    try {
      let i = await q(r, t);
      if (L(i))
        throw new Error("Account banned: Defense deck feature disabled for exploiters");
      let s = await r.db.query("profiles").withIndex("by_address", (c) => c.eq("address", i)).first();
      if (!s)
        throw new Error(`Profile not found: ${t}`);
      let n = a.map((c) => {
        let f = {
          tokenId: c.tokenId,
          power: c.power,
          imageUrl: c.imageUrl,
          name: c.name,
          rarity: c.rarity,
          collection: c.collection || "vibe"
          // FIX: Always include collection
        };
        return c.foil && c.foil !== "" && (f.foil = c.foil), f;
      }), d = n.map((c) => c.tokenId), l = s.ownedTokenIds || [], o = [.../* @__PURE__ */ new Set([...l, ...d])];
      await r.db.patch(s._id, {
        defenseDeck: n,
        hasFullDefenseDeck: n.length === 5,
        // 🚀 BANDWIDTH FIX: For efficient leaderboard queries
        ownedTokenIds: o,
        lastUpdated: Date.now()
      }), console.log(`\u2705 Defense deck updated for ${w(t)}: ${n.length} cards, hasFullDefenseDeck: ${n.length === 5}, ownedTokenIds: ${o.length} total`);
    } catch (i) {
      throw i;
    }
  }, "handler")
}), he = m({
  args: { address: e.string() },
  handler: /* @__PURE__ */ u(async (r, { address: t }) => {
    let a = await q(r, t), i = await r.db.query("profiles").withIndex("by_address", (l) => l.eq("address", a)).first();
    if (!i)
      return {
        defenseDeck: [],
        removedCards: [],
        isValid: !1
      };
    if (!i.defenseDeck || i.defenseDeck.length === 0)
      return {
        defenseDeck: [],
        removedCards: [],
        isValid: !0
      };
    if (!i.ownedTokenIds || i.ownedTokenIds.length === 0)
      return {
        defenseDeck: i.defenseDeck.filter((o) => typeof o == "object"),
        removedCards: [],
        isValid: !1,
        // Not validated
        warning: "Defense deck not validated - ownedTokenIds missing"
      };
    let s = new Set(i.ownedTokenIds), n = [], d = [];
    for (let l of i.defenseDeck)
      typeof l == "object" && l.tokenId && (s.has(l.tokenId) ? n.push(l) : d.push(l));
    return d.length > 0 && (console.log(`\u26A0\uFE0F DEFENSE DECK VALIDATION for ${t}:`), console.log(`  - Original cards: ${i.defenseDeck.length}`), console.log(`  - Valid cards: ${n.length}`), console.log(`  - Removed cards: ${d.map((l) => l.tokenId).join(", ")}`), console.log(`  - ownedTokenIds count: ${i.ownedTokenIds?.length || 0}`), await r.db.patch(i._id, {
      defenseDeck: n,
      lastUpdated: Date.now()
    }), console.log(`\u2705 Defense deck updated for ${t}: ${n.length} valid, ${d.length} removed`)), {
      defenseDeck: n,
      removedCards: d,
      isValid: !0
    };
  }, "handler")
}), be = m({
  args: {
    address: e.string(),
    attacksToday: e.number(),
    lastAttackDate: e.string()
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, attacksToday: a, lastAttackDate: i }) => {
    let s = await r.db.query("profiles").withIndex("by_address", (n) => n.eq("address", w(t))).first();
    if (!s)
      throw new Error(`Profile not found: ${t}`);
    await r.db.patch(s._id, {
      attacksToday: a,
      lastAttackDate: i,
      lastUpdated: Date.now()
    });
  }, "handler")
}), ye = D({
  args: {
    address: e.string(),
    stat: e.union(
      e.literal("pvpWins"),
      e.literal("pvpLosses"),
      e.literal("attackWins"),
      e.literal("attackLosses"),
      e.literal("defenseWins"),
      e.literal("defenseLosses")
    )
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, stat: a }) => {
    let i = await r.db.query("profiles").withIndex("by_address", (n) => n.eq("address", w(t))).first();
    if (!i)
      throw new Error(`Profile not found: ${t}`);
    let s = { ...i.stats };
    s[a] = (s[a] || 0) + 1, await r.db.patch(i._id, {
      stats: s,
      lastUpdated: Date.now()
    });
  }, "handler")
}), ke = m({
  args: {
    address: e.string(),
    signature: e.string(),
    message: e.string(),
    stats: e.object({
      totalPower: e.number(),
      totalCards: e.number(),
      openedCards: e.number(),
      unopenedCards: e.number(),
      aura: e.optional(e.number()),
      honor: e.optional(e.number()),
      // legacy
      vibePower: e.optional(e.number()),
      vbrsPower: e.optional(e.number()),
      vibefidPower: e.optional(e.number()),
      afclPower: e.optional(e.number()),
      coqPower: e.optional(e.number()),
      // DEPRECATED: kept for backward compatibility
      pveWins: e.number(),
      pveLosses: e.number(),
      pvpWins: e.number(),
      pvpLosses: e.number(),
      attackWins: e.number(),
      attackLosses: e.number(),
      defenseWins: e.number(),
      defenseLosses: e.number()
    })
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, signature: a, message: i, stats: s }) => {
    let n = await C(r, t, a, i);
    if (!n.success)
      throw new Error(`Unauthorized: ${n.error}`);
    if (!await P(r, t, i))
      throw new Error("Invalid nonce - possible replay attack");
    await _(r, t);
    let l = await r.db.query("profiles").withIndex("by_address", (o) => o.eq("address", w(t))).first();
    if (!l)
      throw new Error(`Profile not found: ${t}`);
    await r.db.patch(l._id, {
      stats: s,
      lastUpdated: Date.now()
    });
  }, "handler")
}), Ie = m({
  args: {
    address: e.string(),
    signature: e.string(),
    message: e.string(),
    defenseDeck: e.array(
      e.object({
        tokenId: e.string(),
        power: e.number(),
        imageUrl: e.string(),
        name: e.string(),
        rarity: e.string(),
        foil: e.optional(e.string()),
        collection: e.optional(e.string())
        // FIX: Add collection to type
      })
    )
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, signature: a, message: i, defenseDeck: s }) => {
    let n = w(t);
    if (L(n))
      throw new Error("Account banned: Defense deck feature disabled for exploiters");
    let d = await C(r, t, a, i);
    if (!d.success)
      throw new Error(`Unauthorized: ${d.error}`);
    if (!await P(r, t, i))
      throw new Error("Invalid nonce - possible replay attack");
    await _(r, t);
    let o = await r.db.query("profiles").withIndex("by_address", (c) => c.eq("address", w(t))).first();
    if (!o)
      throw new Error(`Profile not found: ${t}`);
    await r.db.patch(o._id, {
      defenseDeck: s,
      lastUpdated: Date.now()
    });
  }, "handler")
}), qe = m({
  args: {
    address: e.string(),
    signature: e.string(),
    message: e.string(),
    stat: e.union(
      e.literal("pvpWins"),
      e.literal("pvpLosses"),
      e.literal("attackWins"),
      e.literal("attackLosses"),
      e.literal("defenseWins"),
      e.literal("defenseLosses")
    )
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, signature: a, message: i, stat: s }) => {
    let n = await C(r, t, a, i);
    if (!n.success)
      throw new Error(`Unauthorized: ${n.error}`);
    if (!await P(r, t, i))
      throw new Error("Invalid nonce - possible replay attack");
    await _(r, t);
    let l = await r.db.query("profiles").withIndex("by_address", (c) => c.eq("address", w(t))).first();
    if (!l)
      throw new Error(`Profile not found: ${t}`);
    let o = { ...l.stats };
    o[s] = (o[s] || 0) + 1, await r.db.patch(l._id, {
      stats: o,
      lastUpdated: Date.now()
    });
  }, "handler")
}), Ae = D({
  args: {},
  handler: /* @__PURE__ */ u(async (r) => {
    let t = await r.db.query("profiles").take(100), a = 0, i = 0;
    for (let s of t) {
      if (!s.defenseDeck || s.defenseDeck.length === 0) {
        i++;
        continue;
      }
      typeof s.defenseDeck[0] == "string" ? (await r.db.patch(s._id, {
        defenseDeck: void 0
      }), a++) : i++;
    }
    return {
      cleanedCount: a,
      skippedCount: i,
      totalProfiles: t.length
    };
  }, "handler")
}), De = b({
  args: {
    address: e.string(),
    mode: e.union(e.literal("attack"), e.literal("pvp"), e.literal("pve"))
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, mode: a }) => {
    let i = await q(r, t), s = await r.db.query("profiles").withIndex("by_address", (d) => d.eq("address", i)).first();
    if (!s)
      return { lockedTokenIds: [], isLockEnabled: !1 };
    if (a === "pve")
      return { lockedTokenIds: [], isLockEnabled: !1 };
    if (!s.defenseDeck || s.defenseDeck.length === 0)
      return { lockedTokenIds: [], isLockEnabled: !1 };
    let n = [];
    for (let d of s.defenseDeck)
      if (typeof d == "object" && d !== null && "tokenId" in d) {
        if (d.collection === "vibefid")
          continue;
        let l = `${d.collection || "default"}:${d.tokenId}`;
        n.push(l);
      } else typeof d == "string" && n.push(`default:${d}`);
    return {
      lockedTokenIds: n,
      isLockEnabled: !0,
      lockedCount: n.length
    };
  }, "handler")
}), Le = b({
  args: {
    address: e.string(),
    mode: e.union(e.literal("defense"), e.literal("raid"))
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, mode: a }) => {
    let i = await q(r, t), s = await r.db.query("profiles").withIndex("by_address", (f) => f.eq("address", i)).first(), n = await r.db.query("raidAttacks").withIndex("by_address", (f) => f.eq("address", i)).first(), d = [], l = [], o = [], c = /* @__PURE__ */ u((f) => `${f.collection || "default"}:${f.tokenId}`, "getCardKey");
    if (a === "defense") {
      if (n?.deck)
        for (let f of n.deck) {
          if (f.collection === "vibefid") continue;
          let p = c(f);
          d.push(p), l.push(p);
        }
      if (n?.vibefidCard && n.vibefidCard.collection !== "vibefid") {
        let f = c(n.vibefidCard);
        d.push(f), l.push(f);
      }
    } else if (a === "raid" && s?.defenseDeck)
      for (let f of s.defenseDeck)
        if (typeof f == "object" && f !== null && "tokenId" in f) {
          if (f.collection === "vibefid") continue;
          let p = c(f);
          d.push(p), o.push(p);
        } else typeof f == "string" && (d.push(`default:${f}`), o.push(`default:${f}`));
    return {
      lockedTokenIds: d,
      lockedByRaid: l,
      lockedByDefense: o,
      hasConflicts: !1
      // Will be set by migration check
    };
  }, "handler")
}), Ce = m({
  args: {
    address: e.string()
  },
  handler: /* @__PURE__ */ u(async (r, { address: t }) => {
    let a = w(t), i = await r.db.query("profiles").withIndex("by_address", (c) => c.eq("address", a)).first();
    if (!i || !i.defenseDeck || i.defenseDeck.length === 0)
      return { cleaned: 0, removed: [] };
    let s = await r.db.query("raidAttacks").withIndex("by_address", (c) => c.eq("address", a)).first();
    if (!s || !s.deck || s.deck.length === 0)
      return { cleaned: 0, removed: [] };
    let n = /* @__PURE__ */ u((c) => `${c.collection || "default"}:${c.tokenId}`, "getCardKey"), d = /* @__PURE__ */ new Set();
    for (let c of s.deck)
      c.collection !== "vibefid" && d.add(n(c));
    s.vibefidCard && s.vibefidCard.collection !== "vibefid" && d.add(n(s.vibefidCard));
    let l = [], o = i.defenseDeck.filter((c) => {
      let f, p;
      if (typeof c == "object" && c !== null && "tokenId" in c)
        f = n(c), p = c.collection;
      else if (typeof c == "string")
        f = `default:${c}`;
      else
        return !0;
      return p === "vibefid" ? !0 : d.has(f) ? (l.push(f), !1) : !0;
    });
    return l.length > 0 && o.length >= 5 ? (await r.db.patch(i._id, {
      defenseDeck: o
    }), console.log(`\u{1F9F9} Cleaned ${l.length} conflicting cards from ${a}'s defense deck`), {
      cleaned: l.length,
      removed: l
    }) : (l.length > 0 && o.length < 5 && console.log(`\u26A0\uFE0F Skipped cleaning ${l.length} cards - would leave only ${o.length} cards in defense`), {
      cleaned: 0,
      removed: []
    });
  }, "handler")
}), _e = m({
  args: {
    address: e.string(),
    revealedCards: e.array(e.object({
      tokenId: e.string(),
      name: e.string(),
      imageUrl: e.string(),
      rarity: e.string(),
      wear: e.optional(e.string()),
      foil: e.optional(e.string()),
      collection: e.optional(e.string()),
      // FIX: Add collection to type
      character: e.optional(e.string()),
      power: e.optional(e.number()),
      attributes: e.optional(e.any())
    }))
  },
  handler: /* @__PURE__ */ u(async (r, t) => {
    let { address: a, revealedCards: i } = t, s = w(a), n = await r.db.query("profiles").withIndex("by_address", (f) => f.eq("address", s)).first();
    if (!n)
      throw new Error("Profile not found");
    let d = n.revealedCardsCache || [], l = new Map(
      d.map((f) => [f.tokenId, f])
    ), o = Date.now();
    for (let f of i)
      (f.wear || f.character || f.power) && l.set(f.tokenId, {
        ...f,
        cachedAt: l.has(f.tokenId) ? l.get(f.tokenId).cachedAt : o
      });
    let c = Array.from(l.values());
    return await r.db.patch(n._id, {
      revealedCardsCache: c,
      lastUpdated: o
    }), {
      success: !0,
      cachedCount: c.length,
      newlyCached: c.length - d.length
    };
  }, "handler")
}), Pe = m({
  args: {
    address: e.string(),
    customMusicUrl: e.union(e.string(), e.null())
    // URL or null to clear
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, customMusicUrl: a }) => {
    let i = w(t), s = await r.db.query("profiles").withIndex("by_address", (n) => n.eq("address", i)).first();
    if (!s)
      throw new Error("Profile not found");
    return await r.db.patch(s._id, {
      customMusicUrl: a || void 0,
      // Convert null to undefined for removal
      lastUpdated: Date.now()
    }), {
      success: !0,
      customMusicUrl: a || null
    };
  }, "handler")
}), ve = m({
  args: {
    address: e.string(),
    playlist: e.array(e.string()),
    // Array of URLs (can be empty)
    lastPlayedIndex: e.optional(e.number())
    // Track which song was last played
  },
  handler: /* @__PURE__ */ u(async (r, { address: t, playlist: a, lastPlayedIndex: i }) => {
    let s = w(t), n = await r.db.query("profiles").withIndex("by_address", (d) => d.eq("address", s)).first();
    if (!n)
      throw new Error("Profile not found");
    return await r.db.patch(n._id, {
      musicPlaylist: a.length > 0 ? a : void 0,
      lastPlayedIndex: i ?? 0,
      // Clear legacy customMusicUrl if using playlist
      customMusicUrl: a.length > 0 ? void 0 : n.customMusicUrl,
      lastUpdated: Date.now()
    }), {
      success: !0,
      playlist: a,
      lastPlayedIndex: i ?? 0
    };
  }, "handler")
}), Ee = b({
  args: {
    address: e.string()
  },
  handler: /* @__PURE__ */ u(async (r, { address: t }) => {
    let a = w(t), i = await r.db.query("profiles").withIndex("by_address", (s) => s.eq("address", a)).first();
    return i ? {
      playlist: i.musicPlaylist || [],
      lastPlayedIndex: i.lastPlayedIndex || 0
    } : { playlist: [], lastPlayedIndex: 0 };
  }, "handler")
}), $e = $({
  args: {},
  handler: /* @__PURE__ */ u(async (r) => await r.db.query("profiles").take(200), "handler")
}), Ue = b({
  args: { fid: e.number() },
  handler: /* @__PURE__ */ u(async (r, { fid: t }) => {
    let a = await r.db.query("profiles").withIndex("by_fid", (i) => i.eq("farcasterFid", t)).first();
    return a ? {
      username: a.username || "Unknown",
      fid: a.farcasterFid,
      address: a.address,
      coins: a.coins || 0,
      coinsInbox: a.coinsInbox || 0,
      lifetimeEarned: a.lifetimeEarned || 0,
      totalCards: a.stats?.totalCards || 0,
      wins: (a.stats?.pveWins || 0) + (a.stats?.pvpWins || 0)
    } : null;
  }, "handler")
}), xe = b({
  args: { limit: e.optional(e.number()) },
  handler: /* @__PURE__ */ u(async (r, { limit: t = 10 }) => (await r.db.query("profiles").take(500)).filter((s) => (s.coins || 0) > 0).sort((s, n) => (n.coins || 0) - (s.coins || 0)).slice(0, t).map((s) => ({
    username: s.username || "Unknown",
    fid: s.farcasterFid,
    coins: s.coins || 0,
    coinsInbox: s.coinsInbox || 0,
    lifetimeEarned: s.lifetimeEarned || 0
  })), "handler")
}), Fe = b({
  args: {},
  handler: /* @__PURE__ */ u(async (r) => {
    let t = await r.db.query("profiles").collect(), a = 0, i = 0, s = 0;
    for (let n of t)
      n.farcasterFid ? i++ : n.fid ? a++ : s++;
    return {
      total: t.length,
      migrated: i,
      legacy: a,
      noFid: s,
      needsMigration: a > 0
    };
  }, "handler")
}), We = D({
  args: {},
  handler: /* @__PURE__ */ u(async (r) => {
    let t = await r.db.query("profiles").collect(), a = 0, i = [];
    for (let s of t) {
      if (s.farcasterFid) continue;
      let n = s.fid;
      if (n)
        try {
          let d = parseInt(n, 10);
          !isNaN(d) && d > 0 ? (await r.db.patch(s._id, { farcasterFid: d }), a++, console.log(`\u2705 Migrated profile ${s.username} (FID: ${d})`)) : i.push(`Invalid FID for ${s.username}: ${n}`);
        } catch (d) {
          i.push(`Error migrating ${s.username}: ${d.message}`);
        }
    }
    return console.log(`\u{1F504} Migration complete: ${a} profiles migrated`), {
      migratedCount: a,
      errors: i
    };
  }, "handler")
});
export {
  Ce as cleanConflictingDefenseCards,
  Ae as cleanOldDefenseDecks,
  Fe as countLegacyFidProfiles,
  ne as generateFidLinkCode,
  se as generateLinkCode,
  de as generateMergeCode,
  ce as getActiveLinkCode,
  De as getAvailableCards,
  K as getDefenseDeckOnly,
  Q as getLeaderboardLite,
  ee as getLinkedAddresses,
  Le as getLockedCardsForDeckBuilding,
  Ee as getMusicPlaylist,
  R as getProfile,
  Ue as getProfileByFid,
  X as getProfileByUsername,
  H as getProfileDashboard,
  O as getProfileLite,
  xe as getTopByCoins,
  he as getValidatedDefenseDeck,
  ye as incrementStat,
  qe as incrementStatSecure,
  re as isSameUser,
  G as isUsernameAvailable,
  Z as linkWallet,
  $e as listAll,
  We as migrateLegacyFidProfiles,
  ie as unlinkWallet,
  be as updateAttacks,
  Pe as updateCustomMusic,
  me as updateDefenseDeck,
  Ie as updateDefenseDeckSecure,
  ue as updateFarcasterPfp,
  Y as updateLeaderboardFullCache,
  ve as updateMusicPlaylist,
  _e as updateRevealedCardsCache,
  pe as updateStats,
  we as updateStatsLite,
  ke as updateStatsSecure,
  fe as upsertProfile,
  J as upsertProfileFromFarcaster,
  ae as useFidLinkCode,
  te as useLinkCode,
  oe as useMergeCode,
  le as useUnifiedCode
};
//# sourceMappingURL=profiles.js.map
