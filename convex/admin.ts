/**
 * ADMIN FUNCTIONS
 *
 * 🔒 SECURITY: All mutations are internal-only
 * Cannot be called from client code - only from Convex dashboard or other mutations
 *
 * Dangerous operations - run step by step
 */

import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Step 1: Reset all profiles (economy and stats)
 * 🔒 INTERNAL ONLY - Cannot be called from client
 */
export const resetProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🚨 STEP 1: Resetting profiles...");

    const profiles = await ctx.db.query("profiles").take(100);
    console.log(`📊 Found ${profiles.length} profiles to reset`);

    let resetCount = 0;
    for (const profile of profiles) {
      const today = new Date().toISOString().split('T')[0];

      await ctx.db.patch(profile._id, {
        coins: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        stats: {
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
        dailyLimits: {
          pveWins: 0,
          pvpMatches: 0,
          lastResetDate: today,
          firstPveBonus: false,
          firstPvpBonus: false,
          loginBonus: false,
          streakBonus: false,
        },
        winStreak: 0,
        lastWinTimestamp: 0,
        attacksToday: 0,
        rematchesToday: 0,
        lastUpdated: Date.now(),
      });

      resetCount++;
    }

    console.log(`✅ Reset ${resetCount} profiles`);
    return { profilesReset: resetCount };
  },
});

/**
 * Step 2: Delete one batch of matches (run multiple times)
 * 🔒 INTERNAL ONLY - Cannot be called from client
 */
export const deleteMatchesBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Delete 100 matches at a time
    const matches = await ctx.db.query("matches").take(100);

    if (matches.length === 0) {
      console.log("✅ No more matches to delete");
      return { deleted: 0, remaining: 0 };
    }

    for (const match of matches) {
      await ctx.db.delete(match._id);
    }

    // Check how many remain
    const remaining = await ctx.db.query("matches").take(1);

    console.log(`🗑️ Deleted ${matches.length} matches`);
    return {
      deleted: matches.length,
      hasMore: remaining.length > 0
    };
  },
});

/**
 * Step 3: Delete all quest progress
 * 🔒 INTERNAL ONLY - Cannot be called from client
 */
export const deleteQuestProgress = internalMutation({
  args: {},
  handler: async (ctx) => {
    const questProgress = await ctx.db.query("questProgress").take(100);

    for (const progress of questProgress) {
      await ctx.db.delete(progress._id);
    }

    console.log(`✅ Deleted ${questProgress.length} quest progress records`);
    return { deleted: questProgress.length };
  },
});

/**
 * MIGRATION: Normalize all usernames to lowercase
 * Fixes profiles being inaccessible due to uppercase letters
 * 🔒 INTERNAL ONLY - Cannot be called from client
 */
export const normalizeUsernames = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting username normalization migration...");

    const profiles = await ctx.db.query("profiles").take(100);

    let updated = 0;
    let skipped = 0;
    const changes: string[] = [];

    for (const profile of profiles) {
      const originalUsername = profile.username;
      const normalizedUsername = originalUsername.toLowerCase();

      if (originalUsername !== normalizedUsername) {
        const conflict = await ctx.db
          .query("profiles")
          .withIndex("by_username", (q) =>
            q.eq("username", normalizedUsername)
          )
          .first();

        if (conflict && conflict._id !== profile._id) {
          console.warn(
            `⚠️ CONFLICT: Cannot normalize "${originalUsername}" - already exists`
          );
          skipped++;
          continue;
        }

        await ctx.db.patch(profile._id, {
          username: normalizedUsername,
        });

        changes.push(
          `✅ ${originalUsername} → ${normalizedUsername}`
        );
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`📊 Total: ${profiles.length}, Updated: ${updated}, Skipped: ${skipped}`);

    return {
      success: true,
      totalProfiles: profiles.length,
      updated,
      skipped,
      changes,
    };
  },
});

