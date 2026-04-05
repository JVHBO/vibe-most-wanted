"use client";

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useProfile } from '@/contexts/ProfileContext';
import { sdk } from '@farcaster/miniapp-sdk';

/**
 * Garante que todo usuário que acessa qualquer página tem um perfil criado.
 * Antes, a criação só ocorria em app/page.tsx — quem entrava por /raffle, /leaderboard, etc. ficava sem perfil.
 */
export function GlobalProfileInit() {
  const { address } = useAccount();
  const { userProfile, isLoadingProfile, refreshProfile } = useProfile();
  const hasCreatedRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (hasCreatedRef.current) return;
      if (!address) return;
      if (isLoadingProfile) return;
      if (userProfile) return;

      hasCreatedRef.current = true;

      try {
        // Tenta Farcaster SDK primeiro (timeout 2s)
        const context = await Promise.race([
          sdk.context,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
        ]);

        if (context && (context as any)?.user?.fid) {
          const { fid, username, displayName, pfpUrl } = (context as any).user;
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
  }, [address, isLoadingProfile, userProfile, refreshProfile]);

  return null;
}
