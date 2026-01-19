import {
  a,
  c as l
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as e
} from "./_deps/34SVKERO.js";
import {
  a as o
} from "./_deps/5B5TEMMX.js";

// convex/nftGifts.ts
var u = l({
  args: {
    senderFid: e.number(),
    senderAddress: e.string(),
    recipientFid: e.number(),
    recipientAddress: e.string(),
    contractAddress: e.string(),
    collectionId: e.string(),
    collectionName: e.string(),
    tokenId: e.string(),
    nftName: e.optional(e.string()),
    nftImageUrl: e.optional(e.string()),
    txHash: e.string(),
    messageId: e.optional(e.id("cardVotes"))
  },
  handler: /* @__PURE__ */ o(async (n, t) => {
    let r = Date.now(), d = await n.db.query("nftGifts").withIndex("by_txHash", (i) => i.eq("txHash", t.txHash)).first();
    return d ? { success: !1, error: "Gift already recorded", giftId: d._id } : { success: !0, giftId: await n.db.insert("nftGifts", {
      senderFid: t.senderFid,
      senderAddress: t.senderAddress.toLowerCase(),
      recipientFid: t.recipientFid,
      recipientAddress: t.recipientAddress.toLowerCase(),
      contractAddress: t.contractAddress.toLowerCase(),
      collectionId: t.collectionId,
      collectionName: t.collectionName,
      tokenId: t.tokenId,
      nftName: t.nftName,
      nftImageUrl: t.nftImageUrl,
      txHash: t.txHash,
      messageId: t.messageId,
      status: "confirmed",
      // Assume confirmed since we're called after TX success
      createdAt: r,
      confirmedAt: r
    }) };
  }, "handler")
}), I = a({
  args: {
    senderFid: e.number(),
    limit: e.optional(e.number())
  },
  handler: /* @__PURE__ */ o(async (n, t) => {
    let r = t.limit || 20, d = await n.db.query("nftGifts").withIndex("by_sender", (i) => i.eq("senderFid", t.senderFid)).order("desc").take(r);
    return await Promise.all(
      d.map(async (i) => {
        let c = await n.db.query("farcasterCards").withIndex("by_fid", (f) => f.eq("fid", i.recipientFid)).first();
        return {
          ...i,
          recipientUsername: c?.username || `FID ${i.recipientFid}`,
          recipientPfpUrl: c?.pfpUrl || ""
        };
      })
    );
  }, "handler")
}), F = a({
  args: {
    recipientFid: e.number(),
    limit: e.optional(e.number())
  },
  handler: /* @__PURE__ */ o(async (n, t) => {
    let r = t.limit || 20, d = await n.db.query("nftGifts").withIndex("by_recipient", (i) => i.eq("recipientFid", t.recipientFid)).order("desc").take(r);
    return await Promise.all(
      d.map(async (i) => {
        let c = await n.db.query("farcasterCards").withIndex("by_fid", (f) => f.eq("fid", i.senderFid)).first();
        return {
          ...i,
          senderUsername: c?.username || `FID ${i.senderFid}`,
          senderPfpUrl: c?.pfpUrl || ""
        };
      })
    );
  }, "handler")
}), h = a({
  args: { recipientFid: e.number() },
  handler: /* @__PURE__ */ o(async (n, t) => {
    let r = Date.now() - 6048e5;
    return (await n.db.query("nftGifts").withIndex("by_recipient", (s) => s.eq("recipientFid", t.recipientFid)).filter((s) => s.gt(s.field("createdAt"), r)).collect()).length;
  }, "handler")
});
export {
  F as getReceivedGifts,
  I as getSentGifts,
  h as getUnreadGiftCount,
  u as recordNFTGift
};
//# sourceMappingURL=nftGifts.js.map
