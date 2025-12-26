"use client";

import { AudioManager } from "@/lib/audio-manager";
import { CardMedia } from "@/components/CardMedia";
import type { Card, CardRarity } from "@/lib/types/card";

interface CardsPreviewProps {
  cards: Card[];
  soundEnabled: boolean;
  loading?: boolean;
  onViewAll: () => void;
}

const RARITY_BORDERS: Record<CardRarity, string> = {
  Mythic: 'border-pink-400',
  Legendary: 'border-yellow-400',
  Epic: 'border-purple-400',
  Rare: 'border-blue-400',
  Common: 'border-vintage-ice/50',
};

export function CardsPreview({ cards, soundEnabled, loading = false, onViewAll }: CardsPreviewProps) {
  const handleViewAll = () => {
    if (soundEnabled) AudioManager.buttonClick();
    onViewAll();
  };

  // Take first 5 cards for preview
  const previewCards = cards.slice(0, 5);

  return (
    <div className="bg-vintage-charcoal/80 backdrop-blur-sm rounded-xl border border-vintage-gold/30 px-3 py-2">
      <div className="flex items-center gap-2">
        {/* Card previews */}
        <div className="flex -space-x-2 flex-1">
          {loading ? (
            // Loading skeleton with animation
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-10 h-14 rounded-md bg-vintage-charcoal border-2 border-vintage-gold/20 animate-pulse"
                  style={{ zIndex: 5 - i, animationDelay: `${i * 100}ms` }}
                />
              ))}
            </>
          ) : previewCards.length > 0 ? (
            previewCards.map((card, idx) => (
              <div
                key={card.tokenId || idx}
                className={`
                  w-10 h-14 rounded-md overflow-hidden
                  border-2 ${RARITY_BORDERS[card.rarity] || RARITY_BORDERS.Common}
                  shadow-md
                `}
                style={{ zIndex: 5 - idx }}
              >
                <CardMedia
                  src={card.imageUrl || ''}
                  alt={card.name || 'Card'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))
          ) : (
            // Empty state
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-10 h-14 rounded-md bg-vintage-charcoal border-2 border-vintage-gold/20"
                  style={{ zIndex: 5 - i }}
                />
              ))}
            </>
          )}
        </div>

        {/* View all button */}
        <button
          onClick={handleViewAll}
          disabled={loading}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg bg-vintage-gold/10 border border-vintage-gold/30 transition-all ${
            loading ? 'opacity-70' : 'hover:bg-vintage-gold/20 hover:border-vintage-gold/50'
          }`}
        >
          {loading ? (
            <>
              <svg className="w-3 h-3 text-vintage-gold animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-vintage-gold text-xs font-modern whitespace-nowrap">Loading...</span>
            </>
          ) : (
            <>
              <span className="text-vintage-gold text-xs font-modern whitespace-nowrap">
                {cards.length > 0 ? `${cards.length} Cards` : 'No Cards'}
              </span>
              <svg className="w-4 h-4 text-vintage-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
