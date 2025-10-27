import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * PVP ROOMS - QUERIES & MUTATIONS
 *
 * Replaces Firebase PvPService for real-time matchmaking
 */

// ============================================================================
// QUERIES (read data)
// ============================================================================

/**
 * Get a room by code
 */
export const getRoom = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("roomId"), code))
      .first();

    return room;
  },
});

/**
 * Get all waiting rooms (for lobby UI - optional)
 */
export const getWaitingRooms = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .order("desc")
      .take(limit);

    return rooms;
  },
});

/**
 * Get matchmaking status for a player
 */
export const getMatchmakingStatus = query({
  args: { playerAddress: v.string() },
  handler: async (ctx, { playerAddress }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    const entry = await ctx.db
      .query("matchmaking")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .first();

    return entry;
  },
});

/**
 * Get room where player is host or guest
 */
export const getRoomByPlayer = query({
  args: { playerAddress: v.string() },
  handler: async (ctx, { playerAddress }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    // Try finding as host
    const asHost = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("hostAddress"), normalizedAddress))
      .filter((q) => q.neq(q.field("status"), "finished"))
      .first();

    if (asHost) return asHost;

    // Try finding as guest
    const asGuest = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("guestAddress"), normalizedAddress))
      .filter((q) => q.neq(q.field("status"), "finished"))
      .first();

    return asGuest;
  },
});

// ============================================================================
// MUTATIONS (write data)
// ============================================================================

/**
 * Create a new PvP room
 */
export const createRoom = mutation({
  args: {
    hostAddress: v.string(),
    hostUsername: v.string(),
  },
  handler: async (ctx, { hostAddress, hostUsername }) => {
    // Generate random 6-character code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const now = Date.now();

    const roomId = await ctx.db.insert("rooms", {
      roomId: code,
      status: "waiting",
      hostAddress: hostAddress.toLowerCase(),
      hostUsername,
      createdAt: now,
    });

    console.log("✅ Room created in Convex:", code);

    return code;
  },
});

/**
 * Join an existing room
 */
export const joinRoom = mutation({
  args: {
    code: v.string(),
    guestAddress: v.string(),
    guestUsername: v.string(),
  },
  handler: async (ctx, { code, guestAddress, guestUsername }) => {
    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("roomId"), code))
      .first();

    if (!room) {
      throw new Error("Sala não encontrada");
    }

    if (room.guestAddress) {
      throw new Error("Sala já está cheia");
    }

    if (room.hostAddress === guestAddress.toLowerCase()) {
      throw new Error("Você não pode entrar na própria sala");
    }

    await ctx.db.patch(room._id, {
      guestAddress: guestAddress.toLowerCase(),
      guestUsername,
      status: "ready",
    });

    console.log("✅ Guest joined room:", code);

    return true;
  },
});

/**
 * Update player cards in room
 */
export const updateCards = mutation({
  args: {
    code: v.string(),
    playerAddress: v.string(),
    cards: v.array(v.any()),
    power: v.number(),
  },
  handler: async (ctx, { code, playerAddress, cards, power }) => {
    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("roomId"), code))
      .first();

    if (!room) {
      throw new Error("Sala não encontrada");
    }

    const normalizedAddress = playerAddress.toLowerCase();
    const isHost = room.hostAddress === normalizedAddress;

    if (isHost) {
      await ctx.db.patch(room._id, {
        hostCards: cards,
        hostPower: power,
      });
    } else {
      await ctx.db.patch(room._id, {
        guestCards: cards,
        guestPower: power,
      });
    }

    // Check if both players are ready (both have cards)
    const updatedRoom = await ctx.db.get(room._id);
    if (
      updatedRoom &&
      updatedRoom.hostCards &&
      updatedRoom.guestCards &&
      updatedRoom.status === "ready"
    ) {
      await ctx.db.patch(room._id, {
        status: "playing",
        startedAt: Date.now(),
      });
    }

    console.log("✅ Cards updated for room:", code);
  },
});

/**
 * Set room winner and finish game
 */
export const finishRoom = mutation({
  args: {
    code: v.string(),
    winnerId: v.string(),
  },
  handler: async (ctx, { code, winnerId }) => {
    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("roomId"), code))
      .first();

    if (!room) {
      throw new Error("Sala não encontrada");
    }

    await ctx.db.patch(room._id, {
      status: "finished",
      winnerId,
      finishedAt: Date.now(),
    });

    console.log("✅ Room finished:", code, "winner:", winnerId);
  },
});

/**
 * Leave room (delete if host, remove guest if guest)
 */
export const leaveRoom = mutation({
  args: {
    code: v.string(),
    playerAddress: v.string(),
  },
  handler: async (ctx, { code, playerAddress }) => {
    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("roomId"), code))
      .first();

    if (!room) {
      return; // Room already deleted
    }

    const normalizedAddress = playerAddress.toLowerCase();

    if (room.hostAddress === normalizedAddress) {
      // Host leaving - delete room
      await ctx.db.delete(room._id);
      console.log("✅ Room deleted (host left):", code);
    } else if (room.guestAddress === normalizedAddress) {
      // Guest leaving - remove guest
      await ctx.db.patch(room._id, {
        guestAddress: undefined,
        guestUsername: undefined,
        guestCards: undefined,
        guestPower: undefined,
        status: "waiting",
      });
      console.log("✅ Guest removed from room:", code);
    }
  },
});

