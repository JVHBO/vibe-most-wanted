"use client";

import Link from "next/link";
import { AudioManager } from "@/lib/audio-manager";
import { useLanguage } from "@/contexts/LanguageContext";

interface LockedGameModesProps {
  soundEnabled: boolean;
  hasCards: boolean;
  cardsLoading?: boolean;
  locked: boolean;
  onSelect: (mode: 'raid' | 'leaderboard') => void;
  isInFarcaster?: boolean;
}

export function LockedGameModes({
  soundEnabled,
  hasCards,
  cardsLoading,
  locked,
  onSelect,
  isInFarcaster,
}: LockedGameModesProps) {
  const t = useLanguage().t as (k: string) => string;

  return (
    <div className={`rounded-lg border-2 border-vintage-gold/20 p-2 ${isInFarcaster ? '' : ''}`}>
      {/* LOCKED header */}
      {!cardsLoading && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <svg className="w-4 h-4 text-vintage-gold/40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
          <span className="text-white font-display font-black text-sm uppercase tracking-wider">
            {locked ? t('locked') : ""}
          </span>
        </div>
      )}

      {/* Game cards grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Boss Raid */}
        {locked ? (
          <div className="rounded-lg bg-vintage-charcoal/50 border border-vintage-gold/10 p-2.5 flex flex-col items-center gap-1">
            <svg className="w-5 h-5 text-vintage-gold/30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 8 2 14 2 18c0 0 2.5 3 5 3s5-3 5-3 2.5 3 5 3 5-3 5-3c0-4-4.48-10-10-16zm0 12.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span className="text-vintage-gold/40 font-display font-bold text-[10px] uppercase tracking-wider">
              {t('gameBoss')}
            </span>
            <span className="text-green-400/60 text-[8px] font-bold uppercase">
              {t('bossRaidOnline')}
            </span>
          </div>
        ) : (
          <button
            onClick={() => { if (soundEnabled) AudioManager.buttonClick(); onSelect('raid'); }}
            onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
            className="rounded-lg bg-vintage-charcoal/80 border-2 border-red-400/30 p-2 flex flex-col items-center gap-1 hover:border-red-400/60 transition-all"
          >
            <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v5h4v2h-6V7z" />
            </svg>
            <span className="text-vintage-gold font-display font-bold text-[10px] uppercase tracking-wider">
              {t('gameBoss')}
            </span>
            <span className="text-green-400 text-[8px] font-bold uppercase">
              {t('bossRaidOnline')}
            </span>
          </button>
        )}

        {/* Leaderboard */}
        {locked ? (
          <div className="rounded-lg bg-vintage-charcoal/50 border border-vintage-gold/10 p-2.5 flex flex-col items-center gap-1">
            <svg className="w-5 h-5 text-vintage-gold/30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span className="text-vintage-gold/40 font-display font-bold text-[10px] uppercase tracking-wider">
              Leaderboard
            </span>
            <span className="text-vintage-gold/40 text-[8px] font-bold uppercase">
              {hasCards ? "" : t('needsCards')}
            </span>
          </div>
        ) : (
          <button
            onClick={() => { if (soundEnabled) AudioManager.buttonClick(); onSelect('leaderboard'); }}
            onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
            className="rounded-lg bg-vintage-charcoal/80 border-2 border-yellow-400/30 p-2 flex flex-col items-center gap-1 hover:border-yellow-400/60 transition-all"
          >
            <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span className="text-vintage-gold font-display font-bold text-[10px] uppercase tracking-wider">
              Leaderboard
            </span>
            <span className="text-green-400 text-[8px] font-bold uppercase">
              Ranking
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
