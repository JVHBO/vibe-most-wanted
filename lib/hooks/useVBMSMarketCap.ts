/**
 * Hook to get VBMS market cap
 * Primary: Wield API (same as VibeMarket)
 * Fallback: Calculate from bonding curve contracts
 */

import { useState, useEffect, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { BOOSTER_DROP_V2_ABI, VBMS_CONTRACTS } from '../contracts/BoosterDropV2ABI';

const WIELD_API = 'https://build.wield.xyz/vibe/boosterbox/collection/0xf14c1dc8ce5fe65413379f76c43fa1460c31e728/stats';
const ETH_USD_API = 'https://build.wield.xyz/utils/eth-to-usd?eth=1';

// Chainlink ETH/USD on Base
const ETH_USD_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70' as const;
const CHAINLINK_ABI = [{
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
}] as const;

const ERC20_ABI = [{
  inputs: [],
  name: 'totalSupply',
  outputs: [{ name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function',
}] as const;

const TOKENS_PER_PACK = 100000;

export function useVBMSMarketCap() {
  const [apiMarketCap, setApiMarketCap] = useState<number | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(true);

  // Contract-based fallback data
  const { data: ethPriceData } = useReadContract({
    address: ETH_USD_FEED,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
    chainId: 8453,
  });

  const { data: totalSupply } = useReadContract({
    address: VBMS_CONTRACTS.boosterToken,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
    chainId: 8453,
  });

  const { data: pricePerPack } = useReadContract({
    address: VBMS_CONTRACTS.boosterDrop,
    abi: BOOSTER_DROP_V2_ABI,
    functionName: 'getMintPrice',
    args: [BigInt(1)],
    chainId: 8453,
  });

  // Calculate contract-based market cap
  const contractMarketCap = useMemo(() => {
    if (!totalSupply || !pricePerPack || !ethPriceData) return null;

    const ethUsdPrice = Number(ethPriceData[1]) / 1e8;
    const totalTokens = Number(formatEther(totalSupply as bigint));
    const packPriceEth = Number(formatEther(pricePerPack as bigint));
    const packsWorth = totalTokens / TOKENS_PER_PACK;

    return packsWorth * packPriceEth * ethUsdPrice;
  }, [totalSupply, pricePerPack, ethPriceData]);

  // Try to fetch from Wield API
  useEffect(() => {
    async function fetchFromApi() {
      try {
        const [statsRes, ethRes] = await Promise.all([
          fetch(WIELD_API, {
            headers: { 'Origin': 'https://vibechain.com', 'Referer': 'https://vibechain.com/' },
          }),
          fetch(ETH_USD_API),
        ]);

        if (!statsRes.ok || !ethRes.ok) throw new Error('API error');

        const stats = await statsRes.json();
        const ethData = await ethRes.json();

        if (stats.success === false) throw new Error('Rate limited');

        const ethUsd = ethData?.usd || 3400;
        const totalMinted = stats?.totalMinted || stats?.totalPacksSold || 0;
        const priceEth = stats?.pricePerPackInEth || stats?.avgPricePerPackInEth || 0;

        setApiMarketCap(totalMinted * priceEth * ethUsd);
      } catch {
        setApiMarketCap(null);
      } finally {
        setIsApiLoading(false);
      }
    }

    fetchFromApi();
    const interval = setInterval(fetchFromApi, 60000);
    return () => clearInterval(interval);
  }, []);

  // Use API value if available, otherwise use contract calculation
  const marketCap = apiMarketCap ?? contractMarketCap ?? 0;
  const isLoading = isApiLoading && !contractMarketCap;

  // Format
  let marketCapFormatted: string;
  if (isLoading) {
    marketCapFormatted = '...';
  } else if (marketCap >= 1000000) {
    marketCapFormatted = `$${(marketCap / 1000000).toFixed(2)}M`;
  } else if (marketCap >= 1000) {
    marketCapFormatted = `$${(marketCap / 1000).toFixed(2)}k`;
  } else {
    marketCapFormatted = `$${marketCap.toFixed(2)}`;
  }

  return { marketCap, marketCapFormatted, isLoading };
}
