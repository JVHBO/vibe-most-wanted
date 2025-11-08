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

    // Check if player is already in a room
    const existingRoom = await ctx.db
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
      .first();

    if (existingRoom) {
      const isHost = existingRoom.hostAddress === addr;
      console.log(`🎮 Auto-match: ${args.username} already in room ${existingRoom.roomId}`);
      return {
        success: true,
        action: isHost ? "created" : "joined",
        roomId: existingRoom.roomId,
        startingBankroll: isHost ? existingRoom.hostBankroll : existingRoom.guestBankroll,
      };
    }

    // Look for an available room with same stakes - CRITICAL: check guestAddress is null
    const availableRoom = await ctx.db
      .query("pokerRooms")
      .withIndex("by_token_ante", (q) =>
        q.eq("token", args.token).eq("ante", args.ante).eq("status", "waiting")
      )
      .filter((q) => q.neq(q.field("hostAddress"), addr)) // Not my room
      .filter((q) => q.eq(q.field("guestAddress"), undefined)) // No guest yet
      .filter((q) => q.gt(q.field("expiresAt"), now)) // Not expired
      .order("asc") // Get oldest room first (FIFO)
      .first();

    if (availableRoom) {
      // Double-check guestAddress is still null (race condition protection)
      if (availableRoom.guestAddress) {
        // Someone else joined between query and patch - create new room
        console.log(`⚠️ Auto-match: Race condition detected, creating new room for ${args.username}`);
      } else {
        // Found a room - join it atomically
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
    }

    // No room found or race condition - create a new one
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

// Initialize game state when both players are ready
export const initializeGame = mutation({
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

    if (!isHost && !isGuest) {
      throw new Error("You are not a player in this room");
    }

    // Initialize game state
    await ctx.db.patch(room._id, {
      gameState: {
        currentRound: 1,
        hostScore: 0,
        guestScore: 0,
        pot: room.ante * 2, // Both players ante
        currentBet: 0,
        phase: "card-selection",
        hostBet: room.ante,
        guestBet: room.ante,
      },
      status: "in-progress",
    });

    console.log(`🎮 Game initialized: ${args.roomId} - Round 1`);

    return { success: true };
  },
});

// Player selects a card for the round
export const selectCard = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
    card: v.any(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first();

    if (!room || !room.gameState) {
      throw new Error("Room not found or game not started");
    }

    const isHost = room.hostAddress === args.address.toLowerCase();
    const isGuest = room.guestAddress === args.address.toLowerCase();

    if (!isHost && !isGuest) {
      throw new Error("You are not a player in this room");
    }

    if (room.gameState.phase !== "card-selection") {
      throw new Error("Not in card selection phase");
    }

    // Update the appropriate player's card
    const gameState = { ...room.gameState };
    if (isHost) {
      gameState.hostSelectedCard = args.card;
    } else {
      gameState.guestSelectedCard = args.card;
    }

    // If both players have selected, move to reveal (skip betting)
    if (gameState.hostSelectedCard && gameState.guestSelectedCard) {
      gameState.phase = "reveal";
    }

    await ctx.db.patch(room._id, { gameState });

    console.log(`🎴 Card selected: ${isHost ? 'Host' : 'Guest'} in ${args.roomId}`);

    return { success: true };
  },
});

// REMOVED: makeBet mutation - betting phases eliminated in simplified system

