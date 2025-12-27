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
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal, api } from "./_generated/api";
import { COLLECTION_CARDS, AVAILABLE_COLLECTIONS } from "./arenaCardsData";

/**
 * 🔒 SECURITY FIX: Cryptographic shuffle using crypto.getRandomValues()
 * Math.random() is predictable and can be exploited for game manipulation
 * Fisher-Yates shuffle with crypto-secure random
 */
function cryptoShuffle<T>(array: T[]): T[] {
  const result = [...array];
  const randomBytes = new Uint32Array(result.length);
  crypto.getRandomValues(randomBytes);

  for (let i = result.length - 1; i > 0; i--) {
    // Use crypto-secure random to pick swap index
    const j = randomBytes[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 🔒 SECURITY FIX: Crypto-secure random integer
 */
function cryptoRandomInt(max: number): number {
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  return randomBytes[0] % max;
}

/**
 * 🔒 SECURITY FIX: Crypto-secure random float [0, 1)
 */
function cryptoRandomFloat(): number {
  const randomBytes = new Uint32Array(1);
  crypto.getRandomValues(randomBytes);
  return randomBytes[0] / (0xFFFFFFFF + 1);
}

// Create a new poker room
export const createPokerRoom = mutation({
  args: {
    address: v.string(),
    username: v.string(),
    ante: v.number(), // 2, 10, 50, or 200
    token: v.union(v.literal("VBMS"), v.literal("TESTVBMS"), v.literal("testUSDC"), v.literal("VIBE_NFT")),
    blockchainBattleId: v.optional(v.number()), // Optional blockchain battle ID
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedAddress = args.address.toLowerCase();

    // ✅ VALIDAÇÃO MELHORADA: Verificar se player já tem sala ativa
    // 🚀 PERFORMANCE FIX: Use indexes instead of full table scan
    const activeStatuses = ["waiting", "ready", "in-progress"];

    // Check as host using by_host index
    const roomAsHost = await ctx.db
      .query("pokerRooms")
      .withIndex("by_host", (q) => q.eq("hostAddress", normalizedAddress))
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "waiting"),
            q.eq(q.field("status"), "ready"),
            q.eq(q.field("status"), "in-progress")
          ),
          q.gt(q.field("expiresAt"), now)
        )
      )
      .first();

    // Check as guest using by_guest index
    const roomAsGuest = !roomAsHost ? await ctx.db
      .query("pokerRooms")
      .withIndex("by_guest", (q) => q.eq("guestAddress", normalizedAddress))
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "waiting"),
            q.eq(q.field("status"), "ready"),
            q.eq(q.field("status"), "in-progress")
          ),
          q.gt(q.field("expiresAt"), now)
        )
      )
      .first() : null;

    const existingRoom = roomAsHost || roomAsGuest;

    if (existingRoom) {
      // Player já tem uma sala ativa - fornecer informações úteis
      const isHost = existingRoom.hostAddress === normalizedAddress;
      const roomStatus = existingRoom.status;
      const opponent = isHost ? existingRoom.guestUsername : existingRoom.hostUsername;

      throw new Error(
        `You already have an active battle! ` +
        `Status: ${roomStatus}. ` +
        `${opponent ? `Opponent: ${opponent}. ` : ''}` +
        `Please finish or wait for your current battle to expire before creating a new one.`
      );
    }

    const roomId = `poker_${normalizedAddress}_${now}`;

    // Starting bankroll = ante * 50 (enough for full game)
    const startingBankroll = args.ante * 50;
    // Starting boost coins = 1000 (for buying boosts during match)
    const startingBoostCoins = 1000;

    const roomDocId = await ctx.db.insert("pokerRooms", {
      roomId,
      status: "waiting",
      ante: args.ante,
      token: args.token,
      blockchainBattleId: args.blockchainBattleId, // Store blockchain battle ID
      hostAddress: args.address.toLowerCase(),
      hostUsername: args.username,
      hostReady: false,
      hostBankroll: startingBankroll,
      hostBoostCoins: startingBoostCoins,
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
    // Find the room - 🚀 BANDWIDTH FIX: Use index instead of filter
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
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
    // Starting boost coins = 1000
    const startingBoostCoins = 1000;

    // Update room with guest
    await ctx.db.patch(room._id, {
      guestAddress: args.address.toLowerCase(),
      guestUsername: args.username,
      guestReady: false,
      guestBankroll: startingBankroll,
      guestBoostCoins: startingBoostCoins,
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
    wagers: v.optional(v.array(v.any())), // Optional array of wagered NFT cards (1-5)
  },
  handler: async (ctx, args) => {
    // 🚀 BANDWIDTH FIX: Use index instead of filter
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
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
    // 🚀 BANDWIDTH FIX: Use index instead of filter
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
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
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
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

/**
 * LEAVE SPECTATE - Spectator leaves room
 * Converts betting credits to TESTVBMS and removes from room
 * Closes CPU vs CPU room if last spectator
 */
export const leaveSpectate = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const { roomId, address } = args;
    const normalizedAddress = address.toLowerCase();

    // Get room
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    // Remove spectator from list
    const spectators = room.spectators || [];
    const newSpectators = spectators.filter(
      (s) => s.address !== normalizedAddress
    );

    // Convert betting credits to TESTVBMS
    const credits = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    let convertedAmount = 0;
    if (credits && credits.balance > 0) {
      convertedAmount = credits.balance;

      // Get profile and add to coins
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
        .first();

      if (profile) {
        const currentBalance = profile.coins || 0;
        await ctx.db.patch(profile._id, {
          coins: currentBalance + convertedAmount,
          lifetimeEarned: (profile.lifetimeEarned || 0) + convertedAmount,
          lastUpdated: Date.now(),
        });
      }

      // Reset betting credits to 0
      await ctx.db.patch(credits._id, {
        balance: 0,
      });

      // Log transaction
      await ctx.db.insert("bettingTransactions", {
        address: normalizedAddress,
        type: "withdraw",
        amount: convertedAmount,
        roomId,
        timestamp: Date.now(),
      });

      console.log(`💰 Converted ${convertedAmount} credits to TESTVBMS for ${normalizedAddress} on leave`);
    }

    // Check if this is a CPU vs CPU room and no more spectators
    const isCpuRoom = room.isCpuVsCpu === true;
    const isLastSpectator = newSpectators.length === 0;

    if (isCpuRoom && isLastSpectator) {
      // Delete the CPU vs CPU room - no more spectators
      await ctx.db.delete(room._id);
      console.log(`🗑️ CPU vs CPU room ${roomId} deleted - last spectator left`);

      return {
        success: true,
        converted: convertedAmount,
        roomDeleted: true,
        message: `Converted ${convertedAmount} credits to TESTVBMS. Room closed.`,
      };
    }

    // Update room with removed spectator
    await ctx.db.patch(room._id, {
      spectators: newSpectators,
    });

    console.log(`👁️ Spectator ${normalizedAddress} left room ${roomId}. ${newSpectators.length} remaining.`);

    return {
      success: true,
      converted: convertedAmount,
      roomDeleted: false,
      remainingSpectators: newSpectators.length,
      message: convertedAmount > 0
        ? `Converted ${convertedAmount} credits to TESTVBMS`
        : "Left room successfully",
    };
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
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    const isHost = room.hostAddress === args.address.toLowerCase();
    const isGuest = room.guestAddress === args.address.toLowerCase();

    if (!isHost && !isGuest) {
      throw new Error("You are not a player in this room");
    }

    // OPTIMIZATION: Prevent duplicate initialization (both players might call at same time)
    if (room.gameState && room.status === "in-progress") {
      console.log(`[initializeGame] Game already initialized, skipping duplicate write`);
      return { success: true, alreadyInitialized: true };
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
    card: v.object({
      tokenId: v.string(),
      collection: v.optional(v.string()),
      power: v.number(),
      imageUrl: v.string(),
      name: v.string(),
      rarity: v.string(),
      foil: v.optional(v.string()),
      wear: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    console.log(`[selectCard] Called with:`, {
      roomId: args.roomId,
      address: args.address,
      cardTokenId: args.card?.tokenId,
      cardPower: args.card?.power,
    });

    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      console.error(`[selectCard] Room not found: ${args.roomId}`);
      throw new Error("Room not found");
    }

    if (!room.gameState) {
      console.error(`[selectCard] Game not started in room: ${args.roomId}`);
      throw new Error("Game not started");
    }

    const normalizedAddress = args.address.toLowerCase();
    const isHost = room.hostAddress?.toLowerCase() === normalizedAddress;
    const isGuest = room.guestAddress?.toLowerCase() === normalizedAddress;

    console.log(`[selectCard] Player check:`, {
      normalizedAddress,
      hostAddress: room.hostAddress?.toLowerCase(),
      guestAddress: room.guestAddress?.toLowerCase(),
      isHost,
      isGuest,
    });

    if (!isHost && !isGuest) {
      console.error(`[selectCard] Player not in room:`, {
        address: normalizedAddress,
        hostAddress: room.hostAddress,
        guestAddress: room.guestAddress,
      });
      throw new Error("You are not a player in this room");
    }

    if (room.gameState.phase !== "card-selection") {
      console.error(`[selectCard] Wrong phase:`, {
        currentPhase: room.gameState.phase,
        expectedPhase: "card-selection",
      });
      throw new Error(`Not in card selection phase. Current phase: ${room.gameState.phase}`);
    }

    // OPTIMIZATION: Check if player already selected a card (prevent duplicate writes)
    if (isHost && room.gameState.hostSelectedCard) {
      console.log(`[selectCard] Host already selected card, skipping duplicate write`);
      return { success: true, alreadySelected: true };
    }
    if (isGuest && room.gameState.guestSelectedCard) {
      console.log(`[selectCard] Guest already selected card, skipping duplicate write`);
      return { success: true, alreadySelected: true };
    }

    // Validate card data
    if (!args.card) {
      throw new Error("Card is null or undefined");
    }
    if (!args.card.tokenId) {
      throw new Error("Card missing tokenId");
    }
    if (typeof args.card.power !== 'number') {
      throw new Error(`Card power is not a number: ${typeof args.card.power}`);
    }

    // Create new game state with selected card
    const updatedGameState = {
      ...room.gameState,
      hostSelectedCard: isHost ? args.card : room.gameState.hostSelectedCard,
      guestSelectedCard: isGuest ? args.card : room.gameState.guestSelectedCard,
    };

    // If both players have selected, move to reveal
    if (updatedGameState.hostSelectedCard && updatedGameState.guestSelectedCard) {
      updatedGameState.phase = "reveal";
      console.log(`[selectCard] Both players selected, moving to reveal phase`);
    }

    await ctx.db.patch(room._id, { gameState: updatedGameState });

    console.log(`✅ [selectCard] Success: ${isHost ? 'Host' : 'Guest'} selected card in ${args.roomId}`);

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
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
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

    // Deduct boost costs from boost coins (virtual currency)
    const boostCosts: Record<string, number> = {
      BOOST: 100,  // +30% power
      SHIELD: 80,  // Block opponent boost
      DOUBLE: 200, // x2 power (expensive!)
      SWAP: 0,
      PASS: 0,
    };

    let newHostBoostCoins = room.hostBoostCoins ?? 1000;
    let newGuestBoostCoins = room.guestBoostCoins ?? 1000;

    if (isHost && args.action !== 'PASS' && args.action !== 'SWAP') {
      const cost = boostCosts[args.action] || 0;
      newHostBoostCoins -= cost;
      console.log(`💰 Host paid ${cost} boost coins for ${args.action}. New balance: ${newHostBoostCoins}`);
    }
    if (isGuest && args.action !== 'PASS' && args.action !== 'SWAP') {
      const cost = boostCosts[args.action] || 0;
      newGuestBoostCoins -= cost;
      console.log(`💰 Guest paid ${cost} boost coins for ${args.action}. New balance: ${newGuestBoostCoins}`);
    }

    // If both players have acted, move directly to resolution
    // Spectators can bet BEFORE the round starts (during card-selection phase)
    if (gameState.hostAction && gameState.guestAction) {
      const hasSpectators = room.spectators && room.spectators.length > 0;

      // Always go to resolution (spectators bet during card-selection now)
      gameState.phase = "resolution";
      console.log(`👀 ${hasSpectators ? room.spectators!.length : 0} spectators present - moving to resolution`);
    }

    await ctx.db.patch(room._id, {
      gameState,
      hostBoostCoins: newHostBoostCoins,
      guestBoostCoins: newGuestBoostCoins,
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
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room || !room.gameState) {
      throw new Error("Room not found or game not started");
    }

    const isHost = room.hostAddress === args.address.toLowerCase();
    const isGuest = room.guestAddress === args.address.toLowerCase();

    if (!isHost && !isGuest) {
      throw new Error("You are not a player in this room");
    }

    // OPTIMIZATION: Prevent duplicate resolution calls (both players might call at same time)
    // Only resolve if we're in the "resolution" phase
    if (room.gameState.phase !== "resolution") {
      console.log(`[resolveRound] Not in resolution phase (${room.gameState.phase}), skipping`);
      return { success: true, alreadyResolved: true };
    }

    const gameState = { ...room.gameState };

    // Get selected cards and actions
    const hostCard = gameState.hostSelectedCard;
    const guestCard = gameState.guestSelectedCard;
    const hostAction = gameState.hostAction;
    const guestAction = gameState.guestAction;

    if (!hostCard || !guestCard) {
      console.warn("[resolveRound] Missing cards - skipping resolution", {
        hasHostCard: !!hostCard,
        hasGuestCard: !!guestCard,
        currentRound: gameState.currentRound,
        hostSelectedCard: gameState.hostSelectedCard,
        guestSelectedCard: gameState.guestSelectedCard,
      });
      // Don't throw error - just return early to avoid breaking the game
      // This can happen if a player disconnected or the round was already resolved
      return { success: false, reason: "Missing card selections" };
    }

    // Calculate winner server-side
    let hostPower = hostCard.power;
    let guestPower = guestCard.power;

    // Apply actions with shield logic
    const hostHasShield = hostAction === 'SHIELD';
    const guestHasShield = guestAction === 'SHIELD';

    console.log(`[resolveRound] Initial - Host: ${hostPower} (${hostAction || 'PASS'}), Guest: ${guestPower} (${guestAction || 'PASS'})`);
    console.log(`[resolveRound] Shields - Host has shield: ${hostHasShield}, Guest has shield: ${guestHasShield}`);

    // Apply BOOST (+30%)
    if (hostAction === 'BOOST' && !guestHasShield) {
      console.log(`[resolveRound] Host BOOST applied: ${hostPower} → ${hostPower * 1.3}`);
      hostPower *= 1.3;
    }
    if (guestAction === 'BOOST' && !hostHasShield) {
      console.log(`[resolveRound] Guest BOOST applied: ${guestPower} → ${guestPower * 1.3}`);
      guestPower *= 1.3;
    }

    // Shield blocked boost
    if (hostAction === 'BOOST' && guestHasShield) {
      console.log(`[resolveRound] Host BOOST BLOCKED by Guest SHIELD`);
    }
    if (guestAction === 'BOOST' && hostHasShield) {
      console.log(`[resolveRound] Guest BOOST BLOCKED by Host SHIELD`);
    }

    // Apply DOUBLE (x2) - CRIT - can be blocked by shield
    if (hostAction === 'DOUBLE' && !guestHasShield) {
      console.log(`[resolveRound] Host CRIT/DOUBLE applied: ${hostPower} → ${hostPower * 2}`);
      hostPower *= 2;
    }
    if (guestAction === 'DOUBLE' && !hostHasShield) {
      console.log(`[resolveRound] Guest CRIT/DOUBLE applied: ${guestPower} → ${guestPower * 2}`);
      guestPower *= 2;
    }

    // Shield blocked crit/double
    if (hostAction === 'DOUBLE' && guestHasShield) {
      console.log(`[resolveRound] Host CRIT/DOUBLE BLOCKED by Guest SHIELD`);
    }
    if (guestAction === 'DOUBLE' && hostHasShield) {
      console.log(`[resolveRound] Guest CRIT/DOUBLE BLOCKED by Host SHIELD`);
    }

    // Determine winner
    const isTie = hostPower === guestPower;
    const hostWins = hostPower > guestPower;

    console.log(`[resolveRound] Final - Host: ${hostPower}, Guest: ${guestPower}`);
    console.log(`[resolveRound] Result - Tie: ${isTie}, HostWins: ${hostWins}, GuestWins: ${!hostWins && !isTie}`);

    // Update round history
    const roundHistory = room.roundHistory || [];
    const currentRound = gameState.currentRound;

    // Update score (pot stays the same throughout the game)
    if (isTie) {
      // Add tie to history
      roundHistory.push({
        round: currentRound,
        winner: "tie",
        playerScore: gameState.hostScore,
        opponentScore: gameState.guestScore,
      });
      console.log(`🤝 Tie in round ${currentRound}`);
    } else if (hostWins) {
      gameState.hostScore += 1;
      roundHistory.push({
        round: currentRound,
        winner: "player",
        playerScore: gameState.hostScore,
        opponentScore: gameState.guestScore,
      });
      console.log(`🎯 Host won round ${currentRound}`);
    } else {
      gameState.guestScore += 1;
      roundHistory.push({
        round: currentRound,
        winner: "opponent",
        playerScore: gameState.hostScore,
        opponentScore: gameState.guestScore,
      });
      console.log(`🎯 Guest won round ${currentRound}`);
    }

    // Pot stays fixed at ante * 2 throughout the entire game
    // Winner only receives pot at the end of the match (game-over)

    // RESOLVE ROUND BETTING - Determine winner address for bets
    const roundWinnerAddress = isTie ? "tie" : (hostWins ? room.hostAddress : room.guestAddress);

    // Call resolveRoundBets to process spectator bets on this round
    if (roundWinnerAddress) {
      await ctx.runMutation(api.roundBetting.resolveRoundBets, {
        roomId: args.roomId,
        roundNumber: currentRound,
        winnerAddress: roundWinnerAddress,
      });
    }

    // Check if game is over (best of 7 = first to 4)
    if (gameState.hostScore >= 4 || gameState.guestScore >= 4) {
      gameState.phase = "game-over";

      // Determine final winner and award pot
      const finalWinnerId = gameState.hostScore >= 4 ? room.hostAddress : room.guestAddress;
      const finalWinnerUsername = gameState.hostScore >= 4 ? room.hostUsername : room.guestUsername;

      // Calculate prize (pot minus 5% house fee)
      const houseFee = Math.round(gameState.pot * 0.05);
      const finalPrize = gameState.pot - houseFee;

      console.log(`🏆 Game Over! Winner: ${finalWinnerUsername}, Prize: ${finalPrize} (pot: ${gameState.pot}, fee: ${houseFee})`);

      await ctx.db.patch(room._id, {
        gameState,
        roundHistory,
        winnerId: finalWinnerId,
        winnerUsername: finalWinnerUsername,
        finalPot: finalPrize,
        status: "finished", // Mark room as finished to prevent further interactions
      });

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
    gameState.hostBet = 0;
    gameState.guestBet = 0;
    // Pot remains 0 - ante only deducted at game start, not per round

    // Update game state (no bankroll changes between rounds) + round history
    await ctx.db.patch(room._id, {
      gameState,
      roundHistory,
    });

    console.log(`🏁 Round ${gameState.currentRound - 1} resolved in ${args.roomId} - No ante deducted for next round`);

    return { success: true, gameOver: false };
  },
});

// Finish a game and DELETE the room to prevent re-joining
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
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      // Don't throw error - room may have already been deleted
      console.log(`⚠️ Room ${args.roomId} already deleted or not found (this is okay)`);
      return { success: true, alreadyDeleted: true };
    }

    // Clean up voice participants for this room
    const voiceParticipants = await ctx.db
      .query("voiceParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const p of voiceParticipants) {
      await ctx.db.delete(p._id);
    }

    if (voiceParticipants.length > 0) {
      console.log(`🎙️ Cleaned ${voiceParticipants.length} voice participants from room ${args.roomId}`);
    }

    // DELETE the room immediately (no need to mark as finished since we're deleting)
    await ctx.db.delete(room._id);

    console.log(`🗑️ Room ${args.roomId} deleted. Winner: ${args.winnerUsername} (${args.finalPot} pot)`);

    return { success: true, alreadyDeleted: false };
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
// 🚀 BANDWIDTH FIX: This is a HOT query (called every second per user)
export const getPokerRoom = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    // 🚀 BANDWIDTH FIX: Use index instead of filter (saves 99% reads)
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
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

// Cleanup old poker rooms (called by cron)
// 🚀 BANDWIDTH FIX: Process in batches of 50 instead of loading all rooms
export const cleanupOldPokerRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 🚀 BANDWIDTH FIX: Only get rooms that might need cleanup
    // Use take(50) to limit reads per cron run
    const oldRooms = await ctx.db
      .query("pokerRooms")
      .take(50);

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

// Place a bet on a player or tie (spectators only)
export const placeBet = mutation({
  args: {
    roomId: v.string(),
    bettor: v.string(),
    bettorUsername: v.string(),
    betOn: v.string(), // Address of player to bet on OR "tie" for draw bet
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    console.log(`🎲 placeBet called:`, { roomId: args.roomId, bettor: args.bettor, betOn: args.betOn, amount: args.amount });

    // Find the room
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room) {
      console.error(`❌ Room not found: ${args.roomId}`);
      throw new Error("Room not found");
    }

    if (room.status === "finished" || room.status === "cancelled") {
      console.error(`❌ Cannot bet on ${room.status} game`);
      throw new Error("Cannot bet on finished or cancelled games");
    }

    // Allow betting during any active phase except game-over
    const allowedPhases = ["card-selection", "reveal", "resolution"];
    if (!allowedPhases.includes(room.gameState?.phase || '')) {
      console.error(`❌ Wrong phase for betting: ${room.gameState?.phase}`);
      throw new Error(`Betting is only allowed during active rounds. Current phase: ${room.gameState?.phase || 'unknown'}`);
    }

    // Verify betOn is a player in the room OR "tie"
    const isTieBet = args.betOn.toLowerCase() === "tie";
    const isHost = !isTieBet && room.hostAddress === args.betOn.toLowerCase();
    const isGuest = !isTieBet && room.guestAddress === args.betOn.toLowerCase();

    if (!isHost && !isGuest && !isTieBet) {
      console.error(`❌ Invalid bet target: ${args.betOn}`);
      throw new Error("Can only bet on players in the room or tie");
    }

    // Cannot bet if you're a player in the room
    const bettorAddr = args.bettor.toLowerCase();
    if (bettorAddr === room.hostAddress || bettorAddr === room.guestAddress) {
      console.error(`❌ Player trying to bet on own game: ${bettorAddr}`);
      throw new Error("Players cannot bet on their own games");
    }

    // Get bettor's profile to deduct coins
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", bettorAddr))
      .first();

    if (!profile) {
      console.error(`❌ Profile not found for bettor: ${bettorAddr}`);
      throw new Error("Bettor profile not found. Please create a profile first.");
    }

    // Check if bettor has enough coins
    const currentCoins = profile.coins || 0;
    if (currentCoins < args.amount) {
      throw new Error(`Insufficient funds. Need ${args.amount} but only have ${currentCoins}`);
    }

    // Deduct coins from bettor
    await ctx.db.patch(profile._id, {
      coins: currentCoins - args.amount,
      lifetimeSpent: (profile.lifetimeSpent || 0) + args.amount,
    });

    // Calculate odds (tie pays more since it's harder to hit)
    const odds = isTieBet ? 6 : 3; // 6x for tie, 3x for player win
    const betOnUsername = isTieBet
      ? "Tie/Draw"
      : (isHost ? room.hostUsername : (room.guestUsername || ""));

    // Create bet
    await ctx.db.insert("pokerBets", {
      roomId: args.roomId,
      bettor: bettorAddr,
      bettorUsername: args.bettorUsername,
      betOn: args.betOn.toLowerCase(),
      betOnUsername,
      amount: args.amount,
      token: room.token,
      odds,
      status: "active",
      timestamp: Date.now(),
    });

    console.log(`💰 Bet placed: ${args.bettorUsername} bet ${args.amount} on ${betOnUsername} at ${odds}x odds in ${args.roomId}`);

    return {
      success: true,
      newBalance: currentCoins - args.amount,
      odds,
      potentialWin: args.amount * odds,
    };
  },
});

// End spectator betting phase and move to resolution
export const endSpectatorBetting = mutation({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!room || !room.gameState) {
      throw new Error("Room not found or game not started");
    }

    if (room.gameState.phase !== "spectator-betting") {
      throw new Error("Not in spectator betting phase");
    }

    const gameState = { ...room.gameState };
    gameState.phase = "resolution";

    await ctx.db.patch(room._id, { gameState });

    console.log(`🎲 Spectator betting ended for ${args.roomId} - moving to resolution`);

    return { success: true };
  },
});

// Resolve all bets for a room when game finishes
export const resolveBets = mutation({
  args: {
    roomId: v.string(),
    winnerId: v.string(), // Address of the winner OR "tie" for draw
  },
  handler: async (ctx, args) => {
    // Get all active bets for this room
    const bets = await ctx.db
      .query("pokerBets")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (bets.length === 0) {
      return { resolved: 0, totalPaidOut: 0 };
    }

    let totalPaidOut = 0;
    const winnerAddr = args.winnerId.toLowerCase();

    for (const bet of bets) {
      const won = bet.betOn === winnerAddr;

      if (won) {
        // Winner gets odds multiplier (3x for player, 6x for tie)
        const odds = bet.odds || 3; // Default to 3x for old bets
        const payout = bet.amount * odds;

        // Get bettor's profile
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_address", (q) => q.eq("address", bet.bettor))
          .first();

        if (profile) {
          // Pay out winnings to balance
          const currentBalance = profile.coins || 0;
          await ctx.db.patch(profile._id, {
            coins: currentBalance + payout,
            lifetimeEarned: (profile.lifetimeEarned || 0) + payout,
          });

          console.log(`💰 Poker bet winnings added to balance: ${payout} TESTVBMS for ${bet.bettor}. Balance: ${currentBalance} → ${currentBalance + payout}`);
          totalPaidOut += payout;
        }

        // Update bet status
        await ctx.db.patch(bet._id, {
          status: "won",
          payout,
          resolvedAt: Date.now(),
        });

        console.log(`✅ Bet won: ${bet.bettorUsername} won ${payout} (bet ${bet.amount} on ${bet.betOnUsername})`);
      } else {
        // Loser - bet already deducted, just mark as lost
        await ctx.db.patch(bet._id, {
          status: "lost",
          resolvedAt: Date.now(),
        });

        console.log(`❌ Bet lost: ${bet.bettorUsername} lost ${bet.amount} (bet on ${bet.betOnUsername})`);
      }
    }

    console.log(`🎰 Resolved ${bets.length} bets for room ${args.roomId} - Total paid out: ${totalPaidOut}`);

    return {
      resolved: bets.length,
      totalPaidOut,
    };
  },
});

// Get all bets for a room
export const getRoomBets = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    const bets = await ctx.db
      .query("pokerBets")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(100);

    return bets;
  },
});

