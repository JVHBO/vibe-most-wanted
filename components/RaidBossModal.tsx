/**
 * Raid Boss Modal Component
 *
 * Global cooperative boss battle mode where players set attack decks
 * and automatically attack the boss every 5 minutes
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AudioManager } from '@/lib/audio-manager';
import { CardMedia } from '@/components/CardMedia';
import LoadingSpinner from '@/components/LoadingSpinner';
import { RaidDeckSelectionModal } from '@/components/RaidDeckSelectionModal';
import { sortCardsByPower } from '@/lib/collections/index';
import type { Card } from '@/lib/types/card';
import { useTransferVBMS } from '@/lib/hooks/useVBMSContracts';
import { useFarcasterTransferVBMS } from '@/lib/hooks/useFarcasterVBMS';
import { CONTRACTS } from '@/lib/contracts';
import { parseEther } from 'viem';

interface RaidBossModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
  soundEnabled: boolean;
  t: (key: string, params?: Record<string, any>) => string;
  allNfts: Card[]; // All player's NFTs for deck selection
}

type NFT = Card;

export function RaidBossModal({
  isOpen,
  onClose,
  userAddress,
  soundEnabled,
  t,
  allNfts,
}: RaidBossModalProps) {
  const [showDeckSelector, setShowDeckSelector] = useState(false);
  const [selectedCards, setSelectedCards] = useState<NFT[]>([]);
  const [sortByPower, setSortByPower] = useState(true);
  const [timeUntilNextAttack, setTimeUntilNextAttack] = useState(0);
  const [isRefueling, setIsRefueling] = useState(false);
  const [refuelError, setRefuelError] = useState<string | null>(null);

  // Web3 hooks
  const { address: walletAddress } = useAccount();
  const effectiveAddress = (userAddress || walletAddress) as `0x${string}` | undefined;

  // Detect miniapp
  const isInMiniapp = typeof window !== 'undefined' && (
    window.parent !== window ||
    !!(window as any).sdk?.wallet
  );

  // Use Farcaster or Wagmi hooks based on environment
  const wagmiTransfer = useTransferVBMS();
  const farcasterTransfer = useFarcasterTransferVBMS();
  const { transfer: transferVBMS, isPending: isTransferring } = isInMiniapp ? farcasterTransfer : wagmiTransfer;

  // Convex mutations
  const refuelCardsMutation = useMutation(api.raidBoss.refuelCards);

  // Query current boss
  const currentBoss = useQuery(api.raidBoss.getCurrentRaidBoss);

  // Query player's raid deck
  const playerDeck = useQuery(api.raidBoss.getPlayerRaidDeck, {
    address: userAddress.toLowerCase(),
  });

  // Query player's contribution
  const playerContribution = useQuery(api.raidBoss.getPlayerContribution, {
    address: userAddress.toLowerCase(),
  });

  // Query top contributors
  const topContributors = useQuery(api.raidBoss.getTopContributors, { limit: 10 });

  // Calculate next attack time
  useEffect(() => {
    if (!playerDeck?.cardEnergy) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const nextAttacks = playerDeck.cardEnergy
        .map((card: { nextAttackAt?: number }) => card.nextAttackAt || 0)
        .filter((time: number) => time > now);

      if (nextAttacks.length > 0) {
        const soonest = Math.min(...nextAttacks);
        setTimeUntilNextAttack(Math.max(0, soonest - now));
      } else {
        setTimeUntilNextAttack(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playerDeck]);

  // Format time remaining
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate HP percentage
  const hpPercentage = useMemo(() => {
    if (!currentBoss) return 0;
    return (currentBoss.currentHp / currentBoss.maxHp) * 100;
  }, [currentBoss]);

  // Get HP bar color based on percentage
  const getHpBarColor = (percentage: number) => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Refuel individual card
  const handleRefuelCard = async (tokenId: string) => {
    if (!playerDeck || isRefueling) return;

    setIsRefueling(true);
    setRefuelError(null);

    try {
      console.log('⛽ Refueling card:', tokenId);

      // Transfer 1 VBMS to pool
      const txHash = await transferVBMS(
        CONTRACTS.VBMSPoolTroll as `0x${string}`,
        parseEther('1')
      );

      console.log('✅ Transfer successful, txHash:', txHash);

      // Call Convex mutation
      await refuelCardsMutation({
        address: userAddress.toLowerCase(),
        cardTokenIds: [tokenId],
        txHash,
      });

      console.log('✅ Card refueled successfully!');
      if (soundEnabled) AudioManager.buttonClick();

    } catch (error: any) {
      console.error('❌ Error refueling card:', error);
      setRefuelError(error?.message || 'Failed to refuel card');
      if (soundEnabled) AudioManager.hapticFeedback('heavy');
    } finally {
      setIsRefueling(false);
    }
  };

  // Refuel all cards (5 cards for 4 VBMS)
  const handleRefuelAll = async () => {
    if (!playerDeck || isRefueling) return;

    setIsRefueling(true);
    setRefuelError(null);

    try {
      console.log('⛽ Refueling all cards...');

      // Transfer 4 VBMS to pool
      const txHash = await transferVBMS(
        CONTRACTS.VBMSPoolTroll as `0x${string}`,
        parseEther('4')
      );

      console.log('✅ Transfer successful, txHash:', txHash);

      // Get all card token IDs
      const allTokenIds = playerDeck.deck.map((card: NFT) => card.tokenId);

      // Call Convex mutation
      await refuelCardsMutation({
        address: userAddress.toLowerCase(),
        cardTokenIds: allTokenIds,
        txHash,
      });

      console.log('✅ All cards refueled successfully!');
      if (soundEnabled) AudioManager.buttonClick();

    } catch (error: any) {
      console.error('❌ Error refueling cards:', error);
      setRefuelError(error?.message || 'Failed to refuel cards');
      if (soundEnabled) AudioManager.hapticFeedback('heavy');
    } finally {
      setIsRefueling(false);
    }
  };

  if (!isOpen) return null;

  const hasDeck = playerDeck && playerDeck.deck.length > 0;

  // Handle deck confirmation
  const handleDeckConfirm = async (deck: NFT[]) => {
    // TODO: Implement VBMS payment and deck setting
    console.log('Setting raid deck:', deck);
    setShowDeckSelector(false);
    // Will call mutation to set deck after payment confirmation
  };

  return (
    <>
      {/* Raid Deck Selection Modal */}
      <RaidDeckSelectionModal
        isOpen={showDeckSelector}
        onClose={() => setShowDeckSelector(false)}
        onConfirm={handleDeckConfirm}
        t={t}
        selectedCards={selectedCards}
        setSelectedCards={setSelectedCards}
        availableCards={allNfts}
        sortByPower={sortByPower}
        setSortByPower={setSortByPower}
        soundEnabled={soundEnabled}
        playerAddress={userAddress}
      />

      {/* Main Raid Boss Modal */}
      <div
        className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-4"
        onClick={onClose}
      >
      <div
        className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-6xl w-full p-4 md:p-6 lg:p-8 shadow-neon h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-center text-vintage-gold">
            ⚔️ RAID BOSS ⚔️
          </h2>
          <p className="text-center text-vintage-burnt-gold text-sm mt-2">
            Cooperative Global Boss Battle
          </p>
        </div>

        {/* Loading State */}
        {!currentBoss && (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}

        {/* Boss Display */}
        {currentBoss && (
          <div className="flex-1 overflow-y-auto">
            {/* Boss Card & HP */}
            <div className="mb-6 bg-vintage-black/50 rounded-xl p-4 border-2 border-vintage-gold/30">
              <div className="flex flex-col md:flex-row items-center gap-4">
                {/* Boss Card Image */}
                <div className="w-48 h-72 flex-shrink-0 relative rounded-xl overflow-hidden border-4 border-vintage-gold shadow-neon">
                  <CardMedia
                    src={currentBoss.imageUrl}
                    alt={currentBoss.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-vintage-gold text-vintage-black px-2 py-1 rounded text-xs font-bold">
                    {currentBoss.rarity}
                  </div>
                </div>

                {/* Boss Info */}
                <div className="flex-1 w-full">
                  <h3 className="text-xl md:text-2xl font-display font-bold text-vintage-neon-blue mb-2">
                    {currentBoss.name}
                  </h3>
                  <p className="text-vintage-burnt-gold text-sm mb-4">
                    {currentBoss.collection.toUpperCase()} - {currentBoss.rarity}
                  </p>

                  {/* HP Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-vintage-gold font-bold">HP</span>
                      <span className="text-vintage-neon-blue font-bold">
                        {currentBoss.currentHp.toLocaleString()} / {currentBoss.maxHp.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-8 bg-vintage-black rounded-lg overflow-hidden border-2 border-vintage-gold/50">
                      <div
                        className={`h-full ${getHpBarColor(hpPercentage)} transition-all duration-1000 flex items-center justify-center`}
                        style={{ width: `${hpPercentage}%` }}
                      >
                        <span className="text-white font-bold text-xs drop-shadow-lg">
                          {hpPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Next Attack Timer */}
                  {hasDeck && timeUntilNextAttack > 0 && (
                    <div className="bg-vintage-gold/20 border border-vintage-gold/50 rounded-lg p-3 mt-4">
                      <p className="text-vintage-gold text-sm font-bold text-center">
                        ⏱️ Next Auto-Attack in: {formatTime(timeUntilNextAttack)}
                      </p>
                    </div>
                  )}

                  {/* Attack Status */}
                  {hasDeck && timeUntilNextAttack === 0 && (
                    <div className="bg-green-900/40 border border-green-500/50 rounded-lg p-3 mt-4 animate-pulse">
                      <p className="text-green-400 text-sm font-bold text-center">
                        ⚡ Cards Ready to Attack!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Player's Raid Deck */}
            {hasDeck ? (
              <div className="mb-6 bg-vintage-black/50 rounded-xl p-4 border-2 border-vintage-neon-blue/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-display font-bold text-vintage-neon-blue">
                    Your Raid Deck ({playerDeck.deckPower.toLocaleString()} Power)
                  </h3>
                  <button
                    onClick={handleRefuelAll}
                    disabled={isRefueling}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRefueling ? '...' : '⛽ Refuel All (4 VBMS)'}
                  </button>
                </div>

                {/* Error Message */}
                {refuelError && (
                  <div className="bg-red-900/50 border border-red-500 rounded-lg p-2 mb-3 text-sm text-red-200">
                    {refuelError}
                  </div>
                )}
                <div className="grid grid-cols-5 gap-2">
                  {playerDeck.deck.map((card: NFT, index: number) => {
                    const energy = playerDeck.cardEnergy[index];
                    const hasEnergy = energy.energy > 0;

                    return (
                      <div key={card.tokenId} className="relative">
                        {/* Card */}
                        <div className="aspect-[2/3] rounded-lg overflow-hidden border-2 border-vintage-gold/50 relative">
                          <CardMedia
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                          {/* Power Badge */}
                          <div className="absolute top-1 left-1 bg-vintage-gold text-vintage-black text-xs px-1 rounded font-bold">
                            {card.power}
                          </div>
                          {/* Energy Status */}
                          {!hasEnergy && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1 p-2">
                              <span className="text-red-400 text-xl">⚡</span>
                              <button
                                onClick={() => handleRefuelCard(card.tokenId)}
                                disabled={isRefueling}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition disabled:opacity-50"
                              >
                                {isRefueling ? '...' : 'Refuel 1 VBMS'}
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Energy Bar */}
                        <div className="mt-1 h-1 bg-vintage-black rounded overflow-hidden">
                          <div
                            className={`h-full ${hasEnergy ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${energy.energy}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Refuel Button */}
                <button
                  onClick={() => {
                    // TODO: Implement refuel logic
                    if (soundEnabled) AudioManager.buttonClick();
                  }}
                  className="w-full mt-4 px-4 py-2 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-lg font-bold transition"
                >
                  ⚡ Refuel All Cards (4 VBMS)
                </button>
              </div>
            ) : (
              /* No Deck - Set Deck CTA */
              <div className="mb-6 bg-vintage-gold/20 border-2 border-vintage-gold/50 rounded-xl p-6 text-center">
                <h3 className="text-xl font-display font-bold text-vintage-gold mb-2">
                  Join the Raid!
                </h3>
                <p className="text-vintage-burnt-gold mb-4">
                  Set your 5-card raid deck to start attacking automatically every 5 minutes.
                </p>
                <button
                  onClick={() => {
                    setShowDeckSelector(true);
                    if (soundEnabled) AudioManager.buttonClick();
                  }}
                  className="px-6 py-3 bg-vintage-gold hover:bg-vintage-gold-dark text-vintage-black rounded-xl font-bold transition-all uppercase shadow-gold"
                >
                  Set Raid Deck (5 VBMS)
                </button>
              </div>
            )}

            {/* Player Contribution */}
            {playerContribution && (
              <div className="mb-6 bg-vintage-black/50 rounded-xl p-4 border-2 border-vintage-burnt-gold/30">
                <h3 className="text-lg font-display font-bold text-vintage-burnt-gold mb-2">
                  Your Contribution
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-vintage-gold text-xs">Damage Dealt</p>
                    <p className="text-vintage-neon-blue text-xl font-bold">
                      {playerContribution.damageDealt.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-vintage-gold text-xs">Attacks</p>
                    <p className="text-vintage-neon-blue text-xl font-bold">
                      {playerContribution.attackCount}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {topContributors && topContributors.length > 0 && (
              <div className="mb-6 bg-vintage-black/50 rounded-xl p-4 border-2 border-vintage-gold/30">
                <h3 className="text-lg font-display font-bold text-vintage-gold mb-3">
                  🏆 Damage Ranking
                </h3>

                {/* Reward Pool Info */}
                <div className="bg-vintage-gold/20 border border-vintage-gold/50 rounded-lg p-3 mb-3">
                  <p className="text-vintage-gold text-sm font-bold text-center">
                    💰 Reward Pool: 1,000 $TESTVBMS
                  </p>
                  <p className="text-vintage-burnt-gold text-xs text-center mt-1">
                    Distributed based on damage contribution
                  </p>
                </div>

                {/* Total Damage */}
                {(() => {
                  const totalDamage = topContributors.reduce(
                    (sum: number, c: any) => sum + c.damageDealt,
                    0
                  );
                  const REWARD_POOL = 1000;

                  return (
                    <>
                      <div className="bg-vintage-charcoal/50 rounded-lg p-2 mb-3">
                        <div className="flex justify-between items-center">
                          <span className="text-vintage-burnt-gold text-xs">Total Damage</span>
                          <span className="text-vintage-neon-blue font-bold text-sm">
                            {totalDamage.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Contributors List */}
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {topContributors.map((contributor, index) => {
                          const contributionPercent =
                            totalDamage > 0 ? (contributor.damageDealt / totalDamage) * 100 : 0;
                          const estimatedReward = Math.floor(
                            (contributor.damageDealt / totalDamage) * REWARD_POOL
                          );

                          return (
                            <div
                              key={contributor.address}
                              className={`p-3 rounded-lg transition-all ${
                                contributor.address === userAddress.toLowerCase()
                                  ? 'bg-vintage-neon-blue/20 border-2 border-vintage-neon-blue/50 scale-105'
                                  : 'bg-vintage-charcoal/50 border border-vintage-gold/20'
                              }`}
                            >
                              {/* Rank & Username */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-bold w-8 ${
                                      index === 0
                                        ? 'text-yellow-400'
                                        : index === 1
                                        ? 'text-gray-300'
                                        : index === 2
                                        ? 'text-orange-400'
                                        : 'text-vintage-gold'
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
                                  <span className="text-vintage-burnt-gold font-bold text-sm">
                                    {contributor.username}
                                    {contributor.address === userAddress.toLowerCase() && (
                                      <span className="text-vintage-neon-blue ml-1">(You)</span>
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Damage & Contribution % */}
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-vintage-burnt-gold text-xs">Damage</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-vintage-neon-blue font-bold text-sm">
                                    {contributor.damageDealt.toLocaleString()}
                                  </span>
                                  <span className="text-vintage-gold text-xs">
                                    ({contributionPercent.toFixed(2)}%)
                                  </span>
                                </div>
                              </div>

                              {/* Contribution Bar */}
                              <div className="w-full h-2 bg-vintage-black rounded overflow-hidden mb-2">
                                <div
                                  className="h-full bg-gradient-to-r from-vintage-neon-blue to-vintage-gold transition-all duration-500"
                                  style={{ width: `${contributionPercent}%` }}
                                />
                              </div>

                              {/* Estimated Reward */}
                              <div className="flex items-center justify-between">
                                <span className="text-vintage-burnt-gold text-xs">
                                  Est. Reward
                                </span>
                                <span className="text-green-400 font-bold text-sm">
                                  +{estimatedReward.toLocaleString()} $TESTVBMS
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex-shrink-0 flex gap-3 mt-4">
          {hasDeck && (
            <button
              onClick={() => {
                // TODO: Implement share
                if (soundEnabled) AudioManager.buttonClick();
              }}
              className="flex-1 px-4 py-3 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-xl font-bold transition"
            >
              📤 Share
            </button>
          )}
          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonNav();
              onClose();
            }}
            className="flex-1 px-4 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
