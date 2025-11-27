/**
 * CPU ARENA - Automated CPU vs CPU Battles with Spectator Betting
 *
 * A permanent arena where two CPUs battle automatically.
 * Spectators can enter and bet on each round using betting credits.
 * 15 seconds per round for betting, then cards are revealed.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { COLLECTION_CARDS, AVAILABLE_COLLECTIONS } from "./arenaCardsData";

// ================================
// CONSTANTS & CONFIGURATION
// ================================

const BETTING_DURATION_MS = 15000; // 15 seconds for betting per round
const REVEAL_DURATION_MS = 3000; // 3 seconds to show results before next round
const ROUNDS_TO_WIN = 4; // First to 4 wins
const MAX_ROUNDS = 7;

// Odds by round
const ODDS_CONFIG = {
  rounds1to3: 1.5,
  rounds4to5: 1.8,
  rounds6to7: 2.0,
};

// CPU names and avatars
const CPU_NAMES = [
  { name: "CPU Alpha", emoji: "🤖" },
  { name: "CPU Beta", emoji: "🦾" },
  { name: "CPU Gamma", emoji: "🔮" },
  { name: "CPU Delta", emoji: "⚡" },
  { name: "CPU Omega", emoji: "🌟" },
  { name: "CPU Zeta", emoji: "💎" },
];

// Type for CPU deck cards (matching schema)
interface CpuCard {
  tokenId: string;
  name: string;
  imageUrl: string;
  power: number;
  rarity: string;
  collection?: string;
}

// Default collection for arena
const DEFAULT_COLLECTION = "gmvbrs";

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Get odds for a specific round
 */
function getOddsForRound(roundNumber: number): number {
  if (roundNumber <= 3) return ODDS_CONFIG.rounds1to3;
  if (roundNumber <= 5) return ODDS_CONFIG.rounds4to5;
  return ODDS_CONFIG.rounds6to7;
}

/**
 * Generate a random CPU deck (5 cards from real collection)
 */
function generateCpuDeck(collection: string = DEFAULT_COLLECTION): CpuCard[] {
  const cards = COLLECTION_CARDS[collection] || COLLECTION_CARDS[DEFAULT_COLLECTION];
  if (!cards || cards.length < 5) {
    throw new Error(`Collection ${collection} not found or has insufficient cards`);
  }
  const shuffled = [...cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5).map((card) => ({
    tokenId: card.tokenId,
    name: card.name,
    imageUrl: card.imageUrl,
    power: card.power,
    rarity: card.rarity,
    collection: collection,
  }));
}

/**
 * CPU AI card selection logic
 * More strategic than random - considers score and remaining cards
 */
function selectCpuCard(
  deck: { power: number; tokenId: string }[],
  score: number,
  opponentScore: number,
  round: number
): number {
  // Sort deck by power (high to low)
  const sortedIndices = deck
    .map((card, i) => ({ power: card.power, index: i }))
    .sort((a, b) => b.power - a.power);

  const roundsLeft = MAX_ROUNDS - round + 1;
  const winsNeeded = ROUNDS_TO_WIN - score;
  const opponentWinsNeeded = ROUNDS_TO_WIN - opponentScore;

  // If winning comfortably, play weaker card
  if (score >= 3 && opponentScore <= 1) {
    return sortedIndices[sortedIndices.length - 1].index; // Weakest
  }

  // If desperate (opponent about to win), play strongest
  if (opponentWinsNeeded <= 1) {
    return sortedIndices[0].index; // Strongest
  }

  // If we're behind late game, play strong
  if (round >= 5 && score < opponentScore) {
    return sortedIndices[0].index; // Strongest
  }

  // If we need all remaining rounds, play strongest
  if (winsNeeded >= roundsLeft) {
    return sortedIndices[0].index; // Strongest
  }

  // Normal play: semi-random weighted towards middle cards
  const middleIndex = Math.floor(sortedIndices.length / 2);
  const variance = Math.floor(Math.random() * 2) - 1; // -1, 0, or 1
  const selectedIndex = Math.max(0, Math.min(sortedIndices.length - 1, middleIndex + variance));
  return sortedIndices[selectedIndex].index;
}

