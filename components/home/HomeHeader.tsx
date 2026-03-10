"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { AudioManager } from "@/lib/audio-manager";
import { BadgeList } from "@/components/Badge";
import { getUserBadges } from "@/lib/badges";
import { PriceTicker } from "@/components/PriceTicker";

interface UserProfile {
  username: string;
  address: string;
  twitter?: string;
  twitterProfileImageUrl?: string;
  userIndex?: number;
  hasVibeBadge?: boolean;
}

interface HomeHeaderProps {
  userProfile: UserProfile | null;
  vbmsBalance: string | number;
  isInFarcaster: boolean;
  soundEnabled: boolean;
  onCreateProfile: () => void;
  onSettingsClick: () => void;
  getAvatarUrl: (profile: { twitter?: string; twitterProfileImageUrl?: string }) => string | null;
}

const getAvatarFallback = () => '/images/default-avatar.png';

export function HomeHeader({
  userProfile,
  vbmsBalance,
  isInFarcaster,
  soundEnabled,
  onCreateProfile,
  onSettingsClick,
  getAvatarUrl,
}: HomeHeaderProps) {
  const { t } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click (mobile)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowDropdown(false), 200);
  };

  return (
    <div className={`tour-header ${isInFarcaster ? 'fixed top-0 left-0 right-0 z-[100]' : 'mb-3 md:mb-4'}`}>
      <div className={`bg-vintage-charcoal/95 backdrop-blur-lg p-1.5 ${isInFarcaster ? 'rounded-none border-b-2' : 'rounded-xl border-2'} border-vintage-gold/30 overflow-visible`}>
        <div className="flex items-center justify-between gap-1 overflow-visible">
          <div className="flex items-center">
            {userProfile ? (
              <div
                ref={dropdownRef}
                className="tour-profile-dropdown relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => {
                    if (soundEnabled) AudioManager.buttonClick();
                    setShowDropdown(prev => !prev);
                  }}
                  className="tour-profile-btn flex items-center gap-1.5 text-white rounded-lg px-1 py-2 transition bg-neo-profile border-[3px] border-black shadow-[3px_3px_0px_#000]"
                >
                  {userProfile.twitter ? (
                    <img
                      src={getAvatarUrl({ twitter: userProfile.twitter, twitterProfileImageUrl: userProfile.twitterProfileImageUrl }) || ''}
                      alt={userProfile.username}
                      className="w-5 h-5 rounded-full"
                      onError={(e) => { (e.target as HTMLImageElement).src = getAvatarFallback(); }}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-vintage-gold to-vintage-burnt-gold flex items-center justify-center text-[10px] font-bold text-vintage-black">
                      {userProfile.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-[10px] font-semibold text-white truncate max-w-[50px]">@{userProfile.username}</span>
                  <BadgeList badges={getUserBadges(userProfile.address, userProfile.userIndex ?? 9999, userProfile.hasVibeBadge)} size="xs" />
                </button>

                {/* Dropdown menu */}
                {showDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-vintage-charcoal border-2 border-vintage-gold/30 rounded-lg overflow-hidden z-[200] min-w-[140px] shadow-lg">
                    <Link
                      href={`/profile/${userProfile.username}`}
                      onClick={() => {
                        if (soundEnabled) AudioManager.buttonClick();
                        setShowDropdown(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-vintage-gold hover:bg-vintage-gold/20 transition text-xs font-semibold"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        if (soundEnabled) AudioManager.buttonClick();
                        setShowDropdown(false);
                        onSettingsClick();
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-vintage-gold hover:bg-vintage-gold/20 transition text-xs font-semibold w-full text-left"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      Settings
                    </button>
                    <Link
                      href="/docs"
                      onClick={() => {
                        if (soundEnabled) AudioManager.buttonClick();
                        setShowDropdown(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-vintage-gold hover:bg-vintage-gold/20 transition text-xs font-semibold"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      Docs
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  onCreateProfile();
                }}
                className="text-white border border-vintage-gold/30 rounded-lg px-1 py-2 text-[10px] font-semibold transition"
              >
                {t('createProfile')}
              </button>
            )}
          </div>
          {!isInFarcaster && (
            <div className="hidden md:block">
              <h1 className="text-lg font-display font-bold text-vintage-gold tracking-wide">VIBE MW</h1>
            </div>
          )}
          <div className="flex items-center gap-1">
            {userProfile && (
              <div className="tour-dex-btn text-white rounded-lg px-1 py-2 flex items-center gap-1" style={{ background: '#6B1AB5', border: '3px solid #000', boxShadow: '3px 3px 0px #000' }}>
                <span className="text-white text-sm font-bold">$</span>
                <div className="flex flex-col">
                  <span className="text-white font-display font-bold text-[10px] leading-none">
                    {Number(vbmsBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-white/70 font-modern text-[7px] leading-none">VBMS</span>
                </div>
              </div>
            )}
            {!isInFarcaster && (
              <div className="hidden lg:block"><PriceTicker className="-mt-1" /></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