// Get a user's bets for a room
export const getUserRoomBets = query({
  args: {
    roomId: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const bets = await ctx.db
      .query("pokerBets")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("bettor"), args.address.toLowerCase()))
      .collect();

    return bets;
  },
});

// ============================================================================
// INTERNAL QUERIES (for admin/cron only)
// ============================================================================

/**
 * Get all poker rooms (for monitoring/admin tools)
 * 🚀 BANDWIDTH FIX: Converted to internalQuery + limited to 100 rooms
 */
export const listAllRooms = internalQuery({
  args: {},
  handler: async (ctx) => {
    // 🚀 BANDWIDTH FIX: Limit to 100 rooms max
    const rooms = await ctx.db.query("pokerRooms").take(100);
    return rooms;
  },
});

/**
 * Clean up old/expired poker rooms (admin tool)
 * 🚀 BANDWIDTH FIX: Converted to internalMutation + limited to 50 rooms
 */
export const cleanupOldRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // 🚀 BANDWIDTH FIX: Process in batches of 50
    const rooms = await ctx.db.query("pokerRooms").take(50);

    let deletedCount = 0;
    let voiceCleanedCount = 0;
    for (const room of rooms) {
      // Delete if expired or older than 1 hour
      if (room.expiresAt < now || (now - room.createdAt > 3600000)) {
        // Clean up voice participants for this room first
        const voiceParticipants = await ctx.db
          .query("voiceParticipants")
          .withIndex("by_room", (q) => q.eq("roomId", room.roomId))
          .collect();

        for (const p of voiceParticipants) {
          await ctx.db.delete(p._id);
          voiceCleanedCount++;
        }

        await ctx.db.delete(room._id);
        deletedCount++;
        console.log(`[cleanupOldRooms] Deleted expired/old room ${room.roomId}`);
      }
    }

    if (voiceCleanedCount > 0) {
      console.log(`[cleanupOldRooms] Cleaned ${voiceCleanedCount} voice participants`);
    }

    return { deletedCount, voiceCleanedCount };
  },
});

