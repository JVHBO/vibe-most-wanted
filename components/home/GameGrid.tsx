"use client";

import Link from "next/link";
import { AudioManager } from "@/lib/audio-manager";
import { useLanguage } from "@/contexts/LanguageContext";

type GameMode = 'poker-cpu' | 'battle-ai' | 'mecha' | 'raid';

interface GameGridProps {
  soundEnabled: boolean;
  disabled?: boolean;
  onSelect: (mode: GameMode) => void;
}

// SVG Icons
const SpadeIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C9.5 5 4 9 4 13c0 2.5 2 4 4 4 1.5 0 2.5-.5 3-1.5V20H9v2h6v-2h-2v-4.5c.5 1 1.5 1.5 3 1.5 2 0 4-1.5 4-4 0-4-5.5-8-8-11z" />
  </svg>
);

const DiamondIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 12l10 10 10-10L12 2z" />
  </svg>
);

// Robot icon for Battle AI
const RobotIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1H3a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A2.5 2.5 0 005 15.5 2.5 2.5 0 007.5 18a2.5 2.5 0 002.5-2.5A2.5 2.5 0 007.5 13m9 0a2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5 2.5 2.5 0 00-2.5-2.5z" />
  </svg>
);

// Two players facing each other for PvP
const VsPlayersIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 17v2H2v-2s0-4 7-4 7 4 7 4m-3.5-9.5A3.5 3.5 0 109 11a3.5 3.5 0 003.5-3.5m3.44 5.5A5.32 5.32 0 0118 17v2h4v-2s0-3.63-6.06-4M15 4a3.39 3.39 0 00-1.93.59 5 5 0 010 5.82A3.39 3.39 0 0015 11a3.5 3.5 0 000-7z" />
  </svg>
);

// Mecha/Robot arm icon
const MechaIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a2 2 0 012 2 2 2 0 01-2 2 2 2 0 01-2-2 2 2 0 012-2m-1.5 5h3l.5 3h2.25L17.5 18H15v4h-2v-4h-2v4H9v-4H6.5l1.25-8H10l.5-3z" />
  </svg>
);

// Skull icon for Raid
const SkullIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12c0 3.69 2.47 6.86 6 8.25V22h8v-1.75c3.53-1.39 6-4.56 6-8.25 0-5.52-4.48-10-10-10zm-2 15c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </svg>
);

// Game mode configurations with translation keys
const gameModeConfigs: { id: GameMode; icon: React.ReactNode; label: string; sublabel: string; cards: number | string | null; iconColor: string; accentColor: string; isLink?: boolean; href?: string }[] = [
  {
    id: 'poker-cpu',
    icon: <SpadeIcon />,
    label: 'Battle Poker',
    sublabel: '',
    cards: 10,
    iconColor: 'text-vintage-gold',
    accentColor: 'hover:border-vintage-gold/50',
  },
  {
    id: 'battle-ai',
    icon: <RobotIcon />,
    label: 'Battle Auto',
    sublabel: '',
    cards: 5,
    iconColor: 'text-cyan-400',
    accentColor: 'hover:border-cyan-400/50',
  },
  {
    id: 'mecha',
    icon: <MechaIcon />,
    label: 'Mecha Arena',
    sublabel: 'homeBetVbms',
    cards: null,
    iconColor: 'text-green-400',
    accentColor: 'hover:border-green-400/50',
  },
  {
    id: 'raid',
    icon: <SkullIcon />,
    label: 'Raid Boss',
    sublabel: '',
    cards: 'home5Plus1Cards',
    iconColor: 'text-red-400',
    accentColor: 'hover:border-red-400/50',
    isLink: true,
    href: '/raid',
  },
];

export function GameGrid({ soundEnabled, disabled, onSelect }: GameGridProps) {
  const { t } = useLanguage();

  const handleClick = (mode: GameMode) => {
    if (disabled) return;
    if (soundEnabled) AudioManager.buttonClick();
    onSelect(mode);
  };

  return (
    <div className="grid grid-cols-2 gap-2 px-1">
      {gameModeConfigs.map((mode) => {
        const buttonContent = (
          <>
            <div className={mode.iconColor}>{mode.icon}</div>
            <div className="flex flex-col items-center">
              <span className="text-vintage-gold font-display font-bold text-xs leading-tight">
                {mode.label}
              </span>
              {mode.sublabel && (
                <span className="text-vintage-burnt-gold text-[10px] font-modern leading-tight">
                  {t(mode.sublabel as any)}
                </span>
              )}
              {mode.cards !== null && (
                <span className="text-vintage-burnt-gold/70 text-[9px] font-modern">
                  {typeof mode.cards === 'string' ? t(mode.cards as any) : `${mode.cards} ${t('gameCards')}`}
                </span>
              )}
            </div>
          </>
        );

        const buttonClasses = `
          flex flex-col items-center justify-center gap-1.5
          py-3 px-2 rounded-xl
          bg-vintage-charcoal/80
          border border-vintage-gold/20
          ${mode.accentColor}
          hover:bg-vintage-charcoal
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.97]'}
        `;

        if (mode.isLink && mode.href) {
          return (
            <Link
              key={mode.id}
              href={mode.href}
              onClick={() => soundEnabled && AudioManager.buttonClick()}
              className={buttonClasses}
            >
              {buttonContent}
            </Link>
          );
        }

        return (
          <button
            key={mode.id}
            onClick={() => handleClick(mode.id)}
            disabled={disabled}
            className={buttonClasses}
          >
            {buttonContent}
          </button>
        );
      })}
    </div>
  );
}
