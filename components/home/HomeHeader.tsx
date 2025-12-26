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
    <div className={`${isInFarcaster ? 'fixed top-0 left-0 right-0 z-[100]' : 'mb-3 md:mb-4'}`}>
      <div className={`bg-vintage-charcoal/90 backdrop-blur-lg p-2 md:p-3 ${isInFarcaster ? 'rounded-none border-b-2' : 'rounded-xl border-2'} border-vintage-gold/30`}>
        <div className="flex items-center justify-between gap-2">
          {/* Left: Profile */}
          <div className="flex items-center gap-2">
            {userProfile ? (
              <Link
                href={`/profile/${userProfile.username}`}
                onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
                className="flex items-center gap-2 px-3 py-1.5 bg-vintage-gold/10 hover:bg-vintage-gold/20 border border-vintage-gold/40 rounded-lg transition"
              >
                {userProfile.twitter ? (
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
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-white truncate max-w-[80px] md:max-w-none">@{userProfile.username}</span>
                  <BadgeList badges={getUserBadges(userProfile.address, userProfile.userIndex ?? 9999, userProfile.hasVibeBadge)} size="sm" />
                </div>
              </Link>
            ) : (
              <button
                onClick={() => {
                  if (soundEnabled) AudioManager.buttonClick();
                  onCreateProfile();
                }}
                className="px-3 py-1.5 bg-vintage-gold hover:bg-vintage-gold/80 text-vintage-black rounded-lg text-xs font-semibold transition"
              >
                {t('createProfile')}
              </button>
            )}
          </div>

          {/* Center: Title (mobile only shows on non-farcaster) */}
          {!isInFarcaster && (
            <div className="hidden md:block">
              <h1 className="text-lg font-display font-bold text-vintage-gold tracking-wide">
                VIBE MW
              </h1>
            </div>
          )}

          {/* Right: Balance + Settings */}
          <div className="flex items-center gap-2">
            {/* VBMS Balance */}
            {userProfile && (
              <div className="bg-vintage-gold/10 border border-vintage-gold/40 px-2 md:px-3 py-1 md:py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="text-vintage-gold text-lg md:text-xl font-bold">$</span>
                <div className="flex flex-col">
                  <span className="text-vintage-gold font-display font-bold text-xs md:text-sm leading-none">
                    {Number(vbmsBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-vintage-burnt-gold font-modern text-[7px] md:text-[9px] leading-none">
                    VBMS
                  </span>
                </div>
              </div>
            )}

            {/* Settings Gear */}
            <button
              onClick={() => {
                if (soundEnabled) AudioManager.buttonClick();
                onSettingsClick();
              }}
              className="p-2 bg-vintage-black/50 hover:bg-vintage-gold/10 border border-vintage-gold/30 rounded-lg transition"
              title="Settings"
            >
              <svg className="w-5 h-5 text-vintage-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            {/* Price Ticker - Website only */}
            {!isInFarcaster && (
              <div className="hidden lg:block">
                <PriceTicker className="-mt-1" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
