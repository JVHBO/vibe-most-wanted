"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { AudioManager } from "@/lib/audio-manager";

interface InboxStatus {
  coins: number;
}

interface GameNavBarProps {
  isInFarcaster: boolean;
  soundEnabled: boolean;
  currentView: string;
  setCurrentView: (view: 'game' | 'inbox') => void;
  inboxStatus: InboxStatus | null | undefined;
  hasClaimableMissions: boolean;
  safeAreaInsets?: { top: number; bottom: number; left: number; right: number };
}

export function GameNavBar({
  isInFarcaster,
  soundEnabled,
  currentView,
  setCurrentView,
  inboxStatus,
  hasClaimableMissions,
  safeAreaInsets,
}: GameNavBarProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const baseBtn = `flex-1 min-w-0 ${isInFarcaster ? 'px-1 py-2 flex flex-col items-center justify-center gap-0.5' : 'px-2 md:px-6 py-2 md:py-3 flex items-center gap-2'} rounded-lg font-modern font-semibold transition-all ${isInFarcaster ? 'text-[10px] leading-tight' : 'text-xs md:text-base'}`;
  const activeClass = 'bg-vintage-gold text-vintage-black';
  const inactiveClass = 'bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30';

  const HomeIcon = ({ size }: { size: string }) => (
    <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );

  const ClaimIcon = ({ size }: { size: string }) => (
    <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="18" height="12" rx="2" />
      <path d="M12 10V4" />
      <path d="M12 4c-2 0-4 2-4 4h4" />
      <path d="M12 4c2 0 4 2 4 4h-4" />
      <line x1="12" y1="10" x2="12" y2="22" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );

  const LeaderboardIcon = ({ size }: { size: string }) => (
    <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H3a1 1 0 0 0-1 1v2a4 4 0 0 0 4 4h1" />
      <path d="M18 9h3a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4h-1" />
      <path d="M6 3h12v6a6 6 0 0 1-12 0V3z" />
      <path d="M9 19h6v3H9z" />
      <line x1="7" y1="22" x2="17" y2="22" />
    </svg>
  );

  const ShopIcon = ({ size }: { size: string }) => (
    <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );

  const QuestsIcon = ({ size }: { size: string }) => (
    <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );

  // Use SDK safeAreaInsets.bottom when available (Warpcast real device), CSS env() as fallback
  const navInsetBottom = safeAreaInsets?.bottom ?? 0;

  return (
    <div
      className={isInFarcaster
        ? `fixed bottom-0 left-0 right-0 z-[100] ${navInsetBottom > 0 ? '' : 'safe-area-bottom'}`
        : 'mb-3 md:mb-6 relative z-40'
      }
      style={isInFarcaster && navInsetBottom > 0 ? { paddingBottom: navInsetBottom } : undefined}
    >
      <div className={`tour-nav-bar bg-vintage-charcoal/95 backdrop-blur-lg ${isInFarcaster ? 'rounded-none border-t-2' : 'rounded-xl border-2'} border-vintage-gold/30 ${isInFarcaster ? 'p-1' : 'p-2'} flex gap-1`}>

        {/* Home */}
        <button
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); setCurrentView('game'); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`${baseBtn} ${currentView === 'game' ? activeClass : inactiveClass}`}
        >
          {isInFarcaster ? (
            <>
              <span className="text-[10px] font-bold whitespace-nowrap">{t('title')}</span>
              <HomeIcon size="w-5 h-5" />
            </>
          ) : (
            <>
              <HomeIcon size="w-5 h-5 md:w-6 md:h-6" />
              <span className="hidden sm:inline">{t('title')}</span>
            </>
          )}
        </button>

        {/* Claim/Inbox */}
        <button
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); setCurrentView('inbox'); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`relative ${baseBtn} ${currentView === 'inbox' ? activeClass : inactiveClass}`}
        >
          {inboxStatus && inboxStatus.coins >= 100 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-vintage-gold z-10" />
          )}
          {isInFarcaster ? (
            <>
              <span className="text-[10px] font-bold whitespace-nowrap">{(t as (k: string) => string)('navClaim')}</span>
              <ClaimIcon size="w-5 h-5" />
            </>
          ) : (
            <>
              <ClaimIcon size="w-5 h-5 md:w-6 md:h-6" />
              <span className="hidden sm:inline">{(t as (k: string) => string)('navClaim')}</span>
            </>
          )}
        </button>

        {/* Leaderboard */}
        <button
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); router.push('/leaderboard'); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`${baseBtn} ${inactiveClass}`}
        >
          {isInFarcaster ? (
            <>
              <span className="text-[9px] font-bold whitespace-nowrap">{t('leaderboard')}</span>
              <LeaderboardIcon size="w-5 h-5" />
            </>
          ) : (
            <>
              <LeaderboardIcon size="w-5 h-5 md:w-6 md:h-6" />
              <span className="hidden sm:inline">{t('leaderboard')}</span>
            </>
          )}
        </button>

        {/* Shop */}
        <Link
          href="/shop"
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`${baseBtn} ${inactiveClass}`}
        >
          {isInFarcaster ? (
            <>
              <span className="text-[10px] font-bold whitespace-nowrap">{t('navShop')}</span>
              <ShopIcon size="w-5 h-5" />
            </>
          ) : (
            <>
              <ShopIcon size="w-5 h-5 md:w-6 md:h-6" />
              <span className="hidden sm:inline">{t('navShop')}</span>
            </>
          )}
        </Link>

        {/* Quests */}
        <Link
          href="/quests"
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`tour-wanted-btn relative ${baseBtn} ${inactiveClass}`}
        >
          {isInFarcaster ? (
            <>
              <span className="text-[10px] font-bold whitespace-nowrap">{(t as (k: string) => string)('navWanted')}</span>
              <QuestsIcon size="w-5 h-5" />
            </>
          ) : (
            <>
              <QuestsIcon size="w-5 h-5 md:w-6 md:h-6" />
              <span className="hidden sm:inline">{(t as (k: string) => string)('navWanted')}</span>
            </>
          )}
          {hasClaimableMissions && (
            <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3 animate-pulse border border-vintage-gold" />
          )}
        </Link>

      </div>
    </div>
  );
}
