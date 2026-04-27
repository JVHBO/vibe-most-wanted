"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { AudioManager } from "@/lib/audio-manager";
import { BadgeList } from "@/components/Badge";
import { getUserBadges } from "@/lib/badges";
import { useBondingProgress } from "@/lib/hooks/useBondingProgress";
import type { UserProfile } from "@/lib/convex-profile";
import { getAuraLevel } from "@/lib/aura-levels";

interface GameHeaderProps {
  isInFarcaster: boolean;
  soundEnabled: boolean;
  userProfile: UserProfile | null;
  isLoadingProfile: boolean;
  address: string | undefined;
  vbmsBlockchainBalance: string | null;
  getAvatarUrl: (profile: { twitter?: string; twitterProfileImageUrl?: string } | null) => string | null;
  onSettingsClick: () => void;
  onCreateProfileClick: () => void;
  onVibeFidClick?: () => void;
  onDexClick?: () => void;
  onProfileClick?: () => void;
}

const getAvatarFallback = () => '/images/default-avatar.png';

export function GameHeader({
  isInFarcaster,
  soundEnabled,
  userProfile,
  isLoadingProfile,
  address,
  vbmsBlockchainBalance,
  getAvatarUrl,
  onSettingsClick,
  onCreateProfileClick,
  onVibeFidClick,
  onDexClick,
  onProfileClick,
}: GameHeaderProps) {
  const { t } = useLanguage();
  const bondingProgress = useBondingProgress();

  const [showDexDropdown, setShowDexDropdown] = useState(false);
  const dexRef = useRef<HTMLDivElement>(null);

  // Close dex dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dexRef.current && !dexRef.current.contains(e.target as Node)) setShowDexDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      className={isInFarcaster ? 'fixed top-0 left-0 right-0 z-[100]' : 'mb-3'}
      style={{ overflow: 'visible' }}
    >
      {/* Header container — retangular, sem blur, sem border-radius */}
      <div
        className="flex items-center justify-between gap-1.5"
        style={{
          background: 'rgba(26,26,26,0.97)',
          borderBottom: '2px solid rgba(255,215,0,0.25)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '4px 8px',
          minHeight: 60,
          overflow: 'visible',
        }}
      >
        {/* LEFT — Profile button */}
        <div className="flex items-center" style={{ overflow: 'visible' }}>
          {isLoadingProfile && address ? (
            <div className="h-[52px] px-3 flex items-center rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="w-20 h-4 rounded animate-pulse" style={{ background: 'rgba(255,215,0,0.2)' }} />
            </div>
          ) : userProfile ? (
            <div className="tour-profile-dropdown relative" style={{ overflow: 'visible' }}>
              <button
                onClick={() => { if (soundEnabled) AudioManager.buttonClick(); if (onProfileClick) onProfileClick(); }}
                onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; if (soundEnabled) AudioManager.buttonHover(); }}
                className="tour-settings-btn flex items-center gap-2 cursor-pointer transition-colors"
                style={{ background: '#1D4ED8', height: 52, borderRadius: 8, padding: '6px 12px', border: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1E40AF')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1D4ED8')}
              >
                {/* Avatar */}
                {userProfile.farcasterPfpUrl ? (
                  <img src={userProfile.farcasterPfpUrl} alt={userProfile.username} className="rounded-full object-cover flex-shrink-0" style={{ width: 24, height: 24 }} onError={(e) => { (e.target as HTMLImageElement).src = getAvatarFallback(); }} />
                ) : userProfile.twitter ? (
                  <img src={getAvatarUrl({ twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl }) || ''} alt={userProfile.username} className="rounded-full flex-shrink-0" style={{ width: 24, height: 24 }} onError={(e) => { (e.target as HTMLImageElement).src = getAvatarFallback(); }} />
                ) : (
                  <div className="rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs" style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #6D28D9, #9333EA)', color: '#000' }}>
                    {userProfile.username[0].toUpperCase()}
                  </div>
                )}
                {/* Text + badges */}
                <div className="flex flex-col items-start justify-center min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-modern font-semibold leading-none truncate" style={{ fontSize: 12, color: '#FACC15', maxWidth: 100 }}>@{userProfile.username}</span>
                    <BadgeList badges={getUserBadges(userProfile.address, userProfile.userIndex ?? 9999, userProfile.hasVibeBadge)} size="sm" />
                  </div>
                  {(() => {
                    const lvl = getAuraLevel(userProfile.stats?.aura ?? 0);
                    return lvl.name
                      ? <span className="font-modern font-bold leading-none mt-0.5 uppercase" style={{ fontSize: 9, color: '#60a5fa', letterSpacing: '0.04em' }}>{lvl.name}</span>
                      : null;
                  })()}
                </div>
              </button>
            </div>
          ) : address && !isLoadingProfile ? (
            <button
              onClick={() => { if (soundEnabled) AudioManager.buttonClick(); onCreateProfileClick(); }}
              className="font-modern font-semibold cursor-pointer transition-colors rounded-lg"
              style={{ background: '#FFD700', color: '#000', height: 52, padding: '6px 16px', border: 'none', fontSize: 13 }}
            >
              {t('createProfile')}
            </button>
          ) : null}
        </div>

        {/* RIGHT — VBMS + Settings + Docs */}
        <div className="flex items-center gap-1.5" style={{ overflow: 'visible' }}>
          {address && userProfile && (
            <div ref={dexRef} className="tour-dex-dropdown relative" style={{ overflow: 'visible' }}>
              <button
                onClick={() => { if (soundEnabled) AudioManager.buttonClick(); if (onDexClick) { onDexClick(); return; } setShowDexDropdown((p) => !p); }}
                onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; if (soundEnabled) AudioManager.buttonHover(); if (!onDexClick) setShowDexDropdown(true); }}
                className="tour-dex-btn flex flex-col items-start justify-center cursor-pointer transition-colors relative overflow-hidden"
                style={{ background: '#7C3AED', height: 52, borderRadius: 8, padding: '6px 12px', border: 'none', minWidth: 110 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#6D28D9')}
                onMouseLeave={e => (e.currentTarget.style.background = '#7C3AED')}
              >
                <span className="font-modern font-semibold leading-none whitespace-nowrap" style={{ fontSize: 12, color: '#FACC15' }}>
                  {Number(vbmsBlockchainBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} $VBMS
                </span>
                <span className="dex-inwallet-label font-modern font-bold leading-none mt-0.5" style={{ fontSize: 9, color: '#FACC15', opacity: 0.7, letterSpacing: '0.04em' }}>in-wallet</span>
                {/* Bonding bar */}
                <div className="absolute rounded-full overflow-hidden" style={{ bottom: 5, left: 8, right: 8, height: 3, background: 'rgba(0,0,0,0.4)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(bondingProgress.progress, 100)}%`, background: 'linear-gradient(90deg, #FACC15, #4ade80)' }} />
                </div>
              </button>
              {showDexDropdown && (
                <div className="absolute top-full right-0 mt-1 rounded-lg overflow-hidden shadow-xl" style={{ background: '#1A1A1A', border: '2px solid rgba(255,215,0,0.3)', minWidth: 120, zIndex: 9999 }}>
                  <Link href="/dex?tab=buy" onClick={() => { if (soundEnabled) AudioManager.buttonClick(); setShowDexDropdown(false); }} onMouseEnter={() => { if (soundEnabled) AudioManager.buttonHover(); }} className="flex items-center gap-2 px-3 py-2.5 font-modern font-semibold text-xs transition-colors hover:bg-white/10" style={{ color: '#FFD700', fontSize: 12 }}>
                    <span style={{ color: '#4ade80' }}>▲</span> Buy
                  </Link>
                  <Link href="/dex?tab=sell" onClick={() => { if (soundEnabled) AudioManager.buttonClick(); setShowDexDropdown(false); }} onMouseEnter={() => { if (soundEnabled) AudioManager.buttonHover(); }} className="flex items-center gap-2 px-3 py-2.5 font-modern font-semibold text-xs transition-colors hover:bg-white/10" style={{ color: '#FFD700', fontSize: 12 }}>
                    <span style={{ color: '#f87171' }}>▼</span> Sell
                  </Link>
                </div>
              )}
            </div>
          )}

          {address && userProfile && (
            <button
              onClick={() => { if (soundEnabled) AudioManager.buttonClick(); onSettingsClick(); }}
              onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; if (soundEnabled) AudioManager.buttonHover(); }}
              className="tour-settings-gear flex items-center justify-center cursor-pointer transition-colors"
              style={{ background: '#b8860b', width: 52, height: 52, borderRadius: 8, border: 'none', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#a0780a')}
              onMouseLeave={e => (e.currentTarget.style.background = '#b8860b')}
              title="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.38.64 1 1.07 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
