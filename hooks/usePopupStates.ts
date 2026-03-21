"use client";

import { useState } from "react";

/**
 * Centralizes all modal/popup boolean states from page.tsx.
 * Adding a new modal: declare here, destructure in page.tsx.
 */
export function usePopupStates() {
  // Onboarding
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [showGuidedTour, setShowGuidedTour] = useState<boolean>(false);

  // Battle result popups
  const [showBattleScreen, setShowBattleScreen] = useState<boolean>(false);
  const [showWinPopup, setShowWinPopup] = useState<boolean>(false);
  const [showLossPopup, setShowLossPopup] = useState<boolean>(false);
  const [showTiePopup, setShowTiePopup] = useState<boolean>(false);

  // Game modals
  const [showRoulette, setShowRoulette] = useState<boolean>(false);
  const [showCpuArena, setShowCpuArena] = useState<boolean>(false);
  const [showBaccarat, setShowBaccarat] = useState<boolean>(false);
  const [isDifficultyModalOpen, setIsDifficultyModalOpen] = useState<boolean>(false);
  const [showDefenseDeckModal, setShowDefenseDeckModal] = useState<boolean>(false);
  const [showDefenseDeckWarning, setShowDefenseDeckWarning] = useState<boolean>(false);
  const [showDefenseDeckSaved, setShowDefenseDeckSaved] = useState<boolean>(false);
  const [showPveCardSelection, setShowPveCardSelection] = useState<boolean>(false);
  const [showAttackCardSelection, setShowAttackCardSelection] = useState<boolean>(false);
  const [showPvPEntryFeeModal, setShowPvPEntryFeeModal] = useState<boolean>(false);
  const [showPvPPreview, setShowPvPPreview] = useState<boolean>(false);
  const [showLeaderboardRewardsModal, setShowLeaderboardRewardsModal] = useState<boolean>(false);
  const [showMyCardsModal, setShowMyCardsModal] = useState<boolean>(false);

  // UI panels
  const [modeMenuOpen, setModeMenuOpen] = useState<'battle' | 'boss' | null>(null);

  // Settings & account
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCreateProfile, setShowCreateProfile] = useState<boolean>(false);
  const [showChangeUsername, setShowChangeUsername] = useState<boolean>(false);
  // Feature modals
  const [showFidMailModal, setShowFidMailModal] = useState<boolean>(false);
  const [fidModalTarget, setFidModalTarget] = useState<number | null>(null); // null = own card

  // Claim popups
  const [showDailyClaimPopup, setShowDailyClaimPopup] = useState<boolean>(false);
  const [showWeeklyLeaderboardPopup, setShowWeeklyLeaderboardPopup] = useState<boolean>(false);

  // Changelog & Bug report
  const [showChangelog, setShowChangelog] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);

  return {
    // Onboarding
    showTutorial, setShowTutorial,
    showGuidedTour, setShowGuidedTour,
    // Battle result
    showBattleScreen, setShowBattleScreen,
    showWinPopup, setShowWinPopup,
    showLossPopup, setShowLossPopup,
    showTiePopup, setShowTiePopup,
    // Game modals
    showRoulette, setShowRoulette,
    showCpuArena, setShowCpuArena,
    showBaccarat, setShowBaccarat,
    isDifficultyModalOpen, setIsDifficultyModalOpen,
    showDefenseDeckModal, setShowDefenseDeckModal,
    showDefenseDeckWarning, setShowDefenseDeckWarning,
    showDefenseDeckSaved, setShowDefenseDeckSaved,
    showPveCardSelection, setShowPveCardSelection,
    showAttackCardSelection, setShowAttackCardSelection,
    showPvPEntryFeeModal, setShowPvPEntryFeeModal,
    showPvPPreview, setShowPvPPreview,
    showLeaderboardRewardsModal, setShowLeaderboardRewardsModal,
    showMyCardsModal, setShowMyCardsModal,
    // UI panels
    modeMenuOpen, setModeMenuOpen,
    // Settings & account
    showSettings, setShowSettings,
    showCreateProfile, setShowCreateProfile,
    showChangeUsername, setShowChangeUsername,
    // Feature modals
    showFidMailModal, setShowFidMailModal,
    fidModalTarget, setFidModalTarget,
    // Claim popups
    showDailyClaimPopup, setShowDailyClaimPopup,
    showWeeklyLeaderboardPopup, setShowWeeklyLeaderboardPopup,
    // Changelog & Bug report
    showChangelog, setShowChangelog,
    showReport, setShowReport,
  };
}