/**
 * Clean up old/expired poker rooms (public - for admin API)
 * Same logic as internal but callable from HTTP client
 * Note: Protected by CRON_SECRET in API route
 */
export const cleanupOldRoomsPublic = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rooms = await ctx.db.query("pokerRooms").take(50);

    let deletedCount = 0;
    let voiceCleanedCount = 0;
    for (const room of rooms) {
      if (room.expiresAt < now || (now - room.createdAt > 3600000)) {
        const voiceParticipants = await ctx.db
          .query("voiceParticipants")
          .withIndex("by_room", (q) => q.eq("roomId", room.roomId))
          .collect();

        for (const p of voiceParticipants) {
          await ctx.db.delete(p._id);
          voiceCleanedCount++;
        }

        await ctx.db.delete(room._id);
        deletedCount++;
        console.log(`[cleanupOldRoomsPublic] Deleted expired/old room ${room.roomId}`);
      }
    }

    return { deletedCount, voiceCleanedCount };
  },
});

/**
 * Force delete room by player address (admin tool)
 */
// Note: Called from frontend PokerMatchmaking.tsx
export const forceDeleteRoomByAddress = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const addr = address.toLowerCase();
    console.log(`[forceDeleteRoomByAddress] Finding rooms for address ${addr}...`);

    const rooms = await ctx.db
      .query("pokerRooms")
      .filter((q) =>
        q.or(
          q.eq(q.field("hostAddress"), addr),
          q.eq(q.field("guestAddress"), addr)
        )
      )
      .collect();

    if (rooms.length === 0) {
      return { deletedCount: 0, message: "No rooms found for this address" };
    }

    let voiceCleanedCount = 0;
    for (const room of rooms) {
      // Clean up voice participants for this room
      const voiceParticipants = await ctx.db
        .query("voiceParticipants")
        .withIndex("by_room", (q) => q.eq("roomId", room.roomId))
        .collect();

      for (const p of voiceParticipants) {
        await ctx.db.delete(p._id);
        voiceCleanedCount++;
      }

      await ctx.db.delete(room._id);
      console.log(`[forceDeleteRoomByAddress] Deleted room ${room.roomId}`);
    }

    return { deletedCount: rooms.length, voiceCleanedCount, message: `Deleted ${rooms.length} room(s)` };
  },
});

