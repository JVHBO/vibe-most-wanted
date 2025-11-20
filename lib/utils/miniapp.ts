/**
 * Miniapp Detection Utility
 *
 * Detects if app is running in Farcaster miniapp (iframe context)
 * Used to optimize performance by disabling heavy features
 */

export function isMiniappMode(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // Check if running in iframe
    if (window.self === window.top) {
      // Not in iframe - definitely not miniapp
      return false;
    }

    // Additional safety check: verify we can access parent
    // (some browser security features might throw errors)
    try {
      // Try to access parent.location - will throw if cross-origin
      const _ = window.parent.location.href;
      // If we can access it, we're in same-origin iframe (not Farcaster miniapp)
      return false;
    } catch (e) {
      // Cross-origin iframe - likely a real miniapp
      return true;
    }
  } catch (e) {
    // If any error, assume not in miniapp to be safe
    return false;
  }
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
