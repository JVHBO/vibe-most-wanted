"use client";

/**
 * Raid Boss Full-Screen Page
 *
 * 3-section layout:
 * - Central: Boss card with HP bar and rotation
 * - Bottom: Player's raid deck
 * - Sidebar: Leaderboard (top 10)
 */

import { shareToFarcaster } from '@/lib/share-utils';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AudioManager } from '@/lib/audio-manager';
import { CardMedia } from '@/components/CardMedia';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CardReplacementModal } from '@/components/CardReplacementModal';
import { DamageNumber } from '@/components/DamageNumber';
import { PriceTicker } from '@/components/PriceTicker';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlayerCards } from '@/contexts/PlayerCardsContext';
import type { Card } from '@/lib/types/card';
import { useFarcasterTransferVBMS } from '@/lib/hooks/useFarcasterVBMS';
import { CONTRACTS } from '@/lib/contracts';
import { parseEther } from 'viem';
import {
  getBossCard,
  BOSS_ROTATION_ORDER,
  BOSS_RARITY_ORDER,
} from '@/lib/raid-boss';
import { COLLECTIONS } from '@/lib/collections';
import { sdk } from '@farcaster/miniapp-sdk';
import { openMarketplace } from '@/lib/marketplace-utils';

type NFT = Card | any;