/**
 * Force delete a stuck poker room (admin tool)
 */
export const forceDeleteRoom = internalMutation({
  args: {
    roomId: v.string(), // roomId is a string in pokerRooms table
  },
  handler: async (ctx, { roomId }) => {
    console.log(`[forceDeleteRoom] Force deleting room #${roomId}...`);

    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
      .first();

    if (!room) {
      throw new Error(`Room #${roomId} not found`);
    }

    console.log(`[forceDeleteRoom] Found room:`, room);

    // Clean up voice participants for this room
    const voiceParticipants = await ctx.db
      .query("voiceParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    for (const p of voiceParticipants) {
      await ctx.db.delete(p._id);
    }

    if (voiceParticipants.length > 0) {
      console.log(`[forceDeleteRoom] Cleaned ${voiceParticipants.length} voice participants`);
    }

    // Just delete it directly - no status update needed
    await ctx.db.delete(room._id);

    console.log(`[forceDeleteRoom] Room #${roomId} deleted successfully`);

    return {
      success: true,
      deletedRoom: {
        roomId: room.roomId,
        status: room.status,
        players: [room.hostAddress, room.guestAddress],
      },
      voiceCleanedCount: voiceParticipants.length,
    };
  },
});

// ============================================================================
// CPU VS CPU MODE - Same table as PvP, but both players are CPUs
// ============================================================================

