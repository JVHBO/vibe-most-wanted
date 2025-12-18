import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { normalizeAddress, isValidAddress } from "./utils";
import { isBlacklisted, getBlacklistInfo } from "./blacklist";

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
    // Validate address format - return null instead of throwing for invalid/empty addresses
    if (!address || address.length === 0 || !isValidAddress(address)) {
      return null;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizeAddress(address)))
      .first();

    if (!profile) return null;

    // Add computed hasDefenseDeck field (required for leaderboard attack button)
    return {
      ...profile,
      hasDefenseDeck: (profile.defenseDeck?.length || 0) === 5,
    };
  },
});

/**
 * 🚀 BANDWIDTH FIX: Get a LITE profile (excludes heavy arrays)
 *
 * Use this instead of getProfile when you don't need:
 * - defenseDeck (5 full card objects)
 * - revealedCardsCache (100+ cards)
 * - ownedTokenIds (thousands of IDs)
 * - musicPlaylist
 *
 * Saves ~50-100KB per profile fetch
 */
export const getProfileLite = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    if (!address || address.length === 0 || !isValidAddress(address)) {
      return null;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizeAddress(address)))
      .first();

    if (!profile) return null;

    // Return only essential fields (saves ~95% bandwidth)
    return {
      _id: profile._id,
      address: profile.address,
      username: profile.username,
      stats: profile.stats,
      coins: profile.coins || 0,
      coinsInbox: profile.coinsInbox || 0,
      inbox: profile.inbox || 0,
      dailyLimits: profile.dailyLimits,
      attacksToday: profile.attacksToday || 0,
      rematchesToday: profile.rematchesToday || 0,
      winStreak: profile.winStreak || 0,
      fid: profile.fid,
      farcasterFid: profile.farcasterFid,
      farcasterPfpUrl: profile.farcasterPfpUrl,
      twitter: profile.twitter,
      twitterHandle: profile.twitterHandle,
      hasDefenseDeck: (profile.defenseDeck?.length || 0) === 5,
      preferredCollection: profile.preferredCollection,
      createdAt: profile.createdAt,
      lastUpdated: profile.lastUpdated,
    };
  },
});

/**
 * 🚀 OPTIMIZED: Get leaderboard LITE (minimal fields only)
 *
 * Saves ~97% bandwidth by excluding heavy fields:
 * - defenseDeck array (with full card metadata)
 * - revealedCardsCache (potentially dozens of cards)
 * - ownedTokenIds array
 * - Social metadata
 *
 * Returns ONLY fields needed for leaderboard display:
 * - address, username, totalPower
 *
 * Estimated savings: 40MB+ (from ~8KB to ~200 bytes per profile)
 *
 * BANDWIDTH OPTIMIZATION:
 * - Fetches max 500 profiles instead of ALL (reduces DB read by ~90%)
 * - Only returns minimal fields (reduces response size by ~95%)
 */
/**
 * 🚀 OPTIMIZED: Get leaderboard from CACHE (saves ~99% bandwidth)
 * Cache is updated every 10 minutes by updateLeaderboardFullCache cron
 * Falls back to direct query if cache is empty/stale
 */
