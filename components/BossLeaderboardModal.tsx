"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";

interface BossLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  bossIndex: number;
  userAddress: string;
  soundEnabled: boolean;
  t: (key: string, params?: Record<string, any>) => string;
}

/**
 * Boss Leaderboard History Modal
 *
 * Shows the final leaderboard for a defeated boss with:
 * - Boss info (name, rarity, image)
 * - Top 10 contributors
 * - Rewards distributed
 * - User's rank and performance
 */
export function BossLeaderboardModal({
  isOpen,
  onClose,
  bossIndex,
  userAddress,
  soundEnabled,
  t,
}: BossLeaderboardModalProps) {
  // Fetch boss leaderboard history
  const bossHistory = useQuery(api.raidBoss.getBossLeaderboard, { bossIndex });

  if (!isOpen) return null;

  // Loading state
  if (bossHistory === undefined) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4">
        <div className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-vintage-gold border-t-transparent mx-auto mb-4"></div>
            <p className="text-vintage-gold">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // No history found
  if (!bossHistory) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4">
        <div className="bg-vintage-charcoal rounded-xl border-2 border-red-600 max-w-md w-full p-6">
          <h2 className="text-xl font-display font-bold text-red-400 mb-4 text-center">
            No Leaderboard Found
          </h2>
          <p className="text-vintage-ice/70 text-center mb-4">
            This boss hasn't been defeated yet.
          </p>
          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonClick();
              onClose();
            }}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Find user's rank
  const userRank = bossHistory.topContributors.findIndex(
    (c: { address: string }) => c.address.toLowerCase() === userAddress.toLowerCase()
  );
  const userContribution = userRank !== -1 ? bossHistory.topContributors[userRank] : null;

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Boss Info */}
        <div className="sticky top-0 bg-vintage-charcoal border-b-2 border-vintage-gold/30 p-4 z-10">
          <div className="flex items-center gap-4">
            {/* Boss Image */}
            <div className="w-20 h-28 relative flex-shrink-0">
              <img
                src={bossHistory.imageUrl}
                alt={bossHistory.name}
                className="w-full h-full object-cover rounded-lg border-2 border-red-600"
              />
            </div>

            {/* Boss Details */}
            <div className="flex-1">
              <h2 className="text-xl font-display font-bold text-red-400 mb-1">
                {bossHistory.name}
              </h2>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  bossHistory.rarity === 'Mythic' ? 'bg-purple-600 text-white' :
                  bossHistory.rarity === 'Legendary' ? 'bg-orange-600 text-white' :
                  bossHistory.rarity === 'Epic' ? 'bg-purple-500 text-white' :
                  bossHistory.rarity === 'Rare' ? 'bg-blue-500 text-white' :
                  'bg-gray-500 text-white'
                }`}>
                  {bossHistory.rarity}
                </span>
                <span className="text-vintage-ice/70 text-xs">
                  Boss #{bossIndex}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-vintage-ice/70">HP:</span>
                  <span className="text-red-400 font-bold ml-1">
                    {bossHistory.maxHp.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-vintage-ice/70">Duration:</span>
                  <span className="text-vintage-neon-blue font-bold ml-1">
                    {formatDuration(bossHistory.duration)}
                  </span>
                </div>
                <div>
                  <span className="text-vintage-ice/70">Players:</span>
                  <span className="text-vintage-gold font-bold ml-1">
                    {bossHistory.totalPlayers}
                  </span>
                </div>
                <div>
                  <span className="text-vintage-ice/70">Attacks:</span>
                  <span className="text-green-400 font-bold ml-1">
                    {bossHistory.totalAttacks.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Defeated Badge */}
          <div className="mt-3 bg-red-600/20 border border-red-600/50 rounded-lg p-2 text-center">
            <p className="text-red-400 font-bold text-sm">
              ⚔️ DEFEATED ⚔️
            </p>
            <p className="text-vintage-ice/70 text-xs">
              {new Date(bossHistory.defeatedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* User's Performance (if participated) */}
        {userContribution && (
          <div className="p-4 bg-vintage-neon-blue/10 border-b-2 border-vintage-neon-blue/30">
            <h3 className="text-vintage-neon-blue font-display font-bold mb-2 text-center">
              🎯 Your Performance
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-vintage-charcoal/50 rounded-lg p-2">
                <p className="text-vintage-ice/70 text-xs mb-1">Rank</p>
                <p className="text-vintage-gold font-bold text-xl">
                  {userRank === 0 ? '🥇' : userRank === 1 ? '🥈' : userRank === 2 ? '🥉' : `#${userRank + 1}`}
                </p>
              </div>
              <div className="bg-vintage-charcoal/50 rounded-lg p-2">
                <p className="text-vintage-ice/70 text-xs mb-1">Damage</p>
                <p className="text-red-400 font-bold text-lg">
                  {userContribution.damage.toLocaleString()}
                </p>
              </div>
              <div className="bg-vintage-charcoal/50 rounded-lg p-2">
                <p className="text-vintage-ice/70 text-xs mb-1">Reward</p>
                <p className="text-green-400 font-bold text-lg">
                  +{userContribution.reward}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="p-4">
          <h3 className="text-lg font-display font-bold text-vintage-gold mb-3 text-center">
            🏆 Final Leaderboard
          </h3>

          <div className="space-y-2">
            {bossHistory.topContributors.map((contributor: { address: string; username: string; damage: number; reward: number }, index: number) => {
              const isUser = contributor.address.toLowerCase() === userAddress.toLowerCase();
              const contributionPercent =
                bossHistory.totalDamage > 0
                  ? (contributor.damage / bossHistory.totalDamage) * 100
                  : 0;

              return (
                <div
                  key={contributor.address}
                  className={`p-3 rounded-lg transition-all ${
                    isUser
                      ? 'bg-vintage-neon-blue/20 border-2 border-vintage-neon-blue/50 scale-105'
                      : 'bg-vintage-charcoal/50 border border-vintage-gold/20'
                  }`}
                >
                  {/* Rank & Username */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold w-8 text-lg ${
                          index === 0
                            ? 'text-yellow-400'
                            : index === 1
                            ? 'text-gray-300'
                            : index === 2
                            ? 'text-orange-400'
                            : 'text-red-400'
                        }`}
                      >
                        {index === 0
                          ? '🥇'
                          : index === 1
                          ? '🥈'
                          : index === 2
                          ? '🥉'
                          : `#${index + 1}`}
                      </span>
                      <span className="text-vintage-gold font-bold">
                        {contributor.username}
                        {isUser && (
                          <span className="text-vintage-neon-blue ml-1 text-sm">(You)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-vintage-ice/70 text-xs">Damage</span>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-bold">
                        {contributor.damage.toLocaleString()}
                      </span>
                      <span className="text-vintage-ice/50 text-xs">
                        ({contributionPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  {/* Contribution Bar */}
                  <div className="w-full h-2 bg-vintage-black rounded overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500"
                      style={{ width: `${contributionPercent}%` }}
                    />
                  </div>

                  {/* Reward */}
                  <div className="flex items-center justify-between">
                    <span className="text-vintage-ice/70 text-xs">Reward</span>
                    <span className="text-green-400 font-bold">
                      +{contributor.reward.toLocaleString()} $TESTVBMS
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Rewards */}
          <div className="mt-4 bg-green-600/20 border border-green-600/50 rounded-lg p-3 text-center">
            <p className="text-green-400 font-bold">
              Total Rewards Distributed: {bossHistory.topContributors.reduce((sum, c) => sum + c.reward, 0).toLocaleString()} $TESTVBMS
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="sticky bottom-0 bg-vintage-charcoal border-t-2 border-vintage-gold/30 p-4">
          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonClick();
              onClose();
            }}
            className="w-full px-4 py-3 bg-vintage-gold hover:bg-vintage-gold/80 text-vintage-black rounded-lg font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
