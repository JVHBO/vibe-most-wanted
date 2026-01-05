"use client";

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

  return (
    <div className={`tour-header ${isInFarcaster ? 'fixed top-0 left-0 right-0 z-[100]' : 'mb-3 md:mb-4'}`}>
      <div className={`bg-vintage-charcoal/95 backdrop-blur-lg p-1.5 ${isInFarcaster ? 'rounded-none border-b-2' : 'rounded-xl border-2'} border-vintage-gold/30`}>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center">
            {userProfile ? (
              <Link
                href={`/profile/${userProfile.username}`}
                onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
                style={{ backgroundColor: '#ff0000' }}
                className="flex items-center gap-1.5 text-white border border-vintage-gold/30 rounded-lg px-1 py-2 transition"
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
              </Link>
            ) : (
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  onCreateProfile();
                }}
                style={{ backgroundColor: '#ff0000' }}
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
              <div style={{ backgroundColor: '#ff0000' }} className="text-white border border-vintage-gold/30 rounded-lg px-1 py-2 flex items-center gap-1">
                <span className="text-white text-sm font-bold">$</span>
                <div className="flex flex-col">
                  <span className="text-white font-display font-bold text-[10px] leading-none">
                    {Number(vbmsBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-white/70 font-modern text-[7px] leading-none">VBMS</span>
                </div>
              </div>
            )}
            <button
              onClick={() => { if (soundEnabled) AudioManager.buttonClick(); onSettingsClick(); }}
              style={{ backgroundColor: '#ff0000' }}
              className="tour-settings-btn text-white border border-vintage-gold/30 rounded-lg px-1 py-2 transition"
              title="Settings"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            {!isInFarcaster && (
              <div className="hidden lg:block"><PriceTicker className="-mt-1" /></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