/**
 * Get random CPU names (two different ones)
 */
function getRandomCpuNames(): [typeof CPU_NAMES[0], typeof CPU_NAMES[0]] {
  const shuffled = [...CPU_NAMES].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

// ================================
// QUERIES
// ================================

/**
 * Get available collections for arena
 */
export const getAvailableCollections = query({
  args: {},
  handler: async () => {
    return AVAILABLE_COLLECTIONS;
  },
});

/**
 * Get the currently active arena (if any)
 */
export const getActiveArena = query({
  args: {},
  handler: async (ctx) => {
    // Find arena that's not finished
    const arena = await ctx.db
      .query("cpuArena")
      .withIndex("by_status", (q) => q.eq("status", "betting"))
      .first();

    if (arena) return arena;

    // Also check for 'revealing' status
    const revealingArena = await ctx.db
      .query("cpuArena")
      .withIndex("by_status", (q) => q.eq("status", "revealing"))
      .first();

    if (revealingArena) return revealingArena;

    // Check for 'waiting' status
    const waitingArena = await ctx.db
      .query("cpuArena")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .first();

    return waitingArena;
  },
});

/**
 * Get arena by ID
 */
export const getArenaById = query({
  args: { arenaId: v.id("cpuArena") },
  handler: async (ctx, { arenaId }) => {
    return await ctx.db.get(arenaId);
  },
});

/**
 * Get spectators for an arena
 */
export const getArenaSpectators = query({
  args: { arenaId: v.id("cpuArena") },
  handler: async (ctx, { arenaId }) => {
    const arena = await ctx.db.get(arenaId);
    return arena?.spectators || [];
  },
});

/**
 * Get bets for a specific round
 */
export const getRoundBets = query({
  args: {
    arenaId: v.id("cpuArena"),
    roundNumber: v.number(),
  },
  handler: async (ctx, { arenaId, roundNumber }) => {
    return await ctx.db
      .query("arenaBets")
      .withIndex("by_arena_round", (q) =>
        q.eq("arenaId", arenaId).eq("roundNumber", roundNumber)
      )
      .collect();
  },
});

/**
 * Get betting stats for display
 */
export const getRoundBettingStats = query({
  args: {
    arenaId: v.id("cpuArena"),
    roundNumber: v.number(),
  },
  handler: async (ctx, { arenaId, roundNumber }) => {
    const bets = await ctx.db
      .query("arenaBets")
      .withIndex("by_arena_round", (q) =>
        q.eq("arenaId", arenaId).eq("roundNumber", roundNumber)
      )
      .collect();

    // Calculate totals per CPU
    let cpu1Total = 0;
    let cpu2Total = 0;
    let cpu1Count = 0;
    let cpu2Count = 0;

    for (const bet of bets) {
      if (bet.betOn === "cpu1") {
        cpu1Total += bet.amount;
        cpu1Count++;
      } else {
        cpu2Total += bet.amount;
        cpu2Count++;
      }
    }

    return {
      bets,
      cpu1: { total: cpu1Total, count: cpu1Count },
      cpu2: { total: cpu2Total, count: cpu2Count },
      totalBets: bets.length,
      totalAmount: cpu1Total + cpu2Total,
    };
  },
});

/**
 * Check if user has bet on current round
 */
export const getUserRoundBet = query({
  args: {
    arenaId: v.id("cpuArena"),
    roundNumber: v.number(),
    address: v.string(),
  },
  handler: async (ctx, { arenaId, roundNumber, address }) => {
    const normalizedAddress = address.toLowerCase();

    return await ctx.db
      .query("arenaBets")
      .withIndex("by_arena_round", (q) =>
        q.eq("arenaId", arenaId).eq("roundNumber", roundNumber)
      )
      .filter((q) => q.eq(q.field("address"), normalizedAddress))
      .first();
  },
});

/**
 * Get user's betting history for this arena
 */
export const getUserArenaBets = query({
  args: {
    arenaId: v.id("cpuArena"),
    address: v.string(),
  },
  handler: async (ctx, { arenaId, address }) => {
    const normalizedAddress = address.toLowerCase();

    return await ctx.db
      .query("arenaBets")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .filter((q) => q.eq(q.field("arenaId"), arenaId))
      .collect();
  },
});

// ================================
// MUTATIONS
// ================================

/**
 * Join arena as spectator
 * If no active battle, starts a new one
 */
export const joinArena = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    // Get user profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Find active arena
    let arena = await ctx.db
      .query("cpuArena")
      .withIndex("by_status", (q) => q.eq("status", "betting"))
      .first();

    if (!arena) {
      arena = await ctx.db
        .query("cpuArena")
        .withIndex("by_status", (q) => q.eq("status", "waiting"))
        .first();
    }

    if (!arena) {
      arena = await ctx.db
        .query("cpuArena")
        .withIndex("by_status", (q) => q.eq("status", "revealing"))
        .first();
    }

    // Check if already spectating
    if (arena) {
      const alreadySpectating = arena.spectators.some(
        (s) => s.address.toLowerCase() === normalizedAddress
      );

      if (!alreadySpectating) {
        // Add as spectator
        await ctx.db.patch(arena._id, {
          spectators: [
            ...arena.spectators,
            {
              address: normalizedAddress,
              username: profile.username || "Anonymous",
              joinedAt: Date.now(),
            },
          ],
        });
      }

      return { success: true, arenaId: arena._id, isNewBattle: false };
    }

    // No active arena, create a new battle
    const [cpu1Info, cpu2Info] = getRandomCpuNames();
    const now = Date.now();

    const arenaId = await ctx.db.insert("cpuArena", {
      status: "betting",
      currentRound: 1,

      cpu1Name: `${cpu1Info.emoji} ${cpu1Info.name}`,
      cpu1Deck: generateCpuDeck(),
      cpu1Score: 0,
      cpu1Card: undefined,

      cpu2Name: `${cpu2Info.emoji} ${cpu2Info.name}`,
      cpu2Deck: generateCpuDeck(),
      cpu2Score: 0,
      cpu2Card: undefined,

      roundWinner: undefined,
      roundStartedAt: now,
      bettingEndsAt: now + BETTING_DURATION_MS,

      spectators: [
        {
          address: normalizedAddress,
          username: profile.username || "Anonymous",
          joinedAt: now,
        },
      ],

      roundHistory: [],
      winner: undefined,
      createdAt: now,
      finishedAt: undefined,
    });

    console.log(`🎮 New CPU Arena started! Arena ID: ${arenaId}`);

    // Schedule the first round progression
    await ctx.scheduler.runAfter(BETTING_DURATION_MS, internal.cpuArena.progressRound, {
      arenaId,
    });

    return { success: true, arenaId, isNewBattle: true };
  },
});

