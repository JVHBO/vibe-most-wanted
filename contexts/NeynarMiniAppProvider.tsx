'use client';

import { MiniAppProvider } from '@neynar/react';
import { sdk } from '@farcaster/miniapp-sdk';
import { ReactNode } from 'react';

interface NeynarMiniAppProviderProps {
  children: ReactNode;
}

// MiniAppProvider calls sdk.actions.ready() and holds children until it
// resolves. Outside Farcaster iframe this never resolves → blank screen.
// Patch ready() synchronously during render (before MiniAppProvider mounts)
// so the patch is in place before any useEffect fires.
export function NeynarMiniAppProvider({ children }: NeynarMiniAppProviderProps) {
  if (typeof window !== 'undefined' && sdk?.actions) {
    const isIframe = window.self !== window.top;
    const isForced = (() => { try { return localStorage.getItem('vbms_force_miniapp') === '1'; } catch { return false; } })();
    if (!isIframe && !isForced) {
      (sdk.actions as any).ready = () => Promise.resolve();
    }
  }

  return (
    <MiniAppProvider analyticsEnabled={false}>
      {children}
    </MiniAppProvider>
  );
}
