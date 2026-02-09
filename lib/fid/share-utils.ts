import sdk from '@farcaster/miniapp-sdk';

let isInMiniAppCached: boolean | null = null;

async function checkIsInMiniApp(): Promise<boolean> {
  if (isInMiniAppCached !== null) return isInMiniAppCached;
  try {
    isInMiniAppCached = await sdk.isInMiniApp();
    return isInMiniAppCached;
  } catch {
    isInMiniAppCached = false;
    return false;
  }
}

/**
 * Share to Farcaster using SDK when in miniapp, fallback to window.open
 */
export async function shareToFarcaster(text: string, embedUrl?: string): Promise<void> {
  const isInMiniApp = await checkIsInMiniApp();
  
  if (isInMiniApp && sdk.actions?.composeCast) {
    try {
      await sdk.actions.composeCast({
        text,
        embeds: embedUrl ? [embedUrl] : undefined,
      });
      return;
    } catch {
      // Fallback to URL method if SDK fails
    }
  }
  
  // Fallback: open warpcast compose URL
  const params = new URLSearchParams();
  params.set('text', text);
  if (embedUrl) {
    params.append('embeds[]', embedUrl);
  }
  const url = 'https://warpcast.com/~/compose?' + params.toString();
  window.open(url, '_blank');
}
