/**
 * All Collections Button + Modal
 * Shows a subtle button that opens a modal with all LTC collection prices
 * Includes VibeFID at the top with mint price and mint button
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCollectionPrices } from '@/lib/hooks/useCollectionPrices';
import { openMarketplace } from '@/lib/marketplace-utils';
import { sdk } from '@farcaster/miniapp-sdk';
import { isMiniappMode } from '@/lib/utils/miniapp';
import { MINT_PRICE } from '@/lib/contracts/VibeFIDABI';
import { useLanguage } from '@/contexts/LanguageContext';
import { AudioManager } from '@/lib/audio-manager';

// Marketplace URLs for each collection (only active collections)
const COLLECTION_MARKETPLACE: Record<string, string> = {
  vibe: 'https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT',
};

interface AllCollectionsButtonProps {
  className?: string;
}

export function AllCollectionsButton({ className = '' }: AllCollectionsButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; url: string; name: string }>({ show: false, url: '', name: '' });
  const { prices, ethUsdPrice } = useCollectionPrices();
  const isInFarcaster = isMiniappMode();
  const { t } = useLanguage();
  const router = useRouter();

  // Calculate VibeFID price in USD
  const vibeFidPriceEth = parseFloat(MINT_PRICE);
  const vibeFidPriceUsd = vibeFidPriceEth * ethUsdPrice;

  // Only show collections that are part of the game
  const gameCollections = prices.filter((p) => p.id === 'vibe');

  const handleCollectionClick = (collectionId: string, displayName: string) => {
    const marketplaceUrl = COLLECTION_MARKETPLACE[collectionId];
    if (marketplaceUrl) {
      setShowModal(false);
      setConfirmModal({ show: true, url: marketplaceUrl, name: displayName });
    }
  };

  const confirmOpen = async () => {
    if (confirmModal.url) {
      await openMarketplace(confirmModal.url, sdk, isInFarcaster);
    }
    setConfirmModal({ show: false, url: '', name: '' });
  };

  const handleVibeFidMint = () => {
    setShowModal(false);
    router.push('/fid');
  };

  return (
    <>
      {/* Subtle Button */}
      <button
        onClick={() => { AudioManager.buttonClick(); setShowModal(true); }}
        onMouseEnter={() => AudioManager.buttonHover()}
        className={`text-vintage-burnt-gold/70 hover:text-vintage-gold text-xs transition-all ${className}`}
      >
        {t('allCollections') || 'All Collections'} →
      </button>

      {/* Main Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-vintage-gold font-display font-bold text-lg">
                📊 {t('gameCollections') || 'Game Collections'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-vintage-burnt-gold hover:text-vintage-gold text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {/* Nothing Pack - goes to /shop */}
              <button
                onClick={() => { AudioManager.buttonClick(); setShowModal(false); router.push('/shop'); }}
                onMouseEnter={() => AudioManager.buttonHover()}
                className="w-full flex items-center justify-between p-3 bg-black hover:bg-vintage-charcoal rounded-xl transition-all group text-left border border-vintage-gold/30"
              >
                <span className="text-vintage-gold text-sm font-medium truncate flex-1">
                  🎁 Nothing Pack <span className="text-red-400 text-xs">(-50% power)</span>
                </span>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-yellow-400 text-sm font-bold">FREE</span>
                  <span className="px-2 py-1 bg-vintage-gold text-vintage-black text-xs font-bold rounded-lg">
                    Shop →
                  </span>
                </div>
              </button>

              {/* VibeFID - Special Entry */}
              <button
                onClick={() => { AudioManager.buttonClick(); handleVibeFidMint(); }}
                onMouseEnter={() => AudioManager.buttonHover()}
                className="w-full flex items-center justify-between p-3 bg-black hover:bg-vintage-charcoal rounded-xl transition-all group text-left border border-vintage-gold/30"
              >
                <span className="text-vintage-gold text-sm font-medium truncate flex-1">
                  🆔 VibeFID <span className="text-purple-400 text-xs">(5x power)</span>
                </span>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-green-400 text-sm font-bold">
                    ${vibeFidPriceUsd.toFixed(2)}
                  </span>
                  <span className="px-2 py-1 bg-vintage-gold text-vintage-black text-xs font-bold rounded-lg">
                    Mint
                  </span>
                </div>
              </button>

              {/* Regular Collections */}
              {gameCollections.map((priceData) => (
                <button
                  key={priceData.id}
                  onClick={() => {
                    AudioManager.buttonClick();
                    setShowModal(false);
                    router.push('/shop?slide=1');
                  }}
                  onMouseEnter={() => AudioManager.buttonHover()}
                  className="w-full flex items-center justify-between p-3 bg-black hover:bg-vintage-charcoal rounded-xl transition-all group text-left border border-vintage-gold/30"
                >
                  <span className="text-vintage-ice text-sm font-medium group-hover:text-vintage-gold truncate flex-1">
                    {priceData.emoji} {priceData.displayName} <span className="text-green-400 text-xs">(2x power)</span>
                  </span>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-green-400 text-sm font-bold">
                      {priceData.priceUsd}
                    </span>
                    <span className="px-2 py-1 bg-vintage-gold text-vintage-black text-xs font-bold rounded-lg">
                      Shop →
                    </span>
                  </div>
                </button>
              ))}
            </div>
            

            <button
              onClick={() => { AudioManager.buttonClick(); setShowModal(false); }}
              onMouseEnter={() => AudioManager.buttonHover()}
              className="mt-4 w-full py-2 bg-black hover:bg-vintage-charcoal text-vintage-gold border border-vintage-gold/30 font-display font-bold rounded-xl transition-all"
            >
              {t('close') || 'Close'}
            </button>
          </div>
        </div>
      )}

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
    </>
  );
}
