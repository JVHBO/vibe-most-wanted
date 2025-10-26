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

    // Defense Deck (array of NFT tokenIds)
    defenseDeck: v.optional(v.array(v.string())),

    // Attack limits
    attacksToday: v.number(),
    rematchesToday: v.number(),
    lastAttackDate: v.optional(v.string()), // ISO date string YYYY-MM-DD

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

  // Player Matches (PvP history)
  matches: defineTable({
    // Match Info
    matchId: v.string(), // Original Firebase matchId
    timestamp: v.number(),
    type: v.union(v.literal("attack"), v.literal("defense"), v.literal("pvp")),
    result: v.union(v.literal("win"), v.literal("loss"), v.literal("draw")),

    // Player Info
    playerAddress: v.string(),
    playerPower: v.optional(v.number()),
    playerCards: v.optional(v.array(v.any())), // Full card objects or simplified

    // Opponent Info
    opponentAddress: v.string(),
    opponentUsername: v.optional(v.string()),
    opponentPower: v.optional(v.number()),
    opponentCards: v.optional(v.array(v.any())),
  })
    .index("by_player", ["playerAddress", "timestamp"])
    .index("by_opponent", ["opponentAddress", "timestamp"])
    .index("by_player_type", ["playerAddress", "type", "timestamp"]),

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
    url: v.optional(v.string()),
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
});
