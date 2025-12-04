/**
 * Hook to fetch prices for ALL collection tokens using getMintPrice
 * Returns price per pack in USD
 */

import { useReadContracts, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { BOOSTER_DROP_V2_ABI } from '../contracts/BoosterDropV2ABI';
import { COLLECTIONS, type CollectionId } from '../collections';

// Chainlink ETH/USD Price Feed on Base
const ETH_USD_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70' as const;
const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const TICKER_COLLECTIONS: { id: CollectionId; displayName: string; emoji: string }[] = [
  { id: 'vibe', displayName: 'VBMS', emoji: '🎭' },
  { id: 'gmvbrs', displayName: 'VBRS', emoji: '🌅' },
  { id: 'viberuto', displayName: 'VBRTO', emoji: '🍥' },
  { id: 'coquettish', displayName: 'COQ', emoji: '💋' },
  { id: 'meowverse', displayName: 'MEOW', emoji: '🐱' },
  { id: 'poorlydrawnpepes', displayName: 'PDP', emoji: '🐸' },
  { id: 'teampothead', displayName: 'TMPT', emoji: '🌿' },
  { id: 'tarot', displayName: 'TRT', emoji: '🔮' },
  { id: 'americanfootball', displayName: 'AFCL', emoji: '🏈' },
  { id: 'baseballcabal', displayName: 'BBC', emoji: '⚾' },
  { id: 'vibefx', displayName: 'VFX', emoji: '✨' },
  { id: 'historyofcomputer', displayName: 'HOC', emoji: '💻' },
];

export interface CollectionPrice {
  id: string;
  displayName: string;
  emoji: string;
  priceEth: string;
  priceUsd: string;
  priceWei: bigint | null;
}

export function useCollectionPrices() {
  const { data: ethPriceData } = useReadContract({
    address: ETH_USD_FEED,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
    chainId: 8453,
  });

  const ethUsdPrice = ethPriceData ? Number(ethPriceData[1]) / 1e8 : 3500;

  const contracts = TICKER_COLLECTIONS.map((col) => ({
    address: COLLECTIONS[col.id].contractAddress as `0x${string}`,
    abi: BOOSTER_DROP_V2_ABI,
    functionName: 'getMintPrice',
    args: [BigInt(1)],
    chainId: 8453,
  }));

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: { staleTime: 60_000, refetchInterval: 60_000 },
  });

  const prices: CollectionPrice[] = TICKER_COLLECTIONS.map((col, index) => {
    const result = data?.[index];
    const priceWei = result?.status === 'success' ? (result.result as bigint) : null;
    const priceEth = priceWei ? parseFloat(formatEther(priceWei)) : 0;
    const priceUsd = priceEth * ethUsdPrice;

    return {
      id: col.id,
      displayName: col.displayName,
      emoji: col.emoji,
      priceEth: priceEth.toFixed(6),
      priceUsd: priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : '$0',
      priceWei,
    };
  });

  const validPrices = prices.filter((p) => p.priceWei !== null && p.priceWei > BigInt(0));

  return { prices: validPrices, allPrices: prices, isLoading, error, refetch, ethUsdPrice };
}
