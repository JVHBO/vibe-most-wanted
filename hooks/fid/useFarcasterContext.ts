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
    const params = new URLSearchParams(window.location.search);
    const debugEnabled =
      params.get('debug') === '1' ||
      params.get('degub') === '1' ||
      params.get('debug_init') === '1' ||
      localStorage.getItem('vmw_debug_init') === '1';
    const debugLog = (...args: any[]) => {
      if (!debugEnabled) return;
      console.log('[FarcasterCtx]', ...args);
    };

    // Only trust cached contexts that either have a real Farcaster user
    // or already resolved to standard web/Base App mode.
    const existing = getCachedContext();
    if (existing?.isReady && (!!existing.user || !existing.isInMiniapp)) {
      debugLog('using cached context', existing);
      setContext(existing);
      return;
    }

    const initializeSdk = async () => {
      try {
        const isRNWebView = typeof (window as any).ReactNativeWebView !== 'undefined';
        debugLog('init start', { isRNWebView, isIframe: window.self !== window.top });

        if (window.self === window.top && !isRNWebView) {
          debugLog('plain browser -> ready');
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: null };
          setContext(ctx);
          setCachedContext(ctx);
          return;
        }

        // RN WebView (Base App) or iframe: resolve immediately without SDK
        // so page renders right away. If in a real Farcaster iframe, SDK
        // context will still be fetched below to get FID.
        if (isRNWebView) {
          debugLog('RN WebView -> ready (skip SDK wait)');
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: null };
          setContext(ctx);
          setCachedContext(ctx);
          return;
        }

        if (!sdk || typeof sdk.wallet === 'undefined') {
          debugLog('no sdk.wallet -> ready');
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: null };
          setContext(ctx);
          setCachedContext(ctx);
          try { await sdk.actions.ready(); } catch {}
          return;
        }

        debugLog('iframe host, fetching sdk.context');
        let sdkContext;
        try {
          sdkContext = await Promise.race([
            sdk.context,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
          ]) as any;
        } catch {
          debugLog('sdk.context timeout');
          const ctx = { isReady: true, isInMiniapp: false, user: null, error: 'SDK timeout' };
          setContext(ctx);
          setCachedContext(ctx);
          try { await sdk.actions.ready(); } catch {}
          return;
        }

        if (!sdkContext?.user?.fid) {
          debugLog('sdk.context without fid -> web/base mode');
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
        debugLog('farcaster user resolved', { fid: user.fid, username: user.username });
        setContext(ctx);
        setCachedContext(ctx);
        try { await sdk.actions.ready(); } catch {}
      } catch (err) {
        debugLog('init error', err);
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