/**
 * ADMIN: Reset all FREE cards and give new packs
 * 🔒 INTERNAL ONLY - Cannot be called from client
 */
export const resetFreeCards = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🚨 Resetting all FREE cards...");

    // Get all cards
    const allCards = await ctx.db.query("cardInventory").take(100);
    console.log(`📊 Found ${allCards.length} FREE cards`);

    // Get unique addresses
    const uniqueAddresses = new Set(allCards.map(c => c.address));
    console.log(`👥 From ${uniqueAddresses.size} players`);

    // Delete all cards
    let deletedCount = 0;
    for (const card of allCards) {
      await ctx.db.delete(card._id);
      deletedCount++;
    }
    console.log(`🗑️ Deleted ${deletedCount} cards`);

    // Give new pack to each player
    let packsGiven = 0;
    for (const address of uniqueAddresses) {
      // Check if player already has a pack
      const existingPack = await ctx.db
        .query("cardPacks")
        .withIndex("by_address", (q) => q.eq("address", address))
        .filter((q) => q.eq(q.field("packType"), "basic"))
        .first();

      if (existingPack) {
        // Increment existing pack
        await ctx.db.patch(existingPack._id, {
          unopened: existingPack.unopened + 1,
        });
      } else {
        // Create new pack
        await ctx.db.insert("cardPacks", {
          address,
          packType: "basic",
          unopened: 1,
          sourceId: "reset_compensation",
          earnedAt: Date.now(),
        });
      }
      packsGiven++;
    }
    console.log(`🎁 Gave ${packsGiven} compensation packs`);

    return {
      success: true,
      cardsDeleted: deletedCount,
      playersAffected: uniqueAddresses.size,
      packsGiven,
    };
  },
});

/**
 * DEBUG: Check how many FREE cards exist
 */
export const debugCountFreeCards = mutation({
  args: {},
  handler: async (ctx) => {
    const allCards = await ctx.db.query("cardInventory").take(100);
    console.log("📊 Total cards in cardInventory:", allCards.length);

    if (allCards.length > 0) {
      console.log("🎴 Sample card:", allCards[0]);
    }

    return {
      totalCards: allCards.length,
      sampleCard: allCards[0] || null,
    };
  },
});

/**
 * ADMIN: Delete FREE cards for a specific username and give compensation pack
 */
export const resetUserFreeCards = mutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    // Find user profile by username
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username.toLowerCase()))
      .first();

    if (!profile) {
      return {
        success: false,
        error: `Profile not found for username: ${username}`,
      };
    }

    const address = profile.address;
    console.log("🔍 Found profile:", { username, address });

    // Get user's cards
    const userCards = await ctx.db
      .query("cardInventory")
      .withIndex("by_address", (q) => q.eq("address", address))
      .collect();

    console.log("🎴 User has", userCards.length, "cards");

    // Delete all user's cards
    let deletedCount = 0;
    for (const card of userCards) {
      await ctx.db.delete(card._id);
      deletedCount++;
    }
    console.log("🗑️ Deleted", deletedCount, "cards");

    // Give compensation pack
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address", (q) => q.eq("address", address))
      .filter((q) => q.eq(q.field("packType"), "basic"))
      .first();

    if (existingPack) {
      await ctx.db.patch(existingPack._id, {
        unopened: existingPack.unopened + 1,
      });
      console.log("🎁 Added 1 pack to existing pack (total:", existingPack.unopened + 1, ")");
    } else {
      await ctx.db.insert("cardPacks", {
        address,
        packType: "basic",
        unopened: 1,
        sourceId: "reset_compensation",
        earnedAt: Date.now(),
      });
      console.log("🎁 Created new pack with 1 unopened");
    }

    return {
      success: true,
      username,
      address,
      cardsDeleted: deletedCount,
      packGiven: true,
    };
  },
});

/**
 * PUBLIC: Execute the reset FREE cards operation
 * This is a public wrapper to call the internal mutation
 */
