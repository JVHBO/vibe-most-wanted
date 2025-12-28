"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { AudioManager } from "@/lib/audio-manager";

interface QuickStatsProps {
  soundEnabled: boolean;
  totalPower: number;
  totalCards: number;
  attacksRemaining: number;
  maxAttacks: number;
}

export function QuickStats({
  soundEnabled,
  totalPower,
  totalCards,
  attacksRemaining,
  maxAttacks,
}: QuickStatsProps) {
  const { t } = useLanguage();

  const handleClick = () => {
    if (soundEnabled) AudioManager.buttonClick();
  };

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {/* Total Power */}
      <Link
        href="/leaderboard"
        onClick={handleClick}
        className="flex flex-col items-center justify-center py-2 bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/20 hover:border-vintage-gold/40 transition-all"
      >
        <span className="text-vintage-gold text-lg font-display font-bold">
          {totalPower >= 1000 ? `${(totalPower / 1000).toFixed(1)}K` : totalPower}
        </span>
        <span className="text-vintage-burnt-gold/70 text-[9px] font-modern">
          {t('totalPower')}
        </span>
      </Link>

      {/* Cards Count */}
      <div className="flex flex-col items-center justify-center py-2 bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/20">
        <span className="text-cyan-400 text-lg font-display font-bold">
          {totalCards}
        </span>
        <span className="text-vintage-burnt-gold/70 text-[9px] font-modern">
          {t('gameCards')}
        </span>
      </div>

      {/* Attacks Remaining */}
      <Link
        href="/leaderboard"
        onClick={handleClick}
        className="flex flex-col items-center justify-center py-2 bg-vintage-charcoal/80 rounded-lg border border-vintage-gold/20 hover:border-red-500/40 transition-all"
      >
        <span className="text-red-400 text-lg font-display font-bold">
          {attacksRemaining}/{maxAttacks}
        </span>
        <span className="text-vintage-burnt-gold/70 text-[9px] font-modern">
          {t('attacksAvailable')}
        </span>
      </Link>
    </div>
  );
}
