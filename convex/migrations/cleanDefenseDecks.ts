/**
 * MIGRATION: Clean old defense deck format
 *
 * Old format: defenseDeck: ["8117", "8118", ...]  (array of strings)
 * New format: defenseDeck: [{tokenId: "8117", power: 150, ...}, ...]  (array of objects)
 *
 * This migration clears all defense decks that are in the old format.
 * Users will need to re-set their defense decks.
 */

import { mutation } from "../_generated/server";

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
