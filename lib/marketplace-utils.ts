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
 * Opens a marketplace URL
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

  // In Farcaster, use openUrl to open external link with full path
  if (isInFarcaster && sdk?.actions?.openUrl) {
    try {
      await sdk.actions.openUrl(marketplaceUrl);
      return;
    } catch (error) {
      console.error('[openMarketplace] openUrl failed:', error);
    }
  }

  // Fallback
  window.open(marketplaceUrl, '_blank');
}
