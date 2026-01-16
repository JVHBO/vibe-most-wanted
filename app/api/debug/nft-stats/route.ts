/**
 * Debug endpoint to check NFT fetching stats
 * GET /api/debug/nft-stats - Get stats
 * POST /api/debug/nft-stats - Reset stats
 */

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

export async function GET() {
  try {
    const stats = await convex.query(api.apiStats.getAll);

    // Gift API stats
    const giftTotal = stats.gift_nfts_total || 0;
    const giftCacheHits = stats.gift_nfts_cache_hit || 0;

    // Client-side fetcher stats
    const alchemyCalls = stats.alchemy_calls || 0;
    const alchemyCacheHit = stats.alchemy_cache_hit || 0;
    const fetchNftsTotal = stats.fetch_nfts_total || 0;

    // RPC stats
    const rpcTotal = stats.rpc_total || 0;
    const rpcSuccess = stats.rpc_success || 0;
    const rpcFailed = stats.rpc_failed || 0;

    // Balance check stats
    const balanceCheckTotal = stats.balance_check_total || 0;
    const balanceCheckCached = stats.balance_check_cached || 0;

    return NextResponse.json({
      status: "ok",
      stats: {
        // Server-side gift API
        giftApi: {
          total: giftTotal,
          cacheHits: giftCacheHits,
          alchemyCalls: giftTotal - giftCacheHits,
          cacheRate: giftTotal > 0 ? `${((giftCacheHits / giftTotal) * 100).toFixed(1)}%` : "N/A",
        },
        // Client-side NFT fetcher (main culprit!)
        clientFetcher: {
          alchemyCalls,
          cacheHits: alchemyCacheHit,
          total: alchemyCalls + alchemyCacheHit,
          cacheRate: (alchemyCalls + alchemyCacheHit) > 0
            ? `${((alchemyCacheHit / (alchemyCalls + alchemyCacheHit)) * 100).toFixed(1)}%`
            : "N/A",
        },
        // RPC balance checks (free)
        rpc: {
          total: rpcTotal,
          success: rpcSuccess,
          failed: rpcFailed,
          successRate: rpcTotal > 0 ? `${((rpcSuccess / rpcTotal) * 100).toFixed(1)}%` : "N/A",
        },
        // Balance check optimization
        balanceCheck: {
          total: balanceCheckTotal,
          cached: balanceCheckCached,
          cacheRate: (balanceCheckTotal + balanceCheckCached) > 0
            ? `${((balanceCheckCached / (balanceCheckTotal + balanceCheckCached)) * 100).toFixed(1)}%`
            : "N/A",
        },
        raw: stats,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    await convex.mutation(api.apiStats.resetAll);
    return NextResponse.json({
      status: "reset",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message
    }, { status: 500 });
  }
}
