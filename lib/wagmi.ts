'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const defaultConfig = getDefaultConfig({
  appName: 'VIBE MOST WANTED',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [base],
  ssr: true,
  multiInjectedProviderDiscovery: false,
});

// Add Farcaster connector for miniapp support
export const config = {
  ...defaultConfig,
  connectors: [
    farcasterMiniApp(),
    ...(defaultConfig.connectors || []),
  ],
} as typeof defaultConfig;
