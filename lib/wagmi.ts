'use client';

import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rabbyWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

// Create RainbowKit connectors (for desktop)
const rainbowKitConnectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [rabbyWallet, metaMaskWallet],
    },
    {
      groupName: 'Others',
      wallets: [coinbaseWallet, walletConnectWallet],
    },
  ],
  {
    appName: 'VIBE MOST WANTED',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  }
);

// Add Farcaster connector directly (not through RainbowKit)
// This connector will be used programmatically in the miniapp
const allConnectors = [
  farcasterMiniApp(),
  ...rainbowKitConnectors,
];

export const config = createConfig({
  chains: [base],
  connectors: allConnectors,
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});

// Export Farcaster connector separately for direct use
export const farcasterConnector = farcasterMiniApp();
