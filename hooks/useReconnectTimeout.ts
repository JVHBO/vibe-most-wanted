'use client';

import { useState, useEffect } from 'react';

/**
 * Returns true while wagmi is reconnecting/connecting, up to a max of `ms` milliseconds.
 * After the timeout, returns false so pages can render normally instead of spinning forever.
 */
export function useReconnectTimeout(status: string, ms = 8000): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (status !== 'reconnecting' && status !== 'connecting') {
      setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), ms);
    return () => clearTimeout(t);
  }, [status, ms]);

  if (timedOut) return false;
  return status === 'reconnecting' || status === 'connecting';
}