// CPU Names for Mecha Arena battles
const CPU_BATTLE_NAMES = [
  { name: "Mecha Alpha", emoji: "🤖" },
  { name: "Mecha Prime", emoji: "🦾" },
  { name: "Mecha Nova", emoji: "💎" },
  { name: "Mecha Striker", emoji: "⚡" },
  { name: "Mecha Titan", emoji: "🧠" },
  { name: "Mecha Zero", emoji: "🔮" },
  { name: "Mecha Fury", emoji: "🔥" },
  { name: "Mecha Storm", emoji: "🌪️" },
  { name: "Mecha Blade", emoji: "⚔️" },
  { name: "Mecha Shadow", emoji: "👤" },
];

/**
 * Generate a CPU deck from a collection (10 cards for poker battle)
 */
function generateCpuPokerDeck(collection: string) {
  const cards = COLLECTION_CARDS[collection] || COLLECTION_CARDS["gmvbrs"];
  if (!cards || cards.length < 10) {
    // Fallback to gmvbrs if collection doesn't have enough cards
    const fallbackCards = COLLECTION_CARDS["gmvbrs"] || [];
    const shuffled = cryptoShuffle(fallbackCards);
    return shuffled.slice(0, 10).map((card) => ({
      tokenId: card.tokenId,
      name: card.name,
      image: card.imageUrl,
      imageUrl: card.imageUrl,
      power: card.power,
      rarity: card.rarity,
      collection: "gmvbrs",
    }));
  }

  const shuffled = cryptoShuffle(cards);
  return shuffled.slice(0, 10).map((card) => ({
    tokenId: card.tokenId,
    name: card.name,
    image: card.imageUrl,
    imageUrl: card.imageUrl,
    power: card.power,
    rarity: card.rarity,
    collection: collection,
  }));
}

/**
 * Create a CPU vs CPU poker room
 * Returns roomId for spectators to join
 */
