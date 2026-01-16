/**
 * Debug endpoint to check NFT fetching stats
 * GET /api/debug/nft-stats
 */

import { NextResponse } from "next/server";

// Import stats from fetcher (we need to export them)
// For now, create local tracking that persists in serverless function memory

let debugStats = {
  rpcCalls: 0,
  rpcSuccess: 0,
  rpcFailed: 0,
  alchemyCalls: 0,
  cacheHits: 0,
  giftApiCalls: 0,
  giftApiCacheHits: 0,
  lastReset: Date.now(),
  errors: [] as string[],
};

// Export for other modules to update
export function trackRpc(success: boolean) {
  debugStats.rpcCalls++;
  if (success) debugStats.rpcSuccess++;
  else debugStats.rpcFailed++;
}

export function trackAlchemy() {
  debugStats.alchemyCalls++;
}

export function trackCacheHit() {
  debugStats.cacheHits++;
}

export function trackGiftApi(cached: boolean) {
  debugStats.giftApiCalls++;
  if (cached) debugStats.giftApiCacheHits++;
}

export function trackError(msg: string) {
  debugStats.errors.push(`${new Date().toISOString()}: ${msg}`);
  if (debugStats.errors.length > 50) debugStats.errors.shift();
}

export async function GET() {
  const now = Date.now();
  const uptimeMs = now - debugStats.lastReset;
  const uptimeMin = Math.floor(uptimeMs / 60000);

  const rpcSuccessRate = debugStats.rpcCalls > 0
    ? ((debugStats.rpcSuccess / debugStats.rpcCalls) * 100).toFixed(1)
    : 'N/A';

  const giftCacheRate = debugStats.giftApiCalls > 0
    ? ((debugStats.giftApiCacheHits / debugStats.giftApiCalls) * 100).toFixed(1)
    : 'N/A';

  return NextResponse.json({
    status: 'ok',
    uptime: `${uptimeMin} minutes`,
    stats: {
      rpc: {
        total: debugStats.rpcCalls,
        success: debugStats.rpcSuccess,
        failed: debugStats.rpcFailed,
        successRate: `${rpcSuccessRate}%`,
      },
      alchemy: {
        calls: debugStats.alchemyCalls,
        cacheHits: debugStats.cacheHits,
        saved: debugStats.cacheHits > 0 ? `${((debugStats.cacheHits / (debugStats.alchemyCalls + debugStats.cacheHits)) * 100).toFixed(1)}%` : 'N/A',
      },
      giftApi: {
        calls: debugStats.giftApiCalls,
        cacheHits: debugStats.giftApiCacheHits,
        cacheRate: `${giftCacheRate}%`,
      },
    },
    recentErrors: debugStats.errors.slice(-10),
    note: 'Stats reset when serverless function cold starts',
  });
}

// Reset endpoint
export async function POST() {
  debugStats = {
    rpcCalls: 0,
    rpcSuccess: 0,
    rpcFailed: 0,
    alchemyCalls: 0,
    cacheHits: 0,
    giftApiCalls: 0,
    giftApiCacheHits: 0,
    lastReset: Date.now(),
    errors: [],
  };

  return NextResponse.json({ status: 'reset', timestamp: new Date().toISOString() });
}
