'use client';

import { useCollectionPrices } from '@/lib/hooks/useCollectionPrices';
import { useCachedYesterdayPrices } from '@/lib/convex-cache';
import { useState, memo } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { openMarketplace } from '@/lib/marketplace-utils';
import { isMiniappMode } from '@/lib/utils/miniapp';
import { useLanguage } from '@/contexts/LanguageContext';

// Marketplace URLs for each collection
const COLLECTION_MARKETPLACE: Record<string, string> = {
  vibe: 'https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT',
  gmvbrs: 'https://vibechain.com/market/gm-vbrs?ref=XCLR1DJ6LQTT',
  viberuto: 'https://vibechain.com/market/viberuto-packs?ref=XCLR1DJ6LQTT',
  meowverse: 'https://vibechain.com/market/meowverse?ref=XCLR1DJ6LQTT',
  poorlydrawnpepes: 'https://vibechain.com/market/poorly-drawn-pepes?ref=XCLR1DJ6LQTT',
  teampothead: 'https://vibechain.com/market/team-pothead?ref=XCLR1DJ6LQTT',
  tarot: 'https://vibechain.com/market/tarot?ref=XCLR1DJ6LQTT',
  baseballcabal: 'https://vibechain.com/market/base-ball-cabal?ref=XCLR1DJ6LQTT',
  vibefx: 'https://vibechain.com/market/vibe-fx?ref=XCLR1DJ6LQTT',
  historyofcomputer: 'https://vibechain.com/market/historyofcomputer?ref=XCLR1DJ6LQTT',
  cumioh: 'https://vibechain.com/market/cu-mi-oh?ref=XCLR1DJ6LQTT',
  viberotbangers: 'https://vibechain.com/market/vibe-rot-bangers?ref=XCLR1DJ6LQTT',
};

interface PriceTickerProps {
  className?: string;
}

// Memoize to prevent re-renders affecting siblings
export const PriceTicker = memo(function PriceTicker({ className = '' }: PriceTickerProps) {
  const { prices, isLoading } = useCollectionPrices();
  const { prices: yesterdayPrices } = useCachedYesterdayPrices();
  const { t } = useLanguage();
  const isInFarcaster = isMiniappMode();
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; url: string; name: string }>({ show: false, url: '', name: '' });

  // Handle click - show confirmation modal
  const handleClick = (collectionId: string, displayName: string) => {
    const marketplaceUrl = COLLECTION_MARKETPLACE[collectionId];
    if (marketplaceUrl) {
      setConfirmModal({ show: true, url: marketplaceUrl, name: displayName });
    }
  };

  const confirmOpen = async () => {
    if (confirmModal.url) {
      await openMarketplace(confirmModal.url, sdk, isInFarcaster);
    }
    setConfirmModal({ show: false, url: '', name: '' });
  };

  // Calculate price direction for each collection
  const getPriceDirection = (collectionId: string, currentPriceUsd: string): { direction: 'up' | 'down' | 'neutral'; percent: number } => {
    if (!yesterdayPrices?.prices) return { direction: 'neutral', percent: 0 };
    const yesterdayPrice = yesterdayPrices.prices[collectionId];
    if (!yesterdayPrice) return { direction: 'neutral', percent: 0 };

    const currentUsd = parseFloat(currentPriceUsd.replace('$', '').replace(',', ''));
    const yesterdayUsd = yesterdayPrice.priceUsd;

    if (currentUsd > yesterdayUsd) {
      return { direction: 'up', percent: ((currentUsd - yesterdayUsd) / yesterdayUsd) * 100 };
    } else if (currentUsd < yesterdayUsd) {
      return { direction: 'down', percent: ((yesterdayUsd - currentUsd) / yesterdayUsd) * 100 };
    }
    return { direction: 'neutral', percent: 0 };
  };

  if (isLoading || prices.length === 0) {
    return (
      <div className={`h-6 flex items-center justify-center bg-vintage-deep-black/50 rounded-lg overflow-hidden ${className}`}>
        <span className="text-vintage-burnt-gold text-[10px] animate-pulse">{t('tickerLoading')}</span>
      </div>
    );
  }

  // Duplicate prices for seamless loop
  const tickerItems = [...prices, ...prices];

  return (
    <>
      <div className={`h-6 bg-vintage-deep-black/50 rounded-lg overflow-hidden relative ${className}`}>
        <div className="flex animate-ticker whitespace-nowrap">
          {tickerItems.map((price, idx) => {
            const { direction, percent } = getPriceDirection(price.id, price.priceUsd);
            return (
              <button
                key={`${price.id}-${idx}`}
                onClick={() => handleClick(price.id, price.displayName)}
                className="inline-flex items-center gap-0.5 px-1.5 text-[10px] hover:bg-vintage-gold/20 transition-colors h-6"
              >
                <span className="text-vintage-burnt-gold/80">{price.emoji}</span>
                <span className="text-vintage-burnt-gold font-medium">{price.displayName}</span>
                <span className="text-vintage-gold font-mono">{price.priceUsd}</span>
                {direction !== 'neutral' && (
                  <span className={direction === 'up' ? 'text-green-400' : 'text-red-400'}>
                    {direction === 'up' ? '▲' : '▼'}{percent.toFixed(1)}%
                  </span>
                )}
                <span className="text-vintage-burnt-gold/30 mx-1">|</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-sm">
            <h3 className="text-vintage-gold font-display font-bold text-lg mb-3 text-center">
              {t('confirmOpenMarket') || 'Open Vibe Market?'}
            </h3>
            <p className="text-vintage-ice/80 text-sm text-center mb-4">
              {t('confirmOpenMarketDesc')?.replace('{name}', confirmModal.name) || `You will be redirected to Vibe Market to buy ${confirmModal.name} packs.`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmModal({ show: false, url: '', name: '' })}
                className="flex-1 py-2 bg-vintage-burnt-gold/30 hover:bg-vintage-burnt-gold/50 text-vintage-gold font-display font-bold rounded-xl transition-all"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={confirmOpen}
                className="flex-1 py-2 bg-vintage-gold hover:bg-yellow-500 text-vintage-black font-display font-bold rounded-xl transition-all"
              >
                {t('confirm') || 'Open'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker ${prices.length * 3}s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
});

PriceTicker.displayName = "PriceTicker";
