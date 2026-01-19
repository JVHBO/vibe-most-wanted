import {
  h as t
} from "./34SVKERO.js";
import {
  a
} from "./5B5TEMMX.js";

// convex/cardSchema.ts
var l = t.object({
  // Required fields
  tokenId: t.string(),
  name: t.string(),
  power: t.number(),
  rarity: t.union(
    t.literal("Common"),
    t.literal("Rare"),
    t.literal("Epic"),
    t.literal("Legendary"),
    t.literal("Mythic"),
    t.literal("common"),
    t.literal("rare"),
    t.literal("epic"),
    t.literal("legendary"),
    t.literal("mythic")
  ),
  // Optional visual fields
  imageUrl: t.optional(t.string()),
  collection: t.optional(t.string()),
  foil: t.optional(t.string()),
  wear: t.optional(t.string()),
  // Optional game fields
  equipped: t.optional(t.boolean()),
  contractAddress: t.optional(t.string()),
  address: t.optional(t.string()),
  // VibeFID specific
  fid: t.optional(t.number()),
  username: t.optional(t.string()),
  displayName: t.optional(t.string()),
  pfpUrl: t.optional(t.string()),
  neynarScore: t.optional(t.number()),
  // Playing card properties
  suit: t.optional(t.string()),
  rank: t.optional(t.string()),
  suitSymbol: t.optional(t.string()),
  color: t.optional(t.string()),
  // Additional metadata (for NFT attributes)
  attributes: t.optional(t.array(t.object({
    trait_type: t.string(),
    value: t.union(t.string(), t.number())
  })))
}), s = t.object({
  tokenId: t.string(),
  power: t.number(),
  name: t.optional(t.string()),
  imageUrl: t.optional(t.string()),
  collection: t.optional(t.string()),
  rarity: t.optional(t.string()),
  foil: t.optional(t.string()),
  wear: t.optional(t.string()),
  fid: t.optional(t.number()),
  username: t.optional(t.string()),
  displayName: t.optional(t.string()),
  pfpUrl: t.optional(t.string()),
  suit: t.optional(t.string()),
  rank: t.optional(t.string()),
  suitSymbol: t.optional(t.string()),
  color: t.optional(t.string()),
  contractAddress: t.optional(t.string()),
  // Free card fields
  badgeType: t.optional(t.string()),
  isFreeCard: t.optional(t.boolean()),
  description: t.optional(t.string()),
  title: t.optional(t.string()),
  status: t.optional(t.string()),
  // NFT metadata fields
  acquiredAt: t.optional(t.any()),
  character: t.optional(t.string()),
  // NFT attributes array
  attributes: t.optional(t.array(t.object({
    trait_type: t.string(),
    value: t.union(t.string(), t.number())
  })))
}), p = t.object({
  tokenId: t.string(),
  power: t.number(),
  name: t.string(),
  imageUrl: t.optional(t.string()),
  collection: t.optional(t.string()),
  rarity: t.optional(t.string()),
  contractAddress: t.optional(t.string())
});
function g(o, n = 0, i = 1e5) {
  return o.power >= n && o.power <= i;
}
a(g, "validateCardPower");
function c(o, n = 10) {
  return Array.isArray(o) && o.length === n;
}
a(c, "validateDeckSize");
function u(o) {
  let n = {};
  for (let [i, r] of Object.entries(o))
    typeof r == "string" ? n[i] = r.replace(/<[^>]*>/g, "").slice(0, 1e3) : typeof r == "number" ? n[i] = Math.max(-1e6, Math.min(1e6, r)) : n[i] = r;
  return n;
}
a(u, "sanitizeCard");

export {
  l as a,
  s as b,
  p as c,
  g as d,
  c as e,
  u as f
};
//# sourceMappingURL=IJFCN5IR.js.map
