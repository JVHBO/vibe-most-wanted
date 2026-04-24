import { sdk } from '@farcaster/miniapp-sdk';

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
 * Lightweight Base App / Coinbase WebView detection.
 * Keeps the check local to client environments and mirrors the requested UA logic.
 */
export function isBaseAppWebView(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';

  // Reliable signals for Base/Coinbase in-app WebViews.
  if (typeof (window as any).ReactNativeWebView !== 'undefined') return true;
  return (
    ua.includes('coinbasewallet') ||
    ua.includes('coinbase wallet') ||
    ua.includes('cbwallet') ||
    ua.includes('baseapp')
  );
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

export async function getFarcasterProvider(timeoutMs = 5000) {
  if (typeof window === 'undefined') return null;
  if (typeof (window as any).ReactNativeWebView !== 'undefined') return null;
  if (!sdk || typeof sdk.wallet === 'undefined') return null;

  try {
    const provider = await Promise.race([
      sdk.wallet.getEthereumProvider(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return provider ?? null;
  } catch {
    return null;
  }
}

export function getBaseAppBlur(blurPx: number): number {
  return isBaseAppWebView() ? Math.max(2, Math.round(blurPx * 0.45)) : blurPx;
}

export function getBaseAppImageSrc(src: string, _width = 256, _quality = 60): string {
  // Base App WebView has been unreliable with Next's /_next/image optimizer for local files.
  // Return the direct asset URL so cards never degrade into broken-image alt text.
  return src;
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

