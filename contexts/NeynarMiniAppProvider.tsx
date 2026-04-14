'use client';

import { MiniAppProvider } from '@neynar/react';
import { ReactNode, useEffect, useState } from 'react';

interface NeynarMiniAppProviderProps {
  children: ReactNode;
}

// MiniAppProvider calls sdk.actions.ready() unconditionally and holds its
// children in a loading state until that call resolves. In Base App /
// regular browsers the call never resolves → permanent blank screen.
// Only mount MiniAppProvider when we know we're in a Farcaster iframe host.
export function NeynarMiniAppProvider({ children }: NeynarMiniAppProviderProps) {
  // Start as null (unknown) to avoid SSR/hydration mismatch
  const [isMiniapp, setIsMiniapp] = useState<boolean | null>(null);

  useEffect(() => {
    const isIframe = window.self !== window.top;
    const isForced = (() => { try { return localStorage.getItem('vbms_force_miniapp') === '1'; } catch { return false; } })();
    setIsMiniapp(isIframe || isForced);
  }, []);

  // While checking (SSR + first client render): render children directly.
  // This avoids MiniAppProvider blocking children before we know the context.
  if (isMiniapp === null || !isMiniapp) {
    return <>{children}</>;
  }

  return (
    <MiniAppProvider analyticsEnabled={true}>
      {children}
    </MiniAppProvider>
  );
}
