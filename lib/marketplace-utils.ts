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

  // Use window.open to open in new context (triggers miniapp detection)
  if (isInFarcaster) {
    console.log('[openMarketplace] Opening in Farcaster:', marketplaceUrl);
    window.open(marketplaceUrl, '_blank');
    return;
  }

  // Fallback to direct navigation
  window.location.href = marketplaceUrl;
}
