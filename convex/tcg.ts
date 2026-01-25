/**
 * TCG - VIBE CLASH
 *
 * Marvel Snap style card game
 * - 3 lanes, simultaneous play
 * - 6 turns, energy 1→6
 * - 15 card deck (8+ VBMS, up to 7 Nothing)
 * - Nothing sacrifice mechanics
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TCG_CONFIG = {
  DECK_SIZE: 15,
  MIN_VBMS: 8,
  MAX_NOTHING: 7,
  INITIAL_HAND_SIZE: 3,
  CARDS_PER_TURN: 1,
  TOTAL_TURNS: 6,
  TURN_TIME_SECONDS: 20,
  LANES_COUNT: 3,
  NOTHING_POWER_MULTIPLIER: 0.5, // 50% power
  ROOM_EXPIRY_MINUTES: 10,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crypto-secure shuffle
 */
function shuffleDeck<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const j = randomBytes[0] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate unique room ID
 */
function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const randomBytes = new Uint32Array(6);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < 6; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * Draw initial hand - ensures at least 1 VBMS in hand
 */
function drawInitialHand(deck: any[]): { hand: any[]; remaining: any[] } {
  const shuffled = shuffleDeck(deck);
  const hand: any[] = [];
  const remaining = [...shuffled];

  // Draw INITIAL_HAND_SIZE cards
  for (let i = 0; i < TCG_CONFIG.INITIAL_HAND_SIZE && remaining.length > 0; i++) {
    hand.push(remaining.shift());
  }

  return { hand, remaining };
}

/**
 * Draw card for turn - Turn 1 guarantees VBMS
 */
function drawCard(deck: any[], turn: number): { card: any | null; remaining: any[] } {
  if (deck.length === 0) {
    return { card: null, remaining: deck };
  }

  const remaining = [...deck];

  if (turn === 1) {
    // Turn 1: Guarantee VBMS
    const vbmsIndex = remaining.findIndex(c => c.type === "vbms");
    if (vbmsIndex !== -1) {
      const card = remaining.splice(vbmsIndex, 1)[0];
      return { card, remaining };
    }
  }

  // Random draw
  const card = remaining.shift();
  return { card: card || null, remaining };
}

/**
 * Calculate card power (Nothing has 50% penalty)
 */
function calculateCardPower(card: any): number {
  const basePower = card.power || 0;
  if (card.type === "nothing") {
    return Math.floor(basePower * TCG_CONFIG.NOTHING_POWER_MULTIPLIER);
  }
  return basePower;
}

/**
 * Calculate lane power
 */
function calculateLanePower(cards: any[]): number {
  return cards.reduce((sum, card) => sum + calculateCardPower(card), 0);
}

/**
 * Initialize empty game state
 */
function initializeGameState(player1Deck: any[], player2Deck: any[]) {
  const p1Shuffled = shuffleDeck(player1Deck);
  const p2Shuffled = shuffleDeck(player2Deck);

  const p1Initial = drawInitialHand(p1Shuffled);
  const p2Initial = drawInitialHand(p2Shuffled);

  return {
    currentTurn: 1,
    energy: 1,
    phase: "draw" as const,
    turnEndsAt: Date.now() + (TCG_CONFIG.TURN_TIME_SECONDS * 1000),

    player1Hand: p1Initial.hand,
    player2Hand: p2Initial.hand,
    player1DeckRemaining: p1Initial.remaining,
    player2DeckRemaining: p2Initial.remaining,

    lanes: [
      { laneId: 0, player1Cards: [], player2Cards: [], player1Power: 0, player2Power: 0 },
      { laneId: 1, player1Cards: [], player2Cards: [], player1Power: 0, player2Power: 0 },
      { laneId: 2, player1Cards: [], player2Cards: [], player1Power: 0, player2Power: 0 },
    ],

    player1Actions: [],
    player2Actions: [],
    player1Confirmed: false,
    player2Confirmed: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get match by room ID
 */
export const getMatch = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db
      .query("tcgMatches")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    return match;
  },
});

/**
 * Get match by ID
 */