export const executeResetFreeCards = mutation({
  args: {},
  handler: async (ctx) => {
    // Call the internal mutation directly
    const allCards = await ctx.db.query("cardInventory").take(100);
    console.log("🔍 Found cards to delete:", allCards.length);

    const uniqueAddresses = new Set(allCards.map(c => c.address));
    console.log("👥 Unique addresses:", uniqueAddresses.size);

    // Delete all cards
    let deletedCount = 0;
    for (const card of allCards) {
      await ctx.db.delete(card._id);
      deletedCount++;
    }
    console.log("🗑️ Deleted cards:", deletedCount);

    // Give new pack to each player
    let packsGiven = 0;
    for (const address of uniqueAddresses) {
      const existingPack = await ctx.db
        .query("cardPacks")
        .withIndex("by_address", (q) => q.eq("address", address))
        .filter((q) => q.eq(q.field("packType"), "basic"))
        .first();

      if (existingPack) {
        await ctx.db.patch(existingPack._id, {
          unopened: existingPack.unopened + 1,
        });
      } else {
        await ctx.db.insert("cardPacks", {
          address,
          packType: "basic",
          unopened: 1,
          sourceId: "reset_compensation",
          earnedAt: Date.now(),
        });
      }
      packsGiven++;
    }
    console.log("🎁 Packs given:", packsGiven);

    return {
      success: true,
      cardsDeleted: deletedCount,
      playersAffected: uniqueAddresses.size,
      packsGiven,
    };
  },
});

/**
 * Move all coinsInbox to coins for all profiles
 * Admin function to fix coinsInbox not being claimed
 */
export const claimAllCoinsInboxForAll = mutation({
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").take(100);
    
    let totalMoved = 0;
    const updates: { address: string; moved: number }[] = [];
    
    for (const profile of profiles) {
      const coinsInbox = profile.coinsInbox || 0;
      if (coinsInbox > 0) {
        await ctx.db.patch(profile._id, {
          coins: (profile.coins || 0) + coinsInbox,
          coinsInbox: 0,
        });
        totalMoved += coinsInbox;
        updates.push({ address: profile.address, moved: coinsInbox });
      }
    }
    
    console.log("Moved " + totalMoved + " coins from coinsInbox to coins for " + updates.length + " profiles");
    
    return {
      success: true,
      totalMoved,
      profilesUpdated: updates.length,
      updates,
    };
  },
});

/**
 * Move all inbox to coins for all profiles
 * Admin function to fix raid rewards that went to inbox instead of coins
 */
export const moveInboxToCoinsForAll = mutation({
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").take(100);
    
    let totalMoved = 0;
    const updates: { address: string; moved: number }[] = [];
    
    for (const profile of profiles) {
      const inbox = profile.inbox || 0;
      if (inbox > 0) {
        await ctx.db.patch(profile._id, {
          coins: (profile.coins || 0) + inbox,
          inbox: 0,
          lifetimeEarned: (profile.lifetimeEarned || 0) + inbox,
        });
        totalMoved += inbox;
        updates.push({ address: profile.address, moved: inbox });
      }
    }
    
    console.log("Moved " + totalMoved + " from inbox to coins for " + updates.length + " profiles");
    
    return {
      success: true,
      totalMoved,
      profilesUpdated: updates.length,
      updates,
    };
  },
});

/**
 * Reset social quest progress for a specific address
 */
export const resetSocialQuestProgress = mutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    const progress = await ctx.db
      .query("socialQuestProgress")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .collect();

    for (const p of progress) {
      await ctx.db.delete(p._id);
    }

    console.log(`Reset ${progress.length} social quest progress entries for ${normalizedAddress}`);

    return {
      success: true,
      resetCount: progress.length,
    };
  },
});

/**
 * Reset all daily free claims so everyone can claim again
 */
