/**
 * Hook to fetch prices for ALL collection tokens
 * Uses getMintPrice for active mints, Uniswap V3 pool prices for closed mints
 * Returns price per pack in USD
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

// Uniswap V3 Pool ABI for slot0
const UNISWAP_V3_POOL_ABI = [
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Uniswap V3 pool addresses for collections with closed mint (token price * 100k = pack price)
// isToken0Weth: true if WETH is token0 in the pool (lower address)
const UNISWAP_V3_POOLS: Record<string, { pool: `0x${string}`; isToken0Weth: boolean }> = {
  cumioh: { pool: '0x7A6788b9B6E7a1Cb78f01BD18217f67CfaDDBaEE', isToken0Weth: true },
};

// Hardcoded contract addresses (lowercase)
const COLLECTION_CONTRACTS: Record<string, `0x${string}`> = {
  vibe: '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728',
  gmvbrs: '0xefe512e73ca7356c20a21aa9433bad5fc9342d46',
  viberuto: '0x70b4005a83a0b39325d27cf31bd4a7a30b15069f',
  meowverse: '0xf0bf71bcd1f1aeb1ba6be0afbc38a1abe9aa9150',
  cumioh: '0xfeabae8bdb41b2ae507972180df02e70148b38e1',
  viberotbangers: '0x120c612d79a3187a3b8b4f4bb924cebe41eb407a',
};

// Collections for ticker
const TICKER_COLLECTIONS: { id: string; displayName: string; emoji: string }[] = [
  { id: 'vibe', displayName: 'Vibe Most Wanted', emoji: '🎭' },
  { id: 'gmvbrs', displayName: 'GM VBRS', emoji: '🌅' },
  { id: 'viberuto', displayName: 'Viberuto', emoji: '🍥' },
  { id: 'meowverse', displayName: 'Meowverse', emoji: '🐱' },
  { id: 'cumioh', displayName: '$CU-MI-OH!', emoji: '🎴' },
  { id: 'viberotbangers', displayName: 'Vibe Rot Bangers', emoji: '🧟' },
];

export interface CollectionPrice {
  id: string;
  displayName: string;
  emoji: string;
  priceEth: string;
  priceUsd: string;
  priceWei: bigint | null;
}

// Individual price hook for getMintPrice
function usePrice(address: `0x${string}`) {
  const { data: price, isLoading } = useReadContract({
    address,
    abi: BOOSTER_DROP_V2_ABI,
    functionName: 'getMintPrice',
    args: [BigInt(1)],
    chainId: VBMS_CONTRACTS.chainId,
  });

  return {
    priceWei: price as bigint | undefined,
    priceEth: price ? formatEther(price as bigint) : '0',
    isLoading,
  };
}

// Hook to get price from Uniswap V3 pool
function usePoolPrice(poolAddress: `0x${string}` | undefined, isToken0Weth: boolean) {
  const { data: slot0, isLoading } = useReadContract({
    address: poolAddress,
    abi: UNISWAP_V3_POOL_ABI,
    functionName: 'slot0',
    chainId: 8453,
  });

  if (!slot0 || !poolAddress) {
    return { priceInEth: 0, isLoading };
  }

  const sqrtPriceX96 = slot0[0] as bigint;
  const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
  const priceRatio = sqrtPrice * sqrtPrice;

  // If token0 is WETH: priceRatio = TOKEN/WETH, so invert to get WETH/TOKEN
  // If token0 is TOKEN: priceRatio = WETH/TOKEN, already correct
  const priceInEth = isToken0Weth ? (1 / priceRatio) : priceRatio;

  return { priceInEth, isLoading };
}

export function useCollectionPrices() {
  // Get ETH/USD price
  const { data: ethPriceData } = useReadContract({
    address: ETH_USD_FEED,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
    chainId: 8453,
  });

  const ethUsdPrice = ethPriceData ? Number(ethPriceData[1]) / 1e8 : 3500;

  // Get prices for each collection via getMintPrice
  const vibe = usePrice(COLLECTION_CONTRACTS.vibe);
  const gmvbrs = usePrice(COLLECTION_CONTRACTS.gmvbrs);
  const viberuto = usePrice(COLLECTION_CONTRACTS.viberuto);
  const meowverse = usePrice(COLLECTION_CONTRACTS.meowverse);
  const poorlydrawnpepes = usePrice(COLLECTION_CONTRACTS.poorlydrawnpepes);
  const teampothead = usePrice(COLLECTION_CONTRACTS.teampothead);
  const vibefx = usePrice(COLLECTION_CONTRACTS.vibefx);
  const viberotbangers = usePrice(COLLECTION_CONTRACTS.viberotbangers);

  // These use getMintPrice but will return 0/revert, we'll use pool prices instead
  const tarot = usePrice(COLLECTION_CONTRACTS.tarot);
  const baseballcabal = usePrice(COLLECTION_CONTRACTS.baseballcabal);
  const historyofcomputer = usePrice(COLLECTION_CONTRACTS.historyofcomputer);
  const cumioh = usePrice(COLLECTION_CONTRACTS.cumioh);

  // Get pool prices for closed mint collections
  const bbclPool = usePoolPrice(UNISWAP_V3_POOLS.baseballcabal?.pool, UNISWAP_V3_POOLS.baseballcabal?.isToken0Weth);
  const hstrPool = usePoolPrice(UNISWAP_V3_POOLS.historyofcomputer?.pool, UNISWAP_V3_POOLS.historyofcomputer?.isToken0Weth);
  const trtPool = usePoolPrice(UNISWAP_V3_POOLS.tarot?.pool, UNISWAP_V3_POOLS.tarot?.isToken0Weth);
  const cumiohPool = usePoolPrice(UNISWAP_V3_POOLS.cumioh?.pool, UNISWAP_V3_POOLS.cumioh?.isToken0Weth);

  const priceData: Record<string, { priceWei: bigint | undefined; priceEth: string; isLoading: boolean }> = {
    vibe, gmvbrs, viberuto, meowverse, poorlydrawnpepes,
    teampothead, tarot, baseballcabal, vibefx, historyofcomputer, cumioh, viberotbangers,
  };

  const isLoading = Object.values(priceData).some(p => p.isLoading) ||
    bbclPool.isLoading || hstrPool.isLoading || trtPool.isLoading || cumiohPool.isLoading;

  const allPrices: CollectionPrice[] = TICKER_COLLECTIONS.map((col) => {
    const data = priceData[col.id];
    let priceWei = data?.priceWei ?? null;
    let priceEth = priceWei ? parseFloat(formatEther(priceWei)) : 0;

    // For closed mint collections, use pool price instead
    // Pack price = token price * 100,000
    if (col.id === 'baseballcabal' && bbclPool.priceInEth > 0) {
      priceEth = bbclPool.priceInEth * 100000;
      priceWei = BigInt(Math.floor(priceEth * 1e18));
    } else if (col.id === 'historyofcomputer' && hstrPool.priceInEth > 0) {
      priceEth = hstrPool.priceInEth * 100000;
      priceWei = BigInt(Math.floor(priceEth * 1e18));
    } else if (col.id === 'tarot' && trtPool.priceInEth > 0) {
      priceEth = trtPool.priceInEth * 100000;
      priceWei = BigInt(Math.floor(priceEth * 1e18));
    } else if (col.id === 'cumioh' && cumiohPool.priceInEth > 0) {
      priceEth = cumiohPool.priceInEth * 100000;
      priceWei = BigInt(Math.floor(priceEth * 1e18));
    }

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

  const prices = allPrices.filter((p) => p.priceWei !== null && p.priceWei > BigInt(0));

  return { prices, allPrices, isLoading, error: null, refetch: () => {}, ethUsdPrice };
}
