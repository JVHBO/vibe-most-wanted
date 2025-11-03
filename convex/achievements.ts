/**
 * 🏆 ACHIEVEMENT SYSTEM
 *
 * Queries and mutations for the achievement/conquista system.
 * Automatically detects when players unlock achievements based on their NFT collection.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ALL_ACHIEVEMENTS, getAchievementById, type AchievementDefinition } from "./achievementDefinitions";

/**
 * 🔍 GET PLAYER ACHIEVEMENTS
 * Returns all achievements for a player with progress
 */
export const getPlayerAchievements = query({
  args: {
    playerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const { playerAddress } = args;
    const normalizedAddress = playerAddress.toLowerCase();

    // Get all player's achievements from DB
    const playerAchievements = await ctx.db
      .query("achievements")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .collect();

    // Create a map of existing achievements
    const achievementMap = new Map(
      playerAchievements.map((a) => [a.achievementId, a])
    );

    // Return all achievements with progress
    const result = ALL_ACHIEVEMENTS.map((definition) => {
      const existing = achievementMap.get(definition.id);
      return {
        ...definition,
        progress: existing?.progress || 0,
        completed: existing?.completed || false,
        claimedAt: existing?.claimedAt,
        completedAt: existing?.completedAt,
        _id: existing?._id,
      };
    });

    return result;
  },
});

/**
 * 🎯 CHECK AND UPDATE ACHIEVEMENTS
 * Analyzes player's NFTs and updates achievement progress
 * Called when player's collection changes
 */
export const checkAndUpdateAchievements = mutation({
  args: {
    playerAddress: v.string(),
    nfts: v.array(v.any()), // Player's NFT collection
  },
  handler: async (ctx, args) => {
    const { playerAddress, nfts } = args;
    const normalizedAddress = playerAddress.toLowerCase();

    const newlyCompletedAchievements: string[] = [];

    // Helper: Count NFTs by rarity
    const countByRarity = (rarity: string) =>
      nfts.filter((nft) => nft.rarity === rarity).length;

    // Helper: Count NFTs by wear
    const countByWear = (wear: string) =>
      nfts.filter((nft) => nft.wear === wear).length;

    // Helper: Count NFTs by foil
    const countByFoil = (foil: string) =>
      nfts.filter((nft) => nft.foil === foil).length;

    // Check each achievement
    for (const achievement of ALL_ACHIEVEMENTS) {
      const { id, requirement } = achievement;

      // Calculate current progress
      let currentProgress = 0;

      if (requirement.type === "have_rarity") {
        currentProgress = countByRarity(requirement.rarity!);
      } else if (requirement.type === "have_wear") {
        currentProgress = countByWear(requirement.wear!);
      } else if (requirement.type === "have_foil") {
        currentProgress = countByFoil(requirement.foil!);
      } else if (requirement.type === "collect_count") {
        // Progressive achievements
        if (requirement.rarity) {
          currentProgress = countByRarity(requirement.rarity);
        } else if (requirement.wear) {
          currentProgress = countByWear(requirement.wear);
        } else if (requirement.foil) {
          currentProgress = countByFoil(requirement.foil);
        }
      }

      // Check if achievement is completed
      const isCompleted = currentProgress >= requirement.count;

      // Get existing achievement record
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_player_achievement", (q) =>
          q.eq("playerAddress", normalizedAddress).eq("achievementId", id)
        )
        .first();

      if (existing) {
        // Update existing achievement
        const wasCompleted = existing.completed;
        await ctx.db.patch(existing._id, {
          progress: currentProgress,
          completed: isCompleted,
          completedAt: isCompleted && !wasCompleted ? Date.now() : existing.completedAt,
        });

        // Track newly completed
        if (isCompleted && !wasCompleted) {
          newlyCompletedAchievements.push(id);
        }
      } else {
        // Create new achievement record
        await ctx.db.insert("achievements", {
          playerAddress: normalizedAddress,
          achievementId: id,
          category: achievement.category,
          completed: isCompleted,
          progress: currentProgress,
          target: requirement.count,
          completedAt: isCompleted ? Date.now() : undefined,
        });

        // Track newly completed
        if (isCompleted) {
          newlyCompletedAchievements.push(id);
        }
      }
    }

    return {
      success: true,
      newlyCompleted: newlyCompletedAchievements,
      newlyCompletedCount: newlyCompletedAchievements.length,
    };
  },
});

/**
 * 💰 CLAIM ACHIEVEMENT REWARD
 * Player claims coins for completed achievement
 */
