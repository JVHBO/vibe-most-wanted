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
    return null;
  }

  try {
    const url = new URL(marketplaceUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts.length >= 2 && pathParts[0] === 'market') {
      return pathParts[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Converts a vibechain marketplace URL to a Farcaster miniapp launch URL
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
  if (isInFarcaster && sdk?.actions) {
    const launchUrl = convertToMiniAppUrl(marketplaceUrl);
    console.log('[openMarketplace] URLs:', { embed: marketplaceUrl, launch: launchUrl });

    // Try openMiniApp with launch URL
    if (launchUrl && sdk.actions.openMiniApp) {
      try {
        console.log('[openMarketplace] Calling openMiniApp with launch URL:', launchUrl);
        await sdk.actions.openMiniApp({ url: launchUrl });
        // openMiniApp should auto-close, but call close() to ensure
        if (sdk.actions.close) {
          await sdk.actions.close();
        }
        return;
      } catch (error) {
        console.error('[openMarketplace] openMiniApp failed:', error);
      }
    }

    // Fallback: use openUrl which triggers external navigation
    if (sdk.actions.openUrl && launchUrl) {
      try {
        console.log('[openMarketplace] Trying openUrl:', launchUrl);
        await sdk.actions.openUrl(launchUrl);
        return;
      } catch (error) {
        console.error('[openMarketplace] openUrl failed:', error);
      }
    }
  }

  // Final fallback to direct navigation
  console.log('[openMarketplace] Fallback - direct navigation:', marketplaceUrl);
  window.location.href = marketplaceUrl;
}
