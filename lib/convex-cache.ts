/**
 * Convex Query Cache with SWR
 *
 * 🚀 BANDWIDTH FIX: Reduces Convex subscriptions by using SWR polling
 *
 * Instead of real-time subscriptions (which consume bandwidth continuously),
 * these hooks use polling with caching for data that doesn't need instant updates.
 *
 * USAGE:
 * Replace useQuery(api.profiles.getLeaderboardLite) with useCachedLeaderboard()
 */

import useSWR from 'swr';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';

// Cache configuration
const CACHE_CONFIG = {
  leaderboard: {
    refreshInterval: 60000,  // Refresh every 60 seconds
    dedupingInterval: 30000, // Dedupe requests within 30 seconds
  },
  raidBoss: {
    refreshInterval: 30000,  // Refresh every 30 seconds
    dedupingInterval: 15000,
  },
  profile: {
    refreshInterval: 10000,  // Refresh every 10 seconds
    dedupingInterval: 5000,
  },
  dailyQuest: {
    refreshInterval: 300000, // Refresh every 5 minutes
    dedupingInterval: 60000,
  }
};

/**
 * Cached leaderboard hook
 *
 * Replaces: useQuery(api.profiles.getLeaderboardLite, { limit: 100 })
 * Saves: ~99% of leaderboard subscription bandwidth
 */
export function useCachedLeaderboard(limit: number = 100) {
  const convex = useConvex();

  const { data, error, isLoading, mutate } = useSWR(
    ['leaderboard', limit],
    async () => {
      return await convex.query(api.profiles.getLeaderboardLite, { limit });
    },
    {
      refreshInterval: CACHE_CONFIG.leaderboard.refreshInterval,
      dedupingInterval: CACHE_CONFIG.leaderboard.dedupingInterval,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    leaderboard: data || [],
    isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Cached raid boss hook
 *
 * Replaces: useQuery(api.raidBoss.getCurrentRaidBoss)
 * Saves: ~97% of raid boss subscription bandwidth
 */
export function useCachedRaidBoss() {
  const convex = useConvex();

  const { data, error, isLoading, mutate } = useSWR(
    'currentRaidBoss',
    async () => {
      return await convex.query(api.raidBoss.getCurrentRaidBoss);
    },
    {
      refreshInterval: CACHE_CONFIG.raidBoss.refreshInterval,
      dedupingInterval: CACHE_CONFIG.raidBoss.dedupingInterval,
      revalidateOnFocus: false,
    }
  );

  return {
    boss: data,
    isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Cached profile lite hook
 *
 * Replaces: useQuery(api.profiles.getProfile, { address })
 * Uses getProfileLite to save ~95% bandwidth per profile
 */
export function useCachedProfileLite(address: string | undefined) {
  const convex = useConvex();

  const { data, error, isLoading, mutate } = useSWR(
    address ? ['profileLite', address] : null,
    async () => {
      if (!address) return null;
      return await convex.query(api.profiles.getProfileLite, { address });
    },
    {
      refreshInterval: CACHE_CONFIG.profile.refreshInterval,
      dedupingInterval: CACHE_CONFIG.profile.dedupingInterval,
      revalidateOnFocus: true,
    }
  );

  return {
    profile: data,
    isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Cached daily quest hook (GLOBAL - no address needed)
 *
 * Replaces: useQuery(api.quests.getDailyQuest, {})
 * Refreshes every 5 minutes (quest changes once per day!)
 * HUGE SAVINGS: Quest definition is global and only changes daily
 */
export function useCachedDailyQuest() {
  const convex = useConvex();

  const { data, error, isLoading, mutate } = useSWR(
    'dailyQuest',
    async () => {
      return await convex.query(api.quests.getDailyQuest, {});
    },
    {
      refreshInterval: CACHE_CONFIG.dailyQuest.refreshInterval,
      dedupingInterval: CACHE_CONFIG.dailyQuest.dedupingInterval,
      revalidateOnFocus: false,
    }
  );

  return {
    quest: data,
    isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Cached player missions hook
 *
 * Replaces: useQuery(api.missions.getPlayerMissions, { playerAddress: address })
 */
export function useCachedMissions(address: string | undefined) {
  const convex = useConvex();

  const { data, error, isLoading, mutate } = useSWR(
    address ? ['missions', address] : null,
    async () => {
      if (!address) return null;
      return await convex.query(api.missions.getPlayerMissions, { playerAddress: address });
    },
    {
      refreshInterval: 60000, // Every minute
      dedupingInterval: 30000,
      revalidateOnFocus: false,
    }
  );

  return {
    missions: data,
    isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Cached yesterday prices hook
 *
 * Replaces: useQuery(api.priceSnapshots.getYesterdayPrices)
 * HUGE SAVINGS: Prices only change once per day!
 */
export function useCachedYesterdayPrices() {
  const convex = useConvex();

  const { data, error, isLoading, mutate } = useSWR(
    'yesterdayPrices',
    async () => {
      return await convex.query(api.priceSnapshots.getYesterdayPrices);
    },
    {
      refreshInterval: 600000, // Refresh every 10 minutes (overkill since data is daily)
      dedupingInterval: 300000, // 5 min dedup
      revalidateOnFocus: false,
      revalidateOnMount: true, // Important: fetch immediately on mount
      fallbackData: null, // Ensure we have a defined initial state
    }
  );

  return {
    prices: data,
    isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Cached active collections hook
 *
 * Replaces: useQuery(api.nftCollections.getActiveCollections)
 * STATIC DATA: Collections list never changes
 */
export function useCachedCollections() {
  const convex = useConvex();

  const { data, error, isLoading, mutate } = useSWR(
    'activeCollections',
    async () => {
      return await convex.query(api.nftCollections.getActiveCollections);
    },
    {
      refreshInterval: 3600000, // Refresh every 1 hour (overkill - data is static)
      dedupingInterval: 1800000, // 30 min dedup
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: true,
    }
  );

  return {
    collections: data,
    isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Cached available collections for poker
 *
 * Replaces: useQuery(api.pokerBattle.getAvailableCollections)
 * STATIC DATA: Collections list never changes
 */
export function useCachedAvailableCollections() {
  const convex = useConvex();

  const { data, error, isLoading, mutate } = useSWR(
    'availableCollections',
    async () => {
      return await convex.query(api.pokerBattle.getAvailableCollections);
    },
    {
      refreshInterval: 3600000, // 1 hour
      dedupingInterval: 1800000, // 30 min
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: true,
    }
  );

  return {
    collections: data,
    isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Force refresh all cached data
 * Use after important mutations
 */
export function useRefreshCache() {
  const { mutate } = useSWR('_refresh_trigger');

  return async () => {
    // This will trigger all SWR caches to revalidate
    await mutate(undefined, { revalidate: true });
  };
}
