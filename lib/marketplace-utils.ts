/**
 * Utility functions for marketplace navigation
 * Handles conversion between vibechain.com URLs and Farcaster miniapp URLs
 */

const VIBEMARKET_MINIAPP_BASE = 'https://farcaster.xyz/miniapps/xsWpLUXoxVN8/vibemarket';
const REFERRAL_CODE = 'XCLR1DJ6LQTT';

/**
 * Extracts the collection slug from a vibechain marketplace URL
 * e.g., "https://vibechain.com/market/vibe-most-wanted?ref=..." => "vibe-most-wanted"
 */
export function extractCollectionSlug(marketplaceUrl: string): string | null {
  if (!marketplaceUrl || marketplaceUrl.startsWith('/')) {
    return null; // Internal route, not a vibechain URL
  }

  try {
    const url = new URL(marketplaceUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Expected format: /market/{collection}
    if (pathParts.length >= 2 && pathParts[0] === 'market') {
      return pathParts[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Converts a vibechain marketplace URL to a Farcaster miniapp URL
 * e.g., "https://vibechain.com/market/vibe-most-wanted?ref=..."
 *    => "https://farcaster.xyz/miniapps/xsWpLUXoxVN8/vibemarket/vibe-most-wanted?ref=XCLR1DJ6LQTT"
 */
export function convertToMiniAppUrl(marketplaceUrl: string): string | null {
  const collectionSlug = extractCollectionSlug(marketplaceUrl);

  if (!collectionSlug) {
    return null;
  }

  return `${VIBEMARKET_MINIAPP_BASE}/${collectionSlug}?ref=${REFERRAL_CODE}`;
}

/**
 * Checks if a URL is an internal route (starts with /)
 */
export function isInternalRoute(url: string): boolean {
  return url.startsWith('/');
}

/**
 * Opens a marketplace URL - uses openMiniApp in Farcaster, window.location otherwise
 * @param marketplaceUrl - The vibechain marketplace URL
 * @param sdk - The Farcaster SDK instance
 * @param isInFarcaster - Whether we're running inside Farcaster
 * @param router - Next.js router for internal routes (optional)
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

  // In Farcaster, use openMiniApp to navigate to Vibemarket miniapp
  // Use the launch URL format: https://farcaster.xyz/miniapps/<app-id>/<app-slug>/<path>
  if (isInFarcaster && sdk?.actions?.openMiniApp) {
    const launchUrl = convertToMiniAppUrl(marketplaceUrl);
    console.log('[openMarketplace] Converting URL:', { original: marketplaceUrl, launchUrl });

    if (launchUrl) {
      try {
        console.log('[openMarketplace] Calling sdk.actions.openMiniApp with:', launchUrl);
        await sdk.actions.openMiniApp({ url: launchUrl });
        console.log('[openMarketplace] openMiniApp called successfully');
        return;
      } catch (error) {
        console.error('[openMarketplace] openMiniApp failed:', error);
        // Fall through to fallback
      }
    }
  }

  // Fallback to direct navigation
  window.location.href = marketplaceUrl;
}
