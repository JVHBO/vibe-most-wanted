import {
  a as t,
  c as n
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as e
} from "./_deps/34SVKERO.js";
import {
  a as o
} from "./_deps/5B5TEMMX.js";

// convex/pokerChat.ts
var g = n({
  args: {
    roomId: e.string(),
    sender: e.string(),
    // address
    senderUsername: e.string(),
    message: e.string(),
    type: e.optional(e.union(e.literal("text"), e.literal("sound"))),
    // Message type
    soundUrl: e.optional(e.string()),
    // URL of the sound file (for sound messages)
    emoji: e.optional(e.string())
    // Emoji for floating animation (for sound messages)
  },
  handler: /* @__PURE__ */ o(async (r, s) => {
    if (s.message.length > 500)
      throw new Error("Message too long (max 500 characters)");
    if (s.message.trim().length === 0)
      throw new Error("Message cannot be empty");
    return await r.db.insert("pokerChatMessages", {
      roomId: s.roomId,
      sender: s.sender.toLowerCase(),
      senderUsername: s.senderUsername,
      message: s.message.trim(),
      timestamp: Date.now(),
      type: s.type,
      soundUrl: s.soundUrl,
      emoji: s.emoji
    }), { success: !0 };
  }, "handler")
}), l = t({
  args: {
    roomId: e.string()
  },
  handler: /* @__PURE__ */ o(async (r, s) => (await r.db.query("pokerChatMessages").withIndex("by_room", (a) => a.eq("roomId", s.roomId)).order("desc").take(50)).reverse(), "handler")
});
export {
  l as getMessages,
  g as sendMessage
};
//# sourceMappingURL=pokerChat.js.map
