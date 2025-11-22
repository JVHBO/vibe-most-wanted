/**
 * Attack Card Selection Modal Component
 *
 * Modal for selecting cards to attack another player's defense deck
 * Updated to match Poker Battle deck-building format with pagination
 */

import { Dispatch, SetStateAction, useState, useMemo } from 'react';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { type UserProfile } from '@/lib/convex-profile';
import FoilCardEffect from '@/components/FoilCardEffect';
import { CardMedia } from '@/components/CardMedia';
import LoadingSpinner from '@/components/LoadingSpinner';
import { filterCardsByCollections, COLLECTIONS, type CollectionId, type Card } from '@/lib/collections/index';

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
  isCardLocked: (tokenId: string, mode: 'attack' | 'pvp') => boolean;
  payEntryFee: (params: { address: string; mode: 'attack' | 'pvp' }) => Promise<any>;
  recordAttackResult: (params: any) => Promise<any>;
  showVictory: () => void;
  getAvatarUrl: (data: any) => string | null;
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
  convex,
  api,
  maxAttacks,
}: AttackCardSelectionModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCollections, setSelectedCollections] = useState<CollectionId[]>([]);
  const CARDS_PER_PAGE = 50;

  if (!showAttackCardSelection || !targetPlayer) return null;

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

  // Loading state
  const isLoading = isLoadingCards || sortedAttackNfts.length === 0;

  const handleAttack = async () => {
    if (attackSelectedCards.length !== HAND_SIZE || !targetPlayer || isAttacking) return;

    // Show preview of gains/losses before attacking
    if (address && targetPlayer.address) {
      try {
        setIsLoadingPreview(true);
        const preview = await convex.query(api.economy.previewPvPRewards, {
          playerAddress: address,
          opponentAddress: targetPlayer.address
        });
        setPvpPreviewData(preview);
        setShowPvPPreview(true);
        setIsLoadingPreview(false);
        if (soundEnabled) AudioManager.buttonClick();
        return; // Stop here - battle only starts after confirming in modal
      } catch (error) {
        devError('Error fetching PvP preview:', error);
        setIsLoadingPreview(false);
        // If preview fails, continue normally
      }
    }

    // Prevent multiple clicks
    setIsAttacking(true);

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

    const defenderCards = (targetPlayer.defenseDeck || [])
      .filter((card): card is { tokenId: string; power: number; imageUrl: string; name: string; rarity: string; foil?: string } => typeof card === 'object')
      .map((card, i) => {
        devLog(`🃏 Card ${i+1}: ID=${card.tokenId}, Power=${card.power}, Name="${card.name}", Rarity="${card.rarity}"`);
        return {
          tokenId: card.tokenId,
          power: card.power,
          imageUrl: card.imageUrl,
          name: card.name,
          rarity: card.rarity,
        };
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
    const playerTotal = attackSelectedCards.reduce((sum, c) => sum + (c.power || 0), 0);
    const dealerTotal = defenderCards.reduce((sum, c) => sum + (c.power || 0), 0);

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

  const handleCancel = () => {
    if (soundEnabled) AudioManager.buttonNav();
    setShowAttackCardSelection(false);
    setAttackSelectedCards([]);
    setTargetPlayer(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4"
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
            <option value="all">All Collections</option>
            <option value="vibe">VBMS</option>
            <option value="vibefid">VIBEFID</option>
            <option value="americanfootball">AFCL</option>
            <option value="gmvbrs">VBRS</option>
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
            {sortAttackByPower ? '⚡ Sorted by Power' : '⚡ Sort by Power'}
          </button>
        </div>

        {/* Selected Attack Deck Display */}
        <div className="mb-4 bg-red-900/40 border-2 border-red-600/50 rounded-xl p-3 flex-shrink-0">
          <div className={`grid gap-2 ${HAND_SIZE === 10 ? 'grid-cols-5 md:grid-cols-10' : 'grid-cols-5'}`}>
            {Array.from({ length: HAND_SIZE }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] border-2 border-dashed border-red-600/50 rounded-lg flex flex-col items-center justify-center overflow-hidden relative"
              >
                {attackSelectedCards[i] ? (
                  <>
                    <CardMedia
                      src={attackSelectedCards[i].imageUrl}
                      alt={`#${attackSelectedCards[i].tokenId}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-0.5 text-red-500 text-xs font-bold text-center">
                      {attackSelectedCards[i].power?.toLocaleString()}
                    </div>
                  </>
                ) : (
                  <span className="text-red-500 text-3xl">+</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-center">
            <p className="text-xs text-vintage-burnt-gold">Attack Power</p>
            <p className="text-2xl font-bold text-red-500">
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
                const isSelected = attackSelectedCards.find(c => c.tokenId === nft.tokenId);
                const isLocked = isCardLocked(nft.tokenId, 'attack');
                return (
                  <button
                    key={nft.tokenId}
                    onClick={() => {
                      if (isLocked) {
                        if (soundEnabled) AudioManager.buttonError();
                        return;
                      }
                      if (isSelected) {
                        setAttackSelectedCards(prev => prev.filter(c => c.tokenId !== nft.tokenId));
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
                    <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">
                      {nft.power?.toLocaleString()}
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
            className={`w-full px-6 py-4 rounded-xl font-display font-bold text-lg transition-all uppercase tracking-wide ${
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
            className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
