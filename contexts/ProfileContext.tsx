"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, Dispatch, SetStateAction } from "react";
import { useAccount } from "wagmi";
import { ConvexProfileService, UserProfile } from "@/lib/convex-profile";
import { usePrimaryAddress } from "@/lib/hooks/usePrimaryAddress";


interface ProfileContextType {
  userProfile: UserProfile | null;
  isLoadingProfile: boolean;
  hasCheckedProfile: boolean;
  refreshProfile: () => Promise<void>;
  setUserProfile: Dispatch<SetStateAction<UserProfile | null>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { primaryAddress: address } = usePrimaryAddress();
  const { status: wagmiStatus } = useAccount();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadProfile = useCallback(async (addr: string) => {
    if (!addr) return;

    // Don't show loading if we already have a profile (prevents flash)
    if (!userProfile) {
      setIsLoadingProfile(true);
    }

    try {
      const profile = await ConvexProfileService.getProfile(addr);
      if (profile) {
        // Profile found — mark as checked
        setUserProfile(profile);
        setHasLoaded(true);
      } else {
        // null could mean profile doesn't exist OR a transient network error.
        // Retry once after 2s before declaring the profile absent.
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retry = await ConvexProfileService.getProfile(addr);
        setUserProfile(retry);
        setHasLoaded(true);
      }
    } catch (error) {
      console.error("[ProfileContext] Error loading profile:", error);
      // Don't set hasLoaded on error — let the next address change retry
    } finally {
      setIsLoadingProfile(false);
    }
  }, [userProfile]);

  const refreshProfile = useCallback(async () => {
    if (address) {
      await loadProfile(address);
    }
  }, [address, loadProfile]);

  // Load profile when address changes
  useEffect(() => {
    if (address) {
      // Only load if we haven't loaded yet or address changed
      if (!hasLoaded || userProfile?.address?.toLowerCase() !== address.toLowerCase()) {
        loadProfile(address);
      }
    } else if (wagmiStatus === 'disconnected') {
      // Only clear profile when explicitly disconnected, not during reconnecting
      setUserProfile(null);
      setHasLoaded(false);
    }
    // If wagmiStatus is 'reconnecting' or 'connecting', keep the existing profile cached
  }, [address, wagmiStatus]);

  return (
    <ProfileContext.Provider value={{
      userProfile,
      isLoadingProfile: isLoadingProfile && !userProfile, // Only show loading if no cached profile
      hasCheckedProfile: hasLoaded,
      refreshProfile,
      setUserProfile
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
