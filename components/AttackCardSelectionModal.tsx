/**
 * Attack Card Selection Modal Component
 *
 * Modal for selecting cards to attack another player's defense deck
 * Includes:
 * - Card selection grid with locked card detection
 * - Sort by power functionality
 * - Attack preview and execution logic
 * - Battle animation triggers
 */

import { Dispatch, SetStateAction } from 'react';
import { AudioManager } from '@/lib/audio-manager';
import { devLog, devError } from '@/lib/utils/logger';
import { type UserProfile } from '@/lib/convex-profile';
import FoilCardEffect from '@/components/FoilCardEffect';
import { CardMedia } from '@/components/CardMedia';

interface Card {
  tokenId: string;
  power: number;
  imageUrl: string;
  name: string;
  rarity?: string;
  foil?: string;
}

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
  if (!showAttackCardSelection || !targetPlayer) return null;

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

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[150] p-4 overflow-y-auto" onClick={() => setShowAttackCardSelection(false)}>
      <div className="bg-vintage-charcoal rounded-2xl border-2 border-red-600 max-w-4xl w-full p-4 shadow-lg shadow-red-600/50 my-4 max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-3xl font-display font-bold text-center mb-2 text-red-500">
          † ATTACK {targetPlayer.username.toUpperCase()}
        </h2>
        <p className="text-center text-vintage-burnt-gold mb-6 text-sm font-modern">
          Choose {HAND_SIZE} cards to attack with ({attackSelectedCards.length}/{HAND_SIZE} selected)
        </p>

        {/* Selected Cards Display */}
        <div className="mb-3 p-2 bg-vintage-black/50 rounded-xl border border-red-600/50">
          <div className="grid grid-cols-5 gap-1.5">
            {attackSelectedCards.map((card, i) => (
              <div key={i} className="relative aspect-[2/3] rounded-lg overflow-hidden ring-2 ring-red-600 shadow-lg">
                <FoilCardEffect
                  foilType={(card.foil === 'Standard' || card.foil === 'Prize') ? card.foil : null}
                  className="w-full h-full"
                >
                  <CardMedia src={card.imageUrl} alt={`#${card.tokenId}`} className="w-full h-full object-cover" />
                </FoilCardEffect>
                <div className="absolute top-0 left-0 bg-red-600 text-white text-xs px-1 rounded-br font-bold">{card.power}</div>
              </div>
            ))}
            {Array(HAND_SIZE - attackSelectedCards.length).fill(0).map((_, i) => (
              <div key={`e-${i}`} className="aspect-[2/3] rounded-xl border-2 border-dashed border-red-600/40 flex items-center justify-center text-red-600/50 bg-vintage-felt-green/30">
                <span className="text-xl font-bold">+</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs text-vintage-burnt-gold">Your Attack Power</p>
            <p className="text-xl font-bold text-red-500">{attackSelectedCardsPower}</p>
          </div>
        </div>

        {/* Sort Button */}
        <div className="mb-2 flex justify-end">
          <button
            onClick={() => {
              setSortAttackByPower(!sortAttackByPower);
              if (soundEnabled) AudioManager.buttonClick();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-modern font-medium transition-all ${
              sortAttackByPower
                ? 'bg-vintage-gold text-vintage-black shadow-gold'
                : 'bg-vintage-charcoal border border-vintage-gold/30 text-vintage-gold hover:bg-vintage-gold/10'
            }`}
          >
            {sortAttackByPower ? '↓ Sort by Power' : '⇄ Default Order'}
          </button>
        </div>

        {/* Available Cards Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5 mb-4 max-h-[45vh] overflow-y-auto p-1">
          {sortedAttackNfts.map((nft) => {
            const isSelected = attackSelectedCards.find(c => c.tokenId === nft.tokenId);
            const isLocked = isCardLocked(nft.tokenId, 'attack');
            return (
              <div
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
                className={`relative aspect-[2/3] rounded-lg overflow-hidden transition-all ${
                  isLocked
                    ? 'opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'ring-4 ring-red-600 scale-95 cursor-pointer'
                    : 'hover:scale-105 hover:ring-2 hover:ring-vintage-gold/50 cursor-pointer'
                }`}
                title={isLocked ? "🔒 This card is locked in your defense deck" : undefined}
              >
                <CardMedia src={nft.imageUrl} alt={`#${nft.tokenId}`} className="w-full h-full object-cover" />
                <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">
                  {nft.power}
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
                    <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                      ✓
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleAttack}
            disabled={attackSelectedCards.length !== HAND_SIZE || isAttacking}
            className={`w-full px-6 py-4 rounded-xl font-display font-bold text-lg transition-all uppercase tracking-wide ${
              attackSelectedCards.length === HAND_SIZE && !isAttacking
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/50 hover:scale-105'
                : 'bg-vintage-black/50 text-vintage-gold/40 cursor-not-allowed border border-vintage-gold/20'
            }`}
          >
            {isAttacking ? (
              '... Attacking'
            ) : (
              <div className="flex items-center justify-between">
                <span>† Attack! ({attackSelectedCards.length}/{HAND_SIZE})</span>
                <span className="text-sm font-modern bg-green-500/30 px-2 py-1 rounded ml-2">FREE</span>
              </div>
            )}
          </button>

          <button
            onClick={() => {
              if (soundEnabled) AudioManager.buttonNav();
              setShowAttackCardSelection(false);
              setAttackSelectedCards([]);
              setTargetPlayer(null);
            }}
            className="w-full px-6 py-3 bg-vintage-black hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-modern font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
