/**
 * Tutorial Modal Component
 *
 * Beautiful onboarding tutorial for new users showing game modes
 * Appears after profile creation with language selector
 */

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AudioManager } from '@/lib/audio-manager';
import type { SupportedLanguage } from '@/lib/translations';

const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string; flag: string }[] = [
  { value: 'en', label: 'EN', flag: '🇺🇸' },
  { value: 'pt-BR', label: 'PT', flag: '🇧🇷' },
  { value: 'es', label: 'ES', flag: '🇪🇸' },
  { value: 'hi', label: 'HI', flag: '🇮🇳' },
  { value: 'ru', label: 'RU', flag: '🇷🇺' },
  { value: 'zh-CN', label: 'ZH', flag: '🇨🇳' },
];

interface TutorialSlide {
  titleKey: string;
  descKey: string;
  icon: string;
  gradient: string;
  features: { icon: string; textKey: string }[];
}

const TUTORIAL_SLIDES: TutorialSlide[] = [
  {
    titleKey: 'tutorialWelcome',
    descKey: 'tutorialWelcomeDesc',
    icon: '🎮',
    gradient: 'from-purple-600 to-pink-600',
    features: [
      { icon: '🃏', textKey: 'tutorialCollectCards' },
      { icon: '⚔️', textKey: 'tutorialBattlePlayers' },
      { icon: '🏆', textKey: 'tutorialClimbRanking' },
    ],
  },
  {
    titleKey: 'tutorialPvE',
    descKey: 'tutorialPvEDesc',
    icon: '🤖',
    gradient: 'from-blue-600 to-cyan-600',
    features: [
      { icon: '🎯', textKey: 'tutorialPvEFeature1' },
      { icon: '💰', textKey: 'tutorialPvEFeature2' },
      { icon: '📈', textKey: 'tutorialPvEFeature3' },
    ],
  },
  {
    titleKey: 'tutorialPvP',
    descKey: 'tutorialPvPDesc',
    icon: '⚔️',
    gradient: 'from-red-600 to-orange-600',
    features: [
      { icon: '🎲', textKey: 'tutorialPvPFeature1' },
      { icon: '🔥', textKey: 'tutorialPvPFeature2' },
      { icon: '💎', textKey: 'tutorialPvPFeature3' },
    ],
  },
  {
    titleKey: 'tutorialMechaArena',
    descKey: 'tutorialMechaArenaDesc',
    icon: '🤖',
    gradient: 'from-purple-600 to-indigo-600',
    features: [
      { icon: '👀', textKey: 'tutorialMechaFeature1' },
      { icon: '🎰', textKey: 'tutorialMechaFeature2' },
      { icon: '💸', textKey: 'tutorialMechaFeature3' },
    ],
  },
  {
    titleKey: 'tutorialRaidBoss',
    descKey: 'tutorialRaidBossDesc',
    icon: '👹',
    gradient: 'from-red-700 to-yellow-600',
    features: [
      { icon: '🎴', textKey: 'tutorialRaidFeature1' },
      { icon: '⚡', textKey: 'tutorialRaidFeature2' },
      { icon: '🎁', textKey: 'tutorialRaidFeature3' },
    ],
  },
];

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
}