export const claimAchievementReward = mutation({
  args: {
    playerAddress: v.string(),
    achievementId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("🎯 [CLAIM] Starting claim...");
    const { playerAddress, achievementId } = args;
    console.log(`🎯 [CLAIM] playerAddress: ${playerAddress}`);
    console.log(`🎯 [CLAIM] achievementId: ${achievementId}`);

    const normalizedAddress = playerAddress.toLowerCase();
    console.log(`🎯 [CLAIM] normalizedAddress: ${normalizedAddress}`);

    // Get achievement definition (same pattern as missions)
    console.log(`🎯 [CLAIM] Looking for achievement in ALL_ACHIEVEMENTS...`);
    const definition = ALL_ACHIEVEMENTS.find((a) => a.id === achievementId);
    console.log(`🎯 [CLAIM] definition found: ${!!definition}`);
    if (!definition) {
      console.error(`❌ [CLAIM] Achievement ${achievementId} not found in definitions`);
      throw new Error(`Achievement ${achievementId} not found in definitions`);
    }
    console.log(`🎯 [CLAIM] definition.name: ${definition.name}, reward: ${definition.reward}`);

    // Get achievement record
    console.log(`🎯 [CLAIM] Querying DB for achievement...`);
    const achievement = await ctx.db
      .query("achievements")
      .withIndex("by_player_achievement", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("achievementId", achievementId)
      )
      .first();
    console.log(`🎯 [CLAIM] achievement found in DB: ${!!achievement}`);

    if (!achievement) {
      console.error(`❌ [CLAIM] Achievement not unlocked yet for ${normalizedAddress}`);
      throw new Error("Achievement not unlocked yet");
    }

    console.log(`🎯 [CLAIM] achievement.completed: ${achievement.completed}`);
    if (!achievement.completed) {
      console.error(`❌ [CLAIM] Achievement not completed yet`);
      throw new Error("Achievement not completed yet");
    }

    console.log(`🎯 [CLAIM] achievement.claimedAt: ${achievement.claimedAt}`);
    if (achievement.claimedAt) {
      console.error(`❌ [CLAIM] Achievement reward already claimed`);
      throw new Error("Achievement reward already claimed");
    }

    // Get player profile
    console.log(`🎯 [CLAIM] Querying profile for ${normalizedAddress}...`);
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();
    console.log(`🎯 [CLAIM] profile found with lowercase: ${!!profile}`);

    // Fallback: try original address if lowercase not found (for old profiles)
    if (!profile && playerAddress !== normalizedAddress) {
      console.log(`🎯 [CLAIM] Trying original address: ${playerAddress}...`);
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", playerAddress))
        .first();
      console.log(`🎯 [CLAIM] profile found with original: ${!!profile}`);
    }

    if (!profile) {
      console.error(`❌ [CLAIM] Profile not found for ${normalizedAddress} or ${playerAddress}`);
      throw new Error("Profile not found");
    }

    // Award coins
    const currentCoins = profile.coins || 0;
    const newCoins = currentCoins + definition.reward;
    console.log(`🎯 [CLAIM] currentCoins: ${currentCoins}, adding: ${definition.reward}, newCoins: ${newCoins}`);

    console.log(`🎯 [CLAIM] Updating profile...`);
    await ctx.db.patch(profile._id, {
      coins: newCoins,
      lifetimeEarned: (profile.lifetimeEarned || 0) + definition.reward,
    });
    console.log(`🎯 [CLAIM] Profile updated!`);

    // Mark achievement as claimed
    console.log(`🎯 [CLAIM] Marking achievement as claimed...`);
    await ctx.db.patch(achievement._id, {
      claimedAt: Date.now(),
    });
    console.log(`🎯 [CLAIM] Achievement marked as claimed!`);

    console.log(`✅ [CLAIM] Success! Returning result...`);
    return {
      success: true,
      reward: definition.reward,
      newBalance: newCoins,
      achievementName: definition.name,
    };
  },
});

/**
 * 📊 GET ACHIEVEMENT STATS
 * Returns statistics about player's achievement progress
 */
export const getAchievementStats = query({
  args: {
    playerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const { playerAddress } = args;
    const normalizedAddress = playerAddress.toLowerCase();

    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .collect();

    const totalAchievements = ALL_ACHIEVEMENTS.length;
    const completedCount = achievements.filter((a) => a.completed).length;
    const claimedCount = achievements.filter((a) => a.claimedAt).length;
    const unclaimedCount = completedCount - claimedCount;

    // Calculate potential coins from unclaimed achievements
    const unclaimedRewards = achievements
      .filter((a) => a.completed && !a.claimedAt)
      .reduce((sum, a) => {
        const def = ALL_ACHIEVEMENTS.find((ach) => ach.id === a.achievementId);
        return sum + (def?.reward || 0);
      }, 0);

    // Group by category
    const byCategory = {
      rarity: achievements.filter((a) => a.category === "rarity"),
      wear: achievements.filter((a) => a.category === "wear"),
      foil: achievements.filter((a) => a.category === "foil"),
      progressive: achievements.filter((a) => a.category === "progressive"),
    };

    return {
      totalAchievements,
      completedCount,
      claimedCount,
      unclaimedCount,
      unclaimedRewards,
      completionPercentage: Math.round((completedCount / totalAchievements) * 100),
      byCategory: {
        rarity: {
          total: ALL_ACHIEVEMENTS.filter((a) => a.category === "rarity").length,
          completed: byCategory.rarity.filter((a) => a.completed).length,
        },
        wear: {
          total: ALL_ACHIEVEMENTS.filter((a) => a.category === "wear").length,
          completed: byCategory.wear.filter((a) => a.completed).length,
        },
        foil: {
          total: ALL_ACHIEVEMENTS.filter((a) => a.category === "foil").length,
          completed: byCategory.foil.filter((a) => a.completed).length,
        },
        progressive: {
          total: ALL_ACHIEVEMENTS.filter((a) => a.category === "progressive").length,
          completed: byCategory.progressive.filter((a) => a.completed).length,
        },
      },
    };
  },
});

/**
 * 🔔 GET UNCLAIMED ACHIEVEMENTS
 * Returns completed but unclaimed achievements (for notifications)
 */
export const getUnclaimedAchievements = query({
  args: {
    playerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const { playerAddress } = args;
    const normalizedAddress = playerAddress.toLowerCase();

    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_player", (q) => q.eq("playerAddress", normalizedAddress))
      .collect();

    const unclaimed = achievements
      .filter((a) => a.completed && !a.claimedAt)
      .map((a) => {
        const definition = ALL_ACHIEVEMENTS.find((ach) => ach.id === a.achievementId);
        return {
          ...a,
          ...definition,
        };
      });

    return unclaimed;
  },
});