export const getLeaderboardLite = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 200 }) => {
    try {
      // 🚀 CACHE HIT: Try to get from cache first (saves ~1.4GB/month)
      const cache = await ctx.db
        .query("leaderboardFullCache")
        .withIndex("by_type", (q) => q.eq("type", "full_leaderboard"))
        .first();

      // If cache exists and is fresh (less than 15 minutes old), use it
      if (cache && cache.data && cache.data.length > 0) {
        const cacheAge = Date.now() - cache.updatedAt;
        const fifteenMinutes = 15 * 60 * 1000;

        if (cacheAge < fifteenMinutes) {
          // Return cached data (already formatted correctly)
          return cache.data.slice(0, limit).map(p => ({
            address: p.address,
            username: p.username,
            stats: {
              aura: p.aura,
              totalPower: p.totalPower,
              vibePower: p.vibePower,
              vbrsPower: p.vbrsPower,
              vibefidPower: p.vibefidPower,
              afclPower: p.afclPower,
              pveWins: p.pveWins,
              pveLosses: p.pveLosses,
              pvpWins: p.pvpWins,
              pvpLosses: p.pvpLosses,
              openedCards: p.openedCards,
            },
            hasDefenseDeck: p.hasDefenseDeck,
            userIndex: p.userIndex,
            isBlacklisted: p.isBlacklisted,
          }));
        }
      }

      // 🔄 CACHE MISS: Fall back to direct query (only happens on first load or stale cache)
      console.log("⚠️ Leaderboard cache miss - fetching from profiles");
      const topProfiles = await ctx.db
        .query("profiles")
        .withIndex("by_defense_aura", (q) => q.eq("hasFullDefenseDeck", true))
        .order("desc")
        .take(limit);

      // Map to minimal fields
      const mapped = topProfiles.map(p => {
        const address = p.address || "unknown";
        const blacklisted = isBlacklisted(address);
        const blacklistInfo = blacklisted ? getBlacklistInfo(address) : null;
        const punishment = blacklistInfo ? Math.floor(blacklistInfo.amountStolen / 100) : 0;

        return {
          address,
          username: p.username || "unknown",
          stats: {
            aura: blacklisted ? -punishment : (p.stats?.aura ?? 500),
            totalPower: blacklisted ? -punishment : (p.stats?.totalPower || 0),
            vibePower: blacklisted ? 0 : (p.stats?.vibePower || 0),
            vbrsPower: blacklisted ? 0 : (p.stats?.vbrsPower || 0),
            vibefidPower: blacklisted ? 0 : (p.stats?.vibefidPower || 0),
            afclPower: blacklisted ? 0 : (p.stats?.afclPower || 0),
            pveWins: p.stats?.pveWins || 0,
            pveLosses: p.stats?.pveLosses || 0,
            pvpWins: p.stats?.pvpWins || 0,
            pvpLosses: p.stats?.pvpLosses || 0,
            openedCards: p.stats?.openedCards || 0,
          },
          hasDefenseDeck: p.hasFullDefenseDeck === true || (p.defenseDeck?.length || 0) === 5,
          userIndex: p.userIndex || 0,
          isBlacklisted: blacklisted,
        };
      });

      return mapped;
    } catch (error) {
      console.error("❌ getLeaderboardLite error:", error);
      return [];
    }
  },
});

/**
 * 🚀 CRON: Update full leaderboard cache (runs every 10 minutes)
 * Fetches profiles ONCE and caches for all subsequent getLeaderboardLite calls
 * Saves ~1.4GB bandwidth per month
 */