/**
 * Leave arena
 * If no spectators remain, close the battle
 */
export const leaveArena = mutation({
  args: {
    address: v.string(),
    arenaId: v.id("cpuArena"),
  },
  handler: async (ctx, { address, arenaId }) => {
    const normalizedAddress = address.toLowerCase();

    const arena = await ctx.db.get(arenaId);
    if (!arena) {
      throw new Error("Arena not found");
    }

    // Remove from spectators
    const updatedSpectators = arena.spectators.filter(
      (s) => s.address.toLowerCase() !== normalizedAddress
    );

    // If no spectators left, close the battle
    if (updatedSpectators.length === 0 && arena.status !== "finished") {
      console.log(`🚪 All spectators left arena ${arenaId}, closing battle`);
      await ctx.db.patch(arenaId, {
        spectators: [],
        status: "finished",
        finishedAt: Date.now(),
        winner: undefined, // No winner - battle abandoned
      });
      return { success: true, arenaClosed: true };
    }

    await ctx.db.patch(arenaId, {
      spectators: updatedSpectators,
    });

    return { success: true, arenaClosed: false };
  },
});

/**
 * Place bet on a round
 */
export const placeBet = mutation({
  args: {
    address: v.string(),
    arenaId: v.id("cpuArena"),
    betOn: v.string(), // 'cpu1' or 'cpu2'
    amount: v.number(),
  },
  handler: async (ctx, { address, arenaId, betOn, amount }) => {
    const normalizedAddress = address.toLowerCase();

    if (betOn !== "cpu1" && betOn !== "cpu2") {
      throw new Error("Invalid bet target (must be 'cpu1' or 'cpu2')");
    }

    if (amount <= 0) {
      throw new Error("Bet amount must be positive");
    }

    // Get arena
    const arena = await ctx.db.get(arenaId);
    if (!arena) {
      throw new Error("Arena not found");
    }

    if (arena.status !== "betting") {
      throw new Error("Betting is closed for this round");
    }

    // Check if betting time is still open
    if (Date.now() > arena.bettingEndsAt) {
      throw new Error("Betting time has expired");
    }

    // Check if already bet on this round
    const existingBet = await ctx.db
      .query("arenaBets")
      .withIndex("by_arena_round", (q) =>
        q.eq("arenaId", arenaId).eq("roundNumber", arena.currentRound)
      )
      .filter((q) => q.eq(q.field("address"), normalizedAddress))
      .first();

    if (existingBet) {
      throw new Error("You already bet on this round");
    }

    // Check betting credits balance
    const credits = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!credits || credits.balance < amount) {
      throw new Error("Insufficient betting credits");
    }

    // Get user profile for username
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    // Deduct credits
    await ctx.db.patch(credits._id, {
      balance: credits.balance - amount,
    });

    // Get odds for this round
    const odds = getOddsForRound(arena.currentRound);

    // Create bet
    await ctx.db.insert("arenaBets", {
      arenaId,
      roundNumber: arena.currentRound,
      address: normalizedAddress,
      username: profile?.username || "Anonymous",
      betOn,
      amount,
      odds,
      status: "pending",
      payout: undefined,
      createdAt: Date.now(),
    });

    console.log(
      `🎰 Arena bet placed: ${normalizedAddress} bet ${amount} credits on ${betOn} for round ${arena.currentRound} at ${odds}x odds`
    );

    return {
      success: true,
      newBalance: credits.balance - amount,
      odds,
      potentialWin: Math.floor(amount * odds),
    };
  },
});

