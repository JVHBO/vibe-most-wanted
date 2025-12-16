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
 * Opens a marketplace URL - uses openMiniApp in Farcaster for confirmation dialog
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

  // In Farcaster, use openMiniApp to show confirmation dialog
  if (isInFarcaster && sdk?.actions?.openMiniApp) {
    try {
      console.log('[openMarketplace] Calling openMiniApp:', marketplaceUrl);
      await sdk.actions.openMiniApp({ url: marketplaceUrl });
      // Don't call close() - openMiniApp handles the transition
      return;
    } catch (error) {
      console.error('[openMarketplace] openMiniApp failed:', error);
    }
  }

  // Fallback to direct navigation
  window.location.href = marketplaceUrl;
}
