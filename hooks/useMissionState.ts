"use client";

import { useState } from "react";

/**
 * Mission, quest and claim state from page.tsx
 */
export function useMissionState() {
  // Quest/mission data (from Convex)
  const [questProgress, setQuestProgress] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);
  const [playerMissions, setPlayerMissions] = useState<any[]>([]);
  const [banCheck, setBanCheck] = useState<any>(null);

  // Claim flow
  const [loginBonusClaimed, setLoginBonusClaimed] = useState<boolean>(false);
  const [isClaimingBonus, setIsClaimingBonus] = useState<boolean>(false);
  const [isClaimingWeeklyReward, setIsClaimingWeeklyReward] = useState<boolean>(false);

  // Mission list
  const [missions, setMissions] = useState<any[]>([]);
  const [isLoadingMissions, setIsLoadingMissions] = useState<boolean>(false);
  const [isClaimingMission, setIsClaimingMission] = useState<string | null>(null);
  const [isClaimingAll, setIsClaimingAll] = useState<boolean>(false);
  const [missionsSubView, setMissionsSubView] = useState<'missions' | 'social'>('social');

  return {
    questProgress, setQuestProgress,
    weeklyProgress, setWeeklyProgress,
    playerMissions, setPlayerMissions,
    banCheck, setBanCheck,
    loginBonusClaimed, setLoginBonusClaimed,
    isClaimingBonus, setIsClaimingBonus,
    isClaimingWeeklyReward, setIsClaimingWeeklyReward,
    missions, setMissions,
    isLoadingMissions, setIsLoadingMissions,
    isClaimingMission, setIsClaimingMission,
    isClaimingAll, setIsClaimingAll,
    missionsSubView, setMissionsSubView,
  };
}
