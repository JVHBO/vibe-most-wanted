import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get all active featured casts
export const getActiveCasts = query({
  args: {},
  handler: async (ctx) => {
    const casts = await ctx.db
      .query("featuredCasts")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    // Sort by order
    return casts.sort((a, b) => a.order - b.order);
  },
});


// Set a featured cast (admin only)
export const setFeaturedCast = internalMutation({
  args: {
    castHash: v.string(),
    warpcastUrl: v.string(),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if there's already a cast at this order
    // 🚀 PERFORMANCE FIX: Use index correctly
    const existing = await ctx.db
      .query("featuredCasts")
      .withIndex("by_order", (q) => q.eq("order", args.order))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        castHash: args.castHash,
        warpcastUrl: args.warpcastUrl,
        active: true,
        addedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new
    return await ctx.db.insert("featuredCasts", {
      castHash: args.castHash,
      warpcastUrl: args.warpcastUrl,
      order: args.order,
      active: true,
      addedAt: Date.now(),
    });
  },
});

// Remove a featured cast (admin only)
export const removeFeaturedCast = internalMutation({
  args: {
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const cast = await ctx.db
      .query("featuredCasts")
      .withIndex("by_order", (q) => q.eq("order", args.order))
      .first();

    if (cast) {
      await ctx.db.patch(cast._id, { active: false });
    }
  },
});

// Cast interaction reward amount
const CAST_INTERACTION_REWARD = 300; // 300 TESTVBMS per interaction
const VIBE_BADGE_MULTIPLIER = 2; // 2x bonus for VIBE badge holders (300 -> 600)

// Get cast interaction progress for a player
export const getCastInteractionProgress = query({
  args: { address: v.string(), castHash: v.string() },
  handler: async (ctx, { address, castHash }) => {
    const normalizedAddress = address.toLowerCase();
    
    const progress = await ctx.db
      .query("castInteractions")
      .withIndex("by_player_cast", (q) => 
        q.eq("playerAddress", normalizedAddress).eq("castHash", castHash)
      )
      .collect();

    return {
      liked: progress.some(p => p.interactionType === "like" && p.claimed),
      recasted: progress.some(p => p.interactionType === "recast" && p.claimed),
      replied: progress.some(p => p.interactionType === "reply" && p.claimed),
    };
  },
});

// Claim cast interaction reward
export const claimCastInteractionReward = mutation({
  args: {
    address: v.string(),
    castHash: v.string(),
    interactionType: v.union(v.literal("like"), v.literal("recast"), v.literal("reply")),
  },
  handler: async (ctx, { address, castHash, interactionType }) => {
    const normalizedAddress = address.toLowerCase();

    // Check if already claimed
    const existing = await ctx.db
      .query("castInteractions")
      .withIndex("by_player_cast", (q) => 
        q.eq("playerAddress", normalizedAddress).eq("castHash", castHash)
      )
      .filter((q) => q.eq(q.field("interactionType"), interactionType))
      .first();

    if (existing) {
      throw new Error("Already claimed this reward");
    }

    // Get player profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Calculate reward with VIBE badge bonus (2x)
    let reward = CAST_INTERACTION_REWARD;
    const hasVibeBadge = profile.hasVibeBadge === true;
    if (hasVibeBadge) {
      reward = reward * VIBE_BADGE_MULTIPLIER;
    }

    // Add reward to balance
    const currentBalance = profile.coins || 0;
    const newBalance = currentBalance + reward;
    const newLifetimeEarned = (profile.lifetimeEarned || 0) + reward;

    await ctx.db.patch(profile._id, {
      coins: newBalance,
      lifetimeEarned: newLifetimeEarned,
      lastUpdated: Date.now(),
    });

    // Record the claim
    await ctx.db.insert("castInteractions", {
      playerAddress: normalizedAddress,
      castHash,
      interactionType,
      claimed: true,
      claimedAt: Date.now(),
    });

    console.log(`🎬 Cast ${interactionType} reward: ${reward} TESTVBMS for ${normalizedAddress}${hasVibeBadge ? ' (2x VIBE bonus)' : ''}`);

    return {
      success: true,
      reward,
      newBalance,
      interactionType,
      hasVibeBadge,
      bonusApplied: hasVibeBadge ? VIBE_BADGE_MULTIPLIER : 1,
    };
  },
});

// Admin: Reset cast interactions for a player (for testing)
export const resetCastInteractions = internalMutation({
  args: { address: v.string() },
  handler: async (ctx, { address }) => {
    const normalizedAddress = address.toLowerCase();

    // Get all interactions for this player
    const interactions = await ctx.db
      .query("castInteractions")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .collect();

    // Delete all interactions
    for (const interaction of interactions) {
      await ctx.db.delete(interaction._id);
    }

    console.log(`🔄 Reset ${interactions.length} cast interactions for ${normalizedAddress}`);

    return {
      success: true,
      deleted: interactions.length,
    };
  },
});
