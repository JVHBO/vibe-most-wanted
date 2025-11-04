"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface QuestPanelProps {
  playerAddress: string;
  soundEnabled: boolean;
  onClose: () => void;
}

export function QuestPanel({ playerAddress, soundEnabled, onClose }: QuestPanelProps) {
  const [isClaiming, setIsClaiming] = useState(false);

  // Fetch daily quest and progress
  const dailyQuest = useQuery(api.quests.getDailyQuest);
  const questProgress = useQuery(api.quests.getQuestProgress, {
    address: playerAddress.toLowerCase(),
  });

  const claimReward = useMutation(api.quests.claimQuestReward);

  const handleClaim = async () => {
    if (!questProgress || questProgress.claimed || isClaiming) return;

    setIsClaiming(true);
    try {
      await claimReward({ address: playerAddress.toLowerCase() });
      // Play success sound if enabled
      if (soundEnabled && typeof window !== 'undefined') {
        const audio = new Audio('/marvin-victory.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
    } catch (error) {
      console.error("Failed to claim quest reward:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  if (!dailyQuest) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500]" onClick={onClose}>
        <div className="bg-vintage-black border-2 border-vintage-gold rounded-xl p-6 max-w-md w-full mx-4">
          <p className="text-vintage-ice text-center">Loading quests...</p>
        </div>
      </div>
    );
  }

  const progress = questProgress?.progress || 0;
  const target = dailyQuest.requirement.count || 1;
  const isCompleted = progress >= target;
  const canClaim = isCompleted && !questProgress?.claimed;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500]" onClick={onClose}>
      <div
        className="bg-vintage-black border-2 border-vintage-gold rounded-xl p-6 max-w-md w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold"
        >
          ×
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-vintage-gold mb-1">📋 Daily Quest</h2>
          <p className="text-sm text-vintage-silver">Complete to earn coins!</p>
        </div>

        {/* Quest info */}
        <div className="bg-vintage-deep-black border border-vintage-burnt-gold rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-vintage-ice font-semibold mb-1">{dailyQuest.description}</p>
              <p className="text-sm text-vintage-silver">
                Difficulty: <span className="text-vintage-gold">{dailyQuest.difficulty}</span>
              </p>
            </div>
            <div className="text-right ml-4">
              <p className="text-2xl font-bold text-vintage-gold">+{dailyQuest.reward}</p>
              <p className="text-xs text-vintage-silver">coins</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-vintage-silver">Progress</span>
              <span className={isCompleted ? "text-green-400" : "text-vintage-ice"}>
                {progress} / {target}
              </span>
            </div>
            <div className="w-full bg-vintage-deep-black border border-vintage-burnt-gold rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isCompleted ? "bg-green-500" : "bg-vintage-gold"
                }`}
                style={{ width: `${Math.min((progress / target) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Claim button or status */}
        {questProgress?.claimed ? (
          <div className="bg-green-900/30 border border-green-500 rounded-lg p-3 text-center">
            <p className="text-green-400 font-semibold">✓ Reward Claimed!</p>
            <p className="text-sm text-green-300 mt-1">Come back tomorrow for a new quest</p>
          </div>
        ) : canClaim ? (
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClaiming ? "Claiming..." : `🎁 Claim +${dailyQuest.reward} Coins`}
          </button>
        ) : (
          <div className="bg-vintage-deep-black border border-vintage-burnt-gold rounded-lg p-3 text-center">
            <p className="text-vintage-silver">Keep playing to complete this quest!</p>
            <p className="text-sm text-vintage-burnt-gold mt-1">
              {target - progress} more to go
            </p>
          </div>
        )}

        {/* Info footer */}
        <div className="mt-4 text-center text-xs text-vintage-burnt-gold">
          Quests reset daily at 00:00 UTC
        </div>
      </div>
    </div>
  );
}
