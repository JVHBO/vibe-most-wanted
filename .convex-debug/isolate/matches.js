import {
  a as l
} from "./_deps/LKY7FFHL.js";
import {
  b as u
} from "./_deps/AWJMSRP7.js";
import {
  b as c
} from "./_deps/IJFCN5IR.js";
import {
  a as i,
  c as y
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as e
} from "./_deps/34SVKERO.js";
import {
  a
} from "./_deps/5B5TEMMX.js";

// convex/matches.ts
var P = i({
  args: {
    address: e.string(),
    limit: e.optional(e.number())
  },
  handler: /* @__PURE__ */ a(async (n, { address: t, limit: s = 50 }) => await n.db.query("matches").withIndex("by_player", (r) => r.eq("playerAddress", l(t))).order("desc").take(s), "handler")
}), A = i({
  args: {
    address: e.string(),
    limit: e.optional(e.number())
  },
  handler: /* @__PURE__ */ a(async (n, { address: t, limit: s = 50 }) => (await n.db.query("matches").withIndex("by_player", (r) => r.eq("playerAddress", l(t))).order("desc").take(s)).map((r) => ({
    _id: r._id,
    type: r.type,
    result: r.result,
    playerPower: r.playerPower,
    opponentPower: r.opponentPower,
    opponentAddress: r.opponentAddress,
    opponentUsername: r.opponentUsername,
    timestamp: r.timestamp,
    coinsEarned: r.coinsEarned,
    entryFeePaid: r.entryFeePaid,
    difficulty: r.difficulty
    // 🚫 EXCLUDED: playerCards, opponentCards (saves ~400KB per query!)
  })), "handler")
}), k = y({
  args: {
    playerAddress: e.string(),
    type: e.union(
      e.literal("pve"),
      e.literal("pvp"),
      e.literal("attack"),
      e.literal("defense"),
      e.literal("poker-pvp"),
      e.literal("poker-cpu")
    ),
    result: e.union(
      e.literal("win"),
      e.literal("loss"),
      e.literal("tie")
    ),
    playerPower: e.number(),
    opponentPower: e.number(),
    playerCards: e.array(c),
    // 🔒 SECURITY
    opponentCards: e.array(c),
    // 🔒 SECURITY
    opponentAddress: e.optional(e.string()),
    opponentUsername: e.optional(e.string()),
    coinsEarned: e.optional(e.number()),
    // $TESTVBMS earned from this match
    entryFeePaid: e.optional(e.number()),
    // Entry fee paid
    difficulty: e.optional(e.union(
      e.literal("gey"),
      e.literal("goofy"),
      e.literal("gooner"),
      e.literal("gangster"),
      e.literal("gigachad")
    )),
    // AI difficulty for PvE
    playerScore: e.optional(e.number()),
    // Player's score in poker
    opponentScore: e.optional(e.number())
    // Opponent's score in poker
  },
  handler: /* @__PURE__ */ a(async (n, t) => {
    let s = t.playerAddress.toLowerCase(), p = t.opponentAddress?.toLowerCase(), r = await n.db.insert("matches", {
      playerAddress: s,
      type: t.type,
      result: t.result,
      playerPower: t.playerPower,
      opponentPower: t.opponentPower,
      opponentAddress: p,
      opponentUsername: t.opponentUsername,
      timestamp: Date.now(),
      playerCards: t.playerCards,
      opponentCards: t.opponentCards,
      coinsEarned: t.coinsEarned,
      entryFeePaid: t.entryFeePaid,
      difficulty: t.difficulty,
      playerScore: t.playerScore,
      opponentScore: t.opponentScore
    }), d = await n.db.query("profiles").withIndex(
      "by_address",
      (o) => o.eq("address", s)
    ).first();
    if (d) {
      let o = { ...d.stats };
      t.type === "pve" || t.type === "poker-cpu" ? t.result === "win" ? o.pveWins = (o.pveWins || 0) + 1 : t.result === "loss" && (o.pveLosses = (o.pveLosses || 0) + 1) : t.result === "win" ? o.pvpWins = (o.pvpWins || 0) + 1 : t.result === "loss" && (o.pvpLosses = (o.pvpLosses || 0) + 1), await n.db.patch(d._id, {
        stats: o,
        lastUpdated: Date.now()
      });
    }
    try {
      t.type === "defense" && t.result === "win" && await n.scheduler.runAfter(0, u.quests.updateWeeklyProgress, {
        address: s,
        questId: "weekly_defense_wins",
        increment: 1
      });
    } catch {
    }
    return r;
  }, "handler")
}), q = i({
  args: { limit: e.optional(e.number()) },
  handler: /* @__PURE__ */ a(async (n, { limit: t = 20 }) => await n.db.query("matches").order("desc").take(t), "handler")
}), C = i({
  args: { address: e.string() },
  handler: /* @__PURE__ */ a(async (n, { address: t }) => {
    let s = {
      total: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      pve: 0,
      pvp: 0,
      attack: 0,
      defense: 0
    }, p = n.db.query("matches").withIndex("by_player", (r) => r.eq("playerAddress", l(t)));
    for await (let r of p)
      s.total++, r.result === "win" ? s.wins++ : r.result === "loss" ? s.losses++ : r.result === "tie" && s.ties++, r.type === "pve" ? s.pve++ : r.type === "pvp" ? s.pvp++ : r.type === "attack" ? s.attack++ : r.type === "defense" && s.defense++;
    return s;
  }, "handler")
});
export {
  P as getMatchHistory,
  A as getMatchHistorySummary,
  C as getMatchStats,
  q as getRecentMatches,
  k as recordMatch
};
//# sourceMappingURL=matches.js.map
