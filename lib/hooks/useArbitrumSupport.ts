'use client';

import { useState, useEffect } from 'react';
import { checkArbitrumSupport } from '@/lib/utils/miniapp';

/**
 * Hook that checks if the current client supports Arbitrum.
 * In non-miniapp contexts (browser), always returns true.
 * In miniapp contexts, checks clientFid (only Warpcast supports ARB).
 */
export function useArbitrumSupport() {
  const [arbSupported, setArbSupported] = useState(true); // default true (browser)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkArbitrumSupport()
      .then(setArbSupported)
      .finally(() => setLoading(false));
  }, []);

  return { arbSupported, loading };
}
