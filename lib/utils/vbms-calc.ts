/**
 * VBMS PvP Economy Calculations (pure, extracted from convex/economyVBMS.ts)
 *
 * Pure math functions for the real VBMS token economy.
 * No database calls, no side effects.
 */

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

export const VBMS_ENTRY_FEE = 20;
export const VBMS_PVP_WIN_REWARD = 100;
export const VBMS_PVP_LOSS_PENALTY = -20;

// ═══════════════════════════════════════════════════════════════
// Pure calculation functions
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate the net reward for a PvP match result.
 * Winner gets reward + entry fee back. Loser just gets penalty.
 */
export function calculateVBMSPvPReward(won: boolean): number {
  if (won) {
    return VBMS_PVP_WIN_REWARD + VBMS_ENTRY_FEE; // 100 + 20 = 120
  }
  return VBMS_PVP_LOSS_PENALTY; // -20
}

/**
 * Calculate new inbox balance after PvP result.
 */
export function calculateNewInbox(currentInbox: number, won: boolean): number {
  return currentInbox + calculateVBMSPvPReward(won);
}

/**
 * Check if player can afford the PvP entry fee.
 */
export function canAffordEntry(inbox: number): boolean {
  return inbox >= VBMS_ENTRY_FEE;
}

/**
 * Calculate inbox after paying entry fee.
 */
export function deductEntryFee(currentInbox: number): number {
  return currentInbox - VBMS_ENTRY_FEE;
}

/**
 * Calculate lifetime earned increment (only positive rewards count).
 */
export function lifetimeEarnedIncrement(won: boolean): number {
  const reward = calculateVBMSPvPReward(won);
  return Math.max(0, reward);
}
