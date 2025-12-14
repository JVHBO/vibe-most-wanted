'use client';

import { useState } from 'react';
import { Badge as BadgeType } from '@/lib/badges';

interface BadgeProps {
  badge: BadgeType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function Badge({ badge, size = 'md' }: BadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Minimum text sizes for mobile readability (10px min, 12px preferred)
  const sizeClasses = {
    xs: 'text-[10px] px-1 py-0.5',      // Was 7px - increased for readability
    sm: 'text-[11px] px-1.5 py-1',      // Was 10px - increased + better touch target
    md: 'text-xs px-2 py-1',            // 12px - good
    lg: 'text-sm px-3 py-1.5',          // 14px - good + better touch target
  };

  // Toggle tooltip on touch for mobile
  const handleTouch = () => setShowTooltip(prev => !prev);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={handleTouch}
    >
      {/* Badge */}
      {badge.type === 'gey' ? (
        // Special rainbow gradient border for gey badge
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-md opacity-75"></div>
          <div
            className={`
              relative
              ${badge.color}
              ${badge.textColor}
              ${sizeClasses[size]}
              font-modern font-bold tracking-wider
              rounded-md
              flex items-center gap-1
              cursor-pointer
              transition-all duration-200
              hover:scale-105 hover:shadow-lg
              shadow-md
              backdrop-blur-sm
              m-0.5
            `}
          >
            {badge.icon && <span className="text-[10px] sm:text-xs leading-none">{badge.icon}</span>}
            <span className="leading-none">{badge.label}</span>
          </div>
        </div>
      ) : (
        // All other badges with gradient border
        <div className="relative">
          <div className={`absolute inset-0 ${badge.borderColor} rounded-md opacity-75`}></div>
          <div
            className={`
              relative
              ${badge.color}
              ${badge.textColor}
              ${sizeClasses[size]}
              font-modern font-bold tracking-wider
              rounded-md
              flex items-center gap-1
              cursor-pointer
              transition-all duration-200
              hover:scale-105 hover:shadow-lg
              shadow-md
              backdrop-blur-sm
              m-0.5
            `}
          >
            {badge.icon && <span className="text-[10px] sm:text-xs leading-none">{badge.icon}</span>}
            <span className="leading-none">{badge.label}</span>
          </div>
        </div>
      )}

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
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function BadgeList({ badges, size = 'md' }: BadgeListProps) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <Badge key={badge.type} badge={badge} size={size} />
      ))}
    </div>
  );
}
