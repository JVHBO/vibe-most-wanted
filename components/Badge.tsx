'use client';

import { Badge as BadgeType } from '@/lib/badges';

interface BadgeProps {
  badge: BadgeType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const CrownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L9 9L1 6L4 18H20L23 6L15 9L12 1Z"/>
    <rect x="4" y="18" width="16" height="3" rx="1"/>
  </svg>
);

const DiamondIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 9L12 22L22 9L12 2Z"/>
  </svg>
);

export default function Badge({ badge, size = 'md' }: BadgeProps) {
  const sizeClasses: Record<string, string> = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (badge.type === 'dev') {
    return <CrownIcon className={`${sizeClasses[size]} text-vintage-gold`} />;
  }

  if (badge.type === 'vibe') {
    return <DiamondIcon className={`${sizeClasses[size]} text-vintage-gold`} />;
  }

  return (
    <span className="text-vintage-gold text-sm">
      {badge.icon}
    </span>
  );
}

interface BadgeListProps {
  badges: BadgeType[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function BadgeList({ badges, size = 'md' }: BadgeListProps) {
  if (badges.length === 0) return null;

  return (
    <span className="flex items-center gap-1">
      {badges.map((badge) => (
        <Badge key={badge.type} badge={badge} size={size} />
      ))}
    </span>
  );
}