export const createCpuVsCpuRoom = mutation({
  args: {
    collection: v.string(), // Which NFT collection to use for CPU decks
    forceNew: v.optional(v.boolean()), // Force create new room even if one exists
  },
  handler: async (ctx, { collection, forceNew }) => {
    const now = Date.now();

    // Check if there's already an active CPU vs CPU room for this collection
    // 🚀 PERF: Use compound index for isCpuVsCpu + cpuCollection
    const existingRoom = await ctx.db
      .query("pokerRooms")
      .withIndex("by_cpu_collection", (q) => q.eq("isCpuVsCpu", true).eq("cpuCollection", collection))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "waiting"),
          q.eq(q.field("status"), "ready"),
          q.eq(q.field("status"), "in-progress")
        )
      )
      .first();

    if (existingRoom && !forceNew) {
      return { roomId: existingRoom.roomId, isNew: false };
    }

    // Generate random CPU names
    const shuffledNames = cryptoShuffle(CPU_BATTLE_NAMES);
    const cpu1 = shuffledNames[0];
    const cpu2 = shuffledNames[1];

    // Generate decks for both CPUs
    const cpu1Deck = generateCpuPokerDeck(collection);
    const cpu2Deck = generateCpuPokerDeck(collection);

    // Create room ID
    const roomId = `cpu-${collection}-${Date.now()}`;

    // Create the room - both players are CPUs (ready immediately)
    const room = await ctx.db.insert("pokerRooms", {
      roomId,
      status: "in-progress", // Start immediately
      ante: 0, // No ante for CPU vs CPU
      token: "VBMS",

      isCpuVsCpu: true,
      cpuCollection: collection,

      // CPU 1 (Host)
      hostAddress: `cpu1-${collection}`.toLowerCase(),
      hostUsername: `${cpu1.emoji} ${cpu1.name}`,
      hostDeck: cpu1Deck,
      hostReady: true,
      hostBankroll: 1000,
      hostBoostCoins: 1500, // Increased from 10 to 1500 for more boost usage

      // CPU 2 (Guest)
      guestAddress: `cpu2-${collection}`.toLowerCase(),
      guestUsername: `${cpu2.emoji} ${cpu2.name}`,
      guestDeck: cpu2Deck,
      guestReady: true,
      guestBankroll: 1000,
      guestBoostCoins: 1500, // Increased from 10 to 1500 for more boost usage

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
        hostSelectedCard: undefined,
        guestSelectedCard: undefined,
        hostAction: undefined,
        guestAction: undefined,
        hostBet: undefined,
        guestBet: undefined,
        roundWinner: undefined,
        hostUsedCards: [],
        guestUsedCards: [],
      },

      createdAt: now,
      expiresAt: now + 30 * 60 * 1000, // 30 minutes
      finishedAt: undefined,
    });

    console.log(`🤖 CPU vs CPU room created: ${roomId} (${collection})`);

    // Schedule CPU to make first move after 3 seconds
    await ctx.scheduler.runAfter(3000, internal.pokerBattle.cpuMakeMove, {
      roomId,
      isHost: true,
    });

    return { roomId, isNew: true };
  },
});

/**
 * Get active CPU vs CPU rooms (for room selection)
 */
export const getCpuVsCpuRooms = query({
  args: {},
  handler: async (ctx) => {
    // 🚀 PERF: Use index for isCpuVsCpu, then filter status
    const rooms = await ctx.db
      .query("pokerRooms")
      .withIndex("by_cpu_collection", (q) => q.eq("isCpuVsCpu", true))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "waiting"),
          q.eq(q.field("status"), "ready"),
          q.eq(q.field("status"), "in-progress")
        )
      )
      .collect();

    return rooms.map((room) => ({
      roomId: room.roomId,
      collection: room.cpuCollection,
      status: room.status,
      hostUsername: room.hostUsername,
      guestUsername: room.guestUsername,
      spectatorCount: room.spectators?.length || 0,
      currentRound: room.gameState?.currentRound || 1,
      hostScore: room.gameState?.hostScore || 0,
      guestScore: room.gameState?.guestScore || 0,
    }));
  },
});

/**
 * Get available collections for CPU Arena
 */
export const getAvailableCollections = query({
  args: {},
  handler: async () => {
    // Return all available collections
    return [
      "gmvbrs",
      "vibe",
      "viberuto",
      "meowverse",
      "poorlydrawnpepes",
      "teampothead",
      "tarot",
      "americanfootball",
      "vibefid",
      "baseballcabal",
      "vibefx",
      "historyofcomputer",
      "cumioh",
      "viberotbangers",
    ];
  },
});

/**
 * CPU makes a move (internal - called by scheduler)
 */
export const cpuMakeMove = internalMutation({
  args: {
    roomId: v.string(),
    isHost: v.boolean(),
  },
  handler: async (ctx, { roomId, isHost }) => {
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
      .first();

    if (!room || !room.isCpuVsCpu) {
      console.log(`[cpuMakeMove] Room ${roomId} not found or not CPU vs CPU`);
      return;
    }

    if (room.status === "finished" || room.status === "cancelled") {
      console.log(`[cpuMakeMove] Room ${roomId} is ${room.status}, skipping`);
      return;
    }

    const gameState = room.gameState;
    if (!gameState) return;

    const currentRound = gameState.currentRound || 1;
    const deck = isHost ? room.hostDeck : room.guestDeck;
    const usedCards = isHost ? gameState.hostUsedCards : gameState.guestUsedCards;
    const selectedCard = isHost ? gameState.hostSelectedCard : gameState.guestSelectedCard;

    // Phase: card-selection - CPU selects a card
    if (gameState.phase === "card-selection" && !selectedCard && deck) {
      // Find available cards (not used yet)
      // tokenId in deck can be string, usedCards stores numbers
      const availableCards = deck.filter((card: any) => {
        const cardTokenId = typeof card.tokenId === 'string' ? parseInt(card.tokenId, 10) : card.tokenId;
        return !usedCards?.includes(cardTokenId);
      });

      if (availableCards.length === 0) {
        console.log(`[cpuMakeMove] No available cards for CPU ${isHost ? 'host' : 'guest'}`);
        return;
      }

      // CPU strategy: pick a random card (could be improved with AI later)
      const randomCard = availableCards[cryptoRandomInt(availableCards.length)];

      // Update game state with selected card (tokenId must be number for schema)
      const tokenIdNum = typeof randomCard.tokenId === 'string' ? parseInt(randomCard.tokenId, 10) : randomCard.tokenId;
      const newUsedCards = [...(usedCards || []), tokenIdNum];

      console.log(`🤖 CPU ${isHost ? 'host' : 'guest'} selected card: ${randomCard.name} (power: ${randomCard.power})`);

      // CPU also selects an action (BOOST, SHIELD, DOUBLE, PASS)
      // CPU strategy: 50% BOOST, 25% SHIELD, 10% DOUBLE, 15% PASS
      // More aggressive to avoid ties
      const currentBoostCoins = isHost ? (room.hostBoostCoins ?? 1500) : (room.guestBoostCoins ?? 1500);
      const actionRoll = cryptoRandomFloat();
      let cpuAction: "BOOST" | "SHIELD" | "DOUBLE" | "PASS";

      if (actionRoll < 0.50 && currentBoostCoins >= 100) {
        cpuAction = "BOOST"; // 50% chance if has coins
      } else if (actionRoll < 0.75 && currentBoostCoins >= 80) {
        cpuAction = "SHIELD"; // 25% chance if has coins
      } else if (actionRoll < 0.85 && currentBoostCoins >= 200) {
        cpuAction = "DOUBLE"; // 10% chance if has coins
      } else {
        cpuAction = "PASS"; // 15% or when not enough coins
      }

      // Deduct boost costs
      const boostCosts: Record<string, number> = {
        BOOST: 100,
        SHIELD: 80,
        DOUBLE: 200,
        PASS: 0,
      };
      const cost = boostCosts[cpuAction] || 0;
      const newBoostCoins = currentBoostCoins - cost;

      console.log(`🤖 CPU ${isHost ? 'host' : 'guest'} selected action: ${cpuAction} (cost: ${cost}, balance: ${newBoostCoins})`);

      // Update game state with action and boost coins
      await ctx.db.patch(room._id, {
        gameState: {
          ...gameState,
          [isHost ? "hostSelectedCard" : "guestSelectedCard"]: randomCard,
          [isHost ? "hostUsedCards" : "guestUsedCards"]: newUsedCards,
          [isHost ? "hostAction" : "guestAction"]: cpuAction,
        },
        [isHost ? "hostBoostCoins" : "guestBoostCoins"]: newBoostCoins,
      });

      // Re-fetch room to get the updated state after our patch
      const updatedRoom = await ctx.db
        .query("pokerRooms")
        .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
        .first();

      if (!updatedRoom || !updatedRoom.gameState) return;

      // Check if both CPUs have selected - if so, move to reveal
      const otherSelected = isHost ? updatedRoom.gameState.guestSelectedCard : updatedRoom.gameState.hostSelectedCard;
      if (otherSelected) {
        // Both selected, wait 15 seconds (give spectators time to bet) then reveal
        // If someone bets, the window will be shortened to 5 seconds via shortenBettingWindow
        const bettingWindowEndsAt = Date.now() + 15000; // 15 seconds from now
        console.log(`🤖 Both CPUs selected - waiting 15s for spectator bets before reveal (will shorten to 5s if bet placed)`);

        await ctx.db.patch(updatedRoom._id, {
          gameState: {
            ...updatedRoom.gameState,
            bettingWindowEndsAt,
            revealScheduledFor: bettingWindowEndsAt, // Mark when reveal should happen
          },
        });

        await ctx.scheduler.runAfter(15000, internal.pokerBattle.cpuRevealRound, {
          roomId,
        });
      } else {
        // Schedule other CPU to select after 2 seconds
        await ctx.scheduler.runAfter(2000, internal.pokerBattle.cpuMakeMove, {
          roomId,
          isHost: !isHost,
        });
      }
    }
  },
});

