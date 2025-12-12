import { internalQuery } from "./_generated/server";

/**
 * Get all profiles with economy data
 * 🚀 BANDWIDTH FIX: Converted to internalQuery + limited to 200
 */
export const getAllProfiles = internalQuery({
  args: {},
  handler: async (ctx) => {
    // 🚀 BANDWIDTH FIX: Limit to 200 profiles max
    const profiles = await ctx.db.query("profiles").take(200);

    return profiles.map(profile => ({
      username: profile.username,
      address: profile.address,
      coins: profile.coins || 0,
      coinsInbox: profile.inbox || 0, // Using inbox field now
      lifetimeEarned: profile.lifetimeEarned || 0,
      lifetimeSpent: profile.lifetimeSpent || 0,
    }));
  },
});
