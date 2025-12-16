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
  console.log('[openMarketplace] Called with:', {
    marketplaceUrl,
    isInFarcaster,
    hasSDK: !!sdk,
    hasActions: !!sdk?.actions,
    hasOpenMiniApp: !!sdk?.actions?.openMiniApp,
    isVibechain: isVibechainUrl(marketplaceUrl)
  });

  // Handle internal routes
  if (isInternalRoute(marketplaceUrl)) {
    console.log('[openMarketplace] Internal route, using router');
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
      console.log('[openMarketplace] Calling openMiniApp with:', VIBEMARKET_LAUNCH_URL);
      const result = await sdk.actions.openMiniApp({ url: VIBEMARKET_LAUNCH_URL });
      console.log('[openMarketplace] openMiniApp result:', result);
      return;
    } catch (error) {
      console.error('[openMarketplace] openMiniApp FAILED:', error);
      // Don't fallback - show the error
      alert('openMiniApp failed: ' + (error as Error).message);
      return;
    }
  }

  // Fallback - log why we're here
  console.log('[openMarketplace] Using fallback window.open because:', {
    notInFarcaster: !isInFarcaster,
    noOpenMiniApp: !sdk?.actions?.openMiniApp,
    notVibechain: !isVibechainUrl(marketplaceUrl)
  });
  window.open(marketplaceUrl, '_blank');
}
