"use client";

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useProfile } from '@/contexts/ProfileContext';
import { sdk } from '@farcaster/miniapp-sdk';
import { usePathname } from 'next/navigation';

/**
 * Garante que todo usuário que acessa qualquer página tem um perfil criado.
 * Antes, a criação só ocorria em app/page.tsx — quem entrava por /raffle, /leaderboard, etc. ficava sem perfil.
 */
export function GlobalProfileInit() {
  const { address } = useAccount();
  const { userProfile, isLoadingProfile, refreshProfile } = useProfile();
  const pathname = usePathname();
  const hasCreatedRef = useRef(false);
  // Ref to always have latest userProfile value inside async callbacks
  const userProfileRef = useRef(userProfile);
  useEffect(() => { userProfileRef.current = userProfile; }, [userProfile]);

  useEffect(() => {
    const run = async () => {
      if (hasCreatedRef.current) return;
      if (!address) return;
      if (isLoadingProfile) return;
      if (userProfile) return;
      // Home has explicit onboarding/create-profile flow. Skipping auto-upsert
      // here avoids rate-limit races with manual account creation.
      if (pathname === "/") return;

      // Wait 2s for Convex to deliver the profile before assuming it doesn't exist.
      // isLoadingProfile can go false before the WebSocket data arrives.
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Re-check using ref (not stale closure) — profile may have loaded during the wait
      if (userProfileRef.current) return;

      hasCreatedRef.current = true;

      try {
        // Skip SDK only when definitely not in any miniapp host (iframe or RN WebView)
        const isRNWebView = typeof (window as any).ReactNativeWebView !== 'undefined';
        const isInMiniappHost = window.self !== window.top || isRNWebView;
        let fidContext: any = null;

        if (isInMiniappHost) {
          fidContext = await Promise.race([
            sdk.context,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
          ]);
        }

        if (fidContext && (fidContext as any)?.user?.fid) {
          const context = fidContext;
          const { fid, username, displayName, pfpUrl } = context.user;
          const res = await fetch('/api/farcaster/profile-upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address,
              fid,
              username: username || `fid${fid}`,
              displayName: displayName || undefined,
              pfpUrl: pfpUrl || undefined,
            }),
          });
          if (!res.ok) throw new Error('farcaster upsert failed');
        } else {
          // Wallet sem Farcaster
          const res = await fetch('/api/wallet/profile-upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
          });
          if (!res.ok) throw new Error('wallet upsert failed');
        }

        await refreshProfile();
      } catch {
        // Retry será tentado na próxima navegação (hasCreatedRef resetado abaixo não acontece aqui
        // de propósito — evitar loop se o servidor estiver indisponível)
        hasCreatedRef.current = false;
      }
    };

    run();
  }, [address, isLoadingProfile, userProfile, refreshProfile, pathname]);

  return null;
}
