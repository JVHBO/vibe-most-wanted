import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

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

const BOOSTER_DROP_ABI = [
  {
    inputs: [{ name: 'quantity', type: 'uint256' }],
    name: 'getMintPrice',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

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

// Collection contracts (only active collections)
const COLLECTION_CONTRACTS: Record<string, `0x${string}`> = {
  vibe: '0xf14c1dc8ce5fe65413379f76c43fa1460c31e728',
  gmvbrs: '0xefe512e73ca7356c20a21aa9433bad5fc9342d46',
  viberuto: '0x70b4005a83a0b39325d27cf31bd4a7a30b15069f',
  meowverse: '0xf0bf71bcd1f1aeb1ba6be0afbc38a1abe9aa9150',
  viberotbangers: '0x120c612d79a3187a3b8b4f4bb924cebe41eb407a',
};

// Uniswap V3 pools for closed mint collections (all disabled)
const UNISWAP_V3_POOLS: Record<string, { pool: `0x${string}`; isToken0Weth: boolean }> = {
  // All disabled collections removed
};

export async function GET(request: Request) {
  try {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow without auth for testing, but log warning
      console.warn('[save-prices] No valid auth header, proceeding anyway');
    }

    // Create viem client
    const client = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Get ETH/USD price
    const ethPriceData = await client.readContract({
      address: ETH_USD_FEED,
      abi: CHAINLINK_ABI,
      functionName: 'latestRoundData',
    });
    const ethUsdPrice = Number(ethPriceData[1]) / 1e8;

    // Fetch all mint prices
    const prices: { collectionId: string; priceEth: number; priceUsd: number }[] = [];

    for (const [id, address] of Object.entries(COLLECTION_CONTRACTS)) {
      try {
        let priceEth = 0;

        // Check if this is a pool-based collection
        const poolInfo = UNISWAP_V3_POOLS[id];
        if (poolInfo) {
          // Get price from Uniswap V3 pool
          const slot0 = await client.readContract({
            address: poolInfo.pool,
            abi: UNISWAP_V3_POOL_ABI,
            functionName: 'slot0',
          });
          const sqrtPriceX96 = slot0[0];
          const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96);
          const priceRatio = sqrtPrice * sqrtPrice;
          const tokenPriceInEth = poolInfo.isToken0Weth ? (1 / priceRatio) : priceRatio;
          priceEth = tokenPriceInEth * 100000; // Pack = 100k tokens
        } else {
          // Get mint price
          const priceWei = await client.readContract({
            address,
            abi: BOOSTER_DROP_ABI,
            functionName: 'getMintPrice',
            args: [BigInt(1)],
          });
          priceEth = parseFloat(formatEther(priceWei));
        }

        if (priceEth > 0) {
          prices.push({
            collectionId: id,
            priceEth,
            priceUsd: priceEth * ethUsdPrice,
          });
        }
      } catch (err) {
        console.error(`[save-prices] Failed to get price for ${id}:`, err);
      }
    }

    // Track failed collections
    const allCollections = Object.keys(COLLECTION_CONTRACTS);
    const savedCollections = prices.map(p => p.collectionId);
    const failedCollections = allCollections.filter(c => !savedCollections.includes(c));

    if (prices.length === 0) {
      return NextResponse.json({ error: 'No prices fetched', failed: failedCollections }, { status: 500 });
    }

    // Save to Convex
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const result = await convex.mutation(api.priceSnapshots.savePriceSnapshot, {
      prices,
      ethUsdPrice,
    });

    console.log('[save-prices] Saved snapshot:', result);

    return NextResponse.json({
      success: true,
      ...result,
      pricesCount: prices.length,
      ethUsdPrice,
      saved: savedCollections,
      failed: failedCollections,
    });
  } catch (error) {
    console.error('[save-prices] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
