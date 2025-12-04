/**
 * Hook to fetch prices for collection tokens using getMintPrice
 * Returns price per 100k tokens (1 pack) in ETH
 */

import { useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { BOOSTER_DROP_V2_ABI } from '../contracts/BoosterDropV2ABI';

// Token contract addresses for each collection
export const COLLECTION_TOKENS = {
  vibe: {
    id: 'vibe',
    displayName: 'VBMS',
    tokenAddress: '0xb03439567cd22f278b21e1ffcdfb8e1696763827',
    emoji: '🎭',
  },
  gmvbrs: {
    id: 'gmvbrs',
    displayName: 'VBRS',
    tokenAddress: '0x534047e45e81e1168be49734c074921f9c5f325e',
    emoji: '🌅',
  },
  viberuto: {
    id: 'viberuto',
    displayName: 'VBRTO',
    tokenAddress: '0xb8546a8e4d47d28debc544eee4582db7c643c24f',
    emoji: '🍥',
  },
  coquettish: {
    id: 'coquettish',
    displayName: 'COQ',
    tokenAddress: '0x2b068f4a6132db05541b1d78beffe1ab0a97e375',
    emoji: '💋',
  },
  meowverse: {
    id: 'meowverse',
    displayName: 'MEOW',
    tokenAddress: '0x6305324bbd389e2ee08a45b319f78e59bca1d06a',
    emoji: '🐱',
  },
  poorlydrawnpepes: {
    id: 'poorlydrawnpepes',
    displayName: 'PDP',
    tokenAddress: '0x6cfa790cf3dec600c36245280b1fd60962d7a8f9',
    emoji: '🐸',
  },
  teampothead: {
    id: 'teampothead',
    displayName: 'TMPT',
    tokenAddress: '0xf1ccbce920f0b10ff329c35599042aab7895c6f2',
    emoji: '🌿',
  },
  tarot: {
    id: 'tarot',
    displayName: 'TRT',
    tokenAddress: '0x86215229470c98aaf88ada17e40f7076b5e46c23',
    emoji: '🔮',
  },
  americanfootball: {
    id: 'americanfootball',
    displayName: 'AFCL',
    tokenAddress: '0xb35c8801785bafa44f80b7271bf9e317e20132aa',
    emoji: '🏈',
  },
  baseballcabal: {
    id: 'baseballcabal',
    displayName: 'BBC',
    tokenAddress: '0x374f753fc5f923923fc5b460fc19ee9f0a9666a8',
    emoji: '⚾',
  },
  vibefx: {
    id: 'vibefx',
    displayName: 'VFX',
    tokenAddress: '0x30d24fc619f59f6f267ee884d802288e124b17c1',
    emoji: '✨',
  },
  historyofcomputer: {
    id: 'historyofcomputer',
    displayName: 'HOC',
    tokenAddress: '0x56ac7322b93cd28b1974e0905e173919b0601bb3',
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
  tokenAddress: string;
}

export function useCollectionPrices() {
  const collections = Object.values(COLLECTION_TOKENS);

  // Build contract calls for each collection token
  const contracts = collections.map((collection) => ({
    address: collection.tokenAddress as `0x${string}`,
    abi: BOOSTER_DROP_V2_ABI,
    functionName: 'getMintPrice',
    args: [BigInt(1)], // Price for 1 pack (100k tokens)
    chainId: 8453, // Base mainnet
  }));

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

    return {
      id: collection.id,
      displayName: collection.displayName,
      emoji: collection.emoji,
      priceEth: priceWei ? parseFloat(formatEther(priceWei)).toFixed(6) : '0',
      priceWei,
      tokenAddress: collection.tokenAddress,
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
