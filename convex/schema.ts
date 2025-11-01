import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * CONVEX SCHEMA for Vibe Most Wanted
 *
 * Migrated from Firebase Realtime Database
 * Supports:
 * - PvP card game mechanics
 * - Future Web3 betting (NFT/USDC)
 * - Turn-based gameplay
 */

export default defineSchema({
  // User Profiles
  profiles: defineTable({
    address: v.string(), // Wallet address (lowercase)
    username: v.string(), // Unique username

    // Stats
    stats: v.object({
      totalPower: v.number(),
      totalCards: v.number(),
      openedCards: v.number(),
      unopenedCards: v.number(),

      // PvE Stats
      pveWins: v.number(),
      pveLosses: v.number(),

      // PvP Stats
      pvpWins: v.number(),
      pvpLosses: v.number(),

      // Attack/Defense Stats
      attackWins: v.number(),
      attackLosses: v.number(),
      defenseWins: v.number(),
      defenseLosses: v.number(),
    }),

    // Defense Deck (array of card objects with saved power or legacy string tokenIds)
    defenseDeck: v.optional(v.array(
      v.union(
        v.string(), // Legacy format: just tokenId string
        v.object({
          tokenId: v.string(),
          power: v.number(),
          imageUrl: v.string(),
          name: v.string(),
          rarity: v.string(),
          foil: v.optional(v.string()),
        })
      )
    )),

    // Attack limits
    attacksToday: v.number(),
    rematchesToday: v.number(),
    lastAttackDate: v.optional(v.string()), // ISO date string YYYY-MM-DD

    // Economy System ($TESTVBMS)
    coins: v.optional(v.number()), // Current balance
    lifetimeEarned: v.optional(v.number()), // Total ever earned
    lifetimeSpent: v.optional(v.number()), // Total ever spent

    // Daily Limits for Economy
    dailyLimits: v.optional(v.object({
      pveWins: v.number(), // PvE wins today
      pvpMatches: v.number(), // PvP matches today
      lastResetDate: v.string(), // "2025-10-31" format

      // Daily bonuses claimed
      firstPveBonus: v.boolean(),
      firstPvpBonus: v.boolean(),
      loginBonus: v.boolean(),
      streakBonus: v.boolean(),
    })),

    // Win Streak Tracking
    winStreak: v.optional(v.number()),
    lastWinTimestamp: v.optional(v.number()),

    // Social
    twitter: v.optional(v.string()),
    twitterHandle: v.optional(v.string()),
    fid: v.optional(v.string()), // Farcaster ID

    // Metadata
    userIndex: v.optional(v.number()),
    createdAt: v.number(), // timestamp
    lastUpdated: v.number(), // timestamp
    updatedAt: v.optional(v.number()), // legacy field
  })
    .index("by_address", ["address"])
    .index("by_username", ["username"])
    .index("by_total_power", ["stats.totalPower"]), // For leaderboard

  // Player Matches (Match History)
  matches: defineTable({
    // Match Info
    timestamp: v.number(),
    type: v.union(
      v.literal("pve"),
      v.literal("pvp"),
      v.literal("attack"),
      v.literal("defense")
    ),
    result: v.union(v.literal("win"), v.literal("loss"), v.literal("tie")),

    // Player Info
    playerAddress: v.string(),
    playerPower: v.number(),
    playerCards: v.array(v.any()), // Full card objects

    // Opponent Info (optional for PvE)
    opponentAddress: v.optional(v.string()),
    opponentUsername: v.optional(v.string()),
    opponentPower: v.number(),
    opponentCards: v.array(v.any()),

    // Economy
    coinsEarned: v.optional(v.number()), // $TESTVBMS earned from this match
    entryFeePaid: v.optional(v.number()), // Entry fee paid (50 for attack, 80 for pvp)

    // PvE specific data
    difficulty: v.optional(v.union(
      v.literal("gey"),
      v.literal("goofy"),
      v.literal("gooner"),
      v.literal("gangster"),
      v.literal("gigachad")
    )), // AI difficulty for PvE matches

    // Legacy field from Firebase migration
    matchId: v.optional(v.string()),
  })
    .index("by_player", ["playerAddress", "timestamp"]),

  // PvP Rooms (for realtime matchmaking)
  rooms: defineTable({
    // Room Info
    roomId: v.string(),
    status: v.union(
      v.literal("waiting"),
      v.literal("ready"),
      v.literal("playing"),
      v.literal("finished"),
      v.literal("cancelled")
    ),

    // Players
    hostAddress: v.string(),
    hostUsername: v.string(),
    guestAddress: v.optional(v.string()),
    guestUsername: v.optional(v.string()),

    // Game State
    hostCards: v.optional(v.array(v.any())),
    guestCards: v.optional(v.array(v.any())),
    hostPower: v.optional(v.number()),
    guestPower: v.optional(v.number()),
    winnerId: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_host", ["hostAddress"])
    .index("by_guest", ["guestAddress"]),

  // Matchmaking Queue
  matchmaking: defineTable({
    playerAddress: v.string(),
    playerUsername: v.string(),
    status: v.union(v.literal("searching"), v.literal("matched"), v.literal("cancelled")),
    createdAt: v.number(),
    matchedWith: v.optional(v.string()), // Address of matched player
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_player", ["playerAddress"]),

  // Notification Tokens (for push notifications)
  notificationTokens: defineTable({
    fid: v.string(), // Farcaster ID or user identifier
    token: v.string(), // Push notification token
    url: v.string(), // Farcaster notification URL (required)
    createdAt: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_fid", ["fid"]),

  // Future: Betting System (for Web3 integration)
  bets: defineTable({
    // Bet Info
    betType: v.union(v.literal("NFT"), v.literal("USDC")),
    amount: v.optional(v.number()), // USDC amount or value
    nftTokenId: v.optional(v.string()), // If betting NFT
    nftContractAddress: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal("open"),
      v.literal("accepted"),
      v.literal("playing"),
      v.literal("resolved"),
      v.literal("expired"),
      v.literal("cancelled")
    ),

    // Creator
    creatorAddress: v.string(),
    creatorCards: v.array(v.any()),

    // Acceptor (when accepted)
    acceptorAddress: v.optional(v.string()),
    acceptorCards: v.optional(v.array(v.any())),

    // Result
    winnerId: v.optional(v.string()),
    matchId: v.optional(v.string()), // Link to matches table

    // Smart Contract Integration
    txHash: v.optional(v.string()), // Transaction hash
    escrowAddress: v.optional(v.string()), // Smart contract address
    isOnChain: v.optional(v.boolean()),

    // Timestamps
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    expiresAt: v.number(), // Auto-cancel after X time
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_creator", ["creatorAddress"])
    .index("by_acceptor", ["acceptorAddress"]),

  // Daily Quest System
  dailyQuests: defineTable({
    date: v.string(), // "2025-11-01" (1 quest per day globally)
    type: v.string(), // "win_pve", "defeat_gigachad", "play_matches", etc
    description: v.string(), // "Win 3 PvE battles"
    requirement: v.object({
      count: v.optional(v.number()), // Number of times to do something
      difficulty: v.optional(v.string()), // Specific difficulty required
      maxPower: v.optional(v.number()), // Max power restriction
    }),
    reward: v.number(), // $TESTVBMS reward
    difficulty: v.string(), // "easy", "medium", "hard" (quest difficulty, not AI)
    createdAt: v.number(),
  })
    .index("by_date", ["date"]),

  questProgress: defineTable({
    playerAddress: v.string(),
    questDate: v.string(), // "2025-11-01"
    completed: v.boolean(),
    claimed: v.boolean(),
    claimedAt: v.optional(v.number()),
  })
    .index("by_player_date", ["playerAddress", "questDate"]),

  // Security: Nonces for replay attack prevention
  nonces: defineTable({
    address: v.string(), // Wallet address
    nonce: v.number(), // Current nonce (increments with each signed action)
    lastUsed: v.number(), // Timestamp of last use
  }).index("by_address", ["address"]),
});