export const updateLeaderboardFullCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    try {
      // Fetch top 200 profiles with defense deck
      const topProfiles = await ctx.db
        .query("profiles")
        .withIndex("by_defense_aura", (q) => q.eq("hasFullDefenseDeck", true))
        .order("desc")
        .take(200);

      // Map to cached format
      const cachedData = topProfiles.map(p => {
        const address = p.address || "unknown";
        const blacklisted = isBlacklisted(address);
        const blacklistInfo = blacklisted ? getBlacklistInfo(address) : null;
        const punishment = blacklistInfo ? Math.floor(blacklistInfo.amountStolen / 100) : 0;

        return {
          address,
          username: p.username || "unknown",
          aura: blacklisted ? -punishment : (p.stats?.aura ?? 500),
          totalPower: blacklisted ? -punishment : (p.stats?.totalPower || 0),
          vibePower: blacklisted ? 0 : (p.stats?.vibePower || 0),
          vbrsPower: blacklisted ? 0 : (p.stats?.vbrsPower || 0),
          vibefidPower: blacklisted ? 0 : (p.stats?.vibefidPower || 0),
          afclPower: blacklisted ? 0 : (p.stats?.afclPower || 0),
          pveWins: p.stats?.pveWins || 0,
          pveLosses: p.stats?.pveLosses || 0,
          pvpWins: p.stats?.pvpWins || 0,
          pvpLosses: p.stats?.pvpLosses || 0,
          openedCards: p.stats?.openedCards || 0,
          hasDefenseDeck: true,
          userIndex: p.userIndex || 0,
          isBlacklisted: blacklisted,
        };
      });

      // Check if cache exists
      const existingCache = await ctx.db
        .query("leaderboardFullCache")
        .withIndex("by_type", (q) => q.eq("type", "full_leaderboard"))
        .first();

      if (existingCache) {
        await ctx.db.patch(existingCache._id, {
          data: cachedData,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("leaderboardFullCache", {
          type: "full_leaderboard",
          data: cachedData,
          updatedAt: Date.now(),
        });
      }

      console.log(`✅ Leaderboard cache updated: ${cachedData.length} players`);
      return { success: true, count: cachedData.length };
    } catch (error) {
      console.error("❌ updateLeaderboardFullCache error:", error);
      return { success: false, error: String(error) };
    }
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
        collection: v.optional(v.string()), // FIX: Add collection to type
      })
    )),
    twitter: v.optional(v.string()),
    twitterHandle: v.optional(v.string()),
    twitterProfileImageUrl: v.optional(v.string()),
    fid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate address format
    if (!isValidAddress(args.address)) {
      throw new Error('Invalid Ethereum address format');
    }

    const address = normalizeAddress(args.address);
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
          aura: 500, // Initial aura for new players
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

      // Create welcome_gift mission (500 coins claimable)
      await ctx.db.insert("personalMissions", {
        playerAddress: address,
        date: "once", // One-time mission
        missionType: "welcome_gift",
        completed: true, // Auto-completed for new users
        claimed: false, // Not claimed yet - player needs to claim
        reward: 500,
        completedAt: now,
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
      aura: v.optional(v.number()),
      honor: v.optional(v.number()), // legacy
      vibePower: v.optional(v.number()),
      vbrsPower: v.optional(v.number()),
      vibefidPower: v.optional(v.number()),
      afclPower: v.optional(v.number()),
      coqPower: v.optional(v.number()),
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
      .withIndex("by_address", (q) => q.eq("address", normalizeAddress(address)))
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
        collection: v.optional(v.string()), // FIX: Add collection to type
      })
    ),
  },
  handler: async (ctx, { address, defenseDeck }) => {
    try {
      const normalizedAddress = normalizeAddress(address);

      // 🚫 BLACKLIST CHECK: Exploiters cannot set defense decks
      if (isBlacklisted(normalizedAddress)) {
        throw new Error("Account banned: Defense deck feature disabled for exploiters");
      }

      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
        .first();

      if (!profile) {
        // devError (server-side)('❌ Profile not found:', address);
        throw new Error(`Profile not found: ${address}`);
      }

      // Clean the defense deck data - remove undefined values
      const cleanedDefenseDeck = defenseDeck.map(card => {
        const cleaned: any = {
          tokenId: card.tokenId,
          power: card.power,
          imageUrl: card.imageUrl,
          name: card.name,
          rarity: card.rarity,
          collection: card.collection || 'vibe', // FIX: Always include collection
        };

        // Only add foil if it's a non-empty string
        if (card.foil && card.foil !== '') {
          cleaned.foil = card.foil;
        }

        return cleaned;
      });

      // devLog (server-side)('🧹 Cleaned defense deck:', cleanedDefenseDeck);

      // 🔒 SECURITY FIX: Also update ownedTokenIds to include defense deck cards
      // This prevents getValidatedDefenseDeck from incorrectly removing cards
      const defenseTokenIds = cleanedDefenseDeck.map(card => card.tokenId);
      const existingOwnedIds = profile.ownedTokenIds || [];
      const mergedOwnedIds = [...new Set([...existingOwnedIds, ...defenseTokenIds])];

      await ctx.db.patch(profile._id, {
        defenseDeck: cleanedDefenseDeck,
        hasFullDefenseDeck: cleanedDefenseDeck.length === 5, // 🚀 BANDWIDTH FIX: For efficient leaderboard queries
        ownedTokenIds: mergedOwnedIds,
        lastUpdated: Date.now(),
      });

      console.log(`✅ Defense deck updated for ${normalizeAddress(address)}: ${cleanedDefenseDeck.length} cards, hasFullDefenseDeck: ${cleanedDefenseDeck.length === 5}, ownedTokenIds: ${mergedOwnedIds.length} total`);
    } catch (error: any) {
      // devError (server-side)('❌ updateDefenseDeck handler error:', error);
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
      .withIndex("by_address", (q) => q.eq("address", normalizeAddress(address)))
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
      // devWarn (server-side)(`⚠️ Profile ${address} has no ownedTokenIds - cannot validate defense deck`);
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
          // devLog (server-side)(`🗑️ Removed card ${card.tokenId} (${card.name}) from defense deck - no longer owned`);
        }
      }
    }

    // If cards were removed, update profile
    if (removedCards.length > 0) {
      // Log BEFORE patching to track what's being removed
      console.log(`⚠️ DEFENSE DECK VALIDATION for ${address}:`);
      console.log(`  - Original cards: ${profile.defenseDeck.length}`);
      console.log(`  - Valid cards: ${validCards.length}`);
      console.log(`  - Removed cards: ${removedCards.map((c: any) => c.tokenId).join(', ')}`);
      console.log(`  - ownedTokenIds count: ${profile.ownedTokenIds?.length || 0}`);

      await ctx.db.patch(profile._id, {
        defenseDeck: validCards,
        lastUpdated: Date.now(),
      });

      console.log(`✅ Defense deck updated for ${address}: ${validCards.length} valid, ${removedCards.length} removed`);
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
      .withIndex("by_address", (q) => q.eq("address", normalizeAddress(address)))
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
      .withIndex("by_address", (q) => q.eq("address", normalizeAddress(address)))
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
      aura: v.optional(v.number()),
      honor: v.optional(v.number()), // legacy
      vibePower: v.optional(v.number()),
      vbrsPower: v.optional(v.number()),
      vibefidPower: v.optional(v.number()),
      afclPower: v.optional(v.number()),
      coqPower: v.optional(v.number()),
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
      .withIndex("by_address", (q) => q.eq("address", normalizeAddress(address)))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    await ctx.db.patch(profile._id, {
      stats,
      lastUpdated: Date.now(),
    });

    // Nonce already incremented immediately after verification (line 508)

    // devLog (server-side)("✅ SECURE: Stats updated for", address);
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
        collection: v.optional(v.string()), // FIX: Add collection to type
      })
    ),
  },
  handler: async (ctx, { address, signature, message, defenseDeck }) => {
    const normalizedAddress = normalizeAddress(address);

    // 🚫 BLACKLIST CHECK: Exploiters cannot set defense decks
    if (isBlacklisted(normalizedAddress)) {
      throw new Error("Account banned: Defense deck feature disabled for exploiters");
    }

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
      .withIndex("by_address", (q) => q.eq("address", normalizeAddress(address)))
      .first();

    if (!profile) {
      throw new Error(`Profile not found: ${address}`);
    }

    await ctx.db.patch(profile._id, {
      defenseDeck,
      lastUpdated: Date.now(),
    });

    // Nonce already incremented immediately after verification (line 565)

    // devLog (server-side)("✅ SECURE: Defense deck updated for", address);
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
      .withIndex("by_address", (q) => q.eq("address", normalizeAddress(address)))
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

    // devLog (server-side)(`✅ SECURE: ${stat} incremented for`, address);
  },
});

