"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { AudioManager } from "@/lib/audio-manager";

type NavTab = 'home' | 'claim' | 'leaderboard' | 'shop' | 'quests';

interface BottomNavigationProps {
  activeTab: NavTab;
  isInFarcaster: boolean;
  soundEnabled: boolean;
  hasClaimableRewards: boolean;
  hasClaimableMissions: boolean;
  onClaimClick: () => void;
}

export function BottomNavigation({
  activeTab,
  isInFarcaster,
  soundEnabled,
  hasClaimableRewards,
  hasClaimableMissions,
  onClaimClick,
}: BottomNavigationProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const handleClick = (callback: () => void) => {
    if (soundEnabled) AudioManager.buttonClick();
    callback();
  };

  const baseButtonClass = `flex-1 min-w-0 rounded-lg font-modern font-semibold transition-all ${
    isInFarcaster
      ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5 text-[10px] leading-tight'
      : 'px-2 md:px-4 py-2 md:py-3 flex items-center justify-center gap-2 text-xs md:text-sm'
  }`;

  const activeClass = 'bg-vintage-gold text-vintage-black';
  const inactiveClass = 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30';

  return (
    <div className={isInFarcaster ? 'fixed bottom-0 left-0 right-0 z-[100] safe-area-bottom px-2' : 'mb-3 md:mb-4'}>
      <div className={`bg-vintage-charcoal/95 backdrop-blur-lg ${isInFarcaster ? 'rounded-none border-t-2 max-w-[304px] mx-auto' : 'rounded-xl border-2'} border-vintage-gold/30 p-1.5 flex gap-1`}>

        {/* Home */}
        <button
          onClick={() => handleClick(() => {})}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`${baseButtonClass} ${activeTab === 'home' ? activeClass : inactiveClass}`}
        >
          {isInFarcaster ? (
            <>
              <span className="text-xl leading-none">♠</span>
              <span className="text-[9px] font-bold">{t('navHome')}</span>
            </>
          ) : (
            <>
              <span className="text-lg">♠</span>
              <span className="hidden sm:inline">{t('navHome')}</span>
            </>
          )}
        </button>

        {/* Claim */}
        <button
          onClick={() => handleClick(onClaimClick)}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`relative ${baseButtonClass} ${activeTab === 'claim' ? activeClass : inactiveClass}`}
        >
          {hasClaimableRewards && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-vintage-gold z-10" />
          )}
          {isInFarcaster ? (
            <>
              <span className="text-xl leading-none">🎁</span>
              <span className="text-[9px] font-bold">{t('navClaim')}</span>
            </>
          ) : (
            <>
              <span className="text-lg">🎁</span>
              <span className="hidden sm:inline">{t('navClaim')}</span>
            </>
          )}
        </button>

        {/* Leaderboard */}
        <Link
          href="/leaderboard"
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`${baseButtonClass} ${activeTab === 'leaderboard' ? activeClass : inactiveClass}`}
        >
          {isInFarcaster ? (
            <>
              <span className="text-xl leading-none">♔</span>
              <span className="text-[9px] font-bold">{t('navRank')}</span>
            </>
          ) : (
            <>
              <span className="text-lg">♔</span>
              <span className="hidden sm:inline">{t('leaderboard')}</span>
            </>
          )}
        </Link>

        {/* Shop */}
        <Link
          href="/shop"
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`${baseButtonClass} ${activeTab === 'shop' ? activeClass : inactiveClass}`}
        >
          {isInFarcaster ? (
            <>
              <span className="text-xl leading-none">🛒</span>
              <span className="text-[9px] font-bold">{t('navShop')}</span>
            </>
          ) : (
            <>
              <span className="text-lg">🛒</span>
              <span className="hidden sm:inline">{t('navShop')}</span>
            </>
          )}
        </Link>

        {/* VibeQuest */}
        <Link
          href="/vibequest"
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`relative ${baseButtonClass} ${activeTab === 'quests' ? activeClass : inactiveClass}`}
        >
          {hasClaimableMissions && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-vintage-gold z-10" />
          )}
          {isInFarcaster ? (
            <>
              <span className="text-xl leading-none">★</span>
              <span className="text-[9px] font-bold">QUESTS</span>
            </>
          ) : (
            <>
              <span className="text-lg">★</span>
              <span className="hidden sm:inline">QUESTS</span>
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
