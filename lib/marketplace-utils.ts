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

  // Debug - show what's available
  const hasOpenUrl = !!sdk?.actions?.openUrl;
  const hasOpenMiniApp = !!sdk?.actions?.openMiniApp;
  alert(`isInFarcaster=${isInFarcaster} openUrl=${hasOpenUrl} openMiniApp=${hasOpenMiniApp}`);

  // In Farcaster, use openUrl
  if (isInFarcaster && sdk?.actions?.openUrl) {
    try {
      await sdk.actions.openUrl(marketplaceUrl);
      return;
    } catch (error) {
      alert('openUrl error: ' + (error as Error).message);
    }
  }

  // Fallback
  window.open(marketplaceUrl, '_blank');
}
