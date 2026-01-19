import {
  a as P
} from "./_deps/HHLKWD3J.js";
import {
  h as C
} from "./_deps/QS6BMXBV.js";
import {
  a as b,
  b as q,
  c as m,
  d as g
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as i
} from "./_deps/34SVKERO.js";
import {
  a as l
} from "./_deps/5B5TEMMX.js";

// convex/cardPacks.ts
function A() {
  let a = new Uint32Array(1);
  return crypto.getRandomValues(a), a[0] / 4294967296;
}
l(A, "cryptoRandomFloat");
function _(a) {
  let e = new Uint32Array(1);
  return crypto.getRandomValues(e), e[0] % a;
}
l(_, "cryptoRandomInt");
var w = {
  starter: {
    name: "Starter Pack",
    description: "Welcome pack for new players",
    cards: 3,
    price: 0,
    // Free
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 }
  },
  basic: {
    name: "Basic Pack",
    description: "1 card per pack",
    cards: 1,
    price: 1e3,
    // 1k coins = 1 card
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 }
  },
  premium: {
    name: "Premium Pack",
    description: "Better odds for rare and epic",
    cards: 5,
    price: 1e4,
    // 10k coins - 5x mais caro
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 }
  },
  elite: {
    name: "Elite Pack",
    description: "Best odds - Guaranteed rare or better",
    cards: 5,
    price: 1e5,
    // 100k coins - EQUIVALENTE A 1 PACK NFT REAL!
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 }
  },
  boosted: {
    name: "Luck Boost Pack",
    description: "1 card with better odds",
    cards: 1,
    price: 5e3,
    // 5x basic price for better odds on 1 card
    // NERFED: ROI ~0.68x (was 1.07x) - 82/14/3.5/0.5
    rarityOdds: { Common: 82, Rare: 14, Epic: 3.5, Legendary: 0.5 }
  },
  mission: {
    name: "Mission Reward",
    description: "Earned from completing missions",
    cards: 2,
    price: 0,
    // Earned, not bought
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 }
  },
  achievement: {
    name: "Achievement Pack",
    description: "Special achievement reward",
    cards: 3,
    price: 0,
    // Earned, not bought
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 }
  },
  dailyFree: {
    name: "Daily Free Pack",
    description: "Free daily shot - claim once per day!",
    cards: 1,
    price: 0,
    // FREE!
    rarityOdds: { Common: 93, Rare: 6, Epic: 0.8, Legendary: 0.2 }
  }
};
function I(a) {
  let e = Object.values(a).reduce((r, t) => r + t, 0), n = A() * e;
  for (let [r, t] of Object.entries(a))
    if (n -= t, n <= 0) return r;
  return "common";
}
l(I, "rollRarity");
var R = {
  common: 3,
  // proxy (5), (6), (7)
  rare: 3,
  // proxy, proxy (1), (8)
  epic: 3,
  // proxy (1), (2), (3)
  legendary: 2
  // proxy, proxy (4)
};
var L = { None: 92, Standard: 7, Prize: 1 }, v = { None: 96, Standard: 3.5, Prize: 0.5 };
var x = { Pristine: 2, Mint: 10, "Lightly Played": 33, "Moderately Played": 35, "Heavily Played": 20 };
function D(a, e, n) {
  let r = {
    Common: 5,
    Rare: 20,
    Epic: 80,
    Legendary: 240,
    Mythic: 800
  }, t = {
    Pristine: 1.8,
    Mint: 1.4,
    "Lightly Played": 1,
    "Moderately Played": 1,
    "Heavily Played": 1
  }, o = {
    Prize: 15,
    Standard: 2.5,
    None: 1
  }, s = r[a] || 5, d = t[e] || 1, c = n && o[n] || 1, y = s * d * c * 0.5;
  return Math.max(1, Math.round(y));
}
l(D, "calculateCardPower");
function E(a, e) {
  let n = a.toLowerCase(), r = R[n] || 1, t = _(r), s = I(e === "boosted" ? v : L), d = I(x), c = `${a}_${t}_${s}_${d}_${Date.now()}`, y = `/cards/${a.toLowerCase()}/`, p = {
    common: ["proxy (5).png", "proxy (6).png", "proxy (7).png"],
    rare: ["proxy.png", "proxy (1).png", "proxy (8).png"],
    epic: ["proxy (1).png", "proxy (2).png", "proxy (3).png"],
    legendary: ["proxy.png", "proxy (4).png"]
  }, u = p[n]?.[t] || p[n]?.[0] || "proxy (5).png", f = D(a, d, s !== "None" ? s : void 0);
  return {
    cardId: c,
    suit: a,
    // Using rarity as identifier
    rank: u.replace(".png", ""),
    // Image name as rank
    variant: "default",
    rarity: a,
    imageUrl: `${y}${encodeURIComponent(u)}`,
    badgeType: "FREE_CARD",
    foil: s !== "None" ? s : void 0,
    // Only include if special
    wear: d,
    power: f
    // Power calculated EXACTLY same as NFT
  };
}
l(E, "generateRandomCard");
var z = b({
  args: { address: i.string() },
  handler: /* @__PURE__ */ l(async (a, e) => (await a.db.query("cardPacks").withIndex("by_address", (r) => r.eq("address", e.address.toLowerCase())).filter((r) => r.gt(r.field("unopened"), 0)).take(100)).map((r) => ({
    ...r,
    packInfo: w[r.packType]
  })), "handler")
}), H = b({
  args: {},
  handler: /* @__PURE__ */ l(async () => [
    { type: "basic", ...w.basic }
  ], "handler")
}), Y = b({
  args: { address: i.string() },
  handler: /* @__PURE__ */ l(async (a, e) => await a.db.query("cardInventory").withIndex("by_address", (r) => r.eq("address", e.address.toLowerCase())).take(1e3), "handler")
}), j = b({
  args: { address: i.string() },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase(), r = [], t = await a.db.query("profiles").withIndex("by_address", (s) => s.eq("address", n)).first();
    if (t?.defenseDeck)
      for (let s of t.defenseDeck)
        typeof s == "object" && s !== null && "tokenId" in s && s.collection === "free" && r.push(s.tokenId);
    let o = await a.db.query("raidAttacks").withIndex("by_address", (s) => s.eq("address", n)).first();
    if (o?.deck)
      for (let s of o.deck)
        s.isFreeCard && s.tokenId && (r.includes(s.tokenId) || r.push(s.tokenId));
    return r;
  }, "handler")
}), G = q({
  args: {},
  handler: /* @__PURE__ */ l(async (a) => {
    let e = await a.db.query("cardInventory").collect(), n = e.reduce((o, s) => o + s.quantity, 0), r = new Set(e.map((o) => o.address)).size, t = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    };
    return e.forEach((o) => {
      let s = o.rarity.toLowerCase();
      s in t && (t[s] += o.quantity);
    }), {
      totalCards: n,
      uniqueCards: e.length,
      uniquePlayers: r,
      byRarity: t
    };
  }, "handler")
}), W = q({
  args: {},
  handler: /* @__PURE__ */ l(async (a) => {
    let e = await a.db.query("cardInventory").take(20);
    return {
      sampleSize: e.length,
      note: "This is a sample. Use admin tools for full counts.",
      cards: e.map((n) => ({
        id: n._id,
        address: n.address,
        cardId: n.cardId,
        rarity: n.rarity,
        imageUrl: n.imageUrl,
        quantity: n.quantity,
        power: n.power
      }))
    };
  }, "handler")
}), Q = g({
  args: {},
  handler: /* @__PURE__ */ l(async (a) => {
    let e = await a.db.query("cardInventory").collect(), n = 0;
    for (let r of e) {
      let t = r.address.toLowerCase();
      r.address !== t && (await a.db.patch(r._id, {
        address: t
      }), n++);
    }
    return {
      success: !0,
      totalCards: e.length,
      updatedCards: n,
      message: `Normalized ${n} card addresses to lowercase!`
    };
  }, "handler")
}), J = m({
  args: {
    address: i.string(),
    packType: i.union(i.literal("basic"), i.literal("premium"), i.literal("elite")),
    quantity: i.number()
  },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase(), r = w[e.packType];
    if (!r || r.price === 0)
      throw new Error("This pack type cannot be purchased");
    let t = r.price * e.quantity, o = await a.db.query("profiles").withIndex("by_address", (c) => c.eq("address", n)).first();
    if (!o)
      throw new Error("Profile not found");
    let s = o.coins || 0;
    if (s < t)
      throw new Error(`Not enough coins. Need ${t} coins, have ${s} coins`);
    await a.db.patch(o._id, {
      coins: s - t,
      lifetimeSpent: (o.lifetimeSpent || 0) + t
    }), await a.db.insert("coinTransactions", {
      address: n,
      amount: -t,
      type: "spend",
      source: `buy_pack_${e.packType}`,
      description: `Bought ${e.quantity}x ${e.packType} pack`,
      timestamp: Date.now(),
      balanceBefore: s,
      balanceAfter: s - t
    });
    let d = await a.db.query("cardPacks").withIndex("by_address_packType", (c) => c.eq("address", n).eq("packType", e.packType)).first();
    return d ? await a.db.patch(d._id, {
      unopened: d.unopened + e.quantity
    }) : await a.db.insert("cardPacks", {
      address: n,
      packType: e.packType,
      unopened: e.quantity,
      earnedAt: Date.now()
    }), {
      success: !0,
      packsReceived: e.quantity,
      coinsSpent: t,
      remainingCoins: s - t
    };
  }, "handler")
}), X = m({
  args: {
    address: i.string(),
    packType: i.union(i.literal("basic"), i.literal("premium"), i.literal("elite"), i.literal("boosted")),
    quantity: i.number(),
    txHash: i.string(),
    // Transaction hash for verification
    vbmsAmount: i.optional(i.number())
    // VBMS amount spent (from API)
  },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase(), r = e.packType, t = w[r];
    if (!t || t.price === 0)
      throw new Error("This pack type cannot be purchased");
    if (!await a.db.query("profiles").withIndex("by_address", (c) => c.eq("address", n)).first())
      throw new Error("Profile not found");
    let s = await a.db.query("cardPacks").withIndex("by_address_packType", (c) => c.eq("address", n).eq("packType", r)).first();
    s ? await a.db.patch(s._id, {
      unopened: s.unopened + e.quantity
    }) : await a.db.insert("cardPacks", {
      address: n,
      packType: r,
      unopened: e.quantity,
      earnedAt: Date.now()
    });
    let d = e.vbmsAmount || t.price * e.quantity;
    return await a.db.insert("coinTransactions", {
      address: n,
      amount: d,
      type: "spend",
      source: `buy_pack_${r}_vbms`,
      description: `Bought ${e.quantity}x ${r} pack with ${d.toLocaleString()} VBMS`,
      timestamp: Date.now(),
      balanceBefore: 0,
      balanceAfter: 0,
      txHash: e.txHash
    }), console.log(`\u{1F48E} VBMS Purchase: ${n} bought ${e.quantity}x ${e.packType} (stored as ${r}) packs (tx: ${e.txHash.slice(0, 10)}...)`), {
      success: !0,
      packsReceived: e.quantity,
      txHash: e.txHash
    };
  }, "handler")
}), Z = m({
  args: {
    address: i.string(),
    packId: i.id("cardPacks")
  },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase(), r = await a.db.get(e.packId);
    if (!r)
      throw new Error("Pack not found");
    if (r.address !== n)
      throw new Error("Not your pack");
    if (r.unopened <= 0)
      throw new Error("No unopened packs");
    let t = w[r.packType];
    if (!t)
      throw new Error("Invalid pack type");
    let o = [];
    for (let s = 0; s < t.cards; s++) {
      let d = I(t.rarityOdds), c = E(d, r.packType), y = await a.db.query("cardInventory").withIndex("by_address", (p) => p.eq("address", n)).filter((p) => p.eq(p.field("cardId"), c.cardId)).first();
      y ? (await a.db.patch(y._id, {
        quantity: y.quantity + 1
      }), o.push({ ...c, isDuplicate: !0, quantity: 1 })) : (await a.db.insert("cardInventory", {
        address: n,
        ...c,
        quantity: 1,
        equipped: !1,
        obtainedAt: Date.now(),
        sourcePackType: r.packType
        // Track pack origin for burn value
      }), o.push({ ...c, isDuplicate: !1, quantity: 1 }));
    }
    return await a.db.patch(e.packId, {
      unopened: r.unopened - 1
    }), {
      success: !0,
      cards: o,
      packType: r.packType,
      packsRemaining: r.unopened - 1
    };
  }, "handler")
}), ee = m({
  args: {
    address: i.string(),
    packId: i.id("cardPacks")
  },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase(), r = await a.db.get(e.packId);
    if (!r)
      throw new Error("Pack not found");
    if (r.address !== n)
      throw new Error("Not your pack");
    if (r.unopened <= 0)
      throw new Error("No unopened packs");
    let t = w[r.packType];
    if (!t)
      throw new Error("Invalid pack type");
    let o = [], s = r.unopened;
    for (let d = 0; d < s; d++)
      for (let c = 0; c < t.cards; c++) {
        let y = I(t.rarityOdds), p = E(y, r.packType), u = await a.db.query("cardInventory").withIndex("by_address", (f) => f.eq("address", n)).filter((f) => f.eq(f.field("cardId"), p.cardId)).first();
        u ? (await a.db.patch(u._id, {
          quantity: u.quantity + 1
        }), o.push({ ...p, isDuplicate: !0, quantity: 1 })) : (await a.db.insert("cardInventory", {
          address: n,
          ...p,
          quantity: 1,
          equipped: !1,
          obtainedAt: Date.now(),
          sourcePackType: r.packType
          // Track pack origin for burn value
        }), o.push({ ...p, isDuplicate: !1, quantity: 1 }));
      }
    return await a.db.patch(e.packId, {
      unopened: 0
    }), {
      success: !0,
      cards: o,
      packType: r.packType,
      packsOpened: s,
      packsRemaining: 0
    };
  }, "handler")
}), ae = m({
  args: {
    address: i.string(),
    packType: i.string(),
    quantity: i.number(),
    sourceId: i.optional(i.string())
  },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase();
    if (!(e.packType in w))
      throw new Error("Invalid pack type");
    let r = await a.db.query("cardPacks").withIndex("by_address_packType", (t) => t.eq("address", n).eq("packType", e.packType)).first();
    return r ? await a.db.patch(r._id, {
      unopened: r.unopened + e.quantity
    }) : await a.db.insert("cardPacks", {
      address: n,
      packType: e.packType,
      unopened: e.quantity,
      sourceId: e.sourceId,
      earnedAt: Date.now()
    }), {
      success: !0,
      packsAwarded: e.quantity
    };
  }, "handler")
}), re = m({
  args: { address: i.string() },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase();
    return await a.db.query("cardPacks").withIndex("by_address_packType", (t) => t.eq("address", n).eq("packType", "starter")).first() ? { success: !1, message: "Starter pack already claimed" } : (await a.db.insert("cardPacks", {
      address: n,
      packType: "starter",
      unopened: 1,
      earnedAt: Date.now()
    }), { success: !0, message: "Starter pack awarded!" });
  }, "handler")
}), te = m({
  args: { address: i.string() },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase(), r = Date.now(), t = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], o = await a.db.query("profiles").withIndex("by_address", (d) => d.eq("address", n)).first();
    if (!o)
      return { success: !1, message: "Profile not found" };
    if (o.hasClaimedSharePack)
      return {
        success: !1,
        message: "You already claimed your FREE pack for sharing! Daily shares give tokens instead."
      };
    let s = await a.db.query("cardPacks").withIndex("by_address_packType", (d) => d.eq("address", n).eq("packType", "basic")).first();
    return s ? await a.db.patch(s._id, {
      unopened: s.unopened + 1
    }) : await a.db.insert("cardPacks", {
      address: n,
      packType: "basic",
      unopened: 1,
      earnedAt: r
    }), await a.db.patch(o._id, {
      hasClaimedSharePack: !0,
      hasSharedProfile: !0
    }), {
      success: !0,
      message: "FREE pack awarded for sharing! Open it in the Shop. Daily shares give tokens."
    };
  }, "handler")
}), ne = g({
  args: {},
  handler: /* @__PURE__ */ l(async (a) => {
    let e = {
      common: ["proxy (5).png", "proxy (6).png", "proxy (7).png"],
      rare: ["proxy.png", "proxy (1).png", "proxy (8).png"],
      epic: ["proxy (1).png", "proxy (2).png", "proxy (3).png"],
      legendary: ["proxy.png", "proxy (4).png"]
    }, n = await a.db.query("cardInventory").collect(), r = 0, t = [];
    for (let o of n) {
      let s = o.rarity.toLowerCase(), d = e[s];
      if (d && d.length > 0) {
        let c = o.imageUrl.includes(" "), y = o.imageUrl.includes("proxy-");
        if (c || y) {
          let u = _(d.length), f = d[u], k = `/cards/${s}/${encodeURIComponent(f)}`;
          await a.db.patch(o._id, {
            imageUrl: k
          }), t.push(`${o.cardId}: ${o.imageUrl} -> ${k}`), r++;
        }
      }
    }
    return {
      success: !0,
      updatedCards: r,
      totalCards: n.length,
      updates: t.slice(0, 10),
      // First 10 updates for logging
      message: r > 0 ? `Updated ${r} cards with corrected image URLs!` : `All ${n.length} cards already have correct URLs!`
    };
  }, "handler")
}), se = g({
  args: { username: i.string() },
  handler: /* @__PURE__ */ l(async (a, { username: e }) => {
    let n = await a.db.query("profiles").withIndex("by_username", (d) => d.eq("username", e.toLowerCase())).first();
    if (!n)
      return {
        success: !1,
        error: `Profile not found for username: ${e}`
      };
    let r = n.address;
    console.log("\u{1F50D} Found profile:", { username: e, address: r });
    let t = await a.db.query("cardInventory").withIndex("by_address", (d) => d.eq("address", r)).collect();
    console.log("\u{1F3B4} User has", t.length, "cards");
    let o = 0;
    for (let d of t)
      await a.db.delete(d._id), o++;
    console.log("\u{1F5D1}\uFE0F Deleted", o, "cards");
    let s = await a.db.query("cardPacks").withIndex("by_address_packType", (d) => d.eq("address", r).eq("packType", "basic")).first();
    return s ? (await a.db.patch(s._id, {
      unopened: s.unopened + 1
    }), console.log("\u{1F381} Added 1 pack to existing pack (total:", s.unopened + 1, ")")) : (await a.db.insert("cardPacks", {
      address: r,
      packType: "basic",
      unopened: 1,
      sourceId: "reset_compensation",
      earnedAt: Date.now()
    }), console.log("\u{1F381} Created new pack with 1 unopened")), {
      success: !0,
      username: e,
      address: r,
      cardsDeleted: o,
      packGiven: !0
    };
  }, "handler")
}), B = {
  Common: 0.2,
  // 20% of pack price
  Rare: 1.1,
  // 110% of pack price
  Epic: 4,
  // 4x pack price
  Legendary: 40
  // 40x pack price
}, F = {
  Prize: 5,
  // 5x burn value for Prize foil (nerfed from 10x)
  Standard: 1.5,
  // 1.5x burn value for Standard foil (nerfed from 2x)
  None: 1
  // Normal burn value
}, T = 1e3;
function U(a) {
  if (!a) return T;
  let e = w[a];
  return e && e.price > 0 ? e.price : T;
}
l(U, "getPackPrice");
var M = {
  Common: 200,
  // 20% of basic pack price (1000)
  Rare: 1100,
  // 110% of basic pack price
  Epic: 4e3,
  // 4x basic pack price
  Legendary: 4e4
  // 40x basic pack price
};
function S(a, e, n) {
  let r = U(n), t = B[a] || 0.2, o = e && e !== "None" && F[e] || 1;
  return Math.round(r * t * o);
}
l(S, "calculateBurnValue");
var oe = m({
  args: {
    address: i.string(),
    cardId: i.id("cardInventory")
  },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase(), r = await a.db.get(e.cardId);
    if (!r)
      throw new Error("Card not found");
    if (r.address !== n)
      throw new Error("Not your card");
    let t = S(r.rarity, r.foil, r.sourcePackType), o = await a.db.query("profiles").withIndex("by_address", (c) => c.eq("address", n)).first();
    if (!o)
      throw new Error("Profile not found");
    r.quantity > 1 ? await a.db.patch(e.cardId, {
      quantity: r.quantity - 1
    }) : await a.db.delete(e.cardId);
    let s = o.coins || 0, d = o.lifetimeEarned || 0;
    return await a.db.patch(o._id, {
      coins: s + t,
      lifetimeEarned: d + t
    }), await P(a, {
      address: n,
      type: "earn",
      amount: t,
      source: "burn_card",
      description: `Burned ${r.rarity} card for ${t} TESTVBMS`,
      balanceBefore: s,
      balanceAfter: s + t
    }), await C(
      a,
      n,
      "earn",
      t,
      s,
      s + t,
      "burn_card",
      e.cardId.toString(),
      { reason: `Burned ${r.rarity} card` }
    ), console.log(`\u{1F525} BURN: ${n} burned ${r.rarity} card for ${t} VBMS`), {
      success: !0,
      burnedRarity: r.rarity,
      vbmsReceived: t,
      newBalance: s + t
    };
  }, "handler")
}), de = m({
  args: {
    address: i.string(),
    cardIds: i.array(i.id("cardInventory"))
  },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase();
    if (e.cardIds.length === 0)
      throw new Error("No cards selected");
    if (e.cardIds.length > 50)
      throw new Error("Maximum 50 cards per burn");
    let r = await a.db.query("profiles").withIndex("by_address", (p) => p.eq("address", n)).first();
    if (!r)
      throw new Error("Profile not found");
    let t = 0, o = [], s = {};
    for (let p of e.cardIds) {
      let u = await a.db.get(p);
      if (!u || u.address !== n) continue;
      let f = S(u.rarity, u.foil, u.sourcePackType);
      t += f;
      let k = u.foil && u.foil !== "None" ? `_${u.foil}` : "", $ = u.sourcePackType ? `_${u.sourcePackType}` : "", h = `${u.rarity}${k}${$}`;
      s[h] || (s[h] = { count: 0, vbms: 0, packType: u.sourcePackType }), s[h].count += 1, s[h].vbms += f, u.quantity > 1 ? await a.db.patch(p, {
        quantity: u.quantity - 1
      }) : await a.db.delete(p);
    }
    for (let [p, u] of Object.entries(s)) {
      let f = p.split("_"), k = f.slice(0, f[1] === "Prize" || f[1] === "Standard" ? 2 : 1).join("_");
      o.push({
        rarity: k,
        count: u.count,
        vbms: u.vbms,
        packType: u.packType
      });
    }
    let d = r.coins || 0, c = r.lifetimeEarned || 0;
    await a.db.patch(r._id, {
      coins: d + t,
      lifetimeEarned: c + t
    });
    let y = o.map((p) => `${p.count}x ${p.rarity}`).join(", ");
    return await P(a, {
      address: n,
      type: "earn",
      amount: t,
      source: "burn_cards",
      description: `Burned ${e.cardIds.length} cards (${y}) for ${t} TESTVBMS`,
      balanceBefore: d,
      balanceAfter: d + t
    }), await C(
      a,
      n,
      "earn",
      t,
      d,
      d + t,
      "burn_cards",
      `${e.cardIds.length}_cards`,
      { reason: `Burned ${e.cardIds.length} cards: ${y}` }
    ), console.log(`\u{1F525} MASS BURN: ${n} burned ${e.cardIds.length} cards for ${t} VBMS`), {
      success: !0,
      cardsBurned: e.cardIds.length,
      totalVBMS: t,
      burnedCards: o,
      newBalance: d + t
    };
  }, "handler")
}), ie = b({
  args: {},
  handler: /* @__PURE__ */ l(async () => M, "handler")
}), ce = m({
  args: {
    address: i.string(),
    quantity: i.number(),
    boosted: i.boolean()
    // true = elite odds for 5x price
  },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase(), s = (e.boosted ? 5e3 : 1e3) * e.quantity, d = await a.db.query("profiles").withIndex("by_address", (f) => f.eq("address", n)).first();
    if (!d)
      throw new Error("Profile not found");
    let c = d.coins || 0;
    if (c < s)
      throw new Error(`Not enough coins. Need ${s}, have ${c}`);
    await a.db.patch(d._id, {
      coins: c - s,
      lifetimeSpent: (d.lifetimeSpent || 0) + s
    });
    let y = e.boosted ? "boosted" : "basic";
    await a.db.insert("coinTransactions", {
      address: n,
      amount: -s,
      type: "spend",
      source: `buy_pack_${y}`,
      description: `Bought ${e.quantity}x ${y} pack`,
      timestamp: Date.now(),
      balanceBefore: c,
      balanceAfter: c - s
    });
    let p = e.boosted ? "elite" : "basic", u = await a.db.query("cardPacks").withIndex("by_address_packType", (f) => f.eq("address", n).eq("packType", p)).first();
    return u ? await a.db.patch(u._id, {
      unopened: u.unopened + e.quantity
    }) : await a.db.insert("cardPacks", {
      address: n,
      packType: p,
      unopened: e.quantity,
      earnedAt: Date.now()
    }), console.log(`\u{1F4B0} Pack Purchase: ${n} bought ${e.quantity}x ${p} pack(s) for ${s} VBMS`), {
      success: !0,
      packsReceived: e.quantity,
      packType: p,
      coinsSpent: s,
      remainingCoins: c - s,
      boosted: e.boosted
    };
  }, "handler")
}), pe = b({
  args: { address: i.string() },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase(), r = await a.db.query("dailyFreeClaims").withIndex("by_address", (c) => c.eq("address", n)).first();
    if (!r)
      return { canClaim: !0, nextClaimAt: null };
    let t = Date.now(), o = r.claimedAt, s = 1440 * 60 * 1e3, d = o + s;
    return t >= d ? { canClaim: !0, nextClaimAt: null } : {
      canClaim: !1,
      nextClaimAt: d,
      timeRemaining: d - t
    };
  }, "handler")
}), le = m({
  args: { address: i.string() },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.address.toLowerCase(), r = await a.db.query("dailyFreeClaims").withIndex("by_address", (d) => d.eq("address", n)).first(), t = Date.now(), o = 1440 * 60 * 1e3;
    if (r && t < r.claimedAt + o)
      throw new Error("Already claimed today! Come back tomorrow.");
    let s = await a.db.query("cardPacks").withIndex("by_address_packType", (d) => d.eq("address", n).eq("packType", "basic")).first();
    return s ? await a.db.patch(s._id, {
      unopened: s.unopened + 1
    }) : await a.db.insert("cardPacks", {
      address: n,
      packType: "basic",
      unopened: 1,
      sourceId: "daily_free",
      earnedAt: t
    }), r ? await a.db.patch(r._id, {
      claimedAt: t,
      totalClaims: (r.totalClaims || 0) + 1
    }) : await a.db.insert("dailyFreeClaims", {
      address: n,
      claimedAt: t,
      totalClaims: 1
    }), console.log(`\u{1F381} Daily Free: ${n} claimed a free pack!`), {
      success: !0,
      packsAwarded: 1
    };
  }, "handler")
}), ue = g({
  args: {},
  handler: /* @__PURE__ */ l(async (a) => {
    let e = await a.db.query("dailyFreeClaims").collect();
    for (let n of e)
      await a.db.delete(n._id);
    return { deleted: e.length };
  }, "handler")
}), ye = g({
  args: {
    cards: i.array(i.object({
      address: i.string(),
      cardId: i.string(),
      suit: i.string(),
      rank: i.string(),
      variant: i.string(),
      rarity: i.string(),
      imageUrl: i.string(),
      badgeType: i.string(),
      foil: i.optional(i.string()),
      wear: i.string(),
      power: i.number(),
      quantity: i.number()
    }))
  },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = 0, r = [];
    for (let t of e.cards) {
      let o = t.address.toLowerCase(), s = t.imageUrl.includes("%20") ? t.imageUrl : t.imageUrl.replace(/ /g, "%20"), d = await a.db.insert("cardInventory", {
        address: o,
        cardId: t.cardId,
        suit: t.suit,
        rank: t.rank,
        variant: t.variant,
        rarity: t.rarity,
        imageUrl: s,
        badgeType: t.badgeType,
        foil: t.foil,
        wear: t.wear,
        power: t.power,
        quantity: t.quantity,
        equipped: !1,
        obtainedAt: Date.now()
      });
      r.push({
        cardId: d,
        rarity: t.rarity,
        power: t.power,
        address: o
      }), n++;
    }
    return {
      success: !0,
      restoredCount: n,
      cards: r,
      message: `Successfully restored ${n} cards!`
    };
  }, "handler")
}), fe = m({
  args: {
    senderAddress: i.string(),
    recipientAddress: i.string(),
    packType: i.union(i.literal("basic"), i.literal("boosted"), i.literal("premium"), i.literal("elite"))
  },
  handler: /* @__PURE__ */ l(async (a, e) => {
    let n = e.senderAddress.toLowerCase(), r = e.recipientAddress.toLowerCase();
    if (n === r)
      throw new Error("N\xE3o pode enviar pack para voc\xEA mesmo");
    let t = w[e.packType];
    if (!t || t.price === 0)
      throw new Error("Tipo de pack inv\xE1lido");
    let o = t.price, s = await a.db.query("profiles").withIndex("by_address", (p) => p.eq("address", n)).first();
    if (!s)
      throw new Error("Perfil do remetente n\xE3o encontrado");
    let d = s.coins || 0;
    if (d < o)
      throw new Error(`Saldo insuficiente. Precisa de ${o.toLocaleString()} TESTVBMS, tem ${d.toLocaleString()}`);
    let c = await a.db.query("profiles").withIndex("by_address", (p) => p.eq("address", r)).first();
    if (!c)
      throw new Error("Perfil do destinat\xE1rio n\xE3o encontrado");
    await a.db.patch(s._id, {
      coins: d - o,
      lifetimeSpent: (s.lifetimeSpent || 0) + o
    }), await P(a, {
      address: n,
      type: "spend",
      amount: -o,
      source: "gift_pack",
      description: `Gifted ${e.packType} pack to ${c.username}`,
      balanceBefore: d,
      balanceAfter: d - o
    });
    let y = await a.db.query("cardPacks").withIndex("by_address_packType", (p) => p.eq("address", r).eq("packType", e.packType)).first();
    return y ? await a.db.patch(y._id, {
      unopened: y.unopened + 1
    }) : await a.db.insert("cardPacks", {
      address: r,
      packType: e.packType,
      unopened: 1,
      earnedAt: Date.now(),
      sourceId: `gift_from_${n}`
    }), console.log(`\u{1F381} GIFT PACK: ${s.username} sent ${e.packType} pack to ${c.username} (${o} TESTVBMS)`), {
      success: !0,
      packType: e.packType,
      packPrice: o,
      senderUsername: s.username,
      recipientUsername: c.username,
      senderNewBalance: d - o
    };
  }, "handler")
}), me = b({
  args: {},
  handler: /* @__PURE__ */ l(async () => [
    { type: "basic", name: "Basic Pack", price: 1e3, cards: 1, description: "1 card" },
    { type: "boosted", name: "Boosted Pack", price: 5e3, cards: 1, description: "1 card, better odds" },
    { type: "premium", name: "Premium Pack", price: 1e4, cards: 5, description: "5 cards" },
    { type: "elite", name: "Elite Pack", price: 1e5, cards: 5, description: "5 cards, best odds" }
  ], "handler")
});
export {
  ue as adminResetDailyFreeClaims,
  ae as awardPack,
  oe as burnCard,
  de as burnMultipleCards,
  J as buyPack,
  ce as buyPackWithLuckBoost,
  X as buyPackWithVBMS,
  pe as canClaimDailyFree,
  le as claimDailyFreePack,
  W as debugAllCards,
  ie as getBurnValues,
  G as getFreeCardsStats,
  me as getGiftPackOptions,
  j as getLockedFreeCardIds,
  Y as getPlayerCards,
  z as getPlayerPacks,
  H as getShopPacks,
  fe as giftPack,
  re as giveStarterPack,
  Q as normalizeCardAddresses,
  ee as openAllPacks,
  Z as openPack,
  se as resetUserFreeCards,
  ye as restoreCards,
  te as rewardProfileShare,
  ne as updateAllCardImages
};
//# sourceMappingURL=cardPacks.js.map
