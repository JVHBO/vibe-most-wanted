"use client";

import { useState } from "react";
import { PlayerRaidDeckModal } from "./PlayerRaidDeckModal";

interface Contributor {
  address: string;
  username: string;
  damageDealt: number;
  attackCount: number;
}

interface CurrentBossLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  topContributors: Contributor[];
  currentBoss: {
    name: string;
    rarity: string;
    bossIndex: number;
  };
  userAddress: string;
  soundEnabled: boolean;
  t: (key: string, params?: Record<string, any>) => string;
}

export function CurrentBossLeaderboardModal({
  isOpen,
  onClose,
  topContributors,
  currentBoss,
  userAddress,
  soundEnabled,
  t,
}: CurrentBossLeaderboardModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<{
    address: string;
    username: string;
  } | null>(null);

  if (!isOpen) return null;

  const BOSS_REWARDS_BY_RARITY: Record<string, number> = {
    common: 10000,
    rare: 50000,
    epic: 250000,
    legendary: 1000000,
    mythic: 5000000,
  };

  const bossRarity = currentBoss.rarity.toLowerCase() as keyof typeof BOSS_REWARDS_BY_RARITY;
  const REWARD_POOL = BOSS_REWARDS_BY_RARITY[bossRarity];

  const totalDamage = topContributors.reduce((sum, c) => sum + c.damageDealt, 0);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4"
        onClick={onClose}
      >
        <div
          className="bg-vintage-charcoal rounded-xl border-2 border-red-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-display font-bold text-red-400 mb-2 text-center">
            {t('raidBossDamageRanking')}
          </h2>
          <p className="text-center text-vintage-burnt-gold text-sm mb-4">
            {currentBoss.name} - {currentBoss.rarity}
          </p>

          <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm font-bold text-center">
              💰 {t('raidBossRewardPoolLabel')}: {REWARD_POOL.toLocaleString()} coins
            </p>
            <p className="text-vintage-burnt-gold text-xs text-center mt-1">
              {t('raidBossRewardPoolDesc')}
            </p>
          </div>

          <div className="bg-vintage-charcoal/50 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-vintage-burnt-gold text-sm">{t('raidBossTotalDamage')}</span>
              <span className="text-vintage-neon-blue font-bold text-lg">
                {totalDamage.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {topContributors.map((contributor, index) => {
              const contributionPercent = totalDamage > 0 ? (contributor.damageDealt / totalDamage) * 100 : 0;
              const estimatedReward = Math.floor((contributor.damageDealt / totalDamage) * REWARD_POOL);

              return (
                <div
                  key={contributor.address}
                  className={`bg-vintage-black/50 rounded-lg p-3 border ${
                    contributor.address === userAddress.toLowerCase()
                      ? "border-vintage-neon-blue"
                      : "border-red-600/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xl ${
                          index === 0 ? "text-yellow-400" : index === 1 ? "text-gray-400" : index === 2 ? "text-amber-600" : "text-vintage-burnt-gold/50"
                        }`}
                      >
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <span className="text-vintage-burnt-gold font-bold text-sm">
                        {contributor.username}
                        {contributor.address === userAddress.toLowerCase() && (
                          <span className="text-vintage-neon-blue ml-1">{t('raidBossYou')}</span>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlayer({ address: contributor.address, username: contributor.username });
                      }}
                      className="px-2 py-1 bg-purple-600/80 hover:bg-purple-600 text-white text-xs rounded font-bold transition"
                    >
                      View Team
                    </button>
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <span className="text-vintage-burnt-gold text-xs">{t('raidBossDamage')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-vintage-neon-blue font-bold text-sm">
                        {contributor.damageDealt.toLocaleString()}
                      </span>
                      <span className="text-red-400 text-xs">({contributionPercent.toFixed(2)}%)</span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-vintage-black rounded overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-vintage-neon-blue to-vintage-gold transition-all duration-500"
                      style={{ width: `${Math.min(contributionPercent, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-vintage-burnt-gold text-xs">{t('raidBossEstReward')}</span>
                    <span className="text-green-400 font-bold text-sm">
                      +{estimatedReward.toLocaleString()} coins
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition"
          >
            {t('raidBossClose')}
          </button>
        </div>
      </div>

      {selectedPlayer && (
        <PlayerRaidDeckModal
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          playerAddress={selectedPlayer.address}
          playerUsername={selectedPlayer.username}
          soundEnabled={soundEnabled}
          t={t}
        />
      )}
    </>
  );
}
