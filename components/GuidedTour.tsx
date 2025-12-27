/**
 * Guided Tour Component
 *
 * Interactive onboarding that highlights real UI elements
 * and guides the player through the miniapp step by step
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { AudioManager } from '@/lib/audio-manager';

export interface TourStep {
  id: string;
  targetSelector: string; // CSS selector for the element to highlight
  titleKey: string; // Translation key for title
  descriptionKey: string; // Translation key for description
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'hover' | 'none'; // Optional action hint
  highlightPadding?: number;
}

interface GuidedTourProps {
  isOpen: boolean;
  onComplete: () => void;
  soundEnabled: boolean;
  steps: TourStep[];
}

export function GuidedTour({
  isOpen,
  onComplete,
  soundEnabled,
  steps,
}: GuidedTourProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Find and measure the target element
  const updateTargetRect = useCallback(() => {
    if (!step) return;

    const element = document.querySelector(step.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      // If element not found, show in center
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;

    updateTargetRect();

    // Update on resize/scroll
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect);

    // Also update after a short delay for dynamic content
    const timer = setTimeout(updateTargetRect, 100);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
      clearTimeout(timer);
    };
  }, [isOpen, currentStep, updateTargetRect]);

  const handleNext = () => {
    if (soundEnabled) AudioManager.buttonClick();
    setIsAnimating(true);

    setTimeout(() => {
      if (isLastStep) {
        onComplete();
      } else {
        setCurrentStep((prev) => prev + 1);
      }
      setIsAnimating(false);
    }, 200);
  };

  const handlePrev = () => {
    if (soundEnabled) AudioManager.buttonNav();
    if (!isFirstStep) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleSkip = () => {
    if (soundEnabled) AudioManager.buttonNav();
    onComplete();
  };

  if (!isOpen || typeof window === 'undefined') return null;

  // Calculate tooltip position with viewport bounds checking
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      // Center if no target
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = step.highlightPadding || 12;
    const tooltipWidth = Math.min(320, window.innerWidth - 32);
    const tooltipHeight = 280; // Approximate max height
    const margin = 16;
    const safeArea = 80; // Safe area for Farcaster miniapp bottom bar

    // Calculate horizontal center position
    const centerX = Math.max(
      margin,
      Math.min(
        targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        window.innerWidth - tooltipWidth - margin
      )
    );

    // Check available space
    const spaceBelow = window.innerHeight - targetRect.bottom - padding - margin - safeArea;
    const spaceAbove = targetRect.top - padding - margin;

    // Smart positioning - prefer the side with more space
    let preferredPosition = step.position;

    // For bottom/top positions, check if there's enough space
    if (preferredPosition === 'bottom' && spaceBelow < tooltipHeight && spaceAbove > spaceBelow) {
      preferredPosition = 'top';
    } else if (preferredPosition === 'top' && spaceAbove < tooltipHeight && spaceBelow > spaceAbove) {
      preferredPosition = 'bottom';
    }

    switch (preferredPosition) {
      case 'top': {
        const topPos = Math.max(margin, targetRect.top - padding - margin - tooltipHeight);
        return {
          position: 'fixed',
          top: `${topPos}px`,
          left: `${centerX}px`,
          maxWidth: `${tooltipWidth}px`,
        };
      }
      case 'bottom': {
        const bottomPos = Math.min(
          targetRect.bottom + padding + margin,
          window.innerHeight - tooltipHeight - safeArea
        );
        return {
          position: 'fixed',
          top: `${bottomPos}px`,
          left: `${centerX}px`,
          maxWidth: `${tooltipWidth}px`,
        };
      }
      case 'left':
        return {
          position: 'fixed',
          top: `${Math.max(margin, Math.min(targetRect.top + targetRect.height / 2 - tooltipHeight / 2, window.innerHeight - tooltipHeight - margin))}px`,
          right: `${window.innerWidth - targetRect.left + padding + margin}px`,
          maxWidth: `${tooltipWidth}px`,
        };
      case 'right':
        return {
          position: 'fixed',
          top: `${Math.max(margin, Math.min(targetRect.top + targetRect.height / 2 - tooltipHeight / 2, window.innerHeight - tooltipHeight - margin))}px`,
          left: `${targetRect.right + padding + margin}px`,
          maxWidth: `${tooltipWidth}px`,
        };
      default:
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: `${tooltipWidth}px`,
        };
    }
  };

  // Get arrow direction
  const getArrowClass = () => {
    if (!targetRect) return '';
    switch (step.position) {
      case 'top': return 'after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-vintage-charcoal';
      case 'bottom': return 'before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-vintage-charcoal';
      case 'left': return 'after:absolute after:left-full after:top-1/2 after:-translate-y-1/2 after:border-8 after:border-transparent after:border-l-vintage-charcoal';
      case 'right': return 'before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-r-vintage-charcoal';
      default: return '';
    }
  };

  const padding = step.highlightPadding || 12;

  return createPortal(
    <div className="fixed inset-0 z-[300]">
      {/* Overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.85)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Highlight border around target */}
      {targetRect && (
        <div
          className="absolute border-2 border-vintage-gold rounded-xl pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - padding,
            top: targetRect.top - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className={`w-80 bg-vintage-charcoal rounded-2xl border-2 border-vintage-gold/60 shadow-2xl overflow-hidden transition-all duration-200 ${
          isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        } ${getArrowClass()}`}
        style={getTooltipStyle()}
      >
        {/* Progress indicator */}
        <div className="bg-vintage-black/50 px-4 py-2 flex items-center justify-between border-b border-vintage-gold/20">
          <div className="flex gap-1.5">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-4 bg-vintage-gold'
                    : idx < currentStep
                    ? 'w-1.5 bg-vintage-gold/60'
                    : 'w-1.5 bg-vintage-gold/20'
                }`}
              />
            ))}
          </div>
          <span className="text-vintage-burnt-gold text-xs font-modern">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Icon/Emoji based on step */}
          <div className="text-3xl mb-2">
            {step.id === 'welcome' && '👋'}
            {step.id === 'games' && '🎮'}
            {step.id === 'cards' && '🃏'}
            {step.id === 'dex' && '💱'}
            {step.id === 'vibefid' && '🎴'}
            {step.id === 'wantedcast' && '📢'}
            {step.id === 'priceticker' && '📊'}
            {step.id === 'navbar' && '🧭'}
            {step.id === 'settings' && '⚙️'}
            {step.id === 'ready' && '🚀'}
            {!['welcome', 'games', 'cards', 'dex', 'vibefid', 'wantedcast', 'priceticker', 'navbar', 'settings', 'ready'].includes(step.id) && '💡'}
          </div>

          <h3 className="font-display text-xl text-vintage-gold mb-2">
            {t(step.titleKey as any) || step.titleKey}
          </h3>
          <p className="text-gray-300 font-modern text-sm leading-relaxed mb-4">
            {t(step.descriptionKey as any) || step.descriptionKey}
          </p>

          {/* Action hint */}
          {step.action && step.action !== 'none' && (
            <div className="bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg px-3 py-2 mb-4">
              <p className="text-vintage-gold text-xs font-modern flex items-center gap-2">
                <span>{step.action === 'click' ? '👆' : '👀'}</span>
                <span>
                  {step.action === 'click'
                    ? t('tourClickHint' as any) || 'Click here to try it!'
                    : t('tourHoverHint' as any) || 'Hover to see more'}
                </span>
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="flex-1 px-3 py-2.5 bg-vintage-black/50 hover:bg-vintage-gold/10 text-vintage-gold border border-vintage-gold/40 rounded-xl font-modern font-semibold text-sm transition-all"
              >
                ← {t('tourPrev' as any) || 'Back'}
              </button>
            )}

            <button
              onClick={handleNext}
              className={`flex-1 px-3 py-2.5 rounded-xl font-modern font-bold text-sm transition-all ${
                isLastStep
                  ? 'bg-gradient-to-r from-vintage-gold to-yellow-500 text-black shadow-gold hover:shadow-gold-lg'
                  : 'bg-vintage-gold hover:bg-vintage-gold-dark text-black'
              }`}
            >
              {isLastStep
                ? (t('tourFinish' as any) || "LET'S PLAY! 🎮")
                : (t('tourNext' as any) || 'Next →')}
            </button>
          </div>

          {/* Skip button */}
          {!isLastStep && (
            <button
              onClick={handleSkip}
              className="w-full mt-2 py-1.5 text-vintage-burnt-gold/60 hover:text-vintage-gold text-xs font-modern transition-all"
            >
              {t('tourSkip' as any) || 'Skip tour'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Default tour steps for the miniapp
export const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetSelector: '.tour-header', // Will highlight the header/title area
    titleKey: 'tourWelcomeTitle',
    descriptionKey: 'tourWelcomeDesc',
    position: 'bottom',
  },
  {
    id: 'games',
    targetSelector: '.tour-game-grid', // Will highlight game mode buttons
    titleKey: 'tourGamesTitle',
    descriptionKey: 'tourGamesDesc',
    position: 'bottom',
    action: 'click',
  },
  {
    id: 'cards',
    targetSelector: '.tour-cards-section', // Will highlight cards area
    titleKey: 'tourCardsTitle',
    descriptionKey: 'tourCardsDesc',
    position: 'bottom',
  },
  {
    id: 'dex',
    targetSelector: '.tour-dex-btn', // DEX button
    titleKey: 'tourDexTitle',
    descriptionKey: 'tourDexDesc',
    position: 'top',
    action: 'click',
  },
  {
    id: 'vibefid',
    targetSelector: '.tour-vibefid-btn', // VibeFID button
    titleKey: 'tourVibefidTitle',
    descriptionKey: 'tourVibefidDesc',
    position: 'top',
    action: 'click',
  },
  {
    id: 'wantedcast',
    targetSelector: '.tour-wanted-cast', // Wanted Cast section
    titleKey: 'tourWantedCastTitle',
    descriptionKey: 'tourWantedCastDesc',
    position: 'top',
    action: 'click',
  },
  {
    id: 'priceticker',
    targetSelector: '.tour-price-ticker', // Price Ticker
    titleKey: 'tourPriceTickerTitle',
    descriptionKey: 'tourPriceTickerDesc',
    position: 'top',
    action: 'click',
  },
  {
    id: 'navbar',
    targetSelector: '.tour-nav-bar', // Bottom nav bar
    titleKey: 'tourNavbarTitle',
    descriptionKey: 'tourNavbarDesc',
    position: 'top',
    action: 'click',
  },
  {
    id: 'settings',
    targetSelector: '.tour-settings-btn', // Settings button
    titleKey: 'tourSettingsTitle',
    descriptionKey: 'tourSettingsDesc',
    position: 'bottom',
  },
  {
    id: 'ready',
    targetSelector: '.tour-header', // Back to header for final step
    titleKey: 'tourReadyTitle',
    descriptionKey: 'tourReadyDesc',
    position: 'bottom',
  },
];
