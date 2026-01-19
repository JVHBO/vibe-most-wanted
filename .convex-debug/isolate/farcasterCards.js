import {
  b as C
} from "./_deps/AWJMSRP7.js";
import {
  a as w,
  c as f,
  d as b
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as r
} from "./_deps/34SVKERO.js";
import {
  a as d
} from "./_deps/5B5TEMMX.js";

// convex/farcasterCards.ts
var $ = f({
  args: {
    // Farcaster Data (from Neynar API)
    fid: r.number(),
    username: r.string(),
    displayName: r.string(),
    pfpUrl: r.string(),
    bio: r.string(),
    neynarScore: r.number(),
    followerCount: r.number(),
    followingCount: r.number(),
    powerBadge: r.boolean(),
    // Owner
    address: r.string(),
    // Card traits (calculated on frontend)
    rarity: r.string(),
    foil: r.string(),
    wear: r.string(),
    power: r.number(),
    // Playing card properties
    suit: r.string(),
    // "hearts", "diamonds", "spades", "clubs"
    rank: r.string(),
    // "2"-"10", "J", "Q", "K", "A"
    suitSymbol: r.string(),
    // "♥", "♦", "♠", "♣"
    color: r.string(),
    // "red" or "black"
    // Generated image URLs
    imageUrl: r.string(),
    // Video (MP4)
    cardImageUrl: r.optional(r.string()),
    // Static PNG for sharing
    shareImageUrl: r.optional(r.string()),
    // Share image with card + criminal text
    // Contract
    contractAddress: r.optional(r.string()),
    // NFT contract address
    // Optional: User language preference
    language: r.optional(r.string())
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = e.address.toLowerCase(), i = await a.db.query("farcasterCards").withIndex("by_fid", (s) => s.eq("fid", e.fid)).first();
    if (i)
      throw console.error(`\u274C DUPLICATE PREVENTION: FID ${e.fid} already exists in database!`), console.error(`   Existing card: ${i.rank}${i.suitSymbol} (${i.rarity}) - ID: ${i._id}`), new Error(
        `FID ${e.fid} already minted! Each FID can only be minted once. If you believe this is an error, please contact support.`
      );
    let n = Date.now(), o = `farcaster_${e.fid}_${n}`, c = await a.db.insert("farcasterCards", {
      // Farcaster Data
      fid: e.fid,
      username: e.username,
      displayName: e.displayName,
      pfpUrl: e.pfpUrl,
      bio: e.bio.slice(0, 200),
      // Truncate bio
      // Owner
      address: t,
      // Contract
      contractAddress: e.contractAddress,
      // Card Properties
      cardId: o,
      rarity: e.rarity,
      foil: e.foil,
      wear: e.wear,
      status: "Rarity Assigned",
      // All Farcaster cards have rarity from Neynar score
      power: e.power,
      // Playing Card Properties
      suit: e.suit,
      rank: e.rank,
      suitSymbol: e.suitSymbol,
      color: e.color,
      // Farcaster Stats
      neynarScore: e.neynarScore,
      latestNeynarScore: e.neynarScore,
      // Initialize with mint score for Most Wanted ranking
      latestScoreCheckedAt: Date.now(),
      followerCount: e.followerCount,
      followingCount: e.followingCount,
      powerBadge: e.powerBadge,
      // Generated Images
      imageUrl: e.imageUrl,
      // Video (MP4)
      cardImageUrl: e.cardImageUrl,
      // Static PNG for sharing
      shareImageUrl: e.shareImageUrl,
      // Share image with card + criminal text
      // Game State
      equipped: !1,
      // Metadata
      mintedAt: Date.now()
    });
    console.log(`\u2705 Farcaster card minted: FID ${e.fid} (${e.rarity}) by ${t}`);
    try {
      await a.db.insert("neynarScoreHistory", {
        fid: e.fid,
        username: e.username,
        score: e.neynarScore,
        rarity: e.rarity,
        checkedAt: Date.now()
      }), console.log(`Initial Neynar score saved: ${e.neynarScore}`);
    } catch (s) {
      console.error("Failed to save initial score:", s);
    }
    try {
      let s = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], l = `\u{1F389} **Welcome to VibeFID, ${e.username}!**

Your **${e.rarity}** card has been created!

\u{1F4F1} **VibeFID** \u2192 Your Farcaster profile became a collectible card! Power is based on your Neynar Score.

\u{1F3AE} [Vibe Most Wanted](https://farcaster.xyz/miniapps/0sNKxskaSKsH/vbms---game-and-wanted-cast) \u2192 Battle with your card in Poker and PvP. Bet VBMS in Mecha Arena and fight Raid Bosses!

\u{1F0CF} **Partner Collections** \u2192 Cards from partner projects also work in battles!

\u{1F3AF} **Wanted Cast** \u2192 Interact with featured posts and earn VBMS!

\u{1F4EC} **VibeMail** \u2192 Your inbox for anonymous messages.

Good luck! \u{1F680}`;
      await a.db.insert("cardVotes", {
        cardFid: e.fid,
        voterFid: 0,
        // System
        voterAddress: "0x0000000000000000000000000000000000000000",
        date: s,
        createdAt: Date.now(),
        voteCount: 0,
        isPaid: !1,
        message: l,
        isRead: !1
      }), await a.scheduler.runAfter(0, C.notifications.sendVibemailNotification, {
        recipientFid: e.fid,
        hasAudio: !1
      }), console.log(`\u{1F4EC} Welcome VibeMail sent to FID ${e.fid}`);
    } catch (s) {
      console.error("Failed to send welcome VibeMail:", s);
    }
    try {
      let s = await a.db.query("profiles").withIndex("by_address", (l) => l.eq("address", t)).first();
      if (s) {
        let l = s.ownedTokenIds || [], u = e.fid.toString();
        l.includes(u) || (await a.db.patch(s._id, {
          ownedTokenIds: [...l, u]
        }), console.log(`\u2705 Added VibeFID ${u} to profile's ownedTokenIds`));
      }
    } catch (s) {
      console.error("Failed to update ownedTokenIds:", s);
    }
    return {
      success: !0,
      cardId: o,
      rarity: e.rarity,
      power: e.power,
      message: `Successfully minted ${e.rarity} card for ${e.username}!`
    };
  }, "handler")
}), F = w({
  args: {
    address: r.string()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = e.address.toLowerCase();
    return await a.db.query("farcasterCards").withIndex("by_address", (n) => n.eq("address", t)).take(100);
  }, "handler")
}), q = w({
  args: {
    fid: r.number()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (n) => n.eq("fid", e.fid)).take(20);
    return t.length === 0 ? null : t.sort((n, o) => o._creationTime - n._creationTime)[0];
  }, "handler")
}), g = w({
  args: {
    fid: r.number()
  },
  handler: /* @__PURE__ */ d(async (a, e) => (await a.db.query("farcasterCards").withIndex("by_fid", (i) => i.eq("fid", e.fid)).take(50)).sort((i, n) => n._creationTime - i._creationTime), "handler")
}), _ = f({
  args: {
    address: r.string(),
    cardId: r.string()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = e.address.toLowerCase(), i = await a.db.query("farcasterCards").withIndex("by_address", (n) => n.eq("address", t)).filter((n) => n.eq(n.field("cardId"), e.cardId)).first();
    if (!i)
      throw new Error("Card not found or not owned by you");
    return await a.db.patch(i._id, {
      equipped: !i.equipped,
      lastUsed: Date.now()
    }), {
      success: !0,
      equipped: !i.equipped
    };
  }, "handler")
}), D = w({
  args: {
    limit: r.optional(r.number())
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = Math.min(e.limit || 100, 500);
    return await a.db.query("farcasterCards").order("desc").take(t);
  }, "handler")
}), R = w({
  args: {
    limit: r.optional(r.number()),
    cursor: r.optional(r.number())
    // _creationTime of last item
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = Math.min(e.limit || 50, 100), i = a.db.query("farcasterCards").order("desc");
    if (e.cursor) {
      let s = e.cursor;
      i = i.filter((l) => l.lt(l.field("_creationTime"), s));
    }
    let n = await i.take(t + 1), o = n.length > t, c = o ? n.slice(0, t) : n;
    return {
      cards: c,
      nextCursor: o && c.length > 0 ? c[c.length - 1]._creationTime : null,
      hasMore: o
    };
  }, "handler")
}), x = w({
  args: {
    searchTerm: r.optional(r.string()),
    limit: r.optional(r.number()),
    offset: r.optional(r.number())
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = Math.min(e.limit || 12, 50), i = e.offset || 0, n = e.searchTerm?.trim(), o, c = 0;
    if (!n || n.length === 0) {
      let l = await a.db.query("farcasterCards").order("desc").take(i + t + 1);
      o = l.slice(i, i + t), c = l.length > i + t ? i + t + 1 : l.length;
    } else if (/^\d+$/.test(n)) {
      let u = parseInt(n, 10), y = await a.db.query("farcasterCards").withIndex("by_fid", (p) => p.eq("fid", u)).first();
      if (y)
        o = [y], c = 1;
      else {
        let m = (await a.db.query("farcasterCards").order("desc").take(500)).filter(
          (h) => h.fid.toString().includes(n)
        );
        o = m.slice(i, i + t), c = m.length;
      }
    } else {
      let u = await a.db.query("farcasterCards").withSearchIndex("search_username", (y) => y.search("username", n)).take(i + t + 50);
      o = u.slice(i, i + t), c = u.length;
    }
    let s = c > i + t;
    return {
      cards: o,
      totalCount: c,
      hasMore: s,
      offset: i,
      limit: t
    };
  }, "handler")
}), A = w({
  args: {
    rarity: r.string(),
    limit: r.optional(r.number())
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = Math.min(e.limit || 50, 100);
    return await a.db.query("farcasterCards").withIndex("by_rarity", (n) => n.eq("rarity", e.rarity)).take(t);
  }, "handler")
}), N = b({
  args: {},
  handler: /* @__PURE__ */ d(async (a) => {
    let e = "0x60274A138d026E3cB337B40567100FdEC3127565", t = await a.db.query("farcasterCards").collect(), i = 0;
    for (let n of t)
      n.contractAddress?.toLowerCase() === e.toLowerCase() || (await a.db.delete(n._id), i++);
    return console.log(`\u{1F5D1}\uFE0F Deleted ${i} old VibeFID cards from previous contracts`), {
      success: !0,
      deletedCount: i
    };
  }, "handler")
}), P = b({
  args: {
    docId: r.id("farcasterCards")
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.get(e.docId);
    if (!t)
      throw new Error(`Card with ID ${e.docId} not found`);
    return console.log(`\u{1F5D1}\uFE0F  Deleting orphan card: FID ${t.fid} (@${t.username}) - ${t.rank}${t.suitSymbol}`), await a.db.delete(e.docId), {
      success: !0,
      deleted: {
        fid: t.fid,
        username: t.username,
        suit: t.suitSymbol
      }
    };
  }, "handler")
}), k = b({
  args: {
    fid: r.number(),
    rarity: r.string(),
    neynarScore: r.number(),
    power: r.number()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (i) => i.eq("fid", e.fid)).first();
    if (!t)
      throw new Error(`No card found for FID ${e.fid}`);
    return await a.db.patch(t._id, {
      rarity: e.rarity,
      neynarScore: e.neynarScore,
      power: e.power,
      upgradedAt: void 0,
      previousRarity: void 0,
      previousNeynarScore: void 0
    }), { success: !0 };
  }, "handler")
}), E = f({
  args: {
    fid: r.number(),
    newNeynarScore: r.number(),
    newRarity: r.string()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (h) => h.eq("fid", e.fid)).first();
    if (!t)
      throw new Error(`No card found for FID ${e.fid}`);
    let i = ["Common", "Rare", "Epic", "Legendary", "Mythic"], n = i.indexOf(t.rarity);
    if (i.indexOf(e.newRarity) <= n)
      throw new Error(
        `Cannot upgrade: New rarity (${e.newRarity}) is not higher than current (${t.rarity})`
      );
    let c = {
      Common: 10,
      Rare: 20,
      Epic: 50,
      Legendary: 100,
      Mythic: 600
    }, s = {
      Pristine: 1.8,
      Mint: 1.4,
      "Lightly Played": 1,
      "Moderately Played": 1,
      "Heavily Played": 1
    }, l = {
      Prize: 6,
      Standard: 2,
      None: 1
    }, u = c[e.newRarity] || 10, y = s[t.wear] || 1, p = l[t.foil] || 1, m = Math.round(u * y * p);
    return await a.db.patch(t._id, {
      rarity: e.newRarity,
      neynarScore: e.newNeynarScore,
      // Update card score to current score at upgrade time
      power: m,
      // Mark when upgraded - save history for tracking
      upgradedAt: Date.now(),
      previousRarity: t.rarity,
      previousNeynarScore: t.neynarScore
      // Save the score before upgrade
    }), console.log(`\u2705 Card upgraded: FID ${e.fid} from ${t.rarity} to ${e.newRarity} (Power: ${t.power} \u2192 ${m})`), {
      success: !0,
      fid: e.fid,
      oldRarity: t.rarity,
      newRarity: e.newRarity,
      oldPower: t.power,
      newPower: m
    };
  }, "handler")
}), M = f({
  args: {
    fid: r.number(),
    newNeynarScore: r.number()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (i) => i.eq("fid", e.fid)).first();
    if (!t)
      throw new Error(`No card found for FID ${e.fid}`);
    return await a.db.patch(t._id, {
      latestNeynarScore: e.newNeynarScore,
      latestScoreCheckedAt: Date.now()
    }), console.log(`\u2705 Card refreshed: FID ${e.fid} score ${t.neynarScore} \u2192 ${e.newNeynarScore} (rarity unchanged: ${t.rarity})`), {
      success: !0,
      fid: e.fid,
      rarity: t.rarity,
      power: t.power,
      oldScore: t.neynarScore,
      newScore: e.newNeynarScore
    };
  }, "handler")
}), T = w({
  args: {
    limit: r.optional(r.number())
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = e.limit || 20;
    return await a.db.query("farcasterCards").order("desc").take(t);
  }, "handler")
}), B = f({
  args: {
    fid: r.number(),
    imageUrl: r.optional(r.string()),
    // Video URL (MP4/WebM)
    cardImageUrl: r.optional(r.string()),
    // Static PNG
    shareImageUrl: r.optional(r.string())
    // Share image with card + criminal text
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (n) => n.eq("fid", e.fid)).first();
    if (!t)
      throw new Error(`No card found for FID ${e.fid}`);
    let i = {};
    return e.imageUrl && (i.imageUrl = e.imageUrl), e.cardImageUrl && (i.cardImageUrl = e.cardImageUrl), e.shareImageUrl && (i.shareImageUrl = e.shareImageUrl), await a.db.patch(t._id, i), console.log(`\u2705 Card images updated for FID ${e.fid}`), e.imageUrl && console.log(`   Video: ${e.imageUrl}`), e.cardImageUrl && console.log(`   Static: ${e.cardImageUrl}`), e.shareImageUrl && console.log(`   Share: ${e.shareImageUrl}`), {
      success: !0,
      fid: e.fid,
      imageUrl: e.imageUrl,
      cardImageUrl: e.cardImageUrl,
      shareImageUrl: e.shareImageUrl
    };
  }, "handler")
}), v = f({
  args: {
    fid: r.number(),
    pfpUrl: r.string()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (i) => i.eq("fid", e.fid)).first();
    if (!t)
      throw new Error(`No card found for FID ${e.fid}`);
    return await a.db.patch(t._id, { pfpUrl: e.pfpUrl }), console.log(`\u2705 Updated pfpUrl for FID ${e.fid}`), { success: !0, fid: e.fid };
  }, "handler")
}), V = f({
  args: {
    fid: r.number()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (i) => i.eq("fid", e.fid)).first();
    if (!t)
      throw new Error(`No card found for FID ${e.fid}`);
    return await a.db.delete(t._id), console.log(`\u{1F5D1}\uFE0F Deleted unminted card for FID ${e.fid} (${t.username})`), { success: !0, fid: e.fid, username: t.username };
  }, "handler")
}), L = w({
  args: {
    limit: r.optional(r.number())
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = Math.min(e.limit || 8, 20);
    return (await a.db.query("farcasterCards").order("desc").take(t + 10)).filter((o) => o.cardImageUrl).slice(5, 5 + t).map((o) => ({
      _id: o._id,
      fid: o.fid,
      cardImageUrl: o.cardImageUrl
    }));
  }, "handler")
}), O = f({
  args: {
    fid: r.number(),
    username: r.string(),
    displayName: r.string(),
    pfpUrl: r.string(),
    bio: r.string(),
    neynarScore: r.number(),
    followerCount: r.number(),
    followingCount: r.number(),
    powerBadge: r.boolean(),
    address: r.string(),
    rarity: r.string(),
    foil: r.string(),
    wear: r.string(),
    power: r.number(),
    suit: r.string(),
    rank: r.string(),
    suitSymbol: r.string(),
    color: r.string(),
    imageUrl: r.string(),
    cardImageUrl: r.optional(r.string()),
    shareImageUrl: r.optional(r.string()),
    contractAddress: r.optional(r.string())
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = e.address.toLowerCase();
    if (await a.db.query("farcasterCards").withIndex("by_fid", (c) => c.eq("fid", e.fid)).first())
      return { success: !1, error: "Card already exists", fid: e.fid };
    let n = Date.now(), o = `farcaster_${e.fid}_${n}`;
    return await a.db.insert("farcasterCards", {
      fid: e.fid,
      username: e.username,
      displayName: e.displayName,
      pfpUrl: e.pfpUrl,
      bio: (e.bio || "").slice(0, 200),
      address: t,
      contractAddress: e.contractAddress || "0x60274a138d026e3cb337b40567100fdec3127565",
      cardId: o,
      rarity: e.rarity,
      foil: e.foil,
      wear: e.wear,
      status: "Rarity Assigned",
      power: e.power,
      suit: e.suit,
      rank: e.rank,
      suitSymbol: e.suitSymbol,
      color: e.color,
      neynarScore: e.neynarScore,
      latestNeynarScore: e.neynarScore,
      latestScoreCheckedAt: n,
      followerCount: e.followerCount,
      followingCount: e.followingCount,
      powerBadge: e.powerBadge,
      imageUrl: e.imageUrl,
      cardImageUrl: e.cardImageUrl,
      shareImageUrl: e.shareImageUrl,
      // CRITICAL: These required fields were missing before!
      equipped: !1,
      mintedAt: n
    }), console.log(`\u2705 Reimported card: FID ${e.fid} (@${e.username}) - ${e.rarity}`), { success: !0, fid: e.fid };
  }, "handler")
}), z = f({
  args: {
    fid: r.number(),
    neynarScore: r.number()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (i) => i.eq("fid", e.fid)).first();
    if (!t)
      throw new Error(`No card found for FID ${e.fid}`);
    return await a.db.patch(t._id, {
      neynarScore: e.neynarScore
    }), console.log(`\u2705 Updated neynarScore for FID ${e.fid} to ${e.neynarScore}`), { success: !0, fid: e.fid, neynarScore: e.neynarScore };
  }, "handler")
}), W = f({
  args: {
    fid: r.number(),
    newAddress: r.string()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (i) => i.eq("fid", e.fid)).first();
    if (!t)
      throw new Error(`Card with FID ${e.fid} not found`);
    return await a.db.patch(t._id, {
      address: e.newAddress.toLowerCase()
    }), { success: !0, fid: e.fid, oldAddress: t.address, newAddress: e.newAddress.toLowerCase() };
  }, "handler")
}), H = f({
  args: {
    fid: r.number(),
    newRarity: r.string()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (n) => n.eq("fid", e.fid)).first();
    if (!t)
      throw new Error(`Card with FID ${e.fid} not found`);
    let i = t.rarity;
    return await a.db.patch(t._id, {
      rarity: e.newRarity
    }), { success: !0, fid: e.fid, oldRarity: i, newRarity: e.newRarity };
  }, "handler")
}), Y = f({
  args: {
    fid: r.number(),
    newRarity: r.string(),
    newPower: r.number()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (o) => o.eq("fid", e.fid)).first();
    if (!t)
      throw new Error(`Card with FID ${e.fid} not found`);
    let i = t.rarity, n = t.power;
    return await a.db.patch(t._id, {
      rarity: e.newRarity,
      power: e.newPower
    }), { success: !0, fid: e.fid, oldRarity: i, newRarity: e.newRarity, oldPower: n, newPower: e.newPower };
  }, "handler")
}), K = f({
  args: {
    fid: r.number(),
    newFoil: r.string(),
    newPower: r.number()
  },
  handler: /* @__PURE__ */ d(async (a, e) => {
    let t = await a.db.query("farcasterCards").withIndex("by_fid", (o) => o.eq("fid", e.fid)).first();
    if (!t)
      throw new Error(`Card with FID ${e.fid} not found`);
    let i = t.foil, n = t.power;
    return await a.db.patch(t._id, {
      foil: e.newFoil,
      power: e.newPower
    }), {
      success: !0,
      fid: e.fid,
      oldFoil: i,
      newFoil: e.newFoil,
      oldPower: n,
      newPower: e.newPower
    };
  }, "handler")
});
export {
  N as deleteAllOldVibeFIDCards,
  P as deleteOrphanCardById,
  V as deleteUnmintedCard,
  W as fixCardAddress,
  K as fixCardFoilAndPower,
  H as fixCardRarity,
  Y as fixCardRarityAndPower,
  D as getAllFarcasterCards,
  L as getCardImagesOnly,
  q as getFarcasterCardByFid,
  F as getFarcasterCardsByAddress,
  g as getFarcasterCardsByFid,
  A as getFarcasterCardsByRarity,
  R as getFarcasterCardsPaginated,
  T as getRecentFarcasterCards,
  $ as mintFarcasterCard,
  M as refreshCardScore,
  O as reimportCard,
  k as resetCardRarity,
  x as searchFarcasterCards,
  _ as toggleEquipFarcasterCard,
  B as updateCardImages,
  v as updateCardPfp,
  z as updateNeynarScore,
  E as upgradeCardRarity
};
//# sourceMappingURL=farcasterCards.js.map
