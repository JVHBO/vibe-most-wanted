'use client';

import { useCollectionPrices } from '@/lib/hooks/useCollectionPrices';
import { useCachedYesterdayPrices } from '@/lib/convex-cache';
import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { openMarketplace } from '@/lib/marketplace-utils';
import { isMiniappMode } from '@/lib/utils/miniapp';

// Collection cover images (from Mecha Arena)
const COLLECTION_COVERS: Record<string, string> = {
  vibe: 'https://nft-cdn.alchemy.com/base-mainnet/511915cc9b6f20839e2bf2999760530f',
  gmvbrs: 'https://nft-cdn.alchemy.com/base-mainnet/d0de7e9fa12eadb1ea2204e67d43e166',
  viberuto: 'https://nft-cdn.alchemy.com/base-mainnet/ec58759f6df558aa4193d58ae9b0e74f',
  coquettish: 'https://i2c.seadn.io/base/0xcdc74eeedc5ede1ef6033f22e8f0401af5b561ea/c428d7158e42cae9b29202d3f56d47/f1c428d7158e42cae9b29202d3f56d47.png?w=350',
  meowverse: 'https://nft-cdn.alchemy.com/base-mainnet/16a8f93f75def1a771cca7e417b5d05e',
  poorlydrawnpepes: 'https://nft-cdn.alchemy.com/base-mainnet/96282462557a81c42fad965a48c34f4c',
  teampothead: 'https://nft-cdn.alchemy.com/base-mainnet/ae56485394d1e5f37322d498f0ea11a0',
  tarot: 'https://nft-cdn.alchemy.com/base-mainnet/72ea458dbad1ce6a722306d811a42252',
  americanfootball: 'https://nft-cdn.alchemy.com/base-mainnet/5c023b39577f02927478fbd60c26d75e',
  baseballcabal: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2F45e455d7-cd23-459b-7ea9-db14c6d36000%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  vibefx: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2F5e6058d2-4c64-4cd9-ab57-66a939fec900%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  historyofcomputer: 'https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimagedelivery%2Fg4iQ0bIzMZrjFMgjAnSGfw%2Fa1a0d189-44e1-43e3-60dc-e8b053ec0c00%2Fw%3D600%2Cfit%3Dcontain%2Canim%3Dfalse',
  cumioh: 'https://nft-cdn.alchemy.com/base-mainnet/91c81987744291bea206aaf0d4feff40',
  viberotbangers: 'https://nft-cdn.alchemy.com/base-mainnet/1269ebe2e27ff8a041cb7253fb5687b6',
};

// Marketplace URLs for each collection
const COLLECTION_MARKETPLACE: Record<string, string> = {
  vibe: 'https://vibechain.com/market/vibe-most-wanted?ref=XCLR1DJ6LQTT',
  gmvbrs: 'https://vibechain.com/market/gm-vbrs?ref=XCLR1DJ6LQTT',
  viberuto: 'https://vibechain.com/market/viberuto-packs?ref=XCLR1DJ6LQTT',
  coquettish: 'https://vibechain.com/market/coquettish-1?ref=XCLR1DJ6LQTT',
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

interface PriceTickerProps {
  className?: string;
}

export function PriceTicker({ className = '' }: PriceTickerProps) {
  const { prices, isLoading } = useCollectionPrices();
  // 🚀 BANDWIDTH FIX: Use cached hook (prices change once per day, not real-time)
  const { prices: yesterdayPrices } = useCachedYesterdayPrices();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const isInFarcaster = isMiniappMode();

  // Rotate through collections with fade effect
  useEffect(() => {
    if (prices.length <= 1) return;
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % prices.length);
        setIsVisible(true);
      }, 200);
    }, 3000);
    return () => clearInterval(interval);
  }, [prices.length]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center gap-2 py-3 px-4 bg-vintage-deep-black rounded-xl border-2 border-vintage-gold/50 w-full ${className}`}>
        <span className="text-vintage-burnt-gold text-xs animate-pulse">Loading prices...</span>
      </div>
    );
  }

  if (prices.length === 0) {
    return (
      <div className={`flex items-center justify-center gap-2 py-3 px-4 bg-vintage-deep-black rounded-xl border-2 border-vintage-gold/50 w-full ${className}`}>
        <span className="text-vintage-burnt-gold text-xs">Fetching prices...</span>
      </div>
    );
  }

  const currentPrice = prices[currentIndex];
  const coverUrl = COLLECTION_COVERS[currentPrice?.id] || '';
  const marketplaceUrl = COLLECTION_MARKETPLACE[currentPrice?.id] || '';

  // Handle click - open marketplace
  const handleClick = async () => {
    if (marketplaceUrl) {
      await openMarketplace(marketplaceUrl, sdk, isInFarcaster);
    }
  };

  // Calculate price change direction
  let priceDirection: 'up' | 'down' | 'neutral' = 'neutral';
  let percentChange = 0;

  if (yesterdayPrices?.prices && currentPrice) {
    const yesterdayPrice = yesterdayPrices.prices[currentPrice.id];
    if (yesterdayPrice) {
      const currentUsd = parseFloat(currentPrice.priceUsd.replace('$', '').replace(',', ''));
      const yesterdayUsd = yesterdayPrice.priceUsd;
      if (currentUsd > yesterdayUsd) {
        priceDirection = 'up';
        percentChange = ((currentUsd - yesterdayUsd) / yesterdayUsd) * 100;
      } else if (currentUsd < yesterdayUsd) {
        priceDirection = 'down';
        percentChange = ((yesterdayUsd - currentUsd) / yesterdayUsd) * 100;
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`overflow-hidden py-3 px-4 bg-vintage-deep-black rounded-xl border-2 border-vintage-gold/50 w-full hover:border-vintage-gold animate-[glow-pulse_2.5s_ease-in-out_infinite] transition-all cursor-pointer ${className}`}
      title={`Buy ${currentPrice?.displayName} Packs`}
    >
      <div
        className={`flex items-center justify-center gap-3 text-sm transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        {coverUrl && (
          <img
            src={coverUrl}
            alt={currentPrice?.displayName}
            className="w-7 h-7 rounded-lg object-cover"
          />
        )}
        <span className="text-vintage-burnt-gold font-bold">{currentPrice?.displayName} Pack:</span>
        <span className="text-vintage-gold font-mono">{currentPrice?.priceUsd}</span>
        {/* Price direction indicator */}
        {priceDirection !== 'neutral' && (
          <span className={`flex items-center gap-0.5 ${priceDirection === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {priceDirection === 'up' ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-xs font-semibold">{percentChange.toFixed(1)}%</span>
          </span>
        )}
      </div>
    </button>
  );
}
