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
export function useFarcasterContext(): FarcasterContext {
  const [context, setContext] = useState<FarcasterContext>({
    isReady: false,
    isInMiniapp: false,
    user: null,
    error: null,
  });

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      return;
    }

    const initializeSdk = async () => {
      try {
        // Check if SDK is available
        if (!sdk || typeof sdk.wallet === 'undefined') {
          // Not in miniapp context
          setContext({
            isReady: true,
            isInMiniapp: false,
            user: null,
            error: null,
          });
          return;
        }

        // Wait for SDK context to be ready with timeout
        let sdkContext;
        try {
          const contextPromise = sdk.context;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SDK context timeout')), 5000)
          );
          sdkContext = await Promise.race([contextPromise, timeoutPromise]) as any;
        } catch (contextError) {
          console.log('[useFarcasterContext] Failed to get SDK context:', contextError);
          setContext({
            isReady: true,
            isInMiniapp: false,
            user: null,
            error: 'Failed to get SDK context',
          });
          return;
        }

        if (!sdkContext?.user) {
          setContext({
            isReady: true,
            isInMiniapp: true,
            user: null,
            error: 'No user context available',
          });
          return;
        }

        // Extract user data
        const user: FarcasterUser = {
          fid: sdkContext.user.fid,
          username: sdkContext.user.username || undefined,
          displayName: sdkContext.user.displayName || undefined,
          pfpUrl: sdkContext.user.pfpUrl || undefined,
        };

        setContext({
          isReady: true,
          isInMiniapp: true,
          user,
          error: null,
        });

        console.log('[useFarcasterContext] Initialized with user:', user);
      } catch (err) {
        console.error('[useFarcasterContext] Error initializing:', err);
        setContext({
          isReady: true,
          isInMiniapp: false,
          user: null,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    };

    initializeSdk();
  }, []);

  return context;
}
