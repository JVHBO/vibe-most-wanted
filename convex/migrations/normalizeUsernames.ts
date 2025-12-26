/**
 * Migration: Normalize all usernames to lowercase
 *
 * Problem: Some usernames were saved with uppercase letters (Jayabs, Ted Binion, etc)
 * causing profiles to be inaccessible via URL (e.g., /profile/Jayabs)
 *
 * Solution: Convert all usernames to lowercase
 *
 * Run with: npx convex run migrations/normalizeUsernames:migrate --prod
 */

import { internalMutation } from "../_generated/server";

export const migrate = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting username normalization migration...");

    // Get all profiles
    const profiles = await ctx.db.query("profiles").collect();

    let updated = 0;
    let skipped = 0;
    const changes: string[] = [];

    for (const profile of profiles) {
      const originalUsername = profile.username;
      const normalizedUsername = originalUsername.toLowerCase();

      // Check if username needs normalization
      if (originalUsername !== normalizedUsername) {
        // Check if lowercase version already exists (conflict detection)
        const conflict = await ctx.db
          .query("profiles")
          .withIndex("by_username", (q) =>
            q.eq("username", normalizedUsername)
          )
          .first();

        if (conflict && conflict._id !== profile._id) {
          console.warn(
            `⚠️ CONFLICT: Cannot normalize "${originalUsername}" to "${normalizedUsername}" - already exists for address ${conflict.address}`
          );
          skipped++;
          continue;
        }

        // Update username to lowercase
        await ctx.db.patch(profile._id, {
          username: normalizedUsername,
        });

        changes.push(
          `✅ ${originalUsername} → ${normalizedUsername} (${profile.address.slice(0, 10)}...)`
        );
        updated++;
      } else {
        skipped++;
      }
    }

    console.log("\n📊 Migration Results:");
    console.log(`   Total profiles: ${profiles.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);

    if (changes.length > 0) {
      console.log("\n📝 Changes made:");
      changes.forEach(change => console.log(`   ${change}`));
    }

    return {
      success: true,
      totalProfiles: profiles.length,
      updated,
      skipped,
      changes,
    };
  },
});
