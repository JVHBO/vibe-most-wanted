import {
  a as M,
  b as $
} from "./_deps/AWJMSRP7.js";
import {
  b as q,
  c as T
} from "./_deps/IJFCN5IR.js";
import {
  a as D
} from "./_deps/K5WLKJWZ.js";
import {
  a as k,
  b as L,
  c as y,
  d as A
} from "./_deps/3SBKGJDS.js";
import "./_deps/6EQFL5ZL.js";
import {
  h as d
} from "./_deps/34SVKERO.js";
import {
  a as p
} from "./_deps/5B5TEMMX.js";

// convex/pokerBattle.ts
function E(t) {
  if (!t) return 0;
  let o = t.power || 0;
  return t.collection === "vibefid" ? Math.floor(o * 5) : t.collection === "vibe" ? Math.floor(o * 2) : t.collection === "nothing" ? Math.floor(o * 0.5) : o;
}
p(E, "getCardDisplayPower");
function O(t) {
  let o = [...t], e = new Uint32Array(o.length);
  crypto.getRandomValues(e);
  for (let s = o.length - 1; s > 0; s--) {
    let n = e[s] % (s + 1);
    [o[s], o[n]] = [o[n], o[s]];
  }
  return o;
}
p(O, "cryptoShuffle");
function H(t) {
  let o = new Uint32Array(1);
  return crypto.getRandomValues(o), o[0] % t;
}
p(H, "cryptoRandomInt");
function W() {
  let t = new Uint32Array(1);
  return crypto.getRandomValues(t), t[0] / 4294967296;
}
p(W, "cryptoRandomFloat");
var K = y({
  args: {
    address: d.string(),
    username: d.string(),
    ante: d.number(),
    // 2, 10, 50, or 200
    token: d.union(d.literal("VBMS"), d.literal("TESTVBMS"), d.literal("testUSDC"), d.literal("VIBE_NFT")),
    blockchainBattleId: d.optional(d.number())
    // Optional blockchain battle ID
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = Date.now(), s = o.address.toLowerCase(), n = ["waiting", "ready", "in-progress"], r = await t.db.query("pokerRooms").withIndex("by_host", (i) => i.eq("hostAddress", s)).filter(
      (i) => i.and(
        i.or(
          i.eq(i.field("status"), "waiting"),
          i.eq(i.field("status"), "ready"),
          i.eq(i.field("status"), "in-progress")
        ),
        i.gt(i.field("expiresAt"), e)
      )
    ).first(), l = r ? null : await t.db.query("pokerRooms").withIndex("by_guest", (i) => i.eq("guestAddress", s)).filter(
      (i) => i.and(
        i.or(
          i.eq(i.field("status"), "waiting"),
          i.eq(i.field("status"), "ready"),
          i.eq(i.field("status"), "in-progress")
        ),
        i.gt(i.field("expiresAt"), e)
      )
    ).first(), a = r || l;
    if (a) {
      let i = a.hostAddress === s, w = a.status, f = i ? a.guestUsername : a.hostUsername;
      throw new Error(
        `You already have an active battle! Status: ${w}. ${f ? `Opponent: ${f}. ` : ""}Please finish or wait for your current battle to expire before creating a new one.`
      );
    }
    let u = `poker_${s}_${e}`, c = o.ante * 50, g = await t.db.insert("pokerRooms", {
      roomId: u,
      status: "waiting",
      ante: o.ante,
      token: o.token,
      blockchainBattleId: o.blockchainBattleId,
      // Store blockchain battle ID
      hostAddress: o.address.toLowerCase(),
      hostUsername: o.username,
      hostReady: !1,
      hostBankroll: c,
      hostBoostCoins: 1e3,
      createdAt: e,
      expiresAt: e + 600 * 1e3
      // Expires in 10 minutes
    });
    return {
      success: !0,
      roomId: u,
      roomDocId: g,
      startingBankroll: c
    };
  }, "handler")
}), Q = y({
  args: {
    roomId: d.string(),
    address: d.string(),
    username: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (r) => r.eq("roomId", o.roomId)).first();
    if (!e)
      throw new Error("Room not found");
    if (e.status !== "waiting")
      throw new Error("Room is not accepting players");
    if (e.guestAddress)
      throw new Error("Room is already full");
    if (e.hostAddress === o.address.toLowerCase())
      throw new Error("You are already the host of this room");
    let s = e.ante * 50;
    return await t.db.patch(e._id, {
      guestAddress: o.address.toLowerCase(),
      guestUsername: o.username,
      guestReady: !1,
      guestBankroll: s,
      guestBoostCoins: 1e3
    }), {
      success: !0,
      room: {
        ...e,
        guestAddress: o.address.toLowerCase(),
        guestUsername: o.username
      },
      startingBankroll: s
    };
  }, "handler")
}), Z = y({
  args: {
    roomId: d.string(),
    address: d.string(),
    deck: d.array(q),
    // 🔒 SECURITY: Strict schema
    wagers: d.optional(d.array(T))
    // 🔒 SECURITY: Strict schema
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (l) => l.eq("roomId", o.roomId)).first();
    if (!e)
      throw new Error("Room not found");
    let s = e.hostAddress === o.address.toLowerCase(), n = e.guestAddress === o.address.toLowerCase();
    if (!s && !n)
      throw new Error("You are not in this room");
    if (o.deck.length !== 10)
      throw new Error("Deck must have exactly 10 cards");
    s ? await t.db.patch(e._id, {
      hostDeck: o.deck,
      hostReady: !0
    }) : await t.db.patch(e._id, {
      guestDeck: o.deck,
      guestReady: !0
    });
    let r = await t.db.get(e._id);
    return r?.hostReady && r?.guestReady && await t.db.patch(e._id, {
      status: "ready",
      startedAt: Date.now()
    }), { success: !0 };
  }, "handler")
}), J = y({
  args: {
    roomId: d.string(),
    address: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (r) => r.eq("roomId", o.roomId)).first();
    if (!e)
      throw new Error("Room not found");
    let s = e.hostAddress === o.address.toLowerCase(), n = e.guestAddress === o.address.toLowerCase();
    return s ? await t.db.delete(e._id) : n && await t.db.patch(e._id, {
      guestAddress: void 0,
      guestUsername: void 0,
      guestDeck: void 0,
      guestReady: void 0,
      guestBankroll: void 0
    }), { success: !0 };
  }, "handler")
}), X = y({
  args: {
    roomId: d.string(),
    address: d.string(),
    username: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (r) => r.eq("roomId", o.roomId)).first();
    if (!e)
      throw new Error("Room not found");
    if (e.status === "waiting" || e.status === "cancelled" || e.status === "finished")
      throw new Error("Cannot spectate this room");
    let s = e.spectators || [];
    return s.some((r) => r.address === o.address.toLowerCase()) || (s.push({
      address: o.address.toLowerCase(),
      username: o.username,
      joinedAt: Date.now()
    }), await t.db.patch(e._id, {
      spectators: s
    })), { success: !0, room: e };
  }, "handler")
}), ee = y({
  args: {
    roomId: d.string(),
    address: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let { roomId: e, address: s } = o, n = s.toLowerCase(), r = await t.db.query("pokerRooms").withIndex("by_room_id", (i) => i.eq("roomId", e)).first();
    if (!r)
      throw new Error("Room not found");
    let a = (r.spectators || []).filter(
      (i) => i.address !== n
    ), u = await t.db.query("bettingCredits").withIndex("by_address", (i) => i.eq("address", n)).first(), c = 0;
    if (u && u.balance > 0) {
      c = u.balance;
      let i = await t.db.query("profiles").withIndex("by_address", (w) => w.eq("address", n)).first();
      if (i) {
        let w = i.coins || 0;
        await t.db.patch(i._id, {
          coins: w + c,
          lifetimeEarned: (i.lifetimeEarned || 0) + c,
          lastUpdated: Date.now()
        }), await t.db.insert("coinTransactions", {
          address: n,
          amount: c,
          type: "earn",
          source: "poker_credits_convert",
          description: "Converted poker betting credits",
          timestamp: Date.now(),
          balanceBefore: w,
          balanceAfter: w + c
        });
      }
      await t.db.patch(u._id, {
        balance: 0
      }), await t.db.insert("bettingTransactions", {
        address: n,
        type: "withdraw",
        amount: c,
        roomId: e,
        timestamp: Date.now()
      }), console.log(`\u{1F4B0} Converted ${c} credits to TESTVBMS for ${n} on leave`);
    }
    let m = r.isCpuVsCpu === !0, g = a.length === 0;
    return m && g ? (await t.db.delete(r._id), console.log(`\u{1F5D1}\uFE0F CPU vs CPU room ${e} deleted - last spectator left`), {
      success: !0,
      converted: c,
      roomDeleted: !0,
      message: `Converted ${c} credits to TESTVBMS. Room closed.`
    }) : (await t.db.patch(r._id, {
      spectators: a
    }), console.log(`\u{1F441}\uFE0F Spectator ${n} left room ${e}. ${a.length} remaining.`), {
      success: !0,
      converted: c,
      roomDeleted: !1,
      remainingSpectators: a.length,
      message: c > 0 ? `Converted ${c} credits to TESTVBMS` : "Left room successfully"
    });
  }, "handler")
}), oe = y({
  args: {
    roomId: d.string(),
    address: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (r) => r.eq("roomId", o.roomId)).first();
    if (!e)
      throw new Error("Room not found");
    let s = e.hostAddress === o.address.toLowerCase(), n = e.guestAddress === o.address.toLowerCase();
    if (!s && !n)
      throw new Error("You are not a player in this room");
    return e.gameState && e.status === "in-progress" ? (console.log("[initializeGame] Game already initialized, skipping duplicate write"), { success: !0, alreadyInitialized: !0 }) : (await t.db.patch(e._id, {
      gameState: {
        currentRound: 1,
        hostScore: 0,
        guestScore: 0,
        pot: e.ante * 2,
        // Both players ante
        currentBet: 0,
        phase: "card-selection",
        hostBet: e.ante,
        guestBet: e.ante
      },
      status: "in-progress"
    }), console.log(`\u{1F3AE} Game initialized: ${o.roomId} - Round 1`), { success: !0 });
  }, "handler")
}), te = y({
  args: {
    roomId: d.string(),
    address: d.string(),
    card: d.object({
      tokenId: d.string(),
      collection: d.optional(d.string()),
      power: d.number(),
      imageUrl: d.string(),
      name: d.string(),
      rarity: d.string(),
      foil: d.optional(d.string()),
      wear: d.optional(d.string())
    })
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    console.log("[selectCard] Called with:", {
      roomId: o.roomId,
      address: o.address,
      cardTokenId: o.card?.tokenId,
      cardPower: o.card?.power
    });
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (a) => a.eq("roomId", o.roomId)).first();
    if (!e)
      throw console.error(`[selectCard] Room not found: ${o.roomId}`), new Error("Room not found");
    if (!e.gameState)
      throw console.error(`[selectCard] Game not started in room: ${o.roomId}`), new Error("Game not started");
    let s = o.address.toLowerCase(), n = e.hostAddress?.toLowerCase() === s, r = e.guestAddress?.toLowerCase() === s;
    if (console.log("[selectCard] Player check:", {
      normalizedAddress: s,
      hostAddress: e.hostAddress?.toLowerCase(),
      guestAddress: e.guestAddress?.toLowerCase(),
      isHost: n,
      isGuest: r
    }), !n && !r)
      throw console.error("[selectCard] Player not in room:", {
        address: s,
        hostAddress: e.hostAddress,
        guestAddress: e.guestAddress
      }), new Error("You are not a player in this room");
    if (e.gameState.phase !== "card-selection")
      throw console.error("[selectCard] Wrong phase:", {
        currentPhase: e.gameState.phase,
        expectedPhase: "card-selection"
      }), new Error(`Not in card selection phase. Current phase: ${e.gameState.phase}`);
    if (n && e.gameState.hostSelectedCard)
      return console.log("[selectCard] Host already selected card, skipping duplicate write"), { success: !0, alreadySelected: !0 };
    if (r && e.gameState.guestSelectedCard)
      return console.log("[selectCard] Guest already selected card, skipping duplicate write"), { success: !0, alreadySelected: !0 };
    if (!o.card)
      throw new Error("Card is null or undefined");
    if (!o.card.tokenId)
      throw new Error("Card missing tokenId");
    if (typeof o.card.power != "number")
      throw new Error(`Card power is not a number: ${typeof o.card.power}`);
    let l = {
      ...e.gameState,
      hostSelectedCard: n ? o.card : e.gameState.hostSelectedCard,
      guestSelectedCard: r ? o.card : e.gameState.guestSelectedCard
    };
    return l.hostSelectedCard && l.guestSelectedCard && (l.phase = "reveal", console.log("[selectCard] Both players selected, moving to reveal phase")), await t.db.patch(e._id, { gameState: l }), console.log(`\u2705 [selectCard] Success: ${n ? "Host" : "Guest"} selected card in ${o.roomId}`), { success: !0 };
  }, "handler")
}), se = y({
  args: {
    roomId: d.string(),
    address: d.string(),
    action: d.union(d.literal("BOOST"), d.literal("SHIELD"), d.literal("DOUBLE"), d.literal("SWAP"), d.literal("PASS"))
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (c) => c.eq("roomId", o.roomId)).first();
    if (!e || !e.gameState)
      throw new Error("Room not found or game not started");
    let s = e.hostAddress === o.address.toLowerCase(), n = e.guestAddress === o.address.toLowerCase();
    if (!s && !n)
      throw new Error("You are not a player in this room");
    if (e.gameState.phase !== "reveal")
      throw new Error("Not in reveal phase");
    let r = { ...e.gameState };
    s ? r.hostAction = o.action : r.guestAction = o.action;
    let l = {
      BOOST: 100,
      // +30% power
      SHIELD: 80,
      // Block opponent boost
      DOUBLE: 200,
      // x2 power (expensive!)
      SWAP: 0,
      PASS: 0
    }, a = e.hostBoostCoins ?? 1e3, u = e.guestBoostCoins ?? 1e3;
    if (s && o.action !== "PASS" && o.action !== "SWAP") {
      let c = l[o.action] || 0;
      a -= c, console.log(`\u{1F4B0} Host paid ${c} boost coins for ${o.action}. New balance: ${a}`);
    }
    if (n && o.action !== "PASS" && o.action !== "SWAP") {
      let c = l[o.action] || 0;
      u -= c, console.log(`\u{1F4B0} Guest paid ${c} boost coins for ${o.action}. New balance: ${u}`);
    }
    if (r.hostAction && r.guestAction) {
      let c = e.spectators && e.spectators.length > 0;
      r.phase = "resolution", console.log(`\u{1F440} ${c ? e.spectators.length : 0} spectators present - moving to resolution`);
    }
    return await t.db.patch(e._id, {
      gameState: r,
      hostBoostCoins: a,
      guestBoostCoins: u
    }), console.log(`\u26A1 Card action: ${o.action} by ${s ? "Host" : "Guest"} in ${o.roomId}`), { success: !0 };
  }, "handler")
}), re = y({
  args: {
    roomId: d.string(),
    address: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (R) => R.eq("roomId", o.roomId)).first();
    if (!e || !e.gameState)
      throw new Error("Room not found or game not started");
    let s = e.hostAddress === o.address.toLowerCase(), n = e.guestAddress === o.address.toLowerCase();
    if (!s && !n)
      throw new Error("You are not a player in this room");
    if (e.gameState.phase !== "resolution")
      return console.log(`[resolveRound] Not in resolution phase (${e.gameState.phase}), skipping`), { success: !0, alreadyResolved: !0 };
    let r = { ...e.gameState }, l = r.hostSelectedCard, a = r.guestSelectedCard, u = r.hostAction, c = r.guestAction;
    if (!l || !a)
      return console.warn("[resolveRound] Missing cards - skipping resolution", {
        hasHostCard: !!l,
        hasGuestCard: !!a,
        currentRound: r.currentRound,
        hostSelectedCard: r.hostSelectedCard,
        guestSelectedCard: r.guestSelectedCard
      }), { success: !1, reason: "Missing card selections" };
    let m = E(l), g = E(a), i = u === "SHIELD", w = c === "SHIELD";
    console.log(`[resolveRound] Initial - Host: ${m} (${u || "PASS"}), Guest: ${g} (${c || "PASS"})`), console.log(`[resolveRound] Shields - Host has shield: ${i}, Guest has shield: ${w}`), u === "BOOST" && !w && (console.log(`[resolveRound] Host BOOST applied: ${m} \u2192 ${m * 1.3}`), m *= 1.3), c === "BOOST" && !i && (console.log(`[resolveRound] Guest BOOST applied: ${g} \u2192 ${g * 1.3}`), g *= 1.3), u === "BOOST" && w && console.log("[resolveRound] Host BOOST BLOCKED by Guest SHIELD"), c === "BOOST" && i && console.log("[resolveRound] Guest BOOST BLOCKED by Host SHIELD"), u === "DOUBLE" && !w && (console.log(`[resolveRound] Host CRIT/DOUBLE applied: ${m} \u2192 ${m * 2}`), m *= 2), c === "DOUBLE" && !i && (console.log(`[resolveRound] Guest CRIT/DOUBLE applied: ${g} \u2192 ${g * 2}`), g *= 2), u === "DOUBLE" && w && console.log("[resolveRound] Host CRIT/DOUBLE BLOCKED by Guest SHIELD"), c === "DOUBLE" && i && console.log("[resolveRound] Guest CRIT/DOUBLE BLOCKED by Host SHIELD");
    let f = m === g, b = m > g;
    console.log(`[resolveRound] Final - Host: ${m}, Guest: ${g}`), console.log(`[resolveRound] Result - Tie: ${f}, HostWins: ${b}, GuestWins: ${!b && !f}`);
    let I = e.roundHistory || [], C = r.currentRound;
    f ? (I.push({
      round: C,
      winner: "tie",
      playerScore: r.hostScore,
      opponentScore: r.guestScore
    }), console.log(`\u{1F91D} Tie in round ${C}`)) : b ? (r.hostScore += 1, I.push({
      round: C,
      winner: "player",
      playerScore: r.hostScore,
      opponentScore: r.guestScore
    }), console.log(`\u{1F3AF} Host won round ${C}`)) : (r.guestScore += 1, I.push({
      round: C,
      winner: "opponent",
      playerScore: r.hostScore,
      opponentScore: r.guestScore
    }), console.log(`\u{1F3AF} Guest won round ${C}`));
    let B = f ? "tie" : b ? e.hostAddress : e.guestAddress;
    if (B && await t.runMutation(M.roundBetting.resolveRoundBets, {
      roomId: o.roomId,
      roundNumber: C,
      winnerAddress: B
    }), r.hostScore >= 4 || r.guestScore >= 4) {
      r.phase = "game-over";
      let R = r.hostScore >= 4 ? e.hostAddress : e.guestAddress, h = r.hostScore >= 4 ? e.hostUsername : e.guestUsername, S = Math.round(r.pot * 0.05), v = r.pot - S;
      return console.log(`\u{1F3C6} Game Over! Winner: ${h}, Prize: ${v} (pot: ${r.pot}, fee: ${S})`), await t.db.patch(e._id, {
        gameState: r,
        roundHistory: I,
        winnerId: R,
        winnerUsername: h,
        finalPot: v,
        status: "finished"
        // Mark room as finished to prevent further interactions
      }), { success: !0, gameOver: !0 };
    }
    return r.currentRound += 1, r.phase = "card-selection", r.currentBet = 0, r.hostSelectedCard = void 0, r.guestSelectedCard = void 0, r.hostAction = void 0, r.guestAction = void 0, r.hostBet = 0, r.guestBet = 0, await t.db.patch(e._id, {
      gameState: r,
      roundHistory: I
    }), console.log(`\u{1F3C1} Round ${r.currentRound - 1} resolved in ${o.roomId} - No ante deducted for next round`), { success: !0, gameOver: !1 };
  }, "handler")
}), ne = y({
  args: {
    roomId: d.string(),
    winnerId: d.string(),
    winnerUsername: d.string(),
    finalPot: d.number()
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (n) => n.eq("roomId", o.roomId)).first();
    if (!e)
      return console.log(`\u26A0\uFE0F Room ${o.roomId} already deleted or not found (this is okay)`), { success: !0, alreadyDeleted: !0 };
    let s = await t.db.query("voiceParticipants").withIndex("by_room", (n) => n.eq("roomId", o.roomId)).collect();
    for (let n of s)
      await t.db.delete(n._id);
    return s.length > 0 && console.log(`\u{1F399}\uFE0F Cleaned ${s.length} voice participants from room ${o.roomId}`), await t.db.delete(e._id), console.log(`\u{1F5D1}\uFE0F Room ${o.roomId} deleted. Winner: ${o.winnerUsername} (${o.finalPot} pot)`), { success: !0, alreadyDeleted: !1 };
  }, "handler")
}), ae = k({
  args: {},
  handler: /* @__PURE__ */ p(async (t) => {
    let o = Date.now();
    return await t.db.query("pokerRooms").withIndex("by_status").filter(
      (s) => s.or(
        s.eq(s.field("status"), "waiting"),
        s.eq(s.field("status"), "ready"),
        s.eq(s.field("status"), "in-progress")
      )
    ).filter((s) => s.gt(s.field("expiresAt"), o)).order("desc").take(50);
  }, "handler")
}), de = k({
  args: {
    roomId: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, o) => await t.db.query("pokerRooms").withIndex("by_room_id", (s) => s.eq("roomId", o.roomId)).first(), "handler")
}), ie = k({
  args: {
    address: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = Date.now(), s = o.address.toLowerCase(), n = ["waiting", "ready", "in-progress"], r = await t.db.query("pokerRooms").withIndex("by_host", (a) => a.eq("hostAddress", s)).filter(
      (a) => a.and(
        a.or(
          a.eq(a.field("status"), "waiting"),
          a.eq(a.field("status"), "ready"),
          a.eq(a.field("status"), "in-progress")
        ),
        a.gt(a.field("expiresAt"), e)
      )
    ).first();
    return r || await t.db.query("pokerRooms").withIndex("by_guest", (a) => a.eq("guestAddress", s)).filter(
      (a) => a.and(
        a.or(
          a.eq(a.field("status"), "waiting"),
          a.eq(a.field("status"), "ready"),
          a.eq(a.field("status"), "in-progress")
        ),
        a.gt(a.field("expiresAt"), e)
      )
    ).first();
  }, "handler")
}), ce = A({
  args: {},
  handler: /* @__PURE__ */ p(async (t) => {
    let o = Date.now(), e = await t.db.query("pokerRooms").take(50), s = 0;
    for (let n of e)
      // Expired rooms
      (n.expiresAt < o || // Cancelled rooms older than 1 minute
      n.status === "cancelled" && n.createdAt < o - 6e4 || // Finished rooms older than 5 minutes
      n.status === "finished" && n.finishedAt && n.finishedAt < o - 3e5) && (await t.db.delete(n._id), s++);
    return s > 0 && console.log(`\u{1F9F9} Cleaned up ${s} old poker rooms`), { deleted: s };
  }, "handler")
}), le = y({
  args: {
    roomId: d.string(),
    bettor: d.string(),
    bettorUsername: d.string(),
    betOn: d.string(),
    // Address of player to bet on OR "tie" for draw bet
    amount: d.number()
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    console.log("\u{1F3B2} placeBet called:", { roomId: o.roomId, bettor: o.bettor, betOn: o.betOn, amount: o.amount });
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (i) => i.eq("roomId", o.roomId)).first();
    if (!e)
      throw console.error(`\u274C Room not found: ${o.roomId}`), new Error("Room not found");
    if (e.status === "finished" || e.status === "cancelled")
      throw console.error(`\u274C Cannot bet on ${e.status} game`), new Error("Cannot bet on finished or cancelled games");
    if (!["card-selection", "reveal", "resolution"].includes(e.gameState?.phase || ""))
      throw console.error(`\u274C Wrong phase for betting: ${e.gameState?.phase}`), new Error(`Betting is only allowed during active rounds. Current phase: ${e.gameState?.phase || "unknown"}`);
    let n = o.betOn.toLowerCase() === "tie", r = !n && e.hostAddress === o.betOn.toLowerCase(), l = !n && e.guestAddress === o.betOn.toLowerCase();
    if (!r && !l && !n)
      throw console.error(`\u274C Invalid bet target: ${o.betOn}`), new Error("Can only bet on players in the room or tie");
    let a = o.bettor.toLowerCase();
    if (a === e.hostAddress || a === e.guestAddress)
      throw console.error(`\u274C Player trying to bet on own game: ${a}`), new Error("Players cannot bet on their own games");
    let u = await t.db.query("profiles").withIndex("by_address", (i) => i.eq("address", a)).first();
    if (!u)
      throw console.error(`\u274C Profile not found for bettor: ${a}`), new Error("Bettor profile not found. Please create a profile first.");
    let c = u.coins || 0;
    if (c < o.amount)
      throw new Error(`Insufficient funds. Need ${o.amount} but only have ${c}`);
    await t.db.patch(u._id, {
      coins: c - o.amount,
      lifetimeSpent: (u.lifetimeSpent || 0) + o.amount
    }), await t.db.insert("coinTransactions", {
      address: a,
      amount: -o.amount,
      type: "spend",
      source: "poker_bet",
      description: `Poker bet on ${o.betOn}`,
      timestamp: Date.now(),
      balanceBefore: c,
      balanceAfter: c - o.amount
    });
    let m = n ? 6 : 3, g = n ? "Tie/Draw" : r ? e.hostUsername : e.guestUsername || "";
    return await t.db.insert("pokerBets", {
      roomId: o.roomId,
      bettor: a,
      bettorUsername: o.bettorUsername,
      betOn: o.betOn.toLowerCase(),
      betOnUsername: g,
      amount: o.amount,
      token: e.token,
      odds: m,
      status: "active",
      timestamp: Date.now()
    }), console.log(`\u{1F4B0} Bet placed: ${o.bettorUsername} bet ${o.amount} on ${g} at ${m}x odds in ${o.roomId}`), {
      success: !0,
      newBalance: c - o.amount,
      odds: m,
      potentialWin: o.amount * m
    };
  }, "handler")
}), ue = y({
  args: {
    roomId: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (n) => n.eq("roomId", o.roomId)).first();
    if (!e || !e.gameState)
      throw new Error("Room not found or game not started");
    if (e.gameState.phase !== "spectator-betting")
      throw new Error("Not in spectator betting phase");
    let s = { ...e.gameState };
    return s.phase = "resolution", await t.db.patch(e._id, { gameState: s }), console.log(`\u{1F3B2} Spectator betting ended for ${o.roomId} - moving to resolution`), { success: !0 };
  }, "handler")
}), me = y({
  args: {
    roomId: d.string(),
    winnerId: d.string()
    // Address of the winner OR "tie" for draw
  },
  handler: /* @__PURE__ */ p(async (t, o) => {
    let e = await t.db.query("pokerBets").withIndex("by_room", (r) => r.eq("roomId", o.roomId)).filter((r) => r.eq(r.field("status"), "active")).collect();
    if (e.length === 0)
      return { resolved: 0, totalPaidOut: 0 };
    let s = 0, n = o.winnerId.toLowerCase();
    for (let r of e)
      if (r.betOn === n) {
        let a = r.odds || 3, u = r.amount * a, c = await t.db.query("profiles").withIndex("by_address", (m) => m.eq("address", r.bettor)).first();
        if (c) {
          let m = c.coins || 0;
          await t.db.patch(c._id, {
            coins: m + u,
            lifetimeEarned: (c.lifetimeEarned || 0) + u
          }), await t.db.insert("coinTransactions", {
            address: r.bettor,
            amount: u,
            type: "earn",
            source: "poker_bet_win",
            description: `Poker bet winnings (x${r.odds})`,
            timestamp: Date.now(),
            balanceBefore: m,
            balanceAfter: m + u
          }), console.log(`\u{1F4B0} Poker bet winnings added to balance: ${u} TESTVBMS for ${r.bettor}. Balance: ${m} \u2192 ${m + u}`), s += u;
        }
        await t.db.patch(r._id, {
          status: "won",
          payout: u,
          resolvedAt: Date.now()
        }), console.log(`\u2705 Bet won: ${r.bettorUsername} won ${u} (bet ${r.amount} on ${r.betOnUsername})`);
      } else
        await t.db.patch(r._id, {
          status: "lost",
          resolvedAt: Date.now()
        }), console.log(`\u274C Bet lost: ${r.bettorUsername} lost ${r.amount} (bet on ${r.betOnUsername})`);
    return console.log(`\u{1F3B0} Resolved ${e.length} bets for room ${o.roomId} - Total paid out: ${s}`), {
      resolved: e.length,
      totalPaidOut: s
    };
  }, "handler")
}), pe = k({
  args: {
    roomId: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, o) => await t.db.query("pokerBets").withIndex("by_room", (s) => s.eq("roomId", o.roomId)).order("desc").take(100), "handler")
}), he = k({
  args: {
    roomId: d.string(),
    address: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, o) => await t.db.query("pokerBets").withIndex("by_room", (s) => s.eq("roomId", o.roomId)).filter((s) => s.eq(s.field("bettor"), o.address.toLowerCase())).collect(), "handler")
}), we = L({
  args: {},
  handler: /* @__PURE__ */ p(async (t) => await t.db.query("pokerRooms").take(100), "handler")
}), ge = A({
  args: {},
  handler: /* @__PURE__ */ p(async (t) => {
    let o = Date.now(), e = await t.db.query("pokerRooms").take(50), s = 0, n = 0;
    for (let r of e)
      if (r.expiresAt < o || o - r.createdAt > 36e5) {
        let l = await t.db.query("voiceParticipants").withIndex("by_room", (a) => a.eq("roomId", r.roomId)).collect();
        for (let a of l)
          await t.db.delete(a._id), n++;
        await t.db.delete(r._id), s++, console.log(`[cleanupOldRooms] Deleted expired/old room ${r.roomId}`);
      }
    return n > 0 && console.log(`[cleanupOldRooms] Cleaned ${n} voice participants`), { deletedCount: s, voiceCleanedCount: n };
  }, "handler")
}), fe = y({
  args: {},
  handler: /* @__PURE__ */ p(async (t) => {
    let o = Date.now(), e = await t.db.query("pokerRooms").take(50), s = 0, n = 0;
    for (let r of e)
      if (r.expiresAt < o || o - r.createdAt > 36e5) {
        let l = await t.db.query("voiceParticipants").withIndex("by_room", (a) => a.eq("roomId", r.roomId)).collect();
        for (let a of l)
          await t.db.delete(a._id), n++;
        await t.db.delete(r._id), s++, console.log(`[cleanupOldRoomsPublic] Deleted expired/old room ${r.roomId}`);
      }
    return { deletedCount: s, voiceCleanedCount: n };
  }, "handler")
}), be = y({
  args: {
    address: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, { address: o }) => {
    let e = o.toLowerCase();
    console.log(`[forceDeleteRoomByAddress] Finding rooms for address ${e}...`);
    let s = await t.db.query("pokerRooms").filter(
      (r) => r.or(
        r.eq(r.field("hostAddress"), e),
        r.eq(r.field("guestAddress"), e)
      )
    ).collect();
    if (s.length === 0)
      return { deletedCount: 0, message: "No rooms found for this address" };
    let n = 0;
    for (let r of s) {
      let l = await t.db.query("voiceParticipants").withIndex("by_room", (a) => a.eq("roomId", r.roomId)).collect();
      for (let a of l)
        await t.db.delete(a._id), n++;
      await t.db.delete(r._id), console.log(`[forceDeleteRoomByAddress] Deleted room ${r.roomId}`);
    }
    return { deletedCount: s.length, voiceCleanedCount: n, message: `Deleted ${s.length} room(s)` };
  }, "handler")
}), ye = A({
  args: {
    roomId: d.string()
    // roomId is a string in pokerRooms table
  },
  handler: /* @__PURE__ */ p(async (t, { roomId: o }) => {
    console.log(`[forceDeleteRoom] Force deleting room #${o}...`);
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (n) => n.eq("roomId", o)).first();
    if (!e)
      throw new Error(`Room #${o} not found`);
    console.log("[forceDeleteRoom] Found room:", e);
    let s = await t.db.query("voiceParticipants").withIndex("by_room", (n) => n.eq("roomId", o)).collect();
    for (let n of s)
      await t.db.delete(n._id);
    return s.length > 0 && console.log(`[forceDeleteRoom] Cleaned ${s.length} voice participants`), await t.db.delete(e._id), console.log(`[forceDeleteRoom] Room #${o} deleted successfully`), {
      success: !0,
      deletedRoom: {
        roomId: e.roomId,
        status: e.status,
        players: [e.hostAddress, e.guestAddress]
      },
      voiceCleanedCount: s.length
    };
  }, "handler")
}), V = [
  { name: "Mecha Alpha" },
  { name: "Mecha Prime" },
  { name: "Mecha Nova" },
  { name: "Mecha Striker" },
  { name: "Mecha Titan" },
  { name: "Mecha Zero" },
  { name: "Mecha Fury" },
  { name: "Mecha Storm" },
  { name: "Mecha Blade" },
  { name: "Mecha Shadow" }
];
function U(t) {
  let o = D[t] || D.gmvbrs;
  if (!o || o.length < 10) {
    let s = D.gmvbrs || [];
    return O(s).slice(0, 10).map((r) => ({
      tokenId: r.tokenId,
      name: r.name,
      image: r.imageUrl,
      imageUrl: r.imageUrl,
      power: r.power,
      rarity: r.rarity,
      collection: "gmvbrs"
    }));
  }
  return O(o).slice(0, 10).map((s) => ({
    tokenId: s.tokenId,
    name: s.name,
    image: s.imageUrl,
    imageUrl: s.imageUrl,
    power: s.power,
    rarity: s.rarity,
    collection: t
  }));
}
p(U, "generateCpuPokerDeck");
var Ce = y({
  args: {
    collection: d.string(),
    // Which NFT collection to use for CPU decks
    forceNew: d.optional(d.boolean())
    // Force create new room even if one exists
  },
  handler: /* @__PURE__ */ p(async (t, { collection: o, forceNew: e }) => {
    let s = Date.now(), n = await t.db.query("pokerRooms").withIndex("by_cpu_collection", (i) => i.eq("isCpuVsCpu", !0).eq("cpuCollection", o)).filter(
      (i) => i.or(
        i.eq(i.field("status"), "waiting"),
        i.eq(i.field("status"), "ready"),
        i.eq(i.field("status"), "in-progress")
      )
    ).first();
    if (n && !e)
      return { roomId: n.roomId, isNew: !1 };
    let r = O(V), l = r[0], a = r[1], u = U(o), c = U(o), m = `cpu-${o}-${Date.now()}`, g = await t.db.insert("pokerRooms", {
      roomId: m,
      status: "in-progress",
      // Start immediately
      ante: 0,
      // No ante for CPU vs CPU
      token: "VBMS",
      isCpuVsCpu: !0,
      cpuCollection: o,
      // CPU 1 (Host)
      hostAddress: `cpu1-${o}`.toLowerCase(),
      hostUsername: l.name,
      hostDeck: u,
      hostReady: !0,
      hostBankroll: 1e3,
      hostBoostCoins: 1500,
      // Increased from 10 to 1500 for more boost usage
      // CPU 2 (Guest)
      guestAddress: `cpu2-${o}`.toLowerCase(),
      guestUsername: a.name,
      guestDeck: c,
      guestReady: !0,
      guestBankroll: 1e3,
      guestBoostCoins: 1500,
      // Increased from 10 to 1500 for more boost usage
      // Spectators start empty
      spectators: [],
      // Game state - start round 1
      gameState: {
        currentRound: 1,
        hostScore: 0,
        guestScore: 0,
        pot: 0,
        currentBet: 0,
        phase: "card-selection",
        hostSelectedCard: void 0,
        guestSelectedCard: void 0,
        hostAction: void 0,
        guestAction: void 0,
        hostBet: void 0,
        guestBet: void 0,
        roundWinner: void 0,
        hostUsedCards: [],
        guestUsedCards: []
      },
      createdAt: s,
      expiresAt: s + 1800 * 1e3,
      // 30 minutes
      finishedAt: void 0
    });
    return console.log(`\u{1F916} CPU vs CPU room created: ${m} (${o})`), await t.scheduler.runAfter(1e3, $.pokerBattle.cpuMakeMove, {
      roomId: m,
      isHost: !0
    }), { roomId: m, isNew: !0 };
  }, "handler")
}), Se = k({
  args: {},
  handler: /* @__PURE__ */ p(async (t) => (await t.db.query("pokerRooms").withIndex("by_cpu_collection", (e) => e.eq("isCpuVsCpu", !0)).filter(
    (e) => e.or(
      e.eq(e.field("status"), "waiting"),
      e.eq(e.field("status"), "ready"),
      e.eq(e.field("status"), "in-progress")
    )
  ).collect()).map((e) => ({
    roomId: e.roomId,
    collection: e.cpuCollection,
    status: e.status,
    hostUsername: e.hostUsername,
    guestUsername: e.guestUsername,
    spectatorCount: e.spectators?.length || 0,
    currentRound: e.gameState?.currentRound || 1,
    hostScore: e.gameState?.hostScore || 0,
    guestScore: e.gameState?.guestScore || 0
  })), "handler")
}), Ie = k({
  args: {},
  handler: /* @__PURE__ */ p(async () => [
    "gmvbrs",
    "vibe",
    "viberuto",
    "meowverse",
    "vibefid",
    "viberotbangers"
  ], "handler")
}), Re = A({
  args: {
    roomId: d.string(),
    isHost: d.boolean()
  },
  handler: /* @__PURE__ */ p(async (t, { roomId: o, isHost: e }) => {
    let s = await t.db.query("pokerRooms").withIndex("by_room_id", (c) => c.eq("roomId", o)).first();
    if (!s || !s.isCpuVsCpu) {
      console.log(`[cpuMakeMove] Room ${o} not found or not CPU vs CPU`);
      return;
    }
    if (s.status === "finished" || s.status === "cancelled") {
      console.log(`[cpuMakeMove] Room ${o} is ${s.status}, skipping`);
      return;
    }
    let n = s.gameState;
    if (!n) return;
    let r = n.currentRound || 1, l = e ? s.hostDeck : s.guestDeck, a = e ? n.hostUsedCards : n.guestUsedCards, u = e ? n.hostSelectedCard : n.guestSelectedCard;
    if (n.phase === "card-selection" && !u && l) {
      let c = l.filter((S) => {
        let v = typeof S.tokenId == "string" ? parseInt(S.tokenId, 10) : S.tokenId;
        return !a?.includes(v);
      });
      if (c.length === 0) {
        console.log(`[cpuMakeMove] No available cards for CPU ${e ? "host" : "guest"}`);
        return;
      }
      let m = c[H(c.length)], g = typeof m.tokenId == "string" ? parseInt(m.tokenId, 10) : m.tokenId, i = [...a || [], g];
      console.log(`\u{1F916} CPU ${e ? "host" : "guest"} selected card: ${m.name} (power: ${m.power})`);
      let w = e ? s.hostBoostCoins ?? 1500 : s.guestBoostCoins ?? 1500, f = W(), b;
      f < 0.5 && w >= 100 ? b = "BOOST" : f < 0.75 && w >= 80 ? b = "SHIELD" : f < 0.85 && w >= 200 ? b = "DOUBLE" : b = "PASS";
      let C = {
        BOOST: 100,
        SHIELD: 80,
        DOUBLE: 200,
        PASS: 0
      }[b] || 0, B = w - C;
      console.log(`\u{1F916} CPU ${e ? "host" : "guest"} selected action: ${b} (cost: ${C}, balance: ${B})`), await t.db.patch(s._id, {
        gameState: {
          ...n,
          [e ? "hostSelectedCard" : "guestSelectedCard"]: m,
          [e ? "hostUsedCards" : "guestUsedCards"]: i,
          [e ? "hostAction" : "guestAction"]: b
        },
        [e ? "hostBoostCoins" : "guestBoostCoins"]: B
      });
      let R = await t.db.query("pokerRooms").withIndex("by_room_id", (S) => S.eq("roomId", o)).first();
      if (!R || !R.gameState) return;
      if (e ? R.gameState.guestSelectedCard : R.gameState.hostSelectedCard) {
        let S = Date.now() + 8e3;
        console.log("\u{1F916} Both CPUs selected - waiting 8s for spectator bets before reveal (will shorten to 3s if bet placed)"), await t.db.patch(R._id, {
          gameState: {
            ...R.gameState,
            bettingWindowEndsAt: S,
            revealScheduledFor: S
            // Mark when reveal should happen
          }
        }), await t.scheduler.runAfter(8e3, $.pokerBattle.cpuRevealRound, {
          roomId: o
        });
      } else
        await t.scheduler.runAfter(800, $.pokerBattle.cpuMakeMove, {
          roomId: o,
          isHost: !e
        });
    }
  }, "handler")
}), Ae = A({
  args: {
    roomId: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, { roomId: o }) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (a) => a.eq("roomId", o)).first();
    if (!e || !e.isCpuVsCpu) return;
    let s = e.gameState;
    if (!s) return;
    let n = s.currentRound || 1;
    if (!s.bettingWindowEndsAt) return;
    let l = Date.now() + 3e3;
    l < s.bettingWindowEndsAt && (console.log(`\u26A1 Bet placed! Shortening betting window to 3s for round ${n}`), await t.db.patch(e._id, {
      gameState: {
        ...s,
        bettingWindowEndsAt: l,
        revealScheduledFor: l
        // Mark when reveal should happen
      }
    }), await t.scheduler.runAfter(3e3, $.pokerBattle.cpuRevealRound, {
      roomId: o
    }), console.log("\u23F0 Scheduled new reveal for 3s, original 8s reveal will be skipped"));
  }, "handler")
}), $e = A({
  args: {
    roomId: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, { roomId: o }) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (a) => a.eq("roomId", o)).first();
    if (!e || !e.isCpuVsCpu || e.status === "finished") return;
    let s = e.gameState;
    if (!s) return;
    let n = s.currentRound || 1;
    if (s.revealScheduledFor && Date.now() < s.revealScheduledFor - 1e3) {
      console.log("\u23F8\uFE0F Skipping early reveal - window was shortened, new reveal already scheduled");
      return;
    }
    if (s.bettingWindowEndsAt && Date.now() < s.bettingWindowEndsAt) {
      let a = s.bettingWindowEndsAt - Date.now();
      if (a < 1e3)
        console.log(`\u23F0 Betting window closing in ${a}ms, waiting...`);
      else {
        console.log(`\u23F0 Betting window still open, waiting ${a}ms more`), await t.scheduler.runAfter(a, $.pokerBattle.cpuRevealRound, {
          roomId: o
        });
        return;
      }
    }
    let r = s.hostSelectedCard, l = s.guestSelectedCard;
    !r || !l || (await t.db.patch(e._id, {
      gameState: {
        ...s,
        phase: "reveal",
        bettingWindowEndsAt: void 0
        // Clear timer to stop countdown
      }
    }), await t.scheduler.runAfter(5e3, $.pokerBattle.cpuResolveRound, {
      roomId: o
    }));
  }, "handler")
}), ke = A({
  args: {
    roomId: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, { roomId: o }) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (h) => h.eq("roomId", o)).first();
    if (!e || !e.isCpuVsCpu || e.status === "finished") return;
    let s = e.gameState;
    if (!s) return;
    let n = s.hostSelectedCard, r = s.guestSelectedCard;
    if (!n || !r) return;
    let l = s.hostAction, a = s.guestAction, u = E(n), c = E(r), m = l === "SHIELD", g = a === "SHIELD";
    l === "BOOST" && !g && (u *= 1.3), a === "BOOST" && !m && (c *= 1.3), l === "DOUBLE" && !g && (u *= 2), a === "DOUBLE" && !m && (c *= 2), console.log(`\u{1F916} CPU Arena power calculation: Host ${n.power} \u2192 ${Math.round(u)} (${l || "PASS"}), Guest ${r.power} \u2192 ${Math.round(c)} (${a || "PASS"})`);
    let i = s.hostScore, w = s.guestScore, f;
    u > c ? (i++, f = "host") : c > u ? (w++, f = "guest") : f = "tie";
    let b = s.currentRound, I = await t.db.query("roundBets").withIndex(
      "by_room_round",
      (h) => h.eq("roomId", o).eq("roundNumber", b)
    ).filter((h) => h.eq(h.field("status"), "active")).collect();
    console.log(`\u{1F3B0} CPU Arena: Round ${b} result: ${f}, found ${I.length} active bets [roomId: ${o}]`);
    let C = f === "tie" ? "tie" : f === "host" ? e.hostAddress : e.guestAddress;
    if (I.length > 0) {
      for (let h of I) {
        let S = h.betOn.toLowerCase() === "tie";
        if (f === "tie" && S || h.betOn.toLowerCase() === C?.toLowerCase()) {
          let _ = Math.floor(h.amount * h.odds), P = await t.db.query("bettingCredits").withIndex("by_address", (G) => G.eq("address", h.bettor)).first();
          P && (await t.db.patch(P._id, {
            balance: P.balance + _
          }), console.log(`\u2705 CPU Arena bet won: ${h.bettor} won ${_} credits (${h.amount} \xD7 ${h.odds}x)`)), await t.db.patch(h._id, {
            status: "won",
            payout: _,
            resolvedAt: Date.now()
          }), await t.db.insert("bettingTransactions", {
            address: h.bettor,
            type: "win",
            amount: _,
            roomId: o,
            timestamp: Date.now()
          });
        } else
          await t.db.patch(h._id, {
            status: "lost",
            resolvedAt: Date.now()
          }), await t.db.insert("bettingTransactions", {
            address: h.bettor,
            type: "loss",
            amount: -h.amount,
            roomId: o,
            timestamp: Date.now()
          }), console.log(`\u274C CPU Arena bet lost: ${h.bettor} lost ${h.amount} credits`);
      }
      console.log(`\u{1F3B0} Resolved ${I.length} bets for round ${b} (winner: ${C})`);
    }
    let B = b + 1;
    if (i >= 4 || w >= 4 || b >= 7) {
      let h = i > w ? "host" : w > i ? "guest" : "tie";
      await t.db.patch(e._id, {
        status: "finished",
        finishedAt: Date.now(),
        gameState: {
          ...s,
          phase: "game-over",
          hostScore: i,
          guestScore: w,
          roundWinner: f
        }
      }), console.log(`\u{1F3C6} CPU vs CPU game finished: ${e.hostUsername} ${i} - ${w} ${e.guestUsername}`), e.spectators && e.spectators.length > 0 && await t.scheduler.runAfter(15e3, $.pokerBattle.cpuRestartGame, {
        roomId: o
      });
    } else
      await t.db.patch(e._id, {
        gameState: {
          ...s,
          phase: "resolution",
          hostScore: i,
          guestScore: w,
          roundWinner: f
        }
      }), await t.scheduler.runAfter(2500, $.pokerBattle.cpuStartNextRound, {
        roomId: o,
        nextRound: B
      });
  }, "handler")
}), Be = A({
  args: {
    roomId: d.string(),
    nextRound: d.number()
  },
  handler: /* @__PURE__ */ p(async (t, { roomId: o, nextRound: e }) => {
    let s = await t.db.query("pokerRooms").withIndex("by_room_id", (r) => r.eq("roomId", o)).first();
    if (!s || !s.isCpuVsCpu || s.status === "finished") return;
    let n = s.gameState;
    n && (await t.db.patch(s._id, {
      gameState: {
        ...n,
        currentRound: e,
        phase: "card-selection",
        hostSelectedCard: void 0,
        guestSelectedCard: void 0,
        hostAction: void 0,
        guestAction: void 0,
        roundWinner: void 0,
        bettingWindowEndsAt: void 0,
        // Clear to reset timer
        revealScheduledFor: void 0
      }
    }), console.log(`\u{1F3AE} CPU vs CPU starting round ${e}`), await t.scheduler.runAfter(800, $.pokerBattle.cpuMakeMove, {
      roomId: o,
      isHost: !0
    }));
  }, "handler")
}), ve = A({
  args: {
    roomId: d.string()
  },
  handler: /* @__PURE__ */ p(async (t, { roomId: o }) => {
    let e = await t.db.query("pokerRooms").withIndex("by_room_id", (l) => l.eq("roomId", o)).first();
    if (!e || !e.isCpuVsCpu) return;
    if (!e.spectators || e.spectators.length === 0) {
      await t.db.delete(e._id), console.log(`\u{1F5D1}\uFE0F CPU vs CPU room ${o} deleted (no spectators)`);
      return;
    }
    let s = e.cpuCollection || "gmvbrs", n = U(s), r = U(s);
    await t.db.patch(e._id, {
      status: "in-progress",
      hostDeck: n,
      guestDeck: r,
      finishedAt: void 0,
      gameState: {
        currentRound: 1,
        hostScore: 0,
        guestScore: 0,
        pot: 0,
        currentBet: 0,
        phase: "card-selection",
        hostSelectedCard: void 0,
        guestSelectedCard: void 0,
        hostAction: void 0,
        guestAction: void 0,
        hostBet: void 0,
        guestBet: void 0,
        roundWinner: void 0,
        hostUsedCards: [],
        guestUsedCards: []
      }
    }), console.log(`\u{1F504} CPU vs CPU game restarted: ${o}`), await t.scheduler.runAfter(1e3, $.pokerBattle.cpuMakeMove, {
      roomId: o,
      isHost: !0
    });
  }, "handler")
}), _e = A({
  args: {},
  handler: /* @__PURE__ */ p(async (t) => {
    let o = await t.db.query("pokerRooms").withIndex("by_cpu_collection", (e) => e.eq("isCpuVsCpu", !0)).collect();
    console.log(`\u{1F504} Force resetting ${o.length} CPU rooms...`);
    for (let e of o)
      await t.db.delete(e._id), console.log(`\u2705 Deleted room: ${e.roomId}`);
    return { deleted: o.length };
  }, "handler")
});
export {
  ce as cleanupOldPokerRooms,
  ge as cleanupOldRooms,
  fe as cleanupOldRoomsPublic,
  Re as cpuMakeMove,
  ke as cpuResolveRound,
  ve as cpuRestartGame,
  $e as cpuRevealRound,
  Be as cpuStartNextRound,
  Ce as createCpuVsCpuRoom,
  K as createPokerRoom,
  ue as endSpectatorBetting,
  ne as finishGame,
  ye as forceDeleteRoom,
  be as forceDeleteRoomByAddress,
  _e as forceResetAllCpuRooms,
  Ie as getAvailableCollections,
  Se as getCpuVsCpuRooms,
  ie as getMyPokerRoom,
  de as getPokerRoom,
  ae as getPokerRooms,
  pe as getRoomBets,
  he as getUserRoomBets,
  oe as initializeGame,
  Q as joinPokerRoom,
  J as leavePokerRoom,
  ee as leaveSpectate,
  we as listAllRooms,
  le as placeBet,
  me as resolveBets,
  re as resolveRound,
  te as selectCard,
  Z as setPlayerReady,
  Ae as shortenBettingWindow,
  X as spectateRoom,
  se as useCardAction
};
//# sourceMappingURL=pokerBattle.js.map
