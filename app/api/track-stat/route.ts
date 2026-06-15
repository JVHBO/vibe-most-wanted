/**
 * API Route: POST /api/track-stat
 *
 * Fire-and-forget stat tracking from client-side code
 * Used by lib/nft/fetcher.ts to track Alchemy usage
 */

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://agile-orca-761.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

// Valid stat keys (prevent spam)
const VALID_KEYS = [
  "alchemy_calls",
  "alchemy_cache_hit",
  "rpc_total",
  "rpc_success",
  "rpc_failed",
  "fetch_nfts_total",
  "profile_nfts_total",
  "profile_nfts_cache_hit",
  "nfts_api_total",
  "nfts_cache_hit",
  "gift_nfts_total",
  "gift_nfts_cache_hit",
  "balance_check_total",
  "balance_check_cached",
  "wield_enrich_attempt",
  "wield_enrich_success",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, amount = 1 } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (!VALID_KEYS.includes(key) || typeof amount !== "number" || !Number.isFinite(amount)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Fire-and-forget. Stats must never break the app or create console 500s.
    convex.mutation(api.apiStats.increment, { key, amount }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, skipped: true });
  }
}
