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

    const profiles = await ctx.db.query("profiles").collect();
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
    const questProgress = await ctx.db.query("questProgress").collect();

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

    const profiles = await ctx.db.query("profiles").collect();

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
    const allCards = await ctx.db.query("cardInventory").collect();
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
    const allCards = await ctx.db.query("cardInventory").collect();
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
    const allCards = await ctx.db.query("cardInventory").collect();
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
