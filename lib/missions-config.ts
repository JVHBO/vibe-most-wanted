export interface MissionInfo {
  icon: string;
  title: string;
  description: string;
}

const MISSION_DATA: Record<string, MissionInfo> = {
  daily_login: {
    icon: '/images/icons/mission.svg',
    title: 'Daily Login',
    description: 'Login bonus for today',
  },
  first_pve_win: {
    icon: '/images/icons/victory.svg',
    title: 'First PvE Victory',
    description: 'Win your first PvE battle today',
  },
  first_pvp_match: {
    icon: '/images/icons/battle.svg',
    title: 'First PvP Match',
    description: 'Complete your first PvP match today',
  },
  streak_3: {
    icon: '/images/icons/achievement.svg',
    title: '3-Win Streak',
    description: 'Win 3 matches in a row',
  },
  streak_5: {
    icon: '/images/icons/achievement.svg',
    title: '5-Win Streak',
    description: 'Win 5 matches in a row',
  },
  streak_10: {
    icon: '/images/icons/achievement.svg',
    title: '10-Win Streak',
    description: 'Win 10 matches in a row',
  },
  welcome_gift: {
    icon: '/images/icons/coins.svg',
    title: 'Welcome Gift',
    description: 'Receive your welcome bonus!',
  },
  vibefid_minted: {
    icon: '/images/icons/achievement.svg',
    title: 'VibeFID Collection',
    description: 'Own at least one VibeFID card!',
  },
  claim_vibe_badge: {
    icon: '/images/icons/achievement.svg',
    title: 'VIBE Badge',
    description: '2x coins in Wanted Cast!',
  },
};

export function getMissionInfo(missionType: string): MissionInfo {
  return MISSION_DATA[missionType] || {
    icon: '/images/icons/help.svg',
    title: 'Unknown Mission',
    description: missionType,
  };
}
