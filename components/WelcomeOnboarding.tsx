/**
 * Welcome Onboarding Component
 *
 * Beautiful first-time user experience for the miniapp
 * Shows welcome, quick game intro, and welcome pack
 */

import { useState, useEffect } from 'react';
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
  { value: 'id', label: 'ID', flag: '🇮🇩' },
  { value: 'fr', label: 'FR', flag: '🇫🇷' },
];

interface WelcomeOnboardingProps {
  isOpen: boolean;
  onComplete: () => void;
  soundEnabled: boolean;
}

type OnboardingStep = 'welcome' | 'howToPlay' | 'rewards';

export function WelcomeOnboarding({
  isOpen,
  onComplete,
  soundEnabled,
}: WelcomeOnboardingProps) {
  const { lang, setLang, t } = useLanguage();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimateIn(true), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (soundEnabled) AudioManager.buttonClick();
    setAnimateIn(false);
    setTimeout(() => {
      if (step === 'welcome') setStep('howToPlay');
      else if (step === 'howToPlay') setStep('rewards');
      else onComplete();
      setAnimateIn(true);
    }, 200);
  };

  const handleSkip = () => {
    if (soundEnabled) AudioManager.buttonNav();
    onComplete();
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLang(newLang);
    setShowLanguageDropdown(false);
    if (soundEnabled) AudioManager.buttonNav();
  };

  const steps: OnboardingStep[] = ['welcome', 'howToPlay', 'rewards'];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="fixed inset-0 bg-vintage-black/98 flex items-center justify-center z-[200] p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L35 15L45 15L37 22L40 32L30 26L20 32L23 22L15 15L25 15Z' fill='%23FFD700' fill-opacity='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className={`relative w-full max-w-md transition-all duration-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Language Selector - Top Right */}
        <div className="absolute -top-12 right-0 z-10">
          <button
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-charcoal/80 hover:bg-vintage-charcoal border border-vintage-gold/30 rounded-lg text-sm transition-all"
          >
            <span className="text-lg">{LANGUAGE_OPTIONS.find(l => l.value === lang)?.flag}</span>
            <span className="text-vintage-gold text-xs font-modern">{LANGUAGE_OPTIONS.find(l => l.value === lang)?.label}</span>
            <svg className="w-3 h-3 text-vintage-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showLanguageDropdown && (
            <div className="absolute top-full right-0 mt-1 bg-vintage-charcoal border border-vintage-gold/50 rounded-lg shadow-xl overflow-hidden min-w-[100px]">
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
                  <span className="text-sm font-modern">{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Progress Dots */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2">
          {steps.map((s, idx) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-6 bg-vintage-gold'
                  : idx < currentIndex
                  ? 'w-1.5 bg-vintage-gold/60'
                  : 'w-1.5 bg-vintage-gold/20'
              }`}
            />
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-vintage-deep-black rounded-2xl border-2 border-vintage-gold/40 shadow-[0_0_60px_rgba(255,215,0,0.15)] overflow-hidden">

          {/* STEP: Welcome */}
          {step === 'welcome' && (
            <div className="p-6 text-center">
              {/* Logo/Title */}
              <div className="mb-6">
                <div className="text-5xl mb-3">🎴</div>
                <h1 className="font-display text-3xl text-vintage-gold tracking-wide mb-2">
                  VIBE MOST WANTED
                </h1>
                <p className="text-vintage-burnt-gold font-modern text-sm">
                  {t('onboardingTagline' as any) || 'The Ultimate Meme Card Battle Arena'}
                </p>
              </div>

              {/* Welcome Message */}
              <div className="bg-vintage-charcoal/50 rounded-xl p-4 mb-6 border border-vintage-gold/20">
                <p className="text-gray-200 font-modern text-sm leading-relaxed">
                  {t('onboardingWelcomeMessage' as any) || 'Welcome, Criminal! Build your deck of meme cards and battle other players to climb the rankings.'}
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-vintage-charcoal/30 rounded-lg p-3 border border-vintage-gold/10">
                  <div className="text-2xl mb-1">🃏</div>
                  <span className="text-vintage-gold font-modern text-xs">{t('onboardingCollect' as any) || 'Collect'}</span>
                </div>
                <div className="bg-vintage-charcoal/30 rounded-lg p-3 border border-vintage-gold/10">
                  <div className="text-2xl mb-1">⚔️</div>
                  <span className="text-vintage-gold font-modern text-xs">{t('onboardingBattle' as any) || 'Battle'}</span>
                </div>
                <div className="bg-vintage-charcoal/30 rounded-lg p-3 border border-vintage-gold/10">
                  <div className="text-2xl mb-1">🏆</div>
                  <span className="text-vintage-gold font-modern text-xs">{t('onboardingWin' as any) || 'Win'}</span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleNext}
                className="w-full py-4 bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black font-display font-bold text-lg rounded-xl shadow-gold hover:shadow-gold-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {t('onboardingLetsGo' as any) || "LET'S GO!"}
              </button>
            </div>
          )}

          {/* STEP: How to Play */}
          {step === 'howToPlay' && (
            <div className="p-6">
              <h2 className="font-display text-2xl text-vintage-gold text-center mb-4">
                {t('onboardingHowToPlay' as any) || 'How to Play'}
              </h2>

              {/* Game Modes */}
              <div className="space-y-3 mb-6">
                {/* Poker */}
                <div className="flex items-center gap-4 bg-vintage-charcoal/50 rounded-xl p-4 border border-vintage-gold/20">
                  <div className="w-12 h-12 bg-vintage-gold/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">♠️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-vintage-gold font-display text-sm mb-0.5">POKER</h3>
                    <p className="text-gray-400 font-modern text-xs">
                      {t('onboardingPokerDesc' as any) || 'Use 10 cards to form poker hands'}
                    </p>
                  </div>
                </div>

                {/* Battle */}
                <div className="flex items-center gap-4 bg-vintage-charcoal/50 rounded-xl p-4 border border-vintage-gold/20">
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">⚔️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-cyan-400 font-display text-sm mb-0.5">BATTLE</h3>
                    <p className="text-gray-400 font-modern text-xs">
                      {t('onboardingBattleDesc' as any) || 'Power vs Power card battles'}
                    </p>
                  </div>
                </div>

                {/* Raid */}
                <div className="flex items-center gap-4 bg-vintage-charcoal/50 rounded-xl p-4 border border-vintage-gold/20">
                  <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👹</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-red-400 font-display text-sm mb-0.5">RAID BOSS</h3>
                    <p className="text-gray-400 font-modern text-xs">
                      {t('onboardingRaidDesc' as any) || 'Team up against powerful bosses'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full py-4 bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black font-display font-bold text-lg rounded-xl shadow-gold hover:shadow-gold-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {t('onboardingNext' as any) || 'NEXT'} →
              </button>

              <button
                onClick={handleSkip}
                className="w-full mt-2 py-2 text-vintage-burnt-gold/60 hover:text-vintage-gold font-modern text-sm transition-all"
              >
                {t('onboardingSkip' as any) || 'Skip tutorial'}
              </button>
            </div>
          )}

          {/* STEP: Rewards */}
          {step === 'rewards' && (
            <div className="p-6 text-center">
              <h2 className="font-display text-2xl text-vintage-gold mb-2">
                {t('onboardingYourReward' as any) || 'Your Welcome Gift!'}
              </h2>
              <p className="text-vintage-burnt-gold font-modern text-sm mb-6">
                {t('onboardingRewardDesc' as any) || 'Start your journey with these rewards'}
              </p>

              {/* Pack Animation */}
              <div className="relative mb-6">
                <div className="w-32 h-40 mx-auto bg-gradient-to-br from-vintage-gold via-yellow-500 to-vintage-gold-dark rounded-xl shadow-gold-lg animate-pulse flex items-center justify-center border-2 border-vintage-gold">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📦</div>
                    <span className="text-vintage-black font-display text-xs font-bold">BASIC PACK</span>
                  </div>
                </div>
                {/* Sparkles */}
                <div className="absolute -top-2 -left-2 text-2xl animate-bounce">✨</div>
                <div className="absolute -top-2 -right-2 text-2xl animate-bounce delay-100">✨</div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-2xl animate-bounce delay-200">✨</div>
              </div>

              {/* Rewards List */}
              <div className="bg-vintage-charcoal/50 rounded-xl p-4 mb-6 border border-vintage-gold/30">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-modern text-sm flex items-center gap-2">
                      <span>📦</span> 1 Basic Pack
                    </span>
                    <span className="text-vintage-gold font-bold">✓</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-modern text-sm flex items-center gap-2">
                      <span>💰</span> 100 Bonus Coins
                    </span>
                    <span className="text-vintage-gold font-bold">✓</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-modern text-sm flex items-center gap-2">
                      <span>🎯</span> Daily Missions
                    </span>
                    <span className="text-vintage-gold font-bold">✓</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full py-4 bg-gradient-to-r from-vintage-gold to-vintage-gold-dark text-vintage-black font-display font-bold text-lg rounded-xl shadow-gold hover:shadow-gold-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {t('onboardingStartPlaying' as any) || 'START PLAYING'} 🎮
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
