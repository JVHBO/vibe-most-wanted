/**
 * Hook to calculate VBMS market cap from bonding curve
 * Market Cap = (totalSupply / TOKENS_PER_PACK) * pricePerPack * ethUsdPrice
 */

import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { BOOSTER_DROP_V2_ABI, VBMS_CONTRACTS } from '../contracts/BoosterDropV2ABI';

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

// ERC20 totalSupply ABI
const ERC20_ABI = [
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// TOKENS_PER_PACK = 100,000 VBMS (with 18 decimals)
const TOKENS_PER_PACK = 100000;

export function useVBMSMarketCap() {
  // Get ETH/USD price
  const { data: ethPriceData } = useReadContract({
    address: ETH_USD_FEED,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
    chainId: 8453,
  });

  // Get total supply of VBMS tokens
  const { data: totalSupply, isLoading: supplyLoading } = useReadContract({
    address: VBMS_CONTRACTS.boosterToken,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
    chainId: 8453,
  });

  // Get current price per pack from bonding curve
  const { data: pricePerPack, isLoading: priceLoading } = useReadContract({
    address: VBMS_CONTRACTS.boosterDrop,
    abi: BOOSTER_DROP_V2_ABI,
    functionName: 'getMintPrice',
    args: [BigInt(1)],
    chainId: 8453,
  });

  const isLoading = supplyLoading || priceLoading;

  if (!totalSupply || !pricePerPack || !ethPriceData) {
    return {
      marketCap: 0,
      marketCapFormatted: '$0',
      isLoading,
    };
  }

  const ethUsdPrice = Number(ethPriceData[1]) / 1e8;

  // Total VBMS tokens (with 18 decimals)
  const totalTokens = Number(formatEther(totalSupply as bigint));

  // Price per pack in ETH
  const packPriceEth = Number(formatEther(pricePerPack as bigint));

  // Number of "packs worth" of tokens
  const packsWorth = totalTokens / TOKENS_PER_PACK;

  // Market cap in USD = packs * price per pack * eth price
  const marketCap = packsWorth * packPriceEth * ethUsdPrice;

  // Format market cap
  let marketCapFormatted: string;
  if (marketCap >= 1000000) {
    marketCapFormatted = `$${(marketCap / 1000000).toFixed(2)}M`;
  } else if (marketCap >= 1000) {
    marketCapFormatted = `$${(marketCap / 1000).toFixed(2)}k`;
  } else {
    marketCapFormatted = `$${marketCap.toFixed(2)}`;
  }

  return {
    marketCap,
    marketCapFormatted,
    totalTokens,
    packPriceEth,
    ethUsdPrice,
    isLoading,
  };
}