/**
 * Progress round (internal - called by scheduler)
 * Reveals cards, determines winner, pays bets, and starts next round
 */
export const progressRound = internalMutation({
  args: {
    arenaId: v.id("cpuArena"),
  },
  handler: async (ctx, { arenaId }) => {
    const arena = await ctx.db.get(arenaId);
    if (!arena) {
      console.log("Arena not found, skipping progressRound");
      return;
    }

    if (arena.status === "finished") {
      console.log("Arena already finished, skipping progressRound");
      return;
    }

    const now = Date.now();

    // If in betting phase, reveal cards
    if (arena.status === "betting") {
      // Select cards for both CPUs
      const cpu1CardIndex = selectCpuCard(
        arena.cpu1Deck.map((c) => ({ power: c.power, tokenId: c.tokenId })),
        arena.cpu1Score,
        arena.cpu2Score,
        arena.currentRound
      );
      const cpu2CardIndex = selectCpuCard(
        arena.cpu2Deck.map((c) => ({ power: c.power, tokenId: c.tokenId })),
        arena.cpu2Score,
        arena.cpu1Score,
        arena.currentRound
      );

      const cpu1Card = arena.cpu1Deck[cpu1CardIndex];
      const cpu2Card = arena.cpu2Deck[cpu2CardIndex];

      // Determine round winner
      let roundWinner: "cpu1" | "cpu2" | "tie";
      let newCpu1Score = arena.cpu1Score;
      let newCpu2Score = arena.cpu2Score;

      if (cpu1Card.power > cpu2Card.power) {
        roundWinner = "cpu1";
        newCpu1Score++;
      } else if (cpu2Card.power > cpu1Card.power) {
        roundWinner = "cpu2";
        newCpu2Score++;
      } else {
        roundWinner = "tie";
      }

      // Update arena with revealed cards
      await ctx.db.patch(arenaId, {
        status: "revealing",
        cpu1Card: {
          tokenId: cpu1Card.tokenId,
          name: cpu1Card.name,
          imageUrl: cpu1Card.imageUrl,
          power: cpu1Card.power,
          rarity: cpu1Card.rarity,
        },
        cpu2Card: {
          tokenId: cpu2Card.tokenId,
          name: cpu2Card.name,
          imageUrl: cpu2Card.imageUrl,
          power: cpu2Card.power,
          rarity: cpu2Card.rarity,
        },
        cpu1Score: newCpu1Score,
        cpu2Score: newCpu2Score,
        roundWinner,
        cpu1Deck: arena.cpu1Deck.filter((_, i) => i !== cpu1CardIndex),
        cpu2Deck: arena.cpu2Deck.filter((_, i) => i !== cpu2CardIndex),
        roundHistory: [
          ...arena.roundHistory,
          {
            round: arena.currentRound,
            cpu1Card: {
              name: cpu1Card.name,
              power: cpu1Card.power,
              imageUrl: cpu1Card.imageUrl,
            },
            cpu2Card: {
              name: cpu2Card.name,
              power: cpu2Card.power,
              imageUrl: cpu2Card.imageUrl,
            },
            winner: roundWinner,
          },
        ],
      });

      console.log(
        `🎲 Round ${arena.currentRound} revealed: ${cpu1Card.name} (${cpu1Card.power}) vs ${cpu2Card.name} (${cpu2Card.power}) - Winner: ${roundWinner}`
      );

      // Resolve bets for this round
      await resolveBetsInternal(ctx, arenaId, arena.currentRound, roundWinner);

      // Schedule reveal to end and next round to start
      await ctx.scheduler.runAfter(REVEAL_DURATION_MS, internal.cpuArena.progressRound, {
        arenaId,
      });

      return;
    }

    // If in revealing phase, check for game end or start next round
    if (arena.status === "revealing") {
      // Check if game is over
      if (arena.cpu1Score >= ROUNDS_TO_WIN || arena.cpu2Score >= ROUNDS_TO_WIN) {
        // Game over!
        const winner = arena.cpu1Score >= ROUNDS_TO_WIN ? "cpu1" : "cpu2";

        await ctx.db.patch(arenaId, {
          status: "finished",
          winner,
          finishedAt: now,
        });

        console.log(`🏆 Arena finished! Winner: ${winner}`);

        // If there are still spectators, schedule new battle after 5 seconds
        if (arena.spectators.length > 0) {
          await ctx.scheduler.runAfter(5000, internal.cpuArena.startNewBattleWithSpectators, {
            spectators: arena.spectators,
          });
        }

        return;
      }

      // Check if we've run out of rounds (shouldn't happen with 7 rounds and first to 4)
      if (arena.currentRound >= MAX_ROUNDS) {
        const winner = arena.cpu1Score > arena.cpu2Score ? "cpu1" : "cpu2";

        await ctx.db.patch(arenaId, {
          status: "finished",
          winner,
          finishedAt: now,
        });

        console.log(`🏆 Arena finished (max rounds)! Winner: ${winner}`);

        if (arena.spectators.length > 0) {
          await ctx.scheduler.runAfter(5000, internal.cpuArena.startNewBattleWithSpectators, {
            spectators: arena.spectators,
          });
        }

        return;
      }

      // Start next round
      const nextRound = arena.currentRound + 1;

      await ctx.db.patch(arenaId, {
        status: "betting",
        currentRound: nextRound,
        cpu1Card: undefined,
        cpu2Card: undefined,
        roundWinner: undefined,
        roundStartedAt: now,
        bettingEndsAt: now + BETTING_DURATION_MS,
      });

      console.log(`🎮 Round ${nextRound} started! Betting open for 15 seconds.`);

      // Schedule round progression
      await ctx.scheduler.runAfter(BETTING_DURATION_MS, internal.cpuArena.progressRound, {
        arenaId,
      });

      return;
    }
  },
});

