import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * PROFILE QUERIES & MUTATIONS
 *
 * Replaces ProfileService from Firebase
 */

// ============================================================================
// QUERIES (read data)
// ============================================================================

/**
 * Get a profile by wallet address
 */
export const getProfile = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    return profile;
  },
});

/**
 * Get leaderboard (top 100 by total power)
 */
export const getLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_total_power")
      .order("desc")
      .take(limit);

    return profiles;
  },
});

/**
 * Check if username is available
 */
export const isUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) =>
        q.eq("username", username.toLowerCase())
      )
      .first();

    return !existing;
  },
});

/**
 * Get profile by username
 */
export const getProfileByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) =>
        q.eq("username", username.toLowerCase())
      )
      .first();

    return profile;
  },
});

// ============================================================================
// MUTATIONS (write data)
// ============================================================================

/**
 * Create or update a profile
 */
export const upsertProfile = mutation({
  args: {
    address: v.string(),
    username: v.string(),
    stats: v.optional(
      v.object({
        totalPower: v.number(),
        totalCards: v.number(),
        openedCards: v.number(),
        unopenedCards: v.number(),
        pveWins: v.number(),
        pveLosses: v.number(),
        pvpWins: v.number(),
        pvpLosses: v.number(),
        attackWins: v.number(),
        attackLosses: v.number(),
        defenseWins: v.number(),
        defenseLosses: v.number(),
      })
    ),
    defenseDeck: v.optional(v.array(
      v.object({
        tokenId: v.string(),
        power: v.number(),
        imageUrl: v.string(),
        name: v.string(),
        rarity: v.string(),
        foil: v.optional(v.string()),
      })
    )),
    twitter: v.optional(v.string()),
    twitterHandle: v.optional(v.string()),
    twitterProfileImageUrl: v.optional(v.string()),
    fid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const address = args.address.toLowerCase();
    const username = args.username.toLowerCase();

    // Check if profile exists
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing profile
      await ctx.db.patch(existing._id, {
        ...args,
        address,
        username,
        lastUpdated: now,
      });
      return existing._id;
    } else {
      // Create new profile
      const newId = await ctx.db.insert("profiles", {
        address,
        username,
        stats: args.stats || {
          totalPower: 0,
          totalCards: 0,
          openedCards: 0,
          unopenedCards: 0,
          pveWins: 0,
          pveLosses: 0,
          pvpWins: 0,
          pvpLosses: 0,
          attackWins: 0,
          attackLosses: 0,
          defenseWins: 0,
          defenseLosses: 0,
        },
        defenseDeck: args.defenseDeck,
        attacksToday: 0,
        rematchesToday: 0,
        twitter: args.twitter,
        twitterHandle: args.twitterHandle,
        createdAt: now,
        lastUpdated: now,
      });

      // Give 100 welcome coins to new users
      await ctx.scheduler.runAfter(0, internal.economy.addCoins, {
        address,
        amount: 100,
        reason: "Welcome bonus"
      });

      return newId;
    }
  },
});

/**
 * Update profile stats
 */
export const updateStats = mutation({
  args: {
    address: v.string(),
    stats: v.object({
      totalPower: v.number(),
      totalCards: v.number(),
      openedCards: v.number(),
      unopenedCards: v.number(),
      pveWins: v.number(),
      pveLosses: v.number(),
      pvpWins: v.number(),
      pvpLosses: v.number(),
      attackWins: v.number(),
      attackLosses: v.number(),
      defenseWins: v.number(),
      defenseLosses: v.number(),
    }),
    tokenIds: v.optional(v.array(v.string())), // Array of owned tokenIds for validation
  },
  handler: async (ctx, { address, stats, tokenIds }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    const updates: any = {
      stats,
      lastUpdated: Date.now(),
    };

    // Update ownedTokenIds if provided
    if (tokenIds) {
      updates.ownedTokenIds = tokenIds;
    }

    await ctx.db.patch(profile._id, updates);
  },
});

/**
 * Update defense deck
 */
