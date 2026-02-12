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

// Warpcast's clientFid - only client known to support Arbitrum
const WARPCAST_CLIENT_FID = 9152;

/**
 * Check if the current miniapp client supports Arbitrum.
 * Only Warpcast (clientFid 9152) is known to support ARB transactions.
 * Other clients (Base App, etc.) get forced to Base chain.
 * Returns true for non-miniapp contexts (browser).
 */
export async function checkArbitrumSupport(): Promise<boolean> {
  if (!isMiniappMode()) return true; // Not a miniapp, no restrictions

  try {
    const { sdk } = await import('@farcaster/miniapp-sdk');
    const context = await sdk.context;
    // Only Warpcast supports ARB; other clients (Base App etc.) don't
    return context?.client?.clientFid === WARPCAST_CLIENT_FID;
  } catch {
    return false;
  }
}