/**
 * Cleanup old rooms (older than 5 minutes)
 */
export const cleanupOldRooms = mutation({
  args: {},
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    const oldRooms = await ctx.db
      .query("rooms")
      .filter((q) => q.lt(q.field("createdAt"), fiveMinutesAgo))
      .collect();

    let deleted = 0;
    for (const room of oldRooms) {
      await ctx.db.delete(room._id);
      deleted++;
    }

    if (deleted > 0) {
      console.log(`✅ Cleaned up ${deleted} old rooms`);
    }

    return deleted;
  },
});

// ============================================================================
// MATCHMAKING
// ============================================================================

/**
 * Add player to matchmaking queue
 */
export const addToMatchmaking = mutation({
  args: {
    playerAddress: v.string(),
    playerUsername: v.string(),
  },
  handler: async (ctx, { playerAddress, playerUsername }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    // Check if player already in queue
    const existing = await ctx.db
      .query("matchmaking")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .first();

    if (existing) {
      // Update timestamp
      await ctx.db.patch(existing._id, {
        createdAt: Date.now(),
        status: "searching",
      });
    } else {
      // Add to queue
      await ctx.db.insert("matchmaking", {
        playerAddress: normalizedAddress,
        playerUsername,
        status: "searching",
        createdAt: Date.now(),
      });
    }

    console.log("✅ Added to matchmaking:", normalizedAddress);
  },
});

/**
 * Find a match (check if there's someone waiting)
 */
export const findMatch = mutation({
  args: {
    playerAddress: v.string(),
    playerUsername: v.string(),
  },
  handler: async (ctx, { playerAddress, playerUsername }) => {
    const normalizedAddress = playerAddress.toLowerCase();
    const thirtySecondsAgo = Date.now() - 30 * 1000;

    // Find other players searching (not this player, searching in last 30s)
    const waitingPlayers = await ctx.db
      .query("matchmaking")
      .withIndex("by_status", (q) => q.eq("status", "searching"))
      .filter((q) =>
        q.and(
          q.neq(q.field("playerAddress"), normalizedAddress),
          q.gt(q.field("createdAt"), thirtySecondsAgo)
        )
      )
      .take(1);

    if (waitingPlayers.length > 0) {
      const opponent = waitingPlayers[0];

      // Create room
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const now = Date.now();

      await ctx.db.insert("rooms", {
        roomId: code,
        status: "ready",
        hostAddress: normalizedAddress,
        hostUsername: playerUsername,
        guestAddress: opponent.playerAddress,
        guestUsername: opponent.playerUsername,
        createdAt: now,
      });

      // Mark both as matched
      await ctx.db.patch(opponent._id, {
        status: "matched",
        matchedWith: normalizedAddress,
      });

      // Update or create this player's entry
      const thisPlayerEntry = await ctx.db
        .query("matchmaking")
        .withIndex("by_player", (q) =>
          q.eq("playerAddress", normalizedAddress)
        )
        .first();

      if (thisPlayerEntry) {
        await ctx.db.patch(thisPlayerEntry._id, {
          status: "matched",
          matchedWith: opponent.playerAddress,
        });
      } else {
        await ctx.db.insert("matchmaking", {
          playerAddress: normalizedAddress,
          playerUsername,
          status: "matched",
          matchedWith: opponent.playerAddress,
          createdAt: now,
        });
      }

      console.log("✅ Match found! Room:", code);
      return code;
    }

    // No match found - add to queue
    const existing = await ctx.db
      .query("matchmaking")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        createdAt: Date.now(),
        status: "searching",
      });
    } else {
      await ctx.db.insert("matchmaking", {
        playerAddress: normalizedAddress,
        playerUsername,
        status: "searching",
        createdAt: Date.now(),
      });
    }

    console.log("⏳ Added to matchmaking queue:", normalizedAddress);
    return null; // No match yet
  },
});

/**
 * Cancel matchmaking (remove from queue)
 */
export const cancelMatchmaking = mutation({
  args: {
    playerAddress: v.string(),
  },
  handler: async (ctx, { playerAddress }) => {
    const normalizedAddress = playerAddress.toLowerCase();

    const entry = await ctx.db
      .query("matchmaking")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .first();

    if (entry) {
      await ctx.db.patch(entry._id, {
        status: "cancelled",
      });
      console.log("✅ Cancelled matchmaking:", normalizedAddress);
    }
  },
});

/**
 * Cleanup old matchmaking entries (older than 1 minute)
 */
export const cleanupMatchmaking = mutation({
  args: {},
  handler: async (ctx) => {
    const oneMinuteAgo = Date.now() - 60 * 1000;

    const oldEntries = await ctx.db
      .query("matchmaking")
      .filter((q) => q.lt(q.field("createdAt"), oneMinuteAgo))
      .collect();

    let deleted = 0;
    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
      deleted++;
    }

    if (deleted > 0) {
      console.log(`✅ Cleaned up ${deleted} old matchmaking entries`);
    }

    return deleted;
  },
});
