'use client';

import { MiniAppProvider } from '@neynar/react';
import { ReactNode, useEffect, useState } from 'react';

interface NeynarMiniAppProviderProps {
  children: ReactNode;
}

export function NeynarMiniAppProvider({ children }: NeynarMiniAppProviderProps) {
  const [isMiniapp, setIsMiniapp] = useState(false);

  useEffect(() => {
    const forced = localStorage.getItem('vbms_force_miniapp') === '1';
    const isIframe = window.self !== window.top;
    setIsMiniapp(forced || isIframe);
  }, []);

  return (
    <MiniAppProvider
      analyticsEnabled={isMiniapp}
    >
      {children}
    </MiniAppProvider>
  );
}
