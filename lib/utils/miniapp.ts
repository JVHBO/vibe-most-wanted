/**
 * Miniapp Detection Utility
 *
 * Detects if app is running in Farcaster miniapp (iframe context)
 * Used to optimize performance by disabling heavy features
 */

export function isMiniappMode(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if running in iframe (Farcaster miniapp)
  return window.parent !== window;
}

export function shouldSkipHeavyQueries(): boolean {
  return isMiniappMode();
}

export function shouldDisableVoiceChat(): boolean {
  return isMiniappMode();
}
