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
  baseballcabal: { pool: '0x1a19B0A5F06D18359Bcaa65968e983c67de453ca', isToken0Weth: false },
  historyofcomputer: { pool: '0x16DfA3C73674213A00F08EfEb2f8b29A13716Da5', isToken0Weth: true },
  tarot: { pool: '0xa959386125F54DdC39bc9d9200de932EC023049D', isToken0Weth: true },
  cumioh: { pool: '0x7A6788b9B6E7a1Cb78f01BD18217f67CfaDDBaEE', isToken0Weth: true },
};

// Hardcoded contract addresses (lowercase, same format as VBMS_CONTRACTS)
const COLLECTION_CONTRACTS: Record<string, `0x${string}`> = {
  vibe: '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728',
  gmvbrs: '0xefe512e73ca7356c20a21aa9433bad5fc9342d46',
  viberuto: '0x70b4005a83a0b39325d27cf31bd4a7a30b15069f',
  meowverse: '0xf0bf71bcd1f1aeb1ba6be0afbc38a1abe9aa9150',
  poorlydrawnpepes: '0x8cb5b730943b25403ccac6d5fd649bd0cbde76d8',
  teampothead: '0x1f16007c7f08bf62ad37f8cfaf87e1c0cf8e2aea',
  tarot: '0x34d639c63384a00a2d25a58f73bea73856aa0550',
  americanfootball: '0xe3910325daaef5d969e6db5eca1ff0117bb160ae',
  baseballcabal: '0x3ff41af61d092657189b1d4f7d74d994514724bb',
  vibefx: '0xc7f2d8c035b2505f30a5417c0374ac0299d88553',
  historyofcomputer: '0x319b12e8eba0be2eae1112b357ba75c2c178b567',
  cumioh: '0xfeabae8bdb41b2ae507972180df02e70148b38e1',
  viberotbangers: '0x120c612d79a3187a3b8b4f4bb924cebe41eb407a',
};

const TICKER_COLLECTIONS: { id: string; displayName: string; emoji: string }[] = [
  { id: 'vibe', displayName: 'Vibe Most Wanted', emoji: '🎭' },
  { id: 'gmvbrs', displayName: 'GM VBRS', emoji: '🌅' },
  { id: 'viberuto', displayName: 'Viberuto', emoji: '🍥' },
  { id: 'meowverse', displayName: 'Meowverse', emoji: '🐱' },
  { id: 'poorlydrawnpepes', displayName: 'Poorly Drawn Pepes', emoji: '🐸' },
  { id: 'teampothead', displayName: 'Team Pothead', emoji: '🌿' },
  { id: 'tarot', displayName: 'Tarot', emoji: '🔮' },
  { id: 'americanfootball', displayName: 'American Football', emoji: '🏈' },
  { id: 'baseballcabal', displayName: 'Baseball Cabal', emoji: '⚾' },
  { id: 'vibefx', displayName: 'Vibe FX', emoji: '✨' },
  { id: 'historyofcomputer', displayName: 'History of Computer', emoji: '💻' },
  { id: 'cumioh', displayName: '$CU-MI-OH!', emoji: '🎴' },
  { id: 'viberotbangers', displayName: 'Vibe Rot Bangers', emoji: '🤮' },
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
  const americanfootball = usePrice(COLLECTION_CONTRACTS.americanfootball);
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
    teampothead, tarot, americanfootball, baseballcabal, vibefx, historyofcomputer, cumioh, viberotbangers,
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
