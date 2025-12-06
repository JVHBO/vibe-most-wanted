"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SOCIAL_QUESTS, type SocialQuest } from "@/lib/socialQuests";
import { AudioManager } from "@/lib/audio-manager";

interface SocialQuestsPanelProps {
  address: string;
  userFid?: number;
  soundEnabled?: boolean;
  onRewardClaimed?: (amount: number) => void;
}

export function SocialQuestsPanel({
  address,
  userFid,
  soundEnabled = true,
  onRewardClaimed,
}: SocialQuestsPanelProps) {
  const [verifying, setVerifying] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set());

  // Get quest progress from backend
  const questProgress = useQuery(
    api.socialQuests.getSocialQuestProgress,
    address ? { address } : "skip"
  );

  // Mutations
  const markCompleted = useMutation(api.socialQuests.markQuestCompleted);
  const claimReward = useMutation(api.socialQuests.claimSocialQuestReward);

  // Verify quest completion via API
  const verifyQuest = async (quest: SocialQuest) => {
    if (!userFid) {
      window.open(quest.url, "_blank");
      return;
    }

    setVerifying(quest.id);

    try {
      const response = await fetch("/api/social-quest/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questId: quest.id,
          userFid,
        }),
      });

      const data = await response.json();

      if (data.completed) {
        // Mark as completed in backend
        await markCompleted({ address, questId: quest.id });
        setLocalCompleted((prev) => new Set([...prev, quest.id]));
        if (soundEnabled) AudioManager.buttonSuccess();
      } else {
        // Open link to complete
        window.open(quest.url, "_blank");
        if (soundEnabled) AudioManager.buttonClick();
      }
    } catch (error) {
      console.error("Error verifying quest:", error);
      window.open(quest.url, "_blank");
    } finally {
      setVerifying(null);
    }
  };

  // Claim reward
  const handleClaim = async (quest: SocialQuest) => {
    setClaiming(quest.id);

    try {
      const result = await claimReward({ address, questId: quest.id });
      if (result.success) {
        if (soundEnabled) AudioManager.win();
        onRewardClaimed?.(result.reward);
      }
    } catch (error) {
      console.error("Error claiming reward:", error);
      if (soundEnabled) AudioManager.buttonError();
    } finally {
      setClaiming(null);
    }
  };

  // Get quest status
  const getQuestStatus = (quest: SocialQuest) => {
    const progress = questProgress?.[quest.id];
    if (progress?.claimed) return "claimed";
    if (progress?.completed || localCompleted.has(quest.id)) return "completed";
    return "pending";
  };

  // Separate quests by type
  const channelQuests = SOCIAL_QUESTS.filter((q) => q.type === "channel");
  const followQuests = SOCIAL_QUESTS.filter((q) => q.type === "follow");

  // Calculate stats
  const totalQuests = SOCIAL_QUESTS.length;
  const completedQuests = SOCIAL_QUESTS.filter(
    (q) => getQuestStatus(q) === "claimed"
  ).length;
  const claimableQuests = SOCIAL_QUESTS.filter(
    (q) => getQuestStatus(q) === "completed"
  ).length;
  const totalPotentialReward = SOCIAL_QUESTS.reduce((sum, q) => sum + q.reward, 0);
  const claimableReward = SOCIAL_QUESTS.filter(
    (q) => getQuestStatus(q) === "completed"
  ).reduce((sum, q) => sum + q.reward, 0);

  const renderQuest = (quest: SocialQuest) => {
    const status = getQuestStatus(quest);
    const isVerifying = verifying === quest.id;
    const isClaiming = claiming === quest.id;

    return (
      <div
        key={quest.id}
        className={`p-3 rounded-lg border transition-all ${
          status === "claimed"
            ? "bg-green-900/20 border-green-500/30 opacity-60"
            : status === "completed"
            ? "bg-vintage-gold/10 border-vintage-gold/50 animate-pulse"
            : "bg-vintage-charcoal/50 border-vintage-gold/20 hover:border-vintage-gold/40"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {quest.type === "channel" ? (
              <svg className="w-5 h-5 text-vintage-gold flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.41 21L6.12 17H2.12L2.47 15H6.47L7.53 9H3.53L3.88 7H7.88L8.59 3H10.59L9.88 7H15.88L16.59 3H18.59L17.88 7H21.88L21.53 9H17.53L16.47 15H20.47L20.12 17H16.12L15.41 21H13.41L14.12 17H8.12L7.41 21H5.41ZM9.47 9L8.47 15H14.47L15.47 9H9.47Z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-vintage-gold flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-vintage-gold font-bold text-sm truncate">
                {quest.displayName}
              </p>
              <p className="text-vintage-burnt-gold text-xs truncate">
                {quest.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-vintage-gold font-bold text-sm whitespace-nowrap">
              +{quest.reward}
            </span>

            {status === "claimed" ? (
              <span className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 text-xs font-bold">
                Claimed
              </span>
            ) : status === "completed" ? (
              <button
                onClick={() => handleClaim(quest)}
                disabled={isClaiming}
                className="px-3 py-1.5 rounded-lg bg-vintage-gold text-vintage-black font-bold text-xs hover:bg-vintage-gold/90 transition-all disabled:opacity-50"
              >
                {isClaiming ? "..." : "Claim"}
              </button>
            ) : (
              <button
                onClick={() => verifyQuest(quest)}
                disabled={isVerifying}
                className="px-3 py-1.5 rounded-lg bg-vintage-charcoal border border-vintage-gold/50 text-vintage-gold font-bold text-xs hover:bg-vintage-gold/10 transition-all disabled:opacity-50"
              >
                {isVerifying ? "..." : userFid ? "Verify" : "Go"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="bg-vintage-charcoal/80 rounded-xl border-2 border-vintage-gold/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-vintage-gold font-display font-bold text-lg">
            Social Quests
          </h3>
          <div className="text-right">
            <p className="text-vintage-gold font-bold text-sm">
              {completedQuests}/{totalQuests} Complete
            </p>
            {claimableReward > 0 && (
              <p className="text-green-400 text-xs animate-pulse">
                +{claimableReward} claimable!
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-vintage-black rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-vintage-gold to-vintage-burnt-gold transition-all"
            style={{ width: `${(completedQuests / totalQuests) * 100}%` }}
          />
        </div>
        <p className="text-vintage-burnt-gold text-xs mt-2 text-center">
          Total Rewards: {totalPotentialReward} $TESTVBMS
        </p>
      </div>

      {/* Channel Quests */}
      <div className="bg-vintage-charcoal/80 rounded-xl border-2 border-vintage-gold/30 p-4">
        <h4 className="text-vintage-gold font-bold text-sm mb-3 flex items-center gap-2">
          <span>📢</span> Join Channels
        </h4>
        <div className="space-y-2">
          {channelQuests.map(renderQuest)}
        </div>
      </div>

      {/* Follow Quests */}
      <div className="bg-vintage-charcoal/80 rounded-xl border-2 border-vintage-gold/30 p-4">
        <h4 className="text-vintage-gold font-bold text-sm mb-3 flex items-center gap-2">
          <span>👤</span> Follow Creators
        </h4>
        <div className="space-y-2">
          {followQuests.map(renderQuest)}
        </div>
      </div>

      {/* No FID Warning */}
      {!userFid && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-yellow-400 text-xs text-center">
            Connect with Farcaster to auto-verify quests
          </p>
        </div>
      )}
    </div>
  );
}
