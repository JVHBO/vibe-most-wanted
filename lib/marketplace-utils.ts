/**
 * Utility functions for marketplace navigation
 */

// Vibemarket miniapp base URL
const VIBEMARKET_LAUNCH_BASE = 'https://farcaster.xyz/miniapps/xsWpLUXoxVN8/vibemarket';

/**
 * Checks if a URL is an internal route (starts with /)
 */
export function isInternalRoute(url: string): boolean {
  return url.startsWith('/');
}

/**
 * Converts vibechain.com URL to miniapp launch URL with path
 */
function toMiniappUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'vibechain.com') {
      // Convert: vibechain.com/market/X?ref=Y -> farcaster.xyz/miniapps/.../vibemarket/market/X?ref=Y
      return VIBEMARKET_LAUNCH_BASE + parsed.pathname + parsed.search;
    }
  } catch {}
  return url;
}

/**
 * Opens a marketplace URL - uses openMiniApp in Farcaster
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
    try {
      const launchUrl = toMiniappUrl(marketplaceUrl);
      console.log('[openMarketplace] Opening:', launchUrl);
      await sdk.actions.openMiniApp({ url: launchUrl });
      return;
    } catch (error) {
      console.error('[openMarketplace] openMiniApp failed:', error);
    }
  }

  // Fallback
  window.open(marketplaceUrl, '_blank');
}
