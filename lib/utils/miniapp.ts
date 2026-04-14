/**
 * Miniapp Detection Utility
 *
 * Detects if app is running in Farcaster miniapp (iframe context)
 * Used to optimize performance by disabling heavy features
 */

export function isMiniappMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.self !== window.top;
}

/**
 * Returns true only when Farcaster SDK should be used for wallet transactions.
 * Base App (RN WebView) injects window.ethereum but is NOT a Farcaster miniapp.
 * Always use wagmi for TXs in Base App.
 */
export function shouldUseFarcasterSDK(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof (window as any).ReactNativeWebView !== 'undefined') return false;
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
 * Check if the current miniapp client supports Arbitrum.
 * Only Warpcast (9152) supports ARB. Base App (309857) does NOT.
 * Does NOT call any SDK methods to avoid racing with wallet provider init.
 * Uses clientFid passed from the already-loaded Farcaster context.
 */
export function isWarpcastClient(clientFid: number | undefined): boolean {
  return clientFid === 9152;
}
