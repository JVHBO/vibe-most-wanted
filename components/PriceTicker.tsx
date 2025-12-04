'use client';

import { useCollectionPrices } from '@/lib/hooks/useCollectionPrices';
import { useEffect, useState } from 'react';

interface PriceTickerProps {
  className?: string;
}

export function PriceTicker({ className = '' }: PriceTickerProps) {
  const { prices, allPrices, isLoading, error } = useCollectionPrices();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (prices.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % prices.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [prices.length]);

  // Debug log
  useEffect(() => {
    console.log('[PriceTicker] prices:', prices.length, 'allPrices:', allPrices.length, 'error:', error);
  }, [prices, allPrices, error]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center gap-2 py-2 px-4 bg-vintage-deep-black rounded-lg border-2 border-vintage-gold/50 ${className}`}>
        <span className="text-vintage-burnt-gold text-sm animate-pulse">Loading prices...</span>
      </div>
    );
  }

  if (prices.length === 0) {
    return (
      <div className={`flex items-center justify-center gap-2 py-2 px-4 bg-vintage-deep-black rounded-lg border-2 border-vintage-gold/50 ${className}`}>
        <span className="text-vintage-burnt-gold text-sm">Fetching prices...</span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden py-2 px-4 bg-vintage-deep-black rounded-lg border-2 border-vintage-gold/50 shadow-[0_0_15px_rgba(255,215,0,0.15)] ${className}`}>
      <div className="flex items-center justify-center gap-6">
        <div className="hidden md:flex items-center gap-4 flex-wrap justify-center">
          {prices.map((price) => (
            <div key={price.id} className="flex items-center gap-1 text-sm">
              <span>{price.emoji}</span>
              <span className="text-vintage-burnt-gold font-bold">{price.displayName}:</span>
              <span className="text-vintage-gold font-mono">{price.priceUsd}</span>
            </div>
          ))}
        </div>
        <div className="md:hidden flex items-center gap-2 text-sm">
          <div key={prices[currentIndex]?.id} className="flex items-center gap-1 animate-fade-in">
            <span>{prices[currentIndex]?.emoji}</span>
            <span className="text-vintage-burnt-gold font-bold">{prices[currentIndex]?.displayName}:</span>
            <span className="text-vintage-gold font-mono">{prices[currentIndex]?.priceUsd}</span>
          </div>
          <div className="flex gap-1 ml-2">
            {prices.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex ? 'bg-vintage-gold' : 'bg-vintage-gold/30'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
