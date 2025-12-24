/**
 * Card Loading Screen Component
 *
 * Shows a full-screen loading overlay while cards are being fetched
 * Appears after wallet connection, with a subtle skip button
 */

import { useState, useEffect } from 'react';

interface CardLoadingScreenProps {
  isLoading: boolean;
  onSkip: () => void;
  cardsLoaded?: number;
}

export function CardLoadingScreen({
  isLoading,
  onSkip,
  cardsLoaded = 0,
}: CardLoadingScreenProps) {
  const [showSkip, setShowSkip] = useState(false);
  const [dots, setDots] = useState('');

  // Show skip button after 2 seconds
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowSkip(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowSkip(false);
    }
  }, [isLoading]);

  // Animate loading dots
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-vintage-black z-[500] flex flex-col items-center justify-center">
      {/* Loading Text */}
      <p className="text-vintage-gold font-display text-xl">
        Loading cards{dots}
      </p>
      {cardsLoaded > 0 && (
        <p className="text-vintage-burnt-gold text-sm mt-2 font-modern">
          {cardsLoaded} found
        </p>
      )}

      {/* Skip Button - appears after delay */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={onSkip}
          className={`
            text-vintage-burnt-gold/60 hover:text-vintage-burnt-gold text-sm font-modern
            transition-all duration-500
            ${showSkip ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          `}
        >
          skip
        </button>
      </div>
    </div>
  );
}
