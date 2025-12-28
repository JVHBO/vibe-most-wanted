"use client";

import { useAccount } from "wagmi";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo } from "react";

/**
 * 🔗 MULTI-WALLET HOOK
 *
 * Returns the primary profile address for the connected user.
 * If the user is connected with a linked (secondary) wallet,
 * this hook returns the primary address so that all operations
 * (quests, missions, raids, etc.) use the same identity.
 *
 * Usage:
 * ```tsx
 * const { primaryAddress, connectedAddress, isLinkedWallet, isLoading } = usePrimaryAddress();
 *
 * // Use primaryAddress for all game operations
 * const quests = useQuery(api.quests.getProgress, { playerAddress: primaryAddress });
 * ```
 *
 * @returns {Object}
 * - primaryAddress: The main profile address (use this for game ops)
 * - connectedAddress: The currently connected wallet address
 * - isLinkedWallet: True if connected wallet is a secondary/linked wallet
 * - isLoading: True while fetching linked addresses data
 * - allAddresses: Array of all addresses (primary + linked)
 */
export function usePrimaryAddress() {
  const { address: connectedAddress, isConnected } = useAccount();

  // Query linked addresses from Convex
  const linkedData = useQuery(
    api.profiles.getLinkedAddresses,
    connectedAddress ? { address: connectedAddress } : "skip"
  );

  const result = useMemo(() => {
    // Not connected
    if (!isConnected || !connectedAddress) {
      return {
        primaryAddress: undefined,
        connectedAddress: undefined,
        isLinkedWallet: false,
        isLoading: false,
        allAddresses: [],
      };
    }

    // Still loading
    if (linkedData === undefined) {
      return {
        primaryAddress: connectedAddress,
        connectedAddress,
        isLinkedWallet: false,
        isLoading: true,
        allAddresses: [connectedAddress],
      };
    }

    // No profile or no linked addresses
    if (!linkedData.primary) {
      return {
        primaryAddress: connectedAddress,
        connectedAddress,
        isLinkedWallet: false,
        isLoading: false,
        allAddresses: [connectedAddress],
      };
    }

    // Has profile with potentially linked addresses
    const primary = linkedData.primary.toLowerCase();
    const connected = connectedAddress.toLowerCase();
    const linked = linkedData.linked || [];

    const isLinkedWallet = primary !== connected;
    const allAddresses = [primary, ...linked];

    return {
      primaryAddress: primary,
      connectedAddress,
      isLinkedWallet,
      isLoading: false,
      allAddresses,
    };
  }, [connectedAddress, isConnected, linkedData]);

  return result;
}

/**
 * Helper hook that returns just the primary address string
 * Falls back to connected address if not available
 */
export function usePrimaryAddressOnly(): string | undefined {
  const { primaryAddress, connectedAddress } = usePrimaryAddress();
  return primaryAddress || connectedAddress;
}
