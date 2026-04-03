"use client";

import Link from "next/link";
import { AudioManager } from "@/lib/audio-manager";
import { useLanguage } from "@/contexts/LanguageContext";

type GameMode = 'battle-ai' | 'mecha' | 'raid' | 'baccarat' | 'tcg';

interface GameGridProps {
  soundEnabled: boolean;
  disabled?: boolean;
  onSelect: (mode: GameMode) => void;
  userAddress?: string;
  onSpin?: () => void;
  isInFarcaster?: boolean;
}

const ArenaIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    <path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
  </svg>
);
const BossIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 C7 3 4 7 4 11 C4 14 6 16 8 17 L8 20 L16 20 L16 17 C18 16 20 14 20 11 C20 7 17 3 12 3 Z"/>
    <circle cx="9" cy="11" r="2" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="11" r="2" fill="currentColor" stroke="none"/>
    <line x1="10" y1="20" x2="10" y2="17"/><line x1="14" y1="20" x2="14" y2="17"/>
  </svg>
);
const BetIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="3"/>
    <circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/>
  </svg>
);

export function GameGrid({ soundEnabled, disabled, onSelect, onSpin, isInFarcaster }: GameGridProps) {
  const { t } = useLanguage();

  const btnStyle = isInFarcaster ? { height: 'clamp(74px, 11dvh, 100px)' } : {};
  const btn = `flex flex-col items-center justify-center gap-1 rounded-lg border border-vintage-gold/20 bg-vintage-charcoal/80 transition-all duration-200 ${isInFarcaster ? 'py-0 px-3' : 'py-4 px-3'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.97]'}`;

  return (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => { if (!disabled) { if (soundEnabled) AudioManager.buttonClick(); onSelect('mecha'); } }} onMouseEnter={() => soundEnabled && !disabled && AudioManager.buttonHover()} disabled={disabled} className={`${btn} hover:border-green-400/50`} style={btnStyle}>
        <div className="text-green-400 scale-110"><ArenaIcon /></div>
        <span className="text-vintage-gold font-display font-bold text-xs leading-tight tracking-wider uppercase">{t('gameArena' as any)}</span>
      </button>

      <Link href="/raid" onClick={() => soundEnabled && AudioManager.buttonClick()} onMouseEnter={() => soundEnabled && AudioManager.buttonHover()} className={`${btn} hover:border-red-400/50`} style={btnStyle}>
        <div className="text-red-400 scale-110"><BossIcon /></div>
        <span className="text-vintage-gold font-display font-bold text-xs leading-tight tracking-wider uppercase">{t('gameBoss' as any)}</span>
      </Link>

      <Link href="/baccarat" onClick={() => soundEnabled && AudioManager.buttonClick()} onMouseEnter={() => soundEnabled && AudioManager.buttonHover()} className={`${btn} hover:border-emerald-400/50`} style={btnStyle}>
        <div className="text-emerald-400 scale-110"><BetIcon /></div>
        <span className="text-vintage-gold font-display font-bold text-xs leading-tight tracking-wider uppercase">{t('gameBet' as any)}</span>
      </Link>

      {onSpin && (
        <button onClick={() => { if (soundEnabled) AudioManager.buttonClick(); onSpin(); }} onMouseEnter={() => soundEnabled && AudioManager.buttonHover()} className={`tour-spin-btn ${btn} bg-orange-600 border-black/20 hover:border-black/40 hover:bg-orange-500`} style={btnStyle}>
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
            <line x1="12" y1="2" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="22" y2="12"/>
            <line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/>
            <line x1="19.07" y1="4.93" x2="14.83" y2="9.17"/><line x1="9.17" y1="14.83" x2="4.93" y2="19.07"/>
          </svg>
          <span className="text-white font-display font-bold text-xs leading-tight tracking-wider uppercase">{t('gameSpin' as any)}</span>
        </button>
      )}
    </div>
  );
}
