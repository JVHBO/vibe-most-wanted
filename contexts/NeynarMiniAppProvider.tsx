'use client';

import { MiniAppProvider } from '@neynar/react';
import { sdk } from '@farcaster/miniapp-sdk';
import { ReactNode } from 'react';

// Patch sdk.actions.ready() to resolve immediately when NOT in a Farcaster
// miniapp iframe. MiniAppProvider calls ready() unconditionally and holds
// children in a loading state until it resolves — in Base App / regular
// browsers this never resolves, causing a permanent blank screen.
//
// This runs at module-import time (before any React render), so the patch
// is in place before MiniAppProvider's useEffect fires.
if (typeof window !== 'undefined' && sdk?.actions) {
  const isIframe = window.self !== window.top;
  const isForced = (() => { try { return localStorage.getItem('vbms_force_miniapp') === '1'; } catch { return false; } })();
  if (!isIframe && !isForced) {
    (sdk.actions as any).ready = () => Promise.resolve();
  }
}

interface NeynarMiniAppProviderProps {
  children: ReactNode;
}

export function NeynarMiniAppProvider({ children }: NeynarMiniAppProviderProps) {
  return (
    <MiniAppProvider analyticsEnabled={false}>
      {children}
    </MiniAppProvider>
  );
}
