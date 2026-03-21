import { useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { sdk } from '@farcaster/miniapp-sdk';
import { devLog, devError } from '@/lib/utils/logger';

interface Params {
  address: string | undefined;
  isInFarcaster: boolean;
  isCheckingFarcaster: boolean;
}

export function useAccessAnalytics({ address, isInFarcaster, isCheckingFarcaster }: Params) {
  const logAccessMutation = useMutation(api.accessAnalytics.logAccess);
  const logAccessDebugMutation = useMutation(api.accessAnalytics.logAccessDebug);
  const hasLoggedAccess = useRef(false);

  useEffect(() => {
    if (hasLoggedAccess.current || !address || isCheckingFarcaster) return;

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const isIframe = typeof window !== 'undefined' && window.parent !== window;
    const sdkAvailable = !!sdk;

    let source: 'miniapp' | 'farcaster_web' | 'web' | 'frame';

    if (isInFarcaster) {
      source = 'miniapp';
    } else {
      const isFromFarcaster =
        referrer.includes('farcaster.xyz') ||
        referrer.includes('warpcast.com') ||
        currentUrl.includes('farcaster.xyz') ||
        (isIframe && (referrer.includes('farcaster') || referrer.includes('warpcast')));
      source = isFromFarcaster ? 'farcaster_web' : 'web';
    }

    hasLoggedAccess.current = true;

    logAccessMutation({ address, source })
      .then(() => devLog(`📊 Access logged: ${source}`))
      .catch((err) => devError('Failed to log access:', err));

    logAccessDebugMutation({
      address,
      source,
      userAgent: userAgent.substring(0, 500),
      referrer: referrer.substring(0, 500),
      currentUrl: currentUrl.substring(0, 500),
      isIframe,
      sdkAvailable,
    }).catch((err) => devError('Failed to log debug:', err));
  }, [address, isInFarcaster, isCheckingFarcaster, logAccessMutation, logAccessDebugMutation]);
}
