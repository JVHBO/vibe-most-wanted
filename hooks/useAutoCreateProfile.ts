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
  const hasAutoCreatedProfile = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (hasAutoCreatedProfile.current) return;
      if (!address) return;
      if (!isInFarcaster) return;
      if (!farcasterFidState) return;
      if (isCheckingFarcaster) return;
      if (isLoadingProfile) return;
      if (userProfile && (userProfile as any).farcasterFid) return;

      try {
        const context = await sdk.context;
        if (!context?.user) return;

        const { fid, username, displayName, pfpUrl } = context.user;
        if (!fid) return;

        const action = userProfile ? 'Updating' : 'Creating';
        console.log(`[AutoCreate] 🆕 ${action} profile for Farcaster user:`, { fid, username, address });
        hasAutoCreatedProfile.current = true;

        const response = await fetch('/api/farcaster/profile-upsert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address,
            fid,
            username: username || `fid${fid}`,
            displayName: displayName || undefined,
            pfpUrl: pfpUrl || undefined,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to create/update profile');
        }

        console.log(`[AutoCreate] ✅ Profile ${action.toLowerCase()}d successfully!`);
        await refreshProfile();
      } catch (error) {
        console.error('[AutoCreate] ❌ Failed to auto-create/update profile:', error);
        hasAutoCreatedProfile.current = false;
      }
    };

    run();
  }, [address, isInFarcaster, farcasterFidState, isCheckingFarcaster, userProfile, isLoadingProfile, refreshProfile]);
}
