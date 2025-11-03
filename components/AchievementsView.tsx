"use client";

import React, { useState } from "react";
import { useAchievements } from "../hooks/useAchievements";

interface AchievementsViewProps {
  playerAddress?: string;
  nfts?: any[];
}

export default function AchievementsView({
  playerAddress,
  nfts = [],
}: AchievementsViewProps) {
  const {
    achievements,
    stats,
    unclaimed,
    isChecking,
    claimAchievement,
    claimAllUnclaimed,
    checkAchievements,
  } = useAchievements({
    playerAddress,
    nfts,
    autoCheck: true,
    autoNotify: true,
  });

  const [filter, setFilter] = useState<string>("all"); // all, completed, unclaimed, rarity, wear, foil, progressive
  const [isClaiming, setIsClaiming] = useState(false);

  /**
   * Handle claim single achievement
   */
  const handleClaim = async (achievementId: string) => {
    setIsClaiming(true);
    try {
      await claimAchievement(achievementId);
    } finally {
      setIsClaiming(false);
    }
  };

  /**
   * Handle claim all unclaimed
   */
  const handleClaimAll = async () => {
    setIsClaiming(true);
    try {
      await claimAllUnclaimed();
    } finally {
      setIsClaiming(false);
    }
  };

  /**
   * Filter achievements
   */
  const filteredAchievements = React.useMemo(() => {
    if (!achievements) return [];

    let filtered = [...achievements];

    if (filter === "completed") {
      filtered = filtered.filter((a) => a.completed);
    } else if (filter === "unclaimed") {
      filtered = filtered.filter((a) => a.completed && !a.claimedAt);
    } else if (filter !== "all") {
      filtered = filtered.filter((a) => a.category === filter);
    }

    return filtered;
  }, [achievements, filter]);

  if (!playerAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">🔒 Please connect your wallet to view achievements</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-indigo-900 to-black text-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            🏆 Achievements
          </h1>
          <p className="text-purple-300">
            Collect cards and unlock achievements to earn $TESTVBMS coins
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-2xl font-bold">
                {stats.completedCount}/{stats.totalAchievements}
              </div>
              <div className="text-sm text-purple-300">Completed</div>
              <div className="mt-2 bg-purple-900/50 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                  style={{ width: `${stats.completionPercentage}%` }}
                />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-2xl font-bold">{stats.unclaimedRewards}</div>
              <div className="text-sm text-purple-300">Coins to Claim</div>
              <div className="text-xs text-yellow-400 mt-2">
                {stats.unclaimedCount} unclaimed
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-2xl font-bold">{stats.claimedCount}</div>
              <div className="text-sm text-purple-300">Rewards Claimed</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-3xl mb-2">⭐</div>
              <div className="text-2xl font-bold">{stats.completionPercentage}%</div>
              <div className="text-sm text-purple-300">Completion</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={handleClaimAll}
            disabled={isClaiming || !unclaimed || unclaimed.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💰 Claim All ({stats?.unclaimedCount || 0})
          </button>

          <button
            onClick={checkAchievements}
            disabled={isChecking}
            className="px-6 py-3 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {isChecking ? "🔄 Checking..." : "🔍 Refresh Progress"}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: "all", label: "All", icon: "🎯" },
            { id: "unclaimed", label: "Unclaimed", icon: "💰" },
            { id: "completed", label: "Completed", icon: "✅" },
            { id: "rarity", label: "Rarity", icon: "💎" },
            { id: "wear", label: "Pristine", icon: "✨" },
            { id: "foil", label: "Foil", icon: "🎴" },
            { id: "progressive", label: "Progressive", icon: "📊" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f.id
                  ? "bg-gradient-to-r from-purple-500 to-pink-500"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((achievement, index) => {
              const isCompleted = achievement.completed;
              const isClaimed = achievement.claimedAt;
              const progress = achievement.progress || 0;
              const target = achievement.requirement?.count || 1;
              const progressPercentage = Math.min((progress / target) * 100, 100);

              return (
                <div
                  key={achievement.id}
                  className={`rounded-xl p-6 border-2 relative overflow-hidden ${
                    isClaimed
                      ? "bg-green-900/20 border-green-500/30"
                      : isCompleted
                      ? "bg-yellow-900/20 border-yellow-500 animate-pulse"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  {/* Background Icon */}
                  <div className="absolute top-0 right-0 text-9xl opacity-5">
                    {achievement.icon}
                  </div>

                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-4xl">{achievement.icon}</div>
                      {isClaimed && (
                        <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                          ✓ CLAIMED
                        </div>
                      )}
                      {isCompleted && !isClaimed && (
                        <div className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold animate-bounce">
                          🎉 READY!
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-bold mb-2">{achievement.name}</h3>
                    <p className="text-sm text-purple-300 mb-4">
                      {achievement.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>
                          {progress}/{target}
                        </span>
                        <span className="text-yellow-400 font-bold">
                          💰 {achievement.reward} coins
                        </span>
                      </div>
                      <div className="bg-black/30 rounded-full h-3 overflow-hidden">
                        <div
                          style={{ width: `${progressPercentage}%` }}
                          className={`h-3 rounded-full transition-all duration-500 ${
                            isCompleted
                              ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                              : "bg-gradient-to-r from-purple-500 to-pink-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Claim Button */}
                    {isCompleted && !isClaimed && (
                      <button
                        onClick={() => handleClaim(achievement.id)}
                        disabled={isClaiming}
                        className="w-full py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50"
                      >
                        💰 Claim {achievement.reward} Coins
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Empty State */}
        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-xl text-purple-300">
              No achievements match this filter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
