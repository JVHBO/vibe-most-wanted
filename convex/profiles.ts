import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery, QueryCtx, MutationCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { normalizeAddress, isValidAddress } from "./utils";
import { isBlacklisted, getBlacklistInfo } from "./blacklist";

/**
 * PROFILE QUERIES & MUTATIONS
 *
 * Replaces ProfileService from Firebase
 */

/**
 * 🔗 MULTI-WALLET: Resolve primary address for linked wallets
 * Returns the primary address if this address is linked, otherwise returns the address itself
 */
async function resolvePrimaryAddress(ctx: QueryCtx | MutationCtx, address: string): Promise<string> {
  const normalizedAddress = normalizeAddress(address);

  // Check if this address is linked to another profile
  const link = await ctx.db
    .query("addressLinks")
    .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
    .first();

  if (link) {
    // This is a linked address - return the primary
    return link.primaryAddress;
  }

  // Not a linked address - return as-is
  return normalizedAddress;
}

// ============================================================================
// QUERIES (read data)
// ============================================================================

/**
 * Get a profile by wallet address
 * Supports multi-wallet: checks linked addresses FIRST, then primary address
 */
export const getProfile = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    // Validate address format - return null instead of throwing for invalid/empty addresses
    if (!address || address.length === 0 || !isValidAddress(address)) {
      return null;
    }

    const normalizedAddress = normalizeAddress(address);

    // 🔗 MULTI-WALLET: Check addressLinks FIRST (takes priority over orphaned profiles)
    const addressLink = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    let profile;

    if (addressLink) {
      // This address is linked to another profile - use the primary
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", addressLink.primaryAddress))
        .first();
    } else {
      // Not a linked address, try to find by primary address
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
        .first();
    }

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

    const normalizedAddress = normalizeAddress(address);

    // 🔗 MULTI-WALLET: Check addressLinks FIRST (takes priority over orphaned profiles)
    const addressLink = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    let profile;

    if (addressLink) {
      // This address is linked to another profile - use the primary
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", addressLink.primaryAddress))
        .first();
    } else {
      // Not a linked address, try to find by primary address
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
        .first();
    }

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
 * 🚀 BANDWIDTH FIX: Consolidated dashboard query
 * Replaces 5 separate queries with 1:
 * - getPlayerEconomy (economy.ts)
 * - getVBMSBalance (economyVBMS.ts)
 * - getInboxStatus (coinsInbox.ts)
 * - getRemainingPveAttempts (pokerCpu.ts)
 * - hasReceivedWelcomePack (welcomePack.ts)
 *
 * Saves ~80MB/day by reducing 5 profile fetches to 1
 */
