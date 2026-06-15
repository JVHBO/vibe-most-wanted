"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { AudioManager } from "@/lib/audio-manager";

type NavTab = "home" | "claim" | "leaderboard" | "shop" | "vibemail";

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
  onClaimClick,
}: BottomNavigationProps) {
  const { t } = useLanguage();

  const handleClick = (callback: () => void) => {
    if (soundEnabled) AudioManager.buttonClick();
    callback();
  };

  const baseButtonClass = `flex-1 min-w-0 rounded-lg font-modern font-semibold transition-all ${
    isInFarcaster
      ? "px-1 py-2 flex flex-col items-center justify-center gap-0.5 text-[10px] leading-tight"
      : "px-2 md:px-4 py-2 md:py-3 flex items-center justify-center gap-2 text-xs md:text-sm"
  }`;

  const activeClass = "bg-vintage-gold text-vintage-black";
  const inactiveClass = "bg-vintage-black text-vintage-gold hover:bg-vintage-gold/10 border border-vintage-gold/30";

  return (
    <div className={isInFarcaster ? "fixed bottom-0 left-0 right-0 z-[100]" : "mb-3 md:mb-4"}>
      <div className={`bg-vintage-charcoal/95 backdrop-blur-lg ${isInFarcaster ? "rounded-none border-t-2 border-t-yellow-600/30 max-w-[304px] mx-auto pt-1.5 px-1.5 safe-area-bottom" : "rounded-xl border-2 border-vintage-gold/30 p-1.5"} flex gap-1`}>
        <button
          onClick={() => handleClick(() => {})}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`${baseButtonClass} ${activeTab === "home" ? activeClass : inactiveClass}`}
        >
          <span className={isInFarcaster ? "text-xl leading-none" : "text-lg"}>♠</span>
          <span className={isInFarcaster ? "text-[9px] font-bold" : "hidden sm:inline"}>{t("navHome")}</span>
        </button>

        <button
          onClick={() => handleClick(onClaimClick)}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`relative ${baseButtonClass} ${activeTab === "claim" ? activeClass : inactiveClass}`}
        >
          {hasClaimableRewards && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border border-vintage-gold z-10" />
          )}
          <span className={isInFarcaster ? "text-xl leading-none" : "text-lg"}>□</span>
          <span className={isInFarcaster ? "text-[9px] font-bold" : "hidden sm:inline"}>{t("navClaim")}</span>
        </button>

        <Link
          href="/leaderboard"
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`${baseButtonClass} ${activeTab === "leaderboard" ? activeClass : inactiveClass}`}
        >
          <span className={isInFarcaster ? "text-xl leading-none" : "text-lg"}>♔</span>
          <span className={isInFarcaster ? "text-[9px] font-bold" : "hidden sm:inline"}>{isInFarcaster ? t("navRank") : t("leaderboard")}</span>
        </Link>

        <Link
          href="/shop"
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`${baseButtonClass} ${activeTab === "shop" ? activeClass : inactiveClass}`}
        >
          <span className={isInFarcaster ? "text-xl leading-none" : "text-lg"}>□</span>
          <span className={isInFarcaster ? "text-[9px] font-bold" : "hidden sm:inline"}>{t("navShop")}</span>
        </Link>

        <Link
          href="/fid/vibemail"
          onClick={() => { if (soundEnabled) AudioManager.buttonClick(); }}
          onMouseEnter={() => soundEnabled && AudioManager.buttonHover()}
          className={`relative ${baseButtonClass} ${activeTab === "vibemail" ? activeClass : inactiveClass}`}
        >
          <span className={isInFarcaster ? "text-xl leading-none" : "text-lg"}>✉</span>
          <span className={isInFarcaster ? "text-[9px] font-bold" : "hidden sm:inline"}>VIBEMAIL</span>
        </Link>
      </div>
    </div>
  );
}
