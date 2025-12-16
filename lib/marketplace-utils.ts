/**
 * Utility functions for marketplace navigation
 */

// Vibemarket miniapp ID on Farcaster
const VIBEMARKET_MINIAPP_ID = 'xsWpLUXoxVN8';

/**
 * Checks if a URL is an internal route (starts with /)
 */
export function isInternalRoute(url: string): boolean {
  return url.startsWith('/');
}

/**
 * Converts a vibechain.com URL to Farcaster miniapp launch URL
 * e.g. https://vibechain.com/market/vibe-most-wanted?ref=X
 * becomes https://farcaster.xyz/miniapps/xsWpLUXoxVN8/vibemarket/market/vibe-most-wanted?ref=X
 */
function toMiniappLaunchUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'vibechain.com') {
      // Extract path and query from vibechain URL
      const pathAndQuery = parsed.pathname + parsed.search;
      return `https://farcaster.xyz/miniapps/${VIBEMARKET_MINIAPP_ID}/vibemarket${pathAndQuery}`;
    }
  } catch (e) {
    // Invalid URL
  }
  return null;
}

/**
 * Opens a marketplace URL - uses openMiniApp with launch URL format in Farcaster
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

  // In Farcaster, use openMiniApp with launch URL format
  if (isInFarcaster && sdk?.actions?.openMiniApp) {
    // Convert vibechain.com URL to miniapp launch URL
    const launchUrl = toMiniappLaunchUrl(marketplaceUrl);
    const urlToOpen = launchUrl || marketplaceUrl;
    
    try {
      console.log('[openMarketplace] Calling openMiniApp with:', urlToOpen);
      await sdk.actions.openMiniApp({ url: urlToOpen });
      return;
    } catch (error) {
      console.error('[openMarketplace] openMiniApp failed:', error);
    }
  }

  // Fallback 
  window.open(marketplaceUrl, '_blank');
}
