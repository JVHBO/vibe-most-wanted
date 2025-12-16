/**
 * Utility functions for marketplace navigation
 */

/**
 * Checks if a URL is an internal route (starts with /)
 */
export function isInternalRoute(url: string): boolean {
  return url.startsWith('/');
}

/**
 * Opens a marketplace URL - uses openUrl in Farcaster for external links
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

  // In Farcaster, use openUrl to open external links (works on mobile)
  if (isInFarcaster && sdk?.actions?.openUrl) {
    try {
      console.log('[openMarketplace] Calling openUrl:', marketplaceUrl);
      await sdk.actions.openUrl(marketplaceUrl);
      return;
    } catch (error) {
      console.error('[openMarketplace] openUrl failed:', error);
    }
  }

  // Fallback to window.open for non-Farcaster contexts
  window.open(marketplaceUrl, '_blank');
}
