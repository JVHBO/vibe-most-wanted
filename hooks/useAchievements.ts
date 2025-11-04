/**
 * 🏆 USE ACHIEVEMENTS HOOK
 *
 * Auto-detects achievement progress and provides claim functionality
 */

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

interface UseAchievementsOptions {
  playerAddress?: string;
  nfts?: any[];
  autoCheck?: boolean; // Auto-check achievements when NFTs change
  autoNotify?: boolean; // Auto-notify when new achievements completed
  onSuccess?: (message: string) => void; // Custom success handler
  onError?: (message: string) => void; // Custom error handler
}

export function useAchievements(options: UseAchievementsOptions = {}) {
  const { playerAddress, nfts = [], autoCheck = true, autoNotify = true, onSuccess, onError } = options;

  const [isChecking, setIsChecking] = useState(false);
  const lastCheckRef = useRef<string>(""); // Track last NFT state to avoid duplicate checks

  // Queries
  const achievements = useQuery(
    api.achievements.getPlayerAchievements,
    playerAddress ? { playerAddress } : "skip"
  );

  const stats = useQuery(
    api.achievements.getAchievementStats,
    playerAddress ? { playerAddress } : "skip"
  );

  const unclaimed = useQuery(
    api.achievements.getUnclaimedAchievements,
    playerAddress ? { playerAddress } : "skip"
  );

  // Mutations
  const checkAndUpdate = useMutation(api.achievements.checkAndUpdateAchievements);
  const claimReward = useMutation(api.achievements.claimAchievementReward);

  /**
   * 🔍 Check achievements (manual or auto)
   */
  const checkAchievements = async () => {
    if (!playerAddress || nfts.length === 0 || isChecking) return;

    // Create fingerprint of current NFT state
    const nftFingerprint = JSON.stringify(
      nfts.map((n) => ({
        id: n.tokenId,
        r: n.rarity,
        w: n.wear,
        f: n.foil,
      }))
    );

    // Skip if same as last check
    if (nftFingerprint === lastCheckRef.current) return;

    try {
      setIsChecking(true);
      const result = await checkAndUpdate({
        playerAddress,
        nfts,
      });

      lastCheckRef.current = nftFingerprint;

      // Notify if new achievements completed
      if (autoNotify && result.newlyCompletedCount > 0) {
        console.log(
          `🏆 ${result.newlyCompletedCount} new achievement${
            result.newlyCompletedCount > 1 ? "s" : ""
          } completed!`
        );
      }

      return result;
    } catch (error) {
      console.error("Error checking achievements:", error);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * 💰 Claim achievement reward
   */
  const claimAchievement = async (achievementId: string) => {
    if (!playerAddress) return;

    try {
      const result = await claimReward({
        playerAddress,
        achievementId,
      });

      const successMsg = `🎉 Claimed ${result.reward} coins from "${result.achievementName}"!`;
      console.log(successMsg);

      // Use custom callback or fallback to alert
      if (onSuccess) {
        onSuccess(successMsg);
      } else {
        alert(successMsg);
      }

      return result;
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to claim reward";
      console.error(errorMsg);

      // Use custom callback or fallback to alert
      if (onError) {
        onError(errorMsg);
      } else {
        alert(errorMsg);
      }

      throw error;
    }
  };

  /**
   * 💰 Claim all unclaimed rewards
   */
  const claimAllUnclaimed = async () => {
    if (!playerAddress || !unclaimed || unclaimed.length === 0) return;

    let totalClaimed = 0;
    let successCount = 0;

    for (const achievement of unclaimed) {
      try {
        const result = await claimReward({
          playerAddress,
          achievementId: achievement.achievementId,
        });
        totalClaimed += result.reward;
        successCount++;
      } catch (error) {
        console.error(`Failed to claim ${achievement.achievementId}:`, error);
      }
    }

    if (successCount > 0) {
      const successMsg = `🎉 Claimed ${totalClaimed} coins from ${successCount} achievement${
          successCount > 1 ? "s" : ""
        }!`;
      console.log(successMsg);

      // Use custom callback or fallback to alert
      if (onSuccess) {
        onSuccess(successMsg);
      } else {
        alert(successMsg);
      }
    }

    return {
      totalClaimed,
      successCount,
      failedCount: unclaimed.length - successCount,
    };
  };

  /**
   * 🤖 Auto-check when NFTs change
   */
  useEffect(() => {
    if (autoCheck && playerAddress && nfts.length > 0) {
      // Debounce: wait 1 second after NFTs change
      const timer = setTimeout(() => {
        checkAchievements();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [playerAddress, nfts.length, autoCheck]);

  return {
    // Data
    achievements,
    stats,
    unclaimed,

    // State
    isChecking,
    hasUnclaimed: (unclaimed?.length || 0) > 0,
    unclaimedCount: unclaimed?.length || 0,

    // Actions
    checkAchievements,
    claimAchievement,
    claimAllUnclaimed,
  };
}
