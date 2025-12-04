'use client';

import { useCollectionPrices } from '@/lib/hooks/useCollectionPrices';
import { useEffect, useState } from 'react';

interface PriceTickerProps {
  className?: string;
}

export function PriceTicker({ className = '' }: PriceTickerProps) {
  const { prices, isLoading } = useCollectionPrices();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotate through prices every 3 seconds
  useEffect(() => {
    if (prices.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % prices.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [prices.length]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center gap-2 py-2 px-4 bg-vintage-deep-black rounded-lg border-2 border-vintage-gold/50 ${className}`}>
        <span className="text-vintage-burnt-gold text-sm animate-pulse">Loading prices...</span>
      </div>
    );
  }

  if (prices.length === 0) {
    return null;
  }

  return (
    <div className={`overflow-hidden py-2 px-4 bg-vintage-deep-black rounded-lg border-2 border-vintage-gold/50 shadow-[0_0_15px_rgba(255,215,0,0.15)] ${className}`}>
      {/* Scrolling ticker */}
      <div className="flex items-center justify-center gap-6">
        {/* Show all prices in a row on desktop, rotating single on mobile */}
        <div className="hidden md:flex items-center gap-6 flex-wrap justify-center">
          {prices.map((price) => (
            <div key={price.id} className="flex items-center gap-1.5 text-sm">
              <span>{price.emoji}</span>
              <span className="text-vintage-burnt-gold font-bold">{price.displayName}</span>
              <span className="text-vintage-gold font-mono">{price.priceEth} ETH</span>
              <span className="text-vintage-burnt-gold/60">/100k</span>
            </div>
          ))}
        </div>

        {/* Mobile: Show one at a time with animation */}
        <div className="md:hidden flex items-center gap-2 text-sm">
          <div
            key={prices[currentIndex]?.id}
            className="flex items-center gap-1.5 animate-fade-in"
          >
            <span>{prices[currentIndex]?.emoji}</span>
            <span className="text-vintage-burnt-gold font-bold">{prices[currentIndex]?.displayName}</span>
            <span className="text-vintage-gold font-mono">{prices[currentIndex]?.priceEth} ETH</span>
            <span className="text-vintage-burnt-gold/60">/100k</span>
          </div>
          {/* Dots indicator */}
          <div className="flex gap-1 ml-2">
            {prices.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-vintage-gold' : 'bg-vintage-gold/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
