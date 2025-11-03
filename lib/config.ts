/**
 * CENTRALIZED CONFIGURATION
 *
 * All hardcoded values, limits, and constants in one place.
 * Makes it easy to adjust game balance and configuration.
 */

// ==========================================
// GAME MECHANICS
// ==========================================

/** Number of cards in a hand/deck */
export const HAND_SIZE = 5;

/** Daily attack limits */
export const ATTACKS = {
  DEFAULT: 5,  // Regular players
  ADMIN: 50,   // Admin players
} as const;

// ==========================================
// SMART CONTRACTS
// ==========================================

/** JC NFT Contract Address (Base Mainnet) */
export const JC_CONTRACT_ADDRESS = '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728';

// ==========================================
// ADMIN CONFIGURATION
// ==========================================

/** Admin wallet addresses (get increased daily limits) */
export const ADMIN_WALLETS = [
  '0x2a9585Da40dE004d6Ff0f5F12cfe726BD2f98B52', // joaovitoribeiro
  '0xBb4c7d8B2E32c7C99d358Be999377c208cCE53c2', // Claude's wallet
] as const;

/**
 * Check if a wallet address is an admin
 */
export function isAdmin(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  const normalized = walletAddress.toLowerCase();
  return ADMIN_WALLETS.some(admin => admin.toLowerCase() === normalized);
}

/**
 * Get max daily attacks for a wallet
 */
export function getMaxAttacks(walletAddress: string | null | undefined): number {
  return isAdmin(walletAddress) ? ATTACKS.ADMIN : ATTACKS.DEFAULT;
}

// ==========================================
// ECONOMY LIMITS (from convex/economy.ts)
// ==========================================

/** PvE daily limits */
export const PVE_LIMITS = {
  MAX_WINS_PER_DAY: 30,
  DAILY_COIN_CAP: 3500,
} as const;

/** PvP daily limits */
export const PVP_LIMITS = {
  MAX_MATCHES_PER_DAY: 10,
  ENTRY_FEE: 20,        // Cost to play ranked PvP
} as const;

/** Attack mode limits */
export const ATTACK_LIMITS = {
  MAX_ATTACKS_PER_DAY: 5,
  ENTRY_FEE: 0,         // Free attacks
} as const;

/** PvE Rewards by difficulty */
export const PVE_REWARDS = {
  gey: 5,
  goofy: 15,
  gooner: 30,
  gangster: 60,
  gigachad: 120,
} as const;

/** Mission Rewards */
export const MISSION_REWARDS = {
  daily_login: 25,
  first_pve_win: 50,
  first_pvp_match: 100,
  welcome_gift: 500,
  streak_3: 150,
  streak_5: 300,
  streak_10: 750,
} as const;

// ==========================================
// PvP REWARDS
// ==========================================

/** Base PvP win reward (before ranking bonuses) */
export const PVP_BASE_WIN_REWARD = 100;

/** Base PvP loss penalty */
export const PVP_BASE_LOSS_PENALTY = -20;

// ==========================================
// RANKING BONUSES
// ==========================================

/**
 * Win multipliers based on rank difference
 * Example: If you're rank 50 and beat rank 3, you get 2.0x bonus
 */
export const RANK_WIN_MULTIPLIERS = [
  { minDiff: 50, multiplier: 2.0 },   // 50+ ranks higher
  { minDiff: 20, multiplier: 1.5 },   // 20-49 ranks higher
  { minDiff: 10, multiplier: 1.3 },   // 10-19 ranks higher
  { minDiff: 5, multiplier: 1.15 },   // 5-9 ranks higher
  { minDiff: 0, multiplier: 1.0 },    // Similar ranks
] as const;

/**
 * Loss penalty reduction based on rank difference
 * Example: Losing to a much higher ranked player costs less
 */
export const RANK_LOSS_REDUCTIONS = [
  { minDiff: 50, reduction: 0.6 },    // 60% reduction
  { minDiff: 20, reduction: 0.5 },    // 50% reduction
  { minDiff: 10, reduction: 0.35 },   // 35% reduction
  { minDiff: 5, reduction: 0.2 },     // 20% reduction
  { minDiff: 0, reduction: 0.0 },     // No reduction
] as const;

// ==========================================
// FEATURES FLAGS
// ==========================================

/** Enable/disable features */
export const FEATURES = {
  CASUAL_PVP: true,
  RANKED_PVP: true,
  ATTACK_MODE: true,
  DEFENSE_DECK: true,
  MISSIONS: true,
  QUESTS: true,
  LEADERBOARD: true,
} as const;

// ==========================================
// DEVELOPMENT
// ==========================================

/** Development mode flag */
export const IS_DEV = process.env.NODE_ENV === 'development';

/** Enable debug logging */
export const DEBUG_LOGGING = IS_DEV;
