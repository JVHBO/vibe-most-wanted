/**
 * Not Enough Cards Guide Component
 *
 * Shows a guide when player doesn't have enough cards to play
 * Explains what LTCs are and how to get them
 * Customized per game mode with specific card requirements
 */

import { getEnabledCollections } from '@/lib/collections';
import { useCollectionPrices } from '@/lib/hooks/useCollectionPrices';
import { TranslationKey } from '@/lib/translations';

interface NotEnoughCardsGuideProps {
  currentCards: number;
  requiredCards: number;
  gameMode: 'poker' | 'battle' | 'raid' | 'defense';
  onClose: () => void;
  t: (key: TranslationKey, params?: Record<string, any>) => string;
}

export function NotEnoughCardsGuide({
  currentCards,
  requiredCards,
  gameMode,
  onClose,
  t,
}: NotEnoughCardsGuideProps) {
  const collections = getEnabledCollections().filter(c => c.id !== 'nothing' && c.id !== 'custom');
  const { prices, isLoading: pricesLoading } = useCollectionPrices();

  // Game mode specific content
  const gameModeConfig: Record<string, { name: string; icon: string; description: string }> = {
    poker: {
      name: t('guidePokerName') || 'Poker Battle',
      icon: '🃏',
      description: t('guidePokerDesc') || 'Build a 10-card deck to play Texas Hold\'em style poker against other players or CPU. Use your best cards to form winning hands!',
    },
    battle: {
      name: t('guideBattleName') || 'Battle Auto',
      icon: '⚔️',
      description: t('guideBattleDesc') || 'Select 5 cards to battle against AI opponents. Higher power cards increase your chance of victory!',
    },
    raid: {
      name: t('guideRaidName') || 'Raid Boss',
      icon: '💀',
      description: t('guideRaidDesc') || 'Join forces with other players to defeat powerful bosses. Select 5 cards for your raid deck.',
    },
    defense: {
      name: t('guideDefenseName') || 'Defense Deck',
      icon: '🛡️',
      description: t('guideDefenseDesc') || 'Set up your Defense Deck with 5 strong cards. When other players attack you, this deck will defend your ranking automatically!',
    },
  };

  const config = gameModeConfig[gameMode];
  const cardsNeeded = requiredCards - currentCards;

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 overflow-y-auto">
      {/* Icon and Title */}
      <div className="text-5xl mb-3">{config.icon}</div>
      <h3 className="text-xl sm:text-2xl font-display font-bold text-red-400 mb-2">
        {t('guideNotEnoughTitle') || 'You Need More Cards!'}
      </h3>

      {/* Game Mode Explanation */}
      <div className="bg-vintage-black/50 border border-vintage-gold/30 rounded-xl p-3 mb-4 max-w-md">
        <h4 className="text-vintage-gold font-bold text-sm mb-1">{config.name}</h4>
        <p className="text-vintage-ice/80 text-xs leading-relaxed">{config.description}</p>
      </div>

      {/* Card Status */}
      <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-3 mb-4 max-w-md w-full">
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="text-center">
            <div className="text-red-400 text-2xl font-bold">{currentCards}</div>
            <div className="text-vintage-burnt-gold text-xs">{t('guideYourCards') || 'Your Cards'}</div>
          </div>
          <div className="text-vintage-burnt-gold text-xl">/</div>
          <div className="text-center">
            <div className="text-vintage-gold text-2xl font-bold">{requiredCards}</div>
            <div className="text-vintage-burnt-gold text-xs">{t('guideRequired') || 'Required'}</div>
          </div>
        </div>
        <p className="text-red-300 text-sm font-medium">
          {t('guideNeedMore')?.replace('{count}', cardsNeeded.toString()) || `You need ${cardsNeeded} more card${cardsNeeded !== 1 ? 's' : ''} to play!`}
        </p>
      </div>

      {/* What are LTCs? */}
      <div className="bg-vintage-charcoal/50 border border-vintage-gold/30 rounded-xl p-3 mb-4 max-w-md w-full">
        <h4 className="text-vintage-gold font-display font-bold text-sm mb-2">
          {t('guideWhatAreLTCs') || 'What are LTCs?'}
        </h4>
        <p className="text-vintage-ice/70 text-xs mb-2">
          {t('guideLTCExplanation') || 'LTCs (Liquid Trading Cards) are digital collectible cards on Base blockchain. Each card has a unique power level determined by its rarity and attributes.'}
        </p>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="text-green-400">●</span>
            <span className="text-vintage-burnt-gold">{t('guideCommon') || 'Common'}: 5-15 {t('guidePower') || 'power'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-400">●</span>
            <span className="text-vintage-burnt-gold">{t('guideRare') || 'Rare'}: 20-50 {t('guidePower') || 'power'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-purple-400">●</span>
            <span className="text-vintage-burnt-gold">{t('guideEpic') || 'Epic'}: 80-200 {t('guidePower') || 'power'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">●</span>
            <span className="text-vintage-burnt-gold">{t('guideLegendary') || 'Legendary'}: 240-600 {t('guidePower') || 'power'}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <button
          onClick={() => {
            onClose();
            window.location.href = '/shop';
          }}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-display font-bold rounded-xl transition-all hover:scale-105 shadow-lg text-sm"
        >
          🛒 {t('guideShopPacks') || 'Buy Card Packs'}
        </button>
      </div>

      {/* How to Get Cards */}
      <div className="w-full max-w-md bg-vintage-black/50 rounded-xl border border-vintage-gold/30 p-3 mb-4">
        <h4 className="text-vintage-gold font-display font-bold text-sm mb-2">
          {t('guideHowToGet') || 'How to Get Cards'}
        </h4>
        <div className="space-y-2 text-left">
          <div className="flex items-start gap-2">
            <span className="text-vintage-gold text-sm">1.</span>
            <p className="text-vintage-ice/80 text-xs">{t('guideStep1') || 'Buy card packs in the Shop with VBMS tokens'}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-vintage-gold text-sm">2.</span>
            <p className="text-vintage-ice/80 text-xs">{t('guideStep2') || 'Claim your daily FREE card in the Shop'}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-vintage-gold text-sm">3.</span>
            <p className="text-vintage-ice/80 text-xs">{t('guideStep3') || 'Trade on Vibe Market with ETH'}</p>
          </div>
        </div>
      </div>

      {/* Collections with Prices */}
      <div className="w-full max-w-md bg-vintage-black/50 rounded-xl border border-vintage-gold/30 p-3">
        <h4 className="text-vintage-gold font-display font-bold text-sm mb-2">
          📊 {t('guideLTCCollections') || 'LTC Collections'}
        </h4>
        <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
          {prices.map((priceData) => (
            <button
              key={priceData.id}
              onClick={() => {
                onClose();
                window.location.href = '/shop';
              }}
              className="w-full flex items-center justify-between p-2 bg-vintage-charcoal/50 hover:bg-vintage-gold/10 rounded-lg transition-all group text-left"
            >
              <span className="text-vintage-ice text-xs font-medium group-hover:text-vintage-gold truncate flex-1">
                {priceData.emoji} {priceData.displayName}
              </span>
              <div className="flex items-center gap-2 ml-2">
                {pricesLoading ? (
                  <span className="text-vintage-burnt-gold text-xs">...</span>
                ) : priceData.priceUsd ? (
                  <span className="text-green-400 text-xs font-bold">
                    {priceData.priceUsd}
                  </span>
                ) : (
                  <span className="text-vintage-burnt-gold text-xs">-</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onClose}
        className="mt-4 text-vintage-burnt-gold hover:text-vintage-gold transition-all underline text-sm"
      >
        ← {t('back')}
      </button>
    </div>
  );
}
