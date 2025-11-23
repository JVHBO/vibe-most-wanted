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
import { CardReplacementModal } from '@/components/CardReplacementModal';
import { DamageNumber } from '@/components/DamageNumber';
import { sortCardsByPower } from '@/lib/collections/index';
import type { Card } from '@/lib/types/card';
import { useTransferVBMS } from '@/lib/hooks/useVBMSContracts';
import { useFarcasterTransferVBMS } from '@/lib/hooks/useFarcasterVBMS';
import { CONTRACTS } from '@/lib/contracts';
import { parseEther } from 'viem';
import { getNextBoss, getPreviousBoss } from '@/lib/raid-boss';

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
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCards, setSelectedCards] = useState<NFT[]>([]);
  const [sortByPower, setSortByPower] = useState(true);
  const [timeUntilNextAttack, setTimeUntilNextAttack] = useState(0);
  const [isRefueling, setIsRefueling] = useState(false);
  const [refuelError, setRefuelError] = useState<string | null>(null);
  const [replacingCardTokenId, setReplacingCardTokenId] = useState<string | null>(null);

  // Visual attack animation states
  const [damageNumbers, setDamageNumbers] = useState<Array<{
    id: string;
    damage: number;
    isCritical: boolean;
    x: number;
    y: number;
  }>>([]);
  const [bossIsHit, setBossIsHit] = useState(false);
  const [attackingCardIndex, setAttackingCardIndex] = useState<number | null>(null);

  // Web3 hooks
  const { address: walletAddress } = useAccount();
  const effectiveAddress = (userAddress || walletAddress) as `0x${string}` | undefined;

  // Detect miniapp - check multiple conditions
  const isInMiniapp = typeof window !== 'undefined' && (
    window.parent !== window || // In iframe
    !!(window as any).sdk?.wallet || // Farcaster SDK available
    window.location.href.includes('frames.farcaster.xyz') // Farcaster domain
  );

  // Always use Farcaster hooks (works for both miniapp and web via wagmi)
  const farcasterTransfer = useFarcasterTransferVBMS();
  const { transfer: transferVBMS, isPending: isTransferring } = farcasterTransfer;

  // Convex mutations
  const refuelCardsMutation = useMutation(api.raidBoss.refuelCards);
  const replaceCardMutation = useMutation(api.raidBoss.replaceCard);
  const initializeBossMutation = useMutation(api.raidBoss.initializeRaidBoss);
  const claimRewardsMutation = useMutation(api.raidBoss.claimRaidRewards);

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

  // Query unclaimed rewards
  const unclaimedRewards = useQuery(api.raidBoss.getUnclaimedRewards, {
    address: userAddress.toLowerCase(),
  });

  // Initialize boss if none exists
  useEffect(() => {
    if (currentBoss === undefined && isOpen) {
      // currentBoss is undefined means no boss exists, initialize the system
      initializeBossMutation()
        .then(() => {
          if (soundEnabled) AudioManager.bossSpawn();
        })
        .catch((err) => {
          console.error('Failed to initialize raid boss:', err);
        });
    }
  }, [currentBoss, isOpen]);

  // Play boss spawn sound when boss appears
  useEffect(() => {
    if (currentBoss && isOpen && soundEnabled) {
      AudioManager.bossSpawn();
    }
  }, [currentBoss?.bossIndex]); // Only trigger when boss changes

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

  // Visual attack animation system (attacks every 2-3 seconds)
  useEffect(() => {
    if (!playerDeck?.deck || !currentBoss || !isOpen) return;

    // Trigger visual attack every 2-3 seconds
    const attackInterval = setInterval(() => {
      const deck = playerDeck.deck;
      if (deck.length === 0) return;

      // Pick a random card to attack
      const randomIndex = Math.floor(Math.random() * deck.length);
      const attackingCard = deck[randomIndex];

      // Calculate visual damage (this is just for animation, real damage is backend)
      const baseDamage = attackingCard.power * 10; // Scale for visibility
      const variance = 0.8 + Math.random() * 0.4; // 80-120% of base
      const isCritical = Math.random() < 0.15; // 15% critical chance
      const critMultiplier = isCritical ? 2.0 : 1.0;
      const finalDamage = Math.floor(baseDamage * variance * critMultiplier);

      // Trigger card attack animation
      setAttackingCardIndex(randomIndex);
      setTimeout(() => setAttackingCardIndex(null), 500);

      // Trigger boss hit animation
      setBossIsHit(true);
      setTimeout(() => setBossIsHit(false), 400);

      // Show damage number
      const damageId = `dmg-${Date.now()}-${Math.random()}`;
      const randomX = 45 + Math.random() * 10; // 45-55% horizontal position
      const randomY = 30 + Math.random() * 20; // 30-50% vertical position

      setDamageNumbers(prev => [...prev, {
        id: damageId,
        damage: finalDamage,
        isCritical,
        x: randomX,
        y: randomY,
      }]);

      // Play sound
      if (soundEnabled) {
        if (isCritical) {
          AudioManager.criticalHit?.();
        } else {
          AudioManager.cardBattle?.();
        }
      }
    }, 2000 + Math.random() * 1000); // 2-3 seconds between attacks

    return () => clearInterval(attackInterval);
  }, [playerDeck, currentBoss, isOpen, soundEnabled]);

  // Remove completed damage numbers
  const removeDamageNumber = (id: string) => {
    setDamageNumbers(prev => prev.filter(dmg => dmg.id !== id));
  };

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
      if (soundEnabled) AudioManager.refuelCard();

    } catch (error: any) {
      console.error('❌ Error refueling card:', error);
      setRefuelError(error?.message || 'Failed to refuel card');
      if (soundEnabled) AudioManager.hapticFeedback('heavy');
    } finally {
      setIsRefueling(false);
    }
  };

  // Replace card (costs VBMS based on rarity and energy usage)
  const handleReplaceCard = async (oldCard: NFT, newCard: NFT) => {
    if (!playerDeck || isRefueling) return;

    setIsRefueling(true);
    setRefuelError(null);

    try {
      console.log('🔄 Replacing card:', oldCard.tokenId, '→', newCard.tokenId);

      // Find the old card's energy data
      const cardEnergy = playerDeck.cardEnergy.find(
        (ce: { tokenId: string; energyExpiresAt: number }) => ce.tokenId === oldCard.tokenId
      );

      if (!cardEnergy) {
        throw new Error('Card energy data not found');
      }

      // Energy durations by rarity (same as backend)
      const ENERGY_DURATION_BY_RARITY: Record<string, number> = {
        common: 12 * 60 * 60 * 1000,      // 12 hours
        rare: 1 * 24 * 60 * 60 * 1000,    // 1 day
        epic: 2 * 24 * 60 * 60 * 1000,    // 2 days
        legendary: 4 * 24 * 60 * 60 * 1000, // 4 days
        mythic: 5 * 24 * 60 * 60 * 1000,  // 5 days
        vibefid: 0,                         // Infinite (never expires)
      };

      // Calculate energy used percentage
      const oldRarity = oldCard.rarity.toLowerCase();
      const duration = ENERGY_DURATION_BY_RARITY[oldRarity] || ENERGY_DURATION_BY_RARITY.common;

      let energyUsedPercentage = 0;
      if (duration > 0 && cardEnergy.energyExpiresAt > 0) {
        const now = Date.now();
        const energyStartedAt = cardEnergy.energyExpiresAt - duration;
        const timeUsed = now - energyStartedAt;
        energyUsedPercentage = timeUsed / duration;
      }

      console.log(`⚡ Energy used: ${(energyUsedPercentage * 100).toFixed(1)}%`);

      // If more than 50% energy used, charge full cost
      // If less than 50% energy used, replacement is free
      let txHash: `0x${string}` | undefined;

      if (energyUsedPercentage > 0.5) {
        // Calculate cost based on new card rarity
        const rarity = newCard.rarity.toLowerCase();
        const REPLACE_COSTS: Record<string, number> = {
          common: 1,
          rare: 3,
          epic: 5,
          legendary: 10,
          mythic: 15,
          vibefid: 50,
        };
        const cost = REPLACE_COSTS[rarity] || 1;

        console.log(`💰 Energy >50% used, cost to replace: ${cost} VBMS`);

        // Transfer VBMS to pool
        txHash = await transferVBMS(
          CONTRACTS.VBMSPoolTroll as `0x${string}`,
          parseEther(cost.toString())
        );

        console.log('✅ Transfer successful, txHash:', txHash);
      } else {
        console.log(`🆓 Energy <50% used, replacement is FREE`);
        txHash = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
      }

      // Call Convex mutation
      await replaceCardMutation({
        address: userAddress.toLowerCase(),
        oldCardTokenId: oldCard.tokenId,
        newCard: {
          tokenId: newCard.tokenId,
          collection: newCard.collection!,
          power: newCard.power,
          imageUrl: newCard.imageUrl,
          name: newCard.name,
          rarity: newCard.rarity,
          foil: newCard.foil,
        },
        txHash,
      });

      console.log('✅ Card replaced successfully!');
      if (soundEnabled) AudioManager.buttonSuccess();
      setReplacingCardTokenId(null); // Close selection modal

    } catch (error: any) {
      console.error('❌ Error replacing card:', error);
      setRefuelError(error?.message || 'Failed to replace card');
      if (soundEnabled) AudioManager.hapticFeedback('heavy');
    } finally {
      setIsRefueling(false);
    }
  };

  // Share raid deck on Farcaster
  const handleShare = () => {
    if (!playerDeck || !currentBoss) return;

    const deckPower = playerDeck.deckPower.toLocaleString();
    const bossName = currentBoss.name;
    const bossHp = Math.round((currentBoss.currentHp / currentBoss.maxHp) * 100);

    const castText = `⚔️ RAID BOSS BATTLE ⚔️\n\nMy Deck Power: ${deckPower}\nVs ${bossName}\nBoss HP: ${bossHp}%\n\nJoin the raid! 🎮\n\n@jvhbo`;

    const embedUrl = encodeURIComponent('https://vibemostwanted.xyz/share/raid');

    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${embedUrl}`;

    window.open(shareUrl, '_blank');
    if (soundEnabled) AudioManager.buttonClick();
  };

  // Claim raid boss rewards
  const handleClaimRewards = async () => {
    if (!unclaimedRewards || unclaimedRewards.totalUnclaimed === 0) return;

    try {
      if (soundEnabled) AudioManager.buttonClick();

      const result = await claimRewardsMutation({
        address: userAddress.toLowerCase(),
      });

      if (result.success) {
        console.log(`✅ Claimed ${result.totalClaimed} TESTVBMS from ${result.claimedCount} battles!`);
        if (soundEnabled) AudioManager.win();

        // Show success notification (you could add a toast here)
        alert(`🎁 Claimed ${result.totalClaimed} TESTVBMS from ${result.claimedCount} raid battles!`);
      }
    } catch (error: any) {
      console.error('❌ Error claiming rewards:', error);
      if (soundEnabled) AudioManager.buttonError();
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
      if (soundEnabled) AudioManager.refuelCard();

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

  // Find the card being replaced
  const replacingCard = replacingCardTokenId
    ? playerDeck?.deck.find((card: NFT) => card.tokenId === replacingCardTokenId)
    : null;

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

      {/* Card Replacement Modal */}
      <CardReplacementModal
        isOpen={!!replacingCardTokenId}
        onClose={() => setReplacingCardTokenId(null)}
        onConfirm={(newCard) => {
          if (replacingCard) {
            handleReplaceCard(replacingCard, newCard);
          }
        }}
        availableCards={allNfts}
        oldCard={replacingCard || null}
        soundEnabled={soundEnabled}
      />

      {/* Main Raid Boss Modal */}
      <div
        className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-4"
        onClick={onClose}
      >
      <div
        className="bg-vintage-charcoal rounded-2xl border-4 border-red-600 max-w-6xl w-full p-3 md:p-6 lg:p-8 shadow-neon max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 mb-2 relative">
          <h2 className="text-xl md:text-3xl font-display font-bold text-center text-red-500">
            {t('raidBossTitle')}
          </h2>
          <p className="text-center text-vintage-burnt-gold text-xs md:text-sm mt-1">
            {t('raidBossSubtitle')}
          </p>

          {/* Claim Rewards Button (Gift Icon) */}
          {unclaimedRewards && unclaimedRewards.totalUnclaimed > 0 && (
            <button
              onClick={handleClaimRewards}
              className="absolute top-0 right-12 w-8 h-8 rounded-full bg-green-600/80 hover:bg-green-600 border-2 border-green-400 flex items-center justify-center text-white font-bold transition-all hover:scale-110 animate-pulse"
              title={t('raidBossClaimRewards', { amount: unclaimedRewards.totalUnclaimed })}
            >
              🎁
              {/* Notification Badge */}
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unclaimedRewards.count}
              </span>
            </button>
          )}

          {/* Help Button */}
          <button
            onClick={() => setShowHelp(true)}
            className="absolute top-0 right-0 w-8 h-8 rounded-full bg-red-600/20 hover:bg-red-600/40 border-2 border-red-500 flex items-center justify-center text-red-400 font-bold transition-all hover:scale-110"
          >
            ?
          </button>
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
            <div className="mb-3 md:mb-6 bg-vintage-black/50 rounded-xl p-2 md:p-4 border-2 border-red-600/30">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                {/* Boss Card Image */}
                <div className={`w-32 h-48 md:w-48 md:h-72 flex-shrink-0 relative rounded-xl overflow-hidden border-4 border-red-600 shadow-neon ${bossIsHit ? 'animate-boss-hit' : ''}`}>
                  <CardMedia
                    src={currentBoss.imageUrl}
                    alt={currentBoss.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                    {currentBoss.rarity}
                  </div>

                  {/* Floating Damage Numbers */}
                  {damageNumbers.map((dmg) => (
                    <DamageNumber
                      key={dmg.id}
                      damage={dmg.damage}
                      isCritical={dmg.isCritical}
                      x={dmg.x}
                      y={dmg.y}
                      onComplete={() => removeDamageNumber(dmg.id)}
                    />
                  ))}
                </div>

                {/* Boss Info */}
                <div className="flex-1 w-full">
                  <h3 className="text-xl md:text-2xl font-display font-bold text-vintage-neon-blue mb-2">
                    {currentBoss.name}
                  </h3>
                  <p className="text-vintage-burnt-gold text-sm mb-4">
                    {currentBoss.collection?.toUpperCase() || 'UNKNOWN'} - {currentBoss.rarity}
                  </p>

                  {/* HP Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-400 font-bold">HP</span>
                      <span className="text-vintage-neon-blue font-bold">
                        {currentBoss.currentHp.toLocaleString()} / {currentBoss.maxHp.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-8 bg-vintage-black rounded-lg overflow-hidden border-2 border-red-600/50">
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
                    <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-3 mt-4">
                      <p className="text-red-400 text-sm font-bold text-center">
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

            {/* Boss Rotation: Previous & Next */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Previous Boss (with Leaderboard) */}
              {currentBoss.bossIndex > 0 && (() => {
                const previousBoss = getPreviousBoss(currentBoss.bossIndex);
                if (!previousBoss) return null;

                return (
                  <div className="bg-vintage-black/50 rounded-xl p-4 border-2 border-vintage-gold/30">
                    <h4 className="text-sm font-display font-bold text-vintage-gold mb-2 text-center">
                      📜 Previous Boss (Defeated)
                    </h4>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-20 h-28 flex-shrink-0 relative rounded-lg overflow-hidden border-2 border-vintage-gold/50 opacity-70">
                        <CardMedia
                          src={previousBoss.imageUrl}
                          alt={previousBoss.name}
                          className="w-full h-full object-cover grayscale"
                        />
                        <div className="absolute top-1 left-1 bg-vintage-gold text-vintage-black px-1 py-0.5 rounded text-[10px] font-bold">
                          {previousBoss.rarity}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-vintage-gold">
                          {previousBoss.name}
                        </p>
                        <p className="text-xs text-vintage-burnt-gold">
                          {previousBoss.collection?.toUpperCase()} - {previousBoss.rarity}
                        </p>
                        <p className="text-xs text-green-400 mt-1">
                          ✓ Defeated
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // TODO: Open leaderboard modal for previous boss
                        if (soundEnabled) AudioManager.buttonClick();
                      }}
                      className="w-full px-3 py-2 bg-vintage-gold/20 hover:bg-vintage-gold/30 text-vintage-gold border border-vintage-gold/50 rounded-lg font-bold text-sm transition"
                    >
                      📊 View Leaderboard
                    </button>
                  </div>
                );
              })()}

              {/* Next Boss (Preview/Spoiler) */}
              {(() => {
                const nextBoss = getNextBoss(currentBoss.bossIndex);
                if (!nextBoss) return null;

                return (
                  <div className="bg-vintage-black/50 rounded-xl p-4 border-2 border-vintage-neon-blue/30">
                    <h4 className="text-sm font-display font-bold text-vintage-neon-blue mb-2 text-center">
                      🔮 Next Boss (Coming Soon)
                    </h4>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-20 h-28 flex-shrink-0 relative rounded-lg overflow-hidden border-2 border-vintage-neon-blue/50">
                        <CardMedia
                          src={nextBoss.imageUrl}
                          alt={nextBoss.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 bg-vintage-neon-blue text-vintage-black px-1 py-0.5 rounded text-[10px] font-bold">
                          {nextBoss.rarity}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-vintage-neon-blue">
                          {nextBoss.name}
                        </p>
                        <p className="text-xs text-vintage-burnt-gold">
                          {nextBoss.collection?.toUpperCase()} - {nextBoss.rarity}
                        </p>
                        <p className="text-xs text-vintage-neon-blue/70 mt-1">
                          HP: {nextBoss.hp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="w-full px-3 py-2 bg-vintage-neon-blue/10 border border-vintage-neon-blue/30 rounded-lg text-center">
                      <p className="text-xs text-vintage-neon-blue/70 font-bold">
                        Defeat current boss to unlock
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Player's Raid Deck */}
            {hasDeck ? (
              <div className="mb-6 bg-vintage-black/50 rounded-xl p-4 border-2 border-vintage-neon-blue/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-display font-bold text-vintage-neon-blue">
                    {t('raidBossYourDeck', { power: playerDeck.deckPower.toLocaleString() })}
                  </h3>
                  <button
                    onClick={handleRefuelAll}
                    disabled={isRefueling}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRefueling ? '...' : t('raidBossRefuelAll')}
                  </button>
                </div>

                {/* Error Message */}
                {refuelError && (
                  <div className="bg-red-900/50 border border-red-500 rounded-lg p-2 mb-3 text-sm text-red-200">
                    {refuelError}
                  </div>
                )}
                <div className={`grid gap-2 ${playerDeck.vibefidCard ? 'grid-cols-6' : 'grid-cols-5'}`}>
                  {/* Main 5 cards */}
                  {playerDeck.deck.map((card: NFT, index: number) => {
                    const cardEnergy = playerDeck.cardEnergy[index];
                    const now = Date.now();

                    // Check if energy has expired (0 = infinite for VibeFID)
                    const hasEnergy = cardEnergy.energyExpiresAt === 0 || now < cardEnergy.energyExpiresAt;

                    // Calculate energy percentage for progress bar
                    let energyPercent = 100;
                    if (cardEnergy.energyExpiresAt !== 0) {
                      const duration = cardEnergy.energyExpiresAt - (cardEnergy.lastAttackAt || now);
                      const remaining = Math.max(0, cardEnergy.energyExpiresAt - now);
                      energyPercent = duration > 0 ? (remaining / duration) * 100 : 0;
                    }

                    return (
                      <div key={card.tokenId} className="relative">
                        {/* Card */}
                        <div className={`aspect-[2/3] rounded-lg overflow-hidden border-2 border-red-600/50 relative ${attackingCardIndex === index ? 'animate-card-attack' : ''}`}>
                          <CardMedia
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                          {/* Power Badge */}
                          <div className="absolute top-1 left-1 bg-red-600 text-white text-xs px-1 rounded font-bold">
                            {card.power}
                          </div>
                          {/* Energy Status */}
                          {!hasEnergy && (
                            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-1 p-1">
                              <span className="text-red-400 text-sm">⚡</span>
                              <button
                                onClick={() => handleRefuelCard(card.tokenId)}
                                disabled={isRefueling}
                                className="w-full px-1.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold transition disabled:opacity-50"
                              >
                                {isRefueling ? '...' : t('raidBossRefuelCard')}
                              </button>
                              <button
                                onClick={() => {
                                  setReplacingCardTokenId(card.tokenId);
                                  if (soundEnabled) AudioManager.buttonClick();
                                }}
                                disabled={isRefueling}
                                className="w-full px-1.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold transition disabled:opacity-50"
                              >
                                {t('raidBossReplaceCard')}
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Energy Bar */}
                        <div className="mt-1 h-1 bg-vintage-black rounded overflow-hidden">
                          <div
                            className={`h-full ${hasEnergy ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${energyPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Optional VibeFID 6th card */}
                  {playerDeck.vibefidCard && (() => {
                    const card = playerDeck.vibefidCard;
                    const vibefidIndex = 5; // VibeFID is always the 6th card
                    const cardEnergy = playerDeck.cardEnergy[vibefidIndex];
                    const now = Date.now();

                    // VibeFID has infinite energy (energyExpiresAt = 0)
                    const hasEnergy = !cardEnergy || cardEnergy.energyExpiresAt === 0 || now < cardEnergy.energyExpiresAt;

                    return (
                      <div key={card.tokenId} className="relative">
                        {/* Card with purple border for VibeFID */}
                        <div className={`aspect-[2/3] rounded-lg overflow-hidden border-2 border-purple-400 relative ${attackingCardIndex === vibefidIndex ? 'animate-card-attack' : ''}`}>
                          <CardMedia
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                          {/* Power Badge */}
                          <div className="absolute top-1 left-1 bg-purple-400 text-vintage-black text-xs px-1 rounded font-bold">
                            {card.power}
                          </div>
                        </div>
                        {/* Infinite Energy Bar (always full, purple) */}
                        <div className="mt-1 h-1 bg-vintage-black rounded overflow-hidden">
                          <div className="h-full bg-purple-400" style={{ width: '100%' }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              /* No Deck - Set Deck CTA */
              <div className="mb-6 bg-red-600/20 border-2 border-red-600/50 rounded-xl p-6 text-center">
                <h3 className="text-xl font-display font-bold text-red-400 mb-2">
                  {t('raidBossJoinRaid')}
                </h3>
                <p className="text-vintage-burnt-gold mb-4">
                  {t('raidBossJoinDesc')}
                </p>
                <button
                  onClick={() => {
                    setShowDeckSelector(true);
                    if (soundEnabled) AudioManager.buttonClick();
                  }}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all uppercase shadow-lg"
                >
                  {t('raidBossSetDeck')}
                </button>
              </div>
            )}

            {/* Player Contribution */}
            {playerContribution && (
              <div className="mb-6 bg-vintage-black/50 rounded-xl p-4 border-2 border-vintage-burnt-gold/30">
                <h3 className="text-lg font-display font-bold text-vintage-burnt-gold mb-2">
                  {t('raidBossYourContribution')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-red-400 text-xs">{t('raidBossDamageDealt')}</p>
                    <p className="text-vintage-neon-blue text-xl font-bold">
                      {playerContribution.damageDealt.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-red-400 text-xs">{t('raidBossAttacks')}</p>
                    <p className="text-vintage-neon-blue text-xl font-bold">
                      {playerContribution.attackCount}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {topContributors && topContributors.length > 0 && (
              <div className="mb-6 bg-vintage-black/50 rounded-xl p-4 border-2 border-red-600/30">
                <h3 className="text-lg font-display font-bold text-red-400 mb-3">
                  {t('raidBossDamageRanking')}
                </h3>

                {/* Reward Pool Info */}
                <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-3 mb-3">
                  <p className="text-red-400 text-sm font-bold text-center">
                    {t('raidBossRewardPool')}
                  </p>
                  <p className="text-vintage-burnt-gold text-xs text-center mt-1">
                    {t('raidBossRewardPoolDesc')}
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
                          <span className="text-vintage-burnt-gold text-xs">{t('raidBossTotalDamage')}</span>
                          <span className="text-vintage-neon-blue font-bold text-sm">
                            {totalDamage.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Contributors List */}
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {topContributors.map((contributor: any, index: number) => {
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
                                  : 'bg-vintage-charcoal/50 border border-red-600/20'
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
                                  <span className="text-vintage-burnt-gold font-bold text-sm">
                                    {contributor.username}
                                    {contributor.address === userAddress.toLowerCase() && (
                                      <span className="text-vintage-neon-blue ml-1">{t('raidBossYou')}</span>
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Damage & Contribution % */}
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-vintage-burnt-gold text-xs">{t('raidBossDamage')}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-vintage-neon-blue font-bold text-sm">
                                    {contributor.damageDealt.toLocaleString()}
                                  </span>
                                  <span className="text-red-400 text-xs">
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
                                  {t('raidBossEstReward')}
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
              onClick={handleShare}
              className="flex-1 px-4 py-3 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-xl font-bold transition"
            >
              {t('raidBossShare')}
            </button>
          )}
          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonNav();
              onClose();
            }}
            className="flex-1 px-4 py-3 bg-vintage-black hover:bg-red-600/10 text-red-400 border border-red-600/50 rounded-xl font-bold transition"
          >
            {t('raidBossClose')}
          </button>
        </div>
      </div>
    </div>

    {/* Help Modal */}
    {showHelp && (
      <div
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-2"
        onClick={() => setShowHelp(false)}
      >
        <div
          className="bg-vintage-charcoal rounded-lg border-2 border-red-600 max-w-md w-full p-3 shadow-neon max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-display font-bold text-red-400 mb-2">
            {t('raidBossHelp')}
          </h2>
          <div className="space-y-2 text-vintage-burnt-gold font-modern text-xs">
            <div>
              <h3 className="text-red-400 font-bold mb-1 text-sm">{t('raidBossHelpGlobal')}</h3>
              <p>{t('raidBossHelpGlobalDesc')}</p>
            </div>
            <div>
              <h3 className="text-red-400 font-bold mb-1 text-sm">{t('raidBossHelpSetDeck')}</h3>
              <p>{t('raidBossHelpSetDeckDesc')}</p>
            </div>
            <div>
              <h3 className="text-red-400 font-bold mb-1 text-sm">{t('raidBossHelpEnergy')}</h3>
              <p className="text-[10px] leading-tight">{t('raidBossHelpEnergyDesc')}</p>
            </div>
            <div>
              <h3 className="text-red-400 font-bold mb-1 text-sm">{t('raidBossHelpBuffs')}</h3>
              <p className="text-[10px]">{t('raidBossHelpBuffsDesc')}</p>
            </div>
            <div>
              <h3 className="text-red-400 font-bold mb-1 text-sm">{t('raidBossHelpRotation')}</h3>
              <p className="text-[10px]">{t('raidBossHelpRotationDesc')}</p>
            </div>
            <div>
              <h3 className="text-red-400 font-bold mb-1 text-sm">{t('raidBossHelpRewards')}</h3>
              <p className="text-[10px]">{t('raidBossHelpRewardsDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonClick();
              setShowHelp(false);
            }}
            className="w-full mt-3 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition text-sm"
          >
            {t('raidBossHelpGotIt')}
          </button>
        </div>
      </div>
    )}
    </>
  );
}
