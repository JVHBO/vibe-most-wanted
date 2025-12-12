/**
 * Client-side arena cards data loader
 *
 * 🚀 BANDWIDTH FIX: Loads card data from static JSON instead of Convex
 * This saves ~120KB per Convex cold start and reduces server bandwidth
 */

import useSWR from 'swr';

// Types
export interface ArenaCard {
  tokenId: string;
  name: string;
  rarity: string;
  power: number;
  imageUrl: string;
  collection: string;
}

export type CollectionCards = Record<string, ArenaCard[]>;

export interface CollectionsList {
  available: string[];
  all: string[];
}

// Cache the data in memory after first load
let cachedCards: CollectionCards | null = null;
let cachedCollections: CollectionsList | null = null;

/**
 * Fetch arena cards from static JSON
 * Uses SWR for caching and deduplication
 */
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

/**
 * Hook to get all arena cards
 * Data is cached indefinitely (static data never changes)
 */
export function useArenaCards() {
  const { data, error, isLoading } = useSWR<CollectionCards>(
    '/data/arena-cards.json',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      dedupingInterval: 86400000, // 24 hours
      onSuccess: (data) => {
        cachedCards = data;
      }
    }
  );

  return {
    cards: data || cachedCards,
    isLoading: isLoading && !cachedCards,
    error
  };
}

/**
 * Hook to get available collections list
 */
export function useCollections() {
  const { data, error, isLoading } = useSWR<CollectionsList>(
    '/data/collections.json',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      dedupingInterval: 86400000,
      onSuccess: (data) => {
        cachedCollections = data;
      }
    }
  );

  return {
    collections: data || cachedCollections,
    availableCollections: data?.available || cachedCollections?.available || [],
    isLoading: isLoading && !cachedCollections,
    error
  };
}

/**
 * Get cards for a specific collection
 */
export function useCollectionCards(collectionId: string) {
  const { cards, isLoading, error } = useArenaCards();

  return {
    cards: cards?.[collectionId] || [],
    isLoading,
    error
  };
}

/**
 * Get a specific card by tokenId and collection
 */
export function useCard(collectionId: string, tokenId: string) {
  const { cards, isLoading, error } = useCollectionCards(collectionId);

  return {
    card: cards.find(c => c.tokenId === tokenId),
    isLoading,
    error
  };
}

/**
 * Preload arena cards data
 * Call this early in app lifecycle for faster access
 */
export async function preloadArenaCards(): Promise<CollectionCards> {
  if (cachedCards) return cachedCards;

  try {
    const res = await fetch('/data/arena-cards.json');
    const data = await res.json();
    cachedCards = data;
    return data;
  } catch (e) {
    console.error('Failed to preload arena cards:', e);
    throw e;
  }
}

/**
 * Get cached cards synchronously (returns null if not loaded)
 */
export function getCachedCards(): CollectionCards | null {
  return cachedCards;
}

/**
 * Get card power by tokenId and collection
 * Useful for calculations without loading full card data
 */
export function getCardPower(collectionId: string, tokenId: string): number {
  if (!cachedCards) return 0;
  const card = cachedCards[collectionId]?.find(c => c.tokenId === tokenId);
  return card?.power || 0;
}
