/**
 * ADMIN FUNCTIONS
 *
 * Dangerous operations - run step by step
 */

import { mutation } from "./_generated/server";

/**
 * Step 1: Reset all profiles (economy and stats)
 */
export const resetProfiles = mutation({
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
 */
export const deleteMatchesBatch = mutation({
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
 */
export const deleteQuestProgress = mutation({
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
 */
export const normalizeUsernames = mutation({
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
