'use client';

import { useCollectionPrices } from '@/lib/hooks/useCollectionPrices';
import { useEffect, useState } from 'react';

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
};

interface PriceTickerProps {
  className?: string;
}

export function PriceTicker({ className = '' }: PriceTickerProps) {
  const { prices, isLoading } = useCollectionPrices();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

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
      <div className={`flex items-center justify-center gap-2 py-1 px-3 bg-vintage-deep-black rounded-lg border-2 border-vintage-gold/50 ${className}`}>
        <span className="text-vintage-burnt-gold text-xs animate-pulse">Loading prices...</span>
      </div>
    );
  }

  if (prices.length === 0) {
    return (
      <div className={`flex items-center justify-center gap-2 py-1 px-3 bg-vintage-deep-black rounded-lg border-2 border-vintage-gold/50 ${className}`}>
        <span className="text-vintage-burnt-gold text-xs">Fetching prices...</span>
      </div>
    );
  }

  const currentPrice = prices[currentIndex];
  const coverUrl = COLLECTION_COVERS[currentPrice?.id] || '';

  return (
    <div className={`overflow-hidden py-1 px-3 bg-vintage-deep-black rounded-lg border-2 border-vintage-gold/50 shadow-[0_0_15px_rgba(255,215,0,0.15)] ${className}`}>
      <div
        className={`flex items-center gap-2 text-xs transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        {coverUrl && (
          <img
            src={coverUrl}
            alt={currentPrice?.displayName}
            className="w-6 h-6 rounded object-cover"
          />
        )}
        <span className="text-vintage-burnt-gold font-bold">{currentPrice?.displayName} Pack:</span>
        <span className="text-vintage-gold font-mono">{currentPrice?.priceUsd}</span>
        {prices.length > 1 && (
          <div className="flex gap-1 ml-2">
            {prices.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex ? 'bg-vintage-gold' : 'bg-vintage-gold/30'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
