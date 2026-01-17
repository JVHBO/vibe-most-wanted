/**
 * BACCARAT CASINO
 * Simple card game - bet VBMS, win cards
 *
 * Rules:
 * - Player bets on: Player, Banker, or Tie
 * - 2-3 cards dealt to each side
 * - Closest to 9 wins
 * - Payouts: Player 1:1, Banker 0.95:1 (5% commission), Tie 8:1
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const BETTING_DURATION = 30000; // 30 seconds to place bets
const MIN_BET = 10; // Minimum bet in VBMS
const MAX_BET = 1000; // Maximum bet in VBMS

// Card values in Baccarat
const CARD_VALUES: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 0, 'J': 0, 'Q': 0, 'K': 0,
};

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Generate a shuffled deck
function createDeck() {
  const deck: { suit: string; rank: string; value: number }[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        value: CARD_VALUES[rank],
      });
    }
  }
  // Shuffle using Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Calculate Baccarat hand value (sum mod 10)
function calculateHandValue(cards: { value: number }[]): number {
  const sum = cards.reduce((acc, card) => acc + card.value, 0);
  return sum % 10;
}

// Determine if third card should be drawn (Baccarat rules)
function shouldDrawThirdCard(
  playerScore: number,
  bankerScore: number,
  playerHasThirdCard: boolean,
  playerThirdCardValue?: number
): { playerDraws: boolean; bankerDraws: boolean } {
  // Natural - no more cards
  if (playerScore >= 8 || bankerScore >= 8) {
    return { playerDraws: false, bankerDraws: false };
  }

  // Player rules
  const playerDraws = playerScore <= 5;

  // Banker rules (depend on player's third card)
  let bankerDraws = false;

  if (!playerHasThirdCard) {
    // Player stood - banker draws on 0-5
    bankerDraws = bankerScore <= 5;
  } else if (playerThirdCardValue !== undefined) {
    // Complex banker rules based on player's third card
    switch (bankerScore) {
      case 0:
      case 1:
      case 2:
        bankerDraws = true;
        break;
      case 3:
        bankerDraws = playerThirdCardValue !== 8;
        break;
      case 4:
        bankerDraws = [2, 3, 4, 5, 6, 7].includes(playerThirdCardValue);
        break;
      case 5:
        bankerDraws = [4, 5, 6, 7].includes(playerThirdCardValue);
        break;
      case 6:
        bankerDraws = [6, 7].includes(playerThirdCardValue);
        break;
      case 7:
        bankerDraws = false;
        break;
    }
  }

  return { playerDraws, bankerDraws };
}

// Determine winner
function determineWinner(playerScore: number, bankerScore: number): 'player' | 'banker' | 'tie' {
  if (playerScore > bankerScore) return 'player';
  if (bankerScore > playerScore) return 'banker';
  return 'tie';
}

// Generate unique table ID
function generateTableId(): string {
  return `bac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

// Get current active table (or create one)
export const getCurrentTable = query({
  args: {},
  handler: async (ctx) => {
    // Find active table
    const activeTable = await ctx.db
      .query("baccaratTables")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .first();

    if (activeTable) {
      // Get bets for this table
      const bets = await ctx.db
        .query("baccaratBets")
        .withIndex("by_table", (q) => q.eq("tableId", activeTable.tableId))
        .collect();

      return {
        ...activeTable,
        bets,
        timeRemaining: Math.max(0, activeTable.bettingEndsAt - Date.now()),
      };
    }

    return null;
  },
});

// Get table by ID
export const getTable = query({
  args: { tableId: v.string() },
  handler: async (ctx, args) => {
    const table = await ctx.db
      .query("baccaratTables")
      .withIndex("by_table_id", (q) => q.eq("tableId", args.tableId))
      .first();

    if (!table) return null;

    const bets = await ctx.db
      .query("baccaratBets")
      .withIndex("by_table", (q) => q.eq("tableId", args.tableId))
      .collect();

    return {
      ...table,
      bets,
      timeRemaining: table.status === "waiting"
        ? Math.max(0, table.bettingEndsAt - Date.now())
        : 0,
    };
  },
});

// Get player's bet history
export const getPlayerHistory = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const bets = await ctx.db
      .query("baccaratBets")
      .withIndex("by_player", (q) => q.eq("playerAddress", args.address.toLowerCase()))
      .order("desc")
      .take(50);

    return bets;
  },
});

// Get recent game history
export const getRecentHistory = query({
  args: {},
  handler: async (ctx) => {
    const history = await ctx.db
      .query("baccaratHistory")
      .withIndex("by_finished")
      .order("desc")
      .take(20);

    return history;
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Create a new table (or return existing)
export const createOrGetTable = mutation({
  args: {},
  handler: async (ctx) => {
    // Check for existing waiting table
    const existingTable = await ctx.db
      .query("baccaratTables")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .first();

    if (existingTable) {
      return existingTable.tableId;
    }

    // Create new table
    const tableId = generateTableId();
    const now = Date.now();

    await ctx.db.insert("baccaratTables", {
      tableId,
      status: "waiting",
      bettingEndsAt: now + BETTING_DURATION,
      totalPot: 0,
      totalBets: 0,
      playerBets: 0,
      bankerBets: 0,
      tieBets: 0,
      createdAt: now,
    });

    return tableId;
  },
});

// Place a bet (uses betting credits, not coins)
export const placeBet = mutation({
  args: {
    tableId: v.string(),
    address: v.string(),
    username: v.string(),
    betOn: v.union(v.literal("player"), v.literal("banker"), v.literal("tie")),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const { tableId, address, username, betOn, amount } = args;
    const playerAddress = address.toLowerCase();
    const now = Date.now();

    // Validate bet amount
    if (amount < MIN_BET) {
      throw new Error(`Minimum bet is ${MIN_BET} credits`);
    }
    if (amount > MAX_BET) {
      throw new Error(`Maximum bet is ${MAX_BET} credits`);
    }

    // Get table
    const table = await ctx.db
      .query("baccaratTables")
      .withIndex("by_table_id", (q) => q.eq("tableId", tableId))
      .first();

    if (!table) {
      throw new Error("Table not found");
    }

    if (table.status !== "waiting") {
      throw new Error("Betting is closed for this round");
    }

    if (now > table.bettingEndsAt) {
      throw new Error("Betting time has expired");
    }

    // Check if player already bet on this table
    const existingBet = await ctx.db
      .query("baccaratBets")
      .withIndex("by_table_player", (q) =>
        q.eq("tableId", tableId).eq("playerAddress", playerAddress)
      )
      .first();

    if (existingBet) {
      throw new Error("You already placed a bet this round");
    }

    // Get betting credits balance
    const credits = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q) => q.eq("address", playerAddress))
      .first();

    if (!credits) {
      throw new Error("No betting credits. Deposit VBMS first!");
    }

    if (credits.balance < amount) {
      throw new Error(`Insufficient credits. You have ${credits.balance} credits`);
    }

    // Deduct from betting credits
    await ctx.db.patch(credits._id, {
      balance: credits.balance - amount,
    });

    // Place bet
    await ctx.db.insert("baccaratBets", {
      tableId,
      playerAddress,
      playerUsername: username,
      betOn,
      amount,
      status: "pending",
      placedAt: now,
    });

    // Update table stats
    await ctx.db.patch(table._id, {
      totalPot: table.totalPot + amount,
      totalBets: table.totalBets + 1,
      playerBets: betOn === "player" ? table.playerBets + amount : table.playerBets,
      bankerBets: betOn === "banker" ? table.bankerBets + amount : table.bankerBets,
      tieBets: betOn === "tie" ? table.tieBets + amount : table.tieBets,
    });

    // Log transaction
    await ctx.db.insert("bettingTransactions", {
      address: playerAddress,
      type: "bet",
      amount: -amount,
      roomId: tableId,
      timestamp: now,
    });

    return { success: true, newBalance: credits.balance - amount };
  },
});

// Deal cards and resolve round (called by cron or manually)
export const dealAndResolve = mutation({
  args: { tableId: v.string() },
  handler: async (ctx, args) => {
    const { tableId } = args;
    const now = Date.now();

    // Get table
    const table = await ctx.db
      .query("baccaratTables")
      .withIndex("by_table_id", (q) => q.eq("tableId", tableId))
      .first();

    if (!table) {
      throw new Error("Table not found");
    }

    if (table.status !== "waiting") {
      throw new Error("Table is not in waiting state");
    }

    // Create and shuffle deck
    const deck = createDeck();
    let deckIndex = 0;

    // Deal initial 2 cards to each
    const playerCards = [deck[deckIndex++], deck[deckIndex++]];
    const bankerCards = [deck[deckIndex++], deck[deckIndex++]];

    let playerScore = calculateHandValue(playerCards);
    let bankerScore = calculateHandValue(bankerCards);

    // Check for third card draws (standard Baccarat rules)
    const firstCheck = shouldDrawThirdCard(playerScore, bankerScore, false);

    if (firstCheck.playerDraws) {
      const thirdCard = deck[deckIndex++];
      playerCards.push(thirdCard);
      playerScore = calculateHandValue(playerCards);

      // Check if banker draws based on player's third card
      const bankerCheck = shouldDrawThirdCard(
        calculateHandValue(playerCards.slice(0, 2)),
        bankerScore,
        true,
        thirdCard.value
      );

      if (bankerCheck.bankerDraws) {
        bankerCards.push(deck[deckIndex++]);
        bankerScore = calculateHandValue(bankerCards);
      }
    } else {
      // Player stood - banker draws on 0-5
      if (bankerScore <= 5) {
        bankerCards.push(deck[deckIndex++]);
        bankerScore = calculateHandValue(bankerCards);
      }
    }

    // Determine winner
    const winner = determineWinner(playerScore, bankerScore);

    // Update table with results
    await ctx.db.patch(table._id, {
      status: "finished",
      playerCards,
      bankerCards,
      playerScore,
      bankerScore,
      winner,
      dealtAt: now,
      finishedAt: now,
    });

    // Get all bets for this table
    const bets = await ctx.db
      .query("baccaratBets")
      .withIndex("by_table", (q) => q.eq("tableId", tableId))
      .collect();

    let totalPayout = 0;
    let winnersCount = 0;

    // Resolve each bet
    for (const bet of bets) {
      let status: "won" | "lost" | "push" = "lost";
      let payout = 0;

      if (winner === "tie") {
        if (bet.betOn === "tie") {
          // Tie bet wins 8:1
          status = "won";
          payout = bet.amount * 9; // Original + 8x
          winnersCount++;
        } else {
          // Player/Banker bets push (returned)
          status = "push";
          payout = bet.amount;
        }
      } else if (bet.betOn === winner) {
        status = "won";
        if (winner === "banker") {
          // Banker wins pay 0.95:1 (5% commission)
          payout = bet.amount + Math.floor(bet.amount * 0.95);
        } else {
          // Player wins pay 1:1
          payout = bet.amount * 2;
        }
        winnersCount++;
      }

      // Update bet record
      await ctx.db.patch(bet._id, {
        status,
        payout: payout > 0 ? payout : undefined,
        resolvedAt: now,
      });

      // Pay out to betting credits
      if (payout > 0) {
        const credits = await ctx.db
          .query("bettingCredits")
          .withIndex("by_address", (q) => q.eq("address", bet.playerAddress))
          .first();

        if (credits) {
          await ctx.db.patch(credits._id, {
            balance: credits.balance + payout,
          });
        } else {
          // Create credits if doesn't exist
          await ctx.db.insert("bettingCredits", {
            address: bet.playerAddress,
            balance: payout,
            totalDeposited: 0,
            totalWithdrawn: 0,
            lastDeposit: now,
          });
        }

        // Log win transaction
        await ctx.db.insert("bettingTransactions", {
          address: bet.playerAddress,
          type: "win",
          amount: payout,
          roomId: tableId,
          timestamp: now,
        });

        totalPayout += payout;
      }
    }

    // Save to history
    await ctx.db.insert("baccaratHistory", {
      tableId,
      winner,
      playerScore,
      bankerScore,
      playerCards,
      bankerCards,
      totalPot: table.totalPot,
      totalBets: table.totalBets,
      winnersCount,
      totalPayout,
      finishedAt: now,
    });

    return {
      winner,
      playerScore,
      bankerScore,
      playerCards,
      bankerCards,
      winnersCount,
      totalPayout,
    };
  },
});

// Cash out - convert betting credits back to TESTVBMS (coins)
export const cashOut = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const playerAddress = args.address.toLowerCase();
    const now = Date.now();

    // Get betting credits
    const credits = await ctx.db
      .query("bettingCredits")
      .withIndex("by_address", (q) => q.eq("address", playerAddress))
      .first();

    if (!credits || credits.balance <= 0) {
      throw new Error("No credits to cash out");
    }

    const amount = credits.balance;

    // Reset betting credits to 0
    await ctx.db.patch(credits._id, {
      balance: 0,
      totalWithdrawn: (credits.totalWithdrawn || 0) + amount,
    });

    // Add to player's coins (TESTVBMS)
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", playerAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentCoins = profile.coins || 0;
    await ctx.db.patch(profile._id, {
      coins: currentCoins + amount,
      lifetimeEarned: (profile.lifetimeEarned || 0) + amount,
      lastUpdated: now,
    });

    // Log transactions
    await ctx.db.insert("bettingTransactions", {
      address: playerAddress,
      type: "withdraw",
      amount,
      timestamp: now,
    });

    await ctx.db.insert("coinTransactions", {
      address: playerAddress,
      type: "earn",
      source: "baccarat_cashout",
      description: `Cashed out ${amount} betting credits`,
      amount,
      balanceBefore: currentCoins,
      balanceAfter: currentCoins + amount,
      timestamp: now,
    });

    console.log(`💰 Baccarat cashout: ${playerAddress} cashed out ${amount} credits`);

    return {
      success: true,
      cashedOut: amount,
      newBalance: currentCoins + amount,
    };
  },
});

// Check and resolve expired tables (called by cron)
export const checkAndResolveExpiredTables = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find tables that have expired betting time but are still waiting
    const expiredTables = await ctx.db
      .query("baccaratTables")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .filter((q) => q.lt(q.field("bettingEndsAt"), now))
      .take(10);

    const resolved = [];

    for (const table of expiredTables) {
      // Only resolve if there are bets
      if (table.totalBets > 0) {
        // Deal and resolve
        const deck = createDeck();
        let deckIndex = 0;

        const playerCards = [deck[deckIndex++], deck[deckIndex++]];
        const bankerCards = [deck[deckIndex++], deck[deckIndex++]];

        let playerScore = calculateHandValue(playerCards);
        let bankerScore = calculateHandValue(bankerCards);

        const firstCheck = shouldDrawThirdCard(playerScore, bankerScore, false);

        if (firstCheck.playerDraws) {
          const thirdCard = deck[deckIndex++];
          playerCards.push(thirdCard);
          playerScore = calculateHandValue(playerCards);

          const bankerCheck = shouldDrawThirdCard(
            calculateHandValue(playerCards.slice(0, 2)),
            bankerScore,
            true,
            thirdCard.value
          );

          if (bankerCheck.bankerDraws) {
            bankerCards.push(deck[deckIndex++]);
            bankerScore = calculateHandValue(bankerCards);
          }
        } else if (bankerScore <= 5) {
          bankerCards.push(deck[deckIndex++]);
          bankerScore = calculateHandValue(bankerCards);
        }

        const winner = determineWinner(playerScore, bankerScore);

        await ctx.db.patch(table._id, {
          status: "finished",
          playerCards,
          bankerCards,
          playerScore,
          bankerScore,
          winner,
          dealtAt: now,
          finishedAt: now,
        });

        // Resolve bets
        const bets = await ctx.db
          .query("baccaratBets")
          .withIndex("by_table", (q) => q.eq("tableId", table.tableId))
          .collect();

        let totalPayout = 0;
        let winnersCount = 0;

        for (const bet of bets) {
          let status: "won" | "lost" | "push" = "lost";
          let payout = 0;

          if (winner === "tie") {
            if (bet.betOn === "tie") {
              status = "won";
              payout = bet.amount * 9;
              winnersCount++;
            } else {
              status = "push";
              payout = bet.amount;
            }
          } else if (bet.betOn === winner) {
            status = "won";
            payout = winner === "banker"
              ? bet.amount + Math.floor(bet.amount * 0.95)
              : bet.amount * 2;
            winnersCount++;
          }

          await ctx.db.patch(bet._id, {
            status,
            payout: payout > 0 ? payout : undefined,
            resolvedAt: now,
          });

          if (payout > 0) {
            const credits = await ctx.db
              .query("bettingCredits")
              .withIndex("by_address", (q) => q.eq("address", bet.playerAddress))
              .first();

            if (credits) {
              await ctx.db.patch(credits._id, {
                balance: credits.balance + payout,
              });
            } else {
              await ctx.db.insert("bettingCredits", {
                address: bet.playerAddress,
                balance: payout,
                totalDeposited: 0,
                totalWithdrawn: 0,
                lastDeposit: now,
              });
            }

            await ctx.db.insert("bettingTransactions", {
              address: bet.playerAddress,
              type: "win",
              amount: payout,
              roomId: table.tableId,
              timestamp: now,
            });

            totalPayout += payout;
          }
        }

        await ctx.db.insert("baccaratHistory", {
          tableId: table.tableId,
          winner,
          playerScore,
          bankerScore,
          playerCards,
          bankerCards,
          totalPot: table.totalPot,
          totalBets: table.totalBets,
          winnersCount,
          totalPayout,
          finishedAt: now,
        });

        resolved.push(table.tableId);
      } else {
        // No bets - just close the table
        await ctx.db.patch(table._id, {
          status: "finished",
          finishedAt: now,
        });
        resolved.push(table.tableId);
      }
    }

    return { resolved };
  },
});
