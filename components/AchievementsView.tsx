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

  const [filter, setFilter] = useState<string>("all");
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
      <div className="min-h-screen bg-vintage-deep-black text-vintage-ice flex items-center justify-center p-4">
        <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-display font-bold text-vintage-gold mb-2">Connect Wallet</h2>
          <p className="text-vintage-burnt-gold">Please connect your wallet to view achievements</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vintage-deep-black text-vintage-ice py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2 flex items-center gap-3 text-vintage-gold">
            🏆 Achievements
          </h1>
          <p className="text-vintage-burnt-gold font-modern">
            Collect cards and unlock achievements to earn $TESTVBMS coins
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Completed Stats */}
            <div className="bg-vintage-charcoal/80 backdrop-blur-md rounded-xl p-6 border-2 border-vintage-gold/20 shadow-gold hover:border-vintage-gold/40 transition-colors">
              <div className="text-4xl mb-2">📊</div>
              <div className="text-3xl font-bold text-vintage-gold font-modern">
                {stats.completedCount}/{stats.totalAchievements}
              </div>
              <div className="text-sm text-vintage-burnt-gold font-modern">Completed</div>
              <div className="mt-3 bg-vintage-black/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-vintage-gold to-vintage-gold-dark h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Coins to Claim */}
            <div className="bg-vintage-charcoal/80 backdrop-blur-md rounded-xl p-6 border-2 border-vintage-gold/20 shadow-gold hover:border-vintage-gold/40 transition-colors">
              <div className="text-4xl mb-2">💰</div>
              <div className="text-3xl font-bold text-vintage-gold font-modern">{stats.unclaimedRewards}</div>
              <div className="text-sm text-vintage-burnt-gold font-modern">Coins to Claim</div>
              <div className="text-xs text-vintage-gold/70 mt-2 font-modern">
                {stats.unclaimedCount} unclaimed
              </div>
            </div>

            {/* Rewards Claimed */}
            <div className="bg-vintage-charcoal/80 backdrop-blur-md rounded-xl p-6 border-2 border-vintage-gold/20 shadow-gold hover:border-vintage-gold/40 transition-colors">
              <div className="text-4xl mb-2">🎯</div>
              <div className="text-3xl font-bold text-vintage-gold font-modern">{stats.claimedCount}</div>
              <div className="text-sm text-vintage-burnt-gold font-modern">Rewards Claimed</div>
            </div>

            {/* Completion % */}
            <div className="bg-vintage-charcoal/80 backdrop-blur-md rounded-xl p-6 border-2 border-vintage-gold/20 shadow-gold hover:border-vintage-gold/40 transition-colors">
              <div className="text-4xl mb-2">⭐</div>
              <div className="text-3xl font-bold text-vintage-gold font-modern">{stats.completionPercentage}%</div>
              <div className="text-sm text-vintage-burnt-gold font-modern">Completion</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={handleClaimAll}
            disabled={isClaiming || !unclaimed || unclaimed.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-vintage-gold to-vintage-gold-dark rounded-lg font-bold font-modern text-vintage-black hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-gold"
          >
            💰 Claim All ({stats?.unclaimedCount || 0})
          </button>

          <button
            onClick={checkAchievements}
            disabled={isChecking}
            className="px-6 py-3 bg-vintage-charcoal/80 border-2 border-vintage-gold/30 rounded-lg font-medium font-modern text-vintage-gold hover:border-vintage-gold hover:bg-vintage-charcoal transition-colors disabled:opacity-50"
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
              className={`px-4 py-2 rounded-lg font-medium font-modern transition-all ${
                filter === f.id
                  ? "bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black shadow-gold"
                  : "bg-vintage-charcoal/60 border border-vintage-gold/20 text-vintage-gold hover:border-vintage-gold/50"
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
                  className={`rounded-xl p-6 border-2 relative overflow-hidden backdrop-blur-md ${
                    isClaimed
                      ? "bg-vintage-charcoal/40 border-vintage-gold-metallic/30"
                      : isCompleted
                      ? "bg-vintage-charcoal/80 border-vintage-gold animate-pulse shadow-gold"
                      : "bg-vintage-charcoal/60 border-vintage-gold/10"
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
                        <div className="bg-vintage-gold-metallic text-vintage-black text-xs px-2 py-1 rounded-full font-bold font-modern">
                          ✓ CLAIMED
                        </div>
                      )}
                      {isCompleted && !isClaimed && (
                        <div className="bg-vintage-gold text-vintage-black text-xs px-2 py-1 rounded-full font-bold font-modern animate-bounce">
                          🎉 READY!
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-bold mb-2 text-vintage-gold font-display">{achievement.name}</h3>
                    <p className="text-sm text-vintage-burnt-gold mb-4 font-modern">
                      {achievement.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1 font-modern">
                        <span className="text-vintage-ice">
                          {progress}/{target}
                        </span>
                        <span className="text-vintage-gold font-bold">
                          💰 {achievement.reward} coins
                        </span>
                      </div>
                      <div className="bg-vintage-black/50 rounded-full h-3 overflow-hidden border border-vintage-gold/20">
                        <div
                          style={{ width: `${progressPercentage}%` }}
                          className={`h-3 rounded-full transition-all duration-500 ${
                            isCompleted
                              ? "bg-gradient-to-r from-vintage-gold to-vintage-gold-dark shadow-gold"
                              : "bg-gradient-to-r from-vintage-gold-metallic to-vintage-burnt-gold"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Claim Button */}
                    {isCompleted && !isClaimed && (
                      <button
                        onClick={() => handleClaim(achievement.id)}
                        disabled={isClaiming}
                        className="w-full py-2 bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black rounded-lg font-bold font-modern hover:scale-105 transition-transform disabled:opacity-50 shadow-gold"
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
          <div className="text-center py-12 bg-vintage-charcoal/60 rounded-2xl border-2 border-vintage-gold/20">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-xl text-vintage-burnt-gold font-modern">
              No achievements match this filter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
