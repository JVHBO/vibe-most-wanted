"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAccount } from "wagmi";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMusic } from "@/contexts/MusicContext";
import { usePlayerCards } from "@/contexts/PlayerCardsContext";
import { AudioManager } from "@/lib/audio-manager";
import { BadgeList } from "@/components/Badge";
import { getUserBadges } from "@/lib/badges";
import { ConvexProfileService, type UserProfile } from "@/lib/convex-profile";
import { AttackCardSelectionModal } from "@/components/AttackCardSelectionModal";
import { HAND_SIZE } from "@/lib/config";
import { devLog, devError } from "@/lib/utils/logger";
import type { Card, CardRarity, CardFoil } from "@/lib/types/card";
import { filterCardsByCollections, isSameCard, getCardUniqueId, type CollectionId } from "@/lib/collections/index";
import FoilCardEffect from "@/components/FoilCardEffect";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CardMedia } from "@/components/CardMedia";
import { GamePopups } from "@/components/GamePopups";

const LEADERBOARD_PER_PAGE = 10;

export default function LeaderboardPage() {
  const { address } = useAccount();
  const convex = useConvex();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { isMusicEnabled } = useMusic();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Get everything from Context
  const {
    nfts,
    sortedAttackNfts,
    sortAttackByPower,
    setSortAttackByPower,
    showAttackCardSelection,
    setShowAttackCardSelection,
    attackSelectedCards,
    setAttackSelectedCards,
    targetPlayer,
    setTargetPlayer,
    attackSelectedCardsPower,
    isAttacking,
    setIsAttacking,
    isLoadingPreview,
    setIsLoadingPreview,
    showBattleScreen,
    setShowBattleScreen,
    battlePhase,
    setBattlePhase,
    isBattling,
    setIsBattling,
    selectedCards,
    setSelectedCards,
    dealerCards,
    setDealerCards,
    playerPower,
    setPlayerPower,
    dealerPower,
    setDealerPower,
    battleOpponentName,
    setBattleOpponentName,
    battlePlayerName,
    setBattlePlayerName,
    battleOpponentPfp,
    setBattleOpponentPfp,
    battlePlayerPfp,
    setBattlePlayerPfp,
    gameMode,
    setGameMode,
    result,
    setResult,
    showWinPopup,
    setShowWinPopup,
    showLossPopup,
    setShowLossPopup,
    showTiePopup,
    setShowTiePopup,
    pvpPreviewData,
    setPvpPreviewData,
    showPvPPreview,
    setShowPvPPreview,
    errorMessage,
    setErrorMessage,
    attacksRemaining,
    setAttacksRemaining,
    maxAttacks,
    lastBattleResult,
    setLastBattleResult,
    userProfile,
    setUserProfile,
    isCardLocked,
    getAvatarUrl,
    showVictory,
    payEntryFee,
    isLoading: isLoadingCards,
  } = usePlayerCards();

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [currentLeaderboardPage, setCurrentLeaderboardPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [showLeaderboardRewardsModal, setShowLeaderboardRewardsModal] = useState(false);
  const [defenseWarningDismissed, setDefenseWarningDismissed] = useState(false);

  // Defense Deck Modal state
  const [showDefenseDeckModal, setShowDefenseDeckModal] = useState(false);
  const [defenseDeckSortByPower, setDefenseDeckSortByPower] = useState(true);
  const [defenseDeckCollection, setDefenseDeckCollection] = useState<CollectionId | 'all'>('all');
  const [defenseSelectedCards, setDefenseSelectedCards] = useState<Card[]>([]);
  const [isSavingDefenseDeck, setIsSavingDefenseDeck] = useState(false);

  // Load dismissed state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('defenseWarningDismissed');
    if (dismissed === 'true') {
      setDefenseWarningDismissed(true);
    }
  }, []);

  // Dismiss defense warning permanently
  const handleDismissDefenseWarning = () => {
    localStorage.setItem('defenseWarningDismissed', 'true');
    setDefenseWarningDismissed(true);
  };

  // GamePopups state
  const isInFarcaster = false; // Standalone leaderboard page is not in Farcaster

  // Victory Images - 5 screens like test-results page
  const VICTORY_IMAGES = [
    '/victory-1.jpg',   // Gigachad
    '/victory-2.jpg',   // Hearts
    '/victory-3.jpg',   // Sensual
    '/littlebird.mp4',  // Little Bird (video)
    '/bom.jpg',         // Bom
  ];
  const [currentVictoryImage, setCurrentVictoryImage] = useState<string>(VICTORY_IMAGES[0]);
  const lastVictoryIndexRef = useRef<number>(-1);
  const [tieGifLoaded, setTieGifLoaded] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDailyClaimPopup, setShowDailyClaimPopup] = useState(false);
  const [loginBonusClaimed, setLoginBonusClaimed] = useState(false);
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);
  const [showWelcomePackPopup, setShowWelcomePackPopup] = useState(false);
  const [isClaimingWelcomePack, setIsClaimingWelcomePack] = useState(false);
  const [sharesRemaining, setSharesRemaining] = useState(3);

  // Victory screen handlers
  const handleCloseVictoryScreen = () => {
    // Audio is handled by GamePopups component (stops automatically when popup closes)
    setShowWinPopup(false);
    setLastBattleResult(null);
  };

  // Show victory with random image (audio handled by GamePopups component)
  const showVictoryWithAudio = () => {
    // Randomly select one of the 5 victory screens, avoiding consecutive duplicates
    let randomIndex = Math.floor(Math.random() * VICTORY_IMAGES.length);

    if (randomIndex === lastVictoryIndexRef.current && VICTORY_IMAGES.length > 1) {
      const availableIndices = Array.from({ length: VICTORY_IMAGES.length }, (_, i) => i)
        .filter(i => i !== lastVictoryIndexRef.current);
      randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    }

    lastVictoryIndexRef.current = randomIndex;
    const victoryImage = VICTORY_IMAGES[randomIndex];

    devLog(`Victory screen selected: ${victoryImage} (index: ${randomIndex})`);

    // NOTE: Audio is handled by GamePopups component via <audio autoPlay>
    // Do NOT play audio here to avoid duplication

    setCurrentVictoryImage(victoryImage);
    setShowWinPopup(true);
  };

  const handleCloseDefeatScreen = () => {
    setShowLossPopup(false);
    setLastBattleResult(null);
  };

  const handleShareClick = async (platform: 'twitter' | 'farcaster') => {
    if (!address || !userProfile) return;

    try {
      const result = await convex.mutation(api.economy.awardShareBonus, {
        address,
        type: 'victory',
      });

      if (result.success) {
        setSuccessMessage(result.message);
        setSharesRemaining(result.remaining ?? 0);
        // Refresh profile to update coins
        const updatedProfile = await ConvexProfileService.getProfile(address);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
      } else {
        if (result.message) {
          setErrorMessage(result.message);
        }
      }
    } catch (error: any) {
      console.error('Error awarding share bonus:', error);
    }
  };

  // Weekly rewards
  const weeklyRewardEligibility = useQuery(
    api.quests.checkWeeklyRewardEligibility,
    address ? { address } : "skip"
  );
  const claimWeeklyLeaderboardReward = useMutation(api.quests.claimWeeklyLeaderboardReward);
  const recordAttackResult = useMutation(api.economy.recordAttackResult);
  const [isClaimingWeeklyReward, setIsClaimingWeeklyReward] = useState(false);

  // Load leaderboard
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setIsLoading(true);
        const profiles = await ConvexProfileService.getLeaderboard();
        setLeaderboard(profiles);
      } catch (error) {
        console.error("[Leaderboard] Error loading:", error);
        setLeaderboard([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredLeaderboard = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return [];
    return leaderboard;
  }, [leaderboard]);

  // Handle attack button click
  const handleAttackClick = (player: UserProfile) => {
    console.log('[Leaderboard] Attack clicked:', {
      address,
      attacksRemaining,
      cardsLoaded: nfts.length,
      isLoadingCards,
      player: player.username
    });

    // Button is already disabled for these cases, but double-check
    if (!address || attacksRemaining <= 0 || !player.hasDefenseDeck || nfts.length === 0) {
      console.log('[Leaderboard] Attack blocked - conditions not met');
      return;
    }

    if (soundEnabled) AudioManager.buttonClick();
    setTargetPlayer(player);
    setShowAttackCardSelection(true);
    console.log('[Leaderboard] Modal should open now');
  };

  // Claim weekly reward
  const handleClaimWeeklyLeaderboardReward = async () => {
    if (!address) return;
    setIsClaimingWeeklyReward(true);
    try {
      const result = await claimWeeklyLeaderboardReward({ address });
      if (result.success) {
        AudioManager.win();
        alert(`Claimed ${result.reward} coins!`);
      }
    } catch (error: any) {
      alert(error.message || "Failed to claim reward");
    } finally {
      setIsClaimingWeeklyReward(false);
    }
  };

  // Export leaderboard
  const handleExportLeaderboard = () => {
    const data = filteredLeaderboard.map((player, index) => ({
      rank: index + 1,
      username: player.username,
      address: player.address,
      aura: player.stats?.aura ?? 500,
      power: player.stats?.totalPower ?? 0,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leaderboard-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Save defense deck
  const saveDefenseDeck = useCallback(async () => {
    if (!address || !userProfile || defenseSelectedCards.length !== HAND_SIZE) return;

    setIsSavingDefenseDeck(true);
    try {
      const defenseDeckData = defenseSelectedCards.map(card => ({
        tokenId: String(card.tokenId),
        power: Number(card.power) || 0,
        imageUrl: String(card.imageUrl),
        name: card.name || `Card #${card.tokenId}`,
        rarity: card.rarity || 'Common',
        foil: card.foil && card.foil !== 'None' ? String(card.foil) : undefined,
        collection: card.collection,
      }));

      await ConvexProfileService.updateDefenseDeck(address, defenseDeckData);

      // Refresh profile
      const updatedProfile = await ConvexProfileService.getProfile(address);
      if (updatedProfile) {
        setUserProfile(updatedProfile);
      }

      setShowDefenseDeckModal(false);
      setDefenseSelectedCards([]);
      AudioManager.buttonSuccess();
    } catch (error: any) {
      devError('Error saving defense deck:', error);
      alert(`Error saving defense deck: ${error.message}`);
    } finally {
      setIsSavingDefenseDeck(false);
    }
  }, [address, userProfile, defenseSelectedCards, setUserProfile]);

  // Select strongest cards for defense deck
  const selectStrongestDefense = useCallback(() => {
    const sorted = [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
    setDefenseSelectedCards(sorted.slice(0, HAND_SIZE));
  }, [nfts]);

  // Open defense deck modal
  const handleOpenDefenseDeck = () => {
    // Pre-load current defense deck if exists
    if (userProfile?.defenseDeck && userProfile.defenseDeck.length > 0) {
      const currentDeck = userProfile.defenseDeck
        .map((deckCard: any) => {
          // Find matching card in nfts
          return nfts.find(nft =>
            String(nft.tokenId) === String(deckCard.tokenId) &&
            nft.collection === deckCard.collection
          );
        })
        .filter((card): card is Card => card !== undefined);
      setDefenseSelectedCards(currentDeck);
    } else {
      setDefenseSelectedCards([]);
    }
    setShowDefenseDeckModal(true);
    if (soundEnabled) AudioManager.buttonClick();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vintage-black via-vintage-charcoal to-vintage-black text-vintage-ice p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <Link
          href="/"
          onClick={() => AudioManager.buttonClick()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold rounded-lg hover:bg-vintage-gold/10 transition-colors text-sm"
        >
          <span>←</span>
          <span>Home</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-vintage-charcoal/80 backdrop-blur-lg rounded-2xl border-2 border-vintage-gold/30 shadow-gold p-3 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0 mb-4 md:mb-6">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-yellow-400 flex items-center gap-2 md:gap-3 mb-2">
                <span className="text-2xl md:text-4xl">★</span> {t('leaderboard')}
                <button
                  onClick={() => setShowLeaderboardRewardsModal(true)}
                  className="ml-2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-vintage-gold/20 border border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/30 hover:border-vintage-gold transition text-sm md:text-base font-bold flex items-center justify-center"
                  title="View Weekly Rewards"
                >
                  ?
                </button>
              </h1>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 items-center">
                {userProfile && (
                  <button
                    onClick={handleOpenDefenseDeck}
                    disabled={isLoadingCards || nfts.length < HAND_SIZE}
                    className={`px-3 py-1 rounded-lg text-xs font-modern font-semibold transition flex items-center gap-1 ${
                      userProfile.hasDefenseDeck
                        ? 'bg-vintage-charcoal border border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/10 hover:border-vintage-gold'
                        : 'bg-amber-500/20 border border-amber-500/50 text-amber-400 hover:bg-amber-500/30 hover:border-amber-500 animate-pulse'
                    } ${isLoadingCards || nfts.length < HAND_SIZE ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>🛡️</span> Defense Deck
                    {userProfile.hasDefenseDeck && (
                      <span className="ml-1 text-[10px] bg-green-600 text-white px-1 rounded-full">✓</span>
                    )}
                  </button>
                )}
                <button
                  onClick={handleExportLeaderboard}
                  className="px-3 py-1 rounded-lg text-xs font-modern font-semibold transition bg-vintage-charcoal border border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-500 flex items-center gap-1"
                >
                  <span>↓</span> Export
                </button>
              </div>
            </div>

            {/* Attacks Info */}
            <div className="text-left md:text-right">
              {/* Cards loading indicator */}
              {address && (
                <p className="text-[10px] text-vintage-burnt-gold mb-1">
                  {isLoadingCards ? '⏳ Loading cards...' : `🎴 ${nfts.length} cards`}
                </p>
              )}
              {userProfile && (
                <div>
                  <p className="text-xs md:text-sm font-modern font-semibold text-vintage-gold mb-0">
                    ⚔️ Attacks: <span className="text-vintage-neon-blue">{attacksRemaining}/{maxAttacks}</span>
                  </p>
                  <p className="text-[10px] text-vintage-burnt-gold ml-3">
                    {(() => {
                      const now = new Date();
                      const tomorrow = new Date(now);
                      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
                      tomorrow.setUTCHours(0, 0, 0, 0);
                      const diff = tomorrow.getTime() - now.getTime();
                      const hours = Math.floor(diff / (1000 * 60 * 60));
                      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                      return `Resets in ${hours}h ${minutes}m`;
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Defense Deck Warning */}
          {userProfile && !userProfile.hasDefenseDeck && !defenseWarningDismissed && (
            <div className="mb-4 p-3 md:p-4 bg-amber-500/20 border-2 border-amber-500/50 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 relative">
              <button
                onClick={handleDismissDefenseWarning}
                className="absolute top-2 right-2 text-amber-400 hover:text-amber-200 text-lg font-bold"
                title="Dismiss this warning"
              >
                ×
              </button>
              <p className="text-amber-200 text-sm md:text-base text-center md:text-left pr-6">
                {t('leaderboardDefenseWarning')}
              </p>
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleOpenDefenseDeck}
                  disabled={isLoadingCards || nfts.length < HAND_SIZE}
                  className={`px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition whitespace-nowrap text-sm ${isLoadingCards || nfts.length < HAND_SIZE ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLoadingCards ? 'Loading...' : nfts.length < HAND_SIZE ? `Need ${HAND_SIZE} cards` : t('leaderboardDefenseSetup')}
                </button>
                <button
                  onClick={handleDismissDefenseWarning}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition whitespace-nowrap text-xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Cards Status Banner */}
          {address && (
            <div className={`mb-4 p-2 rounded-lg text-center text-sm ${
              isLoadingCards ? 'bg-yellow-500/20 text-yellow-300' :
              nfts.length > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
            }`}>
              {isLoadingCards ? (
                <span>⏳ Loading your cards... Please wait</span>
              ) : nfts.length > 0 ? (
                <span>✅ {nfts.length} cards ready for battle!</span>
              ) : (
                <span>❌ No cards found. Go to Home to get some cards!</span>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-6xl mb-4 animate-spin">⟳</p>
              <p className="text-vintage-burnt-gold">Loading leaderboard...</p>
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">§</p>
              <p className="text-vintage-burnt-gold">{t('noProfile')}</p>
            </div>
          ) : (
            <>
              {/* Leaderboard Table */}
              <div className="overflow-x-auto -mx-3 md:mx-0">
                <table className="w-full text-sm md:text-base">
                  <thead>
                    <tr className="border-b border-vintage-gold/20">
                      <th className="text-left p-1 md:p-3 text-vintage-burnt-gold font-semibold text-xs md:text-base">#</th>
                      <th className="text-left p-1 md:p-3 text-vintage-burnt-gold font-semibold text-xs md:text-base">{t('player')}</th>
                      <th className="text-right p-1 md:p-3 text-vintage-burnt-gold font-semibold text-xs md:text-base">Aura</th>
                      <th className="text-right p-1 md:p-3 text-vintage-burnt-gold font-semibold text-xs md:text-base hidden md:table-cell">Opened</th>
                      <th className="text-right p-1 md:p-3 text-vintage-burnt-gold font-semibold text-xs md:text-base">{t('power')}</th>
                      <th className="text-center p-1 md:p-3 text-vintage-burnt-gold font-semibold text-xs md:text-base">Reward</th>
                      <th className="text-center p-1 md:p-4 text-vintage-burnt-gold font-semibold text-xs md:text-base">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaderboard
                      .slice((currentLeaderboardPage - 1) * LEADERBOARD_PER_PAGE, currentLeaderboardPage * LEADERBOARD_PER_PAGE)
                      .map((profile, sliceIndex) => {
                        const index = (currentLeaderboardPage - 1) * LEADERBOARD_PER_PAGE + sliceIndex;
                        return (
                          <tr key={profile.address} className={`border-b border-vintage-gold/10 hover:bg-vintage-gold/10 transition ${profile.address === address ? 'bg-vintage-gold/20' : ''}`}>
                            <td className="p-1 md:p-3">
                              <span className={`text-lg md:text-2xl font-bold ${
                                index === 0 ? 'text-yellow-400' :
                                index === 1 ? 'text-gray-300' :
                                index === 2 ? 'text-orange-400' :
                                'text-gray-500'
                              }`}>
                                #{index + 1}
                              </span>
                            </td>
                            <td className="p-1 md:p-3">
                              <Link href={`/profile/${profile.username}`} className="block hover:scale-105 transition-transform">
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <p className="font-bold text-vintage-neon-blue hover:text-cyan-300 transition-colors text-xs md:text-base truncate max-w-[100px] md:max-w-[150px]">{profile.username}</p>
                                    <BadgeList badges={getUserBadges(profile.address, profile.userIndex ?? 9999, profile.hasVibeBadge)} size="xs" />
                                  </div>
                                  <p className="text-[10px] md:text-xs text-vintage-burnt-gold font-mono hidden sm:block">{profile.address.slice(0, 6)}...{profile.address.slice(-4)}</p>
                                </div>
                              </Link>
                            </td>
                            <td className="p-1 md:p-3 text-right text-purple-400 font-bold text-base md:text-xl">{(profile.stats?.aura ?? 500).toLocaleString()}</td>
                            <td className="p-1 md:p-3 text-right text-green-400 font-bold text-sm md:text-base hidden md:table-cell">{profile.stats?.openedCards || 0}</td>
                            <td className="p-1 md:p-3 text-right text-yellow-400 font-bold text-base md:text-xl">{(profile.stats?.totalPower || 0).toLocaleString()}</td>
                            <td className="p-1 md:p-3 text-center">
                              {index < 10 && profile.address.toLowerCase() === address?.toLowerCase() && (() => {
                                const rank = index + 1;
                                let reward = 0;
                                if (rank === 1) reward = 1000;
                                else if (rank === 2) reward = 750;
                                else if (rank === 3) reward = 500;
                                else if (rank <= 10) reward = 300;

                                const canClaim = weeklyRewardEligibility?.eligible && weeklyRewardEligibility?.rank === rank;
                                const alreadyClaimed = weeklyRewardEligibility?.claimed;

                                if (alreadyClaimed) {
                                  return (
                                    <div className="text-[10px] md:text-xs text-vintage-burnt-gold">
                                      <div>✓ Claimed</div>
                                      <div className="text-green-400">{reward}</div>
                                    </div>
                                  );
                                }

                                if (canClaim) {
                                  return (
                                    <button
                                      onClick={() => {
                                        if (soundEnabled) AudioManager.buttonClick();
                                        handleClaimWeeklyLeaderboardReward();
                                      }}
                                      disabled={isClaimingWeeklyReward}
                                      className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-xs md:text-sm transition-all hover:scale-105 disabled:opacity-50"
                                    >
                                      {isClaimingWeeklyReward ? '...' : `🎁 ${reward}`}
                                    </button>
                                  );
                                }

                                return (
                                  <div className="text-[10px] md:text-xs text-vintage-burnt-gold">
                                    <div>{reward}</div>
                                  </div>
                                );
                              })()}
                              {index < 10 && profile.address.toLowerCase() !== address?.toLowerCase() && (
                                <div className="text-[10px] md:text-xs text-vintage-burnt-gold">
                                  {index === 0 ? '1000' : index === 1 ? '750' : index === 2 ? '500' : '300'}
                                </div>
                              )}
                              {index >= 10 && (
                                <div className="text-[10px] md:text-xs text-gray-500">-</div>
                              )}
                            </td>
                            <td className="p-1 md:p-4 text-center">
                              {profile.address.toLowerCase() !== address?.toLowerCase() && (
                                <button
                                  onClick={() => handleAttackClick(profile)}
                                  disabled={attacksRemaining <= 0 || !profile.hasDefenseDeck || isLoadingCards || nfts.length === 0}
                                  className={`inline-block px-2 md:px-3 py-1 md:py-1.5 rounded-lg font-semibold text-xs md:text-sm transition-all ${
                                    attacksRemaining > 0 && profile.hasDefenseDeck && !isLoadingCards && nfts.length > 0
                                      ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white hover:scale-105'
                                      : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={isLoadingCards || nfts.length === 0 ? 'Loading cards...' : !profile.hasDefenseDeck ? 'No defense deck' : attacksRemaining <= 0 ? 'No attacks left' : 'Attack this player'}
                                >
                                  {isLoadingCards || nfts.length === 0 ? '⏳ Loading...' : '⚔️ Attack'}
                                </button>
                              )}
                              {profile.address.toLowerCase() === address?.toLowerCase() && (
                                <span className="text-[10px] md:text-xs text-vintage-burnt-gold">(You)</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredLeaderboard.length > LEADERBOARD_PER_PAGE && (
                <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setCurrentLeaderboardPage(Math.max(1, currentLeaderboardPage - 1));
                      if (soundEnabled) AudioManager.buttonClick();
                    }}
                    disabled={currentLeaderboardPage === 1}
                    className="px-3 md:px-4 py-2 bg-vintage-charcoal border-2 border-vintage-gold/50 hover:border-vintage-gold disabled:border-vintage-gold/20 disabled:text-vintage-burnt-gold text-vintage-gold rounded-lg font-semibold transition text-sm md:text-base"
                  >
                    ← {t('previous')}
                  </button>

                  <span className="text-vintage-gold">
                    {currentLeaderboardPage} / {Math.ceil(filteredLeaderboard.length / LEADERBOARD_PER_PAGE)}
                  </span>

                  <button
                    onClick={() => {
                      setCurrentLeaderboardPage(Math.min(Math.ceil(filteredLeaderboard.length / LEADERBOARD_PER_PAGE), currentLeaderboardPage + 1));
                      if (soundEnabled) AudioManager.buttonClick();
                    }}
                    disabled={currentLeaderboardPage === Math.ceil(filteredLeaderboard.length / LEADERBOARD_PER_PAGE)}
                    className="px-3 md:px-4 py-2 bg-vintage-charcoal border-2 border-vintage-gold/50 hover:border-vintage-gold disabled:border-vintage-gold/20 disabled:text-vintage-burnt-gold text-vintage-gold rounded-lg font-semibold transition text-sm md:text-base"
                  >
                    {t('next')} →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Attack Card Selection Modal */}
      <AttackCardSelectionModal
        showAttackCardSelection={showAttackCardSelection}
        targetPlayer={targetPlayer}
        attackSelectedCards={attackSelectedCards}
        attackSelectedCardsPower={attackSelectedCardsPower}
        sortAttackByPower={sortAttackByPower}
        sortedAttackNfts={sortedAttackNfts}
        isAttacking={isAttacking}
        isLoadingPreview={isLoadingPreview}
        isLoadingCards={isLoadingCards}
        HAND_SIZE={HAND_SIZE}
        address={address}
        userProfile={userProfile}
        soundEnabled={soundEnabled}
        lang={lang}
        setShowAttackCardSelection={setShowAttackCardSelection}
        setAttackSelectedCards={setAttackSelectedCards}
        setSortAttackByPower={setSortAttackByPower}
        setIsAttacking={setIsAttacking}
        setIsLoadingPreview={setIsLoadingPreview}
        setTargetPlayer={setTargetPlayer}
        setSelectedCards={setSelectedCards}
        setDealerCards={setDealerCards}
        setBattleOpponentName={setBattleOpponentName}
        setBattlePlayerName={setBattlePlayerName}
        setBattleOpponentPfp={setBattleOpponentPfp}
        setBattlePlayerPfp={setBattlePlayerPfp}
        setIsBattling={setIsBattling}
        setShowBattleScreen={setShowBattleScreen}
        setBattlePhase={setBattlePhase}
        setGameMode={setGameMode}
        setPlayerPower={setPlayerPower}
        setDealerPower={setDealerPower}
        setUserProfile={setUserProfile}
        setAttacksRemaining={setAttacksRemaining}
        setLastBattleResult={setLastBattleResult}
        setShowLossPopup={setShowLossPopup}
        setShowTiePopup={setShowTiePopup}
        setPvpPreviewData={setPvpPreviewData}
        setShowPvPPreview={setShowPvPPreview}
        setErrorMessage={setErrorMessage}
        isCardLocked={isCardLocked}
        payEntryFee={payEntryFee}
        recordAttackResult={recordAttackResult}
        showVictory={showVictory}
        getAvatarUrl={getAvatarUrl}
        convex={convex}
        api={api}
        maxAttacks={maxAttacks}
      />

      {/* PvP Preview Modal */}
      {showPvPPreview && pvpPreviewData && targetPlayer && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-4">
          <div className="bg-gradient-to-br from-vintage-charcoal via-vintage-black to-vintage-charcoal rounded-2xl border-2 border-vintage-gold max-w-lg w-full p-6 shadow-2xl shadow-vintage-gold/30">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-display font-bold text-vintage-gold mb-2">⚔️ BATTLE PREVIEW</h2>
              <p className="text-sm text-vintage-burnt-gold">Attacking: <span className="text-vintage-neon-blue font-bold">{targetPlayer.username}</span></p>
            </div>

            {/* Aura Comparison */}
            <div className="flex justify-between items-center mb-6 p-4 bg-vintage-black/50 rounded-xl border border-vintage-gold/30">
              <div className="text-center flex-1">
                <p className="text-xs text-vintage-burnt-gold mb-1">YOUR AURA</p>
                <p className="text-2xl font-bold text-cyan-400">{pvpPreviewData.playerAura || '?'}</p>
              </div>
              <div className="text-vintage-gold text-xl">VS</div>
              <div className="text-center flex-1">
                <p className="text-xs text-vintage-burnt-gold mb-1">OPPONENT AURA</p>
                <p className="text-2xl font-bold text-orange-400">{pvpPreviewData.opponentAura || '?'}</p>
              </div>
            </div>

            {/* Win/Loss Preview */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Win */}
              <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4 text-center">
                <p className="text-green-400 text-sm mb-2">IF YOU WIN</p>
                <p className="text-3xl font-bold text-green-300 mb-1">+{pvpPreviewData.win?.totalReward || 0}</p>
                <p className="text-xs text-green-200/70">$TESTVBMS</p>
                {pvpPreviewData.win?.auraGain > 0 && (
                  <p className="text-sm text-purple-300 mt-2">+{pvpPreviewData.win.auraGain} Aura</p>
                )}
              </div>
              {/* Lose */}
              <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-center">
                <p className="text-red-400 text-sm mb-2">IF YOU LOSE</p>
                <p className="text-3xl font-bold text-red-300 mb-1">{pvpPreviewData.lose?.totalPenalty || 0}</p>
                <p className="text-xs text-red-200/70">$TESTVBMS</p>
                {pvpPreviewData.lose?.auraLoss > 0 && (
                  <p className="text-sm text-purple-300 mt-2">-{pvpPreviewData.lose.auraLoss} Aura</p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPvPPreview(false);
                  setPvpPreviewData(null);
                  setShowAttackCardSelection(true);
                }}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition"
              >
                ← Back
              </button>
              <button
                onClick={async () => {
                  setShowPvPPreview(false);
                  if (soundEnabled) AudioManager.buttonClick();
                  setIsAttacking(true);

                  try {
                    // Leaderboard attacks are FREE - no entry fee

                    // Fetch opponent's defense deck
                    const completeProfile = await convex.query(api.profiles.getProfile, {
                      address: targetPlayer.address
                    });

                    if (!completeProfile || !completeProfile.defenseDeck) {
                      setErrorMessage('Could not load opponent defense deck');
                      setIsAttacking(false);
                      return;
                    }

                    const defenderCards = completeProfile.defenseDeck
                      .filter((card: any): card is { tokenId: string; power: number; imageUrl: string; name: string; rarity: string; foil?: string; collection?: string } => typeof card === 'object')
                      .map((card: any) => ({
                        tokenId: card.tokenId,
                        power: card.power,
                        imageUrl: card.imageUrl,
                        name: card.name,
                        rarity: card.rarity,
                        collection: card.collection,
                        foil: card.foil,
                      }));

                    // Setup battle
                    setSelectedCards(attackSelectedCards);
                    setDealerCards(defenderCards);
                    setBattleOpponentName(targetPlayer.username);
                    setBattlePlayerName(userProfile?.username || 'You');
                    setBattleOpponentPfp(getAvatarUrl({ twitter: targetPlayer.twitter, twitterProfileImageUrl: targetPlayer.twitterProfileImageUrl }));
                    setBattlePlayerPfp(getAvatarUrl(userProfile ? { twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl } : null));
                    setShowAttackCardSelection(false);
                    setIsBattling(true);
                    setShowBattleScreen(true);
                    setBattlePhase('cards');
                    setGameMode('pvp');

                    if (soundEnabled) AudioManager.playHand();

                    // Calculate power totals (VibeFID 10x)
                    const playerTotal = attackSelectedCards.reduce((sum: number, c: any) => {
                      const multiplier = c.collection === 'vibefid' ? 10 : 1;
                      return sum + ((c.power || 0) * multiplier);
                    }, 0);
                    const dealerTotal = defenderCards.reduce((sum: number, c: any) => sum + (c.power || 0), 0);

                    // Animate battle phases
                    setTimeout(() => {
                      setBattlePhase('clash');
                      if (soundEnabled) AudioManager.cardBattle();
                    }, 2500);

                    setTimeout(() => {
                      setPlayerPower(playerTotal);
                      setDealerPower(dealerTotal);
                      setBattlePhase('result');
                    }, 3500);

                    setTimeout(async () => {
                      let matchResult: 'win' | 'loss' | 'tie';
                      if (playerTotal > dealerTotal) {
                        matchResult = 'win';
                      } else if (playerTotal < dealerTotal) {
                        matchResult = 'loss';
                      } else {
                        matchResult = 'tie';
                        setShowTiePopup(true);
                        setTimeout(() => setShowTiePopup(false), 3000);
                      }

                      let coinsEarned = 0;

                      if (userProfile && address) {
                        try {
                          const result = await recordAttackResult({
                            playerAddress: address,
                            playerPower: playerTotal,
                            playerCards: attackSelectedCards,
                            playerUsername: userProfile.username,
                            result: matchResult,
                            opponentAddress: targetPlayer.address,
                            opponentUsername: targetPlayer.username,
                            opponentPower: dealerTotal,
                            opponentCards: defenderCards,
                            entryFeePaid: 0,
                            language: lang,
                          });

                          coinsEarned = result.coinsAwarded || 0;

                          if (result.profile) {
                            setUserProfile(result.profile);
                            setAttacksRemaining(maxAttacks - (result.profile.attacksToday || 0));
                          }
                        } catch (error: any) {
                          devError('Error recording attack:', error);
                        }
                      }

                      setLastBattleResult({
                        won: matchResult === 'win',
                        playerPower: playerTotal,
                        opponentPower: dealerTotal,
                        auraChange: matchResult === 'win' ? 10 : -5,
                        coinsWon: coinsEarned,
                        opponentUsername: targetPlayer.username,
                      });

                      // Close battle
                      setIsBattling(false);
                      setShowBattleScreen(false);
                      setBattlePhase('cards');
                      setIsAttacking(false);
                      setShowAttackCardSelection(false);
                      setTargetPlayer(null);
                      setAttackSelectedCards([]);

                      // Show result popup
                      setTimeout(() => {
                        if (matchResult === 'win') {
                          showVictoryWithAudio();
                        } else if (matchResult === 'loss') {
                          setShowLossPopup(true);
                          if (soundEnabled) AudioManager.lose();
                        }
                      }, 100);
                    }, 4500);

                  } catch (error: any) {
                    setErrorMessage('Error: ' + error.message);
                    setIsAttacking(false);
                    if (soundEnabled) AudioManager.buttonError();
                  }
                }}
                disabled={isAttacking}
                className={`flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-bold transition ${isAttacking ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isAttacking ? '⏳ Attacking...' : '⚔️ Attack!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Battle Screen - Full Animation */}
      {showBattleScreen && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[300]">
          <div className="w-full max-w-6xl p-4 md:p-8">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-8 md:mb-12 text-yellow-400 uppercase tracking-wider" style={{ animation: 'battlePowerPulse 2s ease-in-out infinite' }}>
              {t('battle')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
              {/* Player Cards */}
              <div>
                <div className="flex flex-col items-center mb-3 md:mb-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-cyan-500 shadow-lg shadow-cyan-500/50 mb-2 bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center relative">
                    {battlePlayerPfp ? (
                      <img src={battlePlayerPfp} alt={battlePlayerName} className="w-full h-full object-cover absolute inset-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : null}
                    <span className={`text-2xl md:text-3xl font-bold text-white ${battlePlayerPfp ? 'opacity-0' : 'opacity-100'}`}>
                      {battlePlayerName?.substring(0, 2).toUpperCase() || '??'}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-vintage-neon-blue text-center">{battlePlayerName}</h3>
                </div>
                <div className="grid grid-cols-5 gap-1 md:gap-2" style={{ animation: battlePhase === 'clash' ? 'battleCardShake 2s ease-in-out' : 'battleCardFadeIn 0.8s ease-out' }}>
                  {selectedCards.map((c, i) => (
                    <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-cyan-500" style={{ animation: battlePhase === 'clash' ? `battleGlowBlue 1.5s ease-in-out infinite` : undefined, animationDelay: `${i * 0.1}s` }}>
                      <FoilCardEffect foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null} className="w-full h-full">
                        <CardMedia src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                      </FoilCardEffect>
                      <div className="absolute top-0 left-0 bg-cyan-500 text-white text-xs md:text-sm font-bold px-1 md:px-2 py-1 rounded-br" style={{ animation: battlePhase === 'clash' ? 'battlePowerPulse 1s ease-in-out infinite' : undefined }}>
                        {c.power}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 md:mt-4 text-center">
                  <p className="text-3xl md:text-4xl font-bold text-vintage-neon-blue" style={{ animation: battlePhase === 'result' ? 'battlePowerPulse 1.5s ease-in-out 3' : undefined }}>
                    {playerPower}
                  </p>
                </div>
              </div>

              {/* Opponent Cards */}
              <div>
                <div className="flex flex-col items-center mb-3 md:mb-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-red-500 shadow-lg shadow-red-500/50 mb-2 bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center relative">
                    {battleOpponentPfp ? (
                      <img src={battleOpponentPfp} alt={battleOpponentName} className="w-full h-full object-cover absolute inset-0" onError={(e) => { e.currentTarget.style.display = 'none'; setBattleOpponentPfp(null); }} />
                    ) : null}
                    <span className={`text-2xl md:text-3xl font-bold text-white ${battleOpponentPfp ? 'opacity-0' : 'opacity-100'}`}>
                      {battleOpponentName?.substring(0, 2).toUpperCase() || '??'}
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-red-400 text-center">{battleOpponentName}</h3>
                </div>
                <div className="grid grid-cols-5 gap-1 md:gap-2" style={{ animation: battlePhase === 'clash' ? 'battleCardShake 2s ease-in-out' : 'battleCardFadeIn 0.8s ease-out' }}>
                  {dealerCards.map((c, i) => (
                    <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-500" style={{ animation: battlePhase === 'clash' ? `battleGlowRed 1.5s ease-in-out infinite` : undefined, animationDelay: `${i * 0.1}s` }}>
                      <FoilCardEffect foilType={(c.foil === 'Standard' || c.foil === 'Prize') ? c.foil : null} className="w-full h-full">
                        <CardMedia src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" loading="eager" />
                      </FoilCardEffect>
                      <div className="absolute top-0 left-0 bg-red-500 text-white text-xs md:text-sm font-bold px-1 md:px-2 py-1 rounded-br" style={{ animation: battlePhase === 'clash' ? 'battlePowerPulse 1s ease-in-out infinite' : undefined }}>
                        {c.power}
                      </div>
                      {battlePhase === 'result' && (
                        <div className="absolute bottom-0 right-0 bg-black/80 text-vintage-gold text-xs px-2 py-1 rounded-tl font-mono">
                          #{c.tokenId}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 md:mt-4 text-center">
                  <p className="text-3xl md:text-4xl font-bold text-red-400" style={{ animation: battlePhase === 'result' ? 'battlePowerPulse 1.5s ease-in-out 3' : undefined }}>
                    {dealerPower}
                  </p>
                </div>
              </div>
            </div>

            {/* Result */}
            {battlePhase === 'result' && result && (
              <div className="text-center" style={{ animation: 'battleResultSlide 0.8s ease-out' }}>
                <div className={`text-3xl md:text-6xl font-bold ${
                  result === t('playerWins') ? 'text-green-400' :
                  result === t('dealerWins') ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {result}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Popups (Victory, Loss, Tie with Share) */}
      <GamePopups
        showWinPopup={showWinPopup}
        currentVictoryImage={currentVictoryImage}
        isInFarcaster={isInFarcaster}
        lastBattleResult={lastBattleResult ? {
          coinsEarned: lastBattleResult.coinsWon,
          type: 'attack',
          playerPower: lastBattleResult.playerPower,
          opponentPower: lastBattleResult.opponentPower,
          opponentName: lastBattleResult.opponentUsername,
        } : null}
        userProfile={userProfile}
        soundEnabled={soundEnabled}
        handleCloseVictoryScreen={handleCloseVictoryScreen}
        sharesRemaining={sharesRemaining}
        onShareClick={handleShareClick}
        showLossPopup={showLossPopup}
        handleCloseDefeatScreen={handleCloseDefeatScreen}
        showTiePopup={showTiePopup}
        setShowTiePopup={setShowTiePopup}
        tieGifLoaded={tieGifLoaded}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        successMessage={successMessage}
        setSuccessMessage={setSuccessMessage}
        showDailyClaimPopup={showDailyClaimPopup}
        setShowDailyClaimPopup={setShowDailyClaimPopup}
        loginBonusClaimed={loginBonusClaimed}
        isClaimingBonus={isClaimingBonus}
        handleClaimLoginBonus={() => {}}
        onDailyClaimNow={() => {}}
        showWelcomePackPopup={showWelcomePackPopup}
        setShowWelcomePackPopup={setShowWelcomePackPopup}
        isClaimingWelcomePack={isClaimingWelcomePack}
        handleClaimWelcomePack={() => {}}
        t={t}
      />

      {/* Error Message */}
      {errorMessage && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 text-white px-6 py-4 rounded-lg shadow-lg z-[500] max-w-md">
          <p className="font-bold mb-1">Error</p>
          <p className="text-sm">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="absolute top-2 right-2 text-white/80 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Leaderboard Rewards Modal */}
      {showLeaderboardRewardsModal && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowLeaderboardRewardsModal(false)}
        >
          <div
            className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-vintage-gold/30">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-display font-bold text-vintage-gold">
                  🏆 Weekly Ranking Rewards
                </h2>
                <button
                  onClick={() => setShowLeaderboardRewardsModal(false)}
                  className="text-vintage-gold hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-xs text-vintage-burnt-gold mt-1">
                Top 10 players receive rewards every Sunday at 00:00 UTC
              </p>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 rounded-lg border border-yellow-500/30">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥇</span>
                  <span className="font-bold text-yellow-400">1st Place</span>
                </div>
                <span className="font-mono font-bold text-yellow-300">1,000 coins</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-400/20 to-gray-500/10 rounded-lg border border-gray-400/30">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥈</span>
                  <span className="font-bold text-gray-300">2nd Place</span>
                </div>
                <span className="font-mono font-bold text-gray-200">750 coins</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-600/20 to-amber-700/10 rounded-lg border border-amber-600/30">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥉</span>
                  <span className="font-bold text-amber-400">3rd Place</span>
                </div>
                <span className="font-mono font-bold text-amber-300">500 coins</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-vintage-gold/10 to-vintage-gold/5 rounded-lg border border-vintage-gold/20">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎖️</span>
                  <span className="font-bold text-vintage-gold">4th - 10th Place</span>
                </div>
                <span className="font-mono font-bold text-vintage-burnt-gold">300 coins</span>
              </div>
            </div>

            <div className="p-4 border-t border-vintage-gold/30 text-center">
              <p className="text-xs text-vintage-burnt-gold">
                Ranking based on Aura score. Rewards are claimable after each Sunday reset.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Defense Deck Modal */}
      {showDefenseDeckModal && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowDefenseDeckModal(false)}
        >
          <div
            className="bg-vintage-charcoal rounded-2xl border-4 border-vintage-gold max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-vintage-gold/30">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-display font-bold text-vintage-gold">
                  🛡️ Defense Deck
                </h2>
                <button
                  onClick={() => setShowDefenseDeckModal(false)}
                  className="text-vintage-gold hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-vintage-burnt-gold mt-1">
                Select 5 cards to defend against attacks
              </p>
            </div>

            {/* Controls Row: Collection Filter + Sort */}
            <div className="flex-shrink-0 px-4 pt-3 flex flex-wrap items-center justify-center gap-2">
              <select
                value={defenseDeckCollection}
                onChange={(e) => setDefenseDeckCollection(e.target.value as CollectionId | 'all')}
                className="px-3 py-2 rounded-lg text-sm font-modern font-medium bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10 focus:outline-none focus:ring-2 focus:ring-vintage-gold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-gold"
              >
                <option value="all">All Collections</option>
                <option value="vibe">VBMS</option>
                <option value="viberotbangers">BANGER</option>
                <option value="cumioh">CUMIO</option>
                <option value="historyofcomputer">HSTR</option>
                <option value="vibefx">VBFX</option>
                <option value="baseballcabal">BBCL</option>
                <option value="tarot">TRT</option>
                <option value="teampothead">TMPT</option>
                <option value="poorlydrawnpepes">PDP</option>
                <option value="meowverse">MEOVV</option>
                <option value="viberuto">VBRTO</option>
                <option value="vibefid">VIBEFID</option>
                <option value="americanfootball">AFCL</option>
                <option value="gmvbrs">VBRS</option>
                <option value="coquettish">COQ</option>
                <option value="nothing">NOTHING</option>
              </select>
              <button
                onClick={() => {
                  setDefenseDeckSortByPower(!defenseDeckSortByPower);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  defenseDeckSortByPower
                    ? 'bg-vintage-gold text-vintage-black'
                    : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
                }`}
              >
                {defenseDeckSortByPower ? '⚡ Sorted by Power' : '⚡ Sort by Power'}
              </button>
            </div>

            {/* Selected Cards Preview */}
            <div className="flex-shrink-0 p-4 bg-vintage-felt-green/30 border-b border-vintage-gold/20">
              <div className="grid grid-cols-5 gap-2">
                {defenseSelectedCards.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setDefenseSelectedCards(defenseSelectedCards.filter((_, idx) => idx !== i));
                      if (soundEnabled) AudioManager.buttonClick();
                    }}
                    className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-vintage-gold shadow-gold cursor-pointer hover:ring-red-500 transition-all group"
                  >
                    <CardMedia src={c.imageUrl} alt={`#${c.tokenId}`} className="w-full h-full object-cover" />
                    <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">{c.power}</div>
                    <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/30 flex items-center justify-center transition-all">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-2xl font-bold">×</span>
                    </div>
                  </div>
                ))}
                {[...Array(HAND_SIZE - defenseSelectedCards.length)].map((_, i) => (
                  <div key={`e-${i}`} className="aspect-[2/3] rounded-xl border-2 border-dashed border-vintage-gold/40 flex items-center justify-center text-vintage-gold/50 bg-vintage-felt-green/30">
                    <span className="text-2xl font-bold">+</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="text-vintage-gold font-modern">
                  <span className="font-bold">{defenseSelectedCards.length}/{HAND_SIZE}</span> cards selected
                </div>
                <div className="flex gap-2">
                  {nfts.length >= HAND_SIZE && defenseSelectedCards.length === 0 && (
                    <button
                      onClick={() => {
                        selectStrongestDefense();
                        if (soundEnabled) AudioManager.buttonSuccess();
                      }}
                      className="px-3 py-1 bg-vintage-gold/20 text-vintage-gold border border-vintage-gold/50 rounded-lg text-xs hover:bg-vintage-gold/30 transition font-modern font-semibold"
                    >
                      Select Strongest
                    </button>
                  )}
                  {defenseSelectedCards.length > 0 && (
                    <button
                      onClick={() => {
                        setDefenseSelectedCards([]);
                        if (soundEnabled) AudioManager.buttonClick();
                      }}
                      className="px-3 py-1 bg-vintage-black/50 text-vintage-gold border border-vintage-gold/50 rounded-lg text-xs hover:bg-vintage-black/70 transition font-modern"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card Grid (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingCards ? (
                <div className="flex items-center justify-center min-h-[200px]">
                  <div className="text-center">
                    <LoadingSpinner />
                    <p className="text-vintage-gold/70 text-sm mt-2 font-modern">Loading cards...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {(() => {
                    // Apply collection filter
                    let filteredCards = defenseDeckCollection === 'all'
                      ? nfts
                      : filterCardsByCollections(nfts, [defenseDeckCollection as CollectionId]);
                    // Apply power sort
                    if (defenseDeckSortByPower) {
                      filteredCards = [...filteredCards].sort((a, b) => (b.power || 0) - (a.power || 0));
                    }
                    return filteredCards;
                  })().map((nft) => {
                    const isSelected = defenseSelectedCards.some(c => isSameCard(c, nft));
                    return (
                      <div
                        key={getCardUniqueId(nft)}
                        onClick={() => {
                          if (isSelected) {
                            setDefenseSelectedCards(defenseSelectedCards.filter(c => !isSameCard(c, nft)));
                          } else if (defenseSelectedCards.length < HAND_SIZE) {
                            setDefenseSelectedCards([...defenseSelectedCards, nft]);
                          }
                          if (soundEnabled) AudioManager.selectCardByRarity(nft.rarity);
                        }}
                        className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer transition-all ${
                          isSelected
                            ? 'ring-4 ring-vintage-gold shadow-gold scale-95 opacity-50'
                            : 'hover:ring-2 hover:ring-vintage-gold/50 hover:scale-105'
                        } ${defenseSelectedCards.length >= HAND_SIZE && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <CardMedia src={nft.imageUrl} alt={`#${nft.tokenId}`} className="w-full h-full object-cover" />
                        <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">{nft.power}</div>
                        {isSelected && (
                          <div className="absolute inset-0 bg-vintage-gold/30 flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-vintage-gold/30 flex gap-3">
              <button
                onClick={() => {
                  setShowDefenseDeckModal(false);
                  if (soundEnabled) AudioManager.buttonClick();
                }}
                className="flex-1 px-4 py-3 bg-vintage-red/80 hover:bg-vintage-red text-white rounded-lg font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={saveDefenseDeck}
                disabled={defenseSelectedCards.length !== HAND_SIZE || isSavingDefenseDeck}
                className={`flex-1 px-4 py-3 rounded-lg font-bold transition ${
                  defenseSelectedCards.length === HAND_SIZE && !isSavingDefenseDeck
                    ? 'bg-vintage-gold hover:bg-yellow-500 text-vintage-black'
                    : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
                }`}
              >
                {isSavingDefenseDeck ? 'Saving...' : defenseSelectedCards.length === HAND_SIZE ? 'Save Defense Deck' : `Select ${HAND_SIZE - defenseSelectedCards.length} more`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
