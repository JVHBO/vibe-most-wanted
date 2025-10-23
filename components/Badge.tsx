'use client';

import { useState } from 'react';
import { Badge as BadgeType } from '@/lib/badges';

interface BadgeProps {
  badge: BadgeType;
  size?: 'sm' | 'md' | 'lg';
}

export default function Badge({ badge, size = 'md' }: BadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge */}
      <div
        className={`
          ${badge.color}
          ${badge.textColor}
          ${sizeClasses[size]}
          font-modern font-bold tracking-wider
          rounded-md
          border-2 ${badge.borderColor}
          flex items-center gap-1
          cursor-pointer
          transition-all duration-200
          hover:scale-105 hover:shadow-lg
          shadow-md
          backdrop-blur-sm
        `}
      >
        {badge.icon && <span className="text-xs leading-none">{badge.icon}</span>}
        <span className="leading-none">{badge.label}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && badge.description && (
        <div
          className="
            absolute z-50
            bottom-full left-1/2 -translate-x-1/2 mb-2
            bg-vintage-charcoal
            text-vintage-ice
            border-2 border-vintage-gold
            rounded-lg
            px-3 py-2
            text-sm font-modern
            whitespace-nowrap
            shadow-gold
            animate-fade-in
          "
        >
          {/* Tooltip arrow */}
          <div
            className="
              absolute top-full left-1/2 -translate-x-1/2
              -mt-[2px]
              w-0 h-0
              border-l-[6px] border-l-transparent
              border-r-[6px] border-r-transparent
              border-t-[6px] border-t-vintage-gold
            "
          />
          <div
            className="
              absolute top-full left-1/2 -translate-x-1/2
              -mt-[5px]
              w-0 h-0
              border-l-[5px] border-l-transparent
              border-r-[5px] border-r-transparent
              border-t-[5px] border-t-vintage-charcoal
            "
          />
          {badge.description}
        </div>
      )}
    </div>
  );
}

// Component for displaying multiple badges
interface BadgeListProps {
  badges: BadgeType[];
  size?: 'sm' | 'md' | 'lg';
}

export function BadgeList({ badges, size = 'md' }: BadgeListProps) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <Badge key={badge.type} badge={badge} size={size} />
      ))}
    </div>
  );
}