// Player uses a card action (BOOST, SHIELD, etc.)
export const useCardAction = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
    action: v.union(v.literal("BOOST"), v.literal("SHIELD"), v.literal("DOUBLE"), v.literal("SWAP"), v.literal("PASS")),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first();

    if (!room || !room.gameState) {
      throw new Error("Room not found or game not started");
    }

    const isHost = room.hostAddress === args.address.toLowerCase();
    const isGuest = room.guestAddress === args.address.toLowerCase();

    if (!isHost && !isGuest) {
      throw new Error("You are not a player in this room");
    }

    if (room.gameState.phase !== "reveal") {
      throw new Error("Not in reveal phase");
    }

    const gameState = { ...room.gameState };
    if (isHost) {
      gameState.hostAction = args.action;
    } else {
      gameState.guestAction = args.action;
    }

    // Deduct boost costs from bankroll
    const boostCosts: Record<string, number> = {
      BOOST: Math.round(room.ante * 1.6),
      SHIELD: Math.round(room.ante * 1.2),
      DOUBLE: Math.round(room.ante * 3.2),
      SWAP: 0,
      PASS: 0,
    };

    let newHostBankroll = room.hostBankroll!;
    let newGuestBankroll = room.guestBankroll!;

    if (isHost && args.action !== 'PASS' && args.action !== 'SWAP') {
      const cost = boostCosts[args.action] || 0;
      newHostBankroll -= cost;
    }
    if (isGuest && args.action !== 'PASS' && args.action !== 'SWAP') {
      const cost = boostCosts[args.action] || 0;
      newGuestBankroll -= cost;
    }

    // If both players have acted, move to resolution (skip post-reveal betting)
    if (gameState.hostAction && gameState.guestAction) {
      gameState.phase = "resolution";
    }

    await ctx.db.patch(room._id, {
      gameState,
      hostBankroll: newHostBankroll,
      guestBankroll: newGuestBankroll,
    });

    console.log(`⚡ Card action: ${args.action} by ${isHost ? 'Host' : 'Guest'} in ${args.roomId}`);

    return { success: true };
  },
});

// Resolve round and move to next
export const resolveRound = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first();

    if (!room || !room.gameState) {
      throw new Error("Room not found or game not started");
    }

    const isHost = room.hostAddress === args.address.toLowerCase();
    const isGuest = room.guestAddress === args.address.toLowerCase();

    if (!isHost && !isGuest) {
      throw new Error("You are not a player in this room");
    }

    const gameState = { ...room.gameState };

    // Get selected cards and actions
    const hostCard = gameState.hostSelectedCard;
    const guestCard = gameState.guestSelectedCard;
    const hostAction = gameState.hostAction;
    const guestAction = gameState.guestAction;

    if (!hostCard || !guestCard) {
      throw new Error("Both players must select cards before resolving");
    }

    // Calculate winner server-side
    let hostPower = hostCard.power;
    let guestPower = guestCard.power;

    // Apply actions with shield logic
    const hostHasShield = hostAction === 'SHIELD';
    const guestHasShield = guestAction === 'SHIELD';

    // Apply BOOST (+30%)
    if (hostAction === 'BOOST' && !guestHasShield) {
      hostPower *= 1.3;
    }
    if (guestAction === 'BOOST' && !hostHasShield) {
      guestPower *= 1.3;
    }

    // Apply DOUBLE (x2)
    if (hostAction === 'DOUBLE') hostPower *= 2;
    if (guestAction === 'DOUBLE') guestPower *= 2;

    // Determine winner
    const hostWins = hostPower > guestPower;

    // Update score and bankroll
    if (hostWins) {
      gameState.hostScore += 1;
      await ctx.db.patch(room._id, {
        hostBankroll: room.hostBankroll! + gameState.pot,
      });
    } else {
      gameState.guestScore += 1;
      await ctx.db.patch(room._id, {
        guestBankroll: room.guestBankroll! + gameState.pot,
      });
    }

    // Reset pot
    gameState.pot = 0;

    // Check if game is over (best of 7 = first to 4)
    if (gameState.hostScore >= 4 || gameState.guestScore >= 4) {
      gameState.phase = "game-over";
      await ctx.db.patch(room._id, { gameState });
      return { success: true, gameOver: true };
    }

    // Move to next round
    gameState.currentRound += 1;
    gameState.phase = "card-selection";
    gameState.currentBet = 0;
    gameState.hostSelectedCard = undefined;
    gameState.guestSelectedCard = undefined;
    gameState.hostAction = undefined;
    gameState.guestAction = undefined;
    gameState.hostBet = room.ante;
    gameState.guestBet = room.ante;
    gameState.pot += room.ante * 2; // Ante for next round

    // Update bankrolls for ante
    await ctx.db.patch(room._id, {
      gameState,
      hostBankroll: room.hostBankroll! - room.ante,
      guestBankroll: room.guestBankroll! - room.ante,
    });

    console.log(`🏁 Round ${gameState.currentRound - 1} resolved in ${args.roomId}`);

    return { success: true, gameOver: false };
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
