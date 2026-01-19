import {
  b as s,
  d as l
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as r
} from "./_deps/34SVKERO.js";
import {
  a
} from "./_deps/5B5TEMMX.js";

// convex/farcasterCardsAdmin.ts
var p = l({
  args: {
    // Farcaster Data
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
    // Card traits
    rarity: r.string(),
    foil: r.string(),
    wear: r.string(),
    power: r.number(),
    // Playing card properties
    suit: r.string(),
    rank: r.string(),
    suitSymbol: r.string(),
    color: r.string(),
    // IPFS URL from the on-chain NFT
    imageUrl: r.string()
  },
  handler: /* @__PURE__ */ a(async (t, e) => {
    let n = e.address.toLowerCase();
    if (await t.db.query("farcasterCards").withIndex("by_fid", (d) => d.eq("fid", e.fid)).first())
      throw new Error(`Card for FID ${e.fid} already exists in Convex`);
    let i = Date.now(), o = `farcaster_${e.fid}_${i}`;
    return await t.db.insert("farcasterCards", {
      fid: e.fid,
      username: e.username,
      displayName: e.displayName,
      pfpUrl: e.pfpUrl,
      bio: e.bio.slice(0, 200),
      address: n,
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
      followerCount: e.followerCount,
      followingCount: e.followingCount,
      powerBadge: e.powerBadge,
      imageUrl: e.imageUrl,
      equipped: !1,
      mintedAt: i
    }), console.log(`\u2705 Added metadata for already-minted FID ${e.fid}`), {
      success: !0,
      message: `Metadata added for FID ${e.fid}`
    };
  }, "handler")
}), w = l({
  args: {
    fid: r.number(),
    foil: r.optional(r.string()),
    wear: r.optional(r.string()),
    power: r.optional(r.number()),
    imageUrl: r.optional(r.string()),
    cardImageUrl: r.optional(r.string())
  },
  handler: /* @__PURE__ */ a(async (t, e) => {
    let n = await t.db.query("farcasterCards").withIndex("by_fid", (o) => o.eq("fid", e.fid)).collect();
    if (n.length === 0)
      throw new Error(`No card found for FID ${e.fid}`);
    let f = n.sort((o, d) => d._creationTime - o._creationTime)[0], i = {};
    return e.foil !== void 0 && (i.foil = e.foil), e.wear !== void 0 && (i.wear = e.wear), e.power !== void 0 && (i.power = e.power), e.imageUrl !== void 0 && (i.imageUrl = e.imageUrl), e.cardImageUrl !== void 0 && (i.cardImageUrl = e.cardImageUrl), await t.db.patch(f._id, i), console.log(`Updated FID ${e.fid}:`, i), { success: !0, fid: e.fid, updates: i };
  }, "handler")
}), y = s({
  args: {},
  handler: /* @__PURE__ */ a(async (t) => (await t.db.query("farcasterCards").collect()).map((n) => ({
    fid: n.fid,
    imageUrl: n.imageUrl,
    cardImageUrl: n.cardImageUrl,
    shareImageUrl: n.shareImageUrl
  })), "handler")
});
export {
  p as addMintedCardMetadata,
  y as listAllMintedCards,
  w as updateCardTraits
};
//# sourceMappingURL=farcasterCardsAdmin.js.map