export function TutorialModal({
  isOpen,
  onClose,
  soundEnabled,
}: TutorialModalProps) {
  const { lang, setLang, t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  if (!isOpen) return null;

  const slide = TUTORIAL_SLIDES[currentSlide];
  const isLastSlide = currentSlide === TUTORIAL_SLIDES.length - 1;
  const isFirstSlide = currentSlide === 0;

  const handleNext = () => {
    if (soundEnabled) AudioManager.buttonClick();
    if (isLastSlide) {
      onClose();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (soundEnabled) AudioManager.buttonNav();
    if (!isFirstSlide) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (soundEnabled) AudioManager.buttonNav();
    onClose();
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLang(newLang);
    setShowLanguageSelector(false);
    if (soundEnabled) AudioManager.buttonNav();
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-4">
      <div className="relative bg-vintage-deep-black rounded-2xl border-2 border-vintage-gold/50 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Language Selector Button - Top Right Corner */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
            className="flex items-center gap-1 px-2 py-1 bg-vintage-charcoal/80 hover:bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-sm transition-all"
          >
            <span>{LANGUAGE_OPTIONS.find(l => l.value === lang)?.flag}</span>
            <span className="text-vintage-gold text-xs">{LANGUAGE_OPTIONS.find(l => l.value === lang)?.label}</span>
            <span className="text-vintage-gold/50 text-xs">▼</span>
          </button>

          {/* Language Dropdown */}
          {showLanguageSelector && (
            <div className="absolute top-full right-0 mt-1 bg-vintage-charcoal border border-vintage-gold/50 rounded-lg shadow-xl overflow-hidden">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleLanguageChange(option.value)}
                  className={`
                    flex items-center gap-2 w-full px-3 py-2 text-left transition-all
                    ${lang === option.value
                      ? 'bg-vintage-gold/20 text-vintage-gold'
                      : 'text-gray-300 hover:bg-vintage-gold/10 hover:text-vintage-gold'
                    }
                  `}
                >
                  <span>{option.flag}</span>
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Slide Progress Dots */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {TUTORIAL_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentSlide(idx);
                if (soundEnabled) AudioManager.buttonNav();
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentSlide
                  ? 'bg-vintage-gold w-6'
                  : 'bg-vintage-gold/30 hover:bg-vintage-gold/50'
              }`}
            />
          ))}
        </div>

        {/* Header with Icon and Gradient */}
        <div className={`bg-gradient-to-br ${slide.gradient} p-8 pt-12 text-center relative overflow-hidden`}>
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-4 text-6xl animate-pulse">{slide.icon}</div>
            <div className="absolute bottom-4 right-4 text-4xl animate-bounce delay-150">{slide.icon}</div>
            <div className="absolute top-1/2 left-1/4 text-3xl animate-ping">{slide.icon}</div>
          </div>

          {/* Main Icon */}
          <div className="relative">
            <div className="text-7xl mb-4 animate-bounce">{slide.icon}</div>
            <h2 className="text-3xl font-display font-bold text-white drop-shadow-lg">
              {t(slide.titleKey as any)}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Description */}
          <p className="text-vintage-burnt-gold text-center mb-6 text-sm leading-relaxed">
            {t(slide.descKey as any)}
          </p>

          {/* Features */}
          <div className="space-y-3 mb-6">
            {slide.features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-vintage-charcoal/50 rounded-lg p-3 border border-vintage-gold/20 animate-in slide-in-from-left duration-300"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <span className="text-2xl">{feature.icon}</span>
                <span className="text-gray-200 text-sm">{t(feature.textKey as any)}</span>
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {!isFirstSlide && (
              <button
                onClick={handlePrev}
                className="flex-1 px-4 py-3 bg-vintage-charcoal hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/50 rounded-xl font-bold transition-all"
              >
                ← {t('tutorialPrev' as any)}
              </button>
            )}

            <button
              onClick={handleNext}
              className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all transform hover:scale-105 ${
                isLastSlide
                  ? 'bg-gradient-to-r from-vintage-gold to-yellow-500 text-black shadow-lg shadow-vintage-gold/30'
                  : 'bg-vintage-gold hover:bg-vintage-gold-dark text-black'
              }`}
            >
              {isLastSlide ? t('tutorialStart' as any) : t('tutorialNext' as any)} {!isLastSlide && '→'}
            </button>
          </div>

          {/* Skip Button */}
          {!isLastSlide && (
            <button
              onClick={handleSkip}
              className="w-full mt-3 px-4 py-2 text-vintage-burnt-gold/70 hover:text-vintage-gold text-sm transition-all"
            >
              {t('tutorialSkip' as any)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
