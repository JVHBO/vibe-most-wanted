/**
 * Welcome Pack System
 * Disabled: no non-game welcome rewards.
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Check if user has received welcome pack
 */
export const hasReceivedWelcomePack = query({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) return false;

    return profile.hasReceivedWelcomePack || false;
  },
});

/**
 * Welcome packs are disabled. Kept as a no-op for old callers.
 */
export const claimWelcomePack = internalMutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    // Get profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      hasReceivedWelcomePack: true,
    });

    return {
      success: true,
      disabled: true,
      message: "Welcome packs are disabled.",
    };
  },
});

/**
 * ADMIN: Give welcome pack to ALL existing users who haven't received it
 */
export const giveWelcomePackToAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allProfiles = await ctx.db.query("profiles").collect();

    return {
      success: true,
      disabled: true,
      packsGiven: 0,
      totalProfiles: allProfiles.length,
      message: "Welcome packs are disabled.",
    };
  },
});
