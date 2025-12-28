'use client';

import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';

// Use Alchemy RPC if available for better reliability
const BASE_RPC_URL = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
  : process.env.NEXT_PUBLIC_BASE_RPC_URL || undefined; // undefined = use default

// Setup connectors for both web and miniapp
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, rainbowWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
  {
    appName: '$VBMS',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  }
);

// Add Farcaster miniapp connector
const allConnectors = [...connectors, farcasterMiniApp()];

export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(BASE_RPC_URL),
  },
  connectors: allConnectors,
  ssr: true,
});
