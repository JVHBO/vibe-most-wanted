/**
 * Attack Card Selection Modal Component
 *
 * Modal for selecting cards to attack another player's defense deck
 * Updated to match Poker Battle deck-building format with pagination
 */

import { Dispatch, SetStateAction, useState, useMemo } from 'react';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { useLanguage } from '@/contexts/LanguageContext';
import { type UserProfile } from '@/lib/convex-profile';
import FoilCardEffect from '@/components/FoilCardEffect';
import { CardMedia } from '@/components/CardMedia';
import LoadingSpinner from '@/components/LoadingSpinner';
import { filterCardsByCollections, COLLECTIONS, getEnabledCollections, getCardUniqueId, isSameCard, type CollectionId, type Card, type CardRarity, type CardFoil } from '@/lib/collections/index';
import { useBodyScrollLock, useEscapeKey } from '@/hooks';
import { Z_INDEX } from '@/lib/z-index';

interface PvPPreviewData {
  // Define based on your API response
  [key: string]: any;
}

interface AttackCardSelectionModalProps {
  // Display state
  showAttackCardSelection: boolean;
  targetPlayer: UserProfile | null;
  attackSelectedCards: Card[];
  attackSelectedCardsPower: number;
  sortAttackByPower: boolean;
  sortedAttackNfts: Card[];
  isAttacking: boolean;
  isLoadingPreview: boolean;
  isLoadingCards?: boolean; // Optional loading state for when cards are being fetched
  HAND_SIZE: number;

  // User data
  address: string | undefined;
  userProfile: UserProfile | null | undefined;
  soundEnabled: boolean;
  lang: string;

  // Setters
  setShowAttackCardSelection: Dispatch<SetStateAction<boolean>>;
  setAttackSelectedCards: Dispatch<SetStateAction<Card[]>>;
  setSortAttackByPower: Dispatch<SetStateAction<boolean>>;
  setIsAttacking: Dispatch<SetStateAction<boolean>>;
  setIsLoadingPreview: Dispatch<SetStateAction<boolean>>;
  setTargetPlayer: Dispatch<SetStateAction<UserProfile | null>>;

  // Battle state setters
  setSelectedCards: Dispatch<SetStateAction<Card[]>>;
  setDealerCards: Dispatch<SetStateAction<Card[]>>;
  setBattleOpponentName: Dispatch<SetStateAction<string>>;
  setBattlePlayerName: Dispatch<SetStateAction<string>>;
  setBattleOpponentPfp: Dispatch<SetStateAction<string | null>>;
  setBattlePlayerPfp: Dispatch<SetStateAction<string | null>>;
  setIsBattling: Dispatch<SetStateAction<boolean>>;
  setShowBattleScreen: Dispatch<SetStateAction<boolean>>;
  setBattlePhase: Dispatch<SetStateAction<string>>;
  setGameMode: Dispatch<SetStateAction<'ai' | 'pvp' | null>>;
  setPlayerPower: Dispatch<SetStateAction<number>>;
  setDealerPower: Dispatch<SetStateAction<number>>;
  setUserProfile: Dispatch<SetStateAction<UserProfile | null>>;
  setAttacksRemaining: Dispatch<SetStateAction<number>>;
  setLastBattleResult: Dispatch<SetStateAction<any>>;
  setShowLossPopup: Dispatch<SetStateAction<boolean>>;
  setShowTiePopup: Dispatch<SetStateAction<boolean>>;
  setPvpPreviewData: Dispatch<SetStateAction<PvPPreviewData | null>>;
  setShowPvPPreview: Dispatch<SetStateAction<boolean>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;

  // Functions
  isCardLocked: (card: { tokenId: string; collection?: string }, mode: 'attack' | 'pvp') => boolean;
  payEntryFee: (params: { address: string; mode: 'attack' | 'pvp' }) => Promise<any>;
  recordAttackResult: (params: any) => Promise<any>;
  showVictory: () => void;
  getAvatarUrl: (data: any) => string | null;
  forceReloadNFTs?: () => Promise<void>;
  convex: any;
  api: any;
  maxAttacks: number;
}

