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
}: GameNavBarProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const play = (fn: () => void) => { if (soundEnabled) fn(); };

  const isHome   = currentView === 'game';
  const isRedeem = currentView === 'inbox';
  const showRedeemDot = !!(inboxStatus && inboxStatus.coins >= 100);

  const btnBase: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '8px 4px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    transition: 'all 0.15s',
    width: '100%',
  };

  const activeHome: React.CSSProperties  = { background: '#1e40af', color: '#fff' };
  const activeGold: React.CSSProperties  = { background: '#FFD700', color: '#0C0C0C' };
  const inactive: React.CSSProperties    = { background: 'transparent', color: '#FFD700', border: '1px solid rgba(255,215,0,0.2)' };
  const inactiveShop: React.CSSProperties = { background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.4)' };

  const hoverIn  = (e: React.MouseEvent<HTMLElement>, active: boolean) => {
    if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,215,0,0.1)';
  };
  const hoverOut = (e: React.MouseEvent<HTMLElement>, active: boolean, isShop?: boolean) => {
    if (!active) (e.currentTarget as HTMLElement).style.background = isShop ? 'rgba(124,58,237,0.15)' : 'transparent';
  };

  const DotNotif = () => (
    <div style={{
      position: 'absolute', top: -2, right: -2,
      width: 9, height: 9, background: '#ef4444',
      borderRadius: '50%', border: '1px solid #FFD700',
    }} />
  );

  return (
    <div
      className={isInFarcaster ? 'fixed bottom-0 left-0 right-0 z-[100]' : 'mb-3 md:mb-6'}
    >
      <div
        className="tour-nav-bar flex"
        style={{
          background: 'rgba(26,26,26,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '2px solid rgba(255,215,0,0.25)',
          padding: '8px 8px 12px',
          gap: 4,
        }}
      >
        {/* HOME */}
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            style={{ ...btnBase, ...(isHome ? activeHome : inactive) }}
            onClick={() => { play(AudioManager.buttonClick); setCurrentView('game'); }}
            onMouseEnter={(e) => { play(AudioManager.buttonHover); hoverIn(e, isHome); }}
            onMouseLeave={(e) => hoverOut(e, isHome)}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            HOME
          </button>
        </div>

        {/* REDEEM */}
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            style={{ ...btnBase, ...(isRedeem ? activeGold : inactive) }}
            onClick={() => { play(AudioManager.buttonClick); setCurrentView('inbox'); }}
            onMouseEnter={(e) => { play(AudioManager.buttonHover); hoverIn(e, isRedeem); }}
            onMouseLeave={(e) => hoverOut(e, isRedeem)}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="10" width="18" height="12" rx="2" />
              <path d="M12 10V4" />
              <path d="M12 4c-2 0-4 2-4 4h4" />
              <path d="M12 4c2 0 4 2 4 4h-4" />
              <line x1="12" y1="10" x2="12" y2="22" />
              <line x1="3" y1="15" x2="21" y2="15" />
            </svg>
            REDEEM
          </button>
          {showRedeemDot && <DotNotif />}
        </div>

        {/* EARN */}
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            style={{ ...btnBase, ...inactive }}
            onClick={() => { play(AudioManager.buttonClick); router.push('/quests'); }}
            onMouseEnter={(e) => { play(AudioManager.buttonHover); hoverIn(e, false); }}
            onMouseLeave={(e) => hoverOut(e, false)}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            EARN
          </button>
          {hasClaimableMissions && <DotNotif />}
        </div>

        {/* SHOP */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Link
            href="/shop"
            onClick={() => play(AudioManager.buttonClick)}
            onMouseEnter={(e) => { play(AudioManager.buttonHover); hoverIn(e, false); }}
            onMouseLeave={(e) => hoverOut(e, false, true)}
            style={{ ...btnBase, ...inactiveShop, textDecoration: 'none' }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            SHOP
          </Link>
        </div>
      </div>
    </div>
  );
}
