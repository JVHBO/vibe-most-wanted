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

    // 🔒 FILTER: Only count cards from "Vibe Most Wanted" collection
    // Exclude "feature" collection and free cards
    const isVibeCard = (nft: any) => {
      // Must be from Vibe Most Wanted collection explicitly
      const isVibeMostWanted =
        nft.collection === "vibe" ||
        nft.collection === "Vibe Most Wanted" ||
        nft.collection === "vbms" ||
        nft.collection === "VBMS" ||
        !nft.collection; // Legacy cards without collection field (default to Vibe)

      if (!isVibeMostWanted) {
        return false;
      }

      // Filter out feature collection
      if (nft.collection === "feature" || nft.collection === "Feature Collection") {
        return false;
      }

      // Filter out free cards (cards with tokenId < 10000 or marked as free)
      if (nft.free === true || nft.isFree === true) {
        return false;
      }

      // Include only Vibe Most Wanted cards
      return true;
    };

    // Helper: Count NFTs by rarity (only Vibe Most Wanted collection)
    const countByRarity = (rarity: string) =>
      nfts.filter((nft) => isVibeCard(nft) && nft.rarity === rarity).length;

    // Helper: Count NFTs by wear (only Vibe Most Wanted collection)
    const countByWear = (wear: string) =>
      nfts.filter((nft) => isVibeCard(nft) && nft.wear === wear).length;

    // Helper: Count NFTs by foil (only Vibe Most Wanted collection)
    const countByFoil = (foil: string) =>
      nfts.filter((nft) => isVibeCard(nft) && nft.foil === foil).length;

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
    const { playerAddress, achievementId } = args;
    const normalizedAddress = playerAddress.toLowerCase();

    // Get achievement definition (same pattern as missions)
    const definition = ALL_ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!definition) {
      throw new Error(`Achievement ${achievementId} not found in definitions`);
    }

    // Get achievement record
    const achievement = await ctx.db
      .query("achievements")
      .withIndex("by_player_achievement", (q) =>
        q.eq("playerAddress", normalizedAddress).eq("achievementId", achievementId)
      )
      .first();

    if (!achievement) {
      throw new Error("Achievement not unlocked yet");
    }

    if (!achievement.completed) {
      throw new Error("Achievement not completed yet");
    }

    if (achievement.claimedAt) {
      throw new Error("Achievement reward already claimed");
    }

    // Get player profile
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", normalizedAddress))
      .first();

    // Fallback: try original address if lowercase not found (for old profiles)
    if (!profile && playerAddress !== normalizedAddress) {
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_address", (q) => q.eq("address", playerAddress))
        .first();
    }

    if (!profile) {
      throw new Error("Profile not found");
    }

    // 🔒 SECURITY FIX: Mark as claimed FIRST to prevent race condition double-claim
    // If two requests come in simultaneously, only the first will succeed past here
    // Better to mark claimed but fail on coins than to give double coins
    await ctx.db.patch(achievement._id, {
      claimedAt: Date.now(),
    });

    // Add coins (TESTVBMS) to player profile
    const oldCoins = profile.coins || 0;
    const newCoins = oldCoins + definition.reward;
    const lifetimeEarned = (profile.lifetimeEarned || 0) + definition.reward;

    console.log('[claimAchievementReward] Adding coins:', {
      address: normalizedAddress,
      achievementId,
      oldCoins,
      reward: definition.reward,
      newCoins
    });

    await ctx.db.patch(profile._id, {
      coins: newCoins,
      lifetimeEarned,
      lastUpdated: Date.now(),
    });

    return {
      success: true,
      reward: definition.reward,
      newBalance: newCoins,
      achievementName: definition.name,
      achievementId: definition.id,
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
