/**
 * MIGRATION: Backfill hasFullDefenseDeck field
 *
 * 🚀 BANDWIDTH FIX: This field enables efficient leaderboard queries
 * by allowing compound index on (hasFullDefenseDeck, stats.aura)
 *
 * Before: getLeaderboardLite fetched ALL profiles (1.4GB bandwidth!)
 * After: getLeaderboardLite fetches only top N with .take() (~5MB)
 */

import { mutation } from "../_generated/server";

export const backfillHasFullDefenseDeck = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🚀 Starting hasFullDefenseDeck backfill migration...");

    const profiles = await ctx.db.query("profiles").collect();

    let updatedWithDeck = 0;
    let updatedWithoutDeck = 0;
    let skipped = 0;

    for (const profile of profiles) {
      // Skip if already has the field set correctly
      const hasFullDeck = (profile.defenseDeck?.length || 0) === 5;

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
