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
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
    const existingRoom = await ctx.db
      .query("pokerRooms")
      .filter((q) =>
        q.or(
          q.eq(q.field("hostAddress"), normalizedAddress),
          q.eq(q.field("guestAddress"), normalizedAddress)
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
    token: v.union(v.literal("VBMS"), v.literal("TESTVBMS"), v.literal("testUSDC"), v.literal("VIBE_NFT")),
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
        const startingBoostCoins = 1000;

        await ctx.db.patch(availableRoom._id, {
          guestAddress: addr,
          guestUsername: args.username,
          guestReady: false,
          guestBankroll: startingBankroll,
          guestBoostCoins: startingBoostCoins,
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
    const startingBoostCoins = 1000;

    await ctx.db.insert("pokerRooms", {
      roomId,
      status: "waiting",
      ante: args.ante,
      token: args.token,
      hostAddress: addr,
      hostUsername: args.username,
      hostReady: false,
      hostBankroll: startingBankroll,
      hostBoostCoins: startingBoostCoins,
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
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
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
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
      .first();

    if (!room) {
      // Don't throw error - room may have already been deleted
      console.log(`⚠️ Room ${args.roomId} already deleted or not found (this is okay)`);
      return { success: true, alreadyDeleted: true };
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

// Cleanup old poker rooms (called by cron)
export const cleanupOldPokerRooms = internalMutation({
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

// Place a bet on a player (spectators only)
export const placeBet = mutation({
  args: {
    roomId: v.string(),
    bettor: v.string(),
    bettorUsername: v.string(),
    betOn: v.string(), // Address of player to bet on
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    console.log(`🎲 placeBet called:`, { roomId: args.roomId, bettor: args.bettor, betOn: args.betOn, amount: args.amount });

    // Find the room
    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
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

    // Verify betOn is a player in the room
    const isHost = room.hostAddress === args.betOn.toLowerCase();
    const isGuest = room.guestAddress === args.betOn.toLowerCase();

    if (!isHost && !isGuest) {
      console.error(`❌ Invalid bet target: ${args.betOn}`);
      throw new Error("Can only bet on players in the room");
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

    // Create bet
    await ctx.db.insert("pokerBets", {
      roomId: args.roomId,
      bettor: bettorAddr,
      bettorUsername: args.bettorUsername,
      betOn: args.betOn.toLowerCase(),
      betOnUsername: isHost ? room.hostUsername : (room.guestUsername || ""),
      amount: args.amount,
      token: room.token,
      status: "active",
      timestamp: Date.now(),
    });

    console.log(`💰 Bet placed: ${args.bettorUsername} bet ${args.amount} on ${isHost ? room.hostUsername : room.guestUsername} in ${args.roomId}`);

    return {
      success: true,
      newBalance: currentCoins - args.amount,
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
      .filter((q) => q.eq(q.field("roomId"), args.roomId))
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
    winnerId: v.string(), // Address of the winner
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
        // Winner gets 3x their bet (1x return + 2x profit)
        const payout = bet.amount * 3;

        // Get bettor's profile
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_address", (q) => q.eq("address", bet.bettor))
          .first();

        if (profile) {
          // Pay out winnings to inbox
          const currentInbox = profile.coinsInbox || 0;
          await ctx.db.patch(profile._id, {
            coinsInbox: currentInbox + payout,
            lifetimeEarned: (profile.lifetimeEarned || 0) + payout,
          });

          console.log(`📬 Poker bet winnings sent to inbox: ${payout} TESTVBMS for ${bet.bettor}. Inbox: ${currentInbox} → ${currentInbox + payout}`);
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
// PUBLIC QUERIES (for external scripts/monitoring)
// ============================================================================

/**
 * Get all poker rooms (for monitoring/admin tools)
 */
export const listAllRooms = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("pokerRooms").collect();
    return rooms;
  },
});

/**
 * Clean up old/expired poker rooms (admin tool)
 */
export const cleanupOldRooms = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rooms = await ctx.db.query("pokerRooms").collect();

    let deletedCount = 0;
    for (const room of rooms) {
      // Delete if expired or older than 1 hour
      if (room.expiresAt < now || (now - room.createdAt > 3600000)) {
        await ctx.db.delete(room._id);
        deletedCount++;
        console.log(`[cleanupOldRooms] Deleted expired/old room ${room.roomId}`);
      }
    }

    return { deletedCount };
  },
});

/**
 * Force delete room by player address (admin tool)
 */
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

    for (const room of rooms) {
      await ctx.db.delete(room._id);
      console.log(`[forceDeleteRoomByAddress] Deleted room ${room.roomId}`);
    }

    return { deletedCount: rooms.length, message: `Deleted ${rooms.length} room(s)` };
  },
});

/**
 * Force delete a stuck poker room (admin tool)
 */
export const forceDeleteRoom = mutation({
  args: {
    roomId: v.string(), // roomId is a string in pokerRooms table
  },
  handler: async (ctx, { roomId }) => {
    console.log(`[forceDeleteRoom] Force deleting room #${roomId}...`);

    const room = await ctx.db
      .query("pokerRooms")
      .filter((q) => q.eq(q.field("roomId"), roomId))
      .first();

    if (!room) {
      throw new Error(`Room #${roomId} not found`);
    }

    console.log(`[forceDeleteRoom] Found room:`, room);

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
    };
  },
});
