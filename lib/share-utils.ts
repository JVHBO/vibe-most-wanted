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
 * Share to Farcaster using SDK when in miniapp, fallback to window.open.
 * embedUrls accepts a single URL or array of up to 2 URLs (image + frame).
 */
export async function shareToFarcaster(text: string, embedUrls?: string | string[]): Promise<void> {
  const isInMiniApp = await checkIsInMiniApp();
  const embeds = embedUrls
    ? (Array.isArray(embedUrls) ? embedUrls : [embedUrls])
    : undefined;

  if (isInMiniApp && sdk.actions?.composeCast) {
    try {
      await sdk.actions.composeCast({
        text,
        embeds: embeds as any,
      });
      return;
    } catch {
      // Fallback to URL method if SDK fails
    }
  }

  // Fallback: open warpcast compose URL
  const params = new URLSearchParams();
  params.set('text', text);
  if (embeds) {
    for (const url of embeds) params.append('embeds[]', url);
  }
  const url = 'https://warpcast.com/~/compose?' + params.toString();
  window.open(url, '_blank');
}
