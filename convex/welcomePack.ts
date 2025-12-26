/**
 * Welcome Pack System
 * Automatically gives 1 Basic Pack to new users (one-time only)
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
 * Give welcome pack (1 Basic Pack) - ONE TIME ONLY
 */
export const claimWelcomePack = mutation({
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

    // Check if already received
    if (profile.hasReceivedWelcomePack) {
      throw new Error("Welcome pack already claimed");
    }

    // Give 1 Basic Pack
    // 🚀 PERF: Use compound index
    const existingPack = await ctx.db
      .query("cardPacks")
      .withIndex("by_address_packType", (q) => q.eq("address", normalizedAddress).eq("packType", "basic"))
      .first();

    if (existingPack) {
      await ctx.db.patch(existingPack._id, {
        unopened: existingPack.unopened + 1,
      });
    } else {
      await ctx.db.insert("cardPacks", {
        address: normalizedAddress,
        packType: "basic",
        unopened: 1,
        sourceId: "welcome_pack",
        earnedAt: Date.now(),
      });
    }

    // Mark as received
    await ctx.db.patch(profile._id, {
      hasReceivedWelcomePack: true,
    });

    return {
      success: true,
      message: "Welcome pack claimed! You received 1 Basic Pack!",
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

    // Filter profiles that need welcome pack
    const profilesToUpdate = allProfiles.filter(p => !p.hasReceivedWelcomePack);

    if (profilesToUpdate.length === 0) {
      return {
        success: true,
        packsGiven: 0,
        totalProfiles: allProfiles.length,
        message: "All users already have welcome packs!",
      };
    }

    // 🚀 PERFORMANCE FIX: Batch load all cardPacks for these users
    // 🚀 PERF: Use compound index instead of filter
    const addresses = profilesToUpdate.map(p => p.address.toLowerCase());
    const packPromises = addresses.map(addr =>
      ctx.db.query("cardPacks")
        .withIndex("by_address_packType", (q) => q.eq("address", addr).eq("packType", "basic"))
        .first()
    );
    const existingPacks = await Promise.all(packPromises);
    const packMap = new Map(
      existingPacks.map((pack, idx) => [addresses[idx], pack])
    );

    let packsGiven = 0;

    for (const profile of profilesToUpdate) {
      const normalizedAddress = profile.address.toLowerCase();
      const existingPack = packMap.get(normalizedAddress);

      if (existingPack) {
        await ctx.db.patch(existingPack._id, {
          unopened: existingPack.unopened + 1,
        });
      } else {
        await ctx.db.insert("cardPacks", {
          address: normalizedAddress,
          packType: "basic",
          unopened: 1,
          sourceId: "welcome_pack_retroactive",
          earnedAt: Date.now(),
        });
      }

      // Mark as received
      await ctx.db.patch(profile._id, {
        hasReceivedWelcomePack: true,
      });

      packsGiven++;
    }

    return {
      success: true,
      packsGiven,
      totalProfiles: allProfiles.length,
      message: `Welcome packs distributed to ${packsGiven} users!`,
    };
  },
});
