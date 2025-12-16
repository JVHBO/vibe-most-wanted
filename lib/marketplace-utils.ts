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

  // Debug
  const hasOpenMiniApp = !!sdk?.actions?.openMiniApp;
  console.log('[openMarketplace]', { isInFarcaster, hasOpenMiniApp, url: marketplaceUrl });

  // In Farcaster, use openMiniApp
  if (isInFarcaster && hasOpenMiniApp) {
    try {
      await sdk.actions.openMiniApp({ url: marketplaceUrl });
      return;
    } catch (error) {
      alert('openMiniApp error: ' + (error as Error).message);
    }
  } else {
    alert('Fallback! isInFarcaster=' + isInFarcaster + ' hasOpenMiniApp=' + hasOpenMiniApp);
  }

  // Fallback
  window.open(marketplaceUrl, '_blank');
}
