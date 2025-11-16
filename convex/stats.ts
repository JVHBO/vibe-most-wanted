import { query } from "./_generated/server";

/**
 * Get all profiles with economy data
 */
export const getAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();

    return profiles.map(profile => ({
      username: profile.username,
      address: profile.address,
      coins: profile.coins || 0,
      coinsInbox: profile.coinsInbox || 0,
      lifetimeEarned: profile.lifetimeEarned || 0,
      lifetimeSpent: profile.lifetimeSpent || 0,
    }));
  },
});
