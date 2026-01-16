/**
 * API Route: POST /api/track-stat
 *
 * Fire-and-forget stat tracking from client-side code
 * Used by lib/nft/fetcher.ts to track Alchemy usage
 */

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

// Valid stat keys (prevent spam)
const VALID_KEYS = [
  "alchemy_calls",
  "alchemy_cache_hit",
  "rpc_total",
  "rpc_success",
  "rpc_failed",
  "fetch_nfts_total",
  "balance_check_total",
  "balance_check_cached",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, amount = 1 } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    if (!VALID_KEYS.includes(key)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    // Fire-and-forget - don't await
    convex.mutation(api.apiStats.increment, { key, amount }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