// ============================================================================
// MIGRATION: Clean old defense deck format
// ============================================================================

/**
 * MIGRATION: Clean old defense decks (array of strings → array of objects)
 * Run once to clean legacy data from Firebase migration
 * 🚀 BANDWIDTH FIX: Process in batches of 100
 */
export const cleanOldDefenseDecks = mutation({
  args: {},
  handler: async (ctx) => {
    // 🚀 BANDWIDTH FIX: Process in batches instead of loading all
    const profiles = await ctx.db.query("profiles").take(100);

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
        // devLog (server-side)(`Cleaning old defense deck for ${profile.username} (${profile.address})`);

        await ctx.db.patch(profile._id, {
          defenseDeck: undefined,
        });

        cleanedCount++;
      } else {
        skippedCount++;
      }
    }

    // devLog (server-side)(`✅ Migration complete: ${cleanedCount} cleaned, ${skippedCount} skipped`);

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
 * - EXCEPTION: VibeFID cards are NEVER locked - they can be used in both attack and defense
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
      .withIndex("by_address", (q) => q.eq("address", normalizeAddress(address)))
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
    // EXCEPTION: VibeFID cards are NOT locked - they can be used in both attack and defense
    const lockedTokenIds: string[] = [];
    for (const card of profile.defenseDeck) {
      if (typeof card === 'object' && card !== null && 'tokenId' in card) {
        // Skip VibeFID cards - they're exempt from the lock system
        if (card.collection === 'vibefid') {
          continue;
        }
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
 * 🔒 Get all locked cards for a player (defense deck + raid deck)
 * Used by RaidDeckSelectionModal and DefenseDeckModal to show which cards are unavailable
 *
 * CARD LOCK SYSTEM:
 * - Cards in defense deck cannot be used in raid
 * - Cards in raid deck cannot be used in defense
 * - VibeFID cards are EXEMPT from this restriction
 */
export const getLockedCardsForDeckBuilding = query({
  args: {
    address: v.string(),
    mode: v.union(v.literal("defense"), v.literal("raid")),
  },
  handler: async (ctx, { address, mode }) => {
    const normalizedAddress = normalizeAddress(address);

    // Get profile for defense deck
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    // Get raid deck
    const raidDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    const lockedTokenIds: string[] = [];
    const lockedByRaid: string[] = [];
    const lockedByDefense: string[] = [];

    if (mode === "defense") {
      // When building defense deck, raid cards are locked
      if (raidDeck?.deck) {
        for (const card of raidDeck.deck) {
          // VibeFID cards are exempt
          if (card.collection === 'vibefid') continue;
          lockedTokenIds.push(card.tokenId);
          lockedByRaid.push(card.tokenId);
        }
      }
      // Also check VibeFID slot
      if (raidDeck?.vibefidCard && raidDeck.vibefidCard.collection !== 'vibefid') {
        lockedTokenIds.push(raidDeck.vibefidCard.tokenId);
        lockedByRaid.push(raidDeck.vibefidCard.tokenId);
      }
    } else if (mode === "raid") {
      // When building raid deck, defense cards are locked
      if (profile?.defenseDeck) {
        for (const card of profile.defenseDeck) {
          if (typeof card === 'object' && card !== null && 'tokenId' in card) {
            // VibeFID cards are exempt
            if (card.collection === 'vibefid') continue;
            lockedTokenIds.push(card.tokenId);
            lockedByDefense.push(card.tokenId);
          } else if (typeof card === 'string') {
            lockedTokenIds.push(card);
            lockedByDefense.push(card);
          }
        }
      }
    }

    return {
      lockedTokenIds,
      lockedByRaid,
      lockedByDefense,
      hasConflicts: false, // Will be set by migration check
    };
  },
});

/**
 * 🧹 Clean conflicting cards from defense deck
 * If a card is in both raid and defense, remove it from defense
 * This runs once when user opens defense deck modal
 */
export const cleanConflictingDefenseCards = mutation({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const normalizedAddress = normalizeAddress(address);

    // Get profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile || !profile.defenseDeck || profile.defenseDeck.length === 0) {
      return { cleaned: 0, removed: [] };
    }

    // Get raid deck
    const raidDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!raidDeck || !raidDeck.deck || raidDeck.deck.length === 0) {
      return { cleaned: 0, removed: [] };
    }

    // Get all raid card token IDs (excluding VibeFID)
    const raidTokenIds = new Set<string>();
    for (const card of raidDeck.deck) {
      if (card.collection !== 'vibefid') {
        raidTokenIds.add(card.tokenId);
      }
    }
    if (raidDeck.vibefidCard && raidDeck.vibefidCard.collection !== 'vibefid') {
      raidTokenIds.add(raidDeck.vibefidCard.tokenId);
    }

    // Filter defense deck to remove conflicting cards
    const removedCards: string[] = [];
    const cleanedDefenseDeck = profile.defenseDeck.filter((card) => {
      let tokenId: string;
      let collection: string | undefined;

      if (typeof card === 'object' && card !== null && 'tokenId' in card) {
        tokenId = card.tokenId;
        collection = card.collection;
      } else if (typeof card === 'string') {
        tokenId = card;
      } else {
        return true; // Keep unknown formats
      }

      // VibeFID cards are always kept
      if (collection === 'vibefid') {
        return true;
      }

      // Remove if in raid deck
      if (raidTokenIds.has(tokenId)) {
        removedCards.push(tokenId);
        return false;
      }

      return true;
    });

    // Only update if we would still have 5 cards (don't break the defense deck)
    if (removedCards.length > 0 && cleanedDefenseDeck.length >= 5) {
      await ctx.db.patch(profile._id, {
        defenseDeck: cleanedDefenseDeck,
      });

      console.log(`🧹 Cleaned ${removedCards.length} conflicting cards from ${normalizedAddress}'s defense deck`);
      return {
        cleaned: removedCards.length,
        removed: removedCards,
      };
    }

    // If cleaning would break defense deck (< 5 cards), don't clean
    if (removedCards.length > 0 && cleanedDefenseDeck.length < 5) {
      console.log(`⚠️ Skipped cleaning ${removedCards.length} cards - would leave only ${cleanedDefenseDeck.length} cards in defense`);
    }

    return {
      cleaned: 0,
      removed: [],
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
        collection: v.optional(v.string()), // FIX: Add collection to type
      character: v.optional(v.string()),
      power: v.optional(v.number()),
      attributes: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const { address, revealedCards } = args;
    const normalizedAddress = normalizeAddress(address);

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

// ============================================================================
// CUSTOM MUSIC SETTINGS
// ============================================================================

/**
 * Update custom music URL for background music
 */
export const updateCustomMusic = mutation({
  args: {
    address: v.string(),
    customMusicUrl: v.union(v.string(), v.null()), // URL or null to clear
  },
  handler: async (ctx, { address, customMusicUrl }) => {
    const normalizedAddress = normalizeAddress(address);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Update the custom music URL
    await ctx.db.patch(profile._id, {
      customMusicUrl: customMusicUrl || undefined, // Convert null to undefined for removal
      lastUpdated: Date.now(),
    });

    return {
      success: true,
      customMusicUrl: customMusicUrl || null,
    };
  },
});

/**
 * Update music playlist (multiple URLs)
 * User can add/remove URLs from their playlist
 */
export const updateMusicPlaylist = mutation({
  args: {
    address: v.string(),
    playlist: v.array(v.string()), // Array of URLs (can be empty)
    lastPlayedIndex: v.optional(v.number()), // Track which song was last played
  },
  handler: async (ctx, { address, playlist, lastPlayedIndex }) => {
    const normalizedAddress = normalizeAddress(address);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Update the music playlist
    await ctx.db.patch(profile._id, {
      musicPlaylist: playlist.length > 0 ? playlist : undefined,
      lastPlayedIndex: lastPlayedIndex ?? 0,
      // Clear legacy customMusicUrl if using playlist
      customMusicUrl: playlist.length > 0 ? undefined : profile.customMusicUrl,
      lastUpdated: Date.now(),
    });

    return {
      success: true,
      playlist,
      lastPlayedIndex: lastPlayedIndex ?? 0,
    };
  },
});

/**
 * Get music playlist for a user
 */
export const getMusicPlaylist = query({
  args: {
    address: v.string(),
  },
  handler: async (ctx, { address }) => {
    const normalizedAddress = normalizeAddress(address);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      return { playlist: [], lastPlayedIndex: 0 };
    }

    return {
      playlist: profile.musicPlaylist || [],
      lastPlayedIndex: profile.lastPlayedIndex || 0,
    };
  },
});

// ============================================================================
// INTERNAL QUERIES (for admin/cron only)
// ============================================================================

/**
 * Get all profiles (for economy monitoring/admin tools)
 * 🚀 BANDWIDTH FIX: Converted to internalQuery to prevent public abuse
 * 🚀 BANDWIDTH FIX: Limited to 200 profiles max
 */
export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    // 🚀 BANDWIDTH FIX: Limit to 200 profiles max
    const profiles = await ctx.db.query("profiles").take(200);
    return profiles;
  },
});
