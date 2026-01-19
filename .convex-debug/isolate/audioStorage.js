import {
  a as s,
  c as o
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as r
} from "./_deps/34SVKERO.js";
import {
  a
} from "./_deps/5B5TEMMX.js";

// convex/audioStorage.ts
var i = o({
  args: {},
  handler: /* @__PURE__ */ a(async (e) => await e.storage.generateUploadUrl(), "handler")
}), c = s({
  args: { storageId: r.id("_storage") },
  handler: /* @__PURE__ */ a(async (e, { storageId: t }) => await e.storage.getUrl(t), "handler")
}), l = o({
  args: {
    storageId: r.id("_storage"),
    senderFid: r.number(),
    durationSeconds: r.number()
  },
  handler: /* @__PURE__ */ a(async (e, { storageId: t, senderFid: d, durationSeconds: n }) => ({
    audioStorageId: t,
    success: !0
  }), "handler")
}), p = o({
  args: { storageId: r.id("_storage") },
  handler: /* @__PURE__ */ a(async (e, { storageId: t }) => (await e.storage.delete(t), { success: !0 }), "handler")
});
export {
  p as deleteAudio,
  i as generateUploadUrl,
  c as getAudioUrl,
  l as saveAudioMetadata
};
//# sourceMappingURL=audioStorage.js.map
