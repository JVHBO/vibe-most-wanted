'use client';

import { http, createConfig, createStorage } from 'wagmi';
import { base, arbitrum } from 'wagmi/chains';
import { baseAccount, injected } from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';

// Use Alchemy RPC if available for better reliability
const BASE_RPC_URL = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
  ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
  : process.env.NEXT_PUBLIC_BASE_RPC_URL || undefined; // undefined = use default
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';
const hasValidWalletConnectProjectId = /^[a-f0-9]{32}$/i.test(walletConnectProjectId);

// Setup connectors for both web and miniapp
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: hasValidWalletConnectProjectId
        ? [metaMaskWallet, rainbowWallet, walletConnectWallet]
        : [metaMaskWallet],
    },
  ],
  {
    appName: '$VBMS',
    projectId: hasValidWalletConnectProjectId
      ? walletConnectProjectId
      : '00000000000000000000000000000000',
  }
);

if (!hasValidWalletConnectProjectId && typeof window !== 'undefined') {
  console.warn('[wagmi] Invalid NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID; WalletConnect/Rainbow connectors disabled.');
}

// MetaMask injected connector (always available when extension is installed)
const metamaskConnector = injected({ target: 'metaMask' });

// Support both Base App users (no FID required) and Farcaster miniapp users.
const allConnectors = [
  baseAccount({ appName: '$VBMS' }),
  ...connectors,
  farcasterMiniApp(),
  metamaskConnector,
];

// Base App (RN WebView) requires localStorage — sessionStorage is wiped between navigations.
// Regular browsers use sessionStorage so connections don't persist across new tabs.
const isBaseApp = typeof window !== 'undefined' && typeof (window as any).ReactNativeWebView !== 'undefined';
const sessionStorageAdapter = createStorage({
  storage: typeof window !== 'undefined'
    ? (isBaseApp ? window.localStorage : window.sessionStorage)
    : undefined,
});

export const config = createConfig({
  chains: [base, arbitrum],
  transports: {
    [base.id]: http(BASE_RPC_URL),
    [arbitrum.id]: http(),
  },
  connectors: allConnectors,
  ssr: true,
  storage: sessionStorageAdapter,
});
