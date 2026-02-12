'use client';

import { useState, useEffect } from 'react';
import { checkArbitrumSupport } from '@/lib/utils/miniapp';

/**
 * Hook that checks if the current client supports Arbitrum.
 * In non-miniapp contexts (browser), always returns true.
 * In miniapp contexts, uses sdk.getChains() to detect support.
 * Deferred to avoid racing with wallet provider initialization.
 */
export function useArbitrumSupport() {
  const [arbSupported, setArbSupported] = useState(true); // default true (browser)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Defer check to avoid racing with SDK wallet provider init
    const timer = setTimeout(() => {
      checkArbitrumSupport()
        .then(setArbSupported)
        .finally(() => setLoading(false));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return { arbSupported, loading };
}
