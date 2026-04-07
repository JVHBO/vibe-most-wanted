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
    <div className={`mb-3 md:mb-6 ${isInFarcaster ? 'fixed top-0 left-0 right-0 z-[100] m-0' : ''}`} style={{ overflow: 'visible' }}>
      <div className={`bg-vintage-charcoal/80 backdrop-blur-lg p-1 md:p-3 ${isInFarcaster ? 'rounded-none border-b-2' : 'rounded-xl border-2'} border-vintage-gold/30`} style={{ overflow: 'visible' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3" style={{ overflow: 'visible' }}>

          {/* Left: Profile */}
          <div className="flex items-center gap-2" style={{ overflow: 'visible' }}>
            {isLoadingProfile ? (
              <div className="px-4 py-2 bg-vintage-black/50 border border-vintage-gold/20 rounded-lg">
                <div className="w-20 h-4 bg-vintage-gold/20 rounded animate-pulse" />
              </div>
            ) : userProfile ? (
              <div className="tour-profile-dropdown relative" style={{ overflow: 'visible' }}>
                <button
                  onClick={() => { if (onProfileClick) { if (soundEnabled) AudioManager.buttonClick(); onProfileClick(); return; } if (soundEnabled) AudioManager.buttonClick(); }}
                  onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; if (soundEnabled) AudioManager.buttonHover(); }}
                  className="tour-settings-btn flex items-center gap-2 px-4 py-2 h-[52px] bg-blue-600 hover:bg-blue-500 border-0 rounded-lg transition cursor-pointer"
                >
                  {userProfile.farcasterPfpUrl ? (
                    <img
                      src={userProfile.farcasterPfpUrl}
                      alt={userProfile.username}
                      className="w-6 h-6 rounded-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = getAvatarFallback(); }}
                    />
                  ) : userProfile.twitter ? (
                    <img
                      src={getAvatarUrl({ twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl }) || ''}
                      alt={userProfile.username}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).src = getAvatarFallback(); }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-vintage-gold to-vintage-burnt-gold flex items-center justify-center text-xs font-bold text-vintage-black">
                      {userProfile.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex flex-col items-start justify-center min-w-0">
                      <span className="text-sm font-semibold text-vintage-gold leading-none truncate max-w-[120px]">@{userProfile.username}</span>
                      {(() => {
                        const lvl = getAuraLevel(userProfile.stats?.aura ?? 0);
                        return lvl.name
                          ? <span className={`text-[9px] font-bold ${lvl.color} leading-none mt-0.5 uppercase tracking-wide`}>{lvl.name}</span>
                          : null;
                      })()}
                    </div>
                    <BadgeList badges={getUserBadges(userProfile.address, userProfile.userIndex ?? 9999, userProfile.hasVibeBadge)} size="sm" />
                  </div>
                </button>
              </div>
            ) : (
              <button
                onClick={() => { if (soundEnabled) AudioManager.buttonClick(); onCreateProfileClick(); }}
                className="px-4 py-2 bg-vintage-gold hover:bg-vintage-gold/80 text-vintage-black rounded-lg text-sm font-semibold"
              >
                {t('createProfile')}
              </button>
            )}
          </div>

          {/* Right: VBMS Balance */}
          <div className="flex items-center gap-2">
            {address && userProfile && (
              <div ref={dexRef} className="tour-dex-dropdown relative" style={{ overflow: 'visible' }}>
                <button
                  onClick={() => { if (onDexClick) { if (soundEnabled) AudioManager.buttonClick(); onDexClick(); return; } if (soundEnabled) AudioManager.buttonClick(); setShowDexDropdown((p) => !p); }}
                  onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; if (soundEnabled) AudioManager.buttonHover(); if (!onDexClick) setShowDexDropdown(true); }}
                  className="tour-dex-btn bg-purple-600 hover:bg-purple-500 border-0 px-4 py-2 h-[52px] rounded-lg relative flex items-center gap-2 transition cursor-pointer min-w-[120px]"
                >
                  <div className="flex flex-col items-start justify-center min-w-0">
                    <span className="text-sm font-semibold text-vintage-gold leading-none truncate">
                      {Number(vbmsBlockchainBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} $VBMS
                    </span>
                    <span style={{ fontSize: '7px', fontWeight: 700, color: '#FFD700', lineHeight: 1, marginTop: '2px', letterSpacing: '0.05em' }}>in-wallet</span>
                  </div>
                  <div className="absolute bottom-1.5 left-2 right-2 h-1 bg-vintage-deep-black rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-vintage-gold to-green-400 transition-all" style={{ width: `${Math.min(bondingProgress.progress, 100)}%` }} />
                  </div>
                </button>
                {showDexDropdown && (
                  <div
                    className="absolute top-full right-0 mt-1 bg-vintage-charcoal border-2 border-vintage-gold/30 rounded-lg overflow-hidden min-w-[120px] shadow-xl"
                    style={{ zIndex: 9999 }}
                  >
                    <Link
                      href="/dex?tab=buy"
                      onClick={() => { if (soundEnabled) AudioManager.buttonClick(); setShowDexDropdown(false); }}
                      onMouseEnter={() => { if (soundEnabled) AudioManager.buttonHover(); }}
                      className="flex items-center gap-2 px-3 py-2.5 text-vintage-gold hover:bg-vintage-gold/20 transition text-xs font-semibold"
                    >
                      <span className="text-green-400 text-sm">▲</span> Buy
                    </Link>
                    <Link
                      href="/dex?tab=sell"
                      onClick={() => { if (soundEnabled) AudioManager.buttonClick(); setShowDexDropdown(false); }}
                      onMouseEnter={() => { if (soundEnabled) AudioManager.buttonHover(); }}
                      className="flex items-center gap-2 px-3 py-2.5 text-vintage-gold hover:bg-vintage-gold/20 transition text-xs font-semibold"
                    >
                      <span className="text-red-400 text-sm">▼</span> Sell
                    </Link>
                  </div>
                )}
              </div>
            )}
            {address && userProfile && (
              <button
                onClick={() => { if (soundEnabled) AudioManager.buttonClick(); onSettingsClick(); }}
                onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; if (soundEnabled) AudioManager.buttonHover(); }}
                className="tour-settings-gear bg-[#b8860b] hover:bg-[#a0780a] border-0 h-[52px] w-[52px] flex items-center justify-center rounded-lg transition cursor-pointer text-vintage-gold"
                title="Settings"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.38.64 1 1.07 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              </button>
            )}
            {address && userProfile && (
              <Link
                href="/docs"
                onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
                onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; if (soundEnabled) AudioManager.buttonHover(); }}
                className="tour-docs-btn bg-[#b8860b] hover:bg-[#a0780a] border-0 h-[52px] w-[52px] flex items-center justify-center rounded-lg transition cursor-pointer text-vintage-gold"
                title="Docs"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              </Link>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
