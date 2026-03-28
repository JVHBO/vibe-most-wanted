"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
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
  onRaffle?: () => void;
  showRaffle?: boolean;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const ArenaIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
  </svg>
);
const BossIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 C7 3 4 7 4 11 C4 14 6 16 8 17 L8 20 L16 20 L16 17 C18 16 20 14 20 11 C20 7 17 3 12 3 Z" />
    <circle cx="9" cy="11" r="2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="11" r="2" fill="currentColor" stroke="none" />
    <line x1="10" y1="20" x2="10" y2="17" /><line x1="14" y1="20" x2="14" y2="17" />
  </svg>
);
const BetIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="3" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" /><circle cx="16" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="16" r="1.5" fill="currentColor" /><circle cx="16" cy="16" r="1.5" fill="currentColor" />
  </svg>
);
const SpinIcon = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="2.5" />
    <line x1="12" y1="2" x2="12" y2="9.5" /><line x1="12" y1="14.5" x2="12" y2="22" />
    <line x1="2" y1="12" x2="9.5" y2="12" /><line x1="14.5" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="4.93" x2="8.28" y2="8.28" /><line x1="15.72" y1="15.72" x2="19.07" y2="19.07" />
    <line x1="19.07" y1="4.93" x2="15.72" y2="8.28" /><line x1="8.28" y1="15.72" x2="4.93" y2="19.07" />
  </svg>
);

export function GameGrid({ soundEnabled, disabled, onSelect, onSpin, isInFarcaster, onRaffle, showRaffle }: GameGridProps) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const items = [
    {
      id: 'mecha',
      icon: <ArenaIcon />,
      label: t('gameArena' as any),
      desc: 'Battle other players with NFTs',
      color: 'text-green-400',
      bg: 'bg-vintage-charcoal/80',
      border: 'border-green-400/30',
      isLink: false,
    },
    {
      id: 'raid',
      icon: <BossIcon />,
      label: t('gameBoss' as any),
      desc: 'Team up to defeat the raid boss',
      color: 'text-red-400',
      bg: 'bg-vintage-charcoal/80',
      border: 'border-red-400/30',
      isLink: true,
      href: '/raid',
    },
    {
      id: 'baccarat',
      icon: <BetIcon />,
      label: t('gameBet' as any),
      desc: 'Bet VBMS on baccarat rounds',
      color: 'text-emerald-400',
      bg: 'bg-vintage-charcoal/80',
      border: 'border-emerald-400/30',
      isLink: true,
      href: '/baccarat',
    },
    {
      id: 'spin',
      icon: <SpinIcon />,
      label: t('gameSpin' as any),
      desc: 'Spin the wheel to earn VBMS',
      color: 'text-white',
      bg: 'bg-orange-600',
      border: 'border-orange-400/30',
      isLink: false,
    },
  ];

  const totalItems = items.length;

  // Auto-advance every 4 s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx(prev => {
        const next = (prev + 1) % totalItems;
        const el = scrollRef.current;
        if (el) {
          const itemW = el.scrollWidth / totalItems;
          el.scrollTo({ left: next * itemW, behavior: 'smooth' });
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [totalItems]);

  // Sync dot when user scrolls manually
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const itemW = el.scrollWidth / totalItems;
    const idx = Math.round(el.scrollLeft / itemW);
    setActiveIdx(Math.min(idx, totalItems - 1));
  };

  const goTo = (idx: number) => {
    setActiveIdx(idx);
    const el = scrollRef.current;
    if (el) {
      const itemW = el.scrollWidth / totalItems;
      el.scrollTo({ left: idx * itemW, behavior: 'smooth' });
    }
  };

  const btnH = isInFarcaster ? 'clamp(72px, 10dvh, 90px)' : '90px';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-2 w-full"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {items.map((item, idx) => {
          const isActive = idx === activeIdx;
          const commonStyle: React.CSSProperties = {
            minWidth: 'calc(50% - 4px)',
            height: btnH,
            flexShrink: 0,
          };
          const commonClass = `snap-start flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 transition-all duration-200 px-2 relative
            ${item.bg} ${isActive ? item.border.replace('/30', '') : item.border}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.97]'}`;

          const content = (
            <>
              {isActive && <div className="absolute inset-0 rounded-lg opacity-10 bg-white" />}
              <div className={`${item.color} relative z-10`}>{item.icon}</div>
              <span className="text-vintage-gold font-display font-bold text-xs leading-tight tracking-wider uppercase relative z-10">
                {item.label}
              </span>
              <span className="text-white/40 text-[9px] leading-tight text-center px-1 relative z-10 line-clamp-1">
                {item.desc}
              </span>
            </>
          );

          if (item.isLink && item.href) {
            return (
              <Link key={item.id} href={item.href} onClick={() => soundEnabled && AudioManager.buttonClick()} onMouseEnter={() => soundEnabled && AudioManager.buttonHover()} className={commonClass} style={commonStyle}>
                {content}
              </Link>
            );
          }
          return (
            <button key={item.id} onClick={() => { if (disabled) return; if (soundEnabled) AudioManager.buttonClick(); item.id === 'spin' ? onSpin?.() : onSelect(item.id as GameMode); }} onMouseEnter={() => soundEnabled && !disabled && AudioManager.buttonHover()} disabled={disabled} className={commonClass} style={commonStyle}>
              {content}
            </button>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={`rounded-full transition-all duration-200 ${idx === activeIdx ? 'w-4 h-1.5 bg-vintage-gold' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'}`}
          />
        ))}
      </div>

      {/* RAFFLE strip — always visible below carousel */}
      {showRaffle && onRaffle && (
        <button
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); onRaffle(); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className="w-full flex items-center gap-3 px-4 py-2.5 bg-[#1a1200] border-2 border-[#FFD700] hover:bg-[#251a00] active:scale-[0.99] transition-all duration-150 rounded-lg"
        >
          <span className="text-xl leading-none shrink-0">🎟️</span>
          <div className="flex-1 text-left min-w-0">
            <span className="text-[#FFD700] font-display font-bold text-xs uppercase tracking-widest leading-none">Raffle</span>
            <span className="text-white/40 text-[10px] ml-2 truncate">Goofy Romero Legendary · ~$23</span>
          </div>
          <span className="text-[#FFD700]/60 text-base font-bold shrink-0">›</span>
        </button>
      )}
    </div>
  );
}
