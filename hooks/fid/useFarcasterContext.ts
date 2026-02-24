/**
 * Farcaster Miniapp Context Hook
 *
 * Provides access to Farcaster user context (FID, username, etc)
 * Only available when running inside Farcaster miniapp
 */

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface FarcasterContext {
  isReady: boolean;
  isInMiniapp: boolean;
  user: FarcasterUser | null;
  error: string | null;
}

/**
 * Hook to get Farcaster context from miniapp SDK
 */
const SESSION_KEY = 'vmw_fc_ctx';

function getCachedContext(): FarcasterContext | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function setCachedContext(ctx: FarcasterContext) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(ctx));
  } catch {}
}

export function useFarcasterContext(): FarcasterContext {
  const cached = typeof window !== 'undefined' ? getCachedContext() : null;

  const [context, setContext] = useState<FarcasterContext>(
    cached ?? { isReady: false, isInMiniapp: false, user: null, error: null }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already have a valid cached context with user — no need to re-init
    const existing = getCachedContext();
    if (existing?.isReady) {
      setContext(existing);
      return;
    }

    const initializeSdk = async () => {
      try {
        if (!sdk || typeof sdk.wallet === 'undefined') {
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: null };
          setContext(ctx);
          setCachedContext(ctx);
          return;
        }

        let sdkContext;
        try {
          sdkContext = await Promise.race([
            sdk.context,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
          ]) as any;
        } catch {
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: 'SDK timeout' };
          setContext(ctx);
          setCachedContext(ctx);
          return;
        }

        if (!sdkContext?.user) {
          const ctx = { isReady: true, isInMiniapp: true, user: null, error: 'No user' };
          setContext(ctx);
          setCachedContext(ctx);
          return;
        }

        const user: FarcasterUser = {
          fid: sdkContext.user.fid,
          username: sdkContext.user.username || undefined,
          displayName: sdkContext.user.displayName || undefined,
          pfpUrl: sdkContext.user.pfpUrl || undefined,
        };

        const ctx = { isReady: true, isInMiniapp: true, user, error: null };
        setContext(ctx);
        setCachedContext(ctx);
      } catch (err) {
        const ctx = { isReady: true, isInMiniapp: false, user: null, error: String(err) };
        setContext(ctx);
        setCachedContext(ctx);
      }
    };

    initializeSdk();
  }, []);

  return context;
}
