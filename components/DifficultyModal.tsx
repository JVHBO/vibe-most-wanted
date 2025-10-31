'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Difficulty = 'gey' | 'goofy' | 'gooner' | 'gangster' | 'gigachad';

interface DifficultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (difficulty: Difficulty) => void;
  onBattle: (difficulty: Difficulty) => void;
  unlockedDifficulties: Set<Difficulty>;
  currentDifficulty?: Difficulty;
  tempSelected?: Difficulty | null;
}

const DIFFICULTY_INFO = {
  gey: {
    name: 'GEY',
    power: '75',
    description: '15 PWR cards only',
    image: '/images/difficulties/gey.png',
    cardName: 'nico',
    cardSubtitle: 'Big foot gay'
  },
  goofy: {
    name: 'GOOFY',
    power: '~105',
    description: '18-21 PWR cards',
    image: '/images/difficulties/goofy.png',
    cardName: 'anon',
    cardSubtitle: 'Tried to censor a woman'
  },
  gooner: {
    name: 'GOONER',
    power: '~360',
    description: '60-72 PWR cards',
    image: '/images/difficulties/gooner.png',
    cardName: 'Don Filthy',
    cardSubtitle: 'He got the intern hooked on feet'
  },
  gangster: {
    name: 'GANGSTER',
    power: '750',
    description: '150 PWR cards only',
    image: '/images/difficulties/gangster.png',
    cardName: 'jack the sniper',
    cardSubtitle: 'Highly dangerous criminal, wanted for dumping multiple collections'
  },
  gigachad: {
    name: 'GIGACHAD',
    power: '855',
    description: 'Top 5 strongest',
    image: '/images/difficulties/gigachad.png',
    cardName: 'ZURKCHAD',
    cardSubtitle: "JC'S ALTEREGO nearly destroyed the vibe market (strangely dangerous)"
  }
};

const DIFFICULTIES: Difficulty[] = ['gey', 'goofy', 'gooner', 'gangster', 'gigachad'];

export default function DifficultyModal({
  isOpen,
  onClose,
  onSelect,
  onBattle,
  unlockedDifficulties,
  currentDifficulty,
  tempSelected
}: DifficultyModalProps) {
  const { t } = useLanguage();
  const [hoveredDiff, setHoveredDiff] = useState<Difficulty | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-start md:justify-center overflow-y-auto bg-black/95">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/95 z-[9990]"
        onClick={onClose}
      />

      {/* Content Container */}
      <div className="relative z-[10000] w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* Title */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-4xl font-bold text-vintage-gold font-display text-center drop-shadow-lg uppercase tracking-wider">
            <span className="text-vintage-neon-blue">▸</span> SELECT YOUR DIFFICULTY <span className="text-vintage-neon-blue">◂</span>
          </h2>
        </div>

        {/* Cards Grid - Responsive */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-row items-start justify-center gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8">
        {DIFFICULTIES.map((diff, index) => {
              const info = DIFFICULTY_INFO[diff];
              const isUnlocked = unlockedDifficulties.has(diff);
              const isCurrent = currentDifficulty === diff;
              const isHovered = hoveredDiff === diff;
              const isSelected = tempSelected === diff;

              return (
                <div
                  key={diff}
                  className="relative w-full md:w-auto"
                  onMouseEnter={() => isUnlocked && setHoveredDiff(diff)}
                  onMouseLeave={() => setHoveredDiff(null)}
                >
                  {/* Card */}
                  <button
                    onClick={() => isUnlocked && onSelect(diff)}
                    disabled={!isUnlocked}
                    className={`
                      relative w-full aspect-[2/3] lg:w-64 lg:h-96 rounded-xl overflow-hidden
                      transition-all duration-300 bg-vintage-charcoal border border-vintage-gold/20
                      ${isUnlocked ? 'cursor-pointer lg:hover:scale-105 lg:hover:shadow-2xl' : 'cursor-not-allowed'}
                      ${isSelected ? 'ring-2 lg:ring-4 ring-vintage-neon-blue shadow-lg shadow-vintage-neon-blue/50' : ''}
                      ${isCurrent && !isSelected ? 'ring-1 lg:ring-2 ring-vintage-burnt-gold/50' : ''}
                      ${isHovered && !isSelected ? 'lg:scale-105 lg:shadow-2xl' : ''}
                    `}
                  >
                    {/* Card Image Background */}
                    <div className="absolute inset-0 z-0">
                      <img
                        src={info.image}
                        alt={info.name}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Lock Overlay */}
                    {!isUnlocked && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-hidden rounded-xl">
                        <div className="text-center px-2">
                          <div className="text-2xl lg:text-6xl mb-1 lg:mb-2">🔒</div>
                          <p className="text-vintage-burnt-gold text-[9px] lg:text-sm font-modern">
                            Beat {index > 0 ? DIFFICULTY_INFO[DIFFICULTIES[index - 1]].name : 'previous'} to unlock
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Selected Badge */}
                    {isSelected && (
                      <div className="absolute top-1 left-1 lg:top-2 lg:left-2 bg-vintage-neon-blue text-vintage-black px-2 lg:px-3 py-0.5 lg:py-1 rounded-full text-[9px] lg:text-xs font-bold z-40 animate-pulse">
                        SELECTED
                      </div>
                    )}

                    {/* Current Badge */}
                    {isCurrent && !isSelected && (
                      <div className="absolute top-1 right-1 lg:top-2 lg:right-2 bg-vintage-burnt-gold text-vintage-black px-2 lg:px-3 py-0.5 lg:py-1 rounded-full text-[9px] lg:text-xs font-bold z-40">
                        CURRENT
                      </div>
                    )}

                    {/* Info Overlay (appears on hover or when selected) */}
                    {isUnlocked && (isHovered || isSelected) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-2 lg:p-4 z-50">
                        <div className="text-vintage-gold text-[10px] lg:text-base font-bold mb-0.5 lg:mb-1 font-display uppercase tracking-wide">
                          {info.name}
                        </div>
                        <div className="text-vintage-neon-blue text-[8px] lg:text-xs mb-0.5 lg:mb-2 font-modern font-bold">
                          POWER: {info.power}
                        </div>
                        <div className="text-white text-[8px] lg:text-xs font-modern">
                          {info.description}
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              );
        })}
      </div>

        {/* Footer Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
          {tempSelected && (
            <button
              onClick={() => onBattle(tempSelected)}
              className="relative w-full sm:w-auto px-8 lg:px-12 py-3 lg:py-4 bg-gradient-to-r from-vintage-neon-blue to-vintage-neon-blue/90 hover:from-vintage-neon-blue/90 hover:to-vintage-neon-blue text-vintage-black rounded-lg font-display font-bold text-base lg:text-2xl shadow-neon transition-all hover:shadow-gold uppercase tracking-wider border-2 border-vintage-neon-blue/30"
            >
              <span className="drop-shadow-lg">{t('startBattle')}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 lg:px-8 py-2 lg:py-3 bg-vintage-black/50 border-2 border-vintage-burnt-gold text-vintage-burnt-gold rounded-lg hover:bg-vintage-burnt-gold hover:text-vintage-black transition-all font-modern font-bold text-sm lg:text-lg uppercase"
          >
            {tempSelected ? t('cancel') : t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
