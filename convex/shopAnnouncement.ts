/**
 * Shop Announcement System
 * Send notifications to all users about the new shop
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Send shop announcement to all active users
 */
export const sendShopAnnouncement = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all profiles
    const allProfiles = await ctx.db.query("profiles").collect();

    let notificationsSent = 0;
    let coinsAdded = 0;

    // Give 100 coins to everyone as shop launch bonus (added to balance)
    for (const profile of allProfiles) {
      const currentBalance = profile.coins || 0;
      const bonusAmount = 100;

      await ctx.db.patch(profile._id, {
        coins: currentBalance + bonusAmount,
        lifetimeEarned: (profile.lifetimeEarned || 0) + bonusAmount,
      });

      console.log(`💰 Shop bonus added to balance: ${bonusAmount} TESTVBMS for ${profile.address}. Balance: ${currentBalance} → ${currentBalance + bonusAmount}`);

      notificationsSent++;
      coinsAdded += bonusAmount;
    }

    return {
      success: true,
      notificationsSent,
      totalCoinsDistributed: coinsAdded,
      message: "Shop announcement sent! All users received 100 coins bonus.",
    };
  },
});
