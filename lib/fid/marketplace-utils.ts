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
 * Opens a marketplace URL - uses openMiniApp if SDK available
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

  // Use openMiniApp if SDK has it (don't rely on isInFarcaster)
  if (sdk?.actions?.openMiniApp) {
    try {
      await sdk.actions.openMiniApp({ url: marketplaceUrl });
      return;
    } catch (error) {
      console.error('[openMarketplace] openMiniApp failed:', error);
    }
  }

  // Fallback
  window.open(marketplaceUrl, '_blank');
}
