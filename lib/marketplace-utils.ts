/**
 * Utility functions for marketplace navigation
 */

// Vibemarket miniapp launch URL on Farcaster
const VIBEMARKET_LAUNCH_URL = 'https://farcaster.xyz/miniapps/xsWpLUXoxVN8/vibemarket';

/**
 * Checks if a URL is an internal route (starts with /)
 */
export function isInternalRoute(url: string): boolean {
  return url.startsWith('/');
}

/**
 * Checks if URL is a vibechain marketplace URL
 */
function isVibechainUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'vibechain.com';
  } catch {
    return false;
  }
}

/**
 * Opens a marketplace URL - uses openMiniApp for Vibemarket in Farcaster
 */
export async function openMarketplace(
  marketplaceUrl: string,
  sdk: any,
  isInFarcaster: boolean,
  router?: { push: (url: string) => void }
): Promise<void> {
  // Handle internal routes
  if (isInternalRoute(marketplaceUrl)) {
    if (router) {
      router.push(marketplaceUrl);
    } else {
      window.location.href = marketplaceUrl;
    }
    return;
  }

  // In Farcaster, use openMiniApp for vibechain URLs
  if (isInFarcaster && sdk?.actions?.openMiniApp && isVibechainUrl(marketplaceUrl)) {
    try {
      // Use just the miniapp launch URL - Vibemarket will handle the embed URL
      console.log('[openMarketplace] Calling openMiniApp with launch URL');
      console.log('[openMarketplace] Target:', VIBEMARKET_LAUNCH_URL);
      await sdk.actions.openMiniApp({ url: VIBEMARKET_LAUNCH_URL });
      return;
    } catch (error) {
      console.error('[openMarketplace] openMiniApp failed:', error);
    }
  }

  // Fallback 
  window.open(marketplaceUrl, '_blank');
}
