"use client";

import { useAccount } from "wagmi";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo, useState, useEffect, useRef } from "react";

/**
 * 🔗 MULTI-WALLET HOOK
 * 🚀 BANDWIDTH FIX: Uses manual query with sessionStorage cache instead of useQuery subscription
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
  const convex = useConvex();

  // 🚀 BANDWIDTH FIX: Use state instead of useQuery subscription
  const [linkedData, setLinkedData] = useState<{ primary: string; linked: string[] } | null | undefined>(undefined);
  const loadedRef = useRef<string | null>(null);

  // 🚀 BANDWIDTH FIX: Manual query with sessionStorage cache
  useEffect(() => {
    if (!connectedAddress || !isConnected) {
      setLinkedData(null);
      loadedRef.current = null;
      return;
    }

    // Prevent re-fetching for same address
    if (loadedRef.current === connectedAddress.toLowerCase()) {
      return;
    }

    const fetchLinkedAddresses = async () => {
      const cacheKey = `vbms_linked_${connectedAddress.toLowerCase()}`;

      // Check sessionStorage cache (1 hour TTL)
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 60 * 60 * 1000) {
            setLinkedData(parsed.data);
            loadedRef.current = connectedAddress.toLowerCase();
            return;
          }
        }
      } catch (e) {
        // Ignore cache errors
      }

      // Fetch from Convex
      try {
        const result = await convex.query(api.profiles.getLinkedAddresses, { address: connectedAddress });
        setLinkedData(result);
        loadedRef.current = connectedAddress.toLowerCase();

        // Cache result
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
        } catch (e) {
          // Ignore cache write errors
        }
      } catch (e) {
        console.error("Error fetching linked addresses:", e);
        setLinkedData(null);
        loadedRef.current = connectedAddress.toLowerCase();
      }
    };

    fetchLinkedAddresses();
  }, [connectedAddress, isConnected, convex]);

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
    if (!linkedData?.primary) {
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