export function AttackCardSelectionModal({
  showAttackCardSelection,
  targetPlayer,
  attackSelectedCards,
  attackSelectedCardsPower,
  sortAttackByPower,
  sortedAttackNfts,
  isAttacking,
  isLoadingPreview,
  isLoadingCards = false,
  HAND_SIZE,
  address,
  userProfile,
  soundEnabled,
  lang,
  setShowAttackCardSelection,
  setAttackSelectedCards,
  setSortAttackByPower,
  setIsAttacking,
  setIsLoadingPreview,
  setTargetPlayer,
  setSelectedCards,
  setDealerCards,
  setBattleOpponentName,
  setBattlePlayerName,
  setBattleOpponentPfp,
  setBattlePlayerPfp,
  setIsBattling,
  setShowBattleScreen,
  setBattlePhase,
  setGameMode,
  setPlayerPower,
  setDealerPower,
  setUserProfile,
  setAttacksRemaining,
  setLastBattleResult,
  setShowLossPopup,
  setShowTiePopup,
  setPvpPreviewData,
  setShowPvPPreview,
  setErrorMessage,
  isCardLocked,
  payEntryFee,
  recordAttackResult,
  showVictory,
  getAvatarUrl,
  forceReloadNFTs,
  convex,
  api,
  maxAttacks,
}: AttackCardSelectionModalProps) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCollections, setSelectedCollections] = useState<CollectionId[]>([]);
  const CARDS_PER_PAGE = 50;

  // Helper to get buffed power for display (VibeFID 5x, VBMS 2x, Nothing 0.5x)
  const getDisplayPower = (card: any) => {
    const base = card.power || 0;
    if (card.collection === 'vibefid') return Math.floor(base * 5);
    if (card.collection === 'vibe') return Math.floor(base * 2);
    if (card.collection === 'nothing') return Math.floor(base * 0.5);
    return base;
  };

  // Modal close handler (defined early for ESC key hook)
  const closeModal = () => {
    if (soundEnabled) AudioManager.buttonNav();
    setShowAttackCardSelection(false);
    setAttackSelectedCards([]);
    setTargetPlayer(null);
  };

  // Modal accessibility hooks
  useBodyScrollLock(showAttackCardSelection && !!targetPlayer);
  useEscapeKey(closeModal, showAttackCardSelection && !!targetPlayer);

  // Apply collection filter
  const filteredCards = useMemo(() => {
    if (selectedCollections.length === 0) {
      return sortedAttackNfts;
    }
    return filterCardsByCollections(sortedAttackNfts, selectedCollections);
  }, [sortedAttackNfts, selectedCollections]);

  // Pagination
  const totalPages = Math.ceil(filteredCards.length / CARDS_PER_PAGE);
  const paginatedCards = filteredCards.slice(
    currentPage * CARDS_PER_PAGE,
    (currentPage + 1) * CARDS_PER_PAGE
  );

  // Early return AFTER all hooks
  if (!showAttackCardSelection || !targetPlayer) return null;

  // Loading state
  const isLoading = isLoadingCards || sortedAttackNfts.length === 0;

  const handleAttack = async () => {
    devLog('🔴 handleAttack called!', {
      cardsLength: attackSelectedCards.length,
      HAND_SIZE,
      hasTarget: !!targetPlayer,
      isAttacking,
      address,
      targetAddress: targetPlayer?.address
    });

    if (attackSelectedCards.length !== HAND_SIZE || !targetPlayer || isAttacking) {
      devLog('❌ Early return - conditions not met');
      return;
    }

    // Show preview of gains/losses before attacking
    if (address && targetPlayer.address) {
      devLog('📊 Fetching PvP preview...');
      try {
        setIsLoadingPreview(true);
        const preview = await convex.query(api.economy.previewPvPRewards, {
          playerAddress: address,
          opponentAddress: targetPlayer.address
        });
        devLog('✅ Preview fetched:', preview);
        setPvpPreviewData(preview);
        setShowPvPPreview(true);
        setIsLoadingPreview(false);
        if (soundEnabled) AudioManager.buttonClick();
        devLog('✅ Preview modal should be visible now');
        return; // Stop here - battle only starts after confirming in modal
      } catch (error) {
        devError('❌ Error fetching PvP preview:', error);
        setIsLoadingPreview(false);
        // If preview fails, continue normally
      }
    } else {
      devLog('⚠️ Skipping preview - missing address or targetPlayer.address');
    }

    // Prevent multiple clicks
    setIsAttacking(true);

    // Fetch complete profile to get defense deck (leaderboard doesn't include it for performance)
    let completeProfile;
    try {
      completeProfile = await convex.query(api.profiles.getProfile, {
        address: targetPlayer.address
      });

      if (!completeProfile) {
        setErrorMessage(`Could not load ${targetPlayer.username}'s profile. Please try again.`);
        setIsAttacking(false);
        if (soundEnabled) AudioManager.buttonError();
        return;
      }
    } catch (error) {
      devError('Error fetching target player profile:', error);
      setErrorMessage(`Error loading ${targetPlayer.username}'s profile. Please try again.`);
      setIsAttacking(false);
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    // Validate opponent has a complete defense deck
    if (!completeProfile.defenseDeck || completeProfile.defenseDeck.length !== HAND_SIZE) {
      setErrorMessage(`${targetPlayer.username} doesn't have a defense deck set up. You can only attack players with a complete defense deck (${HAND_SIZE} cards).`);
      setIsAttacking(false);
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    try {
      // Pay entry fee BEFORE attacking
      await payEntryFee({ address: address || '', mode: 'attack' });
      devLog('Attack entry fee paid: 50 $TESTVBMS');
    } catch (error: any) {
      setErrorMessage('Error paying entry fee: ' + error.message);
      setIsAttacking(false);
      if (soundEnabled) AudioManager.buttonError();
      return;
    }

    // Use saved defense deck data
    devLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    devLog(`✦ ATTACKING: ${targetPlayer.username}`);
    devLog(`◆ Using saved defense deck data (no NFT fetch needed)`);

    const defenderCards = (completeProfile.defenseDeck || [])
      .filter((card: string | { tokenId: string; power: number; imageUrl: string; name: string; rarity: string; foil?: string; collection?: string }): card is { tokenId: string; power: number; imageUrl: string; name: string; rarity: string; foil?: string; collection?: string } => typeof card === 'object')
      .map((card: { tokenId: string; power: number; imageUrl: string; name: string; rarity: string; foil?: string; collection?: string }, i: number) => {
        devLog(`🃏 Card ${i+1}: ID=${card.tokenId}, Power=${card.power}, Name="${card.name}", Rarity="${card.rarity}"`);
        return {
          tokenId: card.tokenId,
          power: card.power,
          imageUrl: card.imageUrl,
          name: card.name,
          rarity: card.rarity as CardRarity,
          collection: card.collection as CollectionId | undefined,
          foil: card.foil as CardFoil | undefined,
        } as Card;
      });
    devLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Set up battle
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

    // Calculate power totals
    // VibeFID 5x, VBMS 2x, Nothing 0.5x
    const playerTotal = attackSelectedCards.reduce((sum: number, c: Card) => {
      const multiplier = c.collection === 'vibefid' ? 5 : c.collection === 'vibe' ? 2 : c.collection === 'nothing' ? 0.5 : 1;
      return sum + Math.floor((c.power || 0) * multiplier);
    }, 0);
    const dealerTotal = defenderCards.reduce((sum: number, c: Card) => {
      const multiplier = c.collection === 'vibefid' ? 5 : c.collection === 'vibe' ? 2 : c.collection === 'nothing' ? 0.5 : 1;
      return sum + Math.floor((c.power || 0) * multiplier);
    }, 0);

    // Animate battle
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
      }

      // Update stats and record matches
      let coinsEarned = 0;

      if (address && userProfile) {
        try {
          // Record attack result (coins NOT added yet for wins)
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
            skipCoins: matchResult === 'win', // Only skip coins for wins (losses are auto-processed)
          });

          coinsEarned = result.coinsAwarded || 0;

          devLog(`⚛️ ATOMIC: Attack recorded successfully`);
          devLog(`💰 Coins awarded: ${coinsEarned}`);
          if (result.bonuses && result.bonuses.length > 0) {
            devLog(`🎁 Bonuses: ${result.bonuses.join(', ')}`);
          }

          if (result.profile) {
            setUserProfile(result.profile);
            setAttacksRemaining(maxAttacks - (result.profile.attacksToday || 0));
          }

          // Send notification to defender
          fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'defense_attacked',
              data: {
                defenderAddress: targetPlayer.address,
                defenderUsername: targetPlayer.username || 'Unknown',
                attackerUsername: userProfile.username || 'Unknown',
                result: matchResult === 'win' ? 'lose' : 'win',
              },
            }),
          }).catch(err => devError('Error sending notification:', err));
        } catch (error) {
          devError('Attack error:', error);
        }
      }

      // Close battle first
      setTimeout(() => {
        setIsBattling(false);
        setShowBattleScreen(false);
        setBattlePhase('cards');
        setAttackSelectedCards([]);
        setIsAttacking(false);
        setTargetPlayer(null);

        // Set last battle result for sharing
        setLastBattleResult({
          result: matchResult,
          playerPower: playerTotal,
          opponentPower: dealerTotal,
          opponentName: targetPlayer.username,
          opponentTwitter: targetPlayer.twitter,
          type: 'attack',
          coinsEarned
        });

        // Set pending reward to show RewardChoiceModal (only for wins)
        // TESTVBMS already added - no modal

        // Show result popup after closing battle
        setTimeout(() => {
          if (matchResult === 'win') {
            showVictory();
          } else if (matchResult === 'loss') {
            setShowLossPopup(true);
            if (soundEnabled) AudioManager.lose();
          } else {
            setShowTiePopup(true);
            if (soundEnabled) AudioManager.tie();
          }
        }, 100);
      }, 2000);
    }, 4500);
  };

  const handleCancel = closeModal;

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX.modal }}
      onClick={handleCancel}
    >
      <div
        className="bg-vintage-charcoal rounded-2xl border-4 border-red-600 max-w-6xl w-full p-4 md:p-6 lg:p-8 shadow-lg shadow-red-600/50 h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-2 text-red-500 flex-shrink-0">
          † ATTACK {targetPlayer.username.toUpperCase()}
        </h2>

        {/* Counter */}
        <div className="text-center mb-2 flex-shrink-0">
          <p className="text-vintage-burnt-gold text-sm sm:text-base font-modern">
            Select {HAND_SIZE} cards ({attackSelectedCards.length}/{HAND_SIZE})
          </p>
        </div>

        {/* Controls Row: Collection Filter + Sort Button */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4 flex-shrink-0">
          <select
            value={selectedCollections.length === 0 ? 'all' : selectedCollections[0]}
            onChange={(e) => {
              if (e.target.value === 'all') {
                setSelectedCollections([]);
              } else {
                setSelectedCollections([e.target.value as CollectionId]);
              }
              setCurrentPage(0);
              if (soundEnabled) AudioManager.buttonClick();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-modern font-medium transition-all bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10 focus:outline-none focus:ring-2 focus:ring-vintage-gold [&>option]:bg-vintage-charcoal [&>option]:text-vintage-gold"
          >
            <option value="all">{t('deckBuilderAllCollections')}</option>
            {getEnabledCollections().map(col => (
              <option key={col.id} value={col.id}>{col.displayName}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSortAttackByPower(!sortAttackByPower);
              setCurrentPage(0);
              if (soundEnabled) AudioManager.buttonClick();
            }}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              sortAttackByPower
                ? 'bg-vintage-gold text-vintage-black'
                : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
            }`}
          >
            {sortAttackByPower ? t('deckBuilderSortedByPower') : t('deckBuilderSortByPower')}
          </button>

          {/* Refresh Button */}
          {forceReloadNFTs && (
            <button
              onClick={async () => {
                if (soundEnabled) AudioManager.buttonClick();
                await forceReloadNFTs();
              }}
              className="px-4 py-2 rounded-lg font-bold text-sm transition-all bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30 flex items-center gap-1"
              title="Refresh cards"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          )}
        </div>

        {/* Selected Attack Deck Display */}
        <div className="mb-2 bg-red-900/40 border border-red-600/50 rounded-lg p-2 flex-shrink-0">
          <div className="flex flex-wrap gap-1 justify-center">
            {Array.from({ length: HAND_SIZE }).map((_, i) => (
              <div
                key={i}
                className="w-8 h-12 sm:w-10 sm:h-14 border border-dashed border-red-600/50 rounded flex items-center justify-center overflow-hidden relative"
              >
                {attackSelectedCards[i] ? (
                  <>
                    <CardMedia
                      src={attackSelectedCards[i].imageUrl}
                      alt={`#${attackSelectedCards[i].tokenId}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className={`absolute bottom-0 left-0 right-0 py-0.5 text-xs font-bold text-center ${attackSelectedCards[i].collection === 'vibefid' ? 'bg-purple-900/90 text-purple-300' : 'bg-black/80 text-red-500'}`}>
                      {attackSelectedCards[i].collection === 'vibefid' ? `${((attackSelectedCards[i].power || 0) * 5).toLocaleString()} (5x)` : attackSelectedCards[i].power?.toLocaleString()}
                    </div>
                  </>
                ) : (
                  <span className="text-red-500 text-lg">+</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1 text-center">
            <p className="text-xs text-vintage-burnt-gold">Attack Power</p>
            <p className="text-lg font-bold text-red-500">
              {attackSelectedCardsPower.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Available Cards Grid */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mb-4">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 pb-4">
              {paginatedCards.map((nft) => {
                const isSelected = attackSelectedCards.find(c => isSameCard(c, nft));
                // Use card object for proper collection+tokenId comparison
                const isLocked = isCardLocked(nft, 'attack');
                return (
                  <button
                    key={getCardUniqueId(nft)}
                    onClick={() => {
                      if (isLocked) {
                        if (soundEnabled) AudioManager.buttonError();
                        return;
                      }
                      if (isSelected) {
                        setAttackSelectedCards(prev => prev.filter(c => !isSameCard(c, nft)));
                        if (soundEnabled) {
                          AudioManager.deselectCard();
                          AudioManager.hapticFeedback('light');
                        }
                      } else if (attackSelectedCards.length < HAND_SIZE) {
                        setAttackSelectedCards(prev => [...prev, nft]);
                        if (soundEnabled) {
                          AudioManager.selectCardByRarity(nft.rarity);
                        }
                      }
                    }}
                    className={`aspect-[2/3] relative rounded-lg overflow-hidden border-2 transition ${
                      isLocked
                        ? 'opacity-50 cursor-not-allowed border-vintage-gold/30'
                        : isSelected
                        ? 'border-red-600 shadow-lg shadow-red-600/50 scale-95'
                        : 'border-vintage-gold/30 hover:border-vintage-gold/60 hover:scale-105'
                    }`}
                    title={isLocked ? "🔒 This card is locked in your defense deck" : undefined}
                  >
                    <CardMedia
                      src={nft.imageUrl}
                      alt={`#${nft.tokenId}`}
                      className="w-full h-full object-cover"
                    />
                    <div className={`absolute top-0 left-0 text-xs px-1 rounded-br font-bold ${nft.collection === 'vibefid' ? 'bg-purple-600 text-white' : 'bg-vintage-gold text-vintage-black'}`}>
                      {nft.collection === 'vibefid' ? `${getDisplayPower(nft).toLocaleString()} ★` : nft.collection === 'vibe' ? `${getDisplayPower(nft).toLocaleString()} (2x)` : nft.power?.toLocaleString()}
                    </div>

                    {isLocked && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                        <div className="text-3xl mb-1">🔒</div>
                        <div className="text-[10px] text-white font-bold bg-black/50 px-1 rounded">
                          IN DEFENSE
                        </div>
                      </div>
                    )}

                    {isSelected && !isLocked && (
                      <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                        <span className="text-4xl text-red-600">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mb-4 flex-shrink-0">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                currentPage === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
              }`}
            >
              ← Prev
            </button>
            <span className="text-vintage-gold font-bold">
              {currentPage + 1}/{totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                currentPage === totalPages - 1
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-vintage-gold/20 text-vintage-gold hover:bg-vintage-gold/30'
              }`}
            >
              Next →
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 flex-shrink-0">
          <button
            onClick={handleAttack}
            disabled={attackSelectedCards.length !== HAND_SIZE || isAttacking}
            className={`w-full px-4 py-2 rounded-lg font-display font-bold text-sm transition-all uppercase tracking-wide ${
              attackSelectedCards.length === HAND_SIZE && !isAttacking
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/50 hover:scale-105'
                : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
            }`}
          >
            {isAttacking
              ? '... ATTACKING'
              : attackSelectedCards.length === HAND_SIZE
              ? '† ATTACK!'
              : `SELECT ${HAND_SIZE - attackSelectedCards.length} MORE`}
          </button>

          <button
            onClick={handleCancel}
            className="w-full px-4 py-2 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-lg font-modern text-sm transition"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
