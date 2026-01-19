import {
  a as r,
  d as c
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as n
} from "./_deps/34SVKERO.js";
import {
  a as i
} from "./_deps/5B5TEMMX.js";

// convex/nftCollections.ts
var u = r({
  args: {},
  handler: /* @__PURE__ */ i(async (t) => await t.db.query("nftCollections").withIndex("by_active", (e) => e.eq("active", !0)).collect(), "handler")
}), w = r({
  args: {},
  handler: /* @__PURE__ */ i(async (t) => await t.db.query("nftCollections").collect(), "handler")
}), f = c({
  args: {
    collectionId: n.string(),
    name: n.string(),
    shortName: n.string(),
    contractAddress: n.string(),
    chain: n.string()
  },
  handler: /* @__PURE__ */ i(async (t, e) => {
    if (await t.db.query("nftCollections").withIndex("by_collection_id", (s) => s.eq("collectionId", e.collectionId)).first())
      throw new Error(`Collection with ID "${e.collectionId}" already exists`);
    return { success: !0, id: await t.db.insert("nftCollections", {
      ...e,
      active: !0,
      createdAt: Date.now()
    }) };
  }, "handler")
}), C = c({
  args: {
    collectionId: n.string()
  },
  handler: /* @__PURE__ */ i(async (t, e) => {
    let o = await t.db.query("nftCollections").withIndex("by_collection_id", (l) => l.eq("collectionId", e.collectionId)).first();
    if (!o)
      throw new Error(`Collection "${e.collectionId}" not found`);
    return await t.db.delete(o._id), { success: !0 };
  }, "handler")
}), h = c({
  args: {
    collectionId: n.string()
  },
  handler: /* @__PURE__ */ i(async (t, e) => {
    let o = await t.db.query("nftCollections").withIndex("by_collection_id", (l) => l.eq("collectionId", e.collectionId)).first();
    if (!o)
      throw new Error(`Collection "${e.collectionId}" not found`);
    return await t.db.patch(o._id, {
      active: !o.active
    }), { success: !0, active: !o.active };
  }, "handler")
}), g = c({
  args: {},
  handler: /* @__PURE__ */ i(async (t) => await t.db.query("nftCollections").first() ? { success: !1, message: "Collections already initialized" } : (await t.db.insert("nftCollections", {
    collectionId: "vbms",
    name: "Vibe Most Wanted",
    shortName: "VBMS",
    contractAddress: "0xF14C1dC8Ce5fE65413379F76c43fA1460C31E728",
    chain: "base",
    active: !0,
    createdAt: Date.now()
  }), { success: !0, message: "Initialized with VBMS collection" }), "handler")
});
export {
  f as addCollection,
  u as getActiveCollections,
  w as getAllCollections,
  g as initializeCollections,
  C as removeCollection,
  h as toggleCollection
};
//# sourceMappingURL=nftCollections.js.map
