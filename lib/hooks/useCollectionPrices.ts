/**
 * Hook to fetch prices for collection tokens using getMintPrice
 * Returns price per 100k tokens (1 pack) in ETH
 */

import { useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { BOOSTER_DROP_V2_ABI } from '../contracts/BoosterDropV2ABI';
import { COLLECTIONS, type CollectionId } from '../collections';

// Collection configs for price ticker (excluding vibefid)
export const COLLECTION_TOKENS = {
  vibe: {
    id: 'vibe',
    displayName: 'VBMS',
    emoji: '🎭',
  },
  gmvbrs: {
    id: 'gmvbrs',
    displayName: 'VBRS',
    emoji: '🌅',
  },
  viberuto: {
    id: 'viberuto',
    displayName: 'VBRTO',
    emoji: '🍥',
  },
  coquettish: {
    id: 'coquettish',
    displayName: 'COQ',
    emoji: '💋',
  },
  meowverse: {
    id: 'meowverse',
    displayName: 'MEOW',
    emoji: '🐱',
  },
  poorlydrawnpepes: {
    id: 'poorlydrawnpepes',
    displayName: 'PDP',
    emoji: '🐸',
  },
  teampothead: {
    id: 'teampothead',
    displayName: 'TMPT',
    emoji: '🌿',
  },
  tarot: {
    id: 'tarot',
    displayName: 'TRT',
    emoji: '🔮',
  },
  americanfootball: {
    id: 'americanfootball',
    displayName: 'AFCL',
    emoji: '🏈',
  },
  baseballcabal: {
    id: 'baseballcabal',
    displayName: 'BBC',
    emoji: '⚾',
  },
  vibefx: {
    id: 'vibefx',
    displayName: 'VFX',
    emoji: '✨',
  },
  historyofcomputer: {
    id: 'historyofcomputer',
    displayName: 'HOC',
    emoji: '💻',
  },
} as const;

export type TokenCollectionId = keyof typeof COLLECTION_TOKENS;

export interface CollectionPrice {
  id: string;
  displayName: string;
  emoji: string;
  priceEth: string;
  priceWei: bigint | null;
  contractAddress: string;
}

export function useCollectionPrices() {
  const collections = Object.values(COLLECTION_TOKENS);

  // Build contract calls for each collection using the NFT contract addresses
  const contracts = collections.map((collection) => {
    // Get the NFT contract address from COLLECTIONS config
    const collectionConfig = COLLECTIONS[collection.id as CollectionId];
    const contractAddress = collectionConfig?.contractAddress || '';
    
    return {
      address: contractAddress as `0x${string}`,
      abi: BOOSTER_DROP_V2_ABI,
      functionName: 'getMintPrice',
      args: [BigInt(1)], // Price for 1 pack (100k tokens)
      chainId: 8453, // Base mainnet
    };
  });

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      staleTime: 60_000, // Cache for 1 minute
      refetchInterval: 60_000, // Refetch every minute
    },
  });

  // Map results to collection prices
  const prices: CollectionPrice[] = collections.map((collection, index) => {
    const result = data?.[index];
    const priceWei = result?.status === 'success' ? (result.result as bigint) : null;
    const collectionConfig = COLLECTIONS[collection.id as CollectionId];

    return {
      id: collection.id,
      displayName: collection.displayName,
      emoji: collection.emoji,
      priceEth: priceWei ? parseFloat(formatEther(priceWei)).toFixed(6) : '0',
      priceWei,
      contractAddress: collectionConfig?.contractAddress || '',
    };
  });

  // Filter out collections with no price or errors
  const validPrices = prices.filter((p) => p.priceWei !== null && p.priceWei > BigInt(0));

  return {
    prices: validPrices,
    allPrices: prices,
    isLoading,
    error,
    refetch,
  };
}