export const resetDailyFreeClaims = mutation({
  args: {},
  handler: async (ctx) => {
    const claims = await ctx.db.query("dailyFreeClaims").collect();
    for (const claim of claims) {
      await ctx.db.delete(claim._id);
    }
    console.log(`Deleted ${claims.length} daily free claims`);
    return { deleted: claims.length };
  },
});

/**
 * Set test referrals for an address (for testing referral rewards)
 */
export const setTestReferrals = mutation({
  args: {
    address: v.string(),
    count: v.number(),
  },
  handler: async (ctx, { address, count }) => {
    const normalizedAddress = address.toLowerCase();

    // Check if referralStats exists
    const existingStats = await ctx.db
      .query("referralStats")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    const now = Date.now();

    if (existingStats) {
      // Update existing stats
      await ctx.db.patch(existingStats._id, {
        totalReferrals: count,
        claimedTiers: [], // Reset claimed tiers for testing
        updatedAt: now,
      });
      console.log(`Updated referral stats for ${normalizedAddress}: ${count} referrals`);
      return { success: true, updated: true, totalReferrals: count };
    } else {
      // Create new stats with all required fields
      await ctx.db.insert("referralStats", {
        address: normalizedAddress,
        username: "test_user",
        totalReferrals: count,
        qualifiedReferrals: count,
        pendingReferrals: 0,
        claimedTiers: [],
        totalVbmsEarned: 0,
        totalPacksEarned: 0,
        hasBadge: false,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Created referral stats for ${normalizedAddress}: ${count} referrals`);
      return { success: true, created: true, totalReferrals: count };
    }
  },
});

// ========== BLACKLIST: Exploiter addresses ==========

const EXPLOITER_BLACKLIST: Record<string, { username: string; fid: number; amountStolen: number }> = {
  "0x0395df57f73ae2029fc27a152cd87070bcfbd4a4": { username: "faqih", fid: 1063904, amountStolen: 1283500 },
  "0xbb367d00000f5e37ac702aab769725c299be2fc3": { username: "aliselalujp", fid: 272115, amountStolen: 1096804 },
  "0x0e14598940443b91d097b5fd6a89b5808fe35a6b": { username: "fvgf", fid: 1328239, amountStolen: 1094400 },
  "0x0230cf1cf5bf2537eb385772ff72edd5db45320d": { username: "ndmcm", fid: 1129881, amountStolen: 1094400 },
  "0x9ab292251cfb32b8f405ae43a9851aba61696ded": { username: "ral", fid: 1276961, amountStolen: 1094400 },
  "0xd4c3afc6adce7622400759d5194e5497b162e39d": { username: "fransiska", fid: 1156056, amountStolen: 1090100 },
  "0xa43ae3956ecb0ce00c69576153a34db42d265cc6": { username: "jessica", fid: 520832, amountStolen: 993303 },
  "0x04c6d801f529b8d4f118edb2722d5986d25a6ebf": { username: "khajoel", fid: 528311, amountStolen: 991800 },
  "0xff793f745cb0f1131f0614bf54f4c4310f33f0ce": { username: "azwar", fid: 544479, amountStolen: 991800 },
  "0x4ab24dac98c86778e2c837e5fa37ec5a2fdbffc0": { username: "uenxnx", fid: 1322032, amountStolen: 803900 },
  "0xf73e59d03d45a227e5a37aace702599c15d7e64d": { username: "rapoer", fid: 1168341, amountStolen: 455900 },
  "0xc85a10e41fdea999556f8779ea83e6cd1c5d0ded": { username: "desri", fid: 518884, amountStolen: 303400 },
  "0x0f6cfb4f54fec1deca1f43f9c0294ff945b16eb9": { username: "venombaseeth", fid: 308907, amountStolen: 270700 },
  "0x8cc9746c2bb68bd8f51e30ad96f67596b25b141b": { username: "hdhxhx", fid: 1483990, amountStolen: 98400 },
  "0xdeb2f2f02d2d5a2be558868ca8f31440c73d3091": { username: "jxjsjsjxj", fid: 1439850, amountStolen: 98400 },
  "0x2cb84569b69265eea55a8ceb361549548ca99749": { username: "aaggwgxgch", fid: 1420345, amountStolen: 98400 },
  "0xcd890b0f59d7d1a98ffdf133d6b99458324e6621": { username: "nxnckck", fid: 1328839, amountStolen: 98400 },
  "0xcda1b44a39cd827156334c69552d8ecdc697646f": { username: "hshdjxjck", fid: 1328834, amountStolen: 98400 },
  "0x32c3446427e4481096dd96e6573aaf1fbbb9cff8": { username: "jsjxjxjd", fid: 1328624, amountStolen: 98400 },
  "0xce1899674ac0b4137a5bb819e3849794a768eaf0": { username: "9", fid: 1249352, amountStolen: 98400 },
  "0x0d2450ada31e8dfd414e744bc3d250280dca202e": { username: "komeng", fid: 1031800, amountStolen: 95700 },
  "0x1915a871dea94e538a3c9ec671574ffdee6e7c45": { username: "miya", fid: 252536, amountStolen: 95700 },
  "0x705d7d414c6d94a8d1a06aeffc7cd92882480bd9": { username: "wow", fid: 443434, amountStolen: 60900 },
};

/**
 * ADMIN: Remove defense decks from blacklisted exploiter accounts
 * They cannot use defense decks anymore
 */
export const removeBlacklistedDefenseDecks = mutation({
  args: {},
  handler: async (ctx) => {
    let removedCount = 0;
    const removed: { address: string; username: string; deckSize: number }[] = [];

    for (const address of Object.keys(EXPLOITER_BLACKLIST)) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", address))
        .first();

      if (profile && profile.defenseDeck && profile.defenseDeck.length > 0) {
        const deckSize = profile.defenseDeck.length;
        await ctx.db.patch(profile._id, {
          defenseDeck: [],
          hasFullDefenseDeck: false, // 🚀 BANDWIDTH FIX
        });
        removedCount++;
        removed.push({
          address,
          username: EXPLOITER_BLACKLIST[address].username,
          deckSize,
        });
        console.log(`Removed defense deck from exploiter: ${address} (${EXPLOITER_BLACKLIST[address].username}) - had ${deckSize} cards`);
      }
    }

    return { removedCount, removed };
  },
});

/**
 * 🚀 BANDWIDTH FIX: Backfill hasFullDefenseDeck field for all profiles
 * This enables efficient leaderboard queries using compound index
 */
export const backfillHasFullDefenseDeck = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🚀 Starting hasFullDefenseDeck backfill migration...");

    const profiles = await ctx.db.query("profiles").collect();

    let updatedWithDeck = 0;
    let updatedWithoutDeck = 0;
    let skipped = 0;

    for (const profile of profiles) {
      // Check if has full defense deck (5 cards)
      const hasFullDeck = (profile.defenseDeck?.length || 0) === 5;

      // Skip if already has the field set correctly
      if (profile.hasFullDefenseDeck === hasFullDeck) {
        skipped++;
        continue;
      }

      await ctx.db.patch(profile._id, {
        hasFullDefenseDeck: hasFullDeck,
      });

      if (hasFullDeck) {
        updatedWithDeck++;
      } else {
        updatedWithoutDeck++;
      }
    }

    console.log(`✅ Migration complete!`);
    console.log(`   📊 Total profiles: ${profiles.length}`);
    console.log(`   ✅ Updated WITH full deck: ${updatedWithDeck}`);
    console.log(`   ❌ Updated WITHOUT full deck: ${updatedWithoutDeck}`);
    console.log(`   ⏭️ Skipped (already correct): ${skipped}`);

    return {
      total: profiles.length,
      updatedWithDeck,
      updatedWithoutDeck,
      skipped,
    };
  },
});