/**
 * Shorten betting window when first bet is placed in CPU vs CPU
 */
export const shortenBettingWindow = internalMutation({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
      .first();

    if (!room || !room.isCpuVsCpu) return;

    const gameState = room.gameState;
    if (!gameState) return;

    const currentRound = gameState.currentRound || 1;
    if (!gameState.bettingWindowEndsAt) return;

    const now = Date.now();
    const newEndsAt = now + 5000; // 5 seconds from now

    // Only shorten if the new time is sooner than the current window
    if (newEndsAt < gameState.bettingWindowEndsAt) {
      console.log(`⚡ Bet placed! Shortening betting window to 5s for round ${currentRound}`);

      await ctx.db.patch(room._id, {
        gameState: {
          ...gameState,
          bettingWindowEndsAt: newEndsAt,
          revealScheduledFor: newEndsAt, // Mark when reveal should happen
        },
      });

      // Schedule reveal for 5 seconds (the original 15s reveal will be ignored via revealScheduledFor check)
      await ctx.scheduler.runAfter(5000, internal.pokerBattle.cpuRevealRound, {
        roomId,
      });

      console.log(`⏰ Scheduled new reveal for 5s, original 15s reveal will be skipped`);
    }
  },
});

/**
 * Reveal round and determine winner (internal)
 */
export const cpuRevealRound = internalMutation({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
      .first();

    if (!room || !room.isCpuVsCpu || room.status === "finished") return;

    // Check if betting window is still open
    const gameState = room.gameState;
    if (!gameState) return;

    const currentRound = gameState.currentRound || 1;

    // Check if this reveal is still valid (not superseded by a shortened window)
    if (gameState.revealScheduledFor && Date.now() < gameState.revealScheduledFor - 1000) {
      // This reveal was scheduled before the window was shortened - skip it
      console.log(`⏸️ Skipping early reveal - window was shortened, new reveal already scheduled`);
      return;
    }

    if (gameState.bettingWindowEndsAt && Date.now() < gameState.bettingWindowEndsAt) {
      // Window still open
      const remainingTime = gameState.bettingWindowEndsAt - Date.now();

      // If less than 1 second remaining, just wait here instead of re-scheduling
      if (remainingTime < 1000) {
        console.log(`⏰ Betting window closing in ${remainingTime}ms, waiting...`);
        // Don't re-schedule, just continue after the check
      } else {
        console.log(`⏰ Betting window still open, waiting ${remainingTime}ms more`);
        await ctx.scheduler.runAfter(remainingTime, internal.pokerBattle.cpuRevealRound, {
          roomId,
        });
        return;
      }
    }

    const hostCard = gameState.hostSelectedCard;
    const guestCard = gameState.guestSelectedCard;

    if (!hostCard || !guestCard) return;

    // Move to reveal phase and clear betting window timer
    await ctx.db.patch(room._id, {
      gameState: {
        ...gameState,
        phase: "reveal",
        bettingWindowEndsAt: undefined, // Clear timer to stop countdown
      },
    });

    // After 5 seconds, resolve the round (more time to see cards)
    await ctx.scheduler.runAfter(5000, internal.pokerBattle.cpuResolveRound, {
      roomId,
    });
  },
});

/**
 * Resolve round and start next (internal)
 */
