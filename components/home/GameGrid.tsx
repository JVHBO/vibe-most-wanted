"use client";

import Link from "next/link";
import { AudioManager } from "@/lib/audio-manager";
import { useLanguage } from "@/contexts/LanguageContext";

type GameMode = 'battle-ai' | 'mecha' | 'raid' | 'baccarat' | 'tcg';

// Wallets allowed to access TCG (testing phase)
const TCG_ALLOWED_WALLETS = [
  "0x2a9585da40de004d6ff0f5f12cfe726bd2f98b52", // zoboo
];

interface GameGridProps {
  soundEnabled: boolean;
  disabled?: boolean;
  onSelect: (mode: GameMode) => void;
  userAddress?: string; // For conditional TCG access
  onSpin?: () => void; // SPIN roulette callback
  isInFarcaster?: boolean;
}

// SVG Icons - outline/sticker style

// Lock/shield icon for Battle Auto
const AutoIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

// Sword/pen icon for Arena
const ArenaIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

// Skull icon for Raid Boss
const BossIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {/* Cranio */}
    <path d="M12 3 C7 3 4 7 4 11 C4 14 6 16 8 17 L8 20 L16 20 L16 17 C18 16 20 14 20 11 C20 7 17 3 12 3 Z" />
    {/* Olhos vazios */}
    <circle cx="9" cy="11" r="2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="11" r="2" fill="currentColor" stroke="none" />
    {/* Dentes */}
    <line x1="10" y1="20" x2="10" y2="17" />
    <line x1="14" y1="20" x2="14" y2="17" />
  </svg>
);

// Dice icon for Bet/Baccarat
const BetIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="3" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="16" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="16" r="1.5" fill="currentColor" />
    <circle cx="16" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

// Cards icon for TCG
const CardsIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="14" height="18" rx="2" />
    <path d="M8 2h10a2 2 0 012 2v14" />
  </svg>
);

// Game mode configurations with translation keys
const gameModeConfigs: { id: GameMode; icon: React.ReactNode; labelKey: string; sublabel: string; cards: number | string | null; iconColor: string; accentColor: string; isLink?: boolean; href?: string; fullWidth?: boolean; comingSoon?: boolean; restricted?: boolean; isNew?: boolean }[] = [
  {
    id: 'mecha',
    icon: <ArenaIcon />,
    labelKey: 'gameArena',
    sublabel: '',
    cards: null,
    iconColor: 'text-green-400',
    accentColor: 'hover:border-green-400/50',
  },
  {
    id: 'raid',
    icon: <BossIcon />,
    labelKey: 'gameBoss',
    sublabel: '',
    cards: null,
    iconColor: 'text-red-400',
    accentColor: 'hover:border-red-400/50',
    isLink: true,
    href: '/raid',
  },
  {
    id: 'baccarat',
    icon: <BetIcon />,
    labelKey: 'gameBet',
    sublabel: '',
    cards: null,
    iconColor: 'text-emerald-400',
    accentColor: 'hover:border-emerald-400/50',
    isLink: true,
    href: '/baccarat',
  },
];

export function GameGrid({ soundEnabled, disabled, onSelect, userAddress, onSpin, isInFarcaster }: GameGridProps) {
  const { t } = useLanguage();

  const handleClick = (mode: GameMode) => {
    if (disabled) return;
    if (soundEnabled) AudioManager.buttonClick();
    onSelect(mode);
  };

  // Check TCG access
  const isAllowedTCG = userAddress && TCG_ALLOWED_WALLETS.includes(userAddress.toLowerCase());

  // clamp: mín 80px (SE), escala com tela, máx 130px (Pro Max) — mantém proporção visual igual à referência
  const btnStyle = isInFarcaster ? { height: 'clamp(74px, 11dvh, 100px)' } : {};

  return (
    <div className="grid grid-cols-2 gap-2 px-0">
      {gameModeConfigs.map((mode) => {
        // Show "SOON" for restricted modes if user doesn't have access
        const showAsSoon = mode.restricted && !isAllowedTCG;
        const buttonContent = (
          <>
            <div className={`${mode.iconColor} scale-110`}>{mode.icon}</div>
            <span className="text-vintage-gold font-display font-bold text-xs leading-tight tracking-wider uppercase">
              {t(mode.labelKey as any)}
            </span>
          </>
        );

        const isSoon = mode.comingSoon || showAsSoon;
        const isDisabled = disabled || isSoon;
        const buttonClasses = `
          flex flex-col items-center justify-center gap-1
          ${isInFarcaster ? 'py-0 px-3' : 'py-4 px-3'} rounded-lg
          bg-vintage-charcoal/80
          border border-vintage-gold/20
          ${isSoon ? '' : mode.accentColor}
          ${isSoon ? '' : 'hover:bg-vintage-charcoal'}
          transition-all duration-200
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.97]'}
          ${mode.fullWidth ? 'col-span-2' : ''}
          relative
        `;

        // NEW badge component
        const newBadge = mode.isNew && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-pulse z-10">
            NEW
          </span>
        );

        // For restricted modes that user can access, still use Link
        if (mode.isLink && mode.href && !showAsSoon) {
          return (
            <Link
              key={mode.id}
              href={mode.href}
              onClick={() => soundEnabled && AudioManager.buttonClick()}
              onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
              className={buttonClasses}
              style={btnStyle}
            >
              {newBadge}
              {buttonContent}
            </Link>
          );
        }

        return (
          <button
            key={mode.id}
            onClick={() => !isSoon && handleClick(mode.id)}
            onMouseEnter={() => soundEnabled && !isSoon && AudioManager.buttonHover()}
            disabled={isDisabled}
            className={buttonClasses}
            style={btnStyle}
          >
            {newBadge}
            {buttonContent}
            {isSoon && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                <span className="text-vintage-gold font-display font-bold text-xs tracking-wider">SOON</span>
              </span>
            )}
          </button>
        );
      })}

      {/* SPIN - same row as Baccarat */}
      {onSpin && (
        <button
          onClick={() => {
            if (soundEnabled) AudioManager.buttonClick();
            onSpin();
          }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          style={btnStyle}
          className={`tour-spin-btn flex flex-col items-center justify-center gap-1 ${isInFarcaster ? 'py-0 px-3' : 'py-4 px-3'} rounded-lg bg-orange-600 border border-black/20 hover:border-black/40 hover:bg-orange-500 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 relative`}
        >
          <svg className="w-7 h-7 text-white scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="2.5" />
            <line x1="12" y1="2" x2="12" y2="9.5" />
            <line x1="12" y1="14.5" x2="12" y2="22" />
            <line x1="2" y1="12" x2="9.5" y2="12" />
            <line x1="14.5" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="8.28" y2="8.28" />
            <line x1="15.72" y1="15.72" x2="19.07" y2="19.07" />
            <line x1="19.07" y1="4.93" x2="15.72" y2="8.28" />
            <line x1="8.28" y1="15.72" x2="4.93" y2="19.07" />
          </svg>
          <span className="text-white font-display font-bold text-xs leading-tight tracking-wider uppercase">
            {t('gameSpin' as any)}
          </span>
        </button>
      )}
    </div>
  );
}
