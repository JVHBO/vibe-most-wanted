'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { ReactNode, useEffect } from 'react';

interface NeynarMiniAppProviderProps {
  children: ReactNode;
}

// MiniAppProvider (@neynar/react) wraps children in an internal component
// that returns null until sdk.actions.ready() resolves. The internal SDK
// object is not the same reference as the one exported by @farcaster/miniapp-sdk,
// so patching it externally has no effect.
//
// Since nothing in this app calls useMiniApp(), we skip MiniAppProvider
// entirely and call sdk.actions.ready() ourselves when inside a Farcaster
// iframe — which is what Farcaster needs to dismiss the loading spinner.
export function NeynarMiniAppProvider({ children }: NeynarMiniAppProviderProps) {
  useEffect(() => {
    // Call ready() unconditionally — Farcaster (iframe or native WebView) resolves it
    // immediately; regular browsers / Base App just timeout and we ignore it.
    // Do NOT gate on window.self !== window.top: native Warpcast mobile is top-level.
    const timeout = new Promise<void>(resolve => setTimeout(resolve, 1500));
    Promise.race([sdk.actions.ready(), timeout]).catch(() => {});
  }, []);

  return <>{children}</>;
}