/**
 * Start new battle with existing spectators (internal)
 */
export const startNewBattleWithSpectators = internalMutation({
  args: {
    spectators: v.array(
      v.object({
        address: v.string(),
        username: v.string(),
        joinedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, { spectators }) => {
    if (spectators.length === 0) {
      return;
    }

    const [cpu1Info, cpu2Info] = getRandomCpuNames();
    const now = Date.now();

    const arenaId = await ctx.db.insert("cpuArena", {
      status: "betting",
      currentRound: 1,

      cpu1Name: `${cpu1Info.emoji} ${cpu1Info.name}`,
      cpu1Deck: generateCpuDeck(),
      cpu1Score: 0,
      cpu1Card: undefined,

      cpu2Name: `${cpu2Info.emoji} ${cpu2Info.name}`,
      cpu2Deck: generateCpuDeck(),
      cpu2Score: 0,
      cpu2Card: undefined,

      roundWinner: undefined,
      roundStartedAt: now,
      bettingEndsAt: now + BETTING_DURATION_MS,

      spectators,
      roundHistory: [],
      winner: undefined,
      createdAt: now,
      finishedAt: undefined,
    });

    console.log(`🎮 New CPU Arena started with ${spectators.length} spectators! Arena ID: ${arenaId}`);

    // Schedule the first round progression
    await ctx.scheduler.runAfter(BETTING_DURATION_MS, internal.cpuArena.progressRound, {
      arenaId,
    });
  },
});

/**
 * Resolve bets for a round (internal helper)
 */
async function resolveBetsInternal(
  ctx: any,
  arenaId: Id<"cpuArena">,
  roundNumber: number,
  winner: "cpu1" | "cpu2" | "tie"
) {
  // Get all pending bets for this round
  const bets = await ctx.db
    .query("arenaBets")
    .withIndex("by_arena_round", (q: any) =>
      q.eq("arenaId", arenaId).eq("roundNumber", roundNumber)
    )
    .filter((q: any) => q.eq(q.field("status"), "pending"))
    .collect();

  if (bets.length === 0) {
    console.log(`No bets to resolve for round ${roundNumber}`);
    return;
  }

  let winnersCount = 0;
  let losersCount = 0;
  let tieRefunds = 0;

  for (const bet of bets) {
    // Get bettor's credits
    const credits = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q: any) => q.eq("address", bet.address))
      .first();

    if (winner === "tie") {
      // Refund on tie
      if (credits) {
        await ctx.db.patch(credits._id, {
          balance: credits.balance + bet.amount,
        });
      }

      await ctx.db.patch(bet._id, {
        status: "refunded",
        payout: bet.amount,
      });

      tieRefunds++;
      console.log(`↩️ Tie refund: ${bet.address} gets ${bet.amount} back`);
    } else if (bet.betOn === winner) {
      // Winner!
      const payout = Math.floor(bet.amount * bet.odds);

      if (credits) {
        await ctx.db.patch(credits._id, {
          balance: credits.balance + payout,
        });
      }

      await ctx.db.patch(bet._id, {
        status: "won",
        payout,
      });

      winnersCount++;
      console.log(`✅ Winner: ${bet.address} won ${payout} credits`);

      // Log transaction
      await ctx.db.insert("bettingTransactions", {
        address: bet.address,
        type: "win",
        amount: payout,
        roomId: `arena:${arenaId}`,
        timestamp: Date.now(),
      });
    } else {
      // Loser
      await ctx.db.patch(bet._id, {
        status: "lost",
        payout: 0,
      });

      losersCount++;
      console.log(`❌ Loser: ${bet.address} lost ${bet.amount} credits`);

      // Log transaction
      await ctx.db.insert("bettingTransactions", {
        address: bet.address,
        type: "loss",
        amount: -bet.amount,
        roomId: `arena:${arenaId}`,
        timestamp: Date.now(),
      });
    }
  }

  console.log(
    `🎰 Round ${roundNumber} bets resolved: ${winnersCount} winners, ${losersCount} losers, ${tieRefunds} tie refunds`
  );
}
