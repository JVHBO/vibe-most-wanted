/**
 * Raid Boss System - Main Export
 *
 * Central export point for the raid boss system
 */

export {
  type BossCard,
  BOSS_HP_BY_RARITY,
  BOSS_REWARDS_BY_RARITY,
  BOSS_ROTATION_ORDER,
  BOSS_RARITY_ORDER,
  GMVBRS_BOSSES,
  VBMS_BOSSES,
  VIBEFID_BOSSES,
  AFCL_BOSSES,
  CUMIOH_BOSSES,
  VIBERUTO_BOSSES,
  VIBEROTBANGERS_BOSSES,
  ALL_BOSS_CARDS,
  getBossCard,
  getCurrentBoss,
  getNextBoss,
  getPreviousBoss,
  getBossRotationInfo,
} from './boss-cards';
