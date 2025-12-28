/**
 * All Collections Button + Modal
 * Shows a subtle button that opens a modal with all LTC collection prices
 * Includes VibeFID at the end with mint price and mint button
 */

import { useState } from 'react';
import { useCollectionPrices } from '@/lib/hooks/useCollectionPrices';
import { openMarketplace } from '@/lib/marketplace-utils';
import { sdk } from '@farcaster/miniapp-sdk';
import { isMiniappMode } from '@/lib/utils/miniapp';
import { MINT_PRICE } from '@/lib/contracts/VibeFIDABI';

// Marketplace URLs for each collection
const COLLECTION_MARKETPLACE: Record<string, string> = {
  vibe: 'https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT',
  gmvbrs: 'https://vibechain.com/market/gm-vbrs?ref=XCLR1DJ6LQTT',
  viberuto: 'https://vibechain.com/market/viberuto-packs?ref=XCLR1DJ6LQTT',
  meowverse: 'https://vibechain.com/market/meowverse?ref=XCLR1DJ6LQTT',
  poorlydrawnpepes: 'https://vibechain.com/market/poorly-drawn-pepes?ref=XCLR1DJ6LQTT',
  teampothead: 'https://vibechain.com/market/team-pothead?ref=XCLR1DJ6LQTT',
  tarot: 'https://vibechain.com/market/tarot?ref=XCLR1DJ6LQTT',
  americanfootball: 'https://vibechain.com/market/american-football?ref=XCLR1DJ6LQTT',
  baseballcabal: 'https://vibechain.com/market/base-ball-cabal?ref=XCLR1DJ6LQTT',
  vibefx: 'https://vibechain.com/market/vibe-fx?ref=XCLR1DJ6LQTT',
  historyofcomputer: 'https://vibechain.com/market/historyofcomputer?ref=XCLR1DJ6LQTT',
  cumioh: 'https://vibechain.com/market/cu-mi-oh?ref=XCLR1DJ6LQTT',
  viberotbangers: 'https://vibechain.com/market/vibe-rot-bangers?ref=XCLR1DJ6LQTT',
};

interface AllCollectionsButtonProps {
  className?: string;
}

export function AllCollectionsButton({ className = '' }: AllCollectionsButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const { prices, ethUsdPrice } = useCollectionPrices();
  const isInFarcaster = isMiniappMode();

  // Calculate VibeFID price in USD
  const vibeFidPriceEth = parseFloat(MINT_PRICE);
  const vibeFidPriceUsd = vibeFidPriceEth * ethUsdPrice;

  const handleCollectionClick = async (collectionId: string) => {
    const marketplaceUrl = COLLECTION_MARKETPLACE[collectionId];
    if (marketplaceUrl) {
      setShowModal(false);
      await openMarketplace(marketplaceUrl, sdk, isInFarcaster);
    }
  };

  const handleVibeFidMint = () => {
    setShowModal(false);
    window.location.href = '/fid';
  };

  return (
    <>
      {/* Subtle Button */}
      <button
        onClick={() => setShowModal(true)}
        className={`text-vintage-burnt-gold/70 hover:text-vintage-gold text-xs transition-all ${className}`}
      >
        All Collections →
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-vintage-charcoal border-2 border-vintage-gold rounded-2xl p-4 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-vintage-gold font-display font-bold text-lg">
                📊 LTC Collections
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-vintage-burnt-gold hover:text-vintage-gold text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {/* VibeFID - Special Entry (First) */}
              <button
                onClick={handleVibeFidMint}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-900/50 to-pink-900/50 hover:from-purple-800/50 hover:to-pink-800/50 rounded-xl transition-all group text-left border border-purple-500/50"
              >
                <span className="text-vintage-ice text-sm font-medium group-hover:text-vintage-gold truncate flex-1">
                  🆔 VibeFID
                </span>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-green-400 text-sm font-bold">
                    ${vibeFidPriceUsd.toFixed(2)}
                  </span>
                  <span className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg">
                    Mint
                  </span>
                </div>
              </button>

              {/* Regular Collections */}
              {prices.map((priceData) => (
                <button
                  key={priceData.id}
                  onClick={() => handleCollectionClick(priceData.id)}
                  className="w-full flex items-center justify-between p-3 bg-vintage-black/50 hover:bg-vintage-gold/20 rounded-xl transition-all group text-left border border-vintage-gold/30"
                >
                  <span className="text-vintage-ice text-sm font-medium group-hover:text-vintage-gold truncate flex-1">
                    {priceData.emoji} {priceData.displayName}
                  </span>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-green-400 text-sm font-bold">
                      {priceData.priceUsd}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full py-2 bg-vintage-gold/20 hover:bg-vintage-gold/30 text-vintage-gold font-display font-bold rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
