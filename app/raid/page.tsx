"use client";

/**
 * Raid Boss Game-Style Screen
 *
 * Full-screen boss image background
 * Boss info overlay on top
 * Subtle deck bar at bottom
 * No scrolling - game feel
 */

import { shareToFarcaster } from '@/lib/share-utils';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AudioManager } from '@/lib/audio-manager';
import haptics from '@/lib/haptics';
import { CardMedia } from '@/components/CardMedia';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CardReplacementModal } from '@/components/CardReplacementModal';
import { DamageNumber } from '@/components/DamageNumber';
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAllBosses, setShowAllBosses] = useState(false);
  const [isClearingDeck, setIsClearingDeck] = useState(false);

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

  // Carousel drag scroll
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false); // Track if user actually dragged
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollStartX, setScrollStartX] = useState(0);

  // VBMS transfer
  const farcasterTransfer = useFarcasterTransferVBMS();
  const { transfer: transferVBMS } = farcasterTransfer;

  // Convex
  const refuelCardsMutation = useMutation(api.raidBoss.refuelCards);
  const replaceCardMutation = useMutation(api.raidBoss.replaceCard);
  const initializeBossMutation = useMutation(api.raidBoss.initializeRaidBoss);
  const claimRewardsMutation = useMutation(api.raidBoss.claimRaidRewards);
  const clearRaidDeckMutation = useMutation(api.raidBoss.clearRaidDeck);

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

  // Auto-scroll carousel to current boss
  useEffect(() => {
    if (!currentBoss || !carouselRef.current) return;
    const bossIndex = currentBoss.bossIndex;
    // Each boss item is ~28px wide (w-7) + 4px gap
    const itemWidth = 32;
    const scrollPosition = Math.max(0, bossIndex * itemWidth - 100); // Center-ish
    carouselRef.current.scrollLeft = scrollPosition;
  }, [currentBoss?.bossIndex]);

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
      const randomX = 30 + Math.random() * 40;
      const randomY = 30 + Math.random() * 30;

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
          haptics.jackpot(); // Heavy haptic for critical!
        } else {
          AudioManager.cardBattle?.();
          haptics.attack();
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

  // Carousel drag handlers
  const handleDragStart = (clientX: number) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setHasDragged(false);
    setDragStartX(clientX);
    setScrollStartX(carouselRef.current.scrollLeft);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || !carouselRef.current) return;
    const delta = dragStartX - clientX;
    // Only consider it a drag if moved more than 5px
    if (Math.abs(delta) > 5) {
      setHasDragged(true);
    }
    carouselRef.current.scrollLeft = scrollStartX + delta;
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    // Reset hasDragged after a short delay to allow click handler to check it
    setTimeout(() => setHasDragged(false), 100);
  };

  const hpPercentage = useMemo(() => {
    if (!currentBoss) return 0;
    return (currentBoss.currentHp / currentBoss.maxHp) * 100;
  }, [currentBoss]);

  const getHpBarColor = (percentage: number) => {
    if (percentage > 50) return 'bg-vintage-gold';
    if (percentage > 25) return 'bg-amber-500';
    return 'bg-orange-600';
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
    const shareUrl = 'https://vibemostwanted.xyz/share/raid';
    shareToFarcaster(castText, shareUrl);
    if (soundEnabled) AudioManager.buttonClick();
  };

  const handleClaimRewards = async () => {
    if (!unclaimedRewards || unclaimedRewards.totalUnclaimed === 0 || !address) return;
    try {
      if (soundEnabled) AudioManager.buttonClick();
      const result = await claimRewardsMutation({ address: address.toLowerCase() });
      haptics.victory(); // Haptic on reward claim
      if (result.success) {
        if (soundEnabled) AudioManager.win();
        alert(`🎁 Claimed ${result.totalClaimed} coins from ${result.claimedCount} raid battles!`);
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

  // Clear entire raid deck (preserves damage stats)
  const handleClearDeck = async () => {
    if (!address || isClearingDeck) return;
    setIsClearingDeck(true);
    try {
      await clearRaidDeckMutation({
        address: address.toLowerCase(),
      });
      setShowClearConfirm(false);
      if (soundEnabled) AudioManager.buttonSuccess();
    } catch (error: any) {
      console.error('Error clearing deck:', error);
      if (soundEnabled) AudioManager.hapticFeedback('heavy');
    } finally {
      setIsClearingDeck(false);
    }
  };

  // Loading states
  if (!isMounted || isConnecting) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!address) {
    return (
      <div className="fixed inset-0 bg-vintage-deep-black text-white flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-6">💀</div>
          <h1 className="text-3xl font-display font-bold text-vintage-gold mb-4">Boss Raid</h1>
          <p className="text-vintage-burnt-gold text-lg mb-6">Connect your wallet to access Boss Raid</p>
          <Link href="/" className="inline-block px-6 py-3 bg-vintage-gold text-vintage-black rounded-lg font-bold hover:bg-vintage-ice transition-colors">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const hasDeck = playerDeck && playerDeck.deck.length > 0;
  const replacingCard = replacingCardTokenId
    ? playerDeck?.deck.find((card: NFT) => card.tokenId === replacingCardTokenId)
    : null;

  // Get boss description from collection
  const bossCollection = currentBoss?.collection ? COLLECTIONS[currentBoss.collection as keyof typeof COLLECTIONS] : null;

  return (
    <div className="fixed inset-0 bg-vintage-deep-black overflow-hidden">
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

      {/* Clear Deck Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-vintage-charcoal border-2 border-red-500/50 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-red-400 mb-3">Clear Raid Deck?</h3>
            <p className="text-vintage-burnt-gold text-sm mb-4">
              This will remove all cards from your raid deck. Your damage stats and boss kills will be preserved.
            </p>
            <p className="text-vintage-gold text-xs mb-4">
              You'll need to pay the entry fee again to set a new deck.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearingDeck}
                className="flex-1 px-4 py-2 bg-vintage-gold/20 hover:bg-vintage-gold/30 text-vintage-gold border border-vintage-gold/50 rounded font-bold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearDeck}
                disabled={isClearingDeck}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition disabled:opacity-50"
              >
                {isClearingDeck ? 'Clearing...' : 'Clear Deck'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boss Background - Full Screen */}
      {currentBoss && (
        <div className={`absolute inset-0 flex items-center justify-center ${bossIsHit ? 'animate-boss-hit' : ''}`}>
          <CardMedia
            src={currentBoss.imageUrl}
            alt={currentBoss.name}
            className="max-w-full max-h-full w-auto h-auto object-contain opacity-70 z-[1]"
          />
          {/* Dark gradient overlay - lighter on sides */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 z-[2] pointer-events-none" />

          {/* Damage Numbers */}
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
      )}

      {/* Top HUD - Compact header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          {/* Left - Back */}
          <button
            onClick={() => router.push('/')}
            className="px-3 py-1.5 bg-transparent hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/30 rounded font-bold text-xs transition uppercase tracking-wide"
          >
            ← Back
          </button>

          {/* Center - Boss Name & Description */}
          {currentBoss && (() => {
            const bossCard = currentBoss.collection ? getBossCard(currentBoss.collection as any, currentBoss.rarity as any) : null;
            return (
              <div className="text-center max-w-xs">
                <p className="text-vintage-gold/60 text-[9px] font-bold uppercase tracking-wider">
                  {currentBoss.rarity}
                </p>
                <h1 className="text-base font-display font-bold text-vintage-gold drop-shadow-lg">
                  {currentBoss.name}
                </h1>
                {bossCard?.description && (
                  <p className="text-vintage-burnt-gold/70 text-[10px] mt-0.5 line-clamp-2">
                    {bossCard.description}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Right - Action buttons row */}
          <div className="flex items-center gap-2">
            {unclaimedRewards && unclaimedRewards.totalUnclaimed > 0 && (
              <button
                onClick={handleClaimRewards}
                className="px-3 py-1.5 bg-green-600/80 hover:bg-green-600 text-white border border-green-500/50 rounded font-bold text-xs transition uppercase tracking-wide animate-pulse relative"
              >
                Claim
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unclaimedRewards.count}
                </span>
              </button>
            )}
            <button
              onClick={() => router.push('/raid/leaderboard?boss=current')}
              className="px-3 py-1.5 bg-transparent hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/30 rounded font-bold text-xs transition uppercase tracking-wide"
            >
              Rank
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="w-8 h-8 bg-transparent hover:bg-vintage-gold/10 text-vintage-gold/60 border border-vintage-gold/20 rounded flex items-center justify-center font-bold text-xs transition"
            >
              ?
            </button>
          </div>
        </div>
      </div>

      {/* HP Bar - Top below header */}
      {currentBoss && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-md">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-2 border border-vintage-gold/20">
            <div className="flex items-center gap-2">
              <span className="text-vintage-gold text-xs">💛</span>
              <div className="flex-1 h-4 bg-black/60 rounded-full overflow-hidden border border-vintage-gold/30">
                <div
                  className={`h-full ${getHpBarColor(hpPercentage)} transition-all duration-1000 relative`}
                  style={{ width: `${hpPercentage}%` }}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px] drop-shadow-lg">
                    {hpPercentage.toFixed(0)}%
                  </span>
                </div>
              </div>
              <span className="text-vintage-gold/70 text-[10px] font-mono">
                {(currentBoss.currentHp / 1000).toFixed(0)}k
              </span>
            </div>
          </div>

          {/* Dots Indicator - Boss rotation position */}
          <div className="mt-3 flex items-center justify-center gap-1">
            {/* Show groups of 10 dots with current boss highlighted */}
            {(() => {
              const totalBosses = BOSS_ROTATION_ORDER.length;
              const currentIdx = currentBoss.bossIndex;
              // Show 15 dots centered around current boss
              const visibleCount = 15;
              const halfVisible = Math.floor(visibleCount / 2);
              let startIdx = Math.max(0, currentIdx - halfVisible);
              let endIdx = Math.min(totalBosses, startIdx + visibleCount);
              // Adjust if we're near the end
              if (endIdx === totalBosses) {
                startIdx = Math.max(0, totalBosses - visibleCount);
              }

              return (
                <>
                  {startIdx > 0 && (
                    <span className="text-vintage-gold/40 text-[8px] mr-1">...</span>
                  )}
                  {BOSS_ROTATION_ORDER.slice(startIdx, endIdx).map((_, i) => {
                    const idx = startIdx + i;
                    const isCurrent = idx === currentIdx;
                    const isPast = idx < currentIdx;

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (isPast) router.push(`/raid/leaderboard?boss=${idx}`);
                          else if (isCurrent) router.push('/raid/leaderboard?boss=current');
                        }}
                        className={`rounded-full transition-all ${
                          isCurrent
                            ? 'w-3 h-3 bg-vintage-gold shadow-lg shadow-vintage-gold/50'
                            : isPast
                            ? 'w-2 h-2 bg-vintage-gold/40 hover:bg-vintage-gold/60'
                            : 'w-2 h-2 bg-white/20 hover:bg-white/30'
                        }`}
                        title={`Boss #${idx + 1}`}
                      />
                    );
                  })}
                  {endIdx < totalBosses && (
                    <span className="text-vintage-gold/40 text-[8px] ml-1">...</span>
                  )}
                </>
              );
            })()}
          </div>
          <div className="text-center text-vintage-gold/50 text-[9px] mt-1">
            Boss {currentBoss.bossIndex + 1} / {BOSS_ROTATION_ORDER.length}
          </div>
        </div>
      )}

      {/* Bottom - Deck Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        {/* Error Message */}
        {refuelError && (
          <div className="mx-4 mb-2 bg-red-900/80 backdrop-blur-sm border border-red-500 rounded-lg p-2 text-sm text-red-200 text-center">
            {refuelError}
          </div>
        )}

        {/* Deck Cards */}
        <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-4 px-4">
          {hasDeck ? (
            <div className="max-w-2xl mx-auto">
              {/* Deck Power & Actions */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-vintage-gold font-bold text-sm">
                  {playerDeck.deckPower.toLocaleString()} PWR
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefuelAll}
                    disabled={isRefueling}
                    className="px-3 py-1.5 bg-transparent hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded font-bold text-xs transition disabled:opacity-50 uppercase tracking-wide"
                  >
                    {isRefueling ? '...' : 'Refuel'}
                  </button>
                  <button
                    onClick={() => router.push('/raid/deck')}
                    className="px-3 py-1.5 bg-transparent hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded font-bold text-xs transition uppercase tracking-wide"
                  >
                    Edit Deck
                  </button>
                  <button
                    onClick={handleShare}
                    className="px-3 py-1.5 bg-transparent hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded font-bold text-xs transition uppercase tracking-wide"
                  >
                    Share
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-3 py-1.5 bg-transparent hover:bg-red-900/50 text-red-400 border border-red-500/50 rounded font-bold text-xs transition uppercase tracking-wide"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Cards Row */}
              <div className="flex justify-center gap-2">
                {/* Regular Cards */}
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

                  return (
                    <div
                      key={card.tokenId}
                      className={`relative ${attackingCardIndex === index ? 'animate-card-attack' : ''}`}
                    >
                      <div
                        className={`w-12 h-16 sm:w-14 sm:h-20 rounded-lg overflow-hidden border-2 ${
                          hasCollectionBuff ? 'border-yellow-400 shadow-lg shadow-yellow-400/60' : hasEnergy ? 'border-white/30' : 'border-red-500/50'
                        } relative cursor-pointer hover:scale-110 transition-transform`}
                        onClick={() => {
                          if (!hasEnergy) {
                            handleRefuelCard(card.tokenId);
                          } else {
                            setReplacingCardTokenId(card.tokenId);
                          }
                          if (soundEnabled) AudioManager.buttonClick();
                        }}
                      >
                        <CardMedia src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />

                        {/* Power Badge */}
                        <div className={`absolute top-0.5 left-0.5 text-white text-[10px] px-1 rounded font-bold ${hasCollectionBuff ? 'bg-yellow-500' : 'bg-black/70'}`}>
                          {hasCollectionBuff ? Math.floor(card.power * 5) : card.power}
                        </div>

                        {/* Collection Buff */}
                        {hasCollectionBuff && (
                          <div className="absolute top-0.5 right-0.5 bg-yellow-400 text-black text-[8px] px-0.5 rounded font-bold">
                            2x
                          </div>
                        )}

                        {/* No Energy Overlay */}
                        {!hasEnergy && (
                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                            <span className="text-red-400 text-lg">⚡</span>
                          </div>
                        )}
                      </div>

                      {/* Energy Bar */}
                      <div className="mt-0.5 h-1 bg-black/50 rounded overflow-hidden">
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
                  return (
                    <div
                      key={card.tokenId}
                      className={`relative ${attackingCardIndex === vibefidIndex ? 'animate-card-attack' : ''}`}
                    >
                      <div
                        className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg overflow-hidden border-2 border-purple-400 shadow-lg shadow-purple-400/40 relative cursor-pointer hover:scale-110 transition-transform"
                        onClick={() => {
                          setReplacingVibeFID(true);
                          if (soundEnabled) AudioManager.buttonClick();
                        }}
                      >
                        <CardMedia src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />

                        {/* Power Badge */}
                        <div className="absolute top-0.5 left-0.5 bg-purple-600 text-white text-[10px] px-1 rounded font-bold">
                          {Math.floor(card.power * 5)}
                        </div>

                        {/* 5x Multiplier (VibeFID bonus in Raid) */}
                        <div className="absolute bottom-0.5 left-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[8px] px-1 py-0.5 rounded font-bold">
                          5x
                        </div>
                      </div>

                      {/* Infinite Energy */}
                      <div className="mt-0.5 h-1 bg-purple-400 rounded" />
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* No Deck - Join CTA */
            <div className="max-w-md mx-auto text-center">
              <p className="text-vintage-burnt-gold mb-3 text-sm">
                Set up your raid deck to attack the boss!
              </p>
              <button
                onClick={() => router.push('/raid/deck')}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all uppercase shadow-lg text-lg"
              >
                ⚔️ Set Raid Deck
              </button>
            </div>
          )}
        </div>
      </div>

      {/* All Bosses Modal */}
      {showAllBosses && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300] p-4"
          onClick={() => setShowAllBosses(false)}
        >
          <div
            className="bg-vintage-charcoal rounded-xl border-2 border-vintage-gold/50 max-w-md w-full max-h-[80vh] flex flex-col shadow-neon"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-vintage-gold/20">
              <h2 className="text-lg font-display font-bold text-vintage-gold text-center">
                Boss Rotation ({BOSS_ROTATION_ORDER.length} bosses)
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {BOSS_ROTATION_ORDER.map((collection, idx) => {
                  const rarity = BOSS_RARITY_ORDER[idx];
                  const boss = getBossCard(collection as any, rarity as any);
                  const isCurrent = currentBoss && idx === currentBoss.bossIndex;
                  const isPast = currentBoss && idx < currentBoss.bossIndex;
                  const collectionInfo = COLLECTIONS[collection as keyof typeof COLLECTIONS];

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (isPast) router.push(`/raid/leaderboard?boss=${idx}`);
                        else if (isCurrent) {
                          setShowAllBosses(false);
                        }
                      }}
                      className={`${
                        isCurrent
                          ? 'bg-vintage-gold/30 border-vintage-gold'
                          : isPast
                          ? 'bg-vintage-gold/10 border-vintage-gold/30 hover:bg-vintage-gold/20'
                          : 'bg-black/30 border-white/10'
                      } border rounded-lg p-2 flex items-center gap-2 w-full transition`}
                    >
                      <span className={`text-[10px] font-mono w-6 ${isCurrent ? 'text-vintage-gold' : isPast ? 'text-vintage-gold/60' : 'text-white/40'}`}>
                        #{idx + 1}
                      </span>
                      <span className={`flex-1 text-left text-xs ${isCurrent ? 'text-vintage-gold font-bold' : isPast ? 'text-vintage-burnt-gold' : 'text-white/50'}`}>
                        {boss?.name || collection}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        rarity === 'Mythic' ? 'bg-purple-600/50 text-purple-300' :
                        rarity === 'Legendary' ? 'bg-yellow-600/50 text-yellow-300' :
                        rarity === 'Epic' ? 'bg-blue-600/50 text-blue-300' :
                        rarity === 'Rare' ? 'bg-green-600/50 text-green-300' :
                        'bg-gray-600/50 text-gray-300'
                      }`}>
                        {rarity}
                      </span>
                      {isCurrent && <span className="text-vintage-gold text-xs">⚔️</span>}
                      {isPast && <span className="text-vintage-gold/50 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-3 border-t border-vintage-gold/20">
              <button
                onClick={() => setShowAllBosses(false)}
                className="w-full px-4 py-2 bg-vintage-gold/20 hover:bg-vintage-gold/30 text-vintage-gold border border-vintage-gold/50 rounded-lg font-bold text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-vintage-charcoal rounded-xl border-2 border-red-600 max-w-md w-full p-5 shadow-neon"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-display font-bold text-red-400 mb-4 text-center">{t('raidBossHelp')}</h2>
            <div className="space-y-3 text-vintage-burnt-gold font-modern text-sm">
              <div className="bg-black/30 rounded-lg p-3">
                <h3 className="text-red-400 font-bold mb-1">{t('raidBossHelpGlobal')}</h3>
                <p className="text-xs opacity-80">{t('raidBossHelpGlobalDesc')}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <h3 className="text-red-400 font-bold mb-1">{t('raidBossHelpSetDeck')}</h3>
                <p className="text-xs opacity-80">{t('raidBossHelpSetDeckDesc')}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <h3 className="text-red-400 font-bold mb-1">{t('raidBossHelpBuffs')}</h3>
                <p className="text-xs opacity-80">{t('raidBossHelpBuffsDesc')}</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <h3 className="text-red-400 font-bold mb-1">{t('raidBossHelpRewards')}</h3>
                <p className="text-xs opacity-80">{t('raidBossHelpRewardsDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonClick();
                setShowHelp(false);
              }}
              className="w-full mt-5 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition text-lg"
            >
              {t('raidBossHelpGotIt')}
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {!currentBoss && (
        <div className="absolute inset-0 bg-vintage-deep-black flex items-center justify-center z-20">
          <div className="text-center">
            <LoadingSpinner />
            <p className="text-vintage-burnt-gold mt-4">Loading Boss...</p>
          </div>
        </div>
      )}
    </div>
  );
}
