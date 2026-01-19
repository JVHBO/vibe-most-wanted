import {
  a as u,
  c as m,
  d as k
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as p
} from "./_deps/34SVKERO.js";
import {
  a as i
} from "./_deps/5B5TEMMX.js";

// convex/welcomePack.ts
var P = u({
  args: { address: p.string() },
  handler: /* @__PURE__ */ i(async (e, { address: c }) => {
    let s = c.toLowerCase(), r = await e.db.query("profiles").withIndex("by_address", (d) => d.eq("address", s)).first();
    return r && r.hasReceivedWelcomePack || !1;
  }, "handler")
}), y = m({
  args: { address: p.string() },
  handler: /* @__PURE__ */ i(async (e, { address: c }) => {
    let s = c.toLowerCase(), r = await e.db.query("profiles").withIndex("by_address", (t) => t.eq("address", s)).first();
    if (!r)
      throw new Error("Profile not found");
    if (r.hasReceivedWelcomePack)
      throw new Error("Welcome pack already claimed");
    let d = await e.db.query("cardPacks").withIndex("by_address_packType", (t) => t.eq("address", s).eq("packType", "basic")).first();
    return d ? await e.db.patch(d._id, {
      unopened: d.unopened + 1
    }) : await e.db.insert("cardPacks", {
      address: s,
      packType: "basic",
      unopened: 1,
      sourceId: "welcome_pack",
      earnedAt: Date.now()
    }), await e.db.patch(r._id, {
      hasReceivedWelcomePack: !0
    }), {
      success: !0,
      message: "Welcome pack claimed! You received 1 Basic Pack!"
    };
  }, "handler")
}), b = k({
  args: {},
  handler: /* @__PURE__ */ i(async (e) => {
    let c = await e.db.query("profiles").collect(), s = c.filter((a) => !a.hasReceivedWelcomePack);
    if (s.length === 0)
      return {
        success: !0,
        packsGiven: 0,
        totalProfiles: c.length,
        message: "All users already have welcome packs!"
      };
    let r = s.map((a) => a.address.toLowerCase()), d = r.map(
      (a) => e.db.query("cardPacks").withIndex("by_address_packType", (o) => o.eq("address", a).eq("packType", "basic")).first()
    ), t = await Promise.all(d), f = new Map(
      t.map((a, o) => [r[o], a])
    ), n = 0;
    for (let a of s) {
      let o = a.address.toLowerCase(), l = f.get(o);
      l ? await e.db.patch(l._id, {
        unopened: l.unopened + 1
      }) : await e.db.insert("cardPacks", {
        address: o,
        packType: "basic",
        unopened: 1,
        sourceId: "welcome_pack_retroactive",
        earnedAt: Date.now()
      }), await e.db.patch(a._id, {
        hasReceivedWelcomePack: !0
      }), n++;
    }
    return {
      success: !0,
      packsGiven: n,
      totalProfiles: c.length,
      message: `Welcome packs distributed to ${n} users!`
    };
  }, "handler")
});
export {
  y as claimWelcomePack,
  b as giveWelcomePackToAll,
  P as hasReceivedWelcomePack
};
//# sourceMappingURL=welcomePack.js.map