export const getMatchById = query({
  args: { matchId: v.id("tcgMatches") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.matchId);
  },
});

/**
 * Get player's saved decks
 */
export const getPlayerDecks = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const decks = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address", (q) => q.eq("address", args.address.toLowerCase()))
      .take(20);

    return decks;
  },
});

/**
 * Get player's active deck
 */
export const getActiveDeck = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const deck = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address_active", (q) =>
        q.eq("address", args.address.toLowerCase()).eq("isActive", true)
      )
      .first();

    return deck;
  },
});

/**
 * Get player's match history
 */
export const getPlayerHistory = query({
  args: {
    address: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const addr = args.address.toLowerCase();

    // Get matches where player was player1 or player2
    const asPlayer1 = await ctx.db
      .query("tcgHistory")
      .withIndex("by_player1", (q) => q.eq("player1Address", addr))
      .order("desc")
      .take(limit);

    const asPlayer2 = await ctx.db
      .query("tcgHistory")
      .withIndex("by_player2", (q) => q.eq("player2Address", addr))
      .order("desc")
      .take(limit);

    // Merge and sort by finishedAt
    const all = [...asPlayer1, ...asPlayer2]
      .sort((a, b) => b.finishedAt - a.finishedAt)
      .slice(0, limit);

    return all;
  },
});

/**
 * Get waiting rooms for matchmaking
 */
