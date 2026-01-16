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

    const total = stats.gift_nfts_total || 0;
    const cacheHits = stats.gift_nfts_cache_hit || 0;
    const alchemyCalls = stats.alchemy_calls || 0;
    const rpcTotal = stats.rpc_total || 0;
    const rpcFailed = stats.rpc_failed || 0;

    return NextResponse.json({
      status: "ok",
      stats: {
        giftApi: {
          total,
          cacheHits,
          alchemyCalls: total - cacheHits,
          cacheRate: total > 0 ? `${((cacheHits / total) * 100).toFixed(1)}%` : "N/A",
        },
        rpc: {
          total: rpcTotal,
          failed: rpcFailed,
          successRate: rpcTotal > 0 ? `${(((rpcTotal - rpcFailed) / rpcTotal) * 100).toFixed(1)}%` : "N/A",
        },
        alchemy: {
          calls: alchemyCalls,
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
