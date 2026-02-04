"use client";

import Image from 'next/image';
import { getCardDisplayPower } from '@/lib/power-utils';

export interface CardDisplayProps {
  card: {
    imageUrl?: string;
    tokenId?: string;
    name?: string;
    power?: number;
    collection?: string;
    rarity?: string;
  };
  isSelected?: boolean;
  onClick?: () => void;
  showPower?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-16 h-24',
  md: 'w-24 h-36',
  lg: 'w-32 h-48',
};

export function CardDisplay({
  card,
  isSelected = false,
  onClick,
  showPower = true,
  size = 'md',
}: CardDisplayProps) {
  const displayPower = getCardDisplayPower(card);
  const alt = card.name || `#${card.tokenId || 'card'}`;

  return (
    <button
      onClick={onClick}
      className={`${sizeClasses[size]} relative rounded-lg overflow-hidden border-2 transition ${
        isSelected
          ? 'border-vintage-neon-blue shadow-neon scale-95'
          : 'border-vintage-gold/30 hover:border-vintage-gold/60 hover:scale-105'
      }`}
    >
      {card.imageUrl ? (
        <Image
          src={card.imageUrl}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 25vw, 10vw"
        />
      ) : (
        <div className="w-full h-full bg-vintage-charcoal flex items-center justify-center">
          <span className="text-vintage-gold/50 text-xs">No img</span>
        </div>
      )}
      {showPower && (
        <div className="absolute top-0 left-0 bg-vintage-gold text-vintage-black text-xs px-1 rounded-br font-bold">
          {displayPower.toLocaleString()}
        </div>
      )}
      {isSelected && (
        <div className="absolute inset-0 bg-vintage-neon-blue/20 flex items-center justify-center">
          <span className="text-4xl text-vintage-neon-blue">&#10003;</span>
        </div>
      )}
    </button>
  );
}
