import { useEffect, useRef } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import type { UserProfile } from '@/lib/convex-profile';

interface Params {
  address: string | undefined;
  isInFarcaster: boolean;
  farcasterFidState: number | null | undefined;
  isCheckingFarcaster: boolean;
  userProfile: UserProfile | null;
  isLoadingProfile: boolean;
  refreshProfile: () => Promise<void>;
}

export function useAutoCreateProfile({
  address,
  isInFarcaster,
  farcasterFidState,
  isCheckingFarcaster,
  userProfile,
  isLoadingProfile,
  refreshProfile,
}: Params) {
  const DEMO_WALLET = '0xc815a066f61a3c42a4d6baffca86731fdbd91444';
  const hasAutoCreatedProfile = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (hasAutoCreatedProfile.current) return;
      if (!address) return;
      if (isCheckingFarcaster) return;
      if (isLoadingProfile) return;
      if (userProfile) return;
      // Demo account is managed by resetDemoProfile — skip auto-create to avoid Wield 429 spam
      if (address.toLowerCase() === DEMO_WALLET) return;

      hasAutoCreatedProfile.current = true;

      // Path A: Farcaster user — verify FID via Neynar and create full profile
      if (isInFarcaster && farcasterFidState) {
        try {
          const context = await sdk.context;
          if (!context?.user) { hasAutoCreatedProfile.current = false; return; }

          const { fid, username, displayName, pfpUrl } = context.user;
          if (!fid) { hasAutoCreatedProfile.current = false; return; }

          console.log('[AutoCreate] Creating Farcaster profile for FID:', fid);
          const response = await fetch('/api/farcaster/profile-upsert', {
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
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || 'Failed to create profile');
          console.log('[AutoCreate] ✅ Farcaster profile created');
          await refreshProfile();
        } catch (error) {
          console.error('[AutoCreate] ❌ Farcaster profile failed:', error);
          hasAutoCreatedProfile.current = false;
        }
        return;
      }

      // Path B: Wallet-only user (Base app / web without Farcaster)
      try {
        console.log('[AutoCreate] Creating wallet-only profile for:', address);
        const response = await fetch('/api/wallet/profile-upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Failed to create profile');
        console.log('[AutoCreate] ✅ Wallet profile created');
        await refreshProfile();
      } catch (error) {
        console.error('[AutoCreate] ❌ Wallet profile failed:', error);
        hasAutoCreatedProfile.current = false;
      }
    };

    run();
  }, [address, isInFarcaster, farcasterFidState, isCheckingFarcaster, userProfile, isLoadingProfile, refreshProfile]);
}
