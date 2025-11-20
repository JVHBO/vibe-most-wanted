/**
 * Miniapp Detection Utility
 *
 * Detects if app is running in Farcaster miniapp (iframe context)
 * Used to optimize performance by disabling heavy features
 */

export function isMiniappMode(): boolean {
  if (typeof window === 'undefined') return false;

  // Simple check: are we in an iframe?
  // This is reliable for Farcaster miniapps
  return window.self !== window.top;
}

export function shouldSkipHeavyQueries(): boolean {
  return isMiniappMode();
}

export function shouldDisableVoiceChat(): boolean {
  // DISABLED: Allow voice chat even in iframe
  // Voice chat works fine in Farcaster web iframe
  // Only the native mobile app has restrictions
  return false;
}
