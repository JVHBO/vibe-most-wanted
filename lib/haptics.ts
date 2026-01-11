/**
 * Haptic feedback utility for Farcaster Miniapp
 * Provides tactile feedback on mobile devices
 */

import { sdk } from "@farcaster/miniapp-sdk";

type HapticIntensity = "light" | "medium" | "heavy";

/**
 * Trigger haptic feedback if available
 * Silently fails if not in miniapp or haptics not supported
 */
export async function haptic(intensity: HapticIntensity = "medium"): Promise<void> {
  try {
    if (sdk?.actions?.haptic?.impactOccurred) {
      await sdk.actions.haptic.impactOccurred(intensity);
    }
  } catch {
    // Silently fail - haptics are optional UX enhancement
  }
}

/**
 * Preset haptic patterns for common actions
 */
export const haptics = {
  // Light feedback - subtle touches
  tap: () => haptic("light"),
  tick: () => haptic("light"),

  // Medium feedback - standard actions
  confirm: () => haptic("medium"),
  select: () => haptic("medium"),
  action: () => haptic("medium"),

  // Heavy feedback - important moments
  success: () => haptic("heavy"),
  victory: () => haptic("heavy"),
  jackpot: () => haptic("heavy"),
  error: () => haptic("heavy"),

  // Game-specific
  attack: () => haptic("medium"),
  damage: () => haptic("medium"),
  defeat: () => haptic("medium"),
  cardReveal: () => haptic("light"),
  rareCard: () => haptic("heavy"),
  spin: () => haptic("light"),
  spinResult: () => haptic("heavy"),
  mint: () => haptic("heavy"),
  claim: () => haptic("medium"),
  send: () => haptic("light"),
};

export default haptics;