export default function RaidPage() {
  const router = useRouter();
  const { address, isConnecting } = useAccount();
  const { t } = useLanguage();
  const { nfts: allNfts } = usePlayerCards();
  const [soundEnabled] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isInFarcaster, setIsInFarcaster] = useState<boolean>(false);

  // State
  const [timeUntilNextAttack, setTimeUntilNextAttack] = useState(0);
  const [isRefueling, setIsRefueling] = useState(false);
  const [refuelError, setRefuelError] = useState<string | null>(null);
  const [replacingCardTokenId, setReplacingCardTokenId] = useState<string | null>(null);
  const [replacingVibeFID, setReplacingVibeFID] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Boss carousel drag state
  const bossScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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
  const [energyTick, setEnergyTick] = useState(0);

  // VBMS transfer
  const farcasterTransfer = useFarcasterTransferVBMS();
  const { transfer: transferVBMS } = farcasterTransfer;

  // Convex
  const refuelCardsMutation = useMutation(api.raidBoss.refuelCards);
  const replaceCardMutation = useMutation(api.raidBoss.replaceCard);
  const initializeBossMutation = useMutation(api.raidBoss.initializeRaidBoss);
  const claimRewardsMutation = useMutation(api.raidBoss.claimRaidRewards);

  const currentBoss = useQuery(api.raidBoss.getCurrentRaidBoss);
  const playerDeck = useQuery(api.raidBoss.getPlayerRaidDeck, address ? {
    address: address.toLowerCase(),
  } : "skip");
  const playerContribution = useQuery(api.raidBoss.getPlayerContribution, address ? {
    address: address.toLowerCase(),
  } : "skip");
  const topContributors = useQuery(api.raidBoss.getTopContributors, { limit: 10 });
  const unclaimedRewards = useQuery(api.raidBoss.getUnclaimedRewards, address ? {
    address: address.toLowerCase(),
  } : "skip");

  useEffect(() => {
    setIsMounted(true);
    async function checkFarcaster() {
      try {
        const context = await sdk.context;
        if (context?.client?.clientFid) {
          setIsInFarcaster(true);
        }
      } catch {
        setIsInFarcaster(false);
      }
    }
    checkFarcaster();
  }, []);

  // Initialize boss if needed
  useEffect(() => {
    if (currentBoss === undefined && isMounted && address) {
      initializeBossMutation()
        .then(() => {
          if (soundEnabled) AudioManager.bossSpawn();
        })
        .catch((err) => {
          console.error('Failed to initialize raid boss:', err);
        });
    }
  }, [currentBoss, isMounted, address]);

  // Boss spawn sound
  useEffect(() => {
    if (currentBoss && isMounted && soundEnabled) {
      AudioManager.bossSpawn();
    }
  }, [currentBoss?.bossIndex]);

  // Next attack timer
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

  // Energy bar updates
  useEffect(() => {
    if (!playerDeck?.cardEnergy || !isMounted) return;
    const energyInterval = setInterval(() => {
      setEnergyTick(prev => prev + 1);
    }, 60000);
    return () => clearInterval(energyInterval);
  }, [playerDeck, isMounted]);

  // Visual attack animation
  useEffect(() => {
    if (!playerDeck?.deck || !currentBoss || !isMounted) return;
    const attackInterval = setInterval(() => {
      const deck = playerDeck.deck;
      if (deck.length === 0) return;

      const randomIndex = Math.floor(Math.random() * deck.length);
      const attackingCard = deck[randomIndex];
      const baseDamage = attackingCard.power * 10;
      const variance = 0.8 + Math.random() * 0.4;
      const isCritical = Math.random() < 0.15;
      const critMultiplier = isCritical ? 2.0 : 1.0;
      const finalDamage = Math.floor(baseDamage * variance * critMultiplier);

      setAttackingCardIndex(randomIndex);
      setTimeout(() => setAttackingCardIndex(null), 500);

      setBossIsHit(true);
      setTimeout(() => setBossIsHit(false), 400);

      const damageId = `dmg-${Date.now()}-${Math.random()}`;
      const randomX = 45 + Math.random() * 10;
      const randomY = 30 + Math.random() * 20;

      setDamageNumbers(prev => [...prev, {
        id: damageId,
        damage: finalDamage,
        isCritical,
        x: randomX,
        y: randomY,
      }]);

      if (soundEnabled) {
        if (isCritical) {
          AudioManager.criticalHit?.();
        } else {
          AudioManager.cardBattle?.();
        }
      }
    }, 2000 + Math.random() * 1000);

    return () => clearInterval(attackInterval);
  }, [playerDeck, currentBoss, isMounted, soundEnabled]);

  const removeDamageNumber = (id: string) => {
    setDamageNumbers(prev => prev.filter(dmg => dmg.id !== id));
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const hpPercentage = useMemo(() => {
    if (!currentBoss) return 0;
    return (currentBoss.currentHp / currentBoss.maxHp) * 100;
  }, [currentBoss]);

  const getHpBarColor = (percentage: number) => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Handlers
  const handleRefuelCard = async (tokenId: string) => {
    if (!playerDeck || isRefueling || !address) return;
    setIsRefueling(true);
    setRefuelError(null);
    try {
      const txHash = await transferVBMS(
        CONTRACTS.VBMSPoolTroll as `0x${string}`,
        parseEther('1')
      );
      await refuelCardsMutation({
        address: address.toLowerCase(),
        cardTokenIds: [tokenId],
        txHash,
      });
      if (soundEnabled) AudioManager.refuelCard();
    } catch (error: any) {
      console.error('Error refueling card:', error);
      setRefuelError(error?.message || 'Failed to refuel card');
      if (soundEnabled) AudioManager.hapticFeedback('heavy');
    } finally {
      setIsRefueling(false);
    }
  };

  const handleReplaceCard = async (oldCard: NFT, newCard: NFT) => {
    if (!playerDeck || isRefueling || !address) return;
    setIsRefueling(true);
    setRefuelError(null);
    try {
      const cardEnergy = playerDeck.cardEnergy.find(
        (ce: { tokenId: string }) => ce.tokenId === oldCard.tokenId
      );
      if (!cardEnergy) throw new Error('Card energy data not found');

      const ENERGY_DURATION_BY_RARITY: Record<string, number> = {
        common: 12 * 60 * 60 * 1000,
        rare: 1 * 24 * 60 * 60 * 1000,
        epic: 2 * 24 * 60 * 60 * 1000,
        legendary: 4 * 24 * 60 * 60 * 1000,
        mythic: 5 * 24 * 60 * 60 * 1000,
        vibefid: 0,
      };

      const oldRarity = oldCard.rarity.toLowerCase();
      const duration = ENERGY_DURATION_BY_RARITY[oldRarity] || ENERGY_DURATION_BY_RARITY.common;

      let energyUsedPercentage = 0;
      if (duration > 0 && cardEnergy.energyExpiresAt > 0) {
        const now = Date.now();
        const energyStartedAt = cardEnergy.energyExpiresAt - duration;
        const timeUsed = now - energyStartedAt;
        energyUsedPercentage = timeUsed / duration;
      }

      let txHash: `0x${string}` | undefined;
      if (energyUsedPercentage > 0.5) {
        const rarity = newCard.rarity.toLowerCase();
        const REPLACE_COSTS: Record<string, number> = {
          common: 1, rare: 3, epic: 5, legendary: 10, mythic: 15, vibefid: 50,
        };
        const cost = REPLACE_COSTS[rarity] || 1;
        txHash = await transferVBMS(
          CONTRACTS.VBMSPoolTroll as `0x${string}`,
          parseEther(cost.toString())
        );
      } else {
        txHash = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
      }

      await replaceCardMutation({
        address: address.toLowerCase(),
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

      if (soundEnabled) AudioManager.buttonSuccess();
      setReplacingCardTokenId(null);
    } catch (error: any) {
      console.error('Error replacing card:', error);
      setRefuelError(error?.message || 'Failed to replace card');
      if (soundEnabled) AudioManager.hapticFeedback('heavy');
    } finally {
      setIsRefueling(false);
    }
  };

  const handleReplaceVibeFID = async (newCard: NFT) => {
    if (!playerDeck || isRefueling || !playerDeck.vibefidCard || !address) return;
    setIsRefueling(true);
    setRefuelError(null);
    try {
      const cost = 50;
      const txHash = await transferVBMS(
        CONTRACTS.VBMSPoolTroll as `0x${string}`,
        parseEther(cost.toString())
      );
      await replaceCardMutation({
        address: address.toLowerCase(),
        oldCardTokenId: playerDeck.vibefidCard.tokenId,
        newCard: {
          tokenId: newCard.tokenId,
          collection: 'vibefid',
          power: newCard.power,
          imageUrl: newCard.imageUrl,
          name: newCard.name,
          rarity: newCard.rarity,
          foil: newCard.foil,
        },
        txHash,
        isVibeFID: true,
      });
      if (soundEnabled) AudioManager.buttonSuccess();
      setReplacingVibeFID(false);
    } catch (error: any) {
      console.error('Error replacing VibeFID:', error);
      setRefuelError(error?.message || 'Failed to replace VibeFID');
      if (soundEnabled) AudioManager.hapticFeedback('heavy');
    } finally {
      setIsRefueling(false);
    }
  };

  const handleShare = () => {
    if (!playerDeck || !currentBoss) return;
    const deckPower = playerDeck.deckPower;
    const bossName = currentBoss.name;
    const bossHp = Math.round((currentBoss.currentHp / currentBoss.maxHp) * 100);
    const castText = `⚔️ RAID BOSS BATTLE ⚔️\n\nMy Deck Power: ${deckPower.toLocaleString()}\nVs ${bossName}\nBoss HP: ${bossHp}%\n\nJoin the raid! 🎮\n\n@jvhbo`;
    const shareUrl = 'https://www.vibemostwanted.xyz/share/raid';
    shareToFarcaster(castText, shareUrl);
    if (soundEnabled) AudioManager.buttonClick();
  };

  const handleClaimRewards = async () => {
    if (!unclaimedRewards || unclaimedRewards.totalUnclaimed === 0 || !address) return;
    try {
      if (soundEnabled) AudioManager.buttonClick();
      const result = await claimRewardsMutation({ address: address.toLowerCase() });
      if (result.success) {
        if (soundEnabled) AudioManager.win();
        alert(`🎁 Claimed ${result.totalClaimed} TESTVBMS from ${result.claimedCount} raid battles!`);
      }
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      if (soundEnabled) AudioManager.buttonError();
    }
  };

  const handleRefuelAll = async () => {
    if (!playerDeck || isRefueling || !address) return;
    setIsRefueling(true);
    setRefuelError(null);
    try {
      const txHash = await transferVBMS(
        CONTRACTS.VBMSPoolTroll as `0x${string}`,
        parseEther('4')
      );
      const allTokenIds = playerDeck.deck.map((card: NFT) => card.tokenId);
      await refuelCardsMutation({
        address: address.toLowerCase(),
        cardTokenIds: allTokenIds,
        txHash,
      });
      if (soundEnabled) AudioManager.refuelCard();
    } catch (error: any) {
      console.error('Error refueling cards:', error);
      setRefuelError(error?.message || 'Failed to refuel cards');
      if (soundEnabled) AudioManager.hapticFeedback('heavy');
    } finally {
      setIsRefueling(false);
    }
  };

  // Carousel handlers
  const handleBossMouseDown = (e: React.MouseEvent) => {
    if (!bossScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - bossScrollRef.current.offsetLeft);
    setScrollLeft(bossScrollRef.current.scrollLeft);
  };

  const handleBossMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !bossScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - bossScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    bossScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleBossMouseUp = () => setIsDragging(false);
  const handleBossMouseLeave = () => setIsDragging(false);

  // Loading states
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
            <div className="text-6xl mb-4">💀</div>
            <h1 className="text-2xl font-display font-bold text-vintage-gold mb-4">Boss Raid</h1>
            <p className="text-vintage-burnt-gold text-lg mb-6">Connect your wallet to access Boss Raid</p>
            <Link href="/" className="inline-block px-6 py-3 bg-vintage-gold text-vintage-black rounded-lg font-bold hover:bg-vintage-ice transition-colors">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasDeck = playerDeck && playerDeck.deck.length > 0;
  const replacingCard = replacingCardTokenId
    ? playerDeck?.deck.find((card: NFT) => card.tokenId === replacingCardTokenId)
    : null;

  return (
    <div className="min-h-screen bg-vintage-deep-black flex flex-col">
      <PriceTicker />

      {/* Card Replacement Modal */}
      <CardReplacementModal
        isOpen={!!replacingCardTokenId}
        onClose={() => setReplacingCardTokenId(null)}
        onConfirm={(newCard) => {
          if (replacingCard) handleReplaceCard(replacingCard, newCard);
        }}
        availableCards={(allNfts || []) as Card[]}
        oldCard={(replacingCard as Card) || null}
        currentBoss={currentBoss}
        soundEnabled={soundEnabled}
        currentDeckTokenIds={playerDeck?.deck?.map((card: NFT) => card.tokenId) || []}
      />

      {/* VibeFID Replacement Modal */}
      <CardReplacementModal
        isOpen={replacingVibeFID}
        onClose={() => setReplacingVibeFID(false)}
        onConfirm={(newCard) => {
          if (playerDeck?.vibefidCard) handleReplaceVibeFID(newCard);
        }}
        availableCards={(allNfts || []).filter(card => card.collection === 'vibefid') as Card[]}
        oldCard={(playerDeck?.vibefidCard as Card) || null}
        currentBoss={currentBoss}
        soundEnabled={soundEnabled}
        currentDeckTokenIds={playerDeck?.vibefidCard ? [playerDeck.vibefidCard.tokenId] : []}
        isVibeFIDMode={true}
      />

      {/* Header */}
      <div className="flex-shrink-0 bg-vintage-charcoal border-b-2 border-red-600/30 p-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="px-3 py-2 bg-vintage-black hover:bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg font-bold text-sm transition"
          >
            ← Home
          </button>
          <h1 className="text-xl md:text-2xl font-display font-bold text-red-500">{t('raidBossTitle')}</h1>
          <div className="flex items-center gap-2">
            {unclaimedRewards && unclaimedRewards.totalUnclaimed > 0 && (
              <button
                onClick={handleClaimRewards}
                className="w-10 h-10 rounded-full bg-green-600/80 hover:bg-green-600 border-2 border-green-400 flex items-center justify-center text-white font-bold transition-all hover:scale-110 animate-pulse relative"
                title={`Claim ${unclaimedRewards.totalUnclaimed} TESTVBMS`}
              >
                🎁
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unclaimedRewards.count}
                </span>
              </button>
            )}
            <button
              onClick={() => setShowHelp(true)}
              className="w-10 h-10 rounded-full bg-red-600/20 hover:bg-red-600/40 border-2 border-red-500 flex items-center justify-center text-red-400 font-bold transition-all hover:scale-110"
            >
              ?
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Section Layout */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-4">
        {/* Left/Center: Boss + Deck */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Boss Section */}
          {!currentBoss ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Boss Card & HP */}
              <div className="mb-4 bg-vintage-black/50 rounded-xl p-4 border-2 border-red-600/30">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className={`w-40 h-56 md:w-48 md:h-72 flex-shrink-0 relative rounded-xl overflow-hidden border-4 border-red-600 shadow-neon ${bossIsHit ? 'animate-boss-hit' : ''}`}>
                    <CardMedia src={currentBoss.imageUrl} alt={currentBoss.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                      {currentBoss.rarity}
                    </div>
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

                  <div className="flex-1 w-full">
                    <h3 className="text-2xl font-display font-bold text-vintage-neon-blue mb-2">{currentBoss.name}</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <p className="text-vintage-burnt-gold text-sm">
                        {currentBoss.collection?.toUpperCase() || 'UNKNOWN'} - {currentBoss.rarity}
                      </p>
                      {currentBoss.collection && COLLECTIONS[currentBoss.collection as keyof typeof COLLECTIONS]?.marketplaceUrl && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (soundEnabled) AudioManager.buttonClick();
                            await openMarketplace(
                              COLLECTIONS[currentBoss.collection as keyof typeof COLLECTIONS].marketplaceUrl!,
                              sdk,
                              isInFarcaster
                            );
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-full text-white text-xs font-bold transition-all shadow-lg cursor-pointer"
                        >
                          🛒 {COLLECTIONS[currentBoss.collection as keyof typeof COLLECTIONS].buttonText || 'BUY PACKS'}
                        </button>
                      )}
                    </div>

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

                    {hasDeck && timeUntilNextAttack > 0 && (
                      <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-3 mt-3">
                        <p className="text-red-400 text-sm font-bold text-center">
                          ⏱️ Next Auto-Attack in: {formatTime(timeUntilNextAttack)}
                        </p>
                      </div>
                    )}

                    {hasDeck && timeUntilNextAttack === 0 && (
                      <div className="bg-green-900/40 border border-green-500/50 rounded-lg p-3 mt-3 animate-pulse">
                        <p className="text-green-400 text-sm font-bold text-center">
                          ⚡ Cards Ready to Attack!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Boss Rotation */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-display font-bold text-vintage-gold">
                    {t('raidRotationTitle')} ({BOSS_ROTATION_ORDER.length})
                  </h3>
                  <button
                    onClick={() => router.push('/raid/leaderboard')}
                    className="px-3 py-1 bg-vintage-gold/20 hover:bg-vintage-gold/30 text-vintage-gold border border-vintage-gold/50 rounded text-xs font-bold transition"
                  >
                    View Full Leaderboard →
                  </button>
                </div>
                <div
                  ref={bossScrollRef}
                  onMouseDown={handleBossMouseDown}
                  onMouseMove={handleBossMouseMove}
                  onMouseUp={handleBossMouseUp}
                  onMouseLeave={handleBossMouseLeave}
                  className={`overflow-x-auto overflow-y-hidden pb-2 scrollbar-thin scrollbar-thumb-vintage-gold scrollbar-track-gray-800 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                  <div className="flex gap-2 pb-2">
                    {Array.from({ length: BOSS_ROTATION_ORDER.length }, (_, i) => {
                      const collectionId = BOSS_ROTATION_ORDER[i];
                      const rarity = BOSS_RARITY_ORDER[i];
                      const boss = getBossCard(collectionId, rarity);
                      const collection = COLLECTIONS[collectionId];

                      if (!boss || !collection) return null;

                      const isCurrent = i === currentBoss.bossIndex;
                      const isPrevious = i < currentBoss.bossIndex;
                      const isNext = i === currentBoss.bossIndex + 1;

                      return (
                        <div
                          key={i}
                          className={`flex-shrink-0 w-32 bg-vintage-black/50 rounded-lg p-2 border ${
                            isCurrent
                              ? 'border-yellow-400 shadow-lg shadow-yellow-400/50'
                              : isPrevious
                              ? 'border-vintage-gold/30'
                              : isNext
                              ? 'border-vintage-neon-blue/30'
                              : 'border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <div className={`w-10 h-14 flex-shrink-0 relative rounded overflow-hidden border ${
                              isCurrent ? 'border-yellow-400' : isPrevious ? 'border-vintage-gold/50 opacity-70' : 'border-gray-600'
                            }`}>
                              <CardMedia
                                src={boss.imageUrl}
                                alt={boss.name}
                                className={`w-full h-full object-cover ${isPrevious && !isCurrent ? 'grayscale' : ''}`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[10px] font-bold truncate ${
                                isCurrent ? 'text-yellow-400' : isPrevious ? 'text-vintage-gold' : 'text-vintage-neon-blue'
                              }`}>
                                {boss.name}
                              </p>
                              <p className="text-[8px] text-gray-400">
                                {isCurrent ? 'CURRENT' : isPrevious ? 'DEFEATED' : isNext ? 'NEXT' : `#${i + 1}`}
                              </p>
                            </div>
                          </div>
                          {isPrevious && !isCurrent && (
                            <button
                              onClick={() => router.push(`/raid/leaderboard?boss=${i}`)}
                              className="w-full px-1 py-0.5 bg-vintage-gold/20 hover:bg-vintage-gold/30 text-vintage-gold border border-vintage-gold/50 rounded text-[8px] font-bold transition"
                            >
                              View Results
                            </button>
                          )}
                          {isCurrent && (
                            <button
                              onClick={() => router.push('/raid/leaderboard?boss=current')}
                              className="w-full px-1 py-0.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-400/50 rounded text-[8px] font-bold transition"
                            >
                              Leaderboard
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Player's Deck Section */}
              {hasDeck ? (
                <div className="bg-vintage-black/50 rounded-xl p-4 border-2 border-vintage-neon-blue/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-display font-bold text-vintage-neon-blue">
                      {t('raidBossYourDeck', { power: playerDeck.deckPower.toLocaleString() })}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRefuelAll}
                        disabled={isRefueling}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50"
                      >
                        {isRefueling ? '...' : t('raidBossRefuelAll')}
                      </button>
                      <button
                        onClick={handleShare}
                        className="px-3 py-1.5 bg-vintage-neon-blue hover:bg-vintage-neon-blue/80 text-vintage-black rounded-lg font-bold text-sm transition"
                      >
                        Share
                      </button>
                    </div>
                  </div>

                  {refuelError && (
                    <div className="bg-red-900/50 border border-red-500 rounded-lg p-2 mb-3 text-sm text-red-200">
                      {refuelError}
                    </div>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {playerDeck.deck.slice(0, 5).map((card: NFT, index: number) => {
                      const cardEnergy = playerDeck.cardEnergy?.[index];
                      const now = Date.now();
                      if (!cardEnergy) return null;
                      const hasEnergy = cardEnergy.energyExpiresAt === 0 || now < cardEnergy.energyExpiresAt;
                      const ENERGY_DURATION_BY_RARITY: Record<string, number> = {
                        common: 12 * 60 * 60 * 1000, rare: 1 * 24 * 60 * 60 * 1000,
                        epic: 2 * 24 * 60 * 60 * 1000, legendary: 4 * 24 * 60 * 60 * 1000,
                        mythic: 5 * 24 * 60 * 60 * 1000, vibefid: 0,
                      };
                      let energyPercent = 100;
                      if (cardEnergy.energyExpiresAt !== 0) {
                        const rarity = card.rarity?.toLowerCase() || 'common';
                        const fullDuration = ENERGY_DURATION_BY_RARITY[rarity] || ENERGY_DURATION_BY_RARITY.common;
                        const remaining = Math.max(0, cardEnergy.energyExpiresAt - now);
                        energyPercent = fullDuration > 0 ? Math.min(100, (remaining / fullDuration) * 100) : 0;
                      }
                      const hasCollectionBuff = currentBoss && card.collection && card.collection === currentBoss.collection;
                      const isVibeFID = card.collection === 'vibefid';

                      return (
                        <div key={card.tokenId} className="relative">
                          <div className={`aspect-[2/3] rounded-lg overflow-hidden border-2 ${
                            hasCollectionBuff ? 'border-yellow-400 shadow-lg shadow-yellow-400/60 animate-pulse-glow' : 'border-red-600/50'
                          } relative ${attackingCardIndex === index ? 'animate-card-attack' : ''}`}>
                            <CardMedia src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                            <div className={`absolute top-1 left-1 text-white text-xs px-1 rounded font-bold ${hasCollectionBuff ? 'bg-yellow-500' : 'bg-red-600'}`}>
                              {isVibeFID ? Math.floor(card.power * 10) : hasCollectionBuff ? Math.floor(card.power * 2) : card.power}
                            </div>
                            {hasCollectionBuff && (
                              <div className="absolute top-1 right-1 bg-yellow-400 text-black text-[10px] px-1 rounded font-bold">2x</div>
                            )}
                            <button
                              onClick={() => {
                                setReplacingCardTokenId(card.tokenId);
                                if (soundEnabled) AudioManager.buttonClick();
                              }}
                              disabled={isRefueling}
                              className="absolute bottom-1 right-1 bg-orange-600 hover:bg-orange-700 text-white text-[10px] px-1 py-0.5 rounded font-bold transition disabled:opacity-50"
                            >
                              🔄
                            </button>
                            {!hasEnergy && (
                              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-1 p-1">
                                <span className="text-red-400 text-sm">⚡</span>
                                <button
                                  onClick={() => handleRefuelCard(card.tokenId)}
                                  disabled={isRefueling}
                                  className="w-full px-1 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold transition disabled:opacity-50"
                                >
                                  Refuel
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="mt-1 h-1.5 bg-vintage-black rounded overflow-hidden">
                            <div
                              className={`h-full ${!hasEnergy ? 'bg-red-600' : energyPercent > 50 ? 'bg-green-400' : energyPercent > 25 ? 'bg-yellow-400' : 'bg-orange-400'}`}
                              style={{ width: `${energyPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* VibeFID Card */}
                    {playerDeck.vibefidCard && (() => {
                      const card = playerDeck.vibefidCard;
                      const vibefidIndex = 5;
                      const hasCollectionBuff = currentBoss && card.collection && card.collection === currentBoss.collection;
                      return (
                        <div key={card.tokenId} className="relative">
                          <div className={`aspect-[2/3] rounded-lg overflow-hidden border-2 ${
                            hasCollectionBuff ? 'border-yellow-400 shadow-lg shadow-yellow-400/60' : 'border-purple-400'
                          } relative ${attackingCardIndex === vibefidIndex ? 'animate-card-attack' : ''}`}>
                            <CardMedia src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
                            <div className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-1 rounded font-bold">
                              {Math.floor(card.power * 10)}
                            </div>
                            <div className="absolute bottom-1 left-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[8px] px-1 py-0.5 rounded font-bold animate-pulse">
                              10x
                            </div>
                            <button
                              onClick={() => setReplacingVibeFID(true)}
                              className="absolute bottom-1 right-1 bg-orange-600 hover:bg-orange-700 text-white text-[10px] px-1 py-0.5 rounded font-bold transition"
                            >
                              🔄
                            </button>
                          </div>
                          <div className="mt-1 h-1.5 bg-vintage-black rounded overflow-hidden">
                            <div className="h-full bg-purple-400" style={{ width: '100%' }} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Player Contribution */}
                  {playerContribution && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="bg-vintage-charcoal/50 rounded-lg p-2 text-center">
                        <p className="text-red-400 text-xs">{t('raidBossDamageDealt')}</p>
                        <p className="text-vintage-neon-blue font-bold">{playerContribution.damageDealt.toLocaleString()}</p>
                      </div>
                      <div className="bg-vintage-charcoal/50 rounded-lg p-2 text-center">
                        <p className="text-red-400 text-xs">{t('raidBossAttacks')}</p>
                        <p className="text-vintage-neon-blue font-bold">{playerContribution.attackCount}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-600/20 border-2 border-red-600/50 rounded-xl p-6 text-center">
                  <h3 className="text-xl font-display font-bold text-red-400 mb-2">{t('raidBossJoinRaid')}</h3>
                  <p className="text-vintage-burnt-gold mb-4">{t('raidBossJoinDesc')}</p>
                  <button
                    onClick={() => router.push('/raid/deck')}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all uppercase shadow-lg"
                  >
                    {t('raidBossSetDeck')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Leaderboard */}
        <div className="lg:w-80 flex-shrink-0 bg-vintage-charcoal/50 rounded-xl border border-vintage-gold/30 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-display font-bold text-vintage-gold">Top 10</h3>
            <button
              onClick={() => router.push('/raid/leaderboard?boss=current')}
              className="text-vintage-gold text-xs hover:underline"
            >
              View All →
            </button>
          </div>

          {!topContributors ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : topContributors.length === 0 ? (
            <p className="text-vintage-burnt-gold text-sm text-center py-4">No contributors yet</p>
          ) : (
            <div className="space-y-2">
              {topContributors.map((contributor: { address: string; username: string; damageDealt: number; attackCount: number }, index: number) => {
                const isUser = contributor.address === address?.toLowerCase();
                return (
                  <div
                    key={contributor.address}
                    className={`p-2 rounded-lg ${isUser ? 'bg-vintage-neon-blue/20 border border-vintage-neon-blue/50' : 'bg-vintage-black/30'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-vintage-burnt-gold/50'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <span className={`text-sm font-bold truncate flex-1 ${isUser ? 'text-vintage-neon-blue' : 'text-vintage-burnt-gold'}`}>
                        {contributor.username}
                        {isUser && <span className="text-xs ml-1">(You)</span>}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-vintage-neon-blue text-xs font-bold">
                        {contributor.damageDealt.toLocaleString()}
                      </span>
                      <span className="text-vintage-burnt-gold/50 text-xs">
                        {contributor.attackCount} attacks
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-vintage-charcoal rounded-lg border-2 border-red-600 max-w-md w-full p-4 shadow-neon max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-display font-bold text-red-400 mb-3">{t('raidBossHelp')}</h2>
            <div className="space-y-3 text-vintage-burnt-gold font-modern text-sm">
              <div>
                <h3 className="text-red-400 font-bold mb-1">{t('raidBossHelpGlobal')}</h3>
                <p className="text-xs">{t('raidBossHelpGlobalDesc')}</p>
              </div>
              <div>
                <h3 className="text-red-400 font-bold mb-1">{t('raidBossHelpSetDeck')}</h3>
                <p className="text-xs">{t('raidBossHelpSetDeckDesc')}</p>
              </div>
              <div>
                <h3 className="text-red-400 font-bold mb-1">{t('raidBossHelpEnergy')}</h3>
                <p className="text-xs">{t('raidBossHelpEnergyDesc')}</p>
              </div>
              <div>
                <h3 className="text-red-400 font-bold mb-1">{t('raidBossHelpBuffs')}</h3>
                <p className="text-xs">{t('raidBossHelpBuffsDesc')}</p>
              </div>
              <div>
                <h3 className="text-red-400 font-bold mb-1">{t('raidBossHelpRewards')}</h3>
                <p className="text-xs">{t('raidBossHelpRewardsDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonClick();
                setShowHelp(false);
              }}
              className="w-full mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition"
            >
              {t('raidBossHelpGotIt')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
