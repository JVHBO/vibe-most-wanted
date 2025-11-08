/**
 * Poker Battle Mode - Matchmaking & Room Management
 *
 * Handles:
 * - Creating poker battle rooms
 * - Joining/leaving rooms
 * - Auto-match functionality
 * - Spectator mode
 * - Real-time game state sync
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new poker room
export const createPokerRoom = mutation({
  args: {
    address: v.string(),
    username: v.string(),
    ante: v.number(), // 10, 25, 50, or 100
    token: v.union(v.literal("TESTVBMS"), v.literal("testUSDC")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const roomId = `poker_${args.address}_${now}`;

    // Starting bankroll = ante * 50 (enough for full game)
    const startingBankroll = args.ante * 50;

    const roomDocId = await ctx.db.insert("pokerRooms", {
      roomId,
      status: "waiting",
      ante: args.ante,
      token: args.token,
      hostAddress: args.address.toLowerCase(),
      hostUsername: args.username,
      hostReady: false,
      hostBankroll: startingBankroll,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000, // Expires in 10 minutes
    });

    return {
      success: true,
      roomId,
      roomDocId,
      startingBankroll,
    };
  },
});

// Join an existing poker room
export const joinPokerRoom = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the room
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "waiting") {
      throw new Error("Room is not accepting players");
    }

    if (room.guestAddress) {
      throw new Error("Room is already full");
    }

    if (room.hostAddress === args.address.toLowerCase()) {
      throw new Error("You are already the host of this room");
    }

    // Starting bankroll = ante * 50
    const startingBankroll = room.ante * 50;

    // Update room with guest
    await ctx.db.patch(room._id, {
      guestAddress: args.address.toLowerCase(),
      guestUsername: args.username,
      guestReady: false,
      guestBankroll: startingBankroll,
    });

    return {
      success: true,
      room: {
        ...room,
        guestAddress: args.address.toLowerCase(),
        guestUsername: args.username,
      },
      startingBankroll,
    };
  },
});

// Set player as ready with selected deck
export const setPlayerReady = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
    deck: v.array(v.any()), // Array of 10 cards
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    const isHost = room.hostAddress === args.address.toLowerCase();
    const isGuest = room.guestAddress === args.address.toLowerCase();

    if (!isHost && !isGuest) {
      throw new Error("You are not in this room");
    }

    if (args.deck.length !== 10) {
      throw new Error("Deck must have exactly 10 cards");
    }

    // Update the appropriate player
    if (isHost) {
      await ctx.db.patch(room._id, {
        hostDeck: args.deck,
        hostReady: true,
      });
    } else {
      await ctx.db.patch(room._id, {
        guestDeck: args.deck,
        guestReady: true,
      });
    }

    // Check if both players are ready
    const updatedRoom = await ctx.db.get(room._id);
    if (updatedRoom?.hostReady && updatedRoom?.guestReady) {
      // Both ready - start the game!
      await ctx.db.patch(room._id, {
        status: "ready",
        startedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Leave a poker room
export const leavePokerRoom = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    const isHost = room.hostAddress === args.address.toLowerCase();
    const isGuest = room.guestAddress === args.address.toLowerCase();

    if (isHost) {
      // Host leaving - DELETE the entire room immediately
      await ctx.db.delete(room._id);
    } else if (isGuest) {
      // Guest leaving - remove them from room
      await ctx.db.patch(room._id, {
        guestAddress: undefined,
        guestUsername: undefined,
        guestDeck: undefined,
        guestReady: undefined,
        guestBankroll: undefined,
      });
    }

    return { success: true };
  },
});

// Auto-match: Find or create a room
export const autoMatch = mutation({
  args: {
    address: v.string(),
    username: v.string(),
    ante: v.number(),
    token: v.union(v.literal("TESTVBMS"), v.literal("testUSDC")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const addr = args.address.toLowerCase();

    // Look for an available room with same stakes
    const availableRoom = await ctx.db
      .query("pokerRooms")
      .withIndex("by_token_ante", (q) =>
        q.eq("token", args.token).eq("ante", args.ante).eq("status", "waiting")
      )
      .filter((q) => q.neq(q.field("hostAddress"), addr)) // Not my room
      .filter((q) => q.gt(q.field("expiresAt"), now)) // Not expired
      .order("asc") // Get oldest room first
      .first();

    if (availableRoom && !availableRoom.guestAddress) {
      // Found a room - join it
      const startingBankroll = availableRoom.ante * 50;

      await ctx.db.patch(availableRoom._id, {
        guestAddress: addr,
        guestUsername: args.username,
        guestReady: false,
        guestBankroll: startingBankroll,
      });

      console.log(`🎮 Auto-match: ${args.username} joined room ${availableRoom.roomId}`);

      return {
        success: true,
        action: "joined",
        roomId: availableRoom.roomId,
        startingBankroll,
      };
    }

    // No room found - create a new one
    const roomId = `poker_${addr}_${now}`;
    const startingBankroll = args.ante * 50;

    await ctx.db.insert("pokerRooms", {
      roomId,
      status: "waiting",
      ante: args.ante,
      token: args.token,
      hostAddress: addr,
      hostUsername: args.username,
      hostReady: false,
      hostBankroll: startingBankroll,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000,
    });

    console.log(`🎮 Auto-match: ${args.username} created room ${roomId}`);

    return {
      success: true,
      action: "created",
      roomId,
      startingBankroll,
    };
  },
});

// Join as spectator
export const spectateRoom = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status === "waiting" || room.status === "cancelled" || room.status === "finished") {
      throw new Error("Cannot spectate this room");
    }

    const spectators = room.spectators || [];
    const alreadySpectating = spectators.some((s) => s.address === args.address.toLowerCase());

    if (!alreadySpectating) {
      spectators.push({
        address: args.address.toLowerCase(),
        username: args.username,
        joinedAt: Date.now(),
      });

      await ctx.db.patch(room._id, {
        spectators,
      });
    }

    return { success: true, room };
  },
});

// Update game state (called by players during the game)
export const updateGameState = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
    gameState: v.any(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    const isHost = room.hostAddress === args.address.toLowerCase();
    const isGuest = room.guestAddress === args.address.toLowerCase();

    if (!isHost && !isGuest) {
      throw new Error("You are not a player in this room");
    }

    await ctx.db.patch(room._id, {
      gameState: args.gameState,
      status: "in-progress",
    });

    return { success: true };
  },
});

// Finish a game
export const finishGame = mutation({
  args: {
    roomId: v.string(),
    winnerId: v.string(),
    winnerUsername: v.string(),
    finalPot: v.number(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    await ctx.db.patch(room._id, {
      status: "finished",
      winnerId: args.winnerId.toLowerCase(),
      winnerUsername: args.winnerUsername,
      finalPot: args.finalPot,
      finishedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get all active poker rooms
export const getPokerRooms = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all non-expired rooms that are waiting or in-progress
    const rooms = await ctx.db
      .query("pokerRooms")
      .withIndex("by_status")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "waiting"),
          q.eq(q.field("status"), "ready"),
          q.eq(q.field("status"), "in-progress")
        )
      )
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .order("desc")
      .take(50);

    return rooms;
  },
});

// Get a specific poker room
export const getPokerRoom = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first();

    return room;
  },
});

// Get player's current poker room (if any)
export const getMyPokerRoom = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const addr = args.address.toLowerCase();

    // Find room where player is host or guest and game is active
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) =>
        q.or(
          q.eq(q.field("hostAddress"), addr),
          q.eq(q.field("guestAddress"), addr)
        )
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "waiting"),
          q.eq(q.field("status"), "ready"),
          q.eq(q.field("status"), "in-progress")
        )
      )
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .first();

    return room;
  },
});

// Cleanup old poker rooms
export const cleanupOldPokerRooms = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all expired rooms or rooms that have been finished for more than 5 minutes
    const oldRooms = await ctx.db
      .query("pokerRooms")
      .collect();

    let deleted = 0;
    for (const room of oldRooms) {
      const shouldDelete =
        // Expired rooms
        room.expiresAt < now ||
        // Cancelled rooms older than 1 minute
        (room.status === "cancelled" && room.createdAt < now - 60 * 1000) ||
        // Finished rooms older than 5 minutes
        (room.status === "finished" && room.finishedAt && room.finishedAt < now - 5 * 60 * 1000);

      if (shouldDelete) {
        await ctx.db.delete(room._id);
        deleted++;
      }
    }

    if (deleted > 0) {
      console.log(`🧹 Cleaned up ${deleted} old poker rooms`);
    }

    return { deleted };
  },
});