export const updateDefenseDeck = mutation({
  args: {
    address: v.string(),
    defenseDeck: v.array(
      v.object({
        tokenId: v.string(),
        power: v.number(),
        imageUrl: v.string(),
        name: v.string(),
        rarity: v.string(),
        foil: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { address, defenseDeck }) => {
    try {
      console.log('🔍 updateDefenseDeck handler called:', {
        address,
        cardCount: defenseDeck.length,
        cards: defenseDeck.map(c => ({
          tokenId: c.tokenId,
          power: c.power,
          powerType: typeof c.power,
          imageUrlLength: c.imageUrl?.length,
          nameLength: c.name?.length,
          rarity: c.rarity,
          foil: c.foil,
        }))
      });

      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
        .first();

      if (!profile) {
        console.error('❌ Profile not found:', address);
        throw new Error(`Profile not found: ${address}`);
      }

      console.log('✅ Profile found:', {
        id: profile._id,
        username: profile.username,
        currentDefenseDeckLength: profile.defenseDeck?.length
      });

      // Clean the defense deck data - remove undefined values
      const cleanedDefenseDeck = defenseDeck.map(card => {
        const cleaned: any = {
          tokenId: card.tokenId,
          power: card.power,
          imageUrl: card.imageUrl,
          name: card.name,
          rarity: card.rarity,
        };

        // Only add foil if it's a non-empty string
        if (card.foil && card.foil !== '') {
          cleaned.foil = card.foil;
        }

        return cleaned;
      });

      console.log('🧹 Cleaned defense deck:', cleanedDefenseDeck);

      await ctx.db.patch(profile._id, {
        defenseDeck: cleanedDefenseDeck,
        lastUpdated: Date.now(),
      });

      console.log('✅ Defense deck updated successfully');
    } catch (error: any) {
      console.error('❌ updateDefenseDeck handler error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  },
});

/**
 * Get validated defense deck (removes cards player no longer owns)
 * SECURITY: Prevents using cards from sold/transferred NFTs
 */
export const getValidatedDefenseDeck = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      return {
        defenseDeck: [],
        removedCards: [],
        isValid: false,
      };
    }

    // If no defense deck, return empty
    if (!profile.defenseDeck || profile.defenseDeck.length === 0) {
      return {
        defenseDeck: [],
        removedCards: [],
        isValid: true,
      };
    }

    // If no ownedTokenIds yet (legacy profiles), return deck as-is with warning
    if (!profile.ownedTokenIds || profile.ownedTokenIds.length === 0) {
      console.warn(`⚠️ Profile ${address} has no ownedTokenIds - cannot validate defense deck`);
      const defenseDeck = profile.defenseDeck
        .filter((card): card is { tokenId: string; power: number; imageUrl: string; name: string; rarity: string; foil?: string } => typeof card === 'object');
      return {
        defenseDeck,
        removedCards: [],
        isValid: false, // Not validated
        warning: "Defense deck not validated - ownedTokenIds missing",
      };
    }

    // Validate each card in defense deck
    const ownedTokenIdsSet = new Set(profile.ownedTokenIds);
    const validCards: any[] = [];
    const removedCards: any[] = [];

    for (const card of profile.defenseDeck) {
      if (typeof card === 'object' && card.tokenId) {
        if (ownedTokenIdsSet.has(card.tokenId)) {
          validCards.push(card);
        } else {
          removedCards.push(card);
          console.log(`🗑️ Removed card ${card.tokenId} (${card.name}) from defense deck - no longer owned`);
        }
      }
    }

    // If cards were removed, update profile
    if (removedCards.length > 0) {
      await ctx.db.patch(profile._id, {
        defenseDeck: validCards,
        lastUpdated: Date.now(),
      });

      console.log(`✅ Defense deck validated for ${address}: ${validCards.length} valid, ${removedCards.length} removed`);
    }

    return {
      defenseDeck: validCards,
      removedCards,
      isValid: true,
    };
  },
});

/**
 * Update attacks today
 */
export const updateAttacks = mutation({
  args: {
    address: v.string(),
    attacksToday: v.number(),
    lastAttackDate: v.string(),
  },
  handler: async (ctx, { address, attacksToday, lastAttackDate }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    await ctx.db.patch(profile._id, {
      attacksToday,
      lastAttackDate,
      lastUpdated: Date.now(),
    });
  },
});

/**
 * Increment a stat (useful for wins/losses)
 */
/**
 * Increment a stat (wins/losses)
 * 🔒 INTERNAL ONLY - Cannot be called from client
 * Use incrementStatSecure for client calls with signature verification
 */
export const incrementStat = internalMutation({
  args: {
    address: v.string(),
    stat: v.union(
      v.literal("pvpWins"),
      v.literal("pvpLosses"),
      v.literal("attackWins"),
      v.literal("attackLosses"),
      v.literal("defenseWins"),
      v.literal("defenseLosses")
    ),
  },
  handler: async (ctx, { address, stat }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    const newStats = { ...profile.stats };
    newStats[stat] = (newStats[stat] || 0) + 1;

    await ctx.db.patch(profile._id, {
      stats: newStats,
      lastUpdated: Date.now(),
    });
  },
});

// ============================================================================
// SECURE MUTATIONS (With Web3 Authentication)
// ============================================================================

import {
  authenticateActionWithBackend,
  verifyNonce,
  incrementNonce,
} from "./auth";

/**
 * SECURE: Update stats with Web3 signature verification
 *
 * Required message format:
 * "Update stats: {address} nonce:{N} at {timestamp}"
 */
export const updateStatsSecure = mutation({
  args: {
    address: v.string(),
    signature: v.string(),
    message: v.string(),
    stats: v.object({
      totalPower: v.number(),
      totalCards: v.number(),
      openedCards: v.number(),
      unopenedCards: v.number(),
      pveWins: v.number(),
      pveLosses: v.number(),
      pvpWins: v.number(),
      pvpLosses: v.number(),
      attackWins: v.number(),
      attackLosses: v.number(),
      defenseWins: v.number(),
      defenseLosses: v.number(),
    }),
  },
  handler: async (ctx, { address, signature, message, stats }) => {
    // 1. Authenticate with full backend ECDSA verification
    const auth = await authenticateActionWithBackend(ctx, address, signature, message);
    if (!auth.success) {
      throw new Error(`Unauthorized: ${auth.error}`);
    }

    // 2. Verify nonce (prevent replay attacks)
    const nonceValid = await verifyNonce(ctx, address, message);
    if (!nonceValid) {
      throw new Error("Invalid nonce - possible replay attack");
    }

    // 🛡️ CRITICAL FIX: Increment nonce IMMEDIATELY after verification
    // This prevents replay attacks even if mutation fails later
    await incrementNonce(ctx, address);

    // 3. Perform the action (same as original mutation)
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    await ctx.db.patch(profile._id, {
      stats,
      lastUpdated: Date.now(),
    });

    // Nonce already incremented immediately after verification (line 508)

    console.log("✅ SECURE: Stats updated for", address);
  },
});

/**
 * SECURE: Update defense deck with Web3 signature verification
 */
export const updateDefenseDeckSecure = mutation({
  args: {
    address: v.string(),
    signature: v.string(),
    message: v.string(),
    defenseDeck: v.array(
      v.object({
        tokenId: v.string(),
        power: v.number(),
        imageUrl: v.string(),
        name: v.string(),
        rarity: v.string(),
        foil: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { address, signature, message, defenseDeck }) => {
    // 1. Authenticate with full backend ECDSA verification
    const auth = await authenticateActionWithBackend(ctx, address, signature, message);
    if (!auth.success) {
      throw new Error(`Unauthorized: ${auth.error}`);
    }

    // 2. Verify nonce
    const nonceValid = await verifyNonce(ctx, address, message);
    if (!nonceValid) {
      throw new Error("Invalid nonce - possible replay attack");
    }

    // 🛡️ CRITICAL FIX: Increment nonce IMMEDIATELY after verification
    // This prevents replay attacks even if mutation fails later
    await incrementNonce(ctx, address);

    // 3. Perform action
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    await ctx.db.patch(profile._id, {
      defenseDeck,
      lastUpdated: Date.now(),
    });

    // Nonce already incremented immediately after verification (line 565)

    console.log("✅ SECURE: Defense deck updated for", address);
  },
});

/**
 * SECURE: Increment a stat with Web3 signature verification
 */
export const incrementStatSecure = mutation({
  args: {
    address: v.string(),
    signature: v.string(),
    message: v.string(),
    stat: v.union(
      v.literal("pvpWins"),
      v.literal("pvpLosses"),
      v.literal("attackWins"),
      v.literal("attackLosses"),
      v.literal("defenseWins"),
      v.literal("defenseLosses")
    ),
  },
  handler: async (ctx, { address, signature, message, stat }) => {
    // 1. Authenticate with full backend ECDSA verification
    const auth = await authenticateActionWithBackend(ctx, address, signature, message);
    if (!auth.success) {
      throw new Error(`Unauthorized: ${auth.error}`);
    }

    // 2. Verify nonce
    const nonceValid = await verifyNonce(ctx, address, message);
    if (!nonceValid) {
      throw new Error("Invalid nonce - possible replay attack");
    }

    // 🛡️ CRITICAL FIX: Increment nonce IMMEDIATELY after verification
    // This prevents replay attacks even if mutation fails later
    await incrementNonce(ctx, address);

    // 3. Perform action
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    const newStats = { ...profile.stats };
    newStats[stat] = (newStats[stat] || 0) + 1;

    await ctx.db.patch(profile._id, {
      stats: newStats,
      lastUpdated: Date.now(),
    });

    // Nonce already incremented immediately after verification (line 620)

    console.log(`✅ SECURE: ${stat} incremented for`, address);
  },
});

// ============================================================================
// MIGRATION: Clean old defense deck format
// ============================================================================

/**
 * MIGRATION: Clean old defense decks (array of strings → array of objects)
 * Run once to clean legacy data from Firebase migration
 */
export const cleanOldDefenseDecks = mutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    let cleanedCount = 0;
    let skippedCount = 0;

    for (const profile of profiles) {
      if (!profile.defenseDeck || profile.defenseDeck.length === 0) {
        skippedCount++;
        continue;
      }

      // Check if first element is a string (old format)
      const firstCard = profile.defenseDeck[0];
      if (typeof firstCard === 'string') {
        console.log(`Cleaning old defense deck for ${profile.username} (${profile.address})`);

        await ctx.db.patch(profile._id, {
          defenseDeck: undefined,
        });

        cleanedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`✅ Migration complete: ${cleanedCount} cleaned, ${skippedCount} skipped`);

    return {
      cleanedCount,
      skippedCount,
      totalProfiles: profiles.length,
    };
  },
});

/**
 * 🔒 Get available cards for player (excluding defense deck locked cards)
 *
 * DEFENSE LOCK SYSTEM:
 * - Cards in defense deck are LOCKED and cannot be used in PvP Attack/Rooms
 * - PvE battles still allow defense cards (fighting AI is OK)
 * - Forces strategic decisions: strong defense OR strong offense
 *
 * @param address - Player wallet address
 * @param allNFTs - All NFTs owned by player (from Alchemy/NFT fetch)
 * @param mode - Game mode ("attack", "pvp", "pve")
 * @returns Filtered NFT list with locked cards removed (for attack/pvp)
 */
export const getAvailableCards = query({
  args: {
    address: v.string(),
    mode: v.union(v.literal("attack"), v.literal("pvp"), v.literal("pve")),
  },
  handler: async (ctx, { address, mode }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address.toLowerCase()))
      .first();

    if (!profile) {
      return { lockedTokenIds: [], isLockEnabled: false };
    }

    // PvE doesn't have lock restrictions (AI battles are OK)
    if (mode === "pve") {
      return { lockedTokenIds: [], isLockEnabled: false };
    }

    // If no defense deck set, no cards are locked
    if (!profile.defenseDeck || profile.defenseDeck.length === 0) {
      return { lockedTokenIds: [], isLockEnabled: false };
    }

    // Extract token IDs from defense deck
    const lockedTokenIds: string[] = [];
    for (const card of profile.defenseDeck) {
      if (typeof card === 'object' && card !== null && 'tokenId' in card) {
        lockedTokenIds.push(card.tokenId);
      } else if (typeof card === 'string') {
        lockedTokenIds.push(card);
      }
    }

    return {
      lockedTokenIds,
      isLockEnabled: true,
      lockedCount: lockedTokenIds.length,
    };
  },
});

/**
 * 🎴 UPDATE REVEALED CARDS CACHE
 * Saves metadata of revealed cards to prevent disappearing when Alchemy fails
 * Smart merge: only adds new cards, keeps existing cache
 */
export const updateRevealedCardsCache = mutation({
  args: {
    address: v.string(),
    revealedCards: v.array(v.object({
      tokenId: v.string(),
      name: v.string(),
      imageUrl: v.string(),
      rarity: v.string(),
      wear: v.optional(v.string()),
      foil: v.optional(v.string()),
      character: v.optional(v.string()),
      power: v.optional(v.number()),
      attributes: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const { address, revealedCards } = args;
    const normalizedAddress = address.toLowerCase();

    // Get existing profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Get existing cache or create new
    const existingCache = profile.revealedCardsCache || [];

    // Create map of existing cached cards by tokenId
    const cacheMap = new Map(
      existingCache.map(card => [card.tokenId, card])
    );

    // Merge: add new cards, update existing if needed
    const now = Date.now();
    for (const card of revealedCards) {
      // Only add/update if card is actually revealed (has attributes)
      if (card.wear || card.character || card.power) {
        cacheMap.set(card.tokenId, {
          ...card,
          cachedAt: cacheMap.has(card.tokenId) ? cacheMap.get(card.tokenId)!.cachedAt : now,
        });
      }
    }

    // Convert back to array
    const mergedCache = Array.from(cacheMap.values());

    // Update profile with merged cache
    await ctx.db.patch(profile._id, {
      revealedCardsCache: mergedCache,
      lastUpdated: now,
    });

    return {
      success: true,
      cachedCount: mergedCache.length,
      newlyCached: mergedCache.length - existingCache.length,
    };
  },
});
