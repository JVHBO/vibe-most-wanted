"use client";

/**
 * Raid Leaderboard Page
 *
 * Full-screen leaderboard page showing:
 * - Current boss contributors (when boss param is "current" or absent)
 * - Historical boss leaderboards (when boss param is a number)
 */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AudioManager } from "@/lib/audio-manager";
import { CardMedia } from "@/components/CardMedia";
import LoadingSpinner from "@/components/LoadingSpinner";
import { PriceTicker } from "@/components/PriceTicker";
import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";

// Player Raid Deck View Component
function PlayerRaidDeckView({
  playerAddress,
  playerUsername,
  onClose,
}: {
  playerAddress: string;
  playerUsername: string;
  onClose: () => void;
}) {
  const playerDeck = useQuery(api.raidBoss.getPlayerRaidDeckByAddress, {
    address: playerAddress,
  });

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[350] p-4"
      onClick={onClose}
    >
      <div
        className="bg-vintage-charcoal rounded-xl border-2 border-purple-600 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-purple-400">
            {playerUsername}'s Raid Team
          </h2>
          <button
            onClick={onClose}
            className="text-vintage-burnt-gold hover:text-red-400 text-2xl"
          >
            ×
          </button>
        </div>

        {playerDeck === undefined ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto mb-2"></div>
            <p className="text-vintage-burnt-gold">Loading deck...</p>
          </div>
        ) : playerDeck === null ? (
          <div className="text-center py-8">
            <p className="text-vintage-burnt-gold text-lg">No raid deck set</p>
            <p className="text-vintage-burnt-gold/70 text-sm mt-2">
              This player hasn't configured their raid team yet.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-purple-600/20 border border-purple-600/50 rounded-lg p-3 text-center">
                <p className="text-purple-400 text-xs font-bold">Deck Power</p>
                <p className="text-vintage-burnt-gold font-bold text-lg">
                  {playerDeck.deckPower?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-3 text-center">
                <p className="text-red-400 text-xs font-bold">Total Damage</p>
                <p className="text-vintage-burnt-gold font-bold text-lg">
                  {playerDeck.totalDamageDealt?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg p-3 text-center">
                <p className="text-yellow-400 text-xs font-bold">Bosses Killed</p>
                <p className="text-vintage-burnt-gold font-bold text-lg">
                  {playerDeck.bossesKilled || 0}
                </p>
              </div>
            </div>

            <h3 className="text-lg font-bold text-vintage-burnt-gold mb-3">
              Attack Deck ({playerDeck.deck?.length || 0}/5)
            </h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {playerDeck.deck?.map((card: any, index: number) => (
                <div
                  key={card.tokenId || index}
                  className="relative bg-vintage-black rounded-lg overflow-hidden border-2 border-purple-600/50"
                >
                  <CardMedia
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full aspect-[2/3] object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1">
                    <p className="text-vintage-burnt-gold text-xs text-center font-bold">
                      {card.power}
                    </p>
                  </div>
                </div>
              ))}
              {Array.from({ length: 5 - (playerDeck.deck?.length || 0) }).map(
                (_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="aspect-[2/3] bg-vintage-black/50 rounded-lg border-2 border-dashed border-purple-600/30 flex items-center justify-center"
                  >
                    <span className="text-purple-600/50 text-2xl">?</span>
                  </div>
                )
              )}
            </div>

            {playerDeck.vibefidCard && (
              <>
                <h3 className="text-lg font-bold text-cyan-400 mb-3">
                  VibeFID Card (Bonus Slot)
                </h3>
                <div className="flex justify-center mb-4">
                  <div className="relative w-24 bg-vintage-black rounded-lg overflow-hidden border-2 border-cyan-500">
                    <CardMedia
                      src={playerDeck.vibefidCard.imageUrl}
                      alt={playerDeck.vibefidCard.name}
                      className="w-full aspect-[2/3] object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1">
                      <p className="text-cyan-400 text-xs text-center font-bold">
                        {((playerDeck.vibefidCard.power || 0) * 10).toLocaleString()} <span className="text-purple-400">(10x)</span>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Current Boss Leaderboard
function CurrentBossLeaderboard({
  userAddress,
  soundEnabled,
  t,
}: {
  userAddress: string;
  soundEnabled: boolean;
  t: (key: string, params?: Record<string, any>) => string;
}) {
  const router = useRouter();
  const [selectedPlayer, setSelectedPlayer] = useState<{
    address: string;
    username: string;
  } | null>(null);

  const currentBoss = useQuery(api.raidBoss.getCurrentRaidBoss);
  const topContributors = useQuery(api.raidBoss.getTopContributors, { limit: 100 });

  if (!currentBoss || !topContributors) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  const BOSS_REWARDS_BY_RARITY: Record<string, number> = {
    common: 10000,
    rare: 50000,
    epic: 250000,
    legendary: 1000000,
    mythic: 5000000,
  };

  const bossRarity = currentBoss.rarity.toLowerCase() as keyof typeof BOSS_REWARDS_BY_RARITY;
  const REWARD_POOL = BOSS_REWARDS_BY_RARITY[bossRarity];
  const totalDamage = topContributors.reduce((sum: number, c: { damageDealt: number }) => sum + c.damageDealt, 0);

  return (
    <>
      <div className="max-w-4xl mx-auto">
        {/* Boss Info Header */}
        <div className="bg-red-600/20 border border-red-600/50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-28 flex-shrink-0">
              <CardMedia
                src={currentBoss.imageUrl}
                alt={currentBoss.name}
                className="w-full h-full object-cover rounded-lg border-2 border-red-600"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-display font-bold text-red-400">
                {currentBoss.name}
              </h2>
              <p className="text-vintage-burnt-gold text-sm">
                {currentBoss.rarity} Boss • Currently Active
              </p>
              <div className="mt-2">
                <div className="w-full h-3 bg-vintage-black rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-1000"
                    style={{ width: `${(currentBoss.currentHp / currentBoss.maxHp) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-vintage-burnt-gold mt-1">
                  {currentBoss.currentHp.toLocaleString()} / {currentBoss.maxHp.toLocaleString()} HP
                </p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-red-400 font-bold">
              Reward Pool: {REWARD_POOL.toLocaleString()} $TESTVBMS
            </p>
            <p className="text-vintage-burnt-gold text-xs mt-1">
              Distributed proportionally based on damage dealt
            </p>
          </div>
        </div>

        {/* Total Damage */}
        <div className="bg-vintage-charcoal/50 rounded-lg p-4 mb-6 text-center">
          <span className="text-vintage-burnt-gold text-sm">Total Community Damage</span>
          <p className="text-vintage-neon-blue font-bold text-2xl">
            {totalDamage.toLocaleString()}
          </p>
        </div>

        {/* Leaderboard */}
        <div className="space-y-3">
          {topContributors.map((contributor: { address: string; username: string; damageDealt: number; attackCount: number }, index: number) => {
            const contributionPercent = totalDamage > 0 ? (contributor.damageDealt / totalDamage) * 100 : 0;
            const estimatedReward = Math.floor((contributor.damageDealt / totalDamage) * REWARD_POOL);
            const isUser = contributor.address === userAddress.toLowerCase();

            return (
              <div
                key={contributor.address}
                className={`bg-vintage-black/50 rounded-lg p-4 border ${
                  isUser
                    ? "border-vintage-neon-blue shadow-lg shadow-vintage-neon-blue/20"
                    : "border-red-600/30"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-2xl ${
                        index === 0 ? "text-yellow-400" : index === 1 ? "text-gray-400" : index === 2 ? "text-amber-600" : "text-vintage-burnt-gold/50"
                      }`}
                    >
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <span className="text-vintage-burnt-gold font-bold">
                      {contributor.username}
                      {isUser && (
                        <span className="text-vintage-neon-blue ml-2">(You)</span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (soundEnabled) AudioManager.buttonClick();
                      setSelectedPlayer({ address: contributor.address, username: contributor.username });
                    }}
                    className="px-3 py-1 bg-purple-600/80 hover:bg-purple-600 text-white text-sm rounded font-bold transition"
                  >
                    View Team
                  </button>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-vintage-burnt-gold text-sm">Damage</span>
                  <div className="flex items-center gap-2">
                    <span className="text-vintage-neon-blue font-bold">
                      {contributor.damageDealt.toLocaleString()}
                    </span>
                    <span className="text-red-400 text-xs">({contributionPercent.toFixed(2)}%)</span>
                  </div>
                </div>

                <div className="w-full h-2 bg-vintage-black rounded overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-vintage-neon-blue to-vintage-gold transition-all duration-500"
                    style={{ width: `${Math.min(contributionPercent, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-vintage-burnt-gold text-sm">Est. Reward</span>
                  <span className="text-green-400 font-bold">
                    +{estimatedReward.toLocaleString()} coins
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player Deck Modal */}
      {selectedPlayer && (
        <PlayerRaidDeckView
          playerAddress={selectedPlayer.address}
          playerUsername={selectedPlayer.username}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  );
}

// Historical Boss Leaderboard
function HistoricalBossLeaderboard({
  bossIndex,
  userAddress,
  soundEnabled,
  t,
}: {
  bossIndex: number;
  userAddress: string;
  soundEnabled: boolean;
  t: (key: string, params?: Record<string, any>) => string;
}) {
  const bossHistory = useQuery(api.raidBoss.getBossLeaderboard, { bossIndex });

  if (bossHistory === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (!bossHistory) {
    return (
      <div className="max-w-md mx-auto bg-vintage-charcoal rounded-xl border-2 border-red-600 p-6 text-center">
        <h2 className="text-xl font-display font-bold text-red-400 mb-4">
          No Leaderboard Found
        </h2>
        <p className="text-vintage-ice/70 mb-4">
          This boss hasn't been defeated yet.
        </p>
      </div>
    );
  }

  const userRank = bossHistory.topContributors.findIndex(
    (c: { address: string }) => c.address.toLowerCase() === userAddress.toLowerCase()
  );
  const userContribution = userRank !== -1 ? bossHistory.topContributors[userRank] : null;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Boss Header */}
      <div className="bg-vintage-charcoal border-b-2 border-vintage-gold/30 p-6 rounded-t-xl">
        <div className="flex items-center gap-4">
          <div className="w-20 h-28 relative flex-shrink-0">
            <img
              src={bossHistory.imageUrl}
              alt={bossHistory.name}
              className="w-full h-full object-cover rounded-lg border-2 border-red-600"
            />
          </div>

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
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

        <div className="mt-4 bg-red-600/20 border border-red-600/50 rounded-lg p-3 text-center">
          <p className="text-red-400 font-bold text-sm">DEFEATED</p>
          <p className="text-vintage-ice/70 text-xs">
            {new Date(bossHistory.defeatedAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* User Performance */}
      {userContribution && (
        <div className="p-4 bg-vintage-neon-blue/10 border-b-2 border-vintage-neon-blue/30">
          <h3 className="text-vintage-neon-blue font-display font-bold mb-3 text-center">
            Your Performance
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-vintage-charcoal/50 rounded-lg p-3">
              <p className="text-vintage-ice/70 text-xs mb-1">Rank</p>
              <p className="text-vintage-gold font-bold text-xl">
                {userRank === 0 ? '🥇' : userRank === 1 ? '🥈' : userRank === 2 ? '🥉' : `#${userRank + 1}`}
              </p>
            </div>
            <div className="bg-vintage-charcoal/50 rounded-lg p-3">
              <p className="text-vintage-ice/70 text-xs mb-1">Damage</p>
              <p className="text-red-400 font-bold text-lg">
                {userContribution.damage.toLocaleString()}
              </p>
            </div>
            <div className="bg-vintage-charcoal/50 rounded-lg p-3">
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
        <h3 className="text-lg font-display font-bold text-vintage-gold mb-4 text-center">
          Final Leaderboard
        </h3>

        <div className="space-y-3">
          {bossHistory.topContributors.map((contributor: { address: string; username: string; damage: number; reward: number }, index: number) => {
            const isUser = contributor.address.toLowerCase() === userAddress.toLowerCase();
            const contributionPercent =
              bossHistory.totalDamage > 0
                ? (contributor.damage / bossHistory.totalDamage) * 100
                : 0;

            return (
              <div
                key={contributor.address}
                className={`p-4 rounded-lg transition-all ${
                  isUser
                    ? 'bg-vintage-neon-blue/20 border-2 border-vintage-neon-blue/50'
                    : 'bg-vintage-charcoal/50 border border-vintage-gold/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold text-lg ${
                        index === 0
                          ? 'text-yellow-400'
                          : index === 1
                          ? 'text-gray-300'
                          : index === 2
                          ? 'text-orange-400'
                          : 'text-red-400'
                      }`}
                    >
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <span className="text-vintage-gold font-bold">
                      {contributor.username}
                      {isUser && (
                        <span className="text-vintage-neon-blue ml-1 text-sm">(You)</span>
                      )}
                    </span>
                  </div>
                </div>

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

                <div className="w-full h-2 bg-vintage-black rounded overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500"
                    style={{ width: `${contributionPercent}%` }}
                  />
                </div>

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

        <div className="mt-4 bg-green-600/20 border border-green-600/50 rounded-lg p-3 text-center">
          <p className="text-green-400 font-bold">
            Total Rewards Distributed: {bossHistory.topContributors.reduce((sum: number, c: { reward: number }) => sum + c.reward, 0).toLocaleString()} $TESTVBMS
          </p>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
function LeaderboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnecting } = useAccount();
  const { t } = useLanguage();
  const [soundEnabled] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const bossParam = searchParams.get('boss');
  const isCurrentBoss = !bossParam || bossParam === 'current';
  const bossIndex = isCurrentBoss ? null : parseInt(bossParam, 10);

  if (!isMounted || isConnecting) {
    return (
      <div className="min-h-screen bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!address) {
    return (
      <div className="min-h-screen bg-vintage-deep-black text-white">
        <PriceTicker />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-2xl font-display font-bold text-vintage-gold mb-4">
              Raid Leaderboard
            </h1>
            <p className="text-vintage-burnt-gold text-lg mb-6">
              Connect your wallet to view leaderboard
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-vintage-gold text-vintage-black rounded-lg font-bold hover:bg-vintage-ice transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vintage-deep-black flex flex-col">
      <PriceTicker />

      {/* Header */}
      <div className="flex-shrink-0 bg-vintage-charcoal border-b-2 border-vintage-gold/30 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonNav();
              router.push('/raid');
            }}
            className="px-4 py-2 bg-vintage-black hover:bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg font-bold text-sm transition"
          >
            ← Back to Raid
          </button>
          <h1 className="text-xl md:text-2xl font-display font-bold text-vintage-gold">
            {isCurrentBoss ? 'Current Boss Leaderboard' : `Boss #${bossIndex} Leaderboard`}
          </h1>
          <div className="w-24" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isCurrentBoss ? (
          <CurrentBossLeaderboard
            userAddress={address}
            soundEnabled={soundEnabled}
            t={t as (key: string, params?: Record<string, any>) => string}
          />
        ) : bossIndex !== null && !isNaN(bossIndex) ? (
          <HistoricalBossLeaderboard
            bossIndex={bossIndex}
            userAddress={address}
            soundEnabled={soundEnabled}
            t={t as (key: string, params?: Record<string, any>) => string}
          />
        ) : (
          <div className="text-center py-16">
            <p className="text-vintage-burnt-gold">Invalid boss parameter</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function RaidLeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <LeaderboardContent />
    </Suspense>
  );
}
