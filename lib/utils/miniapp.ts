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

/**
 * Check if the current miniapp client supports Arbitrum (eip155:42161).
 * Uses sdk.getChains() which returns supported chain IDs.
 * Returns true for non-miniapp contexts (browser) or if ARB is supported.
 * Waits for SDK context to be ready before calling getChains().
 */
export async function checkArbitrumSupport(): Promise<boolean> {
  if (!isMiniappMode()) return true; // Not a miniapp, no restrictions

  try {
    const { sdk } = await import('@farcaster/miniapp-sdk');
    // Wait for SDK context to be ready (handshake complete)
    const context = await sdk.context;
    if (!context) return true; // Can't determine, assume supported
    const chains = await sdk.getChains();
    return chains.includes('eip155:42161');
  } catch {
    // If getChains() fails, assume ARB not supported (safety)
    return false;
  }
}
