const MISSION_DATA: Record<string, { icon: string; titleKey: string; descKey: string; howToKey: string }> = {
  daily_login: {
    icon: '/images/icons/mission.svg',
    titleKey: 'mTitle_daily_login',
    descKey: 'mDesc_daily_login',
    howToKey: 'mHow_daily_login',
  },
  first_pve_win: {
    icon: '/images/icons/victory.svg',
    titleKey: 'mTitle_first_pve_win',
    descKey: 'mDesc_first_pve_win',
    howToKey: 'mHow_first_pve_win',
  },
  first_pvp_match: {
    icon: '/images/icons/battle.svg',
    titleKey: 'mTitle_first_pvp_match',
    descKey: 'mDesc_first_pvp_match',
    howToKey: 'mHow_first_pvp_match',
  },
  streak_3: {
    icon: '/images/icons/achievement.svg',
    titleKey: 'mTitle_streak_3',
    descKey: 'mDesc_streak_3',
    howToKey: 'mHow_streak',
  },
  streak_5: {
    icon: '/images/icons/achievement.svg',
    titleKey: 'mTitle_streak_5',
    descKey: 'mDesc_streak_5',
    howToKey: 'mHow_streak',
  },
  streak_10: {
    icon: '/images/icons/achievement.svg',
    titleKey: 'mTitle_streak_10',
    descKey: 'mDesc_streak_10',
    howToKey: 'mHow_streak',
  },
  welcome_gift: {
    icon: '/images/icons/coins.svg',
    titleKey: 'mTitle_welcome_gift',
    descKey: 'mDesc_welcome_gift',
    howToKey: 'mHow_welcome_gift',
  },
  vibefid_minted: {
    icon: '/images/icons/achievement.svg',
    titleKey: 'mTitle_vibefid_minted',
    descKey: 'mDesc_vibefid_minted',
    howToKey: 'mHow_vibefid_minted',
  },
  claim_vibe_badge: {
    icon: '/images/icons/achievement.svg',
    titleKey: 'mTitle_claim_vibe_badge',
    descKey: 'mDesc_claim_vibe_badge',
    howToKey: 'mHow_claim_vibe_badge',
  },
  first_baccarat_win: {
    icon: '/images/icons/mission.svg',
    titleKey: 'mTitle_first_baccarat_win',
    descKey: 'mDesc_first_baccarat_win',
    howToKey: 'mHow_first_baccarat_win',
  },
  daily_roulette_spin: {
    icon: '/images/icons/mission.svg',
    titleKey: 'mTitle_daily_roulette_spin',
    descKey: 'mDesc_daily_roulette_spin',
    howToKey: 'mHow_daily_roulette_spin',
  },
  send_vibemail_daily: {
    icon: '/images/icons/mission.svg',
    titleKey: 'mTitle_send_vibemail_daily',
    descKey: 'mDesc_send_vibemail_daily',
    howToKey: 'mHow_send_vibemail_daily',
  },
  daily_share: {
    icon: '/images/icons/mission.svg',
    titleKey: 'mTitle_daily_share',
    descKey: 'mDesc_daily_share',
    howToKey: 'mHow_daily_share',
  },
  neynar_score_cast: {
    icon: '/images/icons/achievement.svg',
    titleKey: 'mTitle_neynar_score_cast',
    descKey: 'mDesc_neynar_score_cast',
    howToKey: 'mHow_neynar_score_cast',
  },
};

export const ALL_MISSION_TYPES = [
  { type: 'daily_login', reward: 50, date: 'today' },
  { type: 'first_pve_win', reward: 25, date: 'today' },
  { type: 'first_pvp_match', reward: 50, date: 'today' },
  { type: 'first_baccarat_win', reward: 100, date: 'today' },
  { type: 'daily_roulette_spin', reward: 75, date: 'today' },
  { type: 'send_vibemail_daily', reward: 50, date: 'today' },
  { type: 'daily_share', reward: 100, date: 'today' },
  { type: 'streak_3', reward: 75, date: 'today' },
  { type: 'streak_5', reward: 150, date: 'today' },
  { type: 'streak_10', reward: 375, date: 'today' },
  { type: 'welcome_gift', reward: 250, date: 'once' },
  { type: 'vibefid_minted', reward: 5000, date: 'once' },
  { type: 'claim_vibe_badge', reward: 0, date: 'once' },
];

export const FALLBACK_MISSIONS = ALL_MISSION_TYPES.map((m) => ({
  _id: `placeholder_${m.type}`,
  missionType: m.type,
  completed: false,
  claimed: false,
  reward: m.reward,
  date: m.date,
}));

export function getMissionInfo(missionType: string): { icon: string; titleKey: string; descKey: string; howToKey: string } {
  return (
    MISSION_DATA[missionType] || {
      icon: '/images/icons/help.svg',
      titleKey: 'mTitle_unknown',
      descKey: 'mDesc_unknown',
      howToKey: 'mHow_unknown',
    }
  );
}
