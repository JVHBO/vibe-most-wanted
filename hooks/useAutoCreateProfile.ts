import { useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { sdk } from '@farcaster/miniapp-sdk';
import { api } from '@/convex/_generated/api';
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
  const upsertProfileFromFarcaster = useMutation(api.profiles.upsertProfileFromFarcaster);
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

        await upsertProfileFromFarcaster({
          address,
          fid,
          username: username || `fid${fid}`,
          displayName: displayName || undefined,
          pfpUrl: pfpUrl || undefined,
        });

        console.log(`[AutoCreate] ✅ Profile ${action.toLowerCase()}d successfully!`);
        await refreshProfile();
      } catch (error) {
        console.error('[AutoCreate] ❌ Failed to auto-create/update profile:', error);
        hasAutoCreatedProfile.current = false;
      }
    };

    run();
  }, [address, isInFarcaster, farcasterFidState, isCheckingFarcaster, userProfile, isLoadingProfile, upsertProfileFromFarcaster, refreshProfile]);
}
