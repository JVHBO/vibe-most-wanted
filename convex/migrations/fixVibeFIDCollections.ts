/**
 * Migration to fix VibeFID cards that don't have collection: 'vibefid'
 * This fixes the 10x power calculation for legacy raid decks
 */

import { internalMutation } from "../_generated/server";

export const fixVibeFIDCollections = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allDecks = await ctx.db.query("raidAttacks").collect();
    let fixed = 0;
    const fixedAddresses: string[] = [];

    for (const deck of allDecks) {
      if (deck.vibefidCard) {
        // Check if collection is missing or wrong
        if ((deck.vibefidCard as any).collection !== 'vibefid') {
          await ctx.db.patch(deck._id, {
            vibefidCard: {
              ...deck.vibefidCard,
              collection: 'vibefid' as const,
            }
          });
          fixed++;
          fixedAddresses.push(deck.address);
          console.log(`🔧 Fixed VibeFID collection for: ${deck.address}`);
        }
      }
    }

    console.log(`✅ Migration complete: Fixed ${fixed}/${allDecks.length} raid decks`);

    return {
      fixed,
      total: allDecks.length,
      fixedAddresses,
    };
  },
});
