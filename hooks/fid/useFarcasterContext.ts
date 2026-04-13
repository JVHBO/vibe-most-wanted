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

    // Only trust cached contexts that either have a real Farcaster user
    // or already resolved to standard web/Base App mode.
    const existing = getCachedContext();
    if (existing?.isReady && (!!existing.user || !existing.isInMiniapp)) {
      setContext(existing);
      return;
    }

    const initializeSdk = async () => {
      try {
        // Skip SDK only when definitely NOT in any miniapp host:
        // - Not in an iframe (window.self === window.top)
        // - AND not in a React Native WebView (Base App uses RN WebView)
        // If either is true, we might be in a miniapp host and must call ready().
        const isRNWebView = typeof (window as any).ReactNativeWebView !== 'undefined';
        if (window.self === window.top && !isRNWebView) {
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: null };
          setContext(ctx);
          setCachedContext(ctx);
          return;
        }

        if (!sdk || typeof sdk.wallet === 'undefined') {
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: null };
          setContext(ctx);
          setCachedContext(ctx);
          try { await sdk.actions.ready(); } catch {}
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
          try { await sdk.actions.ready(); } catch {}
          return;
        }

        // Base App and standard web users do not provide a Farcaster FID.
        // Treat that as normal web mode, not as a Farcaster miniapp host.
        if (!sdkContext?.user?.fid) {
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: 'No Farcaster user context' };
          setContext(ctx);
          setCachedContext(ctx);
          try { await sdk.actions.ready(); } catch {}
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
        try { await sdk.actions.ready(); } catch {}
      } catch (err) {
        const ctx = { isReady: true, isInMiniapp: false, user: null, error: String(err) };
        setContext(ctx);
        setCachedContext(ctx);
        try { await sdk.actions.ready(); } catch {}
      }
    };

    initializeSdk();
  }, []);

  return context;
}