export const cpuResolveRound = internalMutation({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
      .first();

    if (!room || !room.isCpuVsCpu || room.status === "finished") return;

    const gameState = room.gameState;
    if (!gameState) return;

    const hostCard = gameState.hostSelectedCard;
    const guestCard = gameState.guestSelectedCard;

    if (!hostCard || !guestCard) return;

    // Get actions
    const hostAction = gameState.hostAction;
    const guestAction = gameState.guestAction;

    // Determine winner - APPLY ACTIONS (BOOST, SHIELD, DOUBLE)!
    let hostPower = hostCard.power || 0;
    let guestPower = guestCard.power || 0;

    // Check for shields
    const hostHasShield = hostAction === 'SHIELD';
    const guestHasShield = guestAction === 'SHIELD';

    // Apply BOOST (+30%) - blocked by opponent's shield
    if (hostAction === 'BOOST' && !guestHasShield) {
      hostPower *= 1.3;
    }
    if (guestAction === 'BOOST' && !hostHasShield) {
      guestPower *= 1.3;
    }

    // Apply DOUBLE (x2) - blocked by opponent's shield
    if (hostAction === 'DOUBLE' && !guestHasShield) {
      hostPower *= 2;
    }
    if (guestAction === 'DOUBLE' && !hostHasShield) {
      guestPower *= 2;
    }

    console.log(`🤖 CPU Arena power calculation: Host ${hostCard.power} → ${Math.round(hostPower)} (${hostAction || 'PASS'}), Guest ${guestCard.power} → ${Math.round(guestPower)} (${guestAction || 'PASS'})`);

    let newHostScore = gameState.hostScore;
    let newGuestScore = gameState.guestScore;
    let roundWinner: "host" | "guest" | "tie" | undefined;

    if (hostPower > guestPower) {
      newHostScore++;
      roundWinner = "host";
    } else if (guestPower > hostPower) {
      newGuestScore++;
      roundWinner = "guest";
    } else {
      roundWinner = "tie";
    }

    const currentRound = gameState.currentRound;

    // RESOLVE SPECTATOR BETS for this round
    // Get all active bets for this round
    const bets = await ctx.db
      .query("roundBets")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", roomId).eq("roundNumber", currentRound)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    console.log(`🎰 CPU Arena: Round ${currentRound} result: ${roundWinner}, found ${bets.length} active bets [roomId: ${roomId}]`);

    // Determine winner address (or "tie")
    const winnerAddress = roundWinner === "tie" ? "tie" : (roundWinner === "host" ? room.hostAddress : room.guestAddress);

    if (bets.length > 0) {
      // Process all bets (WIN/LOSS/TIE)
      for (const bet of bets) {
        const isTieBet = bet.betOn.toLowerCase() === "tie";
        const isWinner = (roundWinner === "tie" && isTieBet) || (bet.betOn.toLowerCase() === winnerAddress?.toLowerCase());

        if (isWinner) {
          // WINNER: Pay out with odds multiplier
          const payout = Math.floor(bet.amount * bet.odds);

          // Get bettor's credits
          const credits = await ctx.db
            .query("bettingCredits")
            .withIndex("by_address", (q) => q.eq("address", bet.bettor))
            .first();

          if (credits) {
            await ctx.db.patch(credits._id, {
              balance: credits.balance + payout,
            });
            console.log(`✅ CPU Arena bet won: ${bet.bettor} won ${payout} credits (${bet.amount} × ${bet.odds}x)`);
          }

          // Update bet status
          await ctx.db.patch(bet._id, {
            status: "won",
            payout,
            resolvedAt: Date.now(),
          });

          // Log transaction
          await ctx.db.insert("bettingTransactions", {
            address: bet.bettor,
            type: "win",
            amount: payout,
            roomId,
            timestamp: Date.now(),
          });
        } else {
          // LOSER: Credits already deducted
          await ctx.db.patch(bet._id, {
            status: "lost",
            resolvedAt: Date.now(),
          });

          // Log transaction
          await ctx.db.insert("bettingTransactions", {
            address: bet.bettor,
            type: "loss",
            amount: -bet.amount,
            roomId,
            timestamp: Date.now(),
          });

          console.log(`❌ CPU Arena bet lost: ${bet.bettor} lost ${bet.amount} credits`);
        }
      }

      console.log(`🎰 Resolved ${bets.length} bets for round ${currentRound} (winner: ${winnerAddress})`);
    }

    const nextRound = currentRound + 1;

    // Check if game is over (first to 4 wins or 7 rounds)
    const isGameOver = newHostScore >= 4 || newGuestScore >= 4 || currentRound >= 7;

    if (isGameOver) {
      // Game over
      const winner = newHostScore > newGuestScore ? "host" : newGuestScore > newHostScore ? "guest" : "tie";

      await ctx.db.patch(room._id, {
        status: "finished",
        finishedAt: Date.now(),
        gameState: {
          ...gameState,
          phase: "game-over",
          hostScore: newHostScore,
          guestScore: newGuestScore,
          roundWinner,
        },
      });

      console.log(`🏆 CPU vs CPU game finished: ${room.hostUsername} ${newHostScore} - ${newGuestScore} ${room.guestUsername}`);

      // Start a new game after 15 seconds if there are spectators (more time for victory screen)
      if (room.spectators && room.spectators.length > 0) {
        await ctx.scheduler.runAfter(15000, internal.pokerBattle.cpuRestartGame, {
          roomId,
        });
      }
    } else {
      // Move to resolution phase briefly, then next round
      await ctx.db.patch(room._id, {
        gameState: {
          ...gameState,
          phase: "resolution",
          hostScore: newHostScore,
          guestScore: newGuestScore,
          roundWinner,
        },
      });

      // After 5 seconds, start next round (more time to see result)
      await ctx.scheduler.runAfter(5000, internal.pokerBattle.cpuStartNextRound, {
        roomId,
        nextRound,
      });
    }
  },
});

/**
 * Start next round (internal)
 */
export const cpuStartNextRound = internalMutation({
  args: {
    roomId: v.string(),
    nextRound: v.number(),
  },
  handler: async (ctx, { roomId, nextRound }) => {
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
      .first();

    if (!room || !room.isCpuVsCpu || room.status === "finished") return;

    const gameState = room.gameState;
    if (!gameState) return;

    // Reset for next round (clear betting window to reset timer)
    await ctx.db.patch(room._id, {
      gameState: {
        ...gameState,
        currentRound: nextRound,
        phase: "card-selection",
        hostSelectedCard: undefined,
        guestSelectedCard: undefined,
        hostAction: undefined,
        guestAction: undefined,
        roundWinner: undefined,
        bettingWindowEndsAt: undefined, // Clear to reset timer
        revealScheduledFor: undefined,
      },
    });

    console.log(`🎮 CPU vs CPU starting round ${nextRound}`);

    // Schedule CPU host to select card after 2 seconds
    await ctx.scheduler.runAfter(2000, internal.pokerBattle.cpuMakeMove, {
      roomId,
      isHost: true,
    });
  },
});

/**
 * Restart CPU vs CPU game (internal)
 */
export const cpuRestartGame = internalMutation({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db
      .query("pokerRooms")
      .withIndex("by_room_id", (q) => q.eq("roomId", roomId))
      .first();

    if (!room || !room.isCpuVsCpu) return;

    // Only restart if there are still spectators
    if (!room.spectators || room.spectators.length === 0) {
      // No spectators, delete the room
      await ctx.db.delete(room._id);
      console.log(`🗑️ CPU vs CPU room ${roomId} deleted (no spectators)`);
      return;
    }

    // Generate new decks
    const collection = room.cpuCollection || "gmvbrs";
    const cpu1Deck = generateCpuPokerDeck(collection);
    const cpu2Deck = generateCpuPokerDeck(collection);

    // Reset game state
    await ctx.db.patch(room._id, {
      status: "in-progress",
      hostDeck: cpu1Deck,
      guestDeck: cpu2Deck,
      finishedAt: undefined,
      gameState: {
        currentRound: 1,
        hostScore: 0,
        guestScore: 0,
        pot: 0,
        currentBet: 0,
        phase: "card-selection",
        hostSelectedCard: undefined,
        guestSelectedCard: undefined,
        hostAction: undefined,
        guestAction: undefined,
        hostBet: undefined,
        guestBet: undefined,
        roundWinner: undefined,
        hostUsedCards: [],
        guestUsedCards: [],
      },
    });

    console.log(`🔄 CPU vs CPU game restarted: ${roomId}`);

    // Schedule first move
    await ctx.scheduler.runAfter(3000, internal.pokerBattle.cpuMakeMove, {
      roomId,
      isHost: true,
    });
  },
});

/**
 * ADMIN: Force reset all CPU vs CPU rooms (for bug fixes)
 */
export const forceResetAllCpuRooms = internalMutation({
  args: {},
  handler: async (ctx) => {
    // 🚀 PERF: Use index for isCpuVsCpu
    const rooms = await ctx.db
      .query("pokerRooms")
      .withIndex("by_cpu_collection", (q) => q.eq("isCpuVsCpu", true))
      .collect();

    console.log(`🔄 Force resetting ${rooms.length} CPU rooms...`);

    for (const room of rooms) {
      await ctx.db.delete(room._id);
      console.log(`✅ Deleted room: ${room.roomId}`);
    }

    return { deleted: rooms.length };
  },
});