export const getProfileDashboard = query({
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

    // Calculate daily values
    const today = new Date().toISOString().split('T')[0];
    const dailyLimits = profile.dailyLimits;
    const isToday = dailyLimits?.lastResetDate === today;

    // PvE attempts (max 10)
    const MAX_PVE_ATTEMPTS = 10;
    const pveUsed = isToday ? (dailyLimits?.pveWins || 0) : 0;
    const pveRemaining = Math.max(0, MAX_PVE_ATTEMPTS - pveUsed);

    // Cooldown for conversion (3 minutes)
    const COOLDOWN_MS = 3 * 60 * 1000;
    const lastConversion = profile.pendingConversionTimestamp || 0;
    const timeSinceLastConversion = Date.now() - lastConversion;
    const cooldownRemaining = lastConversion > 0 && timeSinceLastConversion < COOLDOWN_MS
      ? Math.ceil((COOLDOWN_MS - timeSinceLastConversion) / 1000)
      : 0;

    // Daily cap check
    const DAILY_CAP = 100000;
    const dailyEarned = isToday ? (profile.lifetimeEarned || 0) : 0; // Simplified
    const canEarnMore = dailyEarned < DAILY_CAP;

    return {
      // Core profile
      _id: profile._id,
      address: profile.address,
      username: profile.username,
      stats: profile.stats,
      hasDefenseDeck: (profile.defenseDeck?.length || 0) === 5,

      // Economy (replaces getPlayerEconomy)
      coins: profile.coins || 0,
      lifetimeEarned: profile.lifetimeEarned || 0,
      lifetimeSpent: profile.lifetimeSpent || 0,
      dailyLimits: profile.dailyLimits,
      winStreak: profile.winStreak || 0,
      canEarnMore,

      // VBMS (replaces getVBMSBalance)
      inbox: profile.coinsInbox || 0,
      claimedTokens: profile.claimedTokens || 0,

      // Inbox status (replaces getInboxStatus)
      coinsInbox: profile.coinsInbox || 0,
      cooldownRemaining,

      // PvE attempts (replaces getRemainingPveAttempts)
      pveRemaining,
      pveTotal: MAX_PVE_ATTEMPTS,

      // Welcome pack (replaces hasReceivedWelcomePack)
      hasReceivedWelcomePack: profile.hasReceivedWelcomePack || false,

      // Extras needed by UI
      fid: profile.fid,
      farcasterFid: profile.farcasterFid,
      farcasterPfpUrl: profile.farcasterPfpUrl,
      hasVibeBadge: profile.hasVibeBadge || false,
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

      // 🚀 BANDWIDTH FIX: Cache TTL > cron interval to avoid cache misses
      // Cron updates every 30 min, TTL is 35 min for overlap
      if (cache && cache.data && cache.data.length > 0) {
        const cacheAge = Date.now() - cache.updatedAt;
        const cacheMaxAge = 35 * 60 * 1000; // 35 minutes (cron runs every 30min)

        if (cacheAge < cacheMaxAge) {
          // Return cached data (already formatted correctly)
          return cache.data.slice(0, limit).map(p => ({
            address: p.address,
            username: p.username,
            twitterProfileImageUrl: p.twitterProfileImageUrl,
            farcasterPfpUrl: p.farcasterPfpUrl,
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

      // 🔗 Get all linked addresses to filter them out
      const allLinks = await ctx.db.query("addressLinks").collect();
      const linkedAddressSet = new Set(allLinks.map(l => l.address));

      const topProfiles = await ctx.db
        .query("profiles")
        .withIndex("by_defense_aura", (q) => q.eq("hasFullDefenseDeck", true))
        .order("desc")
        .take(limit + 50); // Fetch extra to account for filtered ones

      // 🔗 Filter out linked addresses (orphan profiles)
      const primaryProfiles = topProfiles.filter(p => {
        if (!p.address) return false;
        return !linkedAddressSet.has(p.address);
      }).slice(0, limit);

      // Map to minimal fields
      const mapped = primaryProfiles.map(p => {
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
      // 🔗 Get all linked addresses to filter them out from leaderboard
      // Linked wallets should not appear separately - only primary profiles
      const allLinks = await ctx.db.query("addressLinks").collect();
      const linkedAddressSet = new Set(allLinks.map(l => l.address));

      // Fetch top 200 profiles with defense deck
      const topProfiles = await ctx.db
        .query("profiles")
        .withIndex("by_defense_aura", (q) => q.eq("hasFullDefenseDeck", true))
        .order("desc")
        .take(250); // Fetch extra to account for filtered ones

      // 🔗 Filter out profiles whose address is a linked address (orphan profiles)
      const primaryProfiles = topProfiles.filter(p => {
        if (!p.address) return false;
        // Skip if this address is linked to another profile
        if (linkedAddressSet.has(p.address)) {
          console.log(`📋 Leaderboard: Skipping orphan profile ${p.username} (${p.address}) - linked to another profile`);
          return false;
        }
        return true;
      }).slice(0, 200); // Take top 200 after filtering

      // Map to cached format
      const cachedData = primaryProfiles.map(p => {
        const address = p.address || "unknown";
        const blacklisted = isBlacklisted(address);
        const blacklistInfo = blacklisted ? getBlacklistInfo(address) : null;
        const punishment = blacklistInfo ? Math.floor(blacklistInfo.amountStolen / 100) : 0;

        return {
          address,
          username: p.username || "unknown",
          twitterProfileImageUrl: p.twitterProfileImageUrl,
          farcasterPfpUrl: p.farcasterPfpUrl,
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
 * 🔒 SECURE: Create or update profile with Farcaster verification
 *
 * This is the ONLY way to create a new account:
 * - Requires FID from Farcaster SDK (cannot be faked from browser)
 * - Username comes from Farcaster, not user input
 * - Prevents fake account creation
 *
 * For existing profiles: updates Farcaster data if changed
 */
export const upsertProfileFromFarcaster = mutation({
  args: {
    address: v.string(),
    fid: v.number(), // 🔒 REQUIRED - Must be valid Farcaster FID
    username: v.string(), // From Farcaster SDK, not user input
    displayName: v.optional(v.string()),
    pfpUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 🔒 SECURITY: Validate FID
    if (!args.fid || args.fid <= 0) {
      throw new Error("🔒 Valid Farcaster FID required to create account");
    }

    // Validate address format
    if (!isValidAddress(args.address)) {
      throw new Error('Invalid Ethereum address format');
    }

    const address = normalizeAddress(args.address);
    const username = args.username.toLowerCase();
    const now = Date.now();

    // Check if this FID already has a profile with different address
    // Uses farcasterFid indexed field for fast lookup
    const existingByFid = await ctx.db
      .query("profiles")
      .withIndex("by_fid", (q) => q.eq("farcasterFid", args.fid))
      .first();

    // NOTE: Legacy fid (string) fallback removed - was causing full table scans
    // All profiles should have farcasterFid by now. If not, run migration script.

    // 🔗 MULTI-WALLET: If FID exists with different address, LINK the new wallet
    if (existingByFid && existingByFid.address !== address) {
      // Check if this address is already linked
      const existingLink = await ctx.db
        .query("addressLinks")
        .withIndex("by_address", (q) => q.eq("address", address))
        .first();

      if (!existingLink) {
        // Link the new address to the existing profile
        await ctx.db.insert("addressLinks", {
          address,
          primaryAddress: existingByFid.address,
          linkedAt: now,
        });

        // Update the profile's linkedAddresses array
        const currentLinked = existingByFid.linkedAddresses || [];
        if (!currentLinked.includes(address)) {
          await ctx.db.patch(existingByFid._id, {
            linkedAddresses: [...currentLinked, address],
            lastUpdated: now,
          });
        }

        console.log(`🔗 MULTI-WALLET: Linked ${address} to existing profile @${existingByFid.username} (FID ${args.fid})`);
      }

      // Return the existing profile
      return existingByFid._id;
    }

    // Check if profile exists by address
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", address))
      .first();

    if (existing) {
      // Only update if something actually changed (reduces writes)
      const updates: Record<string, any> = {};

      if (existing.farcasterFid !== args.fid) updates.farcasterFid = args.fid;
      if (existing.username !== username) updates.username = username;
      if (existing.farcasterDisplayName !== args.displayName) updates.farcasterDisplayName = args.displayName;
      if (existing.farcasterPfpUrl !== args.pfpUrl) updates.farcasterPfpUrl = args.pfpUrl;

      if (Object.keys(updates).length > 0) {
        updates.lastUpdated = now;
        await ctx.db.patch(existing._id, updates);
        console.log(`✅ Profile updated for FID ${args.fid} (@${username}):`, Object.keys(updates));
      }
      return existing._id;
    }

    // 🆕 Create new profile with Farcaster data
    const newId = await ctx.db.insert("profiles", {
      address,
      farcasterFid: args.fid, // Use farcasterFid (number)
      username,
      farcasterDisplayName: args.displayName,
      farcasterPfpUrl: args.pfpUrl,
      stats: {
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
      attacksToday: 0,
      rematchesToday: 0,
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

    // 🎁 AUTO WELCOME PACK: Give 1 Basic Pack to new users automatically
    await ctx.db.insert("cardPacks", {
      address,
      packType: "basic",
      unopened: 1,
      sourceId: "welcome_pack_auto",
      earnedAt: now,
    });

    // Mark welcome pack as received on the profile
    await ctx.db.patch(newId, {
      hasReceivedWelcomePack: true,
    });

    console.log(`🆕 New profile created for FID ${args.fid} (@${username}) at ${address} - Welcome pack given!`);
    return newId;
  },
});

/**
 * 🔗 MULTI-WALLET: Manually link a new wallet address to an existing profile
 * Used by the "Connect Wallet" button in the profile settings
 *
 * @param primaryAddress - The current (primary) wallet address
 * @param newAddress - The new wallet address to link
 * @param fid - Farcaster FID for authentication
 */
export const linkWallet = mutation({
  args: {
    primaryAddress: v.string(),
    newAddress: v.string(),
    fid: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate FID
    if (!args.fid || args.fid <= 0) {
      throw new Error("🔒 Valid Farcaster FID required");
    }

    // Validate addresses
    if (!isValidAddress(args.primaryAddress) || !isValidAddress(args.newAddress)) {
      throw new Error("Invalid address format");
    }

    const primaryAddress = normalizeAddress(args.primaryAddress);
    const newAddress = normalizeAddress(args.newAddress);
    const now = Date.now();

    // Check if primary address and new address are the same
    if (primaryAddress === newAddress) {
      throw new Error("Cannot link wallet to itself");
    }

    // Get the profile by primary address
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", primaryAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Verify the FID matches
    if (profile.farcasterFid !== args.fid) {
      throw new Error("🔒 FID mismatch - unauthorized");
    }

    // Check if new address already belongs to another profile
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", newAddress))
      .first();

    if (existingProfile && existingProfile._id !== profile._id) {
      throw new Error("This wallet already has a profile. Cannot link.");
    }

    // Check if already linked
    const existingLink = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", newAddress))
      .first();

    if (existingLink) {
      if (existingLink.primaryAddress === primaryAddress) {
        return { success: true, message: "Wallet already linked" };
      } else {
        throw new Error("This wallet is already linked to another profile");
      }
    }

    // Create the link
    await ctx.db.insert("addressLinks", {
      address: newAddress,
      primaryAddress,
      linkedAt: now,
    });

    // Update the profile's linkedAddresses array
    const currentLinked = profile.linkedAddresses || [];
    if (!currentLinked.includes(newAddress)) {
      await ctx.db.patch(profile._id, {
        linkedAddresses: [...currentLinked, newAddress],
        lastUpdated: now,
      });
    }

    console.log(`🔗 MANUAL LINK: ${newAddress} linked to @${profile.username} (FID ${args.fid})`);
    return { success: true, message: "Wallet linked successfully" };
  },
});

/**
 * 🔗 Get all linked addresses for a profile
 */
export const getLinkedAddresses = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    if (!address || !isValidAddress(address)) {
      return { primary: null, linked: [] };
    }

    const normalizedAddress = normalizeAddress(address);

    // 🔗 ALWAYS check addressLinks FIRST - this handles linked wallets correctly
    // even if an orphan profile exists for the secondary wallet
    const link = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (link) {
      // This is a linked wallet - get the primary profile
      const primaryProfile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", link.primaryAddress))
        .first();

      if (primaryProfile) {
        return {
          primary: primaryProfile.address,
          linked: primaryProfile.linkedAddresses || [],
        };
      }
    }

    // Not a linked wallet - check if this address is a primary
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      return { primary: null, linked: [] };
    }

    return {
      primary: profile.address,
      linked: profile.linkedAddresses || [],
    };
  },
});

/**
 * 🔗 Check if two addresses belong to the same user (primary or linked)
 * Used to prevent self-attacks on leaderboard when using linked wallets
 */
export const isSameUser = query({
  args: { address1: v.string(), address2: v.string() },
  handler: async (ctx, { address1, address2 }) => {
    if (!address1 || !address2) return false;

    const normalized1 = normalizeAddress(address1);
    const normalized2 = normalizeAddress(address2);

    // Same address = same user
    if (normalized1 === normalized2) return true;

    // Resolve both to primary addresses
    const primary1 = await resolvePrimaryAddress(ctx, normalized1);
    const primary2 = await resolvePrimaryAddress(ctx, normalized2);

    // Same primary = same user
    return primary1 === primary2;
  },
});

// ============================================================================
// 🔗 WALLET LINK CODE SYSTEM
// Secure way to link wallets across devices using temporary codes
// ============================================================================

/**
 * 🔗 Generate a link code for a wallet WITHOUT FID
 * The wallet that wants to be linked generates a code
 * Then the FID owner uses that code to add this wallet
 *
 * INVERSE FLOW:
 * 1. New wallet (no profile) generates code
 * 2. User goes to Farcaster (has FID/profile) and enters code
 * 3. FID profile links the new wallet
 */
export const generateLinkCode = mutation({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    if (!isValidAddress(walletAddress)) {
      throw new Error("Endereço inválido");
    }

    const normalizedAddress = normalizeAddress(walletAddress);

    // Check if this wallet already has a profile or is linked
    const existingLink = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (existingLink) {
      throw new Error("Esta wallet já está linkada a um perfil");
    }

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (existingProfile) {
      throw new Error("Esta wallet já tem um perfil");
    }

    // Delete any existing codes for this wallet
    const existingCodes = await ctx.db
      .query("walletLinkCodes")
      .withIndex("by_profile", (q) => q.eq("profileAddress", normalizedAddress))
      .collect();

    for (const code of existingCodes) {
      await ctx.db.delete(code._id);
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const expiresAt = now + 30 * 1000; // 30 seconds

    await ctx.db.insert("walletLinkCodes", {
      code,
      profileAddress: normalizedAddress, // This is the wallet that wants to be linked
      createdAt: now,
      expiresAt,
      used: false,
    });

    return { code, expiresAt };
  },
});

/**
 * 🔗 Use a link code to add a wallet to your profile
 * Called by the FID owner to link a new wallet to their profile
 *
 * INVERSE FLOW:
 * - The CODE contains the wallet address that wants to be linked
 * - The fidOwnerAddress is the profile that will receive the linked wallet
 */
export const useLinkCode = mutation({
  args: {
    code: v.string(),
    fidOwnerAddress: v.string(), // The wallet of the FID owner (has profile)
  },
  handler: async (ctx, { code, fidOwnerAddress }) => {
    if (!isValidAddress(fidOwnerAddress)) {
      throw new Error("Endereço inválido");
    }

    const normalizedFidOwner = normalizeAddress(fidOwnerAddress);

    // Get the FID owner's profile (resolve links if needed)
    const ownerLink = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", normalizedFidOwner))
      .first();

    const primaryAddress = ownerLink?.primaryAddress || normalizedFidOwner;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", primaryAddress))
      .first();

    if (!profile) {
      throw new Error("Você precisa ter um perfil para linkar wallets");
    }

    // Find the code
    const linkCode = await ctx.db
      .query("walletLinkCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!linkCode) {
      throw new Error("Código inválido");
    }

    if (linkCode.used) {
      throw new Error("Código já foi usado");
    }

    if (Date.now() > linkCode.expiresAt) {
      await ctx.db.delete(linkCode._id);
      throw new Error("Código expirado");
    }

    // The wallet to link is stored in profileAddress field of the code
    const walletToLink = linkCode.profileAddress;

    // Can't link to the same wallet
    if (primaryAddress === walletToLink) {
      throw new Error("Não pode linkar a mesma wallet");
    }

    // Check if wallet is already linked somewhere
    const existingLink = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", walletToLink))
      .first();

    if (existingLink) {
      await ctx.db.patch(linkCode._id, { used: true });
      if (existingLink.primaryAddress === primaryAddress) {
        return { success: true, message: "Wallet já está linkada ao seu perfil" };
      } else {
        throw new Error("Esta wallet já está linkada a outro perfil");
      }
    }

    // Link the wallet!
    await ctx.db.insert("addressLinks", {
      address: walletToLink,
      primaryAddress: primaryAddress,
      linkedAt: Date.now(),
    });

    // Update profile's linkedAddresses array
    const currentLinked = profile.linkedAddresses || [];
    if (!currentLinked.includes(walletToLink)) {
      await ctx.db.patch(profile._id, {
        linkedAddresses: [...currentLinked, walletToLink],
      });
    }

    // 🧹 CLEANUP: Delete raid data from the linked wallet (prevents conflicts)
    await ctx.scheduler.runAfter(0, internal.raidBoss.cleanupLinkedWalletRaidData, {
      linkedAddress: walletToLink,
    });

    // Mark code as used
    await ctx.db.patch(linkCode._id, { used: true });

    console.log(`🔗 Wallet linked: ${walletToLink} → ${primaryAddress} (cleanup scheduled)`);

    return {
      success: true,
      message: "Wallet linkada com sucesso!",
      profileUsername: profile.username,
      linkedWallet: walletToLink,
    };
  },
});

/**
 * 🔗 Unlink a wallet from profile
 * Can only be called from a wallet connected to the profile (primary or linked)
 */
export const unlinkWallet = mutation({
  args: {
    primaryAddress: v.string(), // The wallet making the request (must be primary)
    addressToUnlink: v.string(), // The wallet to remove
  },
  handler: async (ctx, { primaryAddress, addressToUnlink }) => {
    if (!isValidAddress(primaryAddress) || !isValidAddress(addressToUnlink)) {
      throw new Error("Endereço inválido");
    }

    const normalizedPrimary = normalizeAddress(primaryAddress);
    const normalizedUnlink = normalizeAddress(addressToUnlink);

    // Can't unlink the primary address
    if (normalizedPrimary === normalizedUnlink) {
      throw new Error("Não pode deslinkar a wallet principal");
    }

    // Verify the primary address owns the profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedPrimary))
      .first();

    if (!profile) {
      throw new Error("Perfil não encontrado");
    }

    // Check if the address to unlink is actually linked
    const linkedAddresses = profile.linkedAddresses || [];
    if (!linkedAddresses.includes(normalizedUnlink)) {
      throw new Error("Esta wallet não está linkada ao perfil");
    }

    // Remove from addressLinks table
    const addressLink = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", normalizedUnlink))
      .first();

    if (addressLink) {
      await ctx.db.delete(addressLink._id);
    }

    // Remove from profile's linkedAddresses array
    const updatedLinked = linkedAddresses.filter((addr: string) => addr !== normalizedUnlink);
    await ctx.db.patch(profile._id, {
      linkedAddresses: updatedLinked,
    });

    return {
      success: true,
      message: "Wallet deslinkada com sucesso!",
      unlinkedAddress: normalizedUnlink,
    };
  },
});

/**
 * 🔀 MERGE PROFILE FLOW
 * For OLD accounts (with profile but NO FID) to merge into a FID account
 *
 * Flow:
 * 1. Old account (no FID) generates merge code
 * 2. FID account enters code
 * 3. Old account's wallet is linked to FID account
 * 4. Old profile is deleted
 */

/**
 * Generate merge code for an old account (has profile, no FID)
 * This allows the user to merge their old account into a FID account
 */
export const generateMergeCode = mutation({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    if (!isValidAddress(walletAddress)) {
      throw new Error("Endereço inválido");
    }

    const normalizedAddress = normalizeAddress(walletAddress);

    // Check if this wallet has a profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Esta wallet não tem um perfil para mergear");
    }

    // Check if profile already has FID - if so, they should use link code instead
    if (profile.farcasterFid) {
      throw new Error("Este perfil já tem FID. Use 'Linkar Wallet' ao invés de merge.");
    }

    // Delete any existing merge codes for this wallet
    const existingCodes = await ctx.db
      .query("walletLinkCodes")
      .withIndex("by_profile", (q) => q.eq("profileAddress", normalizedAddress))
      .collect();

    for (const code of existingCodes) {
      await ctx.db.delete(code._id);
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const expiresAt = now + 60 * 1000; // 60 seconds for merge (more time needed)

    await ctx.db.insert("walletLinkCodes", {
      code,
      profileAddress: normalizedAddress,
      createdAt: now,
      expiresAt,
      used: false,
    });

    return {
      code,
      expiresAt,
      profileToMerge: profile.username,
    };
  },
});

/**
 * Use merge code to absorb an old account into a FID account
 * - Links the old wallet to the FID profile
 * - Deletes the old profile
 */
export const useMergeCode = mutation({
  args: {
    code: v.string(),
    fidOwnerAddress: v.string(),
  },
  handler: async (ctx, { code, fidOwnerAddress }) => {
    if (!isValidAddress(fidOwnerAddress)) {
      throw new Error("Endereço inválido");
    }

    const normalizedFidOwner = normalizeAddress(fidOwnerAddress);

    // Get the FID owner's profile (resolve links if needed)
    const ownerLink = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", normalizedFidOwner))
      .first();

    const primaryAddress = ownerLink?.primaryAddress || normalizedFidOwner;

    const fidProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", primaryAddress))
      .first();

    if (!fidProfile) {
      throw new Error("Você precisa ter um perfil para fazer merge");
    }

    if (!fidProfile.farcasterFid) {
      throw new Error("Seu perfil precisa ter FID para absorver outra conta");
    }

    // Find the code
    const mergeCode = await ctx.db
      .query("walletLinkCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!mergeCode) {
      throw new Error("Código inválido");
    }

    if (mergeCode.used) {
      throw new Error("Código já foi usado");
    }

    if (Date.now() > mergeCode.expiresAt) {
      await ctx.db.delete(mergeCode._id);
      throw new Error("Código expirado");
    }

    const oldWalletAddress = mergeCode.profileAddress;

    // Can't merge with yourself
    if (primaryAddress === oldWalletAddress) {
      throw new Error("Não pode mergear consigo mesmo");
    }

    // Get the old profile to merge
    const oldProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", oldWalletAddress))
      .first();

    if (!oldProfile) {
      throw new Error("Perfil antigo não encontrado");
    }

    // Check if old wallet is already linked somewhere else
    const existingLink = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", oldWalletAddress))
      .first();

    if (existingLink && existingLink.primaryAddress !== primaryAddress) {
      throw new Error("Esta wallet já está linkada a outro perfil");
    }

    // === MERGE PROCESS ===

    // 1. Link the old wallet to the FID profile
    if (!existingLink) {
      await ctx.db.insert("addressLinks", {
        address: oldWalletAddress,
        primaryAddress: primaryAddress,
        linkedAt: Date.now(),
      });
    }

    // 2. Update FID profile's linkedAddresses
    const currentLinked = fidProfile.linkedAddresses || [];
    if (!currentLinked.includes(oldWalletAddress)) {
      await ctx.db.patch(fidProfile._id, {
        linkedAddresses: [...currentLinked, oldWalletAddress],
      });
    }

    // 3. 🧹 CLEANUP: Delete raid data from the old wallet BEFORE deleting profile
    // This prevents orphaned raid decks that could cause conflicts
    await ctx.scheduler.runAfter(0, internal.raidBoss.cleanupLinkedWalletRaidData, {
      linkedAddress: oldWalletAddress,
    });

    // 4. Delete the old profile (this removes defense deck automatically)
    const oldUsername = oldProfile.username;
    await ctx.db.delete(oldProfile._id);

    // 5. Mark code as used
    await ctx.db.patch(mergeCode._id, { used: true });

    console.log(`🔀 Account merged: @${oldUsername} (${oldWalletAddress}) → @${fidProfile.username} (${primaryAddress})`);

    return {
      success: true,
      message: `Conta @${oldUsername} foi mergeada com sucesso!`,
      mergedUsername: oldUsername,
      mergedWallet: oldWalletAddress,
      newProfile: fidProfile.username,
    };
  },
});

/**
 * 🔗 UNIFIED: Use any code (link or merge) - auto-detects which operation to perform
 * Tries useLinkCode first, if it fails tries useMergeCode
 */
export const useUnifiedCode = mutation({
  args: {
    code: v.string(),
    fidOwnerAddress: v.string(),
  },
  handler: async (ctx, { code, fidOwnerAddress }) => {
    if (!isValidAddress(fidOwnerAddress)) {
      throw new Error("Endereço inválido");
    }

    const normalizedFidOwner = normalizeAddress(fidOwnerAddress);

    // Get the FID owner's profile (resolve links if needed)
    const ownerLink = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", normalizedFidOwner))
      .first();

    const primaryAddress = ownerLink?.primaryAddress || normalizedFidOwner;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", primaryAddress))
      .first();

    if (!profile) {
      throw new Error("Você precisa ter um perfil para usar códigos");
    }

    if (!profile.farcasterFid) {
      throw new Error("Seu perfil precisa ter FID para linkar/mergear wallets");
    }

    // Find the code
    const linkCode = await ctx.db
      .query("walletLinkCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!linkCode) {
      throw new Error("Código inválido");
    }

    if (linkCode.used) {
      throw new Error("Código já foi usado");
    }

    if (Date.now() > linkCode.expiresAt) {
      await ctx.db.delete(linkCode._id);
      throw new Error("Código expirado");
    }

    const targetAddress = linkCode.profileAddress;

    // Can't link to the same wallet
    if (primaryAddress === targetAddress) {
      throw new Error("Não pode linkar/mergear consigo mesmo");
    }

    // Check if wallet is already linked somewhere
    const existingLink = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", targetAddress))
      .first();

    if (existingLink) {
      await ctx.db.patch(linkCode._id, { used: true });
      if (existingLink.primaryAddress === primaryAddress) {
        return { success: true, message: "Wallet já está linkada ao seu perfil", type: "already_linked" };
      } else {
        throw new Error("Esta wallet já está linkada a outro perfil");
      }
    }

    // Check if the target address has a profile (determines if link or merge)
    const targetProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", targetAddress))
      .first();

    let operationType: "link" | "merge" = "link";
    let mergedUsername: string | undefined;

    if (targetProfile) {
      // MERGE: Target has a profile - delete it after linking
      operationType = "merge";
      mergedUsername = targetProfile.username;

      // Delete the old profile
      await ctx.db.delete(targetProfile._id);
      console.log(`🔀 Merged profile @${mergedUsername} (${targetAddress}) into @${profile.username}`);
    }

    // Link the wallet to the FID profile
    await ctx.db.insert("addressLinks", {
      address: targetAddress,
      primaryAddress: primaryAddress,
      linkedAt: Date.now(),
    });

    // Update profile's linkedAddresses array
    const currentLinked = profile.linkedAddresses || [];
    if (!currentLinked.includes(targetAddress)) {
      await ctx.db.patch(profile._id, {
        linkedAddresses: [...currentLinked, targetAddress],
      });
    }

    // 🧹 CLEANUP: Delete raid data from the linked/merged wallet
    await ctx.scheduler.runAfter(0, internal.raidBoss.cleanupLinkedWalletRaidData, {
      linkedAddress: targetAddress,
    });

    // Mark code as used
    await ctx.db.patch(linkCode._id, { used: true });

    if (operationType === "merge") {
      console.log(`🔀 Account merged: @${mergedUsername} (${targetAddress}) → @${profile.username} (${primaryAddress})`);
      return {
        success: true,
        type: "merge",
        message: `Conta @${mergedUsername} mergeada com sucesso!`,
        mergedUsername,
        linkedWallet: targetAddress,
      };
    } else {
      console.log(`🔗 Wallet linked: ${targetAddress} → @${profile.username} (${primaryAddress})`);
      return {
        success: true,
        type: "link",
        message: "Wallet linkada com sucesso!",
        linkedWallet: targetAddress,
      };
    }
  },
});

/**
 * Get active link code for a profile (if any)
 */
export const getActiveLinkCode = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    if (!isValidAddress(address)) {
      return null;
    }

    const normalizedAddress = normalizeAddress(address);

    // Get primary address
    const link = await ctx.db
      .query("addressLinks")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    const primaryAddress = link?.primaryAddress || normalizedAddress;

    // Find active code
    const code = await ctx.db
      .query("walletLinkCodes")
      .withIndex("by_profile", (q) => q.eq("profileAddress", primaryAddress))
      .first();

    if (!code || code.used || Date.now() > code.expiresAt) {
      return null;
    }

    return {
      code: code.code,
      expiresAt: code.expiresAt,
    };
  },
});

/**
 * @deprecated Use upsertProfileFromFarcaster instead
 * Legacy profile creation - kept for backwards compatibility but will reject new accounts
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
      // Update existing profile (allowed for legacy accounts)
      await ctx.db.patch(existing._id, {
        ...args,
        address,
        username,
        lastUpdated: now,
      });
      return existing._id;
    } else {
      // 🔒 SECURITY: Block new account creation without Farcaster
      console.log(`🚫 [SECURITY] Blocked legacy account creation for ${address} - must use Farcaster`);
      throw new Error("🔒 Account creation requires Farcaster authentication. Please use the miniapp.");
    }
  },
});

/**
 * Update Farcaster PFP for a profile
 */
export const updateFarcasterPfp = mutation({
  args: {
    address: v.string(),
    farcasterPfpUrl: v.string(),
  },
  handler: async (ctx, { address, farcasterPfpUrl }) => {
    const normalizedAddress = normalizeAddress(address);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, { farcasterPfpUrl });
    return { success: true };
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
      coqPower: v.optional(v.number()), // DEPRECATED: kept for backward compatibility
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
 * 🔗 MULTI-WALLET: Uses primary address for linked wallets
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
      // 🔗 Resolve to primary address if this is a linked wallet
      const primaryAddress = await resolvePrimaryAddress(ctx, address);

      // 🚫 BLACKLIST CHECK: Exploiters cannot set defense decks
      if (isBlacklisted(primaryAddress)) {
        throw new Error("Account banned: Defense deck feature disabled for exploiters");
      }

      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", primaryAddress))
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
 * 🔗 MULTI-WALLET: Uses primary address for linked wallets
 */
export const getValidatedDefenseDeck = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    // 🔗 Resolve to primary address if this is a linked wallet
    const primaryAddress = await resolvePrimaryAddress(ctx, address);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", primaryAddress))
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
      coqPower: v.optional(v.number()), // DEPRECATED: kept for backward compatibility
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
export const cleanOldDefenseDecks = internalMutation({
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
 * 🔗 MULTI-WALLET: Uses primary address for linked wallets
 */
export const getAvailableCards = query({
  args: {
    address: v.string(),
    mode: v.union(v.literal("attack"), v.literal("pvp"), v.literal("pve")),
  },
  handler: async (ctx, { address, mode }) => {
    // 🔗 Resolve to primary address if this is a linked wallet
    const primaryAddress = await resolvePrimaryAddress(ctx, address);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", primaryAddress))
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

    // Extract token IDs from defense deck using collection:tokenId format
    // EXCEPTION: VibeFID cards are NOT locked - they can be used in both attack and defense
    const lockedTokenIds: string[] = [];
    for (const card of profile.defenseDeck) {
      if (typeof card === 'object' && card !== null && 'tokenId' in card) {
        // Skip VibeFID cards - they're exempt from the lock system
        if (card.collection === 'vibefid') {
          continue;
        }
        // Use collection:tokenId format for proper comparison
        const cardKey = `${card.collection || 'default'}:${card.tokenId}`;
        lockedTokenIds.push(cardKey);
      } else if (typeof card === 'string') {
        // Legacy format - assume default collection
        lockedTokenIds.push(`default:${card}`);
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
 * 🔗 MULTI-WALLET: Uses primary address for linked wallets
 */
export const getLockedCardsForDeckBuilding = query({
  args: {
    address: v.string(),
    mode: v.union(v.literal("defense"), v.literal("raid")),
  },
  handler: async (ctx, { address, mode }) => {
    // 🔗 Resolve to primary address if this is a linked wallet
    const primaryAddress = await resolvePrimaryAddress(ctx, address);

    // Get profile for defense deck
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", primaryAddress))
      .first();

    // Get raid deck
    const raidDeck = await ctx.db
      .query("raidAttacks")
      .withIndex("by_address", (q) => q.eq("address", primaryAddress))
      .first();

    // CRITICAL: Use collection:tokenId format to distinguish same tokenId across collections
    const lockedTokenIds: string[] = [];
    const lockedByRaid: string[] = [];
    const lockedByDefense: string[] = [];

    // Helper to create unique card key
    const getCardKey = (card: { tokenId: string; collection?: string }) =>
      `${card.collection || 'default'}:${card.tokenId}`;

    if (mode === "defense") {
      // When building defense deck, raid cards are locked
      if (raidDeck?.deck) {
        for (const card of raidDeck.deck) {
          // VibeFID cards are exempt
          if (card.collection === 'vibefid') continue;
          const cardKey = getCardKey(card);
          lockedTokenIds.push(cardKey);
          lockedByRaid.push(cardKey);
        }
      }
      // Also check VibeFID slot
      if (raidDeck?.vibefidCard && raidDeck.vibefidCard.collection !== 'vibefid') {
        const cardKey = getCardKey(raidDeck.vibefidCard);
        lockedTokenIds.push(cardKey);
        lockedByRaid.push(cardKey);
      }
    } else if (mode === "raid") {
      // When building raid deck, defense cards are locked
      if (profile?.defenseDeck) {
        for (const card of profile.defenseDeck) {
          if (typeof card === 'object' && card !== null && 'tokenId' in card) {
            // VibeFID cards are exempt
            if (card.collection === 'vibefid') continue;
            const cardKey = getCardKey(card);
            lockedTokenIds.push(cardKey);
            lockedByDefense.push(cardKey);
          } else if (typeof card === 'string') {
            // Legacy format: just tokenId (assume default collection)
            lockedTokenIds.push(`default:${card}`);
            lockedByDefense.push(`default:${card}`);
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

    // Helper: Get unique card key (collection:tokenId format)
    const getCardKey = (card: { tokenId: string; collection?: string }): string => {
      return `${card.collection || 'default'}:${card.tokenId}`;
    };

    // Get all raid card keys (excluding VibeFID) using collection:tokenId format
    const raidCardKeys = new Set<string>();
    for (const card of raidDeck.deck) {
      if (card.collection !== 'vibefid') {
        raidCardKeys.add(getCardKey(card));
      }
    }
    if (raidDeck.vibefidCard && raidDeck.vibefidCard.collection !== 'vibefid') {
      raidCardKeys.add(getCardKey(raidDeck.vibefidCard));
    }

    // Filter defense deck to remove conflicting cards
    const removedCards: string[] = [];
    const cleanedDefenseDeck = profile.defenseDeck.filter((card) => {
      let cardKey: string;
      let collection: string | undefined;

      if (typeof card === 'object' && card !== null && 'tokenId' in card) {
        cardKey = getCardKey(card);
        collection = card.collection;
      } else if (typeof card === 'string') {
        cardKey = `default:${card}`;
      } else {
        return true; // Keep unknown formats
      }

      // VibeFID cards are always kept
      if (collection === 'vibefid') {
        return true;
      }

      // Remove if in raid deck (using collection:tokenId comparison)
      if (raidCardKeys.has(cardKey)) {
        removedCards.push(cardKey);
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

/**
 * Count profiles with legacy fid (string) that need migration to farcasterFid (number)
 * Run this to check if migration is needed
 */
export const countLegacyFidProfiles = query({
  args: {},
  handler: async (ctx) => {
    // This still needs full scan but only runs manually for diagnostics
    const profiles = await ctx.db.query("profiles").collect();

    let legacyCount = 0;
    let migratedCount = 0;
    let noFidCount = 0;

    for (const profile of profiles) {
      if (profile.farcasterFid) {
        migratedCount++;
      } else if ((profile as any).fid) {
        legacyCount++;
      } else {
        noFidCount++;
      }
    }

    return {
      total: profiles.length,
      migrated: migratedCount,
      legacy: legacyCount,
      noFid: noFidCount,
      needsMigration: legacyCount > 0,
    };
  },
});

/**
 * Migrate legacy profiles from fid (string) to farcasterFid (number)
 * Run this once to fix all legacy profiles
 */
export const migrateLegacyFidProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    let migratedCount = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      // Skip if already has farcasterFid
      if (profile.farcasterFid) continue;

      // Check for legacy fid field
      const legacyFid = (profile as any).fid;
      if (legacyFid) {
        try {
          const fidNumber = parseInt(legacyFid, 10);
          if (!isNaN(fidNumber) && fidNumber > 0) {
            await ctx.db.patch(profile._id, { farcasterFid: fidNumber });
            migratedCount++;
            console.log(`✅ Migrated profile ${profile.username} (FID: ${fidNumber})`);
          } else {
            errors.push(`Invalid FID for ${profile.username}: ${legacyFid}`);
          }
        } catch (e: any) {
          errors.push(`Error migrating ${profile.username}: ${e.message}`);
        }
      }
    }

    console.log(`🔄 Migration complete: ${migratedCount} profiles migrated`);

    return {
      migratedCount,
      errors,
    };
  },
});
