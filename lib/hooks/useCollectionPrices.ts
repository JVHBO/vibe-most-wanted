/**
 * Hook to fetch prices for ALL collection tokens using getMintPrice
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

// Hardcoded contract addresses (lowercase, same format as VBMS_CONTRACTS)
const COLLECTION_CONTRACTS: Record<string, `0x${string}`> = {
  vibe: '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728',
  gmvbrs: '0xefe512e73ca7356c20a21aa9433bad5fc9342d46',
  viberuto: '0x70b4005a83a0b39325d27cf31bd4a7a30b15069f',
  coquettish: '0xcdc74eeedc5ede1ef6033f22e8f0401af5b561ea',
  meowverse: '0xf0bf71bcd1f1aeb1ba6be0afbc38a1abe9aa9150',
  poorlydrawnpepes: '0x8cb5b730943b25403ccac6d5fd649bd0cbde76d8',
  teampothead: '0x1f16007c7f08bf62ad37f8cfaf87e1c0cf8e2aea',
  tarot: '0x34d639c63384a00a2d25a58f73bea73856aa0550',
  americanfootball: '0xe3910325daaef5d969e6db5eca1ff0117bb160ae',
  baseballcabal: '0x3ff41af61d092657189b1d4f7d74d994514724bb',
  vibefx: '0xc7f2d8c035b2505f30a5417c0374ac0299d88553',
  historyofcomputer: '0x319b12e8eba0be2eae1112b357ba75c2c178b567',
};

const TICKER_COLLECTIONS: { id: string; displayName: string; emoji: string }[] = [
  { id: 'vibe', displayName: 'Vibe Most Wanted', emoji: '🎭' },
  { id: 'gmvbrs', displayName: 'GM Vibers', emoji: '🌅' },
  { id: 'viberuto', displayName: 'Viberuto', emoji: '🍥' },
  { id: 'coquettish', displayName: 'Coquettish', emoji: '💋' },
  { id: 'meowverse', displayName: 'Meowverse', emoji: '🐱' },
  { id: 'poorlydrawnpepes', displayName: 'Poorly Drawn Pepes', emoji: '🐸' },
  { id: 'teampothead', displayName: 'Team Pothead', emoji: '🌿' },
  { id: 'tarot', displayName: 'Tarot', emoji: '🔮' },
  { id: 'americanfootball', displayName: 'American Football', emoji: '🏈' },
  { id: 'baseballcabal', displayName: 'Baseball Cabal', emoji: '⚾' },
  { id: 'vibefx', displayName: 'VibeFX', emoji: '✨' },
  { id: 'historyofcomputer', displayName: 'History of Computer', emoji: '💻' },
];

export interface CollectionPrice {
  id: string;
  displayName: string;
  emoji: string;
  priceEth: string;
  priceUsd: string;
  priceWei: bigint | null;
}

// Individual price hook (same pattern as useMintPrice that works)
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

export function useCollectionPrices() {
  // Get ETH/USD price
  const { data: ethPriceData } = useReadContract({
    address: ETH_USD_FEED,
    abi: CHAINLINK_ABI,
    functionName: 'latestRoundData',
    chainId: 8453,
  });

  const ethUsdPrice = ethPriceData ? Number(ethPriceData[1]) / 1e8 : 3500;

  // Get prices for each collection
  const vibe = usePrice(COLLECTION_CONTRACTS.vibe);
  const gmvbrs = usePrice(COLLECTION_CONTRACTS.gmvbrs);
  const viberuto = usePrice(COLLECTION_CONTRACTS.viberuto);
  const coquettish = usePrice(COLLECTION_CONTRACTS.coquettish);
  const meowverse = usePrice(COLLECTION_CONTRACTS.meowverse);
  const poorlydrawnpepes = usePrice(COLLECTION_CONTRACTS.poorlydrawnpepes);
  const teampothead = usePrice(COLLECTION_CONTRACTS.teampothead);
  const tarot = usePrice(COLLECTION_CONTRACTS.tarot);
  const americanfootball = usePrice(COLLECTION_CONTRACTS.americanfootball);
  const baseballcabal = usePrice(COLLECTION_CONTRACTS.baseballcabal);
  const vibefx = usePrice(COLLECTION_CONTRACTS.vibefx);
  const historyofcomputer = usePrice(COLLECTION_CONTRACTS.historyofcomputer);

  const priceData: Record<string, { priceWei: bigint | undefined; priceEth: string; isLoading: boolean }> = {
    vibe, gmvbrs, viberuto, coquettish, meowverse, poorlydrawnpepes,
    teampothead, tarot, americanfootball, baseballcabal, vibefx, historyofcomputer,
  };

  const isLoading = Object.values(priceData).some(p => p.isLoading);

  const allPrices: CollectionPrice[] = TICKER_COLLECTIONS.map((col) => {
    const data = priceData[col.id];
    const priceWei = data?.priceWei ?? null;
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

  const prices = allPrices.filter((p) => p.priceWei !== null && p.priceWei > BigInt(0));

  return { prices, allPrices, isLoading, error: null, refetch: () => {}, ethUsdPrice };
}
