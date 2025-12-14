'use client';

import { MiniAppProvider } from '@neynar/react';
import { ReactNode } from 'react';

interface NeynarMiniAppProviderProps {
  children: ReactNode;
}

export function NeynarMiniAppProvider({ children }: NeynarMiniAppProviderProps) {
  return (
    <MiniAppProvider>
      {children}
    </MiniAppProvider>
  );
}
