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
          collection: v.optional(v.string()), // NEW: Collection ID ('vibe', 'custom', etc.)
        })
      )
    )),

    // Owned Token IDs (for defense deck validation)
    ownedTokenIds: v.optional(v.array(v.string())),

    // Revealed Cards Cache (metadata cache for reliability when Alchemy fails)
    revealedCardsCache: v.optional(v.array(v.object({
      tokenId: v.string(),
      collection: v.optional(v.string()), // NEW: Collection ID ('vibe', 'custom', etc.)
      name: v.string(),
      imageUrl: v.string(),
      rarity: v.string(),
      wear: v.optional(v.string()),
      foil: v.optional(v.string()),
      character: v.optional(v.string()),
      power: v.optional(v.number()),
      attributes: v.optional(v.any()), // Full attributes array
      cachedAt: v.number(), // Timestamp when cached
    }))),

    // Attack limits
    attacksToday: v.number(),
    rematchesToday: v.number(),
    lastAttackDate: v.optional(v.string()), // ISO date string YYYY-MM-DD

    // Economy System ($TESTVBMS)
    coins: v.optional(v.number()), // Current balance (for spending in-app)
    coinsInbox: v.optional(v.number()), // Unclaimed coins (inbox/correio) - claim later option
    lifetimeEarned: v.optional(v.number()), // Total ever earned
    lifetimeSpent: v.optional(v.number()), // Total ever spent

    // VBMS Token System (Real blockchain token)
    inbox: v.optional(v.number()), // Uncollected VBMS tokens (correio)
    claimedTokens: v.optional(v.number()), // Total VBMS claimed to wallet (lifetime)
    poolDebt: v.optional(v.number()), // VBMS owed back to pool (circular economy)
    lastClaimTimestamp: v.optional(v.number()), // Last time player claimed VBMS
    lastDebtSettlement: v.optional(v.number()), // Last time debt was settled

    // Daily Limits for Economy
    dailyLimits: v.optional(v.object({
      pveWins: v.number(), // PvE wins today
      pvpMatches: v.number(), // PvP matches today
      pokerCpuAttempts: v.optional(v.number()), // CPU Poker attempts today
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

    // Rate Limiting (Phase 2 Security)
    lastPvEAward: v.optional(v.number()), // Timestamp of last PvE reward
    lastPvPAward: v.optional(v.number()), // Timestamp of last PvP reward
    lastStatUpdate: v.optional(v.number()), // Timestamp of last stat increment

    // Collection Preferences
    preferredCollection: v.optional(v.string()), // NEW: User's preferred collection ('vibe', 'custom', etc.)
    enabledCollections: v.optional(v.array(v.string())), // NEW: Collections user wants to see/use

    // Social
    twitter: v.optional(v.string()),
    twitterHandle: v.optional(v.string()),
    twitterProfileImageUrl: v.optional(v.string()), // Twitter profile picture URL
    fid: v.optional(v.string()), // Farcaster ID
    farcasterFid: v.optional(v.number()), // Farcaster numeric FID for notifications

    // Share Incentives
    dailyShares: v.optional(v.number()), // Shares today (resets daily)
    lastShareDate: v.optional(v.string()), // ISO date YYYY-MM-DD
    hasSharedProfile: v.optional(v.boolean()), // One-time profile share bonus claimed
    hasClaimedSharePack: v.optional(v.boolean()), // One-time FREE pack for sharing profile
    totalShareBonus: v.optional(v.number()), // Lifetime share bonus earned
    hasReceivedWelcomePack: v.optional(v.boolean()), // One-time welcome pack (1 Basic Pack)

    // Daily Reminders
    lastActiveDate: v.optional(v.number()), // Last time player was active (for reminder eligibility)
    notificationsEnabled: v.optional(v.boolean()), // Opt-out flag (default true)

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
      v.literal("defense"),
      v.literal("poker-pvp"),
      v.literal("poker-cpu")
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

    // VBMS Rewards Tracking
    rewardsClaimed: v.optional(v.boolean()), // Whether rewards were claimed/sent to inbox
    claimedAt: v.optional(v.number()), // When rewards were claimed
    claimType: v.optional(v.union(v.literal("immediate"), v.literal("inbox"))), // How player claimed

    // PvE specific data
    difficulty: v.optional(v.union(
      v.literal("gey"),
      v.literal("goofy"),
      v.literal("gooner"),
      v.literal("gangster"),
      v.literal("gigachad")
    )), // AI difficulty for PvE matches

    // Poker specific data
    playerScore: v.optional(v.number()), // Player's score (rounds won) in poker
    opponentScore: v.optional(v.number()), // Opponent's score (rounds won) in poker

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

    // Room Mode
    mode: v.optional(v.union(
      v.literal("ranked"), // Costs coins, awards coins, counts for stats
      v.literal("casual")  // Free, no coins, just for fun
    )),

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

  // Tip Rotation State (tracks which tip to send next)
  tipRotationState: defineTable({
    currentTipIndex: v.number(), // Index of the next tip to send
    lastSentAt: v.number(), // Timestamp of last tip sent
  }),

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

  // Weekly Quest Progress (personal quests, reset every Sunday)
  weeklyProgress: defineTable({
    playerAddress: v.string(),
    weekStart: v.string(), // "2025-10-27" (last Sunday)
    quests: v.any(), // Object with quest progress { questId: { current, target, completed, claimed } }
    pveStreakCurrent: v.optional(v.number()), // Current PvE win streak this week (resets on loss)
  })
    .index("by_player_week", ["playerAddress", "weekStart"]),

  // Weekly Leaderboard Rewards (claim history)
  weeklyRewards: defineTable({
    playerAddress: v.string(),
    username: v.string(),
    weekStart: v.string(), // "2025-11-03" (Sunday when reward is for)
    rank: v.number(), // Player's rank in leaderboard (1-10)
    reward: v.number(), // Coins received
    claimedAt: v.number(), // When player claimed
    method: v.string(), // "manual_claim" or "auto_distribution"
  })
    .index("by_player_week", ["playerAddress", "weekStart"])
    .index("by_week", ["weekStart", "claimedAt"]),

  // Personal Missions (daily bonuses that need to be claimed)
  personalMissions: defineTable({
    playerAddress: v.string(),
    date: v.string(), // "2025-11-01" for daily missions, "once" for one-time missions
    missionType: v.union(
      v.literal("daily_login"),
      v.literal("first_pve_win"),
      v.literal("first_pvp_match"),
      v.literal("welcome_gift"),
      v.literal("streak_3"),
      v.literal("streak_5"),
      v.literal("streak_10")
    ),
    completed: v.boolean(), // Mission requirement completed
    claimed: v.boolean(), // Reward claimed by player
    reward: v.number(), // Coins to claim
    completedAt: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
  })
    .index("by_player_date", ["playerAddress", "date"])
    .index("by_player_type", ["playerAddress", "missionType"]),

  // Security: Nonces for replay attack prevention
  nonces: defineTable({
    address: v.string(), // Wallet address
    nonce: v.number(), // Current nonce (increments with each signed action)
    lastUsed: v.number(), // Timestamp of last use
  }).index("by_address", ["address"]),

  // Achievement System
  achievements: defineTable({
    playerAddress: v.string(),
    achievementId: v.string(), // e.g. "rare_collector_1", "pristine_hoarder_10"
    category: v.string(), // "rarity", "wear", "foil", "progressive"
    completed: v.boolean(),
    progress: v.number(), // Current progress (e.g. 5 of 10)
    target: v.number(), // Target to complete (e.g. 10)
    claimedAt: v.optional(v.number()), // When reward was claimed
    completedAt: v.optional(v.number()), // When achievement was completed
  })
    .index("by_player", ["playerAddress"])
    .index("by_player_achievement", ["playerAddress", "achievementId"])
    .index("by_player_category", ["playerAddress", "category"]),

  // VBMS Claim History (on-chain claims)
  claimHistory: defineTable({
    playerAddress: v.string(),
    amount: v.number(), // VBMS amount claimed
    bonus: v.optional(v.number()), // Bonus amount (if any)
    bonusReasons: v.optional(v.array(v.string())), // Reasons for bonus
    txHash: v.string(), // Blockchain transaction hash
    timestamp: v.number(),
    type: v.union(
      v.literal("inbox_collect"), // Collected from inbox
      v.literal("immediate"), // Claimed immediately after battle
      v.literal("manual") // Manual claim
    ),
  })
    .index("by_player", ["playerAddress", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // Claim Analytics (track player behavior)
  claimAnalytics: defineTable({
    playerAddress: v.string(),
    choice: v.union(v.literal("immediate"), v.literal("inbox")),
    amount: v.number(), // Amount of VBMS
    inboxTotal: v.number(), // Total in inbox at time of choice
    bonusAvailable: v.optional(v.boolean()), // Whether bonus was available
    timestamp: v.number(),
  })
    .index("by_player", ["playerAddress", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // Poker Battle Rooms (for Poker Battle Mode matchmaking)
  pokerRooms: defineTable({
    // Room Info
    roomId: v.string(),
    status: v.union(
      v.literal("waiting"),     // Waiting for opponent
      v.literal("ready"),       // Both players joined and selected decks
      v.literal("in-progress"), // Game in progress
      v.literal("finished"),    // Game finished
      v.literal("cancelled")    // Room cancelled
    ),

    // Stakes & Token
    ante: v.number(), // Ante amount per round (10, 25, 50, 100)
    token: v.union(
      v.literal("TESTVBMS"),
      v.literal("testUSDC"),
      v.literal("VIBE_NFT")
    ),

    // Players
    hostAddress: v.string(),
    hostUsername: v.string(),
    hostDeck: v.optional(v.array(v.any())), // Host's 10 selected cards
    hostReady: v.boolean(),
    hostBankroll: v.number(), // Starting bankroll for host
    hostBoostCoins: v.optional(v.number()), // Boost coins for host (virtual currency for boosts)

    guestAddress: v.optional(v.string()),
    guestUsername: v.optional(v.string()),
    guestDeck: v.optional(v.array(v.any())), // Guest's 10 selected cards
    guestReady: v.optional(v.boolean()),
    guestBankroll: v.optional(v.number()), // Starting bankroll for guest
    guestBoostCoins: v.optional(v.number()), // Boost coins for guest (virtual currency for boosts)

    // Spectators
    spectators: v.optional(v.array(v.object({
      address: v.string(),
      username: v.string(),
      joinedAt: v.number(),
    }))),

    // Game State (updated in real-time during match)
    gameState: v.optional(v.object({
      currentRound: v.number(), // 1-7
      hostScore: v.number(), // Rounds won by host
      guestScore: v.number(), // Rounds won by guest
      pot: v.number(), // Current pot size
      currentBet: v.number(), // Current bet to match
      phase: v.string(), // 'card-selection', 'pre-reveal-betting', 'reveal', etc.

      // Current round state
      hostSelectedCard: v.optional(v.any()),
      guestSelectedCard: v.optional(v.any()),
      hostAction: v.optional(v.string()), // 'BOOST', 'PASS', etc.
      guestAction: v.optional(v.string()),
      hostBet: v.optional(v.number()),
      guestBet: v.optional(v.number()),
      lastAction: v.optional(v.string()), // Last player action for turn order
    })),

    // Winner
    winnerId: v.optional(v.string()), // Address of winner
    winnerUsername: v.optional(v.string()),
    finalPot: v.optional(v.number()), // Final pot amount won

    // Timestamps
    createdAt: v.number(),
    startedAt: v.optional(v.number()), // When game actually started
    finishedAt: v.optional(v.number()),
    expiresAt: v.number(), // Auto-cancel if not started within 10 minutes
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_host", ["hostAddress"])
    .index("by_guest", ["guestAddress"])
    .index("by_token_ante", ["token", "ante", "status"]), // For auto-match filtering

  // Poker Chat Messages (for in-match communication)
  pokerChatMessages: defineTable({
    roomId: v.string(), // Which poker room this message belongs to
    sender: v.string(), // Wallet address (lowercase)
    senderUsername: v.string(), // Display name
    message: v.string(), // Chat message content (max 500 chars)
    timestamp: v.number(), // When message was sent
  })
    .index("by_room", ["roomId", "timestamp"]), // For fetching messages by room chronologically

  // Poker Battle Spectator Bets
  pokerBets: defineTable({
    roomId: v.string(), // Which poker room this bet is for
    bettor: v.string(), // Spectator's wallet address (lowercase)
    bettorUsername: v.string(), // Display name
    betOn: v.string(), // Address of player being bet on (hostAddress or guestAddress)
    betOnUsername: v.string(), // Username of player being bet on
    amount: v.number(), // Bet amount in tokens
    token: v.union(
      v.literal("TESTVBMS"),
      v.literal("testUSDC"),
      v.literal("VIBE_NFT")
    ),
    status: v.union(
      v.literal("active"), // Bet placed, game in progress
      v.literal("won"), // Bet won, payout sent
      v.literal("lost"), // Bet lost, tokens gone
      v.literal("refunded") // Game cancelled, bet refunded
    ),
    payout: v.optional(v.number()), // Amount paid out if won
    timestamp: v.number(), // When bet was placed
    resolvedAt: v.optional(v.number()), // When bet was resolved
  })
    .index("by_room", ["roomId", "timestamp"])
    .index("by_bettor", ["bettor", "timestamp"])
    .index("by_status", ["status", "timestamp"]),

  // ═══════════════════════════════════════════════════════════════════════════════
  // CARD PACKS SYSTEM (Non-NFT Free Cards)
  // ═══════════════════════════════════════════════════════════════════════════════

  // Card Packs (Free gacha system)
  cardPacks: defineTable({
    address: v.string(), // Owner's wallet address
    packType: v.string(), // "starter", "mission", "achievement", "daily"
    unopened: v.number(), // Number of unopened packs
    sourceId: v.optional(v.string()), // Mission/Achievement ID that gave this pack
    earnedAt: v.number(), // Timestamp when earned
    expiresAt: v.optional(v.number()), // Optional expiration (for limited events)
  })
    .index("by_address", ["address"])
    .index("by_address_unopened", ["address", "unopened"]),

  // Card Inventory (Free cards from packs)
  cardInventory: defineTable({
    address: v.string(), // Owner's wallet address
    cardId: v.string(), // Unique card identifier (suit_rank_variant)

    // Card Properties
    suit: v.string(), // "hearts", "diamonds", "clubs", "spades"
    rank: v.string(), // "A", "2"-"10", "J", "Q", "K"
    variant: v.string(), // "default", "gold", "neon", "pixel", etc.
    rarity: v.string(), // "common", "rare", "epic", "legendary"

    // Visual
    imageUrl: v.string(), // CDN URL for card image
    badgeType: v.literal("FREE_CARD"), // Badge shown on card

    // Traits (similar to NFTs)
    foil: v.optional(v.string()), // "holo", "reverse", "galaxy", etc
    wear: v.string(), // "mint", "good", "worn", "battle-scarred"
    power: v.number(), // Card power (calculated same as NFT cards)

    // Metadata
    quantity: v.number(), // How many of this card (for duplicates)
    equipped: v.boolean(), // Currently equipped in deck
    obtainedAt: v.number(), // Timestamp when first obtained
    lastUsed: v.optional(v.number()), // Last time used in game
  })
    .index("by_address", ["address"])
    .index("by_address_equipped", ["address", "equipped"])
    .index("by_rarity", ["rarity"])
    .index("by_card", ["cardId"]),

  // Card Collection Progress (Achievements for collecting all cards)
  cardCollections: defineTable({
    address: v.string(),
    collectionName: v.string(), // "standard_52", "gold_set", "season_1", etc.

    // Progress
    cardsOwned: v.number(), // How many unique cards from this collection
    cardsTotal: v.number(), // Total cards in collection
    completedAt: v.optional(v.number()), // When completed (null if incomplete)

    // Rewards
    rewardClaimed: v.boolean(), // If completion reward was claimed
    rewardType: v.optional(v.string()), // "coins", "pack", "special_card"
    rewardAmount: v.optional(v.number()),
  })
    .index("by_address", ["address"])
    .index("by_collection", ["collectionName"])
    .index("by_completed", ["completedAt"]),

  // NFT Collections Registry (VBMS, custom collections, etc.)
  nftCollections: defineTable({
    collectionId: v.string(), // Unique ID like "vbms", "pooltroll", etc.
    name: v.string(), // Full name "Vibe Most Wanted"
    shortName: v.string(), // Short name for UI "VBMS"
    contractAddress: v.string(), // Base network contract
    chain: v.string(), // "base", "ethereum", etc.
    active: v.boolean(), // If collection is active
    createdAt: v.number(),
  })
    .index("by_collection_id", ["collectionId"])
    .index("by_active", ["active"])
    .index("by_contract", ["contractAddress"]),
});
