'use client';

import { http, createConfig, createStorage } from 'wagmi';
import { base, arbitrum } from 'wagmi/chains';
import { baseAccount } from 'wagmi/connectors';
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
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';
const hasValidWalletConnectProjectId = /^[a-f0-9]{32}$/i.test(walletConnectProjectId);

// Setup connectors for both web and miniapp
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: hasValidWalletConnectProjectId
        ? [metaMaskWallet, rainbowWallet, coinbaseWallet, walletConnectWallet]
        : [metaMaskWallet, coinbaseWallet],
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

// Support both Base App users (no FID required) and Farcaster miniapp users.
const allConnectors = [
  baseAccount({ appName: '$VBMS' }),
  ...connectors,
  farcasterMiniApp(),
];

// Use sessionStorage so wallet connections don't persist across new tabs/sessions.
// The user must explicitly connect on each new browser session.
// Farcaster miniapp is unaffected — it auto-connects via SDK regardless of storage.
const sessionStorageAdapter = createStorage({
  storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
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
