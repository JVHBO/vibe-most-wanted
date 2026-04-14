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
  const isRNWebView = typeof window !== 'undefined' && typeof (window as any).ReactNativeWebView !== 'undefined';

  const [context, setContext] = useState<FarcasterContext>(
    cached ?? { isReady: isRNWebView, isInMiniapp: false, user: null, error: null }
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
      const dbg = (typeof window !== 'undefined' && (window as any).__dbgAppend) || (() => {});
      try {
        const isRNWebView = typeof (window as any).ReactNativeWebView !== 'undefined';
        dbg('ctx: isRN='+isRNWebView+' iframe='+(window.self!==window.top));

        if (window.self === window.top && !isRNWebView) {
          dbg('ctx: plain browser → ready');
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: null };
          setContext(ctx);
          setCachedContext(ctx);
          return;
        }

        // RN WebView (Base App) or iframe: resolve immediately without SDK
        // so page renders right away. If in a real Farcaster iframe, SDK
        // context will still be fetched below to get FID.
        if (isRNWebView) {
          dbg('ctx: RN WebView → ready (no SDK)');
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: null };
          setContext(ctx);
          setCachedContext(ctx);
          return;
        }

        if (!sdk || typeof sdk.wallet === 'undefined') {
          dbg('ctx: no sdk.wallet → ready');
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: null };
          setContext(ctx);
          setCachedContext(ctx);
          try { await sdk.actions.ready(); } catch {}
          return;
        }

        dbg('ctx: iframe, fetching sdk.context...');
        let sdkContext;
        try {
          sdkContext = await Promise.race([
            sdk.context,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
          ]) as any;
        } catch {
          dbg('ctx: sdk.context timeout');
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: 'SDK timeout' };
          setContext(ctx);
          setCachedContext(ctx);
          try { await sdk.actions.ready(); } catch {}
          return;
        }

        if (!sdkContext?.user?.fid) {
          dbg('ctx: no FID → ready');
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