export const getWaitingRooms = query({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db
      .query("tcgMatches")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .order("desc")
      .take(20);

    return rooms;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS - DECK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save a new deck
 */
export const saveDeck = mutation({
  args: {
    address: v.string(),
    deckName: v.string(),
    cards: v.array(v.object({
      type: v.union(v.literal("vbms"), v.literal("nothing")),
      cardId: v.string(),
      name: v.optional(v.string()),
      rarity: v.string(),
      power: v.number(),
      imageUrl: v.string(),
      foil: v.optional(v.string()),
      wear: v.optional(v.string()),
      collection: v.optional(v.string()),
    })),
    setActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Validate deck
    const vbmsCount = args.cards.filter(c => c.type === "vbms").length;
    const nothingCount = args.cards.filter(c => c.type === "nothing").length;

    if (args.cards.length !== TCG_CONFIG.DECK_SIZE) {
      throw new Error(`Deck must have exactly ${TCG_CONFIG.DECK_SIZE} cards`);
    }

    if (vbmsCount < TCG_CONFIG.MIN_VBMS) {
      throw new Error(`Deck must have at least ${TCG_CONFIG.MIN_VBMS} VBMS cards`);
    }

    if (nothingCount > TCG_CONFIG.MAX_NOTHING) {
      throw new Error(`Deck can have at most ${TCG_CONFIG.MAX_NOTHING} Nothing cards`);
    }

    // Calculate total power
    const totalPower = args.cards.reduce((sum, card) => {
      const power = card.type === "nothing"
        ? Math.floor(card.power * TCG_CONFIG.NOTHING_POWER_MULTIPLIER)
        : card.power;
      return sum + power;
    }, 0);

    // If setActive, deactivate other decks first
    if (args.setActive) {
      const existingDecks = await ctx.db
        .query("tcgDecks")
        .withIndex("by_address", (q) => q.eq("address", addr))
        .take(50);

      for (const deck of existingDecks) {
        if (deck.isActive) {
          await ctx.db.patch(deck._id, { isActive: false });
        }
      }
    }

    // Save deck
    const deckId = await ctx.db.insert("tcgDecks", {
      address: addr,
      deckName: args.deckName,
      cards: args.cards,
      vbmsCount,
      nothingCount,
      totalPower,
      isActive: args.setActive || false,
      createdAt: Date.now(),
    });

    return { deckId, totalPower };
  },
});

/**
 * Set active deck
 */
export const setActiveDeck = mutation({
  args: {
    address: v.string(),
    deckId: v.id("tcgDecks"),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Verify ownership
    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.address !== addr) {
      throw new Error("Deck not found");
    }

    // Deactivate other decks
    const existingDecks = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address", (q) => q.eq("address", addr))
      .take(50);

    for (const d of existingDecks) {
      if (d.isActive && d._id !== args.deckId) {
        await ctx.db.patch(d._id, { isActive: false });
      }
    }

    // Activate this deck
    await ctx.db.patch(args.deckId, { isActive: true });

    return { success: true };
  },
});

/**
 * Delete a deck
 */
export const deleteDeck = mutation({
  args: {
    address: v.string(),
    deckId: v.id("tcgDecks"),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    const deck = await ctx.db.get(args.deckId);
    if (!deck || deck.address !== addr) {
      throw new Error("Deck not found");
    }

    await ctx.db.delete(args.deckId);

    return { success: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS - MATCH MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new match room
 */
export const createMatch = mutation({
  args: {
    address: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Check if player has active deck
    const activeDeck = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address_active", (q) =>
        q.eq("address", addr).eq("isActive", true)
      )
      .first();

    if (!activeDeck) {
      throw new Error("No active deck. Please create and select a deck first.");
    }

    // Generate room ID
    const roomId = generateRoomId();

    // Create match
    const matchId = await ctx.db.insert("tcgMatches", {
      roomId,
      status: "waiting",
      player1Address: addr,
      player1Username: args.username,
      player1Deck: activeDeck.cards,
      player1Ready: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + (TCG_CONFIG.ROOM_EXPIRY_MINUTES * 60 * 1000),
    });

    return { matchId, roomId };
  },
});

/**
 * Join an existing match
 */
export const joinMatch = mutation({
  args: {
    roomId: v.string(),
    address: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    // Find match
    const match = await ctx.db
      .query("tcgMatches")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (!match) {
      throw new Error("Match not found");
    }

    if (match.status !== "waiting") {
      throw new Error("Match is not available");
    }

    if (match.player1Address === addr) {
      throw new Error("Cannot join your own match");
    }

    // Check if player has active deck
    const activeDeck = await ctx.db
      .query("tcgDecks")
      .withIndex("by_address_active", (q) =>
        q.eq("address", addr).eq("isActive", true)
      )
      .first();

    if (!activeDeck) {
      throw new Error("No active deck. Please create and select a deck first.");
    }

    // Validate player1 has deck
    if (!match.player1Deck || match.player1Deck.length === 0) {
      throw new Error("Match creator doesn't have a valid deck");
    }

    // Initialize game state
    const gameState = initializeGameState(match.player1Deck, activeDeck.cards);

    // Update match
    await ctx.db.patch(match._id, {
      status: "in-progress",
      player2Address: addr,
      player2Username: args.username,
      player2Deck: activeDeck.cards,
      player2Ready: true,
      gameState,
      startedAt: Date.now(),
    });

    return { success: true, matchId: match._id };
  },
});

/**
 * Submit actions for current turn
 */
export const submitActions = mutation({
  args: {
    matchId: v.id("tcgMatches"),
    address: v.string(),
    actions: v.array(v.object({
      type: v.union(
        v.literal("play"),
        v.literal("sacrifice-hand"),
        v.literal("sacrifice-lane")
      ),
      cardIndex: v.number(),
      targetLane: v.optional(v.number()),
      targetCardIndex: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "in-progress" || !match.gameState) {
      throw new Error("Match not found or not in progress");
    }

    const isPlayer1 = match.player1Address === addr;
    const isPlayer2 = match.player2Address === addr;

    if (!isPlayer1 && !isPlayer2) {
      throw new Error("You are not in this match");
    }

    // Update actions for this player
    const updateField = isPlayer1 ? "player1Actions" : "player2Actions";
    const confirmField = isPlayer1 ? "player1Confirmed" : "player2Confirmed";

    const updatedGameState = {
      ...match.gameState,
      [updateField]: args.actions,
      [confirmField]: true,
    };

    await ctx.db.patch(match._id, { gameState: updatedGameState });

    // Check if both players confirmed
    const bothConfirmed = isPlayer1
      ? (updatedGameState.player2Confirmed === true)
      : (updatedGameState.player1Confirmed === true);

    if (bothConfirmed && updatedGameState.player1Confirmed && updatedGameState.player2Confirmed) {
      // Process turn
      await processTurn(ctx, match._id);
    }

    return { success: true, bothConfirmed };
  },
});

/**
 * Process turn after both players confirmed
 */
async function processTurn(ctx: any, matchId: Id<"tcgMatches">) {
  const match = await ctx.db.get(matchId);
  if (!match || !match.gameState) return;

  const gs = match.gameState;

  // Process player 1 actions
  let p1Hand = [...gs.player1Hand];
  let p1DeckRemaining = [...gs.player1DeckRemaining];
  const lanes = gs.lanes.map((l: any) => ({ ...l, player1Cards: [...l.player1Cards], player2Cards: [...l.player2Cards] }));

  for (const action of (gs.player1Actions || [])) {
    if (action.type === "play" && action.targetLane !== undefined) {
      const card = p1Hand.splice(action.cardIndex, 1)[0];
      if (card) {
        lanes[action.targetLane].player1Cards.push(card);
      }
    } else if (action.type === "sacrifice-hand") {
      // Remove card, draw new one
      p1Hand.splice(action.cardIndex, 1);
      if (p1DeckRemaining.length > 0) {
        p1Hand.push(p1DeckRemaining.shift());
      }
    } else if (action.type === "sacrifice-lane" && action.targetLane !== undefined) {
      // Remove from lane, buff target
      const sacrificedCard = lanes[action.targetLane].player1Cards.splice(action.cardIndex, 1)[0];
      if (sacrificedCard && action.targetCardIndex !== undefined) {
        // Find target card and buff it
        const targetLane = action.targetLane; // Could be different lane
        if (lanes[targetLane].player1Cards[action.targetCardIndex]) {
          const buffAmount = calculateSacrificeBuff(sacrificedCard);
          lanes[targetLane].player1Cards[action.targetCardIndex].power += buffAmount;
        }
      }
    }
  }

  // Process player 2 actions (same logic)
  let p2Hand = [...gs.player2Hand];
  let p2DeckRemaining = [...gs.player2DeckRemaining];

  for (const action of (gs.player2Actions || [])) {
    if (action.type === "play" && action.targetLane !== undefined) {
      const card = p2Hand.splice(action.cardIndex, 1)[0];
      if (card) {
        lanes[action.targetLane].player2Cards.push(card);
      }
    } else if (action.type === "sacrifice-hand") {
      p2Hand.splice(action.cardIndex, 1);
      if (p2DeckRemaining.length > 0) {
        p2Hand.push(p2DeckRemaining.shift());
      }
    } else if (action.type === "sacrifice-lane" && action.targetLane !== undefined) {
      const sacrificedCard = lanes[action.targetLane].player2Cards.splice(action.cardIndex, 1)[0];
      if (sacrificedCard && action.targetCardIndex !== undefined) {
        const targetLane = action.targetLane;
        if (lanes[targetLane].player2Cards[action.targetCardIndex]) {
          const buffAmount = calculateSacrificeBuff(sacrificedCard);
          lanes[targetLane].player2Cards[action.targetCardIndex].power += buffAmount;
        }
      }
    }
  }

  // Recalculate lane powers
  for (const lane of lanes) {
    lane.player1Power = calculateLanePower(lane.player1Cards);
    lane.player2Power = calculateLanePower(lane.player2Cards);
  }

  // Check if game is over (turn 6)
  if (gs.currentTurn >= TCG_CONFIG.TOTAL_TURNS) {
    // Determine winner
    const laneResults = lanes.map((lane: any) => ({
      laneId: lane.laneId,
      winner: lane.player1Power > lane.player2Power ? "player1" as const
        : lane.player2Power > lane.player1Power ? "player2" as const
        : "tie" as const,
      player1FinalPower: lane.player1Power,
      player2FinalPower: lane.player2Power,
    }));

    const p1Wins = laneResults.filter((r: any) => r.winner === "player1").length;
    const p2Wins = laneResults.filter((r: any) => r.winner === "player2").length;

    const winnerId = p1Wins > p2Wins ? match.player1Address
      : p2Wins > p1Wins ? match.player2Address
      : null; // Tie

    const winnerUsername = p1Wins > p2Wins ? match.player1Username
      : p2Wins > p1Wins ? match.player2Username
      : null;

    await ctx.db.patch(matchId, {
      status: "finished",
      winnerId,
      winnerUsername,
      laneResults,
      finishedAt: Date.now(),
      gameState: {
        ...gs,
        lanes,
        player1Hand: p1Hand,
        player2Hand: p2Hand,
        player1DeckRemaining: p1DeckRemaining,
        player2DeckRemaining: p2DeckRemaining,
        phase: "resolution",
      },
    });

    // Save to history
    if (winnerId) {
      await ctx.db.insert("tcgHistory", {
        matchId,
        roomId: match.roomId,
        player1Address: match.player1Address,
        player1Username: match.player1Username,
        player2Address: match.player2Address!,
        player2Username: match.player2Username!,
        winnerId,
        winnerUsername: winnerUsername!,
        lanesWonByWinner: Math.max(p1Wins, p2Wins),
        laneResults,
        totalTurns: gs.currentTurn,
        player1TotalPower: lanes.reduce((sum: number, l: any) => sum + l.player1Power, 0),
        player2TotalPower: lanes.reduce((sum: number, l: any) => sum + l.player2Power, 0),
        finishedAt: Date.now(),
      });
    }

    return;
  }

  // Next turn
  const nextTurn = gs.currentTurn + 1;

  // Draw cards for next turn
  const p1Draw = drawCard(p1DeckRemaining, nextTurn);
  const p2Draw = drawCard(p2DeckRemaining, nextTurn);

  if (p1Draw.card) p1Hand.push(p1Draw.card);
  if (p2Draw.card) p2Hand.push(p2Draw.card);

  await ctx.db.patch(matchId, {
    gameState: {
      currentTurn: nextTurn,
      energy: nextTurn,
      phase: "action",
      turnEndsAt: Date.now() + (TCG_CONFIG.TURN_TIME_SECONDS * 1000),
      player1Hand: p1Hand,
      player2Hand: p2Hand,
      player1DeckRemaining: p1Draw.remaining,
      player2DeckRemaining: p2Draw.remaining,
      lanes,
      player1Actions: [],
      player2Actions: [],
      player1Confirmed: false,
      player2Confirmed: false,
    },
  });
}

/**
 * Calculate sacrifice buff amount
 */
function calculateSacrificeBuff(card: any): number {
  const basePower = card.type === "nothing"
    ? Math.floor(card.power * TCG_CONFIG.NOTHING_POWER_MULTIPLIER)
    : card.power;

  // Foil multiplier
  let multiplier = 1;
  if (card.foil === "Standard") {
    multiplier = 1.5;
  } else if (card.foil === "Prize") {
    multiplier = 2;
  }

  return Math.floor(basePower * multiplier);
}

/**
 * Cancel a match (host only, while waiting)
 */
export const cancelMatch = mutation({
  args: {
    matchId: v.id("tcgMatches"),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (match.player1Address !== addr) {
      throw new Error("Only host can cancel");
    }

    if (match.status !== "waiting") {
      throw new Error("Can only cancel waiting matches");
    }

    await ctx.db.patch(args.matchId, {
      status: "cancelled",
      finishedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Forfeit a match (during game)
 */
export const forfeitMatch = mutation({
  args: {
    matchId: v.id("tcgMatches"),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const addr = args.address.toLowerCase();

    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "in-progress") {
      throw new Error("Match not found or not in progress");
    }

    const isPlayer1 = match.player1Address === addr;
    const isPlayer2 = match.player2Address === addr;

    if (!isPlayer1 && !isPlayer2) {
      throw new Error("You are not in this match");
    }

    // Winner is the other player
    const winnerId = isPlayer1 ? match.player2Address : match.player1Address;
    const winnerUsername = isPlayer1 ? match.player2Username : match.player1Username;

    await ctx.db.patch(args.matchId, {
      status: "finished",
      winnerId,
      winnerUsername,
      finishedAt: Date.now(),
    });

    return { success: true, winnerId };
  },
});
